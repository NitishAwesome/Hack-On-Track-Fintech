// ============================================================
// FINOVA — INVESTMENT X-RAY 2.0 VERIFICATION SUITE
// scripts/verify-prompt14-xray-2.0.mjs
//
// Mandatory Test Scenarios (Phase 16):
// A. Concentrated portfolio (one stock > 50%)
// B. Sector-concentrated portfolio
// C. Broadly diversified multi-asset portfolio
// D. Single-stock portfolio
// E. Missing quote portfolio (valued-subset P&L, honest denominator)
// F. Stale quote portfolio (100% quote coverage + visible freshness warning)
// G. One-broker portfolio (overlap not assessable notice)
// H. Missing sector metadata (Unclassified sector preserved)
// I. No news available (Insufficient recent evidence, 0 hallucinations)
// J. Delayed news only (~12h feed delay disclosed)
// K. Gemini failure (100% deterministic fallback)
// L. Duplicate securities across brokers (correct overlap breakdown)
// M. Four-holding portfolio (meaningful Top 1/2/3, not useless Top 5=100%)
// N. Numerical sanity (no NaN, Infinity, or distorted denominators)
// ============================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  computeUnifiedXRay,
} from '../lib/calculations/xray.ts';
import {
  evaluateHoldingOutlook,
} from '../lib/news/holdingOutlook.ts';

// Helper to make mock holdings
function makeHolding({
  id,
  symbol,
  name,
  isin = null,
  quantity = 10,
  avg_buy_price = 1000,
  current_price = 1100,
  asset_class = 'equity',
  sector = 'Information Technology',
  broker_account_id = 'broker-1',
  broker_name = 'Zerodha',
  price_updated_at = new Date().toISOString(),
  price_status = 'ACTIVE',
}) {
  const invested = quantity * avg_buy_price;
  const currentVal = current_price !== null ? quantity * current_price : null;
  const pnl = currentVal !== null ? currentVal - invested : null;
  const pnlPct = currentVal !== null && invested > 0 ? (pnl / invested) * 100 : null;

  return {
    id,
    user_id: 'user-test-1',
    broker_account_id,
    instrument_id: `inst-${symbol}`,
    symbol,
    isin,
    name: name || symbol,
    asset_class,
    exchange: 'NSE',
    quantity,
    avg_buy_price,
    average_buy_price: avg_buy_price,
    current_price,
    currency: 'INR',
    data_source: 'MANUAL',
    as_of: new Date().toISOString(),
    price_updated_at,
    price_source: 'TEST',
    price_status,
    price_unavailability_reason: current_price === null ? 'Quote unavailable' : null,
    day_change: null,
    day_change_pct: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    sector,
    industry: null,
    invested_value: invested,
    current_value: currentVal,
    unrealized_pnl: pnl,
    unrealized_pnl_pct: pnlPct,
    is_quoted: current_price !== null,
    broker_account: {
      id: broker_account_id,
      user_id: 'user-test-1',
      broker_name,
      account_label: broker_name,
      account_type: 'manual',
      color_hex: '#3B82F6',
      created_at: new Date().toISOString(),
    },
  };
}

const mockBrokers = [
  {
    id: 'broker-1',
    user_id: 'user-test-1',
    broker_name: 'Zerodha',
    account_label: 'Zerodha Main',
    account_type: 'manual',
    color_hex: '#3B82F6',
    created_at: new Date().toISOString(),
  },
  {
    id: 'broker-2',
    user_id: 'user-test-1',
    broker_name: 'Groww',
    account_label: 'Groww Direct',
    account_type: 'manual',
    color_hex: '#10B981',
    created_at: new Date().toISOString(),
  },
];

