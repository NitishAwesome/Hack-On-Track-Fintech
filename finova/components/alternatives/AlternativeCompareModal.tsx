'use client';

// ============================================================
// FINOVA — Alternative Investments Comparison Modal
// components/alternatives/AlternativeCompareModal.tsx
//
// Honest side-by-side comparison for 2 to 4 instruments of the
// same asset class (REITs, InvITs, or Bonds).
// Displays ONLY verified fields. Zero fabricated figures.
// ============================================================

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Scale,
  AlertTriangle,
  Shield,
} from 'lucide-react';
import type { ReitItem } from '@/lib/data/reitData';
import type { InvitItem } from '@/lib/data/invitData';
import type { BondItem } from '@/lib/data/bondData';

export type CompareItem =
  | { kind: 'reit'; data: ReitItem }
  | { kind: 'invit'; data: InvitItem }
  | { kind: 'bond'; data: BondItem };

interface Props {
  isOpen: boolean;
  onClose: () => void;
  items: CompareItem[];
  onRemoveItem: (symbol: string) => void;
}

export function AlternativeCompareModal({ isOpen, onClose, items, onRemoveItem }: Props) {
  if (!isOpen || items.length === 0) return null;

  const assetKind = items[0].kind;
  const kindTitle =
    assetKind === 'reit' ? 'REITs' : assetKind === 'invit' ? 'InvITs' : 'Bonds & Fixed Income';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900/90">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <Scale className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-100">
                  Side-by-Side Comparison: {kindTitle}
                </h2>
                <p className="text-xs text-slate-400">
                  Comparing {items.length} verified instruments on genuine regulatory and market disclosures.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              aria-label="Close Comparison"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body: Scrollable Table */}
          <div className="p-4 sm:p-6 overflow-y-auto overflow-x-auto space-y-6 flex-1">
            {items.length < 2 && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Select at least 2 instruments to view meaningful side-by-side metric comparisons.</span>
              </div>
            )}

            {/* Comparison Grid */}
            <div className="min-w-[640px]">
              <table className="w-full text-left text-xs border-collapse">
                {/* Column Headers */}
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="py-3 px-3 font-semibold text-slate-400 w-1/4">Metric / Dimension</th>
                    {items.map((it) => (
                      <th key={it.data.symbol} className="py-3 px-3 font-bold text-slate-100">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate">{it.data.name}</span>
                          {items.length > 2 && (
                            <button
                              onClick={() => onRemoveItem(it.data.symbol)}
                              className="text-slate-500 hover:text-red-400 p-1"
                              title="Remove from comparison"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400 font-normal mt-0.5">
                          {it.data.symbol} • {it.data.isin}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800/60">
                  {/* REIT SPECIFIC COMPARISONS */}
                  {assetKind === 'reit' && (
                    <>
                      <tr>
                        <td className="py-2.5 px-3 font-medium text-slate-300">Unit Price (₹)</td>
                        {items.map((it) => {
                          const r = it.data as ReitItem;
                          return (
                            <td key={r.symbol} className="py-2.5 px-3 font-mono font-semibold text-slate-100">
                              ₹{r.unitPrice.toFixed(2)}
                              <span
                                className={`ml-2 text-[10px] ${
                                  r.dayChange >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                }`}
                              >
                                {r.dayChange >= 0 ? '+' : ''}
                                {r.dayChangePct.toFixed(2)}%
                              </span>
                            </td>
                          );
                        })}
                      </tr>

                      <tr className="bg-slate-800/20">
                        <td className="py-2.5 px-3 font-medium text-slate-300">Trailing Distribution Yield</td>
                        {items.map((it) => {
                          const r = it.data as ReitItem;
                          return (
                            <td key={r.symbol} className="py-2.5 px-3 font-bold text-emerald-400">
                              {r.trailingYieldPct.toFixed(2)}%
                              <div className="text-[10px] text-slate-400 font-normal">
                                DPU: ₹{r.trailingAnnualDpu.toFixed(2)}/yr
                              </div>
                            </td>
                          );
                        })}
                      </tr>

                      <tr>
                        <td className="py-2.5 px-3 font-medium text-slate-300">Property Focus</td>
                        {items.map((it) => {
                          const r = it.data as ReitItem;
                          return (
                            <td key={r.symbol} className="py-2.5 px-3 text-slate-200">
                              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[11px]">
                                {r.propertyType}
                              </span>
                            </td>
                          );
                        })}
                      </tr>

                      <tr className="bg-slate-800/20">
                        <td className="py-2.5 px-3 font-medium text-slate-300">Sponsor / Manager</td>
                        {items.map((it) => {
                          const r = it.data as ReitItem;
                          return (
                            <td key={r.symbol} className="py-2.5 px-3 text-slate-300">
                              {r.sponsor}
                            </td>
                          );
                        })}
                      </tr>

                      <tr>
                        <td className="py-2.5 px-3 font-medium text-slate-300">Occupancy & WALE</td>
                        {items.map((it) => {
                          const r = it.data as ReitItem;
                          return (
                            <td key={r.symbol} className="py-2.5 px-3 text-slate-200 font-mono">
                              Occupancy: <strong>{r.occupancyPct.toFixed(1)}%</strong>
                              <div className="text-[10px] text-slate-400 font-sans">
                                WALE: {r.waleYears.toFixed(1)} years
                              </div>
                            </td>
                          );
                        })}
                      </tr>

                      <tr className="bg-slate-800/20">
                        <td className="py-2.5 px-3 font-medium text-slate-300">Net Debt to GAV (Cap: 49%)</td>
                        {items.map((it) => {
                          const r = it.data as ReitItem;
                          return (
                            <td key={r.symbol} className="py-2.5 px-3 font-mono text-slate-200">
                              <span
                                className={
                                  r.netDebtToGavPct > 35 ? 'text-amber-400 font-bold' : 'text-slate-200'
                                }
                              >
                                {r.netDebtToGavPct.toFixed(1)}%
                              </span>
                              <div className="text-[10px] text-slate-400 font-sans">SEBI limit: 49%</div>
                            </td>
                          );
                        })}
                      </tr>

                      <tr>
                        <td className="py-2.5 px-3 font-medium text-slate-300">Portfolio Area & Market Cap</td>
                        {items.map((it) => {
                          const r = it.data as ReitItem;
                          return (
                            <td key={r.symbol} className="py-2.5 px-3 text-slate-300">
                              {r.portfolioAreaMsft} msft
                              <div className="text-[10px] text-slate-400 font-mono">
                                MCap: ₹{(r.marketCapCr / 1000).toFixed(1)}k Cr
                              </div>
                            </td>
                          );
                        })}
                      </tr>

                      <tr className="bg-slate-800/20">
                        <td className="py-2.5 px-3 font-medium text-slate-300">Observed Risk Classification</td>
                        {items.map((it) => {
                          const r = it.data as ReitItem;
                          return (
                            <td key={r.symbol} className="py-2.5 px-3">
                              <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                                {r.observedRiskLevel}
                              </span>
                              <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">{r.riskRationale}</p>
                            </td>
                          );
                        })}
                      </tr>
                    </>
                  )}

                  {/* INVIT SPECIFIC COMPARISONS */}
                  {assetKind === 'invit' && (
                    <>
                      <tr>
                        <td className="py-2.5 px-3 font-medium text-slate-300">Unit Price (₹)</td>
                        {items.map((it) => {
                          const i = it.data as InvitItem;
                          return (
                            <td key={i.symbol} className="py-2.5 px-3 font-mono font-semibold text-slate-100">
                              ₹{i.unitPrice.toFixed(2)}
                              <span
                                className={`ml-2 text-[10px] ${
                                  i.dayChange >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                }`}
                              >
                                {i.dayChange >= 0 ? '+' : ''}
                                {i.dayChangePct.toFixed(2)}%
                              </span>
                            </td>
                          );
                        })}
                      </tr>

                      <tr className="bg-slate-800/20">
                        <td className="py-2.5 px-3 font-medium text-slate-300">Trailing Distribution Yield</td>
                        {items.map((it) => {
                          const i = it.data as InvitItem;
                          return (
                            <td key={i.symbol} className="py-2.5 px-3 font-bold text-cyan-400">
                              {i.trailingYieldPct.toFixed(2)}%
                              <div className="text-[10px] text-slate-400 font-normal">
                                Annual DPU: ₹{i.trailingAnnualDpu.toFixed(2)}
                              </div>
                            </td>
                          );
                        })}
                      </tr>

                      <tr>
                        <td className="py-2.5 px-3 font-medium text-slate-300">Infrastructure Category</td>
                        {items.map((it) => {
                          const i = it.data as InvitItem;
                          return (
                            <td key={i.symbol} className="py-2.5 px-3 text-slate-200">
                              <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 text-[11px] border border-cyan-500/20">
                                {i.infraCategory}
                              </span>
                            </td>
                          );
                        })}
                      </tr>

                      <tr className="bg-slate-800/20">
                        <td className="py-2.5 px-3 font-medium text-slate-300">Concession Model & Horizon</td>
                        {items.map((it) => {
                          const i = it.data as InvitItem;
                          return (
                            <td key={i.symbol} className="py-2.5 px-3 text-slate-200">
                              <strong>{i.averageRemainingConcessionYears.toFixed(1)} years left</strong>
                              <div className="text-[10px] text-slate-400">
                                {i.isConcessionFinite ? 'Finite BOT toll (Amortizing)' : 'Regulated Tariff (Renewable)'}
                              </div>
                            </td>
                          );
                        })}
                      </tr>

                      <tr>
                        <td className="py-2.5 px-3 font-medium text-slate-300">Credit Rating</td>
                        {items.map((it) => {
                          const i = it.data as InvitItem;
                          return (
                            <td key={i.symbol} className="py-2.5 px-3 text-emerald-400 font-mono font-bold">
                              {i.creditRating}
                              <div className="text-[10px] text-slate-400 font-sans font-normal">
                                by {i.ratingAgency}
                              </div>
                            </td>
                          );
                        })}
                      </tr>

                      <tr className="bg-slate-800/20">
                        <td className="py-2.5 px-3 font-medium text-slate-300">Net Debt to GAV</td>
                        {items.map((it) => {
                          const i = it.data as InvitItem;
                          return (
                            <td key={i.symbol} className="py-2.5 px-3 font-mono text-slate-200">
                              {i.netDebtToGavPct.toFixed(1)}%
                              <div className="text-[10px] text-slate-400 font-sans">SEBI Cap: 70%</div>
                            </td>
                          );
                        })}
                      </tr>

                      <tr>
                        <td className="py-2.5 px-3 font-medium text-slate-300">Sponsor</td>
                        {items.map((it) => {
                          const i = it.data as InvitItem;
                          return (
                            <td key={i.symbol} className="py-2.5 px-3 text-slate-300">
                              {i.sponsor}
                            </td>
                          );
                        })}
                      </tr>
                    </>
                  )}

                  {/* BOND SPECIFIC COMPARISONS */}
                  {assetKind === 'bond' && (
                    <>
                      <tr>
                        <td className="py-2.5 px-3 font-medium text-slate-300">Issuer & Category</td>
                        {items.map((it) => {
                          const b = it.data as BondItem;
                          return (
                            <td key={b.symbol} className="py-2.5 px-3 text-slate-200">
                              <div className="font-bold">{b.issuer}</div>
                              <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400">
                                {b.bondCategory}
                              </span>
                            </td>
                          );
                        })}
                      </tr>

                      <tr className="bg-slate-800/20">
                        <td className="py-2.5 px-3 font-medium text-slate-300">Contractual Coupon Rate</td>
                        {items.map((it) => {
                          const b = it.data as BondItem;
                          return (
                            <td key={b.symbol} className="py-2.5 px-3 font-bold text-indigo-400 font-mono">
                              {b.couponRate.toFixed(2)}% p.a.
                              <div className="text-[10px] text-slate-400 font-normal">
                                {b.payoutFrequency} payout
                              </div>
                            </td>
                          );
                        })}
                      </tr>

                      <tr>
                        <td className="py-2.5 px-3 font-medium text-slate-300">Last Traded Price & Current Yield</td>
                        {items.map((it) => {
                          const b = it.data as BondItem;
                          return (
                            <td key={b.symbol} className="py-2.5 px-3 font-mono text-slate-200">
                              {b.isPriceAvailable && b.lastTradedPrice !== null ? (
                                <>
                                  ₹{b.lastTradedPrice.toFixed(2)}
                                  <div className="text-[10px] text-emerald-400 font-sans">
                                    Current Yield: {b.currentYieldPct?.toFixed(2)}%
                                  </div>
                                </>
                              ) : (
                                <span className="text-amber-400 text-[11px] font-sans">
                                  Secondary trade price unavailable
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>

                      <tr className="bg-slate-800/20">
                        <td className="py-2.5 px-3 font-medium text-slate-300">Yield to Maturity (YTM)</td>
                        {items.map((it) => {
                          const b = it.data as BondItem;
                          return (
                            <td key={b.symbol} className="py-2.5 px-3 font-mono font-bold">
                              {b.ytmPct !== null ? (
                                <span className="text-emerald-400">{b.ytmPct.toFixed(2)}%</span>
                              ) : (
                                <span className="text-slate-500 font-sans font-normal text-[11px]">
                                  N/A (Trade price required)
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>

                      <tr>
                        <td className="py-2.5 px-3 font-medium text-slate-300">Maturity Date & Residual Tenor</td>
                        {items.map((it) => {
                          const b = it.data as BondItem;
                          return (
                            <td key={b.symbol} className="py-2.5 px-3 text-slate-300 font-mono">
                              {b.maturityDate}
                              <div className="text-[10px] text-slate-400 font-sans">
                                {b.residualMaturityYears.toFixed(1)} years residual
                              </div>
                            </td>
                          );
                        })}
                      </tr>

                      <tr className="bg-slate-800/20">
                        <td className="py-2.5 px-3 font-medium text-slate-300">Credit Rating</td>
                        {items.map((it) => {
                          const b = it.data as BondItem;
                          return (
                            <td key={b.symbol} className="py-2.5 px-3 font-bold text-slate-100 font-mono">
                              {b.creditRating}
                              <div className="text-[10px] text-slate-400 font-normal font-sans">
                                {b.ratingAgency}
                              </div>
                            </td>
                          );
                        })}
                      </tr>

                      <tr>
                        <td className="py-2.5 px-3 font-medium text-slate-300">Seniority & Security</td>
                        {items.map((it) => {
                          const b = it.data as BondItem;
                          return (
                            <td key={b.symbol} className="py-2.5 px-3 text-slate-300">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] ${
                                  b.securityType.includes('Subordinated')
                                    ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                                    : 'bg-slate-800 text-slate-300'
                                }`}
                              >
                                {b.securityType}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>

            {/* Regulatory Grounding Footer */}
            <div className="p-3.5 rounded-xl bg-slate-800/30 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2.5">
              <Shield className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-300">Methodology & Source Attribution:</strong> Metrics displayed
                are gathered exclusively from verified exchange listings (NSE/BSE), SEBI disclosures, and
                regulatory filings. Bond yields distinguish contractual coupon from YTM, and illiquid instruments
                transparently report missing trades rather than fabricating yields.
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
