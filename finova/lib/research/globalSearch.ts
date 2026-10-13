import { EXPANDED_NSE_STOCKS } from '@/lib/market/stockCatalog';
import { INDEX_IDENTITIES } from './catalog';

export interface NavbarSearchResult {
  id: string;
  label: string;
  detail: string;
  kind: 'Stock' | 'Index' | 'Page';
  href: string;
}

const PAGES = [
  ['Dashboard', '/dashboard', 'portfolio overview'],
  ['My Investments', '/investments', 'holdings portfolio'],
  ['Broker Accounts', '/brokers', 'accounts import'],
  ['Transactions', '/transactions', 'ledger income buys sells'],
  ['Performance', '/performance', 'returns profit loss'],
  ['Investment X-Ray', '/analysis', 'allocation concentration analysis'],
  ['Risk Radar', '/risk', 'risk concentration'],
  ['Future Lab', '/future-lab', 'strategy simulator planning'],
  ['Financial Goals', '/goals', 'savings targets funding planner'],
  ['Investment Explorer', '/explore', 'research discovery stocks'],
  ['Watchlist', '/watchlist', 'followed stocks'],
  ['News & Market', '/news', 'headlines news'],
  ['REITs', '/reit', 'real estate alternatives'],
  ['InvITs', '/invit', 'infrastructure alternatives'],
  ['Bonds', '/bonds', 'fixed income alternatives'],
  ['IPO Archive', '/ipo', 'listings'],
  ['FINOVA Intelligence', '/insights', 'ask ai chat'],
  ['Learn', '/learn', 'help education guides'],
  ['Profile', '/profile', 'account security'],
  ['Settings', '/settings', 'theme preferences'],
  ['Notifications', '/notifications', 'activity'],
] as const;

export const browseSearchHref = (query: string) => `/explore?tab=browse&search=${encodeURIComponent(query.trim())}`;
export const researchSearchHref = (symbol: string, query: string) => `/explore/stocks/${encodeURIComponent(symbol)}?from=${encodeURIComponent(browseSearchHref(query))}`;

/** Public catalog metadata only: available on every page without a quote or private-data request. */
export function navbarSearchResults(query: string): NavbarSearchResult[] {
  const q = query.trim().toLowerCase().replace(/\.(ns|bo)$/, '');
  if (!q) return PAGES.slice(0, 4).map(([label, href]) => ({ id: href, label, href, detail: 'Open page', kind: 'Page' }));
  const rank = (fields: string[]) => Math.min(...fields.map((field, i) => {
    const value = field.toLowerCase();
    return value === q ? 0 : value.startsWith(q) ? 1 + i : value.includes(q) ? 3 + i : Infinity;
  }));
  return [
    ...EXPANDED_NSE_STOCKS.map(stock => ({
      id: stock.symbol, label: stock.symbol, detail: stock.name, kind: 'Stock' as const,
      href: researchSearchHref(stock.symbol, query), score: rank([stock.symbol, stock.name, stock.isin, stock.sector, stock.industry]),
    })),
    ...Object.values(INDEX_IDENTITIES).map(index => ({
      id: index.symbol, label: index.name, detail: `${index.exchange} benchmark`, kind: 'Index' as const,
      href: researchSearchHref(index.symbol, query), score: rank([index.symbol, index.name]),
    })),
    ...PAGES.map(([label, href, aliases]) => ({ id: href, label, href, detail: 'Open page', kind: 'Page' as const, score: rank([label, aliases]) })),
  ].filter(result => Number.isFinite(result.score)).sort((a, b) => a.score - b.score || a.label.localeCompare(b.label)).slice(0, 8);
}
