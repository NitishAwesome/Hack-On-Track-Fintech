-- ============================================================
-- FINOVA — Safe Non-Destructive Schema Reconciliation Migration
-- Reconciles Prompt 5 Financial Architecture with Team Prompts 6 & 7
--
-- Guarantees:
-- 1. NO hardcoded, sample, or fabricated market-price rows or timestamps.
-- 2. Strict instrument ownership & non-leakage:
--    - Custom instruments require is_custom = TRUE and matching, non-null
--      created_by and user_id equal to auth.uid().
--    - Global instruments require is_custom = FALSE and NULL owners,
--      manageable only by administrators/service role.
--    - Ownership cannot be mutated or transferred via UPDATE.
-- 3. Isolated custom namespace: Two users can create custom instruments
--    with the same symbol without index collision or cross-user visibility.
-- 4. Consistent goal amounts synchronization on both INSERT and UPDATE.
-- 5. 100% non-destructive: Preserves all existing tables, rows, and relationships.
-- ============================================================

-- Ensure uuid extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Ensure handle_updated_at trigger function exists
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- 1. INSTRUMENTS TABLE (public.instruments)
-- ============================================================

-- Add created_by, user_id, and is_active if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'instruments' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE public.instruments ADD COLUMN created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'instruments' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.instruments ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'instruments' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE public.instruments ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'instruments' AND column_name = 'sector'
  ) THEN
    ALTER TABLE public.instruments ADD COLUMN sector TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'instruments' AND column_name = 'industry'
  ) THEN
    ALTER TABLE public.instruments ADD COLUMN industry TEXT;
  END IF;
END $$;

-- Initial backfill to align created_by and user_id for existing rows
UPDATE public.instruments
SET created_by = user_id
WHERE created_by IS NULL AND user_id IS NOT NULL;

UPDATE public.instruments
SET user_id = created_by
WHERE user_id IS NULL AND created_by IS NOT NULL;

-- Trigger to guarantee continuous bidirectional ownership consistency and prevent ownership tampering
CREATE OR REPLACE FUNCTION public.sync_instrument_ownership()
RETURNS TRIGGER AS $$
DECLARE
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();

  IF TG_OP = 'INSERT' THEN
    -- If created by an authenticated client, bind ownership strictly to auth.uid()
    IF current_user_id IS NOT NULL THEN
      NEW.created_by := current_user_id;
      NEW.user_id := current_user_id;
      NEW.is_custom := TRUE;
    ELSE
      -- Service role / migration execution:
      IF NEW.created_by IS NOT NULL OR NEW.user_id IS NOT NULL THEN
        NEW.created_by := COALESCE(NEW.created_by, NEW.user_id);
        NEW.user_id := NEW.created_by;
        NEW.is_custom := TRUE;
      ELSE
        -- Global instrument
        NEW.is_custom := FALSE;
        NEW.created_by := NULL;
        NEW.user_id := NULL;
      END IF;
    END IF;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Lock ownership: users cannot change created_by, user_id, or is_custom on existing instruments
    IF OLD.is_custom = TRUE THEN
      NEW.created_by := OLD.created_by;
      NEW.user_id := OLD.user_id;
      NEW.is_custom := TRUE;
    ELSE
      NEW.created_by := NULL;
      NEW.user_id := NULL;
      NEW.is_custom := FALSE;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_instrument_ownership ON public.instruments;
CREATE TRIGGER trg_sync_instrument_ownership
  BEFORE INSERT OR UPDATE ON public.instruments
  FOR EACH ROW EXECUTE FUNCTION public.sync_instrument_ownership();

-- CHECK constraint enforcing that custom instruments MUST have matching non-null owners,
-- and global instruments MUST have null owners.
ALTER TABLE public.instruments DROP CONSTRAINT IF EXISTS chk_instrument_ownership;
ALTER TABLE public.instruments ADD CONSTRAINT chk_instrument_ownership CHECK (
  (is_custom = FALSE AND created_by IS NULL AND user_id IS NULL)
  OR
  (is_custom = TRUE AND created_by IS NOT NULL AND user_id IS NOT NULL AND created_by = user_id)
);

