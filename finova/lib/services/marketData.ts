import type { MarketIndex, MarketDataResponse, MarketStatus } from '../../types/market';
import {
  type MarketDataProvider,
  type MarketQuote,
  YFinanceMarketDataProvider,
} from '../market/providers/yfinanceProvider.ts';
import { extractBaseSymbol } from '../market/symbolMapper.ts';

export type { MarketQuote } from '../market/providers/yfinanceProvider.ts';

/**
 * Calculates official Indian Market (NSE/BSE) status based on IST (Asia/Kolkata).
 * Trading days: Monday to Friday
 * Pre-open: 09:00 to 09:15 IST
 * Regular trading: 09:15 to 15:30 IST
 * Closed: Weekends or outside trading hours
 */
export function getIndianMarketStatus(date = new Date()): {
  status: MarketStatus;
  label: string;
  isTradingDay: boolean;
} {
  const istFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    hour12: false,
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
  });

  const parts = istFormatter.formatToParts(date);
  const weekday = parts.find((p) => p.type === 'weekday')?.value || '';
  const hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
  const minute = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);

  const isWeekend = weekday === 'Sat' || weekday === 'Sun';
  const totalMinutes = hour * 60 + minute;

  if (isWeekend) {
    return { status: 'CLOSED', label: 'Market Closed (Weekend)', isTradingDay: false };
  }

  // Pre-open: 9:00 AM to 9:15 AM IST (540 to 555 mins)
  if (totalMinutes >= 540 && totalMinutes < 555) {
    return { status: 'PRE_OPEN', label: 'Pre-Open Session', isTradingDay: true };
  }

  // Regular trading: 9:15 AM to 3:30 PM IST (555 to 930 mins)
  if (totalMinutes >= 555 && totalMinutes < 930) {
    return { status: 'OPEN', label: 'Market Open', isTradingDay: true };
  }

  return { status: 'CLOSED', label: 'Market Closed', isTradingDay: true };
}

interface IndexCacheEntry {
  response: MarketDataResponse;
  expiresAt: number;
  lastSuccessfulIndices?: MarketIndex[];
  lastSuccessfulAt?: number;
}

interface QuoteCacheEntry {
  quote: MarketQuote | null;
  expiresAt: number;
  fetchedAt: number;
  lastSuccessfulQuote?: MarketQuote | null;
  lastSuccessfulAt?: number;
}

/**
 * Server-Side In-Memory Cache Durations:
 * Open market: 60s
 * Closed market (EOD): 5m (300s)
 * Negative cache (not found/404): 60s
 */
const CACHE_TTL_OPEN_MS = 60 * 1000;
const CACHE_TTL_CLOSED_MS = 5 * 60 * 1000;
const CACHE_TTL_NEGATIVE_MS = 60 * 1000;

let indexMemoryCache: IndexCacheEntry | null = null;
const quoteMemoryCache = new Map<string, QuoteCacheEntry>();

/**
 * Server-Side MarketDataService
 *
 * Decouples the frontend from provider implementations.
 * Current Provider: YFinanceMarketDataProvider (development / prototype)
 * Future Provider: UpstoxMarketDataProvider (can be swapped in via setProvider)
 *
 * The frontend (landing page, holdings & dashboard) interacts only with this service.
 * Never invents fake numbers or returns demo seed prices as if they were live quotes.
 */
export class MarketDataService {
  /**
   * Active market data provider.
   * Defaults to YFinanceMarketDataProvider.
   */
  private static provider: MarketDataProvider = new YFinanceMarketDataProvider();

  /**
   * Allows plugging in alternate providers (e.g. UpstoxMarketDataProvider)
   * without modifying frontend components.
   */
  public static setProvider(provider: MarketDataProvider): void {
    this.provider = provider;
    indexMemoryCache = null;
    quoteMemoryCache.clear();
  }

  public static getProvider(): MarketDataProvider {
    return this.provider;
  }

