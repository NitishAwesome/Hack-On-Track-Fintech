'use client';

import React from 'react';
import { ShieldCheck, Building2 } from 'lucide-react';
import type { RiskMetrics } from '@/types/portfolio';

interface RiskFactorBreakdownProps {
  factors: NonNullable<RiskMetrics['risk_factors']>;
  operationalRisk?: RiskMetrics['operational_risk'];
}

export function RiskFactorBreakdown({
  factors,
  operationalRisk,
}: RiskFactorBreakdownProps) {
  return (
    <div className="card p-5 space-y-4 border border-border">
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <div>
          <h3 className="text-base font-bold text-foreground">Risk Factor Contribution Breakdown</h3>
          <p className="text-xs text-muted mt-0.5">
            Individual weighted dimensions comprising FINOVA’s 0–100 composite portfolio screening score.
          </p>
        </div>
        <span className="text-xs font-semibold text-brand-500 hidden sm:inline">
          Canonical Formula: 100% Deterministic
        </span>
      </div>

      {/* Factor Contribution Cards / Bars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {factors.map((factor) => {
          const isHigh = factor.status === 'high';
          const isElevated = factor.status === 'elevated';
          const isModerate = factor.status === 'moderate';

          const statusColor = isHigh
            ? 'rgb(var(--loss))'
            : isElevated
            ? 'rgb(var(--warning))'
            : isModerate
            ? 'rgb(var(--brand-500))'
            : 'rgb(var(--gain))';

          const badgeClass = isHigh
            ? 'bg-loss/10 text-loss border-loss/20'
            : isElevated
            ? 'bg-warning/10 text-warning border-warning/20'
            : isModerate
            ? 'bg-brand-500/10 text-brand-500 border-brand-500/20'
            : 'bg-gain/10 text-gain border-gain/20';

          return (
            <div
              key={factor.id}
              className="p-4 rounded-xl border border-border/60 bg-muted/5 flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-foreground">{factor.name}</h4>
                    <p className="text-[11px] text-muted font-mono mt-0.5">
                      Actual: <span className="font-semibold text-foreground">{factor.calculatedValue}</span>
                    </p>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border tracking-wide ${badgeClass}`}
                  >
                    {factor.status}
                  </span>
                </div>

                <p className="text-[11px] text-muted leading-relaxed mt-2">
                  {factor.description}
                </p>
              </div>

              {/* Progress bar + contribution math */}
              <div className="space-y-1.5 pt-1 border-t border-border/40">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted">Dimension Score: {factor.score} / 100</span>
                  <span className="font-mono font-bold text-foreground">
                    +{factor.contribution} pts ({factor.weightPct}% weight)
                  </span>
                </div>

                <div className="w-full bg-border/50 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${factor.score}%`,
                      backgroundColor: statusColor,
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Operational Platform Exposure (Kept Separate) */}
      {operationalRisk && (
        <div className="p-4 rounded-xl border border-border bg-muted/10 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-brand-500" />
              <h4 className="text-xs font-bold text-foreground">
                Platform Operational Exposure (Operational Custody)
              </h4>
            </div>

            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-muted/20 text-muted uppercase">
              Operational Factor • Distinct from Market Risk
            </span>
          </div>

          <p className="text-xs text-muted leading-relaxed">
            {operationalRisk.notice}
          </p>

          <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted pt-1 border-t border-border/40">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-gain" />
              <span>Depository Protected (CDSL / NSDL)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-mono font-bold text-foreground">
                {operationalRisk.broker_count}
              </span>
              <span>Tracked Broker Account{operationalRisk.broker_count === 1 ? '' : 's'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
