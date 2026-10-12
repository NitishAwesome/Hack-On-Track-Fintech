'use client';

// ============================================================
// FINOVA — Innovation One: Investment X-Ray 2.0
// app/(dashboard)/analysis/page.tsx
//
// Complete, professional, interactive portfolio-analysis experience:
// 1. Portfolio Health Overview (Valued-subset P&L, deterministic metrics, coverage warnings)
// 2. Interactive Asset Allocation Chart (Recharts Donut, filterable holdings, 100% equity handling)
// 3. Sector Analysis (Sector Donut, horizontal Sector Bar Chart, interactive breakdown cards)
// 4. Diversification & Concentration (Top 1/2/3/5, HHI meter, single-broker notice vs multi-broker overlap)
// 5. Portfolio Risk Breakdown (canonical risk score synchronized with Risk Radar)
// 6. Holding-Level X-Ray (responsive filterable/searchable table & cards)
// 7. Holding Deep Dive Modal with Evidence-Based Stock Outlook (Marketaux, GDELT, NewsData.io)
// 8. "Your Portfolio Explained" (deterministic synthesis + educational AI drawer)
// 9. Prioritized Risk-Reduction Action Plan (contextual non-executing steps)
// 10. Data Completeness & Methodology Radar (quote coverage, freshness, disclaimer)
// ============================================================

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Layers,
  RefreshCw,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react';
import { SkeletonCard } from '@/components/shared/Skeletons';
import { EmptyState } from '@/components/shared/EmptyState';
import type {
  UnifiedXRayAnalysis,
  ConsolidatedInstrumentExposure,
} from '@/lib/calculations/xray';

// Sub-components
import { PortfolioHealthSection } from '@/components/analysis/PortfolioHealthSection';
import { AssetAllocationSection } from '@/components/analysis/AssetAllocationSection';
import { SectorAnalysisSection } from '@/components/analysis/SectorAnalysisSection';
import { DiversificationConcentrationSection } from '@/components/analysis/DiversificationConcentrationSection';
import { RiskOverviewSection } from '@/components/analysis/RiskOverviewSection';
import { HoldingsXRayTable } from '@/components/analysis/HoldingsXRayTable';
import { HoldingDetailModal } from '@/components/analysis/HoldingDetailModal';
import { PortfolioExplanationSection } from '@/components/analysis/PortfolioExplanationSection';
import { RiskReductionActionPlan } from '@/components/analysis/RiskReductionActionPlan';
import { DataCompletenessSection } from '@/components/analysis/DataCompletenessSection';

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

  // Cross-component filter states
  const [selectedAssetClassFilter, setSelectedAssetClassFilter] = useState<string>('all');
  const [selectedSectorFilter, setSelectedSectorFilter] = useState<string>('all');

  // Holding detail modal state
  const [selectedInstrument, setSelectedInstrument] =
    useState<ConsolidatedInstrumentExposure | null>(null);

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

  const { summary } = data;

  return (
    <div className="page-container space-y-7">
      {/* 1. Header & Quick Controls */}
      <div
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5"
        style={{ borderColor: 'rgb(var(--border))' }}
      >
        <div>
          <div className="flex items-center gap-2">
            <h1
              className="text-2xl font-bold tracking-tight"
              style={{ color: 'rgb(var(--foreground))' }}
            >
              Investment X-Ray
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-brand-500/10 text-brand-500 border border-brand-500/20">
              Portfolio Intelligence &amp; Risk Outlook
            </span>
          </div>
          <p className="text-sm mt-1 text-muted">
            Consolidated exposure across {summary.tracked_brokers_count} broker account{summary.tracked_brokers_count !== 1 ? 's' : ''}. Verified deterministic calculations with zero fabricated data.
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

      {/* 2. Section 1: Portfolio Health Overview */}
      <PortfolioHealthSection data={data} />

      {/* 3. Section 2: Interactive Asset Allocation Chart */}
      <AssetAllocationSection
        data={data}
        selectedAssetClassFilter={selectedAssetClassFilter}
        onSelectAssetClass={(ac) => {
          setSelectedAssetClassFilter(ac);
        }}
      />

      {/* 4. Section 3: Sector Analysis (Major Feature) */}
      <SectorAnalysisSection
        data={data}
        selectedSectorFilter={selectedSectorFilter}
        onSelectSector={(s) => {
          setSelectedSectorFilter(s);
        }}
        onOpenInstrumentDetail={(symbol) => {
          const match = data.consolidated_instruments.find(
            (inst) => inst.symbol.toUpperCase() === symbol.toUpperCase()
          );
          if (match) setSelectedInstrument(match);
        }}
      />

      {/* 5. Section 4: Diversification & Concentration Intelligence */}
      <DiversificationConcentrationSection
        data={data}
        onSelectInstrument={(inst) => setSelectedInstrument(inst)}
      />

      {/* 6. Section 5: Portfolio Risk Overview (Unified with Risk Radar) */}
      <RiskOverviewSection data={data} />

      {/* 7. Section 6: Holding-Level X-Ray Table */}
      <HoldingsXRayTable
        data={data}
        selectedAssetClassFilter={selectedAssetClassFilter}
        selectedSectorFilter={selectedSectorFilter}
        onSelectAssetClass={setSelectedAssetClassFilter}
        onSelectSector={setSelectedSectorFilter}
        onViewDetailedAnalysis={(inst) => setSelectedInstrument(inst)}
      />

      {/* 8. Section 8: Your Portfolio Explained */}
      <PortfolioExplanationSection data={data} />

      {/* 9. Section 9: Prioritized Risk-Reduction Action Plan */}
      <RiskReductionActionPlan data={data} />

      {/* 10. Section 10: Data Completeness & Market Freshness */}
      <DataCompletenessSection data={data} />

      {/* 11. Modal: Holding Deep Dive & Evidence-Based Outlook */}
      <HoldingDetailModal
        instrument={selectedInstrument}
        onClose={() => setSelectedInstrument(null)}
      />
    </div>
  );
}
