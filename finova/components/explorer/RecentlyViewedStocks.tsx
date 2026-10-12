'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  getRecentlyViewed,
  addRecentlyViewed,
  clearRecentlyViewed,
  RECENTLY_VIEWED_EVENT,
  type RecentlyViewedItem,
} from '@/lib/market/recentlyViewed';
import { useAutoQuotePoller } from '@/lib/hooks/useAutoQuotePoller';
import {
  History,
  TrendingUp,
  TrendingDown,
  Trash2,
  Sparkles,
} from 'lucide-react';

interface RecentlyViewedStocksProps {
  onSelectStock?: (symbol: string) => void;
}

export function RecentlyViewedStocks({ onSelectStock }: RecentlyViewedStocksProps) {
  const router = useRouter();
  const [recentItems, setRecentItems] = useState<RecentlyViewedItem[]>([]);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
      setRecentItems(getRecentlyViewed());
    }, 0);

    const handleUpdate = () => {
      setRecentItems(getRecentlyViewed());
    };

    window.addEventListener(RECENTLY_VIEWED_EVENT, handleUpdate);
    return () => {
      clearTimeout(timer);
      window.removeEventListener(RECENTLY_VIEWED_EVENT, handleUpdate);
    };
  }, []);

  // Poll current quotes for visible recently viewed symbols
  const symbolsToPoll = recentItems.map((i) => i.symbol);
  const { quotes, freshnessLabel, isRefreshing } = useAutoQuotePoller({
    symbols: symbolsToPoll,
    enabled: mounted && symbolsToPoll.length > 0,
    intervalMs: 5000,
  });

  const handleClick = (item: RecentlyViewedItem) => {
    // Re-bump recency
    addRecentlyViewed({ symbol: item.symbol, name: item.name, exchange: item.exchange });
    if (onSelectStock) {
      onSelectStock(item.symbol);
    } else {
      router.push(`/explore/stocks/${encodeURIComponent(item.symbol)}`);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    clearRecentlyViewed();
    setRecentItems([]);
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-emerald-400" />
          <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
            Recently Viewed
          </h2>
          <span className="text-[11px] text-muted font-normal">
            ({recentItems.length} {recentItems.length === 1 ? 'stock' : 'stocks'})
          </span>
          {isRefreshing && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-1" title="Quotes updating" />
          )}
        </div>

        {recentItems.length > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-muted hidden sm:inline-block">
              {freshnessLabel}
            </span>
            <button
              onClick={handleClear}
              type="button"
              className="text-[11px] text-muted hover:text-rose-400 flex items-center gap-1 transition px-2 py-0.5 rounded hover:bg-zinc-800"
              title="Clear browsing history"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear</span>
            </button>
          </div>
        )}
      </div>

      {recentItems.length === 0 ? (
        <div className="p-4 rounded-xl border border-dashed border-border/80 bg-card/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-muted">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400/70 shrink-0" />
            <span>
              Stocks you open will appear here for 1-click access. Explore market movers below or use the search bar above.
            </span>
          </div>
          <div className="text-[11px] text-zinc-500 font-medium whitespace-nowrap">
            Saved locally in browser
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {recentItems.map((item) => {
            const q = quotes[item.symbol];
            const price = q?.price;
            const changePct = q?.day_change_pct;
            const isPositive = typeof changePct === 'number' ? changePct >= 0 : true;

            return (
              <button
                key={item.symbol}
                type="button"
                onClick={() => handleClick(item)}
                className="text-left p-3 rounded-xl border border-border/70 bg-card/70 hover:bg-zinc-800/80 hover:border-emerald-500/40 transition-all duration-150 group flex flex-col justify-between shadow-sm relative overflow-hidden"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm text-foreground group-hover:text-emerald-400 transition tracking-tight">
                      {item.symbol}
                    </span>
                    <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/60 uppercase">
                      {item.exchange || 'NSE'}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted truncate mt-0.5 max-w-[120px]" title={item.name}>
                    {item.name}
                  </p>
                </div>

                <div className="mt-2.5 pt-2 border-t border-border/40 flex items-baseline justify-between">
                  <div className="font-bold text-xs text-foreground font-mono">
                    {typeof price === 'number' && !isNaN(price)
                      ? `₹${price.toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}`
                      : '—'}
                  </div>

                  {typeof changePct === 'number' && !isNaN(changePct) ? (
                    <div
                      className={`text-[11px] font-semibold flex items-center gap-0.5 ${
                        isPositive ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {isPositive ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      <span>
                        {isPositive ? '+' : ''}
                        {changePct.toFixed(2)}%
                      </span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-zinc-500">Latest</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
