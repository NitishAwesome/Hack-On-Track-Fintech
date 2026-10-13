'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend } from 'recharts';
import { EXPANDED_NSE_STOCKS } from '@/lib/market/stockCatalog';
import type { AlignedPricePoint } from '@/lib/research/comparison';
import type { FinancialMetric } from '@/lib/research/financials';
import type { MarketQuote } from '@/lib/market/providers/yfinanceProvider';

async function readResearch<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Research data is unavailable.');
  return result;
}

export function StockResearchPanel({ symbol, tab }: { symbol: string; tab: 'financials' | 'compare' }) {
  return tab === 'financials' ? <Financials symbol={symbol} /> : <Comparison symbol={symbol} />;
}

function Financials({ symbol }: { symbol: string }) {
  const query = useQuery({ queryKey: ['research-financials', symbol], queryFn: ({ signal }) => readResearch<{ metrics: FinancialMetric[] }>(`/api/research/financials?symbol=${encodeURIComponent(symbol)}`, signal) });
  const metrics = query.data?.metrics ?? [];
  return <section className="bg-surface border border-border rounded-2xl p-5 space-y-4">
    <h2 className="text-base font-bold text-foreground">Reported annual financials</h2>
    {query.isLoading ? <p className="text-xs text-muted" role="status">Loading financials…</p> : query.isError ? <p role="alert" className="text-xs text-muted">{query.error.message} <button className="underline" onClick={() => query.refetch()}>Retry</button></p> : metrics.length === 0 ? <p className="text-xs text-muted">No reviewed financial records available for this company.</p> : <>
      <p className="text-xs text-muted">Consolidated · Ind AS · Annual figures. Price-dependent ratios and TTM metrics are unavailable.</p>
      <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr className="border-b border-border"><th className="py-3 pr-3">Metric</th><th className="pr-3">FY2025–26</th><th className="pr-3">FY2024–25</th><th>Source</th></tr></thead><tbody>{metrics.filter((metric) => metric.period === 'FY2025–26').map((metric) => {
        const previous = metrics.find((candidate) => candidate.id === metric.id && candidate.period === 'FY2024–25');
        return <tr key={metric.id} className="border-b border-border"><td className="py-3 pr-3">{metric.label}<span className="block text-muted">{metric.unit}</span></td><td className="pr-3 tabular-nums">{metric.value?.toLocaleString('en-IN') ?? 'Unavailable'}</td><td className="pr-3 tabular-nums">{previous?.value?.toLocaleString('en-IN') ?? 'Unavailable'}</td><td><a className="text-brand underline" href={`${metric.documentUrl}#page=${metric.pdfPage}`} target="_blank" rel="noopener noreferrer">PDF p. {metric.pdfPage} (printed {metric.printedPage})</a><span className="block text-muted">Reviewed {metric.reviewedAt}</span></td></tr>;
      })}</tbody></table></div>
    </>}
  </section>;
}

interface ComparisonResponse {
  first: { symbol: string; name: string; quote: MarketQuote | null };
  second: { symbol: string; name: string; quote: MarketQuote | null };
  points: AlignedPricePoint[];
  firstPerformance: number | null;
  secondPerformance: number | null;
  priceBasis: string;
  largeDiscontinuity: boolean;
}
const percentage = (value: number | null | undefined) => typeof value === 'number' && Number.isFinite(value) ? `${value.toFixed(2)}%` : 'Unavailable';

