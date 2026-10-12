'use client';

import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';
import { Compass, AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react';
import { formatIndianCurrency } from '@/lib/utils';
import type { UnifiedXRayAnalysis } from '@/lib/calculations/xray';

interface SectorRiskChartProps {
  sectorBreakdown: UnifiedXRayAnalysis['sector_breakdown'];
}

interface SectorTooltipItem {
  payload: {
    sector: string;
    percentage: number;
    current_value: number | null;
    instruments_count: number;
    status: 'high' | 'elevated' | 'balanced';
    largest_holding: { symbol: string; name: string; value: number | null } | null;
  };
}

function SectorTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: SectorTooltipItem[];
}) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;

  return (
    <div className="card p-3 shadow-xl border border-border text-xs space-y-1 bg-surface z-50">
      <div className="flex items-center justify-between gap-3">
        <span className="font-bold text-foreground">{data.sector}</span>
        <span
          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
            data.status === 'high'
              ? 'bg-loss/10 text-loss'
              : data.status === 'elevated'
              ? 'bg-warning/10 text-warning'
              : 'bg-gain/10 text-gain'
          }`}
        >
          {data.status === 'high' ? 'High' : data.status === 'elevated' ? 'Elevated' : 'Balanced'}
        </span>
      </div>
      <div className="pt-1 border-t border-border/60 flex items-center justify-between gap-4">
        <span className="text-muted">Portfolio Share:</span>
        <span className="font-bold font-mono text-brand-500">{data.percentage.toFixed(1)}%</span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-muted">Holdings Count:</span>
        <span className="font-mono text-foreground">{data.instruments_count}</span>
      </div>
      {data.largest_holding && (
        <div className="pt-1 border-t border-border/40 text-[11px]">
          <span className="text-muted">Largest Constituent: </span>
          <span className="font-mono font-semibold text-foreground">{data.largest_holding.symbol}</span>
        </div>
      )}
    </div>
  );
}

export function SectorRiskChart({ sectorBreakdown }: SectorRiskChartProps) {
  const chartData = sectorBreakdown.map((sec) => {
    const isUnclassified = sec.sector === 'Unclassified';
    const status: 'high' | 'elevated' | 'balanced' =
      !isUnclassified && sec.percentage_of_valued >= 40
        ? 'high'
        : !isUnclassified && sec.percentage_of_valued >= 25
        ? 'elevated'
        : 'balanced';

    return {
      sector: sec.sector,
      percentage: sec.percentage_of_valued,
      current_value: sec.current_value,
      instruments_count: sec.instruments_count,
      status,
      fill: isUnclassified
        ? 'rgb(var(--muted))'
        : status === 'high'
        ? 'rgb(var(--loss))'
        : status === 'elevated'
        ? 'rgb(var(--warning))'
        : 'rgb(var(--brand-500))',
      largest_holding: sec.largest_holding,
      raw: sec,
    };
  });

  return (
    <div className="card p-5 space-y-4 border border-border">
      <div className="flex items-center gap-2 border-b border-border/60 pb-3">
        <Compass className="w-5 h-5 text-brand-500" />
        <div>
          <h3 className="text-base font-bold text-foreground">Sector Concentration Risk</h3>
          <p className="text-xs text-muted mt-0.5">
            Industry exposure across valued holdings. Sectors over 35% heighten vulnerability to macroeconomic and regulatory cycles.
          </p>
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="py-8 text-center text-xs text-muted">
          No sector data available.
        </div>
      ) : (
        <>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <XAxis
                  type="number"
                  domain={[0, (dataMax: number) => Math.max(Math.ceil(dataMax / 10) * 10, 40)]}
                  unit="%"
                  tick={{ fontSize: 11, fill: 'rgb(var(--muted))' }}
                  axisLine={{ stroke: 'rgb(var(--border))' }}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="sector"
                  tick={{ fontSize: 11, fill: 'rgb(var(--foreground))' }}
                  axisLine={{ stroke: 'rgb(var(--border))' }}
                  tickLine={false}
                  width={110}
                />
                <Tooltip content={<SectorTooltip />} cursor={false} />
                <Bar dataKey="percentage" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`sector-cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Sector Breakdown Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
            {chartData.map((s) => (
              <div
                key={s.sector}
                className="p-3 rounded-lg border border-border/60 bg-muted/5 flex flex-col justify-between text-xs space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-foreground truncate">{s.sector}</span>
                  <span className="flex-shrink-0">
                    {s.status === 'high' ? (
                      <AlertCircle className="w-3.5 h-3.5 text-loss" />
                    ) : s.status === 'elevated' ? (
                      <AlertTriangle className="w-3.5 h-3.5 text-warning" />
                    ) : (
                      <CheckCircle className="w-3.5 h-3.5 text-gain" />
                    )}
                  </span>
                </div>

                <div className="flex items-baseline justify-between">
                  <span className="text-lg font-bold font-mono text-brand-500">
                    {s.percentage.toFixed(1)}%
                  </span>
                  <span className="text-[11px] text-muted">
                    {s.instruments_count} holding{s.instruments_count === 1 ? '' : 's'}
                  </span>
                </div>

                {s.largest_holding && (
                  <p className="text-[11px] text-muted truncate border-t border-border/40 pt-1.5">
                    Lead: <span className="font-mono font-semibold text-foreground">{s.largest_holding.symbol}</span>
                    {s.current_value !== null ? ` (${formatIndianCurrency(s.largest_holding.value ?? 0)})` : ''}
                  </p>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
