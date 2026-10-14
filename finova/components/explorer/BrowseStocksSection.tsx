'use client';
import { useDisplayMetric } from '@/lib/hooks/useDisplayMetric';

// ============================================================
// FINOVA — Browse Supported Stocks Component
// components/explorer/BrowseStocksSection.tsx
//
// Displays FINOVA's verified universe of top Indian equities.
// Features:
// - Search filter (by symbol, company name, sector, industry)
// - Sector categorization tabs
// - Live/auto-updating market quotes via unified canonical market store
// - Navigation to dedicated stock detail pages (/explore/stocks/[symbol])
// - Explicit coverage scope disclosure (No fake 2,000+ stock claims)
// ============================================================

import React, { useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SECTORS as CATALOG_SECTORS, sectorName } from '@/lib/research/catalog';
import {
  EXPANDED_NSE_STOCKS,
} from '@/lib/market/stockCatalog';
import { useSharedStockQuotes } from '@/lib/market/sharedMarketStore';
import {
  Search,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import { CompanyLogo } from '@/components/shared/CompanyLogo';
import { MarketSparkline } from '@/components/shared/MarketSparkline';
import { DailyChange, instrumentVolume, Week52Position } from '@/components/shared/InstrumentMarketData';

interface BrowseStocksSectionProps {
  onSelectStock?: (symbol: string) => void;
}

const SECTORS = ['All', ...CATALOG_SECTORS];

export function BrowseStocksSection({ onSelectStock }: BrowseStocksSectionProps) {
  const displayMetric = useDisplayMetric();
  const router = useRouter();
  const params = useSearchParams();
  const searchQuery = params.get('search') || '';
  const selectedSector = SECTORS.includes(params.get('sector') || '') ? params.get('sector')! : 'All';
  const page = Math.max(1, Number.parseInt(params.get('page') || '1') || 1);
  const changeFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value); else next.delete(key);
    if (key !== 'page') next.delete('page');
    router.push(`/explore?${next}`, { scroll: false });
  };
  const setSearchQuery = (value: string) => changeFilter('search', value);
  const setSelectedSector = (value: string) => changeFilter('sector', value);
  const setPage = (value: number | ((page: number) => number)) => changeFilter('page', String(typeof value === 'number' ? value : value(page)));
  const pageSize = 15;

  // Filter catalog instruments based on search and sector
  const filteredStocks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return EXPANDED_NSE_STOCKS.filter((stock) => {
      const matchesSearch =
        !q ||
        stock.symbol.toLowerCase().includes(q) ||
        stock.name.toLowerCase().includes(q) ||
        stock.sector.toLowerCase().includes(q) ||
        stock.industry.toLowerCase().includes(q);

      const matchesSector =
        selectedSector === 'All' || sectorName(stock.sector) === selectedSector;

      return matchesSearch && matchesSector;
    });
  }, [searchQuery, selectedSector]);

  // Paginate visible instruments so we only poll quotes for the current visible page
  const totalPages = Math.ceil(filteredStocks.length / pageSize) || 1;
  const currentPage = Math.min(page, totalPages);
  const visibleStocks = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredStocks.slice(start, start + pageSize);
  }, [filteredStocks, currentPage, pageSize]);

  // Extract visible symbols for lightweight quote polling
  const visibleSymbols = useMemo(() => {
    return visibleStocks.map((s) => s.symbol);
  }, [visibleStocks]);

  // Unified canonical market quote subscription
  const { getQuote, isRefreshing, updateStatusLabel, refreshNow } =
    useSharedStockQuotes(visibleSymbols);

  const handleStockClick = (symbol: string) => {
    if (onSelectStock) {
      onSelectStock(symbol);
    } else {
      router.push(`/explore/stocks/${encodeURIComponent(symbol.toUpperCase())}`);
    }
  };

  const formatPrice = (val?: number | null) => {
    if (typeof val !== 'number' || isNaN(val)) return '—';
    return `₹${val.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <div className="research-card discovery-section space-y-5" data-accent="cyan">
      {/* 1. Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/40 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-foreground tracking-tight">
              Browse Supported Stocks
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
              {EXPANDED_NSE_STOCKS.length} Verified Equities
            </span>
          </div>
          <p className="text-xs text-muted mt-1">
            Explore supported Indian equities across catalog sectors. Available provider quotes follow your refresh preference.
          </p>
        </div>

        {/* Refresh & Status Indicator */}
        <div className="flex items-center gap-2.5 self-start md:self-auto text-xs text-muted font-mono">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isRefreshing ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'
            }`}
          />
          <span>{updateStatusLabel}</span>
          <button
            type="button"
            onClick={() => refreshNow()}
            disabled={isRefreshing}
            title="Refresh visible quotes"
            className="p-1.5 rounded-md hover:bg-surface-raised text-muted hover:text-foreground transition disabled:opacity-50"
            aria-label="Refresh quotes"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Scope & Transparency Disclosure */}
      <div className="flex items-start gap-2 p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/20 text-xs text-muted">
        <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
        <span>
          <strong className="text-foreground">Catalog Coverage Notice:</strong> Displaying {filteredStocks.length} supported NSE stocks from the FINOVA catalog. Quotes are the latest available from Yahoo Finance and may be delayed or unavailable. This directory does not cover the entire exchange.
        </span>
      </div>
      <p className="text-[11px] text-muted">Mini charts show the latest observed intraday session, or a labeled historical fallback. Their color reflects chart-period movement; daily change uses the latest quote. Hover or tap a chart to inspect an observation.</p>

      {/* 3. Search and Sector Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
            }}
            placeholder="Search by company name, symbol (e.g. RELIANCE, TCS), or sector..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface border border-border text-foreground text-xs sm:text-sm placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand transition"
          />
        </div>

        {/* Sector Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          <SlidersHorizontal className="w-3.5 h-3.5 text-muted shrink-0 mr-1 hidden sm:block" />
          {SECTORS.map((sec) => (
            <button
              key={sec}
              type="button"
              onClick={() => {
                setSelectedSector(sec);
              }}
              className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap transition ${
                selectedSector === sec
                  ? 'bg-brand text-foreground dark:text-white shadow-sm'
                  : 'bg-surface text-muted hover:text-foreground border border-border hover:bg-surface-raised'
              }`}
            >
              {sec}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Stocks Table / Grid */}
      {visibleStocks.length === 0 ? (
        <div className="p-10 text-center text-xs text-muted bg-surface-raised rounded-xl border border-border">
          No supported stocks match your current query &ldquo;{searchQuery}&rdquo;. Try another name or select &ldquo;All&rdquo; sectors.
        </div>
      ) : (
        <div className="hidden md:block overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[850px] text-left text-xs border-collapse tabular-nums">
            <thead>
              <tr className="bg-surface-raised text-muted font-semibold border-b border-border">
                <th className="py-3 px-4">Company & Symbol</th>
                <th className="py-3 px-3">Trend</th>
                <th className="py-3 px-4 text-right">Latest Price</th>
                <th className="py-3 px-3 text-right">1D Change</th>
                <th className="py-3 px-3 text-right">1D Volume</th>
                <th className="py-3 px-3">52W Position</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visibleStocks.map((stock) => {
                const quote = getQuote(stock.symbol);
                const price = quote?.price;
                const change = quote?.day_change;
                const changePct = quote?.day_change_pct;
                const isPositive = typeof change === 'number' ? change >= 0 : true;

                return (
                  <tr
                    key={stock.symbol}
                    onClick={() => handleStockClick(stock.symbol)}
                    className="hover:bg-cyan-500/5 transition cursor-pointer group"
                  >
                    {/* Company & Symbol */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <CompanyLogo symbol={stock.symbol} name={stock.name} size="sm" />
                        <div>
                          <div className="font-bold text-foreground group-hover:text-brand transition flex items-center gap-1.5">
                            <span>{stock.name}</span>
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-surface-raised text-muted border border-border">
                              NSE
                            </span>
                          </div>
                          <div className="text-[11px] text-muted font-financial">
                            {stock.symbol} · {sectorName(stock.sector)}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Sector & Industry */}
                    <td className="py-3 px-3"><MarketSparkline symbol={stock.symbol} /></td>

                    {/* Latest Price */}
                    <td className="py-3 px-4 text-right font-mono font-bold text-foreground sm:text-sm">
                      {formatPrice(price)}
                    </td>

                    {/* Daily Change & % */}
                    <td className="py-3 px-4 text-right font-mono">
                      {typeof change === 'number' && typeof changePct === 'number' ? (
                        <div
                          className={`font-semibold flex items-center justify-end gap-1 ${
                            isPositive ? 'text-emerald-500' : 'text-rose-500'
                          }`}
                        >
                          {isPositive ? (
                            <TrendingUp className="w-3.5 h-3.5" />
                          ) : (
                            <TrendingDown className="w-3.5 h-3.5" />
                          )}
                          <span>
                            {isPositive ? '+' : ''}
                            {displayMetric === 'absolute' ? `₹${change.toFixed(2)}` : `${changePct.toFixed(2)}%`}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted text-[11px]">Unavailable</span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-right text-muted" title={quote?.volume != null ? `${quote.volume.toLocaleString('en-IN')} shares · latest quoted session` : 'Volume unavailable'}>{instrumentVolume(quote?.volume)}</td>
                    <td className="py-3 px-3"><Week52Position price={price} low={quote?.low_52w} high={quote?.high_52w} /></td>
                    {/* View Details Action */}
                    <td className="py-3 px-4 text-center">
                      <button type="button" aria-label={`View ${stock.name}`} onClick={(event) => { event.stopPropagation(); handleStockClick(stock.symbol); }} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-surface-raised text-muted group-hover:bg-brand/10 group-hover:text-brand group-hover:border-brand/20 border border-border transition">
                        View
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="md:hidden space-y-3">
        {visibleStocks.map(stock => {
          const quote = getQuote(stock.symbol);
          return <article key={stock.symbol} className="discovery-instrument p-4">
            <button type="button" className="flex items-center gap-3 w-full text-left min-h-11" onClick={() => handleStockClick(stock.symbol)}>
              <CompanyLogo symbol={stock.symbol} name={stock.name} size="sm" />
              <div className="min-w-0 flex-1"><strong className="text-sm text-foreground">{stock.symbol}</strong><p className="text-[11px] text-muted truncate">{stock.name}</p><p className="text-[10px] text-cyan-700 dark:text-cyan-400 mt-1">{sectorName(stock.sector)}</p></div><ChevronRight size={16} className="text-brand" />
            </button>
            <div className="flex justify-between items-center gap-3 mt-3"><strong className="text-base tabular-nums">{formatPrice(quote?.price)}</strong><DailyChange value={quote?.day_change_pct} /></div>
            <div className="flex flex-wrap items-center justify-between gap-3 mt-2"><MarketSparkline symbol={stock.symbol} /><div className="text-right text-[10px] text-muted"><p className="mb-2">52-week position</p><Week52Position price={quote?.price} low={quote?.low_52w} high={quote?.high_52w} /><p className="mt-3 tabular-nums">Volume {instrumentVolume(quote?.volume)}</p></div></div>
            {quote?.isStaleFallback && <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-2">Cached quote · {quote.price_timestamp}</p>}
          </article>;
        })}
      </div>
      {/* 5. Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex flex-wrap gap-3 items-center justify-between text-xs text-muted pt-2 border-t border-border/40">
          <span>
            Showing {(currentPage - 1) * pageSize + 1}–
            {Math.min(currentPage * pageSize, filteredStocks.length)} of{' '}
            {filteredStocks.length} stocks
          </span>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1 rounded-lg bg-surface border border-border hover:bg-surface-raised disabled:opacity-40 transition font-medium"
            >
              Previous
            </button>
            <span className="px-2 font-mono text-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1 rounded-lg bg-surface border border-border hover:bg-surface-raised disabled:opacity-40 transition font-medium"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
