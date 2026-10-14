import type { HistoricalChartPoint } from "@/lib/services/marketData";

export const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);
export function validOHLC(point: HistoricalChartPoint) {
  return (
    [point.open, point.high, point.low, point.close].every(
      (value) => finite(value) && value > 0,
    ) &&
    point.low! <= Math.min(point.open!, point.close) &&
    point.high! >= Math.max(point.open!, point.close) &&
    point.low! <= point.high!
  );
}
export function volumeDirection(
  point: HistoricalChartPoint,
): "up" | "down" | "neutral" {
  if (!validOHLC(point) || point.close === point.open) return "neutral";
  return point.close > point.open! ? "up" : "down";
}
/** Keep actual observations only. Never interpolate prices, OHLC or volume. */
export function researchPoints(points: HistoricalChartPoint[]) {
  const byTime = new Map<number, HistoricalChartPoint>();
  for (const point of points)
    if (
      finite(point.timestamp) &&
      finite(point.close) &&
      point.close > 0 &&
      Number.isFinite(Date.parse(point.date))
    )
      byTime.set(point.timestamp, point);
  return [...byTime.values()].sort((a, b) => a.timestamp - b.timestamp);
}
export function sma(values: number[], period: number): Array<number | null> {
  if (!Number.isInteger(period) || period < 1)
    throw new Error("A positive integer period is required.");
  let sum = 0;
  return values.map((value, index) => {
    sum += value;
    if (index >= period) sum -= values[index - period];
    return index >= period - 1 ? sum / period : null;
  });
}
/** EMA is seeded with the first n-observation SMA; smoothing factor is 2/(n+1). */
export function ema(values: number[], period: number): Array<number | null> {
  if (!Number.isInteger(period) || period < 1)
    throw new Error("A positive integer period is required.");
  let previous: number | null = null;
  return values.map((value, index) => {
    if (index < period - 1) return null;
    previous =
      previous === null
        ? values.slice(0, period).reduce((sum, x) => sum + x, 0) / period
        : value * (2 / (period + 1)) + previous * (1 - 2 / (period + 1));
    return previous;
  });
}
/** Wilder RSI: 14 changes require 15 closes. A completely flat series is neutral (50). */
export function rsi(values: number[], period = 14): Array<number | null> {
  if (!Number.isInteger(period) || period < 1)
    throw new Error("A positive integer period is required.");
  let gain = 0,
    loss = 0;
  return values.map((value, index) => {
    if (!index) return null;
    const change = value - values[index - 1];
    if (index <= period) {
      gain += Math.max(0, change) / period;
      loss += Math.max(0, -change) / period;
    } else {
      gain = (gain * (period - 1) + Math.max(0, change)) / period;
      loss = (loss * (period - 1) + Math.max(0, -change)) / period;
    }
    if (index < period) return null;
    return loss === 0 ? (gain === 0 ? 50 : 100) : 100 - 100 / (1 + gain / loss);
  });
}
export function technicalStudy(
  input: HistoricalChartPoint[],
  interval: string,
) {
  const points = researchPoints(input),
    closes = points.map((point) => point.close),
    daily = interval === "1d";
  const indicators = {
    sma20: sma(closes, 20),
    sma50: sma(closes, 50),
    sma200: sma(closes, 200),
    ema20: ema(closes, 20),
    rsi14: rsi(closes),
  };
  const last = <T>(array: T[]) => array.at(-1) ?? null;
  const latest = {
    sma20: last(indicators.sma20),
    sma50: last(indicators.sma50),
    sma200: last(indicators.sma200),
    ema20: last(indicators.ema20),
    rsi14: last(indicators.rsi14),
  };
  const close = last(closes);
  const trend =
    !daily || !finite(close) || !finite(latest.sma50)
      ? "Insufficient data"
      : close > latest.sma20! && latest.sma20! > latest.sma50
        ? "Bullish indications"
        : close < latest.sma20! && latest.sma20! < latest.sma50
          ? "Bearish indications"
          : "Neutral / mixed";
  const window = points.slice(-20),
    completeRange = window.length === 20 && window.every(validOHLC);
  const support =
    daily && completeRange
      ? Math.min(...window.map((point) => point.low!))
      : null;
  const resistance =
    daily && completeRange
      ? Math.max(...window.map((point) => point.high!))
      : null;
  const dailyVolumes = window.filter(
    (point) => finite(point.volume) && point.volume! >= 0,
  );
  const avgVolume =
    daily && dailyVolumes.length === 20
      ? dailyVolumes.reduce((sum, point) => sum + point.volume!, 0) / 20
      : null;
  const lastVolume = points.at(-1)?.volume;
  const volumeRatio =
    finite(lastVolume) && finite(avgVolume) && avgVolume > 0
      ? lastVolume / avgVolume
      : null;
  const returns = closes
    .slice(-21)
    .slice(1)
    .map((value, i) => Math.log(value / closes.slice(-21)[i]));
  const mean =
    returns.reduce((sum, value) => sum + value, 0) / (returns.length || 1);
  const volatility =
    daily && returns.length === 20
      ? Math.sqrt(
          returns.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
            (returns.length - 1),
        ) *
        Math.sqrt(252) *
        100
      : null;
  const discontinuity = closes.some(
    (value, i) => i > 0 && Math.abs(value / closes[i - 1] - 1) > 0.25,
  );
  return {
    points,
    daily,
    indicators,
    latest,
    trend,
    support,
    resistance,
    avgVolume,
    volumeRatio,
    volatility,
    discontinuity,
    removedObservations: input.length - points.length,
  };
}
