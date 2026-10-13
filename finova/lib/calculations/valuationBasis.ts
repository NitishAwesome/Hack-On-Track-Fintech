import type { HoldingWithMetrics } from '@/types/portfolio';

/** Allocation uses priced market values, or cost basis only when no price exists. */
export function valuationBasis(holdings: HoldingWithMetrics[]) {
  const priced = holdings.filter((h) => typeof h.current_value === 'number' && Number.isFinite(h.current_value) && typeof h.current_price === 'number' && Number.isFinite(h.current_price) && h.current_price > 0);
  const usingMarketValue = priced.length > 0;
  const included = usingMarketValue ? priced : holdings;
  const valueOf = (h: HoldingWithMetrics) => usingMarketValue ? (priced.includes(h) ? h.current_value! : 0) : h.invested_value;
  return { holdings: included, valueOf, total: included.reduce((sum, h) => sum + valueOf(h), 0), label: usingMarketValue ? 'Priced holdings only' : 'Invested cost basis' };
}
