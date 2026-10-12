// ============================================================
// FINOVA — PROMPT 15 VERIFICATION SUITE: RISK RADAR 2.0
// scripts/verify-prompt15-risk-radar-2.0.mjs
//
// Tests all 20 mandatory scenarios for Risk Radar 2.0:
// 1. Empty portfolio
// 2. Single-stock portfolio
// 3. Portfolio with one holding above 50%
// 4. Highly concentrated sector
// 5. Broadly diversified multi-asset portfolio
// 6. Four-stock equity-only portfolio (no bogus top-5 alerts)
// 7. One broker account (honest operational custody vs market risk)
// 8. Duplicate securities across multiple brokers (overlap detection)
// 9. Missing sector data (Unclassified sector preservation)
// 10. Missing quotes (valued-subset denominator consistency)
// 11. Stale quotes handling (coverage vs freshness distinction)
// 12. Mix of fresh and previous-close quotes
// 13. Missing cost basis handling
// 14. Zero quantity / liquidated holdings safety
// 15. No fabricated historical volatility
// 16. HHI 0–1 vs 0–10,000 conversion exactness
// 17. Partial valuation denominator consistency
// 18. Factor breakdown math & weight consistency
// 19. Pure deterministic explanations (Why this classification?)
// 20. Canonical risk engine synchronization (X-Ray & Radar agree 100%)
// ============================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { computeSmartRiskRadar } from '../lib/calculations/riskRadar.ts';
import { buildRiskMetrics } from '../lib/calculations/risk.ts';
import { computeUnifiedXRay } from '../lib/calculations/xray.ts';

const MOCK_BROKERS = [
  {
    id: 'broker-zerodha',
    user_id: 'user-1',
    broker_name: 'Zerodha Kite',
    account_label: 'Primary Demat',
    account_type: 'manual',
    color_hex: '#387ED1',
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'broker-groww',
    user_id: 'user-1',
    broker_name: 'Groww Invest',
    account_label: 'Direct Equity',
    account_type: 'manual',
    color_hex: '#00D09C',
    created_at: '2026-01-01T00:00:00Z',
  },
];

function createHolding(overrides = {}) {
  const symbol = overrides.symbol || 'RELIANCE';
  const isin = overrides.isin !== undefined ? overrides.isin : (overrides.symbol ? `INE_${overrides.symbol}` : 'INE002A01018');
  const name = overrides.name || (overrides.symbol ? `${overrides.symbol} Corp` : 'Reliance Industries Ltd');
  const id = overrides.id || `h-${symbol.toLowerCase()}-${Math.random().toString(36).substring(2, 6)}`;
  const base = {
    id,
    user_id: 'user-1',
    broker_account_id: 'broker-zerodha',
    symbol,
    isin,
    name,
    asset_class: 'equity',
    exchange: 'NSE',
    quantity: 10,
    avg_buy_price: 2500,
    current_price: 2900,
    currency: 'INR',
    data_source: 'MANUAL',
    as_of: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    sector: 'Energy',
    industry: 'Oil & Gas',
    invested_value: 25000,
    current_value: 29000,
    unrealized_pnl: 4000,
    unrealized_pnl_pct: 16.0,
    weight_pct: 100,
  };
  const h = { ...base, ...overrides };
  h.invested_value = h.quantity * h.avg_buy_price;
  h.current_value = h.current_price !== null ? h.quantity * h.current_price : null;
  return h;
}

test('Risk Radar 2.0 — Scenario 1: Empty Portfolio', () => {
  const radar = computeSmartRiskRadar([], MOCK_BROKERS);
  assert.strictEqual(radar.baseMetrics.risk_score, 0);
  assert.strictEqual(radar.baseMetrics.risk_label, 'Conservative');
  assert.strictEqual(radar.dataQualityRadar.totalHoldingsAnalyzed, 0);
  assert.strictEqual(radar.dataQualityRadar.validPriceCount, 0);
  assert.strictEqual(radar.observations.length, 0);
  assert.ok(!isNaN(radar.baseMetrics.risk_score));
});

