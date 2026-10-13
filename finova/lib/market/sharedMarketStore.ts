'use client';

// ============================================================
// FINOVA — Shared Canonical Market Data Store & Poller
// lib/market/sharedMarketStore.ts
//
// Single Client Source of Truth for:
// 1. Major Indian Indices (NIFTY 50, SENSEX, NIFTY BANK)
// 2. Individual Stock Quotes across FINOVA (Explorer, Navbar, Stock Detail, Browse)
//
// Guarantees:
// - Exact same price, change, % change and timestamp everywhere in FINOVA.
// - Single shared poller during open market hours (2–3 seconds).
// - Complete stop of frequent polling when market is closed.
// - Immediate pause when tab is hidden (document.visibilityState === 'hidden').
// - In-flight deduplication & mutex locking (never duplicate requests).
// - Exponential backoff on rate limits or network errors.
// - No countdown UI text: "Updating…" during refresh, "Updated just now" upon completion.
// ============================================================

import { useEffect, useCallback, useSyncExternalStore } from 'react';
import type { MarketDataResponse, MarketIndex, MarketStatus } from '@/types/market';
import type { MarketQuote } from '@/lib/services/marketData';
import { isIndianMarketOpenNow } from '@/lib/hooks/useAutoQuotePoller';

// ============================================================
// 1. Symbol Normalization Helpers
// ============================================================

const INDEX_ALIASES: Record<string, string> = {
  '^NSEI': 'NIFTY50',
  'NIFTY 50': 'NIFTY50',
  'NIFTY50': 'NIFTY50',
  '^BSESN': 'SENSEX',
  'SENSEX': 'SENSEX',
  '^NSEBANK': 'BANKNIFTY',
  'NIFTYBANK': 'BANKNIFTY',
  'NIFTY BANK': 'BANKNIFTY',
  'BANKNIFTY': 'BANKNIFTY',
};

export function canonicalIndexSymbol(sym: string): string {
  const upper = (sym || '').trim().toUpperCase();
  return INDEX_ALIASES[upper] || upper;
}

// ============================================================
// 2. Singleton In-Memory State
// ============================================================

interface SharedMarketState {
  // Indices
  indicesResponse: MarketDataResponse | null;
  isRefreshingIndices: boolean;
  indicesError: string | null;
  lastIndicesFetchTime: Date | null;

  // Stock Quotes Map (canonicalSymbol -> MarketQuote)
  quotesMap: Map<string, MarketQuote>;
  isRefreshingQuotes: boolean;
  quotesError: string | null;
  lastQuotesFetchTime: Date | null;

  // Global Market Status
  marketStatus: MarketStatus;
  marketStatusLabel: string;
}

const state: SharedMarketState = {
  indicesResponse: null,
  isRefreshingIndices: false,
  indicesError: null,
  lastIndicesFetchTime: null,

  quotesMap: new Map<string, MarketQuote>(),
  isRefreshingQuotes: false,
  quotesError: null,
  lastQuotesFetchTime: null,

  marketStatus: isIndianMarketOpenNow() ? 'OPEN' : 'CLOSED',
  marketStatusLabel: isIndianMarketOpenNow() ? 'Usual trading hours (calendar estimate)' : 'Outside usual trading hours (calendar estimate)',
};

// Store subscribers
const indicesListeners = new Set<() => void>();
const quotesListeners = new Set<() => void>();
let indicesVersion = 0;
let quotesVersion = 0;

function notifyIndicesListeners() {
  indicesVersion++;
  indicesListeners.forEach((listener) => listener());
}

function notifyQuotesListeners() {
  quotesVersion++;
  quotesListeners.forEach((listener) => listener());
}

// In-flight request guards
let indicesInFlight = false;
let quotesInFlight = false;
let indicesBackoffCount = 0;
let quotesBackoffCount = 0;

// Subscribed stock symbols across the entire app
const activeSubscribedStockSymbols = new Set<string>();
const symbolSubscriberCounts = new Map<string, number>();

// Timer IDs for the singleton pollers
let indicesTimerId: NodeJS.Timeout | null = null;
let quotesTimerId: NodeJS.Timeout | null = null;
let pollersInitialized = false;

function pollingPreference() {
  if (typeof window === 'undefined') return { enabled: true, interval: 30000 };
  try {
    const interval = Number(window.localStorage.getItem('finova_quote_interval') || 30);
    return { enabled: window.localStorage.getItem('finova_quote_autoupdate') !== 'false', interval: Math.max(2000, Math.min(300000, (Number.isFinite(interval) ? interval : 30) * 1000)) };
  } catch { return { enabled: true, interval: 30000 }; }
}

// ============================================================
// 3. Central Indices Fetcher & Poller
// ============================================================

