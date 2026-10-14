// ============================================================
// FINOVA — Market Data Providers
// Primary: YFinanceMarketDataProvider (Yahoo Finance v8 feeds)
// ============================================================

import type { MarketIndex, MarketStatus } from '@/types/market';
import type { PriceStatus } from '@/types/database';
import {
  resolveYahooFinanceSymbol,
  extractBaseSymbol,
} from '../symbolMapper.ts';
import { validateMarketQuote } from '../quoteValidator.ts';
import { calculateIndexMetrics } from '../indexCalculator.ts';

export interface MarketQuote {
  symbol: string;
  providerTicker: string;
  exchange: string;
  price: number;
  currency: string;
  source: string;
  status: PriceStatus;
  price_timestamp: string;
  received_at: string;
  day_change: number | null;
  day_change_pct: number | null;
  previousClose?: number | null;
  sessionOpen?: number | null;
  dayHigh?: number | null;
  dayLow?: number | null;
  high_52w: number | null;
  low_52w: number | null;
  volume: number | null;
  isValid: boolean;
  rejectionReason?: string;
  isStaleFallback?: boolean;
  freshnessLabel?: string;
  lastSuccessfulRetrieval?: string;
}

export type ChartRange = '1D' | '1W' | '1M' | '3M' | '1Y' | '5Y' | 'MAX';
export class HistoryProviderRateLimitError extends Error {
  constructor(public retryAfterSeconds = 30) { super('Historical data provider is rate limited. Please try again shortly.'); }
}

export interface HistoricalChartPoint {
  timestamp: number;
  date: string;
  close: number;
  open?: number | null;
  high?: number | null;
  low?: number | null;
  volume?: number | null;
}

export interface HistoricalChartResponse {
  symbol: string;
  providerTicker: string;
  exchange: string;
  range: ChartRange;
  interval: string;
  currency: string;
  points: HistoricalChartPoint[];
  currentPrice: number;
  previousClose?: number | null;
  dayChange?: number | null;
  dayChangePercent?: number | null;
  periodChange?: number | null;
  periodChangePercent?: number | null;
  high_52w?: number | null;
  low_52w?: number | null;
  dayHigh?: number | null;
  dayLow?: number | null;
  volume?: number | null;
  source: string;
  lastUpdated: string;
  quoteTimestamp?: string | null;
  retrievedAt?: string;
  priceBasis?: string;
  exchangeTimezone?: string;
  regularSession?: { start: number; end: number };
}

export interface MarketDataProvider {
  readonly id: string;
  readonly name: string;
  readonly sourceLabel: string;
  fetchIndices(marketStatus: MarketStatus): Promise<MarketIndex[]>;
  fetchQuote(symbol: string, exchange?: string): Promise<MarketQuote | null>;
  fetchQuotes(
    instruments: Array<{ symbol: string; exchange?: string }>
  ): Promise<Map<string, MarketQuote>>;
  fetchHistoricalChart?(
    symbol: string,
    exchange?: string,
    range?: ChartRange
  ): Promise<HistoricalChartResponse | null>;
}

interface IndexConfig {
  displayName: string;
  symbol: string;
  yahooTicker: string;
  exchange: 'NSE' | 'BSE';
}

const TRACKED_INDICES: IndexConfig[] = [
  {
    displayName: 'NIFTY 50',
    symbol: 'NIFTY50',
    yahooTicker: '^NSEI',
    exchange: 'NSE',
  },
  {
    displayName: 'SENSEX',
    symbol: 'SENSEX',
    yahooTicker: '^BSESN',
    exchange: 'BSE',
  },
  {
    displayName: 'NIFTY BANK',
    symbol: 'BANKNIFTY',
    yahooTicker: '^NSEBANK',
    exchange: 'NSE',
  },
];

/**
 * YFinanceMarketDataProvider
 * Development and live quote market data provider utilizing Yahoo Finance v8 chart feeds.
 *
 * NOTE: Free prototype feed. Quotes are delayed ~15 minutes during live market hours.
 * Internally identified as "Yahoo Finance / yfinance".
 */
export class YFinanceMarketDataProvider implements MarketDataProvider {
  readonly id = 'yfinance';
  readonly name = 'Yahoo Finance';
  readonly sourceLabel = 'Yahoo Finance / yfinance';

