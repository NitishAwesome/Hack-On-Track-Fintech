'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { MarketQuote } from '@/lib/services/marketData';

export interface UseAutoQuotePollerOptions {
  symbols: string[];
  exchange?: string;
  enabled?: boolean;
  intervalMs?: number; // default 2500ms (2–3 seconds)
}

export interface AutoQuotePollerResult {
  quotes: Record<string, MarketQuote | null>;
  isRefreshing: boolean;
  lastUpdated: Date | null;
  secondsSinceUpdate: number;
  marketOpen: boolean;
  marketStatus: string;
  freshnessLabel: string;
  error: string | null;
  refreshNow: () => Promise<void>;
}

/**
 * Determines whether the Indian stock market (NSE/BSE) is currently in active trading hours.
 * Regular trading: Monday–Friday, 09:15 AM to 03:30 PM IST.
 */
export function isIndianMarketOpenNow(date = new Date()): boolean {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      hour12: false,
      weekday: 'short',
      hour: 'numeric',
      minute: 'numeric',
    }).formatToParts(date);

    const weekday = parts.find((p) => p.type === 'weekday')?.value || '';
    const hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
    const minute = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);

    if (weekday === 'Sat' || weekday === 'Sun') {
      return false;
    }

    const totalMinutes = hour * 60 + minute;
    // 09:15 IST = 555 mins, 15:30 IST = 930 mins
    return totalMinutes >= 555 && totalMinutes < 930;
  } catch {
    return false;
  }
}

/**
 * Lightweight, adaptive quote polling hook.
 * - Auto-refreshes quotes every 2–3 seconds (default 2500ms) when market is open and tab is active.
 * - When Indian market is CLOSED, stops frequent polling completely and shows latest available/previous-close with timestamp.
 * - Pauses polling completely when tab is hidden (document.visibilityState === 'hidden').
 * - Graceful exponential backoff if provider returns rate limits or errors.
 * - Prevents overlapping requests (in-flight request deduplication).
 * - Never blanks existing values on transient refresh or network errors.
 */
export function useAutoQuotePoller({
  symbols,
  exchange = 'NSE',
  enabled = true,
  intervalMs = 2500,
}: UseAutoQuotePollerOptions): AutoQuotePollerResult {
  const [quotes, setQuotes] = useState<Record<string, MarketQuote | null>>({});
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [secondsSinceUpdate, setSecondsSinceUpdate] = useState<number>(0);
  const [serverMarketStatus, setServerMarketStatus] = useState<string>(
    isIndianMarketOpenNow() ? 'OPEN' : 'CLOSED'
  );
  const [error, setError] = useState<string | null>(null);

  const inFlightRef = useRef<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const backoffCountRef = useRef<number>(0);
  const activeSymbolsKey = symbols.filter(Boolean).sort().join(',');

  const marketOpen = isIndianMarketOpenNow() && serverMarketStatus !== 'CLOSED';

  const fetchQuotes = useCallback(
    async (isManual = false) => {
      if (!symbols || symbols.length === 0) return;
      if (inFlightRef.current) return; // Prevent overlapping requests

      inFlightRef.current = true;
      setIsRefreshing(true);

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const querySymbols = symbols.map((s) => s.trim().toUpperCase()).join(',');
        const url = `/api/market/quotes?symbols=${encodeURIComponent(querySymbols)}&exchange=${encodeURIComponent(
          exchange
        )}${isManual ? '&force=true' : ''}`;

        const res = await fetch(url, {
          signal: controller.signal,
          headers: {
            'Cache-Control': 'no-store',
          },
        });

        if (!res.ok) {
          throw new Error(`Market quotes response status: ${res.status}`);
        }

        const data = await res.json();
        if (data.quotes && typeof data.quotes === 'object') {
          // Atomically update prices, day change, % change, timestamp & market status together
          setQuotes((prev) => ({
            ...prev,
            ...data.quotes,
          }));
          const now = new Date();
          setLastUpdated(now);
          setSecondsSinceUpdate(0);
          if (data.marketStatus) {
            setServerMarketStatus(data.marketStatus);
          }
          setError(null);
          backoffCountRef.current = 0; // Reset error backoff
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          // Normal abort on unmount/re-trigger
          return;
        }
        // Exponential backoff counter on error or rate limits (2.5s -> 5s -> 10s -> 20s -> 30s)
        backoffCountRef.current = Math.min(backoffCountRef.current + 1, 4);
        setError(err instanceof Error ? err.message : 'Market data refresh delayed');
        // Do NOT blank quotes on error: keep previous price visible
      } finally {
        inFlightRef.current = false;
        setIsRefreshing(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeSymbolsKey, exchange]
  );

  // Initial fetch and symbol change
  useEffect(() => {
    if (!enabled || symbols.length === 0) return;
    const timer = setTimeout(() => {
      void fetchQuotes(false);
    }, 0);

    return () => {
      clearTimeout(timer);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [enabled, activeSymbolsKey, fetchQuotes, symbols.length]);

  // Periodic polling timer with adaptive behavior
  useEffect(() => {
    if (!enabled || symbols.length === 0) return;

    let timerId: NodeJS.Timeout | null = null;

    const scheduleNext = () => {
      // Clear any prior timer to prevent duplicate intervals
      if (timerId) {
        clearTimeout(timerId);
        timerId = null;
      }

      // 1. If document is hidden, pause polling completely
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return;
      }

      // 2. When Indian market is CLOSED, stop frequent polling completely!
      if (!isIndianMarketOpenNow()) {
        return;
      }

      // 3. When Indian market is OPEN: auto-refresh every 2–3s with exponential backoff on error
      let nextDelay = intervalMs;
      if (backoffCountRef.current > 0) {
        nextDelay = Math.min(intervalMs * Math.pow(2, backoffCountRef.current), 30000);
      }

      timerId = setTimeout(async () => {
        if (
          typeof document !== 'undefined' &&
          document.visibilityState === 'visible' &&
          isIndianMarketOpenNow()
        ) {
          await fetchQuotes(false);
        }
        if (isIndianMarketOpenNow()) {
          scheduleNext();
        }
      }, nextDelay);
    };

    scheduleNext();

    const handleVisibilityChange = () => {
      if (timerId) {
        clearTimeout(timerId);
        timerId = null;
      }

      if (document.visibilityState === 'visible') {
        // Tab brought to foreground: immediately trigger fresh quotes
        void fetchQuotes(false);
        if (isIndianMarketOpenNow()) {
          scheduleNext();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (timerId) {
        clearTimeout(timerId);
        timerId = null;
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [enabled, activeSymbolsKey, intervalMs, fetchQuotes, symbols.length]);

  // Elapsed seconds ticker for dynamic "Updated Xs ago" display
  useEffect(() => {
    if (!lastUpdated) return;

    const tickInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - lastUpdated.getTime()) / 1000);
      setSecondsSinceUpdate(elapsed);
    }, 1000);

    return () => clearInterval(tickInterval);
  }, [lastUpdated]);

  // Build honest, non-exaggerated freshness label: Auto-updating (2–3s) when market open (NO countdowns)
  let freshnessLabel = 'Latest available';
  if (!marketOpen) {
    freshnessLabel = 'Market Closed — Previous Close';
  } else if (isRefreshing) {
    freshnessLabel = 'Updating…';
  } else if (lastUpdated) {
    freshnessLabel = 'Updated just now';
  }

  return {
    quotes,
    isRefreshing,
    lastUpdated,
    secondsSinceUpdate,
    marketOpen,
    marketStatus: serverMarketStatus,
    freshnessLabel,
    error,
    refreshNow: () => fetchQuotes(true),
  };
}