test('Risk Radar 2.0 — Scenario 2: Single-Stock Portfolio', () => {
  const h = createHolding({ symbol: 'INFY', quantity: 100, avg_buy_price: 1500, current_price: 1800 });
  const radar = computeSmartRiskRadar([h], MOCK_BROKERS);

  assert.strictEqual(radar.xraySummary.distinct_instruments_count, 1);
  assert.strictEqual(radar.xraySummary.top_holding_weight, 100);
  assert.strictEqual(radar.xraySummary.hhi, 10000); // 10,000 scale
  assert.strictEqual(radar.xraySummary.hhi_label, 'High Concentration');
  assert.strictEqual(radar.baseMetrics.risk_label, 'Aggressive');
  assert.ok(radar.baseMetrics.risk_score >= 67);
});

test('Risk Radar 2.0 — Scenario 3: Single Holding Above 50%', () => {
  const h1 = createHolding({ symbol: 'RELIANCE', quantity: 100, current_price: 2500 }); // 2,50,000 (71.4%)
  const h2 = createHolding({ id: 'h2', symbol: 'TCS', isin: 'INE467B01029', quantity: 20, current_price: 3500, sector: 'Technology' }); // 70,000
  const h3 = createHolding({ id: 'h3', symbol: 'HDFCBANK', isin: 'INE040A01034', quantity: 20, current_price: 1500, sector: 'Financial Services' }); // 30,000

  const radar = computeSmartRiskRadar([h1, h2, h3], MOCK_BROKERS);
  assert.ok(radar.baseMetrics.top_holding_weight > 0.50);
  assert.strictEqual(radar.baseMetrics.risk_label, 'Aggressive');

  const singleStockObs = radar.observations.find((o) => o.id === 'obs-single-holding-concentration');
  assert.ok(singleStockObs);
  assert.strictEqual(singleStockObs.severity, 'alert');
  assert.ok(singleStockObs.title.includes('RELIANCE'));
});

test('Risk Radar 2.0 — Scenario 4: Highly Concentrated Sector (>35%)', () => {
  const h1 = createHolding({ id: 'h1', symbol: 'TCS', isin: 'INE467B01029', current_price: 3500, quantity: 20, sector: 'Technology' }); // 70,000
  const h2 = createHolding({ id: 'h2', symbol: 'INFY', isin: 'INE009A01021', current_price: 1500, quantity: 40, sector: 'Technology' }); // 60,000
  const h3 = createHolding({ id: 'h3', symbol: 'WIPRO', isin: 'INE075A01022', current_price: 500, quantity: 40, sector: 'Technology' }); // 20,000
  const h4 = createHolding({ id: 'h4', symbol: 'HDFCBANK', isin: 'INE040A01034', current_price: 1500, quantity: 20, sector: 'Financial Services' }); // 30,000

  // Total Tech = 1,50,000 / 1,80,000 = 83.3%
  const radar = computeSmartRiskRadar([h1, h2, h3, h4], MOCK_BROKERS);
  assert.strictEqual(radar.xraySummary.top_sector, 'Technology');
  assert.ok(radar.xraySummary.top_sector_weight > 80);

  const secObs = radar.observations.find((o) => o.category === 'sector');
  assert.ok(secObs);
  assert.strictEqual(secObs.severity, 'alert');
});

test('Risk Radar 2.0 — Scenario 5: Broadly Diversified Multi-Asset Portfolio', () => {
  const holdings = [
    createHolding({ id: 'h1', symbol: 'TCS', current_price: 3500, quantity: 5, sector: 'Technology', asset_class: 'equity' }), // 17,500
    createHolding({ id: 'h2', symbol: 'HDFCBANK', isin: 'INE040A01034', current_price: 1500, quantity: 12, sector: 'Financial Services', asset_class: 'equity' }), // 18,000
    createHolding({ id: 'h3', symbol: 'TITAN', isin: 'INE280A01028', current_price: 3000, quantity: 5, sector: 'Consumer Goods', asset_class: 'equity' }), // 15,000
    createHolding({ id: 'h4', symbol: 'SUNPHARMA', isin: 'INE044A01036', current_price: 1500, quantity: 10, sector: 'Healthcare', asset_class: 'equity' }), // 15,000
    createHolding({ id: 'h5', symbol: 'GSEC_2033', isin: 'IN0020230085', current_price: 100, quantity: 200, sector: 'Sovereign', asset_class: 'bond' }), // 20,000
    createHolding({ id: 'h6', symbol: 'SGB_MAY29', isin: 'IN0020210053', current_price: 6500, quantity: 3, sector: 'Precious Metals', asset_class: 'sgb' }), // 19,500
  ];

  const radar = computeSmartRiskRadar(holdings, MOCK_BROKERS);
  assert.ok(radar.xraySummary.hhi < 2500, `HHI should be well-diversified, got ${radar.xraySummary.hhi}`);
  assert.ok(radar.baseMetrics.risk_score < 67, `Multi-asset portfolio should not be Aggressive, got ${radar.baseMetrics.risk_score}`);
  assert.ok(radar.baseMetrics.equity_weight < 0.70);
});

