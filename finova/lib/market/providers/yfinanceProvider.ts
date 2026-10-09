// ============================================================
// FINOVA — Market Data Providers
// Primary: YFinanceMarketDataProvider (Yahoo Finance v8 feeds)
// ============================================================

import type { MarketIndex, MarketStatus } from '@/types/market';
import type { PriceStatus } from '@/types/database';
import {
  resolveYahooFinanceSymbol,
  extractBaseSymbol,
} from '@/lib/market/symbolMapper';
import { validateMarketQuote } from '@/lib/market/quoteValidator';
import { calculateIndexMetrics } from '@/lib/market/indexCalculator';

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
  high_52w: number | null;
  low_52w: number | null;
  volume: number | null;
  isValid: boolean;
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
      )}?interval=1d`;

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
      const meta = json?.chart?.result?.[0]?.meta;
      if (!meta) return null;

      const validation = validateMarketQuote({
        symbol: cleanSym,
        price: meta.regularMarketPrice,
        currency: meta.currency,
        timestamp: meta.regularMarketTime ? meta.regularMarketTime * 1000 : null,
        source: this.sourceLabel,
      });

      if (!validation.isValid || validation.normalizedPrice === undefined) {
        return null;
      }

      const price = validation.normalizedPrice;
      const prevClose = Number(meta.chartPreviousClose || meta.previousClose || price);
      const rawChange = price - prevClose;
      const rawChangePercent = prevClose > 0 ? (rawChange / prevClose) * 100 : 0;

      const high52w = typeof meta.fiftyTwoWeekHigh === 'number' ? Number(meta.fiftyTwoWeekHigh.toFixed(2)) : null;
      const low52w = typeof meta.fiftyTwoWeekLow === 'number' ? Number(meta.fiftyTwoWeekLow.toFixed(2)) : null;
      const volume = typeof meta.regularMarketVolume === 'number' ? Number(meta.regularMarketVolume) : null;

      return {
        symbol: extractBaseSymbol(cleanSym),
        providerTicker: yahooTicker,
        exchange: exchange.toUpperCase(),
        price,
        currency: meta.currency || 'INR',
        source: this.sourceLabel,
        status: validation.status,
        price_timestamp: validation.normalizedTimestamp || new Date().toISOString(),
        received_at: new Date().toISOString(),
        day_change: Number(rawChange.toFixed(2)),
        day_change_pct: Number(rawChangePercent.toFixed(2)),
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
}
