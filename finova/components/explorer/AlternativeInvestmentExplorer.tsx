'use client';

// ============================================================
// FINOVA — Innovation Three: Alternative Investment Explorer Component
// components/explorer/AlternativeInvestmentExplorer.tsx
//
// Interactive educational platform for Indian retail investors:
// - Deep dives into REITs, InvITs, and Bonds
// - Interactive multi-dimensional comparison matrix
// - Educational cards (How it works, returns, risks, misconceptions)
// - Connection to User's Real Portfolio Holdings
// - Grounded Gemini-powered educational explainers
// ============================================================

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Zap,
  Link2,
  HelpCircle,
  Sparkles,
  Info,
  CheckCircle2,
  AlertTriangle,
  Scale,
  RefreshCw,
  X,
} from 'lucide-react';
import {
  ALTERNATIVE_CATEGORIES,
  COMPARISON_MATRIX,
  type AlternativeCategory,
} from '@/lib/data/alternativeInvestments';
import { formatIndianCurrency } from '@/lib/utils';
import type { UnifiedXRayAnalysis } from '@/lib/calculations/xray';

interface Props {
  initialCategory?: AlternativeCategory | 'comparison';
}

async function fetchXRay(): Promise<UnifiedXRayAnalysis | null> {
  try {
    const res = await fetch('/api/portfolio/xray');
    if (!res.ok) return null;
    const json = await res.json();
    return json.data;
  } catch {
    return null;
  }
}

