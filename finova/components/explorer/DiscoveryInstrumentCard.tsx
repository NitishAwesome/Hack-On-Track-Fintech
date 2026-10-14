'use client';
import { ArrowUpRight } from 'lucide-react';
import { CompanyLogo } from '@/components/shared/CompanyLogo';
import { MarketSparkline } from '@/components/shared/MarketSparkline';
import { DailyChange, instrumentPrice, instrumentVolume, Week52Position } from '@/components/shared/InstrumentMarketData';
import type { MarketQuote } from '@/lib/services/marketData';

export function DiscoveryInstrumentCard({ symbol, name, sector, quote, onOpen, accent = 'cyan' }: {
  symbol: string; name: string; sector?: string; quote?: MarketQuote | null; onOpen: () => void; accent?: string;
}) {
  return <article className="discovery-instrument p-4 min-w-0" data-accent={accent}>
    <button type="button" onClick={onOpen} className="flex gap-3 items-center w-full min-h-11 text-left group">
      <CompanyLogo symbol={symbol} name={name} size="sm" /><div className="min-w-0 flex-1"><h3 className="font-bold text-sm text-foreground group-hover:text-brand">{symbol}</h3><p className="text-[11px] text-muted truncate" title={name}>{name}</p></div><ArrowUpRight size={15} className="text-muted group-hover:text-brand" />
    </button>
    {sector && <p className="text-[10px] text-muted mt-2 truncate">NSE · {sector}</p>}
    <div className="mt-4 flex flex-wrap justify-between items-baseline gap-1"><strong className="text-lg tabular-nums tracking-tight">{instrumentPrice(quote?.price)}</strong><DailyChange value={quote?.day_change_pct} /></div>
    <div className="flex flex-wrap items-center justify-between gap-2 mt-3"><MarketSparkline symbol={symbol} /><div className="text-right"><p className="text-[9px] text-muted mb-2">52W position</p><Week52Position price={quote?.price} low={quote?.low_52w} high={quote?.high_52w} /></div></div>
    <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-muted pt-3 mt-3 border-t border-border/60"><span className="tabular-nums" title="Provider-reported volume for the quoted session">Vol {instrumentVolume(quote?.volume)}</span><button type="button" onClick={onOpen} className="min-h-9 inline-flex items-center gap-1 text-brand font-semibold">Inspect chart <ArrowUpRight size={12} /></button></div>
    {quote?.isStaleFallback && <p className="text-[10px] text-amber-700 dark:text-amber-400">Cached quote · {quote.price_timestamp}</p>}
  </article>;
}
