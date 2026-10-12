'use client';

// ============================================================
// FINOVA — InvIT Discovery View (Prompt 19)
// components/alternatives/InvitDiscoveryView.tsx
//
// Dedicated Discovery & Research terminal for Indian InvITs:
// Learn -> Discover Real Options -> Compare -> Understand Income & Risk -> Detail
// Zero duplicate 3-tab navigation.
// ============================================================

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Zap,
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
import { VERIFIED_INDIAN_INVITS, type InvitItem } from '@/lib/data/invitData';
import { InvitDetailModal } from './InvitDetailModal';
import { AlternativeCompareModal, type CompareItem } from './AlternativeCompareModal';
import { PortfolioStorage } from '@/lib/storage/portfolioStorage';

export function InvitDiscoveryView() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'yield' | 'mcap' | 'years' | 'name'>('yield');
  const [selectedInvit, setSelectedInvit] = useState<InvitItem | null>(null);
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

  // Filtered & Sorted InvITs
  const filteredInvits = useMemo(() => {
    return VERIFIED_INDIAN_INVITS.filter((i) => {
      const matchesSearch =
        i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.sponsor.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCat =
        selectedCategory === 'ALL' || i.infraCategory === selectedCategory;

      return matchesSearch && matchesCat;
    }).sort((a, b) => {
      if (sortBy === 'yield') return b.trailingYieldPct - a.trailingYieldPct;
      if (sortBy === 'mcap') return b.marketCapCr - a.marketCapCr;
      if (sortBy === 'years') return b.averageRemainingConcessionYears - a.averageRemainingConcessionYears;
      return a.name.localeCompare(b.name);
    });
  }, [searchQuery, selectedCategory, sortBy]);

  // Handle toggling compare
  const toggleCompare = (symbol: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (compareSymbols.includes(symbol)) {
      setCompareSymbols((prev) => prev.filter((s) => s !== symbol));
    } else {
      if (compareSymbols.length >= 4) {
        alert('You can compare a maximum of 4 InvITs side-by-side.');
        return;
      }
      setCompareSymbols((prev) => [...prev, symbol]);
    }
  };

  const compareItems: CompareItem[] = useMemo(() => {
    return compareSymbols
      .map((sym) => VERIFIED_INDIAN_INVITS.find((i) => i.symbol === sym))
      .filter((i): i is InvitItem => Boolean(i))
      .map((i) => ({ kind: 'invit', data: i }));
  }, [compareSymbols]);

  return (
    <div className="space-y-8">
      {/* ─── Breadcrumb Navigation ──── */}
      <div className="flex items-center gap-2 text-xs text-muted">
        <Link href="/explore/alternatives" className="hover:text-cyan-400 transition-colors">
          Alternative Investments Hub
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-foreground font-semibold">InvITs Discovery</span>
      </div>

      {/* ─── Header ──── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Zap className="w-6 h-6" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Explore Listed Indian InvITs
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted mt-1 max-w-3xl">
            Co-own national infrastructure assets: inter-state power transmission networks and national toll
            expressways. Understand high cash distribution yields, concession lifespans, and amortization risks.
          </p>
        </div>

        {compareSymbols.length >= 2 && (
          <button
            onClick={() => setIsCompareOpen(true)}
            className="btn-primary text-xs py-2 px-4 flex items-center gap-2 shrink-0 self-start sm:self-auto bg-cyan-600 hover:bg-cyan-500"
          >
            <Scale className="w-4 h-4" />
            <span>Compare {compareSymbols.length} Selected InvITs</span>
          </button>
        )}
      </div>

      {/* ─── SECTION 1: INTERACTIVE EDUCATION ──── */}
      <div className="p-5 sm:p-6 rounded-2xl bg-surface border border-border space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
              InvIT Fundamentals in 60 Seconds
            </h2>
          </div>
          <span className="text-[11px] text-muted font-mono">SEBI (InvIT) Regulations, 2014</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-800/30 border border-border space-y-1.5">
            <div className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              <span>What is an InvIT?</span>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              A pooled investment trust owning operational infrastructure assets like national highways and
              high-voltage power grids that generate stable, contractual toll or availability tariff revenues.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-800/30 border border-border space-y-1.5">
            <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5" />
              <span>High Cash Flow Yields (10–12%)</span>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              InvITs distribute 90% of NDCF quarterly. Because yields often include repayment of capital as
              concession terms expire, payouts look higher than standard stock dividends.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-800/30 border border-border space-y-1.5">
            <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Concession Amortization</span>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              Unlike perpetual equities, BOT toll concessions terminate after 20–30 years. Unitholders must
              evaluate remaining concession life and whether managers acquire new assets.
            </p>
          </div>
        </div>

        {/* Illustrative Calculator */}
        <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-bold text-foreground">
                Illustrative InvIT Distribution Estimator
              </h3>
            </div>
            <span className="text-[10px] text-amber-400 font-semibold px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
              Illustrative Calculation — Subject to Traffic & Regulatory Tariffs
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
                className="w-full accent-cyan-500 cursor-pointer"
              />
              <div className="text-xs font-mono font-bold text-foreground">
                ₹{simCapital.toLocaleString('en-IN')}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-surface border border-border text-center">
              <span className="text-[10px] text-muted">At Avg ~11.5% Trailing Yield</span>
              <div className="text-sm font-bold font-mono text-cyan-400">
                ~₹{Math.round(simCapital * 0.115).toLocaleString('en-IN')} / yr
              </div>
              <span className="text-[10px] text-slate-500">~₹{Math.round((simCapital * 0.115) / 4).toLocaleString('en-IN')} / quarter</span>
            </div>

            <p className="text-[11px] text-muted leading-relaxed">
              Remember: A portion of this yield represents principal return (capital amortization). Always
              reinvest the capital repayment component if you intend to preserve original capital value.
            </p>
          </div>
        </div>
      </div>

      {/* ─── SECTION 2: SEARCH, FILTERS & CONTROLS ──── */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, symbol, sponsor (e.g. PowerGrid, IRB)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-800/40 border border-border text-xs text-foreground placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-800/40 border border-border text-xs text-foreground focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Sectors</option>
            <option value="Power Transmission">Power Transmission</option>
            <option value="Roads & Highways">Roads & Highways</option>
            <option value="Renewables & Grid">Renewables & Grid</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted shrink-0">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'yield' | 'mcap' | 'years' | 'name')}
            className="px-3 py-2 rounded-xl bg-slate-800/40 border border-border text-xs text-foreground focus:outline-none focus:border-cyan-500"
          >
            <option value="yield">Trailing Yield %</option>
            <option value="mcap">Market Capitalization</option>
            <option value="years">Remaining Concession (Years)</option>
            <option value="name">Trust Name</option>
          </select>
        </div>
      </div>

      {/* ─── SECTION 3: LISTED INVIT CARDS ──── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredInvits.map((invit) => {
          const isHeld = heldSymbols.has(invit.symbol.toUpperCase());
          const isSelectedForCompare = compareSymbols.includes(invit.symbol);

          return (
            <motion.div
              key={invit.symbol}
              whileHover={{ y: -2 }}
              transition={{ duration: 0.15 }}
              onClick={() => setSelectedInvit(invit)}
              className={`p-5 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                isSelectedForCompare
                  ? 'bg-cyan-950/20 border-cyan-500/50'
                  : 'bg-surface hover:bg-surface-raised border-border hover:border-brand/40'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-cyan-400">{invit.symbol}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-muted">
                        {invit.infraCategory}
                      </span>
                      {isHeld && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          In Portfolio
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-foreground">{invit.name}</h3>
                    <p className="text-[11px] text-muted">Sponsor: {invit.sponsor}</p>
                  </div>

                  <div className="text-right">
                    <div className="text-base font-bold font-mono text-foreground">
                      ₹{invit.unitPrice.toFixed(2)}
                    </div>
                    <div
                      className={`text-xs font-mono font-semibold ${
                        invit.dayChange >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {invit.dayChange >= 0 ? '+' : ''}
                      {invit.dayChange.toFixed(2)} ({invit.dayChangePct.toFixed(2)}%)
                    </div>
                  </div>
                </div>

                {/* Key Stats */}
                <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-slate-800/30 border border-border text-center">
                  <div>
                    <span className="text-[10px] text-muted">Trailing Yield</span>
                    <div className="text-xs font-bold font-mono text-cyan-400 mt-0.5">
                      {invit.trailingYieldPct.toFixed(2)}%
                    </div>
                    <span className="text-[9px] text-slate-500">₹{invit.trailingAnnualDpu.toFixed(1)}/yr DPU</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-muted">Concession Left</span>
                    <div className="text-xs font-bold font-mono text-foreground mt-0.5">
                      {invit.averageRemainingConcessionYears.toFixed(1)} yrs
                    </div>
                    <span className="text-[9px] text-slate-500">
                      {invit.isConcessionFinite ? 'Finite Toll' : 'Availability'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-muted">Credit Rating</span>
                    <div className="text-xs font-bold font-mono text-emerald-400 mt-0.5">
                      {invit.creditRating}
                    </div>
                    <span className="text-[9px] text-slate-500">Debt: {invit.netDebtToGavPct.toFixed(1)}%</span>
                  </div>
                </div>

                <div className="text-[11px] text-muted">
                  <strong className="text-muted">Network:</strong> {invit.networkSizeKm} km across{' '}
                  {invit.operationalSpvCount} SPVs
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="mt-4 pt-3 border-t border-border/80 flex items-center justify-between text-xs">
                <button
                  onClick={(e) => toggleCompare(invit.symbol, e)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-colors ${
                    isSelectedForCompare
                      ? 'bg-cyan-500 text-white font-semibold'
                      : 'text-muted hover:text-foreground hover:bg-slate-800'
                  }`}
                >
                  <Scale className="w-3.5 h-3.5" />
                  <span>{isSelectedForCompare ? 'Selected for Compare' : 'Compare'}</span>
                </button>

                <div className="text-cyan-400 hover:text-cyan-300 font-semibold inline-flex items-center gap-1">
                  <span>Detailed Research</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ─── SECTION 4: CHECKLIST ──── */}
      <div className="p-5 rounded-2xl bg-surface border border-border space-y-3">
        <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
          <Shield className="w-4 h-4 text-cyan-400" />
          <span>InvIT Investor Checklist: Understand Before Investing</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-muted">
          <div className="p-3 rounded-xl bg-slate-800/20 border border-border flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong>Distinguish Availability vs Toll Roads:</strong> Transmission grids earn fixed tariffs if
              lines are energized; toll roads depend on traffic volume and GDP freight growth.
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-800/20 border border-border flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong>Concession Expiry is Real:</strong> When a highway concession expires, toll rights revert to
              NHAI. The trust must acquire replacement assets to maintain cash flow.
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-800/20 border border-border flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong>Credit Rating & Leverage:</strong> Check rating (e.g. CRISIL AAA) and verify Net Debt is well
              below the statutory 70% GAV threshold.
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-800/20 border border-border flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong>Liquidity Considerations:</strong> Secondary market trading volume in InvITs can be thinner
              than large-cap equities. Use limit orders when buying or selling.
            </div>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      <InvitDetailModal
        invit={selectedInvit}
        isOpen={Boolean(selectedInvit)}
        onClose={() => setSelectedInvit(null)}
        isHeldInPortfolio={selectedInvit ? heldSymbols.has(selectedInvit.symbol.toUpperCase()) : false}
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
