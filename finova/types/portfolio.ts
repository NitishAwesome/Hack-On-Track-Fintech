// ============================================================
// Finova — Core TypeScript Types
// ============================================================

export * from './database';

// ----- Database row types (mirrors Supabase schema) -----

export type AssetClass = 'equity' | 'reit' | 'invit' | 'bond' | 'sgb' | 'etf' | 'mf';
export type Exchange = 'NSE' | 'BSE' | 'NCD' | 'MCX' | 'OTHER';
export type RiskAppetite = 'conservative' | 'moderate' | 'aggressive';
export type AccountType = 'demat' | 'trading' | 'mf' | 'other' | 'broker' | 'depository' | 'manual';
export type TransactionType =
  | 'buy'
  | 'sell'
  | 'dividend'
  | 'bonus'
  | 'split'
  | 'rights'
  | 'BUY'
  | 'SELL'
  | 'DIVIDEND'
  | 'INTEREST'
  | 'COUPON'
  | 'BONUS'
  | 'SPLIT'
  | 'FEE';

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
  broker_code?: string;
  display_name?: string;
  account_label: string | null;
  account_type: AccountType;
  connection_status?: string;
  data_source?: string;
  currency?: string;
  color_hex?: string;
  is_active?: boolean;
  created_at: string;
  updated_at?: string;
}

export interface Holding {
  id: string;
  user_id: string;
  broker_account_id: string | null;
  instrument_id?: string;
  symbol: string;
  isin: string | null;
  name: string;
  asset_class: AssetClass;
  exchange: Exchange | null;
  quantity: number;
  avg_buy_price: number;
  average_buy_price?: number;
  current_price: number | null;
  currency?: string;
  data_source?: string;
  as_of?: string;
  price_updated_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  broker_account?: BrokerAccount;
}

export interface Transaction {
  id: string;
  user_id: string;
  holding_id?: string | null;
  broker_account_id: string | null;
  instrument_id?: string;
  transaction_type: TransactionType;
  symbol: string;
  quantity: number;
  price: number;
  unit_price?: number;
  gross_amount?: number;
  fees?: number;
  taxes?: number;
  net_amount?: number;
  charges: number;
  transaction_date: string;
  settlement_date?: string | null;
  source?: string;
  external_reference?: string | null;
  notes: string | null;
  created_at: string;
}

// ----- Calculated / Derived Types -----

export interface HoldingWithMetrics extends Holding {
  current_value: number;
  invested_value: number;
  absolute_return: number | null;
  absolute_return_pct: number | null;
  day_change: number | null;
  day_change_pct: number | null;
}

export interface PortfolioSummary {
  total_current_value: number | null;
  total_invested_value: number;
  total_absolute_return: number | null;
  total_absolute_return_pct: number | null;
  total_day_change: number | null;
  total_day_change_pct: number | null;
  holding_count: number;
  broker_count: number;
  last_updated: string;
  has_unquoted_assets?: boolean;
  unquoted_count?: number;
  priced_count?: number;
  is_valuation_complete?: boolean;
}

export interface AssetAllocation {
  asset_class: AssetClass;
  value: number;
  percentage: number;
  holding_count: number;
  unquoted_count?: number;
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
