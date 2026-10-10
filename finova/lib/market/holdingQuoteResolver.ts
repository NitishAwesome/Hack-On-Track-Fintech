// ============================================================
// FINOVA — Holdings Quote Resolution Engine
// Resolves and caches live market quotes for portfolios dynamically
// ============================================================

import { PriceService, type NormalizedPriceQuote, type CanonicalInstrumentReference } from '../services/priceService.ts';
import type { MarketQuote } from '../services/marketData.ts';

export type HoldingInstrumentReference = CanonicalInstrumentReference;
export type { NormalizedPriceQuote };

/**
 * Resolves verified dynamic market quotes for an array of holdings.
 * Automatically synchronizes quotes to PortfolioStorage's dynamic cache.
 * Returns a map of uppercase base symbols to NormalizedPriceQuote.
 */
export async function resolveQuotesForHoldings(
  items: HoldingInstrumentReference[],
  options?: { forceRefresh?: boolean }
): Promise<Map<string, MarketQuote>> {
  return PriceService.resolveHoldingQuotes(items, options) as unknown as Promise<Map<string, MarketQuote>>;
}

