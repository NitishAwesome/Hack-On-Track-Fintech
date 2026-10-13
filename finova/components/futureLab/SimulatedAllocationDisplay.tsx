'use client';

// ============================================================
// FINOVA — Future Lab 2.0: Simulated Allocation Display Component
// components/futureLab/SimulatedAllocationDisplay.tsx
//
// Shows immediate, deterministic allocation of the simulated amount:
// - Recharts Donut Chart with center label
// - Category-by-Category Rupee & Percentage Breakdown
// - Broad Exposure Cards (Equities, Defensive, Gold, Alternatives)
// - Plain-Language Educational Explanation & Key Risk Considerations
// ============================================================

import React from 'react';
import Link from 'next/link';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import {
  PieChart as PieIcon,
  AlertTriangle,
  Info,
  TrendingUp,
  Shield,
  Coins,
  Building,
  ArrowRight,
} from 'lucide-react';
import {
  type StrategyAllocationResult,
  type StrategyId,
} from '@/lib/calculations/futureLab';
import { formatIndianCurrency } from '@/lib/utils';
import type { AssetClass } from '@/types/portfolio';

interface SimulatedAllocationDisplayProps {
  allocation: StrategyAllocationResult;
  selectedStrategy: StrategyId;
}

const ASSET_CLASS_COLORS: Record<string, string> = {
  equity: '#3B82F6', // Blue
  bond: '#10B981', // Emerald
  mf: '#8B5CF6', // Purple
  sgb: '#F59E0B', // Amber
  reit: '#EC4899', // Pink
  invit: '#06B6D4', // Cyan
  etf: '#6366F1', // Indigo
};

// Declared outside component render function for React 19 / ESLint compliance
interface TooltipPayloadItem {
  name: string;
  value: number;
  payload: {
    name: string;
    value: number;
    percentage: number;
    rupees: number;
    color: string;
    assetClass: AssetClass;
  };
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}

const CustomDonutTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (active && payload && payload.length > 0) {
    const data = payload[0].payload;
    return (
      <div className="bg-surface/95 dark:bg-slate-900/95 border border-border/80 dark:border-slate-700/80 rounded-xl p-3 shadow-xl backdrop-blur-md text-xs space-y-1">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }} />
          <span className="font-semibold text-foreground dark:text-white">{data.name}</span>
        </div>
        <div className="flex justify-between gap-4 text-foreground dark:text-slate-300">
          <span>Allocation:</span>
          <span className="font-bold text-foreground dark:text-white">{data.percentage}%</span>
        </div>
        <div className="flex justify-between gap-4 text-foreground dark:text-slate-300">
          <span>Rupee Value:</span>
          <span className="font-bold text-emerald-700 dark:text-emerald-400">
            {formatIndianCurrency(data.rupees)}
          </span>
        </div>
      </div>
    );
  }
  return null;
};

