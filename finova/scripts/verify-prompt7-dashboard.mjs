// ============================================================
// FINOVA — Prompt 7 Dashboard & Portfolio Analytics Verification
// Tests summary metrics, unquoted asset honesty, edge cases,
// allocation mathematics, and empty state resilience.
// ============================================================

import assert from 'node:assert';
import {
  enrichHolding,
  buildPortfolioSummary,
  buildAssetAllocation,
  buildBrokerAllocation,
  roundCurrency,
  roundPercent,
} from '../lib/calculations/portfolio.ts';
import { formatCurrencySafe, formatPercentSafe } from '../lib/utils.ts';

console.log('====================================================');
console.log('   FINOVA PROMPT 7 — DASHBOARD & ANALYTICS TESTS    ');
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
// 1. Known Test Fixtures & Accurate Aggregation
// -------------------------------------------------------------
test('Test 1: Correct summary metrics for fully quoted portfolio', () => {
  const rawHoldings = [
    {
      id: 'h1',
      user_id: 'user_1',
      broker_account_id: 'b1',
      symbol: 'RELIANCE',
      isin: 'INE002A01018',
      name: 'Reliance Industries Ltd',
      asset_class: 'equity',
      exchange: 'NSE',
      quantity: 10,
      avg_buy_price: 2500,
      current_price: 2900,
      currency: 'INR',
      data_source: 'MANUAL',
      price_updated_at: '2026-10-09T10:00:00Z',
      created_at: '2026-10-01T00:00:00Z',
      updated_at: '2026-10-01T00:00:00Z',
    },
    {
      id: 'h2',
      user_id: 'user_1',
      broker_account_id: 'b2',
      symbol: 'TCS',
      isin: 'INE467B01029',
      name: 'Tata Consultancy Services',
      asset_class: 'equity',
      exchange: 'NSE',
      quantity: 20,
      avg_buy_price: 3500,
      current_price: 4000,
      currency: 'INR',
      data_source: 'MANUAL',
      price_updated_at: '2026-10-09T10:00:00Z',
      created_at: '2026-10-01T00:00:00Z',
      updated_at: '2026-10-01T00:00:00Z',
    },
  ];

  const enriched = rawHoldings.map(enrichHolding);
  const summary = buildPortfolioSummary(enriched);

  // Expected:
  // RELIANCE: invested = 25,000, current = 29,000, gain = +4,000 (+16.0%)
  // TCS: invested = 70,000, current = 80,000, gain = +10,000 (+14.29%)
  // Total Invested = 95,000
  // Total Current = 1,09,000
  // Total Gain = +14,000 (+14.74%)
  assert.strictEqual(summary.total_invested_value, 95000);
  assert.strictEqual(summary.total_current_value, 109000);
  assert.strictEqual(summary.total_absolute_return, 14000);
  assert.strictEqual(summary.total_absolute_return_pct, 14.74);
  assert.strictEqual(summary.holding_count, 2);
  assert.strictEqual(summary.broker_count, 2);
  assert.strictEqual(summary.has_unquoted_assets, false);
  assert.strictEqual(summary.is_valuation_complete, true);
});

