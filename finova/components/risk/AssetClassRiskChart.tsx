'use client';

import React from 'react';
import Link from 'next/link';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';
import { Layers, AlertTriangle, ShieldAlert, ArrowRight } from 'lucide-react';
import { formatIndianCurrency } from '@/lib/utils';
import type { UnifiedXRayAnalysis } from '@/lib/calculations/xray';

interface AssetClassRiskChartProps {
  assetClassBreakdown: UnifiedXRayAnalysis['asset_class_breakdown'];
  equityWeight: number;
}

const ASSET_CLASS_COLORS: Record<string, string> = {
  equity: '#3B82F6', // Blue
  mf: '#10B981',     // Green
  etf: '#06B6D4',    // Cyan
  bond: '#8B5CF6',   // Purple
  sgb: '#F59E0B',    // Amber
  reit: '#EC4899',   // Pink
  invit: '#F97316',  // Orange
  other: '#6B7280',  // Gray
};

interface AssetClassTooltipItem {
  payload: {
    name: string;
    value: number;
    current_value: number | null;
    distinct_count: number;
  };
}

function AssetClassTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: AssetClassTooltipItem[];
}) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;

  return (
    <div className="card p-3 shadow-xl border border-border text-xs space-y-1 bg-surface z-50">
      <span className="font-bold text-foreground">{data.name}</span>
      <div className="pt-1 border-t border-border/60 flex items-center justify-between gap-4">
        <span className="text-muted">Portfolio Share:</span>
        <span className="font-bold font-mono text-brand-500">{data.value.toFixed(1)}%</span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-muted">Holdings:</span>
        <span className="font-mono text-foreground">{data.distinct_count}</span>
      </div>
      {data.current_value !== null && (
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted">Valuation:</span>
          <span className="font-mono text-foreground">{formatIndianCurrency(data.current_value)}</span>
        </div>
      )}
    </div>
  );
}

export function AssetClassRiskChart({
  assetClassBreakdown,
  equityWeight,
}: AssetClassRiskChartProps) {
  const chartData = assetClassBreakdown.map((ac) => ({
    name: ac.display_name,
    value: ac.percentage_of_valued,
    current_value: ac.current_value,
    distinct_count: ac.distinct_instruments_count,
    color: ASSET_CLASS_COLORS[ac.asset_class] || '#6B7280',
  }));

  const isAllEquity = equityWeight >= 0.95;

  return (
    <div className="card p-5 space-y-4 border border-border">
      <div className="flex items-center gap-2 border-b border-border/60 pb-3">
        <Layers className="w-5 h-5 text-brand-500" />
        <div>
          <h3 className="text-base font-bold text-foreground">Asset-Class Risk Allocation</h3>
          <p className="text-xs text-muted mt-0.5">
            Capital distribution across distinct asset categories. Non-correlated assets cushion equity drawdowns.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-center">
        {/* Donut Chart */}
        <div className="h-56 relative flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={2}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`asset-class-cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<AssetClassTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute text-center pointer-events-none">
            <span className="text-xs font-semibold text-muted block">Asset Classes</span>
            <span className="text-xl font-bold font-mono text-foreground">
              {assetClassBreakdown.length}
            </span>
          </div>
        </div>

        {/* Breakdown Legend & Stats */}
        <div className="space-y-2">
          {chartData.map((item) => (
            <div
              key={item.name}
              className="p-2.5 rounded-lg border border-border/60 bg-muted/5 flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="font-semibold text-foreground">{item.name}</span>
                <span className="text-muted text-[11px]">
                  ({item.distinct_count} holding{item.distinct_count === 1 ? '' : 's'})
                </span>
              </div>
              <span className="font-bold font-mono text-foreground">
                {item.value.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 100% Equity Notice */}
      {isAllEquity && (
        <div className="p-3.5 rounded-xl border border-warning/30 bg-warning/5 text-xs text-warning space-y-1.5">
          <div className="flex items-center gap-2 font-bold">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>Heavy Equity Concentration ({ (equityWeight * 100).toFixed(1) }%)</span>
          </div>
          <p className="text-warning/90 leading-relaxed text-[11px]">
            Your portfolio is concentrated almost entirely in equity assets with zero fixed-income, sovereign gold, or hybrid buffers. During macroeconomic contractions, equity-only portfolios experience steeper portfolio drawdowns.
          </p>
          <div className="pt-1">
            <Link
              href="/bonds"
              className="text-[11px] font-bold text-foreground hover:underline inline-flex items-center gap-1"
            >
              <span>Explore Defensive Fixed-Income Assets (Government Bonds &amp; SGBs)</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}

      {/* Important Regulatory Disclaimer */}
      <div className="p-3 rounded-lg border border-border/60 bg-muted/5 text-[11px] text-muted flex items-start gap-2">
        <ShieldAlert className="w-4 h-4 text-brand-500 flex-shrink-0 mt-0.5" />
        <span>
          <strong className="text-foreground">Important:</strong> No asset class is automatically risk-free. Bonds carry interest rate and credit default risks, Gold fluctuates with global inflation and currency movements, and REITs/InvITs depend on commercial real estate and infrastructure yields.
        </span>
      </div>
    </div>
  );
}
