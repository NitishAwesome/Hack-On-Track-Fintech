// ============================================================
// Finova — Financial Calculation Engine (server-side)
// portfolio.ts — Aggregation & Allocation
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
 * Enrich a raw holding with calculated metrics.
 * current_price falls back to avg_buy_price if unavailable.
 */
export function enrichHolding(holding: Holding): HoldingWithMetrics {
  const price = holding.current_price ?? holding.avg_buy_price;
  const current_value = holding.quantity * price;
  const invested_value = holding.quantity * holding.avg_buy_price;
  const absolute_return = current_value - invested_value;
  const absolute_return_pct =
    invested_value === 0 ? 0 : (absolute_return / invested_value) * 100;

  return {
    ...holding,
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

  const total_current_value = holdings.reduce(
    (sum, h) => sum + h.current_value,
    0
  );
  const total_invested_value = holdings.reduce(
    (sum, h) => sum + h.invested_value,
    0
  );
  const total_absolute_return = total_current_value - total_invested_value;
  const total_absolute_return_pct =
    total_invested_value === 0
      ? 0
      : (total_absolute_return / total_invested_value) * 100;

  const dayChanges = holdings
    .filter((h) => h.day_change !== null)
    .map((h) => h.day_change!);
  const total_day_change =
    dayChanges.length > 0 ? dayChanges.reduce((a, b) => a + b, 0) : null;
  const prevTotal =
    total_day_change !== null
      ? total_current_value - total_day_change
      : null;
  const total_day_change_pct =
    total_day_change !== null && prevTotal && prevTotal !== 0
      ? (total_day_change / prevTotal) * 100
      : null;

  const brokerIds = new Set(
    holdings.map((h) => h.broker_account_id).filter(Boolean)
  );

  return {
    total_current_value,
    total_invested_value,
    total_absolute_return,
    total_absolute_return_pct,
    total_day_change,
    total_day_change_pct,
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
  const total = holdings.reduce((sum, h) => sum + h.current_value, 0);
  if (total === 0) return [];

  const map = new Map<AssetClass, { value: number; count: number }>();

  for (const h of holdings) {
    const existing = map.get(h.asset_class) ?? { value: 0, count: 0 };
    map.set(h.asset_class, {
      value: existing.value + h.current_value,
      count: existing.count + 1,
    });
  }

  return Array.from(map.entries())
    .map(([asset_class, { value, count }]) => ({
      asset_class,
      value,
      percentage: (value / total) * 100,
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
  const total = holdings.reduce((sum, h) => sum + h.current_value, 0);
  if (total === 0) return [];

  const map = new Map<
    string,
    { name: string; id: string; color: string; value: number }
  >();

  for (const h of holdings) {
    const id = h.broker_account_id ?? 'unknown';
    const name = h.broker_account?.broker_name ?? 'Unknown Broker';
    const color = h.broker_account?.color_hex ?? '#6B7280';
    const existing = map.get(id) ?? { name, id, color, value: 0 };
    map.set(id, { ...existing, value: existing.value + h.current_value });
  }

  return Array.from(map.values())
    .map(({ name, id, color, value }) => ({
      broker_name: name,
      broker_account_id: id,
      color_hex: color,
      value,
      percentage: (value / total) * 100,
    }))
    .sort((a, b) => b.value - a.value);
}
