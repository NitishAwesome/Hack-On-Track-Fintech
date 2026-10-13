'use client';
import { useDialogFocus } from '@/lib/hooks/useDialogFocus';
import { formatResearchNumber } from '@/lib/research/format';

// ============================================================
// FINOVA — InvIT Research Detail Modal
// components/alternatives/InvitDetailModal.tsx
//
// Dedicated research terminal for Indian Infrastructure Investment Trusts:
// - Underlying infrastructure assets (Transmission, BOT Toll Roads)
// - Concession lifecycle & Finite concession amortization vs perpetual equity
// - Distribution history & Tax streams (Interest vs Dividend vs Capital Repayment)
// - Multi-factor risk analysis (Traffic risk, Discom counterparty risk, Leverage)
// ============================================================

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Zap,
  Layers,
  Compass,
  Info,
} from 'lucide-react';
import type { InvitItem } from '@/lib/data/invitData';

interface Props {
  invit: InvitItem | null;
  isOpen: boolean;
  onClose: () => void;
  isHeldInPortfolio?: boolean;
}

type ChartPeriod = '1D' | '1W' | '1M' | '3M' | '1Y' | '5Y' | 'MAX';

export function InvitDetailModal({ invit, isOpen, onClose, isHeldInPortfolio = false }: Props) {
  const dialogRef = useDialogFocus(isOpen && !!invit, onClose);
  const [activeTab, setActiveTab] = useState<'overview' | 'distributions' | 'assets' | 'risk'>('overview');
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>('1Y');

  if (!isOpen || !invit) return null;

  const pricePositionPct = invit.high52w !== null && invit.low52w !== null && invit.unitPrice !== null && invit.high52w > invit.low52w
    ? Math.min(100, Math.max(0, (invit.unitPrice - invit.low52w) / (invit.high52w - invit.low52w) * 100)) : null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm">
        <motion.div
          ref={dialogRef} role="dialog" aria-modal="true" aria-label={`${invit.name} research`} tabIndex={-1}
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
                <span className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-500/20">
                  <Zap className="w-4 h-4" />
                </span>
                <span className="text-xs font-mono font-semibold text-cyan-700 dark:text-cyan-300">{invit.symbol}</span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-surface-raised dark:bg-slate-800 text-foreground dark:text-slate-300">
                  {invit.infraCategory}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-surface-raised/80 dark:bg-slate-800/80 text-muted dark:text-slate-400 font-mono">
                  {invit.isin}
                </span>
                {isHeldInPortfolio && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                    Held in Portfolio
                  </span>
                )}
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-foreground dark:text-slate-100">{invit.name}</h2>
              <p className="text-xs text-muted dark:text-slate-400">
                Sponsor: <span className="text-foreground dark:text-slate-200">{invit.sponsor}</span> • Credit Rating:{' '}
                <strong className="text-emerald-700 dark:text-emerald-400 font-mono">{invit.creditRating}</strong> ({invit.ratingAgency})
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-lg sm:text-xl font-bold font-mono text-foreground dark:text-slate-100">
                  ₹{formatResearchNumber(invit.unitPrice, 2)}
                </div>
                <div
                  className={`text-xs font-mono font-semibold ${
                    (invit.dayChange !== null && invit.dayChange >= 0) ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                  }`}
                >
                  {(invit.dayChange !== null && invit.dayChange >= 0) ? '+' : ''}
                  {formatResearchNumber(invit.dayChange, 2)} ({formatResearchNumber(invit.dayChangePct, 2)}%)
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
              { id: 'overview', label: 'Overview & Valuation' },
              { id: 'distributions', label: 'Distributions & Yield' },
              { id: 'assets', label: 'Infrastructure Assets' },
              { id: 'risk', label: 'Concession & Risk Analysis' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'overview' | 'distributions' | 'assets' | 'risk')}
                className={`py-3 px-3 text-xs font-semibold border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-cyan-500 text-cyan-700 dark:text-cyan-400'
                    : 'border-transparent text-muted dark:text-slate-400 hover:text-foreground dark:hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Body Content */}
          <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
            {/* ─── TAB 1: OVERVIEW ─── */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <p className="text-xs text-foreground dark:text-slate-300 leading-relaxed bg-surface-raised/20 dark:bg-slate-800/20 p-4 rounded-xl border border-border dark:border-slate-800">
                  {invit.overviewSummary}
                </p>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-xl bg-surface-raised/40 dark:bg-slate-800/40 border border-border dark:border-slate-800">
                    <span className="text-[11px] text-muted dark:text-slate-400">Trailing Yield</span>
                    <div className="text-base font-bold text-cyan-700 dark:text-cyan-400 font-mono mt-0.5">
                      {formatResearchNumber(invit.trailingYieldPct, 2)}%
                    </div>
                    <span className="text-[10px] text-muted dark:text-slate-500">₹{formatResearchNumber(invit.trailingAnnualDpu, 2)}/yr DPU</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-surface-raised/40 dark:bg-slate-800/40 border border-border dark:border-slate-800">
                    <span className="text-[11px] text-muted dark:text-slate-400">Concession Horizon</span>
                    <div className="text-base font-bold text-foreground dark:text-slate-100 font-mono mt-0.5">
                      {formatResearchNumber(invit.averageRemainingConcessionYears, 1)} yrs
                    </div>
                    <span className="text-[10px] text-muted dark:text-slate-500">
                      {invit.isConcessionFinite === null ? 'Unavailable' : invit.isConcessionFinite ? 'Finite BOT Toll' : 'Regulated Tariff'}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-surface-raised/40 dark:bg-slate-800/40 border border-border dark:border-slate-800">
                    <span className="text-[11px] text-muted dark:text-slate-400">Net Debt to GAV</span>
                    <div className="text-base font-bold text-foreground dark:text-slate-100 font-mono mt-0.5">
                      {formatResearchNumber(invit.netDebtToGavPct, 1)}%
                    </div>
                    <span className="text-[10px] text-muted dark:text-slate-500">SEBI Cap: 70.0%</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-surface-raised/40 dark:bg-slate-800/40 border border-border dark:border-slate-800">
                    <span className="text-[11px] text-muted dark:text-slate-400">Credit Rating</span>
                    <div className="text-base font-bold text-emerald-700 dark:text-emerald-400 font-mono mt-0.5">
                      {invit.creditRating}
                    </div>
                    <span className="text-[10px] text-muted dark:text-slate-500">by {invit.ratingAgency}</span>
                  </div>
                </div>

                {/* Range Bar */}
                <div className="p-5 rounded-xl bg-surface-raised/30 dark:bg-slate-800/30 border border-border dark:border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-foreground dark:text-slate-200">52-Week Price Range</h4>
                      <p className="text-[11px] text-muted dark:text-slate-400">Trading interval on {invit.exchange}</p>
                    </div>

                    <div className="flex items-center gap-1 bg-surface-raised/60 dark:bg-slate-800/60 p-1 rounded-lg border border-border/60 dark:border-slate-700/60">
                      {(['1D', '1W', '1M', '3M', '1Y', '5Y', 'MAX'] as ChartPeriod[]).map((period) => (
                        <button
                          key={period}
                          onClick={() => setChartPeriod(period)}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                            chartPeriod === period
                              ? 'bg-cyan-500 text-white shadow-sm'
                              : 'text-muted dark:text-slate-400 hover:text-foreground dark:hover:text-slate-200'
                          }`}
                        >
                          {period}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2">
                    <div className="flex justify-between text-[11px] font-mono text-muted dark:text-slate-400">
                      <span>52W Low: ₹{formatResearchNumber(invit.low52w, 2)}</span>
                      <span className="font-bold text-foreground dark:text-slate-200">Current: ₹{formatResearchNumber(invit.unitPrice, 2)}</span>
                      <span>52W High: ₹{formatResearchNumber(invit.high52w, 2)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-surface-raised dark:bg-slate-800 relative overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full"
                        style={{ width: `${pricePositionPct ?? 0}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-muted dark:text-slate-500 text-center pt-1">
                      {pricePositionPct === null ? 'Price range unavailable. ' : ''}Identity source: <a href={invit.dataSource} target="_blank" rel="noopener noreferrer" className="underline">Official trust disclosures</a> · reviewed {invit.lastUpdated}.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ─── TAB 2: DISTRIBUTIONS ─── */}
            {activeTab === 'distributions' && (
              <div className="space-y-5">
                <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-700 dark:text-cyan-300 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <Info className="w-4 h-4 shrink-0" />
                    <span>Understanding InvIT Distribution Cash Flows</span>
                  </div>
                  <p className="text-[11px] text-foreground dark:text-slate-300 leading-relaxed">
                    Distributions can include interest, dividends and repayment of capital. Review the trust’s published statement for each period and the remaining life of its infrastructure concessions.
                  </p>
                </div>

                <div className="border border-border dark:border-slate-800 rounded-xl overflow-hidden">
                  <div className="p-3 bg-surface-raised/40 dark:bg-slate-800/40 border-b border-border dark:border-slate-800 flex justify-between items-center">
                    <span className="text-xs font-bold text-foreground dark:text-slate-200">Historical Distribution History</span>
                    <span className="text-[11px] text-muted dark:text-slate-400 font-mono">
                      Annual DPU: ₹{formatResearchNumber(invit.trailingAnnualDpu, 2)}/unit
                    </span>
                  </div>

                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border dark:border-slate-800 bg-surface-raised/20 dark:bg-slate-800/20 text-muted dark:text-slate-400">
                        <th className="py-2.5 px-3">Period</th>
                        <th className="py-2.5 px-3">Record Date</th>
                        <th className="py-2.5 px-3 font-mono">Interest (₹)</th>
                        <th className="py-2.5 px-3 font-mono">Dividend (₹)</th>
                        <th className="py-2.5 px-3 font-mono">Capital Return (₹)</th>
                        <th className="py-2.5 px-3 font-mono font-bold text-foreground dark:text-slate-200">Total DPU (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50 dark:divide-slate-800/50">
                      {invit.distributionsHistory.map((d) => (
                        <tr key={d.period} className="hover:bg-surface-raised/20 dark:hover:bg-slate-800/20">
                          <td className="py-2 px-3 font-semibold text-foreground dark:text-slate-200">{d.period}</td>
                          <td className="py-2 px-3 text-muted dark:text-slate-400 font-mono text-[11px]">{d.recordDate}</td>
                          <td className="py-2 px-3 font-mono text-foreground dark:text-slate-300">₹{formatResearchNumber(d.interestDpu, 2)}</td>
                          <td className="py-2 px-3 font-mono text-foreground dark:text-slate-300">₹{formatResearchNumber(d.dividendDpu, 2)}</td>
                          <td className="py-2 px-3 font-mono text-foreground dark:text-slate-300">₹{formatResearchNumber(d.capitalRepaymentDpu, 2)}</td>
                          <td className="py-2 px-3 font-mono font-bold text-cyan-700 dark:text-cyan-400">₹{formatResearchNumber(d.totalDpu, 2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {invit.distributionsHistory.length === 0 && <p className="p-3 text-xs text-muted dark:text-slate-400">No reviewed distribution records available.</p>}
                </div>

                <div className="p-3 rounded-lg bg-surface-raised/30 dark:bg-slate-800/30 border border-border dark:border-slate-800 text-[10px] text-muted dark:text-slate-400">
                  <strong>Research consideration:</strong> Review the mix of income and capital repayment, concession expiry, debt and replacement assets before interpreting a distribution yield.
                </div>
              </div>
            )}

            {/* ─── TAB 3: ASSETS ─── */}
            {activeTab === 'assets' && (
              <div className="space-y-5">
                <div className="p-4 rounded-xl bg-surface-raised/30 dark:bg-slate-800/30 border border-border dark:border-slate-800 space-y-2">
                  <h4 className="text-xs font-bold text-foreground dark:text-slate-200">Concession Model & Revenue Structure</h4>
                  <p className="text-xs text-foreground dark:text-slate-300 leading-relaxed">{invit.concessionType}</p>
                  <div className="pt-2 flex flex-wrap gap-2 text-xs">
                    <span className="px-2.5 py-1 rounded bg-surface-raised dark:bg-slate-800 font-mono text-cyan-700 dark:text-cyan-300">
                      {invit.networkSizeKm} km operational network
                    </span>
                    <span className="px-2.5 py-1 rounded bg-surface-raised dark:bg-slate-800 font-mono text-foreground dark:text-slate-300">
                      {invit.operationalSpvCount} Operating SPVs
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-foreground dark:text-slate-200">Operational Assets</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {invit.majorAssets.map((asset) => (
                      <div
                        key={asset}
                        className="p-3 rounded-xl bg-surface-raised/20 dark:bg-slate-800/20 border border-border dark:border-slate-800 text-xs text-foreground dark:text-slate-300 flex items-center gap-2"
                      >
                        <Zap className="w-3.5 h-3.5 text-cyan-700 dark:text-cyan-400 shrink-0" />
                        <span className="truncate">{asset}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-surface-raised/30 dark:bg-slate-800/30 border border-border dark:border-slate-800 space-y-1.5">
                  <h4 className="text-xs font-bold text-foreground dark:text-slate-200">Key Counterparties & Revenue Pool</h4>
                  <p className="text-xs text-foreground dark:text-slate-300">{invit.keyCounterparties.join(', ')}</p>
                </div>
              </div>
            )}

            {/* ─── TAB 4: RISK ANALYSIS ─── */}
            {activeTab === 'risk' && (
              <div className="space-y-5">
                <div className="p-4 rounded-xl bg-surface-raised/40 dark:bg-slate-800/40 border border-border/60 dark:border-slate-700/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground dark:text-slate-200">Observed Exposure Classification</span>
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                      {invit.observedRiskLevel}
                    </span>
                  </div>
                  <p className="text-xs text-foreground dark:text-slate-300 leading-relaxed">{invit.riskRationale}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-surface-raised/20 dark:bg-slate-800/20 border border-border dark:border-slate-800">
                    <span className="text-[11px] text-muted dark:text-slate-400">Traffic / Volume Exposure</span>
                    <div className="text-xs font-bold text-foreground dark:text-slate-200 mt-1">
                      {invit.riskFactors.trafficOrVolumeRisk}
                    </div>
                    <p className="text-[10px] text-muted dark:text-slate-400 mt-0.5">
                      Power grids earn fixed availability tariffs regardless of power flow; toll roads depend directly on vehicle traffic.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-surface-raised/20 dark:bg-slate-800/20 border border-border dark:border-slate-800">
                    <span className="text-[11px] text-muted dark:text-slate-400">Concession Amortization</span>
                    <div className="text-xs font-bold text-foreground dark:text-slate-200 mt-1">
                      {invit.riskFactors.concessionAmortizationRisk} ({formatResearchNumber(invit.averageRemainingConcessionYears, 1)} yrs left)
                    </div>
                    <p className="text-[10px] text-muted dark:text-slate-400 mt-0.5">
                      Finite concession assets amortize over their lifetime and require acquisition of new pipeline assets.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-surface-raised/20 dark:bg-slate-800/20 border border-border dark:border-slate-800">
                    <span className="text-[11px] text-muted dark:text-slate-400">Regulatory Tariff Risk</span>
                    <div className="text-xs font-bold text-foreground dark:text-slate-200 mt-1">
                      {invit.riskFactors.regulatoryTariffRisk}
                    </div>
                    <p className="text-[10px] text-muted dark:text-slate-400 mt-0.5">
                      CERC or NHAI concession terms regulate periodic toll rate escalation and return on equity allowances.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-surface-raised/20 dark:bg-slate-800/20 border border-border dark:border-slate-800">
                    <span className="text-[11px] text-muted dark:text-slate-400">Leverage Profile</span>
                    <div className="text-xs font-bold text-foreground dark:text-slate-200 mt-1">
                      {invit.riskFactors.leverageRisk} ({formatResearchNumber(invit.netDebtToGavPct, 1)}% GAV)
                    </div>
                    <p className="text-[10px] text-muted dark:text-slate-400 mt-0.5">
                      Comfortably within the 70% statutory leverage limit for AAA rated InvITs.
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
                href={`/insights?q=${encodeURIComponent(`Explain the concession lifecycle, toll/tariff revenues, and debt profile for ${invit.name} (${invit.symbol}).`)}`}
                className="btn-secondary text-xs py-2 px-3.5 inline-flex items-center gap-1.5 border-cyan-500/30 text-cyan-700 dark:text-cyan-300 hover:text-foreground dark:hover:text-white"
              >
                <Compass className="w-3.5 h-3.5 text-cyan-700 dark:text-cyan-400" />
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