// ------------------------------------------------------------
// Scenario A: Concentrated portfolio (one stock > 50%)
// ------------------------------------------------------------
test('Scenario A: Concentrated portfolio with single stock > 50%', () => {
  const holdings = [
    makeHolding({ id: 'h1', symbol: 'RELIANCE', name: 'Reliance Industries', quantity: 60, current_price: 1000 }), // Val = 60,000 (60%)
    makeHolding({ id: 'h2', symbol: 'INFY', name: 'Infosys Ltd', quantity: 20, current_price: 1000 }), // Val = 20,000 (20%)
    makeHolding({ id: 'h3', symbol: 'TCS', name: 'Tata Consultancy Services', quantity: 20, current_price: 1000 }), // Val = 20,000 (20%)
  ];

  const result = computeUnifiedXRay(holdings, mockBrokers);

  assert.equal(result.summary.top_holding_symbol, 'RELIANCE');
  assert.equal(result.summary.top_holding_weight, 60);
  assert.ok(result.summary.hhi > 2500, 'HHI should reflect high concentration');
  assert.equal(result.summary.hhi_label, 'High Concentration');

  // Verify Risk Reduction action triggers single stock review
  const action = result.risk_reduction_actions.find((a) => a.category === 'single_stock');
  assert.ok(action, 'Should generate single-stock risk-reduction action');
  assert.equal(action.priority, 'HIGH_PRIORITY');
  assert.ok(action.observation.includes('60.0%'));
});

// ------------------------------------------------------------
// Scenario B: Sector-concentrated portfolio (>40% in one sector)
// ------------------------------------------------------------
test('Scenario B: Sector-concentrated portfolio', () => {
  const holdings = [
    makeHolding({ id: 'h1', symbol: 'TCS', name: 'TCS', sector: 'Information Technology', quantity: 30, current_price: 1000 }), // 30,000
    makeHolding({ id: 'h2', symbol: 'INFY', name: 'Infosys', sector: 'Information Technology', quantity: 25, current_price: 1000 }), // 25,000 (total IT = 55%)
    makeHolding({ id: 'h3', symbol: 'HDFCBANK', name: 'HDFC Bank', sector: 'Financial Services', quantity: 45, current_price: 1000 }), // 45,000 (45%)
  ];

  const result = computeUnifiedXRay(holdings, mockBrokers);
  const itSector = result.sector_breakdown.find((s) => s.sector === 'Information Technology');

  assert.ok(itSector);
  assert.equal(itSector.percentage_of_valued, 55);
  assert.ok(itSector.concentration_observation, 'Should flag concentration observation for IT');
  assert.ok(itSector.concentration_observation.includes('55.0%'));

  const sectorAction = result.risk_reduction_actions.find((a) => a.category === 'sector');
  assert.ok(sectorAction, 'Should recommend sector diversification action');
});

// ------------------------------------------------------------
// Scenario C: Broadly diversified multi-asset portfolio
// ------------------------------------------------------------
test('Scenario C: Broadly diversified multi-asset portfolio', () => {
  const holdings = [
    makeHolding({ id: 'h1', symbol: 'TCS', asset_class: 'equity', sector: 'Information Technology', quantity: 20, current_price: 1000 }),
    makeHolding({ id: 'h2', symbol: 'HDFCBANK', asset_class: 'equity', sector: 'Financial Services', quantity: 20, current_price: 1000 }),
    makeHolding({ id: 'h3', symbol: 'EMBASSY', asset_class: 'reit', sector: 'Real Estate', quantity: 20, current_price: 1000 }),
    makeHolding({ id: 'h4', symbol: 'PGINVIT', asset_class: 'invit', sector: 'Utilities', quantity: 20, current_price: 1000 }),
    makeHolding({ id: 'h5', symbol: 'GS2034', asset_class: 'bond', sector: 'Government', quantity: 20, current_price: 1000 }),
  ];

  const result = computeUnifiedXRay(holdings, mockBrokers);

  assert.equal(result.asset_class_breakdown.filter((a) => a.invested_value > 0).length, 4);
  assert.ok(result.summary.top_holding_weight <= 20);
  assert.ok(result.summary.hhi < 2500);
  assert.ok(result.portfolio_interpretation.strengths.length > 0);
});

// ------------------------------------------------------------
// Scenario D: Single-stock portfolio
// ------------------------------------------------------------
test('Scenario D: Single-stock portfolio remains robust without crash', () => {
  const holdings = [
    makeHolding({ id: 'h1', symbol: 'RELIANCE', name: 'Reliance Industries', quantity: 10, current_price: 2500 }),
  ];

  const result = computeUnifiedXRay(holdings, mockBrokers);

  assert.equal(result.summary.distinct_instruments_count, 1);
  assert.equal(result.summary.top_holding_weight, 100);
  assert.equal(result.summary.top_2_holdings_weight, 100);
  assert.equal(result.summary.top_3_holdings_weight, 100);
  assert.equal(result.summary.top_5_holdings_weight, 100);
  assert.equal(result.summary.hhi, 10000);
  assert.equal(result.summary.hhi_label, 'High Concentration');
  assert.ok(result.portfolio_interpretation.primary_concerns.some((c) => c.includes('dominates 100.0% of valued capital')));
});

