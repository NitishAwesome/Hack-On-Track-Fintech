'use client';
import { formatResearchNumber, compareResearchNumbers } from '@/lib/research/format';

// ============================================================
// FINOVA — REIT Discovery View (Prompt 19)
// components/alternatives/ReitDiscoveryView.tsx
//
// Dedicated Discovery & Research terminal for Indian REITs:
// Learn -> Discover Real Options -> Compare -> Understand Income & Risk -> Detail
// Zero duplicate 3-tab navigation.
// ============================================================

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Building2,
  Search,
  Scale,
  Shield,
  HelpCircle,
  ChevronRight,
  AlertTriangle,
  Coins,
  CheckCircle2,
  Calculator,
} from 'lucide-react';
import { VERIFIED_INDIAN_REITS, type ReitItem } from '@/lib/data/reitData';
import { ReitDetailModal } from './ReitDetailModal';
import { AlternativeCompareModal, type CompareItem } from './AlternativeCompareModal';
import { useHeldSymbols } from '@/lib/hooks/useHeldSymbols';

export function ReitDiscoveryView() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPropertyType, setSelectedPropertyType] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'yield' | 'mcap' | 'occupancy' | 'name'>('name');
  const [selectedReit, setSelectedReit] = useState<ReitItem | null>(null);
  const [compareSymbols, setCompareSymbols] = useState<string[]>([]);
  const [isCompareOpen, setIsCompareOpen] = useState(false);

  // Example Cash Flow Simulator state
  const [simCapital, setSimCapital] = useState<number>(100000);

  const heldSymbols = useHeldSymbols();

  // Filtered & Sorted REITs
  const filteredReits = useMemo(() => {
    return VERIFIED_INDIAN_REITS.filter((r) => {
      const matchesSearch =
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.keyGeographies.some((g) => g.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesType =
        selectedPropertyType === 'ALL' || r.propertyType === selectedPropertyType;

      return matchesSearch && matchesType;
    }).sort((a, b) => {
      if (sortBy === 'yield') return compareResearchNumbers(a.trailingYieldPct, b.trailingYieldPct) || a.name.localeCompare(b.name);
      if (sortBy === 'mcap') return compareResearchNumbers(a.marketCapCr, b.marketCapCr) || a.name.localeCompare(b.name);
      if (sortBy === 'occupancy') return compareResearchNumbers(a.occupancyPct, b.occupancyPct) || a.name.localeCompare(b.name);
      return a.name.localeCompare(b.name);
    });
  }, [searchQuery, selectedPropertyType, sortBy]);

  // Handle toggling compare
  const toggleCompare = (symbol: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (compareSymbols.includes(symbol)) {
      setCompareSymbols((prev) => prev.filter((s) => s !== symbol));
    } else {
      if (compareSymbols.length >= 4) {
        alert('You can compare a maximum of 4 REITs side-by-side.');
        return;
      }
      setCompareSymbols((prev) => [...prev, symbol]);
    }
  };

  const compareItems: CompareItem[] = useMemo(() => {
    return compareSymbols
      .map((sym) => VERIFIED_INDIAN_REITS.find((r) => r.symbol === sym))
      .filter((r): r is ReitItem => Boolean(r))
      .map((r) => ({ kind: 'reit', data: r }));
  }, [compareSymbols]);

  return (
    <div className="space-y-8">
      {/* ─── Breadcrumb Navigation ──── */}
      <div className="flex items-center gap-2 text-xs text-muted">
        <Link href="/explore/alternatives" className="hover:text-pink-700 dark:hover:text-pink-400 transition-colors">
          Alternative Investments Hub
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-foreground font-semibold">REITs Discovery</span>
      </div>

      {/* ─── Header ──── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-pink-500/10 text-pink-700 dark:text-pink-400 border border-pink-500/20">
              <Building2 className="w-6 h-6" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Explore Listed Indian REITs
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted mt-1 max-w-3xl">
            Co-own Grade-A tech parks, business campuses, and prime malls. Discover verified distribution
            yields, occupancy metrics, lease durations, and commercial tenancy risks.
          </p>
        </div>

        {compareSymbols.length >= 2 && (
          <button
            onClick={() => setIsCompareOpen(true)}
            className="btn-primary text-xs py-2 px-4 flex items-center gap-2 shrink-0 self-start sm:self-auto bg-pink-600 hover:bg-pink-500"
          >
            <Scale className="w-4 h-4" />
            <span>Compare {compareSymbols.length} Selected REITs</span>
          </button>
        )}
      </div>

      {/* ─── SECTION 1: INTERACTIVE EDUCATION (Concise, Not Boring) ──── */}
      <div className="p-5 sm:p-6 rounded-2xl bg-surface border border-border space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-pink-700 dark:text-pink-400" />
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
              REIT Fundamentals in 60 Seconds
            </h2>
          </div>
          <span className="text-[11px] text-muted font-mono">SEBI (REIT) Regulations, 2014</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* What is it */}
          <div className="p-4 rounded-xl bg-surface-raised/30 dark:bg-slate-800/30 border border-border space-y-1.5">
            <div className="text-xs font-bold text-pink-700 dark:text-pink-300 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              <span>What is a REIT?</span>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              A trust that owns commercial real estate (offices and malls). You buy exchange-traded units on
              NSE/BSE like a stock, earning a proportional share of tenant rent without property upkeep.
            </p>
          </div>

          {/* How do I earn */}
          <div className="p-4 rounded-xl bg-surface-raised/30 dark:bg-slate-800/30 border border-border space-y-1.5">
            <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5" />
              <span>How Do You Earn?</span>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              By law, <strong>90% of Net Distributable Cash Flows</strong> must be distributed quarterly as
              interest, dividends, or return of capital, plus potential capital appreciation of unit price.
            </p>
          </div>

          {/* Main risks */}
          <div className="p-4 rounded-xl bg-surface-raised/30 dark:bg-slate-800/30 border border-border space-y-1.5">
            <div className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Main Risks to Watch</span>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              Unit prices fluctuate daily. Rising RBI interest rates can compress REIT valuations, and tenant
              vacancies reduce distributable cash flow. They are not risk-free fixed deposits.
            </p>
          </div>
        </div>

        {/* Interactive Cash Flow Simulator (Clearly Labeled Illustrative) */}
        <div className="p-4 rounded-xl bg-surface-raised/40 dark:bg-slate-800/40 border border-border/60 dark:border-slate-700/60 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-pink-700 dark:text-pink-400" />
              <h3 className="text-xs font-bold text-foreground">
                Illustrative Cash Distribution Simulator
              </h3>
            </div>
            <span className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
              Illustrative Educational Example — Not a Return Guarantee
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1 items-center">
            <div className="space-y-1">
              <label className="text-[11px] text-muted">Hypothetical Investment (₹)</label>
              <input
                type="range"
                min={25000}
                max={500000}
                step={25000}
                value={simCapital}
                onChange={(e) => setSimCapital(Number(e.target.value))}
                className="w-full accent-pink-500 cursor-pointer"
              />
              <div className="text-xs font-mono font-bold text-foreground">
                ₹{simCapital.toLocaleString('en-IN')}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-surface border border-border text-center">
              <span className="text-[10px] text-muted">Hypothetical illustration · assumes 6.2%</span>
              <div className="text-sm font-bold font-mono text-emerald-700 dark:text-emerald-400">
                ~₹{Math.round(simCapital * 0.062).toLocaleString('en-IN')} / yr
              </div>
              <span className="text-[10px] text-muted dark:text-slate-500">~₹{Math.round((simCapital * 0.062) / 4).toLocaleString('en-IN')} / quarter</span>
            </div>

            <p className="text-[11px] text-muted leading-relaxed">
              Actual payout varies every quarter depending on occupancy, tenant lease renewals, interest rates,
              and whether distributions are taxed as interest or exempt dividends.
            </p>
          </div>
        </div>
      </div>

      {/* ─── SECTION 2: SEARCH, FILTERS & CONTROLS ──── */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex flex-1 items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, symbol, city (e.g. Embassy, Bengaluru)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-surface-raised/40 dark:bg-slate-800/40 border border-border text-xs text-foreground placeholder:text-muted dark:placeholder:text-slate-500 focus:outline-none focus:border-pink-500"
            />
          </div>

          {/* Property Type Filter */}
          <select
            value={selectedPropertyType}
            onChange={(e) => setSelectedPropertyType(e.target.value)}
            className="px-3 py-2 rounded-xl bg-surface-raised/40 dark:bg-slate-800/40 border border-border text-xs text-foreground focus:outline-none focus:border-pink-500"
          >
            <option value="ALL">All Properties</option>
            <option value="Office">Office Campuses</option>
            <option value="Retail">Retail Malls</option>
            <option value="Commercial">Commercial</option>
          </select>
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted shrink-0">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'yield' | 'mcap' | 'occupancy' | 'name')}
            className="px-3 py-2 rounded-xl bg-surface-raised/40 dark:bg-slate-800/40 border border-border text-xs text-foreground focus:outline-none focus:border-pink-500"
          >
            <option value="yield">Trailing Distribution Yield</option>
            <option value="mcap">Market Capitalization</option>
            <option value="occupancy">Occupancy %</option>
            <option value="name">Trust Name</option>
          </select>
        </div>
      </div>

      {/* ─── SECTION 3: LISTED REIT CARDS ──── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredReits.map((reit) => {
          const isHeld = heldSymbols.has(reit.symbol.toUpperCase());
          const isSelectedForCompare = compareSymbols.includes(reit.symbol);

          return (
            <motion.div
              key={reit.symbol}
              whileHover={{ y: -2 }}
              transition={{ duration: 0.15 }}
              onClick={() => setSelectedReit(reit)}
              className={`p-5 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                isSelectedForCompare
                  ? 'bg-pink-950/20 border-pink-500/50'
                  : 'bg-surface hover:bg-surface-raised border-border hover:border-brand/40'
              }`}
            >
              {/* Card Top */}
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-pink-700 dark:text-pink-400">{reit.symbol}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-surface-raised dark:bg-slate-800 text-muted">
                        {reit.propertyType}
                      </span>
                      {isHeld && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                          In Portfolio
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-foreground">{reit.name}</h3>
                    <p className="text-[11px] text-muted">Sponsor: {reit.sponsor}</p>
                  </div>

                  <div className="text-right">
                    <div className="text-base font-bold font-mono text-foreground">
                      ₹{formatResearchNumber(reit.unitPrice, 2)}
                    </div>
                    <div
                      className={`text-xs font-mono font-semibold ${
                        (reit.dayChange !== null && reit.dayChange >= 0) ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                      }`}
                    >
                      {(reit.dayChange !== null && reit.dayChange >= 0) ? '+' : ''}
                      {formatResearchNumber(reit.dayChange, 2)} ({formatResearchNumber(reit.dayChangePct, 2)}%)
                    </div>
                  </div>
                </div>

                {/* Key Stats Grid */}
                <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-surface-raised/30 dark:bg-slate-800/30 border border-border text-center">
                  <div>
                    <span className="text-[10px] text-muted">Trailing Yield</span>
                    <div className="text-xs font-bold font-mono text-emerald-700 dark:text-emerald-400 mt-0.5">
                      {formatResearchNumber(reit.trailingYieldPct, 2)}%
                    </div>
                    <span className="text-[9px] text-muted dark:text-slate-500">₹{formatResearchNumber(reit.trailingAnnualDpu, 1)}/yr DPU</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-muted">Occupancy</span>
                    <div className="text-xs font-bold font-mono text-foreground mt-0.5">
                      {formatResearchNumber(reit.occupancyPct, 1)}%
                    </div>
                    <span className="text-[9px] text-muted dark:text-slate-500">{formatResearchNumber(reit.waleYears, 1)}y WALE</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-muted">Net Debt / GAV</span>
                    <div className="text-xs font-bold font-mono text-foreground mt-0.5">
                      {formatResearchNumber(reit.netDebtToGavPct, 1)}%
                    </div>
                    <span className="text-[9px] text-muted dark:text-slate-500">SEBI cap 49%</span>
                  </div>
                </div>

                {/* Geographic exposure */}
                <div className="text-[11px] text-muted">
                  <strong className="text-muted">Footprint:</strong> {reit.keyGeographies.join(', ')}
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="mt-4 pt-3 border-t border-border/80 flex items-center justify-between text-xs">
                <button
                  onClick={(e) => toggleCompare(reit.symbol, e)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-colors ${
                    isSelectedForCompare
                      ? 'bg-pink-500 text-white font-semibold'
                      : 'text-muted hover:text-foreground hover:bg-surface-raised dark:hover:bg-slate-800'
                  }`}
                >
                  <Scale className="w-3.5 h-3.5" />
                  <span>{isSelectedForCompare ? 'Selected for Compare' : 'Compare'}</span>
                </button>

                <div className="text-pink-700 dark:text-pink-400 hover:text-pink-700 dark:hover:text-pink-300 font-semibold inline-flex items-center gap-1">
                  <span>Detailed Research</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ─── SECTION 4: UNDERSTAND BEFORE INVESTING CHECKLIST ──── */}
      <div className="p-5 rounded-2xl bg-surface border border-border space-y-3">
        <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
          <Shield className="w-4 h-4 text-pink-700 dark:text-pink-400" />
          <span>REIT Investor Checklist: Understand Before Investing</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-muted">
          <div className="p-3 rounded-xl bg-surface-raised/20 dark:bg-slate-800/20 border border-border flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong>Yield is not guaranteed interest:</strong> Distributions fluctuate with tenant vacancies,
              operating expenses, and new property acquisitions.
            </div>
          </div>

          <div className="p-3 rounded-xl bg-surface-raised/20 dark:bg-slate-800/20 border border-border flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong>Check Tax Split on DPU:</strong> Distributions arrive split into Interest (taxed at slab),
              Dividends (mostly exempt), and Capital Repayment.
            </div>
          </div>

          <div className="p-3 rounded-xl bg-surface-raised/20 dark:bg-slate-800/20 border border-border flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong>Monitor interest rates:</strong> Compare sourced distributions with prevailing bond yields. No current yield or spread has been reviewed here.
            </div>
          </div>

          <div className="p-3 rounded-xl bg-surface-raised/20 dark:bg-slate-800/20 border border-border flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong>Track Tenant Concentration:</strong> Read the trust’s latest tenant exposure and lease-expiry disclosures. These metrics are unavailable until reviewed.
            </div>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      <ReitDetailModal
        reit={selectedReit}
        isOpen={Boolean(selectedReit)}
        onClose={() => setSelectedReit(null)}
        isHeldInPortfolio={selectedReit ? heldSymbols.has(selectedReit.symbol.toUpperCase()) : false}
      />

      {/* Comparison Modal */}
      <AlternativeCompareModal
        isOpen={isCompareOpen}
        onClose={() => setIsCompareOpen(false)}
        items={compareItems}
        onRemoveItem={(sym) => setCompareSymbols((prev) => prev.filter((s) => s !== sym))}
      />
    </div>
  );
}
