'use client';
import { useReducedMotionConfig } from 'framer-motion';

import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { usePrivateQuery as useQuery } from '@/lib/hooks/usePrivateQuery';
import { buildPortfolioSummary } from '@/lib/calculations/portfolio';
import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownLeft,
  Coins,
  Receipt,
  Scale,
  ShieldCheck,
  HelpCircle,
  Layers,
  History,
  CheckCircle2,
} from 'lucide-react';
import { PercentageBadge } from '@/components/shared/PercentageBadge';
import { SkeletonCard, SkeletonChart } from '@/components/shared/Skeletons';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatCurrency, formatPercent, ASSET_CLASS_LABELS, cn } from '@/lib/utils';
import type { HoldingWithMetrics } from '@/types/portfolio';
import type { PerformanceSummary } from '@/types/financial';
import type { PortfolioSnapshotRow } from '@/types/database';

async function fetchPerformanceData() {
  const res = await fetch('/api/portfolio/performance');
  if (!res.ok) throw new Error('Failed to load performance metrics');
  return res.json();
}

async function fetchHoldings() {
  const res = await fetch('/api/portfolio/holdings');
  if (!res.ok) throw new Error('Failed to load holdings');
  return res.json();
}

async function fetchSnapshots() {
  const res = await fetch('/api/portfolio/snapshots');
  if (!res.ok) throw new Error('Failed to load portfolio snapshots');
  return res.json();
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="card px-3 py-2 text-xs">
      <p className="font-medium mb-1" style={{ color: 'rgb(var(--foreground))' }}>
        {label}
      </p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: 'rgb(var(--muted))' }}>
          {p.name}: {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  );
}

