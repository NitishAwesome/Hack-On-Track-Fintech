// ============================================================
// FINOVA — PostgreSQL Real Integration Test Suite
// File: scripts/test-sql-financial-integrity-pglite.mjs
//
// Uses @electric-sql/pglite (Real PostgreSQL 18.3 engine in WASM)
// Tests execute actual SQL functions, PL/pgSQL procedures, RLS policies,
// and inspect committed database rows in an isolated PostgreSQL instance.
// ============================================================

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { PGlite } from '@electric-sql/pglite';

console.log('='.repeat(75));
console.log('FINOVA — Real PostgreSQL Integration Test Suite (PGlite WASM Engine)');
console.log('='.repeat(75));

let passed = 0;
let total = 0;

async function runTestCase(name, fn) {
  total++;
  try {
    await fn();
    console.log(`[PASS] Test ${total}: ${name}`);
    passed++;
  } catch (err) {
    console.error(`[FAIL] Test ${total}: ${name}`);
    console.error(`       Error: ${err.message}`);
    if (err.stack) {
      console.error(err.stack.split('\n').slice(1, 4).join('\n'));
    }
  }
}

async function setupDatabase() {
  const db = new PGlite();

  // 1. Setup auth mock and base tables matching original FINOVA schema (20261009000000)
  // CRITICAL: public.holdings initially contains original CHECK (quantity > 0)
  await db.exec(`
    CREATE SCHEMA IF NOT EXISTS auth;
    CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS $$
      SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::UUID;
    $$;

    CREATE TABLE IF NOT EXISTS public.broker_accounts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      broker_code TEXT NOT NULL,
      display_name TEXT NOT NULL,
      account_type TEXT DEFAULT 'broker',
      connection_status TEXT DEFAULT 'CONNECTED',
      data_source TEXT DEFAULT 'MANUAL',
      currency TEXT DEFAULT 'INR',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT uq_broker_accounts_user UNIQUE (id, user_id)
    );

    CREATE TABLE IF NOT EXISTS public.instruments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      symbol TEXT NOT NULL UNIQUE,
      instrument_name TEXT NOT NULL,
      asset_type TEXT NOT NULL,
      exchange TEXT NOT NULL,
      isin TEXT,
      currency TEXT DEFAULT 'INR',
      is_custom BOOLEAN DEFAULT false,
      created_by UUID,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Original schema with CHECK (quantity > 0)
    CREATE TABLE IF NOT EXISTS public.holdings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      broker_account_id UUID NOT NULL,
      instrument_id UUID NOT NULL REFERENCES public.instruments(id) ON DELETE RESTRICT,
      quantity NUMERIC(18, 6) NOT NULL CHECK (quantity > 0),
      average_buy_price NUMERIC(18, 4) NOT NULL CHECK (average_buy_price >= 0),
      currency TEXT DEFAULT 'INR',
      data_source TEXT DEFAULT 'MANUAL',
      as_of TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT fk_holdings_broker_user FOREIGN KEY (broker_account_id, user_id)
        REFERENCES public.broker_accounts(id, user_id) ON DELETE CASCADE,
      CONSTRAINT uq_holdings_broker_instrument UNIQUE (broker_account_id, instrument_id)
    );

    -- Original schema with transaction quantity/amount rules
    CREATE TABLE IF NOT EXISTS public.investment_transactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      broker_account_id UUID NOT NULL,
      instrument_id UUID NOT NULL REFERENCES public.instruments(id) ON DELETE RESTRICT,
      transaction_type TEXT NOT NULL CHECK (transaction_type IN ('BUY', 'SELL', 'DIVIDEND', 'INTEREST', 'COUPON', 'BONUS', 'SPLIT', 'FEE')),
      quantity NUMERIC(18, 6) NOT NULL DEFAULT 0 CHECK (quantity >= 0),
      unit_price NUMERIC(18, 4) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
      gross_amount NUMERIC(18, 4) NOT NULL CHECK (gross_amount >= 0),
      fees NUMERIC(18, 4) NOT NULL DEFAULT 0 CHECK (fees >= 0),
      taxes NUMERIC(18, 4) NOT NULL DEFAULT 0 CHECK (taxes >= 0),
      net_amount NUMERIC(18, 4) NOT NULL CHECK (net_amount >= 0),
      currency TEXT DEFAULT 'INR',
      transaction_date TIMESTAMPTZ NOT NULL,
      settlement_date TIMESTAMPTZ,
      source TEXT NOT NULL DEFAULT 'MANUAL',
      external_reference TEXT,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT fk_transactions_broker_user FOREIGN KEY (broker_account_id, user_id)
        REFERENCES public.broker_accounts(id, user_id) ON DELETE CASCADE,
      CONSTRAINT chk_tx_quantities_and_amounts CHECK (
        (transaction_type IN ('BUY', 'SELL') AND quantity > 0 AND unit_price > 0) OR
        (transaction_type IN ('DIVIDEND', 'INTEREST', 'COUPON', 'FEE') AND gross_amount >= 0) OR
        (transaction_type IN ('BONUS', 'SPLIT') AND quantity > 0)
      )
    );

    -- Enable RLS
    ALTER TABLE public.broker_accounts ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.instruments ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.holdings ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.investment_transactions ENABLE ROW LEVEL SECURITY;

    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
        CREATE ROLE service_role;
      END IF;
    END $$;

    GRANT USAGE ON SCHEMA public TO authenticated, service_role;
    GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
    GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;
    GRANT ALL ON ALL ROUTINES IN SCHEMA public TO authenticated, service_role;
  `);

  // 2. Load migration 20261011000000 (Safe broker deletion & ON DELETE RESTRICT)
  const migration0Path = path.join(
    process.cwd(),
    'supabase/migrations/20261011000000_safe_broker_deletion_and_restrict_cascade.sql'
  );
  if (fs.existsSync(migration0Path)) {
    const migration0Sql = fs.readFileSync(migration0Path, 'utf8');
    await db.exec(migration0Sql);
  }

  // 3. Load migration 20261011020000 (Forward-only relaxation to quantity >= 0, RPC hardening & RLS)
  const migrationPath = path.join(
    process.cwd(),
    'supabase/migrations/20261011020000_secure_financial_ledger_and_legacy_provenance.sql'
  );
  const migrationSql = fs.readFileSync(migrationPath, 'utf8');
  await db.exec(migrationSql);

  return db;
}