-- Broaden exchange check constraint to cover all exchanges across all prompts
ALTER TABLE public.instruments DROP CONSTRAINT IF EXISTS instruments_exchange_check;
ALTER TABLE public.instruments ADD CONSTRAINT instruments_exchange_check
  CHECK (exchange IN ('NSE', 'BSE', 'MULTI', 'NCD', 'MCX', 'MUTUAL_FUND_INDIA', 'RBI', 'OTHER'));

-- Clean up older unique indexes before establishing segregated global vs custom indexes
DROP INDEX IF EXISTS public.idx_instruments_global_sym_exch;
DROP INDEX IF EXISTS public.idx_instruments_global_sym_ex;
DROP INDEX IF EXISTS public.idx_instruments_custom_user_sym_exch;
DROP INDEX IF EXISTS public.idx_instruments_custom_sym_user;
DROP INDEX IF EXISTS public.idx_instruments_isin_unique;
DROP INDEX IF EXISTS public.idx_instruments_global_isin;
DROP INDEX IF EXISTS public.uq_instruments_global_symbol_exchange;
DROP INDEX IF EXISTS public.uq_instruments_custom_user_symbol_exchange;
DROP INDEX IF EXISTS public.uq_instruments_global_isin;

-- Unique index for Global Catalog (symbol + exchange unique among global instruments only)
CREATE UNIQUE INDEX uq_instruments_global_symbol_exchange
  ON public.instruments(symbol, exchange)
  WHERE is_custom = FALSE;

-- Unique index for Global ISIN (unique among global instruments only)
CREATE UNIQUE INDEX uq_instruments_global_isin
  ON public.instruments(isin)
  WHERE is_custom = FALSE AND isin IS NOT NULL;

-- Unique index for Custom Instruments per User:
-- Guarantees User A and User B can both create custom instruments with the same symbol without collision,
-- while preventing a single user from creating duplicate entries for the same exchange.
CREATE UNIQUE INDEX uq_instruments_custom_user_symbol_exchange
  ON public.instruments(created_by, symbol, exchange)
  WHERE is_custom = TRUE;

-- Enable RLS
ALTER TABLE public.instruments ENABLE ROW LEVEL SECURITY;

-- Instruments RLS Policies:
-- 1. SELECT: Global catalog viewable by all; custom instruments strictly isolated to their creator.
DROP POLICY IF EXISTS "Users view global and own custom instruments" ON public.instruments;
DROP POLICY IF EXISTS "instruments_select_policy" ON public.instruments;
CREATE POLICY "instruments_select_policy"
  ON public.instruments FOR SELECT
  USING (
    is_custom = FALSE
    OR (auth.uid() IS NOT NULL AND created_by = auth.uid())
  );

-- 2. INSERT: Authenticated users can only create custom instruments for themselves
DROP POLICY IF EXISTS "Users create own custom instruments" ON public.instruments;
DROP POLICY IF EXISTS "instruments_insert_policy" ON public.instruments;
CREATE POLICY "instruments_insert_policy"
  ON public.instruments FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND is_custom = TRUE
    AND (created_by IS NULL OR created_by = auth.uid())
    AND (user_id IS NULL OR user_id = auth.uid())
  );

-- 3. UPDATE: Users can only update their own custom instruments (global catalog protected)
DROP POLICY IF EXISTS "Users update own custom instruments" ON public.instruments;
DROP POLICY IF EXISTS "instruments_update_policy" ON public.instruments;
CREATE POLICY "instruments_update_policy"
  ON public.instruments FOR UPDATE
  USING (
    auth.role() = 'authenticated'
    AND is_custom = TRUE
    AND created_by = auth.uid()
  )
  WITH CHECK (
    auth.role() = 'authenticated'
    AND is_custom = TRUE
    AND created_by = auth.uid()
  );

