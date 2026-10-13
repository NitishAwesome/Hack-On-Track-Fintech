'use client';

import React from 'react';
import { MarketSparkline } from '@/components/shared/MarketSparkline';
import type { MarketIndex } from '@/types/market';
import { TrendingUp, TrendingDown, Clock, ShieldCheck, AlertCircle, RefreshCw } from 'lucide-react';
import { useSharedMarketIndices } from '@/lib/market/sharedMarketStore';

interface MarketIndexCardsProps {
  selectedIndex?: string;
  onSelectIndex: (symbol: string, name: string) => void;
}

// Canonical Shared Market Store (Single source of truth for NIFTY, SENSEX, BANK NIFTY):
// - Central poller: interval delay = 2500 ms when market is open
// - Error backoff: backoffCountRef.current exponential backoff
// - Closed market stop: pauses polling when marketStatus && marketStatus !== 'OPEN'
export function MarketIndexCards({ selectedIndex, onSelectIndex }: MarketIndexCardsProps) {
  const {
    data,
    loading,
    isRefreshing,
    marketStatus,
    error,
    refreshNow: handleManualRefresh,
  } = useSharedMarketIndices();

  const formatISTTime = (isoString?: string) => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      return new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }).format(d);
    } catch {
      return '—';
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'OPEN':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Usual trading hours (estimate)
          </span>
        );
      case 'PRE_OPEN':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Usual pre-open hours (estimate)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-surface-raised text-muted border border-border">
            <span className="w-1.5 h-1.5 rounded-full bg-muted" />
            Outside usual hours (estimate)
          </span>
        );
    }
  };

  // Map symbols to Yahoo Finance chart symbols
  const getIndexChartSymbol = (sym: string) => {
    const upper = sym.toUpperCase();
    if (upper === 'NIFTY50' || upper === 'NIFTY 50') return '^NSEI';
    if (upper === 'SENSEX') return '^BSESN';
    if (upper === 'BANKNIFTY' || upper === 'NIFTYBANK' || upper === 'NIFTY BANK') return '^NSEBANK';
    return sym;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-foreground tracking-tight">Major Indian Indices</h2>
          {marketStatus && getStatusBadge(marketStatus)}
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted font-mono">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                marketStatus === 'OPEN'
                  ? isRefreshing
                    ? 'bg-amber-400 animate-pulse'
                    : 'bg-emerald-400'
                  : 'bg-muted'
              }`}
            />
            <span>
              {marketStatus === 'OPEN'
                ? isRefreshing
                  ? 'Updating…'
                  : 'Latest available quote'
                : 'Outside usual hours · calendar estimate'}
            </span>
          </div>
          <span className="text-xs text-muted hidden md:flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            Yahoo Finance · provider feed
          </span>
          <button
            onClick={handleManualRefresh}
            disabled={loading || isRefreshing}
            title="Refresh indices"
            className="p-1.5 text-muted hover:text-foreground rounded-md hover:bg-surface-raised transition disabled:opacity-50"
            aria-label="Refresh index data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing || loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading && !data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-surface-raised border border-border rounded-xl animate-pulse p-4" />
          ))}
        </div>
      )}

      {error && !data?.indices?.length && (
        <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 text-amber-700 dark:text-amber-300 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}. Displaying fallback status.</span>
        </div>
      )}

      {data?.indices && data.indices.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {data.indices.map((idx: MarketIndex) => {
            const chartSymbol = getIndexChartSymbol(idx.symbol);
            const isSelected = selectedIndex === chartSymbol;
            const changeVal = idx.change ?? 0;
            const changePctVal = idx.changePercent ?? 0;
            const isPositive = changeVal >= 0;

            return (
              <button
                key={idx.symbol}
                type="button"
                onClick={() => onSelectIndex(chartSymbol, idx.name)}
                className={`text-left p-4 rounded-xl border transition-all duration-200 group relative overflow-hidden ${
                  isSelected
                    ? 'bg-surface border-brand shadow-sm ring-1 ring-brand'
                    : 'bg-surface hover:bg-surface-raised border-border'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-medium text-muted uppercase tracking-wider">
                      {idx.symbol === 'BANKNIFTY' ? 'NSE Index' : idx.symbol === 'SENSEX' ? 'BSE Index' : 'NSE Index'}
                    </span>
                    <h3 className="text-base font-bold text-foreground mt-0.5 group-hover:text-brand transition">
                      {idx.name}
                    </h3>
                  </div>
                  <div
                    className={`p-1.5 rounded-lg ${
                      isPositive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                    }`}
                  >
                    {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  </div>
                </div>

                <div className="mt-3 flex items-baseline justify-between">
                  <div className="text-xl font-extrabold text-foreground tracking-tight">
                    {idx.value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} pts
                  </div>
                  <div
                    className={`text-xs font-semibold flex items-center gap-1 ${
                      isPositive ? 'text-emerald-500' : 'text-rose-500'
                    }`}
                  >
                    <span>{idx.change === null ? '—' : `${isPositive ? '+' : ''}${changeVal.toFixed(2)}`}</span>
                    <span>{idx.changePercent === null ? '—' : `(${isPositive ? '+' : ''}${changePctVal.toFixed(2)}%)`}</span>
                  </div>
                </div>

                <div className="h-9 my-1">
                    <MarketSparkline symbol={idx.symbol} />
                  </div>

                  <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[11px] text-muted">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatISTTime(idx.timestamp)} IST
                  </span>
                  <span className="text-muted group-hover:text-foreground transition">
                    Click to inspect chart →
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
