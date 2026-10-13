'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Newspaper, ExternalLink, ArrowRight, TrendingUp, TrendingDown, Clock } from 'lucide-react';
import type { PersonalizedNewsArticle } from '@/types/news';

export function MarketHighlightsCard() {
  const [articles, setArticles] = useState<PersonalizedNewsArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadNews() {
      try {
        const res = await fetch('/api/news');
        if (!res.ok) return;
        const data = await res.json();
        if (isMounted && data.articles) {
          setArticles(data.articles.slice(0, 3));
        }
      } catch {
        // graceful empty state
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadNews();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div
      className="h-full p-5 sm:p-6 rounded-2xl border flex flex-col transition-all duration-200 bg-surface shadow-xs"
      style={{
        borderColor: 'rgb(var(--border))',
      }}
    >
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 shrink-0">
          <div className="flex items-center gap-2">
            <Newspaper className="w-4 h-4 text-brand" />
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
              Market Highlights
            </h2>
          </div>
          <Link
            href="/news"
            className="text-xs font-semibold text-brand hover:underline flex items-center gap-1 group"
          >
            <span>View All</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* Stories List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-3 rounded-xl border border-border/60 bg-surface-raised/40 animate-pulse space-y-1.5">
                <div className="h-3 w-3/4 bg-muted/20 rounded" />
                <div className="h-2 w-1/2 bg-muted/20 rounded" />
              </div>
            ))}
          </div>
        ) : articles.length === 0 ? (
          <div className="flex-1 flex items-center justify-center py-8">
            <p className="text-center text-xs text-muted">
              No live news items currently available.
            </p>
          </div>
        ) : (
          <div className="flex-1 space-y-2">
            {articles.map((item, idx) => {
              const iconColors = [
                { bg: 'bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-400', Icon: TrendingUp },
                { bg: 'bg-brand/10', text: 'text-brand', Icon: TrendingDown },
                { bg: 'bg-amber-500/10', text: 'text-amber-700 dark:text-amber-400', Icon: TrendingUp },
              ];
              const { bg, text, Icon: ItemIcon } = iconColors[idx % iconColors.length];
              return (
                <a
                  key={item.article_id}
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`p-3 rounded-xl border border-border/60 bg-surface-raised/30 block group news-card-hover`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className={`w-6 h-6 rounded-md ${bg} ${text} shrink-0 flex items-center justify-center mt-0.5`}>
                      <ItemIcon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p className="text-xs font-semibold text-foreground group-hover:text-brand transition-colors line-clamp-2 leading-snug">
                        {item.title}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-muted">
                        <span className="font-medium text-foreground/70 truncate max-w-[100px]">{item.source_name}</span>
                        <span>·</span>
                        <span className="flex items-center gap-0.5 shrink-0">
                          <Clock className="w-2.5 h-2.5" />
                          {item.pubDate ? new Date(item.pubDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                        </span>
                      </div>
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
