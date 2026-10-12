'use client';

import React, { useState, useMemo } from 'react';
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { formatCurrency, formatPercentSafe } from '@/lib/utils';
import type { AssetAllocation, HoldingWithMetrics } from '@/types/portfolio';
import type { BrokerAccountRow } from '@/types/database';

interface PortfolioOverviewCardProps {
  allocations: AssetAllocation[];
  holdings: HoldingWithMetrics[];
  brokers: BrokerAccountRow[];
  totalValue: number | null;
  isLoading?: boolean;
}

const ASSET_COLORS: Record<string, string> = {
  equity: '#3B82F6', // Blue
  mf: '#8B5CF6',     // Violet
  reit: '#F97316',   // Orange
  invit: '#14B8A6',  // Teal
  bond: '#F59E0B',   // Amber
  sgb: '#EAB308',    // Gold
  other: '#64748B',  // Slate
};

const SECTOR_PALETTE = [
  '#0EA5E9', // Cyan
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#6366F1', // Indigo
  '#14B8A6', // Teal
  '#F97316', // Orange
];

const BROKER_PALETTE = [
  '#0284C7', // Sky
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
];

export function PortfolioOverviewCard({
  allocations,
  holdings,
  brokers,
  totalValue,
  isLoading,
}: PortfolioOverviewCardProps) {
  const [activeTab, setActiveTab] = useState<'asset' | 'sector' | 'broker'>('asset');
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // 1. Asset Allocation Data
  const assetData = useMemo(() => {
    const ASSET_LABELS: Record<string, string> = {
      equity: 'Equity',
      mf: 'Mutual Funds',
      etf: 'ETFs',
      reit: 'REITs',
      invit: 'InvITs',
      bond: 'Bonds',
      gold: 'Gold',
      cash: 'Cash / Other',
    };
    return allocations
      .filter((a) => a.percentage > 0)
      .map((a) => ({
        name: ASSET_LABELS[a.asset_class] || a.asset_class.toUpperCase(),
        value: a.value,
        percent: a.percentage,
        color: ASSET_COLORS[a.asset_class] || '#64748B',
      }));
  }, [allocations]);

  // 2. Sector Allocation Data
  const sectorData = useMemo(() => {
    const totalPriced = holdings.reduce((acc, h) => acc + (h.current_value ?? h.invested_value ?? 0), 0);
    if (totalPriced === 0) return [];

    const map = new Map<string, number>();
    for (const h of holdings) {
      const sec = h.sector || 'Others';
      const val = h.current_value ?? h.invested_value ?? 0;
      map.set(sec, (map.get(sec) || 0) + val);
    }

    return Array.from(map.entries())
      .map(([name, val], i) => ({
        name,
        value: val,
        percent: (val / totalPriced) * 100,
        color: SECTOR_PALETTE[i % SECTOR_PALETTE.length],
      }))
      .sort((a, b) => b.value - a.value);
  }, [holdings]);

  // 3. Broker Allocation Data
  const brokerData = useMemo(() => {
    const totalPriced = holdings.reduce((acc, h) => acc + (h.current_value ?? h.invested_value ?? 0), 0);
    if (totalPriced === 0) {
      return brokers.map((b, i) => ({
        name: b.display_name || b.broker_name,
        value: 0,
        percent: 100 / (brokers.length || 1),
        color: BROKER_PALETTE[i % BROKER_PALETTE.length],
      }));
    }

    const map = new Map<string, number>();
    for (const h of holdings) {
      const bId = h.broker_account_id;
      const bObj = brokers.find((b) => b.id === bId);
      const name = bObj?.display_name || bObj?.broker_name || 'Manual Demat';
      const val = h.current_value ?? h.invested_value ?? 0;
      map.set(name, (map.get(name) || 0) + val);
    }

    return Array.from(map.entries())
      .map(([name, val], i) => ({
        name,
        value: val,
        percent: (val / totalPriced) * 100,
        color: BROKER_PALETTE[i % BROKER_PALETTE.length],
      }))
      .sort((a, b) => b.value - a.value);
  }, [holdings, brokers]);

  const currentChartData =
    activeTab === 'asset' ? assetData : activeTab === 'sector' ? sectorData : brokerData;

  const displayTotal = totalValue ?? holdings.reduce((acc, h) => acc + (h.current_value ?? h.invested_value ?? 0), 0);

  if (isLoading) {
    return (
      <div
        className="p-5 sm:p-6 rounded-2xl border flex flex-col justify-between h-[380px] animate-pulse bg-surface"
        style={{ borderColor: 'rgb(var(--border))' }}
      >
        <div className="h-4 w-36 bg-muted/20 rounded" />
        <div className="w-40 h-40 rounded-full border-4 border-muted/20 mx-auto" />
        <div className="space-y-2">
          <div className="h-3 w-full bg-muted/20 rounded" />
          <div className="h-3 w-4/5 bg-muted/20 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div
      className="p-5 sm:p-6 rounded-2xl border flex flex-col justify-between transition-all duration-200 bg-surface shadow-xs"
      style={{
        borderColor: 'rgb(var(--border))',
      }}
    >
      {/* Top Header & Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
          Portfolio Overview
        </h2>

        {/* 3 Pills: Asset, Sector, Broker */}
        <div
          className="flex items-center gap-1 p-1 rounded-xl border bg-surface-raised/60 self-start sm:self-auto"
          style={{ borderColor: 'rgb(var(--border))' }}
        >
          <button
            type="button"
            onClick={() => {
              setActiveTab('asset');
              setActiveIndex(null);
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'asset'
                ? 'bg-brand text-white shadow-xs'
                : 'text-muted hover:text-foreground'
            }`}
          >
            Asset
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('sector');
              setActiveIndex(null);
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'sector'
                ? 'bg-brand text-white shadow-xs'
                : 'text-muted hover:text-foreground'
            }`}
          >
            Sector
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('broker');
              setActiveIndex(null);
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'broker'
                ? 'bg-brand text-white shadow-xs'
                : 'text-muted hover:text-foreground'
            }`}
          >
            Broker
          </button>
        </div>
      </div>

      {/* Content: Donut + Legend Grid */}
      {currentChartData.length === 0 ? (
        <div className="py-12 text-center text-xs text-muted">
          No holdings available to visualize portfolio overview.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Left: Recharts Donut Chart with Center Text */}
          <div className="md:col-span-5 relative flex items-center justify-center min-h-[200px]">
            <ResponsiveContainer width="100%" height={210}>
              <RechartsPie>
                <Pie
                  data={currentChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={58}
                  outerRadius={84}
                  paddingAngle={3}
                  dataKey="value"
                  onMouseEnter={(_, index) => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                  animationDuration={400}
                >
                  {currentChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      opacity={activeIndex === null || activeIndex === index ? 1 : 0.45}
                      className="cursor-pointer transition-opacity"
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload as typeof currentChartData[0];
                    return (
                      <div
                        className="p-2.5 rounded-xl border text-xs shadow-lg bg-surface/95 backdrop-blur-sm"
                        style={{ borderColor: 'rgb(var(--border))' }}
                      >
                        <p className="font-bold text-foreground">{d.name}</p>
                        <p className="font-semibold text-brand tabular-nums">
                          {d.percent.toFixed(1)}% of portfolio
                        </p>
                        <p className="text-muted tabular-nums text-[11px] font-mono">
                          {formatCurrency(d.value)}
                        </p>
                      </div>
                    );
                  }}
                />
              </RechartsPie>
            </ResponsiveContainer>

            {/* Centered Donut Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
              <span className="text-[11px] font-extrabold text-foreground tabular-nums tracking-tight leading-tight">
                {displayTotal > 0 ? formatCurrency(displayTotal) : '₹0.00'}
              </span>
              <span className="text-[9px] uppercase font-bold text-muted tracking-wider mt-0.5">
                Current Value
              </span>
            </div>
          </div>

          {/* Right: Legend Breakdown with Color Dots, Percentages, and Values */}
          <div className="md:col-span-7 space-y-2 max-h-[220px] overflow-y-auto no-scrollbar pl-1">
            {currentChartData.slice(0, 5).map((item, idx) => {
              const isHovered = activeIndex === idx;
              return (
                <div
                  key={item.name}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onMouseLeave={() => setActiveIndex(null)}
                  className={`flex items-center justify-between p-2 rounded-xl text-xs transition-all cursor-pointer ${
                    isHovered ? 'bg-surface-raised' : 'hover:bg-surface-raised/60'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="font-semibold text-foreground truncate max-w-[130px]">
                      {item.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 text-right">
                    <span
                      className="font-bold tabular-nums text-xs"
                      style={{ color: item.color }}
                    >
                      {item.percent.toFixed(1)}%
                    </span>
                    <span className="font-mono text-muted tabular-nums text-[11px] min-w-[75px]">
                      {formatCurrency(item.value)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