export default function PerformancePage() {
  const reducedMotion = useReducedMotionConfig();
  const queryClient = useQueryClient();
  const { data: perfData, isLoading: isPerfLoading, error: perfError } = useQuery({
    queryKey: ['portfolio-performance'],
    queryFn: fetchPerformanceData,
  });

  const { data: holdingsData, isLoading: isHoldingsLoading, isError: holdingsError } = useQuery({
    queryKey: ['holdings'],
    queryFn: fetchHoldings,
  });

  const { data: snapData, isLoading: isSnapLoading, error: snapError, refetch: refetchSnapshots } = useQuery({
    queryKey: ['portfolio-snapshots'],
    queryFn: fetchSnapshots,
  });

  const [isRecordingSnapshot, setIsRecordingSnapshot] = useState(false);
  const [snapshotSuccessMsg, setSnapshotSuccessMsg] = useState<string | null>(null);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);

  const holdings: HoldingWithMetrics[] = holdingsData?.holdings ?? [];
  const performance: PerformanceSummary | undefined = perfData?.performance;
  const snapshots: PortfolioSnapshotRow[] = (snapData?.snapshots ?? []).filter(
    (s: PortfolioSnapshotRow) => s.completeness_status === 'COMPLETE' && s.portfolio_value !== null && Number.isFinite(s.portfolio_value)
  );

  const isLoading = isPerfLoading || isHoldingsLoading || isSnapLoading;

  const summary = buildPortfolioSummary(holdings);
  const totalInvested = summary.total_invested_value;
  const totalValue = summary.total_current_value;
  const canRecord = !holdingsError && holdings.length > 0 && summary.is_valuation_complete && totalValue !== null;

  // Sort by absolute return % for gainers/losers
  const gainers = [...holdings]
    .filter((h) => h.absolute_return_pct !== null && h.absolute_return_pct > 0)
    .sort((a, b) => (b.absolute_return_pct ?? 0) - (a.absolute_return_pct ?? 0))
    .slice(0, 5);
  const losers = [...holdings]
    .filter((h) => h.absolute_return_pct !== null && h.absolute_return_pct < 0)
    .sort((a, b) => (a.absolute_return_pct ?? 0) - (b.absolute_return_pct ?? 0))
    .slice(0, 5);

  const chartData = snapshots.map((s) => ({
    date: new Date(s.snapshot_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
    Invested: s.invested_value,
    Value: s.portfolio_value,
  }));

  const handleRecordSnapshot = async () => {
    if (!canRecord || totalValue === null) return;
    setIsRecordingSnapshot(true);
    setSnapshotSuccessMsg(null);
    setSnapshotError(null);
    try {
      const res = await fetch('/api/portfolio/snapshots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || 'Failed to record snapshot');
      }
      await refetchSnapshots();
      await queryClient.invalidateQueries({ queryKey: ['portfolio-snapshots'] });
      setSnapshotSuccessMsg('Current valuation snapshot successfully recorded!');
      setTimeout(() => setSnapshotSuccessMsg(null), 4000);
    } catch (e) {
      setSnapshotError(e instanceof Error ? e.message : 'Failed to record snapshot');
    } finally {
      setIsRecordingSnapshot(false);
    }
  };

  if (isLoading) {
    return (
      <div className="page-container space-y-5">
        <SkeletonChart height={300} />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SkeletonCard lines={4} />
          <SkeletonCard lines={4} />
          <SkeletonCard lines={4} />
        </div>
      </div>
    );
  }

  const isRealizedGain = (performance?.realized_pnl ?? 0) >= 0;
  const isUnrealizedGain = (performance?.unrealized_pnl ?? 0) >= 0;
  const isCombinedGain = (performance?.combined_performance_net ?? 0) >= 0;

  return (
    <div className="page-container space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: 'rgb(var(--foreground))' }}>
          Portfolio Performance &amp; Returns
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'rgb(var(--muted))' }}>
          Realized capital gains, paper returns, cash dividends, and net investment yield
        </p>
      </div>

      {/* ─── Metric Pillars: Realized vs Unrealized vs Income ─── */}
      {performance && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* 1. Realized P&L */}
          <div
            className="card p-5 flex flex-col justify-between"
            style={{ boxShadow: 'var(--shadow-card)' }}
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
                  Realized P&amp;L
                </span>
                {isRealizedGain ? (
                  <ArrowUpRight className="w-4 h-4 text-gain" />
                ) : (
                  <ArrowDownLeft className="w-4 h-4 text-loss" />
                )}
              </div>
              <div
                className={cn(
                  'text-xl font-bold tracking-tight',
                  isRealizedGain ? 'text-gain' : 'text-loss'
                )}
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {isRealizedGain ? '+' : ''}
                {formatCurrency(performance.realized_pnl)}
              </div>
            </div>
            <div className="mt-3 text-[11px] text-muted flex items-center justify-between">
              <span>Completed sales</span>
              <span className="text-[10px] opacity-80">
                {performance.completed_sales_count} trades
              </span>
            </div>
          </div>

          {/* 2. Unrealized P&L */}
          <div
            className="card p-5 flex flex-col justify-between"
            style={{ boxShadow: 'var(--shadow-card)' }}
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
                  Unrealized P&amp;L
                </span>
                {isUnrealizedGain ? (
                  <TrendingUp className="w-4 h-4 text-gain" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-loss" />
                )}
              </div>
              <div
                className={cn(
                  'text-xl font-bold tracking-tight',
                  performance.unrealized_pnl === null
                    ? 'text-muted'
                    : isUnrealizedGain
                    ? 'text-gain'
                    : 'text-loss'
                )}
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {performance.unrealized_pnl === null
                  ? 'Price unavailable'
                  : `${isUnrealizedGain ? '+' : ''}${formatCurrency(performance.unrealized_pnl)}`}
              </div>
            </div>
            <div className="mt-3 text-[11px] text-muted flex items-center justify-between">
              <span>Open positions</span>
              <span>{performance.unrealized_pnl_pct !== null ? formatPercent(performance.unrealized_pnl_pct) : '—'}</span>
            </div>
          </div>

          {/* 3. Dividend & Interest Income */}
          <div
            className="card p-5 flex flex-col justify-between"
            style={{ boxShadow: 'var(--shadow-card)' }}
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
                  Cash Income
                </span>
                <Coins className="w-4 h-4 text-teal-700 dark:text-teal-400" />
              </div>
              <div
                className="text-xl font-bold tracking-tight text-teal-700 dark:text-teal-400"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                +{formatCurrency(performance.total_income)}
              </div>
            </div>
            <div className="mt-3 text-[11px] text-muted flex items-center justify-between">
              <span>Dividends &amp; Coupons</span>
              <span className="text-[10px] opacity-80">{performance.income_events_count} events</span>
            </div>
          </div>

          {/* 4. Combined Net Performance */}
          <div
            className="card p-5 flex flex-col justify-between border-brand-500/30"
            style={{
              boxShadow: 'var(--shadow-card)',
              backgroundColor: 'rgba(59, 130, 246, 0.03)',
            }}
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-brand-400">
                  Combined Net Return
                </span>
                <Scale className="w-4 h-4 text-brand-400" />
              </div>
              <div
                className={cn(
                  'text-xl font-bold tracking-tight',
                  performance.combined_performance_net === null
                    ? 'text-muted'
                    : isCombinedGain
                    ? 'text-gain'
                    : 'text-loss'
                )}
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {performance.combined_performance_net === null
                  ? 'Incomplete'
                  : `${isCombinedGain ? '+' : ''}${formatCurrency(performance.combined_performance_net)}`}
              </div>
            </div>
            <div className="mt-3 text-[11px] text-muted flex items-center justify-between">
              <span>Net return yield</span>
              <span className="font-semibold text-foreground">
                {performance.combined_performance_pct !== null
                  ? formatPercent(performance.combined_performance_pct)
                  : '—'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ─── Breakdown & Accounting Explainer ─────────────────── */}
      <div
        className="card p-4 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
        style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)' }}
      >
        <div className="flex items-center gap-2 text-muted">
          <ShieldCheck className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
          <span>
            <strong>Accounting Integrity:</strong> Realized P&amp;L reflects sale proceeds minus acquisition cost (WAC). Trade fees are incorporated into net proceeds, ensuring zero double-counting in Combined Net Return.
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0 text-[11px] text-muted">
          <span>Trade Fees: {formatCurrency(performance?.total_trade_fees ?? 0)}</span>
          <span>·</span>
          <span>AMC / Charges: {formatCurrency(performance?.total_standalone_fees ?? 0)}</span>
        </div>
      </div>

      {holdings.length === 0 ? (
        <EmptyState
          icon={<BarChart3 className="w-8 h-8" style={{ color: 'rgb(var(--brand-500))' }} />}
          title="No data yet"
          description="Add holdings or record transactions to see your performance metrics."
        />
      ) : (
        <>
          {/* Performance Growth Chart OR Accumulating Historical Valuation Snapshots */}
          {snapshots.length >= 2 ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="card p-5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div>
                  <h2 className="text-sm font-semibold" style={{ color: 'rgb(var(--foreground))' }}>
                    Portfolio Growth
                  </h2>
                  <p className="text-xs text-muted mt-0.5">
                    Recorded value history from {snapshots.length} complete valuation snapshots; deposits and withdrawals also affect this chart.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="text-xs px-2.5 py-1 rounded-md border text-muted"
                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)' }}
                  >
                    Capital Invested vs Market Valuation
                  </span>
                  <button
                    onClick={handleRecordSnapshot}
                    disabled={isRecordingSnapshot || !canRecord}
                    className="text-xs px-2.5 py-1 rounded-md bg-brand-500/10 text-brand-400 border border-brand-500/20 hover:bg-brand-500/20 transition-colors"
                  >
                    {isRecordingSnapshot ? 'Recording...' : '+ Record Today'}
                  </button>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="rgb(var(--brand-500))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="rgb(var(--brand-500))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorInvested" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="rgb(var(--muted))" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="rgb(var(--muted))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: 'rgb(var(--muted))' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(v) => formatCurrency(v, true)}
                    tick={{ fontSize: 11, fill: 'rgb(var(--muted))' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    isAnimationActive={!reducedMotion}
                    type="monotone"
                    dataKey="Invested"
                    stroke="rgb(var(--muted))"
                    strokeWidth={1.5}
                    fill="url(#colorInvested)"
                  />
                  <Area
                    isAnimationActive={!reducedMotion}
                    type="monotone"
                    dataKey="Value"
                    stroke="rgb(var(--brand-500))"
                    strokeWidth={2}
                    fill="url(#colorValue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="card p-6 border border-border/60 dark:border-slate-700/60 bg-surface/40 dark:bg-slate-900/40 backdrop-blur-sm space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                    <History className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-foreground dark:text-slate-100">
                      Accumulating Historical Valuation Snapshots
                    </h2>
                    <p className="text-xs text-muted dark:text-slate-400 mt-0.5">
                      FINOVA adheres to strict financial integrity: retrospective return curves are never synthesized or fabricated.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                    {snapshots.length} of 2 Snapshots Recorded
                  </span>
                  <button
                    onClick={handleRecordSnapshot}
                    disabled={isRecordingSnapshot || !canRecord}
                    className="btn-primary text-xs py-1.5 px-3"
                  >
                    {isRecordingSnapshot ? 'Recording...' : 'Record Snapshot Now'}
                  </button>
                </div>
              </div>

              {(snapshotError || snapError || perfError) && <p className="text-xs text-muted" role="alert">{snapshotError || snapError?.message || perfError?.message}</p>}
              {snapshotSuccessMsg && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{snapshotSuccessMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="p-3 rounded-lg bg-surface-raised/40 dark:bg-slate-800/40 border border-border dark:border-slate-800">
                  <div className="text-[11px] text-muted dark:text-slate-400 uppercase tracking-wider font-medium">Invested Capital</div>
                  <div className="text-sm font-bold text-foreground dark:text-slate-200 mt-1">{formatCurrency(totalInvested)}</div>
                </div>
                <div className="p-3 rounded-lg bg-surface-raised/40 dark:bg-slate-800/40 border border-border dark:border-slate-800">
                  <div className="text-[11px] text-muted dark:text-slate-400 uppercase tracking-wider font-medium">Current Valuation</div>
                  <div className="text-sm font-bold text-foreground dark:text-slate-200 mt-1">{totalValue === null ? 'Unavailable' : formatCurrency(totalValue)}</div>
                </div>
                <div className="p-3 rounded-lg bg-surface-raised/40 dark:bg-slate-800/40 border border-border dark:border-slate-800">
                  <div className="text-[11px] text-muted dark:text-slate-400 uppercase tracking-wider font-medium">Active Holdings</div>
                  <div className="text-sm font-bold text-foreground dark:text-slate-200 mt-1">{holdings.length} Positions</div>
                </div>
                <div className="p-3 rounded-lg bg-surface-raised/40 dark:bg-slate-800/40 border border-border dark:border-slate-800">
                  <div className="text-[11px] text-muted dark:text-slate-400 uppercase tracking-wider font-medium">History Status</div>
                  <div className="text-sm font-bold text-amber-700 dark:text-amber-400 mt-1">
                    {snapshots.length === 1 ? '1 Snapshot Saved' : 'Awaiting 2nd Point'}
                  </div>
                </div>
              </div>

              <p className="text-xs text-muted dark:text-slate-400 leading-relaxed border-t border-border/80 dark:border-slate-800/80 pt-3">
                Record snapshots on two different dates to see recorded value history. Recording requires prices for every holding and no stale fallback quotes. This chart is not a cash-flow-adjusted return or benchmark comparison.
              </p>
            </motion.div>
          )}

          {/* Gainers & Losers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Top Gainers */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="card p-5"
            >
              <h2 className="text-sm font-semibold mb-4" style={{ color: 'rgb(var(--foreground))' }}>
                Top Gainers
              </h2>
              <div className="space-y-3">
                {gainers
                  .filter((h) => h.absolute_return_pct !== null && h.absolute_return_pct >= 0)
                  .slice(0, 5)
                  .map((h) => (
                    <div key={h.id} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'rgb(var(--foreground))' }}>
                          {h.name}
                        </p>
                        <p className="text-xs" style={{ color: 'rgb(var(--muted))' }}>
                          {h.symbol} · {ASSET_CLASS_LABELS[h.asset_class]}
                        </p>
                      </div>
                      <div className="text-right">
                        <PercentageBadge value={h.absolute_return_pct!} size="sm" />
                        <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--gain))' }}>
                          +{formatCurrency(h.absolute_return || 0)}
                        </p>
                      </div>
                    </div>
                  ))}
                {gainers.filter((h) => h.absolute_return_pct !== null && h.absolute_return_pct >= 0)
                  .length === 0 && (
                  <p className="text-sm" style={{ color: 'rgb(var(--muted))' }}>
                    No gainers yet
                  </p>
                )}
              </div>
            </motion.div>

            {/* Top Losers */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="card p-5"
            >
              <h2 className="text-sm font-semibold mb-4" style={{ color: 'rgb(var(--foreground))' }}>
                Underperformers
              </h2>
              <div className="space-y-3">
                {losers
                  .filter((h) => h.absolute_return_pct !== null && h.absolute_return_pct < 0)
                  .slice(0, 5)
                  .map((h) => (
                    <div key={h.id} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'rgb(var(--foreground))' }}>
                          {h.name}
                        </p>
                        <p className="text-xs" style={{ color: 'rgb(var(--muted))' }}>
                          {h.symbol} · {ASSET_CLASS_LABELS[h.asset_class]}
                        </p>
                      </div>
                      <div className="text-right">
                        <PercentageBadge value={h.absolute_return_pct!} size="sm" />
                        <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--loss))' }}>
                          {formatCurrency(h.absolute_return || 0)}
                        </p>
                      </div>
                    </div>
                  ))}
                {losers.filter((h) => h.absolute_return_pct !== null && h.absolute_return_pct < 0)
                  .length === 0 && (
                  <p className="text-sm" style={{ color: 'rgb(var(--muted))' }}>
                    All holdings in profit 🎉
                  </p>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </div>
  );
}
