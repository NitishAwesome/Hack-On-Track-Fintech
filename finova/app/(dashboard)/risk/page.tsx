'use client';

// ============================================================
// FINOVA — Innovation Two: Smart Risk & Diversification Radar Page
// app/(dashboard)/risk/page.tsx
//
// Extends deterministic risk analysis with:
// - Rule-based, explainable Smart Risk Observations
// - Cross-broker overlap concentration awareness
// - Data Quality Radar with honest price coverage disclosures
// - Configurable educational screening thresholds
// ============================================================

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  Info,
  Sparkles,
  AlertCircle,
  HelpCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Layers,
  X,
} from 'lucide-react';
import { SkeletonCard } from '@/components/shared/Skeletons';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatIndianCurrency } from '@/lib/utils';
import type { SmartRiskRadarAnalysis } from '@/lib/calculations/riskRadar';

async function fetchRiskRadar(): Promise<SmartRiskRadarAnalysis> {
  const res = await fetch('/api/portfolio/risk-radar');
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to load risk radar analysis');
  }
  const payload = await res.json();
  return payload.data;
}

function RiskMeter({ score }: { score: number }) {
  const angle = -135 + (score / 100) * 270;
  const color =
    score < 34
      ? 'rgb(var(--gain))'
      : score < 67
      ? 'rgb(var(--warning))'
      : 'rgb(var(--loss))';

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-48 h-28">
        <svg viewBox="0 0 200 120" className="w-full h-full">
          <path
            d="M 20 110 A 80 80 0 1 1 180 110"
            fill="none"
            stroke="rgb(var(--border))"
            strokeWidth="12"
            strokeLinecap="round"
          />
          <path
            d="M 20 110 A 80 80 0 1 1 180 110"
            fill="none"
            stroke={color}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${(score / 100) * 251} 251`}
            style={{ transition: 'stroke-dasharray 1s ease, stroke 0.5s ease' }}
          />
          <g transform={`rotate(${angle}, 100, 110)`}>
            <line x1="100" y1="110" x2="100" y2="45" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="100" cy="110" r="5" fill={color} />
          </g>
        </svg>
      </div>
      <div className="text-center -mt-2">
        <p className="text-4xl font-bold" style={{ color }}>
          {score}
        </p>
        <p className="text-xs mt-1 text-muted">
          out of 100 (Screening Score)
        </p>
      </div>
    </div>
  );
}

export default function RiskRadarPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: ['portfolio-risk-radar'],
    queryFn: fetchRiskRadar,
    staleTime: 30000,
  });

  const [showThresholdsGuide, setShowThresholdsGuide] = useState(false);
  const [expandedObsId, setExpandedObsId] = useState<string | null>(null);

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
          title="No Risk Data"
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

  const { baseMetrics, xraySummary, observations, educationalThresholds, dataQualityRadar } = data;

  const labelColor =
    baseMetrics.risk_label === 'Conservative'
      ? 'rgb(var(--gain))'
      : baseMetrics.risk_label === 'Moderate'
      ? 'rgb(var(--warning))'
      : 'rgb(var(--loss))';

  return (
    <div className="page-container space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Smart Risk & Diversification Radar
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-brand-500/10 text-brand-500 border border-brand-500/20">
              Deterministic Calculations
            </span>
          </div>
          <p className="text-sm mt-0.5 text-muted">
            Transparent concentration math, cross-broker overlap exposure & explainable observations.
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
            href="/analysis"
            className="btn-primary text-xs inline-flex items-center gap-1.5 py-2 px-3"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Open X-Ray</span>
          </Link>
        </div>
      </div>

      {/* Risk Meter Card + Classification */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-6 flex flex-col items-center relative overflow-hidden"
      >
        <RiskMeter score={baseMetrics.risk_score} />
        <div className="mt-2 text-center">
          <p className="text-xl font-bold" style={{ color: labelColor }}>
            {baseMetrics.risk_label} Profile
          </p>
          <p className="text-xs text-muted mt-1 max-w-md">
            Educational classification based on Herfindahl concentration (HHI: {baseMetrics.hhi.toFixed(2)}), equity weighting, and single-stock exposures.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-4 mt-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-gain" />
            <span className="text-muted">Conservative (0–33)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-warning" />
            <span className="text-muted">Moderate (34–66)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-loss" />
            <span className="text-muted">Aggressive (67+)</span>
          </div>
        </div>

        <button
          onClick={() => setShowThresholdsGuide(!showThresholdsGuide)}
          className="mt-4 text-[11px] font-semibold text-brand-500 hover:underline inline-flex items-center gap-1"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>{showThresholdsGuide ? 'Hide Screening Thresholds' : 'View Educational Screening Thresholds'}</span>
        </button>
      </motion.div>

      {/* Educational Thresholds Table (Toggleable) */}
      <AnimatePresence>
        {showThresholdsGuide && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="card p-5 space-y-3 border-brand-500/30"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground">Educational Screening Thresholds Guide</h3>
              <span className="text-[11px] text-muted">Heuristic rules, not regulatory standards</span>
            </div>
            <p className="text-xs text-muted">
              These reference ranges serve as diagnostic screening prompts for portfolio self-inspection. They do not constitute personalized financial advice.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/10 text-muted uppercase text-[10px] border-b border-border">
                  <tr>
                    <th className="py-2.5 px-3">Metric</th>
                    <th className="py-2.5 px-3">Conservative Limit</th>
                    <th className="py-2.5 px-3">Moderate Limit</th>
                    <th className="py-2.5 px-3">Your Portfolio</th>
                    <th className="py-2.5 px-3">Diagnostic Rationale</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {educationalThresholds.map((t) => (
                    <tr key={t.metric} className="hover:bg-muted/5">
                      <td className="py-2.5 px-3 font-semibold text-foreground">{t.metric}</td>
                      <td className="py-2.5 px-3 text-muted">{t.conservativeLimit}</td>
                      <td className="py-2.5 px-3 text-muted">{t.moderateLimit}</td>
                      <td className="py-2.5 px-3 font-mono font-bold">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] ${
                            t.status === 'within_screening_range'
                              ? 'bg-gain/10 text-gain'
                              : t.status === 'elevated'
                              ? 'bg-warning/10 text-warning'
                              : 'bg-loss/10 text-loss'
                          }`}
                        >
                          {t.currentValue}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-muted text-[11px]">{t.screeningRationale}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Primary Concentration Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          {
            label: 'Top Holding',
            value: `${(baseMetrics.top_holding_weight * 100).toFixed(1)}%`,
            sub: baseMetrics.top_holding_name || 'Single largest',
            warn: baseMetrics.top_holding_weight > 0.25,
          },
          {
            label: 'Top 5 Concentration',
            value: `${(baseMetrics.top_five_holding_weight * 100).toFixed(1)}%`,
            sub: 'Top 5 combined',
            warn: baseMetrics.top_five_holding_weight > 0.6,
          },
          {
            label: 'HHI Concentration',
            value: baseMetrics.hhi.toFixed(3),
            sub: 'Herfindahl Index (0–1)',
            warn: baseMetrics.hhi > 0.2,
          },
          {
            label: 'Equity Weight',
            value: `${(baseMetrics.equity_weight * 100).toFixed(1)}%`,
            sub: 'Equities & ETFs',
            warn: baseMetrics.equity_weight > 0.8,
          },
          {
            label: 'Cross-Broker Overlap',
            value: `${xraySummary.cross_broker_overlap_valued_pct.toFixed(1)}%`,
            sub: `${xraySummary.cross_broker_overlaps_count} duplicate stock(s)`,
            warn: xraySummary.cross_broker_overlaps_count > 0,
          },
          {
            label: 'Quote Coverage',
            value: `${dataQualityRadar.coveragePct}%`,
            sub: dataQualityRadar.isFullyReliable ? '100% quoted' : 'Partial quotes',
            warn: !dataQualityRadar.isFullyReliable,
          },
        ].map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="card p-3.5 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between">
                <p className="text-[11px] text-muted truncate">{m.label}</p>
                {m.warn ? (
                  <AlertTriangle className="w-3.5 h-3.5 text-warning flex-shrink-0" />
                ) : (
                  <CheckCircle className="w-3.5 h-3.5 text-gain flex-shrink-0" />
                )}
              </div>
              <p className="text-xl font-bold text-foreground mt-1">{m.value}</p>
            </div>
            <p className="text-[10px] text-muted truncate mt-1">{m.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* AI Educational Q&A Box */}
      <AnimatePresence>
        {aiTopic && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="card p-5 border-brand-500/40 bg-brand-500/5 space-y-3 relative"
          >
            <button
              onClick={() => {
                setAiTopic(null);
                setAiResponse(null);
              }}
              className="absolute top-4 right-4 p-1 text-muted hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400 font-semibold text-sm">
              <Sparkles className="w-4 h-4" />
              <span>AI Risk Interpretation: {aiTopic}</span>
            </div>

            {aiLoading ? (
              <div className="flex items-center gap-2 text-xs text-muted py-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
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

      {/* Smart Risk Observations Feed */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground">Explainable Smart Risk Observations</h2>
            <p className="text-xs text-muted mt-0.5">
              Rule-based observations generated deterministically from your actual holdings.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={() => handleAskAi('concentration', 'Explain the risks of holding over 25% in one stock.')}
              className="px-2.5 py-1.5 rounded-lg border border-border bg-surface hover:bg-muted/10 text-muted hover:text-foreground transition-colors inline-flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3 text-brand-500" />
              <span>Ask AI: Concentration Risk</span>
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {observations.map((obs) => {
            const isExpanded = expandedObsId === obs.id;
            const isAlert = obs.severity === 'alert';
            const isWarning = obs.severity === 'warning';

            return (
              <div
                key={obs.id}
                className={`card p-4 transition-all border-l-4 ${
                  isAlert
                    ? 'border-l-loss bg-loss/5'
                    : isWarning
                    ? 'border-l-warning bg-warning/5'
                    : 'border-l-brand-500 bg-surface'
                }`}
              >
                <div
                  onClick={() => setExpandedObsId(isExpanded ? null : obs.id)}
                  className="flex items-start justify-between cursor-pointer gap-3"
                >
                  <div className="flex items-start gap-3">
                    {isAlert ? (
                      <AlertCircle className="w-5 h-5 text-loss flex-shrink-0 mt-0.5" />
                    ) : isWarning ? (
                      <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                    ) : (
                      <Info className="w-5 h-5 text-brand-500 flex-shrink-0 mt-0.5" />
                    )}

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-foreground">{obs.title}</p>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                            isAlert
                              ? 'bg-loss/10 text-loss'
                              : isWarning
                              ? 'bg-warning/10 text-warning'
                              : 'bg-brand-500/10 text-brand-500'
                          }`}
                        >
                          {obs.category}
                        </span>
                      </div>
                      <p className="text-xs text-muted mt-1 font-mono">{obs.calculatedFigure}</p>
                    </div>
                  </div>

                  <button className="p-1 text-muted hover:text-foreground">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="pt-4 mt-3 border-t border-border/60 text-xs space-y-3"
                  >
                    <div>
                      <p className="font-semibold text-foreground">Why It Matters:</p>
                      <p className="text-muted mt-0.5 leading-relaxed">{obs.whyItMatters}</p>
                    </div>

                    <div>
                      <p className="font-semibold text-foreground">Source Data & Contributing Positions:</p>
                      <ul className="list-disc list-inside text-muted mt-0.5 space-y-0.5">
                        {obs.contributingHoldings.map((h, idx) => (
                          <li key={idx}>{h}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-2.5 rounded-lg bg-muted/10 text-[11px] text-muted">
                      <span className="font-semibold text-foreground">Coverage / Limitation: </span>
                      {obs.coverageLimitation}
                    </div>

                    <div className="p-2.5 rounded-lg bg-brand-500/10 text-[11px] text-foreground">
                      <span className="font-semibold text-brand-600 dark:text-brand-400">
                        Educational Next Step:{' '}
                      </span>
                      {obs.neutralNextStep}
                    </div>
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Data Quality Radar Section */}
      <div className="card p-5 space-y-3 border border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-foreground">Data Quality Radar</h3>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                dataQualityRadar.isFullyReliable
                  ? 'bg-gain/10 text-gain'
                  : 'bg-warning/10 text-warning'
              }`}
            >
              {dataQualityRadar.isFullyReliable ? '100% Reliable' : 'Partial Price Coverage'}
            </span>
          </div>

          <Link href="/analysis" className="text-xs text-brand-500 hover:underline">
            View X-Ray details →
          </Link>
        </div>

        <p className="text-xs text-muted">{dataQualityRadar.coverageNotice}</p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs pt-2">
          <div className="p-2.5 rounded-lg bg-muted/10">
            <p className="text-muted text-[11px]">Holdings Analyzed</p>
            <p className="text-sm font-bold text-foreground mt-0.5">
              {dataQualityRadar.totalHoldingsAnalyzed}
            </p>
          </div>
          <div className="p-2.5 rounded-lg bg-muted/10">
            <p className="text-muted text-[11px]">Active Market Prices</p>
            <p className="text-sm font-bold text-gain mt-0.5">
              {dataQualityRadar.validPriceCount}
            </p>
          </div>
          <div className="p-2.5 rounded-lg bg-muted/10">
            <p className="text-muted text-[11px]">Unpriced Assets</p>
            <p className="text-sm font-bold text-warning mt-0.5">
              {dataQualityRadar.unpricedHoldingsCount}
            </p>
          </div>
          <div className="p-2.5 rounded-lg bg-muted/10">
            <p className="text-muted text-[11px]">Stale Quotes</p>
            <p className="text-sm font-bold text-foreground mt-0.5">
              {dataQualityRadar.staleQuotesCount}
            </p>
          </div>
          <div className="p-2.5 rounded-lg bg-muted/10">
            <p className="text-muted text-[11px]">Missing Sector</p>
            <p className="text-sm font-bold text-foreground mt-0.5">
              {dataQualityRadar.unclassifiedSectorsCount}
            </p>
          </div>
          <div className="p-2.5 rounded-lg bg-muted/10">
            <p className="text-muted text-[11px]">Missing ISIN</p>
            <p className="text-sm font-bold text-foreground mt-0.5">
              {dataQualityRadar.missingIsinCount}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
