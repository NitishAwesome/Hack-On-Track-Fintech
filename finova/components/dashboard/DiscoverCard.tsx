'use client';

import React from 'react';
import { DiscoverInsightItem } from '@/types/dashboard';
import { InsightCard } from './InsightCard';
import { SectionHeader } from '@/components/shared/SectionHeader';
import { cn } from '@/lib/utils';

interface DiscoverCardProps {
  insights: DiscoverInsightItem[];
  className?: string;
}

export function DiscoverCard({ insights, className }: DiscoverCardProps) {
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
        title="Discover"
        subtitle="AI insights & alternative asset discovery"
        actionText="See all"
        actionHref="/analysis"
      />

      {/* Stacked Insight Items */}
      <div className="space-y-3.5 mt-2 flex-1 flex flex-col justify-between">
        {insights.map((insight) => (
          <InsightCard key={insight.id} insight={insight} />
        ))}
      </div>
    </div>
  );
}
