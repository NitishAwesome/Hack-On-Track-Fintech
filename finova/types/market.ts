export type MarketStatus = 'OPEN' | 'CLOSED' | 'PRE_OPEN' | 'UNKNOWN';
export type MarketStatusType = MarketStatus;

export interface MarketIndex {
  name: string;
  symbol: string;
  value: number;
  change: number | null;
  changePercent: number | null;
  previousClose?: number | null;
  timestamp: string;
  marketStatus: MarketStatus;
  source: string;
}

export type MarketIndexQuote = MarketIndex;

export interface MarketDataResponse {
  success: boolean;
  status: 'SUCCESS' | 'UNAVAILABLE' | 'ERROR';
  indices: MarketIndex[];
  /** Alias for indices to maintain compatibility */
  quotes: MarketIndex[];
  marketStatus: MarketStatus;
  marketStatusLabel: string;
  isDelayedOrClosing: boolean;
  message?: string;
  lastUpdated: string;
  source: string;
}

export type MarketIndexResponse = MarketDataResponse;