export async function fetchCanonicalIndices(force = false): Promise<MarketDataResponse | null> {
  if (indicesInFlight) return state.indicesResponse;

  indicesInFlight = true;
  state.isRefreshingIndices = true;
  notifyIndicesListeners();

  try {
    const url = `/api/market/indices${force ? '?force=true' : ''}`;
    const res = await fetch(url, {
      headers: { 'Cache-Control': 'no-store' },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch indices (status ${res.status})`);
    }

    const json: MarketDataResponse = await res.json();
    state.indicesResponse = json;
    state.marketStatus = json.marketStatus || (isIndianMarketOpenNow() ? 'OPEN' : 'CLOSED');
    state.marketStatusLabel = json.marketStatusLabel || 'Market session status unavailable';
    state.indicesError = null;
    state.lastIndicesFetchTime = new Date();
    indicesBackoffCount = 0;

    // Also populate canonical stock quotes map with index quotes so any component querying ^NSEI gets it
    if (json.indices) {
      for (const idx of json.indices) {
        const canonical = canonicalIndexSymbol(idx.symbol);
        const quoteObj: MarketQuote = {
          symbol: canonical,
          providerTicker: idx.symbol,
          exchange: canonical === 'SENSEX' ? 'BSE' : 'NSE',
          price: idx.value,
          currency: 'INR',
          previousClose: idx.previousClose ?? null,
          day_change: idx.change ?? null,
          day_change_pct: idx.changePercent ?? null,
          high_52w: null,
          low_52w: null,
          volume: null,
          status: json.freshnessState === 'CACHED_STALE' ? 'STALE' : 'DELAYED',
          isStaleFallback: json.freshnessState === 'CACHED_STALE',
          price_timestamp: idx.timestamp,
          received_at: new Date().toISOString(),
          source: idx.source,
          isValid: true,
        };
        state.quotesMap.set(canonical, quoteObj);
        state.quotesMap.set(idx.symbol.toUpperCase(), quoteObj);
      }
      notifyQuotesListeners();
    }
  } catch (err) {
    indicesBackoffCount = Math.min(indicesBackoffCount + 1, 4);
    if (!state.indicesResponse) {
      state.indicesError = err instanceof Error ? err.message : 'Market indices temporarily unavailable';
    }
  } finally {
    indicesInFlight = false;
    state.isRefreshingIndices = false;
    notifyIndicesListeners();
  }

  return state.indicesResponse;
}

function scheduleNextIndicesPoll() {
  if (indicesTimerId) {
    clearTimeout(indicesTimerId);
    indicesTimerId = null;
  }

  if (!pollingPreference().enabled) return;

  // 1. Tab hidden check
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
    return;
  }

  // 2. Closed market check: Stop frequent polling completely!
  if (!isIndianMarketOpenNow() && state.marketStatus !== 'OPEN') {
    return;
  }

  // 3. Open market: 2–3s (2500ms) with exponential backoff on errors
  let delay = pollingPreference().interval;
  if (indicesBackoffCount > 0) {
    delay = Math.min(delay * Math.pow(2, indicesBackoffCount), 300000);
  }

  indicesTimerId = setTimeout(async () => {
    if (
      typeof document !== 'undefined' &&
      document.visibilityState === 'visible' &&
      (isIndianMarketOpenNow() || state.marketStatus === 'OPEN')
    ) {
      await fetchCanonicalIndices(false);
    }
    if (isIndianMarketOpenNow() || state.marketStatus === 'OPEN') {
      scheduleNextIndicesPoll();
    }
  }, delay);
}

// ============================================================
// 4. Central Stock Quotes Batch Fetcher & Poller
// ============================================================

export async function fetchCanonicalQuotes(
  symbols: string[],
  force = false
): Promise<Record<string, MarketQuote>> {
  if (symbols.length === 0) return {};
  if (quotesInFlight) {
    const result: Record<string, MarketQuote> = {};
    symbols.forEach((s) => {
      const q = state.quotesMap.get(s.toUpperCase());
      if (q) result[s.toUpperCase()] = q;
    });
    return result;
  }

  quotesInFlight = true;
  state.isRefreshingQuotes = true;
  notifyQuotesListeners();

  try {
    const cleanSyms = Array.from(new Set(symbols.map((s) => s.trim().toUpperCase()))).filter(Boolean);
    const query = cleanSyms.join(',');
    const url = `/api/market/quotes?symbols=${encodeURIComponent(query)}${force ? '&force=true' : ''}`;

    const res = await fetch(url, {
      headers: { 'Cache-Control': 'no-store' },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch quotes (status ${res.status})`);
    }

    const data = await res.json();
    if (data.quotes && typeof data.quotes === 'object') {
      for (const [sym, quote] of Object.entries(data.quotes)) {
        if (quote && typeof quote === 'object') {
          state.quotesMap.set(sym.toUpperCase(), quote as MarketQuote);
        }
      }
      if (data.marketStatus) {
        state.marketStatus = data.marketStatus;
      }
      state.quotesError = null;
      state.lastQuotesFetchTime = new Date();
      quotesBackoffCount = 0;
    }
  } catch (err) {
    quotesBackoffCount = Math.min(quotesBackoffCount + 1, 4);
    state.quotesError = err instanceof Error ? err.message : 'Stock quotes delayed';
  } finally {
    quotesInFlight = false;
    state.isRefreshingQuotes = false;
    notifyQuotesListeners();
  }

  const output: Record<string, MarketQuote> = {};
  symbols.forEach((s) => {
    const q = state.quotesMap.get(s.toUpperCase());
    if (q) output[s.toUpperCase()] = q;
  });
  return output;
}

