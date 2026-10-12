import type { MarketIndex, MarketDataResponse, MarketStatus } from '../../types/market';
import {
  type MarketDataProvider,
  type MarketQuote,
  type ChartRange,
  type HistoricalChartResponse,
  YFinanceMarketDataProvider,
} from '../market/providers/yfinanceProvider.ts';
import { extractBaseSymbol } from '../market/symbolMapper.ts';

export type {
  MarketQuote,
  ChartRange,
  HistoricalChartPoint,
  HistoricalChartResponse,
} from '../market/providers/yfinanceProvider.ts';

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
const chartMemoryCache = new Map<string, { data: HistoricalChartResponse; expiresAt: number }>();

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
    chartMemoryCache.clear();
  }

  public static getProvider(): MarketDataProvider {
    return this.provider;
  }

  public static clearCache(): void {
    indexMemoryCache = null;
    quoteMemoryCache.clear();
    chartMemoryCache.clear();
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

  /**
   * Retrieves historical chart series for an instrument or index.
   * Leverages server-side in-memory caching with TTL (60s for 1D, 5m for others).
   */
  public static async getHistoricalChart(
    symbol: string,
    exchange: string = 'NSE',
    range: ChartRange = '1M',
    options?: { forceRefresh?: boolean }
  ): Promise<HistoricalChartResponse | null> {
    const cleanSym = symbol?.trim().toUpperCase();
    if (!cleanSym) return null;

    const cleanEx = (exchange || 'NSE').trim().toUpperCase();
    const cleanRange = range?.trim().toUpperCase() as ChartRange;
    const validRange: ChartRange = ['1D', '1W', '1M', '3M', '1Y', '5Y', 'MAX'].includes(cleanRange)
      ? cleanRange
      : '1M';

    const cacheKey = `${cleanSym}|${cleanEx}|${validRange}`;
    const now = Date.now();
    const cached = chartMemoryCache.get(cacheKey);

    if (!options?.forceRefresh && cached && cached.expiresAt > now) {
      return cached.data;
    }

    try {
      if (typeof this.provider.fetchHistoricalChart === 'function') {
        const chartData = await this.provider.fetchHistoricalChart(cleanSym, cleanEx, validRange);
        if (chartData && chartData.points.length > 0) {
          const ttl = validRange === '1D' ? CACHE_TTL_OPEN_MS : CACHE_TTL_CLOSED_MS;
          chartMemoryCache.set(cacheKey, {
            data: chartData,
            expiresAt: now + ttl,
          });
          return chartData;
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Fetches quotes for the 20 benchmark NSE equities and ranks them
   * into Top Gainers, Top Losers, and Most Active.
   * Explicitly discloses the limited tracking universe as required.
   */
  public static async getTrackedMovers(options?: {
    forceRefresh?: boolean;
  }): Promise<TrackedMoversResponse> {
    const instruments = TRACKED_BENCHMARK_STOCKS.map((sym) => ({
      symbol: sym,
      exchange: 'NSE',
    }));

    const quotesMap = await this.getQuotes(instruments, options);
    const validQuotes: MarketQuote[] = [];

    for (const sym of TRACKED_BENCHMARK_STOCKS) {
      const q = quotesMap.get(sym);
      if (q && q.isValid && q.price > 0) {
        validQuotes.push(q);
      }
    }

    // Sort gainers (highest positive percentage change)
    const gainers = [...validQuotes]
      .filter((q) => (q.day_change_pct ?? 0) >= 0)
      .sort((a, b) => (b.day_change_pct ?? 0) - (a.day_change_pct ?? 0));

    // Sort losers (lowest / most negative percentage change)
    const losers = [...validQuotes]
      .filter((q) => (q.day_change_pct ?? 0) < 0)
      .sort((a, b) => (a.day_change_pct ?? 0) - (b.day_change_pct ?? 0));

    // Sort most active by trading volume
    const mostActive = [...validQuotes]
      .filter((q) => typeof q.volume === 'number' && q.volume > 0)
      .sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0));

    return {
      gainers: gainers.slice(0, 10),
      losers: losers.slice(0, 10),
      mostActive: mostActive.slice(0, 10),
      trackedCount: validQuotes.length,
      universeDisclosure:
        'Top movers among tracked FINOVA universe (20 major NSE benchmark equities). Free-tier market data does not screen the entire 2,000+ NSE listed universe in real-time.',
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Fetches real commodity prices:
   * - International Futures Benchmarks: GC=F (Gold COMEX Futures), SI=F (Silver COMEX Futures) in USD / troy oz.
   * - Indian Market Instruments: GOLDBEES.NS (Nippon India ETF Gold BeES), SILVERBEES.NS (Nippon India ETF Silver BeES) in INR / unit.
   */
  public static async getCommoditiesData(options?: {
    forceRefresh?: boolean;
  }): Promise<CommoditiesResponse> {
    const instruments = [
      { symbol: 'GC=F', exchange: 'OTHER' },
      { symbol: 'SI=F', exchange: 'OTHER' },
      { symbol: 'GOLDBEES.NS', exchange: 'NSE' },
      { symbol: 'SILVERBEES.NS', exchange: 'NSE' },
    ];

    const quotesMap = await this.getQuotes(instruments, options);
    const nowIso = new Date().toISOString();

    const goldBenchmarkQuote = quotesMap.get('GC=F');
    const silverBenchmarkQuote = quotesMap.get('SI=F');
    const goldEtfQuote = quotesMap.get('GOLDBEES.NS') || quotesMap.get('GOLDBEES');
    const silverEtfQuote = quotesMap.get('SILVERBEES.NS') || quotesMap.get('SILVERBEES');

    const benchmarks: CommodityItem[] = [
      {
        id: 'gold-futures',
        name: 'Gold COMEX Futures',
        symbol: 'GC=F',
        providerTicker: 'GC=F',
        category: 'benchmark',
        currency: 'USD',
        quotedUnit: 'USD / troy oz',
        price: goldBenchmarkQuote?.price ?? null,
        dayChange: goldBenchmarkQuote?.day_change ?? null,
        dayChangePercent: goldBenchmarkQuote?.day_change_pct ?? null,
        high52w: goldBenchmarkQuote?.high_52w ?? null,
        low52w: goldBenchmarkQuote?.low_52w ?? null,
        timestamp: goldBenchmarkQuote?.price_timestamp ?? nowIso,
        source: goldBenchmarkQuote?.source ?? 'Yahoo Finance / yfinance',
        disclaimer:
          'International COMEX futures benchmark quoted in USD per troy ounce. Does not represent Indian retail gold spot rates (per 10 grams) or include Indian import customs duty.',
      },
      {
        id: 'silver-futures',
        name: 'Silver COMEX Futures',
        symbol: 'SI=F',
        providerTicker: 'SI=F',
        category: 'benchmark',
        currency: 'USD',
        quotedUnit: 'USD / troy oz',
        price: silverBenchmarkQuote?.price ?? null,
        dayChange: silverBenchmarkQuote?.day_change ?? null,
        dayChangePercent: silverBenchmarkQuote?.day_change_pct ?? null,
        high52w: silverBenchmarkQuote?.high_52w ?? null,
        low52w: silverBenchmarkQuote?.low_52w ?? null,
        timestamp: silverBenchmarkQuote?.price_timestamp ?? nowIso,
        source: silverBenchmarkQuote?.source ?? 'Yahoo Finance / yfinance',
        disclaimer:
          'International COMEX futures benchmark quoted in USD per troy ounce. Does not represent Indian retail silver spot rates (per 1 kg) or include Indian import customs duty.',
      },
    ];

    const etfs: CommodityItem[] = [
      {
        id: 'goldbees-etf',
        name: 'Nippon India ETF Gold BeES',
        symbol: 'GOLDBEES',
        providerTicker: 'GOLDBEES.NS',
        category: 'etf',
        currency: 'INR',
        quotedUnit: 'INR / unit (NSE)',
        price: goldEtfQuote?.price ?? null,
        dayChange: goldEtfQuote?.day_change ?? null,
        dayChangePercent: goldEtfQuote?.day_change_pct ?? null,
        high52w: goldEtfQuote?.high_52w ?? null,
        low52w: goldEtfQuote?.low_52w ?? null,
        timestamp: goldEtfQuote?.price_timestamp ?? nowIso,
        source: goldEtfQuote?.source ?? 'Yahoo Finance / yfinance',
        disclaimer:
          'NSE-listed Gold Exchange Traded Fund providing direct physical gold backing in INR for Indian retail investors.',
      },
      {
        id: 'silverbees-etf',
        name: 'Nippon India ETF Silver BeES',
        symbol: 'SILVERBEES',
        providerTicker: 'SILVERBEES.NS',
        category: 'etf',
        currency: 'INR',
        quotedUnit: 'INR / unit (NSE)',
        price: silverEtfQuote?.price ?? null,
        dayChange: silverEtfQuote?.day_change ?? null,
        dayChangePercent: silverEtfQuote?.day_change_pct ?? null,
        high52w: silverEtfQuote?.high_52w ?? null,
        low52w: silverEtfQuote?.low_52w ?? null,
        timestamp: silverEtfQuote?.price_timestamp ?? nowIso,
        source: silverEtfQuote?.source ?? 'Yahoo Finance / yfinance',
        disclaimer:
          'NSE-listed Silver Exchange Traded Fund tracking domestic spot silver price in INR for Indian retail investors.',
      },
    ];

    return {
      benchmarks,
      etfs,
      lastUpdated: nowIso,
    };
  }
}

export interface TrackedMoversResponse {
  gainers: MarketQuote[];
  losers: MarketQuote[];
  mostActive: MarketQuote[];
  trackedCount: number;
  universeDisclosure: string;
  lastUpdated: string;
}

export interface CommodityItem {
  id: string;
  name: string;
  symbol: string;
  providerTicker: string;
  category: 'benchmark' | 'etf';
  currency: string;
  quotedUnit: string;
  price: number | null;
  dayChange: number | null;
  dayChangePercent: number | null;
  high52w?: number | null;
  low52w?: number | null;
  timestamp: string;
  source: string;
  disclaimer: string;
}

export interface CommoditiesResponse {
  benchmarks: CommodityItem[];
  etfs: CommodityItem[];
  lastUpdated: string;
}

export const TRACKED_BENCHMARK_STOCKS = [
  'RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK',
  'BHARTIARTL', 'ITC', 'SBIN', 'LT', 'HINDUNILVR',
  'BAJFINANCE', 'MARUTI', 'SUNPHARMA', 'TATAMOTORS', 'TITAN',
  'NTPC', 'COALINDIA', 'ZOMATO', 'TRENT', 'BEL'
];

export const TRACKED_BENCHMARK_UNIVERSE = TRACKED_BENCHMARK_STOCKS;
