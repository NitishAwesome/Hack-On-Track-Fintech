import type { HoldingWithMetrics } from '@/types/portfolio';
import type { PortfolioSnapshotRow } from '@/types/database';
import { valuationBasis } from '@/lib/calculations/valuationBasis';
import { deriveCanonicalKey } from '@/lib/calculations/xray';

export const finiteValue = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

/** Presentation-only consolidation: never extend a quote to unpriced positions. */
export function dashboardHoldings(holdings: HoldingWithMetrics[]) {
  const basis = valuationBasis(holdings);
  const groups = new Map<string, HoldingWithMetrics[]>();
  for (const holding of holdings) {
    const key = deriveCanonicalKey(holding).key;
    groups.set(key, [...(groups.get(key) ?? []), holding]);
  }
  return [...groups.entries()]
    .map(([key, rows]) => {
      const priced = rows.filter(
        (row) =>
          finiteValue(row.current_value) && finiteValue(row.current_price) && row.current_price > 0,
      );
      const currentValue = priced.length
        ? priced.reduce((sum, row) => sum + row.current_value!, 0)
        : null;
      const pricedInvested = priced.reduce((sum, row) => sum + row.invested_value, 0);
      const invested = rows.reduce((sum, row) => sum + row.invested_value, 0);
      const valueOnBasis = rows.reduce((sum, row) => sum + basis.valueOf(row), 0);
      const pnl = currentValue === null ? null : currentValue - pricedInvested;
      const sharedPrice =
        priced.length && priced.every((row) => row.current_price === priced[0].current_price)
          ? priced[0].current_price
          : null;
      return {
        key,
        identity: rows[0],
        rows,
        quantity: rows.reduce((sum, row) => sum + row.quantity, 0),
        invested,
        currentValue,
        pricedInvested,
        pnl,
        pnlPct: pnl !== null && pricedInvested > 0 ? (pnl / pricedInvested) * 100 : null,
        currentPrice: sharedPrice,
        partial: priced.length > 0 && priced.length < rows.length,
        stale: rows.some((row) => row.price_status === 'STALE'),
        weight: basis.total > 0 && rows.some((row) => basis.holdings.includes(row))
          ? (valueOnBasis / basis.total) * 100 : null,
        valueOnBasis,
        accounts: new Set(rows.map((row) => row.broker_account_id)).size,
      };
    })
    .sort(
      (a, b) =>
        b.valueOnBasis - a.valueOnBasis || a.identity.symbol.localeCompare(b.identity.symbol),
    );
}

/** Only genuine, complete INR records can be plotted as portfolio value. */
export function dashboardSnapshots(
  snapshots: PortfolioSnapshotRow[],
  today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date()),
) {
  const byDate = new Map<string, PortfolioSnapshotRow>();
  for (const snapshot of snapshots) {
    const date = snapshot.snapshot_date;
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !Number.isFinite(Date.parse(date)) ||
      new Date(date).toISOString().slice(0, 10) !== date ||
      date > today
    )
      continue;
    if (
      snapshot.currency !== 'INR' ||
      snapshot.completeness_status !== 'COMPLETE' ||
      !finiteValue(snapshot.portfolio_value) ||
      snapshot.portfolio_value < 0
    )
      continue;
    if (!finiteValue(snapshot.invested_value) || snapshot.invested_value < 0) continue;
    const existing = byDate.get(date);
    if (!existing || (snapshot.created_at || '') >= (existing.created_at || ''))
      byDate.set(date, snapshot);
  }
  return [...byDate.values()].sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date));
}
