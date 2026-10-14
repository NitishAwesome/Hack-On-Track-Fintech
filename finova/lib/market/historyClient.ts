import type { ChartRange, HistoricalChartResponse } from './providers/yfinanceProvider';
import { KNOWN_INDICES, extractBaseSymbol } from './symbolMapper';
import { createRequestQueue } from './requestQueue';

const requestHistory = createRequestQueue(4);
let retryAfter = 0;
const failures = new Map<string, { until: number; error: HistoryRequestError }>();
export class HistoryRequestError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
/** Canonical keys also deduplicate aliases used by the strip, cards and research tabs. */
export function historyIdentity(symbol: string, exchange = 'NSE') {
  const upper = symbol.trim().toUpperCase();
  const canonical = KNOWN_INDICES[upper] || extractBaseSymbol(upper);
  const venue = canonical === '^BSESN' || upper.endsWith('.BO') ? 'BSE'
    : canonical.includes('=') ? 'COMMODITY' : canonical.startsWith('^') || upper.endsWith('.NS') ? 'NSE' : exchange.toUpperCase();
  return { symbol: canonical, exchange: venue };
}
export function historyQueryKey(symbol: string, exchange: string, range: ChartRange) {
  const identity = historyIdentity(symbol, exchange);
  return ['research-history', identity.symbol, identity.exchange, range] as const;
}
export function readInstrumentHistory(symbol: string, exchange: string, range: ChartRange, signal?: AbortSignal, force = false): Promise<HistoricalChartResponse> {
  const identity = historyIdentity(symbol, exchange);
  return requestHistory(async () => {
    if (Date.now() < retryAfter) throw new HistoryRequestError('History provider is cooling down. Try again shortly.', 429);
    const key = historyQueryKey(symbol, exchange, range).join('|');
    const failed = failures.get(key);
    if (!force && failed && failed.until > Date.now()) throw failed.error;
    const response = await fetch(`/api/market/history?symbol=${encodeURIComponent(identity.symbol)}&exchange=${encodeURIComponent(identity.exchange)}&range=${range}${force ? '&force=true' : ''}`, { signal });
    if (response.status === 429) {
      const header = response.headers.get('Retry-After');
      const seconds = header && Number(header);
      const until = seconds && Number.isFinite(seconds) ? Date.now() + seconds * 1000 : Date.parse(header || '');
      retryAfter = Math.max(Date.now() + 30_000, Number.isFinite(until) ? until : 0);
    }
    const data = await response.json();
    if (!response.ok || !Array.isArray(data.points)) {
      const error = new HistoryRequestError(data.error || `Historical data is unavailable for ${identity.symbol}.`, response.ok ? 502 : response.status);
      if (error.status >= 400) failures.set(key, { error, until: Date.now() + 60_000 });
      throw error;
    }
    failures.delete(key);
    return data;
  }, signal);
}
