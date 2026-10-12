// ============================================================
// FINOVA — MarketAux Financial News Provider Service
// lib/news/providers/marketAuxProvider.ts
//
// Key Principles:
// 1. Server-only integration with MarketAux API (MARKETAUX_API_KEY / MARKETAUX_API_TOKEN).
// 2. Strict article validation (URL, publication date, title).
// 3. Entity extraction (Indian NSE/BSE symbols).
// 4. In-memory caching for public queries (TTL: 15 min).
// 5. Graceful rate-limit (429) & quota handling.
// 6. Source transparency: uses real media outlet name, never 'MarketAux'.
// ============================================================

import type {
  NormalizedNewsArticle,
  NewsProviderStatus,
  SafeProviderDiagnostic,
} from '../../../types/news.ts';
import { cleanPublisherName } from '../sourceCleaner.ts';
import { isValidUrl, isValidDate, calculateFreshness } from '../newsProvider.ts';

interface CacheEntry {
  articles: NormalizedNewsArticle[];
  timestamp: number;
  nextPage?: string | null;
}

const marketAuxCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

export interface FetchMarketAuxOptions {
  query?: string;
  symbols?: string[];
  forceRefresh?: boolean;
  page?: string | number;
  limit?: number;
}

export interface FetchMarketAuxResult {
  articles: NormalizedNewsArticle[];
  providerStatus: NewsProviderStatus;
  isCached: boolean;
  message?: string;
  nextPage?: string | null;
  diagnostics?: SafeProviderDiagnostic;
}

/**
 * Normalizes a raw MarketAux article record into NormalizedNewsArticle
 */
export function normalizeMarketAuxArticle(
  raw: Record<string, unknown>
): NormalizedNewsArticle | null {
  if (!raw || typeof raw !== 'object') return null;

  const title = typeof raw.title === 'string' ? raw.title.trim() : '';
  const url = typeof raw.url === 'string' ? raw.url.trim() : '';

  if (!title || !url || !isValidUrl(url)) return null;

  const rawPubDate = typeof raw.published_at === 'string' ? raw.published_at : '';
  if (!isValidDate(rawPubDate)) return null;

  const pubDateIso = new Date(rawPubDate).toISOString();
  const uuid = typeof raw.uuid === 'string' && raw.uuid ? raw.uuid : null;
  const articleId = uuid
    ? `art-mktaux-${uuid}`
    : `art-mktaux-${Buffer.from(url).toString('base64url').slice(0, 16)}`;

  const rawSource = typeof raw.source === 'string' ? raw.source : null;
  const sourceName = cleanPublisherName(rawSource, url);

  const description =
    typeof raw.description === 'string' && raw.description.trim()
      ? raw.description.trim()
      : typeof raw.snippet === 'string' && raw.snippet.trim()
      ? raw.snippet.trim()
      : null;

  const imageUrl =
    typeof raw.image_url === 'string' && isValidUrl(raw.image_url)
      ? raw.image_url
      : null;

  // Extract entities/symbols
  let symbols: string[] | null = null;
  if (Array.isArray(raw.entities)) {
    const symList: string[] = [];
    for (const ent of raw.entities) {
      if (ent && typeof ent === 'object' && typeof (ent as Record<string, unknown>).symbol === 'string') {
        const rawSym = (ent as Record<string, unknown>).symbol as string;
        const cleanSym = rawSym.replace(/\.(NS|BO|NSE|BSE)$/i, '').trim().toUpperCase();
        if (cleanSym && !symList.includes(cleanSym)) {
          symList.push(cleanSym);
        }
      }
    }
    if (symList.length > 0) symbols = symList;
  }

  // Keywords & categories
  const keywords = Array.isArray(raw.keywords)
    ? (raw.keywords.filter((k): k is string => typeof k === 'string' && k.length > 0) as string[])
    : null;

  const categories = Array.isArray(raw.industries)
    ? (raw.industries.filter((c): c is string => typeof c === 'string' && c.length > 0) as string[])
    : null;

  return {
    article_id: articleId,
    title,
    link: url,
    description,
    source_name: sourceName,
    source_id: rawSource,
    pubDate: pubDateIso,
    retrieved_at: new Date().toISOString(),
    image_url: imageUrl,
    keywords,
    categories,
    source_provider: 'marketaux',
    language: typeof raw.language === 'string' ? raw.language : 'en',
    freshness: calculateFreshness(pubDateIso),
    symbols,
  };
}

