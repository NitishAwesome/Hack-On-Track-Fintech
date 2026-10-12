'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  HelpCircle,
  X,
  Sparkles,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import type { RiskMetrics } from '@/types/portfolio';
import type { UnifiedXRayAnalysis } from '@/lib/calculations/xray';
import type { RiskExplanation } from '@/lib/calculations/riskRadar';

interface RiskOverviewCardProps {
  baseMetrics: RiskMetrics;
  xraySummary: UnifiedXRayAnalysis['summary'];
  explanation: RiskExplanation;
  isFullyReliable: boolean;
  onAskAi?: (topic: string, prompt: string) => void;
}

export function RiskOverviewCard({
  baseMetrics,
  xraySummary,
  explanation,
  isFullyReliable,
  onAskAi,
}: RiskOverviewCardProps) {
  const [showMethodologyModal, setShowMethodologyModal] = useState(false);

  const score = baseMetrics.risk_score;
  const angle = -135 + (score / 100) * 270;
  const color =
    score < 34
      ? 'rgb(var(--gain))'
      : score < 67
      ? 'rgb(var(--warning))'
      : 'rgb(var(--loss))';

  const labelBadgeClass =
    baseMetrics.risk_label === 'Conservative'
      ? 'bg-gain/10 text-gain border-gain/20'
      : baseMetrics.risk_label === 'Moderate'
      ? 'bg-warning/10 text-warning border-warning/20'
      : 'bg-loss/10 text-loss border-loss/20';

  return (
    <div className="card p-6 relative overflow-hidden border border-border">
      {/* Background radial highlight */}
      <div
        className="absolute -top-24 -right-24 w-80 h-80 rounded-full blur-3xl pointer-events-none opacity-15"
        style={{
          background:
            score < 34
              ? 'rgba(34, 197, 94, 0.4)'
              : score < 67
              ? 'rgba(234, 179, 8, 0.4)'
              : 'rgba(239, 68, 68, 0.4)',
        }}
      />

      <div className="flex flex-col lg:flex-row items-center justify-between gap-6 relative z-10">
        {/* Left: Responsive Gauge */}
        <div className="flex flex-col items-center flex-shrink-0">
          <div className="relative w-52 h-32">
            <svg viewBox="0 0 200 120" className="w-full h-full">
              {/* Background Arc */}
              <path
                d="M 20 110 A 80 80 0 1 1 180 110"
                fill="none"
                stroke="rgb(var(--border))"
                strokeWidth="14"
                strokeLinecap="round"
              />
              {/* Colored Score Arc */}
              <path
                d="M 20 110 A 80 80 0 1 1 180 110"
                fill="none"
                stroke={color}
                strokeWidth="14"
                strokeLinecap="round"
                strokeDasharray={`${(score / 100) * 251} 251`}
                style={{
                  transition: 'stroke-dasharray 1.2s cubic-bezier(0.16, 1, 0.3, 1), stroke 0.4s ease',
                }}
              />
              {/* Needle */}
              <g
                transform={`rotate(${angle}, 100, 110)`}
                style={{ transition: 'transform 1.2s cubic-bezier(0.16, 1, 0.3, 1)' }}
              >
                <line
                  x1="100"
                  y1="110"
                  x2="100"
                  y2="42"
                  stroke={color}
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <circle cx="100" cy="110" r="6" fill={color} />
                <circle cx="100" cy="110" r="2.5" fill="rgb(var(--surface))" />
              </g>
            </svg>
          </div>

          <div className="text-center -mt-2">
            <span className="text-4xl font-extrabold font-mono tracking-tight" style={{ color }}>
              {score}
            </span>
            <span className="text-xs text-muted font-mono ml-1">/ 100</span>
            <p className="text-[11px] text-muted uppercase tracking-wider font-semibold mt-0.5">
              Screening Score
            </p>
          </div>
        </div>

        {/* Center: Risk Classification & Primary Drivers */}
        <div className="flex-1 space-y-3 text-center lg:text-left">
          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2.5">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold border tracking-wide uppercase ${labelBadgeClass}`}
            >
              {baseMetrics.risk_label} Profile
            </span>

            <span
              className={`px-2.5 py-0.5 rounded text-[11px] font-semibold border flex items-center gap-1 ${
                isFullyReliable
                  ? 'bg-gain/10 text-gain border-gain/20'
                  : 'bg-warning/10 text-warning border-warning/20'
              }`}
            >
              {isFullyReliable ? (
                <>
                  <CheckCircle className="w-3 h-3" />
                  <span>100% Price Coverage</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3 h-3" />
                  <span>Partial Price Coverage ({xraySummary.quote_coverage_pct}%)</span>
                </>
              )}
            </span>
          </div>

          <p className="text-sm text-foreground/90 leading-relaxed max-w-2xl font-medium">
            {explanation.narrative}
          </p>

          {/* Primary Drivers Chips */}
          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-1.5 pt-1">
            {explanation.primaryDrivers.slice(0, 3).map((driver, idx) => (
              <span
                key={idx}
                className="px-2.5 py-1 rounded-lg text-[11px] bg-muted/10 text-muted border border-border/60"
              >
                {driver}
              </span>
            ))}
          </div>

          <p className="text-[11px] text-muted/80 italic pt-1">
            * Educational screening only. Does not constitute personal suitability assessment, investment advice, or loss guarantees.
          </p>
        </div>

        {/* Right: Actions */}
        <div className="flex flex-col sm:flex-row lg:flex-col items-center gap-2.5 flex-shrink-0 w-full sm:w-auto">
          <button
            onClick={() => setShowMethodologyModal(true)}
            className="btn-secondary text-xs w-full sm:w-auto inline-flex items-center justify-center gap-1.5 py-2 px-3.5"
            title="Inspect calculation methodology"
          >
            <HelpCircle className="w-3.5 h-3.5 text-brand-500" />
            <span>How We Calculate Risk</span>
          </button>

          {onAskAi && (
            <button
              onClick={() =>
                onAskAi(
                  'risk_classification',
                  `Explain why my portfolio is classified as ${baseMetrics.risk_label} with an educational screening score of ${score}/100.`
                )
              }
              className="px-3.5 py-2 rounded-lg border border-brand-500/30 bg-brand-500/10 hover:bg-brand-500/20 text-brand-500 text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors w-full sm:w-auto"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Ask AI About This Score</span>
            </button>
          )}
        </div>
      </div>

      {/* Methodology Modal */}
      <AnimatePresence>
        {showMethodologyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="card max-w-2xl w-full p-6 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto border border-border"
            >
              <button
                onClick={() => setShowMethodologyModal(false)}
                className="absolute top-5 right-5 p-1 text-muted hover:text-foreground transition-colors"
                title="Close modal"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-brand-500" />
                <h3 className="text-lg font-bold text-foreground">
                  FINOVA Deterministic Risk Methodology
                </h3>
              </div>

              <p className="text-xs text-muted leading-relaxed">
                FINOVA’s Risk Radar is powered by a transparent, single canonical calculation engine. It evaluates observable portfolio concentration and diversification parameters without guessing future price directions.
              </p>

              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-lg border border-border bg-muted/5 space-y-1.5">
                  <p className="font-bold text-foreground">1. Dimension Weighting Formula</p>
                  <p className="text-muted leading-relaxed font-mono text-[11px]">
                    Risk Score = (HHI × 35%) + (Equity Weight × 35%) + (Top Holding Excess × 18%) + (Sector Excess × 12%)
                  </p>
                  <p className="text-muted text-[11px]">
                    Evaluates four distinct market risk vectors: position dispersion, asset class drawdown risk, unsystematic single-company risk, and sectoral macroeconomic exposure.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/5 space-y-1.5">
                  <p className="font-bold text-foreground">2. Herfindahl-Hirschman Index (0–10,000 Scale)</p>
                  <p className="text-muted leading-relaxed text-[11px]">
                    Calculates sum of squared portfolio weights: HHI = Σ(w_i)². Standardized to economic 0–10,000 index.
                    <br />• &lt; 1,500: Well Diversified (Low Concentration)
                    <br />• 1,500 – 2,500: Moderately Concentrated
                    <br />• &ge; 2,500: Highly Concentrated
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/5 space-y-1.5">
                  <p className="font-bold text-foreground">3. Operational Exposure vs Market Risk</p>
                  <p className="text-muted leading-relaxed text-[11px]">
                    Holding assets through a single broker creates an operational execution dependency, but your underlying shares reside securely in central depositories (CDSL/NSDL). FINOVA keeps platform exposure completely separate from market price volatility.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/5 space-y-1.5">
                  <p className="font-bold text-foreground">4. Valued-Subset Denominator Honesty</p>
                  <p className="text-muted leading-relaxed text-[11px]">
                    If market quotes are unavailable for certain positions, concentration percentages are calculated against the reliably valued subset rather than substituting false zero or cost figures.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-warning/20 bg-warning/5 text-warning text-[11px] leading-relaxed">
                  <span className="font-bold">Crucial Distinction: </span>
                  Portfolio screening risk is NOT the user’s personal risk tolerance, and concentration is not the same as historical volatility. A Moderate screening score does not guarantee moderate future losses.
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setShowMethodologyModal(false)}
                  className="btn-primary text-xs py-2 px-4"
                >
                  Understood
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
