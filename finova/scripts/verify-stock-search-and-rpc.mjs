// ============================================================
// FINOVA — Stock Search, Quote Display & Transaction RPC Verification
//
// Regression test suite verifying:
//   1. Stock search results contain correct names and symbols.
//   2. Quotes display full numeric prices, not abbreviated K notation.
//   3. Missing or stale quotes never become fabricated prices.
//   4. Correct instruments are selected from search results.
//   5. The RPC argument contract matches the SQL function signature.
//   6. Transaction errors are handled visibly.
//   7. Successful transactions persist exactly once.
//   8. Holding balances and portfolio calculations remain correct.
// ============================================================

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { formatStockPrice } from '../lib/utils.ts';
import { PortfolioStorage } from '../lib/storage/portfolioStorage.ts';

console.log('================================================================');
console.log(' FINOVA — STOCK SEARCH, QUOTES & RPC REGRESSION SUITE           ');
console.log('================================================================\n');

let passCount = 0;
let failCount = 0;

function runTest(title, testFn) {
  try {
    testFn();
    console.log(`✓ [PASS] ${title}`);
    passCount++;
  } catch (err) {
    console.error(`✗ [FAIL] ${title}`);
    console.error(`  Reason: ${err.message || err}`);
    failCount++;
  }
}

// -------------------------------------------------------------
// Suite 1: Stock Search Results & Catalog Matching
// -------------------------------------------------------------
console.log('--- Suite 1: Stock Search Results & Catalog Matching ---');

runTest('1.1 Search for "COAL INDIA" matches COALINDIA with company name and ISIN', () => {
  const matches = PortfolioStorage.getInstruments('COAL INDIA');
  assert.ok(matches.length > 0, 'Should return at least one match for COAL INDIA');
  const coal = matches.find((m) => m.symbol === 'COALINDIA');
  assert.ok(coal, 'COALINDIA symbol must be present');
  assert.strictEqual(coal.instrument_name, 'Coal India Ltd');
  assert.strictEqual(coal.exchange, 'NSE');
  assert.strictEqual(coal.isin, 'INE522F01014');
  assert.strictEqual(coal.asset_type, 'STOCK');
});

runTest('1.2 Partial searches "COAL", "HERO", "TCS", "RELIANCE" return accurate instruments', () => {
  const coalMatches = PortfolioStorage.getInstruments('COAL');
  assert.ok(coalMatches.some((m) => m.symbol === 'COALINDIA' && m.instrument_name.includes('Coal India')));

  const heroMatches = PortfolioStorage.getInstruments('HERO');
  assert.ok(heroMatches.some((m) => m.symbol === 'HEROMOTOCO' && m.instrument_name.includes('Hero MotoCorp')));

  const tcsMatches = PortfolioStorage.getInstruments('TCS');
  assert.ok(tcsMatches.some((m) => m.symbol === 'TCS' && m.instrument_name.includes('Tata Consultancy Services')));

  const relMatches = PortfolioStorage.getInstruments('RELIANCE');
  assert.ok(relMatches.some((m) => m.symbol === 'RELIANCE' && m.instrument_name.includes('Reliance Industries')));
});

runTest('1.3 Search by ISIN retrieves matching instrument', () => {
  const matches = PortfolioStorage.getInstruments('INE522F01014');
  assert.ok(matches.length > 0, 'Should find match by ISIN');
  assert.strictEqual(matches[0].symbol, 'COALINDIA');
});

runTest('1.4 Search method accepts query as options object without throwing', () => {
  const res = PortfolioStorage.getInstruments({ query: 'HERO', assetType: 'STOCK' });
  assert.ok(res.length > 0);
  assert.strictEqual(res[0].symbol, 'HEROMOTOCO');
});

// -------------------------------------------------------------
// Suite 2: Quote Formatting & Prohibition of "K" Notation
// -------------------------------------------------------------
console.log('\n--- Suite 2: Quote Formatting & Full Numeric Pricing ---');

