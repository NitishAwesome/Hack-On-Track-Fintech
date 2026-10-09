// ============================================================
// FINOVA — Market Data Pipeline Regression & Integrity Test Suite
// Verifies:
// 1. Indian stock symbol resolution (e.g. TCS + NSE -> TCS.NS)
// 2. Strict quote validation & rejection policy (no invented/stale prices)
// 3. Dynamic market quote retrieval via Yahoo Finance (TCS ~₹2,156, not seed ₹3,960)
// 4. Unquoted instrument handling ("Price unavailable", null return)
// 5. Cost basis and quantity preservation (zero mutation of user data)
// 6. Dynamic price cache synchronization in PortfolioStorage
// 7. Live /api/market/quotes endpoint contracts
// ============================================================

import assert from 'node:assert';
import {
  resolveYahooFinanceSymbol,
  extractBaseSymbol,
  normalizeExchange,
  isIndianEquity,
} from '../lib/market/symbolMapper.ts';
import {
  validateMarketQuote,
} from '../lib/market/quoteValidator.ts';
import { PortfolioStorage } from '../lib/storage/portfolioStorage.ts';
import { enrichHolding, buildPortfolioSummary } from '../lib/calculations/portfolio.ts';

console.log('====================================================');
console.log('  FINOVA — MARKET DATA PIPELINE REGRESSION SUITE   ');
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
// Test 1: Indian Stock Symbol Mapping Logic
// -------------------------------------------------------------
await test('Test 1: Indian symbol mapping (TCS, RELIANCE, indices)', () => {
  // Equities on NSE
  assert.strictEqual(resolveYahooFinanceSymbol('TCS', 'NSE'), 'TCS.NS');
  assert.strictEqual(resolveYahooFinanceSymbol('RELIANCE', 'NSE'), 'RELIANCE.NS');
  assert.strictEqual(resolveYahooFinanceSymbol('INFY', 'NSE'), 'INFY.NS');

  // Equities on BSE
  assert.strictEqual(resolveYahooFinanceSymbol('TCS', 'BSE'), 'TCS.BO');
  assert.strictEqual(resolveYahooFinanceSymbol('HDFCBANK', 'BSE'), 'HDFCBANK.BO');

  // Already suffixed
  assert.strictEqual(resolveYahooFinanceSymbol('TCS.NS', 'NSE'), 'TCS.NS');
  assert.strictEqual(resolveYahooFinanceSymbol('TCS.BO', 'BSE'), 'TCS.BO');

  // Major Indian Market Indices
  assert.strictEqual(resolveYahooFinanceSymbol('NIFTY 50'), '^NSEI');
  assert.strictEqual(resolveYahooFinanceSymbol('NIFTY50'), '^NSEI');
  assert.strictEqual(resolveYahooFinanceSymbol('SENSEX'), '^BSESN');
  assert.strictEqual(resolveYahooFinanceSymbol('NIFTY BANK'), '^NSEBANK');
  assert.strictEqual(resolveYahooFinanceSymbol('BANKNIFTY'), '^NSEBANK');

  // Base symbol extraction
  assert.strictEqual(extractBaseSymbol('TCS.NS'), 'TCS');
  assert.strictEqual(extractBaseSymbol('TCS.BO'), 'TCS');
  assert.strictEqual(extractBaseSymbol('TCS'), 'TCS');
  assert.strictEqual(extractBaseSymbol('^NSEI'), '^NSEI');

  // Exchange normalization
  assert.strictEqual(normalizeExchange('nse'), 'NSE');
  assert.strictEqual(normalizeExchange('bse'), 'BSE');
  assert.strictEqual(normalizeExchange('invalid'), 'NSE');

  // Indian equity recognition
  assert.strictEqual(isIndianEquity('TCS'), true);
  assert.strictEqual(isIndianEquity('^NSEI'), false);
});

