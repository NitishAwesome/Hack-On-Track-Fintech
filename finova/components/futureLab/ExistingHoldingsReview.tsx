'use client';

// ============================================================
// FINOVA — Future Lab 2.0: Existing Holdings Review Component
// components/futureLab/ExistingHoldingsReview.tsx
//
// Answers "What should I do with my existing stocks?"
// Reuses Investment X-Ray 2.0 Holding Outlook (evaluateHoldingOutlook):
// - Company Name & Canonical Symbol
// - Portfolio Weight (%) & Unrealized P&L
// - Concentration Flag (>25% or >40%)
// - Evidence-Based Outlook Label & Tone Badge
// - Supported Research Actions (Monitor, Thesis, Disclosures, Alternatives, Rebalance)
// - STRICT SEBI-Aligned Non-Advisory Framing: No BUY/SELL/HOLD instructions.
// ============================================================

import React, { useState } from 'react';
import Link from 'next/link';
import {
  FileText,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  Search,
  Eye,
  Compass,
} from 'lucide-react';
import {
  evaluateHoldingOutlook,
  type HoldingStockOutlook,
  type OutlookLabel,
} from '@/lib/news/holdingOutlook';
import { formatIndianCurrency } from '@/lib/utils';
import type { ConsolidatedInstrumentExposure } from '@/lib/calculations/xray';

interface ExistingHoldingsReviewProps {
  instruments: ConsolidatedInstrumentExposure[];
  onExploreAlternatives?: () => void;
}

export const ExistingHoldingsReview: React.FC<ExistingHoldingsReviewProps> = ({
  instruments,
  onExploreAlternatives,
}) => {
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);

  // Take top 5 holdings
  const topHoldings = instruments.slice(0, 5);

  if (topHoldings.length === 0) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm text-center">
        <h3 className="text-base font-bold text-white mb-1">
          Review Your Existing Holdings
        </h3>
        <p className="text-xs text-slate-400">
          No holdings recorded in your portfolio yet. Add investments to evaluate evidence-based stock outlooks.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm space-y-5">
      {/* ─── Header ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <Search className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">
              Review Your Existing Holdings
            </h3>
            <p className="text-xs text-slate-400">
              Evidence-based outlooks from Investment X-Ray and recommended educational research steps
            </p>
          </div>
        </div>

        <Link
          href="/analysis"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-400 hover:text-blue-300 self-start sm:self-auto"
        >
          <span>Open Full X-Ray</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* ─── Holdings Cards ────────────────────────────────────── */}
      <div className="space-y-3.5">
        {topHoldings.map((inst) => {
          // Reuses the identical deterministic Holding Outlook engine
          const outlook: HoldingStockOutlook = evaluateHoldingOutlook(inst, []);
          const isConcentrated = inst.percentage_of_valued_portfolio >= 25;
          const isAlert = inst.percentage_of_valued_portfolio >= 40;
          const isExpanded = selectedSymbol === inst.symbol;

          return (
            <div
              key={inst.canonical_key}
              className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 transition-colors"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                {/* Symbol & Name */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center font-bold text-sm text-slate-200 shrink-0">
                    {inst.symbol.substring(0, 3)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">
                        {inst.symbol}
                      </span>
                      <span className="text-xs text-slate-400">
                        ({inst.name})
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                      <span>{inst.sector || 'Unclassified'}</span>
                      <span>•</span>
                      <span>Weight: <strong className="text-slate-200">{inst.percentage_of_valued_portfolio.toFixed(1)}%</strong></span>
                      {inst.current_value !== null && (
                        <>
                          <span>•</span>
                          <span>Value: {formatIndianCurrency(inst.current_value)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Badges: Concentration & Outlook */}
                <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
                  {/* Concentration Tag */}
                  {isAlert ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      High Tilt ({inst.percentage_of_valued_portfolio.toFixed(1)}%)
                    </span>
                  ) : isConcentrated ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Elevated ({inst.percentage_of_valued_portfolio.toFixed(1)}%)
                    </span>
                  ) : null}

                  {/* Outlook Badge */}
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${getOutlookBadgeStyle(outlook.outlook_label)}`}>
                    {outlook.outlook_label}
                  </span>

                  {/* Toggle details */}
                  <button
                    type="button"
                    onClick={() => setSelectedSymbol(isExpanded ? null : inst.symbol)}
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors ml-1"
                    title="View Research Steps"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Expandable Educational Research Actions */}
              {isExpanded && (
                <div className="mt-4 pt-3.5 border-t border-slate-800/80 space-y-3">
                  <div className="text-[11px] text-slate-300 leading-relaxed bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                    <span className="font-semibold text-slate-200">X-Ray Synthesis: </span>
                    {outlook.concentration_observation}
                  </div>

                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                      Supported Objective Research Actions:
                    </span>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <Link
                        href={`/analysis?holding=${inst.symbol}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5 text-blue-400" />
                        <span>Check Disclosures & Earnings</span>
                      </Link>

                      <Link
                        href="/risk"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 transition-colors"
                      >
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                        <span>Review Concentration Thesis</span>
                      </Link>

                      {onExploreAlternatives ? (
                        <button
                          type="button"
                          onClick={onExploreAlternatives}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 transition-colors text-left"
                        >
                          <Compass className="w-3.5 h-3.5 text-purple-400" />
                          <span>Research Alternatives (REIT/Bond)</span>
                        </button>
                      ) : (
                        <Link
                          href="/explore"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 transition-colors"
                        >
                          <Compass className="w-3.5 h-3.5 text-purple-400" />
                          <span>Research Alternatives (REIT/Bond)</span>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ─── Statutory Disclosure ───────────────────────────────── */}
      <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-2.5 text-xs text-slate-400">
        <ShieldAlert className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <div className="text-[11px] leading-relaxed">
          <span className="font-semibold text-slate-300">Non-Advisory Mandate: </span>
          FINOVA provides factual news synthesis and holding-concentration diagnostics. FINOVA never issues automated BUY, HOLD, or SELL recommendations, price targets, or algorithmic trading instructions.
        </div>
      </div>
    </div>
  );
};

function getOutlookBadgeStyle(label: OutlookLabel): string {
  switch (label) {
    case 'Positive developments observed':
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    case 'Caution indicators':
      return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    case 'Mixed / uncertain evidence':
      return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    case 'Needs further research':
      return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    case 'Insufficient recent evidence':
    default:
      return 'bg-slate-800 text-slate-400 border-slate-700';
  }
}
