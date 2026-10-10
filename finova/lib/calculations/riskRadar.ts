// ============================================================
// FINOVA — Innovation Two: Smart Risk & Diversification Radar
// lib/calculations/riskRadar.ts
//
// Extends deterministic risk calculations with:
// - Cross-broker overlap concentration analysis
// - Transparent, rule-based Smart Risk Observations
// - Strict coverage & valuation denominator honesty
// - Data Quality Radar & Educational Screening Thresholds
// ============================================================

import type {
  HoldingWithMetrics,
  RiskMetrics,
  BrokerAccount,
} from '../../types/portfolio.ts';
import { buildRiskMetrics } from './risk.ts';
import {
  computeUnifiedXRay,
  type UnifiedXRayAnalysis,
} from './xray.ts';
import { formatIndianCurrency } from '../utils.ts';

export type RiskSeverity = 'info' | 'warning' | 'alert';
export type RiskCategory =
  | 'concentration'
  | 'overlap'
  | 'asset_class'
  | 'broker'
  | 'sector'
  | 'data_quality';

export interface SmartRiskObservation {
  id: string;
  category: RiskCategory;
  severity: RiskSeverity;
  title: string;
  calculatedFigure: string;
  whyItMatters: string;
  contributingHoldings: string[];
  coverageLimitation: string;
  neutralNextStep: string;
}

export interface EducationalThreshold {
  metric: string;
  conservativeLimit: string;
  moderateLimit: string;
  currentValue: string;
  status: 'within_screening_range' | 'elevated' | 'high_attention';
  screeningRationale: string;
}

export interface SmartRiskRadarAnalysis {
  baseMetrics: RiskMetrics;
  xraySummary: UnifiedXRayAnalysis['summary'];
  observations: SmartRiskObservation[];
  educationalThresholds: EducationalThreshold[];
  dataQualityRadar: {
    totalHoldingsAnalyzed: number;
    validPriceCount: number;
    unpricedHoldingsCount: number;
    staleQuotesCount: number;
    unclassifiedSectorsCount: number;
    missingIsinCount: number;
    coveragePct: number;
    isFullyReliable: boolean;
    coverageNotice: string;
  };
}

/**
 * Generates explainable, deterministic Smart Risk Observations grounded strictly
 * on computed portfolio figures.
 */
