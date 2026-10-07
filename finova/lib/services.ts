// ============================================================
// Finova — Service Interfaces
// Clean separation between UI and data sources.
// These interfaces define the contract; implementations
// (mock, Supabase, real API) can be swapped without touching components.
// ============================================================

import type {
  HoldingWithMetrics,
  PortfolioSummary,
  AssetAllocation,
  BrokerAllocation,
  BrokerAccount,
  RiskMetrics,
  NewsArticle,
} from '@/types/portfolio';

// ─── Portfolio Service ────────────────────────────────────────

export interface PortfolioSummaryResponse {
  summary: PortfolioSummary;
  assetAllocation: AssetAllocation[];
  brokerAllocation: BrokerAllocation[];
  riskMetrics: RiskMetrics;
}

export interface AddHoldingInput {
  symbol: string;
  name: string;
  asset_class: string;
  quantity: number;
  buy_price: number;
  broker_account_id: string;
  buy_date?: string;
  notes?: string;
}

export interface PortfolioService {
  getSummary(): Promise<PortfolioSummaryResponse>;
  getHoldings(): Promise<{ holdings: HoldingWithMetrics[] }>;
  addHolding(input: AddHoldingInput): Promise<HoldingWithMetrics>;
  deleteHolding(id: string): Promise<void>;
  bulkImport(holdings: Partial<AddHoldingInput>[]): Promise<{ imported: number }>;
}

// ─── Market Data Service ──────────────────────────────────────

export interface QuoteData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
  volume: number;
  marketCap?: number;
  pe?: number;
  high52w?: number;
  low52w?: number;
  lastUpdated: string;
}

export interface PerformancePoint {
  date: string;
  value: number;
  invested: number;
}

export interface MarketDataService {
  getQuote(symbol: string): Promise<QuoteData>;
  getBulkQuotes(symbols: string[]): Promise<Record<string, QuoteData>>;
  getPerformanceHistory(
    holdings: { symbol: string; quantity: number; buy_price: number }[],
    period: '1M' | '3M' | '6M' | '1Y' | '3Y' | 'ALL'
  ): Promise<PerformancePoint[]>;
  getMarketStatus(): Promise<{ isOpen: boolean; exchange: string; nextOpen?: string }>;
}

// ─── News Service ─────────────────────────────────────────────

export interface NewsService {
  getArticles(params: {
    symbols?: string[];
    category?: string;
    limit?: number;
  }): Promise<{ articles: NewsArticle[] }>;
}

// ─── Broker Service ───────────────────────────────────────────

export interface BrokerServiceData {
  accounts: BrokerAccount[];
}

export interface BrokerService {
  getAccounts(): Promise<BrokerServiceData>;
  addAccount(input: Omit<BrokerAccount, 'id' | 'created_at'>): Promise<BrokerAccount>;
  deleteAccount(id: string): Promise<void>;
  syncAccount(id: string): Promise<{ synced: number }>;
}

// ─── AI Service ───────────────────────────────────────────────

export type InsightType =
  | 'portfolio_summary'
  | 'risk_analysis'
  | 'diversification_advice'
  | 'sector_analysis'
  | 'rebalancing_suggestion';

export interface AIInsight {
  text: string;
  cached: boolean;
  generatedAt: string;
  insightType: InsightType;
}

export interface AIExplanation {
  type: string;
  explanation: string;
}

export interface AIService {
  getInsight(insightType: InsightType): Promise<AIInsight>;
  explainInstrument(type: string): Promise<AIExplanation>;
}
