-- ============================================================
-- FINOVA — Migration: Secure Financial Ledger, RLS Bypass Guard & Legacy Provenance Protection
-- File: supabase/migrations/20261011020000_secure_financial_ledger_and_legacy_provenance.sql
--
-- PURPOSE & ARCHITECTURE:
-- 1. Direct Mutation Bypass Prevention:
--    - Closes direct PostgREST table INSERT, UPDATE, DELETE bypass on public.investment_transactions.
--      All ledger entries MUST be created, updated, or deleted through atomic SECURITY DEFINER RPCs.
--    - Closes direct mutation bypass on public.holdings for ledger-managed positions.
--      Manual holdings CRUD and authorized CSV imports are preserved for non-ledger positions
--      (is_ledger_managed = FALSE and 0 transactions).
-- 2. Legacy Opening Balance Provenance Protection:
--    - Safe backfill for historical holdings where opening_quantity IS NULL.
--    - Blocks destructive position liquidation during reconciliation when provenance is ambiguous.
--    - Eliminates ghost holdings only when positions were definitively created by transactions.
-- 3. Security Definer RPC Hardening:
--    - Ensures search_path = public, pg_temp across all financial procedures.
--    - Explicitly revokes unintended PUBLIC access and grants EXECUTE strictly to authenticated/service_role.
-- 4. Safe Forward-Only Design:
--    - Does NOT touch or modify the owner's manual "Block direct broker deletion" policy on broker_accounts.
--    - Safely idempotent: can be executed multiple times without error.
--
-- MANUAL EXECUTION INSTRUCTIONS:
-- Run this SQL in the Supabase SQL Editor:
-- Dashboard -> SQL Editor -> New Query -> Paste & Run.
-- ============================================================


-- ============================================================
-- SECTION 1: LEGACY HOLDINGS PROVENANCE BACKFILL
-- ============================================================
-- Ensure columns exist (idempotent guard)
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
END $$;

-- 1. Backfill legacy manual holdings:
-- If opening_quantity IS NULL and NO transactions exist, this holding is 100% manual.
-- Set opening_quantity and opening_buy_price from existing holding row and mark is_ledger_managed = FALSE.
UPDATE public.holdings h
SET opening_quantity = h.quantity,
    opening_buy_price = h.average_buy_price,
    is_ledger_managed = FALSE,
    updated_at = NOW()
WHERE h.opening_quantity IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.investment_transactions t
    WHERE t.user_id = h.user_id
      AND t.broker_account_id = h.broker_account_id
      AND t.instrument_id = h.instrument_id
  );

-- 2. Backfill legacy ledger holdings:
-- If opening_quantity IS NULL and transactions DO exist, and the net transaction quantity
-- matches the holding quantity, this position was created exclusively by transactions.
-- Anchor baseline at 0 with is_ledger_managed = TRUE.
WITH tx_summary AS (
  SELECT
    user_id,
    broker_account_id,
    instrument_id,
    SUM(
      CASE
        WHEN transaction_type IN ('BUY', 'BONUS', 'SPLIT') THEN quantity
        WHEN transaction_type = 'SELL' THEN -quantity
        ELSE 0
      END
    ) AS net_tx_qty
  FROM public.investment_transactions
  GROUP BY user_id, broker_account_id, instrument_id
)
UPDATE public.holdings h
SET opening_quantity = 0,
    opening_buy_price = 0,
    is_ledger_managed = TRUE,
    updated_at = NOW()
FROM tx_summary s
WHERE h.user_id = s.user_id
  AND h.broker_account_id = s.broker_account_id
  AND h.instrument_id = s.instrument_id
  AND h.opening_quantity IS NULL
  AND round(h.quantity, 6) = round(s.net_tx_qty, 6);


-- ============================================================
-- SECTION 2: ROW-LEVEL SECURITY — BLOCK DIRECT TRANSACTION MUTATIONS
-- ============================================================
-- Drop permissive write policies on investment_transactions to prevent ledger bypass via PostgREST
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