/**
 * Resolves MarketAux API key with strict precedence:
 * 1. MARKETAUX_API_KEY (configured standard)
 * 2. MARKETAUX_API_TOKEN (legacy alias)
 * 3. MARKET_AUX_API_KEY (fallback alias)
 * Filters out dummy placeholders.
 */
export function resolveMarketAuxApiKey(): string {
  const candidates = [
    process.env.MARKETAUX_API_KEY,
    process.env.MARKETAUX_API_TOKEN,
    process.env.MARKET_AUX_API_KEY,
  ];
  for (const c of candidates) {
    if (typeof c === 'string') {
      const trimmed = c.trim();
      if (
        trimmed &&
        !trimmed.includes('your_') &&
        !trimmed.includes('placeholder') &&
        trimmed.length > 5
      ) {
        return trimmed;
      }
    }
  }
  return '';
}

/**
 * Fetches real Indian financial news from MarketAux
 */
export async function fetchMarketAuxNews(
  options?: FetchMarketAuxOptions
): Promise<FetchMarketAuxResult> {
  const apiKey = resolveMarketAuxApiKey();

  if (!apiKey) {
    return {
      articles: [],
      providerStatus: 'NOT_CONFIGURED',
      isCached: false,
      message: 'MARKETAUX_API_KEY is not configured in the server environment.',
      diagnostics: {
        provider: 'marketaux',
        status: 'NOT_CONFIGURED',
        articles_count: 0,
        is_cached: false,
        message: 'MARKETAUX_API_KEY not configured.',
        last_attempted_at: new Date().toISOString(),
      },
    };
  }

  // Determine query parameters
  const searchQuery = options?.query ? options.query.trim() : '';
  let targetSymbols = '';
  if (!searchQuery && options?.symbols && options.symbols.length > 0) {
    const cleanSymbols = options.symbols
      .map((s) => s.replace(/\.(NS|BO|NSE|BSE)$/i, '').trim().toUpperCase())
      .filter((s) => s.length > 0);
    if (cleanSymbols.length > 0) {
      targetSymbols = cleanSymbols.slice(0, 5).join(',');
    }
  }

  const pageNum = options?.page ? String(options.page) : '1';
  const cacheKey = `marketaux:${searchQuery.toLowerCase()}:${targetSymbols.toLowerCase()}:${pageNum}`;

  // Check cache
  if (!options?.forceRefresh) {
    const cached = marketAuxCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return {
        articles: cached.articles,
        providerStatus: cached.articles.length > 0 ? 'ACTIVE' : 'EMPTY',
        isCached: true,
        nextPage: cached.nextPage,
        diagnostics: {
          provider: 'marketaux',
          status: cached.articles.length > 0 ? 'ACTIVE' : 'EMPTY',
          articles_count: cached.articles.length,
          is_cached: true,
          http_category: '2xx',
          message: 'Served from in-memory cache.',
          last_attempted_at: new Date(cached.timestamp).toISOString(),
        },
      };
    }
  }

  const previousCached = marketAuxCache.get(cacheKey);

  try {
    const url = new URL('https://api.marketaux.com/v1/news/all');
    url.searchParams.set('api_token', apiKey);
    url.searchParams.set('countries', 'in');
    url.searchParams.set('language', 'en');
    url.searchParams.set('limit', String(Math.min(options?.limit || 3, 3)));

    if (searchQuery) {
      url.searchParams.set('search', searchQuery);
    } else if (targetSymbols) {
      url.searchParams.set('symbols', targetSymbols);
    }

    if (options?.page) {
      url.searchParams.set('page', String(options.page));
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

    const response = await fetch(url.toString(), {
      signal: controller.signal,
      next: { revalidate: 900 },
    });

    clearTimeout(timeoutId);

    if (response.status === 429) {
      if (previousCached && previousCached.articles.length > 0) {
        return {
          articles: previousCached.articles,
          providerStatus: 'RATE_LIMITED',
          isCached: true,
          message: 'MarketAux rate limit reached. Displaying cached verified articles.',
          diagnostics: {
            provider: 'marketaux',
            status: 'RATE_LIMITED',
            articles_count: previousCached.articles.length,
            is_cached: true,
            http_status: 429,
            http_category: '4xx',
            rate_limited: true,
            message: 'MarketAux quota reached (HTTP 429). Serving cached articles.',
            last_attempted_at: new Date().toISOString(),
          },
        };
      }
      return {
        articles: [],
        providerStatus: 'RATE_LIMITED',
        isCached: false,
        message: 'MarketAux daily rate limit reached (HTTP 429).',
        diagnostics: {
          provider: 'marketaux',
          status: 'RATE_LIMITED',
          articles_count: 0,
          is_cached: false,
          http_status: 429,
          http_category: '4xx',
          rate_limited: true,
          message: 'Daily quota reached.',
          last_attempted_at: new Date().toISOString(),
        },
      };
    }

    if (response.status === 401 || response.status === 403) {
      return {
        articles: previousCached?.articles || [],
        providerStatus: 'ERROR',
        isCached: Boolean(previousCached),
        message: `MarketAux authentication failed (HTTP ${response.status}). Check MARKETAUX_API_KEY.`,
        diagnostics: {
          provider: 'marketaux',
          status: 'ERROR',
          articles_count: previousCached?.articles?.length || 0,
          is_cached: Boolean(previousCached),
          http_status: response.status,
          http_category: '4xx',
          message: `Authentication failed (HTTP ${response.status}).`,
          last_attempted_at: new Date().toISOString(),
        },
      };
    }

    if (!response.ok) {
      const errCat = response.status >= 500 ? '5xx' : '4xx';
      const status: NewsProviderStatus = response.status >= 500 ? 'UNAVAILABLE' : 'ERROR';
      if (previousCached && previousCached.articles.length > 0) {
        return {
          articles: previousCached.articles,
          providerStatus: status,
          isCached: true,
          message: `MarketAux returned HTTP ${response.status}. Displaying cached articles.`,
          diagnostics: {
            provider: 'marketaux',
            status,
            articles_count: previousCached.articles.length,
            is_cached: true,
            http_status: response.status,
            http_category: errCat,
            message: `HTTP ${response.status}. Serving cache.`,
            last_attempted_at: new Date().toISOString(),
          },
        };
      }
      return {
        articles: [],
        providerStatus: status,
        isCached: false,
        message: `MarketAux request returned HTTP ${response.status}.`,
        diagnostics: {
          provider: 'marketaux',
          status,
          articles_count: 0,
          is_cached: false,
          http_status: response.status,
          http_category: errCat,
          message: `HTTP ${response.status}`,
          last_attempted_at: new Date().toISOString(),
        },
      };
    }

    const data = await response.json().catch(() => null);

    if (!data || !Array.isArray(data.data)) {
      if (previousCached && previousCached.articles.length > 0) {
        return {
          articles: previousCached.articles,
          providerStatus: 'ERROR',
          isCached: true,
          message: 'Invalid response from MarketAux. Displaying cached articles.',
          diagnostics: {
            provider: 'marketaux',
            status: 'ERROR',
            articles_count: previousCached.articles.length,
            is_cached: true,
            http_category: '5xx',
            message: 'Malformed JSON payload from provider.',
            last_attempted_at: new Date().toISOString(),
          },
        };
      }
      return {
        articles: [],
        providerStatus: 'ERROR',
        isCached: false,
        message: 'Invalid JSON response from MarketAux.',
        diagnostics: {
          provider: 'marketaux',
          status: 'ERROR',
          articles_count: 0,
          is_cached: false,
          http_category: '5xx',
          message: 'Malformed JSON payload.',
          last_attempted_at: new Date().toISOString(),
        },
      };
    }

    let rawList: Record<string, unknown>[] = data.data;
    let usedFallback = false;

    // Broader Query Fallback: If targeted symbol/search matched 0 articles, fetch broad Indian financial news
    if (rawList.length === 0 && (targetSymbols || searchQuery)) {
      try {
        const fallbackUrl = new URL('https://api.marketaux.com/v1/news/all');
        fallbackUrl.searchParams.set('api_token', apiKey);
        fallbackUrl.searchParams.set('countries', 'in');
        fallbackUrl.searchParams.set('language', 'en');
        fallbackUrl.searchParams.set('limit', '3');

        const fbController = new AbortController();
        const fbTimeout = setTimeout(() => fbController.abort(), 6000);
        const fbRes = await fetch(fallbackUrl.toString(), {
          signal: fbController.signal,
          next: { revalidate: 900 },
        });
        clearTimeout(fbTimeout);

        if (fbRes.ok) {
          const fbData = await fbRes.json().catch(() => null);
          if (fbData && Array.isArray(fbData.data) && fbData.data.length > 0) {
            rawList = fbData.data;
            usedFallback = true;
          }
        }
      } catch {
        // Fallback fetch failed, proceed with original empty list
      }
    }

    const normalized: NormalizedNewsArticle[] = [];
    for (const item of rawList) {
      const art = normalizeMarketAuxArticle(item);
      if (art) normalized.push(art);
    }

    const currentPage = Number(data.meta?.page || 1);
    const totalFound = Number(data.meta?.found || 0);
    const returnedCount = Number(data.meta?.returned || normalized.length);
    const hasMore = totalFound > currentPage * returnedCount;
    const nextPage = hasMore ? String(currentPage + 1) : null;

    marketAuxCache.set(cacheKey, {
      articles: normalized,
      timestamp: Date.now(),
      nextPage,
    });

    const finalStatus: NewsProviderStatus = normalized.length > 0 ? 'ACTIVE' : 'EMPTY';

    return {
      articles: normalized,
      providerStatus: finalStatus,
      isCached: false,
      message:
        normalized.length === 0
          ? 'No matching MarketAux articles found.'
          : usedFallback
          ? 'Specific symbol query matched 0 articles; general Indian financial news loaded.'
          : undefined,
      nextPage,
      diagnostics: {
        provider: 'marketaux',
        status: finalStatus,
        articles_count: normalized.length,
        is_cached: false,
        http_status: 200,
        http_category: '2xx',
        used_fallback: usedFallback,
        message: usedFallback ? 'Used broader Indian news fallback.' : 'OK',
        last_attempted_at: new Date().toISOString(),
      },
    };
  } catch (err: unknown) {
    const isAbort = err instanceof Error && err.name === 'AbortError';
    const httpCat = isAbort ? 'timeout' : 'network_error';

    if (previousCached && previousCached.articles.length > 0) {
      return {
        articles: previousCached.articles,
        providerStatus: 'UNAVAILABLE',
        isCached: true,
        message: isAbort
          ? 'MarketAux timed out. Displaying cached articles.'
          : 'Network error contacting MarketAux. Displaying cached articles.',
        diagnostics: {
          provider: 'marketaux',
          status: 'UNAVAILABLE',
          articles_count: previousCached.articles.length,
          is_cached: true,
          http_category: httpCat,
          message: isAbort ? 'Request timed out after 8s.' : 'Network connection failure.',
          last_attempted_at: new Date().toISOString(),
        },
      };
    }

    return {
      articles: [],
      providerStatus: 'UNAVAILABLE',
      isCached: false,
      message: isAbort
        ? 'MarketAux request timed out after 8 seconds.'
        : `Network connection error: ${err instanceof Error ? err.message : 'Unknown error'}`,
      diagnostics: {
        provider: 'marketaux',
        status: 'UNAVAILABLE',
        articles_count: 0,
        is_cached: false,
        http_category: httpCat,
        message: isAbort ? 'Request timed out after 8s.' : 'Network connection failure.',
        last_attempted_at: new Date().toISOString(),
      },
    };
  }
}
