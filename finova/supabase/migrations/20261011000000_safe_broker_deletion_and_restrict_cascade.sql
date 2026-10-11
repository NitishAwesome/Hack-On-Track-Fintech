-- ============================================================
-- FINOVA — Migration: Safe Broker Deletion & Foreign Key RESTRICT Guard
-- File: supabase/migrations/20261011000000_safe_broker_deletion_and_restrict_cascade.sql
--
-- PURPOSE:
-- 1. Eliminates dangerous ON DELETE CASCADE on financial holdings and transactions.
-- 2. Enforces database-level ON DELETE RESTRICT so PostgreSQL rejects any deletion
--    if dependent positions or transaction ledger rows exist.
-- 3. Provides an atomic SECURITY DEFINER RPC `safe_delete_broker_account`
--    that uses row-level locking (FOR UPDATE) to eliminate race conditions between
--    checking dependent record counts and executing account deletion.
-- 4. Installs a BEFORE DELETE trigger on public.broker_accounts as a secondary defense.
--
-- RISKS:
-- Low risk. Prevents accidental financial ledger erasure. Existing valid
-- queries and transactions are unaffected.
--
-- MANUAL EXECUTION INSTRUCTIONS:
-- Run this SQL script in the Supabase SQL Editor for your project:
-- Dashboard -> SQL Editor -> New Query -> Paste & Run.
-- ============================================================

-- 1. Alter Foreign Key on public.holdings to ON DELETE RESTRICT
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_holdings_broker_user'
      AND table_name = 'holdings'
  ) THEN
    ALTER TABLE public.holdings DROP CONSTRAINT fk_holdings_broker_user;
  END IF;

  ALTER TABLE public.holdings
    ADD CONSTRAINT fk_holdings_broker_user
    FOREIGN KEY (broker_account_id, user_id)
    REFERENCES public.broker_accounts(id, user_id)
    ON DELETE RESTRICT;
END $$;

-- 2. Alter Foreign Key on public.investment_transactions to ON DELETE RESTRICT
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_transactions_broker_user'
      AND table_name = 'investment_transactions'
  ) THEN
    ALTER TABLE public.investment_transactions DROP CONSTRAINT fk_transactions_broker_user;
  END IF;

  ALTER TABLE public.investment_transactions
    ADD CONSTRAINT fk_transactions_broker_user
    FOREIGN KEY (broker_account_id, user_id)
    REFERENCES public.broker_accounts(id, user_id)
    ON DELETE RESTRICT;
END $$;

-- 3. Trigger Function: Pre-delete integrity guard
CREATE OR REPLACE FUNCTION public.check_broker_account_can_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_holdings_count INT;
  v_transactions_count INT;
BEGIN
  -- Count holdings referencing this account
  SELECT COUNT(*) INTO v_holdings_count
  FROM public.holdings
  WHERE broker_account_id = OLD.id;

  -- Count transactions referencing this account
  SELECT COUNT(*) INTO v_transactions_count
  FROM public.investment_transactions
  WHERE broker_account_id = OLD.id;

  IF v_holdings_count > 0 OR v_transactions_count > 0 THEN
    RAISE EXCEPTION 'Cannot delete broker account % (%). Active records exist: % position(s), % transaction(s).',
      OLD.display_name, OLD.id, v_holdings_count, v_transactions_count
      USING ERRCODE = '23503';
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_cascade_broker_deletion ON public.broker_accounts;
CREATE TRIGGER trg_prevent_cascade_broker_deletion
  BEFORE DELETE ON public.broker_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.check_broker_account_can_delete();

-- 4. Atomic Stored Procedure: safe_delete_broker_account
-- Locks the target broker row FOR UPDATE and verifies dependent counts within the same transaction.
CREATE OR REPLACE FUNCTION public.safe_delete_broker_account(
  p_broker_account_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
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

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.safe_delete_broker_account(UUID) TO authenticated;
