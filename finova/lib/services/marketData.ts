import type { MarketIndex, MarketDataResponse, MarketStatus } from '@/types/market';
import {
  type MarketDataProvider,
  YFinanceMarketDataProvider,
} from '@/lib/market/providers/yfinanceProvider';

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

interface CacheEntry {
  response: MarketDataResponse;
  expiresAt: number;
}

/**
 * Server-Side In-Memory Cache Duration:
 * 60 seconds (60,000 ms).
 * Prevents unnecessary repeated requests to the market data provider while keeping data fresh.
 */
const CACHE_TTL_MS = 60 * 1000;
let memoryCache: CacheEntry | null = null;

/**
 * Server-Side MarketDataService
 *
 * Decouples the frontend from provider implementations.
 * Current Provider: YFinanceMarketDataProvider (development / prototype)
 * Future Provider: UpstoxMarketDataProvider (can be swapped in via setProvider)
 *
 * The frontend (landing page & dashboard) interacts only with this service.
 */
export class MarketDataService {
  /**
   * Active market data provider.
   * Defaults to YFinanceMarketDataProvider for prototype development.
   */
  private static provider: MarketDataProvider = new YFinanceMarketDataProvider();

  /**
   * Allows plugging in alternate providers (e.g. UpstoxMarketDataProvider)
   * without modifying frontend components.
   */
  public static setProvider(provider: MarketDataProvider): void {
    this.provider = provider;
    memoryCache = null; // Invalidate cache on provider switch
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
    if (!options?.forceRefresh && memoryCache && memoryCache.expiresAt > now) {
      return {
        ...memoryCache.response,
        // Update live market status dynamically based on current time
        marketStatus: marketInfo.status,
        marketStatusLabel: marketInfo.label,
      };
    }

    try {
      // 2. Fetch from active provider (YFinanceMarketDataProvider)
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

      // Store in memory cache
      memoryCache = {
        response,
        expiresAt: now + CACHE_TTL_MS,
      };

      return response;
    } catch {
      // 3. Provider failure state: NEVER show fake values
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
}
