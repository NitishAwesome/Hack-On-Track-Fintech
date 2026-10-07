// ============================================================
// Finova — Core TypeScript Types
// ============================================================

// ----- Database row types (mirrors Supabase schema) -----

export type AssetClass = 'equity' | 'reit' | 'invit' | 'bond' | 'sgb' | 'etf' | 'mf';
export type Exchange = 'NSE' | 'BSE' | 'NCD' | 'MCX' | 'OTHER';
export type RiskAppetite = 'conservative' | 'moderate' | 'aggressive';
export type AccountType = 'demat' | 'trading' | 'mf' | 'other';
export type TransactionType = 'buy' | 'sell' | 'dividend' | 'bonus' | 'split' | 'rights';

export interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  pan_masked: string | null;
  risk_appetite: RiskAppetite | null;
  preferred_currency: string;
  onboarding_done: boolean;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface BrokerAccount {
  id: string;
  user_id: string;
  broker_name: string;
  account_label: string | null;
  account_type: AccountType;
  color_hex: string;
  is_active: boolean;
  created_at: string;
}

export interface Holding {
  id: string;
  user_id: string;
  broker_account_id: string | null;
  symbol: string;
  isin: string | null;
  name: string;
  asset_class: AssetClass;
  exchange: Exchange | null;
  quantity: number;
  avg_buy_price: number;
  current_price: number | null;
  price_updated_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  broker_account?: BrokerAccount;
}

export interface Transaction {
  id: string;
  user_id: string;
  holding_id: string | null;
  broker_account_id: string | null;
  transaction_type: TransactionType;
  symbol: string;
  quantity: number;
  price: number;
  charges: number;
  transaction_date: string;
  notes: string | null;
  created_at: string;
}

// ----- Calculated / Derived Types -----

export interface HoldingWithMetrics extends Holding {
  current_value: number;
  invested_value: number;
  absolute_return: number;
  absolute_return_pct: number;
  day_change: number | null;
  day_change_pct: number | null;
}

export interface PortfolioSummary {
  total_current_value: number;
  total_invested_value: number;
  total_absolute_return: number;
  total_absolute_return_pct: number;
  total_day_change: number | null;
  total_day_change_pct: number | null;
  holding_count: number;
  broker_count: number;
  last_updated: string;
}

export interface AssetAllocation {
  asset_class: AssetClass;
  value: number;
  percentage: number;
  holding_count: number;
}

export interface BrokerAllocation {
  broker_name: string;
  broker_account_id: string;
  color_hex: string;
  value: number;
  percentage: number;
}

export interface RiskMetrics {
  risk_score: number;           // 0–100
  risk_label: 'Conservative' | 'Moderate' | 'Aggressive';
  hhi: number;                  // 0–1 Herfindahl-Hirschman Index
  equity_weight: number;        // 0–1 fraction in equities
  broker_count: number;
  top_holding_weight: number;   // largest single holding as % of portfolio
  concentration_warnings: string[];
}

export interface PerformanceDataPoint {
  date: string;
  value: number;
  invested: number;
}

// ----- AI Types -----

export type InsightType =
  | 'portfolio_summary'
  | 'diversification_advice'
  | 'risk_analysis'
  | 'investment_explainer'
  | 'news_relevance';

export interface AIInsight {
  insight_type: InsightType;
  text: string;
  generated_at: string;
  cached: boolean;
}

// ----- News Types -----

export interface NewsArticle {
  article_id: string;
  title: string;
  link: string;
  description: string | null;
  source_name: string;
  pubDate: string;
  image_url: string | null;
  keywords: string[] | null;
}

// ----- Market Data Types -----

export interface MarketQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  change_pct: number;
  prev_close: number;
  high: number;
  low: number;
  volume: number;
  timestamp: string;
}

// ----- CSV Import Types -----

export interface CSVHoldingRow {
  symbol: string;
  isin?: string;
  name: string;
  asset_class: AssetClass;
  exchange?: Exchange;
  quantity: number;
  avg_buy_price: number;
  broker?: string;
}
