'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, Activity, RefreshCw, Info } from 'lucide-react';
import type { TrackedMoversResponse } from '@/lib/services/marketData';
import { findEquity } from '@/lib/research/catalog';
import { DiscoveryInstrumentCard } from './DiscoveryInstrumentCard';

export function TrackedMoversSection({ onSelectStock }: { onSelectStock: (symbol: string) => void }) {
  const [tab, setTab] = useState<'gainers' | 'losers' | 'mostActive'>('gainers');
  const movers = useQuery({
    queryKey: ['discovery-movers'],
    staleTime: 60_000,
    queryFn: async ({ signal }) => {
      const response = await fetch('/api/market/movers', { signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Market movers are temporarily unavailable.');
      return data as TrackedMoversResponse;
    },
  });
  const list = movers.data?.[tab] || [];
  return <section className="research-card discovery-section space-y-5" data-accent="blue">
    <div className="flex flex-wrap justify-between gap-3 items-start">
      <div><p className="research-eyebrow text-brand">PRICE MOVEMENT & ACTIVITY</p><h3 className="research-title">Top Movers Among Tracked Stocks</h3><p className="text-xs text-muted mt-1">Latest available quotes from FINOVA’s 20-stock tracked universe.</p></div>
      <button type="button" className="research-button" disabled={movers.isFetching} onClick={() => movers.refetch()}><RefreshCw size={14} className={movers.isFetching ? 'animate-spin' : ''} />Refresh quotes</button>
    </div>
    <div className="flex flex-wrap gap-2">
      {([{ id: 'gainers', label: 'Top Gainers', icon: TrendingUp }, { id: 'losers', label: 'Top Losers', icon: TrendingDown }, { id: 'mostActive', label: 'Most Active', icon: Activity }] as const).map(({ id, label, icon: Icon }) => <button key={id} type="button" className={tab === id ? 'research-button border-blue-500/50 bg-blue-500/10 text-brand' : 'research-button'} aria-pressed={tab === id} onClick={() => setTab(id)}><Icon size={15} />{label}</button>)}
    </div>
    <p className="flex items-start gap-2 text-[11px] text-muted p-3 bg-blue-500/5 border border-blue-500/15 rounded-xl"><Info size={15} className="text-brand shrink-0" />Rankings cover the tracked universe, rather than the entire exchange. Daily change is measured against the previous session close. Mini charts use the latest observed intraday session, or a labeled historical fallback; color reflects that chart window.</p>
    {movers.isError && <p role="alert" className="text-xs text-amber-800 dark:text-amber-300">{movers.error.message}{movers.data ? ' Showing previously retrieved quotes.' : ''}</p>}
    {movers.isPending ? <p role="status" className="text-xs text-muted py-8">Loading tracked movers…</p> : list.length ? <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
      {list.map(quote => <DiscoveryInstrumentCard key={quote.symbol} symbol={quote.symbol} name={findEquity(quote.symbol)?.name || quote.symbol} quote={quote} sector={findEquity(quote.symbol)?.sector} accent="blue" onOpen={() => onSelectStock(quote.symbol)} />)}
    </div> : <p className="text-xs text-muted py-8">No usable quotes available for this ranking.</p>}
  </section>;
}
