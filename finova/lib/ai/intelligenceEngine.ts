// ============================================================
// FINOVA — AI Portfolio Intelligence Engine
// Google Gemini 1.5 Flash Integration & Schema-Validated Diagnostics
// Strictly adheres to Prompt 8:
// - Server-side only GEMINI_API_KEY
// - Untrusted input sanitization (zero PII/credentials sent)
// - Schema validation of AI responses
// - Deterministic algorithmic fallback when Gemini is unavailable
// - Non-advisory financial education compliance
// ============================================================

import { GoogleGenerativeAI } from '@google/generative-ai';
import type {
  PortfolioSummary,
  RiskMetrics,
  AssetAllocation,
  HoldingWithMetrics,
  AIIntelligenceReport,
} from '../../types/portfolio';
import { formatCurrencySafe } from '../utils.ts';

export const EDUCATIONAL_DISCLAIMER =
  'FINOVA is a financial education and portfolio tracking platform, not a SEBI-registered investment adviser. Insights and observations are generated using deterministic financial calculations augmented by external AI processing (Google Gemini) for educational and informational purposes only, and do not constitute personalized financial advice or recommendations to buy, sell, or hold any security.';

/**
 * Sanitize untrusted input strings before including in AI prompts.
 * Strips control characters, injection phrases, and caps length.
 */
export function sanitizeUntrustedInput(val: unknown, maxLen = 80): string {
  if (typeof val !== 'string') return '';
  return val
    .replace(/[^\w\s.,&%()/-]/gi, '')
    .replace(/\b(ignore\s+(all\s+)?(previous\s+)?instructions?|system\s+prompt|delete|drop\s+table)\b/gi, '')
    .trim()
    .slice(0, maxLen);
}

/**
 * Validate that an object strictly adheres to AIIntelligenceReport schema.
 */
export function validateIntelligenceReport(data: unknown): AIIntelligenceReport | null {
  if (!data || typeof data !== 'object') return null;
  const obj = data as Record<string, unknown>;

  const summary = obj.summary as Record<string, unknown> | undefined;
  if (!summary || typeof summary !== 'object') return null;
  if (typeof summary.headline !== 'string' || !summary.headline.trim()) return null;
  if (typeof summary.health_assessment !== 'string' || !summary.health_assessment.trim()) return null;
  if (typeof summary.significance !== 'string' || !summary.significance.trim()) return null;
  if (!Array.isArray(summary.key_drivers)) return null;
  if (!Array.isArray(summary.investigation_steps)) return null;

  const divAnalysis = obj.diversification_analysis as Record<string, unknown> | undefined;
  if (!divAnalysis || typeof divAnalysis !== 'object') return null;
  const status = divAnalysis.status;
  if (
    status !== 'well_diversified' &&
    status !== 'moderately_concentrated' &&
    status !== 'highly_concentrated'
  ) {
    return null;
  }
  if (!Array.isArray(divAnalysis.observations)) return null;
  if (!Array.isArray(divAnalysis.actionable_considerations)) return null;

  const riskObs = obj.risk_observations as Record<string, unknown> | undefined;
  if (!riskObs || typeof riskObs !== 'object') return null;
  if (!Array.isArray(riskObs.concerns) || !Array.isArray(riskObs.positives)) return null;

  if (!Array.isArray(obj.data_limitations)) return null;

  return {
    summary: {
      headline: summary.headline.trim(),
      health_assessment: summary.health_assessment.trim(),
      significance: summary.significance.trim(),
      key_drivers: summary.key_drivers.map((s) => String(s).trim()).filter(Boolean),
      investigation_steps: summary.investigation_steps.map((s) => String(s).trim()).filter(Boolean),
    },
    diversification_analysis: {
      status,
      observations: divAnalysis.observations.map((s) => String(s).trim()).filter(Boolean),
      actionable_considerations: divAnalysis.actionable_considerations
        .map((s) => String(s).trim())
        .filter(Boolean),
    },
    risk_observations: {
      concerns: riskObs.concerns.map((s) => String(s).trim()).filter(Boolean),
      positives: riskObs.positives.map((s) => String(s).trim()).filter(Boolean),
    },
    data_limitations: (obj.data_limitations as unknown[]).map((s) => String(s).trim()).filter(Boolean),
    educational_disclaimer:
      typeof obj.educational_disclaimer === 'string' && obj.educational_disclaimer.trim()
        ? obj.educational_disclaimer.trim()
        : EDUCATIONAL_DISCLAIMER,
  };
}

/**
 * Generate a deterministic, rule-based portfolio intelligence report
 * used when Gemini is unconfigured, rate-limited, or unavailable.
 * Guarantees zero fabrication while maintaining the identical TypeScript schema.
 */
