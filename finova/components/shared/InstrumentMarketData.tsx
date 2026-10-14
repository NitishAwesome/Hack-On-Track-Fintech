import { week52Position } from '@/lib/market/miniHistory';

export const instrumentPrice = (value?: number | null, currency = 'INR', unit = '') => typeof value === 'number' && Number.isFinite(value) && value > 0
  ? `${currency === 'USD' ? '$' : currency === 'POINTS' ? '' : '₹'}${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${unit ? ` ${unit}` : ''}` : 'Unavailable';
export const instrumentVolume = (value?: number | null) => typeof value === 'number' && Number.isFinite(value) && value >= 0
  ? new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(value) : 'Unavailable';
export function DailyChange({ value, label = true }: { value?: number | null; label?: boolean }) {
  const valid = typeof value === 'number' && Number.isFinite(value);
  return <span className={`tabular-nums font-semibold text-xs ${!valid || value === 0 ? 'text-muted' : value! > 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
    {valid ? `${value! > 0 ? '+' : ''}${value!.toFixed(2)}%${label ? ' daily' : ''}` : 'Change unavailable'}
  </span>;
}
export function Week52Position({ price, low, high, unit = '₹' }: { price?: number | null; low?: number | null; high?: number | null; unit?: string }) {
  const position = week52Position(price, low, high);
  if (position == null) return <span className="text-[10px] text-muted">52W unavailable</span>;
  const label = `52-week position: ${position.toFixed(1)}%. Low ${unit}${low!.toLocaleString('en-IN')}; high ${unit}${high!.toLocaleString('en-IN')}; latest ${unit}${price!.toLocaleString('en-IN')}. Informational price range.`;
  return <div className="min-w-[90px] w-[110px] max-w-full" role="img" aria-label={label} title={label} data-week52-position={position}>
    <div className="flex items-center gap-2 text-[9px] text-muted"><span>L</span><div className="relative flex-1 h-1.5 rounded-full bg-gradient-to-r from-cyan-500/25 to-blue-500/45"><span className="absolute w-2.5 h-2.5 rounded-full bg-blue-600 dark:bg-cyan-400 border-2 border-surface top-1/2 -translate-y-1/2 -translate-x-1/2" style={{ left: `${position}%` }} /></div><span>H</span></div>
  </div>;
}
