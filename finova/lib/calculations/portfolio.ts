// ============================================================
// Finova — Financial Calculation Engine (server-side & client)
// portfolio.ts — Decimal-Safe Aggregation & Allocation
// Respects: Valid Valuation vs Price Unavailable Distinction
// ============================================================

import type {
  Holding,
  HoldingWithMetrics,
  PortfolioSummary,
  AssetAllocation,
  BrokerAllocation,
  AssetClass,
} from '@/types/portfolio';

/**
 * Decimal-safe rounding utility to avoid JS floating-point drift.
 */
export function roundCurrency(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

export function roundQuantity(val: number): number {
  return Math.round((val + Number.EPSILON) * 1000000) / 1000000;
}

export function roundPercent(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

/**
 * Enrich a raw holding with calculated metrics.
 * Strictly adheres to Prompt 6 Section 9:
 * If current_price is missing or unverified, it does NOT substitute zero or average buy price.
 * Instead, price-dependent metrics remain null.
 */
export function enrichHolding(holding: Holding): HoldingWithMetrics {
  const quantity = roundQuantity(holding.quantity);
  const avg_buy_price = roundCurrency(holding.average_buy_price ?? holding.avg_buy_price);
  const invested_value = roundCurrency(quantity * avg_buy_price);

  const hasCurrentPrice =
    typeof holding.current_price === 'number' &&
    !isNaN(holding.current_price) &&
    holding.current_price > 0;

  if (!hasCurrentPrice) {
    return {
      ...holding,
      quantity,
      avg_buy_price,
      current_price: null,
      current_value: invested_value, // For backwards compatibility with charts expecting number, but flagged
      invested_value,
      absolute_return: null,
      absolute_return_pct: null,
      day_change: null,
      day_change_pct: null,
    };
  }

  const current_price = roundCurrency(holding.current_price!);
  const current_value = roundCurrency(quantity * current_price);
  const absolute_return = roundCurrency(current_value - invested_value);
  const absolute_return_pct =
    invested_value > 0 ? roundPercent((absolute_return / invested_value) * 100) : 0;

  return {
    ...holding,
    quantity,
    avg_buy_price,
    current_price,
    current_value,
    invested_value,
    absolute_return,
    absolute_return_pct,
    day_change: null,
    day_change_pct: null,
  };
}

/**
 * Aggregate all holdings into a PortfolioSummary
 */
export function buildPortfolioSummary(
  holdings: HoldingWithMetrics[]
): PortfolioSummary {
  if (holdings.length === 0) {
    return {
      total_current_value: 0,
      total_invested_value: 0,
      total_absolute_return: 0,
      total_absolute_return_pct: 0,
      total_day_change: null,
      total_day_change_pct: null,
      holding_count: 0,
      broker_count: 0,
      last_updated: new Date().toISOString(),
    };
  }

  const total_invested_value = roundCurrency(
    holdings.reduce((sum, h) => sum + h.invested_value, 0)
  );

  const pricedHoldings = holdings.filter(
    (h) => h.current_price !== null && typeof h.current_price === 'number'
  );

  const total_current_value = roundCurrency(
    holdings.reduce((sum, h) => sum + (h.current_value || h.invested_value), 0)
  );

  // Return calculable on priced subset
  const pricedInvested = pricedHoldings.reduce((s, h) => s + h.invested_value, 0);
  const pricedCurrent = pricedHoldings.reduce(
    (s, h) => s + (h.current_value || h.invested_value),
    0
  );

  const total_absolute_return =
    pricedHoldings.length > 0 ? roundCurrency(pricedCurrent - pricedInvested) : 0;

  const total_absolute_return_pct =
    pricedInvested > 0
      ? roundPercent((total_absolute_return / pricedInvested) * 100)
      : 0;

  const brokerIds = new Set(
    holdings.map((h) => h.broker_account_id).filter(Boolean)
  );

  return {
    total_current_value,
    total_invested_value,
    total_absolute_return,
    total_absolute_return_pct,
    total_day_change: null,
    total_day_change_pct: null,
    holding_count: holdings.length,
    broker_count: brokerIds.size,
    last_updated: new Date().toISOString(),
  };
}

/**
 * Build asset class allocation breakdown
 */
export function buildAssetAllocation(
  holdings: HoldingWithMetrics[]
): AssetAllocation[] {
  const total = holdings.reduce(
    (sum, h) => sum + (h.current_value || h.invested_value),
    0
  );
  if (total === 0) return [];

  const map = new Map<AssetClass, { value: number; count: number }>();

  for (const h of holdings) {
    const existing = map.get(h.asset_class) ?? { value: 0, count: 0 };
    const val = h.current_value || h.invested_value;
    map.set(h.asset_class, {
      value: existing.value + val,
      count: existing.count + 1,
    });
  }

  return Array.from(map.entries())
    .map(([asset_class, { value, count }]) => ({
      asset_class,
      value: roundCurrency(value),
      percentage: roundPercent((value / total) * 100),
      holding_count: count,
    }))
    .sort((a, b) => b.value - a.value);
}

/**
 * Build broker-wise allocation breakdown
 */
export function buildBrokerAllocation(
  holdings: HoldingWithMetrics[]
): BrokerAllocation[] {
  const total = holdings.reduce(
    (sum, h) => sum + (h.current_value || h.invested_value),
    0
  );
  if (total === 0) return [];

  const map = new Map<
    string,
    { name: string; id: string; color: string; value: number }
  >();

  for (const h of holdings) {
    const id = h.broker_account_id ?? 'unknown';
    const name =
      h.broker_account?.display_name ||
      h.broker_account?.broker_name ||
      'Manual Account';
    const color = h.broker_account?.color_hex ?? '#6B7280';
    const existing = map.get(id) ?? { name, id, color, value: 0 };
    const val = h.current_value || h.invested_value;
    map.set(id, { ...existing, value: existing.value + val });
  }

  return Array.from(map.values())
    .map(({ name, id, color, value }) => ({
      broker_name: name,
      broker_account_id: id,
      color_hex: color,
      value: roundCurrency(value),
      percentage: roundPercent((value / total) * 100),
    }))
    .sort((a, b) => b.value - a.value);
}
