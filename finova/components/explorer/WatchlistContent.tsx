'use client';
import Link from 'next/link';
import { useWatchlist } from '@/lib/hooks/useWatchlist';
import { findEquity } from '@/lib/research/catalog';
import { useSharedStockQuotes } from '@/lib/market/sharedMarketStore';
import { CompanyLogo } from '@/components/shared/CompanyLogo';

export function WatchlistContent() {
  const watchlist = useWatchlist();
  const market = useSharedStockQuotes(watchlist.items.map((item) => item.symbol));
  return <div className="page-container space-y-5"><div><h1 className="text-2xl font-bold text-foreground">Watchlist</h1><p className="text-sm text-muted mt-1">Follow supported NSE equities for research. Following does not add an investment.</p></div>
    {(watchlist.isLoading || watchlist.sessionLoading) && <p role="status" className="text-xs text-muted">Loading your Watchlist…</p>}
    {(watchlist.isError || watchlist.mutation.isError) && <p role="alert" className="text-xs text-muted">{watchlist.error?.message || watchlist.mutation.error?.message} <button className="underline" onClick={() => watchlist.refetch()}>Retry</button></p>}
    {!watchlist.isLoading && !watchlist.isError && watchlist.items.length === 0 ? <div className="card p-6 text-sm text-muted">You haven’t followed any stocks yet. <Link className="text-brand underline" href="/explore">Explore stocks</Link></div> : <div className="card p-4 space-y-3">{watchlist.items.map((item) => {
      const stock = findEquity(item.symbol), quote = market.quotes[item.symbol];
      return <div key={item.symbol} className="flex items-center gap-3 py-3 border-b border-border"><CompanyLogo symbol={item.symbol} /><Link className="flex-1 min-w-0" href={`/explore/stocks/${item.symbol}?from=${encodeURIComponent('/explore')}`}><p className="text-sm font-semibold text-foreground">{item.symbol} · NSE</p><p className="text-xs text-muted truncate">{stock?.name}</p><p className="text-xs text-muted">{quote?.price_timestamp ? new Date(quote.price_timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST' : 'Quote unavailable'}{quote?.status === 'STALE' ? ' · stale' : ''}</p></Link><div className="text-right text-xs tabular-nums text-foreground"><p>{quote ? `₹${quote.price.toLocaleString('en-IN')}` : 'Unavailable'}</p><p>{quote?.day_change_pct != null ? `${quote.day_change_pct.toFixed(2)}%` : '—'}</p></div><button type="button" className="btn-secondary text-xs" disabled={watchlist.mutation.isPending} onClick={() => watchlist.mutation.mutate({ symbol: item.symbol, followed: false })}>Unfollow</button></div>;
    })}</div>}
  </div>;
}
