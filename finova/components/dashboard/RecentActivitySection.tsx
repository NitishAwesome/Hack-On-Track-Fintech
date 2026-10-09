'use client';

import React from 'react';
import Link from 'next/link';
import { Clock, AlertCircle, ArrowUpRight, ArrowDownRight, Layers } from 'lucide-react';
import type { InvestmentTransactionRow } from '@/types/database';
import { formatCurrency } from '@/lib/utils';

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
        className="p-6 sm:p-7 rounded-2xl border flex flex-col justify-between h-[300px] animate-pulse"
        style={{
          backgroundColor: 'rgb(var(--surface))',
          borderColor: 'rgb(var(--border))',
        }}
      >
        <div className="h-4 w-36 bg-slate-700/30 rounded mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 bg-slate-800/10 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="p-6 sm:p-7 rounded-2xl border flex flex-col items-center justify-center text-center h-[300px]"
        style={{
          backgroundColor: 'rgb(var(--surface))',
          borderColor: 'rgb(var(--border))',
        }}
      >
        <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3 bg-red-500/10 text-red-500">
          <AlertCircle className="w-5 h-5" />
        </div>
        <h3 className="text-sm font-semibold mb-1" style={{ color: 'rgb(var(--foreground))' }}>
          Unable to Load Activity
        </h3>
        <p className="text-xs text-muted max-w-sm mb-4">{error}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border hover:bg-surface-raised transition-colors"
            style={{ borderColor: 'rgb(var(--border))', color: 'rgb(var(--foreground))' }}
          >
            Retry
          </button>
        )}
      </div>
    );
  }

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
              Recent Activity
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Trade executions and corporate action ledger
            </p>
          </div>
          {transactions.length > 0 && (
            <Link
              href="/holdings"
              className="text-xs font-semibold hover:underline"
              style={{ color: 'rgb(var(--brand-500))' }}
            >
              View Ledger →
            </Link>
          )}
        </div>

        {/* Content */}
        {transactions.length > 0 ? (
          <div className="divide-y divide-border/40 my-1">
            {transactions.slice(0, 5).map((tx) => {
              const isBuy = tx.transaction_type === 'BUY';
              return (
                <div
                  key={tx.id}
                  className="py-2.5 flex items-center justify-between text-xs hover:bg-surface-raised/40 px-2 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-[10px] ${
                        isBuy ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                      }`}
                    >
                      {isBuy ? <ArrowDownRight className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                    </div>
                    <div>
                      <div className="font-semibold" style={{ color: 'rgb(var(--foreground))' }}>
                        {tx.transaction_type} {tx.quantity} units
                      </div>
                      <div className="text-[11px] text-muted">
                        {new Date(tx.transaction_date).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-semibold tabular-nums" style={{ color: 'rgb(var(--foreground))' }}>
                      {formatCurrency(tx.net_amount)}
                    </div>
                    <div className="text-[10px] text-muted">
                      @ {formatCurrency(tx.unit_price)}
                    </div>
                  </div>
                </div>
              );
            })}
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
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                color: '#F59E0B',
              }}
            >
              <Clock className="w-5 h-5" />
            </div>
            <h3
              className="text-sm font-bold mb-1"
              style={{ color: 'rgb(var(--foreground))' }}
            >
              No Transaction Ledger Records Yet
            </h3>
            <p className="text-xs text-muted max-w-sm mb-4 leading-relaxed">
              Trade executions, dividends, and corporate action records will be logged here as
              transactions are executed or imported.
            </p>
            <Link
              href="/holdings"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border hover:bg-surface-raised transition-colors"
              style={{ borderColor: 'rgb(var(--border))', color: 'rgb(var(--foreground))' }}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>View Current Holdings</span>
            </Link>
          </div>
        )}
      </div>

      <div
        className="pt-3 border-t flex items-center justify-between text-xs mt-3"
        style={{ borderColor: 'rgb(var(--border) / 0.6)' }}
      >
        <span className="text-[11px] text-muted">
          Realized capital gains remain uncalculated until full buy/sell ledger history is present
        </span>
        <span className="text-[11px] text-muted italic">
          Finova never generates synthetic trades
        </span>
      </div>
    </div>
  );
}
