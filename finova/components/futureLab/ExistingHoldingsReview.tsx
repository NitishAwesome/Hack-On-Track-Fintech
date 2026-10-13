'use client';

// ============================================================
// FINOVA — Future Lab: Your Holdings — What Should You Research Next?
// components/futureLab/ExistingHoldingsReview.tsx
//
// Direct Holding-Wise Next Steps:
// - Company / instrument name & symbol
// - Actual portfolio exposure percentage
// - Relevant concentration information
// - Latest available price status
// - Relevant recent financial news synthesis
// - Positive developments, if evidenced
// - Cautionary developments, if evidenced
// - Research recommendations with explanation:
//   - "Monitor Position"
//   - "Review Concentration"
//   - "Research Further"
//   - "Review Potential Exposure Reduction"
//   - "Insufficient Recent Evidence"
// - Supporting news sources and timestamps (Marketaux, GDELT, NewsData.io)
// - Direct links to Investment X-Ray & Investment Explorer
// - STRICT Non-Advisory Mandate: Research priorities, NOT trading orders.
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
  ExternalLink,
  Clock,
  TrendingUp,
  HelpCircle,
  TrendingDown,
  BarChart2,
} from 'lucide-react';
import {
  evaluateHoldingOutlook,
  type HoldingStockOutlook,
  type OutlookLabel,
} from '@/lib/news/holdingOutlook';
import { formatIndianCurrency } from '@/lib/utils';
import type { ConsolidatedInstrumentExposure } from '@/lib/calculations/xray';
import type { NormalizedNewsArticle, PersonalizedNewsArticle } from '@/types/news';

export type ResearchActionLabel =
  | 'Review Potential Exposure Reduction'
  | 'Review Concentration'
  | 'Research Further'
  | 'Monitor Position'
  | 'Insufficient Recent Evidence';

export interface HoldingResearchAction {
  actionLabel: ResearchActionLabel;
  actionExplanation: string;
  badgeStyle: string;
  priorityLevel: 'HIGH' | 'MEDIUM' | 'LOW' | 'NEUTRAL';
}

export function determineResearchAction(
  instrument: ConsolidatedInstrumentExposure,
  outlook: HoldingStockOutlook
): HoldingResearchAction {
  const weight = instrument.percentage_of_valued_portfolio;
  const isHighExposure = weight >= 35;
  const isElevatedExposure = weight >= 25;
  const hasCaution = outlook.outlook_label === 'Caution indicators';

  if (isHighExposure && hasCaution) {
    return {
      actionLabel: 'Review Potential Exposure Reduction',
      actionExplanation: `Position accounts for ${weight.toFixed(1)}% of valued portfolio with cautionary developments observed. Review whether to reduce exposure to lower single-stock vulnerability.`,
      badgeStyle: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
      priorityLevel: 'HIGH',
    };
  }

  if (isElevatedExposure) {
    return {
      actionLabel: 'Review Concentration',
      actionExplanation: `Position comprises ${weight.toFixed(1)}% of valued capital (exceeds 25% screening threshold). Evaluate single-stock concentration against your diversification thesis.`,
      badgeStyle: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
      priorityLevel: 'MEDIUM',
    };
  }

  if (outlook.outlook_label === 'Insufficient recent evidence' || outlook.cited_articles.length === 0) {
    return {
      actionLabel: 'Insufficient Recent Evidence',
      actionExplanation: `Limited recent dated financial news returned by providers. Verify upcoming earnings dates and quarterly disclosures on NSE/BSE filings portals.`,
      badgeStyle: 'bg-surface-raised dark:bg-slate-800 text-muted dark:text-slate-400 border-border dark:border-slate-700',
      priorityLevel: 'NEUTRAL',
    };
  }

  if (outlook.outlook_label === 'Needs further research' || outlook.outlook_label === 'Mixed / uncertain evidence') {
    return {
      actionLabel: 'Research Further',
      actionExplanation: `Mixed operational indicators or unconfirmed industry developments evidenced. Deepen balance sheet and sector research before altering allocation.`,
      badgeStyle: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
      priorityLevel: 'MEDIUM',
    };
  }

  return {
    actionLabel: 'Monitor Position',
    actionExplanation: `Constructive developments observed with controlled portfolio weight (${weight.toFixed(1)}%). Continue regular position monitoring.`,
    badgeStyle: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
    priorityLevel: 'LOW',
  };
}

interface ExistingHoldingsReviewProps {
  instruments: ConsolidatedInstrumentExposure[];
  articles?: (NormalizedNewsArticle | PersonalizedNewsArticle)[];
  onExploreAlternatives?: () => void;
}

