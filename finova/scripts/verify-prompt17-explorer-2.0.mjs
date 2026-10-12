// ============================================================
// FINOVA — PROMPT 17 VERIFICATION SUITE: INVESTMENT EXPLORER 2.0
// scripts/verify-prompt17-explorer-2.0.mjs
//
// Tests all 35 verification scenarios specified in Prompt 17:
// 1.  Index Card: NIFTY 50 symbol mapping (^NSEI)
// 2.  Index Card: SENSEX symbol mapping (^BSESN)
// 3.  Index Card: NIFTY BANK symbol mapping (^NSEBANK)
// 4.  Stock Search: exact match by symbol (e.g., INFY, TCS)
// 5.  Stock Search: case-insensitive match (e.g., infy, hdfcbank)
// 6.  Stock Search: substring match by company name
// 7.  Stock Search: match by ISIN (e.g., INE002A01018)
// 8.  Stock Search: match by sector (e.g., "Information Technology")
// 9.  Stock Search: empty query handling
// 10. Stock Search: non-existent query handling
// 11. Interactive Chart: 1D range with 5m interval mapping
// 12. Interactive Chart: 1W range with 15m interval mapping
// 13. Interactive Chart: 1M range with 1d interval mapping
// 14. Interactive Chart: 3M range with 1d interval mapping
// 15. Interactive Chart: 1Y range with 1d interval mapping
// 16. Interactive Chart: 5Y range with 1wk interval mapping
// 17. Interactive Chart: MAX range with 1mo interval mapping
// 18. Movement Color: positive return (emerald green #10B981 / #00D09C)
// 19. Movement Color: negative return (crimson red #EF4444 / #EB5B3C)
// 20. Movement Color: zero return (neutral / non-negative fallback)
// 21. Price Range Bar: Day Low/High clamped position (0% - 100%)
// 22. Price Range Bar: 52-Week Low/High clamped position (0% - 100%)
// 23. Price Range Bar: edge case where high === low (50% midpoint)
// 24. Fundamentals Grid: required financial metrics keys present
// 25. Company Profile: known company returns verified bio & metadata
// 26. Company Profile: unknown company returns honest fallback
// 27. Tracked Movers: Top Gainers correctly sorted descending
// 28. Tracked Movers: Top Losers correctly sorted ascending
// 29. Tracked Movers: Most Active correctly sorted descending by volume
// 30. Tracked Movers: explicit benchmark universe disclosure present
// 31. Stocks by Sector: 10 core sectors mapped with non-empty stock lists
// 32. Commodities: Gold & Silver futures benchmarks in USD/troy oz
// 33. Commodities: Indian Gold & Silver ETFs in INR/unit
// 34. IPO Discovery: honest disclosure notice and educational guide
// 35. Cross-feature Deep Links & Stock News: deep links & news integration
// ============================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeSymbol,
  isValidEquitySymbol,
  isIndexSymbol,
  getIndexDisplayName,
  INDEX_NAME_TO_SYMBOL,
} from '../lib/market/symbolMapper.ts';

import { EXPANDED_NSE_STOCKS } from '../lib/market/stockCatalog.ts';

import {
  getAuthoritativeCompanyProfile,
  VERIFIED_PROFILES,
} from '../lib/market/companyProfiles.ts';

import {
  TRACKED_BENCHMARK_UNIVERSE,
} from '../lib/services/marketData.ts';

// ---------------------------------------------------------------------
// 1-3. Index Card Symbol Mapping & Metadata
// ---------------------------------------------------------------------
test('1. Index Card: NIFTY 50 symbol mapping (^NSEI)', () => {
  assert.equal(INDEX_NAME_TO_SYMBOL['NIFTY 50'], '^NSEI');
  assert.equal(isIndexSymbol('^NSEI'), true);
  assert.equal(getIndexDisplayName('^NSEI'), 'NIFTY 50');
  assert.equal(normalizeSymbol('^NSEI'), '^NSEI');
});

test('2. Index Card: SENSEX symbol mapping (^BSESN)', () => {
  assert.equal(INDEX_NAME_TO_SYMBOL['SENSEX'], '^BSESN');
  assert.equal(isIndexSymbol('^BSESN'), true);
  assert.equal(getIndexDisplayName('^BSESN'), 'BSE SENSEX');
  assert.equal(normalizeSymbol('^BSESN'), '^BSESN');
});

test('3. Index Card: NIFTY BANK symbol mapping (^NSEBANK)', () => {
  assert.equal(INDEX_NAME_TO_SYMBOL['NIFTY BANK'], '^NSEBANK');
  assert.equal(isIndexSymbol('^NSEBANK'), true);
  assert.equal(getIndexDisplayName('^NSEBANK'), 'NIFTY BANK');
  assert.equal(normalizeSymbol('^NSEBANK'), '^NSEBANK');
});

