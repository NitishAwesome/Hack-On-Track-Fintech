'use client';

import React from 'react';
import Link from 'next/link';
import { TrendingUp, Building2, Zap, Landmark, ArrowRight, Check } from 'lucide-react';

export function BeyondStocksSection() {
  const assetTypes = [
    {
      title: 'STOCKS',
      tagline: 'Equity Ownership',
      description: 'Ownership in listed companies with market-linked returns and risks.',
      icon: TrendingUp,
      color: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      highlights: [
        'Potential Growth',
        'High liquidity',
        'Market-linked risk',
      ],
    },
    {
      title: 'REITs',
      tagline: 'Real Estate Investment Trusts',
      description: 'Investment vehicles providing exposure to income-generating real estate without directly purchasing property.',
      icon: Building2,
      color: 'bg-teal-500/10 text-teal-500 border-teal-500/20',
      highlights: [
        'Real-estate exposure',
        'Potential distributions',
        'Exchange traded',
      ],
    },
    {
      title: 'InvITs',
      tagline: 'Infrastructure Investment Trusts',
      description: 'Investment trusts that provide exposure to infrastructure assets such as roads, power and transmission projects.',
      icon: Zap,
      color: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
      highlights: [
        'Infrastructure exposure',
        'Potential distributions',
        'Long-term assets',
      ],
    },
    {
      title: 'BONDS',
      tagline: 'Fixed-Income Securities',
      description: 'Fixed-income instruments where investors lend money to governments or organizations for defined interest and maturity terms.',
      icon: Landmark,
      color: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
      highlights: [
        'Fixed-income characteristics',
        'Defined maturity',
        'Different risk profiles',
      ],
    },
  ];

  return (
    <section className="py-20 sm:py-24 border-b border-border bg-surface-raised/40 select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <p className="text-xs font-bold uppercase tracking-widest text-brand">Asset Class Education</p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-foreground">
            Explore beyond stocks.
          </h2>
          <p className="text-sm sm:text-base text-muted max-w-2xl mx-auto leading-relaxed">
            Understand different asset classes before deciding how they may fit into a portfolio.
          </p>
        </div>

        {/* 4 Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mt-14">
          {assetTypes.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="p-6 rounded-2xl border border-border bg-surface transition-all duration-200 hover:border-brand/40 shadow-xs flex flex-col justify-between space-y-5"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${item.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-muted font-bold px-2 py-0.5 rounded bg-surface-raised border border-border">
                      {item.tagline}
                    </span>
                  </div>

                  <h3 className="text-lg font-black tracking-tight text-foreground">
                    {item.title}
                  </h3>

                  <p className="text-xs text-muted mt-2 leading-relaxed min-h-[48px]">
                    {item.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-border space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted">
                    Key Characteristics
                  </p>
                  <ul className="space-y-1.5 text-xs text-foreground font-medium">
                    {item.highlights.map((h) => (
                      <li key={h} className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-brand flex-shrink-0" />
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Button */}
        <div className="mt-12 text-center">
          <Link
            href="/explore"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold border border-border bg-surface hover:bg-surface-raised transition-colors text-foreground shadow-xs"
          >
            <span>Explore Investment Types</span>
            <ArrowRight className="w-4 h-4 text-brand" />
          </Link>
          <p className="text-[11px] text-muted mt-2">
            Educational overview · Non-promotional, neutral asset class comparisons
          </p>
        </div>
      </div>
    </section>
  );
}

export default BeyondStocksSection;
