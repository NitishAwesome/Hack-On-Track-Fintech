'use client';

import React, { useState, useEffect } from 'react';
import type { MarketQuote } from '@/lib/services/marketData';
import type { TrackedMoversResponse } from '@/lib/services/marketData';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  ShieldAlert,
  RefreshCw,
} from 'lucide-react';
import { CompanyLogo } from '@/components/shared/CompanyLogo';

interface TrackedMoversSectionProps {
  onSelectStock: (symbol: string) => void;
}

export function TrackedMoversSection({ onSelectStock }: TrackedMoversSectionProps) {
  const [activeTab, setActiveTab] = useState<'gainers' | 'losers' | 'active'>('gainers');
  const [moversData, setMoversData] = useState<TrackedMoversResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const res = await fetch('/api/market/movers');
        if (!res.ok) {
          throw new Error(`Failed to retrieve market movers (status ${res.status})`);
        }
        const json: TrackedMoversResponse = await res.json();
        if (isMounted) {
          setMoversData(json);
          setLoading(false);
        }
      } catch {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleManualRefresh = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/market/movers?force=true');
      if (!res.ok) {
        throw new Error(`Failed to retrieve market movers (status ${res.status})`);
      }
      const json: TrackedMoversResponse = await res.json();
      setMoversData(json);
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  const handleStockClick = (symbol: string) => {
    onSelectStock(symbol);
  };

  const currentList: MarketQuote[] = (() => {
    if (!moversData) return [];
    if (activeTab === 'gainers') return moversData.gainers;
    if (activeTab === 'losers') return moversData.losers;
    if (activeTab === 'active') return moversData.mostActive;
    return [];
  })();

  const formatPrice = (val?: number | null) => {
    if (typeof val !== 'number' || isNaN(val)) return '—';
    return `₹${val.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <div className="bg-card/70 border border-border/70 rounded-2xl p-5 backdrop-blur-sm space-y-4">
      {/* Header and Category Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/40 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-foreground tracking-tight">
              Top Movers Among Tracked Stocks
            </h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-surface-raised text-muted border border-border">
              Tracked Universe (20 NSE Equities)
            </span>
          </div>
          <p className="text-xs text-muted mt-0.5">
            Rankings reflect latest available market quotes across the FINOVA tracked universe. Does not screen all 2,000+ NSE listed securities.
          </p>
        </div>

        <div className="flex items-center gap-1 bg-surface-raised border border-border p-1 rounded-xl overflow-x-auto self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('gainers')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
              activeTab === 'gainers'
                ? 'bg-surface text-emerald-500 border border-border shadow-sm'
                : 'text-muted hover:text-foreground'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Top Gainers
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('losers')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
              activeTab === 'losers'
                ? 'bg-surface text-rose-500 border border-border shadow-sm'
                : 'text-muted hover:text-foreground'
            }`}
          >
            <TrendingDown className="w-3.5 h-3.5" />
            Top Losers
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('active')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
              activeTab === 'active'
                ? 'bg-surface text-amber-500 border border-border shadow-sm'
                : 'text-muted hover:text-foreground'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Most Active
          </button>

          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={loading}
            title="Refresh market movers"
            className="p-1.5 text-muted hover:text-foreground rounded-md hover:bg-surface transition disabled:opacity-50 ml-1"
            aria-label="Refresh movers"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Intraday & Tracking Scope Disclosure Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-surface-raised border border-border text-[11px] text-muted">
        <div className="flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <span>
            <strong className="text-foreground">Session &amp; Scope Context:</strong>{' '}
            Prices reflect latest available provider feed (EOD or ~15m delayed exchange quotes). Movement percentages measure change from previous completed session close; they do not represent verified tick-by-tick live intraday order books.
          </span>
        </div>
      </div>

      {/* Content Grid */}
      {loading && !moversData ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-20 bg-surface-raised border border-border rounded-xl animate-pulse p-3" />
          ))}
        </div>
      ) : currentList.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {currentList.map((item) => {
            const isPositive = (item.day_change_pct ?? 0) >= 0;
            return (
              <button
                key={item.symbol}
                type="button"
                onClick={() => handleStockClick(item.symbol)}
                className="p-3.5 text-left rounded-2xl bg-surface hover:bg-surface-raised border border-border hover:border-brand/40 transition group flex items-center justify-between gap-3 shadow-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <CompanyLogo symbol={item.symbol} size="md" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-sm text-foreground group-hover:text-brand transition truncate">
                        {item.symbol}
                      </span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] bg-surface-raised text-muted border border-border">
                        NSE
                      </span>
                    </div>
                    <div className="text-xs text-foreground font-financial tabular-nums font-bold mt-0.5">
                      {formatPrice(item.price)}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0 flex items-center gap-2.5">
                  <svg className="w-12 h-6 hidden sm:block shrink-0" viewBox="0 0 48 24" fill="none">
                    <path
                      d={isPositive ? "M 2 20 Q 14 18, 24 10 T 46 4" : "M 2 4 Q 14 6, 24 14 T 46 20"}
                      stroke={isPositive ? "#10B981" : "#F43F5E"}
                      strokeWidth="2"
                      strokeLinecap="round"
                      fill="none"
                    />
                  </svg>

                  <div className="text-right">
                    <div
                      className={`text-xs font-financial tabular-nums font-bold flex items-center justify-end gap-1 ${
                        isPositive ? 'text-emerald-500' : 'text-rose-500'
                      }`}
                    >
                      {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      <span>
                        {isPositive ? '+' : ''}
                        {item.day_change_pct?.toFixed(2)}%
                      </span>
                    </div>
                    {item.volume ? (
                      <div className="text-[10px] text-muted font-financial tabular-nums mt-0.5">
                        Vol: {item.volume >= 1000000 ? `${(item.volume / 1000000).toFixed(1)}M` : `${(item.volume / 1000).toFixed(0)}K`}
                      </div>
                    ) : (
                      <div className="text-[10px] text-muted font-financial tabular-nums mt-0.5">
                        {isPositive ? '+' : ''}
                        {item.day_change?.toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="p-8 text-center text-xs text-muted">
          No movers currently recorded in this category.
        </div>
      )}
    </div>
  );
}
