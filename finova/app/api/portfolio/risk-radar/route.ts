import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { enrichHolding } from '@/lib/calculations/portfolio';
import { computeSmartRiskRadar } from '@/lib/calculations/riskRadar';
import { PortfolioStorage } from '@/lib/storage/portfolioStorage';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { resolveQuotesForHoldings } from '@/lib/market/holdingQuoteResolver';
import type { Holding, AssetClass, Exchange, AccountType, BrokerAccount } from '@/types/portfolio';

export const dynamic = 'force-dynamic';

function mapAssetTypeToClass(assetType?: string): AssetClass {
  if (assetType === 'STOCK') return 'equity';
  if (assetType === 'MUTUAL_FUND') return 'mf';
  if (assetType === 'REIT') return 'reit';
  if (assetType === 'INVIT') return 'invit';
  if (assetType === 'BOND') return 'bond';
  if (assetType === 'ETF') return 'etf';
  if (assetType === 'GOLD') return 'sgb';
  return 'equity';
}

export async function GET() {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json(
          { error: 'Authentication required. Please sign in to view risk radar.' },
          { status: 401 }
        );
      }

      // 1. Fetch broker accounts
      const { data: brokerRows } = await supabase
        .from('broker_accounts')
        .select('*')
        .eq('user_id', user.id);

      const brokerAccounts: BrokerAccount[] = (brokerRows || []).map((b) => ({
        id: b.id,
        user_id: b.user_id,
        broker_name: b.broker_name || b.display_name || b.broker_code || 'Broker Account',
        account_label: b.account_label || null,
        account_type: (b.account_type as AccountType) || 'manual',
        color_hex: b.color_hex || '#3B82F6',
        created_at: b.created_at || new Date().toISOString(),
      }));

      // 2. Fetch holdings
      const { data: rawHoldings, error } = await supabase
        .from('holdings')
        .select(`
          id,
          user_id,
          broker_account_id,
          instrument_id,
          quantity,
          average_buy_price,
          currency,
          data_source,
          as_of,
          created_at,
          updated_at,
          broker_account:broker_accounts(*),
          instrument:instruments(*)
        `)
        .eq('user_id', user.id)
        .gt('quantity', 0)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[API /api/portfolio/risk-radar GET] Supabase query error:', error.message);
        return NextResponse.json(
          { error: 'Database error: failed to fetch portfolio for risk radar.' },
          { status: 500 }
        );
      }

      type RawHoldingItem = {
        id: string;
        user_id: string;
        broker_account_id: string;
        instrument_id: string;
        quantity: number | string;
        average_buy_price: number | string;
        currency: string;
        data_source: string;
        as_of: string;
        created_at: string;
        updated_at: string;
        broker_account?: {
          id: string;
          user_id: string;
          broker_name?: string;
          broker_code?: string;
          display_name?: string;
          account_type?: string;
          color_hex?: string;
          created_at?: string;
        };
        instrument?: {
          id: string;
          symbol: string;
          instrument_name: string;
          asset_type: string;
          exchange: string;
          isin: string | null;
          sector?: string | null;
          industry?: string | null;
        };
      };

      const rawItems = (rawHoldings as unknown as RawHoldingItem[]) || [];

      // Resolve live market quotes
      const quotesMap = await resolveQuotesForHoldings(
        rawItems.map((r) => ({
          symbol: r.instrument?.symbol,
          exchange: r.instrument?.exchange,
        }))
      );

      const holdings: Holding[] = rawItems.map((row) => {
        const inst = row.instrument;
        const broker = row.broker_account;
        const assetClass = mapAssetTypeToClass(inst?.asset_type);
        const sym = inst?.symbol ? inst.symbol.toUpperCase() : '';
        const quote = sym ? quotesMap.get(sym) : null;
        const hasValidQuote = Boolean(quote && quote.isValid && quote.price !== null && quote.price > 0);

        const current_price = hasValidQuote ? quote!.price : null;
        const price_updated_at = hasValidQuote ? quote!.price_timestamp : null;
        const price_source = hasValidQuote ? quote!.source : null;
        const price_status = hasValidQuote ? quote!.status : (quote?.status || 'UNAVAILABLE');
        const price_unavailability_reason = hasValidQuote ? null : (quote?.rejectionReason || 'Price unavailable');

        return {
          id: row.id,
          user_id: row.user_id,
          broker_account_id: row.broker_account_id,
          instrument_id: row.instrument_id,
          symbol: inst?.symbol || 'UNKNOWN',
          isin: inst?.isin || null,
          name: inst?.instrument_name || inst?.symbol || 'Unknown Asset',
          asset_class: assetClass,
          exchange: (inst?.exchange as Exchange) || 'NSE',
          quantity: Number(row.quantity),
          avg_buy_price: Number(row.average_buy_price),
          average_buy_price: Number(row.average_buy_price),
          current_price,
          currency: row.currency || 'INR',
          data_source: row.data_source || 'MANUAL',
          as_of: row.as_of || new Date().toISOString(),
          price_updated_at,
          price_source,
          price_status,
          price_unavailability_reason,
          day_change: hasValidQuote ? quote!.day_change : null,
          day_change_pct: hasValidQuote ? quote!.day_change_pct : null,
          created_at: row.created_at,
          updated_at: row.updated_at,
          sector: inst?.sector || null,
          industry: inst?.industry || null,
          broker_account: broker
            ? {
                id: broker.id,
                user_id: broker.user_id,
                broker_name: broker.broker_name || broker.display_name || broker.broker_code || 'Broker',
                account_label: broker.display_name || null,
                account_type: (broker.account_type as AccountType) || 'manual',
                color_hex: broker.color_hex || '#3B82F6',
                created_at: broker.created_at || new Date().toISOString(),
              }
            : undefined,
        };
      });

      const enriched = holdings.map(enrichHolding);
      const radarAnalysis = computeSmartRiskRadar(enriched, brokerAccounts);

      return NextResponse.json({
        success: true,
        data: radarAnalysis,
      });
    } catch (err: unknown) {
      console.error('[API /api/portfolio/risk-radar GET] Exception:', err);
      return NextResponse.json(
        { error: 'Internal server error calculating risk radar.' },
        { status: 500 }
      );
    }
  }

  // Local Storage fallback
  const localHoldings = PortfolioStorage.getHoldings().filter((h) => Number(h.quantity) > 0);
  const localBrokers = PortfolioStorage.getBrokerAccounts();

  const brokers: BrokerAccount[] = localBrokers.map((b) => ({
    id: b.id,
    user_id: b.user_id,
    broker_name: b.display_name || b.broker_code || 'Broker Account',
    account_label: b.display_name || null,
    account_type: (b.account_type as AccountType) || 'manual',
    color_hex: b.color_hex || '#3B82F6',
    created_at: b.created_at,
  }));

  const holdings: Holding[] = localHoldings.map((h) => {
    const broker = localBrokers.find((b) => b.id === h.broker_account_id);
    const inst = PortfolioStorage.getInstrumentById(h.instrument_id);
    const assetClass: AssetClass = (inst?.asset_type?.toLowerCase() as AssetClass) || 'equity';
    const priceRow = PortfolioStorage.getMarketPrice(inst?.symbol || '', false);
    const currentPrice = priceRow ? priceRow.price : null;

    return {
      id: h.id,
      user_id: h.user_id,
      broker_account_id: h.broker_account_id,
      instrument_id: h.instrument_id,
      symbol: inst?.symbol || 'UNKNOWN',
      isin: inst?.isin || null,
      name: inst?.instrument_name || inst?.symbol || 'Unknown Asset',
      asset_class: assetClass,
      exchange: (inst?.exchange as Exchange) || 'NSE',
      quantity: h.quantity,
      avg_buy_price: h.average_buy_price,
      average_buy_price: h.average_buy_price,
      current_price: currentPrice,
      currency: h.currency,
      data_source: h.data_source,
      as_of: h.as_of,
      price_updated_at: null,
      price_source: null,
      price_status: currentPrice !== null ? 'DELAYED' : 'UNAVAILABLE',
      price_unavailability_reason: currentPrice !== null ? null : 'Price unavailable',
      created_at: h.created_at,
      updated_at: h.updated_at,
      sector: inst?.sector || null,
      industry: inst?.industry || null,
      broker_account: broker
        ? {
            id: broker.id,
            user_id: broker.user_id,
            broker_name: broker.display_name || broker.broker_code || 'Broker',
            account_label: broker.display_name || null,
            account_type: (broker.account_type as AccountType) || 'manual',
            color_hex: broker.color_hex || '#3B82F6',
            created_at: broker.created_at,
          }
        : undefined,
    };
  });

  const enriched = holdings.map(enrichHolding);
  const radarAnalysis = computeSmartRiskRadar(enriched, brokers);

  return NextResponse.json({
    success: true,
    data: radarAnalysis,
  });
}
