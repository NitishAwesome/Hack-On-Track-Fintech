"use client";
import "./research.css";
import { useState } from "react";
import {
  Activity,
  CandlestickChart,
  ChartLine,
  Maximize2,
  RefreshCw,
} from "lucide-react";
import { Modal } from "@/components/shared/Modal";
import type { ChartRange } from "@/lib/services/marketData";
import { useInstrumentHistory } from "@/lib/hooks/useInstrumentHistory";
import { researchPoints, validOHLC } from "@/lib/research/technicals";
import {
  PriceHistoryCanvas,
  type ChartMode,
  type Overlay,
} from "./PriceHistoryCanvas";

export const RESEARCH_RANGES: ChartRange[] = [
  "1D",
  "1W",
  "1M",
  "3M",
  "1Y",
  "5Y",
  "MAX",
];
export function InteractiveStockChart({
  symbol,
  exchange = "NSE",
  companyName,
  defaultRange = "1Y",
  onRangeChange,
  range: controlledRange,
  workspace = false,
}: {
  symbol: string;
  exchange?: string;
  companyName?: string;
  defaultRange?: ChartRange;
  onRangeChange?: (range: ChartRange) => void;
  range?: ChartRange;
  workspace?: boolean;
}) {
  const [localRange, setLocalRange] = useState<ChartRange>(defaultRange),
    [mode, setMode] = useState<ChartMode>(workspace ? "candles" : "area");
  const [expanded, setExpanded] = useState(false),
    [overlays, setOverlays] = useState<Overlay[]>([]);
  const [forcing, setForcing] = useState(false),
    [refreshError, setRefreshError] = useState<{
      range: ChartRange;
      message: string;
    } | null>(null);
  const range = controlledRange ?? localRange;
  const query = useInstrumentHistory(symbol, exchange, range),
    data = query.data;
  const points = researchPoints(data?.points ?? []),
    candleCount = points.filter(validOHLC).length;
  const effectiveMode = mode === "candles" && !candleCount ? "area" : mode;
  const units = exchange === "INDEX" ? "pts" : (data?.currency ?? "INR");
  const chooseRange = (next: ChartRange) => {
    setLocalRange(next);
    onRangeChange?.(next);
  };
  const toggleOverlay = (next: Overlay) =>
    setOverlays((previous) =>
      previous.includes(next)
        ? previous.filter((item) => item !== next)
        : [...previous, next],
    );
  const refresh = async () => {
    setForcing(true);
    setRefreshError(null);
    try {
      await query.refreshNow();
    } catch (error) {
      setRefreshError({
        range,
        message:
          error instanceof Error ? error.message : "Refresh unavailable.",
      });
    } finally {
      setForcing(false);
    }
  };
  const chart = (
    <PriceHistoryCanvas
      key={`${symbol}-${range}`}
      points={data?.points ?? []}
      mode={effectiveMode}
      interval={data?.interval ?? ""}
      overlays={overlays}
    />
  );
  return (
    <section
      className="research-card border-t-2 border-t-cyan-500/60"
      aria-label="Historical price workspace"
    >
      <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-4 mb-4">
        <div>
          <p className="research-eyebrow text-cyan-700 dark:text-cyan-400">
            MARKET HISTORY · {units}
          </p>
          <h2 className="research-title">Price Chart</h2>
          <p className="text-xs text-muted mt-1">
            {companyName || symbol} · {range} ·{" "}
            {data?.interval || "provider interval"}
            {data?.periodChangePercent != null && (
              <strong
                className={`ml-2 tabular-nums ${data.periodChangePercent > 0 ? "text-emerald-700 dark:text-emerald-400" : data.periodChangePercent < 0 ? "text-rose-700 dark:text-rose-400" : "text-muted"}`}
              >
                {data.periodChangePercent > 0 ? "+" : ""}
                {data.periodChangePercent.toFixed(2)}% price change
              </strong>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="flex items-center gap-0.5 rounded-xl bg-surface-raised border border-border p-1"
            aria-label="Chart range"
          >
            {RESEARCH_RANGES.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={value === range}
                onClick={() => chooseRange(value)}
                className={`min-h-9 min-w-9 px-2 text-xs font-semibold rounded-lg ${value === range ? "bg-blue-600 text-white shadow-sm" : "text-muted hover:text-foreground hover:bg-surface"}`}
              >
                {value}
              </button>
            ))}
          </div>
          <div className="flex items-center rounded-xl border border-border bg-surface-raised p-1">
            {(
              [
                { value: "area", icon: Activity, label: "Area chart" },
                { value: "line", icon: ChartLine, label: "Line chart" },
                {
                  value: "candles",
                  icon: CandlestickChart,
                  label: "Candlestick chart",
                },
              ] as const
            ).map(({ value, icon: Icon, label }) => (
              <button
                key={value}
                type="button"
                disabled={value === "candles" && !candleCount}
                aria-label={label}
                aria-pressed={effectiveMode === value}
                title={
                  value === "candles" && !candleCount
                    ? "Genuine OHLC data unavailable"
                    : label
                }
                onClick={() => setMode(value)}
                className={`research-icon-button ${effectiveMode === value ? "bg-blue-600/15 text-blue-700 dark:text-cyan-400" : ""}`}
              >
                <Icon size={17} />
              </button>
            ))}
          </div>
          <button
            type="button"
            className="research-icon-button"
            aria-label="Expand price chart"
            onClick={() => setExpanded(true)}
          >
            <Maximize2 size={17} />
          </button>
          <button
            type="button"
            className="research-icon-button"
            aria-label="Refresh historical chart"
            disabled={query.isFetching || forcing}
            onClick={refresh}
          >
            <RefreshCw
              size={17}
              className={query.isFetching || forcing ? "animate-spin" : ""}
            />
          </button>
        </div>
      </div>
      {workspace && (
        <div className="flex flex-wrap gap-2 mb-4 text-xs">
          {(["sma20", "sma50", "sma200", "ema20"] as Overlay[]).map(
            (overlay) => (
              <label
                key={overlay}
                className="flex items-center gap-2 px-3 min-h-10 rounded-lg border border-border bg-surface-raised cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={overlays.includes(overlay)}
                  onChange={() => toggleOverlay(overlay)}
                  className="accent-blue-600"
                />
                {overlay.toUpperCase()}
              </label>
            ),
          )}
          <span className="self-center text-muted">
            Indicators use {data?.interval || "provider"} observation periods,
            not calendar days.
          </span>
        </div>
      )}
      {query.isLoading ? (
        <div
          role="status"
          className="h-80 flex items-center justify-center text-sm text-muted animate-pulse"
        >
          Loading provider OHLCV history…
        </div>
      ) : query.isError ? (
        <div role="alert" className="py-20 text-center space-y-3">
          <p className="text-sm text-muted">{query.error.message}</p>
          <button
            type="button"
            className="research-button"
            onClick={() => query.refetch()}
          >
            Retry price history
          </button>
        </div>
      ) : points.length ? (
        chart
      ) : (
        <p className="py-20 text-center text-sm text-muted">
          No historical observations are available for this instrument and
          range.
        </p>
      )}
      {refreshError?.range === range && (
        <p role="alert" className="text-xs text-amber-700 dark:text-amber-400">
          Refresh failed: {refreshError.message}
          {data
            ? " Previously retrieved history and its original timestamps remain displayed."
            : ""}
        </p>
      )}
      {data && (
        <div className="mt-4 text-[11px] text-muted border-t border-border pt-3 space-y-1.5">
          <p>
            {data.source} · Quote{" "}
            {data.quoteTimestamp
              ? new Date(data.quoteTimestamp).toLocaleString("en-IN", {
                  timeZone: "Asia/Kolkata",
                }) + " IST"
              : "time unavailable"}{" "}
            · Retrieved{" "}
            {data.retrievedAt
              ? new Date(data.retrievedAt).toLocaleString("en-IN", {
                  timeZone: "Asia/Kolkata",
                }) + " IST"
              : "time unavailable"}
          </p>
          <p>
            {data.priceBasis ||
              "Provider price history; corporate-action adjustments are not independently reconciled."}{" "}
            Selected-period price performance excludes distributions.
          </p>
          {candleCount < points.length && (
            <p>
              {candleCount === 0
                ? "Candlestick mode is unavailable because genuine OHLC records are missing."
                : `${points.length - candleCount} observations lack consistent OHLC; candle gaps are preserved.`}{" "}
              Missing volume or candle direction is never reconstructed.
            </p>
          )}
        </div>
      )}
      <Modal
        open={expanded}
        onClose={() => setExpanded(false)}
        size="xl"
        title={`${symbol} · ${range} Price Chart`}
        description={`Genuine ${data?.interval || ""} observations · ${units}. Arrow keys inspect; use zoom controls and the timeline slider to pan.`}
      >
        {chart}
      </Modal>
    </section>
  );
}