export const ExistingHoldingsReview: React.FC<ExistingHoldingsReviewProps> = ({
  instruments,
  articles = [],
  onExploreAlternatives,
}) => {
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);

  // Take all instruments (or top 8 if very large)
  const evaluatedHoldings = instruments.slice(0, 8);

  if (evaluatedHoldings.length === 0) {
    return (
      <div className="bg-surface/80 dark:bg-slate-900/80 border border-border dark:border-slate-800 rounded-2xl p-6 backdrop-blur-sm text-center">
        <h3 className="text-base font-bold text-foreground dark:text-white mb-1">
          Your Holdings — What Should You Research Next?
        </h3>
        <p className="text-xs text-muted dark:text-slate-400">
          No holdings recorded in your portfolio yet. Add investments to evaluate evidence-based research priorities.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-surface/80 dark:bg-slate-900/80 border border-border dark:border-slate-800 rounded-2xl p-6 backdrop-blur-sm space-y-5">
      {/* ─── Header ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/80 dark:border-slate-800/80 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-700 dark:text-purple-400">
            <Search className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-foreground dark:text-white tracking-tight">
                Your Holdings — What Should You Research Next?
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
                Holding-Wise Next Steps
              </span>
            </div>
            <p className="text-xs text-muted dark:text-slate-400 mt-0.5">
              Prioritized research actions and news synthesis grounded in your actual portfolio exposures
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/analysis"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 self-start sm:self-auto"
          >
            <span>Open Investment X-Ray</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* ─── Non-Advisory Notice ─────────────────────────────────── */}
      <div className="p-3 rounded-xl bg-background/80 dark:bg-slate-950/80 border border-border dark:border-slate-800 flex items-start gap-2.5 text-xs text-muted dark:text-slate-400">
        <ShieldAlert className="w-4 h-4 text-purple-700 dark:text-purple-400 shrink-0 mt-0.5" />
        <div className="text-[11px] leading-relaxed">
          <span className="font-semibold text-foreground dark:text-slate-200">Research Priorities, Not Order Recommendations: </span>
          The guidance below highlights research priorities to explore before deciding to hold, increase, or reduce exposure. FINOVA never issues automated BUY, SELL, or HOLD commands.
        </div>
      </div>

      {/* ─── Holdings Cards ────────────────────────────────────── */}
      <div className="space-y-4">
        {evaluatedHoldings.map((inst) => {
          // Reuses canonical evaluateHoldingOutlook with real fetched articles
          const outlook: HoldingStockOutlook = evaluateHoldingOutlook(inst, articles);
          const researchAction = determineResearchAction(inst, outlook);
          const weight = inst.percentage_of_valued_portfolio;
          const isConcentrated = weight >= 25;
          const isAlert = weight >= 35;
          const isExpanded = selectedSymbol === inst.symbol;

          return (
            <div
              key={inst.canonical_key}
              className="p-4 rounded-xl bg-background/70 dark:bg-slate-950/70 border border-border/80 dark:border-slate-800/80 hover:border-border dark:hover:border-slate-700 transition-colors space-y-3"
            >
              {/* Top Row: Symbol, Weight, Price Status, Action Badge */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                {/* Symbol & Name */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-surface dark:bg-slate-900 border border-border dark:border-slate-800 flex items-center justify-center font-bold text-sm text-foreground dark:text-slate-200 shrink-0">
                    {inst.symbol.substring(0, 3)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground dark:text-white text-sm">
                        {inst.symbol}
                      </span>
                      <span className="text-xs text-muted dark:text-slate-400">
                        ({inst.name})
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[11px] text-muted dark:text-slate-400">
                      <span>{inst.sector || 'Unclassified'}</span>
                      <span>•</span>
                      <span>Exposure: <strong className="text-foreground dark:text-slate-200">{weight.toFixed(1)}%</strong></span>
                      {inst.current_value !== null ? (
                        <>
                          <span>•</span>
                          <span>Value: {formatIndianCurrency(inst.current_value)}</span>
                        </>
                      ) : null}
                      <span>•</span>
                      <span className={inst.is_quoted && inst.current_price !== null ? 'text-foreground dark:text-slate-300' : 'text-amber-700 dark:text-amber-400'}>
                        {inst.is_quoted && inst.current_price !== null
                          ? `Price: ₹${inst.current_price.toLocaleString('en-IN')}`
                          : 'Unpriced in active feed'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Badges: Concentration & Research Action */}
                <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
                  {/* Concentration Tag */}
                  {isAlert ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      High Tilt ({weight.toFixed(1)}%)
                    </span>
                  ) : isConcentrated ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Elevated ({weight.toFixed(1)}%)
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-surface-raised dark:bg-slate-800 text-muted dark:text-slate-400 border border-border dark:border-slate-700">
                      Prudent Allocation
                    </span>
                  )}

                  {/* Research Action Badge */}
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border flex items-center gap-1 ${researchAction.badgeStyle}`}>
                    <span>{researchAction.actionLabel}</span>
                  </span>

                  {/* Toggle details */}
                  <button
                    type="button"
                    onClick={() => setSelectedSymbol(isExpanded ? null : inst.symbol)}
                    className="p-1.5 rounded-lg bg-surface dark:bg-slate-900 hover:bg-surface-raised dark:hover:bg-slate-800 text-muted dark:text-slate-400 hover:text-foreground dark:hover:text-white border border-border dark:border-slate-800 transition-colors ml-1"
                    title={isExpanded ? 'Collapse research guidance' : 'Expand research guidance'}
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Research Action Explanation Banner */}
              <div className="text-xs text-foreground dark:text-slate-300 leading-relaxed bg-surface/60 dark:bg-slate-900/60 p-3 rounded-lg border border-border/80 dark:border-slate-800/80">
                <span className="font-semibold text-foreground dark:text-white">Research Priority: </span>
                {researchAction.actionExplanation}
              </div>

              {/* Expandable Details: News Evidence, Developments, Links */}
              {isExpanded && (
                <div className="pt-3 border-t border-border/80 dark:border-slate-800/80 space-y-3.5">
                  {/* Factual Developments & Reasons to Monitor */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {/* Positive / Constructive Developments */}
                    <div className="p-3 rounded-lg bg-surface/40 dark:bg-slate-900/40 border border-border dark:border-slate-800 space-y-1.5">
                      <div className="flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400 text-[11px]">
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span>Observed Positive Developments</span>
                      </div>
                      {outlook.factual_developments.length > 0 ? (
                        <ul className="space-y-1 text-[11px] text-foreground dark:text-slate-300 list-disc list-inside">
                          {outlook.factual_developments.map((dev, i) => (
                            <li key={i}>{dev}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-[11px] text-muted dark:text-slate-400 italic">
                          No distinct positive corporate events verified in current news window.
                        </p>
                      )}
                    </div>

                    {/* Cautionary Factors / Reasons to Review */}
                    <div className="p-3 rounded-lg bg-surface/40 dark:bg-slate-900/40 border border-border dark:border-slate-800 space-y-1.5">
                      <div className="flex items-center gap-1.5 font-semibold text-amber-700 dark:text-amber-400 text-[11px]">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Cautionary Observations &amp; Questions</span>
                      </div>
                      {outlook.reasons_to_review.length > 0 ? (
                        <ul className="space-y-1 text-[11px] text-foreground dark:text-slate-300 list-disc list-inside">
                          {outlook.reasons_to_review.map((item, i) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-[11px] text-muted dark:text-slate-400 italic">
                          No acute operational or governance warnings flagged in verified media.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Supporting News Articles & Timestamp Attribution */}
                  {outlook.cited_articles.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-muted dark:text-slate-400 uppercase tracking-wider block">
                        Supporting News Sources ({outlook.cited_articles.length} verified):
                      </span>
                      <div className="space-y-1.5">
                        {outlook.cited_articles.map((art) => (
                          <div
                            key={art.article_id}
                            className="p-2.5 rounded-lg bg-surface/70 dark:bg-slate-900/70 border border-border dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                          >
                            <div className="space-y-0.5">
                              <a
                                href={art.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium text-foreground dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition flex items-center gap-1"
                              >
                                <span>{art.title}</span>
                                <ExternalLink className="w-3 h-3 shrink-0" />
                              </a>
                              <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted dark:text-slate-400">
                                <span>{art.publisher}</span>
                                <span>•</span>
                                <span>Provider: {art.provider}</span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-2.5 h-2.5" />
                                  {art.formatted_time}
                                </span>
                                {art.is_delayed_feed && art.delay_note && (
                                  <span className="text-amber-700 dark:text-amber-400 font-mono">
                                    [{art.delay_note}]
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Cross-Feature Research Links */}
                  <div className="pt-2 flex flex-wrap items-center gap-2 text-xs">
                    <Link
                      href={`/analysis?holding=${encodeURIComponent(inst.symbol)}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface dark:bg-slate-900 hover:bg-surface-raised dark:hover:bg-slate-800 text-foreground dark:text-slate-200 border border-border dark:border-slate-700 transition-colors"
                    >
                      <BarChart2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      <span>Inspect in Investment X-Ray</span>
                    </Link>

                    <Link
                      href={`/explore?symbol=${encodeURIComponent(inst.symbol)}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface dark:bg-slate-900 hover:bg-surface-raised dark:hover:bg-slate-800 text-foreground dark:text-slate-200 border border-border dark:border-slate-700 transition-colors"
                    >
                      <Compass className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                      <span>Research on Investment Explorer</span>
                    </Link>

                    {onExploreAlternatives && (
                      <button
                        type="button"
                        onClick={onExploreAlternatives}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface dark:bg-slate-900 hover:bg-surface-raised dark:hover:bg-slate-800 text-foreground dark:text-slate-200 border border-border dark:border-slate-700 transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5 text-purple-700 dark:text-purple-400" />
                        <span>Diversification Alternatives</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

