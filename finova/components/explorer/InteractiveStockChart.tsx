'use client';

import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import type { HistoricalChartResponse, HistoricalChartPoint, ChartRange } from '@/lib/services/marketData';
import { TrendingUp, TrendingDown, Clock, ShieldCheck, RefreshCw, AlertCircle } from 'lucide-react';

interface InteractiveStockChartProps {
  symbol: string;
  exchange?: string;
  companyName?: string;
  defaultRange?: ChartRange;
  onRangeChange?: (range: ChartRange) => void;
}

const RANGES: { label: ChartRange; tooltip: string }[] = [
  { label: '1D', tooltip: '1 Day Intraday (5m intervals)' },
  { label: '1W', tooltip: '1 Week (15m intervals)' },
  { label: '1M', tooltip: '1 Month (Daily Close)' },
  { label: '3M', tooltip: '3 Months (Daily Close)' },
  { label: '1Y', tooltip: '1 Year (Daily Close)' },
  { label: '5Y', tooltip: '5 Years (Weekly Points)' },
  { label: 'MAX', tooltip: 'Maximum History (Monthly Points)' },
];

interface TooltipPayloadItem {
  payload: HistoricalChartPoint;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  currencySymbol?: string;
  firstPrice?: number;
}

function CustomTooltip({ active, payload, currencySymbol = '₹', firstPrice }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;
  const point = payload[0].payload;
  const price = point.close;
  const basePrice = firstPrice ?? price;
  const diff = Number((price - basePrice).toFixed(2));
  const diffPct = basePrice > 0 ? Number(((diff / basePrice) * 100).toFixed(2)) : 0;
  const isPointPositive = diff >= 0;

  const formattedDate = (() => {
    try {
      const d = new Date(point.date);
      return new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }).format(d);
    } catch {
      return point.date;
    }
  })();

  return (
    <div className="bg-surface border border-border p-3 rounded-xl shadow-xl backdrop-blur-md text-xs">
      <div className="text-muted font-medium">{formattedDate} IST</div>
      <div className="text-base font-extrabold text-foreground mt-1">
        {currencySymbol}
        {price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>
      <div
        className={`flex items-center gap-1 font-semibold mt-0.5 ${
          isPointPositive ? 'text-emerald-400' : 'text-rose-400'
        }`}
      >
        <span>
          {isPointPositive ? '+' : ''}
          {currencySymbol}
          {diff.toFixed(2)}
        </span>
        <span>
          ({isPointPositive ? '+' : ''}
          {diffPct.toFixed(2)}%)
        </span>
        <span className="text-zinc-500 font-normal">from period start</span>
      </div>
    </div>
  );
}

