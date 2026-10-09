-- ============================================================
-- FINOVA — Financial Database Architecture Migration
-- Prompt 5: Multi-Broker, Instruments Master, Holdings,
-- Transactions, Valuations, Snapshots, Risk & Goals
-- Version: 1.1.0
-- ============================================================

-- Ensure uuid extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. PRESERVE & CONFIRM EXISTING PROMPT 4 TABLES
--    (auth.users, public.profiles, public.user_agreements)
-- ============================================================
-- Ensure updated_at trigger function exists
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 2. BROKER ACCOUNTS (public.broker_accounts)
-- Stores broker/depository accounts belonging to Finova users.
-- Supports multiple accounts per broker, manual accounts, CSV, API.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.broker_accounts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  broker_code       TEXT NOT NULL,
  display_name      TEXT NOT NULL,
  account_type      TEXT NOT NULL DEFAULT 'broker' CHECK (account_type IN ('broker', 'depository', 'manual')),
  connection_status TEXT NOT NULL DEFAULT 'MANUAL' CHECK (connection_status IN ('MANUAL', 'NOT_CONNECTED', 'CONNECTED', 'ERROR', 'SYNCING')),
  data_source       TEXT NOT NULL DEFAULT 'MANUAL' CHECK (data_source IN ('MANUAL', 'CSV', 'API')),
  currency          TEXT NOT NULL DEFAULT 'INR' CHECK (char_length(currency) = 3),
  last_synced_at    TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Composite constraint enabling composite foreign key in child tables
  -- This guarantees child holdings/transactions cannot cross-reference another user's broker account
  CONSTRAINT uq_broker_accounts_id_user UNIQUE (id, user_id)
);

-- Enable RLS
ALTER TABLE public.broker_accounts ENABLE ROW LEVEL SECURITY;

-- Non-destructive column additions in case draft broker_accounts existed
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='broker_accounts' AND column_name='broker_code') THEN
    ALTER TABLE public.broker_accounts ADD COLUMN broker_code TEXT DEFAULT 'OTHER';
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='broker_accounts' AND column_name='broker_name') THEN
      UPDATE public.broker_accounts SET broker_code = UPPER(COALESCE(broker_name, 'OTHER'));
    END IF;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='broker_accounts' AND column_name='display_name') THEN
    ALTER TABLE public.broker_accounts ADD COLUMN display_name TEXT;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='broker_accounts' AND column_name='account_label') THEN
      UPDATE public.broker_accounts SET display_name = COALESCE(account_label, broker_name, 'Account');
    ELSE
      UPDATE public.broker_accounts SET display_name = 'Broker Account' WHERE display_name IS NULL;
    END IF;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='broker_accounts' AND column_name='connection_status') THEN
    ALTER TABLE public.broker_accounts ADD COLUMN connection_status TEXT DEFAULT 'MANUAL';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='broker_accounts' AND column_name='data_source') THEN
    ALTER TABLE public.broker_accounts ADD COLUMN data_source TEXT DEFAULT 'MANUAL';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='broker_accounts' AND column_name='currency') THEN
    ALTER TABLE public.broker_accounts ADD COLUMN currency TEXT DEFAULT 'INR';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='broker_accounts' AND column_name='last_synced_at') THEN
    ALTER TABLE public.broker_accounts ADD COLUMN last_synced_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='broker_accounts' AND column_name='updated_at') THEN
    ALTER TABLE public.broker_accounts ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Broker Accounts RLS Policies
DROP POLICY IF EXISTS "Users view own broker accounts" ON public.broker_accounts;
CREATE POLICY "Users view own broker accounts"
  ON public.broker_accounts FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own broker accounts" ON public.broker_accounts;
CREATE POLICY "Users insert own broker accounts"
  ON public.broker_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own broker accounts" ON public.broker_accounts;
CREATE POLICY "Users update own broker accounts"
  ON public.broker_accounts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own broker accounts" ON public.broker_accounts;
CREATE POLICY "Users delete own broker accounts"
  ON public.broker_accounts FOR DELETE
  USING (auth.uid() = user_id);

-- Broker Accounts updated_at trigger
DROP TRIGGER IF EXISTS trg_broker_accounts_updated_at ON public.broker_accounts;
CREATE TRIGGER trg_broker_accounts_updated_at
  BEFORE UPDATE ON public.broker_accounts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Indexing
