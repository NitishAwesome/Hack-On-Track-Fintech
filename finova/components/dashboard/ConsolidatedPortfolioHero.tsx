'use client';

// ============================================================
// FINOVA — Consolidated Multi-Broker Portfolio Hero (Section 7.B)
// components/dashboard/ConsolidatedPortfolioHero.tsx
//
// Core North Star: "All Your Investments, In One Place"
// Visually illustrates the multi-broker aggregation flow:
// [Zerodha] + [Groww] + [Angel One] + [Manual] ---> ONE FINOVA PORTFOLIO
// ============================================================

import React from 'react';
import Link from 'next/link';
import {
  Building2,
  ArrowRight,
  ShieldCheck,
  Layers,
  Plus,
  Wallet,
  Sparkles,
} from 'lucide-react';
import type { BrokerAccountRow } from '@/types/database';
import { formatCurrency } from '@/lib/utils';

interface ConsolidatedPortfolioHeroProps {
  brokers: BrokerAccountRow[];
  totalHoldingCount: number;
  totalCurrentValue: number | null;
  totalInvestedValue: number;
}

const BROKER_BRAND_COLORS: Record<string, string> = {
  ZERODHA: '#387ED1',
  GROWW: '#00D09C',
  ANGEL_ONE: '#EB1C24',
  ICICI_DIRECT: '#F37021',
  UPSTOX: '#5B2D90',
  OTHER: '#6B7280',
};

export function ConsolidatedPortfolioHero({
  brokers,
  totalHoldingCount,
  totalCurrentValue,
  totalInvestedValue,
}: ConsolidatedPortfolioHeroProps) {
  return (
    <div
      className="p-5 sm:p-6 rounded-2xl border transition-all duration-200 relative overflow-hidden"
      style={{
        backgroundColor: 'rgb(var(--surface))',
        borderColor: 'rgb(var(--border))',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      {/* Background subtle gradient */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-brand/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
        {/* Left: Product Story Headline */}
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-brand/10 text-brand border border-brand/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Problem Statement PS2 Fulfillment</span>
          </div>

          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
            All Your Investments Across Brokers. Unified in One Place.
          </h2>

          <p className="text-xs sm:text-sm text-muted leading-relaxed">
            Retail portfolios are traditionally trapped in individual broker silos. FINOVA breaks down depository silos, linking holdings from Zerodha, Groww, Angel One, and manual portfolios into a single reconciled ledger.
          </p>
        </div>

        {/* Right: Quick Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5 flex-shrink-0">
          <Link
            href="/brokers"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-surface-raised border border-border text-foreground hover:bg-surface transition-colors"
          >
            <Building2 className="w-3.5 h-3.5 text-brand" />
            <span>Manage Brokers ({brokers.length})</span>
          </Link>

          <Link
            href="/analysis"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-foreground dark:text-white shadow-sm transition-all hover:opacity-95"
            style={{
              background: 'linear-gradient(135deg, rgb(var(--brand-600)), rgb(var(--brand-400)))',
            }}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Open Investment X-Ray</span>
            <ArrowRight className="w-3 h-3 ml-0.5" />
          </Link>
        </div>
      </div>

      {/* Visual Flow: Multiple Broker Containers -> Single Ledger */}
      <div className="mt-5 pt-4 border-t border-border/60">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Active Broker Pills */}
          <div className="md:col-span-7 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted mr-1">
              Active Containers:
            </span>

            {brokers.length > 0 ? (
              brokers.map((broker) => {
                const color =
                  BROKER_BRAND_COLORS[broker.broker_code?.toUpperCase()] ||
                  broker.color_hex ||
                  '#3B82F6';
                return (
                  <div
                    key={broker.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border bg-surface-raised text-xs font-semibold text-foreground"
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <span>{broker.broker_name}</span>
                    <span className="text-[10px] text-muted font-mono capitalize">
                      ({broker.account_type})
                    </span>
                  </div>
                );
              })
            ) : (
              <span className="text-xs text-muted">No brokers connected yet</span>
            )}

            <Link
              href="/brokers"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-dashed border-border text-xs font-medium text-brand hover:border-brand transition-colors"
            >
              <Plus className="w-3 h-3" />
              <span>Add Broker</span>
            </Link>
          </div>

          {/* Aggregation Stats Highlight */}
          <div className="md:col-span-5 flex items-center justify-start md:justify-end gap-4 text-xs">
            <div className="text-left md:text-right">
              <p className="text-[10px] uppercase font-bold text-muted">Total Positions</p>
              <p className="font-bold text-foreground tabular-nums text-sm">
                {totalHoldingCount} holdings
              </p>
            </div>

            <div className="h-7 w-px bg-border" />

            <div className="text-left md:text-right">
              <p className="text-[10px] uppercase font-bold text-muted">Consolidated Capital</p>
              <p className="font-bold text-brand tabular-nums text-sm">
                {formatCurrency(totalInvestedValue)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
