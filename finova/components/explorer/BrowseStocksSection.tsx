'use client';

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

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  EXPANDED_NSE_STOCKS,
  type CatalogInstrument,
} from '@/lib/market/stockCatalog';
import { useSharedStockQuotes } from '@/lib/market/sharedMarketStore';
import {
  Search,
  TrendingUp,
  TrendingDown,
  Building2,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';

interface BrowseStocksSectionProps {
  onSelectStock?: (symbol: string) => void;
}

const SECTORS = [
  'All',
  'Information Technology',
  'Financial Services',
  'Energy',
  'Automobile',
  'Healthcare',
  'Fast Moving Consumer Goods',
  'Metals & Mining',
  'Power',
  'Capital Goods',
  'Consumer Durables',
  'Chemicals',
  'Real Estate',
  'Telecommunication',
] as const;

export function BrowseStocksSection({ onSelectStock }: BrowseStocksSectionProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSector, setSelectedSector] = useState<string>('All');
  const [page, setPage] = useState(1);
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
        selectedSector === 'All' || stock.sector === selectedSector;

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
    <div className="bg-card/70 border border-border/70 rounded-2xl p-5 sm:p-6 backdrop-blur-sm space-y-5">
      {/* 1. Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/40 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-foreground tracking-tight">
              Browse Supported Stocks
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {EXPANDED_NSE_STOCKS.length} Verified Equities
            </span>
          </div>
          <p className="text-xs text-muted mt-1">
            Explore verified Indian equities across benchmark sectors. Dynamic quotes update automatically from verified feeds.
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
            className="p-1.5 rounded-md hover:bg-zinc-800 text-muted hover:text-foreground transition disabled:opacity-50"
            aria-label="Refresh quotes"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Scope & Transparency Disclosure */}
      <div className="flex items-start gap-2 p-3 rounded-xl bg-zinc-900/40 border border-border/40 text-xs text-muted">
        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <span>
          <strong className="text-zinc-300">Catalog Coverage Notice:</strong> Displaying {filteredStocks.length} supported NSE stocks from FINOVA’s verified equity catalog. Real-time quotes are dynamically retrieved from Yahoo Finance. Non-covered small-cap or illiquid securities are excluded to maintain verified quote integrity.
        </span>
      </div>

      {/* 3. Search and Sector Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search by company name, symbol (e.g. RELIANCE, TCS), or sector..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-900/80 border border-border/80 text-foreground text-xs sm:text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition"
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
                setPage(1);
              }}
              className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap transition ${
                selectedSector === sec
                  ? 'bg-zinc-800 text-emerald-400 border border-emerald-500/30 shadow-sm'
                  : 'bg-zinc-900/60 text-muted hover:text-foreground border border-border/50 hover:border-zinc-700'
              }`}
            >
              {sec}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Stocks Table / Grid */}
      {visibleStocks.length === 0 ? (
        <div className="p-10 text-center text-xs text-muted bg-zinc-900/30 rounded-xl border border-border/30">
          No supported stocks match your current query &ldquo;{searchQuery}&rdquo;. Try another name or select &ldquo;All&rdquo; sectors.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border/60">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-zinc-900/80 text-muted font-semibold border-b border-border/60">
                <th className="py-3 px-4">Company & Symbol</th>
                <th className="py-3 px-4 hidden md:table-cell">Sector & Industry</th>
                <th className="py-3 px-4 text-right">Latest Price</th>
                <th className="py-3 px-4 text-right">Daily Change</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
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
                    className="hover:bg-zinc-850/60 transition cursor-pointer group"
                  >
                    {/* Company & Symbol */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-xs text-foreground group-hover:text-emerald-400 group-hover:border-emerald-500/40 transition">
                          {stock.symbol.slice(0, 2)}
                        </div>
                        <div>
                          <div className="font-bold text-foreground group-hover:text-emerald-400 transition flex items-center gap-1.5">
                            <span>{stock.name}</span>
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-zinc-800 text-zinc-400 border border-zinc-700">
                              NSE
                            </span>
                          </div>
                          <div className="text-[11px] text-muted font-mono">
                            {stock.symbol}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Sector & Industry */}
                    <td className="py-3 px-4 hidden md:table-cell">
                      <div className="text-zinc-300 font-medium">{stock.sector}</div>
                      <div className="text-[11px] text-muted truncate max-w-[220px]">
                        {stock.industry}
                      </div>
                    </td>

                    {/* Latest Price */}
                    <td className="py-3 px-4 text-right font-mono font-bold text-foreground sm:text-sm">
                      {formatPrice(price)}
                    </td>

                    {/* Daily Change & % */}
                    <td className="py-3 px-4 text-right font-mono">
                      {typeof change === 'number' && typeof changePct === 'number' ? (
                        <div
                          className={`font-semibold flex items-center justify-end gap-1 ${
                            isPositive ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {isPositive ? (
                            <TrendingUp className="w-3.5 h-3.5" />
                          ) : (
                            <TrendingDown className="w-3.5 h-3.5" />
                          )}
                          <span>
                            {isPositive ? '+' : ''}
                            {change.toFixed(2)} ({isPositive ? '+' : ''}
                            {changePct.toFixed(2)}%)
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted text-[11px]">Updating…</span>
                      )}
                    </td>

                    {/* View Details Action */}
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-zinc-800 text-zinc-300 group-hover:bg-emerald-500/10 group-hover:text-emerald-400 group-hover:border-emerald-500/20 border border-zinc-700 transition">
                        View
                        <ChevronRight className="w-3 h-3" />
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 5. Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted pt-2 border-t border-border/40">
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
              className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-border/60 hover:bg-zinc-800 disabled:opacity-40 transition font-medium"
            >
              Previous
            </button>
            <span className="px-2 font-mono text-zinc-300">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-border/60 hover:bg-zinc-800 disabled:opacity-40 transition font-medium"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