export function AlternativeInvestmentExplorer({ initialCategory = 'reit' }: Props) {
  const [selectedCategory, setSelectedCategory] = useState<AlternativeCategory | 'comparison'>(
    initialCategory
  );
  const [selectedSubTab, setSelectedSubTab] = useState<'overview' | 'structure' | 'risks' | 'terms' | 'misconceptions'>(
    'overview'
  );

  // AI Educational Q&A State
  const [aiTopic, setAiTopic] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);

  const { data: xrayData } = useQuery({
    queryKey: ['portfolio-xray-explorer'],
    queryFn: fetchXRay,
    staleTime: 60000,
  });

  async function handleAskAi(topic: string, promptText?: string) {
    setAiTopic(promptText || topic);
    setAiLoading(true);
    setAiResponse(null);

    try {
      const res = await fetch('/api/ai/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: topic, query: promptText }),
      });
      const resData = await res.json();
      setAiResponse(resData.explanation || 'Educational analysis currently unavailable.');
    } catch {
      setAiResponse('Unable to contact intelligence engine. Please check connection.');
    } finally {
      setAiLoading(false);
    }
  }

  // Find user's holdings in the selected category
  const categoryHoldings =
    selectedCategory !== 'comparison' && xrayData
      ? xrayData.consolidated_instruments.filter((inst) => {
          if (selectedCategory === 'reit') return inst.asset_class === 'reit';
          if (selectedCategory === 'invit') return inst.asset_class === 'invit';
          if (selectedCategory === 'bond')
            return inst.asset_class === 'bond' || inst.asset_class === 'sgb';
          return false;
        })
      : [];

  const currentDetails =
    selectedCategory !== 'comparison' ? ALTERNATIVE_CATEGORIES[selectedCategory] : null;

  return (
    <div className="space-y-6">
      {/* Category Navigation Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-2 overflow-x-auto">
          {[
            { id: 'reit', label: 'REITs (Real Estate)', icon: Building2 },
            { id: 'invit', label: 'InvITs (Infrastructure)', icon: Zap },
            { id: 'bond', label: 'Bonds & Fixed Income', icon: Link2 },
            { id: 'comparison', label: 'Interactive Comparison', icon: Scale },
          ].map((cat) => {
            const Icon = cat.icon;
            const active = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedCategory(cat.id as typeof selectedCategory);
                  setSelectedSubTab('overview');
                }}
                className={`text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-2 transition-all whitespace-nowrap ${
                  active
                    ? 'bg-brand-500 text-white shadow-sm'
                    : 'text-muted hover:text-foreground hover:bg-muted/10'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => handleAskAi('reit_vs_invit', 'What is the main difference between REITs and InvITs in India?')}
          className="text-xs font-semibold inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-brand-500/30 bg-brand-500/10 text-brand-600 dark:text-brand-400 hover:bg-brand-500/20 transition-colors self-start sm:self-auto"
        >
          <Sparkles className="w-3.5 h-3.5 text-brand-500" />
          <span>Ask AI: REITs vs. InvITs</span>
        </button>
      </div>

      {/* AI Q&A Modal / Banner */}
      <AnimatePresence>
        {aiTopic && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="card p-5 border-brand-500/40 bg-brand-500/5 space-y-3 relative"
          >
            <button
              onClick={() => {
                setAiTopic(null);
                setAiResponse(null);
              }}
              className="absolute top-4 right-4 p-1 text-muted hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400 font-semibold text-sm">
              <Sparkles className="w-4 h-4" />
              <span>AI Educational Explanation: {aiTopic}</span>
            </div>

            {aiLoading ? (
              <div className="flex items-center gap-2 text-xs text-muted py-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Generating grounded educational explanation...</span>
              </div>
            ) : (
              <div className="text-xs text-foreground/90 leading-relaxed whitespace-pre-line">
                {aiResponse}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* View Mode 1: Individual Category Explorer */}
      {currentDetails && (
        <div className="space-y-6">
          {/* Hero Banner */}
          <div className="card p-6 space-y-3 border-l-4 border-l-brand-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[11px] font-semibold text-brand-500 uppercase tracking-wider">
                  Alternative Investment Guide
                </span>
                <h2 className="text-xl font-bold text-foreground mt-0.5">{currentDetails.name}</h2>
              </div>
              <span className="text-xs text-muted bg-muted/10 px-2.5 py-1 rounded-full self-start sm:self-auto">
                {currentDetails.sebiRegulations}
              </span>
            </div>
            <p className="text-sm text-foreground/90 leading-relaxed">{currentDetails.tagline}</p>
          </div>

          {/* Connection to Portfolio X-Ray: User's Actual Exposure */}
          <div className="card p-5 border border-border space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-foreground">Your Portfolio Exposure</h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-muted/10 text-muted">
                  Live X-Ray Connection
                </span>
              </div>
              <Link href="/analysis" className="text-xs text-brand-500 hover:underline">
                View Full X-Ray →
              </Link>
            </div>

            {categoryHoldings.length > 0 ? (
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-brand-500/5 border border-brand-500/20 text-xs">
                  <p className="font-semibold text-brand-600 dark:text-brand-400">
                    You currently hold {categoryHoldings.length} {currentDetails.shortName} instrument(s) across your tracked broker accounts.
                  </p>
                  <p className="text-muted mt-0.5">
                    Your real positions are shown below. Use the educational concepts on this page to analyze your actual distribution yields, concession expirations, or duration risks.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {categoryHoldings.map((inst) => (
                    <div
                      key={inst.canonical_key}
                      className="p-3 rounded-lg border border-border bg-surface text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground truncate">{inst.name}</span>
                        <span className="font-mono text-brand-500 font-semibold">
                          {inst.percentage_of_valued_portfolio.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px] text-muted">
                        <span>Quantity: {inst.total_quantity}</span>
                        <span>Brokers: {inst.broker_count}</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-muted">
                        <span>Invested: {formatIndianCurrency(inst.total_invested_value)}</span>
                        <span>
                          Value:{' '}
                          {inst.current_value !== null
                            ? formatIndianCurrency(inst.current_value)
                            : 'Unquoted'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-muted/10 text-xs text-muted space-y-1">
                <p className="font-semibold text-foreground">
                  You currently hold zero {currentDetails.shortName} across your tracked broker accounts.
                </p>
                <p>
                  This explorer is purely for financial education. You do not need to purchase {currentDetails.shortName} unless they fit your personal risk profile and asset allocation strategy.
                </p>
              </div>
            )}
          </div>

          {/* Sub-Tabs for Category Deep Dive */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-border pb-2 overflow-x-auto">
              {[
                { id: 'overview', label: '1. What It Is & How It Works' },
                { id: 'structure', label: '2. Returns & Distributions' },
                { id: 'risks', label: '3. What Can Go Wrong' },
                { id: 'terms', label: '4. Important Terms' },
                { id: 'misconceptions', label: '5. Common Misconceptions' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedSubTab(tab.id as typeof selectedSubTab)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                    selectedSubTab === tab.id
                      ? 'bg-muted/20 text-foreground'
                      : 'text-muted hover:text-foreground'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Sub-Tab 1: Overview */}
            {selectedSubTab === 'overview' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="card p-5 space-y-3">
                  <h4 className="text-sm font-bold text-foreground">What It Is</h4>
                  <p className="text-xs text-foreground/80 leading-relaxed">
                    {currentDetails.whatItIs}
                  </p>
                  <div className="pt-2">
                    <h5 className="text-xs font-semibold text-foreground">How Exposure Works</h5>
                    <p className="text-xs text-muted mt-1 leading-relaxed">
                      {currentDetails.howExposureWorks}
                    </p>
                  </div>
                </div>

                <div className="card p-5 space-y-3">
                  <h4 className="text-sm font-bold text-foreground">
                    {currentDetails.howItWorks.title}
                  </h4>
                  <ul className="space-y-2 text-xs text-muted">
                    {currentDetails.howItWorks.items.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-brand-500 flex-shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Sub-Tab 2: Structure & Returns */}
            {selectedSubTab === 'structure' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="card p-5 space-y-3">
                  <h4 className="text-sm font-bold text-foreground">
                    {currentDetails.whereReturnsComeFrom.title}
                  </h4>
                  <ul className="space-y-2 text-xs text-muted">
                    {currentDetails.whereReturnsComeFrom.items.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-gain flex-shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="pt-3 border-t border-border">
                    <p className="text-xs font-semibold text-foreground">Distribution Mechanism</p>
                    <p className="text-xs text-muted mt-1 leading-relaxed">
                      {currentDetails.distributionMechanism}
                    </p>
                  </div>
                </div>

                {/* Illustrative Hypothetical Example Card */}
                <div className="card p-5 space-y-3 border-brand-500/20 bg-brand-500/5">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-brand-500" />
                    <h4 className="text-sm font-bold text-foreground">
                      {currentDetails.illustrativeExample.title}
                    </h4>
                  </div>
                  <p className="text-xs text-foreground/90 leading-relaxed">
                    {currentDetails.illustrativeExample.description}
                  </p>
                  <p className="text-[11px] text-muted italic pt-2 border-t border-border/40">
                    {currentDetails.illustrativeExample.disclaimer}
                  </p>
                </div>
              </div>
            )}

            {/* Sub-Tab 3: What Can Go Wrong */}
            {selectedSubTab === 'risks' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="card p-5 space-y-3">
                  <h4 className="text-sm font-bold text-foreground">
                    {currentDetails.whatCanGoWrong.title}
                  </h4>
                  <ul className="space-y-2 text-xs text-muted">
                    {currentDetails.whatCanGoWrong.items.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-warning flex-shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="card p-5 space-y-3">
                  <h4 className="text-sm font-bold text-foreground">Why Return Is Not Guaranteed</h4>
                  <p className="text-xs text-muted leading-relaxed">
                    {currentDetails.whyNotGuaranteed}
                  </p>

                  <div className="pt-3 border-t border-border">
                    <p className="text-xs font-semibold text-foreground">Interest Rate Sensitivity</p>
                    <p className="text-xs text-muted mt-1 leading-relaxed">
                      {currentDetails.interestRateSensitivity}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Sub-Tab 4: Terms & Questions */}
            {selectedSubTab === 'terms' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="card p-5 space-y-3">
                  <h4 className="text-sm font-bold text-foreground">Essential Terms for Beginners</h4>
                  <div className="space-y-3">
                    {currentDetails.importantTerms.map((t) => (
                      <div key={t.term} className="text-xs space-y-0.5">
                        <p className="font-semibold text-foreground">{t.term}</p>
                        <p className="text-muted leading-relaxed">{t.definition}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card p-5 space-y-3">
                  <h4 className="text-sm font-bold text-foreground">Questions to Research Before Investing</h4>
                  <ul className="space-y-2 text-xs text-muted">
                    {currentDetails.questionsToResearch.map((q, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <HelpCircle className="w-3.5 h-3.5 text-brand-500 flex-shrink-0 mt-0.5" />
                        <span>{q}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Sub-Tab 5: Common Misconceptions */}
            {selectedSubTab === 'misconceptions' && (
              <div className="card p-5 space-y-4">
                <h4 className="text-sm font-bold text-foreground">Common Retail Misconceptions</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {currentDetails.commonMisconceptions.map((m, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl border border-border bg-surface text-xs space-y-2">
                      <div>
                        <span className="text-[10px] font-bold text-loss uppercase tracking-wider">
                          Myth
                        </span>
                        <p className="font-semibold text-foreground mt-0.5">{m.myth}</p>
                      </div>
                      <div className="pt-2 border-t border-border/60">
                        <span className="text-[10px] font-bold text-gain uppercase tracking-wider">
                          Reality
                        </span>
                        <p className="text-muted mt-0.5 leading-relaxed">{m.reality}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* View Mode 2: Multi-Dimensional Interactive Comparison */}
      {selectedCategory === 'comparison' && (
        <div className="space-y-4">
          <div className="card p-5 border-l-4 border-l-brand-500">
            <h3 className="text-base font-bold text-foreground">
              Multi-Asset Category Comparison Matrix
            </h3>
            <p className="text-xs text-muted mt-1">
              Comparing Equities, REITs, InvITs, and Bonds across structural, income, and risk dimensions for Indian investors.
            </p>
          </div>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/10 text-muted uppercase text-[10px] border-b border-border">
                  <tr>
                    <th className="py-3 px-4 w-1/5">Dimension</th>
                    <th className="py-3 px-4 w-1/5 font-semibold text-brand-500">Equity (Stocks)</th>
                    <th className="py-3 px-4 w-1/5 font-semibold text-foreground">REITs (Real Estate)</th>
                    <th className="py-3 px-4 w-1/5 font-semibold text-foreground">InvITs (Infrastructure)</th>
                    <th className="py-3 px-4 w-1/5 font-semibold text-foreground">Bonds / Fixed Income</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {COMPARISON_MATRIX.map((row) => (
                    <tr key={row.dimension} className="hover:bg-muted/5 transition-colors">
                      <td className="py-3 px-4 font-bold text-foreground">{row.dimension}</td>
                      <td className="py-3 px-4 text-muted">{row.equity}</td>
                      <td className="py-3 px-4 text-muted">{row.reit}</td>
                      <td className="py-3 px-4 text-muted">{row.invit}</td>
                      <td className="py-3 px-4 text-muted">{row.bonds}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Mandatory SEBI Educational Regulatory Disclaimer */}
      <div className="p-4 rounded-xl bg-muted/10 border border-border text-[11px] text-muted space-y-1">
        <p className="font-semibold text-foreground flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-brand-500" />
          <span>Educational & Non-Advisory Regulatory Disclosure</span>
        </p>
        <p>
          FINOVA is an investment intelligence and financial education platform, not a SEBI-registered Investment Adviser (RIA), Research Analyst (RA), or stock broker. The educational explanations, hypothetical illustrations, and comparative matrices on this page are provided solely for financial literacy and conceptual exploration. Past distributions or yields are not indicative of future returns. Investments in securities are subject to market risks; read all scheme-related documents carefully before investing.
        </p>
      </div>
    </div>
  );
}
