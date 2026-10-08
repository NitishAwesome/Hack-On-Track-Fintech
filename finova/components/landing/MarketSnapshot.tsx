'use client';

import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import type { MarketDataResponse } from '@/types/market';
import { cn } from '@/lib/utils';

export function MarketSnapshot() {
  const [data, setData] = useState<MarketDataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRefresh() {
    setRefreshing(true);
    setError(null);
    try {
      const res = await fetch('/api/market/indices?force=true', { cache: 'no-store' });
      if (!res.ok) {
        throw new Error('Failed to retrieve market snapshot');
      }
      const json: MarketDataResponse = await res.json();
      setData(json);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Market data temporarily unavailable';
      setError(msg);
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        const res = await fetch('/api/market/indices', { cache: 'no-store' });
        if (!res.ok) {
          throw new Error('Failed to retrieve market snapshot');
        }
        const json: MarketDataResponse = await res.json();
        if (active) {
          setData(json);
        }
      } catch (err: unknown) {
        if (active) {
          const msg = err instanceof Error ? err.message : 'Market data temporarily unavailable';
          setError(msg);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadData();

    // Controlled periodic background refresh every 60 seconds
    const intervalId = setInterval(loadData, 60 * 1000);

    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, []);

  const marketStatus = data?.marketStatus || 'UNKNOWN';
  const isMarketOpen = marketStatus === 'OPEN';
  const isPreOpen = marketStatus === 'PRE_OPEN';

  const defaultIndexCards = [
    { name: 'NIFTY 50', symbol: 'NIFTY50', exchange: 'NSE' },
    { name: 'SENSEX', symbol: 'SENSEX', exchange: 'BSE' },
    { name: 'NIFTY BANK', symbol: 'BANKNIFTY', exchange: 'NSE' },
  ];

  return (
    <section className="py-6 sm:py-8 border-y border-border bg-surface-raised/40 select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
              Market Snapshot
            </h2>

            {/* Session Status Pill */}
            <div
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border',
                isMarketOpen
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                  : isPreOpen
                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-500'
                  : 'bg-muted/10 border-border text-muted'
              )}
            >
              <span
                className={cn(
                  'w-1.5 h-1.5 rounded-full',
                  isMarketOpen ? 'bg-emerald-500 animate-pulse' : 'bg-muted'
                )}
              />
              <span>
                {isMarketOpen
                  ? 'Market Open · Latest available market data'
                  : isPreOpen
                  ? 'Pre-Open Session'
                  : 'Market Closed'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-muted">
            {/* Timestamp */}
            <div className="flex items-center gap-1 text-[11px]">
              <Clock className="w-3 h-3 text-muted" />
              <span>
                {data?.lastUpdated
                  ? isMarketOpen
                    ? `Latest update: ${new Date(data.lastUpdated).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })} IST`
                    : `Market closed · Last updated: ${new Date(data.lastUpdated).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })} IST`
                  : 'Trading hours: 09:15 – 15:30 IST'}
              </span>
            </div>

            {/* Controlled manual refresh button */}
            <button
              type="button"
              onClick={handleRefresh}
              disabled={loading || refreshing}
              className="p-1 rounded-md hover:bg-surface text-muted hover:text-foreground transition-colors disabled:opacity-50"
              title="Refresh market snapshot"
              aria-label="Refresh market snapshot"
            >
              <RefreshCw className={cn('w-3 h-3', (loading || refreshing) && 'animate-spin')} />
            </button>
          </div>
        </div>

        {/* 1. Loading Skeleton State */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5" role="status" aria-label="Loading market indices">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="p-4 rounded-xl border border-border bg-surface animate-pulse space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="h-3.5 bg-muted/20 rounded w-20" />
                  <div className="h-3 bg-muted/20 rounded w-10" />
                </div>
                <div className="h-6 bg-muted/20 rounded w-28" />
                <div className="h-3.5 bg-muted/20 rounded w-24" />
              </div>
            ))}
          </div>
        )}

        {/* 2. Success State with Real Provider Quotes */}
        {!loading && data && data.success && data.indices.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {data.indices.map((idx) => {
              const isPositive = idx.change >= 0;
              const TrendIcon = isPositive ? TrendingUp : TrendingDown;

              return (
                <div
                  key={idx.symbol}
                  className="p-4 rounded-xl border border-border bg-surface flex flex-col justify-between transition-colors hover:border-brand/40 shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground tracking-wide">
                      {idx.name}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-raised border border-border text-muted">
                      {idx.symbol === 'BANKNIFTY' ? 'NSE' : idx.symbol === 'NIFTY50' ? 'NSE' : 'BSE'}
                    </span>
                  </div>

                  <div className="mt-2.5">
                    <div className="text-xl font-extrabold tracking-tight tabular-nums text-foreground">
                      ₹{idx.value.toLocaleString('en-IN', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>

                    <div className="flex items-center gap-1.5 mt-1 text-xs font-semibold tabular-nums">
                      <span
                        className={cn(
                          'flex items-center gap-0.5',
                          isPositive ? 'text-gain' : 'text-loss'
                        )}
                      >
                        <TrendIcon className="w-3.5 h-3.5" />
                        {isPositive ? '+' : ''}
                        {idx.change.toFixed(2)} ({isPositive ? '+' : ''}
                        {idx.changePercent.toFixed(2)}%)
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 3. Unavailable / Empty Response State (Never fake numbers) */}
        {!loading && (!data || !data.success || data.indices.length === 0) && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {defaultIndexCards.map((index) => (
                <div
                  key={index.symbol}
                  className="p-4 rounded-xl border border-border bg-surface flex flex-col justify-between opacity-85"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground tracking-wide">
                      {index.name}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-raised border border-border text-muted">
                      {index.exchange}
                    </span>
                  </div>

                  <div className="mt-3">
                    <span className="text-sm font-semibold text-muted">
                      — — —
                    </span>
                    <p className="text-[11px] text-muted/80 mt-1">
                      Data temporarily unavailable
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Informative Banner */}
            <div
              className="p-3 rounded-xl border flex items-center gap-3 text-xs"
              style={{
                backgroundColor: 'rgb(var(--surface))',
                borderColor: 'rgb(var(--border))',
              }}
            >
              <AlertCircle className="w-4 h-4 text-brand flex-shrink-0" />
              <div className="flex-1">
                <span className="font-semibold text-foreground">
                  Market data temporarily unavailable.
                </span>{' '}
                <span className="text-muted">
                  The upstream quote service did not return live values. Values will restore automatically upon next refresh.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 4. Error State */}
        {error && (
          <div className="mt-3 p-3 rounded-xl border border-loss/20 bg-loss-bg/30 text-loss text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={handleRefresh}
              className="font-semibold underline hover:no-underline ml-2"
            >
              Retry
            </button>
          </div>
        )}

        {/* Subtle, professional data source disclosure */}
        <div className="mt-3 flex items-center justify-between text-[10px] text-muted/80">
          <span>Market data source: Yahoo Finance</span>
          <span>Prototype data · Indicative index quotes</span>
        </div>
      </div>
    </section>
  );
}

export default MarketSnapshot;
