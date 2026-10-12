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
  ChevronRight,
} from 'lucide-react';
import { CompanyLogo } from '@/components/shared/CompanyLogo';

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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
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
                className="text-left p-3.5 rounded-2xl border border-border bg-surface hover:bg-surface-raised hover:border-brand/40 transition-all duration-150 group flex items-center justify-between gap-3 shadow-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <CompanyLogo symbol={item.symbol} name={item.name} size="md" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-sm text-foreground group-hover:text-brand transition tracking-tight truncate">
                        {item.symbol}
                      </span>
                    </div>
                    <div className="font-financial tabular-nums text-xs font-bold text-foreground mt-0.5">
                      {typeof price === 'number' && !isNaN(price)
                        ? `₹${price.toLocaleString('en-IN', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}`
                        : '—'}
                    </div>
                    {typeof changePct === 'number' && !isNaN(changePct) ? (
                      <div
                        className={`text-[11px] font-semibold flex items-center gap-0.5 mt-0.5 ${
                          isPositive ? 'text-emerald-500' : 'text-rose-500'
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
                    ) : null}
                  </div>
                </div>

                <ChevronRight className="w-4 h-4 text-muted group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