export function generateAlgorithmicIntelligenceReport(
  summary: PortfolioSummary,
  riskMetrics: RiskMetrics,
  allocations: AssetAllocation[],
  holdings: HoldingWithMetrics[]
): AIIntelligenceReport {
  if (holdings.length === 0) {
    return {
      summary: {
        headline: 'Portfolio Empty — Ready for Initial Ingestion',
        health_assessment:
          'Your Finova portfolio currently contains zero active investment positions.',
        significance:
          'Portfolio intelligence diagnostics require recorded positions across equities, fixed income, REITs, or InvITs.',
        key_drivers: ['No positions recorded.'],
        investigation_steps: [
          'Add your initial positions manually or upload a broker statement via CSV.',
          'Connect or declare your Demat and trading accounts.',
        ],
      },
      diversification_analysis: {
        status: 'well_diversified',
        observations: ['No concentration risks present in an empty portfolio.'],
        actionable_considerations: ['Import holdings to evaluate asset and sector distribution.'],
      },
      risk_observations: {
        concerns: ['Zero asset deployment recorded.'],
        positives: ['Ready for structured multi-asset portfolio setup.'],
      },
      data_limitations: ['Empty portfolio state.'],
      educational_disclaimer: EDUCATIONAL_DISCLAIMER,
    };
  }

  // 1. Health assessment & Headline
  const isPositiveReturn =
    summary.total_absolute_return !== null && summary.total_absolute_return >= 0;
  const returnStr =
    summary.total_absolute_return_pct !== null
      ? `${isPositiveReturn ? '+' : ''}${summary.total_absolute_return_pct.toFixed(1)}%`
      : 'valuation pending';

  const headline = `Portfolio Risk Profile: ${riskMetrics.risk_label} (Score ${riskMetrics.risk_score}/100)`;
  const healthAssessment = `Deployed capital of ${formatCurrencySafe(
    summary.total_invested_value
  )} across ${summary.holding_count} positions and ${summary.broker_count} broker account(s), reflecting an overall return of ${returnStr}.`;

  const significance =
    riskMetrics.risk_label === 'Aggressive'
      ? 'High portfolio sensitivity to market drawdowns driven by heavy concentration in equities or top positions.'
      : riskMetrics.risk_label === 'Moderate'
      ? 'Balanced exposure with moderate cyclical sensitivity and adequate defensive or multi-broker diversification.'
      : 'Defensive asset construction prioritizing capital stability and regular cash distributions.';

  // 2. Key drivers
  const keyDrivers: string[] = [];
  if (riskMetrics.top_holding_name && riskMetrics.top_holding_weight > 0) {
    keyDrivers.push(
      `Largest holding ${riskMetrics.top_holding_name} represents ${(
        riskMetrics.top_holding_weight * 100
      ).toFixed(1)}% of total valuation.`
    );
  }
  keyDrivers.push(
    `Top 5 positions comprise ${(riskMetrics.top_five_holding_weight * 100).toFixed(
      1
    )}% of portfolio capital.`
  );
  keyDrivers.push(
    `Asset allocation: ${(riskMetrics.equity_weight * 100).toFixed(1)}% in equities/ETFs across ${
      allocations.length
    } asset class(es).`
  );
  if (riskMetrics.top_sector && riskMetrics.top_sector !== 'Unclassified') {
    keyDrivers.push(
      `Highest sector concentration: ${riskMetrics.top_sector} at ${(
        riskMetrics.top_sector_weight * 100
      ).toFixed(1)}%.`
    );
  }

  // 3. Investigation steps
  const investigationSteps: string[] = [];
  if (riskMetrics.top_holding_weight > 0.3) {
    investigationSteps.push(
      `Evaluate whether ${riskMetrics.top_holding_name || 'your top position'} exceeds your personal risk tolerance.`
    );
  }
  if (riskMetrics.broker_count === 1) {
    investigationSteps.push(
      'Consider linking a secondary Demat account to distribute custody and counterparty settlement risk.'
    );
  }
  if (riskMetrics.equity_weight > 0.85) {
    investigationSteps.push(
      'Review fixed income options (G-Secs, Corporate Bonds) and commercial yields (REITs, InvITs) to buffer volatility.'
    );
  }
  if (!summary.is_valuation_complete) {
    investigationSteps.push(
      'Check market price updates for unquoted holdings to complete accurate portfolio valuation.'
    );
  }
  if (investigationSteps.length === 0) {
    investigationSteps.push('Review semi-annual asset allocation targets to maintain target portfolio balance.');
  }

  // 4. Diversification status
  let divStatus: 'well_diversified' | 'moderately_concentrated' | 'highly_concentrated' =
    'well_diversified';
  if (riskMetrics.hhi > 0.25 || riskMetrics.top_holding_weight > 0.35) {
    divStatus = 'highly_concentrated';
  } else if (riskMetrics.hhi > 0.15 || riskMetrics.top_holding_weight > 0.2) {
    divStatus = 'moderately_concentrated';
  }

  const divObservations: string[] = [
    `Herfindahl-Hirschman Index (HHI) is ${riskMetrics.hhi.toFixed(
      3
    )}, indicating ${divStatus.replace('_', ' ')} allocation.`,
    ...riskMetrics.diversification_observations,
  ];

  const divConsiderations: string[] = [];
  if (allocations.length < 3) {
    divConsiderations.push(
      'Explore multi-asset categories such as Gold SGBs or REITs for low-correlation returns.'
    );
  }
  if (riskMetrics.top_five_holding_weight > 0.65) {
    divConsiderations.push(
      'Spreading new capital allocations outside top 5 holdings will naturally improve portfolio diversification.'
    );
  }
  if (divConsiderations.length === 0) {
    divConsiderations.push('Maintain existing disciplined rebalancing schedule.');
  }

  // 5. Data limitations
  const dataLimitations: string[] = [];
  if (riskMetrics.unquoted_count > 0) {
    dataLimitations.push(
      `${riskMetrics.unquoted_count} holding(s) lack live quotes; concentration reflects priced positions only.`
    );
  }
  if (riskMetrics.stale_quotes_count > 0) {
    dataLimitations.push(
      `${riskMetrics.stale_quotes_count} quote(s) have not updated in over 48 hours.`
    );
  }
  if (!riskMetrics.has_sector_data) {
    dataLimitations.push(
      'Sector metadata is unclassified for some positions; sector risk diagnostics are limited.'
    );
  }
  if (dataLimitations.length === 0) {
    dataLimitations.push('All positions verified with active quotes and classified metadata.');
  }

  return {
    summary: {
      headline,
      health_assessment: healthAssessment,
      significance,
      key_drivers: keyDrivers,
      investigation_steps: investigationSteps,
    },
    diversification_analysis: {
      status: divStatus,
      observations: divObservations,
      actionable_considerations: divConsiderations,
    },
    risk_observations: {
      concerns:
        riskMetrics.concentration_warnings.length > 0
          ? riskMetrics.concentration_warnings
          : ['No significant concentration flags detected.'],
      positives:
        riskMetrics.positive_observations.length > 0
          ? riskMetrics.positive_observations
          : ['Positions maintained within basic allocation guidelines.'],
    },
    data_limitations: dataLimitations,
    educational_disclaimer: EDUCATIONAL_DISCLAIMER,
  };
}

