'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, Building2, Zap, FileText,
  ChevronUp, Sparkles, Loader2,
  CheckCircle, AlertTriangle, Scale,
  Compass, ArrowRight,
} from 'lucide-react';

type InvestmentType = 'equity' | 'reit' | 'invit' | 'bond';

interface LearnCard {
  type: InvestmentType;
  title: string;
  tagline: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  features: string[];
  risks: string[];
  suitedFor: string;
  explorerHref: string;
}

const LEARN_CARDS: LearnCard[] = [
  {
    type: 'equity',
    title: 'Equity (Stocks)',
    tagline: 'Own a piece of a company',
    icon: <TrendingUp className="w-5 h-5" />,
    color: 'rgb(var(--brand-500))',
    bgColor: 'rgb(var(--brand-500) / 0.1)',
    features: [
      'Part ownership of a listed company',
      'Returns via price appreciation + discretionary dividends',
      'Listed on NSE and BSE',
      'Can be bought/sold on any trading day',
    ],
    risks: [
      'High market volatility and economic cyclicality',
      'Company-specific operational and business risk',
      'Requires fundamental and valuation research',
    ],
    suitedFor: 'Investors with long-term horizons (5+ years) seeking growth who can tolerate daily price volatility.',
    explorerHref: '/explore',
  },
  {
    type: 'reit',
    title: 'REITs',
    tagline: 'Commercial real estate cash flows without physical property ownership',
    icon: <Building2 className="w-5 h-5" />,
    color: '#8B5CF6',
    bgColor: 'rgba(139,92,246,0.1)',
    features: [
      'Co-own Grade-A commercial office parks, tech hubs, and malls',
      'SEBI mandates distributing >= 90% Net Distributable Cash Flows (NDCF)',
      '1 unit minimum trading lot size on NSE/BSE (standardized July 2021)',
      'Distributions comprise dividends, loan interest, and capital return',
    ],
    risks: [
      'Inverse sensitivity to RBI benchmark interest rate hikes',
      'Tenant vacancy and lease non-renewal risks upon expiry',
      'Secondary market unit price fluctuation',
    ],
    suitedFor: 'Investors seeking regular income from commercial real estate leases with low capital thresholds.',
    explorerHref: '/reit',
  },
  {
    type: 'invit',
    title: 'InvITs',
    tagline: 'Fractional participation in national infrastructure assets',
    icon: <Zap className="w-5 h-5" />,
    color: '#F59E0B',
    bgColor: 'rgba(245,158,11,0.1)',
    features: [
      'Hold essential infrastructure (toll highways, power grids, fiber)',
      'SEBI mandates distributing >= 90% Net Distributable Cash Flows (NDCF)',
      '1 unit minimum trading lot size on NSE/BSE (standardized July 2021)',
      'Regular cash flows from highway tolls or availability tariffs',
    ],
    risks: [
      'Concession lifespan expiration (BOT assets amortize toward zero)',
      'Highway traffic volume fluctuations and fuel economic cycles',
      'Interest rate sensitivity on project finance bank loans',
    ],
    suitedFor: 'Investors seeking regular cash distributions who understand concession lifespans and project debt risks.',
    explorerHref: '/invit',
  },
  {
    type: 'bond',
    title: 'Bonds & Fixed Income',
    tagline: 'Contractual debt providing periodic coupons and par redemption',
    icon: <FileText className="w-5 h-5" />,
    color: '#10B981',
    bgColor: 'rgba(16,185,129,0.1)',
    features: [
      'Contractual loan to Central Government, State, or Corporation',
      'Predetermined coupon interest paid periodically on nominal face value',
      'Principal face value returned at maturity date',
      'Central G-Secs carry sovereign default safety (backed by RBI/Govt)',
    ],
    risks: [
      'Corporate credit default risk (varies by credit rating AAA to D)',
      'Duration & interest rate risk (market price falls when interest rates rise)',
      'Inflation erosion over fixed long-term coupon payouts',
    ],
    suitedFor: 'Investors seeking defined regular coupon cash flows and priority claim over equity in capital structure.',
    explorerHref: '/bonds',
  },
];

interface AIExplanation {
  type: InvestmentType;
  text: string;
  loading: boolean;
}

