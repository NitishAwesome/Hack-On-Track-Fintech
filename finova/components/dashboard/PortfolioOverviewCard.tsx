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

// Perfectly proportioned chart dimensions for side-by-side Dual-Wave alignment
const CHART_SIZE = 195;
const INNER_RADIUS = 56;
const OUTER_RADIUS = 86;

interface DualWaveLineGraphProps {
  items: Array<{
    name?: string;
    value: number;
    percent: number;
    color: string;
  }>;
  activeIndex: number | null;
  onHoverIndex: (index: number | null) => void;
}

function DualWaveLineGraph({ items, activeIndex, onHoverIndex }: DualWaveLineGraphProps) {
  const item1 = items[0] || null;
  const item2 = items[1] || null;

  const color1 = item1?.color || '#38bdf8';
  const color2 = item2?.color || '#a855f7';

  const pct1 = item1 ? item1.percent : 0;
  const pct2 = item2 ? item2.percent : 0;

  // Compute smooth curve y positions dynamically based on percentage
  const normPct1 = Math.min(100, Math.max(10, pct1));
  const yEnd1 = Math.max(32, Math.min(60, Math.round(70 - (normPct1 / 100) * 40)));
  const yPeak1 = Math.max(26, yEnd1 - 5);
  const yDip1 = Math.min(98, yEnd1 + 36);

  const normPct2 = Math.min(50, Math.max(4, pct2));
  const yEnd2 = Math.max(yEnd1 + 26, Math.min(96, Math.round(104 - (normPct2 / 50) * 22)));
  const yPeak2 = Math.max(yPeak1 + 22, yEnd2 - 4);
  const yDip2 = Math.min(108, yEnd2 + 18);

  const baselineY = 116;

  // Seamless C1-continuous cubic bezier spline paths
  const d1 = `M 14 ${baselineY} L 62 ${baselineY} C 92 ${baselineY}, 114 ${yPeak1}, 138 ${yPeak1} C 160 ${yPeak1}, 170 ${yDip1}, 188 ${yDip1} C 215 ${yDip1}, 242 ${yEnd1}, 268 ${yEnd1}`;
  const d1Area = `${d1} L 268 ${baselineY} L 14 ${baselineY} Z`;

  const d2 = `M 14 ${baselineY} L 62 ${baselineY} C 92 ${baselineY}, 114 ${yPeak2}, 138 ${yPeak2} C 160 ${yPeak2}, 170 ${yDip2}, 188 ${yDip2} C 215 ${yDip2}, 242 ${yEnd2}, 268 ${yEnd2}`;
  const d2Area = `${d2} L 268 ${baselineY} L 14 ${baselineY} Z`;

  const isHov1 = activeIndex === 0;
  const isHov2 = activeIndex === 1;

  return (
    <div className="flex-1 w-full min-w-0 flex flex-col justify-center">
      <div className="relative w-full aspect-[22/10] sm:aspect-[24/11] max-h-[165px]">
        <svg
          viewBox="0 0 335 138"
          className="w-full h-full overflow-visible select-none"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <linearGradient id="wave1Stroke" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={color1} stopOpacity="0.25" />
              <stop offset="35%" stopColor={color1} stopOpacity="0.85" />
              <stop offset="100%" stopColor={color1} stopOpacity="1" />
            </linearGradient>
            <linearGradient id="wave1Fill" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={color1} stopOpacity={isHov1 ? "0.38" : "0.24"} />
              <stop offset="85%" stopColor={color1} stopOpacity="0.03" />
              <stop offset="100%" stopColor={color1} stopOpacity="0.0" />
            </linearGradient>

            <linearGradient id="wave2Stroke" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={color2} stopOpacity="0.2" />
              <stop offset="35%" stopColor={color2} stopOpacity="0.8" />
              <stop offset="100%" stopColor={color2} stopOpacity="1" />
            </linearGradient>
            <linearGradient id="wave2Fill" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={color2} stopOpacity={isHov2 ? "0.32" : "0.18"} />
              <stop offset="85%" stopColor={color2} stopOpacity="0.02" />
              <stop offset="100%" stopColor={color2} stopOpacity="0.0" />
            </linearGradient>

            <filter id="glowWave1" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor={color1} floodOpacity={isHov1 ? "0.95" : "0.65"} />
            </filter>
            <filter id="glowWave2" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor={color2} floodOpacity={isHov2 ? "0.95" : "0.65"} />
            </filter>
          </defs>

          {/* Background Grid Lines */}
          <line x1="12" y1={baselineY} x2="325" y2={baselineY} stroke="rgb(var(--border) / 0.55)" strokeWidth="1" />
          <line x1="12" y1="70" x2="325" y2="70" stroke="rgb(var(--border) / 0.22)" strokeWidth="1" strokeDasharray="3 3" />

          {/* Left Category Labels (as positioned in the design) */}
          {item1 && (
            <g
              transform="translate(14, 46)"
              className="cursor-pointer transition-opacity"
              onMouseEnter={() => onHoverIndex(0)}
              onMouseLeave={() => onHoverIndex(null)}
              opacity={activeIndex === null || isHov1 ? 1 : 0.45}
            >
              <circle cx="4" cy="4" r="3.5" fill={color1} />
              <text x="13" y="7.5" fill="rgb(var(--foreground))" fontSize="11" fontWeight="600" letterSpacing="-0.1px">
                {item1.name || 'Asset 1'}
              </text>
            </g>
          )}

          {item2 && (
            <g
              transform="translate(14, 70)"
              className="cursor-pointer transition-opacity"
              onMouseEnter={() => onHoverIndex(1)}
              onMouseLeave={() => onHoverIndex(null)}
              opacity={activeIndex === null || isHov2 ? 1 : 0.45}
            >
              <circle cx="4" cy="4" r="3.5" fill={color2} />
              <text x="13" y="7.5" fill="rgb(var(--foreground))" fontSize="11" fontWeight="600" letterSpacing="-0.1px">
                {item2.name || 'Asset 2'}
              </text>
            </g>
          )}

          {/* Secondary Wave Area & Path (Wave 2) */}
          {item2 && (
            <g
              className="cursor-pointer transition-all duration-200"
              onMouseEnter={() => onHoverIndex(1)}
              onMouseLeave={() => onHoverIndex(null)}
              opacity={activeIndex === null || isHov2 ? 1 : 0.35}
            >
              <path d={d2Area} fill="url(#wave2Fill)" />
              <path
                d={d2}
                fill="none"
                stroke="url(#wave2Stroke)"
                strokeWidth={isHov2 ? 3 : 2.2}
                strokeLinecap="round"
                filter="url(#glowWave2)"
              />
              <circle cx="268" cy={yEnd2} r="3.5" fill={color2} />
              <circle cx="268" cy={yEnd2} r={isHov2 ? 6.5 : 5} fill="none" stroke={color2} strokeWidth="1" opacity="0.45" />
              <text
                x="278"
                y={yEnd2 + 4}
                fill={color2}
                fontSize="11"
                fontWeight="700"
                letterSpacing="-0.2px"
              >
                {item2.percent.toFixed(1)}%
              </text>
            </g>
          )}

          {/* Primary Wave Area & Path (Wave 1) */}
          {item1 && (
            <g
              className="cursor-pointer transition-all duration-200"
              onMouseEnter={() => onHoverIndex(0)}
              onMouseLeave={() => onHoverIndex(null)}
              opacity={activeIndex === null || isHov1 ? 1 : 0.35}
            >
              <path d={d1Area} fill="url(#wave1Fill)" />
              <path
                d={d1}
                fill="none"
                stroke="url(#wave1Stroke)"
                strokeWidth={isHov1 ? 3 : 2.4}
                strokeLinecap="round"
                filter="url(#glowWave1)"
              />
              <circle cx="268" cy={yEnd1} r="4" fill={color1} />
              <circle cx="268" cy={yEnd1} r={isHov1 ? 7.5 : 5.5} fill="none" stroke={color1} strokeWidth="1" opacity="0.5" />
              <text
                x="278"
                y={yEnd1 + 4}
                fill={color1}
                fontSize="11"
                fontWeight="700"
                letterSpacing="-0.2px"
              >
                {item1.percent.toFixed(1)}%
              </text>
            </g>
          )}
        </svg>
      </div>

      {/* Pill Chips for remaining/all categories if > 2 */}
      {items.length > 2 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1.5 px-1 max-h-[52px] overflow-y-auto no-scrollbar">
          {items.map((item, idx) => {
            const isActive = activeIndex === idx;
            return (
              <button
                key={item.name || idx}
                type="button"
                onMouseEnter={() => onHoverIndex(idx)}
                onMouseLeave={() => onHoverIndex(null)}
                className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all flex items-center gap-1 border cursor-pointer ${
                  isActive
                    ? 'bg-surface-raised border-border text-foreground shadow-2xs'
                    : 'border-transparent text-muted hover:text-foreground hover:bg-surface-raised/50'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="truncate max-w-[80px]">{item.name || 'Other'}</span>
                <span className="font-bold tabular-nums" style={{ color: item.color }}>
                  {item.percent.toFixed(1)}%
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

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

            {/* Right: Dual-Wave Line Graph */}
            <DualWaveLineGraph
              items={currentData}
              activeIndex={activeIndex}
              onHoverIndex={setActiveIndex}
            />
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
