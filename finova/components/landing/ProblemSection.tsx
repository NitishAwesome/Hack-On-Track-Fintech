'use client';

import React from 'react';
import { ArrowDown, Split, EyeOff, Shuffle, HelpCircle, CheckCircle2 } from 'lucide-react';
import { FinovaLogo } from '@/components/shared/FinovaLogo';

export function ProblemSection() {
  const problems = [
    {
      icon: Split,
      title: 'Fragmented Holdings',
      description: 'Investments split across multiple apps make it exhausting to calculate true overall net worth and returns.',
    },
    {
      icon: EyeOff,
      title: 'Hidden Concentration Risk',
      description: 'Multiple funds often hold the same underlying stocks, creating unforeseen sector exposure without your awareness.',
    },
    {
      icon: Shuffle,
      title: 'App Fatigue & Friction',
      description: 'Logging into 3+ broker portals to manually correlate trades, dividends, and corporate actions.',
    },
    {
      icon: HelpCircle,
      title: 'Overlooked Alternatives',
      description: 'Portfolios default strictly to equities, missing transparent yields available in REITs, InvITs, and Sovereign Bonds.',
    },
  ];

  return (
    <section id="product" className="py-20 sm:py-24 border-b border-border relative select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <p className="text-xs font-bold uppercase tracking-widest text-brand">The Challenge</p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-foreground">
            Your investments may be scattered.{' '}
            <span className="block text-muted font-extrabold">Your financial picture shouldn’t be.</span>
          </h2>
          <p className="text-sm sm:text-base text-muted max-w-2xl mx-auto leading-relaxed">
            Designed to bring investments from multiple platforms into one unified view.
          </p>
        </div>

        {/* Conceptual Aggregation Flow Diagram */}
        <div className="my-14 max-w-4xl mx-auto">
          <div
            className="p-6 sm:p-8 rounded-2xl border transition-all"
            style={{
              backgroundColor: 'rgb(var(--surface))',
              borderColor: 'rgb(var(--border))',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            {/* Step 1: Fragmented Platforms */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted text-center mb-3">
                Current Reality: Disconnected Platforms
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                {['Zerodha', 'Groww', 'Angel One', 'Other Brokers'].map((broker) => (
                  <div
                    key={broker}
                    className="py-3 px-3 rounded-xl border text-center text-xs font-semibold text-muted bg-surface-raised border-border"
                  >
                    <span>{broker}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Step 2: Flow Arrow into Finova */}
            <div className="flex flex-col items-center justify-center my-6">
              <div className="w-8 h-8 rounded-full border border-border bg-surface-raised flex items-center justify-center text-brand">
                <ArrowDown className="w-4 h-4 animate-bounce" />
              </div>
            </div>

            {/* Step 3: Finova Hub */}
            <div className="flex justify-center">
              <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl border border-brand/30 bg-brand/10 shadow-sm">
                <FinovaLogo size="sm" variant="horizontal" />
                <span className="text-[11px] font-semibold text-brand tracking-wide">
                  Aggregation & Intelligence Core
                </span>
              </div>
            </div>

            {/* Step 4: Flow Arrow out */}
            <div className="flex flex-col items-center justify-center my-6">
              <div className="w-8 h-8 rounded-full border border-border bg-surface-raised flex items-center justify-center text-emerald-500">
                <ArrowDown className="w-4 h-4" />
              </div>
            </div>

            {/* Step 5: Unified Result */}
            <div className="p-4 rounded-xl border border-border bg-surface-raised text-center max-w-md mx-auto">
              <div className="flex items-center justify-center gap-2 text-xs font-bold text-foreground">
                <CheckCircle2 className="w-4 h-4 text-gain" />
                <span>Unified Portfolio & Multi-Asset Intelligence</span>
              </div>
              <p className="text-[11px] text-muted mt-1">
                Total visibility across Stocks, REITs, InvITs, Mutual Funds & Bonds in one view.
              </p>
            </div>

            <p className="text-[10px] text-center text-muted mt-5 italic">
              * Conceptual design representation. External broker statement ingestion and depository integration in development.
            </p>
          </div>
        </div>

        {/* 4 Problem Breakdown Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {problems.map((p) => {
            const Icon = p.icon;
            return (
              <div
                key={p.title}
                className="p-5 sm:p-6 rounded-2xl border border-border bg-surface transition-all duration-200 hover:border-brand/40 shadow-xs space-y-3"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-brand/10 text-brand">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-foreground">{p.title}</h3>
                <p className="text-xs text-muted leading-relaxed">{p.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default ProblemSection;
