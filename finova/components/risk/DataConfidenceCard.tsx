'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldCheck, AlertTriangle, ExternalLink } from 'lucide-react';
import type { UnifiedXRayAnalysis } from '@/lib/calculations/xray';

interface DataConfidenceCardProps {
  dataQuality: UnifiedXRayAnalysis['data_quality'];
  summary: UnifiedXRayAnalysis['summary'];
}

export function DataConfidenceCard({ dataQuality, summary }: DataConfidenceCardProps) {
  const isFullyReliable = dataQuality.is_fully_reliable;
  const hasUnpriced = dataQuality.unquoted_positions > 0;
  const hasStale = dataQuality.stale_quotes_count > 0;
  const hasMissingCostBasis = dataQuality.positions_without_cost_basis > 0;

  return (
    <div className="card p-5 space-y-4 border border-border">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-brand-500" />
          <div>
            <h3 className="text-base font-bold text-foreground">
              Data Completeness &amp; Valuation Confidence Radar
            </h3>
            <p className="text-xs text-muted mt-0.5">
              Honest disclosure of price coverage, quote freshness, and cost basis completeness.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold border ${
              isFullyReliable
                ? 'bg-gain/10 text-gain border-gain/20'
                : 'bg-warning/10 text-warning border-warning/20'
            }`}
          >
            {isFullyReliable ? '100% Verified Reliable' : 'Partial Data Limitations Detected'}
          </span>

          <Link
            href="/investments"
            className="text-xs font-semibold text-brand-500 hover:underline inline-flex items-center gap-1 ml-2"
          >
            <span>Manage Holdings</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Freshness & Completeness Narrative */}
      <p className="text-xs text-muted leading-relaxed">
        {dataQuality.freshness_note}
      </p>

      {/* Audit Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs pt-1">
        <div className="p-3 rounded-lg border border-border/60 bg-muted/5">
          <span className="text-[11px] text-muted">Holdings Tracked</span>
          <p className="text-base font-bold font-mono text-foreground mt-0.5">
            {dataQuality.total_positions}
          </p>
          <span className="text-[10px] text-muted font-mono">{summary.distinct_instruments_count} distinct</span>
        </div>

        <div className="p-3 rounded-lg border border-border/60 bg-muted/5">
          <span className="text-[11px] text-muted">Active Price Quotes</span>
          <p className="text-base font-bold font-mono text-gain mt-0.5">
            {dataQuality.quoted_positions}
          </p>
          <span className="text-[10px] text-gain font-mono">{summary.quote_coverage_pct}% coverage</span>
        </div>

        <div className="p-3 rounded-lg border border-border/60 bg-muted/5">
          <span className="text-[11px] text-muted">Unpriced Positions</span>
          <p className={`text-base font-bold font-mono mt-0.5 ${hasUnpriced ? 'text-warning' : 'text-foreground'}`}>
            {dataQuality.unquoted_positions}
          </p>
          <span className="text-[10px] text-muted">
            {hasUnpriced ? 'Excluded from P&L' : 'Zero unpriced'}
          </span>
        </div>

        <div className="p-3 rounded-lg border border-border/60 bg-muted/5">
          <span className="text-[11px] text-muted">Stale Quotes (&gt;48h)</span>
          <p className={`text-base font-bold font-mono mt-0.5 ${hasStale ? 'text-warning' : 'text-foreground'}`}>
            {dataQuality.stale_quotes_count}
          </p>
          <span className="text-[10px] text-muted">
            {hasStale ? 'Previous close' : 'Active session'}
          </span>
        </div>

        <div className="p-3 rounded-lg border border-border/60 bg-muted/5">
          <span className="text-[11px] text-muted">Missing Sector</span>
          <p className="text-base font-bold font-mono text-foreground mt-0.5">
            {dataQuality.positions_unclassified_sector}
          </p>
          <span className="text-[10px] text-muted">Marked Unclassified</span>
        </div>

        <div className="p-3 rounded-lg border border-border/60 bg-muted/5">
          <span className="text-[11px] text-muted">Missing Cost Basis</span>
          <p className={`text-base font-bold font-mono mt-0.5 ${hasMissingCostBasis ? 'text-warning' : 'text-foreground'}`}>
            {dataQuality.positions_without_cost_basis}
          </p>
          <span className="text-[10px] text-muted">
            {hasMissingCostBasis ? 'Zero purchase price' : 'All recorded'}
          </span>
        </div>
      </div>

      {/* Honest Valuation Denominator Note */}
      {hasUnpriced && (
        <div className="p-3.5 rounded-xl border border-warning/30 bg-warning/5 text-xs text-warning space-y-1">
          <div className="flex items-center gap-1.5 font-bold">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Valued-Subset Concentration Denominator</span>
          </div>
          <p className="text-[11px] text-warning/90 leading-relaxed">
            Because {dataQuality.unquoted_positions} holding(s) lack active market price feeds, concentration percentages are calculated strictly against the reliably priced capital subset rather than guessing market prices.
          </p>
        </div>
      )}
    </div>
  );
}
