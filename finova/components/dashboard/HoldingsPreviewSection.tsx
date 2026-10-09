'use client';

import React from 'react';
import Link from 'next/link';
import { Layers, Plus, Upload, ArrowUpRight, ArrowDownRight, AlertCircle } from 'lucide-react';
import type { HoldingWithMetrics } from '@/types/portfolio';
import { formatCurrency, formatPercentSafe } from '@/lib/utils';

interface HoldingsPreviewSectionProps {
  holdings: HoldingWithMetrics[];
  totalCount: number;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

const ASSET_CLASS_LABELS: Record<string, string> = {
  equity: 'Stock',
  mf: 'Mutual Fund',
  reit: 'REIT',
  invit: 'InvIT',
  bond: 'Bond',
  sgb: 'SGB',
  other: 'Asset',
};

export function HoldingsPreviewSection({
  holdings,
  totalCount,
  isLoading,
  error,
  onRetry,
}: HoldingsPreviewSectionProps) {
  if (isLoading) {
    return (
      <div
        className="p-6 sm:p-7 rounded-2xl border flex flex-col justify-between h-[380px] animate-pulse"
        style={{
          backgroundColor: 'rgb(var(--surface))',
          borderColor: 'rgb(var(--border))',
        }}
      >
        <div className="flex justify-between items-center mb-6">
          <div className="h-4 w-32 bg-slate-700/30 rounded" />
          <div className="h-4 w-20 bg-slate-700/20 rounded" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 w-full bg-slate-800/10 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="p-6 sm:p-7 rounded-2xl border flex flex-col items-center justify-center text-center h-[380px]"
        style={{
          backgroundColor: 'rgb(var(--surface))',
          borderColor: 'rgb(var(--border))',
        }}
      >
        <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3 bg-red-500/10 text-red-500">
          <AlertCircle className="w-5 h-5" />
        </div>
        <h3 className="text-sm font-semibold mb-1" style={{ color: 'rgb(var(--foreground))' }}>
          Unable to Load Holdings
        </h3>
        <p className="text-xs text-muted max-w-sm mb-4">{error}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg border hover:bg-surface-raised transition-colors"
            style={{ borderColor: 'rgb(var(--border))', color: 'rgb(var(--foreground))' }}
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  const previewHoldings = holdings.slice(0, 5);

  return (
    <div
      className="p-6 sm:p-7 rounded-2xl border flex flex-col justify-between transition-all duration-200"
      style={{
        backgroundColor: 'rgb(var(--surface))',
        borderColor: 'rgb(var(--border))',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2
              className="text-base sm:text-lg font-bold tracking-tight"
              style={{ color: 'rgb(var(--foreground))' }}
            >
              Holdings Preview
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Top portfolio positions across your demat accounts
            </p>
          </div>
          <Link
            href="/holdings"
            className="text-xs font-semibold hover:underline"
            style={{ color: 'rgb(var(--brand-500))' }}
          >
            View All ({totalCount}) →
          </Link>
        </div>

        {/* Content */}
        {previewHoldings.length > 0 ? (
          <div className="overflow-x-auto -mx-2 sm:mx-0">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr
                  className="border-b text-[10px] uppercase font-bold tracking-wider"
                  style={{
                    borderColor: 'rgb(var(--border))',
                    color: 'rgb(var(--muted))',
                  }}
                >
                  <th className="py-2.5 px-3">Asset</th>
                  <th className="py-2.5 px-3 text-right">Quantity</th>
                  <th className="py-2.5 px-3 text-right">Avg Price</th>
                  <th className="py-2.5 px-3 text-right">Current Price</th>
                  <th className="py-2.5 px-3 text-right">Current Value</th>
                  <th className="py-2.5 px-3 text-right">P&L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {previewHoldings.map((h) => {
                  const hasPrice = h.current_price !== null && !isNaN(h.current_price);
                  const isPositive = (h.absolute_return ?? 0) >= 0;

                  return (
                    <tr
                      key={h.id}
                      className="hover:bg-surface-raised/50 transition-colors duration-100"
                    >
                      {/* Asset & Symbol */}
                      <td className="py-3 px-3">
                        <div className="font-semibold" style={{ color: 'rgb(var(--foreground))' }}>
                          {h.symbol}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[11px] text-muted truncate max-w-[130px] sm:max-w-[180px]">
                            {h.name}
                          </span>
                          <span
                            className="text-[9px] font-semibold px-1 py-0.2 rounded uppercase"
                            style={{
                              backgroundColor: 'rgb(var(--surface-raised))',
                              color: 'rgb(var(--muted))',
                            }}
                          >
                            {ASSET_CLASS_LABELS[h.asset_class] || h.asset_class}
                          </span>
                        </div>
                      </td>

                      {/* Quantity */}
                      <td
                        className="py-3 px-3 text-right font-medium tabular-nums"
                        style={{ color: 'rgb(var(--foreground))' }}
                      >
                        {h.quantity}
                      </td>

                      {/* Avg Purchase Price */}
                      <td className="py-3 px-3 text-right font-medium text-muted tabular-nums">
                        {formatCurrency(h.avg_buy_price)}
                      </td>

                      {/* Current Price */}
                      <td className="py-3 px-3 text-right tabular-nums">
                        {hasPrice ? (
                          <span className="font-semibold" style={{ color: 'rgb(var(--foreground))' }}>
                            {formatCurrency(h.current_price!)}
                          </span>
                        ) : (
                          <span className="text-[10px] text-amber-500 font-medium italic">
                            Price unavailable
                          </span>
                        )}
                      </td>

                      {/* Current Value */}
                      <td className="py-3 px-3 text-right font-semibold tabular-nums" style={{ color: 'rgb(var(--foreground))' }}>
                        {hasPrice ? (
                          formatCurrency(h.current_value)
                        ) : (
                          <span className="text-muted font-normal text-[11px]" title="Valued at purchase cost">
                            {formatCurrency(h.invested_value)}*
                          </span>
                        )}
                      </td>

                      {/* P&L */}
                      <td className="py-3 px-3 text-right tabular-nums">
                        {h.absolute_return !== null ? (
                          <div
                            className={`inline-flex items-center gap-0.5 font-bold ${
                              isPositive ? 'text-gain' : 'text-loss'
                            }`}
                          >
                            {isPositive ? (
                              <ArrowUpRight className="w-3 h-3" />
                            ) : (
                              <ArrowDownRight className="w-3 h-3" />
                            )}
                            <span>{formatCurrency(Math.abs(h.absolute_return))}</span>
                            <span className="text-[10px] font-normal opacity-70 ml-1">
                              ({formatPercentSafe(h.absolute_return_pct)})
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-muted font-medium italic">
                            P&L unavailable
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div
            className="flex flex-col items-center justify-center text-center p-8 rounded-xl border border-dashed my-2"
            style={{
              borderColor: 'rgb(var(--border))',
              backgroundColor: 'rgba(var(--surface-raised) / 0.4)',
            }}
          >
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center mb-3 shadow-sm"
              style={{
                backgroundColor: 'rgba(14, 165, 233, 0.1)',
                color: '#0EA5E9',
              }}
            >
              <Layers className="w-5 h-5" />
            </div>
            <h3
              className="text-sm font-bold mb-1"
              style={{ color: 'rgb(var(--foreground))' }}
            >
              No Holdings Tracked Yet
            </h3>
            <p className="text-xs text-muted max-w-sm mb-4 leading-relaxed">
              Add your manual investment positions or import your portfolio from CSV to begin tracking
              your unified assets.
            </p>
            <div className="flex items-center gap-2.5">
              <Link
                href="/holdings"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white shadow-sm"
                style={{
                  background: 'linear-gradient(135deg, rgb(var(--brand-600)), rgb(var(--brand-400)))',
                }}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Investment</span>
              </Link>
              <Link
                href="/holdings"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border hover:bg-surface-raised transition-colors"
                style={{ borderColor: 'rgb(var(--border))', color: 'rgb(var(--foreground))' }}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Import CSV</span>
              </Link>
            </div>
          </div>
        )}
      </div>

      {previewHoldings.length > 0 && (
        <div
          className="pt-3 border-t flex items-center justify-between text-xs mt-3"
          style={{ borderColor: 'rgb(var(--border) / 0.6)' }}
        >
          <span className="text-muted">
            Displaying {previewHoldings.length} of {totalCount} holdings
          </span>
          <Link
            href="/holdings"
            className="font-medium hover:underline"
            style={{ color: 'rgb(var(--brand-500))' }}
          >
            Manage All Holdings →
          </Link>
        </div>
      )}
    </div>
  );
}
