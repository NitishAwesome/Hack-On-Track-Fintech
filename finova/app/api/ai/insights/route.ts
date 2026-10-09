import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { generatePortfolioHash } from '@/lib/utils';
import { enrichHolding, buildPortfolioSummary, buildAssetAllocation } from '@/lib/calculations/portfolio';
import { buildRiskMetrics } from '@/lib/calculations/risk';
import { DEMO_HOLDINGS } from '@/lib/demoData';
import type { Holding, HoldingWithMetrics } from '@/types/portfolio';

const CACHE_TTL_HOURS = 4;

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
  return `Your portfolio reflects strong capital deployment with an overall return of ${returnPctText} across ${summary.broker_count} broker accounts. With ${summary.holding_count} holdings spanning ${allocationSummary}, your asset mix provides both growth potential and defensive characteristics. Consider rebalancing periodically to keep your risk within target tolerance.`;
}

// POST /api/ai/insights — generate AI portfolio insights
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { insight_type = 'portfolio_summary' } = await request.json().catch(() => ({}));

  let holdings: HoldingWithMetrics[];

  if (!user) {
    holdings = DEMO_HOLDINGS.map(enrichHolding);
  } else {
    const { data: rawHoldings } = await supabase
      .from('holdings')
      .select(`*, broker_account:broker_accounts(*)`)
      .eq('user_id', user.id);

    if (!rawHoldings || rawHoldings.length === 0) {
      return NextResponse.json({
        insight: {
          insight_type,
          text: 'Add holdings or import a CSV to generate personalized AI portfolio insights.',
          generated_at: new Date().toISOString(),
          cached: false,
        },
      });
    }
    holdings = (rawHoldings as Holding[]).map(enrichHolding);
  }

  const portfolioHash = generatePortfolioHash(
    holdings.map((h) => ({ id: h.id, current_price: h.current_price, quantity: h.quantity }))
  );

  // Check cache if user is logged in
  if (user) {
    const { data: cached } = await supabase
      .from('ai_insight_cache')
      .select('*')
      .eq('user_id', user.id)
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
        },
      });
    }
  }

  // Build metrics for prompt (NO personal identifiers)
  const summary = buildPortfolioSummary(holdings);
  const assetAllocation = buildAssetAllocation(holdings);
  const riskMetrics = buildRiskMetrics(holdings);

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

In 3-4 sentences, explain whether this portfolio is well-diversified and why.
Specifically mention REITs, InvITs, or bonds if they are underrepresented.
No specific stock names. No buy/sell advice. Clear, educational tone.`,

    risk_analysis: `You are a financial educator explaining portfolio risk to an Indian retail investor.
Risk Score: ${riskMetrics.risk_score}/100 (${riskMetrics.risk_label})
Concentration (HHI): ${riskMetrics.hhi.toFixed(3)}
Top holding weight: ${(riskMetrics.top_holding_weight * 100).toFixed(1)}%
Equity weight: ${(riskMetrics.equity_weight * 100).toFixed(1)}%
${riskMetrics.concentration_warnings.length > 0 ? 'Warnings: ' + riskMetrics.concentration_warnings.join('; ') : ''}

In 3-4 sentences, explain this risk profile in plain language.
Suggest 1 specific action to improve risk profile (e.g. diversify, rebalance).
No specific stock names. Educational tone.`,
  };

  const prompt = prompts[insight_type] || prompts.portfolio_summary;

  // If Gemini API Key is available, invoke Gemini 1.5 Flash
  if (process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes('your_')) {
    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent(prompt);
      const text = result.response.text();

      if (user) {
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + CACHE_TTL_HOURS);

        await supabase.from('ai_insight_cache').upsert({
          user_id: user.id,
          insight_type,
          portfolio_hash: portfolioHash,
          insight_text: text,
          expires_at: expiresAt.toISOString(),
        });
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

  // Fallback to high-quality algorithmic financial educator insight
  const fallbackText = generateRuleBasedInsight(insight_type, summary, allocationSummary, riskMetrics);
  return NextResponse.json({
    insight: {
      insight_type,
      text: fallbackText,
      generated_at: new Date().toISOString(),
      cached: false,
      model: 'Finova Intelligence Engine',
    },
  });
}
