'use client';

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
import { PortfolioStorage } from '@/lib/storage/portfolioStorage';

export function ReitDiscoveryView() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPropertyType, setSelectedPropertyType] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'yield' | 'mcap' | 'occupancy' | 'name'>('yield');
  const [selectedReit, setSelectedReit] = useState<ReitItem | null>(null);
  const [compareSymbols, setCompareSymbols] = useState<string[]>([]);
  const [isCompareOpen, setIsCompareOpen] = useState(false);

  // Example Cash Flow Simulator state
  const [simCapital, setSimCapital] = useState<number>(100000);

  const heldSymbols = useMemo(() => {
    try {
      const holdings = PortfolioStorage.getHoldings();
      const instruments = PortfolioStorage.getInstruments();
      const instMap = new Map(instruments.map((i) => [i.id, i.symbol.toUpperCase()]));
      const held = new Set<string>();
      for (const h of holdings) {
        const sym = instMap.get(h.instrument_id);
        if (sym) {
          held.add(sym.replace(/\.(NS|BO|BSE|NSE)$/i, ''));
        }
      }
      return held;
    } catch {
      return new Set<string>();
    }
  }, []);

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
      if (sortBy === 'yield') return b.trailingYieldPct - a.trailingYieldPct;
      if (sortBy === 'mcap') return b.marketCapCr - a.marketCapCr;
      if (sortBy === 'occupancy') return b.occupancyPct - a.occupancyPct;
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
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Link href="/explore/alternatives" className="hover:text-pink-400 transition-colors">
          Alternative Investments Hub
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-slate-200 font-semibold">REITs Discovery</span>
      </div>

      {/* ─── Header ──── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-pink-500/10 text-pink-400 border border-pink-500/20">
              <Building2 className="w-6 h-6" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-100">
              Explore Listed Indian REITs
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-3xl">
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
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-900/60 border border-slate-800 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-pink-400" />
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
              REIT Fundamentals in 60 Seconds
            </h2>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">SEBI (REIT) Regulations, 2014</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* What is it */}
          <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-800 space-y-1.5">
            <div className="text-xs font-bold text-pink-300 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              <span>What is a REIT?</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              A trust that owns commercial real estate (offices and malls). You buy exchange-traded units on
              NSE/BSE like a stock, earning a proportional share of tenant rent without property upkeep.
            </p>
          </div>

          {/* How do I earn */}
          <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-800 space-y-1.5">
            <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5" />
              <span>How Do You Earn?</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              By law, <strong>90% of Net Distributable Cash Flows</strong> must be distributed quarterly as
              interest, dividends, or return of capital, plus potential capital appreciation of unit price.
            </p>
          </div>

          {/* Main risks */}
          <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-800 space-y-1.5">
            <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Main Risks to Watch</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Unit prices fluctuate daily. Rising RBI interest rates can compress REIT valuations, and tenant
              vacancies reduce distributable cash flow. They are not risk-free fixed deposits.
            </p>
          </div>
        </div>

        {/* Interactive Cash Flow Simulator (Clearly Labeled Illustrative) */}
        <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-pink-400" />
              <h3 className="text-xs font-bold text-slate-200">
                Illustrative Cash Distribution Simulator
              </h3>
            </div>
            <span className="text-[10px] text-amber-400 font-semibold px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
              Illustrative Educational Example — Not a Return Guarantee
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1 items-center">
            <div className="space-y-1">
              <label className="text-[11px] text-slate-400">Hypothetical Investment (₹)</label>
              <input
                type="range"
                min={25000}
                max={500000}
                step={25000}
                value={simCapital}
                onChange={(e) => setSimCapital(Number(e.target.value))}
                className="w-full accent-pink-500 cursor-pointer"
              />
              <div className="text-xs font-mono font-bold text-slate-200">
                ₹{simCapital.toLocaleString('en-IN')}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400">At Avg ~6.2% Trailing Yield</span>
              <div className="text-sm font-bold font-mono text-emerald-400">
                ~₹{Math.round(simCapital * 0.062).toLocaleString('en-IN')} / yr
              </div>
              <span className="text-[10px] text-slate-500">~₹{Math.round((simCapital * 0.062) / 4).toLocaleString('en-IN')} / quarter</span>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
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
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, symbol, city (e.g. Embassy, Bengaluru)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-800/40 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-pink-500"
            />
          </div>

          {/* Property Type Filter */}
          <select
            value={selectedPropertyType}
            onChange={(e) => setSelectedPropertyType(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-800/40 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-pink-500"
          >
            <option value="ALL">All Properties</option>
            <option value="Office">Office Campuses</option>
            <option value="Retail">Retail Malls</option>
            <option value="Commercial">Commercial</option>
          </select>
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 shrink-0">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'yield' | 'mcap' | 'occupancy' | 'name')}
            className="px-3 py-2 rounded-xl bg-slate-800/40 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-pink-500"
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
                  : 'bg-slate-900/60 hover:bg-slate-800/40 border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Card Top */}
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-pink-400">{reit.symbol}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300">
                        {reit.propertyType}
                      </span>
                      {isHeld && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          In Portfolio
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-slate-100">{reit.name}</h3>
                    <p className="text-[11px] text-slate-400">Sponsor: {reit.sponsor}</p>
                  </div>

                  <div className="text-right">
                    <div className="text-base font-bold font-mono text-slate-100">
                      ₹{reit.unitPrice.toFixed(2)}
                    </div>
                    <div
                      className={`text-xs font-mono font-semibold ${
                        reit.dayChange >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {reit.dayChange >= 0 ? '+' : ''}
                      {reit.dayChange.toFixed(2)} ({reit.dayChangePct.toFixed(2)}%)
                    </div>
                  </div>
                </div>

                {/* Key Stats Grid */}
                <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-slate-800/30 border border-slate-800 text-center">
                  <div>
                    <span className="text-[10px] text-slate-400">Trailing Yield</span>
                    <div className="text-xs font-bold font-mono text-emerald-400 mt-0.5">
                      {reit.trailingYieldPct.toFixed(2)}%
                    </div>
                    <span className="text-[9px] text-slate-500">₹{reit.trailingAnnualDpu.toFixed(1)}/yr DPU</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400">Occupancy</span>
                    <div className="text-xs font-bold font-mono text-slate-200 mt-0.5">
                      {reit.occupancyPct.toFixed(1)}%
                    </div>
                    <span className="text-[9px] text-slate-500">{reit.waleYears.toFixed(1)}y WALE</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400">Net Debt / GAV</span>
                    <div className="text-xs font-bold font-mono text-slate-200 mt-0.5">
                      {reit.netDebtToGavPct.toFixed(1)}%
                    </div>
                    <span className="text-[9px] text-slate-500">SEBI cap 49%</span>
                  </div>
                </div>

                {/* Geographic exposure */}
                <div className="text-[11px] text-slate-400">
                  <strong className="text-slate-300">Footprint:</strong> {reit.keyGeographies.join(', ')}
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <button
                  onClick={(e) => toggleCompare(reit.symbol, e)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-colors ${
                    isSelectedForCompare
                      ? 'bg-pink-500 text-white font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <Scale className="w-3.5 h-3.5" />
                  <span>{isSelectedForCompare ? 'Selected for Compare' : 'Compare'}</span>
                </button>

                <div className="text-pink-400 hover:text-pink-300 font-semibold inline-flex items-center gap-1">
                  <span>Detailed Research</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ─── SECTION 4: UNDERSTAND BEFORE INVESTING CHECKLIST ──── */}
      <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
        <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
          <Shield className="w-4 h-4 text-pink-400" />
          <span>REIT Investor Checklist: Understand Before Investing</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300">
          <div className="p-3 rounded-xl bg-slate-800/20 border border-slate-800 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong>Yield is not guaranteed interest:</strong> Distributions fluctuate with tenant vacancies,
              operating expenses, and new property acquisitions.
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-800/20 border border-slate-800 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong>Check Tax Split on DPU:</strong> Distributions arrive split into Interest (taxed at slab),
              Dividends (mostly exempt), and Capital Repayment.
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-800/20 border border-slate-800 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong>Monitor 10Y G-Sec Spreads:</strong> When government bond yields rise above 7.2%, REIT unit
              prices often correct until distribution yields match the risk premium.
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-800/20 border border-slate-800 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong>Track Tenant Concentration:</strong> Large MNC IT/BFSI tenants account for 30–50% of gross
              rentals. Lease expiries (WALE) must be renewed.
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