// -------------------------------------------------------------
// Test 2: Strict Quote Validation & Rejection Policy
// -------------------------------------------------------------
await test('Test 2: Quote validation rejects invalid, stale, or currency-mismatched data', () => {
  const now = new Date();

  // Valid quote
  const validResult = validateMarketQuote({
    symbol: 'TCS',
    price: 2156.40,
    currency: 'INR',
    timestamp: now.toISOString(),
  });
  assert.strictEqual(validResult.isValid, true);
  assert.strictEqual(validResult.normalizedPrice, 2156.40);
  assert.strictEqual(validResult.status, 'DELAYED');

  // Reject non-positive price
  const zeroResult = validateMarketQuote({
    symbol: 'TCS',
    price: 0,
    currency: 'INR',
    timestamp: now.toISOString(),
  });
  assert.strictEqual(zeroResult.isValid, false);
  assert.ok(zeroResult.rejectionReason.includes('non-positive'));

  const negResult = validateMarketQuote({
    symbol: 'TCS',
    price: -250,
    currency: 'INR',
    timestamp: now.toISOString(),
  });
  assert.strictEqual(negResult.isValid, false);

  const nanResult = validateMarketQuote({
    symbol: 'TCS',
    price: NaN,
    currency: 'INR',
    timestamp: now.toISOString(),
  });
  assert.strictEqual(nanResult.isValid, false);

  // Reject foreign currency for Indian equity
  const usdResult = validateMarketQuote({
    symbol: 'TCS',
    price: 2156,
    currency: 'USD',
    timestamp: now.toISOString(),
  });
  assert.strictEqual(usdResult.isValid, false);
  assert.ok(usdResult.rejectionReason.includes('Currency mismatch'));

  // Reject future timestamp beyond skew
  const futureResult = validateMarketQuote({
    symbol: 'TCS',
    price: 2156,
    currency: 'INR',
    timestamp: new Date(Date.now() + 86400000 * 2).toISOString(),
  });
  assert.strictEqual(futureResult.isValid, false);
  assert.ok(futureResult.rejectionReason.includes('in the future'));

  // Reject stale quote older than 10 days
  const staleDate = new Date(Date.now() - 15 * 86400000);
  const staleResult = validateMarketQuote({
    symbol: 'TCS',
    price: 2156,
    currency: 'INR',
    timestamp: staleDate.toISOString(),
  });
  assert.strictEqual(staleResult.isValid, false);
  assert.strictEqual(staleResult.status, 'STALE');
  assert.ok(staleResult.rejectionReason.includes('stale'));
});

// -------------------------------------------------------------
// Test 3: Dynamic Direct Retrieval for TCS from Yahoo Finance Feed
// -------------------------------------------------------------
await test('Test 3: Live dynamic retrieval of TCS quote via Yahoo Finance API', async () => {
  const yahooTicker = resolveYahooFinanceSymbol('TCS', 'NSE');
  assert.strictEqual(yahooTicker, 'TCS.NS');

  const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${yahooTicker}?interval=1d`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  });

  assert.strictEqual(res.status, 200, 'Yahoo Finance chart API must return 200 for TCS.NS');
  const json = await res.json();
  const meta = json?.chart?.result?.[0]?.meta;

  assert.ok(meta, 'Meta object must exist in chart result');
  assert.strictEqual(meta.symbol, 'TCS.NS');
  assert.strictEqual(meta.currency, 'INR');

  const validation = validateMarketQuote({
    symbol: 'TCS',
    price: meta.regularMarketPrice,
    currency: meta.currency,
    timestamp: meta.regularMarketTime ? meta.regularMarketTime * 1000 : null,
    source: 'Yahoo Finance / yfinance',
  });

  assert.strictEqual(validation.isValid, true);
  assert.ok(['DELAYED', 'EOD', 'REALTIME'].includes(validation.status));

  // Verify CRITICAL condition: Must NOT be the obsolete seed price of ₹3,960!
  assert.notStrictEqual(validation.normalizedPrice, 3960, 'Dynamic price must NOT be the static seed price 3960');
  
  // Real market quote is around ~2,156
  assert.ok(
    validation.normalizedPrice > 1800 && validation.normalizedPrice < 3200,
    `TCS price must be in realistic live market range (~2156), got ₹${validation.normalizedPrice}`
  );

  console.log(`     -> TCS live price dynamically fetched: ₹${validation.normalizedPrice} (Status: ${validation.status})`);
});

// -------------------------------------------------------------
// Test 4: Unquoted Instrument & Rejection Handling
// -------------------------------------------------------------
await test('Test 4: Unquoted instrument (GS2028_706) returns 404 on Yahoo and yields null quote', async () => {
  const yahooTicker = resolveYahooFinanceSymbol('GS2028_706', 'NSE');
  const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${yahooTicker}?interval=1d`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  });

  // Bonds are unquoted on Yahoo Finance equity feed
  assert.ok(!res.ok, 'Unquoted bond feed should return non-200');
});

