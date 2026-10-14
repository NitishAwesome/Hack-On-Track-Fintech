'use client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Coins, RefreshCw, ArrowUpRight } from 'lucide-react';
import type { CommoditiesResponse, CommodityItem } from '@/lib/services/marketData';
import { MarketSparkline } from '@/components/shared/MarketSparkline';
import { DailyChange, instrumentPrice, Week52Position } from '@/components/shared/InstrumentMarketData';

export function CommoditiesOverview({ onSelectInstrument }: { onSelectInstrument?: (symbol: string, name: string) => void }) {
  const client = useQueryClient();
  const commodities = useQuery({
    queryKey: ['commodity-preview'],
    staleTime: 60_000,
    queryFn: async ({ signal }) => {
      const response = await fetch('/api/market/commodities', { signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Commodity prices are temporarily unavailable.');
      return data as CommoditiesResponse;
    },
  });
  return <section className="research-card discovery-section space-y-6" data-accent="amber">
    <div className="flex flex-wrap justify-between items-start gap-3">
      <div><p className="research-eyebrow text-amber-800 dark:text-amber-300">PRECIOUS METALS</p><h3 className="research-title flex items-center gap-2"><Coins size={20} className="text-amber-600 dark:text-amber-400" />Gold & Silver Market Benchmarks</h3><p className="text-xs text-muted mt-1">Separate global futures benchmarks from Indian ETF unit prices.</p></div>
      <button type="button" className="research-button" disabled={commodities.isFetching} onClick={() => client.invalidateQueries({ queryKey: ['commodity-preview'] })}><RefreshCw size={14} className={commodities.isFetching ? 'animate-spin' : ''} />Refresh prices</button>
    </div>
    <p className="p-4 rounded-xl bg-amber-500/7 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200 leading-relaxed">COMEX futures use <strong>USD per troy ounce</strong>. Indian ETFs use <strong>INR per unit</strong>. Futures continuation series include contract rolls; ETF unit prices also reflect their fund structure. Neither is an Indian retail jewellery spot price.</p>
    {commodities.isError && <p role="alert" className="text-xs text-amber-800 dark:text-amber-300">{commodities.error.message}{commodities.data ? ' Showing previously retrieved quotes and their original times.' : ''}</p>}
    {commodities.isPending ? <p role="status" className="text-xs text-muted py-8">Loading metals…</p> : <>
      <div><h4 className="text-sm font-semibold text-foreground mb-3">COMEX futures <span className="ml-2 text-[10px] font-medium text-amber-800 dark:text-amber-300">USD / troy oz</span></h4>
        <div className="grid md:grid-cols-2 gap-4">{commodities.data?.benchmarks.map(item => <MetalCard key={item.id} item={item} onSelect={onSelectInstrument} />)}</div>
      </div>
      <div><h4 className="text-sm font-semibold text-foreground mb-3">Indian precious-metal ETFs <span className="ml-2 text-[10px] font-medium text-cyan-800 dark:text-cyan-300">NSE · INR / unit</span></h4>
        <div className="grid md:grid-cols-2 gap-4">{commodities.data?.etfs.map(item => <MetalCard key={item.id} item={item} onSelect={onSelectInstrument} />)}</div>
      </div>
      <p className="text-[11px] text-muted">Mini charts prefer the latest observed intraday session. Any weekly fallback is labeled; chart-period color is independent of daily quote change.</p>
    </>}
  </section>;
}
function MetalCard({ item, onSelect }: { item: CommodityItem; onSelect?: (symbol: string, name: string) => void }) {
  const future = item.category === 'benchmark';
  return <article className="discovery-instrument p-5 min-w-0" data-accent={future ? 'amber' : 'cyan'}>
    <div className="flex gap-3 items-center"><span className={future ? 'p-2.5 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300' : 'p-2.5 rounded-xl bg-cyan-500/10 text-cyan-700 dark:text-cyan-300'}><Coins size={21} /></span><div className="min-w-0"><h5 className="text-sm font-bold text-foreground">{item.name}</h5><p className="text-[10px] text-muted mt-1">{item.symbol} · {future ? 'COMEX benchmark' : 'NSE ETF'} · {item.quotedUnit}</p></div></div>
    <div className="flex flex-wrap justify-between items-baseline gap-2 mt-4"><strong className="text-2xl font-bold tabular-nums">{instrumentPrice(item.price, item.currency)}</strong><DailyChange value={item.dayChangePercent} /></div>
    <div className="flex flex-wrap justify-between gap-3 items-center mt-4"><MarketSparkline symbol={item.symbol} exchange={future ? 'COMMODITY' : 'NSE'} unit={future ? '/ troy oz' : 'per unit'} /><div><p className="text-[9px] text-muted mb-2">52W position</p><Week52Position price={item.price} low={item.low52w} high={item.high52w} unit={future ? '$' : '₹'} /></div></div>
    <p className="text-[10px] text-muted mt-3">{item.source} · {item.timestamp ? new Date(item.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST' : 'Quote time unavailable'}</p>
    <div className="mt-4 pt-3 border-t border-border/60"><p className="text-[10px] text-muted leading-relaxed">{item.disclaimer}</p>{onSelect && <button type="button" className="research-button mt-3" onClick={() => onSelect(item.symbol, item.name)}>Inspect {future ? 'futures' : 'ETF'} chart <ArrowUpRight size={14} /></button>}</div>
  </article>;
}
