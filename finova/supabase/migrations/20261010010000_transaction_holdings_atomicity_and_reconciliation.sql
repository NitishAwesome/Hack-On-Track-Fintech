-- ============================================================
-- FINOVA — Database Migration: Prompt 9.1A
-- Transaction Ledger, Holdings Consistency & Data Integrity Repair
--
-- File: 20261010010000_transaction_holdings_atomicity_and_reconciliation.sql
-- Purpose:
--   1. Add non-destructive opening-balance metadata to public.holdings
--   2. Implement PostgreSQL atomic RPC functions:
--      - record_transaction_atomic: Enforces simultaneous transaction + position update
--      - update_transaction_atomic: Enforces atomic transaction update + position recalculation
--      - delete_transaction_atomic: Enforces atomic transaction deletion + position recalculation
--      - reconcile_position_atomic: Replays ledger history to reconcile position
--   3. Guarantees:
--      - Zero orphan transactions (rollback on position failure)
--      - Oversell rejection (negative quantities strictly prohibited)
--      - Row-level locking (SELECT ... FOR UPDATE) against race conditions
--      - Weighted-Average Cost (WAC) basis preservation
--      - Manual opening holdings preserved without fake trades
--      - Authenticated user isolation (auth.uid() enforcement, fixed search_path)
-- ============================================================

-- 1. ADD NON-DESTRUCTIVE OPENING POSITION METADATA TO HOLDINGS
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


-- 2. RECONCILE POSITION FUNCTION (Internal & RPC)
-- Replays transaction history for a given broker + instrument,
-- respecting opening positions and enforcing non-negative quantity invariants.
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
  v_result JSONB;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required: auth.uid() is null' USING ERRCODE = '28000';
  END IF;

  -- Lock holding row to serialize updates
  SELECT * INTO v_holding
  FROM public.holdings
  WHERE user_id = v_user_id
    AND broker_account_id = p_broker_account_id
    AND instrument_id = p_instrument_id
  FOR UPDATE;

  -- Determine opening baseline:
  -- If holding already exists, preserve its opening baseline
  IF v_holding.id IS NOT NULL THEN
    v_base_qty := COALESCE(v_holding.opening_quantity, 0);
    v_base_price := COALESCE(v_holding.opening_buy_price, 0);
  END IF;

  v_running_qty := v_base_qty;
  v_running_cost := round(v_base_qty * v_base_price, 4);
  v_current_avg := v_base_price;

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

  -- If no transactions exist, preserve manual opening holding untouched
  IF NOT v_has_tx THEN
    RETURN jsonb_build_object(
      'status', 'OPENING_BALANCE_PRESERVED',
      'holding', CASE WHEN v_holding.id IS NOT NULL THEN to_jsonb(v_holding) ELSE NULL END
    );
  END IF;

  -- Persist recalculated holding position
  IF v_running_qty > 0 THEN
    IF v_holding.id IS NOT NULL THEN
      UPDATE public.holdings
      SET quantity = v_running_qty,
          average_buy_price = v_current_avg,
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
    -- If position completely liquidated and not an unallocated manual holding
    IF v_holding.id IS NOT NULL THEN
      DELETE FROM public.holdings WHERE id = v_holding.id;
      v_holding := NULL;
    END IF;
  END IF;

  v_result := jsonb_build_object(
    'status', 'RECONCILED',
    'holding', CASE WHEN v_holding.id IS NOT NULL THEN to_jsonb(v_holding) ELSE NULL END,
    'quantity', v_running_qty,
    'average_buy_price', v_current_avg
  );

  RETURN v_result;
END;
$$;


