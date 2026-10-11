-- ============================================================
-- FINOVA — Migration: Secure Financial Ledger, RLS Bypass Guard & Legacy Provenance Protection
-- File: supabase/migrations/20261011020000_secure_financial_ledger_and_legacy_provenance.sql
--
-- PURPOSE & ARCHITECTURE (CRITICAL PATCH 1.2):
-- 1. Eliminate Financial Integrity Bypass Parameters:
--    - Drops legacy signatures of record_transaction_atomic, update_transaction_atomic,
--      and delete_transaction_atomic that accepted p_reconcile_holding or p_allow_oversell.
--    - Unconditionally enforces portfolio position reconciliation and overselling rejection
--      at the database engine level.
-- 2. Full-Sale Accounting & Chronological Replay:
--    - When all units are sold, position is zero (never resurrected merely because opening_quantity > 0).
--    - Opening balance is strictly an accounting baseline, not a minimum quantity.
--    - record_transaction_atomic delegates to chronological replay, ensuring backdated and out-of-order
--      trades produce exact WAC without race conditions or order-dependent cost drift.
-- 3. Legacy Provenance Protection:
--    - Flag historical holdings with NULL opening_quantity as provenance_status = 'UNKNOWN'.
--    - Never automatically backfill unverifiable historical balances.
--    - Block destructive reconciliation when original position cannot be established reliably.
-- 4. Direct Financial-Table Mutation Bypass Guard:
--    - Enforces RESTRICTIVE policies on public.investment_transactions blocking direct INSERT/UPDATE/DELETE.
--    - Preserves manual holdings CRUD and snapshot imports strictly for non-ledger positions.
-- 5. Preserves Owner's Manual Safeguard:
--    - Does NOT drop or alter the owner's active "Block direct broker deletion" policy on broker_accounts.
--
-- MANUAL EXECUTION INSTRUCTIONS:
-- Run this SQL in the Supabase SQL Editor:
-- Dashboard -> SQL Editor -> New Query -> Paste & Run.
-- ============================================================


-- ============================================================
-- SECTION 1: SCHEMA COLUMNS & PROVENANCE METADATA
-- ============================================================

-- Drop legacy duplicate foreign keys to prevent PostgREST PGRST201 relationship ambiguity
ALTER TABLE public.holdings DROP CONSTRAINT IF EXISTS fk_holdings_broker_ownership;
ALTER TABLE public.investment_transactions DROP CONSTRAINT IF EXISTS fk_transactions_broker_ownership;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'holdings' AND column_name = 'opening_quantity'
  ) THEN
    ALTER TABLE public.holdings ADD COLUMN opening_quantity NUMERIC(18, 6) DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'holdings' AND column_name = 'opening_buy_price'
  ) THEN
    ALTER TABLE public.holdings ADD COLUMN opening_buy_price NUMERIC(18, 4) DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'holdings' AND column_name = 'is_ledger_managed'
  ) THEN
    ALTER TABLE public.holdings ADD COLUMN is_ledger_managed BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'holdings' AND column_name = 'provenance_status'
  ) THEN
    ALTER TABLE public.holdings ADD COLUMN provenance_status TEXT NOT NULL DEFAULT 'MANUAL_DECLARED';
  ELSE
    ALTER TABLE public.holdings ALTER COLUMN provenance_status SET DEFAULT 'MANUAL_DECLARED';
  END IF;
END $$;

-- Flag ambiguous historical holdings with NULL opening quantity as UNKNOWN provenance.
-- We do NOT guess or automatically fabricate opening balances.
UPDATE public.holdings
SET provenance_status = 'UNKNOWN'
WHERE opening_quantity IS NULL;

-- Enforce database constraint preventing contradictory provenance status:
-- If provenance_status is VERIFIED, MANUAL_DECLARED, CSV_SNAPSHOT or LEDGER_DERIVED, opening_quantity and price cannot be NULL.
ALTER TABLE public.holdings DROP CONSTRAINT IF EXISTS chk_holdings_provenance_consistency;
ALTER TABLE public.holdings ADD CONSTRAINT chk_holdings_provenance_consistency CHECK (
  (provenance_status = 'UNKNOWN' AND (opening_quantity IS NULL OR opening_quantity >= 0)) OR
  (provenance_status IN ('VERIFIED', 'MANUAL_DECLARED', 'CSV_SNAPSHOT', 'LEDGER_DERIVED') AND opening_quantity IS NOT NULL AND opening_quantity >= 0 AND opening_buy_price IS NOT NULL AND opening_buy_price >= 0)
);

