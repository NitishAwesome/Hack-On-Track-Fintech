'use client';

// ============================================================
// FINOVA — Future Lab 2.0: Portfolio Before vs After Component
// components/futureLab/PortfolioBeforeAfterCard.tsx
//
// Grounded comparison of actual user portfolio vs simulated post-investment scenario:
// - Current market-valued capital vs Simulated total
// - Dual Recharts Donut Charts (Before vs After)
// - Asset class category delta cards (+ / - %)
// - Strict disclosure: Stock-level HHI & risk scores are provisional/unavailable
//   until specific securities are designated.
// - Plain-language observations on diversification shifts.
// ============================================================

import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import {
  TrendingUp,
  Info,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  type PortfolioBeforeAfterResult,
  type StrategyId,
} from '@/lib/calculations/futureLab';
import { formatIndianCurrency } from '@/lib/utils';
import type { AssetClass } from '@/types/portfolio';

interface PortfolioBeforeAfterCardProps {
  comparison: PortfolioBeforeAfterResult;
  selectedStrategy: StrategyId;
  strategyName: string;
}

const ASSET_CLASS_COLORS: Record<string, string> = {
  equity: '#3B82F6',
  bond: '#10B981',
  mf: '#8B5CF6',
  sgb: '#F59E0B',
  reit: '#EC4899',
  invit: '#06B6D4',
  etf: '#6366F1',
};

// Declared outside component render function for React 19 / ESLint compliance
interface TooltipPayloadItem {
  name: string;
  value: number;
  payload: {
    name: string;
    value: number;
    percentage: number;
    color: string;
    assetClass: AssetClass;
  };
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}

const MiniDonutTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (active && payload && payload.length > 0) {
    const data = payload[0].payload;
    return (
      <div className="bg-surface/95 dark:bg-slate-900/95 border border-border/80 dark:border-slate-700/80 rounded-xl p-2.5 shadow-xl backdrop-blur-md text-xs space-y-0.5">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: data.color }} />
          <span className="font-semibold text-foreground dark:text-white">{data.name}</span>
        </div>
        <div className="flex justify-between gap-3 text-foreground dark:text-slate-300 text-[11px]">
          <span>Weight:</span>
          <span className="font-bold text-foreground dark:text-white">{data.percentage.toFixed(1)}%</span>
        </div>
        <div className="flex justify-between gap-3 text-foreground dark:text-slate-300 text-[11px]">
          <span>Value:</span>
          <span className="font-bold text-emerald-700 dark:text-emerald-400">{formatIndianCurrency(data.value)}</span>
        </div>
      </div>
    );
  }
  return null;
};

