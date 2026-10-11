'use client';

// ============================================================
// FINOVA — News & Market Page
// /news route
//
// Modern Editorial Financial News Feed, Portfolio-Aware Personalization,
// and Grounded AI News Intelligence
// ============================================================

import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Newspaper,
  Sparkles,
  Search,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { NewsCard } from '@/components/news/NewsCard';
import { NewsExplanationModal } from '@/components/news/NewsExplanationModal';
import type { PersonalizedNewsArticle, NewsApiResponse } from '@/types/news';

function NewsSkeletonCard({ isFeatured }: { isFeatured?: boolean }) {
  if (isFeatured) {
    return (
      <div
        className="rounded-2xl border p-0 overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-0 animate-pulse"
        style={{
          backgroundColor: 'rgb(var(--surface))',
          borderColor: 'rgb(var(--border))',
        }}
      >
        <div className="lg:col-span-6 aspect-[16/10] lg:aspect-auto lg:min-h-[360px] bg-muted/15" />
        <div className="lg:col-span-6 p-6 sm:p-7 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="h-4 bg-muted/20 rounded w-1/4" />
            <div className="h-7 bg-muted/20 rounded w-4/5" />
            <div className="h-4 bg-muted/15 rounded w-full" />
            <div className="h-4 bg-muted/15 rounded w-2/3" />
          </div>
          <div className="h-10 bg-muted/10 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl border p-0 overflow-hidden flex flex-col justify-between animate-pulse"
      style={{
        backgroundColor: 'rgb(var(--surface))',
        borderColor: 'rgb(var(--border))',
      }}
    >
      <div>
        <div className="aspect-[16/9] w-full bg-muted/15" />
        <div className="p-4 sm:p-5 space-y-3">
          <div className="h-3.5 bg-muted/20 rounded w-1/3" />
          <div className="h-5 bg-muted/20 rounded w-full" />
          <div className="h-3.5 bg-muted/15 rounded w-4/5" />
        </div>
      </div>
      <div
        className="p-4 border-t flex justify-between"
        style={{ borderColor: 'rgb(var(--border))' }}
      >
        <div className="h-7 bg-muted/15 rounded w-28" />
        <div className="h-7 bg-muted/15 rounded w-20" />
      </div>
    </div>
  );
}

function NewsAndMarketContent() {
  const searchParams = useSearchParams();
  const initialSymbol = searchParams.get('symbol') || '';

  const [articles, setArticles] = useState<PersonalizedNewsArticle[]>([]);
  const [nextPage, setNextPage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
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
      setNextPage(data.next_page || data.meta?.next_page || null);
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
          setNextPage(data.next_page || data.meta?.next_page || null);
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

  const handleLoadMore = async () => {
    if (!nextPage || loadingMore) return;
    setLoadingMore(true);

    try {
      const url = new URL('/api/news', window.location.origin);
      url.searchParams.set('page', nextPage);
      if (searchQuery.trim()) url.searchParams.set('q', searchQuery.trim());

      const res = await fetch(url.toString());
      const data: NewsApiResponse = await res.json();

      if (data.articles && data.articles.length > 0) {
        setArticles((prev) => {
          const seenLinks = new Set(prev.map((a) => a.link.toLowerCase().replace(/\/+$/, '')));
          const seenIds = new Set(prev.map((a) => a.article_id));
          const newArticles = data.articles.filter(
            (a) => !seenIds.has(a.article_id) && !seenLinks.has(a.link.toLowerCase().replace(/\/+$/, ''))
          );
          return [...prev, ...newArticles];
        });
      }

      setNextPage(data.next_page || data.meta?.next_page || null);
    } catch (err) {
      console.warn('[News] Load more failed:', err);
    } finally {
      setLoadingMore(false);
    }
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

  const isDefaultView = selectedCategory === 'all' && !searchQuery.trim();
  const featuredArticle = isDefaultView && filteredArticles.length > 0 ? filteredArticles[0] : null;
  const regularArticles = isDefaultView && filteredArticles.length > 0 ? filteredArticles.slice(1) : filteredArticles;

  return (
    <div className="page-container space-y-6">
      {/* Editorial Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'rgb(var(--foreground))' }}>
              NEWS & MARKET
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
                ? 'Latest Financial Feed'
                : providerStatus === 'ACTIVE' && isCached
                ? 'Showing Cached Feed'
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
            Market updates and financial news relevant to your investments.
          </p>
        </div>

        <button
          onClick={() => fetchNews(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all hover:bg-surface-raised self-start sm:self-auto cursor-pointer"
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
              NewsData.io Provider Notice
            </p>
            <p style={{ color: 'rgb(var(--muted))' }}>
              {providerMessage || 'Live Indian financial headlines require NEWSDATA_API_KEY in your server environment.'}
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
              Displaying previously fetched verified financial headlines. Live requests will resume when the quota resets.
            </p>
          </div>
        </div>
      )}

      {/* Market Summary Area */}
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
            Verified Articles
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
            Intelligence Layer
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-sm font-bold text-brand flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              AI Smart Insights
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
            { id: 'portfolio', label: 'For Your Portfolio' },
            { id: 'direct', label: 'Direct Matches' },
            { id: 'sector', label: 'Sector News' },
            { id: 'market', label: 'Market News' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedCategory(tab.id)}
              className="px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer"
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
            placeholder="Search headline, ticker, sector..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs border bg-transparent focus:outline-none focus:ring-1 focus:ring-brand"
            style={{
              borderColor: 'rgb(var(--border))',
              color: 'rgb(var(--foreground))',
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted hover:text-foreground cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* News Editorial Content Area */}
      {loading ? (
        <div className="space-y-5">
          <NewsSkeletonCard isFeatured={true} />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <NewsSkeletonCard key={i} />
            ))}
          </div>
        </div>
      ) : filteredArticles.length > 0 ? (
        <div className="space-y-6">
          {/* Featured Hero Story (when on default All tab without active search) */}
          {featuredArticle && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <NewsCard
                article={featuredArticle}
                isFeatured={true}
                onExplainAi={setActiveArticleForAi}
                isExpandedReason={Boolean(expandedReasons[featuredArticle.article_id])}
                onToggleReason={() => toggleReason(featuredArticle.article_id)}
              />
            </motion.div>
          )}

          {/* Section Heading for Remaining News if Featured Story is Present */}
          {featuredArticle && regularArticles.length > 0 && (
            <div className="flex items-center justify-between pt-2">
              <h2
                className="text-base sm:text-lg font-bold tracking-tight flex items-center gap-2"
                style={{ color: 'rgb(var(--foreground))' }}
              >
                <span>Latest Financial Stories</span>
                <span
                  className="text-xs px-2 py-0.5 rounded-full border font-normal"
                  style={{
                    backgroundColor: 'rgb(var(--surface-raised))',
                    borderColor: 'rgb(var(--border))',
                    color: 'rgb(var(--muted))',
                  }}
                >
                  {regularArticles.length} stories
                </span>
              </h2>
            </div>
          )}

          {/* Grid Layout for News Cards */}
          {regularArticles.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {regularArticles.map((article, index) => (
                <motion.div
                  key={article.article_id || index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.03, 0.3) }}
                >
                  <NewsCard
                    article={article}
                    isFeatured={false}
                    onExplainAi={setActiveArticleForAi}
                    isExpandedReason={Boolean(expandedReasons[article.article_id])}
                    onToggleReason={() => toggleReason(article.article_id)}
                  />
                </motion.div>
              ))}
            </div>
          )}

          {/* Load More News Action Bar */}
          <div className="flex flex-col items-center justify-center pt-6 pb-4 gap-2">
            {nextPage ? (
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold border transition-all hover:bg-surface-raised shadow-xs cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: 'rgb(var(--surface))',
                  borderColor: 'rgb(var(--border))',
                  color: 'rgb(var(--foreground))',
                }}
              >
                {loadingMore ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-brand" />
                    <span>Loading More Stories...</span>
                  </>
                ) : (
                  <>
                    <Newspaper className="w-3.5 h-3.5 text-brand" />
                    <span>Load More News</span>
                  </>
                )}
              </button>
            ) : (
              <div
                className="text-xs flex items-center justify-center gap-1.5 py-2 font-medium"
                style={{ color: 'rgb(var(--muted))' }}
              >
                <span>✓</span>
                <span>All latest verified market stories loaded</span>
              </div>
            )}

            <span className="text-[11px]" style={{ color: 'rgb(var(--muted))' }}>
              Showing {filteredArticles.length} verified financial stories from NewsData.io
            </span>
          </div>
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
              : 'No articles currently match this category filter. Switch to "All News" or "Market News" to view broader market coverage.'}
          </p>
          {(searchQuery || selectedCategory !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-sm mt-2 transition-all hover:opacity-95 cursor-pointer"
              style={{
                background: 'linear-gradient(135deg, rgb(var(--brand-600)), rgb(var(--brand-400)))',
              }}
            >
              Reset Filters
            </button>
          )}
        </div>
      )}

      {/* Grounded News Explainer Modal (Zero technical Gemini model details exposed) */}
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
          <NewsSkeletonCard isFeatured={true} />
        </div>
      }
    >
      <NewsAndMarketContent />
    </Suspense>
  );
}