-- Forward-only constraint migration: Relax CHECK (quantity > 0) to CHECK (quantity >= 0)
-- Original schema in 20261009000000 enforced CHECK (quantity > 0). Reconciled full liquidations
-- store quantity = 0 to retain historical cost and opening baseline without constraint violations.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT conname
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND t.relname = 'holdings'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) LIKE '%quantity > 0%'
  ) LOOP
    EXECUTE format('ALTER TABLE public.holdings DROP CONSTRAINT %I', r.conname);
  END LOOP;

  ALTER TABLE public.holdings DROP CONSTRAINT IF EXISTS holdings_quantity_check;
  ALTER TABLE public.holdings ADD CONSTRAINT holdings_quantity_check CHECK (quantity >= 0);
END $$;


-- ============================================================
-- SECTION 2: ROW-LEVEL SECURITY — BLOCK DIRECT TRANSACTION MUTATIONS
-- ============================================================
-- Drop permissive write policies on investment_transactions
DROP POLICY IF EXISTS "Users insert own transactions" ON public.investment_transactions;
DROP POLICY IF EXISTS "Users update own transactions" ON public.investment_transactions;
DROP POLICY IF EXISTS "Users delete own transactions" ON public.investment_transactions;
DROP POLICY IF EXISTS "Block direct transaction insert" ON public.investment_transactions;
DROP POLICY IF EXISTS "Block direct transaction update" ON public.investment_transactions;
DROP POLICY IF EXISTS "Block direct transaction delete" ON public.investment_transactions;

-- Ensure read access remains open for authenticated owner
DROP POLICY IF EXISTS "Users view own transactions" ON public.investment_transactions;
CREATE POLICY "Users view own transactions"
  ON public.investment_transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Enforce strict database-level RESTRICTIVE block on direct table mutations for authenticated users.
-- All transaction inserts, updates, and deletes MUST proceed through atomic RPCs.
CREATE POLICY "Block direct transaction insert"
  ON public.investment_transactions
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "Block direct transaction update"
  ON public.investment_transactions
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (false);

CREATE POLICY "Block direct transaction delete"
  ON public.investment_transactions
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (false);


-- ============================================================
-- SECTION 3: ROW-LEVEL SECURITY — SECURE HOLDINGS WHILE PRESERVING MANUAL CRUD
-- ============================================================
-- Drop old permissive policies on holdings
DROP POLICY IF EXISTS "Users insert own holdings" ON public.holdings;
DROP POLICY IF EXISTS "Users update own holdings" ON public.holdings;
DROP POLICY IF EXISTS "Users delete own holdings" ON public.holdings;
DROP POLICY IF EXISTS "Users insert own manual holdings" ON public.holdings;
DROP POLICY IF EXISTS "Users update own manual holdings" ON public.holdings;
DROP POLICY IF EXISTS "Users delete own manual holdings" ON public.holdings;

-- Ensure read access remains open for authenticated owner
DROP POLICY IF EXISTS "Users view own holdings" ON public.holdings;
CREATE POLICY "Users view own holdings"
  ON public.holdings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 1. Manual holding insertion (direct CRUD / snapshot CSV import):
-- Permitted ONLY if is_ledger_managed = FALSE and NO transactions exist for this broker + instrument.
CREATE POLICY "Users insert own manual holdings"
  ON public.holdings FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND COALESCE(is_ledger_managed, false) = false
    AND NOT EXISTS (
      SELECT 1 FROM public.investment_transactions t
      WHERE t.user_id = auth.uid()
        AND t.broker_account_id = holdings.broker_account_id
        AND t.instrument_id = holdings.instrument_id
    )
  );

-- 2. Manual holding updates:
-- Permitted ONLY if is_ledger_managed = FALSE and NO transactions exist for this broker + instrument.
CREATE POLICY "Users update own manual holdings"
  ON public.holdings FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
    AND COALESCE(is_ledger_managed, false) = false
    AND NOT EXISTS (
      SELECT 1 FROM public.investment_transactions t
      WHERE t.user_id = auth.uid()
        AND t.broker_account_id = holdings.broker_account_id
        AND t.instrument_id = holdings.instrument_id
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    AND COALESCE(is_ledger_managed, false) = false
    AND NOT EXISTS (
      SELECT 1 FROM public.investment_transactions t
      WHERE t.user_id = auth.uid()
        AND t.broker_account_id = holdings.broker_account_id
        AND t.instrument_id = holdings.instrument_id
    )
  );

-- 3. Manual holding deletion:
-- Permitted ONLY if is_ledger_managed = FALSE and NO transactions exist for this broker + instrument.
CREATE POLICY "Users delete own manual holdings"
  ON public.holdings FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
    AND COALESCE(is_ledger_managed, false) = false
    AND NOT EXISTS (
      SELECT 1 FROM public.investment_transactions t
      WHERE t.user_id = auth.uid()
        AND t.broker_account_id = holdings.broker_account_id
        AND t.instrument_id = holdings.instrument_id
    )
  );