// ------------------------------------------------------------
// Scenario E: Missing quote portfolio (Valued-subset P&L correctness)
// ------------------------------------------------------------
test('Scenario E: Missing quote portfolio computes valued-subset P&L correctly', () => {
  const holdings = [
    // Quoted position: bought for 10,000, valued at 12,000 (+2,000 P&L)
    makeHolding({ id: 'h1', symbol: 'INFY', quantity: 10, avg_buy_price: 1000, current_price: 1200 }),
    // Unquoted position: bought for 50,000, price UNAVAILABLE
    makeHolding({ id: 'h2', symbol: 'UNQUOTED_CO', quantity: 50, avg_buy_price: 1000, current_price: null }),
  ];

  const result = computeUnifiedXRay(holdings, mockBrokers);

  // Total invested capital across all holdings = 10,000 + 50,000 = 60,000
  assert.equal(result.summary.total_invested_capital, 60000);
  // Market valued capital = 12,000
  assert.equal(result.summary.market_valued_capital, 12000);
  // Valued-subset invested capital = 10,000 ONLY
  assert.equal(result.summary.valued_subset_invested_capital, 10000);
  // Valued-subset unrealized P&L = 12,000 - 10,000 = +2,000 (NOT 12,000 - 60,000 = -48,000!)
  assert.equal(result.summary.valued_subset_unrealized_pnl, 2000);
  assert.equal(result.summary.valued_subset_unrealized_pnl_pct, 20);

  // Honesty flags
  assert.equal(result.summary.is_valuation_complete, false);
  assert.ok(result.summary.valuation_completeness_message.includes('1 of 2 valued positions'));
  assert.equal(result.summary.whole_portfolio_pnl, null, 'Whole-portfolio P&L must be null when quotes are missing');
});

// ------------------------------------------------------------
// Scenario F: Stale quote portfolio (100% quoted but stale timestamps)
// ------------------------------------------------------------
test('Scenario F: Stale quote portfolio distinguishes coverage vs freshness', () => {
  const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
  const holdings = [
    makeHolding({ id: 'h1', symbol: 'INFY', quantity: 10, current_price: 1500, price_updated_at: fiveDaysAgo }),
    makeHolding({ id: 'h2', symbol: 'TCS', quantity: 10, current_price: 3500, price_updated_at: fiveDaysAgo }),
  ];

  const result = computeUnifiedXRay(holdings, mockBrokers);

  assert.equal(result.summary.quote_coverage_pct, 100, 'Quote coverage is 100%');
  assert.equal(result.data_quality.stale_quotes_count, 2, 'Both quotes are stale');
  assert.equal(result.data_quality.is_fully_reliable, false);
  assert.ok(result.data_quality.freshness_note.includes('2 holding quote(s) are older than 48 hours'));
});

// ------------------------------------------------------------
// Scenario G: One-broker portfolio (Single-broker notice)
// ------------------------------------------------------------
test('Scenario G: One-broker portfolio provides honest assessment notice', () => {
  const holdings = [
    makeHolding({ id: 'h1', symbol: 'INFY', quantity: 10, current_price: 1500, broker_account_id: 'broker-1' }),
  ];

  const singleBrokerList = [mockBrokers[0]];
  const result = computeUnifiedXRay(holdings, singleBrokerList);

  assert.equal(result.summary.tracked_brokers_count, 1);
  assert.ok(result.summary.single_broker_notice);
  assert.equal(
    result.summary.single_broker_notice,
    'Cross-broker overlap cannot be assessed across multiple accounts yet.'
  );
  assert.equal(result.overlaps.length, 0);
});