export function generateSmartRiskObservations(
  xray: UnifiedXRayAnalysis,
  risk: RiskMetrics
): SmartRiskObservation[] {
  const observations: SmartRiskObservation[] = [];
  const { summary, overlaps, consolidated_instruments, data_quality } = xray;
  const isComplete = data_quality.unquoted_positions === 0;
  const coverageNote = isComplete
    ? 'Calculated across 100% of portfolio positions with verified active market quotes.'
    : `Coverage limitation: ${data_quality.unquoted_positions} unquoted position(s) excluded from market valuation denominator.`;

  // 1. Single-Holding Concentration Observation
  if (risk.top_holding_weight >= 0.25) {
    const topInst = consolidated_instruments[0];
    const topPct = (risk.top_holding_weight * 100).toFixed(1);
    const isAlert = risk.top_holding_weight >= 0.4;

    observations.push({
      id: 'obs-single-holding-concentration',
      category: 'concentration',
      severity: isAlert ? 'alert' : 'warning',
      title: `${topInst ? topInst.name : 'Single Holding'} Represents ${topPct}% of Valued Portfolio`,
      calculatedFigure: `${topPct}% of valued capital (${topInst && topInst.current_value !== null ? formatIndianCurrency(topInst.current_value) : 'Market Value'})`,
      whyItMatters:
        'When a single security accounts for over a quarter of valued investments, portfolio performance and drawdown risk are predominantly tied to that single company’s operational and financial health.',
      contributingHoldings: topInst
        ? [
            `${topInst.name} (${topInst.symbol}) held across ${topInst.broker_count} broker account(s). Total qty: ${topInst.total_quantity}`,
          ]
        : ['Largest holding by market value'],
      coverageLimitation: coverageNote,
      neutralNextStep:
        'Review your allocation thesis. Consider whether broad-market index funds, ETFs, or fixed income can reduce single-stock volatility. Do not interpret as a direct recommendation to sell.',
    });
  }

  // 2. Cross-Broker Hidden Overlap Observation
  if (overlaps.length > 0) {
    const overlapValuedPct = summary.cross_broker_overlap_valued_pct;
    const isAlert = overlapValuedPct >= 35 || overlaps.length >= 3;

    observations.push({
      id: 'obs-cross-broker-overlap',
      category: 'overlap',
      severity: isAlert ? 'alert' : 'warning',
      title: `${overlaps.length} Instrument(s) Duplicated Across Multiple Brokers`,
      calculatedFigure: `${overlapValuedPct}% of valued portfolio (${formatIndianCurrency(summary.cross_broker_overlap_value)})`,
      whyItMatters:
        'Holding the exact same stock or ETF across different broker apps gives an illusion of diversification while actually multiplying transaction costs, tracking complexity, and concentration exposure.',
      contributingHoldings: overlaps.map(
        (o) =>
          `${o.name} (${o.symbol}): Held across ${o.broker_names.join(' & ')} (Consolidated: ${formatIndianCurrency(o.current_value ?? o.total_invested_value)})`
      ),
      coverageLimitation:
        'Matched by verified ISIN and canonical symbol normalization without mutating your underlying broker accounts.',
      neutralNextStep:
        'Consolidating identical securities under a primary broker account or viewing unified positions in FINOVA can simplify long-term capital gains accounting and eliminate duplicate tracking overhead.',
    });
  }

  // 3. Top-5 Holdings Concentration Observation
  if (risk.top_five_holding_weight >= 0.6) {
    const top5Pct = (risk.top_five_holding_weight * 100).toFixed(1);
    const top5Insts = consolidated_instruments.slice(0, 5);

    observations.push({
      id: 'obs-top-five-concentration',
      category: 'concentration',
      severity: risk.top_five_holding_weight >= 0.75 ? 'alert' : 'warning',
      title: `Top 5 Holdings Account for ${top5Pct}% of Valued Portfolio`,
      calculatedFigure: `${top5Pct}% of valued holdings`,
      whyItMatters:
        'Heavy concentration in the top 5 positions means systemic shocks or sectoral headwinds affecting those few companies will dictate overall portfolio returns.',
      contributingHoldings: top5Insts.map(
        (inst) =>
          `${inst.name}: ${(inst.percentage_of_valued_portfolio).toFixed(1)}% of valued portfolio`
      ),
      coverageLimitation: coverageNote,
      neutralNextStep:
        'Evaluate whether your remaining positions provide meaningful downside protection or if their weighting is too negligible to influence risk-adjusted returns.',
    });
  }

  // 4. Asset Class Skew Observation
  if (risk.equity_weight >= 0.8) {
    const eqPct = (risk.equity_weight * 100).toFixed(1);
    observations.push({
      id: 'obs-equity-skew',
      category: 'asset_class',
      severity: risk.equity_weight >= 0.9 ? 'alert' : 'warning',
      title: `High Equity Exposure (${eqPct}%)`,
      calculatedFigure: `${eqPct}% allocated to equities & equity ETFs`,
      whyItMatters:
        'Equities offer high growth potential over long investment horizons but experience significant short-to-medium term drawdown volatility during market corrections.',
      contributingHoldings: [`Equities & ETFs represent ${eqPct}% of valued capital`],
      coverageLimitation: coverageNote,
      neutralNextStep:
        'Explore non-equity asset classes like Sovereign Gold Bonds (SGBs), Debt/Bonds, REITs, or InvITs to examine how different asset correlations impact portfolio stability.',
    });
  }

  // 5. Broker Platform Distribution Observation
  if (xray.broker_breakdown.length > 0) {
    const topBroker = xray.broker_breakdown[0];
    if (topBroker.percentage_of_valued >= 75 && xray.broker_breakdown.length > 1) {
      observations.push({
        id: 'obs-broker-concentration',
        category: 'broker',
        severity: 'info',
        title: `${topBroker.broker_name} Holds ${topBroker.percentage_of_valued.toFixed(1)}% of Your Assets`,
        calculatedFigure: `${topBroker.percentage_of_valued.toFixed(1)}% on ${topBroker.broker_name}`,
        whyItMatters:
          'While assets are securely held with depositories (CDSL/NSDL), high platform concentration creates single-app operational dependency for execution and order placement.',
        contributingHoldings: [
          `${topBroker.broker_name}: ${topBroker.positions_count} open position(s) worth ${topBroker.current_value !== null ? formatIndianCurrency(topBroker.current_value) : formatIndianCurrency(topBroker.invested_value)}`,
        ],
        coverageLimitation: 'Based on manually recorded broker accounts.',
        neutralNextStep:
          'Ensure your depository statements (e.g. CDSL CAS) are periodically cross-verified with your broker holdings.',
      });
    }
  }

  // 6. Sector Concentration Observation
  if (risk.has_sector_data && risk.top_sector && risk.top_sector_weight >= 0.35) {
    const secPct = (risk.top_sector_weight * 100).toFixed(1);
    observations.push({
      id: 'obs-sector-concentration',
      category: 'sector',
      severity: risk.top_sector_weight >= 0.5 ? 'alert' : 'warning',
      title: `High Sector Concentration in ${risk.top_sector} (${secPct}%)`,
      calculatedFigure: `${secPct}% of valued portfolio`,
      whyItMatters:
        `Sector-specific regulatory changes, interest rate moves, or commodity price shifts disproportionately affect portfolios concentrated in ${risk.top_sector}.`,
      contributingHoldings: [`Dominant sector: ${risk.top_sector}`],
      coverageLimitation:
        data_quality.positions_unclassified_sector > 0
          ? `${data_quality.positions_unclassified_sector} position(s) lack sector classifications and are omitted from sector concentration.`
          : 'Based on 100% classified sector metadata.',
      neutralNextStep:
        'Consider investigating companies operating in uncorrelated sectors to balance macro-economic exposures.',
    });
  }

  // 7. Data Quality & Valuation Uncertainty Observation
  if (!isComplete) {
    observations.push({
      id: 'obs-data-quality-uncertainty',
      category: 'data_quality',
      severity: data_quality.unquoted_positions > 2 ? 'alert' : 'warning',
      title: `Market Prices Unavailable for ${data_quality.unquoted_positions} Position(s)`,
      calculatedFigure: `${summary.quote_coverage_pct}% quote coverage`,
      whyItMatters:
        'Missing live market quotes mean the true current portfolio value and exact concentration percentages cannot be calculated with complete mathematical certainty.',
      contributingHoldings: consolidated_instruments
        .filter((inst) => !inst.is_quoted)
        .map((inst) => `${inst.name} (${inst.symbol}): Invested ${formatIndianCurrency(inst.total_invested_value)}`),
      coverageLimitation:
        'FINOVA strictly refuses to fabricate prices or substitute purchase cost as market value.',
      neutralNextStep:
        'Verify ticker symbols or exchanges for unquoted instruments to enable live quote resolution.',
    });
  }

  // 8. Positive Diversification Observation (if healthy)
  if (risk.top_holding_weight < 0.25 && risk.top_five_holding_weight < 0.6 && overlaps.length === 0) {
    observations.push({
      id: 'obs-healthy-diversification',
      category: 'concentration',
      severity: 'info',
      title: 'Balanced Single-Asset Diversification',
      calculatedFigure: `Largest holding is only ${(risk.top_holding_weight * 100).toFixed(1)}% of valued assets`,
      whyItMatters:
        'No single holding dominates your portfolio, mitigating company-specific black swan event risk.',
      contributingHoldings: ['Portfolio is well-distributed across individual holdings'],
      coverageLimitation: coverageNote,
      neutralNextStep:
        'Maintain periodic discipline during rebalancing to prevent winner positions from growing into outsized concentration risks.',
    });
  }

  return observations;
}