  async fetchIndices(marketStatus: MarketStatus): Promise<MarketIndex[]> {
    const results = await Promise.allSettled(
      TRACKED_INDICES.map((cfg) => this.fetchSingleIndex(cfg, marketStatus))
    );

    const validIndices: MarketIndex[] = [];
    for (const res of results) {
      if (res.status === 'fulfilled' && res.value !== null) {
        validIndices.push(res.value);
      }
    }

    if (validIndices.length === 0) {
      throw new Error('All Yahoo Finance index queries failed or returned empty results.');
    }

    return validIndices;
  }

  private async fetchSingleIndex(
    cfg: IndexConfig,
    marketStatus: MarketStatus
  ): Promise<MarketIndex | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6500);

    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
        cfg.yahooTicker
      )}?interval=1d&range=5d`;

      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'application/json',
        },
        signal: controller.signal,
        cache: 'no-store',
      });

      if (!res.ok) {
        return null;
      }

      const json = await res.json();
      const chartResult = json?.chart?.result?.[0];
      if (!chartResult) {
        return null;
      }

      const calculated = calculateIndexMetrics(cfg.symbol, chartResult);
      if (!calculated.isValid) {
        return null;
      }

      return {
        name: cfg.displayName,
        symbol: cfg.symbol,
        value: calculated.currentPrice,
        change: calculated.change,
        changePercent: calculated.changePercent,
        previousClose: calculated.previousClose,
        timestamp: calculated.tradeTimestamp,
        marketStatus,
        source: this.sourceLabel,
      };
    } catch {
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Fetches a dynamic quote for a single instrument (e.g. TCS on NSE -> TCS.NS).
   * Validates quote against FINOVA's quote policy.
   * Rejects invalid or stale quotes cleanly without inventing prices.
   */
  async fetchQuote(
    symbol: string,
    exchange: string = 'NSE'
  ): Promise<MarketQuote | null> {
    const cleanSym = symbol?.trim().toUpperCase();
    if (!cleanSym) return null;

    const yahooTicker = resolveYahooFinanceSymbol(cleanSym, exchange);
    if (!yahooTicker) return null;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6500);

    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
        yahooTicker
      )}?interval=1d&range=5d`;

      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'application/json',
        },
        signal: controller.signal,
        cache: 'no-store',
      });

      if (!res.ok) {
        return null;
      }

      const json = await res.json();
      const chartResult = json?.chart?.result?.[0];
      const meta = chartResult?.meta;
      if (!meta) return null;

      // 1. Derive mathematically accurate metrics (price, previous close, daily change, change %)
      const metrics = calculateIndexMetrics(cleanSym, chartResult, {
        exchangeTimezone: 'Asia/Kolkata',
      });

      if (!metrics.isValid || metrics.currentPrice <= 0) {
        return null;
      }

      // 2. Validate quote compliance
      const isCommodityFuture = cleanSym.includes('=') || cleanSym === 'GC=F' || cleanSym === 'SI=F';
      const expectedCurrency = isCommodityFuture ? (meta.currency || 'USD') : 'INR';

      const validation = validateMarketQuote(
        {
          symbol: cleanSym,
          price: metrics.currentPrice,
          currency: meta.currency,
          timestamp: meta.regularMarketTime ? meta.regularMarketTime * 1000 : null,
          source: this.sourceLabel,
        },
        { expectedCurrency }
      );

      if (!validation.isValid || validation.normalizedPrice === undefined) {
        return null;
      }

      const high52w = typeof meta.fiftyTwoWeekHigh === 'number' ? Number(meta.fiftyTwoWeekHigh.toFixed(2)) : null;
      const low52w = typeof meta.fiftyTwoWeekLow === 'number' ? Number(meta.fiftyTwoWeekLow.toFixed(2)) : null;
      const volume = typeof meta.regularMarketVolume === 'number' ? Number(meta.regularMarketVolume) : null;

      return {
        symbol: extractBaseSymbol(cleanSym),
        providerTicker: yahooTicker,
        exchange: exchange.toUpperCase(),
        price: metrics.currentPrice,
        currency: meta.currency || 'INR',
        source: this.sourceLabel,
        status: validation.status,
        price_timestamp: validation.normalizedTimestamp || metrics.tradeTimestamp,
        received_at: new Date().toISOString(),
        previousClose: metrics.previousClose,
        sessionOpen: Number.isFinite(meta.regularMarketOpen) ? meta.regularMarketOpen : null,
        dayHigh: Number.isFinite(meta.regularMarketDayHigh) ? meta.regularMarketDayHigh : null,
        dayLow: Number.isFinite(meta.regularMarketDayLow) ? meta.regularMarketDayLow : null,
        day_change: metrics.change,
        day_change_pct: metrics.changePercent,
        high_52w: high52w,
        low_52w: low52w,
        volume: volume,
        isValid: true,
      };
    } catch {
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Fetches quotes for multiple instruments in parallel with error isolation.
   */
  async fetchQuotes(
    instruments: Array<{ symbol: string; exchange?: string }>
  ): Promise<Map<string, MarketQuote>> {
    const quoteMap = new Map<string, MarketQuote>();
    if (!instruments || instruments.length === 0) return quoteMap;

    // Deduplicate by symbol + exchange
    const uniqueMap = new Map<string, { symbol: string; exchange?: string }>();
    for (const inst of instruments) {
      if (inst?.symbol?.trim()) {
        const key = `${inst.symbol.trim().toUpperCase()}|${(inst.exchange || 'NSE').trim().toUpperCase()}`;
        if (!uniqueMap.has(key)) {
          uniqueMap.set(key, inst);
        }
      }
    }

    const uniqueList = Array.from(uniqueMap.values());
    const results = await Promise.allSettled(
      uniqueList.map((inst) => this.fetchQuote(inst.symbol, inst.exchange || 'NSE'))
    );

    for (const res of results) {
      if (res.status === 'fulfilled' && res.value !== null) {
        quoteMap.set(res.value.symbol.toUpperCase(), res.value);
        if (res.value.providerTicker) {
          quoteMap.set(res.value.providerTicker.toUpperCase(), res.value);
        }
      }
    }

    return quoteMap;
  }

  /**
   * Fetches historical chart series for interactive financial graphs.
   * Maps FINOVA ranges (1D, 1W, 1M, 3M, 1Y, 5Y, MAX) to validated Yahoo Finance range & interval pairs.
   */
  async fetchHistoricalChart(
    symbol: string,
    exchange: string = 'NSE',
    range: ChartRange = '1M'
  ): Promise<HistoricalChartResponse | null> {
    const cleanSym = symbol?.trim().toUpperCase();
    if (!cleanSym) return null;

    const yahooTicker = resolveYahooFinanceSymbol(cleanSym, exchange);
    if (!yahooTicker) return null;

    const RANGE_MAP: Record<ChartRange, { range: string; interval: string }> = {
      '1D': { range: '1d', interval: '5m' },
      '1W': { range: '5d', interval: '15m' },
      '1M': { range: '1mo', interval: '1d' },
      '3M': { range: '3mo', interval: '1d' },
      '1Y': { range: '1y', interval: '1d' },
      '5Y': { range: '5y', interval: '1wk' },
      'MAX': { range: 'max', interval: '1mo' },
    };

      const targetConfig = RANGE_MAP[range] || RANGE_MAP['1M'];
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7500);

    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
        yahooTicker
      )}?range=${targetConfig.range}&interval=${targetConfig.interval}`;

      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'application/json',
        },
        signal: controller.signal,
        cache: 'no-store',
      });

      if (res.status === 429) {
        const header = res.headers.get('Retry-After');
        const numeric = Number(header);
        const seconds = header && Number.isFinite(numeric) ? numeric : Math.ceil((Date.parse(header || '') - Date.now()) / 1000);
        throw new HistoryProviderRateLimitError(Number.isFinite(seconds) ? Math.max(30, seconds) : 30);
      }
      if (!res.ok) return null;

      const json = await res.json();
      const chartResult = json?.chart?.result?.[0];
      if (!chartResult) return null;

      const meta = chartResult.meta;
      const timestamps: number[] = chartResult.timestamp || [];
      const quoteObj = chartResult.indicators?.quote?.[0] || {};
      const opens: (number | null)[] = quoteObj.open || [];
      const highs: (number | null)[] = quoteObj.high || [];
      const lows: (number | null)[] = quoteObj.low || [];
      const closes: (number | null)[] = quoteObj.close || [];
      const volumes: (number | null)[] = quoteObj.volume || [];

      const points: HistoricalChartPoint[] = [];

      for (let i = 0; i < timestamps.length; i++) {
        const ts = timestamps[i];
        const c = closes[i];
        if (typeof c === 'number' && !isNaN(c) && c > 0) {
          points.push({
            timestamp: ts * 1000,
            date: new Date(ts * 1000).toISOString(),
            close: Number(c.toFixed(2)),
            open: typeof opens[i] === 'number' && !isNaN(opens[i]!) ? Number(opens[i]!.toFixed(2)) : null,
            high: typeof highs[i] === 'number' && !isNaN(highs[i]!) ? Number(highs[i]!.toFixed(2)) : null,
            low: typeof lows[i] === 'number' && !isNaN(lows[i]!) ? Number(lows[i]!.toFixed(2)) : null,
            volume: typeof volumes[i] === 'number' && !isNaN(volumes[i]!) ? volumes[i]! : null,
          });
        }
      }

      if (points.length === 0) return null;

      const firstPoint = points[0];
      const lastPoint = points[points.length - 1];
      const currentPrice = typeof meta?.regularMarketPrice === 'number' && meta.regularMarketPrice > 0
        ? Number(meta.regularMarketPrice.toFixed(2))
        : lastPoint.close;

      const previousClose = typeof meta?.previousClose === 'number' && meta.previousClose > 0
        ? Number(meta.previousClose.toFixed(2))
        : null;

      const dayChange = previousClose !== null
        ? Number((currentPrice - previousClose).toFixed(2))
        : null;

      const dayChangePercent = previousClose !== null && previousClose > 0
        ? Number(((currentPrice - previousClose) / previousClose * 100).toFixed(2))
        : null;

      const periodChange = Number((lastPoint.close - firstPoint.close).toFixed(2));
      const periodChangePercent = firstPoint.close > 0
        ? Number(((lastPoint.close - firstPoint.close) / firstPoint.close * 100).toFixed(2))
        : 0;

      const high52w = typeof meta?.fiftyTwoWeekHigh === 'number' ? Number(meta.fiftyTwoWeekHigh.toFixed(2)) : null;
      const low52w = typeof meta?.fiftyTwoWeekLow === 'number' ? Number(meta.fiftyTwoWeekLow.toFixed(2)) : null;
      const dayHigh = typeof meta?.regularMarketDayHigh === 'number' ? Number(meta.regularMarketDayHigh.toFixed(2)) : null;
      const dayLow = typeof meta?.regularMarketDayLow === 'number' ? Number(meta.regularMarketDayLow.toFixed(2)) : null;
      const volume = typeof meta?.regularMarketVolume === 'number' ? meta.regularMarketVolume : null;

      return {
        symbol: extractBaseSymbol(cleanSym),
        providerTicker: yahooTicker,
        exchange: exchange.toUpperCase(),
        range,
        interval: targetConfig.interval,
        currency: meta?.currency || 'INR',
        points,
        currentPrice,
        previousClose,
        dayChange,
        dayChangePercent,
        periodChange,
        periodChangePercent,
        high_52w: high52w,
        low_52w: low52w,
        dayHigh,
        dayLow,
        volume,
        source: this.sourceLabel,
        lastUpdated: new Date().toISOString(),
        quoteTimestamp: meta?.regularMarketTime ? new Date(meta.regularMarketTime * 1000).toISOString() : null,
        retrievedAt: new Date().toISOString(),
        priceBasis: 'Provider close prices; FINOVA does not independently verify corporate-action adjustments. Excludes dividends.',
        exchangeTimezone: meta?.exchangeTimezoneName || undefined,
        ...(Number.isFinite(meta?.currentTradingPeriod?.regular?.start) && Number.isFinite(meta?.currentTradingPeriod?.regular?.end)
          ? { regularSession: { start: meta.currentTradingPeriod.regular.start * 1000, end: meta.currentTradingPeriod.regular.end * 1000 } } : {}),
      };
    } catch (error) {
      if (error instanceof HistoryProviderRateLimitError) throw error;
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