-- ============================================================
-- SECTION 3B: DATABASE BOUNDARY TRIGGER — INVARIANT ENFORCEMENT
-- ============================================================
-- Automatically establishes verified baseline provenance on manual & snapshot inserts,
-- synchronizes opening baseline on authorized quantity/price edits when 0 transactions exist,
-- and prevents contradictory provenance claims or direct mutation of ledger-managed positions.
CREATE OR REPLACE FUNCTION public.maintain_holding_baseline_invariants()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_has_tx BOOLEAN := FALSE;
BEGIN
  -- Determine whether transactions exist for this broker account & instrument
  SELECT EXISTS (
    SELECT 1 FROM public.investment_transactions t
    WHERE t.broker_account_id = NEW.broker_account_id
      AND t.instrument_id = NEW.instrument_id
  ) INTO v_has_tx;

  -- 1. On INSERT:
  IF TG_OP = 'INSERT' THEN
    -- If holding is manual (not ledger-managed) and no transactions exist:
    IF COALESCE(NEW.is_ledger_managed, FALSE) = FALSE AND NOT v_has_tx THEN
      -- Automatically establish opening baseline for manual and snapshot entries
      IF NEW.opening_quantity IS NULL AND NEW.provenance_status IN ('MANUAL_DECLARED', 'CSV_SNAPSHOT') THEN
        NEW.opening_quantity := NEW.quantity;
        NEW.opening_buy_price := NEW.average_buy_price;
      END IF;
    END IF;
  END IF;

  -- 2. On UPDATE:
  IF TG_OP = 'UPDATE' THEN
    -- Block authenticated users or external mutations from directly reverting ledger-managed positions while transactions exist
    IF OLD.is_ledger_managed = TRUE AND NEW.is_ledger_managed = FALSE THEN
      IF v_has_tx OR current_user = 'authenticated' OR COALESCE(NULLIF(current_setting('request.jwt.claim.role', true), ''), '') = 'authenticated' THEN
        RAISE EXCEPTION 'Cannot manually revert ledger-managed holding to unmanaged state.'
          USING ERRCODE = '55000';
      END IF;
    END IF;

    -- If holding was manual (not ledger-managed) and no transactions exist:
    IF COALESCE(OLD.is_ledger_managed, FALSE) = FALSE AND NOT v_has_tx THEN
      -- If quantity or average buy price was edited:
      IF (NEW.quantity IS DISTINCT FROM OLD.quantity OR NEW.average_buy_price IS DISTINCT FROM OLD.average_buy_price) THEN
        -- If it is an active/declared holding (not unknown legacy holding with NULL baseline):
        IF OLD.provenance_status != 'UNKNOWN' OR OLD.opening_quantity IS NOT NULL THEN
          NEW.opening_quantity := NEW.quantity;
          NEW.opening_buy_price := NEW.average_buy_price;
          IF NEW.provenance_status = 'UNKNOWN' THEN
            NEW.provenance_status := 'MANUAL_DECLARED';
          END IF;
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_maintain_holding_baseline_invariants ON public.holdings;
CREATE TRIGGER trg_maintain_holding_baseline_invariants
  BEFORE INSERT OR UPDATE ON public.holdings
  FOR EACH ROW
  EXECUTE FUNCTION public.maintain_holding_baseline_invariants();


