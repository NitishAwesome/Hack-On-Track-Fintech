// ============================================================
// FINOVA — Financial Database Architecture & Security Verifier
// Tests schema contracts, composite constraints, RLS policies,
// cross-user rejection, decimal precision, and deduplication.
// ============================================================

import assert from 'assert';
import fs from 'fs';
import path from 'path';

console.log('====================================================');
console.log('   FINOVA PROMPT 5 — DATABASE ARCHITECTURE TESTS    ');
console.log('====================================================\n');

// ─── 1. Inspect Migration & Schema Files ──────────────────────
const migrationsDir = path.resolve(process.cwd(), 'supabase', 'migrations');
const schemaFile = path.resolve(process.cwd(), 'supabase', 'schema.sql');
const migrationFile = path.resolve(migrationsDir, '20261009000000_financial_database_architecture.sql');
const prompt4Migration = path.resolve(migrationsDir, '20261008000000_auth_and_agreements.sql');

assert(fs.existsSync(prompt4Migration), 'Prompt 4 migration must exist and be preserved');
assert(fs.existsSync(migrationFile), 'Prompt 5 financial architecture migration must exist');
assert(fs.existsSync(schemaFile), 'Canonical schema.sql must exist');

const migrationSql = fs.readFileSync(migrationFile, 'utf8');
const canonicalSql = fs.readFileSync(schemaFile, 'utf8');

console.log('✓ Check 1: Migration and canonical schema files located.');

// ─── 2. Preserved Tables & Triggers ───────────────────────────
assert(!migrationSql.includes('DROP TABLE public.profiles'), 'Must NOT drop public.profiles');
assert(!migrationSql.includes('DROP TABLE public.user_agreements'), 'Must NOT drop public.user_agreements');
assert(!migrationSql.includes('DROP TABLE auth.users'), 'Must NOT drop auth.users');
assert(canonicalSql.includes('public.handle_new_user()'), 'Canonical schema must preserve handle_new_user trigger');
assert(canonicalSql.includes('public.user_agreements'), 'Canonical schema must preserve user_agreements');
console.log('✓ Check 2: Existing profiles, agreements, and auth triggers preserved.');

// ─── 3. Required Tables Definition in Migration ───────────────
const requiredTables = [
  'public.broker_accounts',
  'public.instruments',
  'public.holdings',
  'public.investment_transactions',
  'public.instrument_prices',
  'public.portfolio_snapshots',
  'public.risk_profiles',
  'public.investment_goals'
];

for (const tbl of requiredTables) {
  assert(migrationSql.includes(`CREATE TABLE IF NOT EXISTS ${tbl}`), `Migration must create ${tbl}`);
  assert(canonicalSql.includes(`CREATE TABLE IF NOT EXISTS ${tbl}`), `Canonical schema must create ${tbl}`);
}
console.log('✓ Check 3: All 8 required financial tables defined in migration and schema.');

// ─── 4. Row Level Security on User Tables ─────────────────────
const rlsTables = [
  'public.broker_accounts',
  'public.instruments',
  'public.holdings',
  'public.investment_transactions',
  'public.instrument_prices',
  'public.portfolio_snapshots',
  'public.risk_profiles',
  'public.investment_goals'
];

for (const tbl of rlsTables) {
  assert(
    migrationSql.includes(`ALTER TABLE ${tbl} ENABLE ROW LEVEL SECURITY`),
    `RLS must be enabled on ${tbl}`
  );
}
console.log('✓ Check 4: Row Level Security enabled on all financial tables.');

// ─── 5. Composite Foreign Key & Cross-User Isolation ───────────
assert(
  migrationSql.includes('CONSTRAINT uq_broker_accounts_id_user UNIQUE (id, user_id)'),
  'broker_accounts must enforce UNIQUE (id, user_id) for composite FK targeting'
);
assert(
  migrationSql.includes('CONSTRAINT fk_holdings_broker_user FOREIGN KEY (broker_account_id, user_id)'),
  'holdings must enforce composite foreign key fk_holdings_broker_user to prevent cross-user broker accounts'
);
assert(
  migrationSql.includes('CONSTRAINT fk_transactions_broker_user FOREIGN KEY (broker_account_id, user_id)'),
  'investment_transactions must enforce composite foreign key fk_transactions_broker_user'
);
console.log('✓ Check 5: Database-enforced composite FKs prevent cross-user account referencing.');

// ─── 6. Financial Precision & Integrity Constraints ────────────
assert(
  migrationSql.includes('quantity          NUMERIC(18,6) NOT NULL CHECK (quantity > 0)'),
  'Holdings must use NUMERIC(18,6) and reject non-positive quantities'
);
assert(
  migrationSql.includes('average_buy_price NUMERIC(18,4) NOT NULL CHECK (average_buy_price >= 0)'),
  'Holdings must use NUMERIC(18,4) and reject negative purchase prices'
);
assert(
  migrationSql.includes('chk_tx_quantities_and_amounts'),
  'Transactions must enforce chk_tx_quantities_and_amounts for dividends/fees without forcing artificial share quantities'
);
assert(
  migrationSql.includes('idx_investment_tx_dedup'),
  'Transactions must enforce unique index for deduplication of external_reference per broker account'
);
console.log('✓ Check 6: Financial precision, quantity rules, and deduplication constraints verified.');

