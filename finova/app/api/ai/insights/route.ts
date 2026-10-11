// ============================================================
// FINOVA — AI Insights API Endpoint
// POST /api/ai/insights
// Strictly adheres to Prompt 8:
// - Server-side authentication and strict user ownership
// - Never accepts arbitrary user IDs
// - Handles rate limits, missing keys, and provider errors
// - Input validation & constrained prompt payload
// ============================================================

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { generatePortfolioHash } from '@/lib/utils';
import { enrichHolding, buildPortfolioSummary, buildAssetAllocation } from '@/lib/calculations/portfolio';
import { buildRiskMetrics } from '@/lib/calculations/risk';
import { PortfolioStorage } from '@/lib/storage/portfolioStorage';
import { resolveQuotesForHoldings } from '@/lib/market/holdingQuoteResolver';
import {
  generatePortfolioIntelligence,
  sanitizeUntrustedInput,
} from '@/lib/ai/intelligenceEngine';
import type { Holding, HoldingWithMetrics, AssetClass, Exchange, AccountType } from '@/types/portfolio';

const CACHE_TTL_HOURS = 4;

function mapAssetTypeToClass(assetType?: string): AssetClass {
  if (assetType === 'STOCK') return 'equity';
  if (assetType === 'MUTUAL_FUND') return 'mf';
  if (assetType === 'REIT') return 'reit';
  if (assetType === 'INVIT') return 'invit';
  if (assetType === 'BOND') return 'bond';
  return 'equity';
}

function generateRuleBasedInsight(
  type: string,
  summary: ReturnType<typeof buildPortfolioSummary>,
  allocationSummary: string,
  riskMetrics: ReturnType<typeof buildRiskMetrics>
): string {
  if (type === 'diversification_advice') {
    return `Your unified portfolio is distributed across: ${allocationSummary}. Having exposure to alternatives such as REITs, InvITs, and Government Bonds adds steady distribution yields and dampens overall market volatility. Consider reviewing your equity vs fixed-income ratio semi-annually to stay aligned with your long-term wealth goals.`;
  }
  if (type === 'risk_analysis') {
    const warningText =
      riskMetrics.concentration_warnings.length > 0
        ? ` Note: ${riskMetrics.concentration_warnings[0]}`
        : ' Your holdings are well-balanced across multiple instruments.';
    return `Your risk score sits at ${riskMetrics.risk_score}/100 (${riskMetrics.risk_label}) with an HHI concentration score of ${riskMetrics.hhi.toFixed(2)}.${warningText} Spreading investments across multiple brokers and depositories effectively mitigates counterparty and operational risk.`;
  }
  const returnPctText =
    summary.total_absolute_return_pct !== null
      ? `${summary.total_absolute_return_pct >= 0 ? '+' : ''}${summary.total_absolute_return_pct.toFixed(1)}%`
      : 'unavailable';
  return `Your portfolio reflects capital deployment with an overall return of ${returnPctText} across ${summary.broker_count} broker accounts. With ${summary.holding_count} holdings spanning ${allocationSummary}, your asset mix provides both growth potential and defensive characteristics. Consider rebalancing periodically to keep your risk within target tolerance.`;
}

