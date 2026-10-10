// ============================================================
// FINOVA — Personalized Financial News API (Prompt 12)
// app/api/news/route.ts
//
// Key Principles:
// 1. ZERO fabricated/curated headlines in production.
// 2. Verified real NewsData.io integration (server-only key).
// 3. Authenticated server-side portfolio context retrieval.
// 4. Deterministic relevance ranking & factual explanations.
// 5. Strict error states (NOT_CONFIGURED, RATE_LIMITED, UNAVAILABLE).
// ============================================================

import { NextResponse } from 'next/server';
import { fetchIndianFinancialNews } from '@/lib/news/newsProvider';
import { resolveServerPortfolioContext } from '@/lib/news/portfolioContextResolver';
import { personalizeAndRankNews } from '@/lib/news/personalizationEngine';
import type { NewsApiResponse, PersonalizedNewsArticle } from '@/types/news';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filter = (searchParams.get('filter') || 'all').toLowerCase();
    const specificSymbol = searchParams.get('symbol')?.toUpperCase()?.trim();
    const customQuery = searchParams.get('q')?.trim();
    const forceRefresh = searchParams.get('refresh') === 'true';

    // 1. Resolve authenticated user portfolio context server-side
    const portfolio = await resolveServerPortfolioContext();

    // 2. Fetch real news from NewsData.io
    const portfolioSymbols = portfolio.holdings.map((h) => h.symbol);
    const fetchResult = await fetchIndianFinancialNews({
      query: customQuery,
      symbols: specificSymbol ? [specificSymbol] : portfolioSymbols,
      forceRefresh,
    });

    // Handle provider error states cleanly without fabricating news
    if (fetchResult.providerStatus === 'NOT_CONFIGURED') {
      const response: NewsApiResponse = {
        status: 'not_configured',
        articles: [],
        provider_status: 'NOT_CONFIGURED',
        message: fetchResult.message,
        meta: {
          total_fetched: 0,
          direct_matches_count: 0,
          sector_matches_count: 0,
          cached: false,
          provider: 'newsdata',
          last_updated: new Date().toISOString(),
          portfolio_symbols_count: portfolioSymbols.length,
        },
      };
      return NextResponse.json(response);
    }

    if (fetchResult.providerStatus === 'RATE_LIMITED') {
      const response: NewsApiResponse = {
        status: 'rate_limited',
        articles: [],
        provider_status: 'RATE_LIMITED',
        message: fetchResult.message,
        meta: {
          total_fetched: 0,
          direct_matches_count: 0,
          sector_matches_count: 0,
          cached: false,
          provider: 'newsdata',
          last_updated: new Date().toISOString(),
          portfolio_symbols_count: portfolioSymbols.length,
        },
      };
      return NextResponse.json(response, { status: 429 });
    }

    if (fetchResult.providerStatus === 'UNAVAILABLE' || fetchResult.providerStatus === 'ERROR') {
      const response: NewsApiResponse = {
        status: 'error',
        articles: [],
        provider_status: fetchResult.providerStatus,
        message: fetchResult.message,
        meta: {
          total_fetched: 0,
          direct_matches_count: 0,
          sector_matches_count: 0,
          cached: false,
          provider: 'newsdata',
          last_updated: new Date().toISOString(),
          portfolio_symbols_count: portfolioSymbols.length,
        },
      };
      return NextResponse.json(response, { status: 502 });
    }

    if (fetchResult.articles.length === 0) {
      const response: NewsApiResponse = {
        status: 'empty',
        articles: [],
        provider_status: 'EMPTY',
        message: fetchResult.message || 'No news articles found.',
        meta: {
          total_fetched: 0,
          direct_matches_count: 0,
          sector_matches_count: 0,
          cached: fetchResult.isCached,
          provider: 'newsdata',
          last_updated: new Date().toISOString(),
          portfolio_symbols_count: portfolioSymbols.length,
        },
      };
      return NextResponse.json(response);
    }

    // 3. Personalize and rank all returned real articles against user's portfolio
    const personalizedArticles = personalizeAndRankNews(fetchResult.articles, portfolio);

    // 4. Apply optional filters
    let filteredArticles: PersonalizedNewsArticle[] = personalizedArticles;

    if (specificSymbol) {
      filteredArticles = filteredArticles.filter(
        (a) => a.matched_holding?.symbol.toUpperCase() === specificSymbol
      );
    } else if (filter === 'portfolio') {
      filteredArticles = filteredArticles.filter(
        (a) =>
          a.relevance_category === 'DIRECT_HOLDING' ||
          a.relevance_category === 'SECTOR_RELEVANCE' ||
          a.relevance_category === 'ASSET_CLASS'
      );
    } else if (filter === 'direct') {
      filteredArticles = filteredArticles.filter(
        (a) => a.relevance_category === 'DIRECT_HOLDING'
      );
    } else if (filter === 'sector') {
      filteredArticles = filteredArticles.filter(
        (a) => a.relevance_category === 'SECTOR_RELEVANCE'
      );
    } else if (filter === 'market') {
      filteredArticles = filteredArticles.filter(
        (a) => a.relevance_category === 'GENERAL_MARKET'
      );
    }

    const directCount = personalizedArticles.filter((a) => a.relevance_category === 'DIRECT_HOLDING').length;
    const sectorCount = personalizedArticles.filter((a) => a.relevance_category === 'SECTOR_RELEVANCE').length;

    const response: NewsApiResponse = {
      status: 'success',
      articles: filteredArticles,
      provider_status: 'ACTIVE',
      meta: {
        total_fetched: fetchResult.articles.length,
        direct_matches_count: directCount,
        sector_matches_count: sectorCount,
        cached: fetchResult.isCached,
        provider: 'newsdata',
        last_updated: new Date().toISOString(),
        portfolio_symbols_count: portfolioSymbols.length,
      },
    };

    return NextResponse.json(response);
  } catch (err: unknown) {
    console.error('[API /api/news] Unexpected error:', err);
    return NextResponse.json(
      {
        status: 'error',
        articles: [],
        provider_status: 'ERROR',
        message: err instanceof Error ? err.message : 'Internal news processing error.',
        meta: {
          total_fetched: 0,
          direct_matches_count: 0,
          sector_matches_count: 0,
          cached: false,
          provider: 'newsdata',
          last_updated: new Date().toISOString(),
          portfolio_symbols_count: 0,
        },
      },
      { status: 500 }
    );
  }
}