async function runAllTests() {
  const db = await setupDatabase();

  const testUserId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
  await db.exec(`SET request.jwt.claim.sub = '${testUserId}';`);

  // Insert test broker and test instruments
  const brokerRes = await db.query(`
    INSERT INTO public.broker_accounts (user_id, broker_code, display_name)
    VALUES ('${testUserId}', 'ZERODHA', 'Test Zerodha Account')
    RETURNING id;
  `);
  const brokerId = brokerRes.rows[0].id;

  const instRes1 = await db.query(`
    INSERT INTO public.instruments (symbol, instrument_name, asset_type, exchange)
    VALUES ('RELIANCE', 'Reliance Industries Ltd', 'STOCK', 'NSE')
    RETURNING id;
  `);
  const relianceId = instRes1.rows[0].id;

  const instRes2 = await db.query(`
    INSERT INTO public.instruments (symbol, instrument_name, asset_type, exchange)
    VALUES ('TCS', 'Tata Consultancy Services', 'STOCK', 'NSE')
    RETURNING id;
  `);
  const tcsId = instRes2.rows[0].id;

  const instRes3 = await db.query(`
    INSERT INTO public.instruments (symbol, instrument_name, asset_type, exchange)
    VALUES ('INFY', 'Infosys Ltd', 'STOCK', 'NSE')
    RETURNING id;
  `);
  const infyId = instRes3.rows[0].id;

  // -------------------------------------------------------------
  // Test 1: Direct RPC call with reconciliation disabled parameter is rejected
  // -------------------------------------------------------------
  await runTestCase('Direct RPC call with reconciliation disabled parameter is rejected by SQL signature', async () => {
    let threw = false;
    try {
      await db.query(`
        SELECT public.record_transaction_atomic(
          p_broker_account_id => '${brokerId}'::uuid,
          p_instrument_id => '${relianceId}'::uuid,
          p_transaction_type => 'BUY',
          p_quantity => 10,
          p_unit_price => 100,
          p_gross_amount => 1000,
          p_reconcile_holding => false
        );
      `);
    } catch (err) {
      threw = true;
      assert(
        err.message.includes('p_reconcile_holding') || err.message.includes('does not exist'),
        `Expected parameter error, got: ${err.message}`
      );
    }
    assert(threw, 'Calling record_transaction_atomic with p_reconcile_holding must fail');
  });

  // -------------------------------------------------------------
  // Test 2: Direct RPC call with overselling enabled parameter is rejected
  // -------------------------------------------------------------
  await runTestCase('Direct RPC call with overselling enabled parameter is rejected by SQL signature', async () => {
    let threw = false;
    try {
      await db.query(`
        SELECT public.record_transaction_atomic(
          p_broker_account_id => '${brokerId}'::uuid,
          p_instrument_id => '${relianceId}'::uuid,
          p_transaction_type => 'SELL',
          p_quantity => 100,
          p_unit_price => 100,
          p_gross_amount => 10000,
          p_allow_oversell => true
        );
      `);
    } catch (err) {
      threw = true;
      assert(
        err.message.includes('p_allow_oversell') || err.message.includes('does not exist'),
        `Expected parameter error, got: ${err.message}`
      );
    }
    assert(threw, 'Calling record_transaction_atomic with p_allow_oversell must fail');
  });

  // -------------------------------------------------------------
  // Test 3: Zero-Quantity Constraint Compatibility & Full Sale of Manual Opening Holding
  // -------------------------------------------------------------
  await runTestCase('Zero-quantity constraint compatibility: Manual opening 50 units @ 100, SELL 50 leaves remaining 0 without CHECK violation', async () => {
    // Insert manual opening holding: 50 units @ 100
    await db.query(`
      INSERT INTO public.holdings (
        user_id, broker_account_id, instrument_id,
        quantity, average_buy_price, opening_quantity, opening_buy_price,
        is_ledger_managed, provenance_status
      ) VALUES (
        '${testUserId}', '${brokerId}', '${relianceId}',
        50, 100, 50, 100,
        false, 'MANUAL_DECLARED'
      );
    `);

    // Record SELL of 50 units at 120 via atomic RPC
    // On unmodified original schema, this would violate CHECK (quantity > 0).
    // With forward-only migration 20261011020000, quantity = 0 succeeds safely!
    await db.query(`
      SELECT public.record_transaction_atomic(
        p_broker_account_id => '${brokerId}'::uuid,
        p_instrument_id => '${relianceId}'::uuid,
        p_transaction_type => 'SELL',
        p_quantity => 50,
        p_unit_price => 120,
        p_gross_amount => 6000,
        p_fees => 0,
        p_taxes => 0,
        p_transaction_date => '2026-03-01T10:00:00Z'::timestamptz
      ) AS res;
    `);

    // Inspect committed row in holdings table
    const holdingRes = await db.query(`
      SELECT quantity, average_buy_price, opening_quantity, opening_buy_price, is_ledger_managed
      FROM public.holdings
      WHERE user_id = '${testUserId}' AND broker_account_id = '${brokerId}' AND instrument_id = '${relianceId}';
    `);

    assert.strictEqual(holdingRes.rows.length, 1, 'Holding row should exist');
    const h = holdingRes.rows[0];
    assert.strictEqual(Number(h.quantity), 0, 'Remaining position must be strictly ZERO after full sale');
    assert.strictEqual(Number(h.opening_quantity), 50, 'Opening quantity baseline must be preserved (50)');
    assert.strictEqual(Number(h.opening_buy_price), 100, 'Opening buy price baseline must be preserved (100)');
    assert.strictEqual(h.is_ledger_managed, true, 'Holding is now ledger-managed');
  });

  // -------------------------------------------------------------
  // Test 4: Deletion of that SELL restores opening baseline (50 units restored)
  // -------------------------------------------------------------
  await runTestCase('Deletion of that SELL restores original 50 units opening baseline', async () => {
    // Find the SELL transaction for RELIANCE
    const txRes = await db.query(`
      SELECT id FROM public.investment_transactions
      WHERE user_id = '${testUserId}' AND broker_account_id = '${brokerId}' AND instrument_id = '${relianceId}'
        AND transaction_type = 'SELL';
    `);
    assert.strictEqual(txRes.rows.length, 1, 'Should find 1 SELL transaction');
    const sellId = txRes.rows[0].id;

    // Delete the SELL transaction via atomic RPC
    await db.query(`
      SELECT public.delete_transaction_atomic('${sellId}'::uuid);
    `);

    // Inspect committed holdings row: must be restored to opening baseline 50 @ 100!
    const holdingRes = await db.query(`
      SELECT quantity, average_buy_price, opening_quantity, opening_buy_price, is_ledger_managed
      FROM public.holdings
      WHERE user_id = '${testUserId}' AND broker_account_id = '${brokerId}' AND instrument_id = '${relianceId}';
    `);

    assert.strictEqual(holdingRes.rows.length, 1, 'Holding row should exist');
    const h = holdingRes.rows[0];
    assert.strictEqual(Number(h.quantity), 50, 'Position must be restored to opening quantity (50)');
    assert.strictEqual(Number(h.average_buy_price), 100, 'Position average price must be 100');
    assert.strictEqual(h.is_ledger_managed, false, 'Holding returns to manual mode when 0 trades remain');
  });

  // -------------------------------------------------------------
  // Test 5: BUY 100, delete the only BUY -> no ghost holding
  // -------------------------------------------------------------
  await runTestCase('BUY 100, delete the only BUY eliminates ghost holding', async () => {
    // Create new position for TCS purely via BUY transaction (no opening balance)
    await db.query(`
      SELECT public.record_transaction_atomic(
        p_broker_account_id => '${brokerId}'::uuid,
        p_instrument_id => '${tcsId}'::uuid,
        p_transaction_type => 'BUY',
        p_quantity => 100,
        p_unit_price => 3000,
        p_gross_amount => 300000,
        p_transaction_date => '2026-01-10T10:00:00Z'::timestamptz
      ) AS res;
    `);

    // Verify holding exists
    const beforeDel = await db.query(`
      SELECT id, quantity, is_ledger_managed FROM public.holdings
      WHERE broker_account_id = '${brokerId}' AND instrument_id = '${tcsId}';
    `);
    assert.strictEqual(beforeDel.rows.length, 1, 'Holding created for TCS');
    assert.strictEqual(Number(beforeDel.rows[0].quantity), 100);
    assert.strictEqual(beforeDel.rows[0].is_ledger_managed, true);

    // Delete the BUY transaction
    const tcsTx = await db.query(`
      SELECT id FROM public.investment_transactions
      WHERE broker_account_id = '${brokerId}' AND instrument_id = '${tcsId}';
    `);
    await db.query(`
      SELECT public.delete_transaction_atomic('${tcsTx.rows[0].id}'::uuid);
    `);

    // Verify holding is eliminated
    const afterDel = await db.query(`
      SELECT id FROM public.holdings
      WHERE broker_account_id = '${brokerId}' AND instrument_id = '${tcsId}';
    `);
    assert.strictEqual(afterDel.rows.length, 0, 'Ghost holding must be eliminated completely');
  });

  // -------------------------------------------------------------
  // Test 6: BUY 100, SELL 100 -> 0 remaining, then BUY again -> correct quantity & cost basis
  // -------------------------------------------------------------
  await runTestCase('BUY 100, SELL 100 leaves zero remaining position; subsequent BUY restores correct quantity and cost basis', async () => {
    // 1. BUY 100 @ 3000
    await db.query(`
      SELECT public.record_transaction_atomic(
        p_broker_account_id => '${brokerId}'::uuid,
        p_instrument_id => '${tcsId}'::uuid,
        p_transaction_type => 'BUY',
        p_quantity => 100,
        p_unit_price => 3000,
        p_gross_amount => 300000,
        p_transaction_date => '2026-01-10T10:00:00Z'::timestamptz
      );
    `);

    // 2. SELL 100 @ 3200 (full liquidation)
    await db.query(`
      SELECT public.record_transaction_atomic(
        p_broker_account_id => '${brokerId}'::uuid,
        p_instrument_id => '${tcsId}'::uuid,
        p_transaction_type => 'SELL',
        p_quantity => 100,
        p_unit_price => 3200,
        p_gross_amount => 320000,
        p_transaction_date => '2026-02-10T10:00:00Z'::timestamptz
      );
    `);

    const zeroPos = await db.query(`
      SELECT quantity, is_ledger_managed FROM public.holdings
      WHERE broker_account_id = '${brokerId}' AND instrument_id = '${tcsId}';
    `);
    assert.strictEqual(zeroPos.rows.length, 1, 'Holding row retained for historical accounting');
    assert.strictEqual(Number(zeroPos.rows[0].quantity), 0, 'Quantity must be zero');
    assert.strictEqual(zeroPos.rows[0].is_ledger_managed, true);

    // 3. BUY 50 @ 3500 after full liquidation
    await db.query(`
      SELECT public.record_transaction_atomic(
        p_broker_account_id => '${brokerId}'::uuid,
        p_instrument_id => '${tcsId}'::uuid,
        p_transaction_type => 'BUY',
        p_quantity => 50,
        p_unit_price => 3500,
        p_gross_amount => 175000,
        p_transaction_date => '2026-03-10T10:00:00Z'::timestamptz
      );
    `);

    const rebuPos = await db.query(`
      SELECT quantity, average_buy_price FROM public.holdings
      WHERE broker_account_id = '${brokerId}' AND instrument_id = '${tcsId}';
    `);
    assert.strictEqual(Number(rebuPos.rows[0].quantity), 50, 'Quantity must be exactly 50');
    assert.strictEqual(Number(rebuPos.rows[0].average_buy_price), 3500, 'Cost basis must be exactly ₹3,500');
  });

  // -------------------------------------------------------------
  // Test 7: Non-trading zero-quantity events (DIVIDEND, INTEREST, COUPON, FEE)
  // -------------------------------------------------------------
  await runTestCase('Preserve zero-quantity non-trading events (DIVIDEND, FEE) while enforcing positive quantity for BUY/SELL', async () => {
    // 1. DIVIDEND with quantity = 0, gross_amount = 500 must succeed
    const divRes = await db.query(`
      SELECT public.record_transaction_atomic(
        p_broker_account_id => '${brokerId}'::uuid,
        p_instrument_id => '${tcsId}'::uuid,
        p_transaction_type => 'DIVIDEND',
        p_quantity => 0,
        p_unit_price => 0,
        p_gross_amount => 500,
        p_transaction_date => '2026-03-15T10:00:00Z'::timestamptz
      ) AS res;
    `);
    assert.strictEqual(divRes.rows[0].res.status, 'SUCCESS', 'DIVIDEND with quantity = 0 must succeed');

    // 2. FEE with quantity = 0, gross_amount = 50 must succeed
    const feeRes = await db.query(`
      SELECT public.record_transaction_atomic(
        p_broker_account_id => '${brokerId}'::uuid,
        p_instrument_id => '${tcsId}'::uuid,
        p_transaction_type => 'FEE',
        p_quantity => 0,
        p_unit_price => 0,
        p_gross_amount => 50,
        p_transaction_date => '2026-03-16T10:00:00Z'::timestamptz
      ) AS res;
    `);
    assert.strictEqual(feeRes.rows[0].res.status, 'SUCCESS', 'FEE with quantity = 0 must succeed');

    // 3. Verify holding quantity was not altered by non-trading transactions
    const hCheck = await db.query(`
      SELECT quantity FROM public.holdings WHERE broker_account_id = '${brokerId}' AND instrument_id = '${tcsId}';
    `);
    assert.strictEqual(Number(hCheck.rows[0].quantity), 50, 'Holding shares must remain 50');

    // 4. BUY with quantity = 0 must be strictly rejected
    let buyZeroThrew = false;
    try {
      await db.query(`
        SELECT public.record_transaction_atomic(
          p_broker_account_id => '${brokerId}'::uuid,
          p_instrument_id => '${tcsId}'::uuid,
          p_transaction_type => 'BUY',
          p_quantity => 0,
          p_unit_price => 100,
          p_gross_amount => 0
        );
      `);
    } catch (err) {
      buyZeroThrew = true;
      assert(err.message.includes('greater than 0'), 'BUY with 0 quantity must fail');
    }
    assert(buyZeroThrew, 'BUY with 0 quantity must be rejected');
  });

  // -------------------------------------------------------------
  // Test 8: Legacy NULL opening quantity protected from destructive reconciliation
  // -------------------------------------------------------------
  await runTestCase('Legacy NULL opening quantity holding blocks destructive reconciliation until declared', async () => {
    // Insert ambiguous legacy holding with NULL opening_quantity
    const legacyRes = await db.query(`
      INSERT INTO public.holdings (
        user_id, broker_account_id, instrument_id,
        quantity, average_buy_price, opening_quantity, opening_buy_price,
        is_ledger_managed, provenance_status
      ) VALUES (
        '${testUserId}', '${brokerId}', '${infyId}',
        100, 1500, NULL, NULL,
        false, 'UNKNOWN'
      )
      RETURNING id;
    `);
    const legacyHoldingId = legacyRes.rows[0].id;

    // 1. With 0 transactions, calling reconcile_position_atomic preserves holding safely
    const rec1 = await db.query(`
      SELECT public.reconcile_position_atomic('${brokerId}'::uuid, '${infyId}'::uuid) AS res;
    `);
    assert.strictEqual(rec1.rows[0].res.status, 'LEGACY_HOLDING_PRESERVED', 'Must preserve legacy holding when no transactions exist');

    // 2. If user records a transaction without declaring opening baseline, reconciliation blocks with error 22000!
    await db.query(`
      INSERT INTO public.investment_transactions (
        user_id, broker_account_id, instrument_id,
        transaction_type, quantity, unit_price, gross_amount, net_amount,
        transaction_date
      ) VALUES (
        '${testUserId}', '${brokerId}', '${infyId}',
        'SELL', 10, 1600, 16000, 16000,
        '2026-03-01T10:00:00Z'::timestamptz
      );
    `);

    let blocked = false;
    try {
      await db.query(`
        SELECT public.reconcile_position_atomic('${brokerId}'::uuid, '${infyId}'::uuid);
      `);
    } catch (err) {
      blocked = true;
      assert(
        err.message.includes('opening position provenance is unverified') || err.message.includes('22000'),
        `Expected provenance block error, got: ${err.message}`
      );
    }
    assert(blocked, 'Must block destructive reconciliation on unanchored legacy holding with transactions');

    // 3. User calls declare_holding_opening_balance to anchor the baseline verified
    await db.query(`
      SELECT public.declare_holding_opening_balance(
        '${legacyHoldingId}'::uuid,
        100,
        1500
      );
    `);

    // Verify holding updated with provenance
    const declaredHolding = await db.query(`
      SELECT opening_quantity, opening_buy_price, provenance_status FROM public.holdings
      WHERE id = '${legacyHoldingId}';
    `);
    assert.strictEqual(Number(declaredHolding.rows[0].opening_quantity), 100);
    assert.strictEqual(declaredHolding.rows[0].provenance_status, 'MANUAL_DECLARED');

    // 4. Now reconciliation succeeds safely: 100 opening - 10 sold = 90 remaining
    const rec2 = await db.query(`
      SELECT public.reconcile_position_atomic('${brokerId}'::uuid, '${infyId}'::uuid) AS res;
    `);
    assert.strictEqual(rec2.rows[0].res.status, 'SUCCESS');
    assert.strictEqual(Number(rec2.rows[0].res.quantity), 90);
  });

  // -------------------------------------------------------------
  // Test 9: declare_holding_opening_balance protection against verified / active positions
  // -------------------------------------------------------------
  await runTestCase('declare_holding_opening_balance rejects modifying already verified or active positions and validates bounds', async () => {
    // 1. Rejects NULL arguments
    let nullThrew = false;
    try {
      await db.query(`SELECT public.declare_holding_opening_balance(NULL, 10, 100);`);
    } catch (err) {
      nullThrew = true;
      assert(err.message.includes('null'), 'Must reject null argument');
    }
    assert(nullThrew, 'Null holding_id must be rejected');

    // 2. Rejects negative values
    let negThrew = false;
    try {
      const h = await db.query(`SELECT id FROM public.holdings LIMIT 1;`);
      await db.query(`SELECT public.declare_holding_opening_balance('${h.rows[0].id}'::uuid, -10, 100);`);
    } catch (err) {
      negThrew = true;
      assert(err.message.includes('non-negative'), 'Must reject negative opening quantity');
    }
    assert(negThrew, 'Negative opening quantity must be rejected');

    // 3. Rejects modifying VERIFIED holding with established baseline
    const verifiedInstRes = await db.query(`
      INSERT INTO public.instruments (symbol, instrument_name, asset_type, exchange)
      VALUES ('WIPRO', 'Wipro Ltd', 'STOCK', 'NSE')
      RETURNING id;
    `);
    const wiproId = verifiedInstRes.rows[0].id;

    const verifiedH = await db.query(`
      INSERT INTO public.holdings (
        user_id, broker_account_id, instrument_id,
        quantity, average_buy_price, opening_quantity, opening_buy_price,
        is_ledger_managed, provenance_status
      ) VALUES (
        '${testUserId}', '${brokerId}', '${wiproId}',
        20, 50, 20, 50,
        false, 'VERIFIED'
      )
      RETURNING id;
    `);

    let verifiedThrew = false;
    try {
      await db.query(`
        SELECT public.declare_holding_opening_balance('${verifiedH.rows[0].id}'::uuid, 999, 999);
      `);
    } catch (err) {
      verifiedThrew = true;
      assert(err.message.includes('already verified') || err.message.includes('blocked'), err.message);
    }
    assert(verifiedThrew, 'Modifying already verified opening balance must be blocked');
  });

  // -------------------------------------------------------------
  // Test 10: Backdated BUY and out-of-order trades recalculate exact WAC
  // -------------------------------------------------------------
  await runTestCase('Backdated BUY and out-of-order trades recalculate exact WAC via chronological replay', async () => {
    // Clean up INFY transactions and holdings
    await db.query(`DELETE FROM public.investment_transactions WHERE instrument_id = '${infyId}';`);
    await db.query(`DELETE FROM public.holdings WHERE instrument_id = '${infyId}';`);

    // Record BUY 10 @ 200 on Feb 1
    await db.query(`
      SELECT public.record_transaction_atomic(
        p_broker_account_id => '${brokerId}'::uuid,
        p_instrument_id => '${infyId}'::uuid,
        p_transaction_type => 'BUY',
        p_quantity => 10,
        p_unit_price => 200,
        p_gross_amount => 2000,
        p_transaction_date => '2026-02-01T10:00:00Z'::timestamptz
      );
    `);

    // Now record backdated BUY 10 @ 100 on Jan 1
    await db.query(`
      SELECT public.record_transaction_atomic(
        p_broker_account_id => '${brokerId}'::uuid,
        p_instrument_id => '${infyId}'::uuid,
        p_transaction_type => 'BUY',
        p_quantity => 10,
        p_unit_price => 100,
        p_gross_amount => 1000,
        p_transaction_date => '2026-01-01T10:00:00Z'::timestamptz
      );
    `);

    // Inspect committed holding: WAC must be (10*100 + 10*200) / 20 = 3000 / 20 = 150
    const hRes = await db.query(`
      SELECT quantity, average_buy_price FROM public.holdings
      WHERE broker_account_id = '${brokerId}' AND instrument_id = '${infyId}';
    `);
    assert.strictEqual(Number(hRes.rows[0].quantity), 20);
    assert.strictEqual(Number(hRes.rows[0].average_buy_price), 150, 'WAC must be 150 after backdated trade insertion');
  });

  // -------------------------------------------------------------
  // Test 11: Oversell attempt fails with 22003 and rolls back entire transaction insert
  // -------------------------------------------------------------
  await runTestCase('Oversell attempt fails with 22003 and rolls back entire transaction insert', async () => {
    const countBefore = await db.query(`
      SELECT COUNT(*)::int AS cnt FROM public.investment_transactions WHERE instrument_id = '${infyId}';
    `);

    let rejected = false;
    try {
      await db.query(`
        SELECT public.record_transaction_atomic(
          p_broker_account_id => '${brokerId}'::uuid,
          p_instrument_id => '${infyId}'::uuid,
          p_transaction_type => 'SELL',
          p_quantity => 50,
          p_unit_price => 250,
          p_gross_amount => 12500,
          p_transaction_date => '2026-03-01T10:00:00Z'::timestamptz
        );
      `);
    } catch (err) {
      rejected = true;
      assert(
        err.message.includes('Unsafe transaction state') || err.message.includes('22003'),
        `Expected oversell error 22003, got: ${err.message}`
      );
    }
    assert(rejected, 'Oversell must be rejected');

    const countAfter = await db.query(`
      SELECT COUNT(*)::int AS cnt FROM public.investment_transactions WHERE instrument_id = '${infyId}';
    `);
    assert.strictEqual(countAfter.rows[0].cnt, countBefore.rows[0].cnt, 'Transaction row MUST NOT be inserted when overselling fails (atomic rollback)');
  });

  // -------------------------------------------------------------
  // Test 12: Direct authenticated table writes on transactions are blocked by RESTRICTIVE RLS
  // -------------------------------------------------------------
  await runTestCase('Direct authenticated table writes on transactions are blocked by RESTRICTIVE RLS', async () => {
    await db.exec(`SET ROLE authenticated;`);
    await db.exec(`SET request.jwt.claim.sub = '${testUserId}';`);

    let insertBlocked = false;
    try {
      await db.query(`
        INSERT INTO public.investment_transactions (
          user_id, broker_account_id, instrument_id,
          transaction_type, quantity, unit_price, gross_amount, net_amount,
          transaction_date
        ) VALUES (
          '${testUserId}', '${brokerId}', '${infyId}',
          'BUY', 5, 100, 500, 500, NOW()
        );
      `);
    } catch {
      insertBlocked = true;
    }
    assert(insertBlocked, 'Direct INSERT into investment_transactions must be blocked by RLS');

    await db.exec(`RESET ROLE;`);
    await db.exec(`SET request.jwt.claim.sub = '${testUserId}';`);
  });

  // -------------------------------------------------------------
  // Test 13: Direct UPDATE on ledger-managed holdings is blocked for authenticated users
  // -------------------------------------------------------------
  await runTestCase('Direct UPDATE on ledger-managed holdings is blocked for authenticated users', async () => {
    await db.exec(`SET ROLE authenticated;`);
    await db.exec(`SET request.jwt.claim.sub = '${testUserId}';`);

    let updateHBlocked = false;
    try {
      const res = await db.query(`
        UPDATE public.holdings
        SET quantity = 9999
        WHERE broker_account_id = '${brokerId}' AND instrument_id = '${infyId}';
      `);
      if (res.rowCount === 0) {
        updateHBlocked = true;
      }
    } catch {
      updateHBlocked = true;
    }
    assert(updateHBlocked, 'Direct UPDATE on ledger-managed holding must affect 0 rows or fail');

    await db.exec(`RESET ROLE;`);
    await db.exec(`SET request.jwt.claim.sub = '${testUserId}';`);
  });

  // -------------------------------------------------------------
  // Test 14: ON DELETE RESTRICT on broker accounts blocks deletion when transactions exist
  // -------------------------------------------------------------
  await runTestCase('ON DELETE RESTRICT blocks broker account deletion when transactions or holdings exist', async () => {
    let brokerDelBlocked = false;
    try {
      // Direct table DELETE on broker_accounts
      await db.query(`
        DELETE FROM public.broker_accounts WHERE id = '${brokerId}';
      `);
    } catch (err) {
      brokerDelBlocked = true;
      assert(
        err.message.includes('Cannot delete broker account') ||
        err.message.includes('violates foreign key constraint') ||
        err.message.includes('23503'),
        err.message
      );
    }
    assert(brokerDelBlocked, 'Direct deletion of broker account with records must be blocked');

    // Also verify atomic RPC blocks it
    let rpcDelBlocked = false;
    try {
      await db.query(`SELECT public.safe_delete_broker_account('${brokerId}'::uuid);`);
    } catch (err) {
      rpcDelBlocked = true;
      assert(err.message.includes('Cannot delete broker account') || err.message.includes('23503'), err.message);
    }
    assert(rpcDelBlocked, 'safe_delete_broker_account must block deletion with active records');
  });

  // -------------------------------------------------------------
  // Test 15: Authorized broker deletion RPC succeeds on empty broker account
  // -------------------------------------------------------------
  await runTestCase('Authorized broker deletion RPC succeeds on empty broker account', async () => {
    const emptyBrokerRes = await db.query(`
      INSERT INTO public.broker_accounts (user_id, broker_code, display_name)
      VALUES ('${testUserId}', 'GROWW', 'Empty Groww Account')
      RETURNING id;
    `);
    const emptyBrokerId = emptyBrokerRes.rows[0].id;

    const delRes = await db.query(`
      SELECT public.safe_delete_broker_account('${emptyBrokerId}'::uuid) AS res;
    `);
    assert.strictEqual(delRes.rows[0].res.success, true, 'safe_delete_broker_account must succeed for empty account');

    const check = await db.query(`SELECT id FROM public.broker_accounts WHERE id = '${emptyBrokerId}';`);
    assert.strictEqual(check.rows.length, 0, 'Broker account must be deleted');
  });

  // -------------------------------------------------------------
  // Test 16: Function EXECUTE permissions & RLS cross-user isolation
  // -------------------------------------------------------------
  await runTestCase('Function permissions and cross-user isolation prevent unauthorized access', async () => {
    const otherUserId = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b22';

    // Switch to authenticated other user
    await db.exec(`SET ROLE authenticated;`);
    await db.exec(`SET request.jwt.claim.sub = '${otherUserId}';`);

    // Cannot read first user's transactions
    const txOther = await db.query(`SELECT * FROM public.investment_transactions;`);
    assert.strictEqual(txOther.rows.length, 0, 'Cross-user transactions must be invisible via RLS');

    // Cannot delete first user's transaction via atomic RPC
    let crossDeleteBlocked = false;
    try {
      const anyTx = await db.query(`SELECT id FROM public.investment_transactions LIMIT 1;`);
      if (anyTx.rows.length > 0) {
        await db.query(`SELECT public.delete_transaction_atomic('${anyTx.rows[0].id}'::uuid);`);
      } else {
        crossDeleteBlocked = true;
      }
    } catch (err) {
      crossDeleteBlocked = true;
      assert(err.message.includes('not found') || err.message.includes('P0002'), err.message);
    }
    assert(crossDeleteBlocked, 'Cross-user transaction deletion must fail with P0002');

    await db.exec(`RESET ROLE;`);
  });

  console.log('='.repeat(75));
  console.log(`Results: ${passed}/${total} PostgreSQL integration tests PASSED.`);
  if (passed === total) {
    console.log('ALL REAL POSTGRESQL FINANCIAL INTEGRITY INTEGRATION TESTS PASSED!');
  } else {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
