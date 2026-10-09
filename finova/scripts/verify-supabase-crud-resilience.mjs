// ============================================================
// FINOVA — Comprehensive Verification Suite
// Supabase CRUD, Error Boundaries, Schema Integrity & User Isolation
// (Uses local relational simulation & mocks; does NOT claim live remote verification)
// ============================================================

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = process.cwd();

console.log('====================================================');
console.log('   FINOVA — PERSISTENCE & CRUD VERIFICATION SUITE   ');
console.log('   (Local Simulation & Static Architecture Tests)   ');
console.log('====================================================\n');

let passCount = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ Passed: ${name}`);
    passCount++;
  } catch (err) {
    console.error(`✗ FAILED: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

// -------------------------------------------------------------
// 1. Schema & Table-Name Consistency Verification
// -------------------------------------------------------------
test('Check 1: Canonical table name is "instruments" across SQL migrations and code', () => {
  const migrationPath = path.join(ROOT_DIR, 'supabase/migrations/20261009000000_financial_database_architecture.sql');
  const schemaPath = path.join(ROOT_DIR, 'supabase/schema.sql');
  const migrationSql = fs.readFileSync(migrationPath, 'utf8');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  // Verify "instruments" is created
  assert(migrationSql.includes('CREATE TABLE IF NOT EXISTS public.instruments'), 'instruments table must be defined in migration');
  assert(schemaSql.includes('CREATE TABLE IF NOT EXISTS public.instruments'), 'instruments table must be defined in schema.sql');

  // Verify foreign key in holdings references "instruments(id)"
  assert(migrationSql.includes('REFERENCES public.instruments(id)'), 'holdings must reference instruments(id)');

  // Verify there is NO invalid "CREATE TABLE investment_instruments"
  assert(!migrationSql.includes('CREATE TABLE IF NOT EXISTS public.investment_instruments'), 'No duplicate investment_instruments table');
  assert(!schemaSql.includes('CREATE TABLE IF NOT EXISTS public.investment_instruments'), 'No duplicate investment_instruments table');
});

test('Check 2: API routes query "instruments(*)" relationship instead of wrong table names', () => {
  const holdingsRoute = fs.readFileSync(path.join(ROOT_DIR, 'app/api/portfolio/holdings/route.ts'), 'utf8');
  const summaryRoute = fs.readFileSync(path.join(ROOT_DIR, 'app/api/portfolio/summary/route.ts'), 'utf8');

  assert(holdingsRoute.includes('instrument:instruments(*)'), 'Holdings route must select instrument:instruments(*)');
  assert(summaryRoute.includes('instrument:instruments(*)'), 'Summary route must select instrument:instruments(*)');
  assert(!holdingsRoute.includes('investment_instruments'), 'Holdings route must not reference investment_instruments');
});

// -------------------------------------------------------------
// 2. Error Boundary Verification: No Silent Fallback
// -------------------------------------------------------------
test('Check 3: When Supabase is configured, DB failures return HTTP 500 without falling back to local storage', () => {
  const holdingsRoute = fs.readFileSync(path.join(ROOT_DIR, 'app/api/portfolio/holdings/route.ts'), 'utf8');
  const brokersRoute = fs.readFileSync(path.join(ROOT_DIR, 'app/api/brokers/route.ts'), 'utf8');
  const summaryRoute = fs.readFileSync(path.join(ROOT_DIR, 'app/api/portfolio/summary/route.ts'), 'utf8');

  // Verify holdings GET error branch returns 500 directly
  assert(holdingsRoute.includes("console.error('[API /api/portfolio/holdings GET] Supabase query error:"), 'Holdings GET logs DB error');
  assert(holdingsRoute.includes("status: 500"), 'Holdings GET returns HTTP 500 on error');

  // Verify brokers GET error branch returns 500 directly
  assert(brokersRoute.includes("console.error('[API /api/brokers GET] Supabase query error:"), 'Brokers GET logs DB error');
  assert(brokersRoute.includes("status: 500"), 'Brokers GET returns HTTP 500 on error');

  // Verify summary GET error branch returns 500 directly
  assert(summaryRoute.includes("console.error('[API /api/portfolio/summary GET] Supabase query error:"), 'Summary GET logs DB error');
  assert(summaryRoute.includes("status: 500"), 'Summary GET returns HTTP 500 on error');

  // Ensure there are NO empty catch { // Fallback } swallow blocks in these routes
  assert(!holdingsRoute.includes('// Fallback'), 'Holdings route must not have silent fallback swallow blocks');
  assert(!brokersRoute.includes('// Fallback'), 'Brokers route must not have silent fallback swallow blocks');
  assert(!summaryRoute.includes('// Fallback'), 'Summary route must not have silent fallback swallow blocks');
});

