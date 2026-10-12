'use client';

import React from 'react';
import Link from 'next/link';
import {
  Lightbulb,
  ArrowRight,
  PieChart,
  ShieldAlert,
  ShieldCheck,
  Clock,
  Layers,
  Award,
} from 'lucide-react';
import type { HoldingWithMetrics, PortfolioSummary } from '@/types/portfolio';
import type { BrokerAccountRow } from '@/types/database';

interface PortfolioInsightsCardProps {
  summary: PortfolioSummary | null;
  holdings: HoldingWithMetrics[];
  brokers: BrokerAccountRow[];
  isLoading?: boolean;
}

export function PortfolioInsightsCard({
  summary,
  holdings,
  brokers,
  isLoading,
}: PortfolioInsightsCardProps) {
  if (isLoading) {
    return (
      <div
        className="p-5 sm:p-6 rounded-2xl border flex flex-col justify-between h-full min-h-[360px] animate-pulse bg-surface"
        style={{ borderColor: 'rgb(var(--border))' }}
      >
        <div className="h-4 w-32 bg-muted/20 rounded" />
        <div className="space-y-3 my-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 bg-muted/20 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  // Compute portfolio metrics
  const totalVal = summary?.total_current_value ?? holdings.reduce((sum, h) => sum + (h.current_value ?? h.invested_value ?? 0), 0);

  // 1. Largest Holding
  const sortedHoldings = [...holdings].sort((a, b) => {
    const valA = a.current_value ?? a.invested_value ?? 0;
    const valB = b.current_value ?? b.invested_value ?? 0;
    return valB - valA;
  });
  const largestHolding = sortedHoldings[0];
  const largestVal = largestHolding ? (largestHolding.current_value ?? largestHolding.invested_value ?? 0) : 0;
  const largestPct = totalVal > 0 ? (largestVal / totalVal) * 100 : 0;

  // 2. Top Sector
  const sectorMap = new Map<string, number>();
  for (const h of holdings) {
    const val = h.current_value ?? h.invested_value ?? 0;
    const s = h.sector || 'Others';
    sectorMap.set(s, (sectorMap.get(s) || 0) + val);
  }

  let topSector = 'Equities';
  let topSectorPct = 0;
  for (const [sec, val] of sectorMap.entries()) {
    const pct = totalVal > 0 ? (val / totalVal) * 100 : 0;
    if (pct > topSectorPct) {
      topSectorPct = pct;
      topSector = sec;
    }
  }

  // 3. Diversification Status
  const sectorCount = sectorMap.size;
  const isWellDiversified = sectorCount >= 4 && holdings.length >= 5;

  // 4. Concentration Risk
  const isHighConcentration = largestPct > 30 || topSectorPct > 45;

  return (
    <div
      className="h-full p-5 sm:p-6 rounded-2xl border flex flex-col justify-between transition-all duration-200 bg-surface shadow-xs"
      style={{
        borderColor: 'rgb(var(--border))',
      }}
    >
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-brand" />
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
              Portfolio Insights
            </h2>
          </div>
          <Link
            href="/analysis"
            className="text-xs font-semibold text-brand hover:underline flex items-center gap-1 group"
          >
            <span>Investment X-Ray</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* 5 Concise Actionable Observations */}
        <div className="space-y-2.5">
          {/* Observation 1: Largest Holding */}
          <div className="p-2.5 rounded-xl border border-border/70 bg-surface-raised/40 flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0">
                <Award className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">
                  Largest Holding
                </span>
                <span className="text-xs font-bold text-foreground truncate block">
                  {largestHolding ? `${largestHolding.symbol} (${largestHolding.name})` : 'None recorded'}
                </span>
              </div>
            </div>
            <span className="text-xs font-extrabold text-foreground tabular-nums shrink-0">
              {largestHolding ? `${largestPct.toFixed(1)}%` : '0%'}
            </span>
          </div>

          {/* Observation 2: Top Sector */}
          <div className="p-2.5 rounded-xl border border-border/70 bg-surface-raised/40 flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center shrink-0">
                <PieChart className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">
                  Top Sector
                </span>
                <span className="text-xs font-bold text-foreground truncate block">
                  {topSector}
                </span>
              </div>
            </div>
            <span className="text-xs font-extrabold text-foreground tabular-nums shrink-0">
              {topSectorPct > 0 ? `${topSectorPct.toFixed(1)}%` : '0%'}
            </span>
          </div>

          {/* Observation 3: Diversification */}
          <div className="p-2.5 rounded-xl border border-border/70 bg-surface-raised/40 flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
                <Layers className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">
                  Diversification
                </span>
                <span className="text-xs font-semibold text-foreground truncate block">
                  {holdings.length} {holdings.length === 1 ? 'asset' : 'assets'} · {sectorCount} {sectorCount === 1 ? 'sector' : 'sectors'} · {brokers.length} {brokers.length === 1 ? 'broker' : 'brokers'}
                </span>
              </div>
            </div>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                isWellDiversified
                  ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
              }`}
            >
              {isWellDiversified ? 'Healthy' : 'Developing'}
            </span>
          </div>

          {/* Observation 4: Concentration Risk */}
          <div className="p-2.5 rounded-xl border border-border/70 bg-surface-raised/40 flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
                  isHighConcentration
                    ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                }`}
              >
                {isHighConcentration ? (
                  <ShieldAlert className="w-3.5 h-3.5" />
                ) : (
                  <ShieldCheck className="w-3.5 h-3.5" />
                )}
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">
                  Concentration Risk
                </span>
                <span className="text-xs font-semibold text-foreground truncate block">
                  {isHighConcentration
                    ? `Heavy allocation in ${topSector}`
                    : 'Balanced weight distribution'}
                </span>
              </div>
            </div>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                isHighConcentration
                  ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                  : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
              }`}
            >
              {isHighConcentration ? 'Elevated' : 'Low'}
            </span>
          </div>

          {/* Observation 5: Quote Freshness */}
          <div className="p-2.5 rounded-xl border border-border/70 bg-surface-raised/40 flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center shrink-0">
                <Clock className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">
                  Quote Freshness
                </span>
                <span className="text-xs font-semibold text-foreground truncate block">
                  Live market prices synced with NSE/BSE
                </span>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shrink-0">
              Live Feed
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
