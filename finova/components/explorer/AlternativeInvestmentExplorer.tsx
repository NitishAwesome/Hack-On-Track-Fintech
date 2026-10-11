'use client';

// ============================================================
// FINOVA — Alternative Investment Explorer Component (Prompt 13)
// components/explorer/AlternativeInvestmentExplorer.tsx
//
// Dedicated interactive financial education terminal:
// - Deep dives into REITs, InvITs, and Bonds
// - Pure TypeScript interactive educational calculators
// - Interactive knowledge checks & guided quizzes
// - Primary source attributions (SEBI, RBI, NSE/BSE)
// - Resilient Portfolio X-Ray integration with explicit loading/error states
// - Grounded Gemini educational explainers with deterministic fallbacks
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
  ExternalLink,
  Calculator,
  GraduationCap,
  BookOpen,
  RotateCcw,
} from 'lucide-react';
import {
  ALTERNATIVE_CATEGORIES,
  COMPARISON_MATRIX,
  type AlternativeCategory,
} from '@/lib/data/alternativeInvestments';
import {
  calculateBondMetrics,
  calculateReitDistribution,
  calculateInvitDistribution,
  type BondCalculatorInput,
  type ReitDistributionInput,
  type InvitDistributionInput,
} from '@/lib/calculations/alternativeEducation';
import { formatIndianCurrency } from '@/lib/utils';
import type { UnifiedXRayAnalysis } from '@/lib/calculations/xray';

interface Props {
  initialCategory?: AlternativeCategory | 'comparison';
}

interface XRayFetchResult {
  status: 'loading' | 'success' | 'auth_required' | 'error';
  data: UnifiedXRayAnalysis | null;
  errorMessage?: string;
}