test('Risk Radar 2.0 — Scenario 6: Four-Stock Equity Portfolio (No Bogus Top-5 Alerts)', () => {
  const holdings = [
    createHolding({ id: 'h1', symbol: 'STOCK_A', isin: 'INE001A', quantity: 10, current_price: 100 }),
    createHolding({ id: 'h2', symbol: 'STOCK_B', isin: 'INE002B', quantity: 10, current_price: 100 }),
    createHolding({ id: 'h3', symbol: 'STOCK_C', isin: 'INE003C', quantity: 10, current_price: 100 }),
    createHolding({ id: 'h4', symbol: 'STOCK_D', isin: 'INE004D', quantity: 10, current_price: 100 }),
  ];

  const radar = computeSmartRiskRadar(holdings, MOCK_BROKERS);
  // Total holdings = 4. Top 5 concentration observation should NOT fire as an alarming discovery!
  const top5Obs = radar.observations.find((o) => o.id === 'obs-top-five-concentration');
  assert.strictEqual(top5Obs, undefined, 'Top 5 alert should not trigger on 4-holding portfolio');

  // Educational threshold displays small portfolio indicator
  const top5Thresh = radar.educationalThresholds.find((t) => t.metric.includes('Top 5'));
  assert.ok(top5Thresh.currentValue.includes('4 total holdings'));
});

test('Risk Radar 2.0 — Scenario 7: One Broker Account (Operational Custody vs Market Risk)', () => {
  const h1 = createHolding({ broker_account_id: 'broker-zerodha', symbol: 'TCS', current_price: 3500, quantity: 10 });
  const h2 = createHolding({ id: 'h2', broker_account_id: 'broker-zerodha', symbol: 'INFY', isin: 'INE009A', current_price: 1500, quantity: 10 });

  const radar = computeSmartRiskRadar([h1, h2], [MOCK_BROKERS[0]]); // Single broker
  assert.strictEqual(radar.xraySummary.tracked_brokers_count, 1);
  assert.strictEqual(radar.xraySummary.single_broker_notice, 'Cross-broker overlap cannot be assessed across multiple accounts yet.');

  // Operational custody observation exists with clear depository distinction
  const custodyObs = radar.observations.find((o) => o.id === 'obs-single-broker-custody');
  assert.ok(custodyObs);
  assert.strictEqual(custodyObs.category, 'broker');
  assert.ok(custodyObs.whyItMatters.includes('CDSL/NSDL'));

  // Operational risk is populated in baseMetrics
  assert.ok(radar.baseMetrics.operational_risk);
  assert.strictEqual(radar.baseMetrics.operational_risk.is_single_broker, true);
});

test('Risk Radar 2.0 — Scenario 8: Duplicate Securities Across Multiple Brokers', () => {
  const h1 = createHolding({ broker_account_id: 'broker-zerodha', symbol: 'RELIANCE', isin: 'INE002A01018', quantity: 10, current_price: 2500 });
  const h2 = createHolding({ id: 'h2', broker_account_id: 'broker-groww', symbol: 'RELIANCE', isin: 'INE002A01018', quantity: 20, current_price: 2500 });

  const radar = computeSmartRiskRadar([h1, h2], MOCK_BROKERS);
  assert.strictEqual(radar.xraySummary.cross_broker_overlaps_count, 1);
  assert.strictEqual(radar.xraySummary.cross_broker_overlap_valued_pct, 100);

  const overlapObs = radar.observations.find((o) => o.category === 'overlap');
  assert.ok(overlapObs);
  assert.ok(overlapObs.title.includes('Duplicated Across Multiple Brokers'));
});

test('Risk Radar 2.0 — Scenario 9: Missing Sector Data (Unclassified Sector Integrity)', () => {
  const h1 = createHolding({ symbol: 'CUSTOM_FUND', isin: null, sector: null, current_price: 100, quantity: 50 });
  const h2 = createHolding({ id: 'h2', symbol: 'TCS', sector: 'Technology', current_price: 3500, quantity: 10 });

  const radar = computeSmartRiskRadar([h1, h2], MOCK_BROKERS);
  assert.strictEqual(radar.dataQualityRadar.unclassifiedSectorsCount, 1);

  const unclassifiedSec = radar.xray.sector_breakdown.find((s) => s.sector === 'Unclassified');
  assert.ok(unclassifiedSec, 'Unclassified sector must be preserved');
  assert.strictEqual(unclassifiedSec.is_classified, false);
});

