'use client';

import React from 'react';
import Link from 'next/link';
import { Compass, ArrowRight, Building2, Zap, Coins, Layers, Lightbulb } from 'lucide-react';
import type { AssetAllocation, HoldingWithMetrics } from '@/types/portfolio';

interface ExploreOpportunitiesSectionProps {
  allocations: AssetAllocation[];
  holdings: HoldingWithMetrics[];
}

export function ExploreOpportunitiesSection({
  allocations,
  holdings,
}: ExploreOpportunitiesSectionProps) {
  // Check what asset classes the user currently holds
  const hasReits = allocations.some((a) => a.asset_class === 'reit' && a.percentage > 0);
  const hasInvits = allocations.some((a) => a.asset_class === 'invit' && a.percentage > 0);
  const hasBonds = allocations.some((a) => a.asset_class === 'bond' && a.percentage > 0);
  const hasGold = allocations.some((a) => a.asset_class === 'sgb' && a.percentage > 0);

  const opportunities = [
    {
      badge: 'Research idea',
      title: 'Commercial Real Estate Yields',
      description: hasReits
        ? 'Analyze quarterly NDCF distribution yields and office occupancy across SEBI-regulated commercial REITs.'
        : 'Explore listed Indian REITs generating quarterly commercial rental distributions without property deed management.',
      icon: Building2,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10 border-amber-500/20',
      actionText: 'Explore REITs',
      link: '/reit',
    },
    {
      badge: 'Explore opportunity',
      title: 'Contractual Fixed Income',
      description: hasBonds
        ? 'Evaluate duration sensitivity and credit ratings across your tracked listed debt securities.'
        : 'Research sovereign G-Secs and AAA PSU bonds with predictable fixed coupon interest to cushion equity drawdowns.',
      icon: Zap,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10 border-blue-500/20',
      actionText: 'Explore Bonds',
      link: '/bonds',
    },
    {
      badge: 'Research idea',
      title: 'Precious Metals Inflation Hedge',
      description: hasGold
        ? 'Track real-time international bullion movements and sovereign gold bond redemption premiums.'
        : 'Explore international gold & silver benchmarks and Indian gold ETFs (GOLDBEES) for non-correlated portfolio balance.',
      icon: Coins,
      color: 'text-yellow-500',
      bg: 'bg-yellow-500/10 border-yellow-500/20',
      actionText: 'Explore Gold & Silver',
      link: '/explore?tab=commodities',
    },
    {
      badge: 'Explore opportunity',
      title: 'Sector Discovery & Breadth',
      description:
        'Discover equities across under-represented industries like Healthcare, FMCG, or Auto to broaden economic exposure.',
      icon: Layers,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10 border-emerald-500/20',
      actionText: 'Explore Sectors',
      link: '/explore?tab=sectors',
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
            <Compass className="w-4 h-4 text-brand" />
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
              Explore New Opportunities
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-surface-raised text-muted border border-border">
              Portfolio-Aware Research
            </span>
          </div>
          <p className="text-xs text-muted mt-0.5">
            Discover research avenues based on your asset diversification and market coverage.
          </p>
        </div>

        <Link
          href="/explore"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-border bg-surface-raised hover:bg-surface text-foreground transition-all shadow-xs self-start sm:self-auto group"
        >
          <span>Open Full Explorer</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {opportunities.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.title}
              href={item.link}
              className="p-4 rounded-xl border border-border/70 hover:border-brand/40 bg-surface-raised/40 hover:bg-surface-raised transition-all flex flex-col justify-between group shadow-xs hover-card"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div
                    className={`w-8 h-8 rounded-lg border ${item.bg} ${item.color} flex items-center justify-center shrink-0`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
                    {item.badge}
                  </span>
                </div>

                <div className="space-y-1">
                  <h3 className="text-xs sm:text-sm font-bold text-foreground group-hover:text-brand transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-[11px] text-muted leading-relaxed line-clamp-3">
                    {item.description}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between text-xs font-semibold text-brand">
                <span>{item.actionText}</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
