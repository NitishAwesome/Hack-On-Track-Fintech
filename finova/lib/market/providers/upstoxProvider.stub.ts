import type { MarketIndex, MarketStatus } from '@/types/market';
import type { MarketDataProvider, MarketQuote } from './yfinanceProvider';

/**
 * UpstoxMarketDataProvider (Future Architecture Template)
 *
 * Once demat and developer credentials (API Key & Secret) are acquired from Upstox,
 * implement this class and swap it into MarketDataService:
 *
 * MarketDataService.setProvider(new UpstoxMarketDataProvider(apiKey, accessToken))
 *
 * The frontend (MarketSnapshot, Dashboard, Landing) will require ZERO changes.
 */
export class UpstoxMarketDataProvider implements MarketDataProvider {
  readonly id = 'upstox';
  readonly name = 'Upstox API';
  readonly sourceLabel = 'Upstox';

  constructor(
    private readonly apiKey?: string,
    private readonly accessToken?: string
  ) {}

  async fetchIndices(_marketStatus: MarketStatus): Promise<MarketIndex[]> {
    void _marketStatus;
    if (!this.apiKey || !this.accessToken) {
      throw new Error('Upstox API credentials are not configured.');
    }
    throw new Error('Upstox provider is a future implementation stub.');
  }

  async fetchQuote(_symbol: string, _exchange?: string): Promise<MarketQuote | null> {
    void _symbol;
    void _exchange;
    if (!this.apiKey || !this.accessToken) {
      throw new Error('Upstox API credentials are not configured.');
    }
    throw new Error('Upstox provider is a future implementation stub.');
  }

  async fetchQuotes(
    _instruments: Array<{ symbol: string; exchange?: string }>
  ): Promise<Map<string, MarketQuote>> {
    void _instruments;
    if (!this.apiKey || !this.accessToken) {
      throw new Error('Upstox API credentials are not configured.');
    }
    throw new Error('Upstox provider is a future implementation stub.');
  }
}
