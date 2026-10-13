'use client';
import { useDialogFocus } from '@/lib/hooks/useDialogFocus';

// ============================================================
// FINOVA — Bond Research Detail Modal
// components/alternatives/BondDetailModal.tsx
//
// Dedicated fixed income research terminal for Indian listed debt:
// - Contractual Coupon vs Current Yield vs YTM distinction (Zero fake YTM)
// - Visual Cash Flow Timeline (Purchase -> Scheduled Coupons -> Par Repayment)
// - Credit rating rationale & regulatory opinion disclaimer
// - Duration, interest-rate sensitivity & subordination risk
// ============================================================

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Link2,
  Calendar,
  Shield,
  Compass,
  Info,
  Layers,
} from 'lucide-react';
import type { BondItem } from '@/lib/data/bondData';

interface Props {
  bond: BondItem | null;
  isOpen: boolean;
  onClose: () => void;
  isHeldInPortfolio?: boolean;
}

export function BondDetailModal({ bond, isOpen, onClose, isHeldInPortfolio = false }: Props) {
  const dialogRef = useDialogFocus(isOpen && !!bond, onClose);
  const [activeTab, setActiveTab] = useState<'overview' | 'cashflows' | 'credit' | 'risk'>('overview');

  if (!isOpen || !bond) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm">
        <motion.div
          ref={dialogRef} role="dialog" aria-modal="true" aria-label={`${bond.name} research`} tabIndex={-1}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.15 }}
          className="bg-surface dark:bg-slate-900 border border-border dark:border-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="p-4 sm:p-6 border-b border-border dark:border-slate-800 flex items-start justify-between shrink-0 bg-surface/90 dark:bg-slate-900/90 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <Link2 className="w-4 h-4" />
                </span>
                <span className="text-xs font-mono font-semibold text-indigo-300">{bond.symbol}</span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-surface-raised dark:bg-slate-800 text-foreground dark:text-slate-300">
                  {bond.bondCategory}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-surface-raised/80 dark:bg-slate-800/80 text-muted dark:text-slate-400 font-mono">
                  {bond.isin}
                </span>
                {isHeldInPortfolio && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                    Held in Portfolio
                  </span>
                )}
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-foreground dark:text-slate-100">{bond.name}</h2>
              <p className="text-xs text-muted dark:text-slate-400">
                Issuer: <span className="text-foreground dark:text-slate-200">{bond.issuer}</span> • Face Value: ₹{bond.faceValue.toFixed(2)}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-lg sm:text-xl font-bold font-mono text-foreground dark:text-slate-100">
                  {bond.isPriceAvailable && bond.lastTradedPrice !== null ? (
                    `₹${bond.lastTradedPrice.toFixed(2)}`
                  ) : (
                    <span className="text-xs text-amber-700 dark:text-amber-400 font-sans font-normal">Price Unavailable</span>
                  )}
                </div>
                <div className="text-xs font-mono text-indigo-400 font-semibold">
                  Coupon: {bond.couponRate.toFixed(2)}% ({bond.payoutFrequency})
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-2 text-muted dark:text-slate-400 hover:text-foreground dark:hover:text-white rounded-lg hover:bg-surface-raised dark:hover:bg-slate-800 transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Navigation Sub-Tabs */}
          <div className="px-6 border-b border-border dark:border-slate-800 flex gap-2 shrink-0 bg-surface/50 dark:bg-slate-900/50">
            {[
              { id: 'overview', label: 'Yield & Return Truth' },
              { id: 'cashflows', label: 'Cash Flow Timeline' },
              { id: 'credit', label: 'Credit Rating & Issuer' },
              { id: 'risk', label: 'Duration & Credit Risks' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'overview' | 'cashflows' | 'credit' | 'risk')}
                className={`py-3 px-3 text-xs font-semibold border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-muted dark:text-slate-400 hover:text-foreground dark:hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Body Content */}
          <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
            {/* ─── TAB 1: YIELD & RETURN HONESTY ─── */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Critical Fixed Income Terminology Callout */}
                <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 space-y-2">
                  <div className="font-bold flex items-center gap-1.5 text-indigo-200">
                    <Info className="w-4 h-4 shrink-0 text-indigo-400" />
                    <span>FINOVA Principle: Truth in Fixed-Income Yields</span>
                  </div>
                  <p className="text-[11px] text-foreground dark:text-slate-300 leading-relaxed">
                    Never confuse a bond&apos;s contractual <strong>Coupon Rate</strong> with your actual return.
                    If you buy a bond at a premium (above face value), your yield will be lower than the coupon.
                    If secondary market quotes are illiquid, <strong>Yield to Maturity (YTM)</strong> cannot be
                    guaranteed and must never be fabricated.
                  </p>
                </div>

                {/* 4 Yield Dimensions Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-xl bg-surface-raised/40 dark:bg-slate-800/40 border border-border dark:border-slate-800">
                    <span className="text-[11px] text-muted dark:text-slate-400">1. Coupon Rate</span>
                    <div className="text-base font-bold text-indigo-400 font-mono mt-0.5">
                      {bond.couponRate.toFixed(2)}%
                    </div>
                    <span className="text-[10px] text-muted dark:text-slate-500">Contractual on Face Value</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-surface-raised/40 dark:bg-slate-800/40 border border-border dark:border-slate-800">
                    <span className="text-[11px] text-muted dark:text-slate-400">2. Current Yield</span>
                    <div className="text-base font-bold text-foreground dark:text-slate-100 font-mono mt-0.5">
                      {bond.currentYieldPct !== null ? `${bond.currentYieldPct.toFixed(2)}%` : 'N/A'}
                    </div>
                    <span className="text-[10px] text-muted dark:text-slate-500">
                      {bond.isPriceAvailable ? 'Annual Coupon / Traded Price' : 'Price unavailable'}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-surface-raised/40 dark:bg-slate-800/40 border border-border dark:border-slate-800">
                    <span className="text-[11px] text-muted dark:text-slate-400">3. Yield to Maturity</span>
                    <div className="text-base font-bold text-emerald-700 dark:text-emerald-400 font-mono mt-0.5">
                      {bond.ytmPct !== null ? `${bond.ytmPct.toFixed(2)}%` : 'N/A (Illiquid)'}
                    </div>
                    <span className="text-[10px] text-muted dark:text-slate-500">
                      {bond.ytmPct !== null ? 'Compound IRR to Maturity' : 'Secondary trade required'}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-surface-raised/40 dark:bg-slate-800/40 border border-border dark:border-slate-800">
                    <span className="text-[11px] text-muted dark:text-slate-400">4. Maturity Tenor</span>
                    <div className="text-base font-bold text-foreground dark:text-slate-100 font-mono mt-0.5">
                      {bond.residualMaturityYears.toFixed(1)} yrs
                    </div>
                    <span className="text-[10px] text-muted dark:text-slate-500">Matures: {bond.maturityDate}</span>
                  </div>
                </div>

                {/* Instrument Specific Details */}
                <div className="p-4 rounded-xl bg-surface-raised/30 dark:bg-slate-800/30 border border-border dark:border-slate-800 space-y-3">
                  <h4 className="text-xs font-bold text-foreground dark:text-slate-200">Instrument Specifications</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-muted dark:text-slate-400 text-[11px]">Seniority & Security:</span>
                      <div className="font-semibold text-foreground dark:text-slate-200 mt-0.5">{bond.securityType}</div>
                    </div>
                    <div>
                      <span className="text-muted dark:text-slate-400 text-[11px]">Tax Status:</span>
                      <div className="font-semibold text-foreground dark:text-slate-200 mt-0.5">{bond.taxStatus}</div>
                    </div>
                    <div>
                      <span className="text-muted dark:text-slate-400 text-[11px]">Secondary Market Liquidity:</span>
                      <div className="font-semibold text-foreground dark:text-slate-200 mt-0.5">{bond.tradingStatus}</div>
                    </div>
                    <div>
                      <span className="text-muted dark:text-slate-400 text-[11px]">Next Coupon Date:</span>
                      <div className="font-mono text-foreground dark:text-slate-200 mt-0.5">{bond.nextInterestDate}</div>
                    </div>
                    <div>
                      <span className="text-muted dark:text-slate-400 text-[11px]">Min Investment Lot:</span>
                      <div className="font-mono text-foreground dark:text-slate-200 mt-0.5">
                        ₹{bond.minimumInvestmentInr.toLocaleString('en-IN')} ({bond.minimumLotSizeUnits} units)
                      </div>
                    </div>
                    <div>
                      <span className="text-muted dark:text-slate-400 text-[11px]">Regulatory Data Source:</span>
                      <div className="text-foreground dark:text-slate-300 mt-0.5">{bond.dataSource}</div>
                    </div>
                  </div>
                </div>

                {/* Overview Text */}
                <p className="text-xs text-foreground dark:text-slate-300 leading-relaxed bg-surface-raised/20 dark:bg-slate-800/20 p-4 rounded-xl border border-border dark:border-slate-800">
                  {bond.overviewSummary}
                </p>
              </div>
            )}

            {/* ─── TAB 2: CASH FLOW TIMELINE ─── */}
            {activeTab === 'cashflows' && (
              <div className="space-y-5">
                <div className="p-4 rounded-xl bg-surface-raised/30 dark:bg-slate-800/30 border border-border dark:border-slate-800 space-y-1">
                  <h4 className="text-xs font-bold text-foreground dark:text-slate-200 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-indigo-400" />
                    <span>Contractual Payment Milestones</span>
                  </h4>
                  <p className="text-[11px] text-muted dark:text-slate-400">
                    Cash flows represent contractual commitments by the issuer on a per-unit basis (Face Value ₹{bond.faceValue.toFixed(2)}).
                  </p>
                </div>

                {/* Timeline Visualizer */}
                <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                  {bond.cashFlowTimeline.map((cf, idx) => (
                    <div key={idx} className="relative space-y-1">
                      <div
                        className={`absolute -left-6 top-1 w-4 h-4 rounded-full border-2 ${
                          cf.type === 'COUPON_AND_PRINCIPAL'
                            ? 'bg-emerald-500 border-emerald-400 ring-4 ring-emerald-500/20'
                            : 'bg-indigo-500 border-indigo-400'
                        }`}
                      />
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono font-bold text-foreground dark:text-slate-200">{cf.date}</span>
                        <span
                          className={`font-mono font-bold ${
                            cf.type === 'COUPON_AND_PRINCIPAL' ? 'text-emerald-700 dark:text-emerald-400' : 'text-indigo-400'
                          }`}
                        >
                          ₹{cf.amountPerUnit.toFixed(2)} / unit
                        </span>
                      </div>
                      <p className="text-[11px] text-muted dark:text-slate-400">{cf.description}</p>
                    </div>
                  ))}
                </div>

                <div className="p-3 rounded-lg bg-surface-raised/30 dark:bg-slate-800/30 border border-border dark:border-slate-800 text-[10px] text-muted dark:text-slate-400">
                  <strong>Reinvestment Risk:</strong> To realize the calculated YTM, all intermediate coupon payments
                  must be reinvested at the same rate. If market interest rates decline, reinvested coupons earn less.
                </div>
              </div>
            )}

            {/* ─── TAB 3: CREDIT RATING & ISSUER ─── */}
            {activeTab === 'credit' && (
              <div className="space-y-5">
                <div className="p-4 rounded-xl bg-surface-raised/40 dark:bg-slate-800/40 border border-border/60 dark:border-slate-700/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground dark:text-slate-200">Official Credit Rating</span>
                    <span className="px-3 py-1 rounded-full text-xs font-bold font-mono bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                      {bond.creditRating} by {bond.ratingAgency}
                    </span>
                  </div>
                  <p className="text-xs text-foreground dark:text-slate-300 leading-relaxed">{bond.ratingRationale}</p>
                </div>

                {/* Regulatory Rating Disclaimer (Section 11 requirement) */}
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <Shield className="w-4 h-4 shrink-0 text-amber-700 dark:text-amber-400" />
                    <span>Regulatory Distinction: Credit Ratings vs Repayment Guarantee</span>
                  </div>
                  <p className="text-[11px] text-foreground dark:text-slate-300 leading-relaxed">
                    Credit ratings measure a credit rating agency&apos;s forward-looking opinion of creditworthiness
                    and default probability at a specific point in time. <strong>A credit rating is not a guarantee of repayment.</strong>{' '}
                    Even AAA-rated corporate debt carries non-zero default risk and can experience downgrade risk.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-surface-raised/30 dark:bg-slate-800/30 border border-border dark:border-slate-800 space-y-2">
                  <h4 className="text-xs font-bold text-foreground dark:text-slate-200">Issuer Profile: {bond.issuer}</h4>
                  <p className="text-xs text-foreground dark:text-slate-300 leading-relaxed">
                    Category: <strong>{bond.bondCategory}</strong>. Sovereign securities are backed by the full
                    sovereign credit of the Union Government of India, while PSU bonds are backed by government-owned
                    enterprises with high government shareholding. Corporate NCDs are backed strictly by the balance
                    sheet of the issuing corporation.
                  </p>
                </div>
              </div>
            )}

            {/* ─── TAB 4: DURATION & RISK ANALYSIS ─── */}
            {activeTab === 'risk' && (
              <div className="space-y-5">
                <div className="p-4 rounded-xl bg-surface-raised/40 dark:bg-slate-800/40 border border-border/60 dark:border-slate-700/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground dark:text-slate-200">Observed Exposure Classification</span>
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                      {bond.observedRiskLevel}
                    </span>
                  </div>
                  <p className="text-xs text-foreground dark:text-slate-300 leading-relaxed">{bond.riskRationale}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-surface-raised/20 dark:bg-slate-800/20 border border-border dark:border-slate-800">
                    <span className="text-[11px] text-muted dark:text-slate-400">Credit Default Risk</span>
                    <div className="text-xs font-bold text-foreground dark:text-slate-200 mt-1">
                      {bond.riskFactors.creditDefaultRisk}
                    </div>
                    <p className="text-[10px] text-muted dark:text-slate-400 mt-0.5">
                      Probability of contractual interest or principal default by {bond.issuer}.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-surface-raised/20 dark:bg-slate-800/20 border border-border dark:border-slate-800">
                    <span className="text-[11px] text-muted dark:text-slate-400">Duration (Interest-Rate Risk)</span>
                    <div className="text-xs font-bold text-foreground dark:text-slate-200 mt-1">
                      {bond.riskFactors.durationInterestRateRisk}
                    </div>
                    <p className="text-[10px] text-muted dark:text-slate-400 mt-0.5">
                      Bonds with longer maturities experience larger market price drops when RBI raises benchmark repo rates.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-surface-raised/20 dark:bg-slate-800/20 border border-border dark:border-slate-800">
                    <span className="text-[11px] text-muted dark:text-slate-400">Secondary Market Liquidity</span>
                    <div className="text-xs font-bold text-foreground dark:text-slate-200 mt-1">
                      {bond.riskFactors.liquidityRisk}
                    </div>
                    <p className="text-[10px] text-muted dark:text-slate-400 mt-0.5">
                      Retail liquidity on exchange debt segments can be low; selling prior to maturity may incur bid-ask slippage.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-surface-raised/20 dark:bg-slate-800/20 border border-border dark:border-slate-800">
                    <span className="text-[11px] text-muted dark:text-slate-400">Seniority & Subordination</span>
                    <div className="text-xs font-bold text-foreground dark:text-slate-200 mt-1">
                      {bond.riskFactors.subordinationRisk}
                    </div>
                    <p className="text-[10px] text-muted dark:text-slate-400 mt-0.5">
                      Senior secured claims get priority in liquidation; Tier-II subordinated bonds absorb losses before senior creditors.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 sm:p-5 border-t border-border dark:border-slate-800 bg-surface/90 dark:bg-slate-900/90 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <Link
                href={`/insights?q=${encodeURIComponent(`Explain credit rating, duration risk, and cash flow certainty for ${bond.name} (${bond.symbol}) issued by ${bond.issuer}.`)}`}
                className="btn-secondary text-xs py-2 px-3.5 inline-flex items-center gap-1.5 border-indigo-500/30 text-indigo-300 hover:text-foreground dark:hover:text-white"
              >
                <Compass className="w-3.5 h-3.5 text-indigo-400" />
                <span>Ask FINOVA Intelligence</span>
              </Link>

              {isHeldInPortfolio && (
                <Link
                  href="/analysis"
                  className="btn-secondary text-xs py-2 px-3.5 inline-flex items-center gap-1.5 text-foreground dark:text-slate-300 hover:text-foreground dark:hover:text-white"
                >
                  <Layers className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                  <span>View in Investment X-Ray</span>
                </Link>
              )}
            </div>

            <button
              onClick={onClose}
              className="text-xs py-2 px-4 rounded-xl bg-surface-raised dark:bg-slate-800 hover:bg-surface-raised dark:hover:bg-slate-700 text-foreground dark:text-slate-200 transition-colors"
            >
              Close Research
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
