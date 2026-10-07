// ============================================================
// Finova — Dashboard Typed Data Structures
// Reusable, strongly typed models for the unified fintech UI
// ============================================================

export type TimeRange = '1D' | '1W' | '1M' | 'YTD' | '1Y' | 'All';

export interface ChartDataPoint {
  timestamp: string;
  label: string;
  value: number;
  invested?: number;
}

export interface PortfolioSummaryData {
  totalValue: number;
  formattedTotalValue: string;
  overallReturnAmount: number;
  overallReturnPercentage: number;
  oneYearReturnPercentage: number;
  todayChangeAmount: number;
  todayChangePercentage: number;
  currency: string;
  chartDataByRange: Record<TimeRange, ChartDataPoint[]>;
}

export type AssetCategory =
  | 'Stocks'
  | 'Mutual Funds'
  | 'Bonds'
  | 'REITs'
  | 'InvITs'
  | 'Cash';

export interface AllocationSegment {
  id: string;
  category: AssetCategory;
  name: string;
  percentage: number;
  value: number;
  color: string;
  itemCount: number;
}

export interface HoldingItem {
  id: string;
  name: string;
  symbol: string;
  exchange: 'NSE' | 'BSE' | 'MF' | 'RBI';
  category: AssetCategory;
  currentValue: number;
  change24hPercentage: number;
  change24hAmount: number;
  portfolioWeightPercentage: number;
  avatarColor: string;
  avatarInitial: string;
  shares?: number;
  avgBuyPrice?: number;
}

export type InsightType = 'ai_alert' | 'diversification' | 'fixed_income' | 'rebalance';

export interface DiscoverInsightItem {
  id: string;
  tag: string;
  badgeVariant?: 'brand' | 'warning' | 'info' | 'gain';
  title: string;
  description: string;
  category: string;
  actionText: string;
  actionHref: string;
  metadata?: string;
}

export interface MarketIndexItem {
  id: string;
  name: string;
  currentValue: number;
  changeAmount: number;
  changePercentage: number;
  state: 'Open' | 'Closed';
  lastUpdated: string;
}

export interface NewsItem {
  id: string;
  headline: string;
  source: string;
  publishedTimeAgo: string;
  relatedAsset: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  url?: string;
  summary?: string;
}
