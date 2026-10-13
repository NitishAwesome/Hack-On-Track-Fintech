'use client';

// ============================================================
// FINOVA — Bonds Discovery View (Prompt 19)
// components/alternatives/BondsDiscoveryView.tsx
//
// Dedicated Discovery & Research terminal for Indian Listed Debt:
// Screener -> Compare -> Yield Truth (Coupon vs YTM) -> Risk -> Detail
// Zero duplicate 3-tab navigation.
// ============================================================

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Link2,
  Search,
  Scale,
  Shield,
  ChevronRight,
  CheckCircle2,
  Calculator,
  Info,
} from 'lucide-react';
import { VERIFIED_INDIAN_BONDS, type BondItem } from '@/lib/data/bondData';
import { BondDetailModal } from './BondDetailModal';
import { AlternativeCompareModal, type CompareItem } from './AlternativeCompareModal';
import { useHeldSymbols } from '@/lib/hooks/useHeldSymbols';

export function BondsDiscoveryView() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedRating, setSelectedRating] = useState<string>('ALL');
  const [selectedMaturity, setSelectedMaturity] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'coupon' | 'ytm' | 'maturity' | 'name'>('coupon');
  const [selectedBond, setSelectedBond] = useState<BondItem | null>(null);
  const [compareSymbols, setCompareSymbols] = useState<string[]>([]);
  const [isCompareOpen, setIsCompareOpen] = useState(false);

  // Example Cash Flow Simulator state
  const [simCapital, setSimCapital] = useState<number>(100000);

  const heldSymbols = useHeldSymbols();

  // Filtered & Sorted Bonds
  const filteredBonds = useMemo(() => {
    return VERIFIED_INDIAN_BONDS.filter((b) => {
      const matchesSearch =
        b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.issuer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.isin.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCat =
        selectedCategory === 'ALL' || b.bondCategory === selectedCategory;

      const matchesRating =
        selectedRating === 'ALL' || b.creditRating.includes(selectedRating);

      let matchesMaturity = true;
      if (selectedMaturity === 'SHORT') matchesMaturity = b.residualMaturityYears < 3;
      else if (selectedMaturity === 'MEDIUM')
        matchesMaturity = b.residualMaturityYears >= 3 && b.residualMaturityYears <= 7;
      else if (selectedMaturity === 'LONG') matchesMaturity = b.residualMaturityYears > 7;

      return matchesSearch && matchesCat && matchesRating && matchesMaturity;
    }).sort((a, b) => {
      if (sortBy === 'coupon') return b.couponRate - a.couponRate;
      if (sortBy === 'ytm') {
        const ytmA = a.ytmPct ?? -1;
        const ytmB = b.ytmPct ?? -1;
        return ytmB - ytmA;
      }
      if (sortBy === 'maturity') return a.residualMaturityYears - b.residualMaturityYears;
      return a.name.localeCompare(b.name);
    });
  }, [searchQuery, selectedCategory, selectedRating, selectedMaturity, sortBy]);

  // Handle toggling compare
  const toggleCompare = (symbol: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (compareSymbols.includes(symbol)) {
      setCompareSymbols((prev) => prev.filter((s) => s !== symbol));
    } else {
      if (compareSymbols.length >= 4) {
        alert('You can compare a maximum of 4 bonds side-by-side.');
        return;
      }
      setCompareSymbols((prev) => [...prev, symbol]);
    }
  };

  const compareItems: CompareItem[] = useMemo(() => {
    return compareSymbols
      .map((sym) => VERIFIED_INDIAN_BONDS.find((b) => b.symbol === sym))
      .filter((b): b is BondItem => Boolean(b))
      .map((b) => ({ kind: 'bond', data: b }));
  }, [compareSymbols]);

  return (
    <div className="space-y-8">
      {/* ─── Breadcrumb Navigation ──── */}
      <div className="flex items-center gap-2 text-xs text-muted">
        <Link href="/explore/alternatives" className="hover:text-indigo-400 transition-colors">
          Alternative Investments Hub
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-foreground font-semibold">Bonds & Fixed Income</span>
      </div>

      {/* ─── Header ──── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Link2 className="w-6 h-6" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Listed Bonds & Fixed Income Screener
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted mt-1 max-w-3xl">
            Contractual fixed coupon payments and principal redemption. Distinguish contractual Coupon Rate
            from secondary market Yield to Maturity (YTM), credit rating opinions, and duration risks.
          </p>
        </div>

        {compareSymbols.length >= 2 && (
          <button
            onClick={() => setIsCompareOpen(true)}
            className="btn-primary text-xs py-2 px-4 flex items-center gap-2 shrink-0 self-start sm:self-auto bg-indigo-600 hover:bg-indigo-500"
          >
            <Scale className="w-4 h-4" />
            <span>Compare {compareSymbols.length} Selected Bonds</span>
          </button>
        )}
      </div>

      {/* ─── SECTION 1: CRITICAL RETURN DISTINCTION (Section 9 Requirement) ──── */}
      <div className="p-5 sm:p-6 rounded-2xl bg-surface border border-border space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
              Truth in Fixed Income: Four Distinct Return Dimensions
            </h2>
          </div>
          <span className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
            Never Assume Coupon = Your Return
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-surface-raised/30 dark:bg-slate-800/30 border border-border space-y-1">
            <div className="text-xs font-bold text-indigo-300">1. Coupon Rate</div>
            <p className="text-[11px] text-muted leading-relaxed">
              The contractual percentage paid on <strong>Face Value</strong> (e.g. ₹100 or ₹1,000). Fixed by the
              issuer at inception.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-raised/30 dark:bg-slate-800/30 border border-border space-y-1">
            <div className="text-xs font-bold text-foreground">2. Current Yield</div>
            <p className="text-[11px] text-muted leading-relaxed">
              (Annual Coupon / Current Market Price) × 100. Accounts for whether you bought above or below par.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-raised/30 dark:bg-slate-800/30 border border-border space-y-1">
            <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400">3. Yield to Maturity (YTM)</div>
            <p className="text-[11px] text-muted leading-relaxed">
              The true internal rate of return (IRR) if held until maturity. Only calculable when an active market
              trade price exists.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-raised/30 dark:bg-slate-800/30 border border-border space-y-1">
            <div className="text-xs font-bold text-amber-700 dark:text-amber-400">4. Actual Total Return</div>
            <p className="text-[11px] text-muted leading-relaxed">
              Depends on purchase price, coupon reinvestment rates, holding duration, slab taxes, and credit default risk.
            </p>
          </div>
        </div>

        {/* Interactive Cash Flow Estimator */}
        <div className="p-4 rounded-xl bg-surface-raised/40 dark:bg-slate-800/40 border border-border/60 dark:border-slate-700/60 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-indigo-400" />
              <h3 className="text-xs font-bold text-foreground">
                Illustrative Bond Cash Flow Schedule
              </h3>
            </div>
            <span className="text-[10px] text-muted">Contractual Cash Flow Example</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1 items-center">
            <div className="space-y-1">
              <label className="text-[11px] text-muted">Hypothetical Par Investment (₹)</label>
              <input
                type="range"
                min={25000}
                max={500000}
                step={25000}
                value={simCapital}
                onChange={(e) => setSimCapital(Number(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
              <div className="text-xs font-mono font-bold text-foreground">
                ₹{simCapital.toLocaleString('en-IN')}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-surface border border-border text-center">
              <span className="text-[10px] text-muted">Hypothetical illustration · assumes 7.40%</span>
              <div className="text-sm font-bold font-mono text-indigo-400">
                ₹{Math.round(simCapital * 0.074).toLocaleString('en-IN')} / year
              </div>
              <span className="text-[10px] text-muted dark:text-slate-500">+ 100% Principal Repayment at Maturity</span>
            </div>

            <p className="text-[11px] text-muted leading-relaxed">
              This illustration is not a reviewed bond offer. Actual coupon terms, repayment and risks depend on the issuer and issue documents. No specific issues are currently reviewed.
            </p>
          </div>
        </div>
      </div>

      {/* ─── SECTION 2: SEARCH, FILTERS & CONTROLS ──── */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex flex-wrap flex-1 items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by issuer, ISIN, symbol (e.g. REC, G-Sec)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-surface-raised/40 dark:bg-slate-800/40 border border-border text-xs text-foreground placeholder:text-muted dark:placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 rounded-xl bg-surface-raised/40 dark:bg-slate-800/40 border border-border text-xs text-foreground focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Categories</option>
            <option value="Sovereign (G-Sec)">Sovereign (G-Sec)</option>
            <option value="PSU Bond">PSU Bonds</option>
            <option value="Corporate NCD">Corporate NCDs</option>
          </select>

          {/* Rating Filter */}
          <select
            value={selectedRating}
            onChange={(e) => setSelectedRating(e.target.value)}
            className="px-3 py-2 rounded-xl bg-surface-raised/40 dark:bg-slate-800/40 border border-border text-xs text-foreground focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Ratings</option>
            <option value="Sovereign">Sovereign</option>
            <option value="AAA">AAA Rated</option>
            <option value="AA+">AA+ / Subordinated</option>
          </select>

          {/* Maturity Filter */}
          <select
            value={selectedMaturity}
            onChange={(e) => setSelectedMaturity(e.target.value)}
            className="px-3 py-2 rounded-xl bg-surface-raised/40 dark:bg-slate-800/40 border border-border text-xs text-foreground focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Tenors</option>
            <option value="SHORT">&lt; 3 Years (Low Duration)</option>
            <option value="MEDIUM">3 – 7 Years (Medium Duration)</option>
            <option value="LONG">&gt; 7 Years (High Duration)</option>
          </select>
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted shrink-0">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'coupon' | 'ytm' | 'maturity' | 'name')}
            className="px-3 py-2 rounded-xl bg-surface-raised/40 dark:bg-slate-800/40 border border-border text-xs text-foreground focus:outline-none focus:border-indigo-500"
          >
            <option value="coupon">Contractual Coupon Rate</option>
            <option value="ytm">Yield to Maturity (YTM)</option>
            <option value="maturity">Maturity Date (Tenor)</option>
            <option value="name">Issuer Name</option>
          </select>
        </div>
      </div>

      {/* ─── SECTION 3: LISTED BOND CARDS ──── */}
      {filteredBonds.length === 0 && <p className="text-xs text-muted" role="status">No reviewed bond issues available. Review current issue documents through <a href="https://www.rbiretaildirect.org.in/" target="_blank" rel="noopener noreferrer" className="underline">RBI Retail Direct</a> or the relevant exchange before researching prices or yields.</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredBonds.map((bond) => {
          const isHeld = heldSymbols.has(bond.symbol.toUpperCase());
          const isSelectedForCompare = compareSymbols.includes(bond.symbol);

          return (
            <motion.div
              key={bond.symbol}
              whileHover={{ y: -2 }}
              transition={{ duration: 0.15 }}
              onClick={() => setSelectedBond(bond)}
              className={`p-5 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                isSelectedForCompare
                  ? 'bg-indigo-950/20 border-indigo-500/50'
                  : 'bg-surface hover:bg-surface-raised border-border hover:border-brand/40'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-indigo-400">{bond.symbol}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-surface-raised dark:bg-slate-800 text-muted">
                        {bond.bondCategory}
                      </span>
                      {isHeld && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                          In Portfolio
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-foreground">{bond.name}</h3>
                    <p className="text-[11px] text-muted font-mono">ISIN: {bond.isin}</p>
                  </div>

                  <div className="text-right">
                    <div className="text-base font-bold font-mono text-indigo-400">
                      {bond.couponRate.toFixed(2)}% Coupon
                    </div>
                    <div className="text-xs text-muted font-mono">
                      {bond.isPriceAvailable && bond.lastTradedPrice !== null ? (
                        `₹${bond.lastTradedPrice.toFixed(2)}`
                      ) : (
                        <span className="text-amber-700 dark:text-amber-400 text-[10px]">Price Unquoted</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Key Stats */}
                <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-surface-raised/30 dark:bg-slate-800/30 border border-border text-center">
                  <div>
                    <span className="text-[10px] text-muted">YTM (IRR)</span>
                    <div className="text-xs font-bold font-mono mt-0.5">
                      {bond.ytmPct !== null ? (
                        <span className="text-emerald-700 dark:text-emerald-400">{bond.ytmPct.toFixed(2)}%</span>
                      ) : (
                        <span className="text-muted dark:text-slate-500 text-[10px]">N/A (Illiquid)</span>
                      )}
                    </div>
                    <span className="text-[9px] text-muted dark:text-slate-500">
                      {bond.ytmPct !== null ? 'Holding to maturity' : 'Trade price required'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-muted">Rating</span>
                    <div className="text-xs font-bold font-mono text-foreground mt-0.5">
                      {bond.creditRating}
                    </div>
                    <span className="text-[9px] text-muted dark:text-slate-500">{bond.ratingAgency}</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-muted">Maturity Tenor</span>
                    <div className="text-xs font-bold font-mono text-foreground mt-0.5">
                      {bond.residualMaturityYears.toFixed(1)} yrs
                    </div>
                    <span className="text-[9px] text-muted dark:text-slate-500">{bond.maturityDate}</span>
                  </div>
                </div>

                {/* Seniority & Security */}
                <div className="flex items-center justify-between text-[11px] text-muted">
                  <span>
                    <strong className="text-muted">Seniority:</strong> {bond.securityType}
                  </span>
                  <span className="font-mono text-muted">Min: ₹{bond.minimumInvestmentInr.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="mt-4 pt-3 border-t border-border/80 flex items-center justify-between text-xs">
                <button
                  onClick={(e) => toggleCompare(bond.symbol, e)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-colors ${
                    isSelectedForCompare
                      ? 'bg-indigo-500 text-foreground dark:text-white font-semibold'
                      : 'text-muted hover:text-foreground hover:bg-surface-raised dark:hover:bg-slate-800'
                  }`}
                >
                  <Scale className="w-3.5 h-3.5" />
                  <span>{isSelectedForCompare ? 'Selected for Compare' : 'Compare'}</span>
                </button>

                <div className="text-indigo-400 hover:text-indigo-300 font-semibold inline-flex items-center gap-1">
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
          <Shield className="w-4 h-4 text-indigo-400" />
          <span>Fixed Income Checklist: Understand Before Investing</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-muted">
          <div className="p-3 rounded-xl bg-surface-raised/20 dark:bg-slate-800/20 border border-border flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong>Credit Ratings Are Opinion, Not Guarantees:</strong> Ratings (CRISIL, ICRA) reflect an agency
              opinion on credit risk. Downgrades happen; sovereign debt is the only default-free INR asset.
            </div>
          </div>

          <div className="p-3 rounded-xl bg-surface-raised/20 dark:bg-slate-800/20 border border-border flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong>Duration & Interest Rate Inverse:</strong> When RBI hikes interest rates, existing long-term
              bonds drop in market price. Holding to maturity eliminates capital loss if the issuer does not default.
            </div>
          </div>

          <div className="p-3 rounded-xl bg-surface-raised/20 dark:bg-slate-800/20 border border-border flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong>Senior Secured vs Tier-II Subordinated:</strong> Senior secured NCDs hold collateral assets.
              Tier-II bank bonds absorb loss in banking crisis resolution scenarios before senior depositors.
            </div>
          </div>

          <div className="p-3 rounded-xl bg-surface-raised/20 dark:bg-slate-800/20 border border-border flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong>Secondary Liquidity Reality:</strong> Corporate bonds trade infrequently compared to stocks.
              If you need liquidity prior to maturity, check secondary trading status or plan to hold to maturity.
            </div>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      <BondDetailModal
        bond={selectedBond}
        isOpen={Boolean(selectedBond)}
        onClose={() => setSelectedBond(null)}
        isHeldInPortfolio={selectedBond ? heldSymbols.has(selectedBond.symbol.toUpperCase()) : false}
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
