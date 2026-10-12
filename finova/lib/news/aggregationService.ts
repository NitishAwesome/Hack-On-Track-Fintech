// ============================================================
// FINOVA — Multi-Provider Financial News Aggregation Service
// lib/news/aggregationService.ts
//
// Combines NewsData.io, MarketAux, and GDELT 2.0:
// 1. Concurrent fetching via Promise.allSettled (fault-tolerant).
// 2. Multi-factor deduplication (Canonical URL + Title normalization + Token Jaccard).
// 3. Quality-ranked duplicate resolution (prefers image, snippet, publisher).
// 4. Provider balancing to avoid single-feed dominance.
// 5. Unified NormalizedNewsArticle output for portfolio personalization.
// ============================================================

import type {
  NormalizedNewsArticle,
  NewsProviderStatus,
} from '../../types/news.ts';
import { fetchIndianFinancialNews } from './newsProvider.ts';
import { fetchMarketAuxNews } from './providers/marketAuxProvider.ts';
import { fetchGdeltNews } from './providers/gdeltProvider.ts';
import { resolveArticleTemporalInfo } from './temporalUtils.ts';

export interface AggregationOptions {
  query?: string;
  symbols?: string[];
  forceRefresh?: boolean;
  page?: string;
}

export interface AggregatedNewsResult {
  articles: NormalizedNewsArticle[];
  providerStatus: NewsProviderStatus;
  providersUsed: string[];
  providerBreakdown: Record<string, number>;
  isCached: boolean;
  message?: string;
  nextPage?: string | null;
}

/**
 * Strips UTM parameters, tracking query strings, and trailing slashes from URLs
 */
export function canonicalizeUrl(urlStr: string): string {
  try {
    const url = new URL(urlStr);
    // Remove tracking query parameters
    const paramsToDelete: string[] = [];
    url.searchParams.forEach((_, key) => {
      const lower = key.toLowerCase();
      if (
        lower.startsWith('utm_') ||
        lower.startsWith('fb_') ||
        lower === 'ref' ||
        lower === 'fbclid' ||
        lower === 'gclid' ||
        lower === 'source'
      ) {
        paramsToDelete.push(key);
      }
    });
    for (const p of paramsToDelete) {
      url.searchParams.delete(p);
    }
    return `${url.origin}${url.pathname.replace(/\/+$/, '')}`.toLowerCase();
  } catch {
    return urlStr.toLowerCase().replace(/\/+$/, '');
  }
}

/**
 * Normalizes title for deduplication by stripping punctuation and publication suffixes
 */