/**
 * Builds the Educational Screening Thresholds reference
 */
export function buildEducationalThresholds(
  risk: RiskMetrics,
  xray: UnifiedXRayAnalysis
): EducationalThreshold[] {
  const topHoldingPct = risk.top_holding_weight * 100;
  const top5Pct = risk.top_five_holding_weight * 100;
  const eqPct = risk.equity_weight * 100;
  const overlapPct = xray.summary.cross_broker_overlap_valued_pct;

  return [
    {
      metric: 'Single Holding Weight',
      conservativeLimit: '< 15%',
      moderateLimit: '15% – 25%',
      currentValue: `${topHoldingPct.toFixed(1)}%`,
      status:
        topHoldingPct > 40
          ? 'high_attention'
          : topHoldingPct > 25
          ? 'elevated'
          : 'within_screening_range',
      screeningRationale:
        'Heuristic screen to identify vulnerability to individual company performance shocks.',
    },
    {
      metric: 'Top 5 Holdings Weight',
      conservativeLimit: '< 50%',
      moderateLimit: '50% – 60%',
      currentValue: `${top5Pct.toFixed(1)}%`,
      status:
        top5Pct > 75
          ? 'high_attention'
          : top5Pct > 60
          ? 'elevated'
          : 'within_screening_range',
      screeningRationale:
        'Evaluates concentration in top core holdings versus peripheral positions.',
    },
    {
      metric: 'Equity Asset Class Weight',
      conservativeLimit: '< 65%',
      moderateLimit: '65% – 80%',
      currentValue: `${eqPct.toFixed(1)}%`,
      status:
        eqPct > 90
          ? 'high_attention'
          : eqPct > 80
          ? 'elevated'
          : 'within_screening_range',
      screeningRationale:
        'Screens for high drawdown sensitivity during broad equity market corrections.',
    },
    {
      metric: 'Cross-Broker Overlap Exposure',
      conservativeLimit: '0%',
      moderateLimit: '< 15%',
      currentValue: `${overlapPct.toFixed(1)}%`,
      status:
        overlapPct > 35
          ? 'high_attention'
          : overlapPct > 15
          ? 'elevated'
          : 'within_screening_range',
      screeningRationale:
        'Identifies unintended duplicate holdings across different broker apps.',
    },
    {
      metric: 'Market Quote Coverage',
      conservativeLimit: '100%',
      moderateLimit: '>= 80%',
      currentValue: `${xray.summary.quote_coverage_pct}%`,
      status:
        xray.summary.quote_coverage_pct < 70
          ? 'high_attention'
          : xray.summary.quote_coverage_pct < 100
          ? 'elevated'
          : 'within_screening_range',
      screeningRationale:
        'Quantifies mathematical certainty and coverage limitations in risk calculations.',
    },
  ];
}

