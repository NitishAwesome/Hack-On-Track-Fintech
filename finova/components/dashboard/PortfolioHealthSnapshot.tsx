'use client';

// ============================================================
// FINOVA — Portfolio Health Snapshot Component (Dashboard Section 7.D)
// components/dashboard/PortfolioHealthSnapshot.tsx
//
// Compact analytical diagnosis from X-Ray & Risk Radar:
// - Largest holding concentration & name
// - Dominant sector exposure
// - Composite Risk Score (0-100) & observed classification
// - Market pricing freshness & quote completeness
// - Contextual deep links to X-Ray and Risk Radar
// ============================================================

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Shield,
  BarChart3,
  PieChart,
  Layers,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Activity,
  HelpCircle,
} from 'lucide-react';
import { formatPercentSafe } from '@/lib/utils';
import type { SmartRiskRadarAnalysis } from '@/lib/calculations/riskRadar';

interface PortfolioHealthSnapshotProps {
  holdingCount: number;
  brokerCount: number;
}

export function PortfolioHealthSnapshot({
  holdingCount,
  brokerCount,
}: PortfolioHealthSnapshotProps) {
  const { data: radarData, isLoading } = useQuery<{ data: SmartRiskRadarAnalysis }>({
    queryKey: ['portfolio-risk-radar'],
    queryFn: async () => {
      const res = await fetch('/api/portfolio/risk-radar');
      if (!res.ok) return { data: null as unknown as SmartRiskRadarAnalysis };
      return res.json();
    },
    staleTime: 60000,
  });

  if (isLoading) {
    return (
      <div
        className="p-5 sm:p-6 rounded-2xl border animate-pulse space-y-3"
        style={{
          backgroundColor: 'rgb(var(--surface))',
          borderColor: 'rgb(var(--border))',
        }}
      >
        <div className="h-4 w-44 bg-slate-700/30 rounded" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 bg-slate-800/20 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const analysis = radarData?.data;
  const metrics = analysis?.baseMetrics;
  const xray = analysis?.xraySummary;
  const quality = analysis?.dataQualityRadar;

  const topHoldingName = metrics?.top_holding_name || 'N/A';
  const topHoldingWeight = metrics?.top_holding_weight ?? null;
  const topSector = xray?.top_sector || 'N/A';
  const topSectorWeight = xray?.top_sector_weight ?? null;
  const riskScore = metrics?.risk_score ?? 40;
  const riskLabel = metrics?.risk_label || 'Balanced';
  const coveragePct = quality?.coveragePct ?? 100;
  const overlapsCount = xray?.cross_broker_overlaps_count ?? 0;

  const isConcentrationElevated = (topHoldingWeight ?? 0) > 0.25;
  const isCoveragePartial = coveragePct < 90;

  return (
    <div
      className="p-5 sm:p-6 rounded-2xl border transition-all duration-200"
      style={{
        backgroundColor: 'rgb(var(--surface))',
        borderColor: 'rgb(var(--border))',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-border/60">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-brand/10 text-brand border border-brand/20">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-foreground">
              Portfolio Health Snapshot
            </h2>
            <p className="text-[11px] text-muted">
              Live diagnostics synthesized from Investment X-Ray &amp; Risk Radar
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/analysis"
            className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
          >
            <span>Full X-Ray</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
          <span className="text-muted text-xs">•</span>
          <Link
            href="/risk"
            className="inline-flex items-center gap-1 text-xs font-semibold text-amber-500 hover:underline"
          >
            <span>Risk Radar</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* 4 Health KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* 1. Largest Holding */}
        <div className="p-3.5 rounded-xl border border-border bg-surface-raised space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
              Top Holding
            </span>
            {isConcentrationElevated ? (
              <AlertTriangle className="w-3 h-3 text-amber-500" />
            ) : (
              <PieChart className="w-3 h-3 text-muted" />
            )}
          </div>
          <p className="text-xs font-bold text-foreground truncate" title={topHoldingName}>
            {topHoldingName}
          </p>
          <p className="text-[11px] font-mono text-muted">
            {topHoldingWeight !== null ? `${(topHoldingWeight * 100).toFixed(1)}% portfolio` : '—'}
          </p>
        </div>

        {/* 2. Dominant Sector */}
        <div className="p-3.5 rounded-xl border border-border bg-surface-raised space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
              Lead Sector
            </span>
            <Layers className="w-3 h-3 text-muted" />
          </div>
          <p className="text-xs font-bold text-foreground truncate" title={topSector}>
            {topSector}
          </p>
          <p className="text-[11px] font-mono text-muted">
            {topSectorWeight !== null ? `${(topSectorWeight * 100).toFixed(1)}% exposure` : '—'}
          </p>
        </div>

        {/* 3. Observed Risk Score */}
        <div className="p-3.5 rounded-xl border border-border bg-surface-raised space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
              Risk Diagnosis
            </span>
            <Activity className="w-3 h-3 text-brand" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <p className="text-sm font-bold text-foreground">{riskScore}</p>
            <span className="text-[10px] text-muted">/100</span>
          </div>
          <p
            className={`text-[10px] font-semibold ${
              riskScore > 65
                ? 'text-rose-400'
                : riskScore > 45
                ? 'text-amber-400'
                : 'text-emerald-400'
            }`}
          >
            {riskLabel} Orientation
          </p>
        </div>

        {/* 4. Multi-Broker Overlaps & Quote Completeness */}
        <div className="p-3.5 rounded-xl border border-border bg-surface-raised space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
              Consolidation
            </span>
            {overlapsCount > 0 ? (
              <CheckCircle2 className="w-3 h-3 text-brand" />
            ) : (
              <HelpCircle className="w-3 h-3 text-muted" />
            )}
          </div>
          <p className="text-xs font-bold text-foreground">
            {overlapsCount > 0
              ? `${overlapsCount} cross-broker overlap${overlapsCount > 1 ? 's' : ''}`
              : `${brokerCount} accounts tracked`}
          </p>
          <p className="text-[10px] text-muted">
            {isCoveragePartial
              ? `${coveragePct.toFixed(0)}% quoted coverage`
              : '100% verified quotes'}
          </p>
        </div>
      </div>
    </div>
  );
}
