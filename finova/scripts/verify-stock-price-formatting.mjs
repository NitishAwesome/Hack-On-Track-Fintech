// ============================================================
// FINOVA — Automated Regression Suite: Stock Price Formatting
// Tests currency formatting across all ranges: below 1000,
// above 1000, lakh-level, crore-level, decimals, zero, and negative.
// Verifies no 'K', 'M', or 'B' abbreviations in stock quotes or prices.
// ============================================================

import assert from 'node:assert';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import {
  formatCurrency,
  formatCurrencySafe,
  formatStockPrice,
  inrCurrencyFormatter,
} from '../lib/utils.ts';

test('Suite 1: Shared INR Currency Formatter (Intl.NumberFormat standard)', () => {
  // Test direct instance
  assert.strictEqual(typeof inrCurrencyFormatter.format, 'function');
  assert.strictEqual(inrCurrencyFormatter.resolvedOptions().currency, 'INR');
  assert.strictEqual(inrCurrencyFormatter.resolvedOptions().minimumFractionDigits, 2);
  assert.strictEqual(inrCurrencyFormatter.resolvedOptions().maximumFractionDigits, 2);
});

test('Suite 2: Values Below 1000 (Indian Number Formatting with Decimals)', () => {
  // ₹268.5 -> ₹268.50
  assert.strictEqual(formatCurrency(268.5), '₹268.50');
  assert.strictEqual(formatStockPrice(268.5), '₹268.50');

  // Single digit and small values
  assert.strictEqual(formatCurrency(0.5), '₹0.50');
  assert.strictEqual(formatCurrency(5), '₹5.00');
  assert.strictEqual(formatCurrency(99.9), '₹99.90');
  assert.strictEqual(formatCurrency(999.99), '₹999.99');

  // Verify no abbreviations
  assert(!formatCurrency(268.5).includes('K'));
  assert(!formatCurrency(268.5).includes('M'));
  assert(!formatCurrency(268.5).includes('B'));
});

test('Suite 3: Values Above 1000 (Full Numeric, No K/M/B Abbreviation)', () => {
  // ₹1.8K -> ₹1,800.00
  assert.strictEqual(formatCurrency(1800), '₹1,800.00');
  assert.strictEqual(formatStockPrice(1800), '₹1,800.00');

  // ₹4.9K -> ₹4,900.00
  assert.strictEqual(formatCurrency(4900), '₹4,900.00');
  assert.strictEqual(formatStockPrice(4900), '₹4,900.00');

  // TCS price example (~2156.45)
  assert.strictEqual(formatCurrency(2156.45), '₹2,156.45');
  assert.strictEqual(formatStockPrice(2156.45), '₹2,156.45');

  // Mid-range thousands
  assert.strictEqual(formatCurrency(12500), '₹12,500.00');
  assert.strictEqual(formatCurrency(94866), '₹94,866.00');

  // Verify no 'K' or 'M'
  const formatted4900 = formatCurrency(4900);
  assert(!formatted4900.includes('K'), `Expected no 'K' in ${formatted4900}`);
  assert(!formatted4900.includes('M'), `Expected no 'M' in ${formatted4900}`);
  assert(!formatted4900.includes('B'), `Expected no 'B' in ${formatted4900}`);
});

test('Suite 4: Lakh-Level Values (Indian Grouping, No L/M/B unless compact requested)', () => {
  // ₹1.25L -> ₹1,25,000.00 when underlying value is 125000
  assert.strictEqual(formatCurrency(125000), '₹1,25,000.00');
  assert.strictEqual(formatStockPrice(125000), '₹1,25,000.00');

  // High lakh value (2,89,545.00)
  assert.strictEqual(formatCurrency(289545), '₹2,89,545.00');
  assert.strictEqual(formatStockPrice(289545), '₹2,89,545.00');

  // 10 lakhs (1,000,000) -> ₹10,00,000.00
  assert.strictEqual(formatCurrency(1000000), '₹10,00,000.00');
  assert.strictEqual(formatStockPrice(1000000), '₹10,00,000.00');

  // Verify full format doesn't have 'L' or 'Cr'
  assert(!formatCurrency(125000).endsWith('L'));
  assert(!formatStockPrice(125000).endsWith('L'));
});

test('Suite 5: Crores-Level Values', () => {
  // 1 crore -> ₹1,00,00,000.00
  assert.strictEqual(formatCurrency(10000000), '₹1,00,00,000.00');
  assert.strictEqual(formatStockPrice(10000000), '₹1,00,00,000.00');
});

