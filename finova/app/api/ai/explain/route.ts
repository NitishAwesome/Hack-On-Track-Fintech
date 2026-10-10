// ============================================================
// FINOVA — Innovation Four: Gemini-Powered Financial Explanations
// app/api/ai/explain/route.ts
//
// Grounded educational explanations:
// - Deterministic context feeding (AI never invents metrics)
// - Supports investment categories & X-Ray/Risk questions
// - Strict input sanitization (strips prompt injections)
// - Resilient curated fallbacks when Gemini API key is absent or failing
// - Explicit SEBI educational disclaimer attached
// ============================================================

import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { sanitizeUntrustedInput } from '@/lib/ai/intelligenceEngine';

const SUPPORTED_TOPICS = [
  'equity',
  'reit',
  'invit',
  'bond',
  'concentration',
  'cross_broker_overlap',
  'asset_allocation',
  'reit_vs_invit',
  'incomplete_valuation',
  'custom',
] as const;

type SupportedTopic = typeof SUPPORTED_TOPICS[number];

const CURATED_EXPLANATIONS: Record<SupportedTopic, string> = {
  equity: `Equities represent direct fractional ownership in listed enterprises (such as Reliance or TCS). Investors participate in wealth creation via share price appreciation and quarterly/annual cash dividends. While equities offer long-term inflation-beating growth, they experience significant market volatility and economic cyclicality, making multi-asset diversification essential.`,

  reit: `Real Estate Investment Trusts (REITs) like Embassy Office Parks and Mindspace pool capital to own Grade-A commercial office parks, malls, and tech hubs. Under SEBI regulations, REITs must distribute at least 90% of Net Distributable Cash Flows (NDCF) to unitholders, offering regular rental yields. However, distributions are variable and sensitive to tenant vacancies and interest rate cycles.`,

  invit: `Infrastructure Investment Trusts (InvITs) like POWERGRID InvIT hold revenue-generating national infrastructure assets (power grids, toll highways, fiber lines). Regulated by SEBI, they distribute >=90% of net cash flows as dividends, interest, and capital repayments. Unlike perpetual real estate land, many concession assets amortize toward zero as the government concession period ends.`,

  bond: `Bonds are debt instruments where you lend capital to the Government (G-Secs) or corporations in exchange for contractually fixed coupon interest and full principal repayment at maturity. Bond market prices have an inverse relationship with interest rates: when benchmark interest rates rise, existing bond prices decline. Government bonds carry sovereign safety, while corporate debentures carry credit default risk.`,

  concentration: `Portfolio concentration occurs when a large portion of your capital is invested in a single company, sector, or top few holdings. In modern portfolio theory, high concentration magnifies idiosyncratic (company-specific) risk without guaranteeing superior returns. A diversified allocation across uncorrelated assets cushions drawdowns when individual companies face headwinds.`,

  cross_broker_overlap: `Cross-broker overlap happens when you hold shares of the exact same security (such as RELIANCE or HDFCBANK) across separate broker accounts (like Zerodha and Groww). While using multiple broker apps may feel diverse, your underlying risk remains concentrated in the exact same business entity. Consolidating your view helps eliminate duplicate tracking and reveals your true aggregate exposure.`,

  asset_allocation: `Asset allocation is the deliberate distribution of wealth across distinct asset classes (Equities, Fixed Income, Gold, REITs/InvITs). Asset allocation accounts for the vast majority of long-term return variability. Holding uncorrelated assets dampens overall portfolio drawdown volatility because different asset classes react differently to inflation and interest rate cycles.`,

  reit_vs_invit: `While both REITs and InvITs are SEBI-regulated trusts paying >=90% of cash flows, they differ fundamentally in asset nature and lifespan. REITs hold commercial real estate (offices/malls) with perpetual land ownership and rental escalations. InvITs hold utility and infrastructure assets (toll roads/grids) often governed by finite government concessions (15–30 years), where asset value amortizes over time.`,

  incomplete_valuation: `FINOVA strictly refuses to fabricate market prices or substitute purchase cost as market value. When a security lacks a reliable active market quote, its market value is marked as unavailable. Concentration metrics and market values are honestly calculated using only verified quotes to prevent misleading risk calculations.`,

  custom: `FINOVA calculates your portfolio exposures deterministically to provide transparent, explainable insights across your tracked broker accounts. Always conduct independent research before making financial decisions.`,
};

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const rawTopic = typeof body.type === 'string' ? body.type.toLowerCase().trim() : 'custom';
    const topic: SupportedTopic = SUPPORTED_TOPICS.includes(rawTopic as SupportedTopic)
      ? (rawTopic as SupportedTopic)
      : 'custom';

    // Extract optional deterministic context provided by client
    const context = body.context || {};
    const customQuery = typeof body.query === 'string' ? sanitizeUntrustedInput(body.query) : '';

    const hasApiKey =
      Boolean(process.env.GEMINI_API_KEY) &&
      !process.env.GEMINI_API_KEY?.includes('placeholder') &&
      !process.env.GEMINI_API_KEY?.includes('your_');

    if (hasApiKey) {
      try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const prompt = `You are the FINOVA AI Financial Intelligence Assistant, explaining investment and portfolio concepts to an Indian retail investor.
Strict Rules:
1. Provide neutral, educational explanations suitable for beginners.
2. NEVER give financial advice, buy/sell recommendations, or price targets.
3. NEVER invent or fabricate portfolio metrics or market returns.
4. Keep the explanation under 4-5 clear sentences.
5. Emphasize Indian market context (SEBI, NSE/BSE, RBI, G-Secs, REITs, InvITs).

Topic: ${topic}
${customQuery ? `User Question: "${customQuery}"` : ''}
${context.topHoldingName ? `Deterministic Context: Top Holding is ${context.topHoldingName} representing ${context.topHoldingWeight || 'a significant'}% of valued assets.` : ''}
${context.overlapCount ? `Deterministic Context: User holds ${context.overlapCount} overlapping instruments across multiple brokers totaling ${context.overlapValue || 'significant'} capital.` : ''}
${context.unquotedCount ? `Deterministic Context: Portfolio has ${context.unquotedCount} unquoted positions with ${context.quoteCoveragePct || 0}% price coverage.` : ''}

Deliver a concise, educational, structured explanation.`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();

        return NextResponse.json({
          success: true,
          type: topic,
          explanation: text,
          source: 'gemini',
          disclaimer:
            'AI-generated educational explanation based on deterministic portfolio figures. Not SEBI-registered financial advice.',
        });
      } catch (aiErr) {
        console.warn('[API /api/ai/explain] Gemini error, falling back to curated answer:', aiErr);
      }
    }

    // Curated deterministic fallback
    let fallbackText = CURATED_EXPLANATIONS[topic] || CURATED_EXPLANATIONS.custom;

    if (topic === 'concentration' && context.topHoldingName && context.topHoldingWeight) {
      fallbackText = `Your largest holding, ${context.topHoldingName}, accounts for ${context.topHoldingWeight}% of your valued portfolio. ${fallbackText}`;
    } else if (topic === 'cross_broker_overlap' && context.overlapCount) {
      fallbackText = `You have ${context.overlapCount} instrument(s) held in more than one broker account. ${fallbackText}`;
    } else if (topic === 'incomplete_valuation' && context.unquotedCount) {
      fallbackText = `${context.unquotedCount} of your positions currently lack active market prices (${context.quoteCoveragePct || 0}% coverage). ${fallbackText}`;
    }

    return NextResponse.json({
      success: true,
      type: topic,
      explanation: fallbackText,
      source: 'curated_deterministic',
      disclaimer: 'Curated financial educational explanation. Not financial advice.',
    });
  } catch (err: unknown) {
    console.error('[API /api/ai/explain] Exception:', err);
    return NextResponse.json(
      {
        success: false,
        explanation: 'Failed to generate explanation. Please try again.',
        source: 'error_fallback',
      },
      { status: 500 }
    );
  }
}
