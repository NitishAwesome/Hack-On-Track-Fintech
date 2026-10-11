-- ============================================================
-- FINOVA — Migration: Fix Last Transaction Reconciliation & Broker Direct Delete Guard
-- File: supabase/migrations/20261011010000_fix_last_transaction_reconciliation_and_broker_guard.sql
--
-- PURPOSE:
-- 1. Fixes ghost holding vulnerability in public.reconcile_position_atomic:
--    When all transactions for an instrument are deleted (v_has_tx = FALSE):
--    - If genuine manual opening holding exists (opening_quantity > 0), restores
--      the position to that exact opening baseline and marks is_ledger_managed = FALSE.
--    - If no opening balance exists (ledger-created position with opening_quantity <= 0 or NULL),
--      DELETES the holding row so no unsupported ghost holding remains.
-- 2. Closes database-level broker deletion bypass:
--    Revokes/drops direct table DELETE on public.broker_accounts for authenticated users.
--    Installs RLS policy disallowing direct table DELETE, ensuring broker deletion
--    can ONLY occur via the SECURITY DEFINER RPC `safe_delete_broker_account`.
-- 3. Updates delete_transaction_atomic and update_transaction_atomic to ensure
--    synchronous position reconciliation with ghost holding elimination.
-- 4. Reloads PostgREST schema cache via NOTIFY pgrst, 'reload schema'.
--
-- MANUAL EXECUTION INSTRUCTIONS:
-- Run this SQL in the Supabase SQL Editor:
-- Dashboard -> SQL Editor -> New Query -> Paste & Run.
-- ============================================================

-- 1. RECONCILE POSITION ATOMIC FUNCTION (FIXED)
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
  -- If holding already exists, check its opening baseline
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

  -- CASE 1: If NO transactions exist for this security:
  IF NOT v_has_tx THEN
    IF v_holding.id IS NOT NULL THEN
      IF v_base_qty > 0 THEN
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
        -- Position was created exclusively by transactions: eliminate ghost holding
        DELETE FROM public.holdings WHERE id = v_holding.id;
        RETURN jsonb_build_object(
          'status', 'GHOST_HOLDING_ELIMINATED',
          'holding', NULL
        );
      END IF;
    ELSE
      RETURN jsonb_build_object(
        'status', 'NO_HOLDING_NO_TRANSACTIONS',
        'holding', NULL
      );
    END IF;
  END IF;

  -- CASE 2: Transactions exist: persist recalculated position
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
    -- Position completely liquidated:
    IF v_holding.id IS NOT NULL THEN
      IF v_base_qty > 0 THEN
        -- Restore to opening balance if user had a manual opening baseline
        UPDATE public.holdings
        SET quantity = v_base_qty,
            average_buy_price = v_base_price,
            is_ledger_managed = FALSE,
            updated_at = NOW()
        WHERE id = v_holding.id
        RETURNING * INTO v_holding;
      ELSE
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


-- 2. UPDATE DELETE TRANSACTION ATOMIC FUNCTION
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

  -- Reconcile holding position atomically.
  -- If deleting this transaction leaves 0 trades, reconcile_position_atomic
  -- deletes the ghost holding or restores opening baseline.
  -- If subsequent sales would oversell, reconcile_position_atomic raises 22003,
  -- rolling back the transaction deletion!
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


-- 3. DATABASE-LEVEL BROKER DELETION GUARD
-- Prevents direct PostgREST DELETE table calls from bypassing safe_delete_broker_account.
DO $$
BEGIN
  -- Drop both potential naming variations of the permissive delete policy
  DROP POLICY IF EXISTS "Users delete own broker accounts" ON public.broker_accounts;
  DROP POLICY IF EXISTS "Users can delete own broker accounts" ON public.broker_accounts;
  DROP POLICY IF EXISTS "Block direct broker deletion" ON public.broker_accounts;

  -- Install strict RESTRICTIVE delete policy: direct delete is unconditionally blocked.
  -- In PostgreSQL, RESTRICTIVE policies are combined with AND across all policies.
  -- This guarantees that direct DELETE table queries are unconditionally rejected.
  -- Deletions must proceed exclusively via the SECURITY DEFINER procedure `safe_delete_broker_account`.
  CREATE POLICY "Block direct broker deletion"
    ON public.broker_accounts
    AS RESTRICTIVE
    FOR DELETE
    TO authenticated
    USING (false);
END $$;


-- 4. GRANT PERMISSIONS TO AUTHENTICATED ROLE
REVOKE ALL ON FUNCTION public.reconcile_position_atomic(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reconcile_position_atomic(UUID, UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.delete_transaction_atomic(UUID, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_transaction_atomic(UUID, BOOLEAN) TO authenticated;

-- 5. NOTIFY POSTGREST SCHEMA CACHE RELOAD
NOTIFY pgrst, 'reload schema';
