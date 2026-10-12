'use client';

// ============================================================
// FINOVA — Alternative Investments Hub
// components/alternatives/AlternativeInvestmentsHub.tsx
//
// Clean Information Architecture:
// Learn -> Discover Real Options -> Compare -> Understand Income & Risk -> Portfolio Impact
// Prominently routes to dedicated discovery pages: /reit, /invit, /bonds
// ============================================================

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  Zap,
  Link2,
  ArrowRight,
  Layers,
  AlertTriangle,
  Scale,
  Compass,
  Sliders,
} from 'lucide-react';
import { VERIFIED_INDIAN_REITS } from '@/lib/data/reitData';
import { VERIFIED_INDIAN_INVITS } from '@/lib/data/invitData';
import { VERIFIED_INDIAN_BONDS } from '@/lib/data/bondData';

export function AlternativeInvestmentsHub() {
  // Guided Selector State
  const [selectedGoal, setSelectedGoal] = useState<'income' | 'infra' | 'safety' | 'growth'>('income');

  const goalRecommendations = {
    income: {
      category: 'REITs (Real Estate Investment Trusts)',
      link: '/reit',
      icon: Building2,
      badge: '5.5% – 7.2% Distribution Yield',
      headline: 'Quarterly Commercial Real Estate Cash Distributions',
      reasoning:
        'Ideal if you seek periodic cash distributions backed by Grade-A office tech parks and retail malls. Under SEBI regulations, 90% of Net Distributable Cash Flows are paid out quarterly, giving you rental yield without property maintenance hassles.',
      keyRisks: 'Sensitive to rising benchmark interest rates and office tenant vacancy.',
    },
    infra: {
      category: 'InvITs (Infrastructure Investment Trusts)',
      link: '/invit',
      icon: Zap,
      badge: '10.3% – 12.2% Distribution Yield',
      headline: 'High-Yield Concession Cash Flows from Roads & Power Grids',
      reasoning:
        'Suited for higher cash flow yield from national essential infrastructure (toll highways, interstate power transmission lines). Generates regular payouts from toll collections and availability tariffs.',
      keyRisks: 'Finite concession periods amortize asset values over time; traffic volume fluctuations.',
    },
    safety: {
      category: 'Bonds & Sovereign Debt',
      link: '/bonds',
      icon: Link2,
      badge: '7.0% – 7.9% Contractual Coupon',
      headline: 'Contractual Capital Repayment & Fixed Coupon Interest',
      reasoning:
        'Optimal if capital preservation and contractual certainty are your primary objectives. Sovereign G-Secs carry zero default risk in INR, while AAA PSU bonds offer predictable fixed interest schedules.',
      keyRisks: 'Bond prices drop when interest rates rise; credit risk on corporate issuers.',
    },
    growth: {
      category: 'Balanced Portfolio Allocation (REITs + Bonds)',
      link: '/future-lab',
      icon: Layers,
      badge: 'Multi-Asset Hedging',
      headline: 'Cushion Equity Drawdowns with Non-Correlated Assets',
      reasoning:
        'Rather than choosing just one, academic portfolio theory proves that adding 10–20% non-equity alternatives moderates overall drawdown volatility while retaining equity upside.',
      keyRisks: 'Opportunity cost during hyper-growth equity bull runs.',
    },
  };

  const currentRec = goalRecommendations[selectedGoal];
  const RecIcon = currentRec.icon;

  return (
    <div className="space-y-8">
      {/* ─── Hero Overview ────────────────────────────────────────── */}
      <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-3xl relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
            <Compass className="w-3.5 h-3.5" />
            <span>Alternative Assets Discovery Terminal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
            Alternative Investments — Beyond Equity &amp; Fixed Deposits
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            Move beyond stocks. Understand how Indian commercial real estate trusts (REITs), highway and power grid trusts (InvITs), and listed debt instruments (Bonds) generate contractual cash flows, manage asset risks, and diversify your multi-broker portfolio.
          </p>
        </div>

        {/* Quick Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 mt-6 border-t border-slate-800/80">
          <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800">
            <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Listed Indian REITs</div>
            <div className="text-lg font-bold text-slate-100 mt-0.5">{VERIFIED_INDIAN_REITS.length} SEBI Trusts</div>
            <div className="text-[11px] text-emerald-400 mt-0.5">5.6% – 7.2% Yield</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800">
            <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Listed Indian InvITs</div>
            <div className="text-lg font-bold text-slate-100 mt-0.5">{VERIFIED_INDIAN_INVITS.length} Infra Trusts</div>
            <div className="text-[11px] text-emerald-400 mt-0.5">10.3% – 12.2% Yield</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800">
            <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Tracked Bonds</div>
            <div className="text-lg font-bold text-slate-100 mt-0.5">{VERIFIED_INDIAN_BONDS.length} Listed Debt</div>
            <div className="text-[11px] text-blue-400 mt-0.5">Sovereign &amp; AAA PSU</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800">
            <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Regulatory Payout</div>
            <div className="text-lg font-bold text-slate-100 mt-0.5">&ge; 90% NDCF</div>
            <div className="text-[11px] text-slate-400 mt-0.5">SEBI Mandate</div>
          </div>
        </div>
      </div>

      {/* ─── 3 Prominent Asset Class Gateway Cards ──────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-100">Select an Alternative Asset Class to Explore</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Each asset class provides its own verified discovery screener, deep-dive detail view, cash flow timelines, and risk factors.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: REITs */}
          <Link
            href="/reit"
            className="group p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-amber-500/40 hover:bg-slate-900/90 transition-all flex flex-col justify-between shadow-lg hover:shadow-amber-500/5 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-colors pointer-events-none" />

            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
                  <Building2 className="w-6 h-6" />
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  {VERIFIED_INDIAN_REITS.length} Listed Trusts
                </span>
              </div>

              <h3 className="text-lg font-bold text-slate-100 group-hover:text-amber-300 transition-colors">
                REITs — Real Estate Investment Trusts
              </h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Co-own institutional commercial real estate without property deed management. Earn quarterly rental payouts from Fortune-500 corporate campuses and premium shopping malls.
              </p>

              <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400">Typical Income:</span>
                  <span className="font-semibold text-emerald-400">Quarterly NDCF Distributions</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400">Underlying Asset:</span>
                  <span className="font-semibold text-slate-200">Grade-A Tech Parks &amp; Malls</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400">Key Tracked Trusts:</span>
                  <span className="font-semibold text-slate-200">Embassy, Mindspace, Nexus</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-amber-400 group-hover:translate-x-1 transition-transform">
              <span>Explore Listed REITs</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>

          {/* Card 2: InvITs */}
          <Link
            href="/invit"
            className="group p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-emerald-500/40 hover:bg-slate-900/90 transition-all flex flex-col justify-between shadow-lg hover:shadow-emerald-500/5 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors pointer-events-none" />

            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                  <Zap className="w-6 h-6" />
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                  {VERIFIED_INDIAN_INVITS.length} Infra Trusts
                </span>
              </div>

              <h3 className="text-lg font-bold text-slate-100 group-hover:text-emerald-300 transition-colors">
                InvITs — Infrastructure Investment Trusts
              </h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Fractional ownership of operational national infrastructure assets. Collect toll revenues from national highways and regulated tariffs from interstate power transmission networks.
              </p>

              <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400">Typical Income:</span>
                  <span className="font-semibold text-emerald-400">10% – 12% Cash Distributions</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400">Underlying Asset:</span>
                  <span className="font-semibold text-slate-200">Toll Roads &amp; Power Grids</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400">Key Tracked Trusts:</span>
                  <span className="font-semibold text-slate-200">POWERGRID, IRB, NHIT</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-emerald-400 group-hover:translate-x-1 transition-transform">
              <span>Explore Listed InvITs</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>

          {/* Card 3: Bonds */}
          <Link
            href="/bonds"
            className="group p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-blue-500/40 hover:bg-slate-900/90 transition-all flex flex-col justify-between shadow-lg hover:shadow-blue-500/5 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-colors pointer-events-none" />

            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform">
                  <Link2 className="w-6 h-6" />
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/20">
                  {VERIFIED_INDIAN_BONDS.length} Screener Issues
                </span>
              </div>

              <h3 className="text-lg font-bold text-slate-100 group-hover:text-blue-300 transition-colors">
                Bonds &amp; Listed Fixed Income
              </h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Contractual debt instruments where you lend capital to Sovereign Governments, PSUs, or Corporations in exchange for fixed coupon interest and full principal repayment at maturity.
              </p>

              <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400">Typical Income:</span>
                  <span className="font-semibold text-blue-400">Contractual Coupon / Interest</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400">Credit Ratings:</span>
                  <span className="font-semibold text-slate-200">Sovereign, CRISIL/ICRA AAA</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400">Key Tracked Issues:</span>
                  <span className="font-semibold text-slate-200">7.18% GS 2033, REC, NHAI</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-blue-400 group-hover:translate-x-1 transition-transform">
              <span>Open Bond Screener</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>
        </div>
      </div>

      {/* ─── "Why Look Beyond Stocks?" Visual Comparison Matrix ───── */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <div className="flex items-center gap-2">
          <Scale className="w-5 h-5 text-indigo-400" />
          <h2 className="text-base font-bold text-slate-100">Why Might Someone Look Beyond Stocks?</h2>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          While direct equities generate long-term capital appreciation, they provide zero contractual income certainty and suffer high market-cycle volatility. Here is how alternative assets differ structurally:
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-800/40 text-slate-300">
                <th className="py-3 px-3 font-semibold">Core Factor</th>
                <th className="py-3 px-3 font-semibold text-slate-400">Direct Equities</th>
                <th className="py-3 px-3 font-semibold text-amber-300">REITs (Real Estate)</th>
                <th className="py-3 px-3 font-semibold text-emerald-300">InvITs (Infra)</th>
                <th className="py-3 px-3 font-semibold text-blue-300">Bonds (Fixed Income)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              <tr className="hover:bg-slate-800/20">
                <td className="py-3 px-3 font-medium text-slate-200">Main Exposure</td>
                <td className="py-3 px-3 text-slate-400">Company Equity Shares</td>
                <td className="py-3 px-3">Grade-A Commercial Offices &amp; Malls</td>
                <td className="py-3 px-3">Toll Roads, Power Grids, Fibre Lines</td>
                <td className="py-3 px-3">Direct Sovereign or Issuer Debt</td>
              </tr>
              <tr className="hover:bg-slate-800/20">
                <td className="py-3 px-3 font-medium text-slate-200">Typical Income</td>
                <td className="py-3 px-3 text-slate-400">Discretionary Dividends (1–2%)</td>
                <td className="py-3 px-3 text-emerald-400">&ge; 90% NDCF Mandate (5.5–7%)</td>
                <td className="py-3 px-3 text-emerald-400">&ge; 90% NDCF Mandate (10–12%)</td>
                <td className="py-3 px-3 text-blue-400">Contractual Fixed Coupon (7–8%)</td>
              </tr>
              <tr className="hover:bg-slate-800/20">
                <td className="py-3 px-3 font-medium text-slate-200">Market-Price Risk</td>
                <td className="py-3 px-3 text-rose-400">High (Beta, Economic Cycles)</td>
                <td className="py-3 px-3 text-amber-300">Yes (Trades on NSE; Rate sensitive)</td>
                <td className="py-3 px-3 text-amber-300">Yes (Trades on NSE; Rate sensitive)</td>
                <td className="py-3 px-3 text-slate-300">Duration Sensitivity (Prices fall if rates rise)</td>
              </tr>
              <tr className="hover:bg-slate-800/20">
                <td className="py-3 px-3 font-medium text-slate-200">Credit / Default Risk</td>
                <td className="py-3 px-3 text-slate-400">Last claim on corporate assets</td>
                <td className="py-3 px-3">Tenant Default / SPV Loan Coverage</td>
                <td className="py-3 px-3">Counterparty Discom / Toll Traffic</td>
                <td className="py-3 px-3 text-blue-300">Direct Issuer Credit (AAA / Sovereign)</td>
              </tr>
              <tr className="hover:bg-slate-800/20">
                <td className="py-3 px-3 font-medium text-slate-200">Secondary Liquidity</td>
                <td className="py-3 px-3 text-emerald-400">High (Instant order execution)</td>
                <td className="py-3 px-3">Moderate (1-unit trading lots on NSE)</td>
                <td className="py-3 px-3">Moderate (1-unit trading lots on NSE)</td>
                <td className="py-3 px-3 text-rose-400">Can vary significantly (Many illiquid tranches)</td>
              </tr>
              <tr className="hover:bg-slate-800/20">
                <td className="py-3 px-3 font-medium text-slate-200">Capital Guarantee</td>
                <td className="py-3 px-3 text-rose-400">Strictly NO guarantee</td>
                <td className="py-3 px-3 text-rose-400">Strictly NO guarantee</td>
                <td className="py-3 px-3 text-rose-400">Strictly NO guarantee (Amortizes)</td>
                <td className="py-3 px-3 text-amber-300">Contractual at Maturity (Subject to issuer solvency)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── "Which One Should I Learn About?" Guided Selector ──── */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-5">
        <div>
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-bold text-slate-100">Which One Should I Learn About?</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Select your investment preference below to see the most relevant alternative asset class:
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { id: 'income', label: 'Commercial Rental Income' },
            { id: 'infra', label: 'High Cash Flow & Highways' },
            { id: 'safety', label: 'Capital Preservation & Bonds' },
            { id: 'growth', label: 'Drawdown Protection' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedGoal(tab.id as typeof selectedGoal)}
              className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all text-center ${
                selectedGoal === tab.id
                  ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300 shadow-sm'
                  : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Dynamic Guided Card */}
        <div className="p-5 rounded-xl bg-slate-800/30 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <RecIcon className="w-4 h-4" />
              </span>
              <span className="text-xs font-bold text-indigo-300">{currentRec.category}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {currentRec.badge}
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-100">{currentRec.headline}</h3>
            <p className="text-xs text-slate-300 leading-relaxed">{currentRec.reasoning}</p>
            <div className="pt-1 text-[11px] text-amber-400 flex items-center gap-1.5">
              <AlertTriangle className="w-3 h-3 shrink-0" />
              <span><strong>Key Consideration:</strong> {currentRec.keyRisks}</span>
            </div>
          </div>

          <Link
            href={currentRec.link}
            className="btn-primary text-xs py-2 px-4 inline-flex items-center justify-center gap-2 shrink-0 self-start sm:self-auto"
          >
            <span>Explore {currentRec.category.split(' ')[0]}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* ─── Portfolio Integration Section (Connecting to X-Ray & Risk Radar) ──── */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-900/40 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-bold text-slate-100">See Portfolio Impact in FINOVA</h2>
          </div>
          <span className="text-xs text-slate-400">Core PS2 Requirement</span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Alternatives in FINOVA are fully integrated with your consolidated multi-broker holdings. When you hold REITs, InvITs, or Bonds:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <Link
            href="/analysis"
            className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 hover:border-slate-700 transition-colors group"
          >
            <div className="text-xs font-bold text-slate-200 group-hover:text-indigo-400 flex items-center justify-between">
              <span>Investment X-Ray</span>
              <ArrowRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Categorizes alternatives cleanly into asset allocation without forcing equity sector logic onto bonds.
            </p>
          </Link>

          <Link
            href="/risk"
            className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 hover:border-slate-700 transition-colors group"
          >
            <div className="text-xs font-bold text-slate-200 group-hover:text-indigo-400 flex items-center justify-between">
              <span>Risk Radar</span>
              <ArrowRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Separates equity single-stock concentration from sovereign G-Sec custody and corporate credit exposure.
            </p>
          </Link>

          <Link
            href="/future-lab"
            className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 hover:border-slate-700 transition-colors group"
          >
            <div className="text-xs font-bold text-slate-200 group-hover:text-indigo-400 flex items-center justify-between">
              <span>Future Lab</span>
              <ArrowRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Simulate hypothetical capital allocations into REITs and Bonds to observe impact on overall portfolio risk score.
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
