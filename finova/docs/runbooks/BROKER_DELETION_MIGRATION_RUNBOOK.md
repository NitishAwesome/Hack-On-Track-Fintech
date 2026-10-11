# FINOVA — Broker Deletion & Foreign Key Safety Migration Runbook
**Database:** Supabase PostgreSQL  
**Target Migration:** `supabase/migrations/20261011000000_safe_broker_deletion_and_restrict_cascade.sql`  
**Security Level:** High (Data Protection & Ledger Integrity)  
**Execution Standard:** Manual Administrator Approval (Read-Only / Staged)  

---

## 1. OBJECTIVE & BACKGROUND

### 1.1 The Risk: Accidental Cascading Financial Loss
By default, standard relational schemas often employ `ON DELETE CASCADE` on child tables. In an investment application:
- `broker_accounts` is the parent container.
- `holdings` represents current positions.
- `investment_transactions` represents immutable historical accounting entries.

If an account deletion executes with `CASCADE`, removing a single broker account container would silently erase all associated holdings and historical transaction tradebook records.

### 1.2 The Solution
This migration installs:
1. `ON DELETE RESTRICT` constraints on `public.holdings(broker_account_id, user_id)` and `public.investment_transactions(broker_account_id, user_id)`.
2. A database-level `BEFORE DELETE` trigger `trg_prevent_cascade_broker_deletion` on `public.broker_accounts`.
3. An atomic stored procedure `public.safe_delete_broker_account(p_broker_account_id UUID)` with `FOR UPDATE` row locking to eliminate race conditions between counting dependent records and executing deletion.

### 1.3 Application Guardrail Status
Prior to applying this migration remotely, FINOVA's API (`/api/brokers` DELETE) safely **fails closed with HTTP 403 `ATOMIC_MIGRATION_REQUIRED`**. It refuses to delete any broker account until this procedure and constraint are active in PostgreSQL.

---

## 2. PREFLIGHT & BACKUP CHECKS

Before running the migration in production/staging:

1. **Supabase Backup Check:**
   - Navigate to Supabase Dashboard $\to$ **Database** $\to$ **Backups**.
   - Verify that an automated or manual backup was generated within the last 24 hours.
2. **Verify Existing Constraints:**
   Run the following query in the Supabase SQL Editor:
   ```sql
   SELECT
       conname AS constraint_name,
       conrelid::regclass AS table_name,
       confrelid::regclass AS foreign_table,
       confdeltype AS on_delete_action -- 'a'=RESTRICT, 'r'=RESTRICT, 'c'=CASCADE
   FROM pg_constraint
   WHERE conname IN ('fk_holdings_broker_user', 'fk_transactions_broker_user', 'holdings_broker_account_id_fkey', 'investment_transactions_broker_account_id_fkey');
   ```
3. **Verify Active Sessions:** Ensure no active high-volume CSV transaction imports are running.

---

## 3. EXACT MIGRATION SCRIPT

Run the following SQL in **Supabase Dashboard $\to$ SQL Editor $\to$ New Query**:

```sql
-- ============================================================
-- FINOVA — Safe Broker Deletion & Foreign Key RESTRICT Guard
-- File: 20261011000000_safe_broker_deletion_and_restrict_cascade.sql
-- ============================================================

-- 1. Alter Foreign Key on public.holdings to ON DELETE RESTRICT
DO $$
BEGIN
  -- Drop older single-column FK if present
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'holdings_broker_account_id_fkey' AND table_name = 'holdings'
  ) THEN
    ALTER TABLE public.holdings DROP CONSTRAINT holdings_broker_account_id_fkey;
  END IF;

  -- Drop existing composite FK if present
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_holdings_broker_user' AND table_name = 'holdings'
  ) THEN
    ALTER TABLE public.holdings DROP CONSTRAINT fk_holdings_broker_user;
  END IF;

  -- Re-add with ON DELETE RESTRICT
  ALTER TABLE public.holdings
    ADD CONSTRAINT fk_holdings_broker_user
    FOREIGN KEY (broker_account_id, user_id)
    REFERENCES public.broker_accounts(id, user_id)
    ON DELETE RESTRICT;
END $$;

-- 2. Alter Foreign Key on public.investment_transactions to ON DELETE RESTRICT
DO $$
BEGIN
  -- Drop older single-column FK if present
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'investment_transactions_broker_account_id_fkey' AND table_name = 'investment_transactions'
  ) THEN
    ALTER TABLE public.investment_transactions DROP CONSTRAINT investment_transactions_broker_account_id_fkey;
  END IF;

  -- Drop existing composite FK if present
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_transactions_broker_user' AND table_name = 'investment_transactions'
  ) THEN
    ALTER TABLE public.investment_transactions DROP CONSTRAINT fk_transactions_broker_user;
  END IF;

  -- Re-add with ON DELETE RESTRICT
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
-- Locks target row FOR UPDATE and verifies dependent counts in a single atomic transaction.
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

  -- Safe to delete empty broker account container
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

-- 5. Grant execution privilege to authenticated users
GRANT EXECUTE ON FUNCTION public.safe_delete_broker_account(UUID) TO authenticated;
```

---

## 4. POST-MIGRATION VERIFICATION QUERIES

After executing the script, run the following verification queries:

### 4.1 Verify Foreign Key Constraint Properties
```sql
SELECT
    conname,
    conrelid::regclass AS table_name,
    confdeltype
FROM pg_constraint
WHERE conname IN ('fk_holdings_broker_user', 'fk_transactions_broker_user');
```
*Expected Result:* `confdeltype` is `'r'` (RESTRICT).

### 4.2 Verify Stored Procedure Existence & Permissions
```sql
SELECT
    p.proname,
    pg_get_function_identity_arguments(p.oid) AS args,
    p.prosecdef AS is_security_definer,
    has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_can_execute
FROM pg_proc p
WHERE p.proname = 'safe_delete_broker_account';
```
*Expected Result:* `proname` = `safe_delete_broker_account`, `is_security_definer` = `true`, `authenticated_can_execute` = `true`.

### 4.3 Verify Trigger Existence
```sql
SELECT
    tgname,
    tgrelid::regclass AS table_name,
    tgenabled
FROM pg_trigger
WHERE tgname = 'trg_prevent_cascade_broker_deletion';
```
*Expected Result:* 1 row returned on `public.broker_accounts` with `tgenabled = 'O'` (Enabled).

---

## 5. ROLLBACK PROCEDURE

If rollback is ever necessary:
```sql
-- 1. Drop trigger and function
DROP TRIGGER IF EXISTS trg_prevent_cascade_broker_deletion ON public.broker_accounts;
DROP FUNCTION IF EXISTS public.check_broker_account_can_delete();
DROP FUNCTION IF EXISTS public.safe_delete_broker_account(UUID);

-- 2. Restore default cascade if strictly required (Caution: restores cascading data loss risk)
ALTER TABLE public.holdings DROP CONSTRAINT IF EXISTS fk_holdings_broker_user;
ALTER TABLE public.holdings
  ADD CONSTRAINT fk_holdings_broker_user
  FOREIGN KEY (broker_account_id, user_id)
  REFERENCES public.broker_accounts(id, user_id)
  ON DELETE CASCADE;

ALTER TABLE public.investment_transactions DROP CONSTRAINT IF EXISTS fk_transactions_broker_user;
ALTER TABLE public.investment_transactions
  ADD CONSTRAINT fk_transactions_broker_user
  FOREIGN KEY (broker_account_id, user_id)
  REFERENCES public.broker_accounts(id, user_id)
  ON DELETE CASCADE;
```