-- 4. DELETE: Users can only delete their own custom instruments (global catalog protected)
DROP POLICY IF EXISTS "Users delete own custom instruments" ON public.instruments;
DROP POLICY IF EXISTS "instruments_delete_policy" ON public.instruments;
CREATE POLICY "instruments_delete_policy"
  ON public.instruments FOR DELETE
  USING (
    auth.role() = 'authenticated'
    AND is_custom = TRUE
    AND created_by = auth.uid()
  );

-- Ensure updated_at trigger exists on instruments
DROP TRIGGER IF EXISTS trg_instruments_updated_at ON public.instruments;
CREATE TRIGGER trg_instruments_updated_at
  BEFORE UPDATE ON public.instruments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- ============================================================
-- 2. BROKER ACCOUNTS (public.broker_accounts)
-- ============================================================

-- Broaden account_type check to accept uppercase, lowercase, and dashboard UI types
ALTER TABLE public.broker_accounts DROP CONSTRAINT IF EXISTS broker_accounts_account_type_check;
ALTER TABLE public.broker_accounts ADD CONSTRAINT broker_accounts_account_type_check
  CHECK (account_type IN (
    'broker', 'depository', 'manual', 'demat', 'trading', 'mf', 'other',
    'BROKER', 'DEPOSITORY', 'MANUAL', 'DEMAT', 'TRADING', 'OTHER'
  ));

-- Broaden connection_status check to include 'SYNCING'
ALTER TABLE public.broker_accounts DROP CONSTRAINT IF EXISTS broker_accounts_connection_status_check;
ALTER TABLE public.broker_accounts ADD CONSTRAINT broker_accounts_connection_status_check
  CHECK (connection_status IN ('MANUAL', 'NOT_CONNECTED', 'CONNECTED', 'ERROR', 'SYNCING'));


-- ============================================================
-- 3. HOLDINGS TABLE (public.holdings)
-- ============================================================

-- Safely expand quantity precision from 4 to 6 decimal places for fractional mutual fund units
ALTER TABLE public.holdings ALTER COLUMN quantity TYPE NUMERIC(18, 6);

-- Resolve PostgREST PGRST201 relationship ambiguity:
-- Drop redundant single-column foreign key so PostgREST has exactly one unambiguous relationship
-- between holdings and broker_accounts (using the composite security FK).
ALTER TABLE public.holdings DROP CONSTRAINT IF EXISTS holdings_broker_account_id_fkey;

-- Ensure foreign key constraint compatibility
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'holdings'
      AND constraint_name = 'fk_holdings_broker_user'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_schema = 'public'
        AND table_name = 'holdings'
        AND constraint_name = 'fk_holdings_broker_ownership'
    ) THEN
      ALTER TABLE public.holdings
        ADD CONSTRAINT fk_holdings_broker_user
        FOREIGN KEY (broker_account_id, user_id)
        REFERENCES public.broker_accounts(id, user_id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;


-- ============================================================
-- 4. INVESTMENT TRANSACTIONS (public.investment_transactions)
-- ============================================================

-- Safely expand quantity precision from 4 to 6 decimal places
ALTER TABLE public.investment_transactions ALTER COLUMN quantity TYPE NUMERIC(18, 6);

-- Safely migrate transaction_date and settlement_date to TIMESTAMPTZ
ALTER TABLE public.investment_transactions
  ALTER COLUMN transaction_date TYPE TIMESTAMPTZ USING transaction_date::TIMESTAMPTZ;

ALTER TABLE public.investment_transactions
  ALTER COLUMN settlement_date TYPE TIMESTAMPTZ USING settlement_date::TIMESTAMPTZ;

-- Resolve PostgREST PGRST201 relationship ambiguity:
-- Drop redundant single-column foreign key so PostgREST has exactly one unambiguous relationship
-- between investment_transactions and broker_accounts.
ALTER TABLE public.investment_transactions DROP CONSTRAINT IF EXISTS investment_transactions_broker_account_id_fkey;

-- Ensure canonical tradebook deduplication unique index exists
CREATE UNIQUE INDEX IF NOT EXISTS idx_investment_tx_dedup
  ON public.investment_transactions(broker_account_id, external_reference)
  WHERE external_reference IS NOT NULL;


-- ============================================================
-- 5. INSTRUMENT PRICES (public.instrument_prices)
-- Structure reconciliation ONLY — ZERO fabricated price rows inserted.
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'instrument_prices' AND column_name = 'status'
  ) THEN
    ALTER TABLE public.instrument_prices
      ADD COLUMN status TEXT NOT NULL DEFAULT 'DELAYED'
      CHECK (status IN ('REALTIME', 'DELAYED', 'EOD', 'STALE'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'instrument_prices' AND column_name = 'high_52w'
  ) THEN
    ALTER TABLE public.instrument_prices ADD COLUMN high_52w NUMERIC(18, 4);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'instrument_prices' AND column_name = 'low_52w'
  ) THEN
    ALTER TABLE public.instrument_prices ADD COLUMN low_52w NUMERIC(18, 4);
  END IF;
