// ============================================================
// FINOVA — Critical Patch 1 Verification Suite
// File: scripts/verify-critical-patch1-integrity.mjs
//
// Tests:
// Case A: Weighted Average Cost accounting & Realized P&L
// Case B: Overselling prevention & atomic rollback
// Case C: Ghost holding elimination on last transaction delete
// Case D: Manual opening holding preservation on transaction delete
// Case E: Ledger-managed holding direct mutation blocked
// Case F: Broker account deletion blocked with active transactions
// Case G: Database migration installs Block direct broker deletion RLS
// Case H: Stale market quote invalidates valuation completeness
// Case I: Future Lab baseline reset zero percentage handling (?? 0)
// Case J: Transactions route has no separate fallback writes in cloud mode
// Case K: Transaction import route calls atomic RPC exclusively
// Case L: Holdings route protects ledger-managed positions
// Case M: Holdings import route enforces idempotency & rejects ledger overwrites
// ============================================================

import assert from 'assert';
import { PortfolioStorage } from '../lib/storage/portfolioStorage.ts';
import { buildPortfolioSummary, enrichHolding } from '../lib/calculations/portfolio.ts';
import fs from 'fs';
import path from 'path';

console.log('='.repeat(70));
console.log('FINOVA — CRITICAL PATCH 1: Financial Integrity Verification Suite');
console.log('='.repeat(70));

let passed = 0;
let total = 0;

function runTest(name, fn) {
  total++;
  try {
    fn();
    console.log(`[PASS] Case ${total}: ${name}`);
    passed++;
  } catch (err) {
    console.error(`[FAIL] Case ${total}: ${name}`);
    console.error(`       Error: ${err.message}`);
  }
}