export const PortfolioBeforeAfterCard: React.FC<PortfolioBeforeAfterCardProps> = ({
  comparison,
  selectedStrategy,
  strategyName,
}) => {
  const { baseline, simulated, hasHoldings, observations } = comparison;

  const baselineChartData = baseline.assetClassBreakdown.map((b) => ({
    name: b.displayName,
    value: b.value,
    percentage: b.percentage,
    color: ASSET_CLASS_COLORS[b.assetClass] || '#64748B',
    assetClass: b.assetClass,
  }));

  const simulatedChartData = simulated.assetClassBreakdown.map((s) => ({
    name: s.displayName,
    value: s.value,
    percentage: s.percentage,
    color: ASSET_CLASS_COLORS[s.assetClass] || '#64748B',
    assetClass: s.assetClass,
  }));

  return (
    <div className="bg-surface/80 dark:bg-slate-900/80 border border-border dark:border-slate-800 rounded-2xl p-6 backdrop-blur-sm space-y-6">
      {/* ─── Header ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground dark:text-white tracking-tight">
              Your Portfolio Today vs After This Scenario
            </h3>
            <p className="text-xs text-muted dark:text-slate-400">
              Deterministic comparison adding ₹{simulated.additionalAmount.toLocaleString('en-IN')} to your baseline portfolio
            </p>
          </div>
        </div>

        <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-lg self-start sm:self-auto capitalize">
          {strategyName} · {selectedStrategy.toUpperCase()}
        </span>
      </div>

      {/* ─── Dual Donut Comparison Panels ──────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 rounded-xl bg-background/60 dark:bg-slate-950/60 border border-border/80 dark:border-slate-800/80">
        {/* Left: Before (Today) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-semibold uppercase text-muted dark:text-slate-400 tracking-wider">
                Current Portfolio
              </span>
              <h4 className="text-base font-bold text-foreground dark:text-white">
                {hasHoldings ? formatIndianCurrency(baseline.valuationBase) : '₹0 (No Holdings)'}
              </h4>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-surface-raised dark:bg-slate-800 text-foreground dark:text-slate-300 border border-border dark:border-slate-700">
              {baseline.riskLabel} Risk ({baseline.riskScore}/100)
            </span>
          </div>

          <div className="h-44 relative flex items-center justify-center">
            {baselineChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={baselineChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {baselineChartData.map((entry, index) => (
                      <Cell key={`cell-base-${index}`} fill={entry.color} stroke="rgb(var(--surface))" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip content={<MiniDonutTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-xs text-muted dark:text-slate-500 italic">
                No active holdings recorded.
              </div>
            )}
            {baselineChartData.length > 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                <span className="text-[10px] text-muted dark:text-slate-400">Equity Weight</span>
                <span className="text-sm font-bold text-foreground dark:text-white">{baseline.equityWeightPct.toFixed(1)}%</span>
              </div>
            )}
          </div>

          {/* Current Breakdown Chips */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {baseline.assetClassBreakdown.map((b) => (
              <span
                key={b.assetClass}
                className="text-[10px] px-2 py-0.5 rounded bg-surface dark:bg-slate-900 border border-border dark:border-slate-800 text-foreground dark:text-slate-300 font-medium"
              >
                {b.displayName.split(' ')[0]}: <span className="font-semibold text-foreground dark:text-white">{b.percentage.toFixed(1)}%</span>
              </span>
            ))}
          </div>
        </div>

        {/* Right: After (Scenario) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-semibold uppercase text-blue-600 dark:text-blue-400 tracking-wider">
                Simulated Post-Investment
              </span>
              <h4 className="text-base font-bold text-foreground dark:text-white">
                {formatIndianCurrency(simulated.newTotalValuation)}
              </h4>
            </div>
            <div className="flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+{formatIndianCurrency(simulated.additionalAmount)}</span>
            </div>
          </div>

          <div className="h-44 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={simulatedChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {simulatedChartData.map((entry, index) => (
                    <Cell key={`cell-sim-${index}`} fill={entry.color} stroke="rgb(var(--surface))" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip content={<MiniDonutTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
              <span className="text-[10px] text-blue-600 dark:text-blue-400">Equity Weight</span>
              <span className="text-sm font-bold text-foreground dark:text-white">{simulated.equityWeightPct.toFixed(1)}%</span>
            </div>
          </div>

          {/* Simulated Breakdown Chips */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {simulated.assetClassBreakdown.map((s) => (
              <span
                key={s.assetClass}
                className="text-[10px] px-2 py-0.5 rounded bg-surface dark:bg-slate-900 border border-border dark:border-slate-800 text-foreground dark:text-slate-300 font-medium"
              >
                {s.displayName.split(' ')[0]}: <span className="font-semibold text-foreground dark:text-white">{s.percentage.toFixed(1)}%</span>
                {s.deltaPercentage !== 0 && (
                  <span className={`ml-1 text-[9px] font-bold ${s.deltaPercentage > 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-muted dark:text-slate-400'}`}>
                    ({s.deltaPercentage > 0 ? '+' : ''}{s.deltaPercentage.toFixed(1)}%)
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Category Exposure Shifts Grid ─────────────────────── */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-foreground dark:text-slate-300 uppercase tracking-wider">
          Asset-Class Category Capital Shifts
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {simulated.assetClassBreakdown.map((cat) => {
            const hasDelta = cat.deltaValue > 0;
            return (
              <div
                key={cat.assetClass}
                className="p-3 rounded-xl bg-background/70 dark:bg-slate-950/70 border border-border/80 dark:border-slate-800/80 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-semibold text-foreground dark:text-slate-200 block">{cat.displayName}</span>
                  <span className="text-[11px] text-muted dark:text-slate-400">
                    Now {formatIndianCurrency(cat.value)} ({cat.percentage.toFixed(1)}%)
                  </span>
                </div>
                {hasDelta ? (
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                    +{formatIndianCurrency(cat.deltaValue)}
                  </span>
                ) : (
                  <span className="text-[11px] text-muted dark:text-slate-500 font-medium">Unchanged</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Grounded Observations ─────────────────────────────── */}
      <div className="p-4 rounded-xl bg-surface dark:bg-slate-900 border border-border dark:border-slate-800 space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-foreground dark:text-slate-200">
          <Sparkles className="w-4 h-4 text-purple-700 dark:text-purple-400" />
          <span>Scenario Observations & Allocation Shifts</span>
        </div>
        <ul className="space-y-1.5 text-xs text-foreground dark:text-slate-300">
          {observations.map((obs, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="text-purple-700/80 dark:text-purple-400/80 mt-0.5">•</span>
              <span className="leading-relaxed">{obs}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* ─── Provisional Risk Disclosure (Mandatory) ───────────── */}
      <div className="p-3.5 rounded-xl bg-background dark:bg-slate-950 border border-border/80 dark:border-slate-800/80 flex items-start gap-3 text-xs text-muted dark:text-slate-400">
        <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="text-[11px] leading-relaxed">
          <span className="font-semibold text-foreground dark:text-slate-300">Stock-Level Risk Disclosure: </span>
          {simulated.provisionalRiskNotice} FINOVA strictly refuses to manufacture unverified future HHI or stock concentration scores until actual company shares or bond issues are designated.
        </div>
      </div>
    </div>
  );
};
