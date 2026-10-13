'use client';

// ============================================================
// FINOVA — Future Lab 2.0: Strategy Selector Component
// components/futureLab/StrategySelector.tsx
//
// Step A: Investment Amount Input & Quick Presets
// Step B: Three Large Strategy Selection Cards (Conservative, Balanced, Aggressive)
// Step C: Optional Investor Preferences Disclosure
// ============================================================

import React, { useState } from 'react';
import {
  ShieldCheck,
  Scale,
  TrendingUp,
  AlertCircle,
  HelpCircle,
  Sliders,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  STRATEGY_TEMPLATES,
  type StrategyId,
} from '@/lib/calculations/futureLab';
import { formatIndianCurrency } from '@/lib/utils';

interface StrategySelectorProps {
  investmentAmount: number;
  onAmountChange: (amount: number) => void;
  selectedStrategy: StrategyId;
  onSelectStrategy: (strategy: StrategyId) => void;
  onOpenEducationModal?: () => void;
}

const QUICK_AMOUNTS = [10000, 25000, 50000, 100000];

export const StrategySelector: React.FC<StrategySelectorProps> = ({
  investmentAmount,
  onAmountChange,
  selectedStrategy,
  onSelectStrategy,
  onOpenEducationModal,
}) => {
  const [rawInput, setRawInput] = useState<string>(investmentAmount.toString());
  const [inputError, setInputError] = useState<string | null>(null);
  const [showPreferences, setShowPreferences] = useState<boolean>(false);

  // Optional Preferences State
  const [horizon, setHorizon] = useState<'SHORT' | 'MEDIUM' | 'LONG'>('MEDIUM');
  const [tolerance, setTolerance] = useState<'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE'>('MODERATE');
  const [liquidity, setLiquidity] = useState<'HIGH' | 'MODERATE' | 'LOW'>('MODERATE');
  const [objective, setObjective] = useState<'CAPITAL_PRESERVATION' | 'BALANCED_GROWTH' | 'WEALTH_CREATION'>(
    'BALANCED_GROWTH'
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    setRawInput(val);
    if (!val || val === '0') {
      setInputError('Please enter an investment amount greater than zero.');
      return;
    }
    const num = parseInt(val, 10);
    if (isNaN(num) || num <= 0) {
      setInputError('Please enter a valid investment amount.');
    } else if (num > 1000000000) {
      setInputError('Maximum simulated amount is ₹100 Crore.');
    } else {
      setInputError(null);
      onAmountChange(num);
    }
  };

  const handleQuickSelect = (amt: number) => {
    setRawInput(amt.toString());
    setInputError(null);
    onAmountChange(amt);
  };

  return (
    <div className="space-y-6">
      {/* ─── Step A: Investment Amount ──────────────────────────── */}
      <div className="bg-surface/80 dark:bg-slate-900/80 border border-border dark:border-slate-800 rounded-2xl p-6 backdrop-blur-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                Step 1 of 2
              </span>
              <h2 className="text-xl font-bold text-foreground dark:text-white tracking-tight">
                Plan Your Next Investment
              </h2>
            </div>
            <p className="text-xs text-muted dark:text-slate-400 mt-1">
              Enter any amount to simulate how different asset-class strategies would allocate this capital.
            </p>
          </div>

          {onOpenEducationModal && (
            <button
              type="button"
              onClick={onOpenEducationModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-raised dark:bg-slate-800 hover:bg-surface-raised dark:hover:bg-slate-700 text-foreground dark:text-slate-300 border border-border dark:border-slate-700 transition-colors self-start md:self-auto"
            >
              <HelpCircle className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              Asset Classes Guide
            </button>
          )}
        </div>

        {/* Amount Input & Quick Chips */}
        <div className="space-y-4">
          <div className="relative max-w-xl">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted dark:text-slate-400 font-semibold text-lg select-none">
              ₹
            </span>
            <input
              type="text"
              id="investment-amount-input"
              aria-label="Simulated investment amount in rupees"
              inputMode="numeric"
              value={rawInput}
              onChange={handleInputChange}
              placeholder="1,00,000"
              className="w-full bg-background/70 dark:bg-slate-950/70 border border-border/80 dark:border-slate-700/80 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl py-3.5 pl-9 pr-4 text-foreground dark:text-white text-xl font-bold tracking-tight placeholder-muted dark:placeholder-slate-600 transition-all outline-none"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-muted dark:text-slate-400">
              INR
            </span>
          </div>

          {inputError && (
            <div className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg max-w-xl">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{inputError}</span>
            </div>
          )}

          {/* Quick Amount Selectors */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs text-muted dark:text-slate-400 mr-1">Quick Select:</span>
            {QUICK_AMOUNTS.map((amt) => {
              const isSelected = investmentAmount === amt && !inputError;
              return (
                <button
                  key={amt}
                  type="button"
                  onClick={() => handleQuickSelect(amt)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 font-semibold'
                      : 'bg-surface-raised/80 dark:bg-slate-800/80 hover:bg-surface-raised/80 dark:hover:bg-slate-700/80 text-foreground dark:text-slate-300 border border-border/60 dark:border-slate-700/60'
                  }`}
                >
                  ₹{amt.toLocaleString('en-IN')}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── Step B: Choose Investment Approach ──────────────────── */}
      <div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="shrink-0 whitespace-nowrap px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                Step 2 of 2
              </span>
              <h3 className="text-lg font-bold text-foreground dark:text-white tracking-tight">
                Choose Investment Approach
              </h3>
            </div>
            <p className="text-xs text-muted dark:text-slate-400 mt-1">
              Select one of FINOVA’s 3 educational strategy templates to simulate its allocation.
            </p>
          </div>

          {/* Toggle Optional Investor Preferences */}
          <button
            type="button"
            onClick={() => setShowPreferences((prev) => !prev)}
            className="flex shrink-0 whitespace-nowrap items-center gap-1.5 text-xs font-medium text-foreground dark:text-slate-300 hover:text-foreground dark:hover:text-white px-3 py-1.5 rounded-lg bg-surface-raised/80 dark:bg-slate-800/80 border border-border dark:border-slate-700 transition-colors"
          >
            <Sliders className="w-3.5 h-3.5 text-purple-700 dark:text-purple-400" />
            <span>Preferences Context</span>
            {showPreferences ? (
              <ChevronUp className="w-3.5 h-3.5 text-muted dark:text-slate-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-muted dark:text-slate-400" />
            )}
          </button>
        </div>

        {/* Optional Preferences Drawer */}
        {showPreferences && (
          <div className="mb-5 p-4 rounded-xl bg-surface/60 dark:bg-slate-900/60 border border-border/90 dark:border-slate-800/90 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-xs font-semibold text-foreground dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-700 dark:text-purple-400" />
                  Optional Investor Context (Exploratory)
                </h4>
                <p className="text-[11px] text-muted dark:text-slate-400 mt-0.5">
                  Providing context helps compare template characteristics against your general profile.
                </p>
              </div>
              <span className="text-[10px] text-foreground dark:text-slate-300 bg-surface-raised dark:bg-slate-800 border border-border dark:border-slate-700 px-2 py-0.5 rounded">
                Not a suitability assessment
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {/* Horizon */}
              <div>
                <label className="text-muted dark:text-slate-400 block mb-1 font-medium">Investment Horizon</label>
                <select
                  value={horizon}
                  onChange={(e) => setHorizon(e.target.value as 'SHORT' | 'MEDIUM' | 'LONG')}
                  className="w-full bg-background dark:bg-slate-950 border border-border dark:border-slate-800 rounded-lg p-2 text-foreground dark:text-slate-200 outline-none focus:border-blue-500"
                >
                  <option value="SHORT">Short-Term (&lt; 3 Years)</option>
                  <option value="MEDIUM">Medium-Term (3–5 Years)</option>
                  <option value="LONG">Long-Term (5+ Years)</option>
                </select>
              </div>

              {/* Risk Tolerance */}
              <div>
                <label className="text-muted dark:text-slate-400 block mb-1 font-medium">Market Decline Tolerance</label>
                <select
                  value={tolerance}
                  onChange={(e) => setTolerance(e.target.value as 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE')}
                  className="w-full bg-background dark:bg-slate-950 border border-border dark:border-slate-800 rounded-lg p-2 text-foreground dark:text-slate-200 outline-none focus:border-blue-500"
                >
                  <option value="CONSERVATIVE">Low (Prefers Capital Buffer)</option>
                  <option value="MODERATE">Moderate (Tolerates Pullbacks)</option>
                  <option value="AGGRESSIVE">High (Drawdown Tolerant)</option>
                </select>
              </div>

              {/* Liquidity */}
              <div>
                <label className="text-muted dark:text-slate-400 block mb-1 font-medium">Liquidity Needs</label>
                <select
                  value={liquidity}
                  onChange={(e) => setLiquidity(e.target.value as 'HIGH' | 'MODERATE' | 'LOW')}
                  className="w-full bg-background dark:bg-slate-950 border border-border dark:border-slate-800 rounded-lg p-2 text-foreground dark:text-slate-200 outline-none focus:border-blue-500"
                >
                  <option value="HIGH">High (Immediate Emergency Access)</option>
                  <option value="MODERATE">Moderate (Planned Lock-ins)</option>
                  <option value="LOW">Low (Long-Term Compounding)</option>
                </select>
              </div>

              {/* Objective */}
              <div>
                <label className="text-muted dark:text-slate-400 block mb-1 font-medium">Primary Objective</label>
                <select
                  value={objective}
                  onChange={(e) =>
                    setObjective(e.target.value as 'CAPITAL_PRESERVATION' | 'BALANCED_GROWTH' | 'WEALTH_CREATION')
                  }
                  className="w-full bg-background dark:bg-slate-950 border border-border dark:border-slate-800 rounded-lg p-2 text-foreground dark:text-slate-200 outline-none focus:border-blue-500"
                >
                  <option value="CAPITAL_PRESERVATION">Capital Preservation</option>
                  <option value="BALANCED_GROWTH">Balanced Growth & Income</option>
                  <option value="WEALTH_CREATION">Aggressive Wealth Creation</option>
                </select>
              </div>
            </div>

            <p className="text-[11px] text-muted dark:text-slate-400 italic">
              Notice: Strategy templates below are educational benchmarks totaling 100%. They do not constitute personalized financial planning or advice.
            </p>
          </div>
        )}

        {/* 3 Large Strategy Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* 1. Conservative Card */}
          <StrategyCard
            template={STRATEGY_TEMPLATES.conservative}
            icon={<ShieldCheck className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />}
            accentColor="emerald"
            isSelected={selectedStrategy === 'conservative'}
            onSelect={() => onSelectStrategy('conservative')}
            amount={investmentAmount}
          />

          {/* 2. Balanced Card */}
          <StrategyCard
            template={STRATEGY_TEMPLATES.balanced}
            icon={<Scale className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
            accentColor="blue"
            isSelected={selectedStrategy === 'balanced'}
            onSelect={() => onSelectStrategy('balanced')}
            amount={investmentAmount}
          />

          {/* 3. Aggressive Card */}
          <StrategyCard
            template={STRATEGY_TEMPLATES.aggressive}
            icon={<TrendingUp className="w-5 h-5 text-purple-700 dark:text-purple-400" />}
            accentColor="purple"
            isSelected={selectedStrategy === 'aggressive'}
            onSelect={() => onSelectStrategy('aggressive')}
            amount={investmentAmount}
          />
        </div>
      </div>
    </div>
  );
};

interface StrategyCardProps {
  template: (typeof STRATEGY_TEMPLATES)[StrategyId];
  icon: React.ReactNode;
  accentColor: 'emerald' | 'blue' | 'purple';
  isSelected: boolean;
  onSelect: () => void;
  amount: number;
}

const StrategyCard: React.FC<StrategyCardProps> = ({
  template,
  icon,
  accentColor,
  isSelected,
  onSelect,
  amount,
}) => {
  const borderStyles = {
    emerald: isSelected
      ? 'border-emerald-500/80 bg-surface/90 dark:bg-slate-900/90 shadow-xl shadow-emerald-500/10 ring-1 ring-emerald-500/50'
      : 'border-border/90 dark:border-slate-800/90 hover:border-border dark:hover:border-slate-700 bg-surface/60 dark:bg-slate-900/60',
    blue: isSelected
      ? 'border-blue-500/80 bg-surface/90 dark:bg-slate-900/90 shadow-xl shadow-blue-500/10 ring-1 ring-blue-500/50'
      : 'border-border/90 dark:border-slate-800/90 hover:border-border dark:hover:border-slate-700 bg-surface/60 dark:bg-slate-900/60',
    purple: isSelected
      ? 'border-purple-500/80 bg-surface/90 dark:bg-slate-900/90 shadow-xl shadow-purple-500/10 ring-1 ring-purple-500/50'
      : 'border-border/90 dark:border-slate-800/90 hover:border-border dark:hover:border-slate-700 bg-surface/60 dark:bg-slate-900/60',
  }[accentColor];

  const badgeStyles = {
    emerald: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
    blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    purple: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20',
  }[accentColor];

  return (
    <div
      onClick={onSelect}
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      aria-label={template.name}
      onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(); } }}
      className={`rounded-2xl border p-5 cursor-pointer transition-all relative flex flex-col justify-between ${borderStyles}`}
    >
      <div>
        {/* Top Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-surface-raised/80 dark:bg-slate-800/80 border border-border/60 dark:border-slate-700/60">
              {icon}
            </div>
            <div>
              <h4 className="text-base font-bold text-foreground dark:text-white tracking-tight">
                {template.name}
              </h4>
              <p className="text-[11px] text-muted dark:text-slate-400 font-medium">
                {template.tagline}
              </p>
            </div>
          </div>

          <div
            className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
              isSelected
                ? 'border-blue-500 bg-blue-600 text-white'
                : 'border-border dark:border-slate-700 bg-surface-raised/50 dark:bg-slate-800/50'
            }`}
          >
            {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-foreground dark:text-slate-300 line-clamp-3 leading-relaxed mb-4">
          {template.description}
        </p>

        {/* Key Metrics Row */}
        <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-background/60 dark:bg-slate-950/60 border border-border/60 dark:border-slate-800/60 text-xs mb-4">
          <div>
            <span className="text-[10px] text-muted dark:text-slate-400 block uppercase font-medium">
              Equity Exposure
            </span>
            <span className="font-bold text-foreground dark:text-slate-100 text-sm">
              {template.equityExposurePct}%
            </span>
          </div>
          <div>
            <span className="text-[10px] text-muted dark:text-slate-400 block uppercase font-medium">
              Defensive Assets
            </span>
            <span className="font-bold text-foreground dark:text-slate-100 text-sm">
              {template.defensiveExposurePct}%
            </span>
          </div>
        </div>

        {/* Template Allocation Chips */}
        <div className="space-y-1.5 mb-4">
          <span className="text-[10px] font-semibold text-muted dark:text-slate-400 uppercase tracking-wider block">
            Illustrative Allocation Breakdown (100%):
          </span>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(template.allocations)
              .filter(([, pct]) => pct > 0)
              .map(([assetClass, pct]) => (
                <span
                  key={assetClass}
                  className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-surface-raised/90 dark:bg-slate-800/90 text-foreground dark:text-slate-200 border border-border/60 dark:border-slate-700/60"
                >
                  {assetClass.toUpperCase()}: <span className="font-semibold text-foreground dark:text-white">{pct}%</span>
                </span>
              ))}
          </div>
        </div>
      </div>

      {/* Footer Pill */}
      <div className="pt-3 border-t border-border/80 dark:border-slate-800/80 flex items-center justify-between text-xs">
        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${badgeStyles}`}>
          {template.riskProfileLabel}
        </span>
        <span className="text-[11px] text-muted dark:text-slate-400 font-medium">
          {formatIndianCurrency(amount)}
        </span>
      </div>
    </div>
  );
};
