'use client';

// ============================================================
// FINOVA — Grounded Gemini News Explainer Modal (Prompt 12)
// components/news/NewsExplanationModal.tsx
//
// Grounded educational explanation of financial news articles
// using verified server-side portfolio context.
// ============================================================

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Sparkles,
  ExternalLink,
  ShieldAlert,
  HelpCircle,
  Building2,
  PieChart,
  RefreshCw,
} from 'lucide-react';
import type { PersonalizedNewsArticle } from '@/types/news';

interface NewsExplanationModalProps {
  article: PersonalizedNewsArticle;
  onClose: () => void;
}

export function NewsExplanationModal({ article, onClose }: NewsExplanationModalProps) {
  const [loading, setLoading] = useState(true);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [source, setSource] = useState<'gemini' | 'deterministic_fallback'>('deterministic_fallback');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchExplanation() {
      try {
        const res = await fetch('/api/ai/explain', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'news_article',
            article: {
              title: article.title,
              source_name: article.source_name,
              pubDate: article.pubDate,
              description: article.description,
              link: article.link,
            },
            query: 'Explain why this news is relevant to my portfolio, what it means for Indian markets, and what facts should be verified further.',
          }),
        });

        if (!res.ok) {
          throw new Error(`Failed to generate explanation (HTTP ${res.status})`);
        }

        const data = await res.json();
        if (isMounted) {
          setExplanation(data.explanation || article.explanation);
          setSource(data.source || 'deterministic_fallback');
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Unable to connect to AI explanation engine.');
          setExplanation(article.explanation);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchExplanation();

    return () => {
      isMounted = false;
    };
  }, [article]);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-fade-in">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-2xl rounded-2xl border flex flex-col max-h-[90vh] overflow-hidden shadow-2xl"
          style={{
            backgroundColor: 'rgb(var(--surface))',
            borderColor: 'rgb(var(--border))',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between p-5 border-b"
            style={{ borderColor: 'rgb(var(--border))' }}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{
                  backgroundColor: 'rgb(var(--brand-500) / 0.1)',
                  color: 'rgb(var(--brand-500))',
                }}
              >
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold" style={{ color: 'rgb(var(--foreground))' }}>
                  Explainable News Intelligence
                </h3>
                <p className="text-[11px]" style={{ color: 'rgb(var(--muted))' }}>
                  Grounded in your verified portfolio holdings
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-surface-raised transition-colors"
              style={{ color: 'rgb(var(--muted))' }}
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-5 overflow-y-auto space-y-4 text-xs sm:text-sm">
            {/* Article Headline Preview */}
            <div
              className="p-3.5 rounded-xl border"
              style={{
                backgroundColor: 'rgb(var(--surface-raised))',
                borderColor: 'rgb(var(--border))',
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 flex-1">
                  <h4 className="font-semibold leading-snug" style={{ color: 'rgb(var(--foreground))' }}>
                    {article.title}
                  </h4>
                  <p className="text-[11px]" style={{ color: 'rgb(var(--muted))' }}>
                    {article.source_name} · {new Date(article.pubDate).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <a
                  href={article.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[11px] font-semibold text-brand hover:underline flex-shrink-0 pt-0.5"
                >
                  <span>Source</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Verified Portfolio Grounding Card */}
            {article.matched_holding && (
              <div
                className="p-3 rounded-xl border flex flex-wrap items-center gap-3 text-xs"
                style={{
                  backgroundColor: 'rgb(var(--brand-500) / 0.05)',
                  borderColor: 'rgb(var(--brand-500) / 0.2)',
                }}
              >
                <div className="flex items-center gap-1.5 font-semibold text-brand">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>{article.matched_holding.name} ({article.matched_holding.symbol})</span>
                </div>
                {article.matched_holding.weight_pct !== null && (
                  <div className="flex items-center gap-1" style={{ color: 'rgb(var(--foreground))' }}>
                    <PieChart className="w-3.5 h-3.5 text-brand" />
                    <span>~{article.matched_holding.weight_pct}% of your capital</span>
                  </div>
                )}
                {article.matched_holding.is_cross_broker && (
                  <span
                    className="px-2 py-0.5 rounded text-[10px] font-bold"
                    style={{
                      backgroundColor: 'rgb(var(--surface))',
                      color: 'rgb(var(--brand-500))',
                    }}
                  >
                    Held across {article.matched_holding.broker_names?.length || 2} brokers
                  </span>
                )}
              </div>
            )}

            {/* AI Explanation / Deterministic Output */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold" style={{ color: 'rgb(var(--foreground))' }}>
                  {source === 'gemini' ? 'Gemini AI Synthesis' : 'Deterministic Relevance Breakdown'}
                </span>
                {loading && (
                  <div className="flex items-center gap-1.5 text-xs text-brand">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>Analyzing...</span>
                  </div>
                )}
              </div>

              {error && (
                <div
                  className="p-3 rounded-xl border text-xs flex items-center gap-2"
                  style={{
                    backgroundColor: 'rgb(245 158 11 / 0.08)',
                    borderColor: 'rgb(245 158 11 / 0.25)',
                    color: '#f59e0b',
                  }}
                >
                  <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                  <span>{error} Presenting deterministic portfolio intelligence.</span>
                </div>
              )}

              <div
                className="p-4 rounded-xl border leading-relaxed text-xs sm:text-sm"
                style={{
                  backgroundColor: 'rgb(var(--surface-raised))',
                  borderColor: 'rgb(var(--border))',
                  color: 'rgb(var(--foreground))',
                }}
              >
                {loading ? (
                  <div className="space-y-2 animate-pulse">
                    <div className="h-4 bg-muted/20 rounded w-3/4" />
                    <div className="h-4 bg-muted/20 rounded w-full" />
                    <div className="h-4 bg-muted/20 rounded w-2/3" />
                  </div>
                ) : (
                  <p>{explanation || article.explanation}</p>
                )}
              </div>
            </div>

            {/* Investigation Questions */}
            {article.investigation_prompts && article.investigation_prompts.length > 0 && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: 'rgb(var(--foreground))' }}>
                  <HelpCircle className="w-3.5 h-3.5 text-brand" />
                  <span>Key Questions for Further Research</span>
                </div>
                <ul className="space-y-1.5 pl-5 list-disc text-xs" style={{ color: 'rgb(var(--muted))' }}>
                  {article.investigation_prompts.map((q, idx) => (
                    <li key={idx} className="leading-relaxed">
                      {q}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Regulatory Disclaimer */}
            <div
              className="p-3 rounded-xl border flex items-start gap-2.5 text-[11px]"
              style={{
                backgroundColor: 'rgb(var(--surface))',
                borderColor: 'rgb(var(--border))',
                color: 'rgb(var(--muted))',
              }}
            >
              <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-500" />
              <p>
                FINOVA educational synthesis only. Does NOT constitute financial advice, return forecasts, or trading instructions. Always cross-reference with official company announcements and SEBI-registered advisors.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div
            className="p-4 border-t flex items-center justify-end"
            style={{ borderColor: 'rgb(var(--border))' }}
          >
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold border hover:bg-surface-raised transition-colors"
              style={{
                backgroundColor: 'rgb(var(--surface-raised))',
                borderColor: 'rgb(var(--border))',
                color: 'rgb(var(--foreground))',
              }}
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
