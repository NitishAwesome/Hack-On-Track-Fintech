'use client';

import React from 'react';
import Link from 'next/link';
import { DiscoverInsightItem } from '@/types/dashboard';
import { ArrowRight, Sparkles, Building2, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InsightCardProps {
  insight: DiscoverInsightItem;
  className?: string;
}

export function InsightCard({ insight, className }: InsightCardProps) {
  // Select subtle icon based on tag or category
  const Icon =
    insight.tag.includes('AI') || insight.tag.includes('ANALYSIS')
      ? Sparkles
      : insight.tag.includes('STOCKS') || insight.tag.includes('BEYOND')
      ? Building2
      : ShieldCheck;

  return (
    <Link
      href={insight.actionHref}
      className={cn(
        'group relative block p-4 rounded-xl border transition-all duration-200 hover:-translate-y-0.5',
        className
      )}
      style={{
        backgroundColor: 'rgb(var(--surface-raised))',
        borderColor: 'rgb(var(--border))',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = 'rgb(var(--brand-500) / 0.4)';
        (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px -2px rgba(0, 0, 0, 0.15)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = 'rgb(var(--border))';
        (e.currentTarget as HTMLElement).style.boxShadow = 'none';
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5 flex-1 min-w-0">
          {/* Small Category / Metadata Tag */}
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
              style={{
                backgroundColor: 'rgb(var(--brand-500) / 0.12)',
                color: 'rgb(var(--brand-500))',
                border: '1px solid rgb(var(--brand-500) / 0.2)',
              }}
            >
              <Icon className="w-3 h-3 flex-shrink-0" />
              <span>{insight.tag}</span>
            </span>
            {insight.metadata && (
              <span className="text-[10px]" style={{ color: 'rgb(var(--muted))' }}>
                {insight.metadata}
              </span>
            )}
          </div>

          {/* Title */}
          <h3
            className="text-sm font-semibold tracking-tight leading-snug group-hover:text-brand transition-colors"
            style={{ color: 'rgb(var(--foreground))' }}
          >
            {insight.title}
          </h3>

          {/* Description */}
          <p
            className="text-xs leading-relaxed line-clamp-2"
            style={{ color: 'rgb(var(--muted))' }}
          >
            {insight.description}
          </p>
        </div>

        {/* Action Icon */}
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:translate-x-0.5"
          style={{
            backgroundColor: 'rgb(var(--surface))',
            color: 'rgb(var(--brand-500))',
            border: '1px solid rgb(var(--border))',
          }}
        >
          <ArrowRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </Link>
  );
}