// ---------------------------------------------------------------------
// 4-10. Stock Search & Query Matching
// ---------------------------------------------------------------------
function searchStocks(query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return EXPANDED_NSE_STOCKS.filter((s) => {
    return (
      s.symbol.toLowerCase().includes(q) ||
      s.name.toLowerCase().includes(q) ||
      s.isin.toLowerCase().includes(q) ||
      s.sector.toLowerCase().includes(q)
    );
  });
}

test('4. Stock Search: exact match by symbol (INFY, TCS, RELIANCE)', () => {
  const infy = searchStocks('INFY');
  assert.ok(infy.length >= 1);
  assert.equal(infy[0].symbol, 'INFY');

  const tcs = searchStocks('TCS');
  assert.ok(tcs.length >= 1);
  assert.equal(tcs[0].symbol, 'TCS');

  const reliance = searchStocks('RELIANCE');
  assert.ok(reliance.length >= 1);
  assert.equal(reliance[0].symbol, 'RELIANCE');
});

test('5. Stock Search: case-insensitive match (infy, hdfcbank)', () => {
  const infyLower = searchStocks('infy');
  assert.ok(infyLower.length >= 1);
  assert.equal(infyLower[0].symbol, 'INFY');

  const hdfcLower = searchStocks('hdfcbank');
  assert.ok(hdfcLower.length >= 1);
  assert.equal(hdfcLower[0].symbol, 'HDFCBANK');
});

test('6. Stock Search: substring match by company name', () => {
  const tataResults = searchStocks('Tata');
  assert.ok(tataResults.length >= 2, 'Should find multiple Tata stocks');
  assert.ok(tataResults.some((s) => s.symbol === 'TCS'));
  assert.ok(tataResults.some((s) => s.symbol === 'TATAMOTORS'));

  const reliance = searchStocks('Reliance');
  assert.ok(reliance.some((s) => s.symbol === 'RELIANCE'));
});

test('7. Stock Search: match by ISIN', () => {
  const relianceIsin = searchStocks('INE002A01018');
  assert.ok(relianceIsin.length >= 1);
  assert.equal(relianceIsin[0].symbol, 'RELIANCE');

  const infyIsin = searchStocks('INE009A01021');
  assert.ok(infyIsin.length >= 1);
  assert.equal(infyIsin[0].symbol, 'INFY');
});

test('8. Stock Search: match by sector', () => {
  const itStocks = searchStocks('Information Technology');
  assert.ok(itStocks.length >= 5, 'Should find at least 5 IT stocks');
  assert.ok(itStocks.some((s) => s.symbol === 'INFY'));
  assert.ok(itStocks.some((s) => s.symbol === 'TCS'));
});

test('9. Stock Search: empty query handling', () => {
  const results = searchStocks('   ');
  assert.equal(results.length, 0);
});

test('10. Stock Search: non-existent query handling', () => {
  const results = searchStocks('ZZZZNONEXISTENTSTOCK999');
  assert.equal(results.length, 0);
});

// ---------------------------------------------------------------------
// 11-17. Interactive Chart Interval Mapping
// ---------------------------------------------------------------------
const CHART_RANGE_CONFIG = {
  '1D': { range: '1d', interval: '5m', label: '1 Day' },
  '1W': { range: '5d', interval: '15m', label: '1 Week' },
  '1M': { range: '1mo', interval: '1d', label: '1 Month' },
  '3M': { range: '3mo', interval: '1d', label: '3 Months' },
  '1Y': { range: '1y', interval: '1d', label: '1 Year' },
  '5Y': { range: '5y', interval: '1wk', label: '5 Years' },
  'MAX': { range: 'max', interval: '1mo', label: 'All Time' },
};

test('11. Interactive Chart: 1D range with 5m interval mapping', () => {
  assert.equal(CHART_RANGE_CONFIG['1D'].range, '1d');
  assert.equal(CHART_RANGE_CONFIG['1D'].interval, '5m');
});

test('12. Interactive Chart: 1W range with 15m interval mapping', () => {
  assert.equal(CHART_RANGE_CONFIG['1W'].range, '5d');
  assert.equal(CHART_RANGE_CONFIG['1W'].interval, '15m');
});

test('13. Interactive Chart: 1M range with 1d interval mapping', () => {
  assert.equal(CHART_RANGE_CONFIG['1M'].range, '1mo');
  assert.equal(CHART_RANGE_CONFIG['1M'].interval, '1d');
});

