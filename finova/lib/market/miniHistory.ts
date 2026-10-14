import type { HistoricalChartPoint, HistoricalChartResponse } from './providers/yfinanceProvider';

/** Keep observed prices only, in date order. Never interpolate missing/future samples. */
export function observedPoints(points: HistoricalChartPoint[], asOf = Date.now()) {
  const byTime = new Map<number, HistoricalChartPoint>();
  for (const point of points) {
    const time = Date.parse(point.date);
    if (Number.isFinite(time) && time <= asOf && Number.isFinite(point.close) && point.close > 0)
      byTime.set(time, { ...point, timestamp: time });
  }
  return [...byTime.values()].sort((a, b) => a.timestamp - b.timestamp);
}
export function miniHistory(data: HistoricalChartResponse, asOf = Date.now()) {
  let points = observedPoints(data.points, asOf);
  const timeZone = data.exchangeTimezone || (data.providerTicker.includes('=') ? 'America/New_York' : 'Asia/Kolkata');
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
  const intraday = /m$|h$/.test(data.interval);
  if (data.range === '1D' && intraday && points.length) {
    const lastTime = points.at(-1)!.timestamp, session = data.regularSession;
    if (session && session.start < session.end && lastTime >= session.start && lastTime <= session.end) {
      // Futures sessions can cross midnight. Provider bounds take precedence over a calendar date.
      points = points.filter(point => point.timestamp >= session.start && point.timestamp <= session.end);
    } else {
      const lastDate = formatter.format(new Date(lastTime));
      points = points.filter(point => formatter.format(new Date(point.timestamp)) === lastDate);
    }
  }
  const first = points[0], last = points.at(-1);
  const change = first && last && points.length > 1 ? (last.close / first.close - 1) * 100 : null;
  const direction: 'gain' | 'loss' | 'neutral' = change == null || Math.abs(change) < 1e-8 ? 'neutral' : change > 0 ? 'gain' : 'loss';
  const date = last ? new Intl.DateTimeFormat('en-IN', { timeZone, day: 'numeric', month: 'short' }).format(new Date(last.timestamp)) : '';
  // Completion is disclosed only when provider session bounds match the observations.
  const session = data.regularSession;
  const completed = !!(session && last && session.end <= asOf && last.timestamp >= session.start && last.timestamp <= session.end);
  const label = data.range === '1D' && intraday
    ? `${date} · ${completed ? 'session ended' : 'intraday'}`
    : `${data.range} history${data.range === '1D' ? ' · daily' : ''}`;
  return { points, change, direction, label, timeZone, intraday };
}
export function week52Position(price?: number | null, low?: number | null, high?: number | null) {
  if (![price, low, high].every(value => typeof value === 'number' && Number.isFinite(value) && value > 0) || high! <= low!) return null;
  return Math.max(0, Math.min(100, (price! - low!) / (high! - low!) * 100));
}
