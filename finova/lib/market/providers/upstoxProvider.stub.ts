import type { MarketIndex, MarketStatus } from '@/types/market';
import type { MarketDataProvider } from './yfinanceProvider';

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

    // Example future implementation:
    // const res = await fetch('https://api.upstox.com/v2/market-quote/quotes?instrument_key=NSE_INDEX|Nifty 50,BSE_INDEX|SENSEX,NSE_INDEX|Nifty Bank', {
    //   headers: {
    //     Authorization: `Bearer ${this.accessToken}`,
    //     Accept: 'application/json',
    //   },
    // });
    // parse and return MarketIndex[]

    throw new Error('Upstox provider is a future implementation stub.');
  }
}
