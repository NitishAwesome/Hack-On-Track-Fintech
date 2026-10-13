'use client';

// ============================================================
// FINOVA — Future Lab 2.0: Advanced Rebalancing Drawer Component
// components/futureLab/AdvancedRebalancingDrawer.tsx
//
// Relocates original What-If Category Transfer & Custom Target Percentages
// under an optional collapsible sandbox with clear educational explanations:
// - Category-to-Category Transfer (e.g., Shift 20% from Equity to Bond)
// - Custom Target Percentage Slider Grid (must sum to 100%)
// - Read-only simulation strictly preserving capital
// ============================================================

import React, { useState } from 'react';
import {
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import {
  type WhatIfSimulationResult,
  runWhatIfSimulation,
} from '@/lib/calculations/futureLab';
import { formatIndianCurrency } from '@/lib/utils';
import type { HoldingWithMetrics, AssetClass } from '@/types/portfolio';

interface AdvancedRebalancingDrawerProps {
  holdings: HoldingWithMetrics[];
  onSimulationRun?: (result: WhatIfSimulationResult) => void;
}

export const AdvancedRebalancingDrawer: React.FC<AdvancedRebalancingDrawerProps> = ({
  holdings,
  onSimulationRun,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [mode, setMode] = useState<'TRANSFER' | 'CUSTOM_TARGETS'>('TRANSFER');

  // Transfer State
  const [fromClass, setFromClass] = useState<AssetClass>('equity');
  const [toClass, setToClass] = useState<AssetClass>('bond');
  const [transferPercent, setTransferPercent] = useState<number>(20);

  // Custom Target Percentages State
  const [targets, setTargets] = useState<{
    equity: number;
    bond: number;
    mf: number;
    sgb: number;
    reit: number;
  }>({
    equity: 50,
    bond: 30,
    mf: 10,
    sgb: 5,
    reit: 5,
  });

  const [simResult, setSimResult] = useState<WhatIfSimulationResult | null>(null);
  const [simError, setSimError] = useState<string | null>(null);

  const targetSum = Object.values(targets).reduce((a, b) => a + b, 0);

  const handleRunTransfer = () => {
    setSimError(null);
    try {
      if (fromClass === toClass) {
        setSimError('Source and destination categories must be different.');
        return;
      }
      const res = runWhatIfSimulation(holdings, [], {
        scenarioType: 'REALLOCATION',
        transfer: {
          fromClass,
          toClass,
          percentage: transferPercent,
        },
      });
      setSimResult(res);
      onSimulationRun?.(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to simulate transfer.';
      setSimError(msg);
    }
  };

  const handleRunCustomTargets = () => {
    setSimError(null);
    if (Math.abs(targetSum - 100) > 0.05) {
      setSimError(`Target percentages must sum to exactly 100% (currently ${targetSum}%).`);
      return;
    }
    try {
      const res = runWhatIfSimulation(holdings, [], {
        scenarioType: 'TARGET_ALLOCATION',
        targetPercentages: targets,
      });
      setSimResult(res);
      onSimulationRun?.(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to simulate target allocation.';
      setSimError(msg);
    }
  };

  return (
    <div className="bg-surface/60 dark:bg-slate-900/60 border border-border dark:border-slate-800 rounded-2xl p-6 backdrop-blur-sm space-y-4">
      {/* Collapsible Header */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between text-left group"
      >
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-surface-raised dark:bg-slate-800 text-foreground dark:text-slate-300 border border-border/80 dark:border-slate-700/80 group-hover:text-foreground dark:group-hover:text-white transition-colors">
            <SlidersHorizontal className="w-5 h-5 text-purple-700 dark:text-purple-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground dark:text-white tracking-tight flex items-center gap-2">
              <span>Advanced Rebalancing Sandbox</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-surface-raised dark:bg-slate-800 text-muted dark:text-slate-400 border border-border dark:border-slate-700">
                Optional Power Tool
              </span>
            </h3>
            <p className="text-xs text-muted dark:text-slate-400">
              Simulate shifting existing capital between asset classes or define custom target percentages
            </p>
          </div>
        </div>

        <div className="p-2 rounded-lg bg-surface-raised/80 dark:bg-slate-800/80 text-muted dark:text-slate-400 group-hover:text-foreground dark:group-hover:text-white transition-colors">
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Collapsed Body */}
      {isOpen && (
        <div className="pt-4 border-t border-border/80 dark:border-slate-800/80 space-y-5">
          {/* Sub-mode selector */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode('TRANSFER')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                mode === 'TRANSFER'
                  ? 'bg-blue-600 text-white'
                  : 'bg-surface-raised dark:bg-slate-800 text-muted dark:text-slate-400 hover:text-foreground dark:hover:text-white'
              }`}
            >
              Category-to-Category Transfer
            </button>
            <button
              type="button"
              onClick={() => setMode('CUSTOM_TARGETS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                mode === 'CUSTOM_TARGETS'
                  ? 'bg-blue-600 text-white'
                  : 'bg-surface-raised dark:bg-slate-800 text-muted dark:text-slate-400 hover:text-foreground dark:hover:text-white'
              }`}
            >
              Custom Target Distribution
            </button>
          </div>

          {/* Mode 1: Transfer */}
          {mode === 'TRANSFER' ? (
            <div className="p-4 rounded-xl bg-background/70 dark:bg-slate-950/70 border border-border/80 dark:border-slate-800/80 space-y-4">
              <div className="text-xs text-foreground dark:text-slate-300">
                Simulate moving a percentage of capital currently held in one category into another (e.g. trimming equities to buy bonds).
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="text-muted dark:text-slate-400 block mb-1 font-medium">From Category:</label>
                  <select
                    value={fromClass}
                    onChange={(e) => setFromClass(e.target.value as AssetClass)}
                    className="w-full bg-surface dark:bg-slate-900 border border-border dark:border-slate-800 rounded-lg p-2 text-foreground dark:text-white outline-none focus:border-blue-500"
                  >
                    <option value="equity">Equities & Stocks</option>
                    <option value="mf">Mutual Funds</option>
                    <option value="bond">Bonds & Fixed Income</option>
                    <option value="sgb">Gold & SGBs</option>
                    <option value="reit">REITs</option>
                  </select>
                </div>

                <div>
                  <label className="text-muted dark:text-slate-400 block mb-1 font-medium">To Category:</label>
                  <select
                    value={toClass}
                    onChange={(e) => setToClass(e.target.value as AssetClass)}
                    className="w-full bg-surface dark:bg-slate-900 border border-border dark:border-slate-800 rounded-lg p-2 text-foreground dark:text-white outline-none focus:border-blue-500"
                  >
                    <option value="bond">Bonds & Fixed Income</option>
                    <option value="sgb">Gold & SGBs</option>
                    <option value="reit">REITs</option>
                    <option value="equity">Equities & Stocks</option>
                    <option value="mf">Mutual Funds</option>
                  </select>
                </div>

                <div>
                  <label className="text-muted dark:text-slate-400 block mb-1 font-medium">
                    Transfer Portion: <strong className="text-foreground dark:text-white">{transferPercent}%</strong>
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="100"
                    step="5"
                    value={transferPercent}
                    onChange={(e) => setTransferPercent(parseInt(e.target.value, 10))}
                    className="w-full accent-blue-500 mt-2"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleRunTransfer}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Simulate Shift</span>
              </button>
            </div>
          ) : (
            /* Mode 2: Custom Target Distribution */
            <div className="p-4 rounded-xl bg-background/70 dark:bg-slate-950/70 border border-border/80 dark:border-slate-800/80 space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-foreground dark:text-slate-300">
                  Set custom target weights for your portfolio. Must total 100%.
                </span>
                <span
                  className={`font-bold px-2 py-0.5 rounded text-xs ${
                    targetSum === 100
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                      : 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                  }`}
                >
                  Sum: {targetSum}%
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                {Object.entries(targets).map(([key, val]) => (
                  <div key={key}>
                    <label className="text-muted dark:text-slate-400 block mb-1 font-medium capitalize">
                      {key.toUpperCase()}: <span className="text-foreground dark:text-white font-bold">{val}%</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={val}
                      onChange={(e) => {
                        const num = parseInt(e.target.value || '0', 10);
                        setTargets((prev) => ({ ...prev, [key]: num }));
                      }}
                      className="w-full bg-surface dark:bg-slate-900 border border-border dark:border-slate-800 rounded-lg p-2 text-foreground dark:text-white outline-none focus:border-blue-500 text-xs font-semibold"
                    />
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleRunCustomTargets}
                disabled={targetSum !== 100}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Simulate Custom Targets</span>
              </button>
            </div>
          )}

          {simError && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{simError}</span>
            </div>
          )}

          {/* Results preview if simulated */}
          {simResult && (
            <div className="p-4 rounded-xl bg-surface dark:bg-slate-900 border border-border dark:border-slate-800 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground dark:text-white">Rebalancing Simulation Output:</span>
                <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                  Preserved Capital: {formatIndianCurrency(simResult.simulatedSummary.totalSimulatedCapital)}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {simResult.assetClassAllocations.filter((a) => a.simulatedValue > 0).map((a) => (
                  <div key={a.assetClass} className="p-2 rounded bg-background dark:bg-slate-950 border border-border dark:border-slate-800 text-[11px]">
                    <div className="text-muted dark:text-slate-400">{a.displayName.split(' ')[0]}</div>
                    <div className="font-bold text-foreground dark:text-white">{formatIndianCurrency(a.simulatedValue)} ({a.simulatedPercent}%)</div>
                    {a.deltaPercent !== 0 && (
                      <div className={`text-[10px] ${a.deltaPercent > 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-muted dark:text-slate-500'}`}>
                        {a.deltaPercent > 0 ? '+' : ''}{a.deltaPercent}%
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