// -------------------------------------------------------------
// 2. Missing Market Quotes and Partial Valuations
// -------------------------------------------------------------
test('Test 2: Partial valuation honestly flags unquoted assets and keeps returns on priced assets', () => {
  const mixedHoldings = [
    {
      id: 'h1',
      user_id: 'user_1',
      broker_account_id: 'b1',
      symbol: 'INFY',
      isin: 'INE009A01021',
      name: 'Infosys Ltd',
      asset_class: 'equity',
      exchange: 'NSE',
      quantity: 50,
      avg_buy_price: 1500,
      current_price: 1800, // Quoted (+15,000 gain)
      currency: 'INR',
      data_source: 'MANUAL',
      price_updated_at: '2026-10-09T10:00:00Z',
      created_at: '2026-10-01T00:00:00Z',
      updated_at: '2026-10-01T00:00:00Z',
    },
    {
      id: 'h2',
      user_id: 'user_1',
      broker_account_id: 'b1',
      symbol: 'UNLISTED_BOND',
      isin: null,
      name: 'ABC Corp 9.5% 2028 Unlisted Bond',
      asset_class: 'bond',
      exchange: 'OTHER',
      quantity: 10,
      avg_buy_price: 10000,
      current_price: null, // UNQUOTED! No fake 0 or fake price.
      currency: 'INR',
      data_source: 'MANUAL',
      price_updated_at: null,
      created_at: '2026-10-01T00:00:00Z',
      updated_at: '2026-10-01T00:00:00Z',
    },
  ];

  const enriched = mixedHoldings.map(enrichHolding);
  // Verify unquoted holding has null returns
  assert.strictEqual(enriched[1].current_price, null);
  assert.strictEqual(enriched[1].absolute_return, null);
  assert.strictEqual(enriched[1].absolute_return_pct, null);

  const summary = buildPortfolioSummary(enriched);
  assert.strictEqual(summary.has_unquoted_assets, true);
  assert.strictEqual(summary.unquoted_count, 1);
  assert.strictEqual(summary.priced_count, 1);
  assert.strictEqual(summary.is_valuation_complete, false);
  // Returns calculated strictly on priced capital (75,000 -> 90,000 = +15,000 = +20.0%)
  assert.strictEqual(summary.total_absolute_return, 15000);
  assert.strictEqual(summary.total_absolute_return_pct, 20);
});

test('Test 3: Entirely unquoted portfolio returns null valuation and null returns (never 0%)', () => {
  const unquotedOnly = [
    {
      id: 'h1',
      user_id: 'user_1',
      broker_account_id: 'b1',
      symbol: 'PRIVATE_EQUITY',
      isin: null,
      name: 'Private Venture Unit',
      asset_class: 'other',
      exchange: 'OTHER',
      quantity: 100,
      avg_buy_price: 500,
      current_price: null,
      currency: 'INR',
      data_source: 'MANUAL',
      price_updated_at: null,
      created_at: '2026-10-01T00:00:00Z',
      updated_at: '2026-10-01T00:00:00Z',
    },
  ];

  const enriched = unquotedOnly.map(enrichHolding);
  const summary = buildPortfolioSummary(enriched);

  assert.strictEqual(summary.total_invested_value, 50000);
  assert.strictEqual(summary.total_current_value, null);
  assert.strictEqual(summary.total_absolute_return, null);
  assert.strictEqual(summary.total_absolute_return_pct, null);
  assert.strictEqual(summary.has_unquoted_assets, true);

  // Safe formatting verification
  assert.strictEqual(formatCurrencySafe(summary.total_current_value, 'Valuation unavailable'), 'Valuation unavailable');
  assert.strictEqual(formatPercentSafe(summary.total_absolute_return_pct, 'P&L unavailable'), 'P&L unavailable');
});

// -------------------------------------------------------------
// 3. Zero Holdings and Math Safety
// -------------------------------------------------------------
test('Test 4: Empty portfolio handles 0 holdings without NaN, division-by-zero, or exceptions', () => {
  const summary = buildPortfolioSummary([]);
  assert.strictEqual(summary.total_current_value, 0);
  assert.strictEqual(summary.total_invested_value, 0);
  assert.strictEqual(summary.total_absolute_return, 0);
  assert.strictEqual(summary.total_absolute_return_pct, 0);
  assert.strictEqual(summary.holding_count, 0);
  assert.strictEqual(summary.broker_count, 0);

  const allocations = buildAssetAllocation([]);
  assert.deepStrictEqual(allocations, []);

  const brokerAlloc = buildBrokerAllocation([]);
  assert.deepStrictEqual(brokerAlloc, []);
});

