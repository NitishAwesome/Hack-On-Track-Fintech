'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, HelpCircle, AlertTriangle } from 'lucide-react';
import type { RiskExplanation, EducationalThreshold } from '@/lib/calculations/riskRadar';
import type { RiskMetrics } from '@/types/portfolio';

interface WhyThisClassificationProps {
  explanation: RiskExplanation;
  baseMetrics: RiskMetrics;
  thresholds: EducationalThreshold[];
}

export function WhyThisClassification({
  explanation,
  baseMetrics,
  thresholds,
}: WhyThisClassificationProps) {
  const [isMethodologyExpanded, setIsMethodologyExpanded] = useState(false);

  const riskDisplayCategory =
    baseMetrics.risk_label === 'Conservative'
      ? 'Lower Observed Exposure Risk'
      : baseMetrics.risk_label === 'Moderate'
      ? 'Moderate Observed Exposure Risk'
      : 'Higher Observed Exposure Risk';

  return (
    <div className="card p-5 space-y-4 border border-border">
      <div className="border-b border-border/60 pb-3">
        <h3 className="text-base font-bold text-foreground">
          Why Is My Portfolio Categorized as {riskDisplayCategory}?
        </h3>
        <p className="text-xs text-muted mt-0.5">
          Deterministic explanation generated directly from your portfolio’s observable math.
        </p>
      </div>

      {/* Primary Narrative */}
      <div className="p-4 rounded-xl border border-border/60 bg-muted/5 space-y-3">
        <p className="text-xs sm:text-sm text-foreground/90 font-medium leading-relaxed">
          {explanation.narrative}
        </p>

        <p className="text-xs text-muted leading-relaxed">
          {explanation.riskClassificationRationale}
        </p>

        {/* Primary Deterministic Drivers */}
        <div className="space-y-1.5 pt-2 border-t border-border/40">
          <p className="text-[11px] font-bold text-foreground uppercase tracking-wider">
            Key Contributing Observations:
          </p>
          <ul className="space-y-1">
            {explanation.primaryDrivers.map((driver, idx) => (
              <li
                key={idx}
                className="text-xs text-muted flex items-start gap-2 before:content-['•'] before:text-brand-500 before:font-bold"
              >
                <span>{driver}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Expandable "How We Calculate Risk" Accordion */}
      <div className="border border-border/60 rounded-xl overflow-hidden">
        <button
          onClick={() => setIsMethodologyExpanded(!isMethodologyExpanded)}
          className="w-full p-3.5 bg-muted/5 hover:bg-muted/10 transition-colors flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-brand-500" />
            <span className="text-xs font-bold text-foreground">
              {isMethodologyExpanded ? 'Hide Detailed Risk Calculation Framework' : 'Explore Detailed Risk Calculation Framework & Screening Thresholds'}
            </span>
          </div>

          <span className="text-muted p-1">
            {isMethodologyExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </span>
        </button>

        <AnimatePresence>
          {isMethodologyExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="p-4 space-y-4 border-t border-border/60 text-xs"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-border bg-surface space-y-1">
                  <span className="font-bold text-foreground">Single-Stock Concentration</span>
                  <p className="text-muted leading-relaxed text-[11px]">
                    Heuristic limits: &lt;15% conservative, 15%–25% moderate, &gt;25% elevated, &gt;40% high. Protects against company-specific operational shocks.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-surface space-y-1">
                  <span className="font-bold text-foreground">Herfindahl-Hirschman Index (HHI)</span>
                  <p className="text-muted leading-relaxed text-[11px]">
                    Evaluated on 0–10,000 scale: &lt;1,500 low concentration, 1,500–2,500 moderate, &ge;2,500 high concentration. Measures capital dispersion.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-surface space-y-1">
                  <span className="font-bold text-foreground">Sector Concentration</span>
                  <p className="text-muted leading-relaxed text-[11px]">
                    Limits: &lt;25% balanced, 25%–35% moderate, &gt;35% elevated, &gt;50% high. Shields against macroeconomic and regulatory industry headwinds.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-surface space-y-1">
                  <span className="font-bold text-foreground">Asset Class Allocation</span>
                  <p className="text-muted leading-relaxed text-[11px]">
                    Assesses equity vs non-equity buffers. All-equity portfolios (&gt;90%) carry higher drawdown sensitivity during broad market selloffs.
                  </p>
                </div>
              </div>

              {/* Thresholds Table */}
              <div className="space-y-2 pt-2">
                <h4 className="font-bold text-foreground text-xs">Educational Screening Reference Table</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border border-border rounded-lg overflow-hidden">
                    <thead className="bg-muted/20 text-muted uppercase text-[10px] border-b border-border">
                      <tr>
                        <th className="py-2 px-3">Metric</th>
                        <th className="py-2 px-3">Conservative</th>
                        <th className="py-2 px-3">Moderate</th>
                        <th className="py-2 px-3">Your Portfolio</th>
                        <th className="py-2 px-3">Diagnostic Rationale</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {thresholds.map((t) => (
                        <tr key={t.metric} className="hover:bg-muted/5">
                          <td className="py-2 px-3 font-semibold text-foreground">{t.metric}</td>
                          <td className="py-2 px-3 text-muted">{t.conservativeLimit}</td>
                          <td className="py-2 px-3 text-muted">{t.moderateLimit}</td>
                          <td className="py-2 px-3 font-mono font-bold">
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
                          <td className="py-2 px-3 text-muted text-[11px]">{t.screeningRationale}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Statutory Disclaimers */}
              <div className="p-3 rounded-lg border border-warning/30 bg-warning/5 text-warning text-[11px] space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Important Methodological Boundaries:</span>
                </p>
                <ul className="list-disc list-inside space-y-0.5 pl-1 text-warning/90">
                  <li>Portfolio screening risk is NOT the user&apos;s personal risk tolerance (e.g. liquidity needs, investment horizon, age).</li>
                  <li>Portfolio concentration is NOT the same as historical volatility.</li>
                  <li>A Moderate screening score does NOT guarantee moderate future losses.</li>
                </ul>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