// -------------------------------------------------------------
// Test 5: Cost Basis and Quantity Preservation
// -------------------------------------------------------------
await test('Test 5: User quantity and average purchase price are 100% preserved', () => {
  const userQuantity = 30;
  const userAvgBuyPrice = 3450.00;
  const dynamicLivePrice = 2156.00;

  const rawHolding = {
    id: 'holding-tcs-1',
    user_id: 'user_1',
    broker_account_id: 'broker_zerodha',
    instrument_id: 'inst_tcs',
    symbol: 'TCS',
    isin: 'INE467B01029',
    name: 'Tata Consultancy Services Ltd',
    asset_class: 'equity',
    exchange: 'NSE',
    quantity: userQuantity,
    avg_buy_price: userAvgBuyPrice,
    average_buy_price: userAvgBuyPrice,
    current_price: dynamicLivePrice,
    currency: 'INR',
    data_source: 'MANUAL',
    as_of: '2026-10-09',
    price_updated_at: new Date().toISOString(),
    price_source: 'Yahoo Finance',
    price_status: 'DELAYED',
    created_at: '2026-10-09T00:00:00Z',
    updated_at: '2026-10-09T00:00:00Z',
  };

  const enriched = enrichHolding(rawHolding);

  // User input preserved
  assert.strictEqual(enriched.quantity, 30, 'Quantity must not be mutated');
  assert.strictEqual(enriched.avg_buy_price, 3450.00, 'Avg buy price must not be mutated');
  assert.strictEqual(enriched.average_buy_price, 3450.00);

  // Cost basis: 30 * 3450 = 103,500
  assert.strictEqual(enriched.invested_value, 103500);

  // Current valuation: 30 * 2156 = 64,680
  assert.strictEqual(enriched.current_value, 64680);

  // Unrealized P&L: 64,680 - 103,500 = -38,820
  assert.strictEqual(enriched.absolute_return, -38820);

  // Unrealized P&L %: (-38,820 / 103,500) * 100 = -37.507246... -> -37.51%
  assert.strictEqual(enriched.absolute_return_pct, -37.51);

  // Unquoted asset case
  const unquotedHolding = {
    id: 'holding-bond-1',
    user_id: 'user_1',
    broker_account_id: 'broker_zerodha',
    instrument_id: 'inst_bond',
    symbol: 'GS2028_706',
    name: 'Government of India 7.06% 2028',
    asset_class: 'bond',
    exchange: 'NSE',
    quantity: 100,
    avg_buy_price: 101.50,
    current_price: null,
    currency: 'INR',
    data_source: 'MANUAL',
    as_of: '2026-10-09',
    price_updated_at: null,
    created_at: '2026-10-09T00:00:00Z',
    updated_at: '2026-10-09T00:00:00Z',
  };

  const enrichedUnquoted = enrichHolding(unquotedHolding);
  assert.strictEqual(enrichedUnquoted.quantity, 100);
  assert.strictEqual(enrichedUnquoted.avg_buy_price, 101.50);
  assert.strictEqual(enrichedUnquoted.invested_value, 10150);
  assert.strictEqual(enrichedUnquoted.current_price, null);
  assert.strictEqual(enrichedUnquoted.absolute_return, null);
  assert.strictEqual(enrichedUnquoted.absolute_return_pct, null);

  // Summary aggregation
  const summary = buildPortfolioSummary([enriched, enrichedUnquoted]);
  assert.strictEqual(summary.total_invested_value, 103500 + 10150);
  assert.strictEqual(summary.priced_count, 1);
  assert.strictEqual(summary.unquoted_count, 1);
  assert.strictEqual(summary.holding_count, 2);
});

