'use client';

import React from 'react';
import { Info } from 'lucide-react';

interface PriceRangeBarProps {
  currentPrice: number | null;
  currency?: string;
  dayLow?: number | null;
  dayHigh?: number | null;
  fiftyTwoWeekLow?: number | null;
  fiftyTwoWeekHigh?: number | null;
}

export function PriceRangeBar({
  currentPrice,
  currency = 'INR',
  dayLow,
  dayHigh,
  fiftyTwoWeekLow,
  fiftyTwoWeekHigh,
}: PriceRangeBarProps) {
  const currencySymbol = currency === 'POINTS' ? '' : currency === 'USD' ? '$' : '₹';

  const calculatePosition = (low?: number | null, high?: number | null, current?: number | null) => {
    if (typeof low !== 'number' || typeof high !== 'number' || typeof current !== 'number' || !Number.isFinite(low) || !Number.isFinite(high) || !Number.isFinite(current) || high < low) {
      return null;
    }
    if (high === low) {
      return 50; // Neutral midpoint
    }
    const pct = ((current - low) / (high - low)) * 100;
    return Math.max(0, Math.min(100, Number(pct.toFixed(1))));
  };

  const dayPosition = calculatePosition(dayLow, dayHigh, currentPrice);
  const yearPosition = calculatePosition(fiftyTwoWeekLow, fiftyTwoWeekHigh, currentPrice);

  const formatPrice = (val?: number | null) => {
    if (typeof val !== 'number' || !Number.isFinite(val)) return '—';
    return `${currencySymbol}${val.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <div className="bg-card/70 border border-border/70 rounded-2xl p-5 backdrop-blur-sm space-y-5">
      <div className="flex items-center justify-between border-b border-border/40 pb-3">
        <h4 className="text-sm font-bold text-foreground tracking-tight">Price Performance Ranges</h4>
        <div className="flex items-center gap-1 text-[11px] text-muted">
          <Info className="w-3.5 h-3.5 text-muted dark:text-zinc-400" />
          <span>Intraday & 52-Week Boundaries</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Day Range Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-muted">Latest Session Range</span>
            {dayPosition !== null && (
              <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                {dayPosition}% of daily range
              </span>
            )}
          </div>

          {/* Visual Track */}
          <div className="relative pt-2 pb-1">
            <div className="h-2 w-full bg-surface-raised dark:bg-zinc-800 rounded-full overflow-hidden relative">
              <div
                className="h-full bg-gradient-to-r from-rose-500/60 via-amber-500/60 to-emerald-500/80 rounded-full"
                style={{ width: '100%' }}
              />
            </div>
            {dayPosition !== null && (
              <div
                className="absolute top-0 -ml-1.5 flex flex-col items-center transition-all duration-300"
                style={{ left: `${dayPosition}%` }}
              >
                <div className="w-3 h-3 bg-white rounded-full shadow-md ring-2 ring-emerald-500" />
                <span className="text-[9px] font-bold text-foreground dark:text-white mt-0.5">▲</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <div>
              <span className="text-[10px] text-muted block">Day Low</span>
              <span className="font-semibold text-foreground">{formatPrice(dayLow)}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-muted block">Day High</span>
              <span className="font-semibold text-foreground">{formatPrice(dayHigh)}</span>
            </div>
          </div>
        </div>

        {/* 52-Week Range Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-muted">52-Week Range</span>
            {yearPosition !== null && (
              <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                {yearPosition}% of annual range
              </span>
            )}
          </div>

          {/* Visual Track */}
          <div className="relative pt-2 pb-1">
            <div className="h-2 w-full bg-surface-raised dark:bg-zinc-800 rounded-full overflow-hidden relative">
              <div
                className="h-full bg-gradient-to-r from-rose-500/60 via-amber-500/60 to-emerald-500/80 rounded-full"
                style={{ width: '100%' }}
              />
            </div>
            {yearPosition !== null && (
              <div
                className="absolute top-0 -ml-1.5 flex flex-col items-center transition-all duration-300"
                style={{ left: `${yearPosition}%` }}
              >
                <div className="w-3 h-3 bg-white rounded-full shadow-md ring-2 ring-emerald-500" />
                <span className="text-[9px] font-bold text-foreground dark:text-white mt-0.5">▲</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <div>
              <span className="text-[10px] text-muted block">52W Low</span>
              <span className="font-semibold text-foreground">{formatPrice(fiftyTwoWeekLow)}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-muted block">52W High</span>
              <span className="font-semibold text-foreground">{formatPrice(fiftyTwoWeekHigh)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="text-[11px] text-muted bg-surface-raised p-2.5 rounded-xl border border-border">
        💡 <strong className="text-foreground">Educational Note:</strong> 52-week and daily ranges indicate historical price extremes over the respective period. Proximity to a 52-week low or high is purely a price statistic and does not represent an indicator of company valuation or investment suitability.
      </div>
    </div>
  );
}