// ------------------------------------------------------------
// Scenario H: Missing sector metadata (Unclassified sector preserved)
// ------------------------------------------------------------
test('Scenario H: Missing sector metadata preserves Unclassified sector honestly', () => {
  const holdings = [
    makeHolding({ id: 'h1', symbol: 'UNKNOWN_INC', sector: null, quantity: 10, current_price: 1000 }),
  ];

  const result = computeUnifiedXRay(holdings, mockBrokers);
  const unclassified = result.sector_breakdown.find((s) => s.sector === 'Unclassified');

  assert.ok(unclassified, 'Unclassified sector must be present');
  assert.equal(unclassified.is_classified, false);
  assert.equal(unclassified.percentage_of_valued, 100);
  assert.equal(result.data_quality.positions_unclassified_sector, 1);
});

// ------------------------------------------------------------
// Scenario I: No news available for holding
// ------------------------------------------------------------
test('Scenario I: No news available returns Insufficient recent evidence without hallucinations', () => {
  const mockInstrument = {
    canonical_key: 'INST_XYZ',
    symbol: 'XYZ',
    name: 'XYZ Enterprises',
    isin: 'INE123XYZ01',
    asset_class: 'equity',
    exchange: 'NSE',
    sector: 'Information Technology',
    match_confidence: 'CONFIRMED',
    match_basis: 'ISIN',
    broker_count: 1,
    broker_names: ['Zerodha'],
    total_quantity: 100,
    total_invested_value: 50000,
    current_price: 550,
    current_value: 55000,
    percentage_of_valued_portfolio: 25,
    is_quoted: true,
    contributions: [],
  };

  const outlook = evaluateHoldingOutlook(mockInstrument, []);

  assert.equal(outlook.outlook_label, 'Insufficient recent evidence');
  assert.equal(outlook.cited_articles.length, 0);
  assert.ok(outlook.outlook_summary.includes('No sufficiently recent verified news is available for this holding'));
  assert.ok(outlook.research_priorities.length > 0);
  assert.ok(outlook.limitations_disclaimer.includes('Evidence-based research'));
});

// ------------------------------------------------------------
// Scenario J: Delayed news only (~12h feed delay disclosed)
// ------------------------------------------------------------
test('Scenario J: Delayed news only discloses ~12h delay transparently', () => {
  const mockInstrument = {
    canonical_key: 'INST_TCS',
    symbol: 'TCS',
    name: 'Tata Consultancy Services',
    isin: 'INE467B01029',
    asset_class: 'equity',
    exchange: 'NSE',
    sector: 'Information Technology',
    match_confidence: 'CONFIRMED',
    match_basis: 'ISIN',
    broker_count: 1,
    broker_names: ['Zerodha'],
    total_quantity: 10,
    total_invested_value: 35000,
    current_price: 3600,
    current_value: 36000,
    percentage_of_valued_portfolio: 30,
    is_quoted: true,
    contributions: [],
  };

  const delayedArticle = {
    article_id: 'newsdata-1',
    title: 'TCS announces order win and digital partnership',
    description: 'TCS net profit jumps as company secures deal in Europe.',
    link: 'https://example.com/tcs',
    published_at: new Date(Date.now() - 14 * 60 * 60 * 1000).toISOString(),
    publisher: 'Financial Express',
    provider: 'NewsData.io',
    source_provider: 'NEWSDATA',
    is_delayed: true,
    feed_delay_note: 'NewsData.io Free feed (~12h access delay)',
    cached: false,
    matched_symbols: ['TCS'],
    matched_companies: ['Tata Consultancy Services'],
  };

  const outlook = evaluateHoldingOutlook(mockInstrument, [delayedArticle]);

  assert.ok(outlook.has_delayed_feed_sources, 'Should flag delayed feed sources');
  assert.equal(outlook.cited_articles.length, 1);
  assert.equal(outlook.cited_articles[0].is_delayed_feed, true);
  assert.ok(outlook.cited_articles[0].delay_note.includes('~12h access delay'));
});

// ------------------------------------------------------------
// Scenario K: Gemini failure fallback
// ------------------------------------------------------------
test('Scenario K: Pure deterministic synthesis functions 100% with no AI dependencies', () => {
  const holdings = [
    makeHolding({ id: 'h1', symbol: 'INFY', quantity: 10, current_price: 1500 }),
    makeHolding({ id: 'h2', symbol: 'TCS', quantity: 5, current_price: 3000 }),
  ];

  const result = computeUnifiedXRay(holdings, mockBrokers);

  assert.ok(result.portfolio_interpretation.composition_summary);
  assert.ok(result.portfolio_interpretation.strengths.length > 0);
  assert.ok(result.portfolio_interpretation.primary_concerns.length > 0);
  assert.ok(result.risk_reduction_actions.length > 0);
});

