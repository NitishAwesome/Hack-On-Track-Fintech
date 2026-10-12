'use client';

// ============================================================
// FINOVA — Portfolio Health Overview Section
// components/analysis/PortfolioHealthSection.tsx
// ============================================================

import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Info,
} from 'lucide-react';
import { formatIndianCurrency, formatPercent } from '@/lib/utils';
import type { UnifiedXRayAnalysis } from '@/lib/calculations/xray';

interface PortfolioHealthSectionProps {
  data: UnifiedXRayAnalysis;
}

export function PortfolioHealthSection({ data }: PortfolioHealthSectionProps) {
  const { summary, data_quality, asset_class_breakdown, sector_breakdown } = data;

  const assetClassCount = asset_class_breakdown.filter((a) => a.invested_value > 0).length;
  const classifiedSectorCount = sector_breakdown.filter((s) => s.is_classified).length;

  // Determine risk badge tone
  const riskToneClass =
    summary.risk_label === 'Conservative'
      ? 'bg-gain/10 text-gain border-gain/20'
      : summary.risk_label === 'Moderate'
      ? 'bg-warning/10 text-warning border-warning/20'
      : 'bg-loss/10 text-loss border-loss/20';

  const riskScreeningLabel =
    summary.risk_label === 'Conservative'
      ? 'Lower observed risk'
      : summary.risk_label === 'Moderate'
      ? 'Moderate observed risk'
      : 'Higher observed risk';

  return (
    <div className="space-y-4">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* 1. Invested Capital */}
        <div className="card p-4 flex flex-col justify-between">
          <p className="text-xs text-muted">Total Invested Capital</p>
          <div className="mt-2">
            <p className="text-xl font-bold text-foreground font-mono">
              {formatIndianCurrency(summary.total_invested_capital)}
            </p>
            <p className="text-[11px] text-muted mt-0.5">Known cost basis</p>
          </div>
        </div>

        {/* 2. Valued Market Capital */}
        <div className="card p-4 flex flex-col justify-between">
          <p className="text-xs text-muted">Market-Valued Capital</p>
          <div className="mt-2">
            <p className="text-xl font-bold text-foreground font-mono">
              {summary.market_valued_capital !== null
                ? formatIndianCurrency(summary.market_valued_capital)
                : 'Unavailable'}
            </p>
            <p className="text-[11px] text-muted mt-0.5">
              {summary.priced_positions_count} of {summary.total_positions_count} quoted
            </p>
          </div>
        </div>

        {/* 3. Unrealized P&L */}
        <div className="card p-4 flex flex-col justify-between">
          <p className="text-xs text-muted">Unrealized P&L</p>
          <div className="mt-2">
            {summary.valued_subset_unrealized_pnl !== null ? (
              <div className="flex flex-col">
                <div className="flex items-baseline gap-1">
                  <span
                    className={`text-xl font-bold font-mono ${
                      summary.valued_subset_unrealized_pnl >= 0 ? 'text-gain' : 'text-loss'
                    }`}
                  >
                    {summary.valued_subset_unrealized_pnl >= 0 ? '+' : ''}
                    {formatIndianCurrency(summary.valued_subset_unrealized_pnl)}
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span
                    className={`text-xs font-semibold ${
                      summary.valued_subset_unrealized_pnl >= 0 ? 'text-gain' : 'text-loss'
                    }`}
                  >
                    {formatPercent(summary.valued_subset_unrealized_pnl_pct || 0)}
                  </span>
                  <span className="text-[10px] text-muted">
                    {summary.is_valuation_complete ? 'total' : 'on valued'}
                  </span>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm font-semibold text-muted">Quotes unavailable</p>
                <p className="text-[11px] text-muted mt-0.5">Cannot compute P&L</p>
              </div>
            )}
          </div>
        </div>

        {/* 4. Active Holdings & Unique Instruments */}
        <div className="card p-4 flex flex-col justify-between">
          <p className="text-xs text-muted">Active Holdings</p>
          <div className="mt-2">
            <p className="text-2xl font-bold text-foreground">
              {summary.distinct_instruments_count}
            </p>
            <p className="text-[11px] text-muted mt-0.5">
              {summary.total_positions_count} open position{summary.total_positions_count !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* 5. Largest Holding Weight */}
        <div className="card p-4 flex flex-col justify-between">
          <p className="text-xs text-muted">Largest Position</p>
          <div className="mt-2">
            <p className="text-2xl font-bold text-brand-500 font-mono">
              {summary.top_holding_weight.toFixed(1)}%
            </p>
            <p className="text-[11px] text-muted mt-0.5 truncate" title={summary.top_holding_name}>
              {summary.top_holding_symbol || 'N/A'}
            </p>
          </div>
        </div>

        {/* 6. Portfolio Risk Screening */}
        <div className="card p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted">Risk Screening</p>
            <ShieldAlert className="w-3.5 h-3.5 text-muted" />
          </div>
          <div className="mt-2">
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-bold text-foreground font-mono">
                {summary.risk_score}
              </span>
              <span className="text-xs text-muted font-normal">/ 100</span>
            </div>
            <span
              className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${riskToneClass}`}
            >
              {riskScreeningLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Summary Narrative Banner */}
      <div className="p-3.5 rounded-xl bg-surface border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-2.5 text-xs">
          <Info className="w-4 h-4 text-brand-500 flex-shrink-0 mt-0.5" />
          <p className="text-foreground leading-relaxed">
            Your portfolio contains{' '}
            <span className="font-semibold text-brand-500">{summary.distinct_instruments_count}</span>{' '}
            investments across{' '}
            <span className="font-semibold text-brand-500">{assetClassCount}</span> asset class
            {assetClassCount !== 1 ? 'es' : ''} and{' '}
            <span className="font-semibold text-brand-500">{classifiedSectorCount}</span> classified sector
            {classifiedSectorCount !== 1 ? 's' : ''}. Your largest holding represents{' '}
            <span className="font-semibold text-brand-500">
              {summary.top_holding_weight.toFixed(1)}%
            </span>{' '}
            of the valued portfolio.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-shrink-0">
          <span
            className={`px-2 py-1 rounded-md text-[11px] font-medium border flex items-center gap-1 ${
              data_quality.unquoted_positions === 0
                ? 'bg-gain/10 text-gain border-gain/20'
                : 'bg-warning/10 text-warning border-warning/20'
            }`}
          >
            {data_quality.unquoted_positions === 0 ? (
              <CheckCircle2 className="w-3 h-3" />
            ) : (
              <AlertTriangle className="w-3 h-3" />
            )}
            <span>{summary.quote_coverage_pct}% quote coverage</span>
          </span>

          {data_quality.stale_quotes_count > 0 && (
            <span className="px-2 py-1 rounded-md text-[11px] font-medium border bg-warning/10 text-warning border-warning/20 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{data_quality.stale_quotes_count} stale quote{data_quality.stale_quotes_count !== 1 ? 's' : ''}</span>
            </span>
          )}
        </div>
      </div>

      {/* Honest Partial Valuation Warning (Phase 1.1) */}
      {!summary.is_valuation_complete && (
        <div className="p-3.5 rounded-xl bg-warning/5 border border-warning/30 flex items-start gap-3 text-xs">
          <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-warning">
              {summary.valuation_completeness_message}
            </p>
            <p className="text-muted mt-0.5">
              To preserve mathematical integrity, unrealized P&amp;L is calculated by comparing market-valued positions strictly against their own purchase cost basis ({formatIndianCurrency(summary.valued_subset_invested_capital)}), rather than subtracting unquoted positions.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
