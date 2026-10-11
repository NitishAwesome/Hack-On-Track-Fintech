// ============================================================
// FINOVA — Real Financial News Provider Service (Prompt 12)
// Server-only integration with NewsData.io
//
// Key Principles:
// 1. ZERO fabricated/curated news in production.
// 2. Strict article validation (URL, publication date, title).
// 3. Deduplication and URL normalization.
// 4. In-memory caching for public news feeds (TTL: 15 min).
// 5. Explicit error reporting (NOT_CONFIGURED, RATE_LIMITED, etc.).
// 6. Server-only NEWSDATA_API_KEY security.
// ============================================================

import type {
  NormalizedNewsArticle,
  NewsFreshness,
  NewsProviderStatus,
} from '../../types/news.ts';

interface CacheEntry {
  articles: NormalizedNewsArticle[];
  timestamp: number;
}

// In-memory cache for public news queries to respect NewsData rate limits
const newsCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Validates whether a string is a legitimate HTTP/HTTPS URL
 */
export function isValidUrl(urlStr: string | null | undefined): boolean {
  if (!urlStr || typeof urlStr !== 'string') return false;
  try {
    const parsed = new URL(urlStr);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validates whether a string is a valid ISO or parseable date string
 */
export function isValidDate(dateStr: string | null | undefined): boolean {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const time = new Date(dateStr).getTime();
  return !isNaN(time) && time > 0;
}

/**
 * Calculates freshness label based on publication time
 */
export function calculateFreshness(pubDateStr: string): NewsFreshness {
  const pubTime = new Date(pubDateStr).getTime();
  const now = Date.now();
  const diffHours = (now - pubTime) / (1000 * 60 * 60);

  if (diffHours < 2) return 'LIVE';
  if (diffHours < 24) return 'TODAY';
  if (diffHours < 168) return 'RECENT'; // 7 days
  return 'ARCHIVED';
}

/**
 * Normalizes an raw article from NewsData.io or test fixture
 * Returns null if the article fails validation requirements
 */
export function normalizeRawArticle(
  raw: Record<string, unknown>,
  provider: 'newsdata' | 'curated_test_fixture' | 'system' = 'newsdata'
): NormalizedNewsArticle | null {
  if (!raw || typeof raw !== 'object') return null;

  const title = typeof raw.title === 'string' ? raw.title.trim() : '';
  const link = typeof raw.link === 'string' ? raw.link.trim() : '';

  // Mandatory fields
  if (!title || !link) return null;
  if (!isValidUrl(link)) return null;

  const rawPubDate = typeof raw.pubDate === 'string' ? raw.pubDate : '';
  if (!isValidDate(rawPubDate)) return null;

  const pubDateIso = new Date(rawPubDate).toISOString();
  const articleId =
    typeof raw.article_id === 'string' && raw.article_id
      ? raw.article_id
      : `art-${Buffer.from(link).toString('base64url').slice(0, 16)}`;

  const sourceName =
    typeof raw.source_name === 'string' && raw.source_name.trim()
      ? raw.source_name.trim()
      : typeof raw.source_id === 'string' && raw.source_id.trim()
      ? raw.source_id.trim()
      : 'Indian Financial Press';

  const description =
    typeof raw.description === 'string' && raw.description.trim()
      ? raw.description.trim()
      : null;

  const imageUrl =
    typeof raw.image_url === 'string' && isValidUrl(raw.image_url)
      ? raw.image_url
      : null;

  const keywords = Array.isArray(raw.keywords)
    ? raw.keywords.filter((k): k is string => typeof k === 'string' && k.length > 0)
    : null;

  const categories = Array.isArray(raw.category)
    ? raw.category.filter((c): c is string => typeof c === 'string' && c.length > 0)
    : null;

  return {
    article_id: articleId,
    title,
    link,
    description,
    source_name: sourceName,
    source_id: typeof raw.source_id === 'string' ? raw.source_id : null,
    pubDate: pubDateIso,
    retrieved_at: new Date().toISOString(),
    image_url: imageUrl,
    keywords,
    categories,
    source_provider: provider,
    language: typeof raw.language === 'string' ? raw.language : 'en',
    freshness: calculateFreshness(pubDateIso),
  };
}

/**
 * Deduplicates articles based on normalized link and title
 */
export function deduplicateArticles(articles: NormalizedNewsArticle[]): NormalizedNewsArticle[] {
  const seenLinks = new Set<string>();
  const seenTitles = new Set<string>();
  const deduped: NormalizedNewsArticle[] = [];

  for (const article of articles) {
    const normalizedLink = article.link.toLowerCase().replace(/\/+$/, '');
    const normalizedTitle = article.title.toLowerCase().replace(/[^a-z0-9]/g, '');

    if (seenLinks.has(normalizedLink) || (normalizedTitle.length > 10 && seenTitles.has(normalizedTitle))) {
      continue;
    }

    seenLinks.add(normalizedLink);
    seenTitles.add(normalizedTitle);
    deduped.push(article);
  }

  return deduped;
}

export interface FetchNewsResult {
  articles: NormalizedNewsArticle[];
  providerStatus: NewsProviderStatus;
  isCached: boolean;
  message?: string;
}

/**
 * Fetches real Indian financial news from NewsData.io
 * NEVER returns fabricated news when API key is missing or failing.
 */
export async function fetchIndianFinancialNews(options?: {
  query?: string;
  symbols?: string[];
  forceRefresh?: boolean;
}): Promise<FetchNewsResult> {
  const apiKey = process.env.NEWSDATA_API_KEY;

  // Check if API key is configured
  if (!apiKey || apiKey.includes('your_') || apiKey.includes('placeholder') || apiKey.trim() === '') {
    return {
      articles: [],
      providerStatus: 'NOT_CONFIGURED',
      isCached: false,
      message: 'NEWSDATA_API_KEY is not configured in the server environment. Please set NEWSDATA_API_KEY to access live Indian financial news.',
    };
  }

  // Construct query string
  let queryText = 'India stock market business finance';
  if (options?.query && options.query.trim()) {
    queryText = `${options.query.trim()} India`;
  } else if (options?.symbols && options.symbols.length > 0) {
    const topSymbols = options.symbols.slice(0, 4).join(' OR ');
    queryText = `(${topSymbols}) India stock market`;
  }

  const cacheKey = `newsdata:${queryText.toLowerCase().trim()}`;

  // Check cache
  if (!options?.forceRefresh) {
    const cached = newsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return {
        articles: cached.articles,
        providerStatus: 'ACTIVE',
        isCached: true,
      };
    }
  }

  try {
    const url = new URL('https://newsdata.io/api/1/news');
    url.searchParams.set('apikey', apiKey);
    url.searchParams.set('q', queryText);
    url.searchParams.set('country', 'in');
    url.searchParams.set('language', 'en');
    url.searchParams.set('category', 'business');
    url.searchParams.set('size', '10');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

    const response = await fetch(url.toString(), {
      signal: controller.signal,
      next: { revalidate: 900 }, // 15 min Next.js revalidation
    });

    clearTimeout(timeoutId);

    const previousCached = newsCache.get(cacheKey);

    if (response.status === 429) {
      if (previousCached && previousCached.articles.length > 0) {
        return {
          articles: previousCached.articles,
          providerStatus: 'RATE_LIMITED',
          isCached: true,
          message: 'Daily news quota reached. Displaying previously fetched verified articles.',
        };
      }
      return {
        articles: [],
        providerStatus: 'RATE_LIMITED',
        isCached: false,
        message: 'NewsData.io daily rate limit reached (HTTP 429). Please wait before requesting new headlines.',
      };
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      if (previousCached && previousCached.articles.length > 0) {
        return {
          articles: previousCached.articles,
          providerStatus: response.status >= 500 ? 'UNAVAILABLE' : 'ERROR',
          isCached: true,
          message: `News provider returned HTTP ${response.status}. Displaying previously fetched verified articles.`,
        };
      }
      return {
        articles: [],
        providerStatus: response.status >= 500 ? 'UNAVAILABLE' : 'ERROR',
        isCached: false,
        message: `NewsData.io request returned HTTP ${response.status}: ${errText.slice(0, 100)}`,
      };
    }

    const data = await response.json().catch(() => null);

    if (!data) {
      if (previousCached && previousCached.articles.length > 0) {
        return {
          articles: previousCached.articles,
          providerStatus: 'ERROR',
          isCached: true,
          message: 'Invalid response from news provider. Displaying previously fetched verified articles.',
        };
      }
      return {
        articles: [],
        providerStatus: 'ERROR',
        isCached: false,
        message: 'Invalid JSON response from news provider.',
      };
    }

    // Check upstream status
    if (data.status === 'error') {
      const errorCode = data.results?.code || '';
      const isRateLimit = errorCode.toLowerCase().includes('ratelimit');
      if (previousCached && previousCached.articles.length > 0) {
        return {
          articles: previousCached.articles,
          providerStatus: isRateLimit ? 'RATE_LIMITED' : 'ERROR',
          isCached: true,
          message: isRateLimit
            ? 'Daily news quota reached. Displaying previously fetched verified articles.'
            : 'Upstream news provider returned an error. Displaying previously fetched verified articles.',
        };
      }
      return {
        articles: [],
        providerStatus: isRateLimit ? 'RATE_LIMITED' : 'ERROR',
        isCached: false,
        message: data.results?.message || 'Upstream provider returned an error.',
      };
    }

    const rawList: Record<string, unknown>[] = Array.isArray(data.results) ? data.results : [];
    const normalized: NormalizedNewsArticle[] = [];

    for (const item of rawList) {
      const art = normalizeRawArticle(item, 'newsdata');
      if (art) normalized.push(art);
    }

    const finalArticles = deduplicateArticles(normalized);

    // Update cache
    newsCache.set(cacheKey, {
      articles: finalArticles,
      timestamp: Date.now(),
    });

    return {
      articles: finalArticles,
      providerStatus: finalArticles.length > 0 ? 'ACTIVE' : 'EMPTY',
      isCached: false,
      message: finalArticles.length === 0 ? 'No matching news articles found for query.' : undefined,
    };
  } catch (err: unknown) {
    const isAbort = err instanceof Error && err.name === 'AbortError';
    const previousCached = newsCache.get(cacheKey);
    if (previousCached && previousCached.articles.length > 0) {
      return {
        articles: previousCached.articles,
        providerStatus: 'UNAVAILABLE',
        isCached: true,
        message: isAbort
          ? 'News provider timed out. Displaying previously fetched verified articles.'
          : 'Network connection issue with news provider. Displaying previously fetched verified articles.',
      };
    }
    return {
      articles: [],
      providerStatus: 'UNAVAILABLE',
      isCached: false,
      message: isAbort
        ? 'NewsData.io request timed out after 8 seconds.'
        : `Network connection error: ${err instanceof Error ? err.message : 'Unknown error'}`,
    };
  }
}
