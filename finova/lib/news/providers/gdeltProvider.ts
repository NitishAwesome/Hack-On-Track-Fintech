// ============================================================
// FINOVA — GDELT 2.0 Doc API Financial News Provider Service
// lib/news/providers/gdeltProvider.ts
//
// Key Principles:
// 1. Public API integration with GDELT 2.0 Doc API (Zero API key required).
// 2. Focused on Indian financial markets, listed companies, economy & monetary policy.
// 3. Strict article validation (URL, title, parsed timestamp).
// 4. Source transparency: maps publisher domain to legitimate media outlet name.
// 5. In-memory caching (TTL: 15 min).
// 6. Graceful timeout and network failure handling.
// ============================================================

import type {
  NormalizedNewsArticle,
  NewsProviderStatus,
} from '../../../types/news.ts';
import { cleanPublisherName } from '../sourceCleaner.ts';
import { isValidUrl, calculateFreshness } from '../newsProvider.ts';

interface CacheEntry {
  articles: NormalizedNewsArticle[];
  timestamp: number;
}

const gdeltCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

export interface FetchGdeltOptions {
  query?: string;
  symbols?: string[];
  forceRefresh?: boolean;
  limit?: number;
}

export interface FetchGdeltResult {
  articles: NormalizedNewsArticle[];
  providerStatus: NewsProviderStatus;
  isCached: boolean;
  message?: string;
}

/**
 * Parses GDELT timestamp format (e.g. 20261011T180500Z) to standard ISO string
 */
export function parseGdeltDate(dateStr: string | null | undefined): string {
  if (!dateStr || typeof dateStr !== 'string') {
    return new Date().toISOString();
  }

  // Format 1: YYYYMMDDTHHmmssZ
  const compactMatch = dateStr.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
  if (compactMatch) {
    const [, yr, mo, dy, hr, mn, sc] = compactMatch;
    return `${yr}-${mo}-${dy}T${hr}:${mn}:${sc}.000Z`;
  }

  // Format 2: YYYYMMDDHHmmss
  const numMatch = dateStr.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/);
  if (numMatch) {
    const [, yr, mo, dy, hr, mn, sc] = numMatch;
    return `${yr}-${mo}-${dy}T${hr}:${mn}:${sc}.000Z`;
  }

  // Standard fallback
  const parsed = new Date(dateStr).getTime();
  if (!isNaN(parsed) && parsed > 0) {
    return new Date(dateStr).toISOString();
  }

  return new Date().toISOString();
}

/**
 * Normalizes a raw GDELT article record into NormalizedNewsArticle
 */
