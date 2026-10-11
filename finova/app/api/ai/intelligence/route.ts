// ============================================================
// FINOVA — AI Portfolio Intelligence API Route
// GET & POST /api/ai/intelligence
// Strictly adheres to Prompt 8:
// - Server-side user authorization (Strict RLS / isolation)
// - Never accepts arbitrary user_id from client
// - Comprehensive deterministic risk calculations
// - Gemini 1.5 Flash analysis with fallback to deterministic engine
// - Schema-validated responses with audit meta
// ============================================================

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { PortfolioStorage } from '@/lib/storage/portfolioStorage';
import {
  enrichHolding,
  buildPortfolioSummary,
  buildAssetAllocation,
} from '@/lib/calculations/portfolio';
import { buildRiskMetrics } from '@/lib/calculations/risk';
import { generatePortfolioIntelligence } from '@/lib/ai/intelligenceEngine';
import { resolveQuotesForHoldings } from '@/lib/market/holdingQuoteResolver';
import type { Holding, AssetClass, Exchange, AccountType } from '@/types/portfolio';

export const dynamic = 'force-dynamic';

function mapAssetTypeToClass(assetType?: string): AssetClass {
  if (assetType === 'STOCK') return 'equity';
  if (assetType === 'MUTUAL_FUND') return 'mf';
  if (assetType === 'REIT') return 'reit';
  if (assetType === 'INVIT') return 'invit';
  if (assetType === 'BOND') return 'bond';
  return 'equity';
}

async function resolveUserHoldings(): Promise<{
  holdings: Holding[];
  userId: string;
  isCloud: boolean;
  error?: { message: string; status: number };
}> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return {
          holdings: [],
          userId: '',
          isCloud: true,
          error: {
            message: 'Authentication required. Please sign in to generate portfolio intelligence.',
            status: 401,
          },
        };
      }

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
        .eq('user_id', user.id) // Strict server-side user isolation
        .gt('quantity', 0)
        .order('created_at', { ascending: false });

      if (error) {
        return {
          holdings: [],
          userId: user.id,
          isCloud: true,
          error: {
            message: 'Database error: failed to fetch user holdings.',
            status: 500,
          },
        };
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
          as_of: row.as_of,
          price_updated_at,
          price_source,
          price_status,
          price_unavailability_reason,
          created_at: row.created_at,
          updated_at: row.updated_at,
          sector: inst?.sector || null,
          industry: inst?.industry || null,
          broker_account: broker
            ? {
                id: broker.id,
                user_id: broker.user_id,
                broker_name: broker.display_name || broker.broker_code || 'Broker',
                display_name: broker.display_name,
                account_label: broker.display_name || null,
                account_type: (broker.account_type as AccountType) || 'broker',
                color_hex: broker.color_hex || '#3B82F6',
                is_active: true,
                created_at: broker.created_at || new Date().toISOString(),
              }
            : undefined,
        };
      });

      return { holdings, userId: user.id, isCloud: true };
    } catch {
      return {
        holdings: [],
        userId: '',
        isCloud: true,
        error: {
          message: 'Unable to connect to database service.',
          status: 500,
        },
      };
    }
  }

  // Local development mode
  const rawHoldings = PortfolioStorage.getHoldings().filter((h) => Number(h.quantity) > 0);
  const brokers = PortfolioStorage.getBrokerAccounts();

  const holdingsWithInst = rawHoldings.map((h) => {
    const inst = PortfolioStorage.getInstrumentById(h.instrument_id);
    return {
      holding: h,
      inst,
      symbol: inst?.symbol,
      exchange: inst?.exchange,
    };
  });

  const quotesMap = await resolveQuotesForHoldings(
    holdingsWithInst.map((item) => ({
      symbol: item.symbol,
      exchange: item.exchange,
    }))
  );

  const holdings: Holding[] = holdingsWithInst.map(({ holding: h, inst }) => {
    const broker = brokers.find((b) => b.id === h.broker_account_id);
    const sym = inst?.symbol ? inst.symbol.toUpperCase() : '';
    const quote = sym ? quotesMap.get(sym) : null;
    const hasValidQuote = Boolean(quote && quote.isValid && quote.price !== null && quote.price > 0);

    const current_price = hasValidQuote ? quote!.price : null;
    const price_updated_at = hasValidQuote ? quote!.price_timestamp : null;
    const price_source = hasValidQuote ? quote!.source : null;
    const price_status = hasValidQuote ? quote!.status : (quote?.status || 'UNAVAILABLE');
    const price_unavailability_reason = hasValidQuote ? null : (quote?.rejectionReason || 'Price unavailable');
    const assetClass = mapAssetTypeToClass(inst?.asset_type);

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
      current_price,
      currency: h.currency,
      data_source: h.data_source,
      as_of: h.as_of,
      price_updated_at,
      price_source,
      price_status,
      price_unavailability_reason,
      created_at: h.created_at,
      updated_at: h.updated_at,
      sector: inst?.sector || null,
      industry: inst?.industry || null,
      broker_account: broker
        ? {
            id: broker.id,
            user_id: broker.user_id,
            broker_name: broker.display_name || broker.broker_code,
            display_name: broker.display_name,
            account_label: broker.display_name,
            account_type: broker.account_type,
            color_hex: broker.color_hex || '#3B82F6',
            is_active: true,
            created_at: broker.created_at,
          }
        : undefined,
    };
  });

  return { holdings, userId: 'local_user', isCloud: false };
}

export async function GET() {
  return handleIntelligenceRequest();
}

export async function POST() {
  return handleIntelligenceRequest();
}

async function handleIntelligenceRequest() {
  const resolved = await resolveUserHoldings();
  if (resolved.error) {
    return NextResponse.json({ error: resolved.error.message }, { status: resolved.error.status });
  }

  const enrichedHoldings = resolved.holdings.map(enrichHolding);
  const summary = buildPortfolioSummary(enrichedHoldings);
  const assetAllocation = buildAssetAllocation(enrichedHoldings);
  const riskMetrics = buildRiskMetrics(enrichedHoldings);

  // Generate intelligence report
  const intelligence = await generatePortfolioIntelligence(
    summary,
    riskMetrics,
    assetAllocation,
    enrichedHoldings
  );

  return NextResponse.json({
    report: intelligence.report,
    riskMetrics,
    summary,
    assetAllocation,
    sectorAllocation: riskMetrics.sector_allocations,
    meta: {
      generated_at: new Date().toISOString(),
      cached: false,
      provider: intelligence.provider,
      model: intelligence.model,
      holdings_analyzed: enrichedHoldings.length,
      is_valuation_complete: riskMetrics.is_valuation_complete,
      quote_coverage_pct: riskMetrics.quote_coverage_pct,
      status: intelligence.status,
    },
  });
}