async function fetchXRayWithStatus(): Promise<XRayFetchResult> {
  try {
    const res = await fetch('/api/portfolio/xray');
    if (res.status === 401) {
      return { status: 'auth_required', data: null, errorMessage: 'Authentication required' };
    }
    if (!res.ok) {
      return { status: 'error', data: null, errorMessage: `Server returned HTTP ${res.status}` };
    }
    const json = await res.json();
    return { status: 'success', data: json.data || null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Network error';
    return { status: 'error', data: null, errorMessage: msg };
  }
}

export function AlternativeInvestmentExplorer({ initialCategory = 'reit' }: Props) {
  const [selectedCategory, setSelectedCategory] = useState<AlternativeCategory | 'comparison'>(
    initialCategory
  );
  const [selectedSubTab, setSelectedSubTab] = useState<
    'overview' | 'structure' | 'risks' | 'calculator' | 'quiz' | 'terms' | 'misconceptions' | 'sources'
  >('overview');

  // AI Educational Q&A State
  const [aiTopic, setAiTopic] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);

  // Comparison pair state
  const [compareCategoryA, setCompareCategoryA] = useState<string>('reit');
  const [compareCategoryB, setCompareCategoryB] = useState<string>('invit');

  // Interactive Bond Calculator State
  const [bondInput, setBondInput] = useState<BondCalculatorInput>({
    faceValue: 1000,
    annualCouponRatePct: 8.5,
    numberOfBonds: 50,
    purchasePricePerBond: 980,
  });

  // Interactive REIT Calculator State
  const [reitInput, setReitInput] = useState<ReitDistributionInput>({
    unitsHeld: 500,
    purchasePricePerUnit: 320,
    annualDistributionPerUnit: 24,
    dividendComponentPct: 40,
    interestComponentPct: 40,
    capitalReturnComponentPct: 20,
  });

  // Interactive InvIT Calculator State
  const [invitInput, setInvitInput] = useState<InvitDistributionInput>({
    unitsHeld: 1000,
    purchasePricePerUnit: 100,
    annualDistributionPerUnit: 9.5,
    dividendComponentPct: 30,
    interestComponentPct: 40,
    capitalReturnComponentPct: 30,
  });

  // Knowledge Check Quiz State: map of question ID to selected option index
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});

  const {
    data: xrayResult,
    isLoading: xrayLoading,
    isError: xrayIsError,
    refetch: refetchXRay,
  } = useQuery({
    queryKey: ['portfolio-xray-explorer'],
    queryFn: fetchXRayWithStatus,
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
    selectedCategory !== 'comparison' && xrayResult?.data
      ? xrayResult.data.consolidated_instruments.filter((inst) => {
          if (selectedCategory === 'reit') return inst.asset_class === 'reit';
          if (selectedCategory === 'invit') return inst.asset_class === 'invit';
          if (selectedCategory === 'bond')
            return inst.asset_class === 'bond' || inst.asset_class === 'sgb';
          return false;
        })
      : [];

  const currentDetails =
    selectedCategory !== 'comparison' ? ALTERNATIVE_CATEGORIES[selectedCategory] : null;

  // Execute calculators deterministically
  const bondCalcResult = calculateBondMetrics(bondInput);
  const reitCalcResult = calculateReitDistribution(reitInput);
  const invitCalcResult = calculateInvitDistribution(invitInput);

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
                  setQuizAnswers({});
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
          onClick={() =>
            handleAskAi('reit_vs_invit', 'What is the fundamental difference between REITs and InvITs under SEBI regulations?')
          }
          className="text-xs font-semibold inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-brand-500/30 bg-brand-500/10 text-brand-600 dark:text-brand-400 hover:bg-brand-500/20 transition-colors self-start sm:self-auto"
        >
          <Sparkles className="w-3.5 h-3.5 text-brand-500" />
          <span>Ask AI: REITs vs. InvITs</span>
        </button>
      </div>

      {/* AI Explanation Drawer */}
      <AnimatePresence>
        {(aiLoading || aiResponse) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="card p-5 border-brand-500/30 bg-brand-500/5 space-y-3 relative"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-500" />
                <h4 className="text-xs font-bold text-foreground">
                  Finova AI Intelligence: {aiTopic}
                </h4>
              </div>
              <button
                onClick={() => {
                  setAiResponse(null);
                  setAiTopic(null);
                }}
                className="text-muted hover:text-foreground text-xs"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {aiLoading ? (
              <div className="flex items-center gap-2 text-xs text-brand-500 animate-pulse py-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Generating grounded educational explanation...</span>
              </div>
            ) : (
              <p className="text-xs text-foreground/90 leading-relaxed">{aiResponse}</p>
            )}

            <p className="text-[10px] text-muted border-t border-border/40 pt-2">
              SEBI Educational Disclaimer: AI explanations are strictly informational and do not constitute financial advice or investment recommendations.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Category View Mode */}
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

          {/* Connection to Portfolio X-Ray: User's Actual Exposure (Issue A Fixed) */}
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

            {/* State 1: Loading */}
            {xrayLoading && (
              <div className="p-4 rounded-xl bg-muted/10 flex items-center gap-3 text-xs text-muted animate-pulse">
                <RefreshCw className="w-4 h-4 animate-spin text-brand-500" />
                <span>Connecting to your authenticated portfolio exposure...</span>
              </div>
            )}

            {/* State 2: Auth Required */}
            {!xrayLoading && xrayResult?.status === 'auth_required' && (
              <div className="p-4 rounded-xl bg-muted/10 text-xs text-muted flex items-center justify-between">
                <span>Please sign in to view your tracked investments in this category.</span>
                <Link href="/login" className="px-3 py-1 bg-brand-500 text-white rounded-lg font-semibold text-xs">
                  Sign In
                </Link>
              </div>
            )}

            {/* State 3: Database / API Error */}
            {!xrayLoading && (xrayIsError || xrayResult?.status === 'error') && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>Portfolio exposure temporarily unavailable. Educational content remains fully accessible.</span>
                </div>
                <button
                  onClick={() => refetchXRay()}
                  className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-xs font-semibold"
                >
                  Retry
                </button>
              </div>
            )}

            {/* State 4: Success with Holdings */}
            {!xrayLoading && xrayResult?.status === 'success' && categoryHoldings.length > 0 && (
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-brand-500/5 border border-brand-500/20 text-xs">
                  <p className="font-semibold text-brand-600 dark:text-brand-400">
                    You currently hold {categoryHoldings.length} {currentDetails.shortName} instrument(s) across your tracked broker accounts.
                  </p>
                  <p className="text-muted mt-0.5">
                    Your real positions are shown below. Use the educational concepts and calculators on this page to analyze your actual distribution yields, concession expirations, or duration risks.
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
            )}

            {/* State 5: Success without Holdings */}
            {!xrayLoading && xrayResult?.status === 'success' && categoryHoldings.length === 0 && (
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

          {/* Sub-Tabs Learning Progression */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-border pb-2 overflow-x-auto">
              {[
                { id: 'overview', label: '1. What It Is & How It Works' },
                { id: 'structure', label: '2. Returns & Distributions' },
                { id: 'risks', label: '3. What Can Go Wrong' },
                { id: 'calculator', label: '4. Interactive Calculator' },
                { id: 'quiz', label: '5. Knowledge Check Quiz' },
                { id: 'terms', label: '6. Important Terms' },
                { id: 'misconceptions', label: '7. Myths & Realities' },
                { id: 'sources', label: '8. Official Sources' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedSubTab(tab.id as typeof selectedSubTab)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                    selectedSubTab === tab.id
                      ? 'bg-brand-500 text-white'
                      : 'text-muted hover:text-foreground hover:bg-muted/10'
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

            {/* Sub-Tab 4: Interactive Educational Calculators (Phase C) */}
            {selectedSubTab === 'calculator' && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-start gap-2.5 text-xs">
                  <Calculator className="w-4 h-4 text-brand-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-foreground">
                      Hypothetical Educational Illustration — Not a Market Quote or Investment Recommendation
                    </span>
                    <p className="text-muted mt-0.5">
                      Adjust the input parameters to see how nominal face values, purchase prices, coupon obligations, and cash distribution yields interact in India.
                    </p>
                  </div>
                </div>

                {/* Bond Calculator */}
                {selectedCategory === 'bond' && (
                  <div className="card p-5 space-y-5">
                    <div className="flex items-center justify-between border-b border-border pb-3">
                      <div>
                        <h4 className="text-sm font-bold text-foreground">
                          Bond Coupon & Current Yield Calculator
                        </h4>
                        <p className="text-xs text-muted">
                          Learn why Coupon Rate (fixed on face value) and Current Yield (based on purchase price) differ.
                        </p>
                      </div>
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-muted/10 text-brand-500 font-bold">
                        {bondCalcResult.priceRelationship}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <label className="text-[11px] font-semibold text-muted block mb-1">
                          Bond Face Value (Par ₹)
                        </label>
                        <input
                          type="number"
                          value={bondInput.faceValue}
                          onChange={(e) =>
                            setBondInput((prev) => ({ ...prev, faceValue: Number(e.target.value) }))
                          }
                          className="input w-full text-xs"
                          min={1}
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-muted block mb-1">
                          Annual Coupon Rate (%)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={bondInput.annualCouponRatePct}
                          onChange={(e) =>
                            setBondInput((prev) => ({ ...prev, annualCouponRatePct: Number(e.target.value) }))
                          }
                          className="input w-full text-xs"
                          min={0}
                          max={100}
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-muted block mb-1">
                          Number of Bonds
                        </label>
                        <input
                          type="number"
                          value={bondInput.numberOfBonds}
                          onChange={(e) =>
                            setBondInput((prev) => ({ ...prev, numberOfBonds: Number(e.target.value) }))
                          }
                          className="input w-full text-xs"
                          min={1}
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-muted block mb-1">
                          Purchase Price per Bond (₹)
                        </label>
                        <input
                          type="number"
                          value={bondInput.purchasePricePerBond}
                          onChange={(e) =>
                            setBondInput((prev) => ({ ...prev, purchasePricePerBond: Number(e.target.value) }))
                          }
                          className="input w-full text-xs"
                          min={1}
                        />
                      </div>
                    </div>

                    {bondCalcResult.isValid ? (
                      <div className="space-y-3 pt-2">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="p-3 rounded-lg bg-surface border border-border">
                            <span className="text-[10px] text-muted">Total Capital Cost</span>
                            <p className="text-sm font-bold text-foreground">
                              {formatIndianCurrency(bondCalcResult.totalInvestmentCost)}
                            </p>
                          </div>
                          <div className="p-3 rounded-lg bg-surface border border-border">
                            <span className="text-[10px] text-muted">Annual Coupon / Bond</span>
                            <p className="text-sm font-bold text-foreground">
                              ₹{bondCalcResult.annualCouponPerBond.toFixed(2)}
                            </p>
                          </div>
                          <div className="p-3 rounded-lg bg-surface border border-border">
                            <span className="text-[10px] text-muted">Total Annual Payout</span>
                            <p className="text-sm font-bold text-gain">
                              {formatIndianCurrency(bondCalcResult.totalAnnualCoupon)}
                            </p>
                          </div>
                          <div className="p-3 rounded-lg bg-brand-500/10 border border-brand-500/20">
                            <span className="text-[10px] text-brand-500 font-semibold">Current Yield</span>
                            <p className="text-sm font-bold text-brand-600 dark:text-brand-400">
                              {bondCalcResult.currentYieldPct.toFixed(2)}%
                            </p>
                          </div>
                        </div>

                        <div className="p-3 rounded-lg bg-muted/10 text-xs text-muted leading-relaxed">
                          <span className="font-semibold text-foreground">Yield Relationship Note: </span>
                          {bondCalcResult.yieldComparisonNote}
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 rounded-lg bg-loss/10 text-loss text-xs">
                        {bondCalcResult.errorMessage}
                      </div>
                    )}
                  </div>
                )}

                {/* REIT Calculator */}
                {selectedCategory === 'reit' && (
                  <div className="card p-5 space-y-5">
                    <div className="border-b border-border pb-3">
                      <h4 className="text-sm font-bold text-foreground">
                        REIT Distribution & Tax Component Illustration
                      </h4>
                      <p className="text-xs text-muted">
                        Simulate tenant rental payouts and how NDCF splits across Dividend, Interest, and Return of Capital.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="text-[11px] font-semibold text-muted block mb-1">
                          REIT Units Held
                        </label>
                        <input
                          type="number"
                          value={reitInput.unitsHeld}
                          onChange={(e) =>
                            setReitInput((prev) => ({ ...prev, unitsHeld: Number(e.target.value) }))
                          }
                          className="input w-full text-xs"
                          min={1}
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-muted block mb-1">
                          Purchase Price per Unit (₹)
                        </label>
                        <input
                          type="number"
                          value={reitInput.purchasePricePerUnit}
                          onChange={(e) =>
                            setReitInput((prev) => ({ ...prev, purchasePricePerUnit: Number(e.target.value) }))
                          }
                          className="input w-full text-xs"
                          min={1}
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-muted block mb-1">
                          Annual Distribution per Unit (₹)
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          value={reitInput.annualDistributionPerUnit}
                          onChange={(e) =>
                            setReitInput((prev) => ({ ...prev, annualDistributionPerUnit: Number(e.target.value) }))
                          }
                          className="input w-full text-xs"
                          min={0}
                        />
                      </div>
                    </div>

                    {reitCalcResult.isValid && (
                      <div className="space-y-4 pt-2">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="p-3 rounded-lg bg-surface border border-border">
                            <span className="text-[10px] text-muted">Total Purchase Cost</span>
                            <p className="text-sm font-bold text-foreground">
                              {formatIndianCurrency(reitCalcResult.totalPurchaseCost)}
                            </p>
                          </div>
                          <div className="p-3 rounded-lg bg-surface border border-border">
                            <span className="text-[10px] text-muted">Total Annual Distribution</span>
                            <p className="text-sm font-bold text-gain">
                              {formatIndianCurrency(reitCalcResult.totalAnnualDistribution)}
                            </p>
                          </div>
                          <div className="p-3 rounded-lg bg-brand-500/10 border border-brand-500/20">
                            <span className="text-[10px] text-brand-500 font-semibold">Distribution Yield</span>
                            <p className="text-sm font-bold text-brand-600 dark:text-brand-400">
                              {reitCalcResult.distributionYieldPct.toFixed(2)}%
                            </p>
                          </div>
                        </div>

                        {/* Component Breakdown Card */}
                        <div className="p-4 rounded-xl border border-border bg-surface space-y-2">
                          <span className="text-xs font-bold text-foreground">
                            Hypothetical NDCF Component Split
                          </span>
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div className="p-2.5 rounded bg-muted/10">
                              <span className="text-[10px] text-muted block">Dividend ({reitCalcResult.breakdown.dividendPct}%)</span>
                              <span className="font-bold text-foreground">{formatIndianCurrency(reitCalcResult.breakdown.dividendAmount)}</span>
                            </div>
                            <div className="p-2.5 rounded bg-muted/10">
                              <span className="text-[10px] text-muted block">Interest ({reitCalcResult.breakdown.interestPct}%)</span>
                              <span className="font-bold text-foreground">{formatIndianCurrency(reitCalcResult.breakdown.interestAmount)}</span>
                            </div>
                            <div className="p-2.5 rounded bg-muted/10">
                              <span className="text-[10px] text-muted block">Capital Return ({reitCalcResult.breakdown.capitalReturnPct}%)</span>
                              <span className="font-bold text-foreground">{formatIndianCurrency(reitCalcResult.breakdown.capitalReturnAmount)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="p-3 rounded-lg bg-muted/10 text-[11px] text-muted leading-relaxed">
                          <span className="font-semibold text-foreground">Taxation Notice: </span>
                          {reitCalcResult.taxEducationNote}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* InvIT Calculator */}
                {selectedCategory === 'invit' && (
                  <div className="card p-5 space-y-5">
                    <div className="border-b border-border pb-3">
                      <h4 className="text-sm font-bold text-foreground">
                        InvIT Distribution & Concession Amortization Illustration
                      </h4>
                      <p className="text-xs text-muted">
                        Simulate highway toll or power grid cash flows and understand how concession expiry amortizes terminal value.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="text-[11px] font-semibold text-muted block mb-1">
                          InvIT Units Held
                        </label>
                        <input
                          type="number"
                          value={invitInput.unitsHeld}
                          onChange={(e) =>
                            setInvitInput((prev) => ({ ...prev, unitsHeld: Number(e.target.value) }))
                          }
                          className="input w-full text-xs"
                          min={1}
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-muted block mb-1">
                          Purchase Price per Unit (₹)
                        </label>
                        <input
                          type="number"
                          value={invitInput.purchasePricePerUnit}
                          onChange={(e) =>
                            setInvitInput((prev) => ({ ...prev, purchasePricePerUnit: Number(e.target.value) }))
                          }
                          className="input w-full text-xs"
                          min={1}
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-muted block mb-1">
                          Annual Distribution per Unit (₹)
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          value={invitInput.annualDistributionPerUnit}
                          onChange={(e) =>
                            setInvitInput((prev) => ({ ...prev, annualDistributionPerUnit: Number(e.target.value) }))
                          }
                          className="input w-full text-xs"
                          min={0}
                        />
                      </div>
                    </div>

                    {invitCalcResult.isValid && (
                      <div className="space-y-4 pt-2">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="p-3 rounded-lg bg-surface border border-border">
                            <span className="text-[10px] text-muted">Total Purchase Cost</span>
                            <p className="text-sm font-bold text-foreground">
                              {formatIndianCurrency(invitCalcResult.totalPurchaseCost)}
                            </p>
                          </div>
                          <div className="p-3 rounded-lg bg-surface border border-border">
                            <span className="text-[10px] text-muted">Total Annual Cash Flow</span>
                            <p className="text-sm font-bold text-gain">
                              {formatIndianCurrency(invitCalcResult.totalAnnualDistribution)}
                            </p>
                          </div>
                          <div className="p-3 rounded-lg bg-brand-500/10 border border-brand-500/20">
                            <span className="text-[10px] text-brand-500 font-semibold">Distribution Yield</span>
                            <p className="text-sm font-bold text-brand-600 dark:text-brand-400">
                              {invitCalcResult.distributionYieldPct.toFixed(2)}%
                            </p>
                          </div>
                        </div>

                        {/* Concession Amortization Notice */}
                        <div className="p-3.5 rounded-xl bg-warning/10 border border-warning/20 text-xs space-y-1">
                          <div className="flex items-center gap-1.5 font-bold text-warning">
                            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                            <span>Concession Lifespan Amortization Realities</span>
                          </div>
                          <p className="text-muted leading-relaxed">
                            {invitCalcResult.concessionAmortizationNote}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Sub-Tab 5: Knowledge Check Quiz (Phase F) */}
            {selectedSubTab === 'quiz' && (
              <div className="card p-5 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
                  <div>
                    <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-brand-500" />
                      <span>{currentDetails.shortName} Knowledge Check</span>
                    </h4>
                    <p className="text-xs text-muted">
                      Test your understanding of regulatory mandates, return drivers, and structural risks.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-brand-500/10 text-brand-500">
                      Score: {Object.entries(quizAnswers).filter(([qId, selectedIdx]) => {
                        const q = currentDetails.knowledgeCheck.find((x) => x.id === qId);
                        return q && q.correctIndex === selectedIdx;
                      }).length} / {currentDetails.knowledgeCheck.length}
                    </span>
                    {Object.keys(quizAnswers).length > 0 && (
                      <button
                        onClick={() => setQuizAnswers({})}
                        className="text-xs text-muted hover:text-foreground inline-flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reset</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-6">
                  {currentDetails.knowledgeCheck.map((q, qIndex) => {
                    const answered = quizAnswers[q.id] !== undefined;
                    const selectedOption = quizAnswers[q.id];
                    const isCorrect = answered && selectedOption === q.correctIndex;

                    return (
                      <div
                        key={q.id}
                        className="p-4 rounded-xl border border-border bg-surface space-y-3"
                      >
                        <h5 className="text-xs font-bold text-foreground">
                          {qIndex + 1}. {q.question}
                        </h5>

                        <div className="space-y-2">
                          {q.options.map((opt, optIdx) => {
                            const isSelected = selectedOption === optIdx;
                            let btnStyle = 'border-border hover:bg-muted/10 text-foreground';

                            if (answered) {
                              if (optIdx === q.correctIndex) {
                                btnStyle = 'border-gain bg-gain/10 text-gain font-semibold';
                              } else if (isSelected) {
                                btnStyle = 'border-loss bg-loss/10 text-loss font-semibold';
                              } else {
                                btnStyle = 'border-border opacity-50 text-muted';
                              }
                            }

                            return (
                              <button
                                key={optIdx}
                                disabled={answered}
                                onClick={() =>
                                  setQuizAnswers((prev) => ({ ...prev, [q.id]: optIdx }))
                                }
                                className={`w-full text-left p-3 rounded-lg border text-xs transition-all flex items-start gap-2.5 ${btnStyle}`}
                              >
                                <span className="font-mono text-[10px] opacity-70 mt-0.5">
                                  {String.fromCharCode(65 + optIdx)}.
                                </span>
                                <span>{opt}</span>
                              </button>
                            );
                          })}
                        </div>

                        {answered && (
                          <div
                            className={`p-3 rounded-lg text-xs leading-relaxed ${
                              isCorrect
                                ? 'bg-gain/10 text-gain border border-gain/20'
                                : 'bg-muted/10 text-muted border border-border'
                            }`}
                          >
                            <span className="font-semibold block mb-0.5">
                              {isCorrect ? '✓ Correct Answer' : 'Explanation:'}
                            </span>
                            <p>{q.explanation}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Sub-Tab 6: Important Terms */}
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

            {/* Sub-Tab 7: Common Misconceptions */}
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

            {/* Sub-Tab 8: Authoritative Sources (Phase A / 4.4) */}
            {selectedSubTab === 'sources' && (
              <div className="card p-5 space-y-4">
                <div className="border-b border-border pb-3">
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-brand-500" />
                    <span>Sources & Official Regulatory References</span>
                  </h4>
                  <p className="text-xs text-muted">
                    Primary regulatory frameworks, circulars, and official guidance governing {currentDetails.name} in India.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {currentDetails.sources.map((src, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl border border-border bg-surface text-xs space-y-2 flex flex-col justify-between"
                    >
                      <div className="space-y-1">
                        <span className="text-[10px] font-semibold text-brand-500 uppercase">
                          {src.topic}
                        </span>
                        <h5 className="font-bold text-foreground leading-snug">{src.sourceTitle}</h5>
                        <p className="text-[11px] text-muted">Publisher: {src.publisher}</p>
                        <p className="text-[11px] text-foreground/80 leading-relaxed pt-1">
                          {src.qualificationNote}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-border flex items-center justify-between text-[10px] text-muted">
                        <span>Reviewed: {src.lastReviewed}</span>
                        <a
                          href={src.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-brand-500 hover:underline inline-flex items-center gap-1"
                        >
                          <span>Official Portal</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* View Mode 2: Multi-Dimensional Interactive Comparison (Phase D) */}
      {selectedCategory === 'comparison' && (
        <div className="space-y-5">
          <div className="card p-5 border-l-4 border-l-brand-500 space-y-2">
            <h3 className="text-base font-bold text-foreground">
              Multi-Asset Category Comparison Matrix
            </h3>
            <p className="text-xs text-muted">
              Comparing Equities, REITs, InvITs, and Bonds across 10 structural, income, and risk dimensions under Indian regulatory frameworks.
            </p>

            {/* Pairwise Focus Selectors */}
            <div className="flex flex-wrap items-center gap-3 pt-2 text-xs">
              <span className="font-semibold text-foreground">Focus Comparison:</span>
              <select
                aria-label="Select first category for pairwise comparison"
                value={compareCategoryA}
                onChange={(e) => setCompareCategoryA(e.target.value)}
                className="input py-1 px-2.5 text-xs rounded-lg"
              >
                <option value="all">All 4 Categories</option>
                <option value="reit">REITs (Real Estate)</option>
                <option value="invit">InvITs (Infrastructure)</option>
                <option value="bonds">Bonds / Fixed Income</option>
                <option value="equity">Equity (Stocks)</option>
              </select>

              {compareCategoryA !== 'all' && (
                <>
                  <span className="text-muted">vs.</span>
                  <select
                    aria-label="Select second category for pairwise comparison"
                    value={compareCategoryB}
                    onChange={(e) => setCompareCategoryB(e.target.value)}
                    className="input py-1 px-2.5 text-xs rounded-lg"
                  >
                    <option value="invit">InvITs (Infrastructure)</option>
                    <option value="reit">REITs (Real Estate)</option>
                    <option value="bonds">Bonds / Fixed Income</option>
                    <option value="equity">Equity (Stocks)</option>
                  </select>
                </>
              )}
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/10 text-muted uppercase text-[10px] border-b border-border">
                  <tr>
                    <th className="py-3 px-4 w-1/5 font-semibold">Dimension</th>
                    {(compareCategoryA === 'all' || compareCategoryA === 'equity' || compareCategoryB === 'equity') && (
                      <th className="py-3 px-4 w-1/5 font-semibold text-brand-500">Equity (Stocks)</th>
                    )}
                    {(compareCategoryA === 'all' || compareCategoryA === 'reit' || compareCategoryB === 'reit') && (
                      <th className="py-3 px-4 w-1/5 font-semibold text-foreground">REITs (Real Estate)</th>
                    )}
                    {(compareCategoryA === 'all' || compareCategoryA === 'invit' || compareCategoryB === 'invit') && (
                      <th className="py-3 px-4 w-1/5 font-semibold text-foreground">InvITs (Infrastructure)</th>
                    )}
                    {(compareCategoryA === 'all' || compareCategoryA === 'bonds' || compareCategoryB === 'bonds') && (
                      <th className="py-3 px-4 w-1/5 font-semibold text-foreground">Bonds / Fixed Income</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {COMPARISON_MATRIX.map((row) => (
                    <tr key={row.dimension} className="hover:bg-muted/5 transition-colors">
                      <td className="py-3 px-4 font-bold text-foreground">{row.dimension}</td>
                      {(compareCategoryA === 'all' || compareCategoryA === 'equity' || compareCategoryB === 'equity') && (
                        <td className="py-3 px-4 text-muted">{row.equity}</td>
                      )}
                      {(compareCategoryA === 'all' || compareCategoryA === 'reit' || compareCategoryB === 'reit') && (
                        <td className="py-3 px-4 text-muted">{row.reit}</td>
                      )}
                      {(compareCategoryA === 'all' || compareCategoryA === 'invit' || compareCategoryB === 'invit') && (
                        <td className="py-3 px-4 text-muted">{row.invit}</td>
                      )}
                      {(compareCategoryA === 'all' || compareCategoryA === 'bonds' || compareCategoryB === 'bonds') && (
                        <td className="py-3 px-4 text-muted">{row.bonds}</td>
                      )}
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
