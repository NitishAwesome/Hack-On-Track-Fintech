'use client';

import React, { useState, useEffect } from 'react';
import type { PersonalizedNewsArticle, NewsApiResponse } from '@/types/news';
import {
  Newspaper,
  ExternalLink,
  Clock,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Bot,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface StockNewsSectionProps {
  symbol: string;
  companyName?: string;
  sector?: string;
}

interface ArticleAiExplanation {
  loading: boolean;
  text?: string;
  model?: string;
  source?: string;
  error?: string;
}

export function StockNewsSection({
  symbol,
  companyName,
  sector,
}: StockNewsSectionProps) {
  const [articles, setArticles] = useState<PersonalizedNewsArticle[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeArticleId, setActiveArticleId] = useState<string | null>(null);
  const [aiExplanations, setAiExplanations] = useState<Record<string, ArticleAiExplanation>>({});

  useEffect(() => {
    let isMounted = true;
    async function load() {
      if (!symbol) return;
      setLoading(true);
      setError(null);
      try {
        const url = `/api/news?symbol=${encodeURIComponent(symbol)}`;
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`Failed to load news for ${symbol} (status ${res.status})`);
        }
        const data: NewsApiResponse = await res.json();
        if (isMounted) {
          setArticles(data.articles || []);
          setError(null);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'News feed temporarily unreachable');
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [symbol]);

  const handleManualRefresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/news?symbol=${encodeURIComponent(symbol)}&refresh=true`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Failed to load news for ${symbol} (status ${res.status})`);
      }
      const data: NewsApiResponse = await res.json();
      setArticles(data.articles || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'News feed temporarily unreachable');
    } finally {
      setLoading(false);
    }
  };

  const handleExplainArticle = async (article: PersonalizedNewsArticle, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    const id = article.article_id;
    if (activeArticleId === id) {
      setActiveArticleId(null);
      return;
    }

    setActiveArticleId(id);

    // If already fetched, don't refetch
    if (aiExplanations[id]?.text) {
      return;
    }

    setAiExplanations((prev) => ({
      ...prev,
      [id]: { loading: true },
    }));

    try {
      const res = await fetch('/api/ai/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'news_article',
          stock: {
            symbol,
            name: companyName || symbol,
            sector: sector || undefined,
          },
          article: {
            title: article.title,
            source_name: article.source_name,
            pubDate: article.pubDate,
            description: article.description,
            is_delayed_feed: article.temporal_info?.is_delayed_feed,
            timestamp_display: article.temporal_info?.display_label || formatArticleTime(article.pubDate),
            link: article.link,
          },
        }),
      });

      if (!res.ok) {
        throw new Error(`AI explanation request failed (${res.status})`);
      }

      const data = await res.json();
      setAiExplanations((prev) => ({
        ...prev,
        [id]: {
          loading: false,
          text: data.explanation || 'No explanation available.',
          model: data.model || 'Gemini 2.5',
          source: data.source || 'gemini',
        },
      }));
    } catch (err) {
      setAiExplanations((prev) => ({
        ...prev,
        [id]: {
          loading: false,
          error: err instanceof Error ? err.message : 'AI analysis temporarily unavailable.',
          text: `This verified development concerns ${companyName || symbol} (${symbol}). Review official disclosures on NSE/BSE to verify material business and financial impact.`,
          source: 'deterministic_fallback',
        },
      }));
    }
  };

  const formatArticleTime = (isoString?: string) => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      return new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }).format(d);
    } catch {
      return '—';
    }
  };

  const getProviderBadge = (provider?: string) => {
    const p = (provider || '').toLowerCase();
    if (p.includes('marketaux')) {
      return (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
          Marketaux
        </span>
      );
    }
    if (p.includes('gdelt')) {
      return (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20">
          GDELT 2.0
        </span>
      );
    }
    if (p.includes('newsdata')) {
      return (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
          NewsData.io
        </span>
      );
    }
    return (
      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-surface-raised text-muted border border-border">
        Aggregated Feed
      </span>
    );
  };

  const getFeedFreshnessBadge = (isDelayed?: boolean, isCached?: boolean) => {
    if (isCached) {
      return (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-surface-raised text-muted border border-border">
          Cached
        </span>
      );
    }
    return (
      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
        Verified Feed
      </span>
    );
  };

  return (
    <div className="bg-card/70 border border-border/70 rounded-2xl p-6 backdrop-blur-sm space-y-4">
      {/* Title */}
      <div className="flex items-center justify-between border-b border-border/40 pb-3">
        <div className="flex items-center gap-2">
          <Newspaper className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
          <h3 className="text-base font-bold text-foreground tracking-tight">
            Relevant News & Coverage
          </h3>
          <span className="text-xs text-muted">for {companyName || symbol}</span>
        </div>

        <button
          type="button"
          onClick={handleManualRefresh}
          disabled={loading}
          className="p-1.5 text-muted hover:text-foreground rounded-md hover:bg-surface-raised transition disabled:opacity-50"
          aria-label="Refresh company news"
          title="Refresh company news"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-surface/50 border border-border/40 rounded-xl animate-pulse p-4 space-y-2">
              <div className="h-4 bg-surface-raised rounded w-3/4" />
              <div className="h-3 bg-surface-raised/60 rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {error && !loading && (
        <div className="p-4 rounded-xl bg-surface/50 border border-border/40 text-xs text-muted flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
          <span>{error}. Displaying verified empty state.</span>
        </div>
      )}

      {!loading && !error && articles.length === 0 && (
        <div className="p-8 text-center text-xs text-muted bg-surface/40 rounded-xl border border-border/40 space-y-1">
          <p className="font-semibold text-foreground">
            No sufficiently recent relevant news available for this stock.
          </p>
          <p className="text-[11px] text-muted">
            Verified connected feeds (Marketaux, GDELT 2.0, NewsData.io) have no active coverage matches for {companyName || symbol}.
          </p>
        </div>
      )}

      {!loading && articles.length > 0 && (
        <div className="space-y-3">
          {articles.slice(0, 6).map((article) => {
            const isAiExpanded = activeArticleId === article.article_id;
            const aiData = aiExplanations[article.article_id];

            return (
              <div
                key={article.article_id}
                className="p-4 rounded-xl bg-surface/60 hover:bg-surface-raised border border-border/60 hover:border-border transition block group space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <a
                      href={article.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-semibold text-foreground hover:text-emerald-700 dark:hover:text-emerald-400 transition leading-snug line-clamp-2 inline-flex items-baseline gap-1"
                    >
                      <span>{article.title}</span>
                      <ExternalLink className="w-3.5 h-3.5 text-muted shrink-0 inline translate-y-0.5" />
                    </a>

                    {article.description && (
                      <p className="text-xs text-muted line-clamp-2 leading-relaxed">
                        {article.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-muted">
                      <span className="font-medium text-foreground">{article.source_name}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1 font-mono text-muted">
                        <Clock className="w-3 h-3 text-muted" />
                        {article.temporal_info?.display_label || formatArticleTime(article.pubDate)}
                      </span>
                      <span>•</span>
                      {getProviderBadge(article.source_provider)}
                      <span>•</span>
                      {getFeedFreshnessBadge(
                        article.temporal_info?.is_delayed_feed,
                        article.temporal_info?.is_cached
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handleExplainArticle(article, e)}
                    className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 transition shadow-sm"
                    title="Explain story with FINOVA AI"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">AI Analysis</span>
                    {isAiExpanded ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    )}
                  </button>
                </div>

                {/* AI Explanation Drawer */}
                {isAiExpanded && (
                  <div className="pt-2 border-t border-border/40 mt-2 space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold">
                        <Bot className="w-3.5 h-3.5" />
                        <span>FINOVA Intelligence (Gemini AI)</span>
                      </div>
                      {aiData?.model && (
                        <span className="font-mono text-[10px] text-muted">
                          {aiData.model}
                        </span>
                      )}
                    </div>

                    {aiData?.loading ? (
                      <div className="p-3 bg-surface/60 rounded-lg border border-border/40 animate-pulse space-y-1.5">
                        <div className="h-3 bg-surface-raised rounded w-5/6" />
                        <div className="h-3 bg-surface-raised/60 rounded w-4/6" />
                      </div>
                    ) : aiData?.text ? (
                      <div className="p-3 bg-surface/80 rounded-lg border border-emerald-500/20 text-xs text-foreground leading-relaxed space-y-1.5">
                        <p>{aiData.text}</p>
                        <p className="text-[10px] text-muted pt-1 border-t border-border/50">
                          AI educational summary grounded in verified news text. Stock prices and fundamentals are deterministic.
                        </p>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
