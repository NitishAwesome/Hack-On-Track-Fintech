'use client';

import React, { useState, useEffect } from 'react';
import type { CommoditiesResponse, CommodityItem } from '@/lib/services/marketData';
import {
  Coins,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';

interface CommoditiesOverviewProps {
  onSelectInstrument?: (symbol: string, name: string) => void;
}

export function CommoditiesOverview({ onSelectInstrument }: CommoditiesOverviewProps) {
  const [data, setData] = useState<CommoditiesResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const res = await fetch('/api/market/commodities');
        if (!res.ok) {
          throw new Error(`Failed to retrieve commodity prices (status ${res.status})`);
        }
        const json: CommoditiesResponse = await res.json();
        if (isMounted) {
          setData(json);
          setError(null);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Commodity market feed temporarily unavailable');
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
    setError(null);
    try {
      const res = await fetch('/api/market/commodities?force=true');
      if (!res.ok) {
        throw new Error(`Failed to retrieve commodity prices (status ${res.status})`);
      }
      const json: CommoditiesResponse = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Commodity market feed temporarily unavailable');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (item: CommodityItem) => {
    if (typeof item.price !== 'number' || isNaN(item.price)) return '—';
    const sym = item.currency === 'USD' ? '$' : '₹';
    return `${sym}${item.price.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <div className="bg-card/70 border border-border/70 rounded-2xl p-6 backdrop-blur-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/40 pb-4">
        <div>
          <h3 className="text-lg font-bold text-foreground tracking-tight flex items-center gap-2">
            <Coins className="w-5 h-5 text-amber-700 dark:text-amber-400" />
            Gold & Silver Market Benchmarks
          </h3>
          <p className="text-xs text-muted mt-0.5">
            Monitor international precious metal futures benchmarks and Indian physically backed ETFs.
          </p>
        </div>

        <button
          type="button"
          onClick={handleManualRefresh}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface-raised border border-border text-muted hover:text-foreground transition disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Prices
        </button>
      </div>

      {/* Critical Currency & Unit Provenance Warning */}
      <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-500 space-y-1">
        <div className="flex items-center gap-2 font-bold">
          <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
          <span>Important Benchmark &amp; Unit Disclosure</span>
        </div>
        <p className="text-[11px] leading-relaxed">
          International futures (COMEX) are denominated in <strong className="text-foreground">USD per troy ounce</strong> and reflect global wholesale contracts. They do not represent Indian domestic retail jewelry spot prices (quoted in INR per 10 grams) which incorporate import tariffs, GST, and local mint premiums. For Indian currency tracking, observe the NSE-listed Gold &amp; Silver BeES ETFs below.
        </p>
      </div>

      {loading && !data ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-surface-raised border border-border rounded-xl animate-pulse p-4" />
          ))}
        </div>
      ) : error && !data ? (
        <div className="p-6 text-center text-xs text-muted bg-surface-raised rounded-xl border border-border">
          {error}. Please try refreshing shortly.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Section 1: International Futures Benchmarks */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted">
                1. International Futures Benchmarks (COMEX · USD / troy oz)
              </h4>
              <span className="text-[10px] text-muted">Global Reference Contracts</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data?.benchmarks.map((item) => {
                const isPositive = (item.dayChangePercent ?? 0) >= 0;
                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl bg-surface border border-border flex flex-col justify-between shadow-sm"
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-base text-foreground">
                              {item.name}
                            </span>
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-surface-raised text-amber-500 border border-border">
                              {item.symbol}
                            </span>
                          </div>
                          <span className="text-[11px] text-muted block mt-0.5">
                            Quoted Unit: <strong className="text-foreground">{item.quotedUnit}</strong>
                          </span>
                        </div>

                        <div
                          className={`p-1.5 rounded-lg ${
                            isPositive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                          }`}
                        >
                          {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        </div>
                      </div>

                      <div className="mt-4 flex items-baseline justify-between">
                        <div className="text-2xl font-black text-foreground tracking-tight">
                          {formatPrice(item)}
                        </div>
                        {typeof item.dayChangePercent === 'number' && (
                          <div
                            className={`text-xs font-bold flex items-center gap-1 ${
                              isPositive ? 'text-emerald-500' : 'text-rose-500'
                            }`}
                          >
                            <span>{isPositive ? '+' : ''}{item.dayChange?.toFixed(2)}</span>
                            <span>({isPositive ? '+' : ''}{item.dayChangePercent.toFixed(2)}%)</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-border/40 text-[10px] text-muted leading-snug">
                      {item.disclaimer}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Indian Gold & Silver ETFs (NSE) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted">
                2. Indian Precious Metal Instruments (NSE · INR / unit)
              </h4>
              <span className="text-[10px] text-emerald-500 font-semibold">NSE Traded · Physical Backing</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data?.etfs.map((item) => {
                const isPositive = (item.dayChangePercent ?? 0) >= 0;
                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl bg-surface border border-border hover:border-emerald-500/30 transition flex flex-col justify-between group shadow-sm"
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-base text-foreground group-hover:text-emerald-500 transition">
                              {item.name}
                            </span>
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-surface-raised text-emerald-500 border border-border">
                              {item.symbol}
                            </span>
                          </div>
                          <span className="text-[11px] text-muted block mt-0.5">
                            Quoted Unit: <strong className="text-foreground dark:text-zinc-300">{item.quotedUnit}</strong>
                          </span>
                        </div>

                        <div
                          className={`p-1.5 rounded-lg ${
                            isPositive ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-700 dark:text-rose-400'
                          }`}
                        >
                          {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        </div>
                      </div>

                      <div className="mt-4 flex items-baseline justify-between">
                        <div className="text-2xl font-black text-foreground tracking-tight">
                          {formatPrice(item)}
                        </div>
                        {typeof item.dayChangePercent === 'number' && (
                          <div
                            className={`text-xs font-bold flex items-center gap-1 ${
                              isPositive ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                            }`}
                          >
                            <span>{isPositive ? '+' : ''}{item.dayChange?.toFixed(2)}</span>
                            <span>({isPositive ? '+' : ''}{item.dayChangePercent.toFixed(2)}%)</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-border/40 flex items-center justify-between text-[11px]">
                      <span className="text-[10px] text-muted dark:text-zinc-500">
                        {item.disclaimer}
                      </span>
                      {onSelectInstrument && (
                        <button
                          type="button"
                          onClick={() => onSelectInstrument(item.providerTicker, item.name)}
                          className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 flex items-center gap-0.5 shrink-0 ml-2"
                        >
                          Inspect Chart <ChevronRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