export const SimulatedAllocationDisplay: React.FC<SimulatedAllocationDisplayProps> = ({
  allocation,
  selectedStrategy,
}) => {
  const chartData = allocation.categories.map((cat) => ({
    name: cat.displayName,
    value: cat.allocatedRupees,
    percentage: cat.percentage,
    rupees: cat.allocatedRupees,
    color: ASSET_CLASS_COLORS[cat.assetClass] || '#64748B',
    assetClass: cat.assetClass,
  }));

  return (
    <div className="space-y-6">
      {/* ─── Main Grid: Donut + Category Breakdown ──────────────── */}
      <div className="bg-surface/80 dark:bg-slate-900/80 border border-border dark:border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400">
              <PieIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground dark:text-white tracking-tight">
                Simulated Allocation Breakdown
              </h3>
              <p className="text-xs text-muted dark:text-slate-400">
                Direct rupee and percentage distribution for {allocation.strategyName} ({selectedStrategy.toUpperCase()})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted dark:text-slate-400">Total Simulated Capital:</span>
            <span className="px-3 py-1 rounded-lg text-sm font-bold bg-surface-raised dark:bg-slate-800 text-foreground dark:text-white border border-border dark:border-slate-700">
              {formatIndianCurrency(allocation.totalAmount)}
            </span>
          </div>
        </div>

        {/* 2-Column: Chart on Left, Details on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Donut Chart */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center relative min-h-[280px]">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={72}
                  outerRadius={105}
                  paddingAngle={3}
                  dataKey="value"
                  animationDuration={600}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="rgb(var(--surface))" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip content={<CustomDonutTooltip />} />
              </PieChart>
            </ResponsiveContainer>

            {/* Center Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
              <span className="text-[11px] text-muted dark:text-slate-400 font-medium uppercase tracking-wider">
                Simulated
              </span>
              <span className="text-lg font-bold text-foreground dark:text-white tracking-tight">
                {formatIndianCurrency(allocation.totalAmount)}
              </span>
              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 mt-1">
                {allocation.strategyName.replace(' Strategy', '')}
              </span>
            </div>
          </div>

          {/* Category-by-Category Rows */}
          <div className="lg:col-span-7 space-y-3.5">
            {allocation.categories.map((cat) => {
              const color = ASSET_CLASS_COLORS[cat.assetClass] || '#64748B';
              return (
                <div
                  key={cat.assetClass}
                  className="p-3.5 rounded-xl bg-background/60 dark:bg-slate-950/60 border border-border/80 dark:border-slate-800/80 hover:border-border/90 dark:hover:border-slate-700/90 transition-colors"
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                      <span className="font-semibold text-foreground dark:text-white">{cat.displayName}</span>
                      <span className="text-[11px] text-muted dark:text-slate-400 font-medium">({cat.percentage}%)</span>
                    </div>
                    <span className="font-bold text-foreground dark:text-white text-sm">
                      {formatIndianCurrency(cat.allocatedRupees)}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-surface-raised/60 dark:bg-slate-800/60 rounded-full h-1.5 overflow-hidden mb-1.5">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${cat.percentage}%`, backgroundColor: color }}
                    />
                  </div>

                  <p className="text-[11px] text-muted dark:text-slate-400 line-clamp-1">
                    {cat.rationale}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── Broad Exposure Summary Cards ──────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Equities Exposure */}
        <div className="p-4 rounded-xl bg-surface/80 dark:bg-slate-900/80 border border-border dark:border-slate-800 flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shrink-0">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-semibold text-muted dark:text-slate-400 uppercase tracking-wider block">
              Equities & Funds
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-lg font-bold text-foreground dark:text-white">
                {allocation.exposures.equityPct}%
              </span>
              <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold">
                {formatIndianCurrency(allocation.exposures.equityRupees)}
              </span>
            </div>
            <p className="text-[10px] text-muted dark:text-slate-400 mt-1">
              Drives primary economic compounding & long-term capital gains.
            </p>
          </div>
        </div>

        {/* Defensive Exposure */}
        <div className="p-4 rounded-xl bg-surface/80 dark:bg-slate-900/80 border border-border dark:border-slate-800 flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-semibold text-muted dark:text-slate-400 uppercase tracking-wider block">
              Fixed Income & Liquid
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-lg font-bold text-foreground dark:text-white">
                {allocation.exposures.defensivePct}%
              </span>
              <span className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
                {formatIndianCurrency(allocation.exposures.defensiveRupees)}
              </span>
            </div>
            <p className="text-[10px] text-muted dark:text-slate-400 mt-1">
              Contractual coupon cash flows and emergency liquidity cushion.
            </p>
            <div className="pt-2">
              <Link
                href="/bonds"
                className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
              >
                <span>Explore Bond Options</span>
                <ArrowRight className="w-2.5 h-2.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Gold & SGBs */}
        <div className="p-4 rounded-xl bg-surface/80 dark:bg-slate-900/80 border border-border dark:border-slate-800 flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 shrink-0">
            <Coins className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-semibold text-muted dark:text-slate-400 uppercase tracking-wider block">
              Gold & SGBs
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-lg font-bold text-foreground dark:text-white">
                {allocation.exposures.goldPct}%
              </span>
              <span className="text-xs text-amber-700 dark:text-amber-400 font-semibold">
                {formatIndianCurrency(allocation.exposures.goldRupees)}
              </span>
            </div>
            <p className="text-[10px] text-muted dark:text-slate-400 mt-1">
              Monetary hedge against currency depreciation & geopolitical stress.
            </p>
          </div>
        </div>

        {/* Real Estate / Alternatives */}
        <div className="p-4 rounded-xl bg-surface/80 dark:bg-slate-900/80 border border-border dark:border-slate-800 flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-pink-500/10 text-pink-700 dark:text-pink-400 border border-pink-500/20 shrink-0">
            <Building className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-semibold text-muted dark:text-slate-400 uppercase tracking-wider block">
              Real Estate / Alternatives
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-lg font-bold text-foreground dark:text-white">
                {allocation.exposures.alternativesPct}%
              </span>
              <span className="text-xs text-pink-700 dark:text-pink-400 font-semibold">
                {formatIndianCurrency(allocation.exposures.alternativesRupees)}
              </span>
            </div>
            <p className="text-[10px] text-muted dark:text-slate-400 mt-1">
              Quarterly NDCF dividend distributions from commercial properties.
            </p>
            <div className="pt-2 flex items-center gap-3">
              <Link
                href="/reit"
                className="inline-flex items-center gap-1 text-[10px] font-semibold text-pink-700 dark:text-pink-400 hover:text-pink-700 dark:hover:text-pink-300 transition-colors"
              >
                <span>Explore REIT Options</span>
                <ArrowRight className="w-2.5 h-2.5" />
              </Link>
              <Link
                href="/invit"
                className="inline-flex items-center gap-1 text-[10px] font-semibold text-cyan-700 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 transition-colors"
              >
                <span>Explore InvIT Options</span>
                <ArrowRight className="w-2.5 h-2.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Plain-Language Explanation & Risk Considerations ───── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Narrative Explanation */}
        <div className="bg-surface/70 dark:bg-slate-900/70 border border-border dark:border-slate-800 rounded-xl p-5 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground dark:text-slate-200">
            <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Why This Allocation Was Structured</span>
          </div>
          <p className="text-xs text-foreground dark:text-slate-300 leading-relaxed">
            {allocation.narrativeExplanation}
          </p>
          <p className="text-[11px] text-muted dark:text-slate-500 pt-1 border-t border-border/80 dark:border-slate-800/80">
            Percentages come from documented strategy templates totaling 100%. Rupee values are computed directly from your entered amount with zero rounding leakage.
          </p>
        </div>

        {/* Key Risk Considerations */}
        <div className="bg-surface/70 dark:bg-slate-900/70 border border-border dark:border-slate-800 rounded-xl p-5 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 dark:text-amber-300">
            <AlertTriangle className="w-4 h-4 text-amber-700 dark:text-amber-400" />
            <span>Main Risk Considerations to Review</span>
          </div>
          <ul className="space-y-1.5 text-xs text-foreground dark:text-slate-300">
            {allocation.keyRiskConsiderations.map((risk, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-amber-700/80 dark:text-amber-400/80 mt-0.5">•</span>
                <span className="leading-snug text-[11px] text-foreground dark:text-slate-300">{risk}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
