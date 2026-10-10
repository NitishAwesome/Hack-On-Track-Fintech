// ============================================================
// FINOVA — Canonical Portfolio Price & Valuation Service
// Shared, single price resolution path across all portfolio consumers
// Normalized data: Instrument, Price, Status, Timestamp, Provenance
// ============================================================

import { MarketDataService } from './marketData.ts';
import { PortfolioStorage } from '../storage/portfolioStorage.ts';
import { extractBaseSymbol, resolveYahooFinanceSymbol } from '../market/symbolMapper.ts';
import type { PriceStatus } from '../../types/database.ts';

export interface CanonicalInstrumentReference {
  symbol?: string | null;
  exchange?: string | null;
  instrument_id?: string | null;
}

export interface NormalizedPriceQuote {
  instrument_id: string | null;
  symbol: string;
  providerTicker: string;
  exchange: string;
  price: number | null;
  currency: string;
  source: string | null;
  status: PriceStatus;
  price_timestamp: string | null;
  received_at: string;
  day_change: number | null;
  day_change_pct: number | null;
  high_52w: number | null;
  low_52w: number | null;
  volume: number | null;
  isValid: boolean;
  unavailability_reason: string | null;
}

export class PriceService {
  /**
   * Resolves canonical market quotes for a batch of instruments.
   * Guarantees:
   * 1. Never uses static seeded or fake prices for valuations.
   * 2. Reuses MarketDataService session-aware in-memory caching and timeouts.
   * 3. Syncs verified quotes to PortfolioStorage dynamic cache for synchronous lookups.
   * 4. Returns NormalizedPriceQuote for every requested symbol, explicit about status.
   */
  public static async resolveHoldingQuotes(
    items: CanonicalInstrumentReference[],
    options?: { forceRefresh?: boolean }
  ): Promise<Map<string, NormalizedPriceQuote>> {
    const resultMap = new Map<string, NormalizedPriceQuote>();
    if (!items || items.length === 0) return resultMap;

    const toFetch: Array<{ symbol: string; exchange?: string }> = [];
    const seen = new Set<string>();

    for (const item of items) {
      if (item?.symbol && item.symbol !== 'UNKNOWN') {
        const sym = item.symbol.trim().toUpperCase();
        const baseSym = extractBaseSymbol(sym);
        const ex = (item.exchange || 'NSE').trim().toUpperCase();
        const key = `${baseSym}|${ex}`;
        if (!seen.has(key)) {
          seen.add(key);
          toFetch.push({ symbol: baseSym, exchange: ex });
        }
      }
    }

    const fetchedQuotes = await MarketDataService.getQuotes(toFetch, options);

    // Sync valid quotes to PortfolioStorage dynamic cache
    for (const quote of fetchedQuotes.values()) {
      if (quote && quote.isValid && quote.price > 0) {
        PortfolioStorage.setMarketPrice(quote.symbol, {
          id: `dyn-${quote.symbol}`,
          instrument_id: `inst-${quote.symbol}`,
          symbol: quote.symbol,
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

    const nowIso = new Date().toISOString();

    for (const item of items) {
      if (!item?.symbol || item.symbol === 'UNKNOWN') continue;
      const rawSym = item.symbol.trim().toUpperCase();
      const baseSym = extractBaseSymbol(rawSym);
      const ex = (item.exchange || 'NSE').trim().toUpperCase();

      const quote = fetchedQuotes.get(baseSym) || fetchedQuotes.get(rawSym);

      if (quote && quote.isValid && quote.price > 0) {
        const normalized: NormalizedPriceQuote = {
          instrument_id: item.instrument_id || null,
          symbol: baseSym,
          providerTicker: quote.providerTicker,
          exchange: quote.exchange || ex,
          price: quote.price,
          currency: quote.currency || 'INR',
          source: quote.source,
          status: quote.status,
          price_timestamp: quote.price_timestamp,
          received_at: quote.received_at || nowIso,
          day_change: quote.day_change,
          day_change_pct: quote.day_change_pct,
          high_52w: quote.high_52w,
          low_52w: quote.low_52w,
          volume: quote.volume,
          isValid: true,
          unavailability_reason: null,
        };
        resultMap.set(baseSym, normalized);
        if (rawSym !== baseSym) {
          resultMap.set(rawSym, normalized);
        }
      } else {
        const reason = quote?.rejectionReason || 'Price unavailable: no reliable market quote from provider';
        const unavailable: NormalizedPriceQuote = {
          instrument_id: item.instrument_id || null,
          symbol: baseSym,
          providerTicker: resolveYahooFinanceSymbol(baseSym, ex) || baseSym,
          exchange: ex,
          price: null,
          currency: 'INR',
          source: null,
          status: quote?.status === 'STALE' ? 'STALE' : 'UNAVAILABLE',
          price_timestamp: null,
          received_at: nowIso,
          day_change: null,
          day_change_pct: null,
          high_52w: null,
          low_52w: null,
          volume: null,
          isValid: false,
          unavailability_reason: reason,
        };
        resultMap.set(baseSym, unavailable);
        if (rawSym !== baseSym) {
          resultMap.set(rawSym, unavailable);
        }
      }
    }

    return resultMap;
  }
}