function scheduleNextQuotesPoll() {
  if (quotesTimerId) {
    clearTimeout(quotesTimerId);
    quotesTimerId = null;
  }

  if (!pollingPreference().enabled) return;

  // 1. Tab hidden check
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
    return;
  }

  // 2. Closed market check: Stop frequent polling completely!
  if (!isIndianMarketOpenNow() && state.marketStatus !== 'OPEN') {
    return;
  }

  // 3. No active subscribed symbols
  if (activeSubscribedStockSymbols.size === 0) {
    return;
  }

  // 4. Open market: 2–3s (2500ms) with exponential backoff on errors
  let delay = pollingPreference().interval;
  if (quotesBackoffCount > 0) {
    delay = Math.min(delay * Math.pow(2, quotesBackoffCount), 300000);
  }

  quotesTimerId = setTimeout(async () => {
    if (
      typeof document !== 'undefined' &&
      document.visibilityState === 'visible' &&
      (isIndianMarketOpenNow() || state.marketStatus === 'OPEN') &&
      activeSubscribedStockSymbols.size > 0
    ) {
      const symbolsToPoll = Array.from(activeSubscribedStockSymbols);
      await fetchCanonicalQuotes(symbolsToPoll, false);
    }
    if (isIndianMarketOpenNow() || state.marketStatus === 'OPEN') {
      scheduleNextQuotesPoll();
    }
  }, delay);
}

// ============================================================
// 5. Global Lifecycle & Visibility Handler
// ============================================================

function ensureGlobalPollersStarted() {
  if (pollersInitialized || typeof window === 'undefined') return;
  pollersInitialized = true;
  const reschedule = () => { scheduleNextIndicesPoll(); scheduleNextQuotesPoll(); };
  window.addEventListener('storage', reschedule);
  window.addEventListener('finova-preferences', reschedule);

  // Initial fetch for indices
  void fetchCanonicalIndices(false).then(() => {
    if (isIndianMarketOpenNow()) {
      scheduleNextIndicesPoll();
    }
  });

  // Handle visibility changes across the browser
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      // Tab brought to foreground: immediately trigger fresh quotes
      void fetchCanonicalIndices(false);
      if (activeSubscribedStockSymbols.size > 0) {
        void fetchCanonicalQuotes(Array.from(activeSubscribedStockSymbols), false);
      }
      if (isIndianMarketOpenNow()) {
        scheduleNextIndicesPoll();
        scheduleNextQuotesPoll();
      }
    } else {
      // Tab hidden: pause timers immediately
      if (indicesTimerId) {
        clearTimeout(indicesTimerId);
        indicesTimerId = null;
      }
      if (quotesTimerId) {
        clearTimeout(quotesTimerId);
        quotesTimerId = null;
      }
    }
  });
}

// ============================================================
// 6. React Hook: useSharedMarketIndices
// Shared across MarketStrip, MarketIndexCards, and Dashboard
// ============================================================

export interface SharedMarketIndicesResult {
  data: MarketDataResponse | null;
  indices: MarketIndex[];
  loading: boolean;
  isRefreshing: boolean;
  marketStatus: MarketStatus;
  marketStatusLabel: string;
  error: string | null;
  updateStatusLabel: string;
  lastUpdatedTime: string | null;
  refreshNow: () => Promise<void>;
}