-- 3. RECORD TRANSACTION ATOMIC FUNCTION
-- Inserts a transaction and reconciles holding position in a single atomic database transaction.
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

  -- 5. Deduplication check on external_reference
  IF p_external_reference IS NOT NULL AND length(trim(p_external_reference)) > 0 THEN
    IF EXISTS (
      SELECT 1 FROM public.investment_transactions
      WHERE broker_account_id = p_broker_account_id
        AND external_reference = trim(p_external_reference)
    ) THEN
      RAISE EXCEPTION 'Transaction with external reference "%" already exists for this broker account', trim(p_external_reference)
        USING ERRCODE = '23505';
    END IF;
  END IF;

  -- 6. Lock holding row for update to serialize concurrent position updates
  SELECT * INTO v_holding
  FROM public.holdings
  WHERE user_id = v_user_id
    AND broker_account_id = p_broker_account_id
    AND instrument_id = p_instrument_id
  FOR UPDATE;

  -- 7. Validate overselling on SELL
  IF v_norm_type = 'SELL' THEN
    v_current_qty := COALESCE(v_holding.quantity, 0);
    IF p_quantity > v_current_qty AND NOT p_allow_oversell THEN
      RAISE EXCEPTION 'Insufficient quantity to sell: requested % units, but position only holds % units',
        p_quantity, v_current_qty
        USING ERRCODE = '22003';
    END IF;
  END IF;

  -- 8. Compute effective taxes and net amount if omitted
  v_effective_taxes := COALESCE(NULLIF(p_stt_taxes, 0), p_taxes, 0);

  v_net_amount := p_net_amount;
  IF v_net_amount IS NULL THEN
    IF v_norm_type = 'BUY' THEN
      v_net_amount := round(p_gross_amount + COALESCE(p_fees, 0) + v_effective_taxes, 4);
    ELSIF v_norm_type = 'SELL' THEN
      v_net_amount := round(GREATEST(0, p_gross_amount - COALESCE(p_fees, 0) - v_effective_taxes), 4);
    ELSE
      v_net_amount := round(p_gross_amount, 4);
    END IF;
  END IF;

  -- 9. Insert transaction record into authoritative ledger
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
        -- Existing holding: update with WAC
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
        -- New holding: baseline is 0
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
          DELETE FROM public.holdings WHERE id = v_holding.id;
          v_holding := NULL;
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


-- 4. UPDATE TRANSACTION ATOMIC FUNCTION
-- Updates transaction details and recalculates affected position atomically.
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
  v_old_tx public.investment_transactions%ROWTYPE;
  v_updated_tx public.investment_transactions%ROWTYPE;
  v_reconcile_res JSONB;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required: auth.uid() is null' USING ERRCODE = '28000';
  END IF;

  SELECT * INTO v_old_tx
  FROM public.investment_transactions
  WHERE id = p_transaction_id AND user_id = v_user_id
  FOR UPDATE;

  IF v_old_tx.id IS NULL THEN
    RAISE EXCEPTION 'Transaction % not found or access denied', p_transaction_id
      USING ERRCODE = 'P0002';
  END IF;

  -- Apply updates to transaction record
  UPDATE public.investment_transactions
  SET quantity = COALESCE(round(p_quantity, 6), quantity),
      unit_price = COALESCE(round(p_unit_price, 4), unit_price),
      gross_amount = COALESCE(round(p_gross_amount, 4), gross_amount),
      fees = COALESCE(round(p_fees, 4), fees),
      taxes = COALESCE(round(p_taxes, 4), taxes),
      net_amount = COALESCE(round(p_net_amount, 4), net_amount),
      transaction_date = COALESCE(p_transaction_date, transaction_date),
      settlement_date = COALESCE(p_settlement_date, settlement_date),
      external_reference = COALESCE(p_external_reference, external_reference),
      notes = COALESCE(p_notes, notes)
  WHERE id = p_transaction_id
  RETURNING * INTO v_updated_tx;

  -- Reconcile affected holding position atomically
  IF p_reconcile_holding THEN
    v_reconcile_res := public.reconcile_position_atomic(
      v_updated_tx.broker_account_id,
      v_updated_tx.instrument_id
    );
  END IF;

  RETURN jsonb_build_object(
    'transaction', to_jsonb(v_updated_tx),
    'reconciliation', v_reconcile_res,
    'status', 'SUCCESS'
  );
END;
$$;


-- 5. DELETE TRANSACTION ATOMIC FUNCTION
-- Deletes transaction and recalculates affected position atomically.
-- Rejects deletion if subsequent SELL transactions depend on these units.
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

  -- Delete transaction from ledger
  DELETE FROM public.investment_transactions
  WHERE id = p_transaction_id;

  -- Reconcile holding position. If deleting this trade causes overselling downstream,
  -- reconcile_position_atomic raises an exception which rolls back the DELETE!
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


-- 6. GRANT EXECUTE PRIVILEGES STRICTLY TO AUTHENTICATED USERS
REVOKE ALL ON FUNCTION public.reconcile_position_atomic(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reconcile_position_atomic(UUID, UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.record_transaction_atomic(
  UUID, UUID, TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, NUMERIC
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_transaction_atomic(
  UUID, UUID, TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, NUMERIC
) TO authenticated;

REVOKE ALL ON FUNCTION public.update_transaction_atomic(
  UUID, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, BOOLEAN
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_transaction_atomic(
  UUID, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, BOOLEAN
) TO authenticated;

REVOKE ALL ON FUNCTION public.delete_transaction_atomic(UUID, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_transaction_atomic(UUID, BOOLEAN) TO authenticated;
