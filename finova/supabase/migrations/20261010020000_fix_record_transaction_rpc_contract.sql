-- ============================================================
-- FINOVA — Database Migration: Fix Record Transaction RPC Contract
--
-- File: 20261010020000_fix_record_transaction_rpc_contract.sql
-- Purpose:
--   1. Drop legacy overloads of public.record_transaction_atomic to prevent
--      PostgREST PGRST204 function resolution ambiguity.
--   2. Align public.record_transaction_atomic signature to accept both:
--      - p_taxes NUMERIC DEFAULT 0
--      - p_stt_taxes NUMERIC DEFAULT NULL
--      thereby satisfying callers that supply either or both parameter names.
--   3. Compute v_effective_taxes := COALESCE(NULLIF(p_stt_taxes, 0), p_taxes, 0)
--      and preserve gross amount, fees, taxes, and net amount calculations.
--   4. Preserve atomic row-locking (FOR UPDATE), oversell checks, WAC position updates,
--      and rollback safety.
--   5. Send NOTIFY pgrst, 'reload schema' to force immediate schema cache refresh.
-- ============================================================

-- 1. Safely drop previous signatures to avoid PGRST204 overloading conflicts
DROP FUNCTION IF EXISTS public.record_transaction_atomic(
  UUID, UUID, TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN
);

DROP FUNCTION IF EXISTS public.record_transaction_atomic(
  UUID, UUID, TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, NUMERIC
);

-- 2. Create aligned atomic transaction RPC function
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

  -- 8. Compute effective taxes and net cash flow amount
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
            is_ledger_managed = TRUE,
            updated_at = NOW()
        WHERE id = v_holding.id
        RETURNING * INTO v_holding;
      ELSE
        -- New holding: insert position
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

-- 3. Grants and privileges
REVOKE ALL ON FUNCTION public.record_transaction_atomic(
  UUID, UUID, TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, NUMERIC
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.record_transaction_atomic(
  UUID, UUID, TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, NUMERIC
) TO authenticated;

GRANT EXECUTE ON FUNCTION public.record_transaction_atomic(
  UUID, UUID, TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, NUMERIC
) TO service_role;

-- 4. Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