function Comparison({ symbol }: { symbol: string }) {
  const router = useRouter(), pathname = usePathname(), params = useSearchParams();
  const second = params.get('compare') || '';
  const range = ['1M', '3M', '1Y'].includes(params.get('range') || '') ? params.get('range')! : '1M';
  const valid = second !== symbol && EXPANDED_NSE_STOCKS.some((stock) => stock.symbol === second);
  const update = (key: string, value: string) => { const next = new URLSearchParams(params.toString()); next.set(key, value); router.push(`${pathname}?${next}`, { scroll: false }); };
  const query = useQuery({ queryKey: ['stock-comparison', symbol, second, range], enabled: valid, queryFn: ({ signal }) => readResearch<ComparisonResponse>(`/api/research/compare?first=${encodeURIComponent(symbol)}&second=${encodeURIComponent(second)}&range=${range}`, signal) });
  const data = query.data;
  return <section className="bg-surface border border-border rounded-2xl p-5 space-y-4">
    <div className="flex flex-wrap items-center gap-3"><h2 className="text-base font-bold text-foreground">Compare with</h2><select aria-label="Second stock" value={second} onChange={(event) => update('compare', event.target.value)} className="max-w-full min-w-0 bg-surface-raised border border-border rounded-xl p-2 text-xs text-foreground"><option value="">Choose a supported NSE equity</option>{EXPANDED_NSE_STOCKS.filter((stock) => stock.symbol !== symbol).map((stock) => <option key={stock.symbol} value={stock.symbol}>{stock.symbol} · {stock.name}</option>)}</select><div className="flex gap-2">{['1M', '3M', '1Y'].map((value) => <button className="px-3 py-1.5 rounded-xl border border-border text-xs text-foreground" aria-pressed={range === value} key={value} onClick={() => update('range', value)}>{value}</button>)}</div></div>
    {!valid ? <p className="text-xs text-muted">Choose two distinct supported stocks.</p> : query.isLoading ? <p role="status" className="text-xs text-muted">Loading common trading dates…</p> : query.isError ? <p role="alert" className="text-xs text-muted">{query.error.message} <button className="underline" onClick={() => query.refetch()}>Retry</button></p> : data && <>
      {data.points.length < 2 ? <p className="text-xs text-muted">Insufficient common trading dates for a comparison.</p> : <>
        <p className="text-xs text-muted">{data.points[0].date} to {data.points.at(-1)!.date} · Both start at 100 on the first shared trading date. Missing dates are excluded.</p>
        <div role="img" aria-label={`Price performance: ${symbol} ${data.firstPerformance?.toFixed(2)} percent; ${second} ${data.secondPerformance?.toFixed(2)} percent over the shared window.`}><ResponsiveContainer width="100%" height={300}><LineChart data={data.points}><CartesianGrid stroke="rgb(var(--border))" strokeDasharray="3 3" /><XAxis dataKey="date" tick={{ fill: 'rgb(var(--muted))', fontSize: 10 }} /><YAxis domain={['auto', 'auto']} tick={{ fill: 'rgb(var(--muted))', fontSize: 10 }} /><Tooltip contentStyle={{ background: 'rgb(var(--surface))', color: 'rgb(var(--foreground))', borderColor: 'rgb(var(--border))' }} /><Legend /><Line type="linear" name={symbol} dataKey="first" stroke="#3B82F6" dot={false} isAnimationActive={false} /><Line type="linear" name={second} dataKey="second" stroke="#06B6D4" dot={false} isAnimationActive={false} /></LineChart></ResponsiveContainer></div>
      </>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[data.first, data.second].map((stock, index) => <div key={stock.symbol} className="p-3 rounded-xl bg-surface-raised border border-border text-xs space-y-1">
          <p className="font-bold text-foreground">{stock.name} · {stock.symbol} (NSE)</p>
          <p className="text-muted">Shared-window price performance: {percentage(index === 0 ? data.firstPerformance : data.secondPerformance)}</p>
          <p className="text-muted">Daily movement: {percentage(stock.quote?.day_change_pct)}</p>
          <p className="text-muted">Quote: {stock.quote?.price_timestamp ? new Date(stock.quote.price_timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST' : 'Unavailable'} · {stock.quote?.status || 'Unavailable'}</p>
          <p className="text-muted">52-week low / high: {stock.quote?.low_52w?.toLocaleString('en-IN') ?? 'Unavailable'} / {stock.quote?.high_52w?.toLocaleString('en-IN') ?? 'Unavailable'} INR</p>
          <p className="text-muted">Volume: {stock.quote?.volume?.toLocaleString('en-IN') ?? 'Unavailable'}</p>
        </div>)}
      </div>
      <p className="text-xs text-muted">{data.priceBasis} This is price performance, excluding dividends. Corporate-action adjustments are not independently reconciled; this comparison does not rank investment suitability.</p>
      {data.largeDiscontinuity && <p role="status" className="text-xs text-muted">A large price discontinuity was detected. Check the source for splits, other corporate actions or missing observations before interpreting performance.</p>}
    </>}
  </section>;
}
