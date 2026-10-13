'use client';

import React, { useState } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { TrendingUp, Clock, AlertCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { PortfolioSnapshotRow } from '@/types/database';

interface PortfolioPerformanceSectionProps {
  snapshots: PortfolioSnapshotRow[];
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

type PerformanceRange = '1W' | '1M' | '3M' | '1Y' | 'All';

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; payload: { date: string; value: number; invested: number } }>;
}

function PerformanceTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;
  const current = payload[0].payload;

  return (
    <div
      className="px-3.5 py-2.5 rounded-xl border shadow-xl backdrop-blur-md text-xs space-y-1.5"
      style={{
        backgroundColor: 'rgb(var(--surface) / 0.96)',
        borderColor: 'rgb(var(--border))',
        color: 'rgb(var(--foreground))',
      }}
    >
      <p className="font-semibold text-muted">{current.date}</p>
      <div className="flex items-center justify-between gap-4">
        <span className="text-muted">Portfolio Value:</span>
        <span className="font-bold tabular-nums" style={{ color: '#0EA5E9' }}>
          {formatCurrency(current.value)}
        </span>
      </div>
      {current.invested > 0 && (
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted">Invested Capital:</span>
          <span className="font-medium tabular-nums text-muted">
            {formatCurrency(current.invested)}
          </span>
        </div>
      )}
    </div>
  );
}

export function PortfolioPerformanceSection({
  snapshots,
  isLoading,
  error,
  onRetry,
}: PortfolioPerformanceSectionProps) {
  const [selectedRange, setSelectedRange] = useState<PerformanceRange>('All');

  if (isLoading) {
    return (
      <div
        className="p-6 sm:p-7 rounded-2xl border flex flex-col justify-between h-[360px] animate-pulse"
        style={{
          backgroundColor: 'rgb(var(--surface))',
          borderColor: 'rgb(var(--border))',
        }}
      >
        <div className="flex justify-between items-center mb-6">
          <div className="h-4 w-36 bg-surface-raised/30 dark:bg-slate-700/30 rounded" />
          <div className="h-6 w-24 bg-surface-raised/20 dark:bg-slate-700/20 rounded" />
        </div>
        <div className="flex-1 bg-surface-raised/10 dark:bg-slate-800/10 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="p-6 sm:p-7 rounded-2xl border flex flex-col items-center justify-center text-center h-[360px]"
        style={{
          backgroundColor: 'rgb(var(--surface))',
          borderColor: 'rgb(var(--border))',
        }}
      >
        <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3 bg-red-500/10 text-red-500">
          <AlertCircle className="w-5 h-5" />
        </div>
        <h3 className="text-sm font-semibold mb-1" style={{ color: 'rgb(var(--foreground))' }}>
          Unable to Load Valuation History
        </h3>
        <p className="text-xs text-muted max-w-sm mb-4">
          {error}
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg border hover:bg-surface-raised transition-colors"
            style={{ borderColor: 'rgb(var(--border))', color: 'rgb(var(--foreground))' }}
          >
            Retry Loading
          </button>
        )}
      </div>
    );
  }

  // Filter snapshots based on selected range
  const now = new Date();
  const filteredSnapshots = snapshots.filter((snap) => {
    if (selectedRange === 'All') return true;
    const snapDate = new Date(snap.snapshot_date);
    const diffDays = (now.getTime() - snapDate.getTime()) / (1000 * 3600 * 24);
    if (selectedRange === '1W') return diffDays <= 7;
    if (selectedRange === '1M') return diffDays <= 30;
    if (selectedRange === '3M') return diffDays <= 90;
    if (selectedRange === '1Y') return diffDays <= 365;
    return true;
  });

  const chartData = filteredSnapshots.map((snap) => ({
    date: new Date(snap.snapshot_date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
    }),
    value: Number(snap.portfolio_value ?? snap.invested_value),
    invested: Number(snap.invested_value),
  }));

  const hasEnoughSnapshots = chartData.length >= 2;

  return (
    <div
      className="p-6 sm:p-7 rounded-2xl border flex flex-col justify-between transition-all duration-200"
      style={{
        backgroundColor: 'rgb(var(--surface))',
        borderColor: 'rgb(var(--border))',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2
            className="text-base sm:text-lg font-bold tracking-tight"
            style={{ color: 'rgb(var(--foreground))' }}
          >
            Portfolio Performance
          </h2>
          <p className="text-xs text-muted mt-0.5">
            Historical portfolio valuation and returns trajectory
          </p>
        </div>

        {hasEnoughSnapshots && (
          <div
            className="inline-flex items-center p-1 rounded-lg border gap-1"
            style={{
              backgroundColor: 'rgb(var(--surface-raised))',
              borderColor: 'rgb(var(--border))',
            }}
          >
            {(['1W', '1M', '3M', '1Y', 'All'] as PerformanceRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setSelectedRange(range)}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                  selectedRange === range
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-muted hover:text-foreground'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Chart Area or Honest Empty State */}
      {hasEnoughSnapshots ? (
        <div className="w-full h-[260px] select-none">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="performanceAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0EA5E9" stopOpacity={0.35} />
                  <stop offset="85%" stopColor="#0EA5E9" stopOpacity={0.02} />
                  <stop offset="100%" stopColor="#0EA5E9" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'rgb(var(--muted))', fontSize: 11 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'rgb(var(--muted))', fontSize: 11 }}
                tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<PerformanceTooltip />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#0EA5E9"
                strokeWidth={2.5}
                fill="url(#performanceAreaGradient)"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div
          className="flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-xl border border-dashed my-2"
          style={{
            borderColor: 'rgb(var(--border))',
            backgroundColor: 'rgba(var(--surface-raised) / 0.4)',
          }}
        >
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3.5 shadow-sm"
            style={{
              backgroundColor: 'rgba(14, 165, 233, 0.1)',
              color: '#0EA5E9',
            }}
          >
            <Clock className="w-6 h-6" />
          </div>
          <h3
            className="text-sm sm:text-base font-bold mb-1.5"
            style={{ color: 'rgb(var(--foreground))' }}
          >
            Performance History Accumulating
          </h3>
          <p className="text-xs text-muted max-w-md leading-relaxed mb-4">
            Daily portfolio valuation snapshots are captured automatically. Your performance
            curve and returns trajectory will render here as daily snapshots accumulate over time.
          </p>
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium"
            style={{
              backgroundColor: 'rgb(var(--surface))',
              color: 'rgb(var(--muted))',
              border: '1px solid rgb(var(--border))',
            }}
          >
            <TrendingUp className="w-3.5 h-3.5 text-brand-500" />
            <span>Finova adheres to real financial data integrity and never fabricates simulated trajectories</span>
          </div>
        </div>
      )}
    </div>
  );
}
