import { NextRequest, NextResponse } from 'next/server';
import { findEquity } from '@/lib/research/catalog';
import { MarketDataService } from '@/lib/services/marketData';
import { alignPriceSeries } from '@/lib/research/comparison';
import type { ChartRange } from '@/lib/services/marketData';
async function compare(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const first = findEquity(params.get('first') || ''), second = findEquity(params.get('second') || '');
  const range = params.get('range') || '1M';
  if (!first || !second || first.symbol === second.symbol || !['1M', '3M', '1Y'].includes(range)) return NextResponse.json({ error: 'Choose two distinct supported NSE equities and a 1M, 3M or 1Y range.' }, { status: 400 });
  const [a, b] = await Promise.all([
    MarketDataService.getHistoricalChart(first.symbol, 'NSE', range as ChartRange),
    MarketDataService.getHistoricalChart(second.symbol, 'NSE', range as ChartRange),
  ]);
  if (!a || !b) return NextResponse.json({ error: 'Price history is unavailable for one or both stocks. Please retry.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  const [qa, qb] = await Promise.all([MarketDataService.getQuote(first.symbol, 'NSE'), MarketDataService.getQuote(second.symbol, 'NSE')]);
  return NextResponse.json({ first: { ...first, quote: qa }, second: { ...second, quote: qb }, range, ...alignPriceSeries(a.points, b.points), priceBasis: a.priceBasis, retrievedAt: new Date().toISOString() }, { headers: { 'Cache-Control': 'public, max-age=30' } });
}
export const GET = (request: NextRequest) => compare(request).catch(() => NextResponse.json({ error: 'The comparison provider is temporarily unavailable. Please retry.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } }));
