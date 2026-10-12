'use client';

import React, { useState, useMemo } from 'react';
import { PieChart as RechartsPie, Pie, Cell, Tooltip } from 'recharts';
import { formatCurrency } from '@/lib/utils';
import type { AssetAllocation, HoldingWithMetrics } from '@/types/portfolio';
import type { BrokerAccountRow } from '@/types/database';
import { TrendingUp, Layers, Building2 } from 'lucide-react';

interface PortfolioOverviewCardProps {
  allocations: AssetAllocation[];
  holdings: HoldingWithMetrics[];
  brokers: BrokerAccountRow[];
  totalValue: number | null;
  isLoading?: boolean;
}

const ASSET_COLORS: Record<string, string> = {
  equity: '#3B82F6',
  mf:     '#8B5CF6',
  reit:   '#A855F7',
  invit:  '#0EA5E9',
  bond:   '#22C55E',
  sgb:    '#EAB308',
  other:  '#64748B',
  etf:    '#06B6D4',
  cash:   '#94A3B8',
};

const SECTOR_PALETTE = [
  '#3B82F6','#F59E0B','#14B8A6','#8B5CF6',
  '#EC4899','#F97316','#06B6D4','#64748B','#A855F7','#EAB308',
];

const BROKER_PALETTE = ['#0284C7', '#10B981', '#F59E0B', '#8B5CF6'];

const ASSET_LABELS: Record<string, string> = {
  equity: 'Equity', mf: 'Mutual Funds', etf: 'ETFs',
  reit: 'REITs', invit: 'InvITs', bond: 'Bonds',
  gold: 'Gold', sgb: 'Sovereign Gold', cash: 'Cash / Other',
};

// Substantially increased chart dimensions — bold, prominent & responsive
const CHART_SIZE = 220;
const INNER_RADIUS = 64;
const OUTER_RADIUS = 96;