CREATE INDEX IF NOT EXISTS idx_broker_accounts_user_id ON public.broker_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_broker_accounts_broker_code ON public.broker_accounts(broker_code);


-- ============================================================
-- 3. INVESTMENT INSTRUMENTS MASTER (public.instruments)
-- Standardized investment instruments (Stocks, Mutual Funds, REITs, InvITs, Bonds, Cash)
-- Shared reference catalog with secure custom instrument support.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.instruments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol            TEXT NOT NULL,
  instrument_name   TEXT NOT NULL,
  asset_type        TEXT NOT NULL CHECK (asset_type IN ('STOCK', 'MUTUAL_FUND', 'REIT', 'INVIT', 'BOND', 'CASH')),
  exchange          TEXT NOT NULL DEFAULT 'NSE' CHECK (exchange IN ('NSE', 'BSE', 'NCD', 'MCX', 'MUTUAL_FUND_INDIA', 'OTHER')),
  isin              TEXT,
  currency          TEXT NOT NULL DEFAULT 'INR' CHECK (char_length(currency) = 3),
  issuer_name       TEXT,
  sector            TEXT,
  industry          TEXT,
  maturity_date     DATE,
  coupon_rate       NUMERIC(8,4) CHECK (coupon_rate IS NULL OR coupon_rate >= 0),
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  is_custom         BOOLEAN NOT NULL DEFAULT FALSE,
  created_by        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata          JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.instruments ENABLE ROW LEVEL SECURITY;

-- Indices & Constraints
CREATE INDEX IF NOT EXISTS idx_instruments_symbol ON public.instruments(symbol);
CREATE INDEX IF NOT EXISTS idx_instruments_asset_type ON public.instruments(asset_type);
CREATE INDEX IF NOT EXISTS idx_instruments_isin ON public.instruments(isin);

-- Unique index on ISIN where ISIN is not null
CREATE UNIQUE INDEX IF NOT EXISTS idx_instruments_isin_unique
  ON public.instruments(isin) WHERE isin IS NOT NULL;

-- Unique index for global catalog (created_by IS NULL) per symbol and exchange
CREATE UNIQUE INDEX IF NOT EXISTS idx_instruments_global_sym_ex
  ON public.instruments(symbol, exchange) WHERE created_by IS NULL;

-- Unique index for user custom instruments
CREATE UNIQUE INDEX IF NOT EXISTS idx_instruments_custom_sym_user
  ON public.instruments(symbol, exchange, created_by) WHERE created_by IS NOT NULL;

-- Instruments RLS Policies:
-- 1. Authenticated users can view global instruments or their own custom instruments
DROP POLICY IF EXISTS "Users view global and own custom instruments" ON public.instruments;
CREATE POLICY "Users view global and own custom instruments"
  ON public.instruments FOR SELECT
  USING (created_by IS NULL OR auth.uid() = created_by);

-- 2. Authenticated users can create custom instruments only (is_custom = true and created_by = auth.uid())
DROP POLICY IF EXISTS "Users create own custom instruments" ON public.instruments;
CREATE POLICY "Users create own custom instruments"
  ON public.instruments FOR INSERT
  WITH CHECK (auth.uid() = created_by AND is_custom = TRUE);

-- 3. Users can only update their own custom instruments
DROP POLICY IF EXISTS "Users update own custom instruments" ON public.instruments;
CREATE POLICY "Users update own custom instruments"
  ON public.instruments FOR UPDATE
  USING (auth.uid() = created_by AND is_custom = TRUE)
  WITH CHECK (auth.uid() = created_by AND is_custom = TRUE);

-- 4. Users can only delete their own custom instruments
DROP POLICY IF EXISTS "Users delete own custom instruments" ON public.instruments;
CREATE POLICY "Users delete own custom instruments"
  ON public.instruments FOR DELETE
  USING (auth.uid() = created_by AND is_custom = TRUE);

-- Instruments updated_at trigger
DROP TRIGGER IF EXISTS trg_instruments_updated_at ON public.instruments;
CREATE TRIGGER trg_instruments_updated_at
  BEFORE UPDATE ON public.instruments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- ============================================================