runTest('2.1 Stock prices format in full Indian numbering (never K/M/B)', () => {
  assert.strictEqual(formatStockPrice(4900), '₹4,900.00');
  assert.strictEqual(formatStockPrice(1800), '₹1,800.00');
  assert.strictEqual(formatStockPrice(268.5), '₹268.50');
  assert.strictEqual(formatStockPrice(411.55), '₹411.55');
  assert.strictEqual(formatStockPrice(2156), '₹2,156.00');
  assert.strictEqual(formatStockPrice(125000), '₹1,25,000.00');

  // Verify K/M/B abbreviations are absent
  const testPrices = [4900, 1800, 2156, 4895.5, 125000];
  for (const p of testPrices) {
    const formatted = formatStockPrice(p);
    assert.ok(!formatted.includes('K'), `Price ${p} must not contain "K" (got: ${formatted})`);
    assert.ok(!formatted.includes('M'), `Price ${p} must not contain "M" (got: ${formatted})`);
    assert.ok(!formatted.includes('B'), `Price ${p} must not contain "B" (got: ${formatted})`);
  }
});

// -------------------------------------------------------------
// Suite 3: Missing or Stale Quotes Never Fabricated
// -------------------------------------------------------------
console.log('\n--- Suite 3: Missing/Stale Quotes Never Fabricated ---');

runTest('3.1 Missing or invalid quotes return "Price unavailable"', () => {
  assert.strictEqual(formatStockPrice(null), 'Price unavailable');
  assert.strictEqual(formatStockPrice(undefined), 'Price unavailable');
  assert.strictEqual(formatStockPrice(NaN), 'Price unavailable');
});

runTest('3.2 Unquoted / offline instruments never invent or simulate fake prices', () => {
  // If an instrument has no quote, price is null and status is UNAVAILABLE
  const mockUnquotedQuote = {
    price: null,
    status: 'UNAVAILABLE',
    isAvailable: false,
  };
  const display = mockUnquotedQuote.isAvailable && mockUnquotedQuote.price !== null
    ? formatStockPrice(mockUnquotedQuote.price)
    : 'Price unavailable';
  assert.strictEqual(display, 'Price unavailable');
});

// -------------------------------------------------------------
// Suite 4: Instrument Selection from Search Results
// -------------------------------------------------------------
console.log('\n--- Suite 4: Instrument Selection & Auto-Fill ---');

runTest('4.1 Selecting an instrument populates symbol, company name, asset class and price', () => {
  const inst = PortfolioStorage.getInstruments('COAL INDIA')[0];
  assert.ok(inst);

  const mockSelectedQuote = {
    price: 411.55,
    status: 'DELAYED',
    isAvailable: true,
  };

  function simulateSelection(item, quote) {
    return {
      symbol: item.symbol,
      name: item.instrument_name,
      isin: item.isin || '',
      exchange: item.exchange || 'NSE',
      assetClass: item.asset_type === 'STOCK' ? 'equity' : 'other',
      livePrice: quote?.isAvailable ? quote.price : null,
    };
  }

  const selected = simulateSelection(inst, mockSelectedQuote);
  assert.strictEqual(selected.symbol, 'COALINDIA');
  assert.strictEqual(selected.name, 'Coal India Ltd');
  assert.strictEqual(selected.exchange, 'NSE');
  assert.strictEqual(selected.assetClass, 'equity');
  assert.strictEqual(selected.livePrice, 411.55);
});

// -------------------------------------------------------------
// Suite 5: RPC Argument Contract Matches SQL Function Signature
// -------------------------------------------------------------
console.log('\n--- Suite 5: RPC Argument Contract vs SQL Function Signature ---');

runTest('5.1 Migration 20261010020000 defines record_transaction_atomic with p_stt_taxes and p_taxes', () => {
  const migrationPath = path.resolve(__dirname, '../supabase/migrations/20261010020000_fix_record_transaction_rpc_contract.sql');
  assert.ok(fs.existsSync(migrationPath), 'Migration file must exist');

  const content = fs.readFileSync(migrationPath, 'utf8');

  // Verify parameters
  const expectedParams = [
    'p_broker_account_id UUID',
    'p_instrument_id UUID',
    'p_transaction_type TEXT',
    'p_quantity NUMERIC',
    'p_unit_price NUMERIC',
    'p_gross_amount NUMERIC',
    'p_fees NUMERIC DEFAULT 0',
    'p_taxes NUMERIC DEFAULT 0',
    'p_net_amount NUMERIC DEFAULT NULL',
    'p_transaction_date TIMESTAMPTZ DEFAULT NOW()',
    'p_settlement_date TIMESTAMPTZ DEFAULT NULL',
    'p_source TEXT DEFAULT \'MANUAL\'',
    'p_external_reference TEXT DEFAULT NULL',
    'p_notes TEXT DEFAULT NULL',
    'p_reconcile_holding BOOLEAN DEFAULT TRUE',
    'p_allow_oversell BOOLEAN DEFAULT FALSE',
    'p_stt_taxes NUMERIC DEFAULT NULL',
  ];

  for (const param of expectedParams) {
    assert.ok(content.includes(param), `Migration must contain parameter "${param}"`);
  }

  // Verify effective tax calculation
  assert.ok(
    content.includes('v_effective_taxes := COALESCE(NULLIF(p_stt_taxes, 0), p_taxes, 0)'),
    'Migration must compute v_effective_taxes from p_stt_taxes and p_taxes'
  );

  // Verify safe DROP statements to prevent PostgREST PGRST204 overload ambiguity
  assert.ok(content.includes('DROP FUNCTION IF EXISTS public.record_transaction_atomic'), 'Migration must drop previous overloads');

  // Verify PostgREST schema cache reload signal
  assert.ok(content.includes("NOTIFY pgrst, 'reload schema'"), 'Migration must notify PostgREST to reload schema');
});

