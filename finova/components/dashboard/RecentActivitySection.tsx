'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Clock } from 'lucide-react';
import type { InvestmentTransactionRow } from '@/types/database';
import { formatCurrency, formatStockPrice } from '@/lib/utils';
import { CompanyLogo } from '@/components/shared/CompanyLogo';

interface RecentActivitySectionProps {
  transactions: InvestmentTransactionRow[];
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export function RecentActivitySection({
  transactions,
  isLoading,
  error,
  onRetry,
}: RecentActivitySectionProps) {
  if (isLoading) {
    return (
      <div
        className="p-5 sm:p-6 rounded-2xl border flex flex-col justify-between h-[360px] animate-pulse bg-surface"
        style={{ borderColor: 'rgb(var(--border))' }}
      >
        <div className="h-4 w-32 bg-muted/20 rounded" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 bg-muted/20 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="p-5 sm:p-6 rounded-2xl border flex flex-col items-center justify-center text-center space-y-3 bg-surface"
        style={{ borderColor: 'rgb(var(--border))' }}
      >
        <p className="text-xs font-semibold text-rose-500">{error}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-3 py-1.5 rounded-lg border border-border text-xs font-semibold hover:bg-surface-raised transition-colors"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className="h-full p-5 sm:p-6 rounded-2xl border flex flex-col transition-all duration-200 bg-surface shadow-xs"
      style={{
        borderColor: 'rgb(var(--border))',
      }}
    >
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-brand" />
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
              Recent Activity
            </h2>
          </div>
          <Link
            href="/transactions"
            className="text-xs font-semibold text-brand hover:underline flex items-center gap-1 group"
          >
            <span>View All</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* Content Table */}
        {transactions.length === 0 ? (
          <div className="py-12 text-center text-xs text-muted flex flex-col items-center justify-center space-y-2">
            <Clock className="w-8 h-8 opacity-40 text-muted" />
            <p className="font-semibold text-foreground">No recent transaction records</p>
            <p className="text-[11px] text-muted max-w-sm">
              Your trade executions and corporate actions will appear here once recorded.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <Link
                href="/transactions"
                className="px-3 py-1.5 rounded-lg border border-border text-xs font-semibold hover:bg-surface-raised transition-colors"
              >
                Record Trade
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border text-muted font-semibold">
                  <th className="pb-2.5 font-medium">Date</th>
                  <th className="pb-2.5 font-medium">Type</th>
                  <th className="pb-2.5 font-medium">Asset</th>
                  <th className="pb-2.5 font-medium text-right">Quantity</th>
                  <th className="pb-2.5 font-medium text-right">Price</th>
                  <th className="pb-2.5 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {transactions.slice(0, 5).map((tx) => {
                  const typeUpper = (tx.transaction_type || 'BUY').toUpperCase();
                  const isBuy = typeUpper === 'BUY';
                  const isSell = typeUpper === 'SELL';
                  const dateStr = tx.transaction_date
                    ? new Date(tx.transaction_date).toLocaleDateString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : '—';

                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-surface-raised/60 transition-colors group"
                    >
                      {/* Date */}
                      <td className="py-2.5 text-muted font-mono whitespace-nowrap">
                        {dateStr}
                      </td>

                      {/* Type Badge */}
                      <td className="py-2.5 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-md font-bold text-[10px] tracking-wide uppercase ${
                            isBuy
                              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                              : isSell
                              ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                              : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          }`}
                        >
                          {typeUpper}
                        </span>
                      </td>

                      {/* Asset with Logo */}
                      <td className="py-2.5 pr-2">
                        {(() => {
                          const txAny = tx as unknown as { symbol?: string; price?: number; instrument?: { symbol?: string } };
                          const symbol = txAny.symbol || txAny.instrument?.symbol || 'EQUITY';
                          return (
                            <div className="flex items-center gap-2">
                              <CompanyLogo symbol={symbol} size="xs" />
                              <div className="min-w-0">
                                <span className="font-bold text-foreground truncate block max-w-[130px]">
                                  {symbol}
                                </span>
                              </div>
                            </div>
                          );
                        })()}
                      </td>

                      {/* Quantity */}
                      <td className="py-2.5 text-right font-financial font-semibold text-foreground tabular-nums">
                        {tx.quantity}
                      </td>

                      {/* Price */}
                      <td className="py-2.5 text-right font-financial text-muted tabular-nums">
                        {formatStockPrice(tx.unit_price ?? (tx as unknown as { price?: number }).price ?? 0)}
                      </td>

                      {/* Amount */}
                      <td className="py-2.5 text-right font-financial font-bold text-foreground tabular-nums">
                        {formatCurrency(tx.net_amount ?? (tx.quantity * (tx.unit_price ?? (tx as unknown as { price?: number }).price ?? 0)))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