-- 4. PORTFOLIO HOLDINGS (public.holdings)
-- Positions held across broker accounts.
-- Composite FK enforces strict user isolation matching broker_accounts(id, user_id).
-- Financial precision using NUMERIC(18,6) and NUMERIC(18,4).
-- ============================================================
CREATE TABLE IF NOT EXISTS public.holdings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  broker_account_id UUID NOT NULL,
  instrument_id     UUID NOT NULL REFERENCES public.instruments(id) ON DELETE RESTRICT,
  quantity          NUMERIC(18,6) NOT NULL CHECK (quantity > 0),
  average_buy_price NUMERIC(18,4) NOT NULL CHECK (average_buy_price >= 0),
  currency          TEXT NOT NULL DEFAULT 'INR' CHECK (char_length(currency) = 3),
  data_source       TEXT NOT NULL DEFAULT 'MANUAL' CHECK (data_source IN ('MANUAL', 'CSV', 'API')),
  as_of             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Composite Foreign Key: Guarantees holding CANNOT reference another user's broker account
  CONSTRAINT fk_holdings_broker_user FOREIGN KEY (broker_account_id, user_id)
    REFERENCES public.broker_accounts(id, user_id) ON DELETE CASCADE,

  -- Uniqueness per broker account position
  CONSTRAINT uq_holdings_broker_instrument UNIQUE (broker_account_id, instrument_id)
);

-- Enable RLS
ALTER TABLE public.holdings ENABLE ROW LEVEL SECURITY;

-- Holdings RLS Policies
DROP POLICY IF EXISTS "Users view own holdings" ON public.holdings;
CREATE POLICY "Users view own holdings"
  ON public.holdings FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own holdings" ON public.holdings;
CREATE POLICY "Users insert own holdings"
  ON public.holdings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own holdings" ON public.holdings;
CREATE POLICY "Users update own holdings"
  ON public.holdings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own holdings" ON public.holdings;
CREATE POLICY "Users delete own holdings"
  ON public.holdings FOR DELETE
  USING (auth.uid() = user_id);

-- Holdings updated_at trigger
DROP TRIGGER IF EXISTS trg_holdings_updated_at ON public.holdings;
CREATE TRIGGER trg_holdings_updated_at
  BEFORE UPDATE ON public.holdings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Indices
CREATE INDEX IF NOT EXISTS idx_holdings_user_id ON public.holdings(user_id);
CREATE INDEX IF NOT EXISTS idx_holdings_broker_account_id ON public.holdings(broker_account_id);
CREATE INDEX IF NOT EXISTS idx_holdings_instrument_id ON public.holdings(instrument_id);


-- ============================================================
-- 5. INVESTMENT TRANSACTIONS (public.investment_transactions)
-- Activity / transaction history ledger for audit, accounting and reconciliation.
-- Supports BUY, SELL, DIVIDEND, INTEREST, COUPON, BONUS, SPLIT, FEE.
-- Flexible model: Non-share transactions (dividend, fee) do not require artificial share prices.
-- Deduplication via external_reference.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.investment_transactions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  broker_account_id   UUID NOT NULL,
  instrument_id       UUID NOT NULL REFERENCES public.instruments(id) ON DELETE RESTRICT,
  transaction_type    TEXT NOT NULL CHECK (transaction_type IN ('BUY', 'SELL', 'DIVIDEND', 'INTEREST', 'COUPON', 'BONUS', 'SPLIT', 'FEE')),
  quantity            NUMERIC(18,6) NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  unit_price          NUMERIC(18,4) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  gross_amount        NUMERIC(18,4) NOT NULL CHECK (gross_amount >= 0),
  fees                NUMERIC(18,4) NOT NULL DEFAULT 0 CHECK (fees >= 0),
  taxes               NUMERIC(18,4) NOT NULL DEFAULT 0 CHECK (taxes >= 0),
  net_amount          NUMERIC(18,4) NOT NULL CHECK (net_amount >= 0),
  currency            TEXT NOT NULL DEFAULT 'INR' CHECK (char_length(currency) = 3),
  transaction_date    TIMESTAMPTZ NOT NULL,
  settlement_date     TIMESTAMPTZ,
  source              TEXT NOT NULL DEFAULT 'MANUAL' CHECK (source IN ('MANUAL', 'CSV', 'API')),
  external_reference  TEXT,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Composite Foreign Key: Guarantees transaction belongs to same user as broker account
  CONSTRAINT fk_transactions_broker_user FOREIGN KEY (broker_account_id, user_id)
    REFERENCES public.broker_accounts(id, user_id) ON DELETE CASCADE,

  -- Transaction quantity & amount integrity rule
  CONSTRAINT chk_tx_quantities_and_amounts CHECK (
    (transaction_type IN ('BUY', 'SELL') AND quantity > 0 AND unit_price > 0) OR
    (transaction_type IN ('DIVIDEND', 'INTEREST', 'COUPON', 'FEE') AND gross_amount >= 0) OR
    (transaction_type IN ('BONUS', 'SPLIT') AND quantity > 0)
  )
);

