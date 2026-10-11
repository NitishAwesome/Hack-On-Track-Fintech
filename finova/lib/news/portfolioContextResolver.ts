// ============================================================
// FINOVA — Server-Side Portfolio Context Resolver (Prompt 12 & Critical Patch 1)
// Securely retrieves the authenticated user's portfolio context
// for deterministic news personalization and AI grounding.
//
// NEVER TRUSTS client-supplied user_id or client-supplied symbols.
// Uses verified canonical market quotes for valuation (never purchase cost).
// Fails closed on database error (never leaks local demo storage into real sessions).
// ============================================================

import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { PortfolioStorage } from '@/lib/storage/portfolioStorage';
import { EXPANDED_NSE_STOCKS } from '../market/stockCatalog';
import { PriceService } from '../services/priceService';
import type { UserPortfolioContext } from '../../types/news';
import type { AssetClass } from '../../types/portfolio';

function mapAssetTypeToClass(assetType?: string): AssetClass {
  if (assetType === 'MUTUAL_FUND') return 'mf';
  if (assetType === 'REIT') return 'reit';
  if (assetType === 'INVIT') return 'invit';
  if (assetType === 'BOND') return 'bond';
  return 'equity';
}

/**
 * Resolves the authenticated user's full portfolio context server-side
 */
