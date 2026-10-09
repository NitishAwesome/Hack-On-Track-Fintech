// ============================================================
// FINOVA — Holdings Quote Resolution Engine
// Resolves and caches live market quotes for portfolios dynamically
// ============================================================

import { MarketDataService, type MarketQuote } from '@/lib/services/marketData';
import { PortfolioStorage } from '@/lib/storage/portfolioStorage';

export interface HoldingInstrumentReference {
  symbol?: string | null;
  exchange?: string | null;
  instrument_id?: string | null;
}

/**
 * Resolves verified dynamic market quotes for an array of holdings.
 * Automatically synchronizes quotes to PortfolioStorage's dynamic cache.
 * Returns a map of uppercase base symbols to MarketQuote.
 */
export async function resolveQuotesForHoldings(
  items: HoldingInstrumentReference[],
  options?: { forceRefresh?: boolean }
): Promise<Map<string, MarketQuote>> {
  const instrumentsToFetch: Array<{ symbol: string; exchange?: string }> = [];
  const seen = new Set<string>();

  for (const item of items) {
    if (item?.symbol && item.symbol !== 'UNKNOWN') {
      const sym = item.symbol.trim().toUpperCase();
      const ex = (item.exchange || 'NSE').trim().toUpperCase();
      const key = `${sym}|${ex}`;
      if (!seen.has(key)) {
        seen.add(key);
        instrumentsToFetch.push({ symbol: sym, exchange: ex });
      }
    }
  }

  const quotesMap = await MarketDataService.getQuotes(instrumentsToFetch, options);

  // Sync valid quotes to PortfolioStorage dynamic cache for synchronous lookups
  for (const quote of quotesMap.values()) {
    if (quote && quote.isValid) {
      PortfolioStorage.setMarketPrice(quote.symbol, {
        id: `dyn-${quote.symbol}`,
        instrument_id: `inst-${quote.symbol}`,
        price: quote.price,
        currency: quote.currency,
        source: quote.source,
        status: quote.status,
        day_change: quote.day_change,
        day_change_pct: quote.day_change_pct,
        high_52w: quote.high_52w,
        low_52w: quote.low_52w,
        volume: quote.volume,
        price_timestamp: quote.price_timestamp,
        received_at: quote.received_at,
      });
    }
  }

  return quotesMap;
}
