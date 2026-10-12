'use client';

import React, { useState, useEffect } from 'react';
import type { PersonalizedNewsArticle, NewsApiResponse } from '@/types/news';
import {
  Newspaper,
  ExternalLink,
  Clock,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

interface StockNewsSectionProps {
  symbol: string;
}

export function StockNewsSection({ symbol }: StockNewsSectionProps) {
  const [articles, setArticles] = useState<PersonalizedNewsArticle[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      if (!symbol) return;
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
        <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
          Marketaux
        </span>
      );
    }
    if (p.includes('gdelt')) {
      return (
        <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
          GDELT 2.0
        </span>
      );
    }
    if (p.includes('newsdata')) {
      return (
        <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
          NewsData.io
        </span>
      );
    }
    return (
      <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700">
        Aggregated Feed
      </span>
    );
  };

  return (
    <div className="bg-card/70 border border-border/70 rounded-2xl p-6 backdrop-blur-sm space-y-4">
      {/* Title */}
      <div className="flex items-center justify-between border-b border-border/40 pb-3">
        <div className="flex items-center gap-2">
          <Newspaper className="w-5 h-5 text-emerald-400" />
          <h3 className="text-base font-bold text-foreground tracking-tight">
            Relevant News & Coverage
          </h3>
          <span className="text-xs text-muted">for {symbol}</span>
        </div>

        <button
          type="button"
          onClick={handleManualRefresh}
          disabled={loading}
          className="p-1.5 text-muted hover:text-foreground rounded-md hover:bg-zinc-800 transition disabled:opacity-50"
          aria-label="Refresh company news"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-zinc-900/40 border border-border/40 rounded-xl animate-pulse p-3" />
          ))}
        </div>
      )}

      {error && !loading && (
        <div className="p-4 rounded-xl bg-zinc-900/40 border border-border/30 text-xs text-muted flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{error}. Displaying verified empty state.</span>
        </div>
      )}

      {!loading && !error && articles.length === 0 && (
        <div className="p-6 text-center text-xs text-muted bg-zinc-900/30 rounded-xl border border-border/20">
          No recent stories found for <strong className="text-foreground">{symbol}</strong> across connected feeds (Marketaux, GDELT 2.0, NewsData.io).
        </div>
      )}

      {!loading && articles.length > 0 && (
        <div className="space-y-3">
          {articles.slice(0, 5).map((article) => (
            <a
              key={article.article_id}
              href={article.link}
              target="_blank"
              rel="noopener noreferrer"
              className="p-3.5 rounded-xl bg-zinc-900/50 hover:bg-zinc-850 border border-border/50 hover:border-zinc-700 transition block group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <h4 className="text-sm font-semibold text-foreground group-hover:text-emerald-400 transition leading-snug line-clamp-2">
                    {article.title}
                  </h4>
                  {article.description && (
                    <p className="text-xs text-muted line-clamp-2 leading-relaxed">
                      {article.description}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-zinc-500">
                    <span className="font-medium text-zinc-300">{article.source_name}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatArticleTime(article.pubDate)}
                    </span>
                    <span>•</span>
                    {getProviderBadge(article.source_provider)}
                  </div>
                </div>

                <ExternalLink className="w-4 h-4 text-muted group-hover:text-emerald-400 shrink-0 mt-0.5 transition" />
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
