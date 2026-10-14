'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { SlidersHorizontal, ArrowRight, ShieldAlert, CheckCircle2, Layers } from 'lucide-react';
import { CompanyLogo } from '@/components/shared/CompanyLogo';
import { formatCurrency } from '@/lib/utils';
import type { HoldingWithMetrics, AssetAllocation } from '@/types/portfolio';
import { valuationBasis } from '@/lib/calculations/valuationBasis';

interface PortfolioExposureCardProps {
  holdings: HoldingWithMetrics[];
  allocations: AssetAllocation[];
  totalValue: number | null;
  isLoading?: boolean;
}

const SECTOR_PALETTE = [
  '#3B82F6', '#F59E0B', '#14B8A6', '#8B5CF6',
  '#EC4899', '#F97316', '#06B6D4', '#64748B', '#A855F7', '#EAB308',
];

export function PortfolioExposureCard({
  holdings,
  totalValue,
  isLoading,
}: PortfolioExposureCardProps) {
  const [viewTab, setViewTab] = useState<'holdings' | 'sectors'>('holdings');

  const basis = useMemo(() => valuationBasis(holdings), [holdings]);
  const portfolioTotal = totalValue ?? basis.total;

  // Sorted holdings by valuation
  const sortedHoldings = useMemo(() => {
    return [...basis.holdings]
      .map((h) => {
        const val = basis.valueOf(h);
        const weight = portfolioTotal > 0 ? (val / portfolioTotal) * 100 : 0;
        return {
          ...h,
          val,
          weight,
        };
      })
      .sort((a, b) => b.val - a.val);
  }, [basis, portfolioTotal]);

  // Aggregated sectors
  const sectorList = useMemo(() => {
    const map = new Map<string, number>();
    for (const h of basis.holdings) {
      const val = basis.valueOf(h);
      const sec = h.sector || 'Unclassified';
      map.set(sec, (map.get(sec) || 0) + val);
    }
    return Array.from(map.entries())
      .map(([name, val], i) => ({
        name,
        val,
        weight: portfolioTotal > 0 ? (val / portfolioTotal) * 100 : 0,
        color: SECTOR_PALETTE[i % SECTOR_PALETTE.length],
      }))
      .sort((a, b) => b.val - a.val);
  }, [basis, portfolioTotal]);

  const top3Weight = useMemo(() => {
    return sortedHoldings.slice(0, 3).reduce((sum, h) => sum + h.weight, 0);
  }, [sortedHoldings]);

  const isConcentrated = top3Weight > 60;

  if (isLoading) {
    return (
      <div
        className="h-full p-5 rounded-2xl border flex flex-col justify-between animate-pulse bg-surface shadow-xs"
        style={{ borderColor: 'rgb(var(--border))' }}
      >
        <div className="flex justify-between items-center mb-4">
          <div className="h-4 w-36 bg-muted/20 rounded" />
          <div className="h-6 w-24 bg-muted/20 rounded-xl" />
        </div>
        <div className="space-y-3 flex-1">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 bg-muted/20 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className="h-full p-5 rounded-2xl border flex flex-col justify-between transition-all bg-surface shadow-xs"
      style={{ borderColor: 'rgb(var(--border))' }}
    >
      <div>
        {/* Header with Switcher */}
        <div className="flex items-center justify-between mb-4 gap-2">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-brand" />
            <h2 className="text-sm font-bold tracking-tight text-foreground">
              Exposure Breakdown
            </h2>
          </div>

          <div
            className="flex shrink-0 items-center gap-0.5 p-0.5 rounded-xl border bg-surface-raised/70"
            style={{ borderColor: 'rgb(var(--border))' }}
          >
            <button
              type="button"
              onClick={() => setViewTab('holdings')}
              className={`whitespace-nowrap px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                viewTab === 'holdings'
                  ? 'bg-brand text-foreground dark:text-white shadow-xs'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              Top Holdings
            </button>
            <button
              type="button"
              onClick={() => setViewTab('sectors')}
              className={`whitespace-nowrap px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                viewTab === 'sectors'
                  ? 'bg-brand text-foreground dark:text-white shadow-xs'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              Sectors
            </button>
          </div>
        </div>

        {/* Content Area */}
        {sortedHoldings.length === 0 ? (
          <div className="py-12 text-center text-xs text-muted">
            <Layers className="w-8 h-8 opacity-40 mx-auto mb-2 text-muted" />
            <p className="font-semibold text-foreground">No exposure data</p>
            <p className="text-[11px] text-muted mt-0.5">
              Add holdings to visualize asset and sector weighting.
            </p>
          </div>
        ) : viewTab === 'holdings' ? (
          <div className="space-y-2.5">
            {sortedHoldings.slice(0, 4).map((h) => (
              <div
                key={h.id || h.symbol}
                className="p-2.5 rounded-xl border border-border/60 bg-surface-raised/40 hover:bg-surface-raised transition-colors group"
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <CompanyLogo symbol={h.symbol} size="xs" />
                    <span className="text-xs font-bold text-foreground truncate group-hover:text-brand transition-colors">
                      {h.symbol}
                    </span>
                    <span className="text-[10px] text-muted truncate max-w-[110px]">
                      {h.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-extrabold text-foreground tabular-nums">
                      {formatCurrency(h.val)}
                    </span>
                    <span className="text-[11px] font-bold text-brand tabular-nums w-11 text-right">
                      {h.weight.toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Meter Bar */}
                <div className="w-full h-1.5 rounded-full bg-surface-raised overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${h.weight}%`,
                      background: 'linear-gradient(90deg, rgb(var(--brand-500)), rgb(var(--brand-400)))',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2.5">
            {sectorList.slice(0, 4).map((s) => (
              <div
                key={s.name}
                className="p-2.5 rounded-xl border border-border/60 bg-surface-raised/40 hover:bg-surface-raised transition-colors"
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: s.color }}
                    />
                    <span className="text-xs font-bold text-foreground truncate">
                      {s.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-extrabold text-foreground tabular-nums">
                      {formatCurrency(s.val)}
                    </span>
                    <span
                      className="text-[11px] font-bold tabular-nums w-11 text-right"
                      style={{ color: s.color }}
                    >
                      {s.weight.toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Meter Bar */}
                <div className="w-full h-1.5 rounded-full bg-surface-raised overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${s.weight}%`,
                      backgroundColor: s.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Concentration Callout */}
      {sortedHoldings.length > 0 && (
        <div className="pt-3 mt-3 border-t flex items-center justify-between text-xs" style={{ borderColor: 'rgb(var(--border))' }}>
          <div className="flex items-center gap-1.5 text-muted">
            {isConcentrated ? (
              <>
                <ShieldAlert className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span className="text-[11px]">
                  Top 3: <strong className="text-foreground">{top3Weight.toFixed(0)}%</strong> · {basis.label}
                </span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span className="text-[11px]">
                  Top 3: <strong className="text-foreground">{top3Weight.toFixed(0)}%</strong> · {basis.label}
                </span>
              </>
            )}
          </div>

          <Link
            href="/analysis"
            className="text-[11px] font-semibold text-brand hover:underline flex items-center gap-0.5 group"
          >
            <span>Detailed X-Ray</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      )}
    </div>
  );
}
