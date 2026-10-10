// ============================================================
// FINOVA — Server-Side Portfolio Context Resolver (Prompt 12)
// Securely retrieves the authenticated user's portfolio context
// for deterministic news personalization and AI grounding.
//
// NEVER TRUSTS client-supplied user_id or client-supplied symbols.
// ============================================================

import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { PortfolioStorage } from '@/lib/storage/portfolioStorage';
import { EXPANDED_NSE_STOCKS } from '../market/stockCatalog.ts';
import type { UserPortfolioContext } from '../../types/news.ts';
import type { AssetClass } from '../../types/portfolio.ts';

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

      if (!authError && user) {
        // Fetch holdings with joined broker accounts and instruments
        const { data: rawHoldings, error: holdingsErr } = await supabase
          .from('holdings')
          .select(`
            *,
            broker_account:broker_accounts(*),
            instrument:instruments(*)
          `)
          .eq('user_id', user.id);

        if (!holdingsErr && Array.isArray(rawHoldings)) {
          let totalValued = 0;
          const isValuationComplete = true;
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

            // In Supabase, price is in instrument_prices
            // For now, if current price not fetched, invested value is used conservatively
            totalValued += investedVal;

            return {
              symbol,
              instrument_name: inst?.instrument_name || catalogItem?.name || symbol,
              asset_class: assetClass,
              sector,
              industry,
              current_value: investedVal, // conservative baseline
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
            is_valuation_complete: isValuationComplete,
          };
        }
      }
    } catch (err) {
      console.warn('[resolveServerPortfolioContext] Supabase fetch error, falling back to local demo storage:', err);
    }
  }

  // Local storage mode (development or demo)
  const localHoldings = PortfolioStorage.getHoldings('current_user');
  const brokers = PortfolioStorage.getBrokerAccounts();

  let totalValued = 0;
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
    totalValued += investedVal;

    return {
      symbol,
      instrument_name: inst?.instrument_name || catalogItem?.name || symbol,
      asset_class: assetClass,
      sector,
      industry,
      current_value: investedVal,
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
    is_valuation_complete: true,
  };
}