export default function LearnPage() {
  const [expandedType, setExpandedType] = useState<InvestmentType | null>(null);
  const [aiExplanations, setAiExplanations] = useState<Record<string, AIExplanation>>({});

  async function fetchExplanation(type: InvestmentType) {
    if (aiExplanations[type]?.text) return; // already loaded

    setAiExplanations((prev) => ({
      ...prev,
      [type]: { type, text: '', loading: true },
    }));

    try {
      const res = await fetch('/api/ai/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();
      setAiExplanations((prev) => ({
        ...prev,
        [type]: { type, text: data.explanation || data.error || '', loading: false },
      }));
    } catch {
      setAiExplanations((prev) => ({
        ...prev,
        [type]: { type, text: 'Failed to load explanation.', loading: false },
      }));
    }
  }

  function handleToggle(type: InvestmentType) {
    if (expandedType === type) {
      setExpandedType(null);
    } else {
      setExpandedType(type);
      fetchExplanation(type);
    }
  }

  return (
    <div className="page-container space-y-6">
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: 'rgb(var(--foreground))' }}>
          Learn & Financial Discovery
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'rgb(var(--muted))' }}>
          Understand different investment types available to Indian retail investors with verified regulatory context
        </p>
      </div>

      {/* Deep Link Banner to Explorer */}
      <div
        className="card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-l-4 border-l-brand-500"
        style={{ backgroundColor: 'rgb(var(--surface))' }}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand-500/10 text-brand-500 flex items-center justify-center flex-shrink-0">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-foreground">
              Looking for Interactive Yield Calculators & Quizzes?
            </h4>
            <p className="text-[11px] text-muted">
              Explore REIT NDCF yields, InvIT concession models, and Bond coupon vs current yield calculators in the dedicated Explorer.
            </p>
          </div>
        </div>
        <Link
          href="/explore"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-500 text-white shadow-sm hover:opacity-95 transition-opacity self-start sm:self-auto flex-shrink-0"
        >
          <span>Open Investment Explorer</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Hero comparison grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {LEARN_CARDS.map((card, i) => (
          <motion.button
            key={card.type}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            onClick={() => handleToggle(card.type)}
            id={`learn-card-${card.type}`}
            className="card p-4 text-left transition-all"
            style={{
              borderColor: expandedType === card.type ? card.color : 'rgb(var(--border))',
            }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
              style={{ backgroundColor: card.bgColor, color: card.color }}
            >
              {card.icon}
            </div>
            <p className="text-sm font-semibold" style={{ color: 'rgb(var(--foreground))' }}>
              {card.title}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--muted))' }}>
              {card.tagline}
            </p>
          </motion.button>
        ))}
      </div>

      {/* Expanded Detail Panel */}
      <AnimatePresence mode="wait">
        {expandedType && (() => {
          const card = LEARN_CARDS.find((c) => c.type === expandedType)!;
          const aiExp = aiExplanations[expandedType];
          return (
            <motion.div
              key={expandedType}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="card overflow-hidden"
            >
              {/* Header */}
              <div
                className="px-5 py-4 flex items-center justify-between"
                style={{ borderBottom: '1px solid rgb(var(--border))' }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: card.bgColor, color: card.color }}
                  >
                    {card.icon}
                  </div>
                  <div>
                    <h2 className="text-base font-semibold" style={{ color: 'rgb(var(--foreground))' }}>
                      {card.title}
                    </h2>
                    <p className="text-xs" style={{ color: 'rgb(var(--muted))' }}>
                      {card.tagline}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setExpandedType(null)}
                  style={{ color: 'rgb(var(--muted))' }}
                >
                  <ChevronUp className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 grid md:grid-cols-3 gap-5">
                {/* Features */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 mb-3">
                    <CheckCircle className="w-4 h-4" style={{ color: 'rgb(var(--gain))' }} />
                    <h3 className="text-sm font-semibold" style={{ color: 'rgb(var(--foreground))' }}>
                      Key Features
                    </h3>
                  </div>
                  {card.features.map((f) => (
                    <div key={f} className="flex gap-2 text-sm">
                      <span className="mt-0.5 w-1 h-1 rounded-full flex-shrink-0 bg-current" style={{ color: card.color }} />
                      <p style={{ color: 'rgb(var(--foreground))' }}>{f}</p>
                    </div>
                  ))}
                </div>

                {/* Risks */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 mb-3">
                    <AlertTriangle className="w-4 h-4" style={{ color: 'rgb(var(--warning))' }} />
                    <h3 className="text-sm font-semibold" style={{ color: 'rgb(var(--foreground))' }}>
                      Risks to Consider
                    </h3>
                  </div>
                  {card.risks.map((r) => (
                    <div key={r} className="flex gap-2 text-sm">
                      <span className="mt-0.5 text-xs">•</span>
                      <p style={{ color: 'rgb(var(--foreground))' }}>{r}</p>
                    </div>
                  ))}
                </div>

                {/* AI Explanation */}
                <div>
                  <div className="flex items-center gap-1.5 mb-3">
                    <Sparkles className="w-4 h-4" style={{ color: 'rgb(var(--brand-500))' }} />
                    <h3 className="text-sm font-semibold" style={{ color: 'rgb(var(--foreground))' }}>
                      AI Explainer
                    </h3>
                  </div>

                  {aiExp?.loading ? (
                    <div className="flex items-center gap-2 text-sm" style={{ color: 'rgb(var(--muted))' }}>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating explanation…
                    </div>
                  ) : aiExp?.text ? (
                    <p className="text-sm leading-relaxed" style={{ color: 'rgb(var(--foreground))' }}>
                      {aiExp.text}
                    </p>
                  ) : (
                    <p className="text-sm" style={{ color: 'rgb(var(--muted))' }}>
                      Configure GEMINI_API_KEY to get AI explanations.
                    </p>
                  )}
                </div>
              </div>

              {/* Suited for */}
              <div
                className="px-5 py-3 border-t text-sm flex items-start gap-2"
                style={{ borderColor: 'rgb(var(--border))', backgroundColor: 'rgb(var(--surface-raised))' }}
              >
                <Scale className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: card.color }} />
                <p style={{ color: 'rgb(var(--foreground))' }}>
                  <strong>Educational suitability context:</strong> {card.suitedFor}
                </p>
              </div>

              {/* Explorer Deep Link */}
              <div
                className="px-5 py-3 border-t text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                style={{ borderColor: 'rgb(var(--border))', backgroundColor: 'rgb(var(--surface))' }}
              >
                <div className="flex items-center gap-2 text-muted">
                  <Compass className="w-4 h-4 text-brand-500 flex-shrink-0" />
                  <span>Launch interactive yield calculators, cash distribution simulators, and knowledge checks</span>
                </div>
                <Link
                  href={card.explorerHref}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white shadow-sm transition-opacity hover:opacity-95 self-start sm:self-auto flex-shrink-0"
                  style={{ backgroundColor: card.color }}
                >
                  <span>Launch {card.title} Explorer</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Comparison Table */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="card overflow-hidden"
      >
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'rgb(var(--border))' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'rgb(var(--foreground))' }}>
            Quick Comparison Across Asset Classes
          </h2>
          <Link href="/explore" className="text-xs text-brand-500 hover:underline inline-flex items-center gap-1">
            <span>Detailed 10-Dimension Matrix</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: 'rgb(var(--surface-raised))' }}>
                <th className="text-left px-4 py-2.5 text-xs font-medium" style={{ color: 'rgb(var(--muted))' }}>Feature</th>
                <th className="text-center px-4 py-2.5 text-xs font-medium" style={{ color: 'rgb(var(--brand-500))' }}>Equity</th>
                <th className="text-center px-4 py-2.5 text-xs font-medium" style={{ color: '#8B5CF6' }}>REIT</th>
                <th className="text-center px-4 py-2.5 text-xs font-medium" style={{ color: '#F59E0B' }}>InvIT</th>
                <th className="text-center px-4 py-2.5 text-xs font-medium" style={{ color: '#10B981' }}>Bond</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'rgb(var(--border))' }}>
              {[
                ['Risk Level', 'High (Market Cycles)', 'Moderate (Interest/Vacancy)', 'Moderate (Concession Lifespan)', 'Low-Moderate (Credit/Duration)'],
                ['Regular Income', '✕ Discretionary Dividends', '✓ Mandatory >=90% NDCF', '✓ Mandatory >=90% NDCF', '✓ Contractual Fixed Coupon'],
                ['Capital Growth', '✓ High (Enterprise value)', '✓ Moderate (Property NAV)', '✕ Amortizing (Concession expiry)', '✕ None (Par redemption)'],
                ['Liquidity', 'Very High on NSE/BSE', 'Moderate (1 unit lot)', 'Moderate to Low (1 unit lot)', 'Low-Moderate on debt segment'],
                ['Min Lot Size (SEBI)', '1 share', '1 unit (SEBI 2021)', '1 unit (SEBI 2021)', '1 bond lot / G-Sec lot'],
                ['Tax on Returns', 'LTCG/STCG + Dividends', 'Split: Dividend, Interest, Return of Capital', 'Split: Dividend, Interest, Return of Capital', 'Interest taxed as income; LTCG on listed debt'],
              ].map(([feature, ...vals]) => (
                <tr key={feature} className="hover:bg-opacity-50"
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgb(var(--surface-raised))'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = ''; }}
                >
                  <td className="px-4 py-2.5 font-medium" style={{ color: 'rgb(var(--foreground))' }}>{feature}</td>
                  {vals.map((v, i) => (
                    <td key={i} className="px-4 py-2.5 text-center text-xs" style={{ color: 'rgb(var(--muted))' }}>
                      {v}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 text-xs border-t" style={{ borderColor: 'rgb(var(--border))', color: 'rgb(var(--muted))' }}>
          ⚠ Tax information is for general educational guidance only under Indian regulations. Consult a qualified tax professional for your specific situation.
        </div>
      </motion.div>
    </div>
  );
}
