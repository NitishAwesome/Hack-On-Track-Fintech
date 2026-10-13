'use client';
import Link from 'next/link';
import { useSession } from '@/components/providers/QueryProvider';
import { usePrivateQuery } from '@/lib/hooks/usePrivateQuery';
import { valuationBasis } from '@/lib/calculations/valuationBasis';
import type { HoldingWithMetrics } from '@/types/portfolio';

export function StockPortfolioContext({ symbol }: { symbol: string }) {
  const { userId } = useSession();
  const query = usePrivateQuery({ queryKey: ['holdings'], queryFn: async ({ signal }) => {
    const response = await fetch('/api/portfolio/holdings', { signal, cache: 'no-store' });
    if (!response.ok) throw new Error('Your portfolio exposure is unavailable.');
    return response.json() as Promise<{ holdings: HoldingWithMetrics[] }>;
  } });
  if (!userId) return null;
  const holdings = query.data?.holdings || [];
  const positions = holdings.filter((holding) => holding.symbol.toUpperCase() === symbol && holding.asset_class === 'equity' && holding.exchange === 'NSE');
  const basis = valuationBasis(holdings);
  const pricedValue = positions.reduce((sum, holding) => sum + basis.valueOf(holding), 0);
  const hasStaleQuotes = positions.some((holding) => holding.price_status === 'STALE');
  const hasCompleteQuotes = positions.every((holding) => typeof holding.current_price === 'number' && Number.isFinite(holding.current_price) && holding.current_price > 0 && typeof holding.current_value === 'number' && Number.isFinite(holding.current_value));
  const money = (value: number) => `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  return <section className="bg-surface border border-border rounded-2xl p-5 space-y-2"><h2 className="text-sm font-bold text-foreground">In your portfolio</h2>
    {query.isLoading ? <p role="status" className="text-xs text-muted">Loading recorded exposure…</p> : query.isError ? <p role="alert" className="text-xs text-muted">{query.error.message} <button type="button" className="underline" onClick={() => query.refetch()}>Retry</button></p> : positions.length === 0 ? <p className="text-xs text-muted">No recorded NSE equity position in {symbol}.</p> : <><p className="text-xs text-muted">{positions.reduce((sum, holding) => sum + holding.quantity, 0).toLocaleString('en-IN')} units across {new Set(positions.map((holding) => holding.broker_account_id)).size} recorded accounts · Invested {money(positions.reduce((sum, holding) => sum + holding.invested_value, 0))}</p><p className="text-xs text-muted">Recorded valued exposure: {hasCompleteQuotes ? money(positions.reduce((sum, holding) => sum + holding.current_value!, 0)) : 'Incomplete quote coverage'} · Weight {basis.total > 0 ? `${(pricedValue / basis.total * 100).toFixed(2)}%` : 'Unavailable'} ({basis.label.toLowerCase()}){hasStaleQuotes ? ' · Includes stale cached quotes' : ''}</p><Link className="text-xs text-brand underline" href={`/analysis?symbol=${encodeURIComponent(symbol)}`}>Inspect consolidated exposure</Link></>}
  </section>;
}
