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
  SafeProviderDiagnostic,
} from '../../../types/news.ts';
import { cleanPublisherName } from '../sourceCleaner.ts';
import { isValidUrl, calculateFreshness } from '../newsProvider.ts';

interface CacheEntry {
  articles: NormalizedNewsArticle[];
  timestamp: number;
}

const gdeltCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

interface GdeltCircuitBreaker {
  cooldownUntil: number;
  consecutiveFailures: number;
  lastReason?: string;
}

const gdeltCircuit: GdeltCircuitBreaker = {
  cooldownUntil: 0,
  consecutiveFailures: 0,
};

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
  diagnostics?: SafeProviderDiagnostic;
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
    const cleanSymbols = options.symbols
      .map((s) => s.replace(/\.(NS|BO|NSE|BSE)$/i, '').trim())
      .filter(Boolean)
      .slice(0, 4);
    queryText = `(${cleanSymbols.join(' OR ')}) India sourcelang:english`;
  } else {
    queryText =
      '(India OR Indian) (stock OR market OR economy OR Sensex OR Nifty) sourcelang:english';
  }

  const cacheKey = `gdelt:${queryText.toLowerCase().trim()}:${options?.limit || 15}`;
  const now = Date.now();
  const previousCached = gdeltCache.get(cacheKey);

  // 1. Check Circuit Breaker / Cooldown State
  if (now < gdeltCircuit.cooldownUntil && !options?.forceRefresh) {
    const remainingSec = Math.ceil((gdeltCircuit.cooldownUntil - now) / 1000);
    if (previousCached && previousCached.articles.length > 0) {
      return {
        articles: previousCached.articles,
        providerStatus: 'RATE_LIMITED',
        isCached: true,
        message: `GDELT rate limit backoff active (${remainingSec}s remaining). Displaying cached articles.`,
        diagnostics: {
          provider: 'gdelt',
          status: 'RATE_LIMITED',
          articles_count: previousCached.articles.length,
          is_cached: true,
          rate_limited: true,
          cooldown_remaining_sec: remainingSec,
          message: `In cooldown window (${remainingSec}s remaining).`,
          last_attempted_at: new Date().toISOString(),
        },
      };
    }
    return {
      articles: [],
      providerStatus: 'RATE_LIMITED',
      isCached: false,
      message: `GDELT public rate limit backoff active (${remainingSec}s remaining). Please wait before retrying.`,
      diagnostics: {
        provider: 'gdelt',
        status: 'RATE_LIMITED',
        articles_count: 0,
        is_cached: false,
        rate_limited: true,
        cooldown_remaining_sec: remainingSec,
        message: `In cooldown window (${remainingSec}s remaining).`,
        last_attempted_at: new Date().toISOString(),
      },
    };
  }

  // 2. Check Fresh Cache
  if (!options?.forceRefresh) {
    if (previousCached && now - previousCached.timestamp < CACHE_TTL_MS) {
      return {
        articles: previousCached.articles,
        providerStatus: previousCached.articles.length > 0 ? 'ACTIVE' : 'EMPTY',
        isCached: true,
        diagnostics: {
          provider: 'gdelt',
          status: previousCached.articles.length > 0 ? 'ACTIVE' : 'EMPTY',
          articles_count: previousCached.articles.length,
          is_cached: true,
          http_category: '2xx',
          message: 'Served from in-memory cache.',
          last_attempted_at: new Date(previousCached.timestamp).toISOString(),
        },
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
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6 second timeout to avoid stalling aggregation

    const response = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        'User-Agent': 'FINOVA-Financial-News-Aggregator/1.0',
        Accept: 'application/json',
      },
      next: { revalidate: 900 },
    });

    clearTimeout(timeoutId);

    const rawText = await response.text().catch(() => '');

    // Check for GDELT IP rate limiting (enforces 1 request per 5 seconds)
    if (
      response.status === 429 ||
      rawText.includes('Please limit requests to one every 5 seconds') ||
      rawText.includes('high-traffic users')
    ) {
      gdeltCircuit.consecutiveFailures++;
      gdeltCircuit.cooldownUntil = Date.now() + 60000; // 60s cooldown

      if (previousCached && previousCached.articles.length > 0) {
        return {
          articles: previousCached.articles,
          providerStatus: 'RATE_LIMITED',
          isCached: true,
          message: 'GDELT 2.0 rate limit reached (1 req/5s limit). Displaying cached verified articles.',
          diagnostics: {
            provider: 'gdelt',
            status: 'RATE_LIMITED',
            articles_count: previousCached.articles.length,
            is_cached: true,
            http_status: 429,
            http_category: '4xx',
            rate_limited: true,
            cooldown_remaining_sec: 60,
            message: 'GDELT 1 req/5s limit hit. Cooldown engaged.',
            last_attempted_at: new Date().toISOString(),
          },
        };
      }
      return {
        articles: [],
        providerStatus: 'RATE_LIMITED',
        isCached: false,
        message: 'GDELT 2.0 rate limit reached (enforces 1 request per 5 seconds).',
        diagnostics: {
          provider: 'gdelt',
          status: 'RATE_LIMITED',
          articles_count: 0,
          is_cached: false,
          http_status: 429,
          http_category: '4xx',
          rate_limited: true,
          cooldown_remaining_sec: 60,
          message: 'GDELT 1 req/5s limit hit.',
          last_attempted_at: new Date().toISOString(),
        },
      };
    }

    // Check for HTML response (cloud IP block, Cloudflare, or upstream error)
    const isHtmlResponse =
      rawText.trim().startsWith('<!DOCTYPE') ||
      rawText.includes('<html') ||
      rawText.includes('<head>');

    if (isHtmlResponse) {
      gdeltCircuit.consecutiveFailures++;
      gdeltCircuit.cooldownUntil = Date.now() + 60000;

      if (previousCached && previousCached.articles.length > 0) {
        return {
          articles: previousCached.articles,
          providerStatus: 'UNAVAILABLE',
          isCached: true,
          message: 'GDELT upstream returned HTML instead of JSON. Displaying cached articles.',
          diagnostics: {
            provider: 'gdelt',
            status: 'UNAVAILABLE',
            articles_count: previousCached.articles.length,
            is_cached: true,
            http_category: '5xx',
            message: 'Upstream returned HTML (cloud IP throttle or service disruption). Cooldown engaged.',
            last_attempted_at: new Date().toISOString(),
          },
        };
      }
      return {
        articles: [],
        providerStatus: 'UNAVAILABLE',
        isCached: false,
        message: 'GDELT public API returned HTML instead of JSON (cloud IP throttle or service disruption).',
        diagnostics: {
          provider: 'gdelt',
          status: 'UNAVAILABLE',
          articles_count: 0,
          is_cached: false,
          http_category: '5xx',
          message: 'Upstream returned HTML. Cooldown engaged.',
          last_attempted_at: new Date().toISOString(),
        },
      };
    }

    if (!response.ok) {
      gdeltCircuit.consecutiveFailures++;
      gdeltCircuit.cooldownUntil = Date.now() + 45000;
      const status: NewsProviderStatus = response.status >= 500 ? 'UNAVAILABLE' : 'ERROR';
      const cat = response.status >= 500 ? '5xx' : '4xx';

      if (previousCached && previousCached.articles.length > 0) {
        return {
          articles: previousCached.articles,
          providerStatus: status,
          isCached: true,
          message: `GDELT returned HTTP ${response.status}. Displaying cached articles.`,
          diagnostics: {
            provider: 'gdelt',
            status,
            articles_count: previousCached.articles.length,
            is_cached: true,
            http_status: response.status,
            http_category: cat,
            message: `HTTP ${response.status}. Serving cache.`,
            last_attempted_at: new Date().toISOString(),
          },
        };
      }
      return {
        articles: [],
        providerStatus: status,
        isCached: false,
        message: `GDELT request returned HTTP ${response.status}.`,
        diagnostics: {
          provider: 'gdelt',
          status,
          articles_count: 0,
          is_cached: false,
          http_status: response.status,
          http_category: cat,
          message: `HTTP ${response.status}`,
          last_attempted_at: new Date().toISOString(),
        },
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
          providerStatus: 'EMPTY',
          isCached: true,
          message: 'No articles returned by GDELT for query. Displaying cached articles.',
          diagnostics: {
            provider: 'gdelt',
            status: 'EMPTY',
            articles_count: previousCached.articles.length,
            is_cached: true,
            http_status: 200,
            http_category: '2xx',
            message: 'Query returned 0 articles. Serving previous cache.',
            last_attempted_at: new Date().toISOString(),
          },
        };
      }
      return {
        articles: [],
        providerStatus: 'EMPTY',
        isCached: false,
        message: 'No articles returned by GDELT for query.',
        diagnostics: {
          provider: 'gdelt',
          status: 'EMPTY',
          articles_count: 0,
          is_cached: false,
          http_status: 200,
          http_category: '2xx',
          message: 'Query matched 0 articles in GDELT.',
          last_attempted_at: new Date().toISOString(),
        },
      };
    }

    // Success! Reset circuit breaker
    gdeltCircuit.consecutiveFailures = 0;
    gdeltCircuit.cooldownUntil = 0;

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

    const finalStatus: NewsProviderStatus = normalized.length > 0 ? 'ACTIVE' : 'EMPTY';

    return {
      articles: normalized,
      providerStatus: finalStatus,
      isCached: false,
      message: normalized.length === 0 ? 'No matching GDELT news found.' : undefined,
      diagnostics: {
        provider: 'gdelt',
        status: finalStatus,
        articles_count: normalized.length,
        is_cached: false,
        http_status: 200,
        http_category: '2xx',
        message: 'OK',
        last_attempted_at: new Date().toISOString(),
      },
    };
  } catch (err: unknown) {
    const isAbort = err instanceof Error && err.name === 'AbortError';
    const cat = isAbort ? 'timeout' : 'network_error';

    // Trip circuit breaker on timeout or network error
    gdeltCircuit.consecutiveFailures++;
    gdeltCircuit.cooldownUntil = Date.now() + 60000; // 60s cooldown

    if (previousCached && previousCached.articles.length > 0) {
      return {
        articles: previousCached.articles,
        providerStatus: 'UNAVAILABLE',
        isCached: true,
        message: isAbort
          ? 'GDELT timed out after 6 seconds. Displaying cached articles.'
          : 'Network error contacting GDELT. Displaying cached articles.',
        diagnostics: {
          provider: 'gdelt',
          status: 'UNAVAILABLE',
          articles_count: previousCached.articles.length,
          is_cached: true,
          http_category: cat,
          cooldown_remaining_sec: 60,
          message: isAbort ? 'Timed out after 6s. Cooldown engaged.' : 'Network connection failure. Cooldown engaged.',
          last_attempted_at: new Date().toISOString(),
        },
      };
    }

    return {
      articles: [],
      providerStatus: 'UNAVAILABLE',
      isCached: false,
      message: isAbort
        ? 'GDELT request timed out after 6 seconds.'
        : `Network connection error: ${err instanceof Error ? err.message : 'Unknown error'}`,
      diagnostics: {
        provider: 'gdelt',
        status: 'UNAVAILABLE',
        articles_count: 0,
        is_cached: false,
        http_category: cat,
        cooldown_remaining_sec: 60,
        message: isAbort ? 'Timed out after 6s. Cooldown engaged.' : 'Network connection failure. Cooldown engaged.',
        last_attempted_at: new Date().toISOString(),
      },
    };
  }
}
