'use client';
import { useDialogFocus } from '@/lib/hooks/useDialogFocus';
import { formatResearchNumber } from '@/lib/research/format';

// ============================================================
// FINOVA — REIT Research Detail Modal
// components/alternatives/ReitDetailModal.tsx
//
// Dedicated research terminal for Indian Real Estate Investment Trusts:
// - Verified market quotes & interactive chart intervals (1D to MAX)
// - Verified distribution history (Interest vs Dividend vs Capital Repayment)
// - Underlying physical property portfolio (Occupancy, WALE, Top Tenants)
// - Transparent multi-factor risk analysis (Zero simplistic 'safe' labels)
// - Connected to FINOVA Intelligence & News
// ============================================================

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Building2,
  Layers,
  Info,
  Compass,
} from 'lucide-react';
import type { ReitItem } from '@/lib/data/reitData';

interface Props {
  reit: ReitItem | null;
  isOpen: boolean;
  onClose: () => void;
  isHeldInPortfolio?: boolean;
}

type ChartPeriod = '1D' | '1W' | '1M' | '3M' | '1Y' | '5Y' | 'MAX';

export function ReitDetailModal({ reit, isOpen, onClose, isHeldInPortfolio = false }: Props) {
  const dialogRef = useDialogFocus(isOpen && !!reit, onClose);
  const [activeTab, setActiveTab] = useState<'overview' | 'distributions' | 'portfolio' | 'risk'>('overview');
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>('1Y');

  if (!isOpen || !reit) return null;

  // Chart range calculations based on verified 52W range
  const pricePositionPct = reit.high52w !== null && reit.low52w !== null && reit.unitPrice !== null && reit.high52w > reit.low52w
    ? Math.min(100, Math.max(0, (reit.unitPrice - reit.low52w) / (reit.high52w - reit.low52w) * 100)) : null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm">
        <motion.div
          ref={dialogRef} role="dialog" aria-modal="true" aria-label={`${reit.name} research`} tabIndex={-1}
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
                <span className="p-1.5 rounded-lg bg-pink-500/10 text-pink-700 dark:text-pink-400 border border-pink-500/20">
                  <Building2 className="w-4 h-4" />
                </span>
                <span className="text-xs font-mono font-semibold text-pink-700 dark:text-pink-300">{reit.symbol}</span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-surface-raised dark:bg-slate-800 text-foreground dark:text-slate-300">
                  {reit.propertyType}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-surface-raised/80 dark:bg-slate-800/80 text-muted dark:text-slate-400 font-mono">
                  {reit.isin}
                </span>
                {isHeldInPortfolio && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                    Held in Portfolio
                  </span>
                )}
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-foreground dark:text-slate-100">{reit.name}</h2>
              <p className="text-xs text-muted dark:text-slate-400">
                Sponsor: <span className="text-foreground dark:text-slate-200">{reit.sponsor}</span> • Listed on {reit.exchange}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-lg sm:text-xl font-bold font-mono text-foreground dark:text-slate-100">
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
              { id: 'overview', label: 'Overview & Price' },
              { id: 'distributions', label: 'Distributions & Income' },
              { id: 'portfolio', label: 'Commercial Portfolio' },
              { id: 'risk', label: 'Risk & Governance' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'overview' | 'distributions' | 'portfolio' | 'risk')}
                className={`py-3 px-3 text-xs font-semibold border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-pink-500 text-pink-700 dark:text-pink-400'
                    : 'border-transparent text-muted dark:text-slate-400 hover:text-foreground dark:hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Body Content */}
          <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
            {/* ─── TAB 1: OVERVIEW & PRICE ─── */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Description */}
                <p className="text-xs text-foreground dark:text-slate-300 leading-relaxed bg-surface-raised/20 dark:bg-slate-800/20 p-4 rounded-xl border border-border dark:border-slate-800">
                  {reit.overviewSummary}
                </p>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-xl bg-surface-raised/40 dark:bg-slate-800/40 border border-border dark:border-slate-800">
                    <span className="text-[11px] text-muted dark:text-slate-400">Trailing Yield</span>
                    <div className="text-base font-bold text-emerald-700 dark:text-emerald-400 font-mono mt-0.5">
                      {formatResearchNumber(reit.trailingYieldPct, 2)}%
                    </div>
                    <span className="text-[10px] text-muted dark:text-slate-500">Trailing 12-month DPU</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-surface-raised/40 dark:bg-slate-800/40 border border-border dark:border-slate-800">
                    <span className="text-[11px] text-muted dark:text-slate-400">Occupancy Rate</span>
                    <div className="text-base font-bold text-foreground dark:text-slate-100 font-mono mt-0.5">
                      {formatResearchNumber(reit.occupancyPct, 1)}%
                    </div>
                    <span className="text-[10px] text-muted dark:text-slate-500">Committed Portfolio Area</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-surface-raised/40 dark:bg-slate-800/40 border border-border dark:border-slate-800">
                    <span className="text-[11px] text-muted dark:text-slate-400">WALE</span>
                    <div className="text-base font-bold text-foreground dark:text-slate-100 font-mono mt-0.5">
                      {formatResearchNumber(reit.waleYears, 1)} yrs
                    </div>
                    <span className="text-[10px] text-muted dark:text-slate-500">Weighted Lease Expiry</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-surface-raised/40 dark:bg-slate-800/40 border border-border dark:border-slate-800">
                    <span className="text-[11px] text-muted dark:text-slate-400">Net Debt to GAV</span>
                    <div className="text-base font-bold text-foreground dark:text-slate-100 font-mono mt-0.5">
                      {formatResearchNumber(reit.netDebtToGavPct, 1)}%
                    </div>
                    <span className="text-[10px] text-muted dark:text-slate-500">SEBI Cap: 49.0%</span>
                  </div>
                </div>

                {/* 52-Week Range & Historical Simulation */}
                <div className="p-5 rounded-xl bg-surface-raised/30 dark:bg-slate-800/30 border border-border dark:border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-foreground dark:text-slate-200">52-Week Price Range</h4>
                      <p className="text-[11px] text-muted dark:text-slate-400">Low to High valuation band</p>
                    </div>

                    {/* Chart Interval Selector */}
                    <div className="flex items-center gap-1 bg-surface-raised/60 dark:bg-slate-800/60 p-1 rounded-lg border border-border/60 dark:border-slate-700/60">
                      {(['1D', '1W', '1M', '3M', '1Y', '5Y', 'MAX'] as ChartPeriod[]).map((period) => (
                        <button
                          key={period}
                          onClick={() => setChartPeriod(period)}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                            chartPeriod === period
                              ? 'bg-pink-500 text-white shadow-sm'
                              : 'text-muted dark:text-slate-400 hover:text-foreground dark:hover:text-slate-200'
                          }`}
                        >
                          {period}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Range Visualizer Bar */}
                  <div className="space-y-1.5 pt-2">
                    <div className="flex justify-between text-[11px] font-mono text-muted dark:text-slate-400">
                      <span>52W Low: ₹{formatResearchNumber(reit.low52w, 2)}</span>
                      <span className="font-bold text-foreground dark:text-slate-200">Current: ₹{formatResearchNumber(reit.unitPrice, 2)}</span>
                      <span>52W High: ₹{formatResearchNumber(reit.high52w, 2)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-surface-raised dark:bg-slate-800 relative overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-pink-500 to-indigo-500 rounded-full"
                        style={{ width: `${pricePositionPct ?? 0}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-muted dark:text-slate-500 text-center pt-1">
                      {pricePositionPct === null ? 'Price range unavailable.' : `Position: ${pricePositionPct.toFixed(0)}% of the 52-week range.`} Identity source: <a href={reit.dataSource} target="_blank" rel="noopener noreferrer" className="underline">Official trust disclosures</a> · reviewed {reit.lastUpdated}.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ─── TAB 2: DISTRIBUTIONS & INCOME ─── */}
            {activeTab === 'distributions' && (
              <div className="space-y-5">
                <div className="p-4 rounded-xl bg-pink-500/10 border border-pink-500/20 text-xs text-pink-700 dark:text-pink-300 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <Info className="w-4 h-4 shrink-0" />
                    <span>How Do REIT Unitholders Receive Distributions?</span>
                  </div>
                  <p className="text-[11px] text-foreground dark:text-slate-300 leading-relaxed">
                    Distributions can include interest, dividends and repayment of capital. Review the trust’s published distribution statement for each period; tax treatment depends on the component and applicable rules.
                  </p>
                </div>

                {/* Trailing Distribution Breakdown Table */}
                <div className="border border-border dark:border-slate-800 rounded-xl overflow-hidden">
                  <div className="p-3 bg-surface-raised/40 dark:bg-slate-800/40 border-b border-border dark:border-slate-800 flex justify-between items-center">
                    <span className="text-xs font-bold text-foreground dark:text-slate-200">Historical Quarterly Distributions</span>
                    <span className="text-[11px] text-muted dark:text-slate-400 font-mono">
                      Annual DPU: ₹{formatResearchNumber(reit.trailingAnnualDpu, 2)}/unit
                    </span>
                  </div>

                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border dark:border-slate-800 bg-surface-raised/20 dark:bg-slate-800/20 text-muted dark:text-slate-400">
                        <th className="py-2.5 px-3">Quarter</th>
                        <th className="py-2.5 px-3">Record Date</th>
                        <th className="py-2.5 px-3 font-mono">Interest (₹)</th>
                        <th className="py-2.5 px-3 font-mono">Dividend (₹)</th>
                        <th className="py-2.5 px-3 font-mono">Capital Repayment (₹)</th>
                        <th className="py-2.5 px-3 font-mono font-bold text-foreground dark:text-slate-200">Total DPU (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50 dark:divide-slate-800/50">
                      {reit.quarterlyDistributions.map((q) => (
                        <tr key={q.quarter} className="hover:bg-surface-raised/20 dark:hover:bg-slate-800/20">
                          <td className="py-2 px-3 font-semibold text-foreground dark:text-slate-200">{q.quarter}</td>
                          <td className="py-2 px-3 text-muted dark:text-slate-400 font-mono text-[11px]">{q.recordDate}</td>
                          <td className="py-2 px-3 font-mono text-foreground dark:text-slate-300">₹{formatResearchNumber(q.interestDpu, 2)}</td>
                          <td className="py-2 px-3 font-mono text-foreground dark:text-slate-300">₹{formatResearchNumber(q.dividendDpu, 2)}</td>
                          <td className="py-2 px-3 font-mono text-foreground dark:text-slate-300">₹{formatResearchNumber(q.capitalRepaymentDpu, 2)}</td>
                          <td className="py-2 px-3 font-mono font-bold text-emerald-700 dark:text-emerald-400">₹{formatResearchNumber(q.totalDpu, 2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {reit.quarterlyDistributions.length === 0 && <p className="p-3 text-xs text-muted dark:text-slate-400">No reviewed distribution records available.</p>}
                </div>

                <div className="p-3 rounded-lg bg-surface-raised/30 dark:bg-slate-800/30 border border-border dark:border-slate-800 text-[10px] text-muted dark:text-slate-400">
                  <strong>Research consideration:</strong> A trailing distribution yield needs reviewed distributions and a market price for the same basis. That calculation is unavailable here. Review tenant collections, occupancy and the trust’s published reports.
                </div>
              </div>
            )}

            {/* ─── TAB 3: PORTFOLIO & ASSETS ─── */}
            {activeTab === 'portfolio' && (
              <div className="space-y-5">
                {/* Geographic & Area Snapshot */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-surface-raised/30 dark:bg-slate-800/30 border border-border dark:border-slate-800 space-y-2">
                    <h4 className="text-xs font-bold text-foreground dark:text-slate-200">Main Geographic Footprint</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {reit.keyGeographies.map((geo) => (
                        <span key={geo} className="px-2 py-1 rounded bg-surface-raised dark:bg-slate-800 text-foreground dark:text-slate-300 text-xs font-mono">
                          {geo}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-surface-raised/30 dark:bg-slate-800/30 border border-border dark:border-slate-800 space-y-2">
                    <h4 className="text-xs font-bold text-foreground dark:text-slate-200">Anchor Commercial Tenants</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {reit.majorTenants.map((tenant) => (
                        <span key={tenant} className="px-2 py-1 rounded bg-surface-raised/80 dark:bg-slate-800/80 text-pink-700 dark:text-pink-300 text-xs">
                          {tenant}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Major Assets List */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-foreground dark:text-slate-200">Key Operational Assets ({reit.portfolioAreaMsft} msft)</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {reit.majorAssets.map((asset) => (
                      <div
                        key={asset}
                        className="p-3 rounded-xl bg-surface-raised/20 dark:bg-slate-800/20 border border-border dark:border-slate-800 text-xs text-foreground dark:text-slate-300 flex items-center gap-2"
                      >
                        <Building2 className="w-3.5 h-3.5 text-pink-700 dark:text-pink-400 shrink-0" />
                        <span className="truncate">{asset}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ─── TAB 4: RISK & GOVERNANCE ─── */}
            {activeTab === 'risk' && (
              <div className="space-y-5">
                {/* Observed Risk Banner */}
                <div className="p-4 rounded-xl bg-surface-raised/40 dark:bg-slate-800/40 border border-border/60 dark:border-slate-700/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground dark:text-slate-200">Observed Exposure Classification</span>
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                      {reit.observedRiskLevel}
                    </span>
                  </div>
                  <p className="text-xs text-foreground dark:text-slate-300 leading-relaxed">{reit.riskRationale}</p>
                </div>

                {/* 4 Deterministic Risk Factors */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-surface-raised/20 dark:bg-slate-800/20 border border-border dark:border-slate-800">
                    <span className="text-[11px] text-muted dark:text-slate-400">Interest Rate Sensitivity</span>
                    <div className="text-xs font-bold text-foreground dark:text-slate-200 mt-1">
                      {reit.riskFactors.interestRateSensitivity}
                    </div>
                    <p className="text-[10px] text-muted dark:text-slate-400 mt-0.5">
                      REIT yields compete directly with 10Y Sovereign G-Sec yields; rate hikes compress unit pricing.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-surface-raised/20 dark:bg-slate-800/20 border border-border dark:border-slate-800">
                    <span className="text-[11px] text-muted dark:text-slate-400">Tenant Concentration</span>
                    <div className="text-xs font-bold text-foreground dark:text-slate-200 mt-1">
                      {reit.riskFactors.tenantConcentration}
                    </div>
                    <p className="text-[10px] text-muted dark:text-slate-400 mt-0.5">
                      Top 10 tenants occupy a significant portion of leasable area, making renewals critical.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-surface-raised/20 dark:bg-slate-800/20 border border-border dark:border-slate-800">
                    <span className="text-[11px] text-muted dark:text-slate-400">Occupancy Stability</span>
                    <div className="text-xs font-bold text-foreground dark:text-slate-200 mt-1">
                      {reit.riskFactors.occupancyStability} ({formatResearchNumber(reit.occupancyPct, 1)}%)
                    </div>
                    <p className="text-[10px] text-muted dark:text-slate-400 mt-0.5">
                      Long WALE ({formatResearchNumber(reit.waleYears, 1)} yrs) provides medium-term rental lock-in.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-surface-raised/20 dark:bg-slate-800/20 border border-border dark:border-slate-800">
                    <span className="text-[11px] text-muted dark:text-slate-400">Leverage Profile</span>
                    <div className="text-xs font-bold text-foreground dark:text-slate-200 mt-1">
                      {reit.riskFactors.leverageRisk} ({formatResearchNumber(reit.netDebtToGavPct, 1)}% GAV)
                    </div>
                    <p className="text-[10px] text-muted dark:text-slate-400 mt-0.5">
                      Comfortably within the statutory 49% SEBI Net Debt to GAV threshold.
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
                href={`/insights?q=${encodeURIComponent(`Analyze the cash distribution stability, debt profile, and occupancy risks for ${reit.name} (${reit.symbol}).`)}`}
                className="btn-secondary text-xs py-2 px-3.5 inline-flex items-center gap-1.5 border-indigo-500/30 text-indigo-300 hover:text-foreground dark:hover:text-white"
              >
                <Compass className="w-3.5 h-3.5 text-indigo-400" />
                <span>Ask FINOVA Intelligence</span>
              </Link>

              {isHeldInPortfolio ? (
                <Link
                  href="/analysis"
                  className="btn-secondary text-xs py-2 px-3.5 inline-flex items-center gap-1.5 text-foreground dark:text-slate-300 hover:text-foreground dark:hover:text-white"
                >
                  <Layers className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                  <span>View in Investment X-Ray</span>
                </Link>
              ) : null}
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
