'use client';

import React from 'react';
import { ArrowUpRight, ArrowDownRight, Wallet, TrendingUp, Layers, Building2, HelpCircle } from 'lucide-react';
import type { PortfolioSummary } from '@/types/portfolio';
import { formatCurrency, formatCurrencySafe, formatPercentSafe } from '@/lib/utils';

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
            className="p-4 sm:p-5 rounded-2xl border animate-pulse"
            style={{
              backgroundColor: 'rgb(var(--surface))',
              borderColor: 'rgb(var(--border))',
            }}
          >
            <div className="h-3 w-16 bg-slate-700/30 rounded mb-3" />
            <div className="h-6 w-24 bg-slate-700/40 rounded mb-2" />
            <div className="h-2.5 w-20 bg-slate-700/20 rounded" />
          </div>
        ))}
      </div>
    );
  }

  const isValueUnavailable = summary.total_current_value === null;
  const isReturnUnavailable = summary.total_absolute_return === null;
  const isPositiveReturn = (summary.total_absolute_return ?? 0) >= 0;
  const hasUnquoted = Boolean(summary.has_unquoted_assets);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-4">
      {/* 1. Total Portfolio Value */}
      <div
        className="p-4 sm:p-5 rounded-2xl border flex flex-col justify-between transition-all duration-200"
        style={{
          backgroundColor: 'rgb(var(--surface))',
          borderColor: 'rgb(var(--border))',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
              Current Value
            </span>
            <Wallet className="w-3.5 h-3.5 text-muted opacity-70" />
          </div>
          <div
            className="text-lg sm:text-xl font-bold tracking-tight"
            style={{ color: 'rgb(var(--foreground))', fontVariantNumeric: 'tabular-nums' }}
          >
            {isValueUnavailable
              ? 'Valuation unavailable'
              : formatCurrency(summary.total_current_value!)}
          </div>
        </div>
        <div className="mt-2.5">
          {hasUnquoted ? (
            <span
              className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded"
              style={{
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                color: '#F59E0B',
              }}
              title="Some assets lack verified real-time quotes"
            >
              <HelpCircle className="w-2.5 h-2.5" />
              <span>Partial pricing</span>
            </span>
          ) : (
            <span className="text-[11px] text-muted">
              {summary.holding_count > 0 ? 'Verified market valuation' : 'No active holdings'}
            </span>
          )}
        </div>
      </div>

      {/* 2. Total Invested */}
      <div
        className="p-4 sm:p-5 rounded-2xl border flex flex-col justify-between transition-all duration-200"
        style={{
          backgroundColor: 'rgb(var(--surface))',
          borderColor: 'rgb(var(--border))',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
              Total Invested
            </span>
            <TrendingUp className="w-3.5 h-3.5 text-muted opacity-70" />
          </div>
          <div
            className="text-lg sm:text-xl font-bold tracking-tight"
            style={{ color: 'rgb(var(--foreground))', fontVariantNumeric: 'tabular-nums' }}
          >
            {formatCurrency(summary.total_invested_value)}
          </div>
        </div>
        <div className="mt-2.5 text-[11px] text-muted">
          <span>Capital invested across accounts</span>
        </div>
      </div>

      {/* 3. Absolute P&L */}
      <div
        className="p-4 sm:p-5 rounded-2xl border flex flex-col justify-between transition-all duration-200"
        style={{
          backgroundColor: 'rgb(var(--surface))',
          borderColor: 'rgb(var(--border))',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
              Absolute P&L
            </span>
            {isReturnUnavailable ? null : isPositiveReturn ? (
              <ArrowUpRight className="w-3.5 h-3.5 text-gain" />
            ) : (
              <ArrowDownRight className="w-3.5 h-3.5 text-loss" />
            )}
          </div>
          <div
            className="text-lg sm:text-xl font-bold tracking-tight"
            style={{
              color: isReturnUnavailable
                ? 'rgb(var(--muted))'
                : isPositiveReturn
                ? 'rgb(var(--gain))'
                : 'rgb(var(--loss))',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {isReturnUnavailable
              ? 'P&L unavailable'
              : `${isPositiveReturn ? '+' : ''}${formatCurrency(summary.total_absolute_return!)}`}
          </div>
        </div>
        <div className="mt-2.5 text-[11px] text-muted">
          <span>Unrealized total returns</span>
        </div>
      </div>

      {/* 4. Percentage Return */}
      <div
        className="p-4 sm:p-5 rounded-2xl border flex flex-col justify-between transition-all duration-200"
        style={{
          backgroundColor: 'rgb(var(--surface))',
          borderColor: 'rgb(var(--border))',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
              Total Return %
            </span>
            {isReturnUnavailable ? null : isPositiveReturn ? (
              <ArrowUpRight className="w-3.5 h-3.5 text-gain" />
            ) : (
              <ArrowDownRight className="w-3.5 h-3.5 text-loss" />
            )}
          </div>
          <div
            className="text-lg sm:text-xl font-bold tracking-tight"
            style={{
              color: isReturnUnavailable
                ? 'rgb(var(--muted))'
                : isPositiveReturn
                ? 'rgb(var(--gain))'
                : 'rgb(var(--loss))',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {isReturnUnavailable
              ? 'P&L unavailable'
              : formatPercentSafe(summary.total_absolute_return_pct)}
          </div>
        </div>
        <div className="mt-2.5 text-[11px] text-muted">
          <span>Net percentage gain on cost</span>
        </div>
      </div>

      {/* 5. Holdings Count */}
      <div
        className="p-4 sm:p-5 rounded-2xl border flex flex-col justify-between transition-all duration-200"
        style={{
          backgroundColor: 'rgb(var(--surface))',
          borderColor: 'rgb(var(--border))',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
              Holdings
            </span>
            <Layers className="w-3.5 h-3.5 text-muted opacity-70" />
          </div>
          <div
            className="text-lg sm:text-xl font-bold tracking-tight"
            style={{ color: 'rgb(var(--foreground))', fontVariantNumeric: 'tabular-nums' }}
          >
            {summary.holding_count}
          </div>
        </div>
        <div className="mt-2.5 text-[11px] text-muted">
          <span>
            {summary.priced_count ?? summary.holding_count} quoted
            {summary.unquoted_count ? ` · ${summary.unquoted_count} unquoted` : ''}
          </span>
        </div>
      </div>

      {/* 6. Linked Brokers */}
      <div
        className="p-4 sm:p-5 rounded-2xl border flex flex-col justify-between transition-all duration-200"
        style={{
          backgroundColor: 'rgb(var(--surface))',
          borderColor: 'rgb(var(--border))',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
              Broker Accounts
            </span>
            <Building2 className="w-3.5 h-3.5 text-muted opacity-70" />
          </div>
          <div
            className="text-lg sm:text-xl font-bold tracking-tight"
            style={{ color: 'rgb(var(--foreground))', fontVariantNumeric: 'tabular-nums' }}
          >
            {summary.broker_count}
          </div>
        </div>
        <div className="mt-2.5 text-[11px] text-muted">
          <span>Manual tracking accounts</span>
        </div>
      </div>
    </div>
  );
}
