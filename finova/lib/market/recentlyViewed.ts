// ============================================================
// FINOVA — Recently Viewed Stocks Persistence
// lib/market/recentlyViewed.ts
//
// Manages the user's non-sensitive, local browsing history of
// stocks opened in the Dedicated Stock Research experience.
// ============================================================

export interface RecentlyViewedItem {
  symbol: string;
  name: string;
  exchange: string;
  viewedAt: string;
}

const STORAGE_KEY = 'finova_recently_viewed_stocks';
const MAX_RECENT_ITEMS = 8;
export const RECENTLY_VIEWED_EVENT = 'finova_recently_viewed_updated';

/**
 * Retrieves the user's recently viewed stock list from localStorage.
 */
export function getRecentlyViewed(): RecentlyViewedItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (item) => item && typeof item.symbol === 'string' && item.symbol.trim().length > 0
      );
    }
  } catch {
    // Ignore JSON parse errors and return empty list
  }
  return [];
}

/**
 * Adds or updates a stock in Recently Viewed.
 * - Places the stock at index 0 (most recent).
 * - Deduplicates existing entries.
 * - Enforces the maximum list size (8 items).
 * - Fires a custom browser event for instant UI synchronization.
 */
export function addRecentlyViewed(stock: {
  symbol: string;
  name?: string;
  exchange?: string;
}): void {
  if (typeof window === 'undefined' || !stock.symbol) return;

  try {
    const symbol = stock.symbol.toUpperCase().trim();
    const existing = getRecentlyViewed();

    // Filter out previous occurrences of this symbol
    const remaining = existing.filter((item) => item.symbol.toUpperCase() !== symbol);

    const newItem: RecentlyViewedItem = {
      symbol,
      name: stock.name || symbol,
      exchange: stock.exchange || 'NSE',
      viewedAt: new Date().toISOString(),
    };

    const updated = [newItem, ...remaining].slice(0, MAX_RECENT_ITEMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    // Dispatch custom event so visible RecentlyViewed components re-render immediately
    window.dispatchEvent(new CustomEvent(RECENTLY_VIEWED_EVENT, { detail: updated }));
  } catch {
    // Storage quota or privacy mode error; fail silently
  }
}

/**
 * Removes a specific stock from Recently Viewed.
 */
export function removeRecentlyViewed(symbol: string): void {
  if (typeof window === 'undefined' || !symbol) return;
  try {
    const upper = symbol.toUpperCase().trim();
    const existing = getRecentlyViewed();
    const updated = existing.filter((item) => item.symbol.toUpperCase() !== upper);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent(RECENTLY_VIEWED_EVENT, { detail: updated }));
  } catch {
    // Fail silently
  }
}

/**
 * Clears the entire Recently Viewed list.
 */
export function clearRecentlyViewed(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent(RECENTLY_VIEWED_EVENT, { detail: [] }));
  } catch {
    // Fail silently
  }
}
