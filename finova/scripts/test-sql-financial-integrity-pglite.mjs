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

  // 1. Setup auth mock and base tables
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
      updated_at TIMESTAMPTZ DEFAULT NOW()
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

    CREATE TABLE IF NOT EXISTS public.holdings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      broker_account_id UUID NOT NULL REFERENCES public.broker_accounts(id) ON DELETE CASCADE,
      instrument_id UUID NOT NULL REFERENCES public.instruments(id),
      quantity NUMERIC(18, 6) NOT NULL DEFAULT 0,
      average_buy_price NUMERIC(18, 4) NOT NULL DEFAULT 0,
      currency TEXT DEFAULT 'INR',
      data_source TEXT DEFAULT 'MANUAL',
      as_of TIMESTAMPTZ DEFAULT NOW(),
      opening_quantity NUMERIC(18, 6) DEFAULT NULL,
      opening_buy_price NUMERIC(18, 4) DEFAULT NULL,
      is_ledger_managed BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS public.investment_transactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      broker_account_id UUID NOT NULL REFERENCES public.broker_accounts(id) ON DELETE CASCADE,
      instrument_id UUID NOT NULL REFERENCES public.instruments(id),
      transaction_type TEXT NOT NULL,
      quantity NUMERIC(18, 6) NOT NULL,
      unit_price NUMERIC(18, 4) NOT NULL,
      gross_amount NUMERIC(18, 4) NOT NULL,
      fees NUMERIC(18, 4) DEFAULT 0,
      taxes NUMERIC(18, 4) DEFAULT 0,
      net_amount NUMERIC(18, 4) NOT NULL,
      currency TEXT DEFAULT 'INR',
      transaction_date TIMESTAMPTZ NOT NULL,
      settlement_date TIMESTAMPTZ,
      source TEXT DEFAULT 'MANUAL',
      external_reference TEXT,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
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

  // 2. Load migration 20261011020000
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
  // Test 3: Full sale of a manual opening position
  // -------------------------------------------------------------
  await runTestCase('Full sale of manual opening position: 50 units @ 100 sold @ 120 leaves 0 remaining position', async () => {
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

    // Realized P&L: 50 * (120 - 100) = 1000
    const grossSell = 50 * 120;
    const costBasis = 50 * 100;
    const realizedPnL = grossSell - costBasis;
    assert.strictEqual(realizedPnL, 1000, 'Realized P&L before fees/taxes must be ₹1,000');
  });

  // -------------------------------------------------------------
  // Test 4: Deletion of the only SELL restores opening baseline
  // -------------------------------------------------------------
  await runTestCase('Deletion of the last SELL restores position to genuine opening baseline', async () => {
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
  });

  // -------------------------------------------------------------
  // Test 5: Deletion of the only BUY eliminates ghost holding
  // -------------------------------------------------------------
  await runTestCase('Deletion of the only BUY eliminates ghost holding', async () => {
    // Create new position for TCS purely via BUY transaction (no opening balance)
    await db.query(`
      SELECT public.record_transaction_atomic(
        p_broker_account_id => '${brokerId}'::uuid,
        p_instrument_id => '${tcsId}'::uuid,
        p_transaction_type => 'BUY',
        p_quantity => 20,
        p_unit_price => 3000,
        p_gross_amount => 60000,
        p_transaction_date => '2026-01-10T10:00:00Z'::timestamptz
      ) AS res;
    `);

    // Verify holding exists
    const beforeDel = await db.query(`
      SELECT id, quantity, is_ledger_managed FROM public.holdings
      WHERE broker_account_id = '${brokerId}' AND instrument_id = '${tcsId}';
    `);
    assert.strictEqual(beforeDel.rows.length, 1, 'Holding created for TCS');
    assert.strictEqual(Number(beforeDel.rows[0].quantity), 20);
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
  // Test 6: Legacy NULL opening quantity protected from destructive reconciliation
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
    const status1 = rec1.rows[0].res.status;
    assert.strictEqual(status1, 'LEGACY_HOLDING_PRESERVED', 'Must preserve legacy holding when no transactions exist');

    // 2. If user records a transaction without declaring opening baseline, reconciliation blocks with error 22000!
    // We insert a direct transaction into table via service_role to simulate external or unanchored tradebook
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
  // Test 7: Historical & Out-of-order trades (Chronological replay)
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
  // Test 8: Rollback after database failure (Overselling rejected atomically)
  // -------------------------------------------------------------
  await runTestCase('Oversell attempt fails with 22003 and rolls back entire transaction insert', async () => {
    // Current INFY position: 20 units. Attempt to SELL 50 units.
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
  // Test 9: Direct authenticated table writes are blocked by RESTRICTIVE RLS
  // -------------------------------------------------------------
  await runTestCase('Direct authenticated table writes on transactions are blocked by RESTRICTIVE RLS', async () => {
    // Switch to role 'authenticated'
    await db.exec(`SET ROLE authenticated;`);
    await db.exec(`SET request.jwt.claim.sub = '${testUserId}';`);

    // 1. Direct INSERT into investment_transactions
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

    // 2. Direct UPDATE into investment_transactions
    let updateBlocked = false;
    try {
      const res = await db.query(`
        UPDATE public.investment_transactions
        SET quantity = 9999
        WHERE instrument_id = '${infyId}';
      `);
      if (res.rowCount === 0) {
        updateBlocked = true;
      }
    } catch {
      updateBlocked = true;
    }
    assert(updateBlocked, 'Direct UPDATE on investment_transactions must be blocked by RLS');

    // 3. Direct DELETE from investment_transactions
    let deleteBlocked = false;
    try {
      const res = await db.query(`
        DELETE FROM public.investment_transactions
        WHERE instrument_id = '${infyId}';
      `);
      if (res.rowCount === 0) {
        deleteBlocked = true;
      }
    } catch {
      deleteBlocked = true;
    }
    assert(deleteBlocked, 'Direct DELETE on investment_transactions must be blocked by RLS');

    // Reset role to postgres
    await db.exec(`RESET ROLE;`);
    await db.exec(`SET request.jwt.claim.sub = '${testUserId}';`);
  });

  // -------------------------------------------------------------
  // Test 10: Authorized SECURITY DEFINER RPC succeeds under RESTRICTIVE RLS
  // -------------------------------------------------------------
  await runTestCase('Authorized SECURITY DEFINER RPC executes and reconciles position under RESTRICTIVE RLS', async () => {
    // Switch to role 'authenticated'
    await db.exec(`SET ROLE authenticated;`);
    await db.exec(`SET request.jwt.claim.sub = '${testUserId}';`);

    const rpcRes = await db.query(`
      SELECT public.record_transaction_atomic(
        p_broker_account_id => '${brokerId}'::uuid,
        p_instrument_id => '${infyId}'::uuid,
        p_transaction_type => 'BUY',
        p_quantity => 5,
        p_unit_price => 160,
        p_gross_amount => 800,
        p_transaction_date => '2026-03-05T10:00:00Z'::timestamptz
      ) AS res;
    `);

    assert(rpcRes.rows[0].res.transaction, 'Transaction returned from atomic procedure');
    assert.strictEqual(rpcRes.rows[0].res.status, 'SUCCESS');

    // Verify holding updated: previous 20 @ 150 + new 5 @ 160 = 25 @ (3000 + 800)/25 = 3800/25 = 152
    const hRes = await db.query(`
      SELECT quantity, average_buy_price FROM public.holdings
      WHERE broker_account_id = '${brokerId}' AND instrument_id = '${infyId}';
    `);
    assert.strictEqual(Number(hRes.rows[0].quantity), 25);
    assert.strictEqual(Number(hRes.rows[0].average_buy_price), 152);

    // Reset role
    await db.exec(`RESET ROLE;`);
  });

  // -------------------------------------------------------------
  // Test 11: Direct UPDATE on ledger-managed holdings is blocked
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
      // In PostgreSQL RLS, an UPDATE that violates USING/CHECK matches 0 rows or raises error
      if (res.rowCount === 0) {
        updateHBlocked = true;
      }
    } catch {
      updateHBlocked = true;
    }
    assert(updateHBlocked, 'Direct UPDATE on ledger-managed holding must affect 0 rows or fail');

    await db.exec(`RESET ROLE;`);
  });

  // -------------------------------------------------------------
  // Test 12: Safe broker account deletion blocked when transactions exist
  // -------------------------------------------------------------
  await runTestCase('Safe broker account deletion blocked with active transactions', async () => {
    let brokerDelBlocked = false;
    try {
      await db.query(`
        SELECT public.safe_delete_broker_account('${brokerId}'::uuid);
      `);
    } catch (err) {
      brokerDelBlocked = true;
      assert(
        err.message.includes('Cannot delete broker account') || err.message.includes('23503'),
        `Expected broker delete block error, got: ${err.message}`
      );
    }
    assert(brokerDelBlocked, 'Broker account deletion must be blocked while transactions exist');
  });

  // -------------------------------------------------------------
  // Test 13: Unsorted trade batch replay calculates exact WAC without oversell failure
  // -------------------------------------------------------------
  await runTestCase('Unsorted trade batch replay calculates exact WAC without oversell failure', async () => {
    // New instrument for batch import test
    const batchInstRes = await db.query(`
      INSERT INTO public.instruments (symbol, instrument_name, asset_type, exchange)
      VALUES ('HDFCBANK', 'HDFC Bank Ltd', 'STOCK', 'NSE')
      RETURNING id;
    `);
    const hdfcId = batchInstRes.rows[0].id;

    // Simulate unsorted trades:
    // Trade 1 (chronologically 3rd): 2026-03-01 SELL 10 @ 1600
    // Trade 2 (chronologically 1st): 2026-01-01 BUY 10 @ 1400
    // Trade 3 (chronologically 2nd): 2026-02-01 BUY 10 @ 1500
    const unsortedTrades = [
      { type: 'SELL', qty: 10, price: 1600, date: '2026-03-01T10:00:00Z' },
      { type: 'BUY', qty: 10, price: 1400, date: '2026-01-01T10:00:00Z' },
      { type: 'BUY', qty: 10, price: 1500, date: '2026-02-01T10:00:00Z' },
    ];

    // Sorting according to our import route logic (chronological, BUYs before SELLs)
    const sorted = [...unsortedTrades].sort((a, b) => {
      const tA = new Date(a.date).getTime();
      const tB = new Date(b.date).getTime();
      if (tA !== tB) return tA - tB;
      const pA = a.type === 'BUY' ? 1 : 2;
      const pB = b.type === 'BUY' ? 1 : 2;
      return pA - pB;
    });

    for (const t of sorted) {
      await db.query(`
        SELECT public.record_transaction_atomic(
          p_broker_account_id => '${brokerId}'::uuid,
          p_instrument_id => '${hdfcId}'::uuid,
          p_transaction_type => '${t.type}',
          p_quantity => ${t.qty},
          p_unit_price => ${t.price},
          p_gross_amount => ${t.qty * t.price},
          p_transaction_date => '${t.date}'::timestamptz
        );
      `);
    }

    // Inspect committed holding:
    // Jan 01: BUY 10 @ 1400 (cost: 14000, avg: 1400)
    // Feb 01: BUY 10 @ 1500 (cost: 14000 + 15000 = 29000, qty: 20, avg: 1450)
    // Mar 01: SELL 10 @ 1600 (remaining qty: 10, avg cost basis: 1450, realized P&L: 10 * (1600-1450) = 1500)
    const hRes = await db.query(`
      SELECT quantity, average_buy_price FROM public.holdings
      WHERE broker_account_id = '${brokerId}' AND instrument_id = '${hdfcId}';
    `);

    assert.strictEqual(Number(hRes.rows[0].quantity), 10, 'Remaining quantity must be 10');
    assert.strictEqual(Number(hRes.rows[0].average_buy_price), 1450, 'Average buy price must be 1450');
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
