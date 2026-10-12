'use client';

// ============================================================
// FINOVA — Portfolio Risk Overview Section (Unified with Risk Radar)
// components/analysis/RiskOverviewSection.tsx
// ============================================================

import React from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Info,
  AlertTriangle,
} from 'lucide-react';
import type { UnifiedXRayAnalysis } from '@/lib/calculations/xray';

interface RiskOverviewSectionProps {
  data: UnifiedXRayAnalysis;
}

export function RiskOverviewSection({ data }: RiskOverviewSectionProps) {
  const { summary, data_quality } = data;

  // Determine risk tone and label
  const isConservative = summary.risk_label === 'Conservative';
  const isModerate = summary.risk_label === 'Moderate';

  const riskBadgeClass = isConservative
    ? 'bg-gain/10 text-gain border-gain/20'
    : isModerate
    ? 'bg-warning/10 text-warning border-warning/20'
    : 'bg-loss/10 text-loss border-loss/20';

  const classificationLabel = isConservative
    ? 'Lower Observed Concentration Risk'
    : isModerate
    ? 'Moderate Observed Concentration Risk'
    : 'Higher Observed Concentration Risk';

  // Construct explanation based on actual facts
  const explanationPoints: string[] = [];

  if (summary.top_holding_weight > 40) {
    explanationPoints.push(
      `Elevated single-stock concentration: your largest holding accounts for ${summary.top_holding_weight.toFixed(1)}% of your valued portfolio.`
    );
  } else if (summary.top_holding_weight > 20) {
    explanationPoints.push(
      `Moderate single-stock concentration: your top holding represents ${summary.top_holding_weight.toFixed(1)}% of valued capital.`
    );
  } else {
    explanationPoints.push(
      `Balanced single-stock allocation: your top holding is capped at ${summary.top_holding_weight.toFixed(1)}%.`
    );
  }

  if (summary.top_asset_class_weight >= 95) {
    explanationPoints.push(
      `High asset-class concentration: ${summary.top_asset_class_weight.toFixed(1)}% of capital is deployed into a single asset category (${summary.top_asset_class}).`
    );
  }

  if (summary.top_sector && summary.top_sector_weight >= 40) {
    explanationPoints.push(
      `Industry concentration: the ${summary.top_sector} sector represents ${summary.top_sector_weight.toFixed(1)}% of your investments.`
    );
  }

  if (!data_quality.is_fully_reliable) {
    explanationPoints.push(
      `Data uncertainty observed: ${data_quality.freshness_note}`
    );
  }

  return (
    <div className="card p-5 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-foreground">
              Portfolio Risk Intelligence
            </h2>
            <span className={`text-[11px] px-2 py-0.5 rounded font-semibold border ${riskBadgeClass}`}>
              {classificationLabel}
            </span>
          </div>
          <p className="text-xs text-muted mt-0.5">
            Synchronized with FINOVA Risk Radar using the canonical risk-scoring methodology.
          </p>
        </div>

        <Link
          href="/radar"
          className="text-xs font-semibold text-brand-500 hover:underline inline-flex items-center gap-1.5 self-start sm:self-auto"
        >
          <span>Open Full Risk Radar</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Main Score Bar & Drivers */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Score Column */}
        <div className="lg:col-span-5 p-4 rounded-xl border border-border bg-surface/50 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted font-medium">Risk Screening Score</span>
            <span className="text-xs font-mono font-bold text-muted">0 (Min) – 100 (Max)</span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-mono text-foreground">
              {summary.risk_score}
            </span>
            <span className="text-sm font-semibold text-muted">/ 100</span>
            <span className={`ml-auto text-xs px-2 py-0.5 rounded font-semibold border ${riskBadgeClass}`}>
              {summary.risk_label}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-muted/20 h-2.5 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isConservative ? 'bg-gain' : isModerate ? 'bg-warning' : 'bg-loss'
              }`}
              style={{ width: `${Math.min(Math.max(summary.risk_score, 5), 100)}%` }}
            />
          </div>

          <p className="text-[11px] text-muted leading-relaxed">
            Deterministic evaluation derived from asset concentration, HHI dispersion, sector dominance, and pricing reliability.
          </p>
        </div>

        {/* Contributing Factors Breakdown on Right */}
        <div className="lg:col-span-7 space-y-2.5">
          <h3 className="text-xs font-bold text-muted uppercase tracking-wider">
            Key Contributing Observations
          </h3>

          <div className="space-y-2 text-xs">
            {explanationPoints.map((point, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-lg border border-border/80 bg-surface/30 flex items-start gap-2.5"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-brand-500 flex-shrink-0 mt-0.5" />
                <span className="text-foreground leading-relaxed">{point}</span>
              </div>
            ))}
          </div>

          <div className="p-3 rounded-xl bg-surface border border-border text-[11px] text-muted leading-relaxed flex items-start gap-2">
            <Info className="w-3.5 h-3.5 text-muted flex-shrink-0 mt-0.5" />
            <span>
              <span className="font-semibold text-foreground">Important Distinction:</span> Broker-account distribution indicates where your assets are held, not diversification across market risk factors. Screening scores indicate observable structural exposure, not personal financial suitability or safety.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