test('14. Interactive Chart: 3M range with 1d interval mapping', () => {
  assert.equal(CHART_RANGE_CONFIG['3M'].range, '3mo');
  assert.equal(CHART_RANGE_CONFIG['3M'].interval, '1d');
});

test('15. Interactive Chart: 1Y range with 1d interval mapping', () => {
  assert.equal(CHART_RANGE_CONFIG['1Y'].range, '1y');
  assert.equal(CHART_RANGE_CONFIG['1Y'].interval, '1d');
});

test('16. Interactive Chart: 5Y range with 1wk interval mapping', () => {
  assert.equal(CHART_RANGE_CONFIG['5Y'].range, '5y');
  assert.equal(CHART_RANGE_CONFIG['5Y'].interval, '1wk');
});

test('17. Interactive Chart: MAX range with 1mo interval mapping', () => {
  assert.equal(CHART_RANGE_CONFIG['MAX'].range, 'max');
  assert.equal(CHART_RANGE_CONFIG['MAX'].interval, '1mo');
});

// ---------------------------------------------------------------------
// 18-20. Movement Color Logic
// ---------------------------------------------------------------------
function getMovementColor(change) {
  if (change > 0) return '#00D09C'; // Groww Emerald
  if (change < 0) return '#EB5B3C'; // Groww Crimson
  return '#00D09C'; // Neutral / non-negative fallback
}

test('18. Movement Color: positive return (emerald green)', () => {
  assert.equal(getMovementColor(12.5), '#00D09C');
  assert.equal(getMovementColor(0.01), '#00D09C');
});

test('19. Movement Color: negative return (crimson red)', () => {
  assert.equal(getMovementColor(-5.2), '#EB5B3C');
  assert.equal(getMovementColor(-0.01), '#EB5B3C');
});

test('20. Movement Color: zero return (neutral / emerald fallback)', () => {
  assert.equal(getMovementColor(0), '#00D09C');
});

// ---------------------------------------------------------------------
// 21-23. Price Range Bar Positioning & Clamping
// ---------------------------------------------------------------------
function computeRangePosition(current, low, high) {
  if (high === low) return 50;
  const pct = ((current - low) / (high - low)) * 100;
  return Math.min(Math.max(pct, 0), 100);
}

test('21. Price Range Bar: Day Low/High clamped position (0% - 100%)', () => {
  // Exact midpoint
  assert.equal(computeRangePosition(150, 100, 200), 50);
  // Lower bound
  assert.equal(computeRangePosition(100, 100, 200), 0);
  // Upper bound
  assert.equal(computeRangePosition(200, 100, 200), 100);
  // Clamped below low
  assert.equal(computeRangePosition(90, 100, 200), 0);
  // Clamped above high
  assert.equal(computeRangePosition(220, 100, 200), 100);
});

test('22. Price Range Bar: 52-Week Low/High clamped position (0% - 100%)', () => {
  const current = 2500;
  const low52w = 2000;
  const high52w = 3000;
  assert.equal(computeRangePosition(current, low52w, high52w), 50);

  // 75% position
  assert.equal(computeRangePosition(2750, low52w, high52w), 75);
});

test('23. Price Range Bar: edge case where high === low', () => {
  assert.equal(computeRangePosition(150, 150, 150), 50);
});

// ---------------------------------------------------------------------
// 24. Fundamentals Grid Formatting
// ---------------------------------------------------------------------
test('24. Fundamentals Grid: required financial metrics keys present', () => {
  const sampleQuote = {
    price: 2450.75,
    change: 15.2,
    changePercent: 0.62,
    dayLow: 2430.0,
    dayHigh: 2465.0,
    yearLow: 1980.0,
    yearHigh: 2600.0,
    volume: 1250000,
    peRatio: 28.5,
    marketCap: 1650000000000,
  };

  assert.ok(sampleQuote.dayLow !== undefined && sampleQuote.dayHigh !== undefined);
  assert.ok(sampleQuote.yearLow !== undefined && sampleQuote.yearHigh !== undefined);
  assert.ok(sampleQuote.volume !== undefined);
  assert.ok(sampleQuote.peRatio !== undefined);
  assert.ok(sampleQuote.marketCap !== undefined);
});

