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
 * Fetches real Indian financial news from MarketAux
 */
export async function fetchMarketAuxNews(
  options?: FetchMarketAuxOptions
): Promise<FetchMarketAuxResult> {
  const apiKey =
    process.env.MARKETAUX_API_TOKEN ||
    process.env.MARKETAUX_API_KEY ||
    process.env.MARKET_AUX_API_KEY;

  if (!apiKey || apiKey.includes('your_') || apiKey.includes('placeholder') || apiKey.trim() === '') {
    return {
      articles: [],
      providerStatus: 'NOT_CONFIGURED',
      isCached: false,
      message: 'MARKETAUX_API_KEY is not configured in the server environment.',
    };
  }

  // Construct query/search
  let searchQuery = '';
  if (options?.query && options.query.trim()) {
    searchQuery = options.query.trim();
  } else if (options?.symbols && options.symbols.length > 0) {
    searchQuery = options.symbols.slice(0, 5).join(' OR ');
  }

  const pageNum = options?.page ? String(options.page) : '1';
  const cacheKey = `marketaux:${searchQuery.toLowerCase().trim()}:${pageNum}`;

  // Check cache
  if (!options?.forceRefresh) {
    const cached = marketAuxCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return {
        articles: cached.articles,
        providerStatus: 'ACTIVE',
        isCached: true,
        nextPage: cached.nextPage,
      };
    }
  }

  try {
    const url = new URL('https://api.marketaux.com/v1/news/all');
    url.searchParams.set('api_token', apiKey);
    url.searchParams.set('countries', 'in');
    url.searchParams.set('language', 'en');
    url.searchParams.set('filter_entities', 'true');
    url.searchParams.set('limit', String(options?.limit || 10));

    if (searchQuery) {
      url.searchParams.set('search', searchQuery);
    }

    if (options?.page) {
      url.searchParams.set('page', String(options.page));
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

    const response = await fetch(url.toString(), {
      signal: controller.signal,
      next: { revalidate: 900 }, // 15 min Next.js revalidation
    });

    clearTimeout(timeoutId);

    const previousCached = marketAuxCache.get(cacheKey);

    if (response.status === 429) {
      if (previousCached && previousCached.articles.length > 0) {
        return {
          articles: previousCached.articles,
          providerStatus: 'RATE_LIMITED',
          isCached: true,
          message: 'MarketAux rate limit reached. Displaying cached verified articles.',
        };
      }
      return {
        articles: [],
        providerStatus: 'RATE_LIMITED',
        isCached: false,
        message: 'MarketAux daily rate limit reached (HTTP 429).',
      };
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      if (previousCached && previousCached.articles.length > 0) {
        return {
          articles: previousCached.articles,
          providerStatus: response.status >= 500 ? 'UNAVAILABLE' : 'ERROR',
          isCached: true,
          message: `MarketAux returned HTTP ${response.status}. Displaying cached articles.`,
        };
      }
      return {
        articles: [],
        providerStatus: response.status >= 500 ? 'UNAVAILABLE' : 'ERROR',
        isCached: false,
        message: `MarketAux request returned HTTP ${response.status}: ${errText.slice(0, 100)}`,
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
        };
      }
      return {
        articles: [],
        providerStatus: 'ERROR',
        isCached: false,
        message: 'Invalid JSON response from MarketAux.',
      };
    }

    const rawList: Record<string, unknown>[] = data.data;
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

    return {
      articles: normalized,
      providerStatus: normalized.length > 0 ? 'ACTIVE' : 'EMPTY',
      isCached: false,
      message: normalized.length === 0 ? 'No matching MarketAux articles found.' : undefined,
      nextPage,
    };
  } catch (err: unknown) {
    const isAbort = err instanceof Error && err.name === 'AbortError';
    const previousCached = marketAuxCache.get(cacheKey);

    if (previousCached && previousCached.articles.length > 0) {
      return {
        articles: previousCached.articles,
        providerStatus: 'UNAVAILABLE',
        isCached: true,
        message: isAbort
          ? 'MarketAux timed out. Displaying cached articles.'
          : 'Network error contacting MarketAux. Displaying cached articles.',
      };
    }

    return {
      articles: [],
      providerStatus: 'UNAVAILABLE',
      isCached: false,
      message: isAbort
        ? 'MarketAux request timed out after 8 seconds.'
        : `Network connection error: ${err instanceof Error ? err.message : 'Unknown error'}`,
    };
  }
}
