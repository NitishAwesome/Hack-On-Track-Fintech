import type { MarketIndex, MarketDataResponse, MarketStatus } from '@/types/market';
import {
  type MarketDataProvider,
  type MarketQuote,
  YFinanceMarketDataProvider,
} from '@/lib/market/providers/yfinanceProvider';
import { extractBaseSymbol } from '@/lib/market/symbolMapper';

export type { MarketQuote } from '@/lib/market/providers/yfinanceProvider';

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
}

interface QuoteCacheEntry {
  quote: MarketQuote | null;
  expiresAt: number;
  fetchedAt: number;
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
        return {
          success: false,
          status: 'UNAVAILABLE',
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
      };

      return response;
    } catch {
      return {
        success: false,
        status: 'UNAVAILABLE',
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
   * If quote cannot be resolved or is invalid/stale, returns null.
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

    if (!options?.forceRefresh) {
      const cached = quoteMemoryCache.get(cacheKey);
      if (cached && cached.expiresAt > now) {
        return cached.quote;
      }
    }

    const marketInfo = getIndianMarketStatus();
    try {
      const quote = await this.provider.fetchQuote(cleanSym, cleanEx);

      const ttl = quote
        ? marketInfo.status === 'OPEN'
          ? CACHE_TTL_OPEN_MS
          : CACHE_TTL_CLOSED_MS
        : CACHE_TTL_NEGATIVE_MS;

      quoteMemoryCache.set(cacheKey, {
        quote,
        expiresAt: now + ttl,
        fetchedAt: now,
      });

      return quote;
    } catch {
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
    const fetchedMap = await this.provider.fetchQuotes(toFetch);

    for (const inst of toFetch) {
      const sym = inst.symbol.trim().toUpperCase();
      const baseSym = extractBaseSymbol(sym);
      const ex = (inst.exchange || 'NSE').trim().toUpperCase();
      const cacheKey = `${sym}|${ex}`;
      const quote = fetchedMap.get(sym) || fetchedMap.get(baseSym) || null;

      const ttl = quote
        ? marketInfo.status === 'OPEN'
          ? CACHE_TTL_OPEN_MS
          : CACHE_TTL_CLOSED_MS
        : CACHE_TTL_NEGATIVE_MS;

      quoteMemoryCache.set(cacheKey, {
        quote,
        expiresAt: now + ttl,
        fetchedAt: now,
      });

      if (quote) {
        resultMap.set(sym, quote);
        if (baseSym !== sym) {
          resultMap.set(baseSym, quote);
        }
      }
    }

    return resultMap;
  }
}
