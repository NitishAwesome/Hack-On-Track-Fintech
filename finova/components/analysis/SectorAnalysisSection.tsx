'use client';
import { useReducedMotionConfig } from 'framer-motion';

// ============================================================
// FINOVA — Sector Analysis (Major Feature)
// components/analysis/SectorAnalysisSection.tsx
// ============================================================

import React, { useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Filter,
  Info,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from 'lucide-react';
import { formatIndianCurrency } from '@/lib/utils';
import type { UnifiedXRayAnalysis } from '@/lib/calculations/xray';

const SECTOR_PALETTE = [
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#14B8A6', // Teal
  '#6366F1', // Indigo
  '#64748B', // Slate (Unclassified)
];

interface SectorAnalysisSectionProps {
  data: UnifiedXRayAnalysis;
  selectedSectorFilter: string;
  onSelectSector: (sector: string) => void;
  onOpenInstrumentDetail?: (symbol: string) => void;
}

interface SectorChartItem {
  name: string;
  value: number;
  invested_value: number;
  current_value: number | null;
  instruments_count: number;
  is_classified: boolean;
  largest_holding?: {
    symbol: string;
    name: string;
    value: number | null;
  } | null;
  concentration_observation?: string;
  constituent_symbols: string[];
  color: string;
}

function DonutTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: SectorChartItem }>;
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
          <span>Constituents:</span>
          <span className="font-medium text-foreground">
            {item.instruments_count} holding{item.instruments_count !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </div>
  );
}

function BarTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: SectorChartItem }>;
}) {
  if (!active || !payload || !payload.length) return null;
  const item = payload[0].payload;
  return (
    <div className="card p-2.5 text-xs shadow-lg border border-border bg-surface/95 backdrop-blur-sm">
      <p className="font-bold text-foreground">{item.name}</p>
      <p className="text-brand-500 font-mono font-semibold mt-0.5">
        {item.value}% of valued portfolio
      </p>
      {item.current_value !== null && (
        <p className="text-[11px] text-muted font-mono mt-0.5">
          {formatIndianCurrency(item.current_value)}
        </p>
      )}
    </div>
  );
}

