'use client';

// ============================================================
// FINOVA — AI Portfolio Intelligence & Risk Analysis Hub
// Comprehensive interactive dashboard component
// Real-time deterministic risk metrics + Gemini 1.5 Flash insights
// ============================================================

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Layers,
  Info,
  ArrowRight,
  Database,
  Cpu,
  FileSearch,
} from 'lucide-react';
import { formatCurrencySafe } from '@/lib/utils';
import type { AIIntelligenceResponse, RiskMetrics } from '@/types/portfolio';

async function fetchPortfolioIntelligence(): Promise<AIIntelligenceResponse> {
  const res = await fetch('/api/ai/intelligence', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to generate portfolio intelligence.');
  }

  return res.json();
}

export function PortfolioIntelligenceHub() {
  const [activeTab, setActiveTab] = useState<'insights' | 'risk_diagnostics' | 'sectors'>('insights');

  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ['portfolio-intelligence'],
    queryFn: fetchPortfolioIntelligence,
    staleTime: 60 * 1000, // 1 min stale time
  });

  const report = data?.report;
  const riskMetrics: RiskMetrics | undefined = data?.riskMetrics;
  const summary = data?.summary;
  const meta = data?.meta;

  const riskLabelColor =
    riskMetrics?.risk_label === 'Conservative'
      ? 'rgb(var(--gain))'
      : riskMetrics?.risk_label === 'Moderate'
      ? 'rgb(var(--warning))'
      : 'rgb(var(--loss))';

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div
        className="card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4"
        style={{
          background: 'linear-gradient(135deg, rgb(var(--surface)), rgb(var(--surface-raised)))',
        }}
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, rgb(var(--brand-600)), rgb(var(--brand-400)))',
              }}
            >
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: 'rgb(var(--foreground))' }}>
                AI Portfolio Intelligence Hub
              </h2>
              <p className="text-xs" style={{ color: 'rgb(var(--muted))' }}>
                Deterministic risk diagnostics & AI portfolio synthesis
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls & Provider Metadata */}
        <div className="flex flex-wrap items-center gap-3">
          {meta && (
            <div
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border"
              style={{
                backgroundColor: 'rgb(var(--surface))',
                borderColor: 'rgb(var(--border))',
                color: meta.provider === 'gemini' ? 'rgb(var(--brand-500))' : 'rgb(var(--muted))',
              }}
              title={`Active Engine: ${meta.model}`}
            >
              {meta.provider === 'gemini' ? (
                <Cpu className="w-3.5 h-3.5" />
              ) : (
                <Database className="w-3.5 h-3.5" />
              )}
              <span className="font-medium">{meta.model}</span>
            </div>
          )}

          <button
            id="refresh-intelligence-btn"
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white shadow-sm transition-all hover:opacity-95 disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, rgb(var(--brand-600)), rgb(var(--brand-400)))',
            }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            <span>{isFetching ? 'Analyzing...' : 'Refresh Intelligence'}</span>
          </button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card p-4 space-y-2">
                <div className="skeleton h-3 w-1/2" />
                <div className="skeleton h-8 w-3/4" />
                <div className="skeleton h-3 w-5/6" />
              </div>
            ))}
          </div>
          <div className="card p-6 space-y-3">
            <div className="skeleton h-6 w-1/3" />
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-5/6" />
            <div className="skeleton h-4 w-2/3" />
          </div>
        </div>
      ) : error ? (
        /* Error State */
        <div
          className="card p-6 flex flex-col items-center text-center space-y-3"
          style={{ borderColor: 'rgb(var(--loss))' }}
        >
          <AlertTriangle className="w-8 h-8" style={{ color: 'rgb(var(--loss))' }} />
          <div>
            <h3 className="text-base font-semibold" style={{ color: 'rgb(var(--foreground))' }}>
              Intelligence Service Unavailable
            </h3>
            <p className="text-sm mt-1" style={{ color: 'rgb(var(--muted))' }}>
              {(error as Error).message || 'Unable to compute portfolio intelligence. Please try again.'}
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 rounded-lg text-xs font-semibold border transition-colors hover:bg-surface-raised"
            style={{ borderColor: 'rgb(var(--border))', color: 'rgb(var(--foreground))' }}
          >
            Try Again
          </button>
        </div>
      ) : !summary || summary.holding_count === 0 ? (
        /* Empty Portfolio State */
        <div className="card p-8 flex flex-col items-center text-center space-y-3">
          <ShieldCheck className="w-10 h-10" style={{ color: 'rgb(var(--brand-500))' }} />
          <h3 className="text-base font-semibold" style={{ color: 'rgb(var(--foreground))' }}>
            No Investment Positions Found
          </h3>
          <p className="text-sm max-w-md" style={{ color: 'rgb(var(--muted))' }}>
            Add holdings manually or upload a broker statement via CSV to unlock automated risk scoring,
            HHI concentration diagnostics, and Gemini intelligence.
          </p>
        </div>
      ) : (
        /* Populated Intelligence Experience */
        <div className="space-y-6">
          {/* Key Calculated Risk Metrics Grid (Deterministic) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Risk Score */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="card p-4 flex flex-col justify-between"
            >
              <div>
                <p className="text-xs" style={{ color: 'rgb(var(--muted))' }}>
                  Portfolio Risk Score
                </p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-bold" style={{ color: riskLabelColor }}>
                    {riskMetrics?.risk_score ?? 0}
                  </span>
                  <span className="text-xs" style={{ color: 'rgb(var(--muted))' }}>
                    / 100
                  </span>
                </div>
              </div>
              <p className="text-xs font-semibold mt-2" style={{ color: riskLabelColor }}>
                {riskMetrics?.risk_label} Profile
              </p>
            </motion.div>

            {/* HHI Concentration */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="card p-4 flex flex-col justify-between"
            >
              <div>
                <p className="text-xs" style={{ color: 'rgb(var(--muted))' }}>
                  Concentration (HHI)
                </p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-bold" style={{ color: 'rgb(var(--foreground))' }}>
                    {riskMetrics?.hhi.toFixed(3) ?? '0.000'}
                  </span>
                </div>
              </div>
              <p className="text-xs mt-2" style={{ color: 'rgb(var(--muted))' }}>
                {(riskMetrics?.hhi ?? 0) > 0.25
                  ? 'High concentration'
                  : (riskMetrics?.hhi ?? 0) > 0.15
                  ? 'Moderate concentration'
                  : 'Well-diversified'}
              </p>
            </motion.div>

            {/* Top Holding & Top 5 Concentration */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="card p-4 flex flex-col justify-between"
            >
              <div>
                <p className="text-xs" style={{ color: 'rgb(var(--muted))' }}>
                  Top Holding Weight
                </p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-bold" style={{ color: 'rgb(var(--foreground))' }}>
                    {((riskMetrics?.top_holding_weight ?? 0) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
              <p className="text-xs mt-2 truncate" style={{ color: 'rgb(var(--muted))' }}>
                Top 5: {((riskMetrics?.top_five_holding_weight ?? 0) * 100).toFixed(1)}%
              </p>
            </motion.div>

            {/* Quote Coverage & Data Freshness */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="card p-4 flex flex-col justify-between"
            >
              <div>
                <p className="text-xs" style={{ color: 'rgb(var(--muted))' }}>
                  Quote Coverage
                </p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-bold" style={{ color: 'rgb(var(--foreground))' }}>
                    {riskMetrics?.quote_coverage_pct ?? 0}%
                  </span>
                </div>
              </div>
              <p
                className="text-xs mt-2"
                style={{
                  color:
                    riskMetrics?.is_valuation_complete
                      ? 'rgb(var(--gain))'
                      : 'rgb(var(--warning))',
                }}
              >
                {riskMetrics?.is_valuation_complete
                  ? 'All positions quoted'
                  : `${riskMetrics?.unquoted_count} unquoted position(s)`}
              </p>
            </motion.div>
          </div>

          {/* Navigation Tabs for In-Depth Views */}
          <div className="flex border-b" style={{ borderColor: 'rgb(var(--border))' }}>
            <button
              onClick={() => setActiveTab('insights')}
              className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === 'insights'
                  ? 'border-brand text-brand'
                  : 'border-transparent text-muted hover:text-foreground'
              }`}
            >
              AI Synthesis & Findings
            </button>
            <button
              onClick={() => setActiveTab('risk_diagnostics')}
              className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === 'risk_diagnostics'
                  ? 'border-brand text-brand'
                  : 'border-transparent text-muted hover:text-foreground'
              }`}
            >
              Risk & Diversification Breakdown
            </button>
            <button
              onClick={() => setActiveTab('sectors')}
              className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === 'sectors'
                  ? 'border-brand text-brand'
                  : 'border-transparent text-muted hover:text-foreground'
              }`}
            >
              Sector Allocations
            </button>
          </div>

          {/* Tab 1: AI Synthesis & Structured Findings */}
          {activeTab === 'insights' && report && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {/* Executive Health Assessment Card */}
              <div className="card p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-brand" />
                    <h3 className="text-sm font-semibold" style={{ color: 'rgb(var(--foreground))' }}>
                      {report.summary.headline}
                    </h3>
                  </div>
                  <span className="text-[11px]" style={{ color: 'rgb(var(--muted))' }}>
                    {meta?.generated_at ? new Date(meta.generated_at).toLocaleTimeString() : ''}
                  </span>
                </div>

                <div
                  className="p-3.5 rounded-lg text-sm leading-relaxed"
                  style={{ backgroundColor: 'rgb(var(--surface-raised))', color: 'rgb(var(--foreground))' }}
                >
                  {report.summary.health_assessment}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  {/* Why this matters */}
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgb(var(--muted))' }}>
                      Why This Matters
                    </p>
                    <p className="text-xs leading-relaxed" style={{ color: 'rgb(var(--foreground))' }}>
                      {report.summary.significance}
                    </p>
                  </div>

                  {/* Key Drivers */}
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgb(var(--muted))' }}>
                      Contributing Factors
                    </p>
                    <ul className="space-y-1 text-xs" style={{ color: 'rgb(var(--foreground))' }}>
                      {report.summary.key_drivers.map((driver, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-brand font-bold">•</span>
                          <span>{driver}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Actionable Investigation Steps */}
              {report.summary.investigation_steps.length > 0 && (
                <div className="card p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <FileSearch className="w-4 h-4 text-brand" />
                    <h3 className="text-sm font-semibold" style={{ color: 'rgb(var(--foreground))' }}>
                      Suggested Investigation Steps
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {report.summary.investigation_steps.map((step, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2.5 p-3 rounded-lg border text-xs"
                        style={{
                          backgroundColor: 'rgb(var(--surface))',
                          borderColor: 'rgb(var(--border))',
                          color: 'rgb(var(--foreground))',
                        }}
                      >
                        <ArrowRight className="w-3.5 h-3.5 flex-shrink-0 text-brand mt-0.5" />
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Evidence-backed Positives and Warnings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Positives */}
                <div className="card p-5 space-y-2.5">
                  <h4 className="text-xs font-semibold flex items-center gap-1.5" style={{ color: 'rgb(var(--gain))' }}>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Evidence-Backed Portfolio Strengths</span>
                  </h4>
                  <ul className="space-y-2 text-xs" style={{ color: 'rgb(var(--foreground))' }}>
                    {report.risk_observations.positives.map((pos, idx) => (
                      <li key={idx} className="flex items-start gap-2 p-2 rounded" style={{ backgroundColor: 'rgb(var(--gain) / 0.08)' }}>
                        <span className="text-gain">✓</span>
                        <span>{pos}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Risk Concerns */}
                <div className="card p-5 space-y-2.5">
                  <h4 className="text-xs font-semibold flex items-center gap-1.5" style={{ color: 'rgb(var(--warning))' }}>
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Identified Risk Warnings</span>
                  </h4>
                  <ul className="space-y-2 text-xs" style={{ color: 'rgb(var(--foreground))' }}>
                    {report.risk_observations.concerns.map((con, idx) => (
                      <li key={idx} className="flex items-start gap-2 p-2 rounded" style={{ backgroundColor: 'rgb(var(--warning) / 0.08)' }}>
                        <span className="text-warning">⚠</span>
                        <span>{con}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Data Transparency & Limitations Callout */}
              <div
                className="p-3.5 rounded-lg border flex items-start gap-2.5 text-xs"
                style={{
                  backgroundColor: 'rgb(var(--surface-raised))',
                  borderColor: 'rgb(var(--border))',
                }}
              >
                <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'rgb(var(--muted))' }} />
                <div className="space-y-1">
                  <p className="font-semibold" style={{ color: 'rgb(var(--foreground))' }}>
                    Data Coverage & Valuation Completeness
                  </p>
                  <ul className="list-disc list-inside space-y-0.5" style={{ color: 'rgb(var(--muted))' }}>
                    {report.data_limitations.map((lim, idx) => (
                      <li key={idx}>{lim}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>
          )}

          {/* Tab 2: Deterministic Risk Diagnostics */}
          {activeTab === 'risk_diagnostics' && riskMetrics && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Diversification Details */}
                <div className="card p-5 space-y-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'rgb(var(--foreground))' }}>
                    <Layers className="w-4 h-4 text-brand" />
                    Diversification Diagnostics
                  </h3>
                  <div className="space-y-2 text-xs" style={{ color: 'rgb(var(--foreground))' }}>
                    {riskMetrics.diversification_observations.map((obs, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg border" style={{ borderColor: 'rgb(var(--border))' }}>
                        {obs}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Data Quality & Integrity Alerts */}
                <div className="card p-5 space-y-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'rgb(var(--foreground))' }}>
                    <Database className="w-4 h-4 text-brand" />
                    Data Quality & Quote Freshness
                  </h3>
                  <div className="space-y-2 text-xs">
                    {riskMetrics.data_quality_warnings.length > 0 ? (
                      riskMetrics.data_quality_warnings.map((warn, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-lg border text-xs"
                          style={{
                            backgroundColor: 'rgb(var(--warning) / 0.08)',
                            borderColor: 'rgb(var(--warning) / 0.3)',
                            color: 'rgb(var(--warning))',
                          }}
                        >
                          {warn}
                        </div>
                      ))
                    ) : (
                      <div className="p-3 rounded-lg text-xs" style={{ backgroundColor: 'rgb(var(--gain) / 0.08)', color: 'rgb(var(--gain))' }}>
                        ✓ All positions verified with clean metadata and active valuation prices.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Tab 3: Sector Allocations */}
          {activeTab === 'sectors' && riskMetrics && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="card overflow-hidden"
            >
              <div className="px-5 py-4 border-b" style={{ borderColor: 'rgb(var(--border))' }}>
                <h3 className="text-sm font-semibold" style={{ color: 'rgb(var(--foreground))' }}>
                  Sector & Industry Concentration
                </h3>
                <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--muted))' }}>
                  Distribution of portfolio valuation across market sectors
                </p>
              </div>

              {riskMetrics.sector_allocations.length === 0 ? (
                <div className="p-6 text-center text-xs" style={{ color: 'rgb(var(--muted))' }}>
                  No sector classifications available for recorded positions.
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: 'rgb(var(--border))' }}>
                  {riskMetrics.sector_allocations.map((sec) => (
                    <div key={sec.sector} className="px-5 py-3 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-semibold" style={{ color: 'rgb(var(--foreground))' }}>
                          {sec.sector}
                        </p>
                        <p style={{ color: 'rgb(var(--muted))' }}>
                          {sec.holding_count} holding(s) {sec.unquoted_count ? `(${sec.unquoted_count} unquoted)` : ''}
                        </p>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="w-32 hidden sm:block">
                          <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgb(var(--surface-raised))' }}>
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.min(sec.percentage, 100)}%`,
                                backgroundColor: 'rgb(var(--brand-500))',
                              }}
                            />
                          </div>
                        </div>
                        <div className="text-right min-w-[70px]">
                          <p className="font-bold" style={{ color: 'rgb(var(--foreground))' }}>
                            {sec.percentage.toFixed(1)}%
                          </p>
                          <p style={{ color: 'rgb(var(--muted))' }}>
                            {formatCurrencySafe(sec.value)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* Educational Compliance Footer */}
          <div
            className="p-3.5 rounded-xl border text-[11px] leading-relaxed"
            style={{
              backgroundColor: 'rgb(var(--surface))',
              borderColor: 'rgb(var(--border))',
              color: 'rgb(var(--muted))',
            }}
          >
            <p>
              <span className="font-semibold" style={{ color: 'rgb(var(--foreground))' }}>
                Regulatory Disclosure:
              </span>{' '}
              {report?.educational_disclaimer ||
                'FINOVA is an educational tool and does not provide investment advice or recommendations. Insights are generated algorithmically for learning purposes.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
