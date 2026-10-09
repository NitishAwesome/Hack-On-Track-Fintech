'use client';

// ============================================================
// FINOVA — Portfolio Risk Analysis Page
// Deterministic risk calculations + Risk Meter + Intelligence
// ============================================================

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  Info,
  Sparkles,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { SkeletonCard } from '@/components/shared/Skeletons';
import { EmptyState } from '@/components/shared/EmptyState';
import { AIInsightCard } from '@/components/insights/AIInsightCard';
import type { RiskMetrics } from '@/types/portfolio';

async function fetchSummary() {
  const res = await fetch('/api/portfolio/summary');
  if (!res.ok) throw new Error('Failed to load portfolio summary');
  return res.json();
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
        {/* Track */}
        <svg viewBox="0 0 200 120" className="w-full h-full">
          <path
            d="M 20 110 A 80 80 0 1 1 180 110"
            fill="none"
            stroke="rgb(var(--border))"
            strokeWidth="12"
            strokeLinecap="round"
          />
          {/* Fill arc */}
          <path
            d="M 20 110 A 80 80 0 1 1 180 110"
            fill="none"
            stroke={color}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${(score / 100) * 251} 251`}
            style={{ transition: 'stroke-dasharray 1s ease, stroke 0.5s ease' }}
          />
          {/* Needle */}
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
        <p className="text-xs mt-1" style={{ color: 'rgb(var(--muted))' }}>
          out of 100
        </p>
      </div>
    </div>
  );
}

export default function RiskPage() {
  const { data, isLoading } = useQuery({ queryKey: ['portfolio-summary'], queryFn: fetchSummary });
  const riskMetrics: RiskMetrics | null = data?.riskMetrics ?? null;

  if (isLoading) {
    return (
      <div className="page-container space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SkeletonCard lines={5} />
          <SkeletonCard lines={5} />
        </div>
      </div>
    );
  }

  if (!riskMetrics || data?.summary?.holding_count === 0) {
    return (
      <div className="page-container">
        <EmptyState
          icon={<Shield className="w-8 h-8" style={{ color: 'rgb(var(--brand-500))' }} />}
          title="No risk data"
          description="Add holdings to see your portfolio risk analysis."
        />
      </div>
    );
  }

  const {
    risk_score,
    risk_label,
    hhi,
    equity_weight,
    top_holding_weight,
    top_five_holding_weight,
    top_sector,
    top_sector_weight,
    quote_coverage_pct,
    is_valuation_complete,
    concentration_warnings,
    positive_observations,
    data_quality_warnings,
  } = riskMetrics;

  const labelColor =
    risk_label === 'Conservative'
      ? 'rgb(var(--gain))'
      : risk_label === 'Moderate'
      ? 'rgb(var(--warning))'
      : 'rgb(var(--loss))';

  return (
    <div className="page-container space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'rgb(var(--foreground))' }}>
            Risk Analysis & Concentration
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'rgb(var(--muted))' }}>
            Deterministic metrics, Herfindahl-Hirschman index & exposure diagnostics
          </p>
        </div>

        <Link
          href="/insights"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white shadow-sm transition-opacity hover:opacity-95 self-start sm:self-auto"
          style={{
            background: 'linear-gradient(135deg, rgb(var(--brand-600)), rgb(var(--brand-400)))',
          }}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Open AI Intelligence Hub</span>
          <ArrowRight className="w-3 h-3 ml-0.5" />
        </Link>
      </div>

      {/* Risk Meter + Label */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-6 flex flex-col items-center"
      >
        <RiskMeter score={risk_score} />
        <div className="mt-3 text-center">
          <p className="text-xl font-bold" style={{ color: labelColor }}>
            {risk_label}
          </p>
          <p className="text-sm mt-1" style={{ color: 'rgb(var(--muted))' }}>
            Portfolio Risk Classification
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-4 mt-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'rgb(var(--gain))' }} />
            <span style={{ color: 'rgb(var(--muted))' }}>Conservative (0–33)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'rgb(var(--warning))' }} />
            <span style={{ color: 'rgb(var(--muted))' }}>Moderate (34–66)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'rgb(var(--loss))' }} />
            <span style={{ color: 'rgb(var(--muted))' }}>Aggressive (67+)</span>
          </div>
        </div>
      </motion.div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          {
            label: 'Concentration (HHI)',
            value: hhi.toFixed(3),
            description: '1.0 = single holding.',
            warn: hhi > 0.25,
          },
          {
            label: 'Top Holding',
            value: `${(top_holding_weight * 100).toFixed(1)}%`,
            description: 'Largest single asset.',
            warn: top_holding_weight > 0.3,
          },
          {
            label: 'Top 5 Concentration',
            value: `${(top_five_holding_weight * 100).toFixed(1)}%`,
            description: 'Top 5 combined weight.',
            warn: top_five_holding_weight > 0.7,
          },
          {
            label: 'Equity Weight',
            value: `${(equity_weight * 100).toFixed(1)}%`,
            description: 'Equities & ETFs.',
            warn: equity_weight > 0.85,
          },
          {
            label: 'Top Sector',
            value: top_sector ? `${(top_sector_weight * 100).toFixed(0)}%` : 'N/A',
            description: top_sector || 'Unclassified',
            warn: top_sector_weight > 0.4,
          },
          {
            label: 'Quote Coverage',
            value: `${quote_coverage_pct}%`,
            description: is_valuation_complete ? '100% quoted' : 'Missing quotes',
            warn: !is_valuation_complete,
          },
        ].map((metric, i) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 + i * 0.03 }}
            className="card p-3.5 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between mb-1">
                <p className="text-[11px] truncate" style={{ color: 'rgb(var(--muted))' }}>
                  {metric.label}
                </p>
                {metric.warn ? (
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'rgb(var(--warning))' }} />
                ) : (
                  <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'rgb(var(--gain))' }} />
                )}
              </div>
              <p className="text-xl font-bold" style={{ color: 'rgb(var(--foreground))' }}>
                {metric.value}
              </p>
            </div>
            <p className="text-[10px] mt-1 truncate" style={{ color: 'rgb(var(--muted))' }}>
              {metric.description}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Observations: Positives vs Warnings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Warnings */}
        <div className="card p-5 space-y-3">
          <h2 className="text-xs font-semibold flex items-center gap-1.5" style={{ color: 'rgb(var(--warning))' }}>
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Concentration & Data Warnings</span>
          </h2>
          {concentration_warnings.length > 0 || data_quality_warnings.length > 0 ? (
            <div className="space-y-2">
              {[...concentration_warnings, ...data_quality_warnings].map((w, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 p-2.5 rounded-lg text-xs"
                  style={{
                    backgroundColor: 'rgb(var(--warning-bg))',
                    color: 'rgb(var(--warning))',
                  }}
                >
                  <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <p>{w}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs" style={{ color: 'rgb(var(--muted))' }}>
              No critical concentration warnings detected.
            </p>
          )}
        </div>

        {/* Evidence-Backed Strengths */}
        <div className="card p-5 space-y-3">
          <h2 className="text-xs font-semibold flex items-center gap-1.5" style={{ color: 'rgb(var(--gain))' }}>
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Portfolio Strengths & Mitigations</span>
          </h2>
          {positive_observations.length > 0 ? (
            <div className="space-y-2">
              {positive_observations.map((pos, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 p-2.5 rounded-lg text-xs"
                  style={{
                    backgroundColor: 'rgb(var(--gain) / 0.08)',
                    color: 'rgb(var(--foreground))',
                  }}
                >
                  <CheckCircle className="w-3.5 h-3.5 flex-shrink-0 text-gain mt-0.5" />
                  <p>{pos}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs" style={{ color: 'rgb(var(--muted))' }}>
              Standard baseline allocation.
            </p>
          )}
        </div>
      </div>

      <AIInsightCard insightType="risk_analysis" />
    </div>
  );
}