-- ============================================================
-- SECTION 4: HARDENED RECONCILE_POSITION_ATOMIC FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION public.reconcile_position_atomic(
  p_broker_account_id UUID,
  p_instrument_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_holding public.holdings%ROWTYPE;
  v_tx RECORD;
  v_running_qty NUMERIC := 0;
  v_running_cost NUMERIC := 0;
  v_current_avg NUMERIC := 0;
  v_base_qty NUMERIC := 0;
  v_base_price NUMERIC := 0;
  v_has_tx BOOLEAN := FALSE;
  v_is_legacy_unanchored BOOLEAN := FALSE;
  v_result JSONB;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required: auth.uid() is null' USING ERRCODE = '28000';
  END IF;

  -- Validate broker account ownership
  PERFORM 1 FROM public.broker_accounts
  WHERE id = p_broker_account_id AND user_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Broker account % not found or does not belong to authenticated user.', p_broker_account_id
      USING ERRCODE = '42501';
  END IF;

  -- Lock holding row to serialize updates
  SELECT * INTO v_holding
  FROM public.holdings
  WHERE user_id = v_user_id
    AND broker_account_id = p_broker_account_id
    AND instrument_id = p_instrument_id
  FOR UPDATE;

  -- Determine opening baseline:
  IF v_holding.id IS NOT NULL THEN
    IF v_holding.opening_quantity IS NOT NULL THEN
      v_base_qty := v_holding.opening_quantity;
      v_base_price := COALESCE(v_holding.opening_buy_price, 0);
    ELSE
      -- Legacy holding where opening_quantity was not established
      v_is_legacy_unanchored := TRUE;
    END IF;
  END IF;

  -- Check if transactions exist
  SELECT EXISTS (
    SELECT 1 FROM public.investment_transactions
    WHERE user_id = v_user_id
      AND broker_account_id = p_broker_account_id
      AND instrument_id = p_instrument_id
  ) INTO v_has_tx;

  -- CASE 1: If NO transactions exist for this security:
  IF NOT v_has_tx THEN
    IF v_holding.id IS NOT NULL THEN
      IF v_is_legacy_unanchored THEN
        -- Legacy holding with no transactions: preserve safely, do not eliminate!
        RETURN jsonb_build_object(
          'status', 'LEGACY_HOLDING_PRESERVED',
          'holding', to_jsonb(v_holding),
          'quantity', v_holding.quantity,
          'average_buy_price', v_holding.average_buy_price
        );
      ELSIF v_base_qty > 0 THEN
        -- Genuine manual opening holding exists: restore to opening baseline
        UPDATE public.holdings
        SET quantity = v_base_qty,
            average_buy_price = v_base_price,
            is_ledger_managed = FALSE,
            updated_at = NOW()
        WHERE id = v_holding.id
        RETURNING * INTO v_holding;

        RETURN jsonb_build_object(
          'status', 'OPENING_BALANCE_RESTORED',
          'holding', to_jsonb(v_holding),
          'quantity', v_base_qty,
          'average_buy_price', v_base_price
        );
      ELSE
        -- Position was created purely by ledger trades and now all trades are deleted:
        -- Eliminate ghost holding
        IF v_holding.is_ledger_managed THEN
          DELETE FROM public.holdings WHERE id = v_holding.id;
          RETURN jsonb_build_object(
            'status', 'GHOST_HOLDING_ELIMINATED',
            'holding', NULL,
            'quantity', 0,
            'average_buy_price', 0
          );
        ELSE
          RETURN jsonb_build_object(
            'status', 'MANUAL_HOLDING_PRESERVED',
            'holding', to_jsonb(v_holding),
            'quantity', v_holding.quantity,
            'average_buy_price', v_holding.average_buy_price
          );
        END IF;
      END IF;
    ELSE
      RETURN jsonb_build_object(
        'status', 'NO_HOLDING_NO_TRANSACTIONS',
        'holding', NULL,
        'quantity', 0,
        'average_buy_price', 0
      );
    END IF;
  END IF;

  -- CASE 2: Transactions exist:
  -- If legacy holding has unknown opening baseline, block destructive reconciliation
  IF v_is_legacy_unanchored THEN
    RAISE EXCEPTION 'Cannot perform destructive reconciliation on legacy holding for instrument %: opening position provenance is unverified (opening_quantity is NULL). Please declare verified opening balance before reconciling.',
      p_instrument_id
      USING ERRCODE = '22000';
  END IF;

  v_running_qty := v_base_qty;
  v_running_cost := round(v_base_qty * v_base_price, 4);
  v_current_avg := v_base_price;

  -- Replay all transactions chronologically with WAC
  FOR v_tx IN (
    SELECT *
    FROM public.investment_transactions
    WHERE user_id = v_user_id
      AND broker_account_id = p_broker_account_id
      AND instrument_id = p_instrument_id
    ORDER BY transaction_date ASC, created_at ASC
  ) LOOP
    IF v_tx.transaction_type = 'BUY' THEN
      v_running_qty := round(v_running_qty + v_tx.quantity, 6);
      v_running_cost := round(v_running_cost + (v_tx.quantity * v_tx.unit_price), 4);
      v_current_avg := CASE WHEN v_running_qty > 0 THEN round(v_running_cost / v_running_qty, 4) ELSE 0 END;

    ELSIF v_tx.transaction_type = 'SELL' THEN
      IF v_tx.quantity > v_running_qty THEN
        RAISE EXCEPTION 'Unsafe transaction state: SELL of % units exceeds available position of % units on %',
          v_tx.quantity, v_running_qty, v_tx.transaction_date
          USING ERRCODE = '22003';
      END IF;
      v_running_qty := round(GREATEST(0, v_running_qty - v_tx.quantity), 6);
      v_running_cost := round(v_running_qty * v_current_avg, 4);

    ELSIF v_tx.transaction_type IN ('BONUS', 'SPLIT') THEN
      v_running_qty := round(v_running_qty + v_tx.quantity, 6);
      v_current_avg := CASE WHEN v_running_qty > 0 THEN round(v_running_cost / v_running_qty, 4) ELSE 0 END;
    END IF;
  END LOOP;

  -- Persist recalculated holding position:
  IF v_running_qty > 0 THEN
    -- Position remains open
    IF v_holding.id IS NOT NULL THEN
      UPDATE public.holdings
      SET quantity = v_running_qty,
          average_buy_price = v_current_avg,
          opening_quantity = v_base_qty,
          opening_buy_price = v_base_price,
          is_ledger_managed = TRUE,
          updated_at = NOW()
      WHERE id = v_holding.id
      RETURNING * INTO v_holding;
    ELSE
      INSERT INTO public.holdings (
        user_id,
        broker_account_id,
        instrument_id,
        quantity,
        average_buy_price,
        currency,
        data_source,
        as_of,
        opening_quantity,
        opening_buy_price,
        is_ledger_managed
      ) VALUES (
        v_user_id,
        p_broker_account_id,
        p_instrument_id,
        v_running_qty,
        v_current_avg,
        'INR',
        'MANUAL',
        NOW(),
        v_base_qty,
        v_base_price,
        TRUE
      )
      RETURNING * INTO v_holding;
    END IF;
  ELSE
    -- Position completely liquidated (v_running_qty = 0)
    -- In full-sale accounting: remaining position is exactly zero!
    -- Never restore sold opening units merely because opening_quantity > 0!
    IF v_holding.id IS NOT NULL THEN
      UPDATE public.holdings
      SET quantity = 0,
          average_buy_price = v_current_avg,
          opening_quantity = v_base_qty,
          opening_buy_price = v_base_price,
          is_ledger_managed = TRUE,
          updated_at = NOW()
      WHERE id = v_holding.id
      RETURNING * INTO v_holding;
    END IF;
  END IF;

  v_result := jsonb_build_object(
    'broker_account_id', p_broker_account_id,
    'instrument_id', p_instrument_id,
    'quantity', v_running_qty,
    'average_buy_price', v_current_avg,
    'opening_quantity', v_base_qty,
    'holding', CASE WHEN v_holding.id IS NOT NULL THEN to_jsonb(v_holding) ELSE NULL END,
    'status', 'SUCCESS'
  );

  RETURN v_result;
END;
$$;


-- ============================================================
-- SECTION 5: RECORD_TRANSACTION_ATOMIC (NO BYPASS PARAMETERS)
-- ============================================================
-- Drop old signatures to ensure PostgREST cannot route calls with bypass parameters
DROP FUNCTION IF EXISTS public.record_transaction_atomic(UUID, UUID, TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN);
DROP FUNCTION IF EXISTS public.record_transaction_atomic(UUID, UUID, TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, NUMERIC);

CREATE OR REPLACE FUNCTION public.record_transaction_atomic(
  p_broker_account_id UUID,
  p_instrument_id UUID,
  p_transaction_type TEXT,
  p_quantity NUMERIC,
  p_unit_price NUMERIC,
  p_gross_amount NUMERIC,
  p_fees NUMERIC DEFAULT 0,
  p_taxes NUMERIC DEFAULT 0,
  p_net_amount NUMERIC DEFAULT NULL,
  p_transaction_date TIMESTAMPTZ DEFAULT NOW(),
  p_settlement_date TIMESTAMPTZ DEFAULT NULL,
  p_source TEXT DEFAULT 'MANUAL',
  p_external_reference TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_stt_taxes NUMERIC DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_broker_id UUID;
  v_inst_id UUID;
  v_new_tx public.investment_transactions%ROWTYPE;
  v_effective_taxes NUMERIC;
  v_net_amount NUMERIC;
  v_norm_type TEXT;
  v_reconcile_res JSONB;
BEGIN
  -- 1. Enforce authenticated user identity
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required: auth.uid() is null' USING ERRCODE = '28000';
  END IF;

  -- 2. Validate broker account ownership
  SELECT id INTO v_broker_id
  FROM public.broker_accounts
  WHERE id = p_broker_account_id AND user_id = v_user_id;

  IF v_broker_id IS NULL THEN
    RAISE EXCEPTION 'Broker account % not found or does not belong to authenticated user', p_broker_account_id
      USING ERRCODE = '42501';
  END IF;

  -- 3. Validate instrument existence
  SELECT id INTO v_inst_id
  FROM public.instruments
  WHERE id = p_instrument_id;

  IF v_inst_id IS NULL THEN
    RAISE EXCEPTION 'Instrument % not found', p_instrument_id
      USING ERRCODE = 'P0002';
  END IF;

  -- 4. Normalize and validate transaction type
  v_norm_type := upper(trim(p_transaction_type));
  IF v_norm_type NOT IN ('BUY', 'SELL', 'DIVIDEND', 'INTEREST', 'COUPON', 'BONUS', 'SPLIT', 'FEE') THEN
    RAISE EXCEPTION 'Invalid transaction type: %', p_transaction_type
      USING ERRCODE = '22023';
  END IF;

  -- 5. Validate quantities and prices according to transaction type
  IF v_norm_type IN ('BUY', 'SELL', 'BONUS', 'SPLIT') THEN
    IF p_quantity <= 0 THEN
      RAISE EXCEPTION 'Transaction quantity must be strictly greater than 0 for % transactions', v_norm_type
        USING ERRCODE = '22003';
    END IF;
  ELSE
    -- Non-trading events (DIVIDEND, INTEREST, COUPON, FEE) permit quantity = 0
    IF p_quantity < 0 THEN
      RAISE EXCEPTION 'Transaction quantity cannot be negative'
        USING ERRCODE = '22003';
    END IF;
  END IF;

  IF v_norm_type IN ('BUY', 'SELL') THEN
    IF p_unit_price <= 0 THEN
      RAISE EXCEPTION 'Unit price must be strictly greater than 0 for % transactions', v_norm_type
        USING ERRCODE = '22003';
    END IF;
  ELSE
    IF p_unit_price < 0 THEN
      RAISE EXCEPTION 'Unit price cannot be negative'
        USING ERRCODE = '22003';
    END IF;
  END IF;

  IF p_gross_amount < 0 THEN
    RAISE EXCEPTION 'Gross amount cannot be negative'
      USING ERRCODE = '22003';
  END IF;

  -- 6. Calculate effective taxes and net amount
  v_effective_taxes := COALESCE(NULLIF(p_stt_taxes, 0), p_taxes, 0);

  IF p_net_amount IS NOT NULL THEN
    v_net_amount := p_net_amount;
  ELSE
    IF v_norm_type IN ('BUY', 'FEE') THEN
      v_net_amount := round(p_gross_amount + COALESCE(p_fees, 0) + v_effective_taxes, 4);
    ELSIF v_norm_type IN ('SELL', 'DIVIDEND', 'INTEREST', 'COUPON') THEN
      v_net_amount := round(p_gross_amount - COALESCE(p_fees, 0) - v_effective_taxes, 4);
    ELSE
      v_net_amount := p_gross_amount;
    END IF;
  END IF;

  -- 7. Insert transaction into ledger
  INSERT INTO public.investment_transactions (
    user_id,
    broker_account_id,
    instrument_id,
    transaction_type,
    quantity,
    unit_price,
    gross_amount,
    fees,
    taxes,
    net_amount,
    currency,
    transaction_date,
    settlement_date,
    source,
    external_reference,
    notes
  ) VALUES (
    v_user_id,
    p_broker_account_id,
    p_instrument_id,
    v_norm_type,
    round(p_quantity, 6),
    round(p_unit_price, 4),
    round(p_gross_amount, 4),
    round(COALESCE(p_fees, 0), 4),
    round(COALESCE(v_effective_taxes, 0), 4),
    v_net_amount,
    'INR',
    p_transaction_date,
    p_settlement_date,
    COALESCE(p_source, 'MANUAL'),
    trim(p_external_reference),
    p_notes
  )
  RETURNING * INTO v_new_tx;

  -- 8. UNCONDITIONALLY reconcile position chronologically
  -- Full chronological replay ensures out-of-order and backdated trades calculate exact WAC.
  -- If this trade would cause overselling in history, reconcile_position_atomic raises 22003,
  -- which ROLLS BACK the transaction insert automatically!
  v_reconcile_res := public.reconcile_position_atomic(
    p_broker_account_id,
    p_instrument_id
  );

  RETURN jsonb_build_object(
    'transaction', to_jsonb(v_new_tx),
    'holding', v_reconcile_res->'holding',
    'status', 'SUCCESS'
  );
END;
$$;


-- ============================================================
-- SECTION 6: UPDATE & DELETE ATOMIC (NO BYPASS PARAMETERS)
-- ============================================================
-- Drop old overloads
DROP FUNCTION IF EXISTS public.update_transaction_atomic(UUID, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, BOOLEAN);
DROP FUNCTION IF EXISTS public.delete_transaction_atomic(UUID, BOOLEAN);

CREATE OR REPLACE FUNCTION public.update_transaction_atomic(
  p_transaction_id UUID,
  p_quantity NUMERIC DEFAULT NULL,
  p_unit_price NUMERIC DEFAULT NULL,
  p_gross_amount NUMERIC DEFAULT NULL,
  p_fees NUMERIC DEFAULT NULL,
  p_taxes NUMERIC DEFAULT NULL,
  p_net_amount NUMERIC DEFAULT NULL,
  p_transaction_date TIMESTAMPTZ DEFAULT NULL,
  p_settlement_date TIMESTAMPTZ DEFAULT NULL,
  p_external_reference TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_existing_tx public.investment_transactions%ROWTYPE;
  v_updated_tx public.investment_transactions%ROWTYPE;
  v_reconcile_res JSONB;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required: auth.uid() is null' USING ERRCODE = '28000';
  END IF;

  SELECT * INTO v_existing_tx
  FROM public.investment_transactions
  WHERE id = p_transaction_id AND user_id = v_user_id
  FOR UPDATE;

  IF v_existing_tx.id IS NULL THEN
    RAISE EXCEPTION 'Transaction % not found or access denied', p_transaction_id
      USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.investment_transactions
  SET
    quantity = COALESCE(p_quantity, quantity),
    unit_price = COALESCE(p_unit_price, unit_price),
    gross_amount = COALESCE(p_gross_amount, gross_amount),
    fees = COALESCE(p_fees, fees),
    taxes = COALESCE(p_taxes, taxes),
    net_amount = COALESCE(p_net_amount, net_amount),
    transaction_date = COALESCE(p_transaction_date, transaction_date),
    settlement_date = COALESCE(p_settlement_date, settlement_date),
    external_reference = COALESCE(p_external_reference, external_reference),
    notes = COALESCE(p_notes, notes)
  WHERE id = p_transaction_id
  RETURNING * INTO v_updated_tx;

  -- Reconcile position unconditionally
  v_reconcile_res := public.reconcile_position_atomic(
    v_existing_tx.broker_account_id,
    v_existing_tx.instrument_id
  );

  RETURN jsonb_build_object(
    'transaction', to_jsonb(v_updated_tx),
    'reconciliation', v_reconcile_res,
    'status', 'SUCCESS'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_transaction_atomic(
  p_transaction_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_target_tx public.investment_transactions%ROWTYPE;
  v_reconcile_res JSONB;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required: auth.uid() is null' USING ERRCODE = '28000';
  END IF;

  SELECT * INTO v_target_tx
  FROM public.investment_transactions
  WHERE id = p_transaction_id AND user_id = v_user_id
  FOR UPDATE;

  IF v_target_tx.id IS NULL THEN
    RAISE EXCEPTION 'Transaction % not found or access denied', p_transaction_id
      USING ERRCODE = 'P0002';
  END IF;

  DELETE FROM public.investment_transactions
  WHERE id = p_transaction_id;

  -- Reconcile position unconditionally
  v_reconcile_res := public.reconcile_position_atomic(
    v_target_tx.broker_account_id,
    v_target_tx.instrument_id
  );

  RETURN jsonb_build_object(
    'deleted_id', p_transaction_id,
    'reconciliation', v_reconcile_res,
    'status', 'SUCCESS'
  );
END;
$$;


-- ============================================================
-- SECTION 7: SAFE OPENING BALANCE DECLARATION FOR LEGACY HOLDINGS
-- ============================================================
CREATE OR REPLACE FUNCTION public.declare_holding_opening_balance(
  p_holding_id UUID,
  p_opening_quantity NUMERIC,
  p_opening_buy_price NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_holding public.holdings%ROWTYPE;
  v_has_tx BOOLEAN := FALSE;
  v_reconcile_res JSONB;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required: auth.uid() is null' USING ERRCODE = '28000';
  END IF;

  IF p_holding_id IS NULL THEN
    RAISE EXCEPTION 'Holding ID cannot be null' USING ERRCODE = '22004';
  END IF;

  IF p_opening_quantity IS NULL OR p_opening_buy_price IS NULL THEN
    RAISE EXCEPTION 'Opening quantity and opening price cannot be null' USING ERRCODE = '22004';
  END IF;

  IF p_opening_quantity < 0 OR p_opening_buy_price < 0 THEN
    RAISE EXCEPTION 'Opening quantity and price must be non-negative' USING ERRCODE = '22003';
  END IF;

  SELECT * INTO v_holding
  FROM public.holdings
  WHERE id = p_holding_id AND user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Holding % not found or access denied', p_holding_id USING ERRCODE = 'P0002';
  END IF;

  -- 1. Prevent arbitrary changes to verified holdings with already established provenance
  IF v_holding.provenance_status = 'VERIFIED' AND v_holding.opening_quantity IS NOT NULL THEN
    RAISE EXCEPTION 'Holding % is already verified with established provenance. Arbitrary alteration of opening baseline is blocked.',
      p_holding_id
      USING ERRCODE = '42501';
  END IF;

  -- 2. Check if active transactions exist
  SELECT EXISTS (
    SELECT 1 FROM public.investment_transactions
    WHERE user_id = v_user_id
      AND broker_account_id = v_holding.broker_account_id
      AND instrument_id = v_holding.instrument_id
  ) INTO v_has_tx;

  -- 3. Prevent modifying active ledger-managed holdings unless explicitly in UNKNOWN legacy provenance state
  IF v_holding.is_ledger_managed AND v_holding.provenance_status NOT IN ('UNKNOWN', 'UNANCHORED') AND v_holding.opening_quantity IS NOT NULL THEN
    RAISE EXCEPTION 'Holding % is an active ledger-managed position with verified accounting. Arbitrary provenance modification is blocked.',
      p_holding_id
      USING ERRCODE = '42501';
  END IF;

  -- 4. Apply opening baseline declaration safely
  UPDATE public.holdings
  SET opening_quantity = round(p_opening_quantity, 6),
      opening_buy_price = round(p_opening_buy_price, 4),
      provenance_status = 'MANUAL_DECLARED',
      updated_at = NOW()
  WHERE id = p_holding_id
  RETURNING * INTO v_holding;

  -- 5. Reconcile atomically if transactions exist, or update position if manual
  IF v_has_tx THEN
    v_reconcile_res := public.reconcile_position_atomic(
      v_holding.broker_account_id,
      v_holding.instrument_id
    );
    SELECT * INTO v_holding FROM public.holdings WHERE id = p_holding_id;
  ELSE
    UPDATE public.holdings
    SET quantity = round(p_opening_quantity, 6),
        average_buy_price = round(p_opening_buy_price, 4),
        is_ledger_managed = FALSE,
        updated_at = NOW()
    WHERE id = p_holding_id
    RETURNING * INTO v_holding;
  END IF;

  RETURN jsonb_build_object(
    'status', 'OPENING_BALANCE_DECLARED',
    'holding', to_jsonb(v_holding),
    'reconciliation', v_reconcile_res
  );
END;
$$;


-- ============================================================
-- SECTION 8: SAFE_DELETE_BROKER_ACCOUNT
-- ============================================================
CREATE OR REPLACE FUNCTION public.safe_delete_broker_account(
  p_broker_account_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_account RECORD;
  v_holdings_count INT;
  v_tx_count INT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to delete broker accounts.'
      USING ERRCODE = '42501';
  END IF;

  -- Atomically lock the broker account row FOR UPDATE
  SELECT id, display_name INTO v_account
  FROM public.broker_accounts
  WHERE id = p_broker_account_id AND user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Broker account % not found or does not belong to authenticated user.', p_broker_account_id
      USING ERRCODE = 'P0002';
  END IF;

  -- Atomically count dependent holdings
  SELECT COUNT(*) INTO v_holdings_count
  FROM public.holdings
  WHERE broker_account_id = p_broker_account_id AND user_id = v_user_id;

  -- Atomically count dependent transactions
  SELECT COUNT(*) INTO v_tx_count
  FROM public.investment_transactions
  WHERE broker_account_id = p_broker_account_id AND user_id = v_user_id;

  IF v_holdings_count > 0 OR v_tx_count > 0 THEN
    RAISE EXCEPTION 'Cannot delete broker account with active financial records: % position(s), % transaction(s).',
      v_holdings_count, v_tx_count
      USING ERRCODE = '23503';
  END IF;

  -- Safe to delete empty broker account
  DELETE FROM public.broker_accounts
  WHERE id = p_broker_account_id AND user_id = v_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'account_id', p_broker_account_id,
    'display_name', v_account.display_name,
    'deleted_at', NOW()
  );
END;
$$;


-- ============================================================
-- SECTION 9: STRICT SECURITY DEFINER EXECUTE GRANTS
-- ============================================================
-- Revoke unintended execution from PUBLIC (including anonymous)
REVOKE ALL ON FUNCTION public.safe_delete_broker_account(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.safe_delete_broker_account(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.safe_delete_broker_account(UUID) TO service_role;

REVOKE ALL ON FUNCTION public.reconcile_position_atomic(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reconcile_position_atomic(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_position_atomic(UUID, UUID) TO service_role;

REVOKE ALL ON FUNCTION public.delete_transaction_atomic(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_transaction_atomic(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_transaction_atomic(UUID) TO service_role;

REVOKE ALL ON FUNCTION public.update_transaction_atomic(UUID, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_transaction_atomic(UUID, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_transaction_atomic(UUID, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT) TO service_role;

REVOKE ALL ON FUNCTION public.record_transaction_atomic(UUID, UUID, TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, TEXT, NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_transaction_atomic(UUID, UUID, TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, TEXT, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_transaction_atomic(UUID, UUID, TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, TEXT, NUMERIC) TO service_role;

REVOKE ALL ON FUNCTION public.declare_holding_opening_balance(UUID, NUMERIC, NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.declare_holding_opening_balance(UUID, NUMERIC, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.declare_holding_opening_balance(UUID, NUMERIC, NUMERIC) TO service_role;


-- ============================================================
-- SECTION 10: POSTGREST SCHEMA CACHE RELOAD
-- ============================================================
NOTIFY pgrst, 'reload schema';
