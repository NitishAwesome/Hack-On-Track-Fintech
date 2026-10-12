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
import {
  personalizeAndRankNews,
  matchesSymbolOrCompany,
  matchesSector,
} from '@/lib/news/personalizationEngine';
import { EXPANDED_NSE_STOCKS } from '@/lib/market/stockCatalog';
import type { NewsApiResponse, PersonalizedNewsArticle } from '@/types/news';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filter = (searchParams.get('filter') || 'all').toLowerCase();
    const specificSymbol = searchParams.get('symbol')?.toUpperCase()?.trim();
    const customQuery = searchParams.get('q')?.trim();
    const forceRefresh = searchParams.get('refresh') === 'true';
    const pageToken = searchParams.get('page')?.trim() || undefined;

    // 1. Resolve catalog stock if specificSymbol is provided
    const catalogStock = specificSymbol
      ? EXPANDED_NSE_STOCKS.find((s) => s.symbol.toUpperCase() === specificSymbol)
      : null;

    // 2. Resolve authenticated user portfolio context server-side
    const portfolio = await resolveServerPortfolioContext();

    // 3. Fetch aggregated news across NewsData.io, MarketAux, and GDELT 2.0
    const portfolioSymbols = portfolio.holdings.map((h) => h.symbol);
    const targetQuery =
      customQuery ||
      (catalogStock
        ? `"${catalogStock.name.replace(/\s+(Ltd|Limited)$/i, '')}"`
        : specificSymbol || undefined);

    const fetchResult = await getAggregatedFinancialNews({
      query: targetQuery,
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

    // 4. Personalize and rank all returned real articles
    let filteredArticles: PersonalizedNewsArticle[] = [];

    if (specificSymbol) {
      // Find user holding if present in portfolio
      const userHolding = portfolio.holdings.find(
        (h) => h.symbol.toUpperCase() === specificSymbol
      );

      const directMatches: PersonalizedNewsArticle[] = [];
      const sectorMatches: PersonalizedNewsArticle[] = [];

      for (const art of fetchResult.articles) {
        const fullText = `${art.title} ${art.description || ''}`;
        const isDirect = matchesSymbolOrCompany(
          fullText,
          specificSymbol,
          catalogStock?.name,
          catalogStock?.isin
        );

        if (isDirect) {
          directMatches.push({
            ...art,
            relevance_category: 'DIRECT_HOLDING',
            relevance_score: 95,
            investigation_prompts: [
              `Direct company coverage for ${catalogStock?.name || specificSymbol}`,
            ],
            matched_holding: {
              symbol: specificSymbol,
              name: catalogStock?.name || specificSymbol,
              weight_pct: userHolding?.current_value ? 5.0 : 0,
              asset_class: 'equity',
              sector: catalogStock?.sector || 'NSE Equity',
              is_cross_broker: false,
              broker_names: [],
            },
            explanation: `Verified reporting directly covering corporate, operational, or earnings developments for ${
              catalogStock?.name || specificSymbol
            }.`,
          });
        } else if (catalogStock?.sector && matchesSector(fullText, catalogStock.sector)) {
          sectorMatches.push({
            ...art,
            relevance_category: 'SECTOR_RELEVANCE',
            relevance_score: 65,
            investigation_prompts: [
              `Sector coverage (${catalogStock.sector}) relevant to ${specificSymbol}`,
            ],
            matched_holding: {
              symbol: specificSymbol,
              name: catalogStock.name,
              weight_pct: userHolding?.current_value ? 5.0 : 0,
              asset_class: 'equity',
              sector: catalogStock.sector,
              is_cross_broker: false,
              broker_names: [],
            },
            explanation: `Industry developments affecting the ${catalogStock.sector} sector in India.`,
          });
        }
      }

      // Prioritize direct stock mentions, then relevant sector news
      filteredArticles = directMatches.length > 0 ? directMatches : sectorMatches;
    } else {
      const personalizedArticles = personalizeAndRankNews(fetchResult.articles, portfolio);
      filteredArticles = personalizedArticles;

      if (filter === 'portfolio') {
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
    }

    const directCount = filteredArticles.filter((a) => a.relevance_category === 'DIRECT_HOLDING').length;
    const sectorCount = filteredArticles.filter((a) => a.relevance_category === 'SECTOR_RELEVANCE').length;

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