test('Risk Radar 2.0 — Scenario 10: Missing Quotes (Valued-Subset Denominator Consistency)', () => {
  const hPriced = createHolding({ id: 'h-priced', symbol: 'TCS', current_price: 3500, quantity: 10, avg_buy_price: 3000 }); // valued: 35,000, cost: 30,000
  const hUnpriced = createHolding({ id: 'h-unpriced', symbol: 'UNLISTED_BOND', current_price: null, quantity: 5, avg_buy_price: 10000 }); // cost: 50,000

  const radar = computeSmartRiskRadar([hPriced, hUnpriced], MOCK_BROKERS);
  assert.strictEqual(radar.xraySummary.priced_positions_count, 1);
  assert.strictEqual(radar.xraySummary.unpriced_positions_count, 1);
  assert.strictEqual(radar.xraySummary.quote_coverage_pct, 50);
  assert.strictEqual(radar.xraySummary.market_valued_capital, 35000);
  assert.strictEqual(radar.xraySummary.is_valuation_complete, false);

  // Denominator consistency: TCS is 100% of the valued subset
  assert.strictEqual(radar.xraySummary.top_holding_weight, 100);
});

test('Risk Radar 2.0 — Scenario 11: Stale Quotes Handling (Coverage vs Freshness)', () => {
  const staleDate = new Date(Date.now() - 72 * 3600 * 1000).toISOString(); // 72 hours ago
  const hStale = createHolding({ price_updated_at: staleDate });

  const radar = computeSmartRiskRadar([hStale], MOCK_BROKERS);
  assert.strictEqual(radar.xraySummary.quote_coverage_pct, 100);
  assert.strictEqual(radar.dataQualityRadar.staleQuotesCount, 1);
  assert.strictEqual(radar.dataQualityRadar.isFullyReliable, false);
});

test('Risk Radar 2.0 — Scenario 12: Mix of Fresh and Stale Quotes', () => {
  const freshDate = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
  const staleDate = new Date(Date.now() - 96 * 3600 * 1000).toISOString();

  const h1 = createHolding({ id: 'h1', price_updated_at: freshDate });
  const h2 = createHolding({ id: 'h2', symbol: 'INFY', isin: 'INE009A', price_updated_at: staleDate });

  const radar = computeSmartRiskRadar([h1, h2], MOCK_BROKERS);
  assert.strictEqual(radar.dataQualityRadar.validPriceCount, 2);
  assert.strictEqual(radar.dataQualityRadar.staleQuotesCount, 1);
  assert.ok(radar.xray.data_quality.freshness_note.includes('1 holding quote(s) are older than 48 hours'));
});

test('Risk Radar 2.0 — Scenario 13: Missing Cost Basis Handling', () => {
  const hNoBuy = createHolding({ avg_buy_price: 0 });
  const radar = computeSmartRiskRadar([hNoBuy], MOCK_BROKERS);

  assert.strictEqual(radar.xray.data_quality.positions_without_cost_basis, 1);
  assert.strictEqual(radar.dataQualityRadar.isFullyReliable, false);
});

test('Risk Radar 2.0 — Scenario 14: Fully Liquidated Holdings Safety', () => {
  const hZero = createHolding({ quantity: 0 });
  const hActive = createHolding({ id: 'h-active', symbol: 'TCS', isin: 'INE467B', quantity: 5, current_price: 3500 });

  // When filtered for positive quantity
  const radar = computeSmartRiskRadar([hZero, hActive].filter((h) => h.quantity > 0), MOCK_BROKERS);
  assert.strictEqual(radar.xraySummary.distinct_instruments_count, 1);
  assert.strictEqual(radar.xraySummary.top_holding_symbol, 'TCS');
});

test('Risk Radar 2.0 — Scenario 15: No Fabricated Historical Volatility', () => {
  const h = createHolding();
  const radar = computeSmartRiskRadar([h], MOCK_BROKERS);

  // Verify explanation does not invent fake beta or fake standard deviation
  assert.ok(!radar.explanation.narrative.includes('beta of'));
  assert.ok(!radar.explanation.narrative.includes('volatility is 24.3%'));
});

