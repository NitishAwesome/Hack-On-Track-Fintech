'use client';

// ============================================================
// FINOVA — Your Portfolio Explained Section
// components/analysis/PortfolioExplanationSection.tsx
// ============================================================

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Info,
  Clock,
  X,
  RefreshCw,
  BookOpen,
} from 'lucide-react';
import type { UnifiedXRayAnalysis } from '@/lib/calculations/xray';
import { formatIndianCurrency } from '@/lib/utils';

interface PortfolioExplanationSectionProps {
  data: UnifiedXRayAnalysis;
}

export function PortfolioExplanationSection({
  data,
}: PortfolioExplanationSectionProps) {
  const { portfolio_interpretation: interpretation, summary } = data;

  const [aiQuestion, setAiQuestion] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);

  async function askAi(type: string, questionLabel: string) {
    setAiQuestion(questionLabel);
    setAiLoading(true);
    setAiResponse(null);

    try {
      const res = await fetch('/api/ai/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          context: {
            overlapCount: summary.cross_broker_overlaps_count,
            overlapValue: summary.cross_broker_overlap_value
              ? formatIndianCurrency(summary.cross_broker_overlap_value)
              : undefined,
            overlapPct: summary.cross_broker_overlap_valued_pct,
            topHoldingName: summary.top_holding_name,
            topHoldingWeight: summary.top_holding_weight,
            unquotedCount: summary.unpriced_positions_count,
            quoteCoveragePct: summary.quote_coverage_pct,
          },
        }),
      });

      const resData = await res.json();
      setAiResponse(resData.explanation || 'Educational analysis currently unavailable.');
    } catch {
      setAiResponse(
        'Unable to load AI explanation at this time. Please check your network connection.'
      );
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div className="card p-5 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-foreground">Your Portfolio Explained</h2>
            <span className="text-[11px] px-2 py-0.5 rounded font-semibold bg-brand-500/10 text-brand-500">
              Deterministic Synthesis
            </span>
          </div>
          <p className="text-xs text-muted mt-0.5">
            Objective financial evaluation of allocation strengths, primary vulnerabilities, and data certainty.
          </p>
        </div>

        {/* Quick AI Explanations */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted hidden md:inline">Ask AI:</span>
          <button
            onClick={() =>
              askAi('concentration', 'Why is my portfolio considered concentrated?')
            }
            className="text-[11px] px-2.5 py-1 rounded bg-muted/10 hover:bg-muted/20 text-muted hover:text-foreground transition-colors"
          >
            Why concentrated?
          </button>
          <button
            onClick={() =>
              askAi('asset_allocation', 'What does my asset allocation tell me?')
            }
            className="text-[11px] px-2.5 py-1 rounded bg-muted/10 hover:bg-muted/20 text-muted hover:text-foreground transition-colors"
          >
            Asset allocation thesis
          </button>
        </div>
      </div>

      {/* AI Drawer (If active) */}
      <AnimatePresence>
        {aiQuestion && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-4 rounded-xl border border-brand-500/30 bg-brand-500/5 space-y-2.5 relative"
          >
            <button
              onClick={() => {
                setAiQuestion(null);
                setAiResponse(null);
              }}
              className="absolute top-3.5 right-3.5 p-1 text-muted hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400 font-semibold text-xs">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Financial Education: {aiQuestion}</span>
            </div>

            {aiLoading ? (
              <div className="flex items-center gap-2 text-xs text-muted py-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Consulting financial intelligence engine...</span>
              </div>
            ) : (
              <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-line">
                {aiResponse}
              </p>
            )}

            <div className="pt-2 border-t border-brand-500/20 text-[10px] text-muted flex items-center gap-1.5">
              <Info className="w-3 h-3 text-muted flex-shrink-0" />
              <span>
                Calculations are derived deterministically. AI explanations are strictly educational and non-advisory.
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. Composition Summary Banner */}
      <div className="p-3.5 rounded-xl bg-surface border border-border text-xs leading-relaxed text-foreground">
        <span className="font-semibold text-brand-500">Portfolio Composition: </span>
        {interpretation.composition_summary}
      </div>

      {/* 2. Strengths vs Concerns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        {/* Strengths */}
        <div className="p-4 rounded-xl border border-border bg-surface/40 space-y-2">
          <div className="flex items-center gap-2 text-gain font-bold">
            <CheckCircle2 className="w-4 h-4" />
            <span>Portfolio Strengths</span>
          </div>
          <ul className="space-y-1.5 text-muted pl-1">
            {interpretation.strengths.map((s, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-gain font-bold">•</span>
                <span className="text-foreground/90 leading-relaxed">{s}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Primary Concerns */}
        <div className="p-4 rounded-xl border border-border bg-surface/40 space-y-2">
          <div className="flex items-center gap-2 text-warning font-bold">
            <AlertTriangle className="w-4 h-4" />
            <span>Primary Concerns</span>
          </div>
          <ul className="space-y-1.5 text-muted pl-1">
            {interpretation.primary_concerns.map((c, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-warning font-bold">•</span>
                <span className="text-foreground/90 leading-relaxed">{c}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* 3. Data Limitations & Practical Research Priorities */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        {/* Data Limitations */}
        <div className="p-4 rounded-xl border border-border bg-surface/20 space-y-2">
          <div className="flex items-center gap-2 text-muted font-bold">
            <Clock className="w-4 h-4" />
            <span className="text-foreground">Data Limitations &amp; Uncertainty</span>
          </div>
          <ul className="space-y-1.5 text-muted pl-1">
            {interpretation.data_limitations.map((d, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-muted font-bold">•</span>
                <span className="leading-relaxed">{d}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* What to Research Next */}
        <div className="p-4 rounded-xl border border-brand-500/20 bg-brand-500/5 space-y-2">
          <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400 font-bold">
            <BookOpen className="w-4 h-4" />
            <span>What to Research Next</span>
          </div>
          <ul className="space-y-1.5 text-muted pl-1">
            {interpretation.research_priorities.map((r, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-brand-500 font-bold">•</span>
                <span className="text-foreground leading-relaxed">{r}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
