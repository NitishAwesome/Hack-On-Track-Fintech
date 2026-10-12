'use client';

import React, { useEffect, useState } from 'react';
import type { MarketIndex, MarketDataResponse } from '@/types/market';
import { TrendingUp, TrendingDown, Clock, ShieldCheck, AlertCircle, RefreshCw } from 'lucide-react';

interface MarketIndexCardsProps {
  selectedIndex?: string;
  onSelectIndex: (symbol: string, name: string) => void;
}

export function MarketIndexCards({ selectedIndex, onSelectIndex }: MarketIndexCardsProps) {
  const [data, setData] = useState<MarketDataResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const res = await fetch('/api/market/indices');
        if (!res.ok) {
          throw new Error(`Failed to fetch market indices (status ${res.status})`);
        }
        const json: MarketDataResponse = await res.json();
        if (isMounted) {
          setData(json);
          setError(null);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Market indices temporarily unavailable');
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
      const res = await fetch('/api/market/indices?force=true');
      if (!res.ok) {
        throw new Error(`Failed to fetch market indices (status ${res.status})`);
      }
      const json: MarketDataResponse = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Market indices temporarily unavailable');
    } finally {
      setLoading(false);
    }
  };

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
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Market Open
          </span>
        );
      case 'PRE_OPEN':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Pre-Open
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-800 text-zinc-400 border border-zinc-700">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
            Market Closed
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
          {data?.marketStatus && getStatusBadge(data.marketStatus)}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Yahoo Finance Feed
          </span>
          <button
            onClick={handleManualRefresh}
            disabled={loading}
            title="Refresh indices"
            className="p-1.5 text-muted hover:text-foreground rounded-md hover:bg-zinc-800/60 transition disabled:opacity-50"
            aria-label="Refresh index data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading && !data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-card/40 border border-border/50 rounded-xl animate-pulse p-4" />
          ))}
        </div>
      )}

      {error && !data?.indices?.length && (
        <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 text-amber-300 text-sm flex items-center gap-2">
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
                    ? 'bg-zinc-900 border-emerald-500/40 shadow-lg shadow-emerald-500/5 ring-1 ring-emerald-500/20'
                    : 'bg-card/60 hover:bg-zinc-900/80 border-border hover:border-zinc-700'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-medium text-muted uppercase tracking-wider">
                      {idx.symbol === 'BANKNIFTY' ? 'NSE Index' : idx.symbol === 'SENSEX' ? 'BSE Index' : 'NSE Index'}
                    </span>
                    <h3 className="text-base font-bold text-foreground mt-0.5 group-hover:text-emerald-400 transition">
                      {idx.name}
                    </h3>
                  </div>
                  <div
                    className={`p-1.5 rounded-lg ${
                      isPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                    }`}
                  >
                    {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  </div>
                </div>

                <div className="mt-3 flex items-baseline justify-between">
                  <div className="text-xl font-extrabold text-foreground tracking-tight">
                    ₹{idx.value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div
                    className={`text-xs font-semibold flex items-center gap-1 ${
                      isPositive ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    <span>{isPositive ? '+' : ''}{changeVal.toFixed(2)}</span>
                    <span>({isPositive ? '+' : ''}{changePctVal.toFixed(2)}%)</span>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-border/40 flex items-center justify-between text-[11px] text-muted">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatISTTime(idx.timestamp)} IST
                  </span>
                  <span className="text-zinc-500 group-hover:text-zinc-400 transition">
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
