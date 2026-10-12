'use client';

import React from 'react';
import Link from 'next/link';
import {
  ShieldAlert,
  ArrowRight,
  PieChart,
  Compass,
  Layers,
  FileCheck,
} from 'lucide-react';
import type { RiskReductionAction } from '@/lib/calculations/xray';

interface RiskReductionPlanProps {
  actions: RiskReductionAction[];
}

export function RiskReductionPlan({ actions }: RiskReductionPlanProps) {
  // Always include a link to Future Lab for rebalancing simulation as requested in Phase 8
  const actionList = [...actions];

  const hasFutureLabAction = actionList.some(
    (a) => a.educational_link === '/future-lab' || a.id === 'act-future-lab-rebalance'
  );

  if (!hasFutureLabAction) {
    actionList.push({
      id: 'act-future-lab-rebalance',
      priority: 'EXPLORE_LEARN',
      priority_label: 'Explore / Learn',
      category: 'asset_class',
      title: 'Simulate Rebalancing in Future Lab',
      observation: 'Examine hypothetical allocation shifts without risking real capital.',
      recommended_step:
        'Model how introducing conservative, balanced, or defensive multi-asset allocations could alter your portfolio drawdown profile.',
      educational_link: '/future-lab',
      action_trigger: 'Proactive portfolio stress-testing and simulation.',
    });
  }

  return (
    <div className="card p-5 space-y-4 border border-border">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
        <div>
          <h3 className="text-base font-bold text-foreground">
            What Can I Do to Reduce Risk?
          </h3>
          <p className="text-xs text-muted mt-0.5">
            Prioritized educational steps derived directly from your portfolio’s observable concentration metrics.
          </p>
        </div>

        <span className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-brand-500/10 text-brand-500 border border-brand-500/20 self-start sm:self-auto">
          Non-Executing Educational Actions
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {actionList.map((action) => {
          const isHighPriority = action.priority === 'HIGH_PRIORITY';
          const isReview = action.priority === 'REVIEW';

          const badgeClass = isHighPriority
            ? 'bg-loss/10 text-loss border-loss/20'
            : isReview
            ? 'bg-warning/10 text-warning border-warning/20'
            : 'bg-brand-500/10 text-brand-500 border-brand-500/20';

          const categoryIcon =
            action.category === 'single_stock' ? (
              <PieChart className="w-4 h-4 text-brand-500" />
            ) : action.category === 'sector' ? (
              <Compass className="w-4 h-4 text-brand-500" />
            ) : action.category === 'data_quality' ? (
              <FileCheck className="w-4 h-4 text-brand-500" />
            ) : (
              <Layers className="w-4 h-4 text-brand-500" />
            );

          return (
            <div
              key={action.id}
              className="p-4 rounded-xl border border-border/60 bg-muted/5 flex flex-col justify-between space-y-3"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {categoryIcon}
                    <h4 className="text-xs font-bold text-foreground">{action.title}</h4>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${badgeClass}`}
                  >
                    {action.priority_label}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-surface/70 border border-border/40 text-[11px] text-muted space-y-1">
                  <p className="font-medium text-foreground">
                    <span className="text-muted">Observation: </span>
                    {action.observation}
                  </p>
                  <p className="text-[10px] text-muted/80">
                    <span className="font-semibold text-muted">Trigger: </span>
                    {action.action_trigger}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] font-semibold text-foreground">Recommended Next Research Step:</p>
                  <p className="text-xs text-muted mt-0.5 leading-relaxed">
                    {action.recommended_step}
                  </p>
                </div>
              </div>

              {action.educational_link && (
                <div className="pt-2 border-t border-border/40 flex justify-end">
                  <Link
                    href={action.educational_link}
                    className="text-xs font-semibold text-brand-500 hover:underline inline-flex items-center gap-1"
                  >
                    <span>Explore in {action.educational_link === '/analysis' ? 'Investment X-Ray' : action.educational_link === '/future-lab' ? 'Future Lab' : action.educational_link === '/explore' ? 'Alternative Explorer' : action.educational_link === '/bonds' ? 'Bonds & SGBs' : 'Investments'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Statutory Non-Executing Disclaimer */}
      <div className="p-3.5 rounded-xl border border-border/60 bg-muted/5 text-[11px] text-muted flex items-start gap-2.5">
        <ShieldAlert className="w-4 h-4 text-brand-500 flex-shrink-0 mt-0.5" />
        <span className="leading-relaxed">
          <strong className="text-foreground">Important Compliance Notice: </strong>
          FINOVA risk-reduction steps are purely educational and non-executing. FINOVA never places orders, executes rebalancing trades, or provides compulsory BUY/SELL advice. Always consult a SEBI-registered financial advisor before altering investment allocations.
        </span>
      </div>
    </div>
  );
}