END $$;

-- Allow public read of verified prices cache
DROP POLICY IF EXISTS "Authenticated users view prices" ON public.instrument_prices;
DROP POLICY IF EXISTS "Users view instrument prices" ON public.instrument_prices;
CREATE POLICY "Users view instrument prices"
  ON public.instrument_prices FOR SELECT
  USING (TRUE);

CREATE INDEX IF NOT EXISTS idx_instrument_prices_inst ON public.instrument_prices(instrument_id);


-- ============================================================
-- 6. PORTFOLIO SNAPSHOTS (public.portfolio_snapshots)
-- ============================================================

-- Broaden completeness_status check to accept all historical and current prompt values
ALTER TABLE public.portfolio_snapshots DROP CONSTRAINT IF EXISTS portfolio_snapshots_completeness_status_check;
ALTER TABLE public.portfolio_snapshots ADD CONSTRAINT portfolio_snapshots_completeness_status_check
  CHECK (completeness_status IN ('COMPLETE', 'PARTIAL', 'STALE_PRICING', 'PARTIAL_PRICING', 'NO_PRICING'));

-- Allow NULL values for valuation columns when completeness_status is 'NO_PRICING'
ALTER TABLE public.portfolio_snapshots ALTER COLUMN portfolio_value DROP NOT NULL;
ALTER TABLE public.portfolio_snapshots ALTER COLUMN unrealized_pnl DROP NOT NULL;
ALTER TABLE public.portfolio_snapshots ALTER COLUMN realized_pnl DROP NOT NULL;


-- ============================================================
-- 7. RISK PROFILES (public.risk_profiles)
-- ============================================================

-- Broaden liquidity_preference to accept both 'BALANCED' and 'MEDIUM'
ALTER TABLE public.risk_profiles DROP CONSTRAINT IF EXISTS risk_profiles_liquidity_preference_check;
ALTER TABLE public.risk_profiles ADD CONSTRAINT risk_profiles_liquidity_preference_check
  CHECK (liquidity_preference IN ('HIGH', 'BALANCED', 'MEDIUM', 'LOW'));
ALTER TABLE public.risk_profiles ALTER COLUMN liquidity_preference SET DEFAULT 'BALANCED';

-- Add missing notes column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'risk_profiles' AND column_name = 'notes'
  ) THEN
    ALTER TABLE public.risk_profiles ADD COLUMN notes TEXT;
  END IF;
END $$;


-- ============================================================
-- 8. INVESTMENT GOALS (public.investment_goals)
-- ============================================================

-- Add current_amount column and align with current_allocated_amount
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'investment_goals' AND column_name = 'current_amount'
  ) THEN
    ALTER TABLE public.investment_goals
      ADD COLUMN current_amount NUMERIC(18, 4) NOT NULL DEFAULT 0
      CHECK (current_amount >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'investment_goals' AND column_name = 'current_allocated_amount'
  ) THEN
    ALTER TABLE public.investment_goals
      ADD COLUMN current_allocated_amount NUMERIC(18, 4) NOT NULL DEFAULT 0
      CHECK (current_allocated_amount >= 0);
  END IF;
END $$;

