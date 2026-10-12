'use client';

// ============================================================
// FINOVA — Diversification & Concentration Section
// components/analysis/DiversificationConcentrationSection.tsx
// ============================================================

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  Building2,
  CheckCircle2,
  Info,
  ArrowRight,
} from 'lucide-react';
import { formatIndianCurrency } from '@/lib/utils';
import type {
  UnifiedXRayAnalysis,
  ConsolidatedInstrumentExposure,
} from '@/lib/calculations/xray';

interface DiversificationConcentrationSectionProps {
  data: UnifiedXRayAnalysis;
  onSelectInstrument?: (instrument: ConsolidatedInstrumentExposure) => void;
  onAskAi?: (topic: string, question: string) => void;
}

export function DiversificationConcentrationSection({
  data,
  onSelectInstrument,
  onAskAi,
}: DiversificationConcentrationSectionProps) {
  const { summary, overlaps, consolidated_instruments } = data;

  // Top individual holdings for horizontal bar chart (Top 5 or all if fewer)
  const topHoldings = consolidated_instruments.slice(0, 5).map((inst) => ({
    name: inst.symbol || inst.name,
    fullName: inst.name,
    weight: Number(inst.percentage_of_valued_portfolio.toFixed(1)),
    value: inst.current_value,
    canonical_key: inst.canonical_key,
    inst,
  }));

  // HHI meter percentage for 0 to 10000 range
  const hhiProgress = Math.min(Math.max((summary.hhi / 10000) * 100, 2), 100);

  // HHI Badge styling
  const hhiBadgeClass =
    summary.hhi_label === 'Low Concentration'
      ? 'bg-gain/10 text-gain border-gain/20'
      : summary.hhi_label === 'Moderate Concentration'
      ? 'bg-warning/10 text-warning border-warning/20'
      : 'bg-loss/10 text-loss border-loss/20';

  const isSmallPortfolio = summary.distinct_instruments_count <= 4;

  return (
    <div className="card p-5 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-foreground">
              Diversification &amp; Concentration Intelligence
            </h2>
            <span className={`text-[11px] px-2 py-0.5 rounded font-semibold border ${hhiBadgeClass}`}>
              {summary.hhi_label}
            </span>
          </div>
          <p className="text-xs text-muted mt-0.5">
            Empirical distribution analysis across holdings, asset classes, and brokerage accounts.
          </p>
        </div>

        {onAskAi && (
          <button
            onClick={() =>
              onAskAi('concentration', 'How concentrated is my portfolio and what does HHI mean?')
            }
            className="text-xs font-semibold inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-brand-500/30 bg-brand-500/10 text-brand-600 dark:text-brand-400 hover:bg-brand-500/20 transition-colors self-start sm:self-auto"
          >
            <span>Ask AI: Explain Concentration</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Grid: Concentration Metrics & HHI on Left, Top Holdings Chart on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Top Holdings Concentration KPI Cards & HHI Index */}
        <div className="lg:col-span-6 space-y-4">
          <h3 className="text-xs font-bold text-muted uppercase tracking-wider">
            Cumulative Exposure Breakdown
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl border border-border bg-surface/50">
              <span className="text-[11px] text-muted">Top 1 Holding</span>
              <p className="text-lg font-bold font-mono text-brand-500 mt-1">
                {summary.top_holding_weight.toFixed(1)}%
              </p>
              <p className="text-[10px] text-muted truncate mt-0.5" title={summary.top_holding_name}>
                {summary.top_holding_symbol || 'N/A'}
              </p>
            </div>

            <div className="p-3 rounded-xl border border-border bg-surface/50">
              <span className="text-[11px] text-muted">Top 2 Holdings</span>
              <p className="text-lg font-bold font-mono text-foreground mt-1">
                {summary.top_2_holdings_weight.toFixed(1)}%
              </p>
              <p className="text-[10px] text-muted mt-0.5">Combined weight</p>
            </div>

            <div className="p-3 rounded-xl border border-border bg-surface/50">
              <span className="text-[11px] text-muted">Top 3 Holdings</span>
              <p className="text-lg font-bold font-mono text-foreground mt-1">
                {summary.top_3_holdings_weight.toFixed(1)}%
              </p>
              <p className="text-[10px] text-muted mt-0.5">Combined weight</p>
            </div>
          </div>

          {/* Show Top 5 only if portfolio has > 4 holdings (Phase 6 Edge Case) */}
          {!isSmallPortfolio && (
            <div className="p-3 rounded-xl border border-border bg-surface/30 flex items-center justify-between text-xs">
              <span className="text-muted">Top 5 Holdings Cumulative Weight:</span>
              <span className="font-mono font-bold text-foreground">
                {summary.top_5_holdings_weight.toFixed(1)}%
              </span>
            </div>
          )}

          {/* HHI Concentration Index Meter */}
          <div className="p-4 rounded-xl border border-border bg-surface/40 space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-foreground">Herfindahl-Hirschman Index (HHI)</span>
                <p className="text-[11px] text-muted mt-0.5">
                  Economic concentration metric (0 to 10,000)
                </p>
              </div>
              <div className="text-right">
                <span className="text-base font-bold font-mono text-foreground">
                  {summary.hhi}
                </span>
                <span className="text-xs text-muted"> / 10,000</span>
              </div>
            </div>

            {/* Meter Bar */}
            <div className="w-full bg-muted/20 h-2 rounded-full overflow-hidden relative">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  summary.hhi < 1500
                    ? 'bg-gain'
                    : summary.hhi <= 2500
                    ? 'bg-warning'
                    : 'bg-loss'
                }`}
                style={{ width: `${hhiProgress}%` }}
              />
            </div>

            <div className="flex justify-between text-[10px] text-muted pt-0.5">
              <span>0 (Diverse)</span>
              <span>1,500 (Moderate threshold)</span>
              <span>2,500 (High concentration)</span>
              <span>10,000 (Monopoly)</span>
            </div>

            <p className="text-[11px] text-muted leading-relaxed pt-1 border-t border-border/40">
              <span className="font-semibold text-foreground">Plain-Language Context:</span> A higher concentration index means more of your portfolio depends on fewer holdings. HHI measures structural concentration and is not a forecast of loss.
            </p>
          </div>
        </div>

        {/* Right Column: Horizontal Top Holdings Bar Chart */}
        <div className="lg:col-span-6 space-y-2">
          <h3 className="text-xs font-bold text-muted uppercase tracking-wider">
            Top Holdings Weight Ranking
          </h3>

          <ResponsiveContainer width="100%" height={Math.max(topHoldings.length * 44, 200)}>
            <BarChart
              data={topHoldings}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
            >
              <XAxis
                type="number"
                domain={[0, 100]}
                unit="%"
                tick={{ fill: 'rgb(var(--muted))', fontSize: 10 }}
                stroke="rgb(var(--border))"
              />
              <YAxis
                type="category"
                dataKey="name"
                width={70}
                tick={{ fill: 'rgb(var(--foreground))', fontSize: 11, fontWeight: 'bold' }}
                stroke="transparent"
              />
              <Tooltip
                cursor={false}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const item = payload[0].payload as typeof topHoldings[0];
                  return (
                    <div className="p-2.5 text-xs rounded-xl shadow-xl border border-border bg-surface-raised/95 backdrop-blur-md">
                      <p className="font-bold text-foreground">{item.fullName}</p>
                      <p className="font-financial text-brand font-semibold mt-0.5">
                        {item.weight}% of valued portfolio
                      </p>
                      {item.value !== null && (
                        <p className="text-[11px] text-muted font-financial mt-0.5">
                          {formatIndianCurrency(item.value)}
                        </p>
                      )}
                    </div>
                  );
                }}
              />
              <Bar
                dataKey="weight"
                radius={[0, 4, 4, 0]}
                onClick={(entry) => {
                  if (onSelectInstrument && entry.inst) {
                    onSelectInstrument(entry.inst);
                  }
                }}
                className="cursor-pointer"
              >
                {topHoldings.map((entry, index) => (
                  <Cell
                    key={`top-bar-${index}`}
                    fill={index === 0 ? 'rgb(var(--brand-500))' : '#3B82F6'}
                    opacity={1 - index * 0.12}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Cross-Broker Overlap Section (Phase 6 Broker Notice) */}
      <div className="pt-4 border-t border-border space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-brand-500" />
            <h3 className="text-sm font-bold text-foreground">
              Cross-Broker Duplication &amp; Overlap Radar
            </h3>
          </div>

          <span className="text-xs text-muted">
            {summary.tracked_brokers_count} tracked account{summary.tracked_brokers_count !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Case 1: Single Broker Account (Phase 6 Requirement) */}
        {summary.tracked_brokers_count <= 1 ? (
          <div className="p-3.5 rounded-xl bg-surface border border-border flex items-start gap-3 text-xs">
            <Info className="w-4 h-4 text-brand-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-foreground">
                {summary.single_broker_notice ||
                  'Cross-broker overlap cannot be assessed across multiple accounts yet.'}
              </p>
              <p className="text-muted mt-0.5 leading-relaxed">
                You currently have 1 broker account connected. Having no cross-broker duplicate holdings is a consequence of single-account tracking, not verified cross-broker diversification. Add secondary broker accounts to assess real cross-platform duplication.
              </p>
            </div>
          </div>
        ) : overlaps.length === 0 ? (
          /* Case 2: Multiple Brokers with ZERO overlaps */
          <div className="p-3.5 rounded-xl bg-gain/5 border border-gain/20 flex items-start gap-3 text-xs">
            <CheckCircle2 className="w-4 h-4 text-gain flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-foreground">
                No Duplicate Securities Across {summary.tracked_brokers_count} Brokers
              </p>
              <p className="text-muted mt-0.5">
                Every instrument in your portfolio is held within exactly one broker account. There are no duplicate positions fragmenting your capital across platforms.
              </p>
            </div>
          </div>
        ) : (
          /* Case 3: Multiple Brokers with confirmed duplicate securities */
          <div className="space-y-3">
            <p className="text-xs text-muted">
              FINOVA identified{' '}
              <span className="font-semibold text-brand-500">
                {overlaps.length} security overlap{overlaps.length === 1 ? '' : 's'}
              </span>{' '}
              representing{' '}
              <span className="font-semibold text-brand-500">
                {summary.cross_broker_overlap_valued_pct.toFixed(1)}%
              </span>{' '}
              of your valued portfolio across multiple broker accounts:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {overlaps.map((item) => (
                <div
                  key={item.canonical_key}
                  onClick={() => {
                    const match = consolidated_instruments.find(
                      (i) => i.canonical_key === item.canonical_key
                    );
                    if (match && onSelectInstrument) onSelectInstrument(match);
                  }}
                  className="p-3.5 rounded-xl border border-border bg-surface/50 hover:border-brand-500/50 hover:bg-surface cursor-pointer transition-all space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">{item.name}</p>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted font-mono">
                        <span>{item.symbol}</span>
                        <span>•</span>
                        <span className="uppercase">{item.asset_class}</span>
                      </div>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-brand-500/10 text-brand-500 border border-brand-500/20">
                      {item.broker_count} Brokers
                    </span>
                  </div>

                  <div className="pt-2 border-t border-border/60 text-[11px] space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted">Consolidated Value:</span>
                      <span className="font-mono font-semibold text-foreground">
                        {item.current_value !== null
                          ? formatIndianCurrency(item.current_value)
                          : formatIndianCurrency(item.total_invested_value)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Portfolio Share:</span>
                      <span className="font-mono font-bold text-brand-500">
                        {item.percentage_of_valued_portfolio.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* Broker Breakdown Chips */}
                  <div className="space-y-1 pt-1">
                    {item.brokers_breakdown.map((b) => (
                      <div
                        key={b.broker_account_id}
                        className="flex items-center justify-between text-[10px] px-2 py-0.5 rounded bg-muted/10"
                      >
                        <span className="font-medium text-foreground">{b.broker_name}</span>
                        <span className="text-muted font-mono">
                          {b.quantity} shares ({b.share_of_instrument_pct.toFixed(0)}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
