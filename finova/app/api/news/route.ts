// ============================================================
// FINOVA — Multi-Provider Financial News API
// app/api/news/route.ts
//
// Key Principles:
// 1. Multi-provider aggregation (NewsData.io, MarketAux, GDELT 2.0).
// 2. ZERO fabricated/curated headlines in production.
// 3. Strict server-only credentials (never exposed to client).
// 4. Authenticated server-side portfolio context retrieval.
// 5. Deterministic relevance ranking & factual explanations.
// 6. Intelligent multi-factor deduplication & source transparency.
// 7. Fault-tolerant: single provider outage does not fail the feed.
// ============================================================

import { NextResponse } from 'next/server';
import { getAggregatedFinancialNews } from '@/lib/news/aggregationService';
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
    const pageToken = searchParams.get('page')?.trim() || undefined;

    // 1. Resolve authenticated user portfolio context server-side
    const portfolio = await resolveServerPortfolioContext();

    // 2. Fetch aggregated news across NewsData.io, MarketAux, and GDELT 2.0
    const portfolioSymbols = portfolio.holdings.map((h) => h.symbol);
    const fetchResult = await getAggregatedFinancialNews({
      query: customQuery,
      symbols: specificSymbol ? [specificSymbol] : portfolioSymbols,
      forceRefresh,
      page: pageToken,
    });

    const providerLabel =
      fetchResult.providersUsed.length > 0
        ? `Aggregated (${fetchResult.providersUsed.join(', ')})`
        : 'news_aggregator';

    // Handle provider error states cleanly without fabricating news
    if (fetchResult.articles.length === 0) {
      if (fetchResult.providerStatus === 'NOT_CONFIGURED') {
        const response: NewsApiResponse = {
          status: 'not_configured',
          articles: [],
          provider_status: 'NOT_CONFIGURED',
          message: fetchResult.message || 'News providers not configured.',
          meta: {
            total_fetched: 0,
            direct_matches_count: 0,
            sector_matches_count: 0,
            cached: false,
            provider: providerLabel,
            providers_used: fetchResult.providersUsed,
            provider_breakdown: fetchResult.providerBreakdown,
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
          message: fetchResult.message || 'News provider rate limits reached.',
          meta: {
            total_fetched: 0,
            direct_matches_count: 0,
            sector_matches_count: 0,
            cached: false,
            provider: providerLabel,
            providers_used: fetchResult.providersUsed,
            provider_breakdown: fetchResult.providerBreakdown,
            last_updated: new Date().toISOString(),
            portfolio_symbols_count: portfolioSymbols.length,
          },
        };
        return NextResponse.json(response, { status: 429 });
      }

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
          provider: providerLabel,
          providers_used: fetchResult.providersUsed,
          provider_breakdown: fetchResult.providerBreakdown,
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
      provider_status: fetchResult.providerStatus,
      message: fetchResult.message,
      next_page: fetchResult.nextPage || null,
      meta: {
        total_fetched: fetchResult.articles.length,
        direct_matches_count: directCount,
        sector_matches_count: sectorCount,
        cached: fetchResult.isCached,
        provider: providerLabel,
        providers_used: fetchResult.providersUsed,
        provider_breakdown: fetchResult.providerBreakdown,
        last_updated: new Date().toISOString(),
        portfolio_symbols_count: portfolioSymbols.length,
        next_page: fetchResult.nextPage || null,
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
          provider: 'news_aggregator',
          last_updated: new Date().toISOString(),
          portfolio_symbols_count: 0,
        },
      },
      { status: 500 }
    );
  }
}