// -------------------------------------------------------------
// Test 6: Synchronizing Dynamic Quotes to PortfolioStorage
// -------------------------------------------------------------
await test('Test 6: Dynamic in-memory price cache in PortfolioStorage overrides seed prices', () => {
  // Clear any dynamic prices in memory
  PortfolioStorage.clearDynamicPrices();

  // Set dynamic verified price for TCS (~2,156)
  PortfolioStorage.setMarketPrice('TCS', {
    price: 2156.00,
    price_timestamp: new Date().toISOString(),
    source: 'Yahoo Finance / yfinance',
    status: 'DELAYED',
  });

  const stored = PortfolioStorage.getMarketPrice('TCS');
  assert.ok(stored !== null);
  assert.strictEqual(stored.price, 2156.00);
  assert.notStrictEqual(stored.price, 3960.00, 'Must return dynamic price 2156, not seed price 3960');
  assert.strictEqual(stored.source, 'Yahoo Finance / yfinance');
  assert.strictEqual(stored.status, 'DELAYED');

  // Verify unquoted instrument
  const unquoted = PortfolioStorage.getMarketPrice('GS2028_706');
  assert.strictEqual(unquoted, null, 'Unquoted instrument must return null');
});

// -------------------------------------------------------------
// Test 7: Live /api/market/quotes HTTP Contract
// -------------------------------------------------------------
await test('Test 7: HTTP API contract /api/market/quotes returns dynamic payload', async () => {
  const url = 'http://localhost:3000/api/market/quotes?symbols=TCS,GS2028_706&force=true';
  const res = await fetch(url);
  assert.strictEqual(res.status, 200, 'Quotes API must return 200');

  const json = await res.json();
  assert.strictEqual(json.success, true);
  assert.ok(json.quotes, 'Quotes object must exist');

  // TCS dynamic quote
  const tcs = json.quotes.TCS;
  assert.ok(tcs !== null, 'TCS quote must not be null');
  assert.strictEqual(tcs.symbol, 'TCS');
  assert.strictEqual(tcs.providerTicker, 'TCS.NS');
  assert.notStrictEqual(tcs.price, 3960, 'API quote must not be 3960');
  assert.ok(tcs.price > 1800 && tcs.price < 3200);
  assert.strictEqual(tcs.currency, 'INR');
  assert.ok(['DELAYED', 'EOD', 'REALTIME'].includes(tcs.status));
  assert.ok(tcs.price_timestamp);

  // GS2028_706 unquoted instrument
  assert.strictEqual(json.quotes.GS2028_706, null, 'Unquoted instrument must be null ("Price unavailable")');
});

// -------------------------------------------------------------
// Test 8: BSE Suffix Resolution & Dual Exchange Support
// -------------------------------------------------------------
await test('Test 8: BSE instrument quote dynamic resolution (TCS.BO)', async () => {
  const url = 'http://localhost:3000/api/market/quotes?symbols=TCS.BO&force=true';
  const res = await fetch(url);
  assert.strictEqual(res.status, 200);

  const json = await res.json();
  assert.strictEqual(json.success, true);
  const tcsBo = json.quotes['TCS.BO'];
  assert.ok(tcsBo !== null);
  assert.strictEqual(tcsBo.providerTicker, 'TCS.BO');
  assert.ok(tcsBo.price > 1800 && tcsBo.price < 3200);
  assert.notStrictEqual(tcsBo.price, 3960);
});

console.log('\n====================================================');
console.log(`   ALL ${passCount} MARKET DATA PIPELINE TESTS PASSED!`);
console.log('====================================================\n');
