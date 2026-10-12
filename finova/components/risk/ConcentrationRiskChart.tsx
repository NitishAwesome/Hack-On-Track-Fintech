'use client';

import React from 'react';
import Link from 'next/link';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';
import { ExternalLink, AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react';
import { formatIndianCurrency } from '@/lib/utils';
import type { ConsolidatedInstrumentExposure } from '@/lib/calculations/xray';

interface ConcentrationRiskChartProps {
  instruments: ConsolidatedInstrumentExposure[];
  onSelectInstrument?: (instrument: ConsolidatedInstrumentExposure) => void;
}

interface TooltipPayloadItem {
  payload: {
    symbol: string;
    name: string;
    weight: number;
    current_value: number | null;
    is_quoted: boolean;
    status: 'high' | 'elevated' | 'balanced';
  };
}

function ConcentrationTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;

  return (
    <div className="card p-3 shadow-xl border border-border text-xs space-y-1 bg-surface z-50">
      <div className="flex items-center justify-between gap-3">
        <span className="font-bold text-foreground font-mono">{data.symbol}</span>
        <span
          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
            data.status === 'high'
              ? 'bg-loss/10 text-loss'
              : data.status === 'elevated'
              ? 'bg-warning/10 text-warning'
              : 'bg-gain/10 text-gain'
          }`}
        >
          {data.status === 'high'
            ? 'High Concentration'
            : data.status === 'elevated'
            ? 'Elevated'
            : 'Balanced'}
        </span>
      </div>
      <p className="text-muted text-[11px] truncate max-w-[200px]">{data.name}</p>
      <div className="pt-1 border-t border-border/60 flex items-center justify-between gap-4">
        <span className="text-muted">Portfolio Share:</span>
        <span className="font-bold font-mono text-brand-500">{data.weight.toFixed(1)}%</span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-muted">Market Value:</span>
        <span className="font-mono text-foreground">
          {data.current_value !== null ? formatIndianCurrency(data.current_value) : 'Unquoted'}
        </span>
      </div>
    </div>
  );
}

export function ConcentrationRiskChart({
  instruments,
}: ConcentrationRiskChartProps) {
  // Take top 8 instruments for clean presentation
  const topHoldings = instruments.slice(0, 8).map((inst) => {
    const weight = inst.percentage_of_valued_portfolio;
    const status: 'high' | 'elevated' | 'balanced' =
      weight > 40 ? 'high' : weight > 25 ? 'elevated' : 'balanced';

    return {
      symbol: inst.symbol,
      name: inst.name,
      weight,
      current_value: inst.current_value,
      is_quoted: inst.is_quoted,
      status,
      fill:
        status === 'high'
          ? 'rgb(var(--loss))'
          : status === 'elevated'
          ? 'rgb(var(--warning))'
          : 'rgb(var(--brand-500))',
      raw: inst,
    };
  });

  return (
    <div className="card p-5 space-y-4 border border-border">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
        <div>
          <h3 className="text-base font-bold text-foreground">Holding Concentration Exposure</h3>
          <p className="text-xs text-muted mt-0.5">
            Single-stock weight distribution across your largest holdings. Positions &gt;25% carry outsized drawdown impact.
          </p>
        </div>

        <Link
          href="/analysis"
          className="text-xs font-semibold text-brand-500 hover:underline inline-flex items-center gap-1 self-start sm:self-auto"
        >
          <span>View Holdings in X-Ray</span>
          <ExternalLink className="w-3 h-3" />
        </Link>
      </div>

      {topHoldings.length === 0 ? (
        <div className="py-8 text-center text-xs text-muted">
          No valued holdings available to chart concentration.
        </div>
      ) : (
        <>
          {/* Recharts Horizontal Bar Chart */}
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topHoldings}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <XAxis
                  type="number"
                  domain={[0, (dataMax: number) => Math.max(Math.ceil(dataMax / 10) * 10, 30)]}
                  unit="%"
                  tick={{ fontSize: 11, fill: 'rgb(var(--muted))' }}
                  axisLine={{ stroke: 'rgb(var(--border))' }}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="symbol"
                  tick={{ fontSize: 11, fill: 'rgb(var(--foreground))', fontWeight: 600 }}
                  axisLine={{ stroke: 'rgb(var(--border))' }}
                  tickLine={false}
                  width={75}
                />
                <Tooltip content={<ConcentrationTooltip />} cursor={false} />
                <Bar dataKey="weight" radius={[0, 4, 4, 0]}>
                  {topHoldings.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Holdings Detailed List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
            {topHoldings.map((h) => (
              <div
                key={h.symbol}
                className="p-2.5 rounded-lg border border-border/60 bg-muted/5 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2 truncate">
                  {h.status === 'high' ? (
                    <AlertCircle className="w-4 h-4 text-loss flex-shrink-0" />
                  ) : h.status === 'elevated' ? (
                    <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0" />
                  ) : (
                    <CheckCircle className="w-4 h-4 text-gain flex-shrink-0" />
                  )}
                  <div className="truncate">
                    <span className="font-bold text-foreground font-mono">{h.symbol}</span>
                    <span className="text-muted ml-1.5 truncate text-[11px]">{h.name}</span>
                  </div>
                </div>

                <div className="text-right flex-shrink-0 ml-2">
                  <span className="font-bold font-mono text-brand-500">{h.weight.toFixed(1)}%</span>
                  <p className="text-[10px] text-muted font-mono">
                    {h.current_value !== null ? formatIndianCurrency(h.current_value) : 'Unquoted'}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-muted italic">
            * Note: Flagging elevated concentration highlights portfolio-level exposure to unsystematic risk. It is not an adverse judgment on company quality or a recommendation to sell.
          </p>
        </>
      )}
    </div>
  );
}
