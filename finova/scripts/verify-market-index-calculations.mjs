// ============================================================
// FINOVA — Market Index Change & Valuation Regression Suite
// Tests:
// 1. Positive index change derivation (Nifty 50 Oct 9: 22,520.45, +288.65, +1.30%)
// 2. Multi-index validation (Sensex +879.09, Bank Nifty +741.60)
// 3. Negative index change derivation (-249.50, -1.02%)
// 4. Zero change scenario (unchanged session, exact 0.00 and 0.00%)
// 5. Missing / unavailable previous close (returns null, no fabricated numbers)
// 6. Invalid or non-positive current price rejection
// 7. Stale index data detection (> 10 days)
// 8. Future timestamp skew rejection
// 9. Session boundary demarcation (historical bars vs current session)
// 10. Live /api/market/indices HTTP API contract verification
// ============================================================

import assert from 'node:assert';
import {
  deriveChangeAndPercent,
  calculateIndexMetrics,
} from '../lib/market/indexCalculator.ts';

console.log('====================================================');
console.log('  FINOVA — MARKET INDEX CHANGE REGRESSION SUITE     ');
console.log('====================================================\n');

let passCount = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`✓ Passed: ${name}`);
    passCount++;
  } catch (err) {
    console.error(`✗ FAILED: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

// -------------------------------------------------------------
// Test 1: Positive Change Derivation (Nifty 50 Real Case: +288.65, +1.30%)
// -------------------------------------------------------------
await test('Test 1: Positive change derivation (Nifty 50: 22,520.45 vs 22,231.80)', () => {
  const currentPrice = 22520.45;
  const previousClose = 22231.80;

  const result = deriveChangeAndPercent(currentPrice, previousClose);

  // Exact difference: 22520.45 - 22231.80 = 288.65
  assert.strictEqual(result.change, 288.65, 'Change must be +288.65 points');

  // Percentage: (288.65 / 22231.80) * 100 = 1.2983... -> +1.30%
  assert.strictEqual(result.changePercent, 1.30, 'Percentage change must be +1.30%');

  // MUST NOT equal the buggy -82.65 (-0.37%)
  assert.notStrictEqual(result.change, -82.65, 'Must not reproduce the -82.65 defect');
  assert.notStrictEqual(result.changePercent, -0.37);
});

// -------------------------------------------------------------
// Test 2: Multi-Index Validation (Sensex & Bank Nifty)
// -------------------------------------------------------------
await test('Test 2: Multi-index change derivation (Sensex & Bank Nifty)', () => {
  // Sensex: 72,472.33 vs 71,593.24
  const sensexResult = deriveChangeAndPercent(72472.33, 71593.24);
  assert.strictEqual(sensexResult.change, 879.09, 'Sensex change must be +879.09 points');
  assert.strictEqual(sensexResult.changePercent, 1.23, 'Sensex percentage must be +1.23%');

  // Bank Nifty: 55,256.65 vs 54,515.05
  const bankResult = deriveChangeAndPercent(55256.65, 54515.05);
  assert.strictEqual(bankResult.change, 741.60, 'Bank Nifty change must be +741.60 points');
  assert.strictEqual(bankResult.changePercent, 1.36, 'Bank Nifty percentage must be +1.36%');
});

// -------------------------------------------------------------
// Test 3: Negative Change Derivation
// -------------------------------------------------------------
await test('Test 3: Negative change derivation (24,100.50 vs 24,350.00)', () => {
  const currentPrice = 24100.50;
  const previousClose = 24350.00;

  const result = deriveChangeAndPercent(currentPrice, previousClose);

  // Difference: 24100.50 - 24350.00 = -249.50
  assert.strictEqual(result.change, -249.50, 'Change must be -249.50 points');

  // Percentage: (-249.50 / 24350.00) * 100 = -1.0246... -> -1.02%
  assert.strictEqual(result.changePercent, -1.02, 'Percentage change must be -1.02%');
});

// -------------------------------------------------------------
// Test 4: Zero Change Scenario (Unchanged Session)
// -------------------------------------------------------------
await test('Test 4: Zero change scenario (unchanged index session)', () => {
  const currentPrice = 22500.00;
  const previousClose = 22500.00;

  const result = deriveChangeAndPercent(currentPrice, previousClose);
  assert.strictEqual(result.change, 0.00, 'Zero change must be 0.00');
  assert.strictEqual(result.changePercent, 0.00, 'Zero percentage change must be 0.00%');
});

// -------------------------------------------------------------
// Test 5: Missing / Unavailable Previous Close
// -------------------------------------------------------------
await test('Test 5: Missing or unavailable previous close returns null without fabricating change', () => {
  // Null previous close
  const nullResult = deriveChangeAndPercent(22520.45, null);
  assert.strictEqual(nullResult.change, null, 'Change must be null when previousClose is null');
  assert.strictEqual(nullResult.changePercent, null, 'Change percent must be null when previousClose is null');

  // Undefined previous close
  const undefinedResult = deriveChangeAndPercent(22520.45, undefined);
  assert.strictEqual(undefinedResult.change, null);
  assert.strictEqual(undefinedResult.changePercent, null);

  // Non-positive or zero previous close
  const zeroPrevResult = deriveChangeAndPercent(22520.45, 0);
  assert.strictEqual(zeroPrevResult.change, null);
  assert.strictEqual(zeroPrevResult.changePercent, null);

  const negPrevResult = deriveChangeAndPercent(22520.45, -100);
  assert.strictEqual(negPrevResult.change, null);
  assert.strictEqual(negPrevResult.changePercent, null);
});

// -------------------------------------------------------------
// Test 6: Invalid or Non-Positive Current Price Rejection
// -------------------------------------------------------------
await test('Test 6: Invalid or non-positive current price is rejected cleanly', () => {
  const zeroPriceResult = calculateIndexMetrics('NIFTY50', {
    meta: { regularMarketPrice: 0 },
  });
  assert.strictEqual(zeroPriceResult.isValid, false);
  assert.strictEqual(zeroPriceResult.change, null);

  const negPriceResult = calculateIndexMetrics('NIFTY50', {
    meta: { regularMarketPrice: -500 },
  });
  assert.strictEqual(negPriceResult.isValid, false);

  const nanPriceResult = calculateIndexMetrics('NIFTY50', {
    meta: { regularMarketPrice: NaN },
  });
  assert.strictEqual(nanPriceResult.isValid, false);
});

// -------------------------------------------------------------
// Test 7: Stale Index Data Detection (> 10 Days Old)
// -------------------------------------------------------------
await test('Test 7: Stale index data older than 10 calendar days is marked as stale', () => {
  const fifteenDaysAgo = Math.floor((Date.now() - 15 * 86400000) / 1000);
  const staleResult = calculateIndexMetrics('NIFTY50', {
    meta: {
      regularMarketPrice: 22520.45,
      regularMarketTime: fifteenDaysAgo,
      fulldayChange: 288.65,
    },
  });

  assert.strictEqual(staleResult.isValid, false, 'Stale quote must be marked invalid');
  assert.strictEqual(staleResult.isStale, true, 'isStale must be true');
  assert.ok(staleResult.rejectionReason?.includes('stale'));
});

// -------------------------------------------------------------
// Test 8: Future Timestamp Clock Skew Rejection
// -------------------------------------------------------------
await test('Test 8: Future timestamp exceeding clock skew is rejected', () => {
  const twoDaysInFuture = Math.floor((Date.now() + 2 * 86400000) / 1000);
  const futureResult = calculateIndexMetrics('NIFTY50', {
    meta: {
      regularMarketPrice: 22520.45,
      regularMarketTime: twoDaysInFuture,
      fulldayChange: 288.65,
    },
  });

  assert.strictEqual(futureResult.isValid, false);
  assert.ok(futureResult.rejectionReason?.includes('in the future'));
});

// -------------------------------------------------------------
// Test 9: Session Boundary Demarcation & Chart Bar Disambiguation
// -------------------------------------------------------------
await test('Test 9: Session boundary demarcation selects previous day bar, avoiding chartPreviousClose trap', () => {
  // Simulating the exact Yahoo Finance v8 chart fixture from Oct 9, 2026:
  // - Current session trade date: 2026-10-09 (1791540079)
  // - Previous session close: 2026-10-08 (1791431100, close = 22231.80)
  // - Two days ago session close: 2026-10-07 (1791344700, close = 22603.05)
  // - Defective chartPreviousClose from range=1d query: 22603.10 (Oct 7 close!)
  const mockChartResult = {
    meta: {
      regularMarketPrice: 22520.45,
      regularMarketTime: 1791540079, // Oct 9, 2026 15:31:19 IST
      fulldayChange: 288.648,
      chartPreviousClose: 22603.10, // Defective Oct 7 close returned by 1d range!
      currency: 'INR',
    },
    timestamp: [
      1791258300, // 2026-10-06
      1791344700, // 2026-10-07
      1791431100, // 2026-10-08
      1791517500, // 2026-10-09
    ],
    indicators: {
      quote: [
        {
          close: [
            22776.10,
            22603.05,
            22231.80, // Correct previous session close!
            null,
          ],
        },
      ],
    },
  };

  const calculated = calculateIndexMetrics('NIFTY50', mockChartResult);

  assert.strictEqual(calculated.isValid, true);
  assert.strictEqual(calculated.currentPrice, 22520.45);

  // Correct previous close: 22,231.80 (NOT 22,603.10)
  assert.strictEqual(calculated.previousClose, 22231.80);

  // Correct change: +288.65 points (NOT -82.65 points)
  assert.strictEqual(calculated.change, 288.65);

  // Correct percentage: +1.30% (NOT -0.37%)
  assert.strictEqual(calculated.changePercent, 1.30);
});

// -------------------------------------------------------------
// Test 10: Live HTTP API Contract (/api/market/indices)
// -------------------------------------------------------------
await test('Test 10: Live /api/market/indices endpoint returns accurate dynamic points and percentages', async () => {
  const res = await fetch('http://localhost:3000/api/market/indices?force=true');
  assert.strictEqual(res.status, 200, 'Indices API must return status 200');

  const json = await res.json();
  assert.strictEqual(json.success, true);
  assert.strictEqual(json.status, 'SUCCESS');
  assert.ok(Array.isArray(json.indices) && json.indices.length >= 3);

  // 1. Nifty 50 verification
  const nifty = json.indices.find((i) => i.symbol === 'NIFTY50');
  assert.ok(nifty, 'NIFTY50 must be present in response');
  assert.strictEqual(nifty.value, 22520.45, 'Nifty 50 index level must be 22,520.45');
  assert.strictEqual(nifty.previousClose, 22231.80, 'Nifty 50 previous close must be 22,231.80');
  assert.strictEqual(nifty.change, 288.65, 'Nifty 50 change must be exactly +288.65');
  assert.strictEqual(nifty.changePercent, 1.30, 'Nifty 50 change percentage must be exactly +1.30%');
  assert.notStrictEqual(nifty.change, -82.65, 'Must not be -82.65');
  assert.notStrictEqual(nifty.changePercent, -0.37, 'Must not be -0.37%');

  // 2. Sensex verification
  const sensex = json.indices.find((i) => i.symbol === 'SENSEX');
  assert.ok(sensex, 'SENSEX must be present in response');
  assert.strictEqual(sensex.value, 72472.33);
  assert.strictEqual(sensex.previousClose, 71593.24);
  assert.strictEqual(sensex.change, 879.09);
  assert.strictEqual(sensex.changePercent, 1.23);

  // 3. Bank Nifty verification
  const bankNifty = json.indices.find((i) => i.symbol === 'BANKNIFTY');
  assert.ok(bankNifty, 'BANKNIFTY must be present in response');
  assert.strictEqual(bankNifty.value, 55256.65);
  assert.strictEqual(bankNifty.previousClose, 54515.05);
  assert.strictEqual(bankNifty.change, 741.60);
  assert.strictEqual(bankNifty.changePercent, 1.36);

  console.log(`     -> NIFTY 50 live: ₹${nifty.value} | +${nifty.change} (+${nifty.changePercent}%) [Prev Close: ₹${nifty.previousClose}]`);
  console.log(`     -> SENSEX live:   ₹${sensex.value} | +${sensex.change} (+${sensex.changePercent}%) [Prev Close: ₹${sensex.previousClose}]`);
  console.log(`     -> BANK NIFTY live: ₹${bankNifty.value} | +${bankNifty.change} (+${bankNifty.changePercent}%) [Prev Close: ₹${bankNifty.previousClose}]`);
});

console.log('\n====================================================');
console.log(`   ALL ${passCount} MARKET INDEX TESTS PASSED!`);
console.log('====================================================\n');
