'use client';
import { useId, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as Tooltip from '@radix-ui/react-tooltip';
import type { ChartRange, HistoricalChartResponse } from '@/lib/services/marketData';
import { historyQueryKey, HistoryRequestError, readInstrumentHistory } from '@/lib/market/historyClient';
import { miniHistory } from '@/lib/market/miniHistory';
import { useVisibleElement } from '@/lib/hooks/useVisibleElement';

type Props = { symbol: string; exchange?: string; range?: ChartRange; showLabel?: boolean; unit?: string; className?: string; tooltipSide?: 'top' | 'bottom' };
const colors = { gain: 'rgb(var(--gain))', loss: 'rgb(var(--loss))', neutral: 'rgb(var(--muted))' };

/** Visibility unmounts the observer: abandoned requests cancel unless another view uses them. */
export function MarketSparkline({ className = 'w-[128px]', ...props }: Props) {
  const { ref, visible } = useVisibleElement<HTMLDivElement>();
  return <div ref={ref} title="" className={`relative shrink-0 min-w-0 ${className}`} data-market-sparkline={props.symbol}>
    {visible ? <VisibleSparkline {...props} /> : <div className={`${props.showLabel === false ? 'h-full' : 'h-[54px]'} flex items-center justify-center text-[10px] text-muted`}>Trend pending</div>}
  </div>;
}
function VisibleSparkline({ symbol, exchange = 'NSE', range = '1D', showLabel = true, unit, tooltipSide = 'top' }: Props) {
  const id = useId().replace(/:/g, '');
  const [active, setActive] = useState<number | null>(null);
  const options = { staleTime: 5 * 60_000, gcTime: 20 * 60_000, retry: false as const, refetchOnWindowFocus: false, refetchOnReconnect: false };
  const primary = useQuery({ ...options, queryKey: historyQueryKey(symbol, exchange, range), queryFn: ({ signal }) => readInstrumentHistory(symbol, exchange, range, signal) });
  const primaryView = primary.data ? miniHistory(primary.data) : null;
  const shouldFallback = range === '1D' && ((primary.data != null && (primaryView?.points.length ?? 0) < 2) || (primary.error instanceof HistoryRequestError && primary.error.status === 404));
  const fallback = useQuery({ ...options, queryKey: historyQueryKey(symbol, exchange, '1W'), enabled: shouldFallback, queryFn: ({ signal }) => readInstrumentHistory(symbol, exchange, '1W', signal) });
  const data = shouldFallback ? fallback.data : primary.data;
  const pending = shouldFallback ? fallback.isPending && !fallback.isError : primary.isPending;
  if (!data || miniHistory(data).points.length < 2) return <div className={`${showLabel ? 'h-[54px]' : 'h-full min-h-5'} flex items-center justify-center text-[10px] text-muted text-center`} role="status">{pending ? 'Loading trend…' : 'Trend unavailable'}</div>;
  return <SparklinePlot key={`${symbol}-${data.range}`} data={data} id={id} active={active} onActive={setActive} showLabel={showLabel} unit={unit} fallback={shouldFallback} tooltipSide={tooltipSide} />;
}
function SparklinePlot({ data, id, active, onActive, showLabel, unit, fallback, tooltipSide }: {
  data: HistoricalChartResponse; id: string; active: number | null; onActive: (index: number | null) => void; showLabel: boolean; unit?: string; fallback: boolean; tooltipSide: 'top' | 'bottom';
}) {
  const view = miniHistory(data), { points } = view;
  const low = Math.min(...points.map(point => point.close)), high = Math.max(...points.map(point => point.close));
  const first = points[0], last = points.at(-1)!;
  const span = high - low;
  const coords = points.map(point => ({ x: 3 + (point.timestamp - first.timestamp) / (last.timestamp - first.timestamp || 1) * 122, y: span === 0 ? 19 : 33 - (point.close - low) / span * 28 }));
  const line = coords.map(point => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(' ');
  const color = colors[view.direction];
  const selected = active == null ? null : points[Math.min(active, points.length - 1)];
  const selectedCoord = active == null ? null : coords[Math.min(active, coords.length - 1)];
  const formatValue = (value: number) => `${unit === 'pts' ? '' : data.currency === 'USD' ? '$' : '₹'}${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${unit ? ` ${unit}` : ''}`;
  const timestamp = (date: string) => new Date(date).toLocaleString('en-IN', { timeZone: view.timeZone, day: 'numeric', month: 'short', ...(view.intraday ? { hour: '2-digit', minute: '2-digit' } : {}) });
  const label = `${view.label}${fallback ? ' · fallback' : ''}`;
  const detail = `${data.symbol}: ${label}. ${formatValue(first.close)} to ${formatValue(last.close)}. ${data.source}. ${points.length} observations from ${timestamp(first.date)} to ${timestamp(last.date)}. ${data.priceBasis || 'Provider close prices; excludes dividends.'}${data.retrievedAt ? ` Retrieved ${new Date(data.retrievedAt).toLocaleString('en-IN')}.` : ''}`;
  const pick = (clientX: number, bounds: DOMRect) => {
    const x = Math.max(3, Math.min(125, (clientX - bounds.left) / bounds.width * 128));
    let best = 0;
    coords.forEach((point, index) => { if (Math.abs(point.x - x) < Math.abs(coords[best].x - x)) best = index; });
    onActive(best);
  };
  return <Tooltip.Provider delayDuration={0} disableHoverableContent>
    <Tooltip.Root open={selected != null} onOpenChange={open => { if (!open) onActive(null); }}>
    <Tooltip.Trigger asChild>
    <svg viewBox="0 0 128 38" className={`${showLabel ? 'w-full h-[38px]' : 'w-full h-full'} rounded-sm focus-visible:outline-2 focus-visible:outline-brand`} role="img" tabIndex={0} aria-label={detail}
      onFocus={() => onActive(points.length - 1)} onBlur={() => onActive(null)}
      onPointerMove={event => pick(event.clientX, event.currentTarget.getBoundingClientRect())}
      onPointerLeave={event => { if (event.pointerType === 'touch' || document.activeElement === event.currentTarget) event.preventDefault(); else onActive(null); }}
      onPointerDown={event => { event.preventDefault(); event.stopPropagation(); event.currentTarget.focus({ preventScroll: true }); pick(event.clientX, event.currentTarget.getBoundingClientRect()); }} onClick={event => { event.preventDefault(); event.stopPropagation(); }}
      onKeyDown={event => {
        if (['ArrowLeft', 'ArrowRight', 'Home', 'End', 'Escape', ' ', 'Enter'].includes(event.key)) {
          event.preventDefault(); event.stopPropagation();
          onActive(event.key === 'Escape' ? null : event.key === 'Home' ? 0 : event.key === 'End' ? points.length - 1 : event.key === 'ArrowLeft' ? Math.max(0, (active ?? points.length) - 1) : event.key === 'ArrowRight' ? Math.min(points.length - 1, (active ?? -1) + 1) : active == null ? points.length - 1 : null);
        }
      }}>
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.18" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      <polygon points={`3,38 ${line} 125,38`} fill={`url(#${id})`} />
      <polyline points={line} fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <circle cx={selectedCoord?.x ?? coords.at(-1)!.x} cy={selectedCoord?.y ?? coords.at(-1)!.y} r={selected ? 2.8 : 2} fill={color} />
    </svg>
    </Tooltip.Trigger>
    {selected && <Tooltip.Portal><Tooltip.Content side={tooltipSide} sideOffset={8} collisionPadding={{ top: 64, bottom: 12, left: 12, right: 12 }} avoidCollisions
      className="pointer-events-none z-50 max-w-[calc(100vw-24px)] rounded-lg border border-border bg-surface-overlay px-2.5 py-2 text-[10px] shadow-lg text-foreground"
      onPointerDownOutside={() => onActive(null)} onEscapeKeyDown={() => onActive(null)}>
      <span className="block text-muted whitespace-nowrap">{timestamp(selected.date)}</span><strong className="tabular-nums whitespace-nowrap">{formatValue(selected.close)}</strong>
    </Tooltip.Content></Tooltip.Portal>}
    </Tooltip.Root>
    {showLabel && <div className="flex justify-between items-center gap-1 text-[9px] text-muted leading-4 whitespace-nowrap"><span title={`${data.source} · ${label}`}>{fallback ? '1W fallback' : data.range === '1D' && view.intraday ? `${view.label.split(' · ')[0]} · ${data.interval}` : view.label}</span><span className={view.direction === 'gain' ? 'text-emerald-700 dark:text-emerald-400' : view.direction === 'loss' ? 'text-rose-700 dark:text-rose-400' : 'text-muted'}>{view.change != null ? `${view.change > 0 ? '+' : ''}${view.change.toFixed(1)}%` : ''}</span></div>}
  </Tooltip.Provider>;
}
