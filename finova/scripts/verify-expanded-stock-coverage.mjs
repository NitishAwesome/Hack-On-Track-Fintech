// ============================================================
// FINOVA — Automated Regression Suite: Expanded Stock Coverage
// Tests dynamic catalog search, quote fetching, previous close
// derivation, and preservation of existing portfolio math.
// ============================================================

import assert from 'node:assert';
import test from 'node:test';
import { resolveYahooFinanceSymbol } from '../lib/market/symbolMapper.ts';
import { PortfolioStorage, GLOBAL_SEED_INSTRUMENTS } from '../lib/storage/portfolioStorage.ts';
import { EXPANDED_NSE_STOCKS } from '../lib/market/stockCatalog.ts';
import { YFinanceMarketDataProvider } from '../lib/market/providers/yfinanceProvider.ts';
import { enrichHolding } from '../lib/calculations/portfolio.ts';

const provider = new YFinanceMarketDataProvider();

test('Suite 1: Expanded Stock Catalog Coverage (>100 NSE Equities across sectors)', () => {
  // 1. Verify count
  assert(EXPANDED_NSE_STOCKS.length >= 100, `Expected at least 100 stocks, got ${EXPANDED_NSE_STOCKS.length}`);
  assert(GLOBAL_SEED_INSTRUMENTS.length >= 110, `Expected at least 110 global instruments, got ${GLOBAL_SEED_INSTRUMENTS.length}`);

  // 2. Verify key sectors are represented
  const sectors = new Set(EXPANDED_NSE_STOCKS.map((s) => s.sector));
  const expectedSectors = [
    'Information Technology',
    'Financial Services',
    'Energy',
    'Automobile',
    'Healthcare',
    'Fast Moving Consumer Goods',
    'Metals & Mining',
    'Capital Goods',
    'Construction',
    'Chemicals',
  ];

  for (const expSec of expectedSectors) {
    assert(sectors.has(expSec), `Expected sector "${expSec}" to be present in catalog`);
  }

  // 3. Verify specific major companies
  const expectedSymbols = [
    'TITAN', 'ITC', 'SBIN', 'BHARTIARTL', 'LT', 'MARUTI',
    'SUNPHARMA', 'HAL', 'BEL', 'ZOMATO', 'TRENT', 'TATAMOTORS',
  ];

  for (const sym of expectedSymbols) {
    const found = EXPANDED_NSE_STOCKS.find((s) => s.symbol === sym);
    assert(found, `Expected stock ${sym} in expanded catalog`);
    assert(found.isin.startsWith('INE'), `Expected valid ISIN for ${sym}, got ${found.isin}`);
  }
});

test('Suite 2: Dynamic Stock Search by Symbol', () => {
  // Test symbol search via PortfolioStorage
  const titanMatches = PortfolioStorage.getInstruments('TITAN');
  assert(titanMatches.length >= 1, 'Should find TITAN by exact symbol');
  assert.strictEqual(titanMatches[0].symbol, 'TITAN');

  // Case-insensitivity
  const lowerMatches = PortfolioStorage.getInstruments('itc');
  assert(lowerMatches.length >= 1, 'Should find ITC by lowercase symbol');
  assert.strictEqual(lowerMatches[0].symbol, 'ITC');

  // Substring match
  const bankMatches = PortfolioStorage.getInstruments('BANK');
  assert(bankMatches.length >= 3, 'Should find multiple bank instruments matching "BANK"');
});

test('Suite 3: Dynamic Stock Search by Company Name', () => {
  // Search by name
  const sbiByName = PortfolioStorage.getInstruments('State Bank');
  assert(sbiByName.some((i) => i.symbol === 'SBIN'), 'Searching "State Bank" should find SBIN');

  const titanByName = PortfolioStorage.getInstruments('Titan Company');
  assert(titanByName.some((i) => i.symbol === 'TITAN'), 'Searching "Titan Company" should find TITAN');

  const halByName = PortfolioStorage.getInstruments('Hindustan Aeronautics');
  assert(halByName.some((i) => i.symbol === 'HAL'), 'Searching "Hindustan Aeronautics" should find HAL');
});

test('Suite 4: Dynamic Stock Search by ISIN', () => {
  // TITAN ISIN: INE280A01028
  const titanByIsin = PortfolioStorage.getInstruments('INE280A01028');
  assert(titanByIsin.length >= 1, 'Should find instrument by ISIN');
  assert.strictEqual(titanByIsin[0].symbol, 'TITAN');

  // ITC ISIN: INE154A01025
  const itcByIsin = PortfolioStorage.getInstruments('INE154A01025');
  assert(itcByIsin.length >= 1, 'Should find instrument by ISIN');
  assert.strictEqual(itcByIsin[0].symbol, 'ITC');
});

test('Suite 5: Exchange & Provider Symbol Mapping', () => {
  assert.strictEqual(resolveYahooFinanceSymbol('TITAN', 'NSE'), 'TITAN.NS');
  assert.strictEqual(resolveYahooFinanceSymbol('ITC', 'NSE'), 'ITC.NS');
  assert.strictEqual(resolveYahooFinanceSymbol('SBIN', 'NSE'), 'SBIN.NS');
  assert.strictEqual(resolveYahooFinanceSymbol('HAL', 'NSE'), 'HAL.NS');
  assert.strictEqual(resolveYahooFinanceSymbol('ZOMATO', 'NSE'), 'ZOMATO.NS');
  assert.strictEqual(resolveYahooFinanceSymbol('RELIANCE', 'NSE'), 'RELIANCE.NS');
  assert.strictEqual(resolveYahooFinanceSymbol('TITAN', 'BSE'), 'TITAN.BO');
});

