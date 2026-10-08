import type { MarketIndex, MarketStatus } from '@/types/market';

export interface MarketDataProvider {
  readonly id: string;
  readonly name: string;
  readonly sourceLabel: string;
  fetchIndices(marketStatus: MarketStatus): Promise<MarketIndex[]>;
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
 * Development / prototype market data provider utilizing Yahoo Finance v8 chart feeds.
 *
 * NOTE: This is an interim prototype data source. It is NOT official NSE/BSE exchange API data.
 * Internally identified as "Yahoo Finance / yfinance".
 * Future migration: replace with UpstoxMarketDataProvider in MarketDataService.
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

      if (!meta || typeof meta.regularMarketPrice !== 'number') {
        return null;
      }

      const price = Number(meta.regularMarketPrice);
      const prevClose = Number(meta.chartPreviousClose || meta.previousClose || price);
      const rawChange = price - prevClose;
      const rawChangePercent = prevClose > 0 ? (rawChange / prevClose) * 100 : 0;

      const tradeTime = meta.regularMarketTime
        ? new Date(meta.regularMarketTime * 1000).toISOString()
        : new Date().toISOString();

      return {
        name: cfg.displayName,
        symbol: cfg.symbol,
        value: Number(price.toFixed(2)),
        change: Number(rawChange.toFixed(2)),
        changePercent: Number(rawChangePercent.toFixed(2)),
        timestamp: tradeTime,
        marketStatus,
        source: this.sourceLabel,
      };
    } catch {
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