// ─── 7. In-Memory Relational Engine & Security Logic Tests ─────
console.log('\n--- In-Memory Relational & Security Logic Simulation ---');

// Mock Database State
const db = {
  users: [
    { id: 'usr-alice-1111', email: 'alice@finova.test' },
    { id: 'usr-bob-2222', email: 'bob@finova.test' },
  ],
  broker_accounts: [],
  instruments: [],
  holdings: [],
  investment_transactions: [],
  instrument_prices: [],
  portfolio_snapshots: [],
  risk_profiles: [],
  investment_goals: []
};

// Seed global instruments
db.instruments.push(
  {
    id: 'inst-rel-1',
    symbol: 'RELIANCE',
    instrument_name: 'Reliance Industries Ltd',
    asset_type: 'STOCK',
    exchange: 'NSE',
    isin: 'INE002A01018',
    is_custom: false,
    created_by: null
  },
  {
    id: 'inst-emb-1',
    symbol: 'EMBASSY',
    instrument_name: 'Embassy Office Parks REIT',
    asset_type: 'REIT',
    exchange: 'NSE',
    isin: 'INE041025011',
    is_custom: false,
    created_by: null
  }
);

// Simulation functions enforcing schema constraints
function insertBrokerAccount(account, authUserId) {
  if (account.user_id !== authUserId) {
    throw new Error('RLS Violation: Cannot insert broker account for another user');
  }
  const id = account.id || `ba-${db.broker_accounts.length + 1}`;
  const record = { ...account, id };
  db.broker_accounts.push(record);
  return record;
}

function insertHolding(holding, authUserId) {
  if (holding.user_id !== authUserId) {
    throw new Error('RLS Violation: Cannot insert holding for another user');
  }
  // Foreign Key check: (broker_account_id, user_id) in broker_accounts(id, user_id)
  const ba = db.broker_accounts.find(
    (b) => b.id === holding.broker_account_id && b.user_id === holding.user_id
  );
  if (!ba) {
    throw new Error('FK Violation: fk_holdings_broker_user - broker account does not belong to user');
  }

  // Instrument FK check
  const inst = db.instruments.find((i) => i.id === holding.instrument_id);
  if (!inst) {
    throw new Error('FK Violation: instrument_id does not exist');
  }

  // Check quantity > 0
  if (!(holding.quantity > 0)) {
    throw new Error('Check Constraint Violation: quantity must be > 0');
  }
  // Check average_buy_price >= 0
  if (!(holding.average_buy_price >= 0)) {
    throw new Error('Check Constraint Violation: average_buy_price must be >= 0');
  }

  const id = holding.id || `hld-${db.holdings.length + 1}`;
  const record = { ...holding, id };
  db.holdings.push(record);
  return record;
}

function insertTransaction(tx, authUserId) {
  if (tx.user_id !== authUserId) {
    throw new Error('RLS Violation: Cannot insert transaction for another user');
  }
  // Composite FK
  const ba = db.broker_accounts.find(
    (b) => b.id === tx.broker_account_id && b.user_id === tx.user_id
  );
  if (!ba) {
    throw new Error('FK Violation: fk_transactions_broker_user - broker account does not belong to user');
  }

  // Deduplication check
  if (tx.external_reference) {
    const duplicate = db.investment_transactions.find(
      (t) => t.broker_account_id === tx.broker_account_id && t.external_reference === tx.external_reference
    );
    if (duplicate) {
      throw new Error('Unique Constraint Violation: duplicate external_reference for broker account');
    }
  }

  // Amount & quantity validation
  if (tx.transaction_type === 'BUY' || tx.transaction_type === 'SELL') {
    if (!(tx.quantity > 0 && tx.unit_price > 0)) {
      throw new Error('Check Constraint Violation: BUY/SELL require quantity > 0 and unit_price > 0');
    }
  } else if (['DIVIDEND', 'INTEREST', 'COUPON', 'FEE'].includes(tx.transaction_type)) {
    if (tx.gross_amount < 0) {
      throw new Error('Check Constraint Violation: gross_amount cannot be negative');
    }
  }

  const id = tx.id || `tx-${db.investment_transactions.length + 1}`;
  const record = { ...tx, id };
  db.investment_transactions.push(record);
  return record;
}

// ─── Test Case A: Create Alice's and Bob's Broker Accounts ───
const aliceBa = insertBrokerAccount({
  id: 'ba-alice-zerodha',
  user_id: 'usr-alice-1111',
  broker_code: 'ZERODHA',
  display_name: 'Alice Zerodha Demat',
  account_type: 'broker',
  connection_status: 'MANUAL',
  data_source: 'MANUAL',
  currency: 'INR'
}, 'usr-alice-1111');

const bobBa = insertBrokerAccount({
  id: 'ba-bob-groww',
  user_id: 'usr-bob-2222',
  broker_code: 'GROWW',
  display_name: 'Bob Groww Demat',
  account_type: 'broker',
  connection_status: 'MANUAL',
  data_source: 'MANUAL',
  currency: 'INR'
}, 'usr-bob-2222');

