'use client';

// ============================================================
// FINOVA — Alternatives & Fixed-Income X-Ray Section (Prompt 19)
// components/analysis/AlternativesXRaySection.tsx
//
// Dedicated Investment X-Ray section for REITs, InvITs & Bonds:
// - Combined portfolio weight & trust breakdown
// - Bond issuer concentration & credit-rating distribution
// - Maturity profile / maturity ladder (<3Y, 3-7Y, >7Y)
// - Honest liquidity & unpriced warnings
// ============================================================

import React from 'react';
import Link from 'next/link';
import {
  Building2,
  Link2,
  AlertTriangle,
  ArrowRight,
  Layers,
} from 'lucide-react';
import { formatIndianCurrency } from '@/lib/utils';
import type { UnifiedXRayAnalysis } from '@/lib/calculations/xray';

interface Props {
  data: UnifiedXRayAnalysis;
}

export function AlternativesXRaySection({ data }: Props) {
  const alts = data.alternatives_breakdown;
  if (!alts || !alts.has_alternatives) return null;

  const { reits_invits, bonds } = alts;

  return (
    <div className="card p-5 sm:p-6 space-y-6 border border-border bg-surface/80 rounded-2xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Layers className="w-4 h-4" />
            </span>
            <h2 className="text-base font-bold text-foreground">
              Alternative Assets &amp; Fixed-Income X-Ray
            </h2>
          </div>
          <p className="text-xs text-muted mt-1">
            Dedicated portfolio intelligence for non-equity assets: commercial trusts, infrastructure cash flows,
            and bond credit/maturity ladder.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            {alts.alternatives_percentage_of_valued.toFixed(1)}% of Valued Portfolio
          </span>
        </div>
      </div>

      {/* ─── REIT & INVIT SUB-SECTION ──── */}
      {reits_invits.trusts_count > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-pink-700 dark:text-pink-400" />
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                Listed Trust Exposure (REITs &amp; InvITs)
              </h3>
            </div>
            <span className="text-xs font-mono font-bold text-pink-700 dark:text-pink-400">
              Combined Weight: {reits_invits.combined_weight_pct.toFixed(1)}%
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {reits_invits.trusts.map((t) => (
              <div
                key={t.symbol}
                className="p-4 rounded-xl border border-border/80 bg-surface/50 hover:bg-surface transition-colors space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-pink-700 dark:text-pink-400">{t.symbol}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-muted/20 text-muted uppercase">
                        {t.asset_class}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-foreground mt-0.5">{t.name}</div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs font-bold font-mono text-brand-500">
                      {t.percentage_of_valued.toFixed(1)}% weight
                    </div>
                    <div className="text-[11px] text-muted font-mono">
                      {t.current_value !== null
                        ? formatIndianCurrency(t.current_value)
                        : formatIndianCurrency(t.invested_value)}
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-muted leading-relaxed">{t.distribution_info}</p>

                <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[11px]">
                  <span className="text-muted">
                    Status: {t.is_quoted ? 'Active Quote' : 'Unquoted / Cost Valuation'}
                  </span>
                  <Link
                    href={`/${t.asset_class}`}
                    className="text-pink-700 dark:text-pink-400 hover:text-pink-700 dark:hover:text-pink-300 font-semibold inline-flex items-center gap-1"
                  >
                    <span>Research in {t.asset_class.toUpperCase()} Hub</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── BONDS & FIXED INCOME SUB-SECTION ──── */}
      {bonds.positions_count > 0 && (
        <div className="space-y-4 pt-3 border-t border-border/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link2 className="w-4 h-4 text-indigo-400" />
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                Fixed-Income &amp; Bond Portfolio Analysis
              </h3>
            </div>
            <span className="text-xs font-mono font-bold text-indigo-400">
              Weight: {bonds.bond_portfolio_weight_pct.toFixed(1)}%
            </span>
          </div>

          {/* Pricing & Liquidity Warning if any */}
          {bonds.pricing_liquidity_warning && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{bonds.pricing_liquidity_warning}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* 1. Issuer Concentration */}
            <div className="p-4 rounded-xl border border-border/80 bg-surface/40 space-y-2">
              <span className="text-[11px] text-muted font-semibold">Issuer Concentration</span>
              <div className="space-y-2">
                {bonds.issuer_concentration.map((iss) => (
                  <div key={iss.issuer} className="text-xs">
                    <div className="flex justify-between font-medium text-foreground">
                      <span className="truncate pr-2">{iss.issuer}</span>
                      <span className="font-mono text-indigo-400">{iss.percentage_of_valued.toFixed(1)}%</span>
                    </div>
                    <div className="text-[10px] text-muted font-mono">
                      {iss.current_value !== null
                        ? formatIndianCurrency(iss.current_value)
                        : formatIndianCurrency(iss.invested_value)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Credit Rating Distribution */}
            <div className="p-4 rounded-xl border border-border/80 bg-surface/40 space-y-2">
              <span className="text-[11px] text-muted font-semibold">Credit Rating Mix</span>
              <div className="space-y-2">
                {bonds.credit_rating_distribution.map((r) => (
                  <div key={r.rating_tier} className="text-xs">
                    <div className="flex justify-between font-medium text-foreground">
                      <span className="truncate pr-2">{r.rating_tier}</span>
                      <span className="font-mono text-emerald-700 dark:text-emerald-400 font-bold">
                        {r.percentage_of_valued.toFixed(1)}%
                      </span>
                    </div>
                    <div className="text-[10px] text-muted font-mono">
                      {r.current_value !== null
                        ? formatIndianCurrency(r.current_value)
                        : formatIndianCurrency(r.invested_value)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Maturity Profile / Maturity Ladder */}
            <div className="p-4 rounded-xl border border-border/80 bg-surface/40 space-y-2">
              <span className="text-[11px] text-muted font-semibold">Maturity Profile / Ladder</span>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted">&lt; 3 Years (Low Duration)</span>
                  <span className="font-mono font-bold text-foreground">
                    {bonds.maturity_ladder.under_3_years.percentage.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">3 – 7 Years (Medium Duration)</span>
                  <span className="font-mono font-bold text-foreground">
                    {bonds.maturity_ladder.three_to_seven_years.percentage.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">&gt; 7 Years (High Duration)</span>
                  <span className="font-mono font-bold text-foreground">
                    {bonds.maturity_ladder.over_seven_years.percentage.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <Link
              href="/bonds"
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold inline-flex items-center gap-1.5"
            >
              <span>Explore Bond Screener &amp; Cash Flow Schedules</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
