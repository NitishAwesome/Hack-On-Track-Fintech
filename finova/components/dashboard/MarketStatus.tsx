'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Clock } from 'lucide-react';

interface MarketStatusProps {
  isOpen?: boolean;
  statusText?: string;
  indexSummary?: string;
  change?: string;
  trend?: 'up' | 'down' | 'flat';
  className?: string;
}

export function MarketStatus({
  isOpen = true,
  statusText = 'Markets Open',
  indexSummary = 'Nifty 24,180',
  change = '+0.59%',
  trend = 'up',
  className,
}: MarketStatusProps) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Clock;
  const statusColor = isOpen ? 'rgb(var(--gain))' : 'rgb(var(--muted))';

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors select-none',
        className
      )}
      style={{
        backgroundColor: 'rgb(var(--surface-raised))',
        borderColor: 'rgb(var(--border))',
      }}
    >
      <span className="relative flex h-2 w-2">
        {isOpen && (
          <span
            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
            style={{ backgroundColor: statusColor }}
          />
        )}
        <span
          className="relative inline-flex rounded-full h-2 w-2"
          style={{ backgroundColor: statusColor }}
        />
      </span>

      <span className="font-medium" style={{ color: 'rgb(var(--foreground))' }}>
        {statusText}
      </span>

      {indexSummary && (
        <>
          <span className="text-muted opacity-40">·</span>
          <span style={{ color: 'rgb(var(--muted))' }}>{indexSummary}</span>
        </>
      )}

      {change && (
        <span
          className="font-semibold flex items-center gap-0.5"
          style={{ color: isOpen ? 'rgb(var(--gain))' : 'rgb(var(--muted))' }}
        >
          <TrendIcon className="w-3 h-3" />
          {change}
        </span>
      )}
    </div>
  );
}