-- Enforce database-level block on direct table mutations for authenticated users.
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
      -- Legacy holding where opening_quantity was not previously anchored
      v_is_legacy_unanchored := TRUE;
    END IF;
  END IF;

  -- Replay all transactions chronologically
  FOR v_tx IN (
    SELECT *
    FROM public.investment_transactions
    WHERE user_id = v_user_id
      AND broker_account_id = p_broker_account_id
      AND instrument_id = p_instrument_id
    ORDER BY transaction_date ASC, created_at ASC
  ) LOOP
    v_has_tx := TRUE;
  END LOOP;

  -- CASE 1: If NO transactions exist for this security:
  IF NOT v_has_tx THEN
    IF v_holding.id IS NOT NULL THEN
      IF v_is_legacy_unanchored THEN
        -- Legacy holding with no transactions: 100% manual. Never delete!
        -- Anchor its baseline from its current quantity & buy price.
        UPDATE public.holdings
        SET opening_quantity = v_holding.quantity,
            opening_buy_price = v_holding.average_buy_price,
            is_ledger_managed = FALSE,
            updated_at = NOW()
        WHERE id = v_holding.id
        RETURNING * INTO v_holding;

        RETURN jsonb_build_object(
          'status', 'LEGACY_MANUAL_HOLDING_ANCHORED',
          'holding', to_jsonb(v_holding)
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
          'holding', to_jsonb(v_holding)
        );
      ELSE
        -- Position was created exclusively by ledger and now has 0 trades: eliminate ghost holding
        IF v_holding.is_ledger_managed THEN
          DELETE FROM public.holdings WHERE id = v_holding.id;
          RETURN jsonb_build_object(
            'status', 'GHOST_HOLDING_ELIMINATED',
            'holding', NULL
          );
        ELSE
          -- Provenance is not ledger-managed; preserve holding safely
          RETURN jsonb_build_object(
            'status', 'MANUAL_HOLDING_PRESERVED',
            'holding', to_jsonb(v_holding)
          );
        END IF;
      END IF;
    ELSE
      RETURN jsonb_build_object(
        'status', 'NO_HOLDING_NO_TRANSACTIONS',
        'holding', NULL
      );
    END IF;
  END IF;

  -- CASE 2: Transactions exist:
  -- If legacy holding has unknown opening baseline, verify whether net trades account for it
  IF v_is_legacy_unanchored THEN
    -- Check net transaction quantity
    SELECT
      SUM(CASE WHEN transaction_type IN ('BUY', 'BONUS', 'SPLIT') THEN quantity WHEN transaction_type = 'SELL' THEN -quantity ELSE 0 END)
    INTO v_base_qty
    FROM public.investment_transactions
    WHERE user_id = v_user_id
      AND broker_account_id = p_broker_account_id
      AND instrument_id = p_instrument_id;

    IF round(v_holding.quantity, 6) = round(COALESCE(v_base_qty, 0), 6) THEN
      -- Exact match: holding was created by transactions. Baseline is 0.
      v_base_qty := 0;
      v_base_price := 0;
    ELSIF v_holding.quantity > COALESCE(v_base_qty, 0) THEN
      -- Holding has more units than transactions: legacy manual position + trades.
      -- Baseline is the difference.
      v_base_qty := v_holding.quantity - v_base_qty;
      v_base_price := v_holding.average_buy_price;
    ELSE
      -- Ambiguous provenance: block destructive reconciliation
      RAISE EXCEPTION 'Cannot reconcile holding for instrument %: opening position is not established and recorded trades do not match current balance. Destructive reconciliation blocked.',
        p_instrument_id
        USING ERRCODE = '22000';
    END IF;
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

  -- Persist recalculated holding position
  IF v_running_qty > 0 THEN
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
    -- Position completely liquidated:
    IF v_holding.id IS NOT NULL THEN
      IF v_base_qty > 0 THEN
        -- Restore to opening balance if user had a manual opening baseline
        UPDATE public.holdings
        SET quantity = v_base_qty,
            average_buy_price = v_base_price,
            opening_quantity = v_base_qty,
            opening_buy_price = v_base_price,
            is_ledger_managed = FALSE,
            updated_at = NOW()
        WHERE id = v_holding.id
        RETURNING * INTO v_holding;
      ELSIF v_holding.is_ledger_managed THEN
        DELETE FROM public.holdings WHERE id = v_holding.id;
        v_holding := NULL;
      END IF;
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
-- SECTION 5: CANONICAL RECORD_TRANSACTION_ATOMIC FUNCTION
-- ============================================================
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
  p_reconcile_holding BOOLEAN DEFAULT TRUE,
  p_allow_oversell BOOLEAN DEFAULT FALSE,
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
  v_holding public.holdings%ROWTYPE;
  v_new_tx public.investment_transactions%ROWTYPE;
  v_effective_taxes NUMERIC;
  v_net_amount NUMERIC;
  v_current_qty NUMERIC := 0;
  v_new_qty NUMERIC;
  v_new_avg NUMERIC;
  v_rem_qty NUMERIC;
  v_norm_type TEXT;
  v_result JSONB;
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

  -- 5. Validate non-negative quantities and prices
  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'Transaction quantity must be strictly greater than 0'
      USING ERRCODE = '22003';
  END IF;

  IF p_unit_price < 0 THEN
    RAISE EXCEPTION 'Unit price cannot be negative'
      USING ERRCODE = '22003';
  END IF;

  -- 6. Lock holding row FOR UPDATE to eliminate race conditions
  SELECT * INTO v_holding
  FROM public.holdings
  WHERE broker_account_id = p_broker_account_id
    AND instrument_id = p_instrument_id
    AND user_id = v_user_id
  FOR UPDATE;

  IF v_holding.id IS NOT NULL THEN
    v_current_qty := v_holding.quantity;
  ELSE
    v_current_qty := 0;
  END IF;

  -- 7. Oversell check on SELL
  IF v_norm_type = 'SELL' AND NOT p_allow_oversell THEN
    IF p_quantity > v_current_qty THEN
      RAISE EXCEPTION 'Insufficient quantity to sell: requested %, available % units',
        p_quantity, v_current_qty
        USING ERRCODE = '22003';
    END IF;
  END IF;

  -- 8. Calculate effective taxes and net amount
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

  -- 9. Insert transaction into ledger
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

  -- 10. Reconcile holding atomically using Weighted-Average Cost (WAC)
  IF p_reconcile_holding AND v_norm_type IN ('BUY', 'SELL', 'BONUS', 'SPLIT') THEN
    IF v_norm_type = 'BUY' THEN
      IF v_holding.id IS NOT NULL THEN
        v_new_qty := round(v_holding.quantity + p_quantity, 6);
        v_new_avg := round(((v_holding.quantity * v_holding.average_buy_price) + (p_quantity * p_unit_price)) / v_new_qty, 4);

        UPDATE public.holdings
        SET quantity = v_new_qty,
            average_buy_price = v_new_avg,
            opening_quantity = COALESCE(opening_quantity, v_holding.quantity),
            opening_buy_price = COALESCE(opening_buy_price, v_holding.average_buy_price),
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
          round(p_quantity, 6),
          round(p_unit_price, 4),
          'INR',
          COALESCE(p_source, 'MANUAL'),
          p_transaction_date,
          0,
          0,
          TRUE
        )
        RETURNING * INTO v_holding;
      END IF;

    ELSIF v_norm_type = 'SELL' THEN
      IF v_holding.id IS NOT NULL THEN
        v_rem_qty := round(GREATEST(0, v_holding.quantity - p_quantity), 6);
        IF v_rem_qty <= 0 THEN
          IF COALESCE(v_holding.opening_quantity, 0) > 0 THEN
            -- Restore opening baseline if user had manual opening balance
            UPDATE public.holdings
            SET quantity = v_holding.opening_quantity,
                average_buy_price = COALESCE(v_holding.opening_buy_price, 0),
                is_ledger_managed = FALSE,
                updated_at = NOW()
            WHERE id = v_holding.id
            RETURNING * INTO v_holding;
          ELSE
            DELETE FROM public.holdings WHERE id = v_holding.id;
            v_holding := NULL;
          END IF;
        ELSE
          UPDATE public.holdings
          SET quantity = v_rem_qty,
              is_ledger_managed = TRUE,
              updated_at = NOW()
          WHERE id = v_holding.id
          RETURNING * INTO v_holding;
        END IF;
      END IF;

    ELSIF v_norm_type IN ('BONUS', 'SPLIT') THEN
      IF v_holding.id IS NOT NULL THEN
        v_new_qty := round(v_holding.quantity + p_quantity, 6);
        v_new_avg := round((v_holding.quantity * v_holding.average_buy_price) / v_new_qty, 4);

        UPDATE public.holdings
        SET quantity = v_new_qty,
            average_buy_price = v_new_avg,
            is_ledger_managed = TRUE,
            updated_at = NOW()
        WHERE id = v_holding.id
        RETURNING * INTO v_holding;
      END IF;
    END IF;
  END IF;

  v_result := jsonb_build_object(
    'transaction', to_jsonb(v_new_tx),
    'holding', CASE WHEN v_holding.id IS NOT NULL THEN to_jsonb(v_holding) ELSE NULL END,
    'status', 'SUCCESS'
  );

  RETURN v_result;
