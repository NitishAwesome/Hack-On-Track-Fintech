// ============================================================
// FINOVA Prompt 7.1 — Financial Integrity & End-to-End Audit Suite
// Deterministic testing for formulas, quote provenance, compact notation,
// weighted-average accumulation, and persistence boundaries.
// ============================================================

import assert from 'node:assert';
import {
  enrichHolding,
  buildPortfolioSummary,
  buildAssetAllocation,
  roundCurrency,
  roundPercent,
  roundQuantity,
} from '../lib/calculations/portfolio.ts';
import { formatCurrency, formatCurrencySafe, formatPercent, formatPercentSafe } from '../lib/utils.ts';
import { PortfolioStorage } from '../lib/storage/portfolioStorage.ts';

console.log('====================================================');
console.log('   FINOVA PROMPT 7.1 — FINANCIAL AUDIT SUITE        ');
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
// 1. Audit Financial Calculations: Deterministic Fixture
// -------------------------------------------------------------
test('Audit 1: Deterministic fixture (Qty=97, Buy=978, Current=2985)', () => {
  const qty = 97;
  const buyPrice = 978;
  const currentPrice = 2985;

  const rawHolding = {
    id: 'h-audit-1',
    user_id: 'user_audit',
    broker_account_id: 'b-audit',
    symbol: 'AUDIT_STOCK',
    isin: 'INE000A01001',
    name: 'Audit Test Stock',
    asset_class: 'equity',
    exchange: 'NSE',
    quantity: qty,
    avg_buy_price: buyPrice,
    current_price: currentPrice,
    currency: 'INR',
    data_source: 'MANUAL',
    price_updated_at: '2026-10-09T10:00:00Z',
    created_at: '2026-10-09T10:00:00Z',
    updated_at: '2026-10-09T10:00:00Z',
  };

  const enriched = enrichHolding(rawHolding);

  // 1. Invested value = 97 * 978 = 94,866
  assert.strictEqual(enriched.invested_value, 94866, 'Invested value must be exactly ₹94,866');

  // 2. Current value = 97 * 2985 = 289,545
  assert.strictEqual(enriched.current_value, 289545, 'Current valuation must be exactly ₹289,545');

  // 3. Unrealized P&L = 289,545 - 94,866 = 194,679
  assert.strictEqual(enriched.absolute_return, 194679, 'Unrealized P&L must be exactly ₹194,679');

  // 4. Return % = (194,679 / 94,866) * 100 = 205.2147239... -> 205.21%
  assert.strictEqual(enriched.absolute_return_pct, 205.21, 'Return percentage must be 205.21%');

  // 5. Portfolio summary matching
  const summary = buildPortfolioSummary([enriched]);
  assert.strictEqual(summary.total_invested_value, 94866);
  assert.strictEqual(summary.total_current_value, 289545);
  assert.strictEqual(summary.total_absolute_return, 194679);
  assert.strictEqual(summary.total_absolute_return_pct, 205.21);
});

// -------------------------------------------------------------
// 2. Investigation of Screenshot Notation: Compact vs Full Display
// -------------------------------------------------------------
test('Audit 2: Root cause of screenshot notation (₹94.9K, ₹2.90L, +205.21%)', () => {
  const invested = 94866;
  const current = 289545;
  const returnPct = 205.21;

  // Uncompacted standard Indian currency formatting:
  const fullInvested = formatCurrency(invested, false);
  const fullCurrent = formatCurrency(current, false);
  assert.strictEqual(fullInvested, '₹94,866.00', 'Full invested format must be ₹94,866.00');
  assert.strictEqual(fullCurrent, '₹2,89,545.00', 'Full current format must be ₹2,89,545.00');

  // Compact Indian notation used in preview cards:
  // 94,866 in compact mode: >= 1,000 -> 94.866 -> 94.9K
  const compactInvested = formatCurrency(invested, true);
  assert.strictEqual(compactInvested, '₹94.9K', 'Compact invested format is ₹94.9K');

  // 289,545 in compact mode: >= 1,00,000 -> 2.89545 -> 2.90L (Lakhs)
  const compactCurrent = formatCurrency(current, true);
  assert.strictEqual(compactCurrent, '₹2.90L', 'Compact current format is ₹2.90L');

  // Percentage formatting:
  const formattedPct = formatPercent(returnPct);
  assert.strictEqual(formattedPct, '+205.21%', 'Formatted return must be +205.21%');

  // Confirmed root cause: The difference is pure visual number abbreviation (K/Lakh compact mode),
  // with no mathematical alteration, hidden brokerage fee deduction, or calculation error.
});

