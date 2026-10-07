// ============================================================
// Finova — Financial Calculation Engine
// risk.ts — Portfolio Risk Analysis
// ============================================================

import type { HoldingWithMetrics, RiskMetrics } from '@/types/portfolio';
import { clamp } from '@/lib/utils';

/**
 * Compute Herfindahl-Hirschman Index (0–1)
 * HHI = Σ(share_i²) where share_i is holding's fraction of total portfolio
 * 1.0 = completely concentrated, 1/N = perfectly diversified
 */
function computeHHI(holdings: HoldingWithMetrics[], total: number): number {
  if (total === 0 || holdings.length === 0) return 1;
  return holdings.reduce((sum, h) => {
    const share = h.current_value / total;
    return sum + share * share;
  }, 0);
}

/**
 * Compute equity weight (fraction of portfolio in equity/ETF assets)
 * Higher equity weight → higher market risk
 */
function computeEquityWeight(
  holdings: HoldingWithMetrics[],
  total: number
): number {
  if (total === 0) return 0;
  const equityValue = holdings
    .filter((h) => h.asset_class === 'equity' || h.asset_class === 'etf')
    .reduce((sum, h) => sum + h.current_value, 0);
  return equityValue / total;
}

/**
 * Compute broker diversification score (0–1, higher = more diversified)
 * Single broker = 0, 4+ brokers = 1
 */
function computeBrokerDiversification(brokerCount: number): number {
  return clamp((brokerCount - 1) / 3, 0, 1);
}

/**
 * Build comprehensive risk metrics for a portfolio
 */
export function buildRiskMetrics(
  holdings: HoldingWithMetrics[]
): RiskMetrics {
  const total = holdings.reduce((sum, h) => sum + h.current_value, 0);

  if (holdings.length === 0 || total === 0) {
    return {
      risk_score: 0,
      risk_label: 'Conservative',
      hhi: 0,
      equity_weight: 0,
      broker_count: 0,
      top_holding_weight: 0,
      concentration_warnings: [],
    };
  }

  const hhi = computeHHI(holdings, total);
  const equityWeight = computeEquityWeight(holdings, total);

  const brokerIds = new Set(
    holdings.map((h) => h.broker_account_id).filter(Boolean)
  );
  const brokerCount = brokerIds.size || 1;
  const brokerDiversification = computeBrokerDiversification(brokerCount);

  const topHolding = holdings.reduce((max, h) =>
    h.current_value > max.current_value ? h : max
  );
  const topHoldingWeight = topHolding.current_value / total;

  // Normalise HHI to 0–1 risk score component (HHI range: 1/N to 1)
  // Min possible HHI = 1/N (fully diversified), max = 1 (single holding)
  const minHHI = 1 / holdings.length;
  const hhiNormalised = clamp(
    (hhi - minHHI) / Math.max(1 - minHHI, 0.001),
    0,
    1
  );

  // Composite risk score 0–100
  const riskScore = clamp(
    Math.round(
      hhiNormalised * 40 +
      equityWeight * 35 +
      (1 - brokerDiversification) * 25
    ),
    0,
    100
  );

  const riskLabel =
    riskScore < 34
      ? 'Conservative'
      : riskScore < 67
      ? 'Moderate'
      : 'Aggressive';

  // Concentration warnings
  const warnings: string[] = [];
  if (topHoldingWeight > 0.3) {
    warnings.push(
      `${topHolding.name} makes up ${(topHoldingWeight * 100).toFixed(1)}% of your portfolio — consider reducing concentration.`
    );
  }
  if (equityWeight > 0.85) {
    warnings.push(
      'Your portfolio is heavily weighted in equities. Consider diversifying into bonds, REITs or InvITs.'
    );
  }
  if (brokerCount === 1) {
    warnings.push(
      'All holdings are with a single broker. Spreading across depositories reduces counterparty risk.'
    );
  }
  if (holdings.length < 5 && total > 0) {
    warnings.push(
      'Your portfolio has fewer than 5 holdings. Greater diversification can reduce overall risk.'
    );
  }

  return {
    risk_score: riskScore,
    risk_label: riskLabel as RiskMetrics['risk_label'],
    hhi,
    equity_weight: equityWeight,
    broker_count: brokerCount,
    top_holding_weight: topHoldingWeight,
    concentration_warnings: warnings,
  };
}