// POST /api/ai/insights — generate AI portfolio insights
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const insight_type = typeof body?.insight_type === 'string' ? sanitizeUntrustedInput(body.insight_type, 30) : 'portfolio_summary';

  let holdings: HoldingWithMetrics[] = [];
  let userId: string | null = null;

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json(
          { error: 'Authentication required. Please sign in to generate portfolio insights.' },
          { status: 401 }
        );
      }

      userId = user.id;

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
        .eq('user_id', user.id) // Enforce user isolation
        .gt('quantity', 0)
        .order('created_at', { ascending: false });

      if (error) {
        return NextResponse.json(
          { error: 'Database error: failed to fetch user holdings.' },
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

      const quotesMap = await resolveQuotesForHoldings(
        ((rawHoldings as unknown as RawHoldingItem[]) || []).map((r) => ({
          symbol: r.instrument?.symbol,
          exchange: r.instrument?.exchange,
        }))
      );

      const mapped: Holding[] = ((rawHoldings as unknown as RawHoldingItem[]) || []).map((row) => {
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

      holdings = mapped.map(enrichHolding);
    } catch {
      return NextResponse.json(
        { error: 'Unable to connect to database service.' },
        { status: 500 }
      );
    }
  } else {
    // Local storage mode
    const rawHoldings = PortfolioStorage.getHoldings().filter((h) => Number(h.quantity) > 0);
    const brokers = PortfolioStorage.getBrokerAccounts();

    if (rawHoldings.length === 0) {
      holdings = [];
    } else {
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

      const mapped: Holding[] = holdingsWithInst.map(({ holding: h, inst }) => {
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
      holdings = mapped.map(enrichHolding);
    }
  }

  if (holdings.length === 0) {
    return NextResponse.json({
      insight: {
        insight_type,
        text: 'Add holdings or import a CSV to generate personalized AI portfolio insights.',
        generated_at: new Date().toISOString(),
        cached: false,
        model: 'Finova Intelligence Engine',
      },
    });
  }

  // Comprehensive intelligence handler
  if (insight_type === 'comprehensive_intelligence') {
    const summary = buildPortfolioSummary(holdings);
    const assetAllocation = buildAssetAllocation(holdings);
    const riskMetrics = buildRiskMetrics(holdings);

    const intelligence = await generatePortfolioIntelligence(
      summary,
      riskMetrics,
      assetAllocation,
      holdings
    );

    return NextResponse.json({
      insight: {
        insight_type,
        text: intelligence.report.summary.health_assessment,
        generated_at: new Date().toISOString(),
        cached: false,
        model: intelligence.model,
      },
      report: intelligence.report,
      riskMetrics,
      summary,
      assetAllocation,
    });
  }

  // Standard insight types: portfolio_summary, diversification_advice, risk_analysis
  const summary = buildPortfolioSummary(holdings);
  const assetAllocation = buildAssetAllocation(holdings);
  const riskMetrics = buildRiskMetrics(holdings);

  const portfolioHash = generatePortfolioHash(
    holdings.map((h) => ({ id: h.id, current_price: h.current_price, quantity: h.quantity }))
  );

  // Check cache if user is logged in via Supabase
  if (userId) {
    try {
      const supabase = await createClient();
      const { data: cached } = await supabase
        .from('ai_insight_cache')
        .select('*')
        .eq('user_id', userId)
        .eq('insight_type', insight_type)
        .eq('portfolio_hash', portfolioHash)
        .gte('expires_at', new Date().toISOString())
        .single();

      if (cached) {
        return NextResponse.json({
          insight: {
            insight_type,
            text: cached.insight_text,
            generated_at: cached.created_at,
            cached: true,
            model: 'Gemini 1.5 Flash (Cached)',
          },
        });
      }
    } catch {
      // cache check non-blocking
    }
  }

  const allocationSummary = assetAllocation
    .map((a) => `${a.asset_class}: ${a.percentage.toFixed(1)}%`)
    .join(', ');

  const prompts: Record<string, string> = {
    portfolio_summary: `You are a friendly, professional financial educator for Indian retail investors.
The user has a portfolio with the following aggregated metrics (no personal identifiers):

Total Portfolio Value: ${summary.total_current_value !== null ? `₹${summary.total_current_value.toFixed(0)}` : 'Unavailable'}
Total Invested: ₹${summary.total_invested_value.toFixed(0)}
Overall Return: ${summary.total_absolute_return_pct !== null ? `${summary.total_absolute_return_pct.toFixed(2)}%` : 'Unavailable'}
Asset Allocation: ${allocationSummary}
Number of holdings: ${summary.holding_count}
Number of brokers/accounts: ${summary.broker_count}
Quote Coverage: ${riskMetrics.quote_coverage_pct}%
Risk Score: ${riskMetrics.risk_score}/100 (${riskMetrics.risk_label})

In 3-4 concise, warm sentences, give a professional portfolio health summary. 
Do NOT give specific buy/sell advice. Do NOT mention specific stock names.
Use simple language an Indian retail investor would appreciate.
End with one clear, actionable suggestion.`,

    diversification_advice: `You are a professional financial educator for Indian retail investors.
Portfolio snapshot (no personal data):
Asset Allocation: ${allocationSummary}
Holdings count: ${summary.holding_count}
Broker count: ${summary.broker_count}
Equity weight: ${(riskMetrics.equity_weight * 100).toFixed(1)}%
Top 5 concentration: ${(riskMetrics.top_five_holding_weight * 100).toFixed(1)}%

In 3-4 sentences, explain whether this portfolio is well-diversified and why.
Specifically mention REITs, InvITs, or bonds if they are underrepresented.
No specific stock names. No buy/sell advice. Clear, educational tone.`,

    risk_analysis: `You are a financial educator explaining portfolio risk to an Indian retail investor.
Risk Score: ${riskMetrics.risk_score}/100 (${riskMetrics.risk_label})
Concentration (HHI): ${riskMetrics.hhi.toFixed(3)}
Top holding weight: ${(riskMetrics.top_holding_weight * 100).toFixed(1)}%
Top 5 holdings weight: ${(riskMetrics.top_five_holding_weight * 100).toFixed(1)}%
Equity weight: ${(riskMetrics.equity_weight * 100).toFixed(1)}%
Quote coverage: ${riskMetrics.quote_coverage_pct}%
${riskMetrics.concentration_warnings.length > 0 ? 'Warnings: ' + riskMetrics.concentration_warnings.join('; ') : ''}

In 3-4 sentences, explain this risk profile in plain language.
Suggest 1 specific action to investigate (e.g. diversify, rebalance, address unquoted assets).
No specific stock names. Educational tone.`,
  };

  const prompt = prompts[insight_type] || prompts.portfolio_summary;

  // Invoke Gemini if key is available
  if (process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes('your_')) {
    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const candidateModels = [
        process.env.GEMINI_MODEL,
        'gemini-flash-lite-latest',
        'gemini-flash-latest',
        'gemini-3.8-flash',
        'gemini-2.5-flash-lite',
        'gemini-2.5-flash',
        'gemini-1.5-flash',
      ].filter(Boolean) as string[];

      let text = '';
      for (const mName of candidateModels) {
        try {
          const model = genAI.getGenerativeModel({ model: mName });
          const result = await model.generateContent(prompt);
          const candidateText = result.response.text();
          if (candidateText && candidateText.trim().length > 0) {
            text = candidateText.trim();
            break;
          }
        } catch {
          // Try next model
        }
      }

      if (!text) {
        throw new Error('All candidate Gemini models failed to generate content.');
      }

      if (userId) {
        try {
          const supabase = await createClient();
          const expiresAt = new Date();
          expiresAt.setHours(expiresAt.getHours() + CACHE_TTL_HOURS);

          await supabase.from('ai_insight_cache').upsert({
            user_id: userId,
            insight_type,
            portfolio_hash: portfolioHash,
            insight_text: text,
            expires_at: expiresAt.toISOString(),
          });
        } catch {
          // non-blocking
        }
      }

      return NextResponse.json({
        insight: {
          insight_type,
          text,
          generated_at: new Date().toISOString(),
          cached: false,
          model: 'Gemini 1.5 Flash',
        },
      });
    } catch (err) {
      console.warn('Gemini error, using algorithmic financial educator fallback:', err);
    }
  }

  // Fallback to high-quality algorithmic insight
  const fallbackText = generateRuleBasedInsight(insight_type, summary, allocationSummary, riskMetrics);
  return NextResponse.json({
    insight: {
      insight_type,
      text: fallbackText,
      generated_at: new Date().toISOString(),
      cached: false,
      model: 'Finova Deterministic Intelligence Engine',
    },
  });
}
