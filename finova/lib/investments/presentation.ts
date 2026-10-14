import type { AssetClass, HoldingWithMetrics } from '@/types/portfolio';
import { findEquity, normalizeResearchSymbol } from '@/lib/research/catalog';

export function selectedBrokerAccount(selected: string, accounts: readonly { id: string }[]) {
  return selected || accounts[0]?.id || '';
}

export const INVESTMENT_CATEGORIES: { id: string; label: string; assetClass?: AssetClass }[] = [
  { id: 'all', label: 'All Investments' },
  { id: 'stocks', label: 'Stocks', assetClass: 'equity' },
  { id: 'mutual_funds', label: 'Mutual Funds', assetClass: 'mf' },
  { id: 'reits', label: 'REITs', assetClass: 'reit' },
  { id: 'invits', label: 'InvITs', assetClass: 'invit' },
  { id: 'bonds', label: 'Bonds', assetClass: 'bond' },
  { id: 'etfs', label: 'ETFs', assetClass: 'etf' },
  { id: 'gold_bonds', label: 'Gold Bonds', assetClass: 'sgb' },
];

export const hasHoldingPrice = (holding: HoldingWithMetrics) =>
  typeof holding.current_price === 'number' &&
  Number.isFinite(holding.current_price) &&
  holding.current_price > 0;

/** Only supported NSE research identities open the stock route. */
export function holdingResearchDestination(holding: HoldingWithMetrics, from = '/investments') {
  const symbol = normalizeResearchSymbol(holding.symbol);
  if ((!holding.exchange || holding.exchange === 'NSE') && findEquity(symbol)) {
    return `/explore/stocks/${encodeURIComponent(symbol)}?from=${encodeURIComponent(from === '/holdings' ? '/holdings' : '/investments')}`;
  }
  if (holding.asset_class === 'reit') return '/reit';
  if (holding.asset_class === 'invit') return '/invit';
  if (holding.asset_class === 'bond' || holding.asset_class === 'sgb') return '/bonds';
  return `/explore?tab=browse&search=${encodeURIComponent(holding.symbol)}`;
}

export function holdingQuoteTimestamp(value: string | null) {
  if (!value || !Number.isFinite(Date.parse(value))) return null;
  return (
    new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(new Date(value)) + ' IST'
  );
}