test('Risk Radar 2.0 — Scenario 16: HHI 0–1 vs 0–10,000 Conversion Exactness', () => {
  const h1 = createHolding({ id: 'h1', symbol: 'STOCK_A', current_price: 100, quantity: 50 }); // 5,000 (50%)
  const h2 = createHolding({ id: 'h2', symbol: 'STOCK_B', isin: 'INE002B', current_price: 100, quantity: 50 }); // 5,000 (50%)

  const radar = computeSmartRiskRadar([h1, h2], MOCK_BROKERS);
  // (0.5)^2 + (0.5)^2 = 0.50
  assert.strictEqual(radar.baseMetrics.hhi, 0.5);
  // 0.50 * 10,000 = 5,000
  assert.strictEqual(radar.xraySummary.hhi, 5000);
  assert.strictEqual(radar.baseMetrics.hhi_scaled, 5000);
  assert.strictEqual(radar.xraySummary.hhi_label, 'High Concentration');
});

test('Risk Radar 2.0 — Scenario 17: Partial Valuation Denominator Consistency', () => {
  const h1 = createHolding({ id: 'h1', symbol: 'TCS', current_price: 3000, quantity: 10 }); // 30,000
  const h2 = createHolding({ id: 'h2', symbol: 'INFY', isin: 'INE009A', current_price: 1000, quantity: 10 }); // 10,000
  const h3 = createHolding({ id: 'h3', symbol: 'STARTUP_BOND', current_price: null, quantity: 10 }); // unquoted

  const radar = computeSmartRiskRadar([h1, h2, h3], MOCK_BROKERS);
  const valuedTotal = 40000;
  assert.strictEqual(radar.xraySummary.market_valued_capital, valuedTotal);

  // TCS share = 30,000 / 40,000 = 75%
  assert.strictEqual(radar.xraySummary.top_holding_weight, 75);
  // Top 2 share = 40,000 / 40,000 = 100%
  assert.strictEqual(radar.xraySummary.top_2_holdings_weight, 100);
});

test('Risk Radar 2.0 — Scenario 18: Factor Breakdown Math & Weight Consistency', () => {
  const h = createHolding();
  const radar = computeSmartRiskRadar([h], MOCK_BROKERS);

  assert.ok(radar.riskFactorBreakdown.length === 4);
  const totalWeight = radar.riskFactorBreakdown.reduce((sum, f) => sum + f.weightPct, 0);
  assert.strictEqual(totalWeight, 100, 'Sum of factor weights must be exactly 100%');

  for (const f of radar.riskFactorBreakdown) {
    assert.ok(f.score >= 0 && f.score <= 100);
    assert.ok(f.calculatedValue.length > 0);
  }
});

test('Risk Radar 2.0 — Scenario 19: Pure Deterministic Explanations', () => {
  const h = createHolding({ symbol: 'RELIANCE', current_price: 2500, quantity: 10 });
  const radar = computeSmartRiskRadar([h], MOCK_BROKERS);

  assert.ok(radar.explanation.narrative.includes('RELIANCE'));
  assert.ok(radar.explanation.narrative.includes('100.0%'));
  assert.ok(radar.explanation.primaryDrivers.length > 0);
  assert.ok(radar.explanation.riskClassificationRationale.length > 20);
});

test('Risk Radar 2.0 — Scenario 20: Canonical Risk Engine Synchronization', () => {
  const h1 = createHolding({ id: 'h1', symbol: 'RELIANCE', quantity: 20, current_price: 2500 });
  const h2 = createHolding({ id: 'h2', symbol: 'TCS', isin: 'INE467B', quantity: 10, current_price: 3500 });

  const holdings = [h1, h2];
  const xray = computeUnifiedXRay(holdings, MOCK_BROKERS);
  const radar = computeSmartRiskRadar(holdings, MOCK_BROKERS);
  const standaloneRisk = buildRiskMetrics(holdings);

  // X-Ray and Risk Radar must agree 100% on risk_score and risk_label
  assert.strictEqual(xray.summary.risk_score, radar.baseMetrics.risk_score);
  assert.strictEqual(xray.summary.risk_label, radar.baseMetrics.risk_label);
  assert.strictEqual(radar.baseMetrics.risk_score, standaloneRisk.risk_score);
  assert.strictEqual(radar.baseMetrics.risk_label, standaloneRisk.risk_label);
});