test('Suite 6: Dynamic Price Fetching & Accurate Change Calculation for New Stocks', async () => {
  // Fetch live quote for TITAN
  const titanQuote = await provider.fetchQuote('TITAN', 'NSE');
  assert(titanQuote !== null, 'TITAN quote should be successfully fetched');
  assert.strictEqual(titanQuote.symbol, 'TITAN');
  assert.strictEqual(titanQuote.providerTicker, 'TITAN.NS');
  assert(titanQuote.price > 0, `Expected price > 0, got ${titanQuote.price}`);
  assert(titanQuote.previousClose !== null && titanQuote.previousClose > 0, 'Previous close must be present and positive');
  assert(titanQuote.day_change !== null, 'Day change must be computed');
  assert(titanQuote.day_change_pct !== null, 'Day change percentage must be computed');

  // Verify mathematical relationship: change = currentPrice - previousClose
  const expectedChange = Math.round((titanQuote.price - titanQuote.previousClose) * 100) / 100;
  assert.strictEqual(
    titanQuote.day_change,
    expectedChange,
    `Day change (${titanQuote.day_change}) must strictly equal currentPrice (${titanQuote.price}) - previousClose (${titanQuote.previousClose})`
  );

  const expectedPct = Math.round(((titanQuote.price - titanQuote.previousClose) / titanQuote.previousClose) * 10000) / 100;
  assert.strictEqual(
    titanQuote.day_change_pct,
    expectedPct,
    `Day change percentage (${titanQuote.day_change_pct}) must match calculation (${expectedPct})`
  );

  assert(['LIVE', 'DELAYED', 'EOD'].includes(titanQuote.status), `Status must be valid, got ${titanQuote.status}`);
  assert.strictEqual(titanQuote.source, 'Yahoo Finance / yfinance');
});

test('Suite 7: Missing or Stale Quotes Do NOT Fabricate Fake Prices', async () => {
  // Completely invalid symbol
  const badQuote = await provider.fetchQuote('FAKE_DELISTED_123', 'NSE');
  assert.strictEqual(badQuote, null, 'Bad symbol must return null, never invent numbers');

  // Empty symbol
  const emptyQuote = await provider.fetchQuote('', 'NSE');
  assert.strictEqual(emptyQuote, null, 'Empty symbol must return null');
});

test('Suite 8: Zero Static Prices Policy for Expanded Catalog', () => {
  // No fake prices in seed prices for newly added stocks
  assert.strictEqual(
    PortfolioStorage.getMarketPrice('TITAN', false),
    null,
    'TITAN must NOT have a hardcoded fallback price'
  );
  assert.strictEqual(
    PortfolioStorage.getMarketPrice('ITC', false),
    null,
    'ITC must NOT have a hardcoded fallback price'
  );
  assert.strictEqual(
    PortfolioStorage.getMarketPrice('HAL', false),
    null,
    'HAL must NOT have a hardcoded fallback price'
  );
});

test('Suite 9: Preservation of Existing Holdings & Portfolio Calculations', () => {
  // Verify that the initial 14 seed instruments exist intact
  const baseSymbols = ['RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK', 'EMBASSY', 'PGINVIT', 'GS2033_718', 'NIFTYBEES'];
  for (const sym of baseSymbols) {
    const inst = GLOBAL_SEED_INSTRUMENTS.find((i) => i.symbol === sym);
    assert(inst, `Original instrument ${sym} must still exist`);
  }

  // Verify enrichHolding calculations
  const holding = {
    id: 'test-h-1',
    user_id: 'u1',
    broker_account_id: 'b1',
    instrument_id: 'inst-nse-titan-117',
    symbol: 'TITAN',
    name: 'Titan Company Ltd',
    asset_class: 'equity',
    exchange: 'NSE',
    quantity: 10,
    avg_buy_price: 4000,
    current_price: 4410,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const enriched = enrichHolding(holding);
  assert.strictEqual(enriched.invested_value, 40000); // 10 * 4000
  assert.strictEqual(enriched.current_value, 44100);    // 10 * 4410
  assert.strictEqual(enriched.absolute_return, 4100);    // 44100 - 40000
  assert.strictEqual(enriched.absolute_return_pct, 10.25); // (4100 / 40000) * 100
});

test('Suite 10: Live HTTP API Endpoints Contract', async () => {
  // 1. /api/instruments?q=titan
  const instRes = await fetch('http://localhost:3000/api/instruments?q=titan');
  assert(instRes.ok, '/api/instruments should respond with 200 OK');
  const instData = await instRes.json();
  assert(instData.instruments.length >= 1, 'Should find TITAN via /api/instruments');
  assert.strictEqual(instData.instruments[0].symbol, 'TITAN');

  // 2. /api/market/quotes?symbols=TITAN,ITC
  const quoteRes = await fetch('http://localhost:3000/api/market/quotes?symbols=TITAN,ITC');
  assert(quoteRes.ok, '/api/market/quotes should respond with 200 OK');
  const quoteData = await quoteRes.json();
  assert(quoteData.success, 'Quotes response should be successful');
  assert(quoteData.quotes.TITAN !== null, 'TITAN quote should be returned');
  assert(quoteData.quotes.ITC !== null, 'ITC quote should be returned');
  assert(quoteData.quotes.TITAN.price > 0, 'TITAN price must be positive');
  assert(quoteData.quotes.TITAN.previousClose > 0, 'TITAN previous close must be positive');
});
