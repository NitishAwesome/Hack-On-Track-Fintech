'use client';

// ============================================================
// FINOVA — News & Market Page (Prompt 12)
// /news route
//
// Real Financial News, Portfolio-Aware Personalization,
// and Grounded AI News Intelligence
// ============================================================

import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Newspaper,
  Sparkles,
  ExternalLink,
  Search,
  RefreshCw,
  TrendingUp,
  Building2,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { NewsExplanationModal } from '@/components/news/NewsExplanationModal';
import { SkeletonCard } from '@/components/shared/Skeletons';
import type { PersonalizedNewsArticle, NewsApiResponse } from '@/types/news';

function NewsAndMarketContent() {
  const searchParams = useSearchParams();
  const initialSymbol = searchParams.get('symbol') || '';

  const [articles, setArticles] = useState<PersonalizedNewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [providerStatus, setProviderStatus] = useState<string>('ACTIVE');
  const [providerMessage, setProviderMessage] = useState<string | null>(null);
  const [isCached, setIsCached] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>(initialSymbol ? 'direct' : 'all');
  const [searchQuery, setSearchQuery] = useState<string>(initialSymbol);
  const [activeArticleForAi, setActiveArticleForAi] = useState<PersonalizedNewsArticle | null>(null);
  const [expandedReasons, setExpandedReasons] = useState<Record<string, boolean>>({});

  const prevSymbolRef = useRef(initialSymbol);

  const fetchNews = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const url = new URL('/api/news', window.location.origin);
      if (isManualRefresh) url.searchParams.set('refresh', 'true');

      const res = await fetch(url.toString());
      const data: NewsApiResponse = await res.json();

      setArticles(data.articles || []);
      setProviderStatus(data.provider_status || 'ACTIVE');
      setProviderMessage(data.message || null);
      setIsCached(Boolean(data.meta?.cached));
    } catch {
      setProviderStatus('ERROR');
      setProviderMessage('Unable to connect to financial news service.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    let active = true;

    async function loadInitialFeed() {
      try {
        const res = await fetch('/api/news');
        const data: NewsApiResponse = await res.json();
        if (active) {
          setArticles(data.articles || []);
          setProviderStatus(data.provider_status || 'ACTIVE');
          setProviderMessage(data.message || null);
          setIsCached(Boolean(data.meta?.cached));
        }
      } catch {
        if (active) {
          setProviderStatus('ERROR');
          setProviderMessage('Unable to connect to financial news service.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadInitialFeed();

    return () => {
      active = false;
    };
  }, []);

  // Update search query if symbol in URL changes
  useEffect(() => {
    if (initialSymbol && prevSymbolRef.current !== initialSymbol) {
      prevSymbolRef.current = initialSymbol;
      const timer = setTimeout(() => {
        setSearchQuery(initialSymbol);
        setSelectedCategory('direct');
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [initialSymbol]);

  const toggleReason = (articleId: string) => {
    setExpandedReasons((prev) => ({
      ...prev,
      [articleId]: !prev[articleId],
    }));
  };

  // Filtered articles
  const filteredArticles = useMemo(() => {
    let result = articles;

    if (selectedCategory === 'portfolio') {
      result = result.filter(
        (a) =>
          a.relevance_category === 'DIRECT_HOLDING' ||
          a.relevance_category === 'SECTOR_RELEVANCE' ||
          a.relevance_category === 'ASSET_CLASS'
      );
    } else if (selectedCategory === 'direct') {
      result = result.filter((a) => a.relevance_category === 'DIRECT_HOLDING');
    } else if (selectedCategory === 'sector') {
      result = result.filter((a) => a.relevance_category === 'SECTOR_RELEVANCE');
    } else if (selectedCategory === 'market') {
      result = result.filter((a) => a.relevance_category === 'GENERAL_MARKET');
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((a) => {
        const titleMatch = a.title.toLowerCase().includes(q);
        const sourceMatch = a.source_name.toLowerCase().includes(q);
        const symbolMatch = a.matched_holding?.symbol.toLowerCase().includes(q);
        const nameMatch = a.matched_holding?.name.toLowerCase().includes(q);
        const sectorMatch = (a.matched_sector || '').toLowerCase().includes(q);
        return titleMatch || sourceMatch || symbolMatch || nameMatch || sectorMatch;
      });
    }

    return result;
  }, [articles, selectedCategory, searchQuery]);

  // Aggregate metrics
  const directMatchesCount = useMemo(
    () => articles.filter((a) => a.relevance_category === 'DIRECT_HOLDING').length,
    [articles]
  );
  const sectorMatchesCount = useMemo(
    () => articles.filter((a) => a.relevance_category === 'SECTOR_RELEVANCE').length,
    [articles]
  );

  return (
    <div className="page-container space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'rgb(var(--foreground))' }}>
              News & Market Intelligence
            </h1>
            <span
              className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1.5"
              style={{
                backgroundColor:
                  providerStatus === 'ACTIVE' && !isCached
                    ? 'rgb(var(--gain) / 0.1)'
                    : providerStatus === 'ACTIVE' && isCached
                    ? 'rgb(var(--brand) / 0.1)'
                    : providerStatus === 'NOT_CONFIGURED' || providerStatus === 'RATE_LIMITED'
                    ? 'rgb(var(--warning) / 0.1)'
                    : 'rgb(var(--loss) / 0.1)',
                color:
                  providerStatus === 'ACTIVE' && !isCached
                    ? 'rgb(var(--gain))'
                    : providerStatus === 'ACTIVE' && isCached
                    ? 'rgb(var(--brand))'
                    : providerStatus === 'NOT_CONFIGURED' || providerStatus === 'RATE_LIMITED'
                    ? 'rgb(var(--warning))'
                    : 'rgb(var(--loss))',
              }}
            >
              <span className={`w-1.5 h-1.5 rounded-full bg-current ${providerStatus === 'ACTIVE' && !isCached ? 'animate-pulse' : ''}`} />
              {providerStatus === 'ACTIVE' && !isCached
                ? 'Latest Financial News'
                : providerStatus === 'ACTIVE' && isCached
                ? 'Showing Previously Fetched Articles'
                : providerStatus === 'RATE_LIMITED'
                ? articles.length > 0
                  ? 'Daily Quota Reached · Cached Feed'
                  : 'Daily News Quota Reached'
                : providerStatus === 'NOT_CONFIGURED'
                ? 'Provider Unconfigured'
                : articles.length > 0
                ? 'Feed Offline · Cached Feed'
                : 'News Temporarily Unavailable'}
            </span>
          </div>
          <p className="text-sm mt-1" style={{ color: 'rgb(var(--muted))' }}>
            Real verified Indian financial news, ranked and explained against your tracked investments
          </p>
        </div>

        <button
          onClick={() => fetchNews(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all hover:bg-surface-raised self-start sm:self-auto"
          style={{
            backgroundColor: 'rgb(var(--surface))',
            borderColor: 'rgb(var(--border))',
            color: 'rgb(var(--foreground))',
          }}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>{refreshing ? 'Refreshing...' : 'Refresh News'}</span>
        </button>
      </div>

      {/* Provider Notice Banner if Not Configured */}
      {providerStatus === 'NOT_CONFIGURED' && (
        <div
          className="p-4 rounded-xl border flex items-start gap-3 text-xs"
          style={{
            backgroundColor: 'rgb(var(--warning-bg) / 0.4)',
            borderColor: 'rgb(var(--warning) / 0.4)',
            color: 'rgb(var(--foreground))',
          }}
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-500 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold" style={{ color: 'rgb(var(--warning))' }}>
              NewsData.io Provider Not Configured
            </p>
            <p style={{ color: 'rgb(var(--muted))' }}>
              {providerMessage || 'To receive live streaming Indian financial news, add your NEWSDATA_API_KEY to your server environment. FINOVA strictly refuses to fabricate fake news headlines or mock publisher articles in production.'}
            </p>
          </div>
        </div>
      )}

      {/* Daily Quota / Rate Limit Notice with Cached Articles */}
      {providerStatus === 'RATE_LIMITED' && articles.length > 0 && (
        <div
          className="p-3.5 rounded-xl border flex items-start gap-2.5 text-xs"
          style={{
            backgroundColor: 'rgb(var(--warning-bg) / 0.3)',
            borderColor: 'rgb(var(--warning) / 0.3)',
            color: 'rgb(var(--foreground))',
          }}
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-500 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold text-amber-400">
              Daily News Quota Reached
            </p>
            <p className="text-[11px]" style={{ color: 'rgb(var(--muted))' }}>
              Displaying previously fetched verified financial headlines. Live requests will resume when the external provider quota resets.
            </p>
          </div>
        </div>
      )}

      {/* Overview Metric Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div
          className="p-4 rounded-xl border"
          style={{
            backgroundColor: 'rgb(var(--surface))',
            borderColor: 'rgb(var(--border))',
          }}
        >
          <span className="text-[11px] font-medium" style={{ color: 'rgb(var(--muted))' }}>
            Direct Holding Matches
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold" style={{ color: 'rgb(var(--foreground))' }}>
              {directMatchesCount}
            </span>
            <span className="text-[10px] text-brand font-medium">Stories</span>
          </div>
        </div>

        <div
          className="p-4 rounded-xl border"
          style={{
            backgroundColor: 'rgb(var(--surface))',
            borderColor: 'rgb(var(--border))',
          }}
        >
          <span className="text-[11px] font-medium" style={{ color: 'rgb(var(--muted))' }}>
            Sector Developments
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold" style={{ color: 'rgb(var(--foreground))' }}>
              {sectorMatchesCount}
            </span>
            <span className="text-[10px] text-brand font-medium">Sectors</span>
          </div>
        </div>

        <div
          className="p-4 rounded-xl border"
          style={{
            backgroundColor: 'rgb(var(--surface))',
            borderColor: 'rgb(var(--border))',
          }}
        >
          <span className="text-[11px] font-medium" style={{ color: 'rgb(var(--muted))' }}>
            Total Verified Articles
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold" style={{ color: 'rgb(var(--foreground))' }}>
              {articles.length}
            </span>
            <span className="text-[10px]" style={{ color: 'rgb(var(--muted))' }}>
              In Feed
            </span>
          </div>
        </div>

        <div
          className="p-4 rounded-xl border"
          style={{
            backgroundColor: 'rgb(var(--surface))',
            borderColor: 'rgb(var(--border))',
          }}
        >
          <span className="text-[11px] font-medium" style={{ color: 'rgb(var(--muted))' }}>
            AI Grounding Engine
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-sm font-bold text-brand flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              Gemini 1.5
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        className="p-3 rounded-xl border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3"
        style={{
          backgroundColor: 'rgb(var(--surface))',
          borderColor: 'rgb(var(--border))',
        }}
      >
        {/* Categories Tab Pill */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 text-xs">
          {[
            { id: 'all', label: 'All News' },
            { id: 'portfolio', label: 'My Portfolio News' },
            { id: 'direct', label: 'Direct Matches' },
            { id: 'sector', label: 'Sector News' },
            { id: 'market', label: 'Indian Markets' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedCategory(tab.id)}
              className="px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-all duration-150"
              style={{
                backgroundColor:
                  selectedCategory === tab.id ? 'rgb(var(--brand-500))' : 'transparent',
                color: selectedCategory === tab.id ? '#ffffff' : 'rgb(var(--muted))',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search headline, company, ticker..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs border bg-transparent focus:outline-none focus:ring-1 focus:ring-brand"
            style={{
              borderColor: 'rgb(var(--border))',
              color: 'rgb(var(--foreground))',
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* News Feed Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} lines={5} />
          ))}
        </div>
      ) : filteredArticles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredArticles.map((article, index) => {
            const isExpanded = Boolean(expandedReasons[article.article_id]);

            return (
              <motion.div
                key={article.article_id || index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="p-5 rounded-2xl border flex flex-col justify-between gap-3.5 group hover:shadow-md transition-all duration-200"
                style={{
                  backgroundColor: 'rgb(var(--surface))',
                  borderColor: 'rgb(var(--border))',
                }}
              >
                {/* Top Row: Relevance Badge + Date + External Link */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {article.relevance_category === 'DIRECT_HOLDING' && (
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"
                        style={{
                          backgroundColor: 'rgb(var(--brand-500) / 0.12)',
                          color: 'rgb(var(--brand-500))',
                        }}
                      >
                        <Building2 className="w-3 h-3" />
                        Direct Holding Match
                      </span>
                    )}

                    {article.relevance_category === 'SECTOR_RELEVANCE' && (
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                        style={{
                          backgroundColor: 'rgb(var(--info-bg) / 0.4)',
                          color: 'rgb(var(--info))',
                        }}
                      >
                        Sector: {article.matched_sector}
                      </span>
                    )}

                    {article.relevance_category === 'ASSET_CLASS' && (
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                        style={{
                          backgroundColor: 'rgb(var(--surface-raised))',
                          color: 'rgb(var(--foreground))',
                        }}
                      >
                        Asset Class Relevance
                      </span>
                    )}

                    {article.relevance_category === 'GENERAL_MARKET' && (
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                        style={{
                          backgroundColor: 'rgb(var(--surface-raised))',
                          color: 'rgb(var(--muted))',
                        }}
                      >
                        Indian Markets
                      </span>
                    )}

                    {article.freshness === 'LIVE' && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-red-500/10 text-red-500">
                        LIVE
                      </span>
                    )}
                  </div>

                  <a
                    href={article.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform hover:scale-105 border group-hover:text-brand"
                    style={{
                      backgroundColor: 'rgb(var(--surface-raised))',
                      borderColor: 'rgb(var(--border))',
                      color: 'rgb(var(--muted))',
                    }}
                    title="Open verified original article"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                {/* Direct Matched Holding Pill if available */}
                {article.matched_holding && (
                  <div
                    className="p-2.5 rounded-xl border flex items-center justify-between text-xs"
                    style={{
                      backgroundColor: 'rgb(var(--surface-raised))',
                      borderColor: 'rgb(var(--border))',
                    }}
                  >
                    <div className="flex items-center gap-1.5 font-semibold" style={{ color: 'rgb(var(--foreground))' }}>
                      <TrendingUp className="w-3.5 h-3.5 text-brand" />
                      <span>{article.matched_holding.name} ({article.matched_holding.symbol})</span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px]" style={{ color: 'rgb(var(--muted))' }}>
                      {article.matched_holding.weight_pct !== null && (
                        <span>~{article.matched_holding.weight_pct}% weight</span>
                      )}
                      {article.matched_holding.is_cross_broker && (
                        <span className="text-brand font-medium">· Multi-Broker</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Article Headline */}
                <div className="space-y-1.5">
                  <a
                    href={article.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm sm:text-base font-bold leading-snug hover:underline line-clamp-2"
                    style={{ color: 'rgb(var(--foreground))' }}
                  >
                    {article.title}
                  </a>

                  {article.description && (
                    <p className="text-xs line-clamp-2 leading-relaxed" style={{ color: 'rgb(var(--muted))' }}>
                      {article.description}
                    </p>
                  )}
                </div>

                {/* Source & Publication Date */}
                <div className="flex items-center justify-between pt-1 text-[11px]" style={{ color: 'rgb(var(--muted))' }}>
                  <span>
                    {article.source_name} · {new Date(article.pubDate).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>

                  <span className="font-semibold text-[10px]">
                    Relevance: {article.relevance_score}/100
                  </span>
                </div>

                {/* Expandable "Why this matters" callout */}
                <div
                  className="rounded-xl border overflow-hidden transition-all text-xs"
                  style={{
                    backgroundColor: 'rgb(var(--surface-raised))',
                    borderColor: 'rgb(var(--border))',
                  }}
                >
                  <button
                    onClick={() => toggleReason(article.article_id)}
                    className="w-full p-2.5 flex items-center justify-between font-semibold hover:bg-surface-raised/50 transition-colors"
                    style={{ color: 'rgb(var(--foreground))' }}
                  >
                    <span className="flex items-center gap-1.5 text-[11px]">
                      <HelpCircle className="w-3.5 h-3.5 text-brand" />
                      Why is this relevant to your portfolio?
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5 text-muted" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-muted" />
                    )}
                  </button>

                  {isExpanded && (
                    <div
                      className="p-3 pt-0 border-t text-[11px] leading-relaxed space-y-2"
                      style={{
                        borderColor: 'rgb(var(--border))',
                        color: 'rgb(var(--muted))',
                      }}
                    >
                      <p>{article.explanation}</p>
                      {article.investigation_prompts && article.investigation_prompts.length > 0 && (
                        <div className="pt-1">
                          <span className="font-semibold text-foreground text-[10px] uppercase tracking-wider block mb-1">
                            Investigation prompt:
                          </span>
                          <p className="italic text-[10px]">
                            {article.investigation_prompts[0]}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Explain with AI Button */}
                <div className="pt-1 flex items-center justify-between">
                  <button
                    onClick={() => setActiveArticleForAi(article)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all hover:bg-surface-raised text-brand"
                    style={{
                      borderColor: 'rgb(var(--border))',
                      backgroundColor: 'rgb(var(--surface))',
                    }}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Explain with Gemini</span>
                  </button>

                  <a
                    href={article.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-semibold text-muted hover:text-foreground flex items-center gap-1"
                  >
                    <span>Read full story</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div
          className="p-12 rounded-2xl border flex flex-col items-center justify-center text-center gap-3"
          style={{
            backgroundColor: 'rgb(var(--surface))',
            borderColor: 'rgb(var(--border))',
          }}
        >
          <Newspaper className="w-10 h-10 text-muted" />
          <h3 className="text-base font-bold" style={{ color: 'rgb(var(--foreground))' }}>
            No Matching Articles Found
          </h3>
          <p className="text-xs max-w-md leading-relaxed" style={{ color: 'rgb(var(--muted))' }}>
            {searchQuery
              ? `No articles matched your search query "${searchQuery}". Try searching for another ticker or reset your filters.`
              : 'No articles currently match this category filter. Switch to "All News" or "Indian Markets" to view broader market coverage.'}
          </p>
          {(searchQuery || selectedCategory !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-sm mt-2 transition-all hover:opacity-95"
              style={{
                background: 'linear-gradient(135deg, rgb(var(--brand-600)), rgb(var(--brand-400)))',
              }}
            >
              Reset Filters
            </button>
          )}
        </div>
      )}

      {/* Grounded Gemini News Explainer Modal */}
      {activeArticleForAi && (
        <NewsExplanationModal
          key={activeArticleForAi.article_id}
          article={activeArticleForAi}
          onClose={() => setActiveArticleForAi(null)}
        />
      )}
    </div>
  );
}

export default function NewsAndMarketPage() {
  return (
    <Suspense
      fallback={
        <div className="page-container p-8 space-y-4">
          <SkeletonCard lines={6} />
        </div>
      }
    >
      <NewsAndMarketContent />
    </Suspense>
  );
}
