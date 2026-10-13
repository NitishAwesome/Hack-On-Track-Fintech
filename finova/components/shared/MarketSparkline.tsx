'use client';
import { useId } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { HistoricalChartResponse } from '@/lib/market/providers/yfinanceProvider';

export function MarketSparkline({ symbol }: { symbol: string }) {
  const id = useId().replace(/:/g, '');
  const query = useQuery({ queryKey: ['market-history', symbol, '1W'], staleTime: 5 * 60 * 1000, retry: false, queryFn: async ({ signal }) => {
    const response = await fetch(`/api/market/history?symbol=${encodeURIComponent(symbol)}&range=1W`, { signal });
    if (!response.ok) return null;
    return response.json() as Promise<HistoricalChartResponse>;
  } });
  const values = query.data?.points.map((point) => point.close).filter((value) => Number.isFinite(value) && value > 0) ?? [];
  if (values.length < 2) return null;
  const low = Math.min(...values), span = Math.max(...values) - low || 1;
  const coords = values.map((value, index) => `${2 + index / (values.length - 1) * 96},${22 - (value - low) / span * 20}`);
  const color = values.at(-1)! >= values[0] ? 'rgb(var(--gain))' : 'rgb(var(--loss))';
  return <svg viewBox="0 0 100 24" className="w-full h-full overflow-visible" role="img" aria-label={`${symbol} provider price history over one week`}><defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.3" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs><polygon points={`2,24 ${coords.join(' ')} 98,24`} fill={`url(#${id})`} /><polyline points={coords.join(' ')} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
