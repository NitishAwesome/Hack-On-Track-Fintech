'use client';
import { useReducedMotionConfig } from 'framer-motion';

// ============================================================
// FINOVA — Interactive Asset Allocation Section
// components/analysis/AssetAllocationSection.tsx
// ============================================================

import React from 'react';
import Link from 'next/link';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ArrowRight, Info, Filter } from 'lucide-react';
import { formatIndianCurrency } from '@/lib/utils';
import type { UnifiedXRayAnalysis } from '@/lib/calculations/xray';

const ASSET_CLASS_COLORS: Record<string, string> = {
  equity: '#3B82F6', // Blue
  mf: '#8B5CF6', // Purple
  etf: '#06B6D4', // Cyan
  bond: '#10B981', // Green
  reit: '#F59E0B', // Amber
  invit: '#EC4899', // Pink
  sgb: '#EAB308', // Gold
  gold: '#EAB308',
  other: '#6B7280', // Gray
};

interface AssetAllocationSectionProps {
  data: UnifiedXRayAnalysis;
  selectedAssetClassFilter: string;
  onSelectAssetClass: (assetClass: string) => void;
}

interface ChartDataItem {
  name: string;
  asset_class: string;
  value: number;
  invested_value: number;
  current_value: number | null;
  instruments_count: number;
  positions_count: number;
  color: string;
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartDataItem }>;
}) {
  if (!active || !payload || !payload.length) return null;
  const item = payload[0].payload;
  return (
    <div className="card p-3 text-xs space-y-1.5 shadow-xl border border-border bg-surface/95 backdrop-blur-sm min-w-44">
      <div className="flex items-center justify-between gap-2">
        <p className="font-bold text-foreground">{item.name}</p>
        <span className="font-mono font-bold text-brand-500">{item.value}%</span>
      </div>
      <div className="pt-1 border-t border-border/60 space-y-0.5 text-[11px] text-muted">
        <div className="flex justify-between">
          <span>Market Value:</span>
          <span className="font-mono font-semibold text-foreground">
            {item.current_value !== null
              ? formatIndianCurrency(item.current_value)
              : 'Unpriced'}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Invested Cost:</span>
          <span className="font-mono text-foreground">{formatIndianCurrency(item.invested_value)}</span>
        </div>
        <div className="flex justify-between">
          <span>Holdings:</span>
          <span className="font-medium text-foreground">
            {item.instruments_count} instrument{item.instruments_count !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
      <p className="text-[10px] text-brand-500 pt-1 italic">Click segment to filter table below</p>
    </div>
  );
}

export function AssetAllocationSection({
  data,
  selectedAssetClassFilter,
  onSelectAssetClass,
}: AssetAllocationSectionProps) {
  const reducedMotion = useReducedMotionConfig();
  const { asset_class_breakdown } = data;

  // Filter only asset classes with non-zero allocation
  const activeItems = asset_class_breakdown.filter(
    (item) => item.invested_value > 0 || (item.current_value !== null && item.current_value > 0)
  );

  const is100PercentEquity =
    activeItems.length === 1 && activeItems[0].asset_class === 'equity';

  const chartData: ChartDataItem[] = activeItems.map((item) => ({
    name: item.display_name,
    asset_class: item.asset_class,
    value: Number(item.percentage_of_valued.toFixed(1)),
    invested_value: item.invested_value,
    current_value: item.current_value,
    instruments_count: item.distinct_instruments_count,
    positions_count: item.positions_count,
    color: ASSET_CLASS_COLORS[item.asset_class] || '#3B82F6',
  }));

  return (
    <div className="card p-5 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-foreground">Asset Class Allocation</h2>
            <span className="text-[11px] px-2 py-0.5 rounded font-semibold bg-brand-500/10 text-brand-500">
              {activeItems.length} Asset Categor{activeItems.length === 1 ? 'y' : 'ies'}
            </span>
          </div>
          <p className="text-xs text-muted mt-0.5">
            Distribution of your valued capital across asset types. Click any slice or card to filter holdings.
          </p>
        </div>

        {selectedAssetClassFilter !== 'all' && (
          <button
            onClick={() => onSelectAssetClass('all')}
            className="text-xs text-brand-500 hover:underline inline-flex items-center gap-1 self-start sm:self-auto"
          >
            <Filter className="w-3 h-3" />
            <span>Reset filter ({selectedAssetClassFilter.toUpperCase()})</span>
          </button>
        )}
      </div>

      {/* 100% Equity Warning (Phase 4 Edge Case) */}
      {is100PercentEquity && (
        <div className="p-3.5 rounded-xl bg-brand-500/5 border border-brand-500/20 flex items-start gap-3 text-xs">
          <Info className="w-4 h-4 text-brand-500 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-foreground">100% Equity Exposure Detected</p>
            <p className="text-muted leading-relaxed">
              Your entire portfolio is concentrated in equities with 0% allocation to fixed income, gold, REITs, or InvITs. While stocks provide capital growth, having no alternative asset classes increases portfolio volatility during broader equity market drawdowns.
            </p>
          </div>
        </div>
      )}

      {/* Grid: Donut Chart on Left, Breakdown Cards/Table on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Donut Chart */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center relative min-h-[280px]">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                isAnimationActive={!reducedMotion}
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={68}
                outerRadius={98}
                paddingAngle={3}
                dataKey="value"
                onClick={(entry) => {
                  const target = entry.asset_class;
                  onSelectAssetClass(selectedAssetClassFilter === target ? 'all' : target);
                }}
                className="cursor-pointer focus:outline-none"
              >
                {chartData.map((entry, index) => {
                  const isSelected = selectedAssetClassFilter === entry.asset_class;
                  return (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      stroke={isSelected ? 'rgb(var(--foreground))' : 'transparent'}
                      strokeWidth={isSelected ? 2 : 0}
                      opacity={
                        selectedAssetClassFilter === 'all' || isSelected
                          ? 1
                          : 0.35
                      }
                    />
                  );
                })}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>

          {/* Center text in donut */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
            <p className="text-xs text-muted uppercase font-semibold tracking-wider">Top Class</p>
            <p className="text-sm font-bold text-foreground">
              {data.summary.top_asset_class}
            </p>
            <p className="text-xs font-mono font-bold text-brand-500">
              {data.summary.top_asset_class_weight.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Supporting Cards / Table on Right */}
        <div className="lg:col-span-7 space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {chartData.map((item) => {
              const isSelected = selectedAssetClassFilter === item.asset_class;
              return (
                <div
                  key={item.asset_class}
                  onClick={() =>
                    onSelectAssetClass(isSelected ? 'all' : item.asset_class)
                  }
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-brand-500 bg-brand-500/10 shadow-sm'
                      : 'border-border bg-surface/50 hover:bg-surface hover:border-brand-500/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-xs font-bold text-foreground">{item.name}</span>
                    </div>
                    <span className="text-xs font-bold font-mono text-brand-500">
                      {item.value}%
                    </span>
                  </div>

                  <div className="w-full bg-muted/20 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(item.value, 100)}%`,
                        backgroundColor: item.color,
                      }}
                    />
                  </div>

                  <div className="mt-2 pt-2 border-t border-border/60 flex items-center justify-between text-[11px] text-muted">
                    <span>
                      {item.instruments_count} instrument{item.instruments_count !== 1 ? 's' : ''}
                    </span>
                    <span className="font-mono font-semibold text-foreground">
                      {item.current_value !== null
                        ? formatIndianCurrency(item.current_value)
                        : formatIndianCurrency(item.invested_value)}
                    </span>
                  </div>

                  {/* Educational link for REIT/InvIT/Bond */}
                  {['reit', 'invit', 'bond'].includes(item.asset_class) && (
                    <div className="mt-1.5 pt-1 border-t border-border/40 text-[10px]">
                      <Link
                        href={`/${item.asset_class}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-brand-500 hover:underline inline-flex items-center gap-1 font-semibold"
                      >
                        <span>Learn about {item.name} regulations</span>
                        <ArrowRight className="w-2.5 h-2.5" />
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
