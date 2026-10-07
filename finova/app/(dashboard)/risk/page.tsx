'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Shield, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { SkeletonCard } from '@/components/shared/Skeletons';
import { EmptyState } from '@/components/shared/EmptyState';
import { AIInsightCard } from '@/components/insights/AIInsightCard';
import { clamp } from '@/lib/utils';
import type { RiskMetrics } from '@/types/portfolio';

async function fetchSummary() {
  const res = await fetch('/api/portfolio/summary');
  if (!res.ok) throw new Error('Failed to load');
  return res.json();
}

function RiskMeter({ score }: { score: number }) {
  const angle = -135 + (score / 100) * 270;
  const color =
    score < 34 ? 'rgb(var(--gain))' :
    score < 67 ? 'rgb(var(--warning))' :
    'rgb(var(--loss))';

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

  const { risk_score, risk_label, hhi, equity_weight, broker_count, top_holding_weight, concentration_warnings } = riskMetrics;

  const labelColor =
    risk_label === 'Conservative' ? 'rgb(var(--gain))' :
    risk_label === 'Moderate' ? 'rgb(var(--warning))' :
    'rgb(var(--loss))';

  return (
    <div className="page-container space-y-6">
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: 'rgb(var(--foreground))' }}>
          Risk Analysis
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'rgb(var(--muted))' }}>
          Understand your portfolio&apos;s risk profile
        </p>
      </div>

      {/* Risk Meter + Label */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-6 flex flex-col items-center"
      >
        <RiskMeter score={risk_score} />
        <div className="mt-3 text-center">
          <p
            className="text-xl font-bold"
            style={{ color: labelColor }}
          >
            {risk_label}
          </p>
          <p className="text-sm mt-1" style={{ color: 'rgb(var(--muted))' }}>
            Portfolio Risk Profile
          </p>
        </div>

        <div className="flex gap-4 mt-4 text-xs">
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: 'Concentration (HHI)',
            value: hhi.toFixed(3),
            description: 'Lower is better. 1.0 = single holding.',
            warn: hhi > 0.35,
          },
          {
            label: 'Equity Weight',
            value: `${(equity_weight * 100).toFixed(1)}%`,
            description: 'Proportion in equity/ETF assets.',
            warn: equity_weight > 0.85,
          },
          {
            label: 'Brokers / Accounts',
            value: broker_count,
            description: 'More brokers = lower counterparty risk.',
            warn: broker_count === 1,
          },
          {
            label: 'Top Holding',
            value: `${(top_holding_weight * 100).toFixed(1)}%`,
            description: 'Largest single holding as % of portfolio.',
            warn: top_holding_weight > 0.3,
          },
        ].map((metric, i) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.05 }}
            className="card p-4"
          >
            <div className="flex items-start justify-between mb-1.5">
              <p className="text-xs" style={{ color: 'rgb(var(--muted))' }}>{metric.label}</p>
              {metric.warn
                ? <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'rgb(var(--warning))' }} />
                : <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'rgb(var(--gain))' }} />
              }
            </div>
            <p className="text-2xl font-bold" style={{ color: 'rgb(var(--foreground))' }}>
              {metric.value}
            </p>
            <p className="text-xs mt-1" style={{ color: 'rgb(var(--muted))' }}>
              {metric.description}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Warnings */}
      {concentration_warnings.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="card p-5 space-y-3"
        >
          <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'rgb(var(--foreground))' }}>
            <AlertTriangle className="w-4 h-4" style={{ color: 'rgb(var(--warning))' }} />
            Concentration Warnings
          </h2>
          {concentration_warnings.map((w, i) => (
            <div
              key={i}
              className="flex gap-3 p-3 rounded-lg text-sm"
              style={{
                backgroundColor: 'rgb(var(--warning-bg))',
                color: 'rgb(var(--warning))',
              }}
            >
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>{w}</p>
            </div>
          ))}
        </motion.div>
      )}

      <AIInsightCard insightType="risk_analysis" />
    </div>
  );
}
