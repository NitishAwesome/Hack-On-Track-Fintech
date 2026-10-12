// ============================================================
// Finova — Financial Calculation Engine
// risk.ts — Deterministic Portfolio Risk & Concentration Engine
// Strictly adheres to Prompt 8:
// - Independent deterministic calculations
// - Handles unavailable/stale quotes without substituting 0 or cost
// - Full concentration metrics (Top 1, Top 5, HHI, Sectors, Asset Classes)
// - Clear separation of calculated facts from AI qualitative notes
// ============================================================

import type { HoldingWithMetrics, RiskMetrics, SectorAllocation } from '../../types/portfolio';
import { roundCurrency, roundPercent } from './portfolio.ts';
import { clamp } from '../utils.ts';

/**
 * Compute Herfindahl-Hirschman Index (0–1)
 * HHI = Σ(share_i²) where share_i is holding's fraction of total portfolio
 * 1.0 = completely concentrated, 1/N = perfectly diversified
 */
export function computeHHI(shares: number[]): number {
  if (shares.length === 0) return 0;
  return roundPercent(
    shares.reduce((sum, s) => sum + s * s, 0)
  );
}

/**
 * Compute sector concentration and distribution when sector metadata is present.
 * Strictly adheres to Prompt 9.1B:
 * Uses consistent valuation denominator without mixing cost basis into market valuation.
 */
export function computeSectorAllocation(
  holdings: HoldingWithMetrics[],
  valuationBase: number,
  usingMarketValuation = true
): {
  allocations: SectorAllocation[];
  topSector: string | null;
  topSectorWeight: number;
  hasSectorData: boolean;
} {
  if (holdings.length === 0 || valuationBase <= 0) {
    return { allocations: [], topSector: null, topSectorWeight: 0, hasSectorData: false };
  }

  const sectorMap = new Map<string, { value: number; count: number; unquoted: number }>();
  let hasValidSector = false;

  for (const h of holdings) {
    const rawSector = h.sector?.trim();
    const sectorName = rawSector && rawSector.length > 0 ? rawSector : 'Unclassified';
    if (rawSector && rawSector.length > 0) hasValidSector = true;
    const isUnquoted = h.current_price === null || typeof h.current_price !== 'number';

    if (!sectorMap.has(sectorName)) {
      sectorMap.set(sectorName, { value: 0, count: 0, unquoted: 0 });
    }
    const current = sectorMap.get(sectorName)!;
    current.count += 1;
    if (isUnquoted) current.unquoted += 1;
  }

  const activeHoldings = usingMarketValuation
    ? holdings.filter((h) => typeof h.current_price === 'number' && h.current_price > 0)
    : holdings;

  for (const h of activeHoldings) {
    const rawSector = h.sector?.trim();
    const sectorName = rawSector && rawSector.length > 0 ? rawSector : 'Unclassified';
    const current = sectorMap.get(sectorName)!;
    const val = usingMarketValuation
      ? (h.quantity * (h.current_price || 0))
      : h.invested_value;
    current.value += val;
  }

  const allocations: SectorAllocation[] = Array.from(sectorMap.entries())
    .map(([sector, data]) => ({
      sector,
      value: roundCurrency(data.value),
      percentage: roundPercent((data.value / valuationBase) * 100),
      holding_count: data.count,
      unquoted_count: data.unquoted,
    }))
    .sort((a, b) => b.value - a.value);

  const classifiedSectors = allocations.filter((s) => s.sector !== 'Unclassified');
  const topSectorEntry = classifiedSectors.length > 0 ? classifiedSectors[0] : allocations[0];

  return {
    allocations,
    topSector: topSectorEntry ? topSectorEntry.sector : null,
    topSectorWeight: topSectorEntry ? roundPercent(topSectorEntry.percentage / 100) : 0,
    hasSectorData: hasValidSector,
  };
}

/**
 * Check if a price timestamp is older than threshold (default 48 hours)
 */
