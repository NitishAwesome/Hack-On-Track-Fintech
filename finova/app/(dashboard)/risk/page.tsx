'use client';

// ============================================================
// FINOVA — Innovation Two: Smart Risk & Diversification Radar 2.0
// app/(dashboard)/risk/page.tsx
//
// Institutional-grade portfolio risk diagnostics:
// - Single canonical risk calculation unified with Investment X-Ray
// - Explainable, deterministic composite scoring (0–100)
// - Concentration risk (HHI on standard 0–10,000 scale, Top 1/2/3/5)
// - Sector & Asset-Class concentration exposure charts
// - Separation of platform operational custody from market price risk
// - Grounded "Why This Classification?" explanations
// - Prioritized risk-reduction action plan with Future Lab links
// - 6-point Data Quality Radar with honest valued-subset disclosures
// ============================================================

import React, { useState } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { usePrivateQuery as useQuery } from '@/lib/hooks/usePrivateQuery';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  AlertTriangle,
  RefreshCw,
  Layers,
  Sparkles,
  X,
  FlaskConical,
} from 'lucide-react';
import { SkeletonCard } from '@/components/shared/Skeletons';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatIndianCurrency } from '@/lib/utils';
import type { SmartRiskRadarAnalysis } from '@/lib/calculations/riskRadar';

// Subcomponents
import { RiskOverviewCard } from '@/components/risk/RiskOverviewCard';
import { KeyRiskIndicatorsGrid } from '@/components/risk/KeyRiskIndicatorsGrid';
import { ConcentrationRiskChart } from '@/components/risk/ConcentrationRiskChart';
import { SectorRiskChart } from '@/components/risk/SectorRiskChart';
import { AssetClassRiskChart } from '@/components/risk/AssetClassRiskChart';
import { RiskFactorBreakdown } from '@/components/risk/RiskFactorBreakdown';
import { WhyThisClassification } from '@/components/risk/WhyThisClassification';
import { RiskObservationsFeed } from '@/components/risk/RiskObservationsFeed';
import { RiskReductionPlan } from '@/components/risk/RiskReductionPlan';
import { DataConfidenceCard } from '@/components/risk/DataConfidenceCard';

async function fetchRiskRadar(): Promise<SmartRiskRadarAnalysis> {
  const res = await fetch('/api/portfolio/risk-radar');
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to load risk radar analysis');
  }
  const payload = await res.json();
  return payload.data;
}

