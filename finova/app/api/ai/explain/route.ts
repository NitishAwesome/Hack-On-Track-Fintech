// ============================================================
// FINOVA — Innovation Four: Gemini-Powered Financial Explanations
// app/api/ai/explain/route.ts
//
// Grounded educational explanations:
// - Deterministic context feeding (AI never invents metrics)
// - Supports investment categories & X-Ray/Risk questions
// - Strict input sanitization (strips prompt injections)
// - Server-side verified portfolio context (never trusts client financial metrics)
// - Resilient curated fallbacks when Gemini API key is absent or failing
// - Explicit SEBI educational disclaimer attached
// ============================================================

import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { sanitizeUntrustedInput } from '@/lib/ai/intelligenceEngine';
import { resolveServerPortfolioContext } from '@/lib/news/portfolioContextResolver';
import { consolidateUserHoldings, matchesSymbolOrCompany } from '@/lib/news/personalizationEngine';

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
  'news_article',
  'news_relevance',
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

  news_article: `Financial news affects investor sentiment and company fundamentals. FINOVA verifies article mentions against your actual tracked holdings to explain real portfolio exposure without predicting market movements.`,

  news_relevance: `Personalized news helps you identify developments directly concerning companies, sectors, or asset classes in your portfolio. Always review official regulatory filings on NSE/BSE before making investment decisions.`,

  custom: `FINOVA calculates your portfolio exposures deterministically to provide transparent, explainable insights across your tracked broker accounts. Always conduct independent research before making financial decisions.`,
};

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const rawTopic = typeof body.type === 'string' ? body.type.toLowerCase().trim() : 'custom';
    const topic: SupportedTopic = SUPPORTED_TOPICS.includes(rawTopic as SupportedTopic)
      ? (rawTopic as SupportedTopic)
      : 'custom';

    // 1. Resolve verified portfolio context server-side (NEVER blindly trust client numbers)
    const serverPortfolio = await resolveServerPortfolioContext();
    const consolidatedHoldings = consolidateUserHoldings(serverPortfolio);

    // Extract sanitized query and article context
    const customQuery = typeof body.query === 'string' ? sanitizeUntrustedInput(body.query) : '';
    const article = body.article || {};
    const articleTitle = typeof article.title === 'string' ? sanitizeUntrustedInput(article.title) : '';
    const articleSource = typeof article.source_name === 'string' ? sanitizeUntrustedInput(article.source_name) : 'Financial Media';
    const articlePubDate = typeof article.pubDate === 'string' ? article.pubDate : '';
    const articleDesc = typeof article.description === 'string' ? sanitizeUntrustedInput(article.description) : '';

    // Check if article matches any holding in user's verified portfolio
    let verifiedMatchedHolding: {
      symbol: string;
      name: string;
      weight_pct: number;
      sector: string | null;
      is_cross_broker: boolean;
      broker_names: string[];
    } | null = null;

    if (articleTitle || articleDesc) {
      const fullText = `${articleTitle} ${articleDesc}`;
      for (const item of consolidatedHoldings.values()) {
        if (matchesSymbolOrCompany(fullText, item.symbol, item.name, item.isin)) {
          if (!verifiedMatchedHolding || item.weight_pct > verifiedMatchedHolding.weight_pct) {
            verifiedMatchedHolding = {
              symbol: item.symbol,
              name: item.name,
              weight_pct: item.weight_pct,
              sector: item.sector,
              is_cross_broker: item.broker_names.length > 1,
              broker_names: item.broker_names,
            };
          }
        }
      }
    }

    // Server-verified concentration metrics for non-news queries
    let verifiedTopHoldingName = '';
    let verifiedTopHoldingWeight = 0;
    for (const item of consolidatedHoldings.values()) {
      if (item.weight_pct > verifiedTopHoldingWeight) {
        verifiedTopHoldingWeight = item.weight_pct;
        verifiedTopHoldingName = item.name;
      }
    }

    let verifiedCrossBrokerOverlapCount = 0;
    for (const item of consolidatedHoldings.values()) {
      if (item.broker_names.length > 1) {
        verifiedCrossBrokerOverlapCount++;
      }
    }

    const hasApiKey =
      Boolean(process.env.GEMINI_API_KEY) &&
      !process.env.GEMINI_API_KEY?.includes('placeholder') &&
      !process.env.GEMINI_API_KEY?.includes('your_');

    if (hasApiKey) {
      try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
        const candidateModels = [
          process.env.GEMINI_MODEL,
          'gemini-flash-lite-latest',
          'gemini-flash-latest',
          'gemini-3.8-flash',
          'gemini-2.5-flash-lite',
          'gemini-2.5-flash',
          'gemini-1.5-flash',
        ].filter(Boolean) as string[];

        let prompt = '';

        if (topic === 'news_article' || topic === 'news_relevance') {
          prompt = `You are FINOVA's AI News Intelligence Assistant explaining financial news to an Indian retail investor.
Strict Regulatory & Safety Rules:
1. Provide neutral, educational explanations grounded ONLY in the verified facts provided below.
2. NEVER give financial advice, buy/sell recommendations, or price targets.
3. NEVER predict stock market movements or claim guaranteed returns.
4. Keep the explanation under 3-4 clear, professional sentences.
5. Emphasize Indian financial context (SEBI, NSE/BSE, RBI).

Verified Article Context:
- Headline: "${articleTitle}"
- Publisher: ${articleSource}
- Publication Date: ${articlePubDate}
- Excerpt: "${articleDesc.slice(0, 300)}"

Verified Investor Portfolio Context:
${
  verifiedMatchedHolding
    ? `- Directly Held Security: ${verifiedMatchedHolding.name} (${verifiedMatchedHolding.symbol})
- Verified Portfolio Weight: ${verifiedMatchedHolding.weight_pct}% of investor's capital
- Sector: ${verifiedMatchedHolding.sector || 'Classified equity'}
- Multi-Broker Status: ${
        verifiedMatchedHolding.is_cross_broker
          ? `Held across ${verifiedMatchedHolding.broker_names.length} broker accounts (${verifiedMatchedHolding.broker_names.join(', ')})`
          : 'Held in single broker account'
      }`
    : `- Holding Association: No direct verified security match in investor's tracked portfolio. (General market news)`
}

${customQuery ? `User Question: "${customQuery}"` : 'Explain: What is this story about, why does it matter to an investor, and what should they research further?'}

Deliver a concise, educational, structured explanation.`;
        } else {
          prompt = `You are the FINOVA AI Financial Intelligence Assistant, explaining investment and portfolio concepts to an Indian retail investor.
Strict Rules:
1. Provide neutral, educational explanations suitable for beginners.
2. NEVER give financial advice, buy/sell recommendations, or price targets.
3. NEVER invent or fabricate portfolio metrics or market returns.
4. Keep the explanation under 4-5 clear sentences.
5. Emphasize Indian market context (SEBI, NSE/BSE, RBI, G-Secs, REITs, InvITs).

Topic: ${topic}
${customQuery ? `User Question: "${customQuery}"` : ''}
${verifiedTopHoldingName ? `Verified Context: Top Holding is ${verifiedTopHoldingName} representing ${verifiedTopHoldingWeight}% of valued assets.` : ''}
${verifiedCrossBrokerOverlapCount > 0 ? `Verified Context: User holds ${verifiedCrossBrokerOverlapCount} overlapping instruments across multiple brokers.` : ''}

Deliver a concise, educational, structured explanation.`;
        }

        let text = '';
        let successfulModel = '';

        for (const mName of candidateModels) {
          try {
            const model = genAI.getGenerativeModel({ model: mName });
            const result = await model.generateContent(prompt);
            const candidateText = result.response.text();
            if (candidateText && candidateText.trim().length > 0) {
              text = candidateText.trim();
              successfulModel = mName;
              break;
            }
          } catch {
            // Try next candidate model
          }
        }

        if (!text) {
          throw new Error('All candidate Gemini models failed to generate content.');
        }

        return NextResponse.json({
          success: true,
          type: topic,
          explanation: text,
          model: successfulModel,
          grounded_context: {
            article_title: articleTitle,
            publisher: articleSource,
            matched_symbol: verifiedMatchedHolding?.symbol || null,
            verified_portfolio_weight: verifiedMatchedHolding?.weight_pct || null,
            verified_sector: verifiedMatchedHolding?.sector || null,
            is_held_in_portfolio: Boolean(verifiedMatchedHolding),
          },
          source: 'gemini',
          disclaimer:
            'AI-generated educational explanation based on verified server portfolio context. Not SEBI-registered financial advice.',
        });
      } catch (aiErr) {
        console.warn('[API /api/ai/explain] Gemini error, falling back to curated answer:', aiErr);
      }
    }

    // Curated deterministic fallback
    let fallbackText = CURATED_EXPLANATIONS[topic] || CURATED_EXPLANATIONS.custom;

    if (topic === 'news_article' || topic === 'news_relevance') {
      if (verifiedMatchedHolding) {
        fallbackText = `This article directly mentions ${verifiedMatchedHolding.name} (${verifiedMatchedHolding.symbol}), which represents approximately ${verifiedMatchedHolding.weight_pct}% of your tracked portfolio. Consider reviewing official exchange disclosures on NSE/BSE to evaluate the business impact.`;
      } else {
        fallbackText = `This story covers general Indian market developments. While it does not directly match any individual security in your tracked portfolio, broader regulatory or interest rate changes can impact general market sentiment.`;
      }
    } else if (topic === 'concentration' && verifiedTopHoldingName) {
      fallbackText = `Your largest holding, ${verifiedTopHoldingName}, accounts for ${verifiedTopHoldingWeight}% of your valued portfolio. ${fallbackText}`;
    } else if (topic === 'cross_broker_overlap' && verifiedCrossBrokerOverlapCount > 0) {
      fallbackText = `You have ${verifiedCrossBrokerOverlapCount} instrument(s) held in more than one broker account. ${fallbackText}`;
    }

    return NextResponse.json({
      success: true,
      type: topic,
      explanation: fallbackText,
      grounded_context: {
        article_title: articleTitle,
        publisher: articleSource,
        matched_symbol: verifiedMatchedHolding?.symbol || null,
        verified_portfolio_weight: verifiedMatchedHolding?.weight_pct || null,
        verified_sector: verifiedMatchedHolding?.sector || null,
        is_held_in_portfolio: Boolean(verifiedMatchedHolding),
      },
      source: 'deterministic_fallback',
      disclaimer: 'Curated financial educational explanation based on deterministic portfolio figures. Not financial advice.',
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