END;
$$;


-- ============================================================
-- SECTION 6: UPDATE_TRANSACTION_ATOMIC & DELETE_TRANSACTION_ATOMIC
-- ============================================================
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
  p_notes TEXT DEFAULT NULL,
  p_reconcile_holding BOOLEAN DEFAULT TRUE
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

  IF p_reconcile_holding THEN
    v_reconcile_res := public.reconcile_position_atomic(
      v_existing_tx.broker_account_id,
      v_existing_tx.instrument_id
    );
  END IF;

  RETURN jsonb_build_object(
    'transaction', to_jsonb(v_updated_tx),
    'reconciliation', v_reconcile_res,
    'status', 'SUCCESS'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_transaction_atomic(
  p_transaction_id UUID,
  p_reconcile_holding BOOLEAN DEFAULT TRUE
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

  IF p_reconcile_holding THEN
    v_reconcile_res := public.reconcile_position_atomic(
      v_target_tx.broker_account_id,
      v_target_tx.instrument_id
    );
  END IF;

  RETURN jsonb_build_object(
    'deleted_id', p_transaction_id,
    'reconciliation', v_reconcile_res,
    'status', 'SUCCESS'
  );
END;
$$;


-- ============================================================
-- SECTION 7: HARDEN SAFE_DELETE_BROKER_ACCOUNT PERMISSIONS
-- ============================================================
-- Ensure safe_delete_broker_account search_path is hardened and PUBLIC execution is revoked
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
-- SECTION 8: STRICT SECURITY DEFINER EXECUTE GRANTS
-- ============================================================
-- Revoke unintended execution from PUBLIC (including anonymous)
REVOKE ALL ON FUNCTION public.safe_delete_broker_account(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.safe_delete_broker_account(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.safe_delete_broker_account(UUID) TO service_role;

REVOKE ALL ON FUNCTION public.reconcile_position_atomic(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reconcile_position_atomic(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_position_atomic(UUID, UUID) TO service_role;

REVOKE ALL ON FUNCTION public.delete_transaction_atomic(UUID, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_transaction_atomic(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_transaction_atomic(UUID, BOOLEAN) TO service_role;

REVOKE ALL ON FUNCTION public.update_transaction_atomic(UUID, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_transaction_atomic(UUID, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_transaction_atomic(UUID, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, BOOLEAN) TO service_role;

REVOKE ALL ON FUNCTION public.record_transaction_atomic(UUID, UUID, TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_transaction_atomic(UUID, UUID, TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_transaction_atomic(UUID, UUID, TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, NUMERIC) TO service_role;


-- ============================================================
-- SECTION 9: POSTGREST SCHEMA CACHE RELOAD
-- ============================================================
NOTIFY pgrst, 'reload schema';
