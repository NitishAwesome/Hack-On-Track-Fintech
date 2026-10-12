'use client';

// ============================================================
// FINOVA — Data Completeness, Freshness & Methodology Section
// components/analysis/DataCompletenessSection.tsx
// ============================================================

import React from 'react';
import { Info } from 'lucide-react';
import type { UnifiedXRayAnalysis } from '@/lib/calculations/xray';

interface DataCompletenessSectionProps {
  data: UnifiedXRayAnalysis;
}

export function DataCompletenessSection({ data }: DataCompletenessSectionProps) {
  const { data_quality, summary } = data;

  const is100Quoted = data_quality.unquoted_positions === 0;

  return (
    <div className="card p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-foreground">
              Data Completeness, Market Freshness &amp; Methodology
            </h2>
            <span
              className={`text-[11px] px-2 py-0.5 rounded font-semibold border ${
                is100Quoted
                  ? 'bg-gain/10 text-gain border-gain/20'
                  : 'bg-warning/10 text-warning border-warning/20'
              }`}
            >
              {is100Quoted
                ? '100% Quote Coverage'
                : `${summary.quote_coverage_pct}% Quoted`}
            </span>
          </div>
          <p className="text-xs text-muted mt-0.5">
            Transparent reporting of market quote availability, quote freshness, and classification completeness.
          </p>
        </div>
      </div>

      {/* Grid of 6 Data Quality Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
        {/* 1. Total Positions */}
        <div className="p-3 rounded-xl border border-border bg-surface/50">
          <span className="text-[11px] text-muted">Total Open Positions</span>
          <p className="text-lg font-bold font-mono text-foreground mt-1">
            {data_quality.total_positions}
          </p>
          <p className="text-[10px] text-muted mt-0.5">Across all brokers</p>
        </div>

        {/* 2. Quoted Positions */}
        <div className="p-3 rounded-xl border border-border bg-surface/50">
          <span className="text-[11px] text-muted">Quoted Holdings</span>
          <p className="text-lg font-bold font-mono text-gain mt-1">
            {data_quality.quoted_positions}
          </p>
          <p className="text-[10px] text-muted mt-0.5">{summary.quote_coverage_pct}% of holdings</p>
        </div>

        {/* 3. Unquoted Holdings */}
        <div className="p-3 rounded-xl border border-border bg-surface/50">
          <span className="text-[11px] text-muted">Unpriced Holdings</span>
          <p
            className={`text-lg font-bold font-mono mt-1 ${
              data_quality.unquoted_positions > 0 ? 'text-warning' : 'text-muted'
            }`}
          >
            {data_quality.unquoted_positions}
          </p>
          <p className="text-[10px] text-muted mt-0.5">Missing live quotes</p>
        </div>

        {/* 4. Stale Quotes */}
        <div className="p-3 rounded-xl border border-border bg-surface/50">
          <span className="text-[11px] text-muted">Stale / Outdated Quotes</span>
          <p
            className={`text-lg font-bold font-mono mt-1 ${
              data_quality.stale_quotes_count > 0 ? 'text-warning' : 'text-muted'
            }`}
          >
            {data_quality.stale_quotes_count}
          </p>
          <p className="text-[10px] text-muted mt-0.5">&gt; 3 market days old</p>
        </div>

        {/* 5. Positions Without ISIN */}
        <div className="p-3 rounded-xl border border-border bg-surface/50">
          <span className="text-[11px] text-muted">Missing ISIN</span>
          <p className="text-lg font-bold font-mono text-foreground mt-1">
            {data_quality.positions_without_isin}
          </p>
          <p className="text-[10px] text-muted mt-0.5">Symbol matched only</p>
        </div>

        {/* 6. Unclassified Sector */}
        <div className="p-3 rounded-xl border border-border bg-surface/50">
          <span className="text-[11px] text-muted">Unclassified Sector</span>
          <p className="text-lg font-bold font-mono text-foreground mt-1">
            {data_quality.positions_unclassified_sector}
          </p>
          <p className="text-[10px] text-muted mt-0.5">Awaiting mapping</p>
        </div>
      </div>

      {/* Freshness & Methodology Explanation */}
      <div className="p-3.5 rounded-xl bg-surface border border-border space-y-2 text-xs">
        <div className="flex items-start gap-2.5">
          <Info className="w-4 h-4 text-brand-500 flex-shrink-0 mt-0.5" />
          <div className="space-y-1 text-muted leading-relaxed">
            <p>
              <span className="font-semibold text-foreground">Market-Data Freshness Policy:</span>{' '}
              {data_quality.freshness_note} Market closure over weekends and holidays is recognized appropriately: an officially confirmed previous closing price is valid and not marked as stale.
            </p>
            <p>
              <span className="font-semibold text-foreground">Mathematical Integrity Rule:</span> Unrealized gains and losses are evaluated strictly over the compatible subset of priced positions. FINOVA never compares whole-portfolio cost basis against partial market values, nor does it silently substitute zero for a missing market price.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