export function normalizeGdeltArticle(
  raw: Record<string, unknown>
): NormalizedNewsArticle | null {
  if (!raw || typeof raw !== 'object') return null;

  const rawTitle = typeof raw.title === 'string' ? raw.title.trim() : '';
  const url = typeof raw.url === 'string' ? raw.url.trim() : '';

  if (!rawTitle || !url || !isValidUrl(url)) return null;

  // Clean title artifact formatting sometimes found in GDELT feeds
  const title = rawTitle
    .replace(/^[\s\-_]+/, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (title.length < 10) return null;

  const rawDate = typeof raw.seendate === 'string' ? raw.seendate : '';
  const pubDateIso = parseGdeltDate(rawDate);

  const articleId = `art-gdelt-${Buffer.from(url).toString('base64url').slice(0, 16)}`;

  const domain = typeof raw.domain === 'string' ? raw.domain : '';
  const sourceName = cleanPublisherName(domain, url);

  const imageUrl =
    typeof raw.socialimage === 'string' && isValidUrl(raw.socialimage)
      ? raw.socialimage
      : null;

  return {
    article_id: articleId,
    title,
    link: url,
    description: null,
    source_name: sourceName,
    source_id: domain || null,
    pubDate: pubDateIso,
    retrieved_at: new Date().toISOString(),
    image_url: imageUrl,
    keywords: null,
    categories: ['Economy & Financial Events'],
    source_provider: 'gdelt',
    language: typeof raw.language === 'string' ? raw.language : 'English',
    freshness: calculateFreshness(pubDateIso),
  };
}

/**
 * Fetches Indian financial and economic news from GDELT 2.0 Doc API
 */
export async function fetchGdeltNews(
  options?: FetchGdeltOptions
): Promise<FetchGdeltResult> {
  // Construct targeted financial search query
  let queryText = '';

  if (options?.query && options.query.trim()) {
    queryText = `(${options.query.trim()}) sourcelang:english`;
  } else if (options?.symbols && options.symbols.length > 0) {
    const topSymbols = options.symbols.slice(0, 4).join(' OR ');
    queryText = `(${topSymbols}) (India OR Indian OR stock OR market) sourcelang:english`;
  } else {
    queryText =
      '(India OR Indian) (stock OR market OR Nifty OR Sensex OR RBI OR SEBI OR economy OR banking OR REIT OR InvIT OR bond) sourcelang:english';
  }

  const cacheKey = `gdelt:${queryText.toLowerCase().trim()}:${options?.limit || 15}`;

  // Check cache
  if (!options?.forceRefresh) {
    const cached = gdeltCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return {
        articles: cached.articles,
        providerStatus: 'ACTIVE',
        isCached: true,
      };
    }
  }

  try {
    const url = new URL('https://api.gdeltproject.org/api/v2/doc/doc');
    url.searchParams.set('query', queryText);
    url.searchParams.set('mode', 'ArtList');
    url.searchParams.set('maxrecords', String(options?.limit || 15));
    url.searchParams.set('format', 'json');
    url.searchParams.set('sort', 'DateDesc');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000); // 12 second timeout for public GDELT endpoint

    const response = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        'User-Agent': 'FINOVA-Financial-News-Aggregator/1.0',
        Accept: 'application/json',
      },
      next: { revalidate: 900 }, // 15 min Next.js revalidation
    });

    clearTimeout(timeoutId);

    const previousCached = gdeltCache.get(cacheKey);
    const rawText = await response.text().catch(() => '');

    // Check for GDELT IP rate limiting (enforces 1 request per 5 seconds)
    if (
      response.status === 429 ||
      rawText.includes('Please limit requests to one every 5 seconds') ||
      rawText.includes('high-traffic users')
    ) {
      if (previousCached && previousCached.articles.length > 0) {
        return {
          articles: previousCached.articles,
          providerStatus: 'ACTIVE',
          isCached: true,
          message: 'Displaying cached GDELT articles (rate-limited: 1 req/5s limit).',
        };
      }
      return {
        articles: [],
        providerStatus: 'RATE_LIMITED',
        isCached: false,
        message: 'GDELT 2.0 rate limit reached (enforces 1 request per 5 seconds).',
      };
    }

    if (!response.ok) {
      if (previousCached && previousCached.articles.length > 0) {
        return {
          articles: previousCached.articles,
          providerStatus: 'ACTIVE',
          isCached: true,
          message: 'Displaying cached GDELT articles.',
        };
      }
      return {
        articles: [],
        providerStatus: response.status >= 500 ? 'UNAVAILABLE' : 'ERROR',
        isCached: false,
        message: `GDELT request returned HTTP ${response.status}`,
      };
    }

    let data: { articles?: Record<string, unknown>[] } | null = null;
    try {
      data = JSON.parse(rawText);
    } catch {
      data = null;
    }

    if (!data || !Array.isArray(data.articles)) {
      if (previousCached && previousCached.articles.length > 0) {
        return {
          articles: previousCached.articles,
          providerStatus: 'ACTIVE',
          isCached: true,
          message: 'Displaying cached GDELT articles.',
        };
      }
      return {
        articles: [],
        providerStatus: 'EMPTY',
        isCached: false,
        message: 'No articles returned by GDELT for query.',
      };
    }

    const rawList: Record<string, unknown>[] = data.articles;
    const normalized: NormalizedNewsArticle[] = [];

    for (const item of rawList) {
      const art = normalizeGdeltArticle(item);
      if (art) normalized.push(art);
    }

    gdeltCache.set(cacheKey, {
      articles: normalized,
      timestamp: Date.now(),
    });

    return {
      articles: normalized,
      providerStatus: normalized.length > 0 ? 'ACTIVE' : 'EMPTY',
      isCached: false,
      message: normalized.length === 0 ? 'No matching GDELT news found.' : undefined,
    };
  } catch (err: unknown) {
    const isAbort = err instanceof Error && err.name === 'AbortError';
    const previousCached = gdeltCache.get(cacheKey);

    if (previousCached && previousCached.articles.length > 0) {
      return {
        articles: previousCached.articles,
        providerStatus: 'ACTIVE',
        isCached: true,
        message: 'Displaying cached GDELT articles.',
      };
    }

    return {
      articles: [],
      providerStatus: 'UNAVAILABLE',
      isCached: false,
      message: isAbort
        ? 'GDELT request timed out after 8 seconds.'
        : `Network connection error: ${err instanceof Error ? err.message : 'Unknown error'}`,
    };
  }
}