export function normalizeTitleForDeduplication(title: string): string {
  return title
    .toLowerCase()
    .replace(/\s*(\||\-|\—)\s*(the economic times|economic times|mint|livemint|business standard|reuters|cnbc|moneycontrol|the times of india|indiatimes|financial express|ndtv profit|zee business|bloomberg).*$/i, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Computes Jaccard word-token similarity between two headlines
 */
export function computeTitleSimilarity(titleA: string, titleB: string): number {
  const wordsA = new Set(
    normalizeTitleForDeduplication(titleA)
      .split(' ')
      .filter((w) => w.length >= 3)
  );
  const wordsB = new Set(
    normalizeTitleForDeduplication(titleB)
      .split(' ')
      .filter((w) => w.length >= 3)
  );

  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let intersection = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) intersection++;
  }

  const union = new Set([...wordsA, ...wordsB]).size;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Evaluates article quality score to select the best version when duplicates exist
 */
function scoreArticleQuality(article: NormalizedNewsArticle): number {
  let score = 0;
  if (article.image_url) score += 3;
  if (article.description && article.description.length > 30) score += 2;
  if (article.symbols && article.symbols.length > 0) score += 2;

  const trustedOutlets = [
    'The Economic Times',
    'Mint',
    'Reuters',
    'Business Standard',
    'Moneycontrol',
    'Financial Express',
    'CNBC-TV18',
    'Bloomberg',
  ];
  if (trustedOutlets.includes(article.source_name)) score += 1;

  // Freshness bonus
  const pubTime = new Date(article.pubDate).getTime();
  if (!isNaN(pubTime) && Date.now() - pubTime < 24 * 60 * 60 * 1000) {
    score += 1;
  }

  return score;
}

/**
 * Intelligent multi-factor deduplication
 */
export function deduplicateAcrossProviders(
  articles: NormalizedNewsArticle[]
): NormalizedNewsArticle[] {
  const result: NormalizedNewsArticle[] = [];

  for (const candidate of articles) {
    const candidateCanonUrl = canonicalizeUrl(candidate.link);
    const candidateNormTitle = normalizeTitleForDeduplication(candidate.title);
    const candidateScore = scoreArticleQuality(candidate);

    let isDuplicate = false;
    let duplicateIndex = -1;

    for (let i = 0; i < result.length; i++) {
      const existing = result[i];
      const existingCanonUrl = canonicalizeUrl(existing.link);
      const existingNormTitle = normalizeTitleForDeduplication(existing.title);

      // Exact canonical URL match
      if (candidateCanonUrl === existingCanonUrl) {
        isDuplicate = true;
        duplicateIndex = i;
        break;
      }

      // Exact normalized title match (if >= 15 characters)
      if (candidateNormTitle.length >= 15 && candidateNormTitle === existingNormTitle) {
        isDuplicate = true;
        duplicateIndex = i;
        break;
      }

      // Fuzzy token similarity (> 75% word overlap)
      const similarity = computeTitleSimilarity(candidate.title, existing.title);
      if (similarity >= 0.75) {
        isDuplicate = true;
        duplicateIndex = i;
        break;
      }
    }

    if (!isDuplicate) {
      result.push(candidate);
    } else {
      // If candidate has strictly higher quality than existing, replace it
      const existingScore = scoreArticleQuality(result[duplicateIndex]);
      if (candidateScore > existingScore) {
        result[duplicateIndex] = candidate;
      }
    }
  }

  return result;
}

/**
 * Balances and interleaves articles across providers to avoid single-feed dominance
 */
function balanceProviderFeeds(
  articlesByProvider: Map<string, NormalizedNewsArticle[]>
): NormalizedNewsArticle[] {
  const combined: NormalizedNewsArticle[] = [];
  const providers = Array.from(articlesByProvider.keys());

  // Find max length
  let maxLength = 0;
  for (const list of articlesByProvider.values()) {
    if (list.length > maxLength) maxLength = list.length;
  }

  // Interleave round-robin
  for (let i = 0; i < maxLength; i++) {
    for (const prov of providers) {
      const list = articlesByProvider.get(prov);
      if (list && i < list.length) {
        combined.push(list[i]);
      }
    }
  }

  return combined;
}

/**
 * Fetches, normalizes, deduplicates, and ranks news across NewsData.io, MarketAux, and GDELT 2.0
 */
export async function getAggregatedFinancialNews(
  options?: AggregationOptions
): Promise<AggregatedNewsResult> {
  const pageNum = options?.page ? parseInt(options.page, 10) : 1;
  const isSecondPage = !isNaN(pageNum) && pageNum > 1;

  // 1. Fetch all providers concurrently with fault isolation
  const [newsDataRes, marketAuxRes, gdeltRes] = await Promise.allSettled([
    fetchIndianFinancialNews({
      query: options?.query,
      symbols: options?.symbols,
      forceRefresh: options?.forceRefresh,
      page: options?.page,
    }),
    fetchMarketAuxNews({
      query: options?.query,
      symbols: options?.symbols,
      forceRefresh: options?.forceRefresh,
      page: isSecondPage ? pageNum : 1,
      limit: 10,
    }),
    fetchGdeltNews({
      query: options?.query,
      symbols: options?.symbols,
      forceRefresh: options?.forceRefresh,
      limit: 15,
    }),
  ]);

  const providerArticles = new Map<string, NormalizedNewsArticle[]>();
  const providersUsed: string[] = [];
  const providerBreakdown: Record<string, number> = {};
  let anyCached = false;

  // Process NewsData.io
  if (newsDataRes.status === 'fulfilled' && newsDataRes.value.articles.length > 0) {
    providerArticles.set('newsdata', newsDataRes.value.articles);
    providersUsed.push('NewsData.io');
    providerBreakdown['newsdata'] = newsDataRes.value.articles.length;
    if (newsDataRes.value.isCached) anyCached = true;
  }

  // Process MarketAux
  if (marketAuxRes.status === 'fulfilled' && marketAuxRes.value.articles.length > 0) {
    providerArticles.set('marketaux', marketAuxRes.value.articles);
    providersUsed.push('MarketAux');
    providerBreakdown['marketaux'] = marketAuxRes.value.articles.length;
    if (marketAuxRes.value.isCached) anyCached = true;
  }

  // Process GDELT 2.0
  if (gdeltRes.status === 'fulfilled' && gdeltRes.value.articles.length > 0) {
    providerArticles.set('gdelt', gdeltRes.value.articles);
    providersUsed.push('GDELT');
    providerBreakdown['gdelt'] = gdeltRes.value.articles.length;
    if (gdeltRes.value.isCached) anyCached = true;
  }

  // 2. Interleave and deduplicate across all returned articles
  const interleaved = balanceProviderFeeds(providerArticles);
  const deduped = deduplicateAcrossProviders(interleaved);

  // Attach verified temporal info to all deduplicated articles
  const enriched = deduped.map((art) => ({
    ...art,
    temporal_info: resolveArticleTemporalInfo(art, anyCached),
  }));

  // Sort primarily by publication/indexing date (newest first)
  enriched.sort((a, b) => {
    const timeA = new Date(a.pubDate).getTime() || 0;
    const timeB = new Date(b.pubDate).getTime() || 0;
    return timeB - timeA;
  });

  // Calculate composite provider status
  let compositeStatus: NewsProviderStatus = 'ACTIVE';
  if (deduped.length === 0) {
    // If all providers failed or were empty
    const allNotConfigured =
      (newsDataRes.status === 'fulfilled' && newsDataRes.value.providerStatus === 'NOT_CONFIGURED') &&
      (marketAuxRes.status === 'fulfilled' && marketAuxRes.value.providerStatus === 'NOT_CONFIGURED');

    const anyRateLimited =
      (newsDataRes.status === 'fulfilled' && newsDataRes.value.providerStatus === 'RATE_LIMITED') ||
      (marketAuxRes.status === 'fulfilled' && marketAuxRes.value.providerStatus === 'RATE_LIMITED');

    if (allNotConfigured) {
      compositeStatus = 'NOT_CONFIGURED';
    } else if (anyRateLimited) {
      compositeStatus = 'RATE_LIMITED';
    } else {
      compositeStatus = 'EMPTY';
    }
  }

  // Next page pagination cursor
  // If NewsData has a nextPage, use that, or increment page number
  const newsDataNextPage = newsDataRes.status === 'fulfilled' ? newsDataRes.value.nextPage : null;
  const marketAuxNextPage = marketAuxRes.status === 'fulfilled' ? marketAuxRes.value.nextPage : null;
  const nextPage = newsDataNextPage || marketAuxNextPage || (deduped.length >= 10 ? String(pageNum + 1) : null);

  return {
    articles: enriched,
    providerStatus: compositeStatus,
    providersUsed,
    providerBreakdown,
    isCached: anyCached,
    message: deduped.length === 0 ? 'No matching financial news found across providers.' : undefined,
    nextPage,
  };
}