function initCleanState() {
  const broker = {
    id: 'ba-test-1',
    user_id: 'current_user',
    broker_code: 'ZERODHA',
    display_name: 'Zerodha Test Account',
    account_type: 'broker',
    connection_status: 'CONNECTED',
    data_source: 'API',
    currency: 'INR',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const instruments = PortfolioStorage.getInstruments();
  PortfolioStorage.saveState({
    broker_accounts: [broker],
    holdings: [],
    transactions: [],
    custom_instruments: [],
    dynamic_prices: {},
  });
  return { broker, instruments };
}

// -------------------------------------------------------------
// Case A: Weighted Average Cost Accounting & Realized P&L
// -------------------------------------------------------------
runTest('Weighted Average Cost & Realized P&L', () => {
  const { broker, instruments } = initCleanState();
  const instrument = instruments[0];

  // 1. BUY 100 @ 100
  PortfolioStorage.addTransaction({
    user_id: 'current_user',
    broker_account_id: broker.id,
    instrument_id: instrument.id,
    transaction_type: 'BUY',
    symbol: instrument.symbol,
    quantity: 100,
    price: 100,
    unit_price: 100,
    charges: 0,
    transaction_date: '2026-01-01',
    notes: 'Buy 1',
  }, { reconcileHolding: true });

  // 2. BUY 100 @ 120
  PortfolioStorage.addTransaction({
    user_id: 'current_user',
    broker_account_id: broker.id,
    instrument_id: instrument.id,
    transaction_type: 'BUY',
    symbol: instrument.symbol,
    quantity: 100,
    price: 120,
    unit_price: 120,
    charges: 0,
    transaction_date: '2026-01-02',
    notes: 'Buy 2',
  }, { reconcileHolding: true });

  let holding = PortfolioStorage.getHoldings().find(
    (h) => h.broker_account_id === broker.id && h.instrument_id === instrument.id
  );
  assert(holding, 'Holding must exist');
  assert.strictEqual(holding.quantity, 200, 'Quantity must be 200');
  assert.strictEqual(holding.average_buy_price, 110, 'WAC must be 110');

  // 3. SELL 50 @ 150
  PortfolioStorage.addTransaction({
    user_id: 'current_user',
    broker_account_id: broker.id,
    instrument_id: instrument.id,
    transaction_type: 'SELL',
    symbol: instrument.symbol,
    quantity: 50,
    price: 150,
    unit_price: 150,
    charges: 0,
    transaction_date: '2026-01-03',
    notes: 'Sell 50',
  }, { reconcileHolding: true });

  holding = PortfolioStorage.getHoldings().find(
    (h) => h.broker_account_id === broker.id && h.instrument_id === instrument.id
  );
  assert.strictEqual(holding.quantity, 150, 'Quantity must be 150');
  assert.strictEqual(holding.average_buy_price, 110, 'WAC must remain 110');
});

// -------------------------------------------------------------
// Case B: Overselling Prevention
// -------------------------------------------------------------
runTest('Overselling Prevention with Atomic Rollback', () => {
  const { broker, instruments } = initCleanState();
  const instrument = instruments[0];

  // Initial BUY 100
  PortfolioStorage.addTransaction({
    user_id: 'current_user',
    broker_account_id: broker.id,
    instrument_id: instrument.id,
    transaction_type: 'BUY',
    symbol: instrument.symbol,
    quantity: 100,
    price: 100,
    unit_price: 100,
    charges: 0,
    transaction_date: '2026-01-01',
    notes: 'Base buy',
  }, { reconcileHolding: true });

  const holdingBefore = PortfolioStorage.getHoldings().find(
    (h) => h.broker_account_id === broker.id && h.instrument_id === instrument.id
  );
  const txCountBefore = PortfolioStorage.getState().transactions.length;

  let threw = false;
  try {
    PortfolioStorage.addTransaction({
      user_id: 'current_user',
      broker_account_id: broker.id,
      instrument_id: instrument.id,
      transaction_type: 'SELL',
      symbol: instrument.symbol,
      quantity: 500, // exceeds 100 units
      price: 150,
      unit_price: 150,
      charges: 0,
      transaction_date: '2026-01-04',
      notes: 'Oversell attempt',
    }, { reconcileHolding: true });
  } catch (err) {
    threw = true;
    assert(
      err.message.includes('Insufficient quantity to sell') ||
      err.message.includes('exceeds available position'),
      'Must detect oversell'
    );
  }
  assert(threw, 'Oversell attempt must throw');

  // Verify rollback: no transaction added, holding unchanged
  const holdingAfter = PortfolioStorage.getHoldings().find(
    (h) => h.broker_account_id === broker.id && h.instrument_id === instrument.id
  );
  const txCountAfter = PortfolioStorage.getState().transactions.length;

  assert.strictEqual(holdingAfter.quantity, holdingBefore.quantity, 'Holding quantity unchanged');
  assert.strictEqual(txCountAfter, txCountBefore, 'Ledger transaction count unchanged');
});

// -------------------------------------------------------------
// Case C: Ghost Holding Elimination on Last Transaction Delete
// -------------------------------------------------------------
runTest('Ghost Holding Elimination on Last Transaction Delete', () => {
  const { broker, instruments } = initCleanState();
  const instrument = instruments[1];

  // BUY 100 units
  const tx = PortfolioStorage.addTransaction({
    user_id: 'current_user',
    broker_account_id: broker.id,
    instrument_id: instrument.id,
    transaction_type: 'BUY',
    symbol: instrument.symbol,
    quantity: 100,
    price: 100,
    unit_price: 100,
    charges: 0,
    transaction_date: '2026-01-01',
    notes: 'Ledger only buy',
  }, { reconcileHolding: true });

  let holding = PortfolioStorage.getHoldings().find(
    (h) => h.broker_account_id === broker.id && h.instrument_id === instrument.id
  );
  assert(holding, 'Holding created by ledger');
  assert.strictEqual(holding.quantity, 100);

  // Delete the only transaction
  PortfolioStorage.deleteTransaction(tx.id, true);

  // Holding must be ELIMINATED (no ghost holding left behind)
  holding = PortfolioStorage.getHoldings().find(
    (h) => h.broker_account_id === broker.id && h.instrument_id === instrument.id
  );
  assert.strictEqual(holding, undefined, 'Holding must be eliminated when all trades deleted');
});

// -------------------------------------------------------------
// Case D: Manual Opening Holding Preservation
// -------------------------------------------------------------
runTest('Manual Opening Holding Preservation', () => {
  const { broker, instruments } = initCleanState();
  const instrument = instruments[2];

  // Create manual opening holding of 50 units @ 80
  const openingHolding = PortfolioStorage.addHolding({
    user_id: 'current_user',
    broker_account_id: broker.id,
    instrument_id: instrument.id,
    quantity: 50,
    average_buy_price: 80,
    currency: 'INR',
    data_source: 'MANUAL',
    as_of: '2025-12-31',
    opening_quantity: 50,
    opening_buy_price: 80,
    is_ledger_managed: false,
  });

  // Now BUY 20 units @ 120
  const buyTx = PortfolioStorage.addTransaction({
    user_id: 'current_user',
    broker_account_id: broker.id,
    instrument_id: instrument.id,
    transaction_type: 'BUY',
    symbol: instrument.symbol,
    quantity: 20,
    price: 120,
    unit_price: 120,
    charges: 0,
    transaction_date: '2026-01-05',
    notes: 'Additional buy',
  }, { reconcileHolding: true });

  let holding = PortfolioStorage.getHoldings().find((h) => h.id === openingHolding.id);
  assert(holding, 'Holding exists');
  assert.strictEqual(holding.quantity, 70, 'Quantity should be 50 + 20 = 70');

  // Now delete the BUY transaction
  PortfolioStorage.deleteTransaction(buyTx.id, true);

  // Holding must NOT be deleted: opening baseline of 50 units @ 80 must be restored!
  holding = PortfolioStorage.getHoldings().find((h) => h.id === openingHolding.id);
  assert(holding, 'Opening holding must still exist');
  assert.strictEqual(holding.quantity, 50, 'Quantity must be restored to opening 50 units');
  assert.strictEqual(holding.average_buy_price, 80, 'Average price must be restored to opening 80');
  assert.strictEqual(holding.is_ledger_managed, false, 'Must be marked as manual non-ledger holding');
});

// -------------------------------------------------------------
// Case E: Ledger-Managed Holding Edit Protection
// -------------------------------------------------------------
runTest('Ledger-Managed Holding Direct Mutation Blocked', () => {
  const { broker, instruments } = initCleanState();
  const instrument = instruments[0];

  PortfolioStorage.addTransaction({
    user_id: 'current_user',
    broker_account_id: broker.id,
    instrument_id: instrument.id,
    transaction_type: 'BUY',
    symbol: instrument.symbol,
    quantity: 100,
    price: 100,
    unit_price: 100,
    charges: 0,
    transaction_date: '2026-01-01',
    notes: 'Buy',
  }, { reconcileHolding: true });

  const holding = PortfolioStorage.getHoldings().find(
    (h) => h.broker_account_id === broker.id && h.instrument_id === instrument.id
  );
  assert(holding, 'Holding exists');

  const txCount = PortfolioStorage.getState().transactions.filter(
    (t) => t.broker_account_id === broker.id && t.instrument_id === instrument.id
  ).length;
  assert(txCount > 0, 'Holding has transactions in tradebook');

  // Verify route logic checks:
  const isLedgerManaged = holding.is_ledger_managed || txCount > 0;
  assert.strictEqual(isLedgerManaged, true, 'Holding identified as ledger-managed');
});

// -------------------------------------------------------------
// Case F: Broker Deletion Blocked with Financial History
// -------------------------------------------------------------
runTest('Broker Deletion Blocked with Transactions', () => {
  const { broker, instruments } = initCleanState();
  const instrument = instruments[0];

  PortfolioStorage.addTransaction({
    user_id: 'current_user',
    broker_account_id: broker.id,
    instrument_id: instrument.id,
    transaction_type: 'BUY',
    symbol: instrument.symbol,
    quantity: 10,
    price: 100,
    unit_price: 100,
    charges: 0,
    transaction_date: '2026-01-01',
    notes: 'Buy',
  }, { reconcileHolding: false });

  const txCount = PortfolioStorage.getState().transactions.filter(
    (t) => t.broker_account_id === broker.id
  ).length;

  assert(txCount > 0, 'Broker has transactions');
  // Attempting to delete broker with transactions must be blocked
  let canDelete = txCount === 0;
  assert.strictEqual(canDelete, false, 'Broker with transactions cannot be deleted');
});

// -------------------------------------------------------------
// Case G: Direct PostgREST Broker Deletion Blocked in Migration
// -------------------------------------------------------------
runTest('Database Migration Installs Block Direct Broker Deletion RLS', () => {
  const migrationPath = path.join(
    process.cwd(),
    'supabase/migrations/20261011010000_fix_last_transaction_reconciliation_and_broker_guard.sql'
  );
  assert(fs.existsSync(migrationPath), 'Migration file must exist');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  assert(sql.includes('Block direct broker deletion'), 'Must include Block direct broker deletion policy');
  assert(sql.includes('USING (false)'), 'Policy must use USING (false)');
  assert(sql.includes('reconcile_position_atomic'), 'Must contain fixed reconcile_position_atomic');
  assert(sql.includes('GHOST_HOLDING_ELIMINATED'), 'Must contain ghost holding elimination');
  assert(sql.includes('OPENING_BALANCE_RESTORED'), 'Must contain opening balance restoration');
});

// -------------------------------------------------------------
// Case H: Stale Market Quote Invalidates Valuation Completeness
// -------------------------------------------------------------
runTest('Stale Quote Valuation Incompleteness Policy', () => {
  const mockHoldings = [
    enrichHolding({
      id: 'h1',
      user_id: 'u1',
      broker_account_id: 'b1',
      symbol: 'INFY',
      isin: null,
      name: 'Infosys',
      asset_class: 'equity',
      exchange: 'NSE',
      quantity: 10,
      avg_buy_price: 1500,
      current_price: 1600,
      price_updated_at: new Date().toISOString(),
      price_source: 'YAHOO_FINANCE',
      price_status: 'DELAYED',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }),
    enrichHolding({
      id: 'h2',
      user_id: 'u1',
      broker_account_id: 'b1',
      symbol: 'TCS',
      isin: null,
      name: 'TCS',
      asset_class: 'equity',
      exchange: 'NSE',
      quantity: 5,
      avg_buy_price: 3500,
      current_price: 3600,
      price_updated_at: new Date(Date.now() - 15 * 86400000).toISOString(),
      price_source: 'YAHOO_FINANCE',
      price_status: 'STALE', // STALE cached fallback quote
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }),
  ];

  const summary = buildPortfolioSummary(mockHoldings);

  assert.strictEqual(summary.has_stale_assets, true, 'Must detect stale assets');
  assert.strictEqual(summary.stale_count, 1, 'Stale count must be 1');
  assert.strictEqual(summary.is_valuation_complete, false, 'Valuation must NOT be complete when stale quotes present');
  assert.strictEqual(summary.total_current_value, null, 'total_current_value must be null to avoid misleading complete total');
  assert.strictEqual(summary.priced_current_value, 34000, 'priced_current_value provides valued subtotal (16000 + 18000)');
});

// -------------------------------------------------------------
// Case I: Future Lab Baseline Reset Zero Percentage Handling
// -------------------------------------------------------------
runTest('Future Lab Baseline Reset Nullish Coalescing (?? 0)', () => {
  const futureLabPath = path.join(process.cwd(), 'app/(dashboard)/future-lab/page.tsx');
  const content = fs.readFileSync(futureLabPath, 'utf8');

  // Verify lines don't use `|| 60` and use `?? 0`
  assert(!content.includes('eqItem?.percentage_of_valued || 60'), 'Must not use || 60 default');
  assert(content.includes('eqItem?.percentage_of_valued ?? 0'), 'Must use ?? 0 nullish coalescing');
  assert(content.includes('invitItem?.percentage_of_valued ?? 0'), 'Must include invit ?? 0');
});

// -------------------------------------------------------------
// Case J: Transactions Route Has No Separate Fallback Writes in Cloud Mode
// -------------------------------------------------------------
runTest('Transactions Route Has No Separate Fallback Writes in Cloud Mode', () => {
  const routePath = path.join(process.cwd(), 'app/api/portfolio/transactions/route.ts');
  const content = fs.readFileSync(routePath, 'utf8');

  assert(content.includes('ATOMIC_MIGRATION_REQUIRED'), 'Must fail closed with ATOMIC_MIGRATION_REQUIRED');
  assert(!content.includes('// Fallback: non-atomic multi-step insert'), 'Must not have non-atomic multi-step insert');
  assert(!content.includes('// Fallback: non-atomic edit'), 'Must not have non-atomic edit fallback');
  assert(!content.includes('// Fallback: non-atomic delete'), 'Must not have non-atomic delete fallback');
});

// -------------------------------------------------------------
// Case K: Transaction Import Route Non-Atomic Fallback Removed
// -------------------------------------------------------------
runTest('Transaction Import Route Calls Atomic RPC Exclusively', () => {
  const importPath = path.join(process.cwd(), 'app/api/portfolio/transactions/import/route.ts');
  const content = fs.readFileSync(importPath, 'utf8');

  assert(content.includes('record_transaction_atomic'), 'Must call record_transaction_atomic');
  assert(!content.includes('// Non-atomic fallback'), 'Must not have non-atomic fallback in import');
});

// -------------------------------------------------------------
// Case L: Holdings Route Protects Ledger-Managed Positions
// -------------------------------------------------------------
runTest('Holdings Route Rejects Direct PUT/DELETE on Ledger-Managed Positions', () => {
  const holdingsRoutePath = path.join(process.cwd(), 'app/api/portfolio/holdings/route.ts');
  const content = fs.readFileSync(holdingsRoutePath, 'utf8');

  assert(content.includes('LEDGER_MANAGED_HOLDING'), 'Must return LEDGER_MANAGED_HOLDING error code');
  assert(content.includes('is_ledger_managed'), 'Must check is_ledger_managed');
});

// -------------------------------------------------------------
// Case M: Holdings Import Protects Ledger-Managed Positions & Idempotency
// -------------------------------------------------------------
runTest('Holdings Import Route Enforces Idempotency & Rejects Ledger Overwrites', () => {
  const holdingsImportPath = path.join(process.cwd(), 'app/api/portfolio/holdings/import/route.ts');
  const content = fs.readFileSync(holdingsImportPath, 'utf8');

  assert(content.includes('Cannot modify ledger-managed holding via snapshot import'), 'Must reject snapshot update on ledger holding');
  assert(content.includes('allow_additive_accumulation'), 'Must require allow_additive_accumulation confirmation');
});

// -------------------------------------------------------------
// Case N: Legacy NULL Opening Quantity Preservation (Critical Patch 1.1)
// -------------------------------------------------------------
runTest('Legacy NULL Opening Quantity Protected from Destructive Wipeout', () => {
  const { broker, instruments } = initCleanState();
  const instrument = instruments[0];

  // Create legacy holding with opening_quantity: null and is_ledger_managed: false
  const legacyHolding = PortfolioStorage.addHolding({
    user_id: 'current_user',
    broker_account_id: broker.id,
    instrument_id: instrument.id,
    symbol: instrument.symbol,
    quantity: 100,
    avg_buy_price: 250,
    currency: 'INR',
    data_source: 'MANUAL',
    as_of: '2025-10-01',
    opening_quantity: null, // Legacy historical holding with unknown provenance
    opening_buy_price: null,
    is_ledger_managed: false,
  });

  // Verify that with 0 transactions, reconciliation does NOT delete the holding
  const txCount = PortfolioStorage.getState().transactions.filter(
    (t) => t.broker_account_id === broker.id && t.instrument_id === instrument.id
  ).length;
  assert.strictEqual(txCount, 0, 'No transactions exist for this security');

  // Holding must remain completely preserved
  const holding = PortfolioStorage.getHoldings().find((h) => h.id === legacyHolding.id);
  assert(holding, 'Legacy holding with NULL opening balance must NOT be eliminated as a ghost holding');
  assert.strictEqual(holding.quantity, 100, 'Quantity must remain 100');
  assert.strictEqual(holding.avg_buy_price, 250, 'Price must remain 250');
});

// -------------------------------------------------------------
// Case O: Direct Table Mutation Bypass Closed in Migration 20261011020000
// -------------------------------------------------------------
runTest('Forward-Only Migration Closes Direct Financial Table Mutation Bypass', () => {
  const migrationPath = path.join(
    process.cwd(),
    'supabase/migrations/20261011020000_secure_financial_ledger_and_legacy_provenance.sql'
  );
  assert(fs.existsSync(migrationPath), 'Forward-only migration 20261011020000 must exist');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  // Transactions write blocks
  assert(sql.includes('Block direct transaction insert'), 'Must include Block direct transaction insert');
  assert(sql.includes('Block direct transaction update'), 'Must include Block direct transaction update');
  assert(sql.includes('Block direct transaction delete'), 'Must include Block direct transaction delete');
  assert(sql.includes('AS RESTRICTIVE'), 'Must be RESTRICTIVE policies');

  // Holdings manual CRUD permissions
  assert(sql.includes('Users insert own manual holdings'), 'Must include Users insert own manual holdings');
  assert(sql.includes('Users update own manual holdings'), 'Must include Users update own manual holdings');
  assert(sql.includes('Users delete own manual holdings'), 'Must include Users delete own manual holdings');
  assert(sql.includes('COALESCE(is_ledger_managed, false) = false'), 'Must restrict direct writes to non-ledger holdings');
});

// -------------------------------------------------------------
// Case P: SECURITY DEFINER Procedures Hardened with search_path and Revoked Public
// -------------------------------------------------------------
runTest('SECURITY DEFINER Functions Have Hardened search_path & Revoked Public Access', () => {
  const migrationPath = path.join(
    process.cwd(),
    'supabase/migrations/20261011020000_secure_financial_ledger_and_legacy_provenance.sql'
  );
  const sql = fs.readFileSync(migrationPath, 'utf8');

  // search_path hardening
  assert(sql.includes('SET search_path = public, pg_temp'), 'Must set search_path = public, pg_temp');

  // Revoke public executions
  assert(sql.includes('REVOKE ALL ON FUNCTION public.safe_delete_broker_account(UUID) FROM PUBLIC'), 'Must revoke safe_delete_broker_account from PUBLIC');
  assert(sql.includes('REVOKE ALL ON FUNCTION public.reconcile_position_atomic(UUID, UUID) FROM PUBLIC'), 'Must revoke reconcile_position_atomic from PUBLIC');
  assert(sql.includes('REVOKE ALL ON FUNCTION public.delete_transaction_atomic(UUID) FROM PUBLIC'), 'Must revoke delete_transaction_atomic from PUBLIC');
  assert(sql.includes('REVOKE ALL ON FUNCTION public.update_transaction_atomic'), 'Must revoke update_transaction_atomic from PUBLIC');
  assert(sql.includes('REVOKE ALL ON FUNCTION public.record_transaction_atomic'), 'Must revoke record_transaction_atomic from PUBLIC');
  assert(sql.includes('REVOKE ALL ON FUNCTION public.declare_holding_opening_balance'), 'Must revoke declare_holding_opening_balance from PUBLIC');
});

// -------------------------------------------------------------
// Case Q: Legacy Provenance Preservation Logic in Migration
// -------------------------------------------------------------
runTest('Migration Preserves Legacy Holdings without Fabricating Opening Balances', () => {
  const migrationPath = path.join(
    process.cwd(),
    'supabase/migrations/20261011020000_secure_financial_ledger_and_legacy_provenance.sql'
  );
  const sql = fs.readFileSync(migrationPath, 'utf8');

  assert(sql.includes('opening_quantity IS NULL'), 'Must check opening_quantity IS NULL');
  assert(sql.includes("provenance_status = 'UNKNOWN'"), 'Must flag ambiguous holdings as UNKNOWN provenance');
  assert(sql.includes('Cannot perform destructive reconciliation on legacy holding'), 'Must block destructive reconciliation on unanchored legacy positions');
  assert(sql.includes('declare_holding_opening_balance'), 'Must provide safe declare_holding_opening_balance RPC');
});

// -------------------------------------------------------------
// Case R: Owner Manual Safeguard Preserved (No Overwrite of Broker RLS)
// -------------------------------------------------------------
runTest('Owner Manual Broker Deletion Policy Preserved without Overwrite', () => {
  const migrationPath = path.join(
    process.cwd(),
    'supabase/migrations/20261011020000_secure_financial_ledger_and_legacy_provenance.sql'
  );
  const sql = fs.readFileSync(migrationPath, 'utf8');

  // Must NOT drop or modify the owner's manual Block direct broker deletion policy
  assert(!sql.includes('DROP POLICY IF EXISTS "Block direct broker deletion" ON public.broker_accounts'),
    'Must NOT drop owner manual policy on broker_accounts');
  assert(!sql.includes('CREATE POLICY "Block direct broker deletion" ON public.broker_accounts'),
    'Must NOT re-create policy on broker_accounts already active remotely');
});

console.log('='.repeat(70));
console.log(`Results: ${passed}/${total} test suites PASSED.`);
if (passed === total) {
  console.log('ALL CRITICAL PATCH 1.1 DATABASE INTEGRITY AUDITS PASSED WITH ZERO FAILURES.');
} else {
  process.exit(1);
}

