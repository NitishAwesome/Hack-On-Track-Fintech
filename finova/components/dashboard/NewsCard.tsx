'use client';

import React from 'react';
import { NewsItem } from '@/types/dashboard';
import { SectionHeader } from '@/components/shared/SectionHeader';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NewsCardProps {
  newsItems: NewsItem[];
  className?: string;
}

export function NewsCard({ newsItems, className }: NewsCardProps) {
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
        subtitle="Curated coverage relevant to your holdings"
        actionText="All news"
        actionHref="/news"
      />

      {/* News List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 mt-3">
        {newsItems.map((item) => {
          const sentimentBadge =
            item.sentiment === 'positive'
              ? { text: 'Positive', color: 'rgb(var(--gain))', bg: 'rgb(var(--gain) / 0.1)' }
              : item.sentiment === 'negative'
              ? { text: 'Caution', color: 'rgb(var(--loss))', bg: 'rgb(var(--loss) / 0.1)' }
              : { text: 'Neutral', color: 'rgb(var(--muted))', bg: 'rgb(var(--surface-raised))' };

          return (
            <div
              key={item.id}
              className="p-3.5 rounded-xl border transition-all duration-150 hover:-translate-y-0.5 group cursor-pointer"
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
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1.5 flex-1 min-w-0">
                  {/* Headline */}
                  <h4
                    className="text-xs sm:text-sm font-semibold tracking-tight leading-snug group-hover:text-brand transition-colors line-clamp-2"
                    style={{ color: 'rgb(var(--foreground))' }}
                  >
                    {item.headline}
                  </h4>

                  {/* Metadata & Tag */}
                  <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[11px]">
                    <span style={{ color: 'rgb(var(--muted))' }}>
                      {item.source} · {item.publishedTimeAgo}
                    </span>

                    <span className="opacity-30">·</span>

                    <span
                      className="px-2 py-0.5 rounded font-medium"
                      style={{
                        backgroundColor: 'rgb(var(--brand-500) / 0.1)',
                        color: 'rgb(var(--brand-500))',
                      }}
                    >
                      {item.relatedAsset}
                    </span>

                    <span
                      className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider"
                      style={{
                        backgroundColor: sentimentBadge.bg,
                        color: sentimentBadge.color,
                      }}
                    >
                      {sentimentBadge.text}
                    </span>
                  </div>
                </div>

                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:translate-x-0.5"
                  style={{
                    backgroundColor: 'rgb(var(--surface))',
                    color: 'rgb(var(--muted))',
                    border: '1px solid rgb(var(--border))',
                  }}
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
