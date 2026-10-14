"use client";
import { Activity, Info } from "lucide-react";
import type {
  HistoricalChartResponse,
  MarketQuote,
} from "@/lib/services/marketData";
import { finite, technicalStudy, validOHLC } from "@/lib/research/technicals";
import { PriceHistoryCanvas, compactVolume } from "./PriceHistoryCanvas";

const number = (value: number | null | undefined, suffix = "") =>
  finite(value)
    ? `${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}${suffix}`
    : "Insufficient data";
export function TechnicalResearch({
  history,
  quote,
  onDailyRange,
}: {
  history?: HistoricalChartResponse;
  quote: MarketQuote | null | undefined;
  onDailyRange: () => void;
}) {
  const study = technicalStudy(history?.points ?? [], history?.interval ?? "");
  const rows = [
    ["SMA 20", study.latest.sma20, "Average of 20 observed daily closes."],
    ["SMA 50", study.latest.sma50, "Average of 50 observed daily closes."],
    ["SMA 200", study.latest.sma200, "Average of 200 observed daily closes."],
    [
      "EMA 20",
      study.latest.ema20,
      "20-close SMA seed; smoothing factor 2 / 21.",
    ],
    [
      "RSI 14",
      study.latest.rsi14,
      "Wilder smoothing of gains and losses; needs at least 15 closes. Above 70 / below 30 describes stretched momentum, not a trade instruction.",
    ],
  ] as const;
  const completeOHLC = study.points.length > 0 && study.points.every(validOHLC);
  const rangeLow = completeOHLC
    ? Math.min(...study.points.map((point) => point.low!))
    : null;
  const rangeHigh = completeOHLC
    ? Math.max(...study.points.map((point) => point.high!))
    : null;
  const distance =
    finite(quote?.price) && finite(quote?.high_52w) && quote.high_52w > 0
      ? (quote.price / quote.high_52w - 1) * 100
      : null;
  return (
    <div className="space-y-5">
      <section className="research-card border-t-2 border-t-amber-500/60">
        <div className="flex flex-wrap justify-between gap-3">
          <div>
            <p className="research-eyebrow text-amber-700 dark:text-amber-400">
              DETERMINISTIC PRICE STUDIES
            </p>
            <h2 className="research-title flex gap-2 items-center">
              <Activity size={19} />
              Technicals
            </h2>
            <p className="text-xs text-muted mt-2">
              {study.points.length} actual observations ·{" "}
              {history?.interval || "interval unavailable"} ·{" "}
              {history?.range || "range unavailable"}
            </p>
          </div>
          <span className="rounded-xl px-4 py-2 text-sm self-start font-semibold border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300">
            {study.trend}
          </span>
        </div>
        {!study.daily && (
          <div className="mt-5 p-4 bg-surface-raised rounded-xl text-xs text-muted flex flex-wrap gap-3 items-center">
            <Info size={17} />
            <p>
              Daily trend and volatility require daily observations. Intraday,
              weekly and monthly intervals are not relabeled as daily.
            </p>
            <button
              type="button"
              className="research-button text-brand"
              onClick={onDailyRange}
            >
              Use 1Y daily history
            </button>
          </div>
        )}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mt-5">
          {rows.map(([label, value, note]) => (
            <div
              key={label}
              className="rounded-xl bg-surface-raised/40 border border-border p-4"
            >
              <h3 className="text-xs text-muted">{label}</h3>
              <p className="text-lg font-bold tabular-nums text-foreground mt-2">
                {study.daily ? number(value) : "Unavailable"}
              </p>
              <p className="text-[11px] leading-relaxed text-muted mt-2">
                {note}
              </p>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted mt-5">
          Trend rule: close &gt; SMA20 &gt; SMA50 gives bullish indications;
          close &lt; SMA20 &lt; SMA50 gives bearish indications; otherwise
          mixed. At least 50 daily closes are required. The latest daily
          observation can be incomplete during trading. These observations are
          not forecasts.
        </p>
        {(study.discontinuity || study.removedObservations > 0) && (
          <p
            role="status"
            className="text-xs text-amber-800 dark:text-amber-300 mt-3"
          >
            {study.discontinuity
              ? "A price jump larger than 25% exists in this series; corporate actions or missing observations may distort these studies. "
              : ""}
            {study.removedObservations > 0
              ? `${study.removedObservations} invalid or duplicate observations were excluded without interpolation.`
              : ""}
          </p>
        )}
      </section>
      <section className="research-card">
        <p className="research-eyebrow text-amber-700 dark:text-amber-400">
          RANGE & VOLATILITY CONTEXT
        </p>
        <h2 className="research-title">Potential levels, not guarantees</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
          {[
            [
              "Support estimate",
              study.support,
              "",
              "Lowest real low across the last 20 daily observations.",
            ],
            [
              "Resistance estimate",
              study.resistance,
              "",
              "Highest real high across the same 20 daily observations.",
            ],
            [
              "Annualized volatility",
              study.volatility,
              "%",
              "Sample standard deviation of the last 20 daily log returns × √252.",
            ],
            [
              "Distance from 52-week high",
              distance,
              "%",
              "Latest quote relative to the provider-reported 52-week high.",
            ],
            [
              "Selected-period low",
              rangeLow,
              "",
              "Requires valid low values for every selected observation.",
            ],
            [
              "Selected-period high",
              rangeHigh,
              "",
              "Requires valid high values for every selected observation.",
            ],
            [
              "Day low / high",
              null,
              "",
              `${number(quote?.dayLow)} / ${number(quote?.dayHigh)}`,
            ],
            [
              "52-week low / high",
              null,
              "",
              `${number(quote?.low_52w)} / ${number(quote?.high_52w)}`,
            ],
          ].map(([label, value, suffix, description]) => (
            <div
              key={String(label)}
              className="bg-surface-raised/30 border border-border rounded-xl p-4"
            >
              <p className="text-xs text-muted">{label}</p>
              <p className="text-base font-semibold text-foreground mt-2 tabular-nums">
                {String(label).includes(" / high")
                  ? String(description)
                  : number(value as number | null, String(suffix))}
              </p>
              {!String(label).includes(" / high") && (
                <p className="text-[11px] text-muted mt-2 leading-relaxed">
                  {description}
                </p>
              )}
            </div>
          ))}
        </div>
        <p className="text-[11px] text-muted mt-4">
          Extrema are lookback estimates and can be crossed. Volatility is
          historical price variability; provider corporate-action adjustment
          uncertainty applies.
        </p>
      </section>
      <section className="research-card border-t-2 border-t-teal-500/60">
        <p className="research-eyebrow text-teal-700 dark:text-teal-400">
          PARTICIPATION & TRADING ACTIVITY
        </p>
        <div className="flex flex-wrap justify-between items-start gap-3">
          <h2 className="research-title">Volume Research</h2>
          <span className="text-xs text-muted">
            20-observation average:{" "}
            {finite(study.avgVolume)
              ? compactVolume(study.avgVolume)
              : "Unavailable"}{" "}
            · latest / average: {number(study.volumeRatio, "×")}
          </span>
        </div>
        <div className="mt-4">
          <PriceHistoryCanvas
            points={history?.points ?? []}
            mode="candles"
            interval={history?.interval ?? ""}
            volumeOnly
          />
        </div>
        <p className="text-[11px] text-muted mt-4">
          Bars use the same timestamps as price observations. Direction compares
          genuine close with open; missing or inconsistent OHLC stays grey.
          Latest session volume may be incomplete.
        </p>
      </section>
    </div>
  );
}
