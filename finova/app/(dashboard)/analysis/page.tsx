'use client';

// ============================================================
// FINOVA — Innovation One: Unified Investment X-Ray Page
// app/(dashboard)/analysis/page.tsx
//
// Consolidated cross-broker portfolio intelligence:
// - Multi-broker holding consolidation without mutating underlying records
// - Cross-broker overlap discovery with verified ISIN matching
// - Multi-dimensional breakdowns (Asset Class, Broker, Instrument, Sector)
// - Interactive investigation filters and Gemini educational Q&A
// ============================================================

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Layers,
  Building2,
  PieChart,
  ShieldAlert,
  Sparkles,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Info,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Filter,
  Eye,
  X,
  Search,
} from 'lucide-react';
import { SkeletonCard } from '@/components/shared/Skeletons';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatIndianCurrency, formatPercent } from '@/lib/utils';
import type {
  UnifiedXRayAnalysis,
  ConsolidatedInstrumentExposure,
  CrossBrokerOverlapItem,
} from '@/lib/calculations/xray';

async function fetchXRay(): Promise<UnifiedXRayAnalysis> {
  const res = await fetch('/api/portfolio/xray');
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to load portfolio X-Ray');
  }
  const payload = await res.json();
  return payload.data;
}

export default function InvestmentXRayPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: ['portfolio-xray'],
    queryFn: fetchXRay,
    staleTime: 30000,
  });

  const [activeTab, setActiveTab] = useState<'instruments' | 'asset_class' | 'broker' | 'sector'>(
    'instruments'
  );
  const [selectedBrokerFilter, setSelectedBrokerFilter] = useState<string>('all');
  const [selectedAssetClassFilter, setSelectedAssetClassFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedInstrument, setSelectedInstrument] = useState<ConsolidatedInstrumentExposure | null>(
    null
  );

  // AI Educational Q&A State
  const [aiQuestion, setAiQuestion] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);

  async function askAi(type: string, questionLabel: string) {
    setAiQuestion(questionLabel);
    setAiLoading(true);
    setAiResponse(null);

    try {
      const res = await fetch('/api/ai/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          context: {
            overlapCount: data?.summary.cross_broker_overlaps_count,
            overlapValue: data?.summary.cross_broker_overlap_value
              ? formatIndianCurrency(data.summary.cross_broker_overlap_value)
              : undefined,
            overlapPct: data?.summary.cross_broker_overlap_valued_pct,
            topHoldingName: data?.consolidated_instruments[0]?.name,
            topHoldingWeight: data?.consolidated_instruments[0]?.percentage_of_valued_portfolio,
            unquotedCount: data?.summary.unpriced_positions_count,
            quoteCoveragePct: data?.summary.quote_coverage_pct,
          },
        }),
      });

      const resData = await res.json();
      setAiResponse(resData.explanation || 'Educational analysis currently unavailable.');
    } catch {
      setAiResponse('Unable to load AI explanation. Please check your network connection.');
    } finally {
      setAiLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="page-container space-y-6">
        <div className="h-20 bg-muted/20 animate-pulse rounded-xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SkeletonCard lines={3} />
          <SkeletonCard lines={3} />
          <SkeletonCard lines={3} />
          <SkeletonCard lines={3} />
        </div>
        <SkeletonCard lines={6} />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="page-container py-12">
        <EmptyState
          icon={<AlertTriangle className="w-10 h-10 text-loss" />}
          title="Failed to Load Investment X-Ray"
          description={
            error instanceof Error ? error.message : 'Please check your cloud database connection.'
          }
          action={
            <button
              onClick={() => queryClient.invalidateQueries({ queryKey: ['portfolio-xray'] })}
              className="btn-secondary text-xs py-2 px-3"
            >
              Retry Analysis
            </button>
          }
        />
      </div>
    );
  }

  if (data.summary.total_positions_count === 0) {
    return (
      <div className="page-container py-12">
        <EmptyState
          icon={<Layers className="w-10 h-10 text-brand-500" />}
          title="No Investments to X-Ray"
          description="Add or import holdings from your brokers to reveal consolidated exposure, cross-broker overlaps, and data completeness."
          action={
            <Link href="/investments" className="btn-primary text-xs py-2 px-3">
              Add Investment Holdings
            </Link>
          }
        />
      </div>
    );
  }

  const { summary, overlaps, consolidated_instruments, asset_class_breakdown, broker_breakdown, sector_breakdown, data_quality } =
    data;

  // Filter instruments
  const filteredInstruments = consolidated_instruments.filter((inst) => {
    if (selectedBrokerFilter !== 'all') {
      const appearsInBroker = inst.contributions.some(
        (c) => c.broker_account_id === selectedBrokerFilter
      );
      if (!appearsInBroker) return false;
    }

    if (selectedAssetClassFilter !== 'all') {
      if (inst.asset_class !== selectedAssetClassFilter) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSymbol = inst.symbol.toLowerCase().includes(q);
      const matchName = inst.name.toLowerCase().includes(q);
      const matchIsin = inst.isin?.toLowerCase().includes(q);
      if (!matchSymbol && !matchName && !matchIsin) return false;
    }

    return true;
  });

  return (
    <div className="page-container space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5" style={{ borderColor: 'rgb(var(--border))' }}>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'rgb(var(--foreground))' }}>
              Unified Investment X-Ray
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-brand-500/10 text-brand-500 border border-brand-500/20">
              Cross-Broker Intelligence
            </span>
          </div>
          <p className="text-sm mt-1 text-muted">
            Consolidated exposure across {summary.tracked_brokers_count} manually tracked broker accounts. Underlying holdings remain unchanged.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['portfolio-xray'] })}
            disabled={isFetching}
            className="btn-secondary text-xs inline-flex items-center gap-1.5 py-2 px-3"
            title="Refresh X-Ray analysis"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            <span>{isFetching ? 'Refreshing...' : 'Refresh X-Ray'}</span>
          </button>

          <Link
            href="/investments"
            className="btn-primary text-xs inline-flex items-center gap-1.5 py-2 px-3"
          >
            <span>My Investments</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Overview KPIs Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <div className="card p-4 flex flex-col justify-between">
          <p className="text-xs text-muted">Tracked Brokers</p>
          <div className="mt-2">
            <p className="text-2xl font-bold text-foreground">{summary.tracked_brokers_count}</p>
            <p className="text-[11px] text-muted mt-0.5">Manual portfolios</p>
          </div>
        </div>

        <div className="card p-4 flex flex-col justify-between">
          <p className="text-xs text-muted">Distinct Instruments</p>
          <div className="mt-2">
            <p className="text-2xl font-bold text-foreground">{summary.distinct_instruments_count}</p>
            <p className="text-[11px] text-muted mt-0.5">{summary.total_positions_count} open positions</p>
          </div>
        </div>

        <div className="card p-4 flex flex-col justify-between">
          <p className="text-xs text-muted">Invested Capital</p>
          <div className="mt-2">
            <p className="text-xl font-bold text-foreground">
              {formatIndianCurrency(summary.total_invested_capital)}
            </p>
            <p className="text-[11px] text-muted mt-0.5">Known cost basis</p>
          </div>
        </div>

        <div className="card p-4 flex flex-col justify-between">
          <p className="text-xs text-muted">Valued Market Capital</p>
          <div className="mt-2">
            <p className="text-xl font-bold text-foreground">
              {summary.market_valued_capital !== null
                ? formatIndianCurrency(summary.market_valued_capital)
                : 'Unavailable'}
            </p>
            <p className="text-[11px] text-muted mt-0.5">
              {summary.priced_positions_count} of {summary.total_positions_count} quoted
            </p>
          </div>
        </div>

        <div className="card p-4 flex flex-col justify-between">
          <p className="text-xs text-muted">Unrealized P&L</p>
          <div className="mt-2">
            {summary.unrealized_pnl !== null ? (
              <div className="flex items-baseline gap-1">
                <span
                  className={`text-xl font-bold ${
                    summary.unrealized_pnl >= 0 ? 'text-gain' : 'text-loss'
                  }`}
                >
                  {formatIndianCurrency(summary.unrealized_pnl)}
                </span>
                <span
                  className={`text-xs font-semibold ${
                    summary.unrealized_pnl >= 0 ? 'text-gain' : 'text-loss'
                  }`}
                >
                  ({formatPercent(summary.unrealized_pnl_pct || 0)})
                </span>
              </div>
            ) : (
              <p className="text-sm font-semibold text-muted">Partial quotes</p>
            )}
            <p className="text-[11px] text-muted mt-0.5">On valued subset</p>
          </div>
        </div>

        <div className="card p-4 flex flex-col justify-between border-brand-500/30 bg-brand-500/5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-brand-600 dark:text-brand-400">Cross-Broker Overlaps</p>
            <Building2 className="w-4 h-4 text-brand-500" />
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold text-brand-600 dark:text-brand-300">
              {summary.cross_broker_overlaps_count}
            </p>
            <p className="text-[11px] text-brand-700/80 dark:text-brand-300/80 mt-0.5">
              {summary.cross_broker_overlap_valued_pct.toFixed(1)}% of valued portfolio
            </p>
          </div>
        </div>
      </div>

      {/* Innovation Highlight: Cross-Broker Overlap Section */}
      <div className="card p-5 space-y-4 border-l-4 border-l-brand-500">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-foreground">Cross-Broker Overlap Insights</h2>
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-brand-500/10 text-brand-500">
                {overlaps.length} Security Overlap{overlaps.length === 1 ? '' : 's'} Detected
              </span>
            </div>
            <p className="text-xs text-muted mt-0.5">
              Securities held simultaneously in multiple broker accounts. FINOVA groups them to show true consolidated exposure.
            </p>
          </div>

          <button
            onClick={() => askAi('cross_broker_overlap', 'How much exposure do I have to the same company across brokers?')}
            className="text-xs font-semibold inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-brand-500/30 bg-brand-500/10 text-brand-600 dark:text-brand-400 hover:bg-brand-500/20 transition-colors self-start sm:self-auto"
          >
            <Sparkles className="w-3.5 h-3.5 text-brand-500" />
            <span>AI Overlap Analysis</span>
          </button>
        </div>

        {overlaps.length === 0 ? (
          <div className="p-4 rounded-xl bg-gain/5 border border-gain/20 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-gain flex-shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-semibold text-foreground">No Duplicate Securities Across Brokers</p>
              <p className="text-muted mt-0.5">
                Every instrument in your portfolio is held within exactly one broker account. There are no unintentional duplicate positions fragmenting your capital.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {overlaps.map((item) => (
              <div
                key={item.canonical_key}
                onClick={() => {
                  const match = consolidated_instruments.find((i) => i.canonical_key === item.canonical_key);
                  if (match) setSelectedInstrument(match);
                }}
                className="p-3.5 rounded-xl border border-border bg-surface/50 hover:border-brand-500/50 hover:bg-surface cursor-pointer transition-all space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">{item.name}</p>
                    <div className="flex items-center gap-1.5 text-[11px] text-muted">
                      <span>{item.symbol}</span>
                      <span>•</span>
                      <span className="uppercase">{item.asset_class}</span>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                      item.match_confidence === 'CONFIRMED'
                        ? 'bg-gain/10 text-gain border border-gain/20'
                        : 'bg-warning/10 text-warning border border-warning/20'
                    }`}
                  >
                    {item.match_basis === 'ISIN' ? 'ISIN Matched' : 'Symbol Matched'}
                  </span>
                </div>

                <div className="pt-2 border-t border-border/60 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted">Consolidated Qty:</span>
                    <span className="font-semibold text-foreground">{item.total_quantity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Consolidated Value:</span>
                    <span className="font-semibold text-foreground">
                      {item.current_value !== null
                        ? formatIndianCurrency(item.current_value)
                        : formatIndianCurrency(item.total_invested_value)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Share of Valued Portfolio:</span>
                    <span className="font-semibold text-brand-500">
                      {item.percentage_of_valued_portfolio.toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Broker Breakdown Chips */}
                <div className="pt-1">
                  <p className="text-[10px] font-medium text-muted uppercase tracking-wider mb-1.5">
                    Distributed across {item.broker_count} brokers:
                  </p>
                  <div className="space-y-1">
                    {item.brokers_breakdown.map((b) => (
                      <div
                        key={b.broker_account_id}
                        className="flex items-center justify-between text-[11px] px-2 py-1 rounded bg-muted/10"
                      >
                        <span className="font-medium text-foreground">{b.broker_name}</span>
                        <span className="text-muted">
                          {b.quantity} shares ({b.share_of_instrument_pct.toFixed(0)}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI Educational Q&A Modal / Drawer */}
      <AnimatePresence>
        {aiQuestion && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="card p-5 border-brand-500/40 bg-brand-500/5 space-y-3 relative"
          >
            <button
              onClick={() => {
                setAiQuestion(null);
                setAiResponse(null);
              }}
              className="absolute top-4 right-4 p-1 text-muted hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400 font-semibold text-sm">
              <Sparkles className="w-4 h-4" />
              <span>AI Educational Interpretation: {aiQuestion}</span>
            </div>

            {aiLoading ? (
              <div className="flex items-center gap-2 text-xs text-muted py-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Consulting financial intelligence engine...</span>
              </div>
            ) : (
              <div className="text-xs text-foreground/90 leading-relaxed whitespace-pre-line">
                {aiResponse}
              </div>
            )}

            <div className="pt-2 border-t border-brand-500/20 text-[11px] text-muted flex items-center gap-1.5">
              <Info className="w-3 h-3 text-muted flex-shrink-0" />
              <span>
                Calculations are derived deterministically by FINOVA. Explanations are strictly educational and non-advisory.
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Multi-Dimensional Breakdowns & Navigation Tabs */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-2">
          <div className="flex items-center gap-2 overflow-x-auto">
            {[
              { id: 'instruments', label: 'Consolidated Instruments', icon: Layers },
              { id: 'asset_class', label: 'Asset Class Exposure', icon: PieChart },
              { id: 'broker', label: 'Broker Distribution', icon: Building2 },
              { id: 'sector', label: 'Sector Analysis', icon: Filter },
            ].map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`text-xs font-semibold px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-brand-500 text-white shadow-sm'
                      : 'text-muted hover:text-foreground hover:bg-muted/10'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Quick AI Explanation Prompts */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted hidden md:inline">Ask AI:</span>
            <button
              onClick={() => askAi('concentration', 'Why is my portfolio considered concentrated?')}
              className="text-[11px] px-2.5 py-1 rounded bg-muted/10 hover:bg-muted/20 text-muted hover:text-foreground transition-colors"
            >
              Why concentrated?
            </button>
            <button
              onClick={() => askAi('asset_allocation', 'What does my asset allocation tell me?')}
              className="text-[11px] px-2.5 py-1 rounded bg-muted/10 hover:bg-muted/20 text-muted hover:text-foreground transition-colors"
            >
              Asset allocation thesis
            </button>
          </div>
        </div>

        {/* Tab 1: Consolidated Instruments */}
        {activeTab === 'instruments' && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="text"
                  placeholder="Filter by company, symbol or ISIN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-border bg-surface text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={selectedBrokerFilter}
                  onChange={(e) => setSelectedBrokerFilter(e.target.value)}
                  className="text-xs px-2.5 py-2 rounded-lg border border-border bg-surface text-foreground"
                >
                  <option value="all">All Brokers ({broker_breakdown.length})</option>
                  {broker_breakdown.map((b) => (
                    <option key={b.broker_account_id} value={b.broker_account_id}>
                      {b.broker_name}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedAssetClassFilter}
                  onChange={(e) => setSelectedAssetClassFilter(e.target.value)}
                  className="text-xs px-2.5 py-2 rounded-lg border border-border bg-surface text-foreground"
                >
                  <option value="all">All Asset Classes</option>
                  {asset_class_breakdown.map((a) => (
                    <option key={a.asset_class} value={a.asset_class}>
                      {a.display_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/10 text-muted uppercase tracking-wider text-[10px] border-b border-border">
                    <tr>
                      <th className="py-3 px-4">Instrument</th>
                      <th className="py-3 px-4">Asset Class</th>
                      <th className="py-3 px-4 text-center">Brokers</th>
                      <th className="py-3 px-4 text-right">Consolidated Qty</th>
                      <th className="py-3 px-4 text-right">Invested Capital</th>
                      <th className="py-3 px-4 text-right">Market Value</th>
                      <th className="py-3 px-4 text-right">Valued Share</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredInstruments.map((inst) => (
                      <tr key={inst.canonical_key} className="hover:bg-muted/5 transition-colors">
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-semibold text-foreground">{inst.name}</p>
                            <div className="flex items-center gap-1.5 text-[11px] text-muted">
                              <span className="font-mono">{inst.symbol}</span>
                              {inst.isin && (
                                <>
                                  <span>•</span>
                                  <span className="font-mono text-[10px]">{inst.isin}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-muted/10 text-foreground uppercase">
                            {inst.asset_class}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              inst.broker_count > 1
                                ? 'bg-brand-500/20 text-brand-600 dark:text-brand-300 border border-brand-500/30'
                                : 'bg-muted/20 text-muted'
                            }`}
                          >
                            {inst.broker_count} {inst.broker_count > 1 ? 'Overlap' : 'Broker'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-medium text-foreground">
                          {inst.total_quantity}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-muted">
                          {formatIndianCurrency(inst.total_invested_value)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-foreground">
                          {inst.current_value !== null ? (
                            formatIndianCurrency(inst.current_value)
                          ) : (
                            <span className="text-[11px] text-warning italic font-normal">
                              Quote unavailable
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-brand-500">
                          {inst.is_quoted
                            ? `${inst.percentage_of_valued_portfolio.toFixed(1)}%`
                            : '—'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => setSelectedInstrument(inst)}
                            className="p-1.5 rounded hover:bg-muted/20 text-muted hover:text-foreground transition-colors"
                            title="Inspect broker exposure"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Asset Class Exposure */}
        {activeTab === 'asset_class' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {asset_class_breakdown.map((item) => (
              <div key={item.asset_class} className="card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-foreground">{item.display_name}</p>
                  <span className="text-xs font-bold text-brand-500">
                    {item.percentage_of_valued.toFixed(1)}%
                  </span>
                </div>

                <div className="w-full bg-muted/20 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-brand-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(item.percentage_of_valued, 100)}%` }}
                  />
                </div>

                <div className="pt-2 border-t border-border/60 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted">Distinct Instruments:</span>
                    <span className="font-semibold text-foreground">
                      {item.distinct_instruments_count}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Total Open Positions:</span>
                    <span className="font-semibold text-foreground">{item.positions_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Invested Capital:</span>
                    <span className="font-mono text-foreground">
                      {formatIndianCurrency(item.invested_value)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Market Value:</span>
                    <span className="font-mono font-semibold text-foreground">
                      {item.current_value !== null
                        ? formatIndianCurrency(item.current_value)
                        : 'Unpriced subset'}
                    </span>
                  </div>
                </div>

                {/* Educational link for alternative assets */}
                {['reit', 'invit', 'bond'].includes(item.asset_class) && (
                  <div className="pt-2">
                    <Link
                      href={`/${item.asset_class}`}
                      className="text-[11px] font-semibold text-brand-500 hover:underline inline-flex items-center gap-1"
                    >
                      <span>Learn about {item.display_name}</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Tab 3: Broker Distribution */}
        {activeTab === 'broker' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {broker_breakdown.map((item) => (
              <div key={item.broker_account_id} className="card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color_hex }}
                    />
                    <p className="text-sm font-bold text-foreground">{item.broker_name}</p>
                  </div>
                  <span className="text-xs font-bold text-foreground">
                    {item.percentage_of_valued.toFixed(1)}%
                  </span>
                </div>

                <div className="w-full bg-muted/20 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(item.percentage_of_valued, 100)}%`,
                      backgroundColor: item.color_hex,
                    }}
                  />
                </div>

                <div className="pt-2 border-t border-border/60 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted">Distinct Instruments:</span>
                    <span className="font-semibold text-foreground">
                      {item.distinct_instruments_count}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Positions Logged:</span>
                    <span className="font-semibold text-foreground">{item.positions_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Invested Capital:</span>
                    <span className="font-mono text-foreground">
                      {formatIndianCurrency(item.invested_value)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Market Valuation:</span>
                    <span className="font-mono font-semibold text-foreground">
                      {item.current_value !== null
                        ? formatIndianCurrency(item.current_value)
                        : formatIndianCurrency(item.invested_value)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 4: Sector Analysis */}
        {activeTab === 'sector' && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-muted/10 border border-border text-xs text-muted flex items-start gap-2.5">
              <Info className="w-4 h-4 text-brand-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-foreground">Sector Provenance & Transparency</p>
                <p className="mt-0.5">
                  Sector classifications are derived from verified instrument metadata. Holdings without authoritative sector mappings are grouped honestly under &ldquo;Unclassified&rdquo; rather than hallucinated or guessed.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sector_breakdown.map((item) => (
                <div key={item.sector} className="card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p
                      className={`text-sm font-bold ${
                        item.is_classified ? 'text-foreground' : 'text-muted italic'
                      }`}
                    >
                      {item.sector}
                    </p>
                    <span className="text-xs font-bold text-brand-500">
                      {item.percentage_of_valued.toFixed(1)}%
                    </span>
                  </div>

                  <div className="w-full bg-muted/20 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        item.is_classified ? 'bg-brand-500' : 'bg-muted'
                      }`}
                      style={{ width: `${Math.min(item.percentage_of_valued, 100)}%` }}
                    />
                  </div>

                  <div className="pt-2 border-t border-border/60 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted">Instruments:</span>
                      <span className="font-semibold text-foreground">
                        {item.instruments_count}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Invested Capital:</span>
                      <span className="font-mono text-foreground">
                        {formatIndianCurrency(item.invested_value)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Valued Amount:</span>
                      <span className="font-mono font-semibold text-foreground">
                        {item.current_value !== null
                          ? formatIndianCurrency(item.current_value)
                          : 'Unpriced'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Data Quality & Coverage Radar Section */}
      <div className="card p-5 space-y-3 border border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-foreground">Data Completeness & Valuation Radar</h3>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                data_quality.unquoted_positions === 0
                  ? 'bg-gain/10 text-gain'
                  : 'bg-warning/10 text-warning'
              }`}
            >
              {data_quality.unquoted_positions === 0
                ? '100% Price Coverage'
                : `${summary.quote_coverage_pct}% Quoted`}
            </span>
          </div>

          <button
            onClick={() => askAi('incomplete_valuation', "Why doesn't FINOVA show a complete portfolio value?")}
            className="text-xs text-brand-500 hover:underline inline-flex items-center gap-1"
          >
            <span>Why partial valuation?</span>
          </button>
        </div>

        <p className="text-xs text-muted">
          FINOVA makes uncertainty visible rather than hiding it behind polished estimates. Missing market quotes or unclassified sectors are disclosed transparently.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs pt-2">
          <div className="p-2.5 rounded-lg bg-muted/10">
            <p className="text-muted text-[11px]">Total Positions</p>
            <p className="text-sm font-bold text-foreground mt-0.5">{data_quality.total_positions}</p>
          </div>
          <div className="p-2.5 rounded-lg bg-muted/10">
            <p className="text-muted text-[11px]">Quoted Prices</p>
            <p className="text-sm font-bold text-gain mt-0.5">{data_quality.quoted_positions}</p>
          </div>
          <div className="p-2.5 rounded-lg bg-muted/10">
            <p className="text-muted text-[11px]">Unpriced Holdings</p>
            <p className="text-sm font-bold text-warning mt-0.5">{data_quality.unquoted_positions}</p>
          </div>
          <div className="p-2.5 rounded-lg bg-muted/10">
            <p className="text-muted text-[11px]">Stale Quotes</p>
            <p className="text-sm font-bold text-foreground mt-0.5">{data_quality.stale_quotes_count}</p>
          </div>
          <div className="p-2.5 rounded-lg bg-muted/10">
            <p className="text-muted text-[11px]">Missing ISIN</p>
            <p className="text-sm font-bold text-foreground mt-0.5">{data_quality.positions_without_isin}</p>
          </div>
          <div className="p-2.5 rounded-lg bg-muted/10">
            <p className="text-muted text-[11px]">Unclassified Sector</p>
            <p className="text-sm font-bold text-foreground mt-0.5">
              {data_quality.positions_unclassified_sector}
            </p>
          </div>
        </div>
      </div>

      {/* Selected Instrument Detail Modal */}
      <AnimatePresence>
        {selectedInstrument && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="card max-w-lg w-full p-6 space-y-4 shadow-2xl relative"
            >
              <button
                onClick={() => setSelectedInstrument(null)}
                className="absolute top-4 right-4 p-1 text-muted hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>

              <div>
                <h3 className="text-lg font-bold text-foreground">{selectedInstrument.name}</h3>
                <div className="flex items-center gap-2 text-xs text-muted mt-0.5">
                  <span className="font-mono font-semibold">{selectedInstrument.symbol}</span>
                  <span>•</span>
                  <span className="uppercase">{selectedInstrument.asset_class}</span>
                  {selectedInstrument.isin && (
                    <>
                      <span>•</span>
                      <span className="font-mono">{selectedInstrument.isin}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-muted/10 text-xs">
                <div>
                  <span className="text-muted">Consolidated Qty:</span>
                  <p className="text-base font-bold text-foreground mt-0.5">
                    {selectedInstrument.total_quantity}
                  </p>
                </div>
                <div>
                  <span className="text-muted">Total Invested:</span>
                  <p className="text-base font-bold text-foreground mt-0.5">
                    {formatIndianCurrency(selectedInstrument.total_invested_value)}
                  </p>
                </div>
                <div>
                  <span className="text-muted">Current Market Price:</span>
                  <p className="text-base font-bold text-foreground mt-0.5">
                    {selectedInstrument.current_price !== null
                      ? formatIndianCurrency(selectedInstrument.current_price)
                      : 'Unavailable'}
                  </p>
                </div>
                <div>
                  <span className="text-muted">Valued Market Total:</span>
                  <p className="text-base font-bold text-brand-500 mt-0.5">
                    {selectedInstrument.current_value !== null
                      ? formatIndianCurrency(selectedInstrument.current_value)
                      : 'Unpriced'}
                  </p>
                </div>
              </div>

              {/* Broker Breakdown */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Broker Holdings Distribution ({selectedInstrument.broker_count} account{selectedInstrument.broker_count > 1 ? 's' : ''}):
                </p>
                <div className="space-y-2">
                  {selectedInstrument.contributions.map((c) => (
                    <div
                      key={c.holding_id}
                      className="p-3 rounded-lg border border-border bg-surface text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground">{c.broker_name}</span>
                        <span className="font-semibold text-brand-500">
                          {c.share_of_instrument_pct.toFixed(1)}% of total
                        </span>
                      </div>
                      <div className="flex justify-between text-muted text-[11px]">
                        <span>Quantity: {c.quantity}</span>
                        <span>Avg Buy: {formatIndianCurrency(c.avg_buy_price)}</span>
                        <span>Invested: {formatIndianCurrency(c.invested_value)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button onClick={() => setSelectedInstrument(null)} className="btn-secondary text-xs py-2 px-4">
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