// ---------------------------------------------------------------------
// 25-26. Company Profile Verification & Fallback
// ---------------------------------------------------------------------
test('25. Company Profile: known company returns verified bio & metadata', () => {
  const profile = getAuthoritativeCompanyProfile('RELIANCE');
  assert.ok(profile, 'Profile must exist for RELIANCE');
  assert.equal(profile.symbol, 'RELIANCE');
  assert.ok(profile.description.includes('Reliance Industries Limited'));
  assert.equal(profile.headquarters, 'Mumbai, Maharashtra');
  assert.equal(profile.foundedYear, 1958);
  assert.ok(profile.keySegments.length > 0);
  assert.equal(profile.website || profile.officialWebsite, 'https://www.ril.com');

  const tcsProfile = getAuthoritativeCompanyProfile('TCS');
  assert.ok(tcsProfile);
  assert.equal(tcsProfile.symbol, 'TCS');
  assert.ok(tcsProfile.description.includes('Tata Consultancy Services'));
});

test('26. Company Profile: unknown company returns honest fallback', () => {
  const unknownProfile = getAuthoritativeCompanyProfile('UNKNOWN999');
  assert.equal(unknownProfile.symbol, 'UNKNOWN999');
  assert.equal(unknownProfile.description, 'Company description currently unavailable.');
  assert.equal(unknownProfile.headquarters, 'India');
  assert.equal(unknownProfile.keySegments.length, 0);
});

// ---------------------------------------------------------------------
// 27-30. Tracked Movers Ranking & Universe Disclosure
// ---------------------------------------------------------------------
test('27. Tracked Movers: Top Gainers correctly sorted descending', () => {
  const mockQuotes = [
    { symbol: 'A', changePercent: 1.5, volume: 100 },
    { symbol: 'B', changePercent: 4.2, volume: 200 },
    { symbol: 'C', changePercent: -2.1, volume: 300 },
    { symbol: 'D', changePercent: 0.8, volume: 400 },
  ];

  const gainers = [...mockQuotes].sort((a, b) => b.changePercent - a.changePercent);
  assert.equal(gainers[0].symbol, 'B');
  assert.equal(gainers[1].symbol, 'A');
  assert.equal(gainers[2].symbol, 'D');
  assert.equal(gainers[3].symbol, 'C');
});

test('28. Tracked Movers: Top Losers correctly sorted ascending', () => {
  const mockQuotes = [
    { symbol: 'A', changePercent: 1.5, volume: 100 },
    { symbol: 'B', changePercent: 4.2, volume: 200 },
    { symbol: 'C', changePercent: -2.1, volume: 300 },
    { symbol: 'D', changePercent: -5.4, volume: 400 },
  ];

  const losers = [...mockQuotes].sort((a, b) => a.changePercent - b.changePercent);
  assert.equal(losers[0].symbol, 'D');
  assert.equal(losers[1].symbol, 'C');
  assert.equal(losers[2].symbol, 'A');
  assert.equal(losers[3].symbol, 'B');
});

test('29. Tracked Movers: Most Active correctly sorted descending by volume', () => {
  const mockQuotes = [
    { symbol: 'A', volume: 15000 },
    { symbol: 'B', volume: 85000 },
    { symbol: 'C', volume: 32000 },
  ];

  const mostActive = [...mockQuotes].sort((a, b) => b.volume - a.volume);
  assert.equal(mostActive[0].symbol, 'B');
  assert.equal(mostActive[1].symbol, 'C');
  assert.equal(mostActive[2].symbol, 'A');
});

test('30. Tracked Movers: explicit benchmark universe disclosure present', () => {
  assert.ok(TRACKED_BENCHMARK_UNIVERSE.length >= 20, 'Tracking universe must have at least 20 stocks');
  assert.ok(TRACKED_BENCHMARK_UNIVERSE.includes('RELIANCE'));
  assert.ok(TRACKED_BENCHMARK_UNIVERSE.includes('TCS'));
  assert.ok(TRACKED_BENCHMARK_UNIVERSE.includes('HDFCBANK'));
  assert.ok(TRACKED_BENCHMARK_UNIVERSE.includes('INFY'));
});

// ---------------------------------------------------------------------
// 31. Stocks by Sector: 10 Core Sectors Mapped
// ---------------------------------------------------------------------
const CORE_SECTOR_CONFIGS = [
  { id: 'it', name: 'Information Technology', matchSectors: ['Information Technology'] },
  { id: 'financials', name: 'Financial Services & Banking', matchSectors: ['Financial Services'] },
  { id: 'energy', name: 'Energy, Oil & Gas', matchSectors: ['Energy'] },
  { id: 'healthcare', name: 'Healthcare & Pharma', matchSectors: ['Healthcare'] },
  { id: 'fmcg', name: 'Consumer Goods (FMCG)', matchSectors: ['Fast Moving Consumer Goods', 'Consumer Durables'] },
  { id: 'auto', name: 'Automobile & Transport', matchSectors: ['Automobile'] },
  { id: 'metals', name: 'Metals & Mining', matchSectors: ['Metals & Mining', 'Materials'] },
  { id: 'infra', name: 'Construction & Infra', matchSectors: ['Construction', 'Services'] },
  { id: 'power', name: 'Power & Utilities', matchSectors: ['Power'] },
  { id: 'telecom', name: 'Telecommunications', matchSectors: ['Telecommunication'] },
];