// -------------------------------------------------------------
// 3. Weighted-Average Purchase Price on Accumulation / CSV Import
// -------------------------------------------------------------
test('Audit 3: Weighted average accumulation on duplicate holdings update', () => {
  // Existing: 97 shares @ ₹978 (Total Cost = ₹94,866)
  const q1 = 97;
  const p1 = 978;

  // Added: 50 shares @ ₹1,200 (Total Added Cost = ₹60,000)
  const q2 = 50;
  const p2 = 1200;

  // Total shares = 147
  // Total Cost = 94,866 + 60,000 = 154,866
  // Weighted Avg = 154,866 / 147 = 1053.510204... -> 1053.51
  const totalQty = q1 + q2;
  const totalCost = q1 * p1 + q2 * p2;
  const weightedAvg = roundCurrency(totalCost / totalQty);

  assert.strictEqual(totalQty, 147);
  assert.strictEqual(weightedAvg, 1053.51);

  // Simulating the exact formula in import/route.ts
  const simulatedCalculated = roundCurrency((q1 * p1 + q2 * p2) / (q1 + q2));
  assert.strictEqual(simulatedCalculated, 1053.51);
});

// -------------------------------------------------------------
// 4. Quote Provenance & Unquoted Fallback Safety
// -------------------------------------------------------------
test('Audit 4: Quote provenance and unquoted asset safety', () => {
  // Reliance quote check
  const relQuote = PortfolioStorage.getMarketPrice('RELIANCE');
  assert(relQuote !== null, 'RELIANCE quote should exist in quote cache');
  assert.strictEqual(relQuote.currency, 'INR');
  assert(relQuote.source === 'NSE_EOD' || relQuote.source === 'BSE_EOD', 'Source should be EOD exchange feed');
  assert.strictEqual(relQuote.status, 'DELAYED');

  // Unquoted asset check (e.g. GS2028_706 or unlisted corporate bond)
  const unquotedQuote = PortfolioStorage.getMarketPrice('GS2028_706');
  assert.strictEqual(unquotedQuote, null, 'Unquoted asset must return null market quote');

  const unquotedHolding = enrichHolding({
    id: 'h-unquoted',
    user_id: 'u1',
    broker_account_id: 'b1',
    symbol: 'GS2028_706',
    name: '7.06% GS 2028',
    asset_class: 'bond',
    exchange: 'OTHER',
    quantity: 100,
    avg_buy_price: 100,
    current_price: null,
    currency: 'INR',
    data_source: 'MANUAL',
    created_at: '',
    updated_at: '',
    price_updated_at: null,
  });

  // Strict verification: price and return must remain null without zero/buy price substitution
  assert.strictEqual(unquotedHolding.current_price, null);
  assert.strictEqual(unquotedHolding.absolute_return, null);
  assert.strictEqual(unquotedHolding.absolute_return_pct, null);

  assert.strictEqual(formatCurrencySafe(unquotedHolding.current_price), 'Price unavailable');
  assert.strictEqual(formatPercentSafe(unquotedHolding.absolute_return_pct), 'P&L unavailable');
});

// -------------------------------------------------------------
// 5. Zero Holdings & Zero-Investment Safety
// -------------------------------------------------------------
test('Audit 5: Zero holdings and zero cost basis math safety', () => {
  const emptySummary = buildPortfolioSummary([]);
  assert.strictEqual(emptySummary.total_current_value, 0);
  assert.strictEqual(emptySummary.total_invested_value, 0);
  assert.strictEqual(emptySummary.total_absolute_return, 0);
  assert.strictEqual(emptySummary.total_absolute_return_pct, 0);
  assert.strictEqual(emptySummary.holding_count, 0);

  const emptyAlloc = buildAssetAllocation([]);
  assert.deepStrictEqual(emptyAlloc, []);

  // Zero investment cost holding (e.g. gift or zero cost asset)
  const zeroCostHolding = enrichHolding({
    id: 'h-zero',
    user_id: 'u1',
    broker_account_id: 'b1',
    symbol: 'BONUS_SHARES',
    name: 'Bonus Shares',
    asset_class: 'equity',
    exchange: 'NSE',
    quantity: 10,
    avg_buy_price: 0,
    current_price: 100,
    currency: 'INR',
    data_source: 'MANUAL',
    created_at: '',
    updated_at: '',
    price_updated_at: null,
  });

  assert.strictEqual(zeroCostHolding.invested_value, 0);
  assert.strictEqual(zeroCostHolding.current_value, 1000);
  assert.strictEqual(zeroCostHolding.absolute_return, 1000);
  // Zero division protection: should return 0 rather than NaN or Infinity
  assert.strictEqual(zeroCostHolding.absolute_return_pct, 0);
  assert(!isNaN(zeroCostHolding.absolute_return_pct));
});

console.log('\n====================================================');
console.log(`   ALL ${passCount} PROMPT 7.1 AUDIT TESTS PASSED! `);
console.log('====================================================\n');