test('Suite 6: Decimals and Rounding Precision', () => {
  // Exact 2 decimals
  assert.strictEqual(formatCurrency(123.45), '₹123.45');

  // Rounding up
  assert.strictEqual(formatCurrency(123.456), '₹123.46');

  // Rounding down
  assert.strictEqual(formatCurrency(123.454), '₹123.45');

  // Single decimal padded with trailing 0
  assert.strictEqual(formatCurrency(123.4), '₹123.40');

  // Whole number padded with .00
  assert.strictEqual(formatCurrency(123), '₹123.00');
});

test('Suite 7: Zero and Edge Case Values', () => {
  assert.strictEqual(formatCurrency(0), '₹0.00');
  assert.strictEqual(formatStockPrice(0), '₹0.00');
  assert.strictEqual(formatCurrency(-0), '₹0.00');
});

test('Suite 8: Negative Values', () => {
  // -1500 -> -₹1,500.00
  assert.strictEqual(formatCurrency(-1500), '-₹1,500.00');
  assert.strictEqual(formatStockPrice(-1500), '-₹1,500.00');

  // Negative decimals
  assert.strictEqual(formatCurrency(-268.5), '-₹268.50');
  assert.strictEqual(formatStockPrice(-268.5), '-₹268.50');

  // Negative lakh
  assert.strictEqual(formatCurrency(-125000), '-₹1,25,000.00');
  assert.strictEqual(formatStockPrice(-125000), '-₹1,25,000.00');
});

test('Suite 9: Null, Undefined, NaN Safe Fallbacks', () => {
  assert.strictEqual(formatCurrencySafe(null), 'Price unavailable');
  assert.strictEqual(formatCurrencySafe(undefined), 'Price unavailable');
  assert.strictEqual(formatCurrencySafe(NaN), 'Price unavailable');
  assert.strictEqual(formatCurrencySafe(null, 'Custom fallback'), 'Custom fallback');

  assert.strictEqual(formatStockPrice(null), 'Price unavailable');
  assert.strictEqual(formatStockPrice(undefined), 'Price unavailable');
  assert.strictEqual(formatStockPrice(NaN), 'Price unavailable');
  assert.strictEqual(formatStockPrice(null, 'N/A'), 'N/A');

  // Valid values through Safe helpers
  assert.strictEqual(formatCurrencySafe(4900), '₹4,900.00');
  assert.strictEqual(formatStockPrice(4900), '₹4,900.00');
});

test('Suite 10: Audit UI Components for Compact Removal', () => {
  const stockSearchFile = fs.readFileSync(
    path.resolve(process.cwd(), 'components/market/StockSearchDropdown.tsx'),
    'utf-8'
  );
  // Ensure StockSearchDropdown does not format active quote prices with compact=true
  assert(
    !stockSearchFile.includes('formatCurrency(activeQuote.price, true)'),
    'StockSearchDropdown must not pass compact=true to activeQuote.price'
  );
  assert(
    !stockSearchFile.includes('formatCurrency(activeQuote.previousClose, true)'),
    'StockSearchDropdown must not pass compact=true to activeQuote.previousClose'
  );

  const holdingsFile = fs.readFileSync(
    path.resolve(process.cwd(), 'app/(dashboard)/holdings/page.tsx'),
    'utf-8'
  );
  // Ensure holdings table does not pass compact=true for holding values
  assert(
    !holdingsFile.includes('formatCurrency(h.invested_value, true)'),
    'Holdings page must not pass compact=true for invested_value in table'
  );
  assert(
    !holdingsFile.includes('formatCurrency(h.current_value || h.invested_value, true)'),
    'Holdings page must not pass compact=true for current_value in table'
  );
  assert(
    !holdingsFile.includes('formatCurrency(h.absolute_return, true)'),
    'Holdings page must not pass compact=true for absolute_return in table'
  );
  assert(
    !holdingsFile.includes('formatCurrency(summaryMetrics.totalInvested, true)'),
    'Holdings summary cards must not pass compact=true'
  );
  assert(
    !holdingsFile.includes('formatCurrency(summaryMetrics.totalCurrentVal, true)'),
    'Holdings summary cards must not pass compact=true'
  );

  const performanceFile = fs.readFileSync(
    path.resolve(process.cwd(), 'app/(dashboard)/performance/page.tsx'),
    'utf-8'
  );
  // Ensure gainers/losers do not pass compact=true
  assert(
    !performanceFile.includes('formatCurrency(h.absolute_return || 0, true)'),
    'Performance page gainers/losers must not pass compact=true'
  );
});