  public static clearCache(): void {
    indexMemoryCache = null;
    quoteMemoryCache.clear();
  }

  /**
   * Retrieves quotes for SENSEX, NIFTY 50, and NIFTY BANK.
   * If the provider fails, returns an UNAVAILABLE response.
   * NEVER returns fabricated or fake numbers.
   */
  public static async getMarketIndexQuotes(options?: {
    forceRefresh?: boolean;
  }): Promise<MarketDataResponse> {
    const now = Date.now();
    const marketInfo = getIndianMarketStatus();

    // 1. Check server-side cache if not force-refreshed
    if (!options?.forceRefresh && indexMemoryCache && indexMemoryCache.expiresAt > now) {
      return {
        ...indexMemoryCache.response,
        marketStatus: marketInfo.status,
        marketStatusLabel: marketInfo.label,
      };
    }

    try {
      // 2. Fetch from active provider
      const indices = await this.provider.fetchIndices(marketInfo.status);

      if (!indices || indices.length === 0) {
        if (indexMemoryCache?.lastSuccessfulIndices && indexMemoryCache.lastSuccessfulIndices.length > 0) {
          const staleIndices = indexMemoryCache.lastSuccessfulIndices;
          return {
            success: true,
            status: 'STALE',
            freshnessState: 'CACHED_STALE',
            indices: staleIndices,
            quotes: staleIndices,
            marketStatus: marketInfo.status,
            marketStatusLabel: `${marketInfo.label} (Cached Stale)`,
            isDelayedOrClosing: true,
            message: 'Market data feed temporarily unreachable. Displaying verified cached quotations.',
            lastUpdated: staleIndices[0]?.timestamp || new Date(indexMemoryCache.lastSuccessfulAt || now).toISOString(),
            source: `${this.provider.sourceLabel} (Cached / Stale)`,
          };
        }

        return {
          success: false,
          status: 'UNAVAILABLE',
          freshnessState: 'UNAVAILABLE',
          indices: [],
          quotes: [],
          marketStatus: marketInfo.status,
          marketStatusLabel: marketInfo.label,
          isDelayedOrClosing: true,
          message: 'Market data temporarily unavailable',
          lastUpdated: new Date().toISOString(),
          source: this.provider.sourceLabel,
        };
      }

      const response: MarketDataResponse = {
        success: true,
        status: 'SUCCESS',
        freshnessState: marketInfo.status === 'OPEN' ? 'CURRENT_PROVIDER_DATA' : 'PREVIOUS_MARKET_CLOSE',
        indices,
        quotes: indices,
        marketStatus: marketInfo.status,
        marketStatusLabel: marketInfo.label,
        isDelayedOrClosing: marketInfo.status !== 'OPEN',
        lastUpdated: indices[0]?.timestamp || new Date().toISOString(),
        source: this.provider.sourceLabel,
      };

      indexMemoryCache = {
        response,
        expiresAt: now + (marketInfo.status === 'OPEN' ? CACHE_TTL_OPEN_MS : CACHE_TTL_CLOSED_MS),
        lastSuccessfulIndices: indices,
        lastSuccessfulAt: now,
      };

      return response;
    } catch {
      if (indexMemoryCache?.lastSuccessfulIndices && indexMemoryCache.lastSuccessfulIndices.length > 0) {
        const staleIndices = indexMemoryCache.lastSuccessfulIndices;
        return {
          success: true,
          status: 'STALE',
          freshnessState: 'CACHED_STALE',
          indices: staleIndices,
          quotes: staleIndices,
          marketStatus: marketInfo.status,
          marketStatusLabel: `${marketInfo.label} (Cached Stale)`,
          isDelayedOrClosing: true,
          message: 'Market data feed temporarily unreachable. Displaying verified cached quotations.',
          lastUpdated: staleIndices[0]?.timestamp || new Date(indexMemoryCache.lastSuccessfulAt || now).toISOString(),
          source: `${this.provider.sourceLabel} (Cached / Stale)`,
        };
      }

      return {
        success: false,
        status: 'UNAVAILABLE',
        freshnessState: 'UNAVAILABLE',
        indices: [],
        quotes: [],
        marketStatus: marketInfo.status,
        marketStatusLabel: marketInfo.label,
        isDelayedOrClosing: true,
        message: 'Market data temporarily unavailable',
        lastUpdated: new Date().toISOString(),
        source: this.provider.sourceLabel,
      };
    }
  }