-- Enable RLS
ALTER TABLE public.investment_transactions ENABLE ROW LEVEL SECURITY;

-- Transactions RLS Policies
DROP POLICY IF EXISTS "Users view own transactions" ON public.investment_transactions;
CREATE POLICY "Users view own transactions"
  ON public.investment_transactions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own transactions" ON public.investment_transactions;
CREATE POLICY "Users insert own transactions"
  ON public.investment_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own transactions" ON public.investment_transactions;
CREATE POLICY "Users update own transactions"
  ON public.investment_transactions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own transactions" ON public.investment_transactions;
CREATE POLICY "Users delete own transactions"
  ON public.investment_transactions FOR DELETE
  USING (auth.uid() = user_id);

-- Indices & Deduplication
CREATE INDEX IF NOT EXISTS idx_investment_tx_user_date ON public.investment_transactions(user_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_investment_tx_broker_account ON public.investment_transactions(broker_account_id);
CREATE INDEX IF NOT EXISTS idx_investment_tx_instrument ON public.investment_transactions(instrument_id);

-- Unique index to prevent duplicate CSV imports using broker reference
CREATE UNIQUE INDEX IF NOT EXISTS idx_investment_tx_dedup
  ON public.investment_transactions(broker_account_id, external_reference)
  WHERE external_reference IS NOT NULL;


-- ============================================================
-- 6. INSTRUMENT MARKET PRICES (public.instrument_prices)
-- Current asset valuation data cache/master.
-- Distinguishes real-time vs delayed vs EOD.
-- Compatible with Yahoo Finance and licensed provider feeds.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.instrument_prices (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instrument_id     UUID NOT NULL UNIQUE REFERENCES public.instruments(id) ON DELETE CASCADE,
  price             NUMERIC(18,4) NOT NULL CHECK (price >= 0),
  currency          TEXT NOT NULL DEFAULT 'INR' CHECK (char_length(currency) = 3),
  source            TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'DELAYED' CHECK (status IN ('REALTIME', 'DELAYED', 'EOD', 'STALE')),
  day_change        NUMERIC(18,4),
  day_change_pct    NUMERIC(8,4),
  high_52w          NUMERIC(18,4),
  low_52w           NUMERIC(18,4),
  volume            NUMERIC(20,2),
  price_timestamp   TIMESTAMPTZ NOT NULL,
  received_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.instrument_prices ENABLE ROW LEVEL SECURITY;

-- Read-only policy for authenticated users
DROP POLICY IF EXISTS "Users view instrument prices" ON public.instrument_prices;
CREATE POLICY "Users view instrument prices"
  ON public.instrument_prices FOR SELECT
  USING (TRUE);

CREATE INDEX IF NOT EXISTS idx_instrument_prices_inst ON public.instrument_prices(instrument_id);


-- ============================================================
-- 7. PORTFOLIO SNAPSHOTS (public.portfolio_snapshots)
-- Historical portfolio valuation points for performance charts and tracking.
-- Handles complete vs partial vs no pricing states cleanly.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.portfolio_snapshots (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot_date         DATE NOT NULL,
  invested_value        NUMERIC(18,4) NOT NULL CHECK (invested_value >= 0),
  portfolio_value       NUMERIC(18,4) CHECK (portfolio_value IS NULL OR portfolio_value >= 0),
  unrealized_pnl        NUMERIC(18,4),
  realized_pnl          NUMERIC(18,4),
  currency              TEXT NOT NULL DEFAULT 'INR' CHECK (char_length(currency) = 3),
  pricing_timestamp     TIMESTAMPTZ,
  completeness_status   TEXT NOT NULL DEFAULT 'COMPLETE' CHECK (completeness_status IN ('COMPLETE', 'PARTIAL_PRICING', 'NO_PRICING')),
  metadata              JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One snapshot record per user per calendar day
  CONSTRAINT uq_portfolio_snapshots_user_date UNIQUE (user_id, snapshot_date)
);

-- Enable RLS
ALTER TABLE public.portfolio_snapshots ENABLE ROW LEVEL SECURITY;

-- Portfolio Snapshots RLS Policies
DROP POLICY IF EXISTS "Users view own portfolio snapshots" ON public.portfolio_snapshots;
CREATE POLICY "Users view own portfolio snapshots"
  ON public.portfolio_snapshots FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own portfolio snapshots" ON public.portfolio_snapshots;
CREATE POLICY "Users insert own portfolio snapshots"
  ON public.portfolio_snapshots FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own portfolio snapshots" ON public.portfolio_snapshots;
CREATE POLICY "Users update own portfolio snapshots"
  ON public.portfolio_snapshots FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own portfolio snapshots" ON public.portfolio_snapshots;
CREATE POLICY "Users delete own portfolio snapshots"
  ON public.portfolio_snapshots FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_portfolio_snapshots_user_date ON public.portfolio_snapshots(user_id, snapshot_date DESC);


-- ============================================================
-- 8. RISK PROFILES (public.risk_profiles)
-- User investment preferences for educational portfolio-risk analysis.
-- Minimal, safe, no PAN/Aadhaar/bank credentials.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.risk_profiles (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  risk_preference       TEXT NOT NULL DEFAULT 'MODERATE' CHECK (risk_preference IN ('CONSERVATIVE', 'MODERATE', 'AGGRESSIVE')),
  investment_horizon    TEXT NOT NULL DEFAULT 'MEDIUM_TERM' CHECK (investment_horizon IN ('SHORT_TERM', 'MEDIUM_TERM', 'LONG_TERM')),
  liquidity_preference  TEXT NOT NULL DEFAULT 'BALANCED' CHECK (liquidity_preference IN ('HIGH', 'BALANCED', 'LOW')),
  experience_level      TEXT NOT NULL DEFAULT 'INTERMEDIATE' CHECK (experience_level IN ('BEGINNER', 'INTERMEDIATE', 'ADVANCED')),
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.risk_profiles ENABLE ROW LEVEL SECURITY;

-- Risk Profiles RLS Policies
DROP POLICY IF EXISTS "Users view own risk profile" ON public.risk_profiles;
CREATE POLICY "Users view own risk profile"
  ON public.risk_profiles FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own risk profile" ON public.risk_profiles;
CREATE POLICY "Users insert own risk profile"
  ON public.risk_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own risk profile" ON public.risk_profiles;
CREATE POLICY "Users update own risk profile"
  ON public.risk_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own risk profile" ON public.risk_profiles;
CREATE POLICY "Users delete own risk profile"
  ON public.risk_profiles FOR DELETE
  USING (auth.uid() = user_id);

-- Risk profile updated_at trigger
DROP TRIGGER IF EXISTS trg_risk_profiles_updated_at ON public.risk_profiles;
CREATE TRIGGER trg_risk_profiles_updated_at
  BEFORE UPDATE ON public.risk_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- ============================================================
-- 9. INVESTMENT GOALS (public.investment_goals)
-- User-defined investment targets (Emergency Fund, Higher Education, Home, etc.)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.investment_goals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_name     TEXT NOT NULL,
  target_amount NUMERIC(18,4) NOT NULL CHECK (target_amount > 0),
  current_amount NUMERIC(18,4) NOT NULL DEFAULT 0 CHECK (current_amount >= 0),
  target_date   DATE NOT NULL,
  currency      TEXT NOT NULL DEFAULT 'INR' CHECK (char_length(currency) = 3),
  priority      TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH')),
  status        TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ACHIEVED', 'PAUSED', 'CANCELLED')),
  category      TEXT NOT NULL DEFAULT 'GENERAL' CHECK (category IN ('EMERGENCY_FUND', 'EDUCATION', 'HOME', 'WEALTH', 'RETIREMENT', 'VEHICLE', 'VACATION', 'GENERAL')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.investment_goals ENABLE ROW LEVEL SECURITY;

-- Investment Goals RLS Policies
DROP POLICY IF EXISTS "Users view own investment goals" ON public.investment_goals;
CREATE POLICY "Users view own investment goals"
  ON public.investment_goals FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own investment goals" ON public.investment_goals;
CREATE POLICY "Users insert own investment goals"
  ON public.investment_goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own investment goals" ON public.investment_goals;
CREATE POLICY "Users update own investment goals"
  ON public.investment_goals FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own investment goals" ON public.investment_goals;
CREATE POLICY "Users delete own investment goals"
  ON public.investment_goals FOR DELETE
  USING (auth.uid() = user_id);

-- Investment Goals updated_at trigger
DROP TRIGGER IF EXISTS trg_investment_goals_updated_at ON public.investment_goals;
CREATE TRIGGER trg_investment_goals_updated_at
  BEFORE UPDATE ON public.investment_goals
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_investment_goals_user ON public.investment_goals(user_id, status);
CREATE INDEX IF NOT EXISTS idx_investment_goals_target_date ON public.investment_goals(user_id, target_date);


-- ============================================================
-- 10. SEED GLOBAL REFERENCE INSTRUMENTS
-- Curated initial instruments representing all Phase 1 asset categories:
-- Stocks, REITs, InvITs, Bonds, Mutual Funds
-- ============================================================
INSERT INTO public.instruments (symbol, instrument_name, asset_type, exchange, isin, currency, issuer_name, sector, industry)
VALUES
  ('RELIANCE', 'Reliance Industries Ltd', 'STOCK', 'NSE', 'INE002A01018', 'INR', 'Reliance Industries Limited', 'Energy', 'Oil & Gas Refining & Marketing'),
  ('TCS', 'Tata Consultancy Services Ltd', 'STOCK', 'NSE', 'INE467B01029', 'INR', 'Tata Group', 'Information Technology', 'IT Consulting & Services'),
  ('INFY', 'Infosys Ltd', 'STOCK', 'NSE', 'INE009A01021', 'INR', 'Infosys Limited', 'Information Technology', 'IT Consulting & Services'),
  ('HDFCBANK', 'HDFC Bank Ltd', 'STOCK', 'NSE', 'INE040A01034', 'INR', 'HDFC Bank', 'Financial Services', 'Private Sector Banks'),
  ('ICICIBANK', 'ICICI Bank Ltd', 'STOCK', 'NSE', 'INE090A01021', 'INR', 'ICICI Bank', 'Financial Services', 'Private Sector Banks'),
  ('EMBASSY', 'Embassy Office Parks REIT', 'REIT', 'NSE', 'INE041025011', 'INR', 'Embassy Group & Blackstone', 'Real Estate', 'Office REIT'),
  ('MINDSPACE', 'Mindspace Business Parks REIT', 'REIT', 'NSE', 'INE0CCU25019', 'INR', 'K Raheja Corp & Blackstone', 'Real Estate', 'Office REIT'),
  ('BIRET', 'Brookfield India Real Estate Trust', 'REIT', 'NSE', 'INE0HR325010', 'INR', 'Brookfield Asset Management', 'Real Estate', 'Commercial REIT'),
  ('PGINVIT', 'POWERGRID Infrastructure Investment Trust', 'INVIT', 'NSE', 'INE0CW523019', 'INR', 'Power Grid Corporation of India', 'Utilities', 'Power Transmission InvIT'),
  ('IRBINVIT', 'IRB InvIT Fund', 'INVIT', 'NSE', 'INE183W23014', 'INR', 'IRB Infrastructure Developers', 'Infrastructure', 'Road Transport & Highways'),
  ('GS2033_718', '7.18% GS 2033 Central Government Security', 'BOND', 'NSE', 'IN0020330030', 'INR', 'Government of India', 'Sovereign', 'Central Government Bond'),
  ('GS2028_706', '7.06% GS 2028 Sovereign Bond', 'BOND', 'NSE', 'IN0020280045', 'INR', 'Government of India', 'Sovereign', 'Central Government Bond'),
  ('NIFTYBEES', 'Nippon India ETF Nifty BeES', 'MUTUAL_FUND', 'NSE', 'INF204KB14I2', 'INR', 'Nippon Life India Asset Management', 'Asset Management', 'Index ETF'),
  ('GOLDBEES', 'Nippon India ETF Gold BeES', 'MUTUAL_FUND', 'NSE', 'INF204KA1L12', 'INR', 'Nippon Life India Asset Management', 'Commodities', 'Gold ETF')
ON CONFLICT DO NOTHING;
