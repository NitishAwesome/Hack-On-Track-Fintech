'use client';

import React from 'react';
import { Wallet, Landmark, TrendingUp, TrendingDown, Percent, Layers, Building2, HelpCircle } from 'lucide-react';
import type { PortfolioSummary } from '@/types/portfolio';
import { formatCurrency, formatPercentSafe } from '@/lib/utils';

interface PortfolioSummaryMetricsProps {
  summary: PortfolioSummary | null;
  isLoading?: boolean;
}

export function PortfolioSummaryMetrics({ summary, isLoading }: PortfolioSummaryMetricsProps) {
  if (isLoading || !summary) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="p-4 sm:p-5 rounded-2xl border animate-pulse bg-surface"
            style={{
              borderColor: 'rgb(var(--border))',
            }}
          >
            <div className="h-3 w-16 bg-muted/20 rounded mb-3" />
            <div className="h-6 w-24 bg-muted/30 rounded mb-2" />
            <div className="h-2.5 w-20 bg-muted/20 rounded" />
          </div>
        ))}
      </div>
    );
  }

  const isComplete = Boolean(summary.is_valuation_complete);
  const displayValuation = isComplete
    ? summary.total_current_value
    : summary.priced_current_value ?? null;
  const isValueUnavailable = displayValuation === null;
  const isReturnUnavailable = summary.total_absolute_return === null;
  const isPositiveReturn = (summary.total_absolute_return ?? 0) >= 0;
  const returnPct = summary.total_absolute_return_pct ?? 0;
  const hasUnquoted = Boolean(summary.has_unquoted_assets);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-4">
      {/* 1. Current Value */}
      <div
        className="p-4 sm:p-5 rounded-2xl border flex flex-col justify-between transition-all duration-200 bg-surface relative overflow-hidden group hover:border-emerald-500/40 shadow-xs"
        style={{ borderColor: 'rgb(var(--border))' }}
      >
        {/* Glow Accent Curve */}
        <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl pointer-events-none group-hover:bg-emerald-500/20 transition-all" />

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
              {isComplete ? 'Current Value' : 'Valued Subtotal'}
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
              <Wallet className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="text-lg sm:text-xl font-extrabold tracking-tight text-foreground tabular-nums">
            {isValueUnavailable ? 'Unavailable' : formatCurrency(displayValuation!)}
          </div>
        </div>

        <div className="mt-3 flex items-center gap-1.5 text-[11px]">
          {isPositiveReturn ? (
            <span className="font-semibold text-gain flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" />
              <span>+{returnPct.toFixed(1)}%</span>
            </span>
          ) : (
            <span className="font-semibold text-loss flex items-center gap-0.5">
              <TrendingDown className="w-3 h-3" />
              <span>{returnPct.toFixed(1)}%</span>
            </span>
          )}
          <span className="text-muted text-[10px]">vs invested</span>
        </div>
      </div>

      {/* 2. Total Invested */}
      <div
        className="p-4 sm:p-5 rounded-2xl border flex flex-col justify-between transition-all duration-200 bg-surface relative overflow-hidden group hover:border-blue-500/40 shadow-xs"
        style={{ borderColor: 'rgb(var(--border))' }}
      >
        <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-blue-500/10 rounded-full blur-xl pointer-events-none group-hover:bg-blue-500/20 transition-all" />

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
              Total Invested
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20">
              <Landmark className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="text-lg sm:text-xl font-extrabold tracking-tight text-foreground tabular-nums">
            {formatCurrency(summary.total_invested_value)}
          </div>
        </div>

        <div className="mt-3 text-[11px] text-muted font-medium">
          <span>Capital deployed</span>
        </div>
      </div>

      {/* 3. Absolute P&L */}
      <div
        className="p-4 sm:p-5 rounded-2xl border flex flex-col justify-between transition-all duration-200 bg-surface relative overflow-hidden group hover:border-rose-500/40 shadow-xs"
        style={{ borderColor: 'rgb(var(--border))' }}
      >
        <div
          className={`absolute -bottom-6 -left-6 w-24 h-24 rounded-full blur-xl pointer-events-none transition-all ${
            isPositiveReturn ? 'bg-emerald-500/10 group-hover:bg-emerald-500/20' : 'bg-rose-500/10 group-hover:bg-rose-500/20'
          }`}
        />

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
              Absolute P&L
            </span>
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
                isPositiveReturn
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
              }`}
            >
              {isPositiveReturn ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            </div>
          </div>

          <div
            className={`text-lg sm:text-xl font-extrabold tracking-tight tabular-nums ${
              isReturnUnavailable ? 'text-muted' : isPositiveReturn ? 'text-gain' : 'text-loss'
            }`}
          >
            {isReturnUnavailable
              ? 'Unavailable'
              : `${isPositiveReturn ? '+' : ''}${formatCurrency(summary.total_absolute_return!)}`}
          </div>
        </div>

        <div className="mt-3 text-[11px] text-muted">
          <span>Unrealized returns</span>
        </div>
      </div>

      {/* 4. Total Return % */}
      <div
        className="p-4 sm:p-5 rounded-2xl border flex flex-col justify-between transition-all duration-200 bg-surface relative overflow-hidden group hover:border-cyan-500/40 shadow-xs"
        style={{ borderColor: 'rgb(var(--border))' }}
      >
        <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-cyan-500/10 rounded-full blur-xl pointer-events-none group-hover:bg-cyan-500/20 transition-all" />

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
              Total Return
            </span>
            <div className="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0 border border-cyan-500/20">
              <Percent className="w-3.5 h-3.5" />
            </div>
          </div>

          <div
            className={`text-lg sm:text-xl font-extrabold tracking-tight tabular-nums ${
              isReturnUnavailable ? 'text-muted' : isPositiveReturn ? 'text-gain' : 'text-loss'
            }`}
          >
            {isReturnUnavailable ? 'Unavailable' : formatPercentSafe(summary.total_absolute_return_pct)}
          </div>
        </div>

        <div className="mt-3 text-[11px] text-muted">
          <span>Net gain on cost</span>
        </div>
      </div>

      {/* 5. Holdings Count */}
      <div
        className="p-4 sm:p-5 rounded-2xl border flex flex-col justify-between transition-all duration-200 bg-surface relative overflow-hidden group hover:border-purple-500/40 shadow-xs"
        style={{ borderColor: 'rgb(var(--border))' }}
      >
        <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-purple-500/10 rounded-full blur-xl pointer-events-none group-hover:bg-purple-500/20 transition-all" />

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
              Holdings
            </span>
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/20">
              <Layers className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="text-lg sm:text-xl font-extrabold tracking-tight text-foreground tabular-nums">
            {summary.holding_count}
          </div>
        </div>

        <div className="mt-3 text-[11px] text-muted">
          <span>Across stocks, REITs & more</span>
        </div>
      </div>

      {/* 6. Broker Accounts */}
      <div
        className="p-4 sm:p-5 rounded-2xl border flex flex-col justify-between transition-all duration-200 bg-surface relative overflow-hidden group hover:border-sky-500/40 shadow-xs"
        style={{ borderColor: 'rgb(var(--border))' }}
      >
        <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-sky-500/10 rounded-full blur-xl pointer-events-none group-hover:bg-sky-500/20 transition-all" />

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
              Broker Accounts
            </span>
            <div className="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center shrink-0 border border-sky-500/20">
              <Building2 className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="text-lg sm:text-xl font-extrabold tracking-tight text-foreground tabular-nums">
            {summary.broker_count}
          </div>
        </div>

        <div className="mt-3 text-[11px] text-muted">
          <span>Tracked demat accounts</span>
        </div>
      </div>
    </div>
  );
}
