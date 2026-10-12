'use client';

// ============================================================
// FINOVA — Future Lab 2.0: Strategy Comparison Table Component
// components/futureLab/StrategyComparisonTable.tsx
//
// Side-by-side comparison matrix for Conservative vs Balanced vs Aggressive:
// - Equity Exposure & Defensive Weights
// - Volatility Profile & Short-Term Fluctuations
// - Guaranteed Returns Clarification (Strictly NONE across all)
// - Full Template Allocations (%) & Rationale
// ============================================================

import React from 'react';
import {
  Scale,
  ShieldAlert,
} from 'lucide-react';
import {
  STRATEGY_TEMPLATES,
  type StrategyId,
} from '@/lib/calculations/futureLab';

interface StrategyComparisonTableProps {
  selectedStrategy: StrategyId;
  onSelectStrategy: (strategy: StrategyId) => void;
}

export const StrategyComparisonTable: React.FC<StrategyComparisonTableProps> = ({
  selectedStrategy,
  onSelectStrategy,
}) => {
  const c = STRATEGY_TEMPLATES.conservative;
  const b = STRATEGY_TEMPLATES.balanced;
  const a = STRATEGY_TEMPLATES.aggressive;

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">
              Compare All Three Strategies Side-by-Side
            </h3>
            <p className="text-xs text-slate-400">
              Evaluate key trade-offs between capital preservation, income, and drawdown volatility
            </p>
          </div>
        </div>

        <span className="text-[11px] font-semibold text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/60 self-start sm:self-auto">
          Educational Benchmark Templates
        </span>
      </div>

      {/* Comparison Table */}
      <div className="overflow-x-auto -mx-6 px-6">
        <table className="w-full text-left text-xs border-collapse min-w-[640px]">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
              <th className="py-3 px-3 font-semibold">Evaluation Factor</th>
              <th
                onClick={() => onSelectStrategy('conservative')}
                className={`py-3 px-4 font-bold cursor-pointer transition-colors ${
                  selectedStrategy === 'conservative'
                    ? 'text-emerald-400 bg-emerald-500/5'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Conservative {selectedStrategy === 'conservative' && '✓'}
              </th>
              <th
                onClick={() => onSelectStrategy('balanced')}
                className={`py-3 px-4 font-bold cursor-pointer transition-colors ${
                  selectedStrategy === 'balanced'
                    ? 'text-blue-400 bg-blue-500/5'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Balanced {selectedStrategy === 'balanced' && '✓'}
              </th>
              <th
                onClick={() => onSelectStrategy('aggressive')}
                className={`py-3 px-4 font-bold cursor-pointer transition-colors ${
                  selectedStrategy === 'aggressive'
                    ? 'text-purple-400 bg-purple-500/5'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Aggressive {selectedStrategy === 'aggressive' && '✓'}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300">
            {/* 1. Equity Exposure */}
            <tr className="hover:bg-slate-800/30">
              <td className="py-3 px-3 font-semibold text-white">Equity Exposure</td>
              <td className={`py-3 px-4 ${selectedStrategy === 'conservative' ? 'bg-emerald-500/5 font-semibold text-emerald-300' : ''}`}>
                Lower (25% via mutual funds)
              </td>
              <td className={`py-3 px-4 ${selectedStrategy === 'balanced' ? 'bg-blue-500/5 font-semibold text-blue-300' : ''}`}>
                Medium (50% combined)
              </td>
              <td className={`py-3 px-4 ${selectedStrategy === 'aggressive' ? 'bg-purple-500/5 font-semibold text-purple-300' : ''}`}>
                Higher (80% combined)
              </td>
            </tr>

            {/* 2. Defensive Asset Allocation */}
            <tr className="hover:bg-slate-800/30">
              <td className="py-3 px-3 font-semibold text-white">Defensive Allocation</td>
              <td className={`py-3 px-4 ${selectedStrategy === 'conservative' ? 'bg-emerald-500/5 font-semibold text-emerald-300' : ''}`}>
                Higher (60% bonds + liquid)
              </td>
              <td className={`py-3 px-4 ${selectedStrategy === 'balanced' ? 'bg-blue-500/5 font-semibold text-blue-300' : ''}`}>
                Medium (30% fixed income)
              </td>
              <td className={`py-3 px-4 ${selectedStrategy === 'aggressive' ? 'bg-purple-500/5 font-semibold text-purple-300' : ''}`}>
                Lower (10% fixed income)
              </td>
            </tr>

            {/* 3. Gold & Alternatives */}
            <tr className="hover:bg-slate-800/30">
              <td className="py-3 px-3 font-semibold text-white">Gold & Real Estate (REITs)</td>
              <td className={`py-3 px-4 ${selectedStrategy === 'conservative' ? 'bg-emerald-500/5' : ''}`}>
                15% Gold / SGBs
              </td>
              <td className={`py-3 px-4 ${selectedStrategy === 'balanced' ? 'bg-blue-500/5' : ''}`}>
                10% Gold + 10% REITs (20%)
              </td>
              <td className={`py-3 px-4 ${selectedStrategy === 'aggressive' ? 'bg-purple-500/5' : ''}`}>
                5% Gold + 5% REITs (10%)
              </td>
            </tr>

            {/* 4. Potential Volatility Exposure */}
            <tr className="hover:bg-slate-800/30">
              <td className="py-3 px-3 font-semibold text-white">Potential Volatility Exposure</td>
              <td className={`py-3 px-4 ${selectedStrategy === 'conservative' ? 'bg-emerald-500/5' : ''}`}>
                Generally lower
              </td>
              <td className={`py-3 px-4 ${selectedStrategy === 'balanced' ? 'bg-blue-500/5' : ''}`}>
                Intermediate
              </td>
              <td className={`py-3 px-4 ${selectedStrategy === 'aggressive' ? 'bg-purple-500/5' : ''}`}>
                Generally higher
              </td>
            </tr>

            {/* 5. Short-Term Price Fluctuations */}
            <tr className="hover:bg-slate-800/30">
              <td className="py-3 px-3 font-semibold text-white">Short-Term Price Fluctuations</td>
              <td className={`py-3 px-4 ${selectedStrategy === 'conservative' ? 'bg-emerald-500/5' : ''}`}>
                Still possible (interest rates / gold)
              </td>
              <td className={`py-3 px-4 ${selectedStrategy === 'balanced' ? 'bg-blue-500/5' : ''}`}>
                Possible (cyclical corrections)
              </td>
              <td className={`py-3 px-4 ${selectedStrategy === 'aggressive' ? 'bg-purple-500/5' : ''}`}>
                Potentially substantial
              </td>
            </tr>

            {/* 6. Guaranteed Returns */}
            <tr className="hover:bg-slate-800/30">
              <td className="py-3 px-3 font-semibold text-amber-300">Guaranteed Returns</td>
              <td className={`py-3 px-4 font-bold text-amber-400 ${selectedStrategy === 'conservative' ? 'bg-emerald-500/5' : ''}`}>
                None
              </td>
              <td className={`py-3 px-4 font-bold text-amber-400 ${selectedStrategy === 'balanced' ? 'bg-blue-500/5' : ''}`}>
                None
              </td>
              <td className={`py-3 px-4 font-bold text-amber-400 ${selectedStrategy === 'aggressive' ? 'bg-purple-500/5' : ''}`}>
                None
              </td>
            </tr>

            {/* 7. Full Template Allocation Breakdown */}
            <tr className="hover:bg-slate-800/30">
              <td className="py-3 px-3 font-semibold text-white">Template Allocations (100%)</td>
              <td className={`py-3 px-4 ${selectedStrategy === 'conservative' ? 'bg-emerald-500/5' : ''}`}>
                <div className="space-y-0.5 text-[11px]">
                  {c.illustrativeAssetGroups.map((group) => (
                    <div key={group}>• {group}</div>
                  ))}
                </div>
              </td>
              <td className={`py-3 px-4 ${selectedStrategy === 'balanced' ? 'bg-blue-500/5' : ''}`}>
                <div className="space-y-0.5 text-[11px]">
                  {b.illustrativeAssetGroups.map((group) => (
                    <div key={group}>• {group}</div>
                  ))}
                </div>
              </td>
              <td className={`py-3 px-4 ${selectedStrategy === 'aggressive' ? 'bg-purple-500/5' : ''}`}>
                <div className="space-y-0.5 text-[11px]">
                  {a.illustrativeAssetGroups.map((group) => (
                    <div key={group}>• {group}</div>
                  ))}
                </div>
              </td>
            </tr>

            {/* 8. Primary Rationale */}
            <tr className="hover:bg-slate-800/30">
              <td className="py-3 px-3 font-semibold text-white">Strategic Rationale</td>
              <td className={`py-3 px-4 text-[11px] leading-relaxed ${selectedStrategy === 'conservative' ? 'bg-emerald-500/5' : ''}`}>
                Buffers capital against stock market crashes; prioritizes liquidity and inflation defense over maximum capital growth.
              </td>
              <td className={`py-3 px-4 text-[11px] leading-relaxed ${selectedStrategy === 'balanced' ? 'bg-blue-500/5' : ''}`}>
                Combines growth from businesses with yield from debt and real estate, reducing drawdown severity without sacrificing long-term compounding.
              </td>
              <td className={`py-3 px-4 text-[11px] leading-relaxed ${selectedStrategy === 'aggressive' ? 'bg-purple-500/5' : ''}`}>
                Maximizes equity ownership for multi-year compounding, tolerating steep temporary pullbacks for higher potential terminal wealth.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Statutory Disclaimer Box */}
      <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs text-amber-300/90 flex items-start gap-2.5">
        <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-[11px] leading-relaxed">
          <span className="font-semibold text-amber-300">Statutory Notice on Investment Scenarios: </span>
          FINOVA does not predict future market returns, annual CAGRs, or wealth projections. No asset class (including fixed income, mutual funds, or gold) is guaranteed to preserve capital or deliver positive returns. Past performance does not guarantee future results.
        </div>
      </div>
    </div>
  );
};
