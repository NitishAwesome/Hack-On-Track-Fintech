// ============================================================
// FINOVA — INVESTMENT EXPLORER UX & DEDICATED STOCK ROUTING VERIFICATION
// scripts/verify-stock-detail-routing.mjs
// ============================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  getRecentlyViewed,
  addRecentlyViewed,
  removeRecentlyViewed,
  clearRecentlyViewed,
} from '../lib/market/recentlyViewed.ts';
import { isIndianMarketOpenNow } from '../lib/hooks/useAutoQuotePoller.ts';
import { EXPANDED_NSE_STOCKS } from '../lib/market/stockCatalog.ts';

// Mock localStorage for node environment
class MockLocalStorage {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return this.store[key] || null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

globalThis.localStorage = new MockLocalStorage();
globalThis.window = {
  dispatchEvent: () => true,
};
globalThis.CustomEvent = class CustomEvent {
  constructor(name, opts) {
    this.name = name;
    this.detail = opts?.detail;
  }
};

test('1. RECENTLY VIEWED STORAGE: ADD, DEDUPLICATE, MAX LIMIT, ORDER', () => {
  clearRecentlyViewed();
  assert.strictEqual(getRecentlyViewed().length, 0, 'Initially empty');

  // Add 1st stock
  addRecentlyViewed({ symbol: 'RELIANCE', name: 'Reliance Industries Ltd' });
  let list = getRecentlyViewed();
  assert.strictEqual(list.length, 1);
  assert.strictEqual(list[0].symbol, 'RELIANCE');

  // Add 2nd stock
  addRecentlyViewed({ symbol: 'TCS', name: 'Tata Consultancy Services' });
  list = getRecentlyViewed();
  assert.strictEqual(list.length, 2);
  assert.strictEqual(list[0].symbol, 'TCS', 'Most recent must appear first');
  assert.strictEqual(list[1].symbol, 'RELIANCE');

  // Re-add 1st stock (re-bump recency)
  addRecentlyViewed({ symbol: 'RELIANCE', name: 'Reliance Industries Ltd' });
  list = getRecentlyViewed();
  assert.strictEqual(list.length, 2, 'Must not duplicate RELIANCE');
  assert.strictEqual(list[0].symbol, 'RELIANCE', 'RELIANCE must move to index 0');
  assert.strictEqual(list[1].symbol, 'TCS');

  // Test removeRecentlyViewed
  removeRecentlyViewed('TCS');
  list = getRecentlyViewed();
  assert.strictEqual(list.length, 1);
  assert.strictEqual(list[0].symbol, 'RELIANCE');

  // Test max 8 entries limit
  const testSymbols = ['INFY', 'HDFCBANK', 'ICICIBANK', 'ITC', 'SBIN', 'LT', 'BHARTIARTL', 'MARUTI'];
  for (const sym of testSymbols) {
    addRecentlyViewed({ symbol: sym });
  }
  list = getRecentlyViewed();
  assert.strictEqual(list.length, 8, 'Must enforce maximum 8 entries');
  assert.strictEqual(list[0].symbol, 'MARUTI', 'Last added must be top');
});

test('2. DEDICATED STOCK ROUTE & FILE ARCHITECTURE', () => {
  const stockRoutePath = path.resolve('./app/(dashboard)/explore/stocks/[symbol]/page.tsx');
  const clientPath = path.resolve('./app/(dashboard)/explore/stocks/[symbol]/DedicatedStockDetailClient.tsx');
  
  assert.ok(fs.existsSync(stockRoutePath), 'Dedicated route page.tsx must exist');
  assert.ok(fs.existsSync(clientPath), 'DedicatedStockDetailClient.tsx must exist');

  const routeContent = fs.readFileSync(stockRoutePath, 'utf-8');
  assert.ok(routeContent.includes('DedicatedStockDetailClient'), 'Page must render DedicatedStockDetailClient');
  assert.ok(routeContent.includes('generateMetadata'), 'Page must generate SEO metadata');

  const clientContent = fs.readFileSync(clientPath, 'utf-8');
  assert.ok(clientContent.includes('addRecentlyViewed'), 'Client must register viewed stock');
  assert.ok(clientContent.includes('useAutoQuotePoller'), 'Client must use auto-quote poller');
  assert.ok(clientContent.includes('InteractiveStockChart'), 'Client must render large stock chart');
  assert.ok(clientContent.includes('PriceRangeBar'), 'Client must render day & 52-week range bars');
  assert.ok(clientContent.includes('CompanyOverviewCard'), 'Client must render company fundamentals');
  assert.ok(clientContent.includes('StockNewsSection'), 'Client must render stock news');
  assert.ok(clientContent.includes('StockCrossFeatureLinks'), 'Client must render cross-feature actions');
});

test('3. EXPLORER HOMEPAGE ORDER & CLEAN DISCOVERY FLOW', () => {
  const hubContent = fs.readFileSync(path.resolve('./components/explorer/InvestmentExplorerHub.tsx'), 'utf-8');
  
  // Verify order in component rendering
  const indexPos = hubContent.indexOf('<MarketIndexCards');
  const recentPos = hubContent.indexOf('<RecentlyViewedStocks');
  const moverPos = hubContent.indexOf('<TrackedMoversSection');

  assert.ok(indexPos !== -1, 'Must contain MarketIndexCards');
  assert.ok(recentPos !== -1, 'Must contain RecentlyViewedStocks');
  assert.ok(moverPos !== -1, 'Must contain TrackedMoversSection');

  assert.ok(indexPos < recentPos, 'Major Indices must appear before Recently Viewed');
  assert.ok(recentPos < moverPos, 'Recently Viewed must appear before Market Movers');

  // Verify homepage does NOT embed the detailed chart/overview anymore
  assert.ok(!hubContent.includes('<InteractiveStockChart'), 'Homepage must NOT embed InteractiveStockChart');
  assert.ok(!hubContent.includes('<CompanyOverviewCard'), 'Homepage must NOT embed CompanyOverviewCard');
  assert.ok(!hubContent.includes('<PriceRangeBar'), 'Homepage must NOT embed PriceRangeBar');

  // Verify navigation calls router.push('/explore/stocks/...')
  assert.ok(hubContent.includes('/explore/stocks/'), 'Must navigate to dedicated stock route');
});

test('4. AUTO-UPDATING POLLER & INDIAN MARKET HOURS DETERMINATION', () => {
  // Test Monday at 11:30 AM IST (Trading hours)
  const mondayTrading = new Date('2026-10-12T06:00:00Z'); // 11:30 AM IST
  const isMondayOpen = isIndianMarketOpenNow(mondayTrading);
  assert.strictEqual(isMondayOpen, true, 'Monday 11:30 AM IST should be market open');

  // Test Sunday (Weekend)
  const sunday = new Date('2026-10-11T06:00:00Z');
  const isSundayOpen = isIndianMarketOpenNow(sunday);
  assert.strictEqual(isSundayOpen, false, 'Sunday should be market closed');

  // Test Monday at 8:00 PM IST (Night)
  const mondayNight = new Date('2026-10-12T15:00:00Z'); // 20:30 IST
  const isNightOpen = isIndianMarketOpenNow(mondayNight);
  assert.strictEqual(isNightOpen, false, 'Night time should be market closed');
});

test('5. ZERO USER-FACING VERSION 2.0 LABELS IN NAVIGATION AND HEADINGS', () => {
  const sidebarContent = fs.readFileSync(path.resolve('./components/layout/Sidebar.tsx'), 'utf-8');
  assert.ok(!sidebarContent.includes('X-Ray 2.0'));
  assert.ok(!sidebarContent.includes('Risk Radar 2.0'));
  assert.ok(!sidebarContent.includes('Future Lab 2.0'));
  assert.ok(!sidebarContent.includes('Explorer 2.0'));
  assert.ok(!sidebarContent.includes('Intelligence 2.0'));

  const explorePageContent = fs.readFileSync(path.resolve('./app/(dashboard)/explore/page.tsx'), 'utf-8');
  assert.ok(!explorePageContent.includes('Explorer 2.0'));
  assert.ok(explorePageContent.includes('Investment Explorer'));
});

test('6. STOCK CATALOG INTEGRITY FOR DEDICATED ROUTES', () => {
  assert.ok(EXPANDED_NSE_STOCKS.length >= 40, 'Stock catalog must have at least 40 top equities');
  const reliance = EXPANDED_NSE_STOCKS.find(s => s.symbol === 'RELIANCE');
  const tcs = EXPANDED_NSE_STOCKS.find(s => s.symbol === 'TCS');
  const infy = EXPANDED_NSE_STOCKS.find(s => s.symbol === 'INFY');
  
  assert.ok(reliance && reliance.sector === 'Energy');
  assert.ok(tcs && tcs.sector === 'Information Technology');
  assert.ok(infy && infy.sector === 'Information Technology');
});

test('7. URGENT FIX VERIFICATION: AUTO-REFRESH 2-3S, CLOSED MARKET PAUSE, BACKOFF & TRUTHFUL LABELS', () => {
  const marketDataCode = fs.readFileSync(path.resolve('./lib/services/marketData.ts'), 'utf-8');
  const pollerCode = fs.readFileSync(path.resolve('./lib/hooks/useAutoQuotePoller.ts'), 'utf-8');
  const indexCardsCode = fs.readFileSync(path.resolve('./components/explorer/MarketIndexCards.tsx'), 'utf-8');
  const detailClientCode = fs.readFileSync(path.resolve('./app/(dashboard)/explore/stocks/[symbol]/DedicatedStockDetailClient.tsx'), 'utf-8');

  // 1. Server cache TTL is 2.5s (2500ms) for open market, 15s for error/negative cache
  assert.ok(marketDataCode.includes('CACHE_TTL_OPEN_MS = 2500'), 'Server open market cache TTL must be 2500ms');
  assert.ok(marketDataCode.includes('CACHE_TTL_NEGATIVE_MS = 15 * 1000'), 'Negative/error cache TTL must be 15s');

  // 2. Poller hook default interval is 2500ms (2–3 seconds)
  assert.ok(pollerCode.includes('intervalMs = 2500'), 'useAutoQuotePoller must default intervalMs to 2500ms');

  // 3. Poller stops when market is closed
  assert.ok(pollerCode.includes('if (!isIndianMarketOpenNow())'), 'useAutoQuotePoller must check isIndianMarketOpenNow');

  // 4. Poller pauses when document is hidden
  assert.ok(pollerCode.includes("document.visibilityState === 'hidden'"), 'useAutoQuotePoller must pause when tab hidden');

  // 5. Exponential backoff on error
  assert.ok(pollerCode.includes('backoffCountRef.current'), 'useAutoQuotePoller must have error backoff');
  assert.ok(indexCardsCode.includes('backoffCountRef.current'), 'MarketIndexCards must have error backoff');

  // 6. Indices cards poll at 2500ms when open and stop when closed
  assert.ok(indexCardsCode.includes('delay = 2500'), 'MarketIndexCards delay must be 2500ms');
  assert.ok(indexCardsCode.includes("marketStatus && marketStatus !== 'OPEN'"), 'MarketIndexCards must stop when market closed');

  // 7. Dedicated detail client uses 2500ms interval
  assert.ok(detailClientCode.includes('intervalMs: 2500'), 'Dedicated stock client must use 2500ms interval');

  // 8. Truthful labeling - no unverified "Live" claim
  assert.ok(!pollerCode.includes("'Live'"), 'Poller must not label quote Live');
  assert.ok(!detailClientCode.includes("'Live'"), 'Detail client must not label quote Live');
  assert.ok(pollerCode.includes('Auto-updating (2–3s)'), 'Poller must support Auto-updating (2-3s)');
});

