'use client';

import React, { useEffect, useState } from 'react';
import { StockPortfolioContext } from '@/components/explorer/StockPortfolioContext';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { safeReturnPath } from '@/lib/navigation';
import { findEquity } from '@/lib/research/catalog';
import { useWatchlist } from '@/lib/hooks/useWatchlist';
import { StockResearchPanel } from '@/components/explorer/StockResearchPanel';
import Link from 'next/link';
import { addRecentlyViewed } from '@/lib/market/recentlyViewed';
import { useSharedStockQuote } from '@/lib/market/sharedMarketStore';
import { InteractiveStockChart } from '@/components/explorer/InteractiveStockChart';
import { PriceRangeBar } from '@/components/explorer/PriceRangeBar';
import { CompanyOverviewCard } from '@/components/explorer/CompanyOverviewCard';
import { StockCrossFeatureLinks } from '@/components/explorer/StockCrossFeatureLinks';
import { StockNewsSection } from '@/components/explorer/StockNewsSection';

import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Clock,
  ShieldCheck,
  RefreshCw,
  Hash,
  Bookmark,
  Copy,
} from 'lucide-react';
import { CompanyLogo } from '@/components/shared/CompanyLogo';

interface InitialStockState {
  symbol: string;
  name: string;
  exchange: string;
  isin: string;
  sector: string;
  industry: string;
}

interface DedicatedStockDetailClientProps {
  initialStock: InitialStockState;
}

