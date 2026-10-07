'use client';

import React from 'react';
import { MarketIndexItem } from '@/types/dashboard';
import { SectionHeader } from '@/components/shared/SectionHeader';
import { formatPercent } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MarketPulseProps {
  indices: MarketIndexItem[];
  className?: string;
}

export function MarketPulse({ indices, className }: MarketPulseProps) {
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
        title="Market Pulse"
        subtitle="Benchmark indices overview"
        actionElement={
          <div className="flex items-center gap-1.5 text-xs" style={{ color: 'rgb(var(--muted))' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Just now</span>
          </div>
        }
      />

      {/* Indices Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-3">
        {indices.map((index) => {
          const isPositive = index.changePercentage >= 0;
          const TrendIcon = isPositive ? TrendingUp : TrendingDown;

          return (
            <div
              key={index.id}
              className="p-3.5 rounded-xl border flex flex-col justify-between transition-colors hover:border-brand/40"
              style={{
                backgroundColor: 'rgb(var(--surface-raised))',
                borderColor: 'rgb(var(--border))',
              }}
            >
              <div className="flex items-center justify-between">
                <span
                  className="text-xs font-semibold"
                  style={{ color: 'rgb(var(--muted))' }}
                >
                  {index.name}
                </span>
                <span
                  className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                  style={{
                    backgroundColor: 'rgb(var(--surface))',
                    color: 'rgb(var(--muted))',
                    border: '1px solid rgb(var(--border))',
                  }}
                >
                  {index.state}
                </span>
              </div>

              <div className="mt-2">
                <div
                  className="text-lg font-bold tracking-tight tabular-nums"
                  style={{ color: 'rgb(var(--foreground))' }}
                >
                  {index.currentValue.toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>

                <div className="flex items-center gap-1.5 mt-1 text-xs font-semibold tabular-nums">
                  <span
                    className="flex items-center gap-0.5"
                    style={{
                      color: isPositive ? 'rgb(var(--gain))' : 'rgb(var(--loss))',
                    }}
                  >
                    <TrendIcon className="w-3.5 h-3.5" />
                    {isPositive ? '+' : ''}
                    {index.changeAmount.toFixed(2)} ({isPositive ? '+' : ''}
                    {formatPercent(index.changePercentage)})
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
