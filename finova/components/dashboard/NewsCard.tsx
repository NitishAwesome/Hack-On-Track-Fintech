'use client';

// ============================================================
// FINOVA — Dashboard News Preview Component (Prompt 12)
// components/dashboard/NewsCard.tsx
//
// Displays 2-3 verified headlines relevant to user's holdings
// with direct link to full News & Market Intelligence (/news)
// ============================================================

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { SectionHeader } from '@/components/shared/SectionHeader';
import { ArrowUpRight, Newspaper, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PersonalizedNewsArticle } from '@/types/news';

interface NewsCardProps {
  className?: string;
}

export function NewsCard({ className }: NewsCardProps) {
  const [articles, setArticles] = useState<PersonalizedNewsArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function fetchTopNews() {
      try {
        const res = await fetch('/api/news');
        if (res.ok) {
          const data = await res.json();
          if (isMounted && Array.isArray(data.articles)) {
            setArticles(data.articles.slice(0, 3));
          }
        }
      } catch {
        // Silent catch for preview card
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchTopNews();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div
      className={cn(
        'relative flex flex-col justify-between p-6 sm:p-7 rounded-2xl border transition-all duration-200',
        className
      )}
      style={{
        backgroundColor: 'rgb(var(--surface))',
        borderColor: 'rgb(var(--border))',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      {/* Header */}
      <SectionHeader
        title="Market & Portfolio News"
        subtitle="Verified financial developments relevant to your holdings"
        actionText="All news & analysis"
        actionHref="/news"
      />

      {/* News List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 mt-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="p-3.5 rounded-xl border animate-pulse space-y-2"
              style={{
                backgroundColor: 'rgb(var(--surface-raised))',
                borderColor: 'rgb(var(--border))',
              }}
            >
              <div className="h-4 bg-muted/20 rounded w-3/4" />
              <div className="h-3 bg-muted/10 rounded w-1/2" />
            </div>
          ))
        ) : articles.length > 0 ? (
          articles.map((item) => (
            <div
              key={item.article_id}
              className="p-3.5 rounded-xl border transition-all duration-150 hover:-translate-y-0.5 group flex flex-col justify-between"
              style={{
                backgroundColor: 'rgb(var(--surface-raised))',
                borderColor: 'rgb(var(--border))',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = 'rgb(var(--brand-500) / 0.4)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = 'rgb(var(--border))';
              }}
            >
              <div className="space-y-1.5">
                {/* Associated Holding Tag or Relevance Pill */}
                <div className="flex items-center justify-between text-[11px]">
                  {item.matched_holding ? (
                    <span
                      className="px-2 py-0.5 rounded font-bold flex items-center gap-1"
                      style={{
                        backgroundColor: 'rgb(var(--brand-500) / 0.1)',
                        color: 'rgb(var(--brand-500))',
                      }}
                    >
                      <Building2 className="w-3 h-3" />
                      {item.matched_holding.symbol}
                    </span>
                  ) : item.matched_sector ? (
                    <span
                      className="px-2 py-0.5 rounded font-semibold"
                      style={{
                        backgroundColor: 'rgb(var(--info-bg) / 0.3)',
                        color: 'rgb(var(--info))',
                      }}
                    >
                      {item.matched_sector}
                    </span>
                  ) : (
                    <span
                      className="px-2 py-0.5 rounded font-semibold"
                      style={{
                        backgroundColor: 'rgb(var(--surface))',
                        color: 'rgb(var(--muted))',
                      }}
                    >
                      Indian Markets
                    </span>
                  )}

                  <span style={{ color: 'rgb(var(--muted))' }}>
                    {new Date(item.pubDate).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                </div>

                {/* Headline */}
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs sm:text-sm font-semibold tracking-tight leading-snug group-hover:text-brand transition-colors line-clamp-2 block"
                  style={{ color: 'rgb(var(--foreground))' }}
                >
                  {item.title}
                </a>
              </div>

              {/* Source & Read action */}
              <div className="flex items-center justify-between mt-3 pt-2 border-t text-[11px]" style={{ borderColor: 'rgb(var(--border) / 0.5)', color: 'rgb(var(--muted))' }}>
                <span className="truncate max-w-[150px]">{item.source_name}</span>
                <Link
                  href={`/news?symbol=${item.matched_holding?.symbol || ''}`}
                  className="flex items-center gap-1 text-brand font-semibold hover:underline"
                >
                  <span>Analyze</span>
                  <ArrowUpRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          ))
        ) : (
          <div
            className="col-span-full p-4 rounded-xl border text-center flex flex-col items-center gap-2"
            style={{
              backgroundColor: 'rgb(var(--surface-raised))',
              borderColor: 'rgb(var(--border))',
            }}
          >
            <Newspaper className="w-5 h-5 text-muted" />
            <p className="text-xs" style={{ color: 'rgb(var(--muted))' }}>
              Real Indian market news will appear here once live feeds are fetched.
            </p>
            <Link
              href="/news"
              className="text-xs text-brand font-semibold hover:underline"
            >
              Open News & Market Intelligence
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