export function DedicatedStockDetailClient({
  initialStock,
}: DedicatedStockDetailClientProps) {
  const { symbol, name, exchange, isin, sector, industry } = initialStock;
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const from = safeReturnPath(params.get('from'));
  const explorerReturn = from === '/explore' || from.startsWith('/explore?') ? from : '/explore';
  const watchlist = useWatchlist();
  const canFollow = !!findEquity(symbol);
  const followed = watchlist.items.some((item) => item.symbol === symbol);
  const requestedTab = params.get('tab') || 'overview';
  const tab = ['overview', 'financials', 'news', 'compare'].includes(requestedTab) ? requestedTab : 'overview';
  const selectTab = (value: string) => {
    const next = new URLSearchParams(params.toString());
    next.set('tab', value);
    router.push(`${pathname}?${next}`, { scroll: false });
  };
  const toggleFollow = () => {
    if (!watchlist.userId) {
      router.push(`/login?next=${encodeURIComponent(`${pathname}?${params}`)}`);
      return;
    }
    watchlist.mutation.mutate({ symbol, followed: !followed });
  };

  // 1. Automatically register this stock into Recently Viewed on client mount
  useEffect(() => {
    addRecentlyViewed({
      symbol,
      name,
      exchange,
    });
  }, [symbol, name, exchange]);

  // 2. Canonical Shared Quote Poller (replaces isolated useAutoQuotePoller, intervalMs: 2500; stops when closed; pauses when hidden)
  const {
    quote,
    isRefreshing,
    marketOpen,
    updateStatusLabel,
    refreshNow,
  } = useSharedStockQuote(symbol);

  const currentPrice = quote?.price ?? null;
  const dayChange = quote?.day_change ?? null;
  const dayChangePct = quote?.day_change_pct ?? null;
  const isPositive = typeof dayChange === 'number' ? dayChange >= 0 : true;

  const formatIST = (date?: Date | string | null) => {
    if (!date) return '—';
    try {
      const d = typeof date === 'string' ? new Date(date) : date;
      return new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      }).format(d);
    } catch {
      return '—';
    }
  };

  return (
    <div className="page-container space-y-6">
      {/* 1. Breadcrumb / Back Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-3">
        <Link
          href={explorerReturn}
          className="inline-flex items-center gap-2 text-xs font-semibold text-muted hover:text-foreground transition px-2.5 py-1.5 rounded-xl hover:bg-surface-raised border border-transparent hover:border-border"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Investment Explorer</span>
        </Link>

        {/* Freshness / Auto-update status badge */}
        <div className="flex flex-wrap max-w-full items-center gap-2 text-[11px] text-muted">
          <button type="button" className="p-1.5 text-muted hover:text-foreground rounded-lg" aria-label="Copy research link" onClick={async () => { try { await navigator.clipboard.writeText(window.location.href); setCopyStatus('Link copied'); } catch { setCopyStatus('Copy unavailable. Use the address bar.'); } }} title="Copy research link"><Copy className="w-3.5 h-3.5" /></button>
          {canFollow && <button type="button" onClick={toggleFollow} disabled={watchlist.sessionLoading || watchlist.mutation.isPending || (!!watchlist.userId && (watchlist.isLoading || watchlist.isError))} aria-pressed={followed} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-raised border border-border disabled:opacity-50" title={watchlist.userId ? 'Follow in your Watchlist' : 'Sign in to follow this stock'}><Bookmark className="w-3.5 h-3.5" fill={followed ? 'currentColor' : 'none'} />{watchlist.mutation.isPending ? 'Saving…' : followed ? 'Following' : 'Follow'}</button>}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-raised border border-border font-financial">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                marketOpen
                  ? isRefreshing
                    ? 'bg-amber-500 animate-pulse'
                    : 'bg-emerald-500'
                  : 'bg-muted'
              }`}
            />
            <span>{updateStatusLabel}</span>
          </div>

          <button
            onClick={() => refreshNow()}
            disabled={isRefreshing}
            title="Manual quote refresh"
            className="p-1.5 text-muted hover:text-foreground rounded-lg hover:bg-surface-raised transition disabled:opacity-50"
            aria-label="Refresh quote"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Comprehensive Company Header */}
      <div className="bg-surface border border-border rounded-2xl p-6 shadow-xs backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div className="flex items-start gap-4">
            <CompanyLogo symbol={symbol} name={name} size="xl" />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black text-brand tracking-wider">
                  {symbol}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-surface-raised text-muted border border-border">
                  {exchange}
                </span>
                {sector && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-surface-raised text-foreground border border-border">
                    {sector}
                  </span>
                )}
                {industry && (
                  <span className="text-[10px] text-muted hidden sm:inline-block">
                    • {industry}
                  </span>
                )}
                {isin && (
                  <span className="text-[10px] text-muted font-financial flex items-center gap-1">
                    <Hash className="w-3 h-3" />
                    {isin}
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-foreground mt-1.5 tracking-tight truncate">
                {name}
              </h1>
            </div>
          </div>

          {/* Pricing Banner */}
          <div className="text-left md:text-right shrink-0">
            <div className="text-3xl sm:text-4xl font-black text-foreground font-financial tabular-nums tracking-tight">
              {typeof currentPrice === 'number'
                ? `${exchange === 'INDEX' ? '' : '₹'}${currentPrice.toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}${exchange === 'INDEX' ? ' pts' : ''}`
                : '—'}
            </div>

            <div className="flex items-center md:justify-end gap-2 mt-1">
              {typeof dayChange === 'number' && typeof dayChangePct === 'number' ? (
                <div
                  className={`text-sm font-bold font-financial tabular-nums flex items-center gap-1 ${
                    isPositive ? 'text-emerald-500' : 'text-rose-500'
                  }`}
                >
                  {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  <span>
                    {isPositive ? '+' : ''}
                    {dayChange.toFixed(2)} ({isPositive ? '+' : ''}
                    {dayChangePct.toFixed(2)}%)
                  </span>
                </div>
              ) : (
                <span className="text-xs text-muted">Latest available close</span>
              )}
            </div>

            <div className="text-[11px] text-muted mt-1 flex items-center md:justify-end gap-2">
              <span className="flex items-center gap-1 font-financial">
                <Clock className="w-3 h-3" />
                {quote?.price_timestamp ? `${new Date(quote.price_timestamp).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })} ${formatIST(quote.price_timestamp)} IST` : 'Quote time unavailable'}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-500" />
                {quote?.status === 'STALE' ? 'Yahoo Finance · stale cached quote' : 'Yahoo Finance · latest available'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {(watchlist.mutation.isError || watchlist.isError) && <p className="text-xs text-muted" role="alert">{watchlist.mutation.error?.message || watchlist.error?.message} <button type="button" className="underline" onClick={() => watchlist.refetch()}>Retry Watchlist</button></p>}
      {copyStatus && <p role="status" className="text-xs text-muted">{copyStatus}</p>}
      {canFollow && <StockPortfolioContext symbol={symbol} />}
      {canFollow && <div className="flex flex-wrap gap-2">{['overview', 'financials', 'news', 'compare'].map((value) => <button key={value} type="button" onClick={() => selectTab(value)} aria-pressed={tab === value} className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-border bg-surface-raised text-foreground">{value[0].toUpperCase() + value.slice(1)}</button>)}</div>}
      {(tab === 'financials' || tab === 'compare') ? <StockResearchPanel symbol={symbol} tab={tab} /> : <>

      {/* 3. Large Interactive Stock Chart (1D to MAX) */}
      <InteractiveStockChart
        symbol={symbol}
        exchange={exchange}
        companyName={name}
        defaultRange="1M"
      />

      {/* 4. Price Performance Range Bars (Day & 52-Week Range) */}
      <PriceRangeBar
        currentPrice={currentPrice}
        currency={exchange === 'INDEX' ? 'POINTS' : quote?.currency ?? 'INR'}
        dayLow={quote?.dayLow ?? null}
        dayHigh={quote?.dayHigh ?? null}
        fiftyTwoWeekLow={quote?.low_52w ?? null}
        fiftyTwoWeekHigh={quote?.high_52w ?? null}
      />

      {/* 5. Company Fundamentals & Verified Profile */}
      {exchange !== 'INDEX' && <CompanyOverviewCard
        symbol={symbol}
        name={name}
        exchange={exchange}
        currentPrice={currentPrice}
        dayChange={dayChange}
        dayChangePercent={dayChangePct}
        previousClose={quote?.previousClose ?? null}
        dayHigh={quote?.dayHigh ?? null}
        dayLow={quote?.dayLow ?? null}
        fiftyTwoWeekHigh={quote?.high_52w ?? null}
        fiftyTwoWeekLow={quote?.low_52w ?? null}
        volume={quote?.volume ?? null}
        sector={sector}
        industry={industry}
        isin={isin}
        currency={quote?.currency ?? 'INR'}
      />}

      {/* 6. Cross-Feature Intelligence Actions (X-Ray, Risk Radar, Future Lab, Intelligence, News) */}
      <StockCrossFeatureLinks symbol={symbol} name={name} />
      </>}

      {/* 7. Stock-Specific News Section */}
      {(tab === 'overview' || tab === 'news') && <StockNewsSection symbol={symbol} companyName={name} sector={sector} />}
    </div>
  );
}