  /**
   * Retrieve a single index quote by symbol.
   */
  public static async getIndexQuote(symbol: string): Promise<MarketIndex | null> {
    const res = await this.getMarketIndexQuotes();
    if (!res.success || res.indices.length === 0) {
      return null;
    }
    return res.indices.find((idx) => idx.symbol.toUpperCase() === symbol.toUpperCase()) || null;
  }

  /**
   * Retrieves a dynamic, verified market quote for a single instrument.
   * Leverages server-side in-memory cache with market-aware TTL.
   *
   * If quote cannot be resolved or is invalid/stale, returns null or last verified stale quote.
   * NEVER returns demo or seed prices.
   */
  public static async getQuote(
    symbol: string,
    exchange: string = 'NSE',
    options?: { forceRefresh?: boolean }
  ): Promise<MarketQuote | null> {
    const cleanSym = symbol?.trim().toUpperCase();
    if (!cleanSym) return null;

    const cleanEx = (exchange || 'NSE').trim().toUpperCase();
    const cacheKey = `${cleanSym}|${cleanEx}`;
    const now = Date.now();
    const cached = quoteMemoryCache.get(cacheKey);

    if (!options?.forceRefresh) {
      if (cached && cached.expiresAt > now) {
        return cached.quote;
      }
    }

    const marketInfo = getIndianMarketStatus();
    try {
      const quote = await this.provider.fetchQuote(cleanSym, cleanEx);

      if (quote) {
        const ttl = marketInfo.status === 'OPEN' ? CACHE_TTL_OPEN_MS : CACHE_TTL_CLOSED_MS;
        quoteMemoryCache.set(cacheKey, {
          quote,
          expiresAt: now + ttl,
          fetchedAt: now,
          lastSuccessfulQuote: quote,
          lastSuccessfulAt: now,
        });
        return quote;
      }

      // Provider returned null: check for last known verified quote
      if (cached?.lastSuccessfulQuote) {
        const staleQuote: MarketQuote = {
          ...cached.lastSuccessfulQuote,
          status: 'STALE',
          isStaleFallback: true,
          freshnessLabel: 'Cached / Stale',
          lastSuccessfulRetrieval: new Date(cached.lastSuccessfulAt || now).toISOString(),
        };
        quoteMemoryCache.set(cacheKey, {
          quote: staleQuote,
          expiresAt: now + CACHE_TTL_NEGATIVE_MS,
          fetchedAt: now,
          lastSuccessfulQuote: cached.lastSuccessfulQuote,
          lastSuccessfulAt: cached.lastSuccessfulAt,
        });
        return staleQuote;
      }

      quoteMemoryCache.set(cacheKey, {
        quote: null,
        expiresAt: now + CACHE_TTL_NEGATIVE_MS,
        fetchedAt: now,
      });
      return null;
    } catch {
      if (cached?.lastSuccessfulQuote) {
        const staleQuote: MarketQuote = {
          ...cached.lastSuccessfulQuote,
          status: 'STALE',
          isStaleFallback: true,
          freshnessLabel: 'Cached / Stale',
          lastSuccessfulRetrieval: new Date(cached.lastSuccessfulAt || now).toISOString(),
        };
        quoteMemoryCache.set(cacheKey, {
          quote: staleQuote,
          expiresAt: now + CACHE_TTL_NEGATIVE_MS,
          fetchedAt: now,
          lastSuccessfulQuote: cached.lastSuccessfulQuote,
          lastSuccessfulAt: cached.lastSuccessfulAt,
        });
        return staleQuote;
      }

      quoteMemoryCache.set(cacheKey, {
        quote: null,
        expiresAt: now + CACHE_TTL_NEGATIVE_MS,
        fetchedAt: now,
      });
      return null;
    }
  }