/**
 * Builds the complete Smart Risk & Diversification Radar analysis
 */
export function computeSmartRiskRadar(
  holdings: HoldingWithMetrics[],
  brokerAccounts: BrokerAccount[] = []
): SmartRiskRadarAnalysis {
  const xray = computeUnifiedXRay(holdings, brokerAccounts);
  const baseMetrics = buildRiskMetrics(holdings);
  const observations = generateSmartRiskObservations(xray, baseMetrics);
  const educationalThresholds = buildEducationalThresholds(baseMetrics, xray);

  const isFullyReliable = xray.data_quality.unquoted_positions === 0;
  const coverageNotice = isFullyReliable
    ? 'All holdings have verified market prices. Risk metrics represent 100% of portfolio value.'
    : `Market data is unavailable for ${xray.data_quality.unquoted_positions} of ${holdings.length} positions. Concentration percentages are calculated against the reliably valued subset (${formatIndianCurrency(xray.summary.market_valued_capital || 0)}).`;

  return {
    baseMetrics,
    xraySummary: xray.summary,
    observations,
    educationalThresholds,
    dataQualityRadar: {
      totalHoldingsAnalyzed: holdings.length,
      validPriceCount: xray.data_quality.quoted_positions,
      unpricedHoldingsCount: xray.data_quality.unquoted_positions,
      staleQuotesCount: xray.data_quality.stale_quotes_count,
      unclassifiedSectorsCount: xray.data_quality.positions_unclassified_sector,
      missingIsinCount: xray.data_quality.positions_without_isin,
      coveragePct: xray.summary.quote_coverage_pct,
      isFullyReliable,
      coverageNotice,
    },
  };
}