export function InteractiveStockChart({
  symbol,
  exchange = 'NSE',
  companyName,
  defaultRange = '1M',
  onRangeChange,
}: InteractiveStockChartProps) {
  const [range, setRange] = useState<ChartRange>(defaultRange);
  const [chartData, setChartData] = useState<HistoricalChartResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function executeFetch() {
      try {
        const url = `/api/market/history?symbol=${encodeURIComponent(symbol)}&exchange=${encodeURIComponent(
          exchange
        )}&range=${range}`;

        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) {
          throw new Error(`Historical chart unavailable for ${symbol} (${range})`);
        }
        const data: HistoricalChartResponse = await res.json();
        if (isMounted) {
          setChartData(data);
          setError(null);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted && !controller.signal.aborted) {
          setError(err instanceof Error ? err.message : 'Failed to retrieve historical price series');
          setLoading(false);
        }
      }
    }

    if (symbol) {
      executeFetch();
    }

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [symbol, range, exchange]);

  const handleRangeClick = (newRange: ChartRange) => {
    setLoading(true);
    setRange(newRange);
    if (onRangeChange) onRangeChange(newRange);
  };

  const handleManualRefresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/market/history?symbol=${encodeURIComponent(symbol)}&exchange=${encodeURIComponent(
        exchange
      )}&range=${range}&force=true`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Historical chart unavailable for ${symbol} (${range})`);
      }
      const data: HistoricalChartResponse = await res.json();
      setChartData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to retrieve historical price series');
    } finally {
      setLoading(false);
    }
  };

  // Color calculation: green if period change >= 0, red if < 0, neutral if null
  const periodReturn = chartData?.periodChange ?? 0;
  const isPositive = periodReturn >= 0;
  const strokeColor = periodReturn === 0 ? '#9ca3af' : isPositive ? '#10b981' : '#f43f5e';
  const gradientId = `chartGradient_${symbol.replace(/[^a-zA-Z0-9]/g, '')}_${range}`;

  // Currency symbol
  const currencySymbol = chartData?.currency === 'USD' ? '$' : '₹';

  // Format date for XAxis
  const formatXAxis = (isoDate: string) => {
    try {
      const d = new Date(isoDate);
      if (range === '1D') {
        return new Intl.DateTimeFormat('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }).format(d);
      }
      if (range === '1W' || range === '1M' || range === '3M') {
        return new Intl.DateTimeFormat('en-IN', {
          timeZone: 'Asia/Kolkata',
          day: 'numeric',
          month: 'short',
        }).format(d);
      }
      return new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        month: 'short',
        year: '2-digit',
      }).format(d);
    } catch {
      return '';
    }
  };

  // Min and max for domain
  const prices = chartData?.points?.map((p) => p.close) || [];
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;
  const padding = (maxPrice - minPrice) * 0.05 || 1;
  const yDomain = [Math.max(0, Math.floor(minPrice - padding)), Math.ceil(maxPrice + padding)];

  return (
    <div className="bg-card/70 border border-border/70 rounded-2xl p-5 backdrop-blur-sm space-y-4">
      {/* Chart Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold text-foreground tracking-tight">
              {symbol}
            </h3>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700">
              {exchange}
            </span>
            {companyName && (
              <span className="text-xs text-muted truncate max-w-[200px] md:max-w-[320px]">
                {companyName}
              </span>
            )}
          </div>

          {chartData && (
            <div className="flex items-baseline gap-3 mt-1.5">
              <span className="text-2xl font-black text-foreground tracking-tight">
                {currencySymbol}
                {chartData.currentPrice.toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
              <div
                className={`text-xs font-semibold flex items-center gap-1 ${
                  isPositive ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                <span>
                  {isPositive ? '+' : ''}
                  {currencySymbol}
                  {chartData.periodChange?.toFixed(2)}
                </span>
                <span>
                  ({isPositive ? '+' : ''}
                  {chartData.periodChangePercent?.toFixed(2)}%)
                </span>
                <span className="text-muted font-normal">({range})</span>
              </div>
            </div>
          )}
        </div>

        {/* Range Selector Controls */}
        <div className="flex items-center gap-1 bg-surface-raised border border-border p-1 rounded-xl self-start sm:self-auto overflow-x-auto">
          {RANGES.map(({ label, tooltip }) => {
            const isActive = range === label;
            return (
              <button
                key={label}
                type="button"
                onClick={() => handleRangeClick(label)}
                title={tooltip}
                disabled={loading}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-surface text-emerald-500 shadow-sm border border-border'
                    : 'text-muted hover:text-foreground hover:bg-surface/50'
                }`}
              >
                {label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={loading}
            title="Refresh historical series"
            className="p-1.5 text-muted hover:text-foreground rounded-md hover:bg-zinc-800 transition disabled:opacity-50"
            aria-label="Refresh price chart"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Chart Canvas */}
      <div className="relative h-72 sm:h-80 w-full">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-card/60 backdrop-blur-sm rounded-xl">
            <div className="flex items-center gap-2 text-xs font-medium text-muted">
              <span className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
              Loading {range} price series...
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-card/90 rounded-xl p-4 text-center">
            <AlertCircle className="w-6 h-6 text-amber-400 mb-2" />
            <div className="text-sm font-semibold text-foreground">Chart Unavailable</div>
            <div className="text-xs text-muted max-w-sm mt-1">{error}</div>
            <button
              onClick={handleManualRefresh}
              className="mt-3 px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-foreground border border-zinc-700 transition"
            >
              Retry
            </button>
          </div>
        )}

        {chartData && chartData.points.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData.points} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={strokeColor} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={strokeColor} stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tickFormatter={formatXAxis}
                tickLine={false}
                axisLine={{ stroke: '#27272a' }}
                tick={{ fill: '#71717a', fontSize: 11 }}
                minTickGap={40}
              />
              <YAxis
                domain={yDomain}
                orientation="right"
                tickLine={false}
                axisLine={{ stroke: '#27272a' }}
                tick={{ fill: '#71717a', fontSize: 11 }}
                tickFormatter={(v) => `${currencySymbol}${v.toLocaleString('en-IN')}`}
                width={65}
              />
              <Tooltip
                content={
                  <CustomTooltip
                    currencySymbol={currencySymbol}
                    firstPrice={chartData.points[0]?.close}
                  />
                }
              />
              <Area
                type="monotone"
                dataKey="close"
                stroke={strokeColor}
                strokeWidth={2}
                fillOpacity={1}
                fill={`url(#${gradientId})`}
                isAnimationActive={true}
                animationDuration={600}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : !loading && !error ? (
          <div className="h-full flex items-center justify-center text-xs text-muted">
            No historical data points returned for this instrument.
          </div>
        ) : null}
      </div>

      {/* Chart Footer / Provenance Disclosures */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-[11px] text-muted pt-2 border-t border-border/40 gap-1.5">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            {chartData?.source || 'Yahoo Finance / yfinance'}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {range === '1D' ? 'Intraday Feed (~15m delayed)' : 'EOD Historical Series'}
          </span>
        </div>
        <div className="text-zinc-500">
          Showing {chartData?.points.length || 0} points · Range: {range} · Interval: {chartData?.interval || '—'}
        </div>
      </div>
    </div>
  );
}
