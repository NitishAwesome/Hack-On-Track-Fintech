'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Filter,
} from 'lucide-react';
import type { SmartRiskObservation } from '@/lib/calculations/riskRadar';

interface RiskObservationsFeedProps {
  observations: SmartRiskObservation[];
  onAskAi?: (topic: string, queryPrompt: string) => void;
}

export function RiskObservationsFeed({
  observations,
  onAskAi,
}: RiskObservationsFeedProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const categories: { label: string; value: string }[] = [
    { label: 'All Observations', value: 'ALL' },
    { label: 'Concentration', value: 'concentration' },
    { label: 'Sectors', value: 'sector' },
    { label: 'Asset Class', value: 'asset_class' },
    { label: 'Platform & Broker', value: 'broker' },
    { label: 'Data Quality', value: 'data_quality' },
    { label: 'Cross-Broker Overlap', value: 'overlap' },
  ];

  const filtered = observations.filter((obs) => {
    if (selectedCategory === 'ALL') return true;
    return obs.category === selectedCategory;
  });

  return (
    <div className="card p-5 space-y-4 border border-border">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div>
          <h3 className="text-base font-bold text-foreground">
            Explainable Smart Risk Observations ({filtered.length})
          </h3>
          <p className="text-xs text-muted mt-0.5">
            Rule-based, explainable diagnostics generated deterministically from your actual holdings.
          </p>
        </div>

        {onAskAi && (
          <button
            onClick={() =>
              onAskAi('concentration', 'Explain how high concentration risk influences drawdown severity during market corrections.')
            }
            className="px-2.5 py-1.5 rounded-lg border border-border bg-surface hover:bg-muted/10 text-muted hover:text-foreground transition-colors inline-flex items-center gap-1.5 text-xs self-start sm:self-auto font-medium"
          >
            <Sparkles className="w-3.5 h-3.5 text-brand-500" />
            <span>Ask AI: Concentration Risk</span>
          </button>
        )}
      </div>

      {/* Filter Category Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <Filter className="w-3.5 h-3.5 text-muted flex-shrink-0 mr-1" />
        {categories.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setSelectedCategory(cat.value)}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedCategory === cat.value
                ? 'bg-brand-500 text-white shadow-sm'
                : 'bg-muted/10 text-muted hover:text-foreground hover:bg-muted/20'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Observations List */}
      <div className="space-y-3 pt-1">
        {filtered.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted">
            No observations matching the selected filter.
          </div>
        ) : (
          filtered.map((obs) => {
            const isExpanded = expandedId === obs.id;
            const isAlert = obs.severity === 'alert';
            const isWarning = obs.severity === 'warning';

            const borderClass = isAlert
              ? 'border-l-loss bg-loss/5'
              : isWarning
              ? 'border-l-warning bg-warning/5'
              : 'border-l-brand-500 bg-surface';

            const badgeClass = isAlert
              ? 'bg-loss/10 text-loss'
              : isWarning
              ? 'bg-warning/10 text-warning'
              : 'bg-brand-500/10 text-brand-500';

            return (
              <div
                key={obs.id}
                className={`card p-4 transition-all border border-border border-l-4 ${borderClass}`}
              >
                <div
                  onClick={() => setExpandedId(isExpanded ? null : obs.id)}
                  className="flex items-start justify-between cursor-pointer gap-3 select-none"
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
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${badgeClass}`}
                        >
                          {obs.category.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-muted mt-1 font-mono">{obs.calculatedFigure}</p>
                    </div>
                  </div>

                  <button
                    className="p-1 text-muted hover:text-foreground flex-shrink-0"
                    title={isExpanded ? 'Collapse' : 'Expand'}
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                {/* Expandable Details */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="pt-3.5 mt-3 border-t border-border/60 text-xs space-y-3"
                    >
                      <div>
                        <p className="font-semibold text-foreground">Why It Matters:</p>
                        <p className="text-muted mt-0.5 leading-relaxed">{obs.whyItMatters}</p>
                      </div>

                      {obs.contributingHoldings.length > 0 && (
                        <div>
                          <p className="font-semibold text-foreground">Source Data & Contributing Positions:</p>
                          <ul className="list-disc list-inside text-muted mt-0.5 space-y-0.5 pl-1">
                            {obs.contributingHoldings.map((h, idx) => (
                              <li key={idx}>{h}</li>
                            ))}
                          </ul>
                        </div>
                      )}

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
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
