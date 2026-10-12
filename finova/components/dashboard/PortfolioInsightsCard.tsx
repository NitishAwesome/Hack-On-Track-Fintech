'use client';

import React from 'react';
import Link from 'next/link';
import { Lightbulb, TrendingDown, TrendingUp, Building2, ShieldCheck, ArrowRight } from 'lucide-react';
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
        className="p-5 sm:p-6 rounded-2xl border flex flex-col justify-between h-[380px] animate-pulse bg-surface"
        style={{ borderColor: 'rgb(var(--border))' }}
      >
        <div className="h-4 w-32 bg-muted/20 rounded" />
        <div className="h-24 bg-muted/20 rounded-xl" />
        <div className="space-y-2">
          <div className="h-4 bg-muted/20 rounded" />
          <div className="h-4 bg-muted/20 rounded" />
        </div>
      </div>
    );
  }

  // Derive top sector & concentration
  const sectorMap = new Map<string, number>();
  let totalVal = 0;
  for (const h of holdings) {
    const val = h.current_value ?? h.invested_value ?? 0;
    totalVal += val;
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

  const isConcentrated = topSectorPct > 35;
  const pnl = summary?.total_absolute_return ?? 0;
  const isLoss = pnl < 0;

  return (
    <div
      className="p-5 sm:p-6 rounded-2xl border flex flex-col justify-between transition-all duration-200 bg-surface shadow-xs"
      style={{
        borderColor: 'rgb(var(--border))',
      }}
    >
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-brand animate-pulse" />
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
              Portfolio Insights
            </h2>
          </div>
          <Link
            href="/analysis"
            className="text-xs font-semibold text-brand hover:underline flex items-center gap-1 group"
          >
            <span>View Detailed Analysis</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* Highlight Alert Box */}
        <div
          className="p-3.5 rounded-xl border mb-3 flex items-start gap-3 transition-colors"
          style={{
            backgroundColor: isConcentrated ? 'rgba(245, 158, 11, 0.08)' : 'rgba(16, 185, 129, 0.08)',
            borderColor: isConcentrated ? 'rgba(245, 158, 11, 0.25)' : 'rgba(16, 185, 129, 0.25)',
          }}
        >
          <div
            className="w-7 h-7 rounded-lg shrink-0 flex items-center justify-center"
            style={{
              backgroundColor: isConcentrated ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)',
              color: isConcentrated ? '#F59E0B' : '#10B981',
            }}
          >
            <Lightbulb className="w-4 h-4" />
          </div>
          <div className="space-y-0.5 text-xs">
            <p className="font-bold text-foreground">
              {isConcentrated
                ? `High Concentration in ${topSector} (${topSectorPct.toFixed(1)}%)`
                : `Balanced Exposure across ${sectorMap.size} Sectors`}
            </p>
            <p className="text-muted leading-relaxed">
              {isConcentrated
                ? `Your portfolio is concentrated in ${topSector} (${topSectorPct.toFixed(1)}% of value), which is higher than typical diversification levels. Consider spreading across more sectors to manage risk.`
                : `Your investments show healthy diversification across primary industries without extreme single-sector bias.`}
            </p>
          </div>
        </div>

        {/* Insight Checklist */}
        <div className="space-y-2.5">
          {/* P&L Commentary */}
          <div className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-surface-raised/60 transition-colors">
            <div
              className="w-6 h-6 rounded-md shrink-0 flex items-center justify-center mt-0.5"
              style={{
                backgroundColor: isLoss ? 'rgba(244, 63, 94, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                color: isLoss ? '#F43F5E' : '#10B981',
              }}
            >
              {isLoss ? <TrendingDown className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
            </div>
            <p className="text-xs text-muted leading-snug">
              {isLoss
                ? `Portfolio is down ${Math.abs(summary?.total_absolute_return_pct ?? 0).toFixed(2)}% primarily due to recent pullbacks in ${topSector}.`
                : `Portfolio returns stand at +${(summary?.total_absolute_return_pct ?? 0).toFixed(2)}% with positive momentum.`}
            </p>
          </div>

          {/* Broker Footprint */}
          <div className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-surface-raised/60 transition-colors">
            <div className="w-6 h-6 rounded-md shrink-0 flex items-center justify-center mt-0.5 bg-blue-500/10 text-blue-400">
              <Building2 className="w-3.5 h-3.5" />
            </div>
            <p className="text-xs text-muted leading-snug">
              You have {holdings.length} {holdings.length === 1 ? 'holding' : 'holdings'} consolidated across {brokers.length} {brokers.length === 1 ? 'broker account' : 'broker accounts'}.
            </p>
          </div>

          {/* Defensive suggestion */}
          <div className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-surface-raised/60 transition-colors">
            <div className="w-6 h-6 rounded-md shrink-0 flex items-center justify-center mt-0.5 bg-emerald-500/10 text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
            <p className="text-xs text-muted leading-snug">
              Consider exploring defensive assets like REITs, Sovereign Gold Bonds, or Government Securities for portfolio stability.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
