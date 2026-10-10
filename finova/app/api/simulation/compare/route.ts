// ============================================================
// FINOVA — Portfolio Future Lab Simulation API Route
// app/api/simulation/compare/route.ts
//
// Calculates deterministic Before-versus-After portfolio scenario
// comparisons based strictly on the authenticated user's portfolio.
// ============================================================

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { enrichHolding } from '@/lib/calculations/portfolio';
import {
  runWhatIfSimulation,
  type WhatIfSimulationInput,
} from '@/lib/calculations/futureLab';
import { PortfolioStorage } from '@/lib/storage/portfolioStorage';
import { resolveQuotesForHoldings } from '@/lib/market/holdingQuoteResolver';
import { GoogleGenerativeAI } from '@google/generative-ai';
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

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const simulationInput: WhatIfSimulationInput = body.input || {
      scenarioType: 'TARGET_ALLOCATION',
      targetPercentages: {},
    };

    let holdings: Holding[] = [];
    let brokerAccounts: BrokerAccount[] = [];

    if (isSupabaseConfigured()) {
      const supabase = await createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json(
          { error: 'Authentication required to run portfolio simulations.' },
          { status: 401 }
        );
      }

      // Fetch brokers
      const { data: brokerRows } = await supabase
        .from('broker_accounts')
        .select('*')
        .eq('user_id', user.id);

      brokerAccounts = (brokerRows || []).map((b) => ({
        id: b.id,
        user_id: b.user_id,
        broker_name: b.broker_name || b.display_name || b.broker_code || 'Broker Account',
        account_label: b.account_label || null,
        account_type: (b.account_type as AccountType) || 'manual',
        color_hex: b.color_hex || '#3B82F6',
        created_at: b.created_at || new Date().toISOString(),
      }));

      // Fetch holdings
      const { data: rawHoldings, error: holdingsError } = await supabase
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
        .eq('user_id', user.id);

      if (holdingsError) {
        return NextResponse.json(
          { error: `Database error fetching holdings: ${holdingsError.message}` },
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
        };
      };

      const rawItems = (rawHoldings as unknown as RawHoldingItem[]) || [];
      const quotesMap = await resolveQuotesForHoldings(
        rawItems.map((r) => ({
          symbol: r.instrument?.symbol,
          exchange: r.instrument?.exchange,
        }))
      );

      holdings = rawItems.map((row) => {
        const inst = row.instrument;
        const broker = row.broker_account;
        const assetClass = mapAssetTypeToClass(inst?.asset_type);
        const sym = inst?.symbol ? inst.symbol.toUpperCase() : '';
        const quote = sym ? quotesMap.get(sym) : null;
        const hasValidQuote = Boolean(quote && quote.isValid && quote.price !== null && quote.price > 0);

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
          current_price: hasValidQuote ? quote!.price : null,
          currency: row.currency || 'INR',
          data_source: row.data_source || 'MANUAL',
          as_of: row.as_of || new Date().toISOString(),
          price_updated_at: hasValidQuote ? quote!.price_timestamp : null,
          price_source: hasValidQuote ? quote!.source : null,
          price_status: hasValidQuote ? quote!.status : (quote?.status || 'UNAVAILABLE'),
          price_unavailability_reason: hasValidQuote ? null : (quote?.rejectionReason || 'Price unavailable'),
          day_change: hasValidQuote ? quote!.day_change : null,
          day_change_pct: hasValidQuote ? quote!.day_change_pct : null,
          created_at: row.created_at,
          updated_at: row.updated_at,
          sector: inst?.sector || null,
          broker_account: broker
            ? {
                id: broker.id,
                user_id: broker.user_id,
                broker_name: broker.broker_name || broker.display_name || 'Broker',
                account_label: broker.display_name || null,
                account_type: (broker.account_type as AccountType) || 'manual',
                color_hex: broker.color_hex || '#3B82F6',
                created_at: broker.created_at || new Date().toISOString(),
              }
            : undefined,
        };
      });
    } else {
      // Local development fallback
      const localHoldings = PortfolioStorage.getHoldings();
      const localBrokers = PortfolioStorage.getBrokerAccounts();

      brokerAccounts = localBrokers.map((b) => ({
        id: b.id,
        user_id: b.user_id,
        broker_name: b.display_name || b.broker_code || 'Broker Account',
        account_label: b.display_name || null,
        account_type: (b.account_type as AccountType) || 'manual',
        color_hex: b.color_hex || '#3B82F6',
        created_at: b.created_at,
      }));

      holdings = localHoldings.map((h) => {
        const inst = PortfolioStorage.getInstrumentById(h.instrument_id);
        const priceRow = PortfolioStorage.getMarketPrice(inst?.symbol || '', false);
        return {
          id: h.id,
          user_id: h.user_id,
          broker_account_id: h.broker_account_id,
          instrument_id: h.instrument_id,
          symbol: inst?.symbol || 'UNKNOWN',
          isin: inst?.isin || null,
          name: inst?.instrument_name || inst?.symbol || 'Unknown Asset',
          asset_class: mapAssetTypeToClass(inst?.asset_type),
          exchange: (inst?.exchange as Exchange) || 'NSE',
          quantity: h.quantity,
          avg_buy_price: h.average_buy_price,
          average_buy_price: h.average_buy_price,
          current_price: priceRow ? priceRow.price : null,
          currency: h.currency,
          data_source: h.data_source,
          as_of: h.as_of,
          price_updated_at: null,
          price_source: null,
          price_status: priceRow ? 'DELAYED' : 'UNAVAILABLE',
          price_unavailability_reason: priceRow ? null : 'Price unavailable',
          created_at: h.created_at,
          updated_at: h.updated_at,
          sector: inst?.sector || null,
        };
      });
    }

    const enriched = holdings.map(enrichHolding);
    const simulationResult = runWhatIfSimulation(enriched, brokerAccounts, simulationInput);

    // Optional Gemini educational interpretation
    let aiExplanation: string | null = null;
    if (body.requestAiExplanation) {
      const hasApiKey =
        Boolean(process.env.GEMINI_API_KEY) &&
        !process.env.GEMINI_API_KEY?.includes('placeholder') &&
        !process.env.GEMINI_API_KEY?.includes('your_');

      if (hasApiKey) {
        try {
          const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
          const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

          const prompt = `You are the FINOVA Financial Decision Intelligence Assistant.
Analyze this hypothetical portfolio allocation simulation for an Indian retail investor:
- Baseline Valuation: ₹${simulationResult.baselineSummary.marketValuedCapital.toLocaleString('en-IN')}
- Simulated Valuation: ₹${simulationResult.simulatedSummary.totalSimulatedCapital.toLocaleString('en-IN')}
- Scenario Type: ${simulationResult.simulatedSummary.scenarioType}
- Equity Shift: ${simulationResult.metricComparisons.find((m) => m.metricName.includes('Equity'))?.currentValue} → ${simulationResult.metricComparisons.find((m) => m.metricName.includes('Equity'))?.simulatedValue}
- Fixed Income Shift: ${simulationResult.metricComparisons.find((m) => m.metricName.includes('Fixed Income'))?.currentValue} → ${simulationResult.metricComparisons.find((m) => m.metricName.includes('Fixed Income'))?.simulatedValue}

Rules:
1. Explain the risk/reward tradeoff in 3-4 clear educational sentences.
2. Emphasize that this is an illustrative simulation, not investment advice.
3. Highlight interest-rate and equity drawdown considerations.
4. Do NOT promise returns or predict future stock prices.`;

          const aiRes = await model.generateContent(prompt);
          aiExplanation = aiRes.response.text();
        } catch (aiErr) {
          console.warn('[API /api/simulation/compare] Gemini error, using deterministic takeaway:', aiErr);
        }
      }

      if (!aiExplanation) {
        aiExplanation = `${simulationResult.educationalScenarioSummary.description} ${simulationResult.educationalScenarioSummary.keyTakeaway}`;
      }
    }

    return NextResponse.json({
      success: true,
      data: simulationResult,
      aiExplanation,
    });
  } catch (err: unknown) {
    console.error('[API /api/simulation/compare POST] Exception:', err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'Failed to calculate portfolio simulation.',
      },
      { status: 400 }
    );
  }
}
