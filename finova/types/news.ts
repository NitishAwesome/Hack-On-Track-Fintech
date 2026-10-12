// ============================================================
// FINOVA — News Domain & Personalization Types (Prompt 12)
// Strongly typed models for Real Financial News, Provider Status,
// Portfolio-Aware Relevance Engine, and Explainable News Intelligence
// ============================================================

import type { AssetClass } from './portfolio';

export type NewsFreshness = 'LIVE' | 'TODAY' | 'RECENT' | 'ARCHIVED';

export type NewsRelevanceCategory =
  | 'DIRECT_HOLDING'
  | 'SECTOR_RELEVANCE'
  | 'ASSET_CLASS'
  | 'GENERAL_MARKET'
  | 'UNVERIFIED';

export type NewsProviderStatus =
  | 'ACTIVE'
  | 'NOT_CONFIGURED'
  | 'RATE_LIMITED'
  | 'UNAVAILABLE'
  | 'EMPTY'
  | 'ERROR';

export type TimestampType = 'published' | 'indexed' | 'unavailable';

export interface ArticleTemporalInfo {
  timestamp_type: TimestampType;
  raw_timestamp: string | null;
  formatted_ist: string;
  relative_time: string;
  display_label: string;
  freshness_badge: string;
  freshness_label: string;
  is_delayed_feed: boolean;
  delay_note?: string;
  provider_display_name: string;
  is_cached: boolean;
  retrieved_ist?: string | null;
  is_future_or_invalid: boolean;
}

/**
 * Normalized news article from verified providers (e.g. Marketaux, GDELT, NewsData.io)
 * Strict validation: URL must be valid HTTP(S), pubDate must be parseable.
 */
export interface NormalizedNewsArticle {
  article_id: string;
  title: string;
  link: string;
  description: string | null;
  source_name: string;
  source_id?: string | null;
  pubDate: string; // ISO 8601 string
  retrieved_at: string; // ISO 8601 string
  image_url: string | null;
  keywords: string[] | null;
  categories: string[] | null;
  source_provider: 'newsdata' | 'marketaux' | 'gdelt' | 'curated_test_fixture' | 'system';
  language: string;
  freshness: NewsFreshness;
  symbols?: string[] | null;
  temporal_info?: ArticleTemporalInfo;
}

/**
 * Matched holding association for an article
 */
export interface MatchedHoldingContext {
  symbol: string;
  name: string;
  asset_class: AssetClass;
  sector?: string | null;
  industry?: string | null;
  weight_pct?: number | null; // Based on reliably valued denominator
  is_cross_broker?: boolean;
  broker_names?: string[];
}

/**
 * Fully personalized article with deterministic relevance calculations
 */
export interface PersonalizedNewsArticle extends NormalizedNewsArticle {
  relevance_category: NewsRelevanceCategory;
  relevance_score: number; // 0 to 100 deterministic ranking score
  matched_holding?: MatchedHoldingContext | null;
  matched_sector?: string | null;
  matched_asset_class?: AssetClass | null;
  explanation: string; // Deterministic "Why this matters" statement
  investigation_prompts: string[]; // Educational prompts for the investor
}

/**
 * User portfolio context passed into the personalization engine
 */
export interface UserPortfolioContext {
  user_id: string;
  holdings: Array<{
    symbol: string;
    instrument_name?: string;
    asset_class: AssetClass;
    sector?: string | null;
    industry?: string | null;
    current_value?: number | null;
    invested_value: number;
    broker_name?: string;
    isin?: string | null;
  }>;
  total_valued_capital: number;
  represented_sectors: string[];
  represented_asset_classes: AssetClass[];
  is_valuation_complete: boolean;
}

/**
 * News API response format
 */
export interface NewsApiResponse {
  status: 'success' | 'not_configured' | 'rate_limited' | 'empty' | 'error';
  articles: PersonalizedNewsArticle[];
  provider_status: NewsProviderStatus;
  message?: string;
  next_page?: string | null;
  meta: {
    total_fetched: number;
    direct_matches_count: number;
    sector_matches_count: number;
    cached: boolean;
    provider: string;
    providers_used?: string[];
    provider_breakdown?: Record<string, number>;
    last_updated: string;
    portfolio_symbols_count: number;
    next_page?: string | null;
  };
}

/**
 * Grounded AI News Explanation Request & Response
 */
export interface NewsExplainerRequest {
  article_id: string;
  title: string;
  source_name: string;
  pubDate: string;
  description?: string | null;
  link?: string;
  symbol?: string; // Optional user-selected focus symbol
  user_question?: string;
}

export interface NewsExplainerResponse {
  success: boolean;
  explanation: string;
  grounded_context: {
    article_title: string;
    publisher: string;
    matched_symbol?: string | null;
    verified_portfolio_weight?: number | null;
    verified_sector?: string | null;
    is_held_in_portfolio: boolean;
  };
  investigation_prompts: string[];
  source: 'gemini' | 'deterministic_fallback';
  disclaimer: string;
}
