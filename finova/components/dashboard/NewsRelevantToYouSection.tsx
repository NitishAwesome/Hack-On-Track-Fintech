'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Newspaper, ArrowRight, Clock, ExternalLink, TrendingUp, Sparkles } from 'lucide-react';
import type { PersonalizedNewsArticle } from '@/types/news';

export function NewsRelevantToYouSection() {
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
        // graceful empty fallback
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
      className="p-5 sm:p-6 rounded-2xl border transition-all duration-200 bg-surface shadow-xs"
      style={{ borderColor: 'rgb(var(--border))' }}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Newspaper className="w-4 h-4 text-brand" />
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
              News Relevant to You
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
              Verified Providers
            </span>
          </div>
          <p className="text-xs text-muted mt-0.5">
            Real financial updates and market disclosures curated for your portfolio instruments.
          </p>
        </div>

        <Link
          href="/news"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-border bg-surface-raised hover:bg-surface text-foreground transition-all shadow-xs self-start sm:self-auto group"
        >
          <span>View All Market News</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {/* Content Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-border/60 bg-surface-raised/40 p-4 space-y-3 animate-pulse"
            >
              <div className="h-32 bg-muted/20 rounded-xl" />
              <div className="h-4 w-3/4 bg-muted/20 rounded" />
              <div className="h-3 w-1/2 bg-muted/20 rounded" />
            </div>
          ))}
        </div>
      ) : articles.length === 0 ? (
        <div className="py-12 text-center text-xs text-muted flex flex-col items-center justify-center space-y-2">
          <Newspaper className="w-8 h-8 opacity-40 text-muted" />
          <p className="font-semibold text-foreground">No personalized news currently available</p>
          <p className="text-[11px] text-muted max-w-sm">
            Live market updates will appear here automatically when news feeds publish.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {articles.map((item) => {
            const hasImage = Boolean(item.image_url && item.image_url.startsWith('http'));
            const relatedTag = item.matched_holding?.symbol || item.symbols?.[0] || item.keywords?.[0] || 'Market';
            const timeStr = item.pubDate
              ? new Date(item.pubDate).toLocaleDateString('en-IN', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'Recent';

            return (
              <a
                key={item.article_id}
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-2xl border border-border/70 hover:border-brand/40 bg-surface-raised/30 hover:bg-surface-raised transition-all duration-200 overflow-hidden flex flex-col justify-between group shadow-xs news-card-hover"
              >
                {/* Media Container */}
                <div className="relative h-36 w-full overflow-hidden bg-surface-raised border-b border-border/50">
                  {hasImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.image_url!}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        // Fallback to branded placeholder if remote image link is broken
                        e.currentTarget.style.display = 'none';
                        const fallback = e.currentTarget.nextElementSibling;
                        if (fallback) (fallback as HTMLElement).style.display = 'flex';
                      }}
                    />
                  ) : null}

                  {/* Polished Branded Placeholder */}
                  <div
                    className={`w-full h-full flex flex-col items-center justify-center p-4 text-center relative overflow-hidden ${
                      hasImage ? 'hidden' : 'flex'
                    }`}
                    style={{
                      background:
                        'linear-gradient(135deg, rgb(var(--surface-raised)) 0%, rgb(var(--surface)) 100%)',
                    }}
                  >
                    <div className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand mb-1.5 shadow-xs">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
                      FINOVA Intelligence Feed
                    </span>
                  </div>

                  {/* Stock Tag Pill */}
                  <div className="absolute top-2.5 left-2.5">
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-extrabold bg-surface/90 text-foreground border border-border/80 shadow-xs backdrop-blur-sm">
                      {relatedTag}
                    </span>
                  </div>
                </div>

                {/* Article Body */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
                  <div className="space-y-1">
                    <h3 className="text-xs sm:text-sm font-bold text-foreground group-hover:text-brand transition-colors line-clamp-2 leading-snug">
                      {item.title}
                    </h3>
                    {item.description && (
                      <p className="text-[11px] text-muted line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    )}
                  </div>

                  {/* Source Metadata Footer */}
                  <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[10px] text-muted">
                    <span className="font-semibold text-foreground/80 truncate max-w-[120px]">
                      {item.source_name}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <Clock className="w-3 h-3 text-muted" />
                      <span>{timeStr}</span>
                      <ExternalLink className="w-2.5 h-2.5 ml-0.5 opacity-60 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