export function useSharedMarketIndices(): SharedMarketIndicesResult {
  useEffect(() => {
    ensureGlobalPollersStarted();
  }, []);

  const subscribe = useCallback((onStoreChange: () => void) => {
    indicesListeners.add(onStoreChange);
    return () => {
      indicesListeners.delete(onStoreChange);
    };
  }, []);

  const getSnapshot = useCallback(() => indicesVersion, []);

  useSyncExternalStore(subscribe, getSnapshot, () => 0);
  const data = state.indicesResponse;

  const isRefreshing = state.isRefreshingIndices;
  const loading = !data && state.indicesError === null;
  const marketStatus = data?.marketStatus || state.marketStatus;
  const marketStatusLabel = data?.marketStatusLabel || state.marketStatusLabel;

  // Clean, honest status label (NO countdowns)
  const updateStatusLabel = isRefreshing ? 'Retrieving quotes…' : data?.freshnessState === 'CACHED_STALE' ? 'Cached quotes — check quote times' : 'Latest available — check quote times';

  // Format timestamp concisely
  const lastUpdatedTime = data?.lastUpdated
    ? new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      }).format(new Date(data.lastUpdated))
    : null;

  const refreshNow = useCallback(async () => {
    await fetchCanonicalIndices(true);
  }, []);

  return {
    data,
    indices: data?.indices || [],
    loading,
    isRefreshing,
    marketStatus,
    marketStatusLabel,
    error: state.indicesError,
    updateStatusLabel,
    lastUpdatedTime,
    refreshNow,
  };
}

// ============================================================
// 7. React Hook: useSharedStockQuotes
// Shared across Recently Viewed, Browse Stocks, and Stock Detail
// ============================================================

export interface SharedStockQuotesResult {
  quotes: Record<string, MarketQuote | null>;
  getQuote: (symbol: string) => MarketQuote | null;
  isRefreshing: boolean;
  marketOpen: boolean;
  marketStatus: MarketStatus;
  updateStatusLabel: string;
  lastUpdated: Date | null;
  error: string | null;
  refreshNow: () => Promise<void>;
}

export function useSharedStockQuotes(symbols: string[]): SharedStockQuotesResult {
  const activeSymbolsKey = symbols.filter(Boolean).map((s) => s.toUpperCase()).sort().join(',');

  useEffect(() => {
    ensureGlobalPollersStarted();

    // Register symbols into active set
    const subscribed = [...new Set(symbols.filter(Boolean).map(s => s.toUpperCase()))];
    subscribed.forEach((s) => {
      symbolSubscriberCounts.set(s, (symbolSubscriberCounts.get(s) || 0) + 1);
      activeSubscribedStockSymbols.add(s);
    });

    // Initial fetch for these symbols
    if (symbols.length > 0) {
      void fetchCanonicalQuotes(symbols, false);
      if (isIndianMarketOpenNow()) {
        scheduleNextQuotesPoll();
      }
    }

    return () => {
      subscribed.forEach((s) => {
        const count = (symbolSubscriberCounts.get(s) || 1) - 1;
        if (count > 0) symbolSubscriberCounts.set(s, count);
        else { symbolSubscriberCounts.delete(s); activeSubscribedStockSymbols.delete(s); }
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSymbolsKey]);

  const subscribe = useCallback((onStoreChange: () => void) => {
    quotesListeners.add(onStoreChange);
    return () => {
      quotesListeners.delete(onStoreChange);
    };
  }, []);

  const getSnapshot = useCallback(() => quotesVersion, []);

  // Sync to quotes updates
  useSyncExternalStore(subscribe, getSnapshot, () => 0);

  const quotesResult: Record<string, MarketQuote | null> = {};
  symbols.forEach((s) => {
    const symUpper = s.toUpperCase();
    quotesResult[symUpper] = state.quotesMap.get(symUpper) || null;
  });

  const getQuote = useCallback((s: string): MarketQuote | null => {
    const canonical = canonicalIndexSymbol(s);
    return state.quotesMap.get(canonical) || state.quotesMap.get(s.toUpperCase()) || null;
  }, []);

  const marketOpen = isIndianMarketOpenNow() && state.marketStatus !== 'CLOSED';

  const updateStatusLabel = state.isRefreshingQuotes ? 'Retrieving quotes…' : 'Latest available — check quote times';

  const refreshNow = useCallback(async () => {
    await fetchCanonicalQuotes(symbols, true);
  }, [symbols]);

  return {
    quotes: quotesResult,
    getQuote,
    isRefreshing: state.isRefreshingQuotes,
    marketOpen,
    marketStatus: state.marketStatus,
    updateStatusLabel,
    lastUpdated: state.lastQuotesFetchTime,
    error: state.quotesError,
    refreshNow,
  };
}

// ============================================================
// 8. React Hook: useSharedStockQuote (Single Symbol)
// ============================================================

export function useSharedStockQuote(symbol: string) {
  const symbols = symbol ? [symbol] : [];
  const result = useSharedStockQuotes(symbols);
  const quote = result.getQuote(symbol);

  return {
    quote,
    isRefreshing: result.isRefreshing,
    marketOpen: result.marketOpen,
    marketStatus: result.marketStatus,
    updateStatusLabel: result.updateStatusLabel,
    lastUpdated: result.lastUpdated,
    error: result.error,
    refreshNow: result.refreshNow,
  };
}
