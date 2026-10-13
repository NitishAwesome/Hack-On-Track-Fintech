import type { HistoricalChartPoint } from '@/lib/market/providers/yfinanceProvider';
export interface AlignedPricePoint { date: string; first: number; second: number; firstClose: number; secondClose: number }
/** Intersection only: missing observations are never forward-filled. */
export function alignPriceSeries(first: HistoricalChartPoint[], second: HistoricalChartPoint[]) {
  const byDate = (points: HistoricalChartPoint[]) => new Map(points.filter(p => Number.isFinite(p.close) && p.close > 0 && /^\d{4}-\d{2}-\d{2}/.test(p.date) && Number.isFinite(Date.parse(p.date))).map(p => [p.date.slice(0, 10), p.close]));
  const a = byDate(first), b = byDate(second);
  const dates = [...a.keys()].filter(date => b.has(date)).sort();
  if (dates.length < 2) return { points: [] as AlignedPricePoint[], firstPerformance: null, secondPerformance: null, largeDiscontinuity: false };
  const baseA = a.get(dates[0])!, baseB = b.get(dates[0])!;
  const points = dates.map(date => ({ date, first: a.get(date)! / baseA * 100, second: b.get(date)! / baseB * 100, firstClose: a.get(date)!, secondClose: b.get(date)! }));
  const last = points[points.length - 1];
  const largeDiscontinuity = points.some((point, i) => i > 0 && (Math.abs(point.firstClose / points[i - 1].firstClose - 1) > .3 || Math.abs(point.secondClose / points[i - 1].secondClose - 1) > .3));
  return { points, firstPerformance: last.first - 100, secondPerformance: last.second - 100, largeDiscontinuity };
}
