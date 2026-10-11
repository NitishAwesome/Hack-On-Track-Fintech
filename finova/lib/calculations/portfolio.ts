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
 * Strictly adheres to Prompt 9.1B:
 * If current_price is missing or unverified, it does NOT substitute zero or average buy price.
 * Instead, price-dependent metrics remain strictly null.
 */
export function enrichHolding(holding: Holding): HoldingWithMetrics {
  const quantity = roundQuantity(holding.quantity);
  const hRecord = holding as unknown as Record<string, unknown>;
  const rawBuyPrice = typeof hRecord.buy_price === 'number' ? hRecord.buy_price : undefined;
  const rawInvestedValue = typeof hRecord.invested_value === 'number' ? hRecord.invested_value : undefined;

  const avg_buy_price = roundCurrency(
    holding.average_buy_price ??
    holding.avg_buy_price ??
    rawBuyPrice ??
    0
  );
  const invested_value =
    typeof rawInvestedValue === 'number' && !isNaN(rawInvestedValue)
      ? roundCurrency(rawInvestedValue)
      : roundCurrency(quantity * avg_buy_price);

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
      current_value: null, // Strictly null. Never replace with invested_value or zero.
      invested_value,
      absolute_return: null,
      absolute_return_pct: null,
      day_change: null,
      day_change_pct: null,
      price_status: 'UNAVAILABLE',
      price_unavailability_reason:
        holding.price_unavailability_reason || 'No reliable market quote available',
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
    day_change: holding.day_change ?? null,
    day_change_pct: holding.day_change_pct ?? null,
    price_status: holding.price_status || 'DELAYED',
    price_source: holding.price_source || 'YAHOO_FINANCE',
  };
}

/**
 * Aggregate all holdings into a PortfolioSummary.
 * Strictly adheres to Prompt 9.1B:
 * - Distinguishes complete portfolio valuation from partial market valuation.
 * - Does NOT add unquoted invested cost into market valuation totals.
 * - For incomplete coverage, total_current_value is null to avoid presenting
 *   a partial value as a complete total, while priced_current_value provides the valued subtotal.
 */
export function buildPortfolioSummary(
  holdings: HoldingWithMetrics[]
): PortfolioSummary {
  if (holdings.length === 0) {
    return {
      total_current_value: 0,
      total_invested_value: 0,
      priced_current_value: 0,
      priced_invested_value: 0,
      unquoted_invested_value: 0,
      total_absolute_return: 0,
      total_absolute_return_pct: 0,
      total_day_change: null,
      total_day_change_pct: null,
      holding_count: 0,
      broker_count: 0,
      last_updated: new Date().toISOString(),
      has_unquoted_assets: false,
      unquoted_count: 0,
      has_stale_assets: false,
      stale_count: 0,
      priced_count: 0,
      is_valuation_complete: true,
      quote_coverage_pct: 100,
    };
  }

  const total_invested_value = roundCurrency(
    holdings.reduce((sum, h) => sum + h.invested_value, 0)
  );

  const pricedHoldings = holdings.filter(
    (h) => h.current_price !== null && typeof h.current_price === 'number' && h.current_value !== null
  );
  const unquotedHoldings = holdings.filter(
    (h) => h.current_price === null || typeof h.current_price !== 'number' || h.current_value === null
  );
  const staleHoldings = holdings.filter(
    (h) => h.price_status === 'STALE'
  );

  const has_unquoted_assets = unquotedHoldings.length > 0;
  const has_stale_assets = staleHoldings.length > 0;
  // Valuation is strictly complete ONLY if all assets have prices and NONE are stale fallbacks
  const is_valuation_complete = unquotedHoldings.length === 0 && staleHoldings.length === 0;
  const priced_count = pricedHoldings.length;
  const unquoted_count = unquotedHoldings.length;
  const stale_count = staleHoldings.length;
  const quote_coverage_pct = roundPercent((priced_count / holdings.length) * 100);

  const pricedInvested = roundCurrency(
    pricedHoldings.reduce((s, h) => s + h.invested_value, 0)
  );
  const unquotedInvested = roundCurrency(
    unquotedHoldings.reduce((s, h) => s + h.invested_value, 0)
  );

  let total_current_value: number | null = null;
  let priced_current_value: number | null = null;
  let total_absolute_return: number | null = null;
  let total_absolute_return_pct: number | null = null;

  if (pricedHoldings.length > 0) {
    const pricedCurrent = roundCurrency(
      pricedHoldings.reduce((s, h) => s + (h.current_value || 0), 0)
    );
    priced_current_value = pricedCurrent;

    // Do NOT present a partial or stale value as a complete portfolio total.
    // If complete, total_current_value equals pricedCurrent.
    // If incomplete (unquoted or stale), total_current_value is null, and callers use priced_current_value.
    total_current_value = is_valuation_complete ? pricedCurrent : null;

    total_absolute_return = roundCurrency(pricedCurrent - pricedInvested);
    total_absolute_return_pct =
      pricedInvested > 0
        ? roundPercent((total_absolute_return / pricedInvested) * 100)
        : 0;
  } else {
    total_current_value = null;
    priced_current_value = null;
    total_absolute_return = null;
    total_absolute_return_pct = null;
  }

  const brokerIds = new Set(
    holdings.map((h) => h.broker_account_id).filter(Boolean)
  );

  return {
    total_current_value,
    total_invested_value,
    priced_current_value,
    priced_invested_value: pricedInvested,
    unquoted_invested_value: unquotedInvested,
    total_absolute_return,
    total_absolute_return_pct,
    total_day_change: null,
    total_day_change_pct: null,
    holding_count: holdings.length,
    broker_count: brokerIds.size,
    last_updated: new Date().toISOString(),
    has_unquoted_assets,
    unquoted_count,
    has_stale_assets,
    stale_count,
    priced_count,
    is_valuation_complete,
    quote_coverage_pct,
  };
}