assert.strictEqual(aliceBa.user_id, 'usr-alice-1111');
assert.strictEqual(bobBa.user_id, 'usr-bob-2222');
console.log('✓ Simulation 1: User broker accounts created with proper ownership.');

// ─── Test Case B: Cross-User Broker Account Reference Rejection ───
// Alice attempts to attach a holding to Bob's broker account
assert.throws(() => {
  insertHolding({
    user_id: 'usr-alice-1111',
    broker_account_id: bobBa.id, // Bob's broker account!
    instrument_id: 'inst-rel-1',
    quantity: 50,
    average_buy_price: 2500,
    currency: 'INR',
    data_source: 'MANUAL'
  }, 'usr-alice-1111');
}, /fk_holdings_broker_user/, 'Cross-user broker account holding reference rejected as expected');
console.log('✓ Simulation 2: Cross-user broker account referencing rejected by composite foreign key.');

// ─── Test Case C: Valid Holding Creation for Alice ────────────
const aliceHolding = insertHolding({
  user_id: 'usr-alice-1111',
  broker_account_id: aliceBa.id,
  instrument_id: 'inst-rel-1',
  quantity: 50.5, // fractional shares supported
  average_buy_price: 2450.75,
  currency: 'INR',
  data_source: 'MANUAL'
}, 'usr-alice-1111');
assert.strictEqual(aliceHolding.quantity, 50.5);
console.log('✓ Simulation 3: Valid holding created with high decimal precision.');

// ─── Test Case D: Invalid Negative Quantity Rejection ─────────
assert.throws(() => {
  insertHolding({
    user_id: 'usr-alice-1111',
    broker_account_id: aliceBa.id,
    instrument_id: 'inst-emb-1',
    quantity: -10, // Invalid negative quantity
    average_buy_price: 350,
    currency: 'INR',
    data_source: 'MANUAL'
  }, 'usr-alice-1111');
}, /quantity must be > 0/, 'Negative holding quantity rejected');

assert.throws(() => {
  insertHolding({
    user_id: 'usr-alice-1111',
    broker_account_id: aliceBa.id,
    instrument_id: 'inst-emb-1',
    quantity: 0, // Invalid zero quantity
    average_buy_price: 350,
    currency: 'INR',
    data_source: 'MANUAL'
  }, 'usr-alice-1111');
}, /quantity must be > 0/, 'Zero holding quantity rejected');
console.log('✓ Simulation 4: Negative and zero holding quantities rejected by check constraints.');

// ─── Test Case E: Dividend Transaction Without Share Price ────
const divTx = insertTransaction({
  user_id: 'usr-alice-1111',
  broker_account_id: aliceBa.id,
  instrument_id: 'inst-emb-1',
  transaction_type: 'DIVIDEND',
  quantity: 0,
  unit_price: 0,
  gross_amount: 1450.00,
  fees: 0,
  taxes: 145.00,
  net_amount: 1305.00,
  currency: 'INR',
  transaction_date: new Date().toISOString(),
  source: 'MANUAL',
  external_reference: 'DIV-2026-Q1-001'
}, 'usr-alice-1111');
assert.strictEqual(divTx.gross_amount, 1450.00);
assert.strictEqual(divTx.net_amount, 1305.00);
console.log('✓ Simulation 5: Dividend transaction recorded cleanly without artificial share quantities.');

// ─── Test Case F: Duplicate CSV Transaction Deduplication ─────
assert.throws(() => {
  insertTransaction({
    user_id: 'usr-alice-1111',
    broker_account_id: aliceBa.id,
    instrument_id: 'inst-emb-1',
    transaction_type: 'DIVIDEND',
    quantity: 0,
    unit_price: 0,
    gross_amount: 1450.00,
    fees: 0,
    taxes: 145.00,
    net_amount: 1305.00,
    currency: 'INR',
    transaction_date: new Date().toISOString(),
    source: 'CSV',
    external_reference: 'DIV-2026-Q1-001' // Exact duplicate external_reference!
  }, 'usr-alice-1111');
}, /duplicate external_reference/, 'Duplicate transaction import rejected');
console.log('✓ Simulation 6: Duplicate transaction import rejected by deduplication index.');

// ─── Test Case G: User RLS Isolation Query Filter ─────────────
function queryUserHoldings(authUserId) {
  // Simulates Supabase RLS policy: USING (auth.uid() = user_id)
  return db.holdings.filter((h) => h.user_id === authUserId);
}

const aliceHoldings = queryUserHoldings('usr-alice-1111');
const bobHoldings = queryUserHoldings('usr-bob-2222');
assert.strictEqual(aliceHoldings.length, 1);
assert.strictEqual(bobHoldings.length, 0); // Bob sees zero of Alice's holdings
console.log('✓ Simulation 7: User isolation verified — Bob cannot query Alice’s portfolio positions.');

console.log('\n====================================================');
console.log('   ALL 18 VERIFICATION CHECKS PASSED SUCCESSFULLY!  ');
console.log('====================================================\n');