export function SectorAnalysisSection({
  data,
  selectedSectorFilter,
  onSelectSector,
  onOpenInstrumentDetail,
}: SectorAnalysisSectionProps) {
  const reducedMotion = useReducedMotionConfig();
  const { sector_breakdown, consolidated_instruments } = data;
  const [expandedSector, setExpandedSector] = useState<string | null>(null);

  // Filter non-zero sectors
  const activeSectors = sector_breakdown.filter(
    (s) => s.invested_value > 0 || (s.current_value !== null && s.current_value > 0)
  );

  const chartData: SectorChartItem[] = activeSectors.map((s, index) => ({
    name: s.sector,
    value: Number(s.percentage_of_valued.toFixed(1)),
    invested_value: s.invested_value,
    current_value: s.current_value,
    instruments_count: s.instruments_count,
    is_classified: s.is_classified,
    largest_holding: s.largest_holding,
    concentration_observation: s.concentration_observation,
    constituent_symbols: s.constituent_symbols,
    color: s.is_classified ? SECTOR_PALETTE[index % (SECTOR_PALETTE.length - 1)] : '#64748B',
  }));

  // Bar chart data sorted by weight descending
  const sortedBarData = [...chartData].sort((a, b) => b.value - a.value);

  return (
    <div className="card p-5 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-foreground">Sector Analysis &amp; Exposure</h2>
            <span className="text-[11px] px-2 py-0.5 rounded font-semibold bg-brand-500/10 text-brand-500">
              {activeSectors.length} Sector{activeSectors.length !== 1 ? 's' : ''} Identified
            </span>
          </div>
          <p className="text-xs text-muted mt-0.5">
            Evaluate industry concentration. Authoritative metadata only; unmapped holdings are labeled &ldquo;Unclassified&rdquo;.
          </p>
        </div>

        {selectedSectorFilter !== 'all' && (
          <button
            onClick={() => onSelectSector('all')}
            className="text-xs text-brand-500 hover:underline inline-flex items-center gap-1 self-start sm:self-auto"
          >
            <Filter className="w-3 h-3" />
            <span>Reset filter ({selectedSectorFilter})</span>
          </button>
        )}
      </div>

      {/* Methodology Disclaimers & Unclassified Notice */}
      <div className="p-3 rounded-xl bg-surface border border-border flex items-start gap-2.5 text-xs text-muted">
        <Info className="w-4 h-4 text-brand-500 flex-shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-semibold text-foreground">Screening Heuristics:</span> A sector exposure above 40% triggers an informational concentration observation to highlight cyclical vulnerability. This represents an empirical screening metric rather than a universal financial directive.
        </div>
      </div>

      {/* Visualizations Grid: Sector Donut + Horizontal Bar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* A. Sector Allocation Donut */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center relative min-h-[260px]">
          <p className="text-xs font-semibold text-muted mb-1 uppercase tracking-wider">
            Sector Weight Distribution
          </p>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                isAnimationActive={!reducedMotion}
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={62}
                outerRadius={92}
                paddingAngle={2}
                dataKey="value"
                onClick={(entry) => {
                  const target = entry.name;
                  onSelectSector(selectedSectorFilter === target ? 'all' : target);
                }}
                className="cursor-pointer focus:outline-none"
              >
                {chartData.map((entry, index) => {
                  const isSelected = selectedSectorFilter === entry.name;
                  return (
                    <Cell
                      key={`sector-cell-${index}`}
                      fill={entry.color}
                      stroke={isSelected ? 'rgb(var(--foreground))' : 'transparent'}
                      strokeWidth={isSelected ? 2 : 0}
                      opacity={
                        selectedSectorFilter === 'all' || isSelected
                          ? 1
                          : 0.35
                      }
                    />
                  );
                })}
              </Pie>
              <Tooltip content={<DonutTooltip />} />
            </PieChart>
          </ResponsiveContainer>

          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center pt-5">
            <p className="text-[10px] text-muted uppercase font-semibold">Top Sector</p>
            <p className="text-xs font-bold text-foreground max-w-[120px] truncate">
              {data.summary.top_sector || 'N/A'}
            </p>
            <p className="text-xs font-mono font-bold text-brand-500">
              {data.summary.top_sector_weight.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* B. Horizontal Sector Concentration Bar Chart */}
        <div className="lg:col-span-7 flex flex-col justify-center min-h-[260px] pl-0 lg:pl-2">
          <p className="text-xs font-semibold text-muted mb-2 uppercase tracking-wider">
            Sector Concentration Ranking (% of Valued Capital)
          </p>
          <ResponsiveContainer width="100%" height={Math.max(sortedBarData.length * 36, 180)}>
            <BarChart
              data={sortedBarData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
            >
              <XAxis
                type="number"
                domain={[0, 100]}
                unit="%"
                tick={{ fill: 'rgb(var(--muted))', fontSize: 10 }}
                stroke="rgb(var(--border))"
              />
              <YAxis
                type="category"
                dataKey="name"
                width={120}
                tick={{ fill: 'rgb(var(--foreground))', fontSize: 11 }}
                stroke="transparent"
              />
              <Tooltip content={<BarTooltip />} cursor={false} />
              <Bar
                dataKey="value"
                radius={[0, 4, 4, 0]}
                onClick={(entry) => {
                  const target = entry.name;
                  onSelectSector(selectedSectorFilter === target ? 'all' : target);
                }}
                className="cursor-pointer"
              >
                {sortedBarData.map((entry, index) => (
                  <Cell
                    key={`bar-${index}`}
                    fill={entry.color}
                    opacity={
                      selectedSectorFilter === 'all' || selectedSectorFilter === entry.name
                        ? 1
                        : 0.35
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* C. Interactive Sector Breakdown Cards with Constituent Drilldown */}
      <div className="space-y-3 pt-2">
        <h3 className="text-xs font-bold text-muted uppercase tracking-wider">
          Interactive Sector Cards &amp; Constituent Drilldown
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {chartData.map((sector) => {
            const isSelected = selectedSectorFilter === sector.name;
            const isExpanded = expandedSector === sector.name;

            // Find constituent instruments in this sector
            const constituents = consolidated_instruments.filter((inst) =>
              sector.name === 'Unclassified'
                ? !inst.sector || inst.sector.toLowerCase() === 'unclassified'
                : inst.sector?.toLowerCase() === sector.name.toLowerCase()
            );

            return (
              <div
                key={sector.name}
                className={`p-4 rounded-xl border transition-all ${
                  isSelected
                    ? 'border-brand-500 bg-brand-500/10'
                    : 'border-border bg-surface/50 hover:bg-surface'
                }`}
              >
                {/* Sector Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: sector.color }}
                      />
                      <p
                        className={`text-sm font-bold truncate ${
                          sector.is_classified ? 'text-foreground' : 'text-muted italic'
                        }`}
                      >
                        {sector.name}
                      </p>
                    </div>
                    <p className="text-[11px] text-muted mt-0.5">
                      {sector.instruments_count} distinct instrument{sector.instruments_count !== 1 ? 's' : ''}
                    </p>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <span className="text-sm font-bold font-mono text-brand-500">
                      {sector.value}%
                    </span>
                    <p className="text-[10px] text-muted font-mono">
                      {sector.current_value !== null
                        ? formatIndianCurrency(sector.current_value)
                        : formatIndianCurrency(sector.invested_value)}
                    </p>
                  </div>
                </div>

                {/* Largest Holding in Sector */}
                {sector.largest_holding && (
                  <div className="mt-2.5 pt-2 border-t border-border/60 flex items-center justify-between text-xs">
                    <span className="text-muted text-[11px]">Largest holding:</span>
                    <span className="font-semibold text-foreground truncate max-w-[150px]">
                      {sector.largest_holding.name} ({sector.largest_holding.symbol})
                    </span>
                  </div>
                )}

                {/* Concentration Observation Banner */}
                {sector.concentration_observation && (
                  <div className="mt-2.5 p-2 rounded-lg bg-warning/10 border border-warning/20 text-[11px] text-warning flex items-start gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <span>{sector.concentration_observation}</span>
                  </div>
                )}

                {/* Drilldown Toggle Button */}
                <div className="mt-3 pt-2 border-t border-border/40 flex items-center justify-between text-xs">
                  <button
                    onClick={() =>
                      onSelectSector(isSelected ? 'all' : sector.name)
                    }
                    className="text-[11px] text-brand-500 hover:underline font-medium"
                  >
                    {isSelected ? 'Clear filter' : 'Filter by sector'}
                  </button>

                  <button
                    onClick={() =>
                      setExpandedSector(isExpanded ? null : sector.name)
                    }
                    className="text-[11px] text-muted hover:text-foreground inline-flex items-center gap-1 font-medium"
                  >
                    <span>{isExpanded ? 'Hide holdings' : 'View constituents'}</span>
                    {isExpanded ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    )}
                  </button>
                </div>

                {/* Expanded Constituent Holdings List */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-2.5 pt-2 border-t border-border space-y-1.5 overflow-hidden"
                    >
                      <p className="text-[10px] font-semibold text-muted uppercase tracking-wider">
                        Constituent Instruments ({constituents.length}):
                      </p>
                      {constituents.map((c) => (
                        <div
                          key={c.canonical_key}
                          onClick={() => onOpenInstrumentDetail?.(c.symbol)}
                          className="flex items-center justify-between text-[11px] p-1.5 rounded bg-muted/10 hover:bg-muted/20 cursor-pointer transition-colors"
                        >
                          <div className="min-w-0">
                            <span className="font-semibold text-foreground truncate block">
                              {c.name}
                            </span>
                            <span className="font-mono text-[10px] text-muted">
                              {c.symbol}
                            </span>
                          </div>
                          <div className="text-right flex-shrink-0 font-mono">
                            <span className="font-semibold text-foreground">
                              {c.percentage_of_valued_portfolio.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