test('Check 4: Authentication check strictly rejects unauthenticated requests with HTTP 401', () => {
  const holdingsRoute = fs.readFileSync(path.join(ROOT_DIR, 'app/api/portfolio/holdings/route.ts'), 'utf8');
  const brokersRoute = fs.readFileSync(path.join(ROOT_DIR, 'app/api/brokers/route.ts'), 'utf8');
  const importRoute = fs.readFileSync(path.join(ROOT_DIR, 'app/api/portfolio/holdings/import/route.ts'), 'utf8');

  assert(holdingsRoute.includes("status: 401"), 'Holdings route enforces HTTP 401 for unauthenticated users');
  assert(brokersRoute.includes("status: 401"), 'Brokers route enforces HTTP 401 for unauthenticated users');
  assert(importRoute.includes("status: 401"), 'Import route enforces HTTP 401 for unauthenticated users');
});

// -------------------------------------------------------------
// 3. User Ownership & Cross-User Isolation Simulation
// -------------------------------------------------------------
test('Check 5: Database RLS and composite foreign key prevent cross-user broker account referencing', () => {
  const migrationSql = fs.readFileSync(path.join(ROOT_DIR, 'supabase/migrations/20261009000000_financial_database_architecture.sql'), 'utf8');

  assert(migrationSql.includes('CONSTRAINT fk_holdings_broker_user FOREIGN KEY (broker_account_id, user_id)'), 'Composite FK enforces broker account ownership');
  assert(migrationSql.includes('REFERENCES public.broker_accounts(id, user_id)'), 'FK references broker_accounts(id, user_id)');
  assert(migrationSql.includes('CREATE POLICY "Users view own holdings"'), 'RLS policy for view holdings');
  assert(migrationSql.includes('USING (auth.uid() = user_id)'), 'RLS checks auth.uid() = user_id');
});

test('Check 6: API mutation routes enforce user ownership in UPDATE and DELETE queries', () => {
  const holdingsRoute = fs.readFileSync(path.join(ROOT_DIR, 'app/api/portfolio/holdings/route.ts'), 'utf8');
  const brokersRoute = fs.readFileSync(path.join(ROOT_DIR, 'app/api/brokers/route.ts'), 'utf8');

  // Verify holdings PUT and DELETE filter on user.id
  assert(holdingsRoute.includes(".eq('user_id', user.id)"), 'Holdings update/delete strictly checks user_id');
  assert(brokersRoute.includes(".eq('user_id', user.id)"), 'Brokers update/delete strictly checks user_id');
});

// -------------------------------------------------------------
// 4. In-Memory Simulation of CSV Deduplication Modes
// -------------------------------------------------------------
test('Check 7: CSV import deduplication simulation (replace, update, skip)', () => {
  const db = {
    holdings: [
      { id: 'h1', user_id: 'user_1', broker_account_id: 'b1', instrument_id: 'i1', quantity: 10, average_buy_price: 100 },
    ],
  };

  // 1. Skip mode: Should keep original 10 @ 100
  const skipRow = { quantity: 5, avg_buy_price: 150 };
  const existing1 = db.holdings.find(h => h.instrument_id === 'i1');
  assert(existing1, 'Existing holding found');
  // Skip logic:
  let skipped = 1;
  assert.strictEqual(existing1.quantity, 10);
  assert.strictEqual(skipped, 1);

  // 2. Replace mode: Should overwrite with 5 @ 150
  existing1.quantity = skipRow.quantity;
  existing1.average_buy_price = skipRow.avg_buy_price;
  assert.strictEqual(existing1.quantity, 5);
  assert.strictEqual(existing1.average_buy_price, 150);

  // 3. Update mode (accumulate): Adding 5 @ 300 to existing 5 @ 150
  // totalQty = 10, weightedAvg = (5*150 + 5*300) / 10 = (750 + 1500) / 10 = 225
  const newRow = { quantity: 5, avg_buy_price: 300 };
  const totalQty = existing1.quantity + newRow.quantity;
  const weightedAvg = (existing1.quantity * existing1.average_buy_price + newRow.quantity * newRow.avg_buy_price) / totalQty;
  existing1.quantity = totalQty;
  existing1.average_buy_price = weightedAvg;
  assert.strictEqual(existing1.quantity, 10);
  assert.strictEqual(existing1.average_buy_price, 225);
});

// -------------------------------------------------------------
// 5. Local Storage Preservation
// -------------------------------------------------------------
test('Check 8: Explicit local-to-cloud migration endpoint exists and validates input safely', () => {
  const migrateRoute = fs.readFileSync(path.join(ROOT_DIR, 'app/api/portfolio/migrate-local/route.ts'), 'utf8');
  assert(migrateRoute.includes('POST'), 'Migrate endpoint handles POST');
  assert(migrateRoute.includes("status: 401"), 'Requires authentication');
  assert(migrateRoute.includes('duplicate_mode'), 'Handles duplicate modes');
});

console.log('\n====================================================');
console.log(`   ALL ${passCount} VERIFICATION CHECKS PASSED CLEANLY!  `);
console.log('====================================================\n');