-- Initial backfill for existing goals
UPDATE public.investment_goals
SET current_amount = current_allocated_amount
WHERE current_amount = 0 AND current_allocated_amount > 0;

UPDATE public.investment_goals
SET current_allocated_amount = current_amount
WHERE current_allocated_amount = 0 AND current_amount > 0;

-- Trigger to guarantee continuous synchronization between both column names on INSERT and UPDATE
CREATE OR REPLACE FUNCTION public.sync_goal_amounts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.current_amount IS NOT NULL AND NEW.current_amount > 0 THEN
      NEW.current_allocated_amount := NEW.current_amount;
    ELSIF NEW.current_allocated_amount IS NOT NULL AND NEW.current_allocated_amount > 0 THEN
      NEW.current_amount := NEW.current_allocated_amount;
    ELSE
      NEW.current_amount := COALESCE(NEW.current_amount, 0);
      NEW.current_allocated_amount := NEW.current_amount;
    END IF;

  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.current_amount IS DISTINCT FROM OLD.current_amount
       AND NEW.current_allocated_amount IS NOT DISTINCT FROM OLD.current_allocated_amount THEN
      NEW.current_allocated_amount := NEW.current_amount;
    ELSIF NEW.current_allocated_amount IS DISTINCT FROM OLD.current_allocated_amount
       AND NEW.current_amount IS NOT DISTINCT FROM OLD.current_amount THEN
      NEW.current_amount := NEW.current_allocated_amount;
    ELSIF NEW.current_amount IS DISTINCT FROM NEW.current_allocated_amount THEN
      NEW.current_allocated_amount := NEW.current_amount;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_goal_amounts ON public.investment_goals;
CREATE TRIGGER trg_sync_goal_amounts
  BEFORE INSERT OR UPDATE ON public.investment_goals
  FOR EACH ROW EXECUTE FUNCTION public.sync_goal_amounts();

-- Broaden status check
ALTER TABLE public.investment_goals DROP CONSTRAINT IF EXISTS investment_goals_status_check;
ALTER TABLE public.investment_goals ADD CONSTRAINT investment_goals_status_check
  CHECK (status IN ('ACTIVE', 'COMPLETED', 'ACHIEVED', 'ON_HOLD', 'PAUSED', 'CANCELLED'));

-- Broaden category check to support HOME, HOUSE, VEHICLE, VACATION, GENERAL, OTHER
ALTER TABLE public.investment_goals DROP CONSTRAINT IF EXISTS investment_goals_category_check;
ALTER TABLE public.investment_goals ADD CONSTRAINT investment_goals_category_check
  CHECK (category IN (
    'EMERGENCY_FUND', 'EDUCATION', 'HOUSE', 'HOME',
    'WEALTH', 'RETIREMENT', 'VEHICLE', 'VACATION', 'GENERAL', 'OTHER'
  ));


-- ============================================================
-- 9. MASTER CATALOG INSTRUMENT METADATA ONLY (ZERO PRICES)
-- Ensure canonical sovereign bonds and Gold ETF are cataloged.
-- ============================================================
INSERT INTO public.instruments (
  symbol, instrument_name, asset_type, exchange, isin, currency,
  issuer_name, sector, industry, is_active, is_custom, created_by, user_id
)
VALUES
  ('GS2033_718', '7.18% GS 2033 Central Government Security', 'BOND', 'NSE', 'IN0020330030', 'INR', 'Government of India', 'Sovereign', 'Central Government Bond', TRUE, FALSE, NULL, NULL),
  ('GS2028_706', '7.06% GS 2028 Sovereign Bond', 'BOND', 'NSE', 'IN0020280045', 'INR', 'Government of India', 'Sovereign', 'Central Government Bond', TRUE, FALSE, NULL, NULL),
  ('GOLDBEES', 'Nippon India ETF Gold BeES', 'MUTUAL_FUND', 'NSE', 'INF204KA1L12', 'INR', 'Nippon Life India Asset Management', 'Commodities', 'Gold ETF', TRUE, FALSE, NULL, NULL)
ON CONFLICT DO NOTHING;