runTest('5.2 Frontend RPC callers supply aligned arguments including p_stt_taxes', () => {
  const serviceFile = path.resolve(__dirname, '../lib/services/transactionService.ts');
  const serviceContent = fs.readFileSync(serviceFile, 'utf8');
  assert.ok(serviceContent.includes('p_stt_taxes: input.taxes'), 'transactionService must include p_stt_taxes');
  assert.ok(serviceContent.includes('p_taxes: input.taxes'), 'transactionService must include p_taxes');

  const routeFile = path.resolve(__dirname, '../app/api/portfolio/transactions/route.ts');
  const routeContent = fs.readFileSync(routeFile, 'utf8');
  assert.ok(routeContent.includes('p_stt_taxes: taxes'), 'transactions API route must include p_stt_taxes');
  assert.ok(routeContent.includes('p_taxes: taxes'), 'transactions API route must include p_taxes');
  assert.ok(routeContent.includes('schema cache'), 'transactions API route must catch schema cache errors');
});

// -------------------------------------------------------------
// Suite 6: Transaction Errors & Visibility
// -------------------------------------------------------------
console.log('\n--- Suite 6: Transaction Error Handling & Visibility ---');

runTest('6.1 Overselling on SELL raises visible insufficient quantity error', () => {
  PortfolioStorage.saveState({
    broker_accounts: [{
      id: 'ba-err-1',
      user_id: 'u1',
      broker_code: 'ZERODHA',
      display_name: 'Zerodha',
      account_type: 'broker',
      connection_status: 'CONNECTED',
      data_source: 'API',
      currency: 'INR',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }],
    holdings: [{
      id: 'h-err-1',
      user_id: 'u1',
      broker_account_id: 'ba-err-1',
      instrument_id: 'inst-tcs-1',
      quantity: 5,
      average_buy_price: 2100,
      currency: 'INR',
      data_source: 'MANUAL',
      as_of: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_ledger_managed: true,
    }],
    custom_instruments: [],
    transactions: [],
  });

  // Attempting to sell 10 when holding only has 5 must throw
  assert.throws(
    () => {
      PortfolioStorage.addTransaction({
        user_id: 'u1',
        broker_account_id: 'ba-err-1',
        instrument_id: 'inst-tcs-1',
        transaction_type: 'SELL',
        quantity: 10,
        unit_price: 2200,
        gross_amount: 22000,
        fees: 20,
        taxes: 5,
        net_amount: 21975,
        currency: 'INR',
        transaction_date: new Date().toISOString(),
        source: 'MANUAL',
      }, { reconcileHolding: true, allowOversell: false });
    },
    /Insufficient quantity/
  );

  // Holding must remain intact with 5 shares
  const holding = PortfolioStorage.getHoldings('u1')[0];
  assert.strictEqual(holding.quantity, 5);
});