// -------------------------------------------------------------
// 4. Asset Allocation Integrity
// -------------------------------------------------------------
test('Test 5: Asset allocation correctly groups multi-asset categories and percentages sum to 100%', () => {
  const multiAsset = [
    {
      id: 'h1',
      user_id: 'u1',
      broker_account_id: 'b1',
      symbol: 'RELIANCE',
      isin: 'INE002A01018',
      name: 'Reliance',
      asset_class: 'equity',
      exchange: 'NSE',
      quantity: 10,
      avg_buy_price: 1000,
      current_price: 2000, // Value: 20,000 (50%)
      currency: 'INR',
      data_source: 'MANUAL',
      price_updated_at: null,
      created_at: '',
      updated_at: '',
    },
    {
      id: 'h2',
      user_id: 'u1',
      broker_account_id: 'b1',
      symbol: 'PARAG_PARIKH',
      isin: 'INF879O01019',
      name: 'PPFAS Flexi Cap',
      asset_class: 'mf',
      exchange: 'MUTUAL_FUND_INDIA',
      quantity: 100,
      avg_buy_price: 100,
      current_price: 100, // Value: 10,000 (25%)
      currency: 'INR',
      data_source: 'MANUAL',
      price_updated_at: null,
      created_at: '',
      updated_at: '',
    },
    {
      id: 'h3',
      user_id: 'u1',
      broker_account_id: 'b2',
      symbol: 'EMBASSY_REIT',
      isin: 'INE041025011',
      name: 'Embassy Office Parks REIT',
      asset_class: 'reit',
      exchange: 'NSE',
      quantity: 25,
      avg_buy_price: 400,
      current_price: 400, // Value: 10,000 (25%)
      currency: 'INR',
      data_source: 'MANUAL',
      price_updated_at: null,
      created_at: '',
      updated_at: '',
    },
  ];

  const enriched = multiAsset.map(enrichHolding);
  const allocations = buildAssetAllocation(enriched);

  assert.strictEqual(allocations.length, 3);
  assert.strictEqual(allocations[0].asset_class, 'equity');
  assert.strictEqual(allocations[0].percentage, 50);
  assert.strictEqual(allocations[1].percentage, 25);
  assert.strictEqual(allocations[2].percentage, 25);

  const totalPct = allocations.reduce((s, a) => s + a.percentage, 0);
  assert.strictEqual(totalPct, 100);
});

// -------------------------------------------------------------
// 5. Broker Disclosures & Ledger Integrity
// -------------------------------------------------------------
test('Test 6: Broker allocation correctly groups accounts by id and name', () => {
  const multiBroker = [
    {
      id: 'h1',
      user_id: 'u1',
      broker_account_id: 'groww_1',
      broker_account: {
        id: 'groww_1',
        user_id: 'u1',
        broker_name: 'Groww',
        display_name: 'Groww Primary',
        account_label: 'Groww Primary',
        account_type: 'broker',
        color_hex: '#00D09C',
        created_at: '',
      },
      symbol: 'HDFCBANK',
      isin: 'INE040A01034',
      name: 'HDFC Bank Ltd',
      asset_class: 'equity',
      exchange: 'NSE',
      quantity: 10,
      avg_buy_price: 1500,
      current_price: 1700, // 17,000
      currency: 'INR',
      data_source: 'MANUAL',
      price_updated_at: null,
      created_at: '',
      updated_at: '',
    },
    {
      id: 'h2',
      user_id: 'u1',
      broker_account_id: 'zerodha_1',
      broker_account: {
        id: 'zerodha_1',
        user_id: 'u1',
        broker_name: 'Zerodha',
        display_name: 'Zerodha Demat',
        account_label: 'Zerodha Demat',
        account_type: 'broker',
        color_hex: '#387ED1',
        created_at: '',
      },
      symbol: 'ICICIBANK',
      isin: 'INE090A01021',
      name: 'ICICI Bank Ltd',
      asset_class: 'equity',
      exchange: 'NSE',
      quantity: 20,
      avg_buy_price: 1000,
      current_price: 1200, // 24,000
      currency: 'INR',
      data_source: 'MANUAL',
      price_updated_at: null,
      created_at: '',
      updated_at: '',
    },
  ];

  const enriched = multiBroker.map(enrichHolding);
  const brokerAllocs = buildBrokerAllocation(enriched);

  assert.strictEqual(brokerAllocs.length, 2);
  // Total = 41,000
  // Zerodha = 24,000 (58.54%)
  // Groww = 17,000 (41.46%)
  assert.strictEqual(brokerAllocs[0].broker_name, 'Zerodha Demat');
  assert.strictEqual(brokerAllocs[0].percentage, 58.54);
  assert.strictEqual(brokerAllocs[1].broker_name, 'Groww Primary');
  assert.strictEqual(brokerAllocs[1].percentage, 41.46);
});

console.log('\n====================================================');
console.log(`   ALL ${passCount} PROMPT 7 TESTS PASSED CLEANLY! `);
console.log('====================================================\n');
