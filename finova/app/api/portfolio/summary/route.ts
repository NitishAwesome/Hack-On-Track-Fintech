import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { enrichHolding, buildPortfolioSummary, buildAssetAllocation, buildBrokerAllocation } from '@/lib/calculations/portfolio';
import { buildRiskMetrics } from '@/lib/calculations/risk';
import { PortfolioStorage } from '@/lib/storage/portfolioStorage';
import type { Holding, AssetClass, Exchange } from '@/types/portfolio';

function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return Boolean(url && !url.includes('placeholder') && !url.includes('your_'));
}

export async function GET() {
  const supabaseConfigured = isSupabaseConfigured();

  if (supabaseConfigured) {
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data: rawHoldings, error } = await supabase
          .from('holdings')
          .select(`*, broker_account:broker_accounts(*), instrument:instruments(*)`)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (!error && rawHoldings) {
          const holdings = (rawHoldings as unknown as Holding[]).map(enrichHolding);
          return NextResponse.json({
            summary: buildPortfolioSummary(holdings),
            assetAllocation: buildAssetAllocation(holdings),
            brokerAllocation: buildBrokerAllocation(holdings),
            riskMetrics: buildRiskMetrics(holdings),
            isDemo: false,
          });
        }
      }
    } catch {
      // Fallback
    }
  }

  // Persistent storage engine
  const rawHoldings = PortfolioStorage.getHoldings();
  const brokers = PortfolioStorage.getBrokerAccounts();

  const holdings: Holding[] = rawHoldings.map((h) => {
    const inst = PortfolioStorage.getInstrumentById(h.instrument_id);
    const broker = brokers.find((b) => b.id === h.broker_account_id);
    const priceRecord = inst ? PortfolioStorage.getMarketPrice(inst.symbol) : null;

    let assetClass: AssetClass = 'equity';
    if (inst) {
      if (inst.asset_type === 'STOCK') assetClass = 'equity';
      else if (inst.asset_type === 'MUTUAL_FUND') assetClass = 'mf';
      else if (inst.asset_type === 'REIT') assetClass = 'reit';
      else if (inst.asset_type === 'INVIT') assetClass = 'invit';
      else if (inst.asset_type === 'BOND') assetClass = 'bond';
    }

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
      current_price: priceRecord ? priceRecord.price : null,
      currency: h.currency,
      data_source: h.data_source,
      as_of: h.as_of,
      price_updated_at: priceRecord?.price_timestamp || null,
      created_at: h.created_at,
      updated_at: h.updated_at,
      broker_account: broker
        ? {
            id: broker.id,
            user_id: broker.user_id,
            broker_name: broker.display_name,
            account_label: broker.display_name,
            account_type: broker.account_type,
            color_hex: broker.color_hex || '#3B82F6',
            is_active: true,
            created_at: broker.created_at,
          }
        : undefined,
    };
  });

  const enrichedHoldings = holdings.map(enrichHolding);
  return NextResponse.json({
    summary: buildPortfolioSummary(enrichedHoldings),
    assetAllocation: buildAssetAllocation(enrichedHoldings),
    brokerAllocation: buildBrokerAllocation(enrichedHoldings),
    riskMetrics: buildRiskMetrics(enrichedHoldings),
    isDemo: false,
  });
}
