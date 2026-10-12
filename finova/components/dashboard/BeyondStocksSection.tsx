'use client';

import React from 'react';
import Link from 'next/link';
import { Building2, Zap, Link2, ArrowRight, Layers } from 'lucide-react';

export function BeyondStocksSection() {
  const cards = [
    {
      title: 'REITs',
      subtitle: 'Real Estate Investment Trusts',
      description:
        'Commercial property co-ownership with SEBI-mandated quarterly cash distributions and institutional real estate exposure.',
      icon: Building2,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10 border-amber-500/20',
      hoverBorder: 'hover:border-amber-500/40',
      actionText: 'Explore REITs',
      link: '/reit',
      stat: '5.6% – 7.2% Yield',
    },
    {
      title: 'InvITs',
      subtitle: 'Infrastructure Investment Trusts',
      description:
        'Essential infrastructure ownership generating high-yield concession cash distributions from national tollways and power grids.',
      icon: Zap,
      color: 'text-teal-500',
      bg: 'bg-teal-500/10 border-teal-500/20',
      hoverBorder: 'hover:border-teal-500/40',
      actionText: 'Explore InvITs',
      link: '/invit',
      stat: '10.3% – 12.2% Yield',
    },
    {
      title: 'Bonds',
      subtitle: 'Fixed-Income & Debt',
      description:
        'Contractual debt instruments providing predictable fixed coupon interest, defined maturity dates, and credit risk mitigation.',
      icon: Link2,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10 border-blue-500/20',
      hoverBorder: 'hover:border-blue-500/40',
      actionText: 'Explore Bonds',
      link: '/bonds',
      stat: '7.0% – 7.9% Coupon',
    },
  ];

  return (
    <div
      className="p-5 sm:p-6 rounded-2xl border transition-all duration-200 bg-surface shadow-xs space-y-4"
      style={{ borderColor: 'rgb(var(--border))' }}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-brand" />
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
              Beyond Stocks
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-surface-raised text-muted border border-border">
              Alternative Assets
            </span>
          </div>
          <p className="text-xs text-muted mt-0.5">
            Discover asset classes generating contractual cash flows beyond direct equities.
          </p>
        </div>

        <Link
          href="/explore?tab=alts"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-border bg-surface-raised hover:bg-surface text-foreground transition-all shadow-xs self-start sm:self-auto group"
        >
          <span>Alternatives Hub</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {/* 3 Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Link
              key={c.title}
              href={c.link}
              className={`p-4 sm:p-5 rounded-xl border border-border/70 ${c.hoverBorder} bg-surface-raised/40 hover:bg-surface-raised transition-all flex flex-col justify-between group shadow-xs hover-card`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div
                    className={`w-9 h-9 rounded-xl border ${c.bg} ${c.color} flex items-center justify-center shrink-0 shadow-xs`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-surface text-foreground border border-border/80">
                    {c.stat}
                  </span>
                </div>

                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-foreground group-hover:text-brand transition-colors">
                    {c.title}
                    <span className="text-[11px] font-normal text-muted block sm:inline sm:ml-1.5">
                      · {c.subtitle}
                    </span>
                  </h3>
                  <p className="text-xs text-muted leading-relaxed line-clamp-3">
                    {c.description}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between text-xs font-semibold text-brand">
                <span>{c.actionText}</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
