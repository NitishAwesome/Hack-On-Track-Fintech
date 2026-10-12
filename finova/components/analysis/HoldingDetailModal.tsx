'use client';

// ============================================================
// FINOVA — Holding-Level Detailed Deep Dive & Evidence-Based Outlook Modal
// components/analysis/HoldingDetailModal.tsx
// ============================================================

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  ExternalLink,
  Info,
  RefreshCw,
  BookOpen,
} from 'lucide-react';
import { formatIndianCurrency } from '@/lib/utils';
import type { ConsolidatedInstrumentExposure } from '@/lib/calculations/xray';
import {
  evaluateHoldingOutlook,
  type HoldingStockOutlook,
} from '@/lib/news/holdingOutlook';
import type { NormalizedNewsArticle, PersonalizedNewsArticle } from '@/types/news';

interface HoldingDetailModalProps {
  instrument: ConsolidatedInstrumentExposure | null;
  onClose: () => void;
}

export function HoldingDetailModal({
  instrument,
  onClose,
}: HoldingDetailModalProps) {
  const [newsLoading, setNewsLoading] = useState(false);
  const [outlook, setOutlook] = useState<HoldingStockOutlook | null>(null);

  useEffect(() => {
    if (!instrument) return;

    let isMounted = true;
    // Load holding news asynchronously
    async function loadHoldingNews() {
      setNewsLoading(true);
      try {
        const res = await fetch(`/api/news?symbol=${encodeURIComponent(instrument!.symbol)}`);
        if (!res.ok) {
          throw new Error('Failed to load news');
        }
        const data = await res.json();
        const articles: (NormalizedNewsArticle | PersonalizedNewsArticle)[] = data.articles || [];

        if (isMounted) {
          const evaluated = evaluateHoldingOutlook(instrument!, articles);
          setOutlook(evaluated);
        }
      } catch {
        if (isMounted) {
          // Pure fallback without fabricating news
          const evaluated = evaluateHoldingOutlook(instrument!, []);
          setOutlook(evaluated);
        }
      } finally {
        if (isMounted) {
          setNewsLoading(false);
        }
      }
    }

    loadHoldingNews();

    return () => {
      isMounted = false;
    };
  }, [instrument]);

  if (!instrument) return null;

  const avgBuyPrice =
    instrument.total_quantity > 0
      ? instrument.total_invested_value / instrument.total_quantity
      : 0;

  const pnl =
    instrument.current_value !== null
      ? instrument.current_value - instrument.total_invested_value
      : null;

  const pnlPct =
    instrument.current_value !== null && instrument.total_invested_value > 0
      ? ((instrument.current_value - instrument.total_invested_value) /
          instrument.total_invested_value) *
        100
      : null;

  // Outlook Badge tone styling
  const badgeTone = outlook?.outlook_badge_tone || 'muted';
  const badgeClass =
    badgeTone === 'gain'
      ? 'bg-gain/10 text-gain border-gain/20'
      : badgeTone === 'warning'
      ? 'bg-warning/10 text-warning border-warning/20'
      : badgeTone === 'loss'
      ? 'bg-loss/10 text-loss border-loss/20'
      : badgeTone === 'brand'
      ? 'bg-brand-500/10 text-brand-500 border-brand-500/20'
      : 'bg-muted/10 text-muted border-border';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        className="card max-w-2xl w-full p-6 space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1 text-muted hover:text-foreground transition-colors"
          title="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 1. Header & Identifiers */}
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-foreground">{instrument.name}</h2>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-muted/20 text-foreground uppercase">
              {instrument.asset_class}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-muted mt-1">
            <span className="font-mono font-bold text-foreground">{instrument.symbol}</span>
            <span>•</span>
            <span>Sector: {instrument.sector || 'Unclassified'}</span>
            {instrument.isin && (
              <>
                <span>•</span>
                <span className="font-mono">ISIN: {instrument.isin}</span>
              </>
            )}
            {instrument.exchange && (
              <>
                <span>•</span>
                <span>{instrument.exchange}</span>
              </>
            )}
          </div>
        </div>

        {/* 2. Portfolio Importance & Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 rounded-xl bg-muted/10 text-xs">
          <div>
            <span className="text-muted">Portfolio Weight:</span>
            <p className="text-base font-bold font-mono text-brand-500 mt-0.5">
              {instrument.percentage_of_valued_portfolio.toFixed(1)}%
            </p>
          </div>
          <div>
            <span className="text-muted">Market Valuation:</span>
            <p className="text-base font-bold font-mono text-foreground mt-0.5">
              {instrument.current_value !== null
                ? formatIndianCurrency(instrument.current_value)
                : 'Unquoted'}
            </p>
          </div>
          <div>
            <span className="text-muted">Invested Capital:</span>
            <p className="text-base font-bold font-mono text-foreground mt-0.5">
              {formatIndianCurrency(instrument.total_invested_value)}
            </p>
          </div>
          <div>
            <span className="text-muted">Unrealized P&amp;L:</span>
            <p
              className={`text-base font-bold font-mono mt-0.5 ${
                pnl !== null && pnl >= 0 ? 'text-gain' : 'text-loss'
              }`}
            >
              {pnl !== null
                ? `${pnl >= 0 ? '+' : ''}${formatIndianCurrency(pnl)}${
                    pnlPct !== null
                      ? ` (${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(1)}%)`
                      : ''
                  }`
                : '—'}
            </p>
          </div>
        </div>

        {/* 3. Holding Details (Consolidated Quantity, Avg Price, Live Price) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
          <div className="p-3 rounded-lg border border-border bg-surface/50">
            <span className="text-muted">Consolidated Shares:</span>
            <p className="text-sm font-bold font-mono text-foreground mt-0.5">
              {instrument.total_quantity}
            </p>
          </div>
          <div className="p-3 rounded-lg border border-border bg-surface/50">
            <span className="text-muted">Average Buy Cost:</span>
            <p className="text-sm font-bold font-mono text-foreground mt-0.5">
              {formatIndianCurrency(avgBuyPrice)}
            </p>
          </div>
          <div className="p-3 rounded-lg border border-border bg-surface/50">
            <span className="text-muted">Market Price Quote:</span>
            <p className="text-sm font-bold font-mono text-foreground mt-0.5">
              {instrument.current_price !== null
                ? formatIndianCurrency(instrument.current_price)
                : 'Unavailable'}
            </p>
          </div>
        </div>

        {/* 4. Broker Accounts Distribution */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted uppercase tracking-wider">
            Broker Accounts Distribution ({instrument.broker_count} account{instrument.broker_count !== 1 ? 's' : ''}):
          </p>
          <div className="space-y-1.5">
            {instrument.contributions.map((c) => (
              <div
                key={c.holding_id}
                className="p-2.5 rounded-lg border border-border bg-surface/40 text-xs flex items-center justify-between"
              >
                <div>
                  <span className="font-semibold text-foreground">{c.broker_name}</span>
                  <p className="text-[11px] text-muted font-mono mt-0.5">
                    {c.quantity} shares · Avg {formatIndianCurrency(c.avg_buy_price)}
                  </p>
                </div>
                <div className="text-right font-mono">
                  <span className="font-bold text-brand-500">
                    {c.share_of_instrument_pct.toFixed(1)}% of total
                  </span>
                  <p className="text-[11px] text-muted">
                    {formatIndianCurrency(c.invested_value)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 5. News & Evidence-Based Stock Outlook */}
        <div className="pt-3 border-t border-border space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-foreground">
                Verified News &amp; Evidence-Based Stock Outlook
              </h3>
            </div>

            {outlook && (
              <span className={`px-2.5 py-0.5 rounded text-[11px] font-semibold border ${badgeClass}`}>
                {outlook.outlook_label}
              </span>
            )}
          </div>

          {newsLoading ? (
            <div className="flex items-center gap-2 text-xs text-muted py-4 justify-center">
              <RefreshCw className="w-4 h-4 animate-spin text-brand-500" />
              <span>Aggregating multi-provider company news &amp; evidence...</span>
            </div>
          ) : outlook ? (
            <div className="space-y-3.5 text-xs">
              {/* Narrative Summary */}
              <div className="p-3.5 rounded-xl bg-surface border border-border leading-relaxed text-foreground">
                {outlook.outlook_summary}
              </div>

              {/* Factual Developments */}
              {outlook.factual_developments.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-semibold text-muted uppercase tracking-wider">
                    Factual Developments Reported:
                  </p>
                  <ul className="space-y-1 pl-4 list-disc text-muted">
                    {outlook.factual_developments.map((dev, i) => (
                      <li key={i} className="text-foreground/90">
                        {dev}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Reasons to Monitor vs Reasons to Review */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl border border-border bg-surface/30 space-y-1.5">
                  <p className="text-[11px] font-bold text-foreground">
                    Reasons for Continued Monitoring:
                  </p>
                  <ul className="space-y-1 text-[11px] text-muted list-disc pl-3.5">
                    {outlook.reasons_to_monitor.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-3 rounded-xl border border-border bg-surface/30 space-y-1.5">
                  <p className="text-[11px] font-bold text-foreground">
                    Reasons to Review Position:
                  </p>
                  <ul className="space-y-1 text-[11px] text-muted list-disc pl-3.5">
                    {outlook.reasons_to_review.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Practical Research Priorities */}
              <div className="p-3 rounded-xl bg-brand-500/5 border border-brand-500/20 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-foreground">
                  <BookOpen className="w-3.5 h-3.5 text-brand-500" />
                  <span>Practical Research Steps:</span>
                </div>
                <ul className="space-y-1 text-[11px] text-muted list-disc pl-4">
                  {outlook.research_priorities.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ul>
              </div>

              {/* Cited Articles List */}
              <div className="space-y-2 pt-2 border-t border-border">
                <p className="text-[11px] font-semibold text-muted uppercase tracking-wider">
                  Attributed News Sources ({outlook.cited_articles.length}):
                </p>

                {outlook.cited_articles.length === 0 ? (
                  <p className="text-[11px] text-muted italic">
                    No sufficiently recent verified news is available for this holding.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {outlook.cited_articles.map((art) => (
                      <div
                        key={art.article_id}
                        className="p-2.5 rounded-lg border border-border bg-surface/50 text-[11px] space-y-1.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <a
                            href={art.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-foreground hover:text-brand-500 transition-colors line-clamp-2"
                          >
                            {art.title}
                          </a>
                          <a
                            href={art.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted hover:text-foreground flex-shrink-0 mt-0.5"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted">
                          <span className="font-semibold text-foreground">{art.publisher}</span>
                          <span>•</span>
                          <span>{art.formatted_time}</span>
                          <span>•</span>
                          <span className="px-1 py-0.2 rounded bg-muted/20 text-foreground font-mono">
                            {art.provider}
                          </span>
                          {art.is_cached && (
                            <span className="text-muted">(cached)</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Responsible Guidance & Regulatory Disclaimer */}
              <div className="p-2.5 rounded-lg bg-surface border border-border text-[10px] text-muted leading-relaxed flex items-start gap-2">
                <Info className="w-3.5 h-3.5 text-muted flex-shrink-0 mt-0.5" />
                <span>
                  {outlook.limitations_disclaimer} FINOVA never provides automatic trading recommendations (BUY/SELL) or price targets.
                </span>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="btn-secondary text-xs py-2 px-4"
          >
            Close Deep Dive
          </button>
        </div>
      </motion.div>
    </div>
  );
}
