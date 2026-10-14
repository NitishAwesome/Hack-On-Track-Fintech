'use client';

import React from 'react';
import { MarketSparkline } from '@/components/shared/MarketSparkline';
import { TrendingUp, TrendingDown, RefreshCw, AlertCircle } from 'lucide-react';
import type { MarketIndex } from '@/types/market';
import { cn } from '@/lib/utils';

import { useSharedMarketIndices } from '@/lib/market/sharedMarketStore';

interface MarketStripProps {
  className?: string;
  showDisclosure?: boolean;
}

interface ExpectedIndexConfig {
  symbol: string;
  displayName: string;
  fallbackExchange: string;
}

const EXPECTED_INDICES: ExpectedIndexConfig[] = [
  { symbol: 'NIFTY50', displayName: 'Nifty 50', fallbackExchange: 'NSE' },
  { symbol: 'SENSEX', displayName: 'Sensex', fallbackExchange: 'BSE' },
  { symbol: 'BANKNIFTY', displayName: 'Bank Nifty', fallbackExchange: 'NSE' },
];

export function MarketStrip({ className }: MarketStripProps) {
  const {
    data,
    loading,
    isRefreshing: refreshing,
    marketStatus,
    error,
    refreshNow: fetchQuotes,
  } = useSharedMarketIndices();

  const isMarketOpen = marketStatus === 'OPEN';
  const isPreOpen = marketStatus === 'PRE_OPEN';

  // Format timestamp concisely based on actual data
  const formattedTime = data?.lastUpdated
    ? new Date(data.lastUpdated).toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    : null;

  return (
    <div
      className={cn(
        'w-full border-b select-none transition-colors duration-200 z-10',
        className
      )}
      style={{
        backgroundColor: 'rgb(var(--surface) / 0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderColor: 'rgb(var(--border))',
      }}
    >
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-2 sm:py-2.5">
        <div className="flex items-center justify-between gap-3 sm:gap-4">
          {/* Main Horizontal Market Items Container */}
          <div className="flex-1 min-w-0">
            {/* 1. Loading Skeleton (exact same height to prevent layout shift) */}
            {loading && (
              <div
                className="flex items-center gap-2.5 sm:gap-3.5 overflow-x-auto no-scrollbar py-0.5"
                role="status"
                aria-label="Loading market indices"
              >
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="flex-1 min-w-[240px] sm:min-w-[300px] px-3.5 sm:px-4 py-2 rounded-xl border border-border bg-surface-raised/50 animate-pulse flex items-center justify-between"
                  >
                    <div className="space-y-1.5">
                      <div className="h-2.5 w-14 bg-muted/20 rounded" />
                      <div className="h-4 w-20 bg-muted/20 rounded" />
                    </div>
                    <div className="space-y-1 items-end flex flex-col">
                      <div className="h-3 w-14 bg-muted/20 rounded" />
                      <div className="h-2.5 w-10 bg-muted/20 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 2. Success State: Real Market Items in a single horizontal row on desktop, swipeable on mobile */}
            {!loading && data && data.success && data.indices.length > 0 && (
              <div className="flex items-center gap-2.5 sm:gap-3.5 overflow-x-auto no-scrollbar py-0.5 scroll-smooth">
                {EXPECTED_INDICES.map((cfg) => {
                  const idx = data.indices.find(
                    (item: MarketIndex) => item.symbol.toUpperCase() === cfg.symbol.toUpperCase()
                  );

                  // If an individual index is unavailable while others are present
                  if (!idx) {
                    return (
                      <div
                        key={cfg.symbol}
                        className="flex-1 min-w-[240px] sm:min-w-[300px] px-3.5 sm:px-4 py-2 rounded-xl border transition-colors flex items-center justify-between gap-2.5 flex-shrink-0"
                        style={{
                          backgroundColor: 'rgb(var(--surface-raised) / 0.35)',
                          borderColor: 'rgb(var(--border))',
                        }}
                      >
                        <div className="min-w-0 flex flex-col justify-center">
                          <span className="text-[11px] font-semibold text-muted truncate">
                            {cfg.displayName}
                          </span>
                          <span className="text-xs font-medium text-muted/70 italic">
                            Syncing...
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-muted">
                          <AlertCircle className="w-3 h-3 text-muted/60" />
                          <span>Unavailable</span>
                        </div>
                      </div>
                    );
                  }

                  const hasChange =
                    idx.change !== null &&
                    idx.changePercent !== null &&
                    typeof idx.change === 'number' &&
                    typeof idx.changePercent === 'number';
                  const isZero = hasChange && idx.change === 0;
                  const isPositive = hasChange && idx.change! > 0;
                  const isNegative = hasChange && idx.change! < 0;
                  const TrendIcon = isPositive ? TrendingUp : TrendingDown;

                  return (
                    <div
                      key={idx.symbol}
                      title={`${idx.source} · Quote ${new Date(idx.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST`}
                      className="flex-1 min-w-[240px] sm:min-w-[300px] px-3.5 sm:px-4 py-2 rounded-xl border transition-all hover:border-brand/40 group flex items-center justify-between gap-3 flex-shrink-0 bg-surface shadow-xs"
                      style={{
                        borderColor: 'rgb(var(--border))',
                      }}
                    >
                      {/* Left: Flag Roundel + Name + Price */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Indian Flag Circular Roundel */}
                        <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 border border-slate-700/30 flex flex-col shadow-xs" title="Indian Market Benchmark">
                          <div className="h-2 w-full bg-[#FF9933]" />
                          <div className="h-2 w-full bg-[#FFFFFF] flex items-center justify-center">
                            <div className="w-1.5 h-1.5 rounded-full border border-[#000080]" />
                          </div>
                          <div className="h-2 w-full bg-[#128807]" />
                        </div>

                        <div className="min-w-0 flex flex-col justify-center">
                          <span className="text-[11px] font-semibold text-muted tracking-tight truncate">
                            {cfg.displayName}
                          </span>
                          <span className="text-sm sm:text-base font-extrabold tracking-tight text-foreground tabular-nums leading-tight">
                            {idx.value.toLocaleString('en-IN', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Middle: Real Mini Price Chart Sparkline */}
                      <div className="hidden sm:block w-14 h-7 shrink-0 opacity-85 group-hover:opacity-100 transition-opacity">
                        <MarketSparkline symbol={idx.symbol} range="1W" showLabel={false} unit="pts" tooltipSide="bottom" className="w-full h-full" />
                      </div>

                      {/* Right: Absolute & Percentage Change */}
                      <div className="flex flex-col items-end justify-center text-right flex-shrink-0">
                        {hasChange ? (
                          <>
                            <span
                              className={cn(
                                'text-xs font-bold tabular-nums flex items-center gap-0.5 leading-tight',
                                isPositive ? 'text-gain' : isNegative ? 'text-loss' : 'text-muted'
                              )}
                            >
                              {!isZero && <TrendIcon className="w-3 h-3 flex-shrink-0" />}
                              <span>
                                {isPositive ? '+' : ''}
                                {idx.change!.toFixed(2)}
                              </span>
                            </span>
                            <span
                              className={cn(
                                'text-[10px] sm:text-[11px] font-semibold tabular-nums leading-tight',
                                isPositive ? 'text-gain' : isNegative ? 'text-loss' : 'text-muted'
                              )}
                            >
                              ({isPositive ? '+' : ''}
                              {idx.changePercent!.toFixed(2)}%)
                            </span>
                          </>
                        ) : (
                          <span className="text-[11px] text-muted font-medium italic">
                            Change unavailable
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 3. Unavailable State (Zero fake values) */}
            {!loading && (!data || !data.success || data.indices.length === 0) && (
              <div className="flex items-center justify-between px-3.5 py-2 rounded-xl border border-border bg-surface-raised/40 text-xs text-muted w-full">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted" />
                  <span className="font-semibold text-foreground">
                    Market data temporarily unavailable
                  </span>
                  <span className="hidden sm:inline text-[11px] text-muted">
                    · Connecting to market feed
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => fetchQuotes()}
                  className="text-xs font-semibold text-brand hover:underline ml-2"
                >
                  Retry
                </button>
              </div>
            )}

            {/* 4. Error State */}
            {error && !loading && (
              <div className="flex items-center justify-between px-3.5 py-2 rounded-xl border border-loss/20 bg-loss-bg/20 text-xs text-loss w-full">
                <span>{error}</span>
                <button
                  type="button"
                  onClick={() => fetchQuotes()}
                  className="font-semibold underline hover:no-underline ml-2"
                >
                  Retry
                </button>
              </div>
            )}
          </div>

          {/* Right Status Meta & Refresh Control (Desktop & Tablet) */}
          <div className="hidden md:flex items-center gap-3 pl-3 flex-shrink-0 text-[11px] text-muted border-l border-border/80">
            {/* Non-animated subtle dot & status text */}
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  'w-1.5 h-1.5 rounded-full',
                  isMarketOpen ? 'bg-emerald-500' : isPreOpen ? 'bg-amber-500' : 'bg-muted'
                )}
              />
              <span className="font-medium text-foreground/80">
                {isMarketOpen
                  ? 'Usual trading hours*'
                  : isPreOpen
                  ? 'Usual pre-open hours*'
                  : 'Outside usual hours*'}
              </span>
            </div>

            {/* Accurate Timestamp & wording */}
            {formattedTime && (
              <span className="text-[10px] opacity-75">
                {`Retrieved ${formattedTime} · *Calendar estimate`}
              </span>
            )}


            {/* Compact Refresh Button */}
            <button
              type="button"
              onClick={() => fetchQuotes()}
              disabled={loading || refreshing}
              className="p-1 rounded hover:bg-surface-raised text-muted hover:text-foreground transition-colors disabled:opacity-50"
              title="Refresh quotes"
              aria-label="Refresh market quotes"
            >
              <RefreshCw className={cn('w-3 h-3', (loading || refreshing) && 'animate-spin')} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MarketStrip;
