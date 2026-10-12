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
  // Take all non-empty items up to 5 waves
  const waveItems = items.filter((item) => item.value > 0 || item.percent > 0).slice(0, 5);
  const N = waveItems.length;

  if (N === 0) {
    return null;
  }

  const baselineY = 118;

  // Compute layout & coordinates for each item dynamically
  const curves = waveItems.map((item, idx) => {
    const isHovered = activeIndex === idx;
    const color = item.color || '#38bdf8';
    const percent = item.percent;

    // Distribute end y-coordinates cleanly without collision
    let yEnd: number;
    if (N === 1) {
      yEnd = 52;
    } else if (N === 2) {
      yEnd = idx === 0 ? 42 : 78;
    } else {
      const step = Math.min(30, Math.max(18, 72 / (N - 1)));
      yEnd = Math.round(32 + idx * step);
    }

    const yPeak = Math.max(22, yEnd - Math.max(4, 7 - idx));
    const yDip = Math.min(baselineY - 8, yEnd + Math.max(12, 28 - idx * 4));

    // Stagger peak and dip horizontally for an organic liquid wave aesthetic
    const peakX = 136 + idx * 4;
    const dipX = 186 + idx * 4;
    const endX = 268;

    const d = `M 14 ${baselineY} L 62 ${baselineY} C 92 ${baselineY}, ${peakX - 22} ${yPeak}, ${peakX} ${yPeak} C ${peakX + 22} ${yPeak}, ${dipX - 18} ${yDip}, ${dipX} ${yDip} C ${dipX + 26} ${yDip}, 242 ${yEnd}, ${endX} ${yEnd}`;
    const dArea = `${d} L ${endX} ${baselineY} L 14 ${baselineY} Z`;

    // Left label position
    let labelY: number;
    if (N === 1) {
      labelY = 56;
    } else if (N === 2) {
      labelY = idx === 0 ? 44 : 70;
    } else {
      const labelStep = Math.min(26, Math.max(17, 72 / (N - 1)));
      labelY = Math.round(30 + idx * labelStep);
    }

    const rawName = item.name || `Item ${idx + 1}`;
    const displayName = rawName.length > 12 ? rawName.slice(0, 11) + '…' : rawName;

    return {
      item,
      idx,
      color,
      percent,
      isHovered,
      yEnd,
      yPeak,
      yDip,
      peakX,
      dipX,
      endX,
      d,
      dArea,
      labelY,
      rawName,
      displayName,
    };
  });

  return (
    <div className="flex-1 w-full min-w-0 flex flex-col justify-center">
      <div className="relative w-full aspect-[22/10] sm:aspect-[24/11] max-h-[165px]">
        <svg
          viewBox="0 0 338 140"
          className="w-full h-full overflow-visible select-none"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {curves.map(({ color, idx, isHovered }) => (
              <React.Fragment key={`defs-${idx}`}>
                <linearGradient id={`waveStroke_${idx}`} x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={color} stopOpacity="0.2" />
                  <stop offset="35%" stopColor={color} stopOpacity="0.85" />
                  <stop offset="100%" stopColor={color} stopOpacity="1" />
                </linearGradient>

                <linearGradient id={`waveFill_${idx}`} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={color} stopOpacity={isHovered ? "0.38" : "0.20"} />
                  <stop offset="85%" stopColor={color} stopOpacity="0.02" />
                  <stop offset="100%" stopColor={color} stopOpacity="0.0" />
                </linearGradient>

                <filter id={`waveGlow_${idx}`} x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow
                    dx="0"
                    dy="0"
                    stdDeviation="3"
                    floodColor={color}
                    floodOpacity={isHovered ? "0.95" : "0.6"}
                  />
                </filter>
              </React.Fragment>
            ))}
          </defs>

          {/* Background Grid Lines */}
          <line x1="12" y1={baselineY} x2="328" y2={baselineY} stroke="rgb(var(--border) / 0.55)" strokeWidth="1" />
          <line x1="12" y1="70" x2="328" y2="70" stroke="rgb(var(--border) / 0.22)" strokeWidth="1" strokeDasharray="3 3" />

          {/* Left Category Labels */}
          {curves.map(({ idx, color, labelY, displayName, rawName, isHovered }) => (
            <g
              key={`label-${idx}`}
              transform={`translate(14, ${labelY})`}
              className="cursor-pointer transition-opacity"
              onMouseEnter={() => onHoverIndex(idx)}
              onMouseLeave={() => onHoverIndex(null)}
              opacity={activeIndex === null || isHovered ? 1 : 0.35}
            >
              <title>{rawName}</title>
              <circle cx="4" cy="4" r="3.5" fill={color} />
              <text
                x="13"
                y="7.5"
                fill="rgb(var(--foreground))"
                fontSize="11"
                fontWeight="600"
                letterSpacing="-0.1px"
              >
                {displayName}
              </text>
            </g>
          ))}

          {/* Wave Area Fills & Lines (Rendered from bottom to top) */}
          {[...curves].reverse().map(({ idx, color, d, dArea, yEnd, endX, percent, isHovered }) => {
            const isDimmed = activeIndex !== null && !isHovered;
            return (
              <g
                key={`wave-${idx}`}
                className="cursor-pointer transition-all duration-200"
                onMouseEnter={() => onHoverIndex(idx)}
                onMouseLeave={() => onHoverIndex(null)}
                opacity={isDimmed ? 0.3 : 1}
              >
                {/* Area Gradient Fill */}
                <path d={dArea} fill={`url(#waveFill_${idx})`} />

                {/* Spline Stroke */}
                <path
                  d={d}
                  fill="none"
                  stroke={`url(#waveStroke_${idx})`}
                  strokeWidth={isHovered ? 3.2 : 2.2}
                  strokeLinecap="round"
                  filter={`url(#waveGlow_${idx})`}
                />

                {/* End Glowing Node */}
                <circle cx={endX} cy={yEnd} r={isHovered ? 4.5 : 3.5} fill={color} />
                <circle
                  cx={endX}
                  cy={yEnd}
                  r={isHovered ? 7.5 : 5.5}
                  fill="none"
                  stroke={color}
                  strokeWidth="1.2"
                  opacity={isHovered ? 0.8 : 0.45}
                />

                {/* Percentage Badge */}
                <text
                  x={endX + 10}
                  y={yEnd + 4}
                  fill={color}
                  fontSize="11"
                  fontWeight="700"
                  letterSpacing="-0.2px"
                >
                  {percent.toFixed(1)}%
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Pill Chips for all categories */}
      {items.length > 0 && (
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
