'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, Building2, Zap, FileText,
  ChevronDown, ChevronUp, Sparkles, Loader2,
  CheckCircle, AlertTriangle, Scale
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
      'Returns via price appreciation + dividends',
      'Listed on NSE and BSE',
      'Can be bought/sold on any trading day',
    ],
    risks: [
      'High market volatility',
      'Company-specific risk',
      'Requires research and monitoring',
    ],
    suitedFor: 'Investors with a long-term horizon (5+ years) and moderate to high risk appetite.',
  },
  {
    type: 'reit',
    title: 'REITs',
    tagline: 'Real estate income without the property',
    icon: <Building2 className="w-5 h-5" />,
    color: '#8B5CF6',
    bgColor: 'rgba(139,92,246,0.1)',
    features: [
      'Invest in income-generating real estate',
      'Mandated to distribute 90% income as dividends',
      'Listed on stock exchanges (NSE/BSE)',
      'Lower ticket size vs physical property',
    ],
    risks: [
      'Sensitive to interest rate changes',
      'Lower capital appreciation vs equities',
      'Limited liquidity vs stocks',
    ],
    suitedFor: 'Investors seeking regular income with real estate exposure, without large capital requirements.',
  },
  {
    type: 'invit',
    title: 'InvITs',
    tagline: 'Infrastructure income trusts',
    icon: <Zap className="w-5 h-5" />,
    color: '#F59E0B',
    bgColor: 'rgba(245,158,11,0.1)',
    features: [
      'Hold infrastructure assets (roads, pipelines, power)',
      'Regular cash distributions from asset revenues',
      'Stable, predictable income streams',
      'Listed on stock exchanges',
    ],
    risks: [
      'Regulatory and policy risk',
      'Project execution risk',
      'Interest rate sensitivity',
    ],
    suitedFor: 'Conservative investors seeking stable, inflation-linked income from essential infrastructure.',
  },
  {
    type: 'bond',
    title: 'Bonds & Debt',
    tagline: 'Fixed income with defined returns',
    icon: <FileText className="w-5 h-5" />,
    color: '#10B981',
    bgColor: 'rgba(16,185,129,0.1)',
    features: [
      'Loan to government or corporations',
      'Fixed coupon (interest) paid periodically',
      'Principal returned at maturity',
      'Government bonds (G-Secs) are near risk-free',
    ],
    risks: [
      'Credit risk for corporate bonds',
      'Interest rate risk (inverse price relationship)',
      'Inflation can erode real returns',
    ],
    suitedFor: 'Conservative investors seeking predictable income and capital preservation.',
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
          Learn
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'rgb(var(--muted))' }}>
          Understand different investment types available to Indian retail investors
        </p>
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
                  <strong>Best suited for:</strong> {card.suitedFor}
                </p>
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
        <div className="px-5 py-4 border-b" style={{ borderColor: 'rgb(var(--border))' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'rgb(var(--foreground))' }}>
            Quick Comparison
          </h2>
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
                ['Risk Level', 'High', 'Medium', 'Low-Medium', 'Low'],
                ['Regular Income', '✕ Dividends', '✓ Mandatory', '✓ Distributions', '✓ Coupon'],
                ['Capital Growth', '✓ High', '✕ Moderate', '✕ Low', '✕ Minimal'],
                ['Liquidity', 'High', 'Medium', 'Medium', 'Low-Medium'],
                ['Min Investment', 'One share', '~₹10,000', '~₹10,000', '~₹1,000'],
                ['Tax on Returns', 'LTCG/STCG', 'LTCG/STCG + TDS on dividends', 'LTCG/STCG + TDS', 'Interest taxed as income'],
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
          ⚠ Tax information is for general guidance only. Consult a tax professional for your specific situation.
        </div>
      </motion.div>
    </div>
  );
}