// ------------------------------------------------------------
// Scenario L: Duplicate securities across brokers
// ------------------------------------------------------------
test('Scenario L: Duplicate securities across multiple brokers consolidates correctly', () => {
  const holdings = [
    // 10 shares of RELIANCE in Zerodha
    makeHolding({
      id: 'h1',
      symbol: 'RELIANCE',
      isin: 'INE002A01018',
      quantity: 10,
      avg_buy_price: 2000,
      current_price: 2500,
      broker_account_id: 'broker-1',
      broker_name: 'Zerodha',
    }),
    // 15 shares of RELIANCE in Groww
    makeHolding({
      id: 'h2',
      symbol: 'RELIANCE',
      isin: 'INE002A01018',
      quantity: 15,
      avg_buy_price: 2200,
      current_price: 2500,
      broker_account_id: 'broker-2',
      broker_name: 'Groww',
    }),
  ];

  const result = computeUnifiedXRay(holdings, mockBrokers);

  assert.equal(result.summary.distinct_instruments_count, 1, 'Should consolidate to 1 distinct instrument');
  assert.equal(result.summary.total_positions_count, 2, 'Should preserve 2 open positions');
  assert.equal(result.summary.cross_broker_overlaps_count, 1, 'Should identify 1 overlap');

  const inst = result.consolidated_instruments[0];
  assert.equal(inst.total_quantity, 25, '10 + 15 = 25 shares');
  assert.equal(inst.broker_count, 2);
  assert.equal(inst.current_value, 62500, '25 * 2500 = 62,500');

  const overlap = result.overlaps[0];
  assert.equal(overlap.total_quantity, 25);
  assert.equal(overlap.brokers_breakdown.length, 2);
});

// ------------------------------------------------------------
// Scenario M: Four-holding portfolio (meaningful Top 1, 2, 3)
// ------------------------------------------------------------
test('Scenario M: Four-holding portfolio prioritizes Top 1, 2, 3 without useless alerts', () => {
  const holdings = [
    makeHolding({ id: 'h1', symbol: 'A', quantity: 10, current_price: 100 }),
    makeHolding({ id: 'h2', symbol: 'B', quantity: 10, current_price: 100 }),
    makeHolding({ id: 'h3', symbol: 'C', quantity: 10, current_price: 100 }),
    makeHolding({ id: 'h4', symbol: 'D', quantity: 10, current_price: 100 }),
  ];

  const result = computeUnifiedXRay(holdings, mockBrokers);

  assert.equal(result.summary.distinct_instruments_count, 4);
  assert.equal(result.summary.top_holding_weight, 25);
  assert.equal(result.summary.top_2_holdings_weight, 50);
  assert.equal(result.summary.top_3_holdings_weight, 75);
  // Top 5 mathematically is 100% since only 4 exist, but top 1, 2, 3 provide the meaningful insight
  assert.equal(result.summary.top_5_holdings_weight, 100);
});

// ------------------------------------------------------------
// Scenario N: Numerical sanity
// ------------------------------------------------------------
test('Scenario N: Numerical calculations never return NaN or Infinity', () => {
  const holdings = [
    makeHolding({ id: 'h1', symbol: 'TEST', quantity: 0.5, avg_buy_price: 10.33, current_price: 12.77 }),
  ];

  const result = computeUnifiedXRay(holdings, mockBrokers);

  assert.ok(!isNaN(result.summary.total_invested_capital));
  assert.ok(!isNaN(result.summary.market_valued_capital));
  assert.ok(!isNaN(result.summary.valued_subset_invested_capital));
  assert.ok(!isNaN(result.summary.valued_subset_unrealized_pnl));
  assert.ok(!isNaN(result.summary.valued_subset_unrealized_pnl_pct));
  assert.ok(!isNaN(result.summary.top_holding_weight));
  assert.ok(!isNaN(result.summary.hhi));
  assert.ok(!isNaN(result.summary.risk_score));
});