export default function RiskRadarPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: ['portfolio-risk-radar'],
    queryFn: fetchRiskRadar,
    staleTime: 30000,
  });

  // AI Explainer State
  const [aiTopic, setAiTopic] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);

  async function handleAskAi(topic: string, queryPrompt?: string) {
    setAiTopic(topic);
    setAiLoading(true);
    setAiResponse(null);

    try {
      const res = await fetch('/api/ai/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: topic,
          query: queryPrompt,
          context: {
            topHoldingName: data?.baseMetrics.top_holding_name,
            topHoldingWeight: data?.baseMetrics.top_holding_weight
              ? (data.baseMetrics.top_holding_weight * 100).toFixed(1)
              : undefined,
            overlapCount: data?.xraySummary.cross_broker_overlaps_count,
            overlapValue: data?.xraySummary.cross_broker_overlap_value
              ? formatIndianCurrency(data.xraySummary.cross_broker_overlap_value)
              : undefined,
            unquotedCount: data?.dataQualityRadar.unpricedHoldingsCount,
            quoteCoveragePct: data?.dataQualityRadar.coveragePct,
            riskScore: data?.baseMetrics.risk_score,
            riskLabel: data?.baseMetrics.risk_label,
          },
        }),
      });
      const resJson = await res.json();
      setAiResponse(resJson.explanation || 'Educational analysis currently unavailable.');
    } catch {
      setAiResponse('Unable to contact intelligence engine. Please check connection.');
    } finally {
      setAiLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="page-container space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SkeletonCard lines={6} />
          <SkeletonCard lines={6} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i} lines={3} />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="page-container py-12">
        <EmptyState
          icon={<AlertTriangle className="w-10 h-10 text-loss" />}
          title="Failed to Load Risk Radar"
          description={error instanceof Error ? error.message : 'Please check your connection.'}
          action={
            <button
              onClick={() => queryClient.invalidateQueries({ queryKey: ['portfolio-risk-radar'] })}
              className="btn-secondary text-xs py-2 px-3"
            >
              Retry
            </button>
          }
        />
      </div>
    );
  }

  if (data.dataQualityRadar.totalHoldingsAnalyzed === 0) {
    return (
      <div className="page-container py-12">
        <EmptyState
          icon={<Shield className="w-10 h-10 text-brand-500" />}
          title="Not Assessed — No Active Holdings"
          description="Add holdings across your broker accounts to calculate deterministic concentration and risk radar metrics."
          action={
            <Link href="/investments" className="btn-primary text-xs py-2 px-3">
              Add Holdings
            </Link>
          }
        />
      </div>
    );
  }

  const {
    baseMetrics,
    xraySummary,
    xray,
    observations,
    educationalThresholds,
    dataQualityRadar,
    explanation,
    riskFactorBreakdown,
  } = data;

  return (
    <div className="page-container space-y-6">
      {/* 1. Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Risk Radar
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-brand-500/10 text-brand-500 border border-brand-500/20">
              Deterministic Calculations
            </span>
          </div>
          <p className="text-sm mt-0.5 text-muted">
            Comprehensive concentration math, sector risk, multi-asset diagnostics &amp; explainable observations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['portfolio-risk-radar'] })}
            disabled={isFetching}
            className="btn-secondary text-xs inline-flex items-center gap-1.5 py-2 px-3"
            title="Refresh calculations"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            <span>{isFetching ? 'Refreshing...' : 'Refresh Radar'}</span>
          </button>

          <Link
            href="/future-lab"
            className="btn-secondary text-xs inline-flex items-center gap-1.5 py-2 px-3"
            title="Simulate rebalancing in Future Lab"
          >
            <FlaskConical className="w-3.5 h-3.5 text-purple-700 dark:text-purple-400" />
            <span>Future Lab</span>
          </Link>

          <Link
            href="/analysis"
            className="btn-primary text-xs inline-flex items-center gap-1.5 py-2 px-3"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Open Investment X-Ray</span>
          </Link>
        </div>
      </div>

      {/* AI Educational Q&A Box */}
      <AnimatePresence>
        {aiTopic && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="card p-5 border-brand-500/40 bg-brand-500/5 space-y-3 relative shadow-lg"
          >
            <button
              onClick={() => {
                setAiTopic(null);
                setAiResponse(null);
              }}
              className="absolute top-4 right-4 p-1 text-muted hover:text-foreground"
              title="Close AI explanation"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400 font-semibold text-sm">
              <Sparkles className="w-4 h-4" />
              <span>FINOVA Intelligence Risk Analysis: {aiTopic.replace('_', ' ')}</span>
            </div>

            {aiLoading ? (
              <div className="flex items-center gap-2 text-xs text-muted py-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-brand-500" />
                <span>Formulating grounded risk analysis...</span>
              </div>
            ) : (
              <div className="text-xs text-foreground/90 leading-relaxed whitespace-pre-line">
                {aiResponse}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Portfolio Risk Overview Card */}
      <RiskOverviewCard
        baseMetrics={baseMetrics}
        xraySummary={xraySummary}
        explanation={explanation}
        isFullyReliable={dataQualityRadar.isFullyReliable}
        onAskAi={handleAskAi}
      />

      {/* 3. Key Risk Indicators Grid (8 Cards) */}
      <KeyRiskIndicatorsGrid
        baseMetrics={baseMetrics}
        xraySummary={xraySummary}
        dataQuality={xray.data_quality}
      />

      {/* 4. Charts Grid: Holding Concentration & Sector Risk */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ConcentrationRiskChart instruments={xray.consolidated_instruments} />
        <SectorRiskChart sectorBreakdown={xray.sector_breakdown} />
      </div>

      {/* 5. Asset Class Risk Chart & Risk Factor Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AssetClassRiskChart
          assetClassBreakdown={xray.asset_class_breakdown}
          equityWeight={baseMetrics.equity_weight}
        />
        <RiskFactorBreakdown
          factors={riskFactorBreakdown}
          operationalRisk={baseMetrics.operational_risk}
        />
      </div>

      {/* 6. "Why Is My Portfolio Classified This Way?" & Thresholds */}
      <WhyThisClassification
        explanation={explanation}
        baseMetrics={baseMetrics}
        thresholds={educationalThresholds}
      />

      {/* 7. Explainable Smart Risk Observations Feed */}
      <RiskObservationsFeed
        observations={observations}
        onAskAi={handleAskAi}
      />

      {/* 8. "What Can I Do to Reduce Risk?" (Prioritized Actions & Future Lab Link) */}
      <RiskReductionPlan actions={xray.risk_reduction_actions} />

      {/* 9. Data Completeness & Valuation Confidence Radar */}
      <DataConfidenceCard
        dataQuality={xray.data_quality}
        summary={xraySummary}
      />
    </div>
  );
}
