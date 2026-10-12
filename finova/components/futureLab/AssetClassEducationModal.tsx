'use client';

// ============================================================
// FINOVA — Future Lab 2.0: Asset Class Education Modal Component
// components/futureLab/AssetClassEducationModal.tsx
//
// Comprehensive Educational Guide Covering:
// - Fixed Income & Corporate Bonds
// - Equities & Direct Shares
// - Gold & Sovereign Gold Bonds (SGBs)
// - Real Estate Investment Trusts (REITs)
// - Infrastructure Investment Trusts (InvITs)
// - Mutual Funds (Equity vs Debt vs Hybrid distinctions)
// - Cash & Liquid Assets
// ============================================================

import React from 'react';
import Link from 'next/link';
import {
  X,
  BookOpen,
  Shield,
  TrendingUp,
  Coins,
  Building,
  Layers,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';

interface AssetClassEducationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ASSET_CLASSES_INFO = [
  {
    id: 'bonds',
    title: 'Fixed Income & Corporate Bonds',
    icon: <Shield className="w-5 h-5 text-emerald-400" />,
    whatItIs:
      'Debt instruments issued by the Government of India (G-Secs), state governments (SDLs), or private corporations to borrow capital. The investor receives regular interest (coupons) and principal return at maturity.',
    whyConsider:
      'Provides predictable semi-annual or annual coupon cash flows, anchors portfolio value against equity market drawdowns, and preserves capital when held to maturity in high-rated issuers.',
    mainRisks:
      'Interest Rate Risk (bond prices fall when RBI hikes repo rates), Credit Default Risk (issuer may fail to service debt), and Inflation Risk (fixed coupons lose real purchasing power during high inflation).',
    liquidity:
      'Secondary debt markets in India can have lower trading volume; holding through target maturity debt funds or highly traded G-Secs improves liquidity.',
    learnMoreHref: '/bonds',
    learnMoreLabel: 'Explore Bonds Hub',
  },
  {
    id: 'equity',
    title: 'Equities & Direct Shares',
    icon: <TrendingUp className="w-5 h-5 text-blue-400" />,
    whatItIs:
      'Direct ownership shares in publicly listed companies traded on the NSE/BSE. Represents fractional ownership of real corporate businesses and entitlement to earnings and dividends.',
    whyConsider:
      'The primary historical driver of long-term real wealth creation, capable of compounding above the inflation rate over multi-year horizons.',
    mainRisks:
      'Market Volatility (frequent 10–25% pullbacks), Company Idiosyncratic Risk (poor management, competitive disruption, or fraud), and no guaranteed return or capital protection.',
    liquidity:
      'Extremely high on major stock exchanges (NSE/BSE) during market hours with T+1 settlement.',
    learnMoreHref: '/learn',
    learnMoreLabel: 'Learn Equity Basics',
  },
  {
    id: 'sgb',
    title: 'Gold & Sovereign Gold Bonds (SGBs)',
    icon: <Coins className="w-5 h-5 text-amber-400" />,
    whatItIs:
      'Government-backed securities denominated in grams of gold issued by the RBI. Alternative to holding physical gold, providing market gold price tracking plus a 2.5% annual coupon.',
    whyConsider:
      'Acts as a historical monetary store of value, safe haven during geopolitical turmoil, and hedge against currency depreciation and fiat inflation.',
    mainRisks:
      'Gold price fluctuates globally based on real interest rates and the US dollar index; yields zero business cash flow beyond the coupon.',
    liquidity:
      'Traded on stock exchanges (with varying discounts or premiums to spot price) or redeemable after 5 years directly with RBI.',
    learnMoreHref: '/explore',
    learnMoreLabel: 'Explore Gold in Explorer',
  },
  {
    id: 'reit',
    title: 'Real Estate Investment Trusts (REITs)',
    icon: <Building className="w-5 h-5 text-pink-400" />,
    whatItIs:
      'SEBI-regulated investment vehicles that own, operate, and finance income-generating commercial office parks, malls, and hospitality real estate. Traded on NSE/BSE.',
    whyConsider:
      'Mandatory SEBI rule requiring 90% of Net Distributable Cash Flows (NDCF) to be paid to unitholders, providing regular quarterly rental yields without the burden of physical property management.',
    mainRisks:
      'Commercial tenancy vacancies, work-from-home policy shifts, interest rate sensitivity, and structural property maintenance expenses.',
    liquidity:
      'Traded on stock exchanges with T+1 settlement; liquidity is moderate to high across the 5 listed Indian REITs.',
    learnMoreHref: '/reit',
    learnMoreLabel: 'Explore REITs Hub',
  },
  {
    id: 'invit',
    title: 'Infrastructure Investment Trusts (InvITs)',
    icon: <Layers className="w-5 h-5 text-cyan-400" />,
    whatItIs:
      'SEBI-regulated investment vehicles holding operational infrastructure assets such as toll roads, power transmission grids, gas pipelines, and telecom towers.',
    whyConsider:
      'Long concession periods (20–30 years) with stable toll or tariff revenues, yielding high cash distributions with inflation-linked escalation clauses.',
    mainRisks:
      'Traffic volume fluctuations, concession termination risks, regulatory tariff renegotiations, and refinancing interest rate exposures.',
    liquidity:
      'Traded on the exchange; trading volume may be lower than large-cap equities.',
    learnMoreHref: '/invit',
    learnMoreLabel: 'Explore InvITs Hub',
  },
  {
    id: 'mf',
    title: 'Mutual Funds (Equity, Debt & Hybrid)',
    icon: <BookOpen className="w-5 h-5 text-purple-400" />,
    whatItIs:
      'SEBI-registered pooled investment vehicles managed by professional Asset Management Companies (AMCs). Capital is diversified across dozens or hundreds of securities according to a declared mandate.',
    whyConsider:
      'Eliminates single-company stock-picking risk, provides instant sector diversification, and offers disciplined Systematic Investment Plans (SIPs).',
    mainRisks:
      'CRITICAL: Mutual funds are NOT inherently conservative! Equity funds carry high market risk, while debt funds carry credit and interest rate risk. Expense ratios (TER) reduce net returns.',
    liquidity:
      'High; redeemable directly with the AMC on any business day at prevailing Net Asset Value (NAV).',
    learnMoreHref: '/mutual-funds',
    learnMoreLabel: 'Explore Mutual Funds',
  },
];

export const AssetClassEducationModal: React.FC<AssetClassEducationModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                Asset Classes & Strategic Roles
              </h3>
              <p className="text-xs text-slate-400">
                Educational reference on how each asset category functions in portfolio construction
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs divide-y divide-slate-800/80">
          {ASSET_CLASSES_INFO.map((item, idx) => (
            <div key={item.id} className={idx > 0 ? 'pt-5' : ''}>
              <div className="flex items-start justify-between gap-3 mb-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-slate-800 border border-slate-700">
                    {item.icon}
                  </div>
                  <h4 className="text-sm font-bold text-white">{item.title}</h4>
                </div>

                <Link
                  href={item.learnMoreHref}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-400 hover:text-blue-300"
                >
                  <span>{item.learnMoreLabel}</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-9 text-slate-300 text-[11px] leading-relaxed">
                <div>
                  <strong className="text-slate-100 block mb-0.5">What it is:</strong>
                  <p className="text-slate-400">{item.whatItIs}</p>
                </div>
                <div>
                  <strong className="text-slate-100 block mb-0.5">Why an investor considers it:</strong>
                  <p className="text-slate-400">{item.whyConsider}</p>
                </div>
                <div>
                  <strong className="text-slate-100 block mb-0.5 text-amber-300">Main risks to watch:</strong>
                  <p className="text-slate-400">{item.mainRisks}</p>
                </div>
                <div>
                  <strong className="text-slate-100 block mb-0.5">Liquidity considerations:</strong>
                  <p className="text-slate-400">{item.liquidity}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 shrink-0 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-blue-400 shrink-0" />
            <span>Asset allocation templates are educational tools, not individual investment advice.</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