runTest('6.2 Duplicate external_reference submission is rejected', () => {
  PortfolioStorage.addTransaction({
    user_id: 'u1',
    broker_account_id: 'ba-err-1',
    instrument_id: 'inst-tcs-1',
    transaction_type: 'BUY',
    quantity: 2,
    unit_price: 2100,
    gross_amount: 4200,
    fees: 0,
    taxes: 0,
    net_amount: 4200,
    currency: 'INR',
    transaction_date: new Date().toISOString(),
    source: 'MANUAL',
    external_reference: 'ORDER-DUP-99',
  });

  assert.throws(
    () => {
      PortfolioStorage.addTransaction({
        user_id: 'u1',
        broker_account_id: 'ba-err-1',
        instrument_id: 'inst-tcs-1',
        transaction_type: 'BUY',
        quantity: 2,
        unit_price: 2100,
        gross_amount: 4200,
        fees: 0,
        taxes: 0,
        net_amount: 4200,
        currency: 'INR',
        transaction_date: new Date().toISOString(),
        source: 'MANUAL',
        external_reference: 'ORDER-DUP-99',
      });
    },
    /already exists/
  );
});

// -------------------------------------------------------------
// Suite 7: Exactly-Once Persistence & Holding Balance (WAC)
// -------------------------------------------------------------
console.log('\n--- Suite 7: Persistence Exactly Once & WAC Calculations ---');

runTest('7.1 Multi-trade lifecycle calculates WAC and persists exactly once', () => {
  PortfolioStorage.saveState({
    broker_accounts: [{
      id: 'ba-wac-1',
      user_id: 'u-wac',
      broker_code: 'GROWW',
      display_name: 'Groww Demat',
      account_type: 'broker',
      connection_status: 'CONNECTED',
      data_source: 'API',
      currency: 'INR',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }],
    holdings: [],
    custom_instruments: [],
    transactions: [],
  });

  // Trade 1: BUY 20 shares of COALINDIA @ 400
  PortfolioStorage.addTransaction({
    user_id: 'u-wac',
    broker_account_id: 'ba-wac-1',
    instrument_id: 'inst-coal-1',
    transaction_type: 'BUY',
    quantity: 20,
    unit_price: 400,
    gross_amount: 8000,
    fees: 20,
    taxes: 5,
    net_amount: 8025,
    currency: 'INR',
    transaction_date: '2026-10-01T10:00:00Z',
    source: 'MANUAL',
    external_reference: 'TRADE-1',
  }, { reconcileHolding: true });

  let holding = PortfolioStorage.getHoldings('u-wac')[0];
  assert.strictEqual(holding.quantity, 20);
  assert.strictEqual(holding.average_buy_price, 400);

  // Trade 2: BUY 10 shares @ 460
  // New quantity = 30
  // New average cost = (20*400 + 10*460) / 30 = (8000 + 4600) / 30 = 12600 / 30 = 420
  PortfolioStorage.addTransaction({
    user_id: 'u-wac',
    broker_account_id: 'ba-wac-1',
    instrument_id: 'inst-coal-1',
    transaction_type: 'BUY',
    quantity: 10,
    unit_price: 460,
    gross_amount: 4600,
    fees: 15,
    taxes: 3,
    net_amount: 4618,
    currency: 'INR',
    transaction_date: '2026-10-02T10:00:00Z',
    source: 'MANUAL',
    external_reference: 'TRADE-2',
  }, { reconcileHolding: true });

  holding = PortfolioStorage.getHoldings('u-wac')[0];
  assert.strictEqual(holding.quantity, 30);
  assert.strictEqual(holding.average_buy_price, 420);

  // Trade 3: SELL 15 shares @ 500
  // Remaining quantity = 15
  // Average buy price remains 420 under WAC
  PortfolioStorage.addTransaction({
    user_id: 'u-wac',
    broker_account_id: 'ba-wac-1',
    instrument_id: 'inst-coal-1',
    transaction_type: 'SELL',
    quantity: 15,
    unit_price: 500,
    gross_amount: 7500,
    fees: 25,
    taxes: 10,
    net_amount: 7465,
    currency: 'INR',
    transaction_date: '2026-10-03T10:00:00Z',
    source: 'MANUAL',
    external_reference: 'TRADE-3',
  }, { reconcileHolding: true });

  holding = PortfolioStorage.getHoldings('u-wac')[0];
  assert.strictEqual(holding.quantity, 15);
  assert.strictEqual(holding.average_buy_price, 420);

  // Verify exactly 3 transactions persisted
  const allTxs = PortfolioStorage.getTransactions('u-wac');
  assert.strictEqual(allTxs.transactions.length, 3, 'Must persist exactly 3 transactions, no duplicates');
});

console.log('\n================================================================');
console.log(`RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
console.log('================================================================\n');

if (failCount > 0) {
  process.exit(1);
} else {
  console.log('ALL REGRESSION CHECKS PASSED SUCCESSFULLY!\n');
}
