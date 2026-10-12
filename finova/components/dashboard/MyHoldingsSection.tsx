'use client';

import React from 'react';
import Link from 'next/link';
import { Briefcase, ArrowRight, TrendingUp, TrendingDown, ExternalLink } from 'lucide-react';
import { CompanyLogo } from '@/components/shared/CompanyLogo';
import { formatCurrency, formatStockPrice } from '@/lib/utils';
import type { HoldingWithMetrics } from '@/types/portfolio';

interface MyHoldingsSectionProps {
  holdings: HoldingWithMetrics[];
  totalValue: number | null;
  isLoading?: boolean;
}

export function MyHoldingsSection({
  holdings,
  totalValue,
  isLoading,
}: MyHoldingsSectionProps) {
  const portfolioTotal = totalValue != null && totalValue > 0
    ? totalValue
    : holdings.reduce((sum, h) => sum + (h.current_value ?? h.invested_value ?? 0), 0);

  const topHoldings = [...holdings]
    .sort((a, b) => {
      const valA = a.current_value ?? a.invested_value ?? 0;
      const valB = b.current_value ?? b.invested_value ?? 0;
      return valB - valA;
    })
    .slice(0, 6);

  return (
    <div
      className="p-5 sm:p-6 rounded-2xl border transition-all duration-200 bg-surface shadow-xs"
      style={{ borderColor: 'rgb(var(--border))' }}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-brand" />
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
              My Holdings
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-surface-raised text-muted border border-border">
              {holdings.length} {holdings.length === 1 ? 'Position' : 'Positions'}
            </span>
          </div>
          <p className="text-xs text-muted mt-0.5">
            Your key investment positions consolidated across Zerodha, Groww and connected brokers.
          </p>
        </div>

        <Link
          href="/holdings"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-border bg-surface-raised hover:bg-surface text-foreground transition-all shadow-xs self-start sm:self-auto group"
        >
          <span>View All Investments</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {/* Table Container */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-12 bg-surface-raised/50 border border-border/60 rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : topHoldings.length === 0 ? (
        <div className="py-12 text-center text-xs text-muted flex flex-col items-center justify-center space-y-2">
          <Briefcase className="w-8 h-8 opacity-40 text-muted" />
          <p className="font-semibold text-foreground">No holdings recorded yet</p>
          <p className="text-[11px] text-muted max-w-sm">
            Import your broker portfolio or manually record investments to see real-time valuations.
          </p>
          <Link
            href="/holdings"
            className="mt-2 px-3.5 py-1.5 rounded-xl bg-brand text-white text-xs font-semibold shadow-xs hover:opacity-90 transition-opacity"
          >
            + Add First Investment
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border text-muted font-semibold">
                <th className="pb-3 font-medium">Asset &amp; Company</th>
                <th className="pb-3 font-medium text-right">Quantity</th>
                <th className="pb-3 font-medium text-right">Latest Price</th>
                <th className="pb-3 font-medium text-right hidden sm:table-cell">Weight</th>
                <th className="pb-3 font-medium text-right">Total P&amp;L</th>
                <th className="pb-3 font-medium text-right hidden md:table-cell">1D Movement</th>
                <th className="pb-3 font-medium text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {topHoldings.map((h) => {
                const currentVal = h.current_value ?? h.invested_value ?? 0;
                const weight = portfolioTotal > 0 ? (currentVal / portfolioTotal) * 100 : 0;
                const pnl = h.absolute_return ?? 0;
                const pnlPct = h.absolute_return_pct ?? 0;
                const isPnlPositive = pnl >= 0;

                const dayChangePct = h.day_change_pct;
                const hasDayChange = dayChangePct !== null && typeof dayChangePct === 'number';
                const isDayPositive = hasDayChange && dayChangePct >= 0;

                return (
                  <tr
                    key={h.id || h.symbol}
                    className="hover:bg-surface-raised/60 transition-colors group"
                  >
                    {/* Asset & Company */}
                    <td className="py-3 pr-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <CompanyLogo symbol={h.symbol} size="sm" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-foreground truncate max-w-[140px] sm:max-w-[180px] group-hover:text-brand transition-colors">
                              {h.symbol}
                            </span>
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-surface-raised text-muted border border-border uppercase">
                              {h.asset_class}
                            </span>
                          </div>
                          <span className="text-[11px] text-muted truncate block max-w-[160px] sm:max-w-[220px]">
                            {h.name}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Quantity */}
                    <td className="py-3 text-right font-financial font-semibold text-foreground tabular-nums">
                      {h.quantity}
                    </td>

                    {/* Latest Price */}
                    <td className="py-3 text-right tabular-nums">
                      <div className="font-financial font-extrabold text-foreground">
                        {formatStockPrice(h.current_price ?? h.avg_buy_price)}
                      </div>
                      <div className="text-[10px] text-muted font-financial">
                        Avg: {formatStockPrice(h.avg_buy_price)}
                      </div>
                    </td>

                    {/* Weight */}
                    <td className="py-3 text-right hidden sm:table-cell tabular-nums">
                      <div className="flex items-center justify-end gap-1.5">
                        <div className="w-12 h-1 rounded-full bg-surface-raised overflow-hidden">
                          <div
                            className="h-full rounded-full bg-brand"
                            style={{ width: `${Math.max(weight, 3)}%` }}
                          />
                        </div>
                        <span className="font-financial font-bold text-foreground">
                          {weight.toFixed(1)}%
                        </span>
                      </div>
                    </td>

                    {/* P&L */}
                    <td className="py-3 text-right tabular-nums">
                      <div
                        className={`font-financial font-bold ${
                          isPnlPositive ? 'text-gain' : 'text-loss'
                        }`}
                      >
                        {isPnlPositive ? '+' : ''}
                        {formatCurrency(pnl)}
                      </div>
                      <div
                        className={`text-[10px] font-financial font-semibold ${
                          isPnlPositive ? 'text-gain' : 'text-loss'
                        }`}
                      >
                        {isPnlPositive ? '+' : ''}
                        {pnlPct.toFixed(2)}%
                      </div>
                    </td>

                    {/* 1D Movement */}
                    <td className="py-3 text-right hidden md:table-cell tabular-nums">
                      {hasDayChange ? (
                        <span
                          className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[11px] font-bold ${
                            isDayPositive
                              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                          }`}
                        >
                          {isDayPositive ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : (
                            <TrendingDown className="w-3 h-3" />
                          )}
                          <span>
                            {isDayPositive ? '+' : ''}
                            {dayChangePct.toFixed(2)}%
                          </span>
                        </span>
                      ) : (
                        <span className="text-muted text-[11px]">—</span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="py-3 text-center">
                      <Link
                        href={`/explore/stocks/${encodeURIComponent(h.symbol.toUpperCase())}`}
                        className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-surface-raised inline-flex items-center justify-center transition-colors"
                        title={`Research ${h.symbol}`}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