  /**
   * Retrieves dynamic quotes for a list of instruments.
   * Checks cache first; only queries provider for un-cached or expired symbols.
   */
  public static async getQuotes(
    instruments: Array<{ symbol: string; exchange?: string }>,
    options?: { forceRefresh?: boolean }
  ): Promise<Map<string, MarketQuote>> {
    const resultMap = new Map<string, MarketQuote>();
    if (!instruments || instruments.length === 0) return resultMap;

    const toFetch: Array<{ symbol: string; exchange?: string }> = [];
    const now = Date.now();

    for (const inst of instruments) {
      if (!inst?.symbol) continue;
      const sym = inst.symbol.trim().toUpperCase();
      const ex = (inst.exchange || 'NSE').trim().toUpperCase();
      const cacheKey = `${sym}|${ex}`;

      if (!options?.forceRefresh) {
        const cached = quoteMemoryCache.get(cacheKey);
        if (cached && cached.expiresAt > now) {
          if (cached.quote) {
            resultMap.set(sym, cached.quote);
          }
          continue;
        }
      }

      toFetch.push({ symbol: sym, exchange: ex });
    }

    if (toFetch.length === 0) {
      return resultMap;
    }

    const marketInfo = getIndianMarketStatus();
    let fetchedMap = new Map<string, MarketQuote>();
    try {
      fetchedMap = await this.provider.fetchQuotes(toFetch);
    } catch {
      // Network/Provider failure: will fall back to cached last successful quotes below
    }

    for (const inst of toFetch) {
      const sym = inst.symbol.trim().toUpperCase();
      const baseSym = extractBaseSymbol(sym);
      const ex = (inst.exchange || 'NSE').trim().toUpperCase();
      const cacheKey = `${sym}|${ex}`;
      const cached = quoteMemoryCache.get(cacheKey);
      const quote = fetchedMap.get(sym) || fetchedMap.get(baseSym) || null;

      if (quote) {
        const ttl = marketInfo.status === 'OPEN' ? CACHE_TTL_OPEN_MS : CACHE_TTL_CLOSED_MS;
        quoteMemoryCache.set(cacheKey, {
          quote,
          expiresAt: now + ttl,
          fetchedAt: now,
          lastSuccessfulQuote: quote,
          lastSuccessfulAt: now,
        });
        resultMap.set(sym, quote);
        if (baseSym !== sym) {
          resultMap.set(baseSym, quote);
        }
      } else if (cached?.lastSuccessfulQuote) {
        // Honest fallback to last verified quote with STALE indicator
        const staleQuote: MarketQuote = {
          ...cached.lastSuccessfulQuote,
          status: 'STALE',
          isStaleFallback: true,
          freshnessLabel: 'Cached / Stale',
          lastSuccessfulRetrieval: new Date(cached.lastSuccessfulAt || now).toISOString(),
        };
        quoteMemoryCache.set(cacheKey, {
          quote: staleQuote,
          expiresAt: now + CACHE_TTL_NEGATIVE_MS,
          fetchedAt: now,
          lastSuccessfulQuote: cached.lastSuccessfulQuote,
          lastSuccessfulAt: cached.lastSuccessfulAt,
        });
        resultMap.set(sym, staleQuote);
        if (baseSym !== sym) {
          resultMap.set(baseSym, staleQuote);
        }
      } else {
        quoteMemoryCache.set(cacheKey, {
          quote: null,
          expiresAt: now + CACHE_TTL_NEGATIVE_MS,
          fetchedAt: now,
        });
      }
    }

    return resultMap;
  }
}