/**
 * Generate AI Portfolio Intelligence.
 * Uses Google Gemini 1.5 Flash when GEMINI_API_KEY is configured.
 * Validates JSON schema response strictly.
 * Falls back to deterministic rule-based engine on any error or missing key.
 */
export async function generatePortfolioIntelligence(
  summary: PortfolioSummary,
  riskMetrics: RiskMetrics,
  allocations: AssetAllocation[],
  holdings: HoldingWithMetrics[]
): Promise<{
  report: AIIntelligenceReport;
  provider: 'gemini' | 'algorithmic';
  model: string;
  isAiAvailable: boolean;
  status: 'success' | 'fallback_missing_key' | 'fallback_error';
  error?: string;
}> {
  const apiKey = process.env.GEMINI_API_KEY;
  const isKeyConfigured = Boolean(apiKey && !apiKey.includes('your_') && apiKey.trim().length > 10);

  // If no Gemini key, immediately use algorithmic generator
  if (!isKeyConfigured) {
    return {
      report: generateAlgorithmicIntelligenceReport(summary, riskMetrics, allocations, holdings),
      provider: 'algorithmic',
      model: 'Finova Deterministic Intelligence Engine',
      isAiAvailable: false,
      status: 'fallback_missing_key',
    };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey!);
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2, // Low temperature for high deterministic fidelity
      },
    });

    // Constrain & sanitize data sent to Gemini (ZERO credentials/PII)
    const sanitizedAllocation = allocations.map((a) => ({
      asset_class: sanitizeUntrustedInput(a.asset_class, 20),
      percentage: Number(a.percentage.toFixed(1)),
      value_inr: Math.round(a.value),
    }));

    const sanitizedSectors = riskMetrics.sector_allocations.slice(0, 5).map((s) => ({
      sector: sanitizeUntrustedInput(s.sector, 30),
      percentage: Number(s.percentage.toFixed(1)),
    }));

    const valuationBase = summary.priced_current_value && summary.priced_current_value > 0
      ? summary.priced_current_value
      : summary.total_invested_value;

    const sanitizedHoldingsTop = holdings.slice(0, 5).map((h) => ({
      symbol: sanitizeUntrustedInput(h.symbol, 15),
      name: sanitizeUntrustedInput(h.name, 40),
      asset_class: sanitizeUntrustedInput(h.asset_class, 20),
      weight_pct: valuationBase > 0 && h.current_value !== null
        ? Number(((h.current_value / valuationBase) * 100).toFixed(1))
        : 0,
      has_quote: h.current_price !== null && h.current_value !== null,
    }));

    const promptPayload = {
      aggregated_metrics: {
        total_invested_inr: summary.total_invested_value,
        total_current_value_inr: summary.total_current_value,
        priced_subtotal_inr: summary.priced_current_value,
        priced_invested_inr: summary.priced_invested_value,
        unquoted_invested_inr: summary.unquoted_invested_value,
        overall_return_pct: summary.total_absolute_return_pct,
        holding_count: summary.holding_count,
        broker_count: summary.broker_count,
        quote_coverage_pct: riskMetrics.quote_coverage_pct,
        unquoted_count: riskMetrics.unquoted_count,
        is_valuation_complete: riskMetrics.is_valuation_complete,
        risk_score: riskMetrics.risk_score,
        risk_label: riskMetrics.risk_label,
        hhi: Number(riskMetrics.hhi.toFixed(3)),
        equity_weight_pct: Number((riskMetrics.equity_weight * 100).toFixed(1)),
        top_holding_weight_pct: Number((riskMetrics.top_holding_weight * 100).toFixed(1)),
        top_five_holding_weight_pct: Number((riskMetrics.top_five_holding_weight * 100).toFixed(1)),
        asset_allocations: sanitizedAllocation,
        top_sectors: sanitizedSectors,
        top_holdings_sample: sanitizedHoldingsTop,
      },
      instructions: `You are FINOVA's financial intelligence educator for Indian retail investors.
Analyze this user's aggregated portfolio metrics.
RULES:
1. Adhere strictly to the required JSON schema.
2. Do NOT give personalized buy, sell, or hold advice.
3. Do NOT predict guaranteed future performance or promise returns.
4. Explain clearly:
   - What is happening in the portfolio (health_assessment).
   - Why it matters for an Indian retail investor (significance).
   - Which holdings or allocations contribute (key_drivers).
   - What the user could investigate next (investigation_steps).
5. If quote_coverage_pct < 100% or unquoted_count > 0, you MUST explicitly state that market valuations and concentration reflect priced positions only, and unpriced positions are excluded from current market totals.
6. Provide objective observations only.
7. Return raw JSON matching this schema:
{
  "summary": {
    "headline": "string",
    "health_assessment": "string",
    "significance": "string",
    "key_drivers": ["string"],
    "investigation_steps": ["string"]
  },
  "diversification_analysis": {
    "status": "well_diversified" | "moderately_concentrated" | "highly_concentrated",
    "observations": ["string"],
    "actionable_considerations": ["string"]
  },
  "risk_observations": {
    "concerns": ["string"],
    "positives": ["string"]
  },
  "data_limitations": ["string"],
  "educational_disclaimer": "${EDUCATIONAL_DISCLAIMER}"
}`,
    };

    const promptText = JSON.stringify(promptPayload);
    const result = await model.generateContent(promptText);
    const text = result.response.text();

    // Clean any markdown code fences if present
    const cleanJson = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    const parsed = JSON.parse(cleanJson);
    const validated = validateIntelligenceReport(parsed);

    if (validated) {
      return {
        report: validated,
        provider: 'gemini',
        model: 'Gemini 1.5 Flash',
        isAiAvailable: true,
        status: 'success',
      };
    }

    console.warn('[IntelligenceEngine] Gemini response did not pass schema validation, falling back.');
    return {
      report: generateAlgorithmicIntelligenceReport(summary, riskMetrics, allocations, holdings),
      provider: 'algorithmic',
      model: 'Finova Deterministic Intelligence Engine (Schema Fallback)',
      isAiAvailable: false,
      status: 'fallback_error',
      error: 'Schema validation mismatch',
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.warn('[IntelligenceEngine] Gemini API call failed, falling back to algorithmic report:', errorMsg);
    return {
      report: generateAlgorithmicIntelligenceReport(summary, riskMetrics, allocations, holdings),
      provider: 'algorithmic',
      model: 'Finova Deterministic Intelligence Engine (Provider Fallback)',
      isAiAvailable: false,
      status: 'fallback_error',
      error: errorMsg,
    };
  }
}