export function PortfolioOverviewCard({
  allocations, holdings, brokers, totalValue, isLoading,
}: PortfolioOverviewCardProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const assetData = useMemo(() =>
    allocations
      .filter((a) => a.percentage > 0)
      .map((a) => ({
        name: ASSET_LABELS[a.asset_class] || a.asset_class.toUpperCase(),
        value: a.value,
        percent: a.percentage,
        color: ASSET_COLORS[a.asset_class] || '#64748B',
      })),
  [allocations]);

  const sectorData = useMemo(() => {
    const total = holdings.reduce((acc, h) => acc + (h.current_value ?? h.invested_value ?? 0), 0);
    if (total === 0) return [];
    const map = new Map<string, number>();
    for (const h of holdings) {
      const key = h.sector || 'Others';
      map.set(key, (map.get(key) || 0) + (h.current_value ?? h.invested_value ?? 0));
    }
    return Array.from(map.entries())
      .map(([name, val], i) => ({
        name, value: val, percent: (val / total) * 100,
        color: SECTOR_PALETTE[i % SECTOR_PALETTE.length],
      }))
      .sort((a, b) => b.value - a.value);
  }, [holdings]);

  const brokerData = useMemo(() => {
    const total = holdings.reduce((acc, h) => acc + (h.current_value ?? h.invested_value ?? 0), 0);
    if (total === 0) {
      return brokers.map((b, i) => ({
        name: b.display_name || b.broker_name, value: 0,
        percent: 100 / Math.max(brokers.length, 1),
        color: BROKER_PALETTE[i % BROKER_PALETTE.length],
      }));
    }
    const map = new Map<string, number>();
    for (const h of holdings) {
      const b = brokers.find((x) => x.id === h.broker_account_id);
      const name = b?.display_name || b?.broker_name || 'Manual';
      map.set(name, (map.get(name) || 0) + (h.current_value ?? h.invested_value ?? 0));
    }
    return Array.from(map.entries())
      .map(([name, val], i) => ({
        name, value: val, percent: (val / total) * 100,
        color: BROKER_PALETTE[i % BROKER_PALETTE.length],
      }))
      .sort((a, b) => b.value - a.value);
  }, [holdings, brokers]);

  const displayTotal = totalValue ?? holdings.reduce((acc, h) => acc + (h.current_value ?? h.invested_value ?? 0), 0);
  const smartDefault = assetData.length <= 1 && sectorData.length > 1 ? 'sector' : 'asset';
  const [activeTab, setActiveTab] = useState<'asset' | 'sector' | 'broker'>(smartDefault);
  const currentData = activeTab === 'asset' ? assetData : activeTab === 'sector' ? sectorData : brokerData;
  const topSector = sectorData[0];

  if (isLoading) {
    return (
      <div className="h-full p-5 rounded-2xl border flex flex-col gap-4 animate-pulse bg-surface"
        style={{ borderColor: 'rgb(var(--border))' }}>
        <div className="flex justify-between">
          <div className="h-4 w-32 bg-muted/20 rounded" />
          <div className="h-6 w-28 bg-muted/20 rounded-xl" />
        </div>
        <div className="flex items-center justify-center py-2">
          <div className="w-[160px] h-[160px] rounded-full border-[18px] border-muted/20" />
        </div>
        <div className="space-y-2">
          {[1,2,3].map((i) => <div key={i} className="h-8 bg-muted/20 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full p-5 rounded-2xl border flex flex-col gap-0 transition-all bg-surface shadow-xs"
      style={{ borderColor: 'rgb(var(--border))' }}>

      {/* Header + Tab Pills */}
      <div className="flex items-center justify-between mb-4 gap-2">
        <h2 className="text-sm font-bold tracking-tight text-foreground">Portfolio Overview</h2>
        <div className="flex items-center gap-0.5 p-0.5 rounded-xl border bg-surface-raised/70"
          style={{ borderColor: 'rgb(var(--border))' }}>
          {([
            { id: 'asset' as const, label: 'Asset', icon: TrendingUp },
            { id: 'sector' as const, label: 'Sector', icon: Layers },
            { id: 'broker' as const, label: 'Broker', icon: Building2 },
          ] as const).map(({ id, label, icon: Icon }) => (
            <button key={id} type="button"
              onClick={() => { setActiveTab(id); setActiveIndex(null); }}
              className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1 ${
                activeTab === id
                  ? 'bg-brand text-white shadow-xs'
                  : 'text-muted hover:text-foreground'
              }`}>
              <Icon className="w-3 h-3" />{label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart + Legend — flex layout avoids grid clipping */}
      {currentData.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center py-6">
            <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center bg-surface-raised">
              <Layers className="w-6 h-6 text-muted" />
            </div>
            <p className="text-xs font-semibold text-foreground">No holdings yet</p>
            <p className="text-[11px] text-muted mt-1">Add investments to see your breakdown.</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-between min-h-0">
          {/* Donut (Left) + Legend (Right) Side-by-Side */}
          <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-5 flex-1 my-auto py-1">
            {/* Donut centered — fixed pixel size, no clipping */}
            <div className="flex items-center justify-center relative shrink-0" style={{ width: CHART_SIZE, height: CHART_SIZE }}>
              <RechartsPie width={CHART_SIZE} height={CHART_SIZE}>
                <Pie
                  data={currentData}
                  cx={CHART_SIZE / 2}
                  cy={CHART_SIZE / 2}
                  innerRadius={INNER_RADIUS}
                  outerRadius={OUTER_RADIUS}
                  paddingAngle={currentData.length > 1 ? 2 : 0}
                  dataKey="value"
                  onMouseEnter={(_, i) => setActiveIndex(i)}
                  onMouseLeave={() => setActiveIndex(null)}
                  animationDuration={450}
                  strokeWidth={0}
                >
                  {currentData.map((entry, i) => (
                    <Cell
                      key={`cell-${i}`}
                      fill={entry.color}
                      opacity={activeIndex === null || activeIndex === i ? 1 : 0.35}
                    />
                  ))}
                </Pie>
                <Tooltip
                  cursor={false}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload as typeof currentData[0];
                    return (
                      <div className="px-3 py-2 rounded-xl border text-xs shadow-lg backdrop-blur-sm"
                        style={{ backgroundColor: 'rgb(var(--surface-overlay))', borderColor: 'rgb(var(--border))' }}>
                        <p className="font-bold text-foreground">{d.name}</p>
                        <p className="font-semibold tabular-nums" style={{ color: d.color }}>
                          {d.percent.toFixed(1)}%
                        </p>
                        <p className="text-muted tabular-nums text-[10px]">{formatCurrency(d.value)}</p>
                      </div>
                    );
                  }}
                />
              </RechartsPie>

              {/* Center Label — absolutely positioned over chart */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                {activeIndex !== null && currentData[activeIndex] ? (
                  <>
                    <span className="text-xl font-black tabular-nums leading-none"
                      style={{ color: currentData[activeIndex].color }}>
                      {currentData[activeIndex].percent.toFixed(1)}%
                    </span>
                    <span className="text-[11px] font-bold text-muted mt-1 max-w-[100px] text-center leading-tight truncate">
                      {currentData[activeIndex].name}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-base sm:text-lg font-black text-foreground tabular-nums leading-none tracking-tight">
                      {displayTotal > 0 ? formatCurrency(displayTotal) : '₹0'}
                    </span>
                    <span className="text-[9px] uppercase font-bold text-muted tracking-wider mt-1">
                      Current Value
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Legend List */}
            <div className="flex-1 w-full space-y-1 overflow-y-auto max-h-[190px] no-scrollbar">
              {currentData.slice(0, 6).map((item, idx) => {
                const isActive = activeIndex === idx;
                return (
                  <div key={item.name}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onMouseLeave={() => setActiveIndex(null)}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-all ${
                      isActive ? 'bg-surface-raised' : 'hover:bg-surface-raised/60'
                    }`}>
                    {/* Color swatch */}
                    <span className="w-2 h-2 rounded-full shrink-0 ring-1 ring-black/10"
                      style={{ backgroundColor: item.color }} />
                    {/* Name */}
                    <span className="flex-1 text-[11px] font-semibold text-foreground truncate min-w-0">
                      {item.name}
                    </span>
                    {/* Mini bar + % */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="w-12 h-1 rounded-full bg-surface-raised overflow-hidden hidden xl:block">
                        <div className="h-full rounded-full" style={{
                          width: `${Math.max(item.percent, 3)}%`,
                          backgroundColor: item.color,
                          opacity: 0.85,
                        }} />
                      </div>
                      <span className="text-[11px] font-bold tabular-nums w-10 text-right"
                        style={{ color: item.color }}>
                        {item.percent.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Summary Strip */}
          <div className="grid grid-cols-3 gap-0 pt-3 mt-2 border-t"
            style={{ borderColor: 'rgb(var(--border))' }}>
            <div className="text-center px-1">
              <p className="text-[9px] uppercase font-bold text-muted tracking-wide">Holdings</p>
              <p className="text-base font-extrabold text-foreground tabular-nums mt-0.5">{holdings.length}</p>
            </div>
            <div className="text-center border-x px-1" style={{ borderColor: 'rgb(var(--border))' }}>
              <p className="text-[9px] uppercase font-bold text-muted tracking-wide">Sectors</p>
              <p className="text-base font-extrabold text-foreground tabular-nums mt-0.5">{sectorData.length}</p>
            </div>
            <div className="text-center px-1">
              <p className="text-[9px] uppercase font-bold text-muted tracking-wide">Top Sector</p>
              <p className="text-[11px] font-bold truncate mt-0.5"
                style={{ color: topSector?.color || 'rgb(var(--muted))' }}>
                {topSector?.name || '—'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