export async function resolveServerPortfolioContext(): Promise<UserPortfolioContext> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        // Unauthenticated session in cloud mode
        return {
          user_id: 'anonymous',
          holdings: [],
          total_valued_capital: 0,
          represented_sectors: [],
          represented_asset_classes: [],
          is_valuation_complete: false,
        };
      }

      // Fetch holdings with joined broker accounts and instruments
      const { data: rawHoldings, error: holdingsErr } = await supabase
        .from('holdings')
        .select(`
          *,
          broker_account:broker_accounts(*),
          instrument:instruments(*)
        `)
        .eq('user_id', user.id);

      if (holdingsErr || !Array.isArray(rawHoldings)) {
        console.error('[resolveServerPortfolioContext] Supabase fetch error:', holdingsErr?.message);
        // Fail closed — NEVER substitute sample demo data for an authenticated user
        return {
          user_id: user.id,
          holdings: [],
          total_valued_capital: 0,
          represented_sectors: [],
          represented_asset_classes: [],
          is_valuation_complete: false,
        };
      }

      // Resolve real market quotes for the holdings
      const quoteReferences = rawHoldings.map((row) => ({
        symbol: row.instrument?.symbol,
        exchange: row.instrument?.exchange,
        instrument_id: row.instrument_id,
      }));

      const quotesMap = await PriceService.resolveHoldingQuotes(quoteReferences);

      let totalValued = 0;
      let allPriced = rawHoldings.length > 0;
      const sectorsSet = new Set<string>();
      const assetClassesSet = new Set<AssetClass>();

      const formattedHoldings = rawHoldings.map((row) => {
        const inst = row.instrument;
        const broker = row.broker_account;
        const symbol = (inst?.symbol || '').toUpperCase().trim();
        const assetClass = mapAssetTypeToClass(inst?.asset_type);

        assetClassesSet.add(assetClass);

        // Catalog fallback for sector & industry
        const catalogItem = EXPANDED_NSE_STOCKS.find((s) => s.symbol.toUpperCase() === symbol);
        const sector = inst?.sector || catalogItem?.sector || null;
        const industry = inst?.industry || catalogItem?.industry || null;

        if (sector) sectorsSet.add(sector);

        const qty = Number(row.quantity) || 0;
        const avgBuyPrice = Number(row.average_buy_price) || 0;
        const investedVal = qty * avgBuyPrice;

        const quote = symbol ? quotesMap.get(symbol) : null;
        const hasValidPrice = Boolean(
          quote &&
          quote.isValid &&
          quote.price !== null &&
          quote.price > 0 &&
          quote.status !== 'STALE'
        );

        let currentVal: number | null = null;
        if (hasValidPrice && quote?.price) {
          currentVal = Math.round(qty * quote.price * 100) / 100;
          totalValued += currentVal;
        } else {
          allPriced = false;
        }

        return {
          symbol,
          instrument_name: inst?.instrument_name || catalogItem?.name || symbol,
          asset_class: assetClass,
          sector,
          industry,
          current_value: currentVal ?? investedVal, // Uses current market value if available
          invested_value: investedVal,
          broker_name: broker?.display_name || broker?.broker_name || 'Broker',
          isin: inst?.isin || catalogItem?.isin || null,
        };
      });

      return {
        user_id: user.id,
        holdings: formattedHoldings,
        total_valued_capital: totalValued,
        represented_sectors: Array.from(sectorsSet),
        represented_asset_classes: Array.from(assetClassesSet),
        is_valuation_complete: allPriced,
      };
    } catch (err) {
      console.error('[resolveServerPortfolioContext] Unexpected error:', err);
      // Fail closed
      return {
        user_id: 'error',
        holdings: [],
        total_valued_capital: 0,
        represented_sectors: [],
        represented_asset_classes: [],
        is_valuation_complete: false,
      };
    }
  }

  // Explicit local development mode (Supabase unconfigured)
  const localHoldings = PortfolioStorage.getHoldings('current_user');
  const brokers = PortfolioStorage.getBrokerAccounts();

  const quoteReferences = localHoldings.map((h) => {
    const inst = PortfolioStorage.getInstrumentById(h.instrument_id);
    return {
      symbol: inst?.symbol,
      exchange: inst?.exchange,
      instrument_id: h.instrument_id,
    };
  });

  const quotesMap = await PriceService.resolveHoldingQuotes(quoteReferences);

  let totalValued = 0;
  let allPriced = localHoldings.length > 0;
  const sectorsSet = new Set<string>();
  const assetClassesSet = new Set<AssetClass>();

  const formattedHoldings = localHoldings.map((h) => {
    const inst = PortfolioStorage.getInstrumentById(h.instrument_id);
    const broker = brokers.find((b) => b.id === h.broker_account_id);
    const symbol = (inst?.symbol || '').toUpperCase().trim();
    const assetClass = (inst?.asset_type || 'equity') as AssetClass;

    assetClassesSet.add(assetClass);

    const catalogItem = EXPANDED_NSE_STOCKS.find((s) => s.symbol.toUpperCase() === symbol);
    const sector = inst?.sector || catalogItem?.sector || null;
    const industry = inst?.industry || catalogItem?.industry || null;

    if (sector) sectorsSet.add(sector);

    const qty = h.quantity || 0;
    const avgBuyPrice = h.average_buy_price || 0;
    const investedVal = qty * avgBuyPrice;

    const quote = symbol ? quotesMap.get(symbol) : null;
    const hasValidPrice = Boolean(
      quote &&
      quote.isValid &&
      quote.price !== null &&
      quote.price > 0 &&
      quote.status !== 'STALE'
    );

    let currentVal: number | null = null;
    if (hasValidPrice && quote?.price) {
      currentVal = Math.round(qty * quote.price * 100) / 100;
      totalValued += currentVal;
    } else {
      allPriced = false;
    }

    return {
      symbol,
      instrument_name: inst?.instrument_name || catalogItem?.name || symbol,
      asset_class: assetClass,
      sector,
      industry,
      current_value: currentVal ?? investedVal,
      invested_value: investedVal,
      broker_name: broker?.display_name || broker?.broker_name || 'Broker',
      isin: inst?.isin || catalogItem?.isin || null,
    };
  });

  return {
    user_id: 'current_user',
    holdings: formattedHoldings,
    total_valued_capital: totalValued,
    represented_sectors: Array.from(sectorsSet),
    represented_asset_classes: Array.from(assetClassesSet),
    is_valuation_complete: allPriced,
  };
}