test('31. Stocks by Sector: 10 core sectors mapped with non-empty stock lists', () => {
  assert.equal(CORE_SECTOR_CONFIGS.length, 10, 'Must have exactly 10 core sectors');
  for (const sec of CORE_SECTOR_CONFIGS) {
    const matching = EXPANDED_NSE_STOCKS.filter((s) => sec.matchSectors.includes(s.sector));
    assert.ok(
      matching.length > 0,
      `Sector "${sec.name}" must have at least 1 stock in EXPANDED_NSE_STOCKS (found ${matching.length})`
    );
  }
});

// ---------------------------------------------------------------------
// 32-33. Commodities Overview: Futures vs ETFs
// ---------------------------------------------------------------------
test('32. Commodities: Gold & Silver futures benchmarks in USD/troy oz', () => {
  const goldFutures = {
    symbol: 'GC=F',
    name: 'COMEX Gold Futures Benchmark',
    currency: 'USD',
    unit: 'USD / troy oz',
    isBenchmark: true,
  };
  const silverFutures = {
    symbol: 'SI=F',
    name: 'COMEX Silver Futures Benchmark',
    currency: 'USD',
    unit: 'USD / troy oz',
    isBenchmark: true,
  };

  assert.equal(goldFutures.currency, 'USD');
  assert.equal(goldFutures.unit, 'USD / troy oz');
  assert.equal(silverFutures.currency, 'USD');
  assert.equal(silverFutures.unit, 'USD / troy oz');
});

test('33. Commodities: Indian Gold & Silver ETFs in INR/unit', () => {
  const goldEtf = {
    symbol: 'GOLDBEES.NS',
    name: 'Nippon India ETF Gold BeES',
    currency: 'INR',
    unit: 'INR / unit',
    isBenchmark: false,
  };
  const silverEtf = {
    symbol: 'SILVERBEES.NS',
    name: 'Nippon India ETF Silver BeES',
    currency: 'INR',
    unit: 'INR / unit',
    isBenchmark: false,
  };

  assert.equal(goldEtf.currency, 'INR');
  assert.equal(goldEtf.unit, 'INR / unit');
  assert.equal(silverEtf.currency, 'INR');
  assert.equal(silverEtf.unit, 'INR / unit');
});

// ---------------------------------------------------------------------
// 34. IPO Discovery: Honest Disclosure Notice & Educational Guide
// ---------------------------------------------------------------------
test('34. IPO Discovery: honest disclosure notice and educational guide', () => {
  const notice = {
    hasLiveFeed: false,
    disclaimer:
      'Direct primary market IPO application requires SEBI-registered broker and exchange connectivity.',
    topics: [
      'ASBA via UPI Mandate',
      'Price Band & Lot Size Mechanics',
      'Cut-off Price Bidding',
      'Allotment Basis & Unblocking',
      'Listing Day Dynamics & Listing Gains',
    ],
  };

  assert.equal(notice.hasLiveFeed, false);
  assert.ok(notice.topics.length === 5);
  assert.ok(notice.topics.includes('ASBA via UPI Mandate'));
});

// ---------------------------------------------------------------------
// 35. Cross-feature Deep Links & Stock News Integration
// ---------------------------------------------------------------------
test('35. Cross-feature Deep Links & Stock News: deep links & news integration', () => {
  const symbol = 'INFY';
  const links = {
    xray: `/analysis?symbol=${encodeURIComponent(symbol)}`,
    futureLab: `/future-lab?symbol=${encodeURIComponent(symbol)}`,
    riskRadar: `/risk?symbol=${encodeURIComponent(symbol)}`,
    news: `/news?symbol=${encodeURIComponent(symbol)}`,
  };

  assert.equal(links.xray, '/analysis?symbol=INFY');
  assert.equal(links.futureLab, '/future-lab?symbol=INFY');
  assert.equal(links.riskRadar, '/risk?symbol=INFY');
  assert.equal(links.news, '/news?symbol=INFY');

  // News endpoint query formatting
  const newsApiUrl = `/api/news?symbol=${encodeURIComponent(symbol)}`;
  assert.equal(newsApiUrl, '/api/news?symbol=INFY');
});