export function isPriceStale(timestampStr: string | null | undefined, thresholdHours = 48): boolean {
  if (!timestampStr) return false;
  try {
    const quoteTime = new Date(timestampStr).getTime();
    if (isNaN(quoteTime)) return false;
    const ageHours = (Date.now() - quoteTime) / (1000 * 60 * 60);
    return ageHours > thresholdHours;
  } catch {
    return false;
  }
}

/**
 * Build comprehensive deterministic risk metrics for a portfolio.
 * Does NOT assume zero or purchase price for missing quotes.
 */
export function buildRiskMetrics(holdings: HoldingWithMetrics[]): RiskMetrics {
  const emptyResult: RiskMetrics = {
    risk_score: 0,
    risk_label: 'Conservative',
    hhi: 0,
    equity_weight: 0,
    broker_count: 0,
    top_holding_weight: 0,
    top_holding_name: undefined,
    top_holding_symbol: undefined,
    top_five_holding_weight: 0,
    top_asset_class: 'None',
    top_asset_class_weight: 0,
    sector_allocations: [],
    top_sector: null,
    top_sector_weight: 0,
    has_sector_data: false,
    quote_coverage_pct: 0,
    priced_count: 0,
    unquoted_count: 0,
    stale_quotes_count: 0,
    is_valuation_complete: true,
    concentration_warnings: [],
    diversification_observations: [],
    positive_observations: [],
    data_quality_warnings: [],
    hhi_scaled: 0,
    risk_factors: [],
    operational_risk: {
      broker_count: 0,
      is_single_broker: true,
      notice: 'No active broker accounts or holdings recorded.',
    },
  };

  if (holdings.length === 0) {
    return emptyResult;
  }

  // 1. Separate priced vs unquoted positions
  const pricedHoldings = holdings.filter(
    (h) => typeof h.current_price === 'number' && !isNaN(h.current_price) && h.current_price > 0
  );
  const unquotedHoldings = holdings.filter(
    (h) => h.current_price === null || typeof h.current_price !== 'number' || isNaN(h.current_price) || h.current_price <= 0
  );

  const pricedCount = pricedHoldings.length;
  const unquotedCount = unquotedHoldings.length;
  const quoteCoveragePct = roundPercent((pricedCount / holdings.length) * 100);
  const isValuationComplete = unquotedCount === 0;

  // Stale quote detection
  const staleCount = holdings.filter((h) => isPriceStale(h.price_updated_at)).length;

  // 2. Determine valuation base for concentration math
  // If priced holdings exist, use sum of priced current_value.
  // If NO holdings are priced, use invested value as proxy but flag as data quality caveat.
  const pricedTotal = pricedHoldings.reduce(
    (sum, h) => sum + (h.quantity * (h.current_price || 0)),
    0
  );
  const investedTotal = holdings.reduce((sum, h) => sum + h.invested_value, 0);

  const usingMarketValuation = pricedTotal > 0;
  const valuationBase = usingMarketValuation ? pricedTotal : investedTotal;

  if (valuationBase <= 0) {
    return {
      ...emptyResult,
      unquoted_count: unquotedCount,
      quote_coverage_pct: 0,
      data_quality_warnings: ['Portfolio has zero recorded valuation or capital deployed.'],
    };
  }

  // 3. Concentration: Largest Holding & Top 5
  // Measure shares based on the active valuation base
  const holdingsForConcentration = usingMarketValuation ? pricedHoldings : holdings;
  const sortedByValue = [...holdingsForConcentration].sort((a, b) => {
    const valA = usingMarketValuation ? (a.quantity * (a.current_price || 0)) : a.invested_value;
    const valB = usingMarketValuation ? (b.quantity * (b.current_price || 0)) : b.invested_value;
    return valB - valA;
  });

  const topHolding = sortedByValue[0];
  const topVal = topHolding
    ? (usingMarketValuation ? (topHolding.quantity * (topHolding.current_price || 0)) : topHolding.invested_value)
    : 0;
  const topHoldingWeight = roundPercent(topVal / valuationBase);

  const topFiveVal = sortedByValue.slice(0, 5).reduce((sum, h) => {
    const val = usingMarketValuation ? (h.quantity * (h.current_price || 0)) : h.invested_value;
    return sum + val;
  }, 0);
  const topFiveWeight = roundPercent(topFiveVal / valuationBase);

  // 4. HHI
  const shares = holdingsForConcentration.map((h) => {
    const val = usingMarketValuation ? (h.quantity * (h.current_price || 0)) : h.invested_value;
    return val / valuationBase;
  });
  const hhi = computeHHI(shares);

  // 5. Asset Class Weight & Top Asset Class (Defensible single denominator: uses holdingsForConcentration only)
  const assetClassTotals = new Map<string, number>();
  for (const h of holdingsForConcentration) {
    const val = usingMarketValuation
      ? (h.quantity * (h.current_price || 0))
      : h.invested_value;
    assetClassTotals.set(h.asset_class, (assetClassTotals.get(h.asset_class) || 0) + val);
  }

  const sortedAssetClasses = Array.from(assetClassTotals.entries()).sort((a, b) => b[1] - a[1]);
  const topAssetClass = sortedAssetClasses[0] ? sortedAssetClasses[0][0] : 'equity';
  const topAssetClassWeight = sortedAssetClasses[0] ? roundPercent(sortedAssetClasses[0][1] / valuationBase) : 0;

  const equityValue = (assetClassTotals.get('equity') || 0) + (assetClassTotals.get('etf') || 0);
  const equityWeight = roundPercent(equityValue / valuationBase);

  // 6. Broker diversification (tracked for operational custody assessment)
  const brokerIds = new Set(holdings.map((h) => h.broker_account_id).filter(Boolean));
  const brokerCount = brokerIds.size || 1;

  // 7. Sector Allocation
  const sectorResult = computeSectorAllocation(holdings, valuationBase, usingMarketValuation);

  // Dimension 1: Overall Diversification / HHI (35% weight)
  // Absolute HHI scaling: HHI of 0.10 (1,000) = low (10), HHI of 0.25 (2,500) = moderate (25), HHI of 1.0 (10,000) = maximum (100)
  const hhiScore = clamp(Math.round(hhi * 100), 0, 100);

  // Dimension 2: Asset-Class Allocation (35% weight)
  const equityScore = clamp(Math.round(equityWeight * 100), 0, 100);

  // Dimension 3: Single-Stock Concentration (18% weight)
  const singleStockScore = clamp(
    Math.round((clamp(topHoldingWeight - 0.15, 0, 0.6) / 0.6) * 100),
    0,
    100
  );

  // Dimension 4: Sector Concentration (12% weight)
  const sectorScore =
    sectorResult.hasSectorData && sectorResult.topSector !== 'Unclassified'
      ? clamp(
          Math.round((clamp(sectorResult.topSectorWeight - 0.25, 0, 0.5) / 0.5) * 100),
          0,
          100
        )
      : 0;

  // Composite Risk Score
  const riskScore = clamp(
    Math.round(
      hhiScore * 0.35 +
      equityScore * 0.35 +
      singleStockScore * 0.18 +
      sectorScore * 0.12
    ),
    0,
    100
  );

  const riskLabel: RiskMetrics['risk_label'] =
    riskScore < 34 ? 'Conservative' : riskScore < 67 ? 'Moderate' : 'Aggressive';

  const hhiScaled = Math.round(hhi * 10000);

  const riskFactors: NonNullable<RiskMetrics['risk_factors']> = [
    {
      id: 'factor-hhi',
      name: 'Portfolio Concentration (HHI)',
      score: hhiScore,
      weightPct: 35,
      contribution: Math.round(hhiScore * 0.35),
      status: (hhiScore < 30 ? 'low' : hhiScore < 60 ? 'moderate' : hhiScore < 80 ? 'elevated' : 'high') as 'low' | 'moderate' | 'elevated' | 'high',
      calculatedValue: `${hhiScaled.toLocaleString('en-IN')} / 10,000`,
      description: 'Measures dispersion across all positions. Higher index indicates concentrated capital.',
    },
    {
      id: 'factor-asset-class',
      name: 'Asset-Class Skew (Equity %)',
      score: equityScore,
      weightPct: 35,
      contribution: Math.round(equityScore * 0.35),
      status: (equityScore < 60 ? 'low' : equityScore < 80 ? 'moderate' : equityScore < 90 ? 'elevated' : 'high') as 'low' | 'moderate' | 'elevated' | 'high',
      calculatedValue: `${(equityWeight * 100).toFixed(1)}%`,
      description: 'Evaluates exposure to market drawdowns. Equities exhibit higher historical volatility than debt or gold.',
    },
    {
      id: 'factor-single-stock',
      name: 'Single-Stock Exposure',
      score: singleStockScore,
      weightPct: 18,
      contribution: Math.round(singleStockScore * 0.18),
      status: (topHoldingWeight < 0.15 ? 'low' : topHoldingWeight < 0.25 ? 'moderate' : topHoldingWeight < 0.40 ? 'elevated' : 'high') as 'low' | 'moderate' | 'elevated' | 'high',
      calculatedValue: `${(topHoldingWeight * 100).toFixed(1)}% (${topHolding?.symbol || 'Top Holding'})`,
      description: 'Screens for vulnerability to unsystematic risk from individual company operational shocks.',
    },
    {
      id: 'factor-sector',
      name: 'Sector Concentration',
      score: sectorScore,
      weightPct: 12,
      contribution: Math.round(sectorScore * 0.12),
      status: (sectorResult.topSectorWeight < 0.25 ? 'low' : sectorResult.topSectorWeight < 0.35 ? 'moderate' : sectorResult.topSectorWeight < 0.50 ? 'elevated' : 'high') as 'low' | 'moderate' | 'elevated' | 'high',
      calculatedValue: sectorResult.topSector ? `${(sectorResult.topSectorWeight * 100).toFixed(1)}% (${sectorResult.topSector})` : 'Unclassified',
      description: 'Screens for exposure to sector-specific economic cycles and regulatory headwinds.',
    },
  ];

  const isSingleBroker = brokerCount <= 1;
  const operationalRisk: NonNullable<RiskMetrics['operational_risk']> = {
    broker_count: brokerCount,
    is_single_broker: isSingleBroker,
    notice: isSingleBroker
      ? 'All assets are held with a single broker/depository. While assets reside securely with central depositories (CDSL/NSDL), holding via a single platform presents operational and execution dependency, distinct from market price risk.'
      : `Assets distributed across ${brokerCount} separate broker accounts/depositories, providing operational redundancy.`,
  };

  // 9. Warnings & Observations
  const concentrationWarnings: string[] = [];
  const diversificationObservations: string[] = [];
  const positiveObservations: string[] = [];
  const dataQualityWarnings: string[] = [];

  // Concentration Warnings
  if (topHoldingWeight > 0.3) {
    concentrationWarnings.push(
      `${topHolding.name} (${topHolding.symbol}) constitutes ${(topHoldingWeight * 100).toFixed(1)}% of portfolio valuation — significant single-stock concentration risk.`
    );
  }
  if (topFiveWeight > 0.7 && holdings.length > 5) {
    concentrationWarnings.push(
      `Top 5 holdings represent ${(topFiveWeight * 100).toFixed(1)}% of your portfolio, leaving lower exposure across other assets.`
    );
  }
  if (equityWeight > 0.85) {
    concentrationWarnings.push(
      `Portfolio is heavily weighted in equities (${(equityWeight * 100).toFixed(1)}%). Consider diversifying into fixed income, REITs, or InvITs.`
    );
  }
  if (sectorResult.topSector && sectorResult.topSectorWeight > 0.4 && sectorResult.topSector !== 'Unclassified') {
    concentrationWarnings.push(
      `Sector concentration in ${sectorResult.topSector} is ${(sectorResult.topSectorWeight * 100).toFixed(1)}% — sensitive to sector-specific cycles.`
    );
  }

  // Quote Coverage & Data Quality Warnings
  if (unquotedCount > 0) {
    dataQualityWarnings.push(
      `${unquotedCount} of ${holdings.length} holdings lack active market quotes. Concentration metrics reflect quoted positions only.`
    );
  }
  if (staleCount > 0) {
    dataQualityWarnings.push(
      `${staleCount} position quote(s) are older than 48 hours. Metrics may reflect delayed or stale prices.`
    );
  }
  if (!usingMarketValuation) {
    dataQualityWarnings.push(
      'Live quotes unavailable for all holdings; metrics calculated using invested capital as conservative proxy.'
    );
  }

  // Check for any missing buy prices
  const missingBuyPrices = holdings.filter((h) => !h.avg_buy_price || h.avg_buy_price <= 0);
  if (missingBuyPrices.length > 0) {
    dataQualityWarnings.push(
      `${missingBuyPrices.length} holding(s) have unrecorded or zero purchase price.`
    );
  }

  // Diversification Observations
  if (brokerCount > 1) {
    diversificationObservations.push(
      `Assets distributed across ${brokerCount} separate broker accounts/depositories, reducing counterparty settlement risk.`
    );
  } else {
    diversificationObservations.push(
      'All assets are held with a single broker account. Central depositories (CDSL/NSDL) protect legal ownership, though single-app operational dependency exists.'
    );
  }

  if (assetClassTotals.size >= 3) {
    diversificationObservations.push(
      `Portfolio spans ${assetClassTotals.size} distinct asset classes, providing multi-asset risk mitigation.`
    );
  }

  // Positive Observations (evidence-backed)
  if (brokerCount >= 2) {
    positiveObservations.push(
      `Multi-broker custody structure (${brokerCount} accounts) provides operational and counterparty redundancy.`
    );
  }
  if (topHoldingWeight <= 0.25 && holdings.length >= 5) {
    positiveObservations.push(
      `Healthy individual holding balance: largest single position is capped at ${(topHoldingWeight * 100).toFixed(1)}%.`
    );
  }
  const defensiveWeight =
    (assetClassTotals.get('bond') || 0) +
    (assetClassTotals.get('sgb') || 0) +
    (assetClassTotals.get('reit') || 0) +
    (assetClassTotals.get('invit') || 0);
  if (defensiveWeight / valuationBase >= 0.15) {
    positiveObservations.push(
      `Defensive asset cushion: ${roundPercent((defensiveWeight / valuationBase) * 100)}% allocated to income/alternative assets (Bonds, REITs, InvITs, SGBs).`
    );
  }
  if (isValuationComplete && staleCount === 0) {
    positiveObservations.push('Complete market quote coverage: 100% of holdings verified with recent valuation prices.');
  }

  return {
    risk_score: riskScore,
    risk_label: riskLabel,
    hhi,
    hhi_scaled: hhiScaled,
    equity_weight: equityWeight,
    broker_count: brokerCount,
    top_holding_weight: topHoldingWeight,
    top_holding_name: topHolding?.name,
    top_holding_symbol: topHolding?.symbol,
    top_five_holding_weight: topFiveWeight,
    top_asset_class: topAssetClass,
    top_asset_class_weight: topAssetClassWeight,
    sector_allocations: sectorResult.allocations,
    top_sector: sectorResult.topSector,
    top_sector_weight: sectorResult.topSectorWeight,
    has_sector_data: sectorResult.hasSectorData,
    quote_coverage_pct: quoteCoveragePct,
    priced_count: pricedCount,
    unquoted_count: unquotedCount,
    stale_quotes_count: staleCount,
    is_valuation_complete: isValuationComplete,
    concentration_warnings: concentrationWarnings,
    diversification_observations: diversificationObservations,
    positive_observations: positiveObservations,
    data_quality_warnings: dataQualityWarnings,
    risk_factors: riskFactors,
    operational_risk: operationalRisk,
  };
}