/**
 * Build asset class allocation breakdown.
 * Uses a single defensible valuation denominator:
 * - If priced holdings exist, computes market-value allocation strictly across priced holdings.
 * - If NO holdings are priced, computes cost-basis allocation across all holdings.
 * - Never mixes current_value and invested_value in the same sum or denominator.
 */
export function buildAssetAllocation(
  holdings: HoldingWithMetrics[]
): AssetAllocation[] {
  if (holdings.length === 0) return [];

  const pricedHoldings = holdings.filter(
    (h) => h.current_price !== null && h.current_value !== null
  );
  const usingMarketVal = pricedHoldings.length > 0;

  const total = usingMarketVal
    ? pricedHoldings.reduce((sum, h) => sum + (h.current_value || 0), 0)
    : holdings.reduce((sum, h) => sum + h.invested_value, 0);

  if (total <= 0) return [];

  const map = new Map<AssetClass, { value: number; count: number; unquoted: number }>();

  for (const h of holdings) {
    if (!map.has(h.asset_class)) {
      map.set(h.asset_class, { value: 0, count: 0, unquoted: 0 });
    }
    const entry = map.get(h.asset_class)!;
    entry.count += 1;
    if (h.current_price === null || h.current_value === null) {
      entry.unquoted += 1;
    }
  }

  if (usingMarketVal) {
    for (const h of pricedHoldings) {
      const entry = map.get(h.asset_class)!;
      entry.value += h.current_value || 0;
    }
  } else {
    for (const h of holdings) {
      const entry = map.get(h.asset_class)!;
      entry.value += h.invested_value;
    }
  }

  return Array.from(map.entries())
    .map(([asset_class, { value, count, unquoted }]) => ({
      asset_class,
      value: roundCurrency(value),
      percentage: roundPercent((value / total) * 100),
      allocation_pct: roundPercent((value / total) * 100),
      holding_count: count,
      unquoted_count: unquoted,
    }))
    .sort((a, b) => b.value - a.value);
}

/**
 * Build broker-wise allocation breakdown.
 * Follows the same defensible denominator rule:
 * - If priced holdings exist, computes allocation using priced market value only.
 * - If NO holdings are priced, computes allocation using invested cost only.
 * - Never blends market value and cost basis in the same calculation.
 */
export function buildBrokerAllocation(
  holdings: HoldingWithMetrics[]
): BrokerAllocation[] {
  if (holdings.length === 0) return [];

  const pricedHoldings = holdings.filter(
    (h) => h.current_price !== null && h.current_value !== null
  );
  const usingMarketVal = pricedHoldings.length > 0;

  const total = usingMarketVal
    ? pricedHoldings.reduce((sum, h) => sum + (h.current_value || 0), 0)
    : holdings.reduce((sum, h) => sum + h.invested_value, 0);

  if (total <= 0) return [];

  const map = new Map<
    string,
    { name: string; id: string; color: string; value: number }
  >();

  const targetList = usingMarketVal ? pricedHoldings : holdings;
  for (const h of targetList) {
    const id = h.broker_account_id ?? 'unknown';
    const name =
      h.broker_account?.display_name ||
      h.broker_account?.broker_name ||
      'Manual Account';
    const color = h.broker_account?.color_hex ?? '#6B7280';
    const existing = map.get(id) ?? { name, id, color, value: 0 };
    const val = usingMarketVal ? (h.current_value || 0) : h.invested_value;
    map.set(id, { ...existing, value: existing.value + val });
  }

  return Array.from(map.values())
    .map(({ name, id, color, value }) => ({
      broker_name: name,
      broker_account_id: id,
      color_hex: color,
      value: roundCurrency(value),
      percentage: roundPercent((value / total) * 100),
      allocation_pct: roundPercent((value / total) * 100),
    }))
    .sort((a, b) => b.value - a.value);
}
