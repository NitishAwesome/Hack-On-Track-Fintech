'use client';

// ============================================================
// FINOVA — Prioritized Risk-Reduction Action Plan
// components/analysis/RiskReductionActionPlan.tsx
// ============================================================

import React from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Lightbulb,
  Info,
} from 'lucide-react';
import type { UnifiedXRayAnalysis } from '@/lib/calculations/xray';

interface RiskReductionActionPlanProps {
  data: UnifiedXRayAnalysis;
}

export function RiskReductionActionPlan({ data }: RiskReductionActionPlanProps) {
  const { risk_reduction_actions: actions } = data;

  if (!actions || actions.length === 0) return null;

  return (
    <div className="card p-5 space-y-5 border-l-4 border-l-brand-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-foreground">
              How Could I Reduce Portfolio Risk?
            </h2>
            <span className="text-[11px] px-2 py-0.5 rounded font-semibold bg-brand-500/10 text-brand-500">
              {actions.length} Prioritized Steps
            </span>
          </div>
          <p className="text-xs text-muted mt-0.5">
            Contextual research suggestions based on your portfolio&rsquo;s observed concentrations. Non-executing and educational.
          </p>
        </div>
      </div>

      {/* Action Cards List */}
      <div className="space-y-3">
        {actions.map((action, index) => {
          const isHighPriority = action.priority === 'HIGH_PRIORITY';
          const isReview = action.priority === 'REVIEW';

          const badgeClass = isHighPriority
            ? 'bg-loss/10 text-loss border-loss/20'
            : isReview
            ? 'bg-warning/10 text-warning border-warning/20'
            : 'bg-brand-500/10 text-brand-500 border-brand-500/20';

          return (
            <div
              key={action.id || index}
              className="p-4 rounded-xl border border-border bg-surface/50 hover:bg-surface transition-colors space-y-2.5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-semibold border ${badgeClass}`}
                  >
                    {action.priority_label}
                  </span>
                  <h3 className="text-xs font-bold text-foreground">{action.title}</h3>
                </div>

                <span className="text-[10px] text-muted font-mono uppercase tracking-wider">
                  Step {index + 1}
                </span>
              </div>

              {/* Observation & Trigger */}
              <div className="p-2.5 rounded-lg bg-muted/10 text-xs text-muted leading-relaxed">
                <span className="font-semibold text-foreground">Observation: </span>
                {action.observation}
              </div>

              {/* Recommended Next Step */}
              <div className="text-xs text-foreground leading-relaxed flex items-start gap-2 pt-1">
                <Lightbulb className="w-3.5 h-3.5 text-brand-500 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-brand-500">Suggested Action: </span>
                  <span>{action.recommended_step}</span>
                </div>
              </div>

              {/* Educational Link if applicable */}
              {action.educational_link && (
                <div className="pt-2 border-t border-border/40 flex justify-end">
                  <Link
                    href={action.educational_link}
                    className="text-[11px] font-semibold text-brand-500 hover:underline inline-flex items-center gap-1"
                  >
                    <span>Explore Educational Section</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Disclaimers */}
      <div className="p-3 rounded-xl bg-surface border border-border text-[11px] text-muted leading-relaxed flex items-start gap-2">
        <Info className="w-3.5 h-3.5 text-muted flex-shrink-0 mt-0.5" />
        <span>
          <span className="font-semibold text-foreground">Non-Advisory Mandate:</span> FINOVA never automatically executes rebalances, orders, or transfers. These suggestions highlight structural research questions to discuss with a certified financial advisor.
        </span>
      </div>
    </div>
  );
}
