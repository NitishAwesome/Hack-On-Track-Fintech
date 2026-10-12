// ============================================================
// FINOVA — GUEST PREVIEW & PRODUCT UNIFICATION VERIFICATION
// scripts/verify-guest-preview.mjs
// ============================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { DEMO_HOLDINGS, DEMO_BROKERS, getDemoPortfolioSummary } from '../lib/demoData.ts';
import { computeUnifiedXRay } from '../lib/calculations/xray.ts';
import { computeSmartRiskRadar } from '../lib/calculations/riskRadar.ts';
import {
  calculatePortfolioBeforeAfter,
  calculateStrategyAllocation,
} from '../lib/calculations/futureLab.ts';

test('1. DEMO PORTFOLIO ARITHMETIC RECONCILIATION', () => {
  const summary = getDemoPortfolioSummary();
  assert.strictEqual(summary.totalInvested, 699000, 'Invested capital must strictly be ₹6,99,000');
  assert.strictEqual(summary.totalCurrent, 844085, 'Market valuation must strictly be ₹8,44,085');
  assert.strictEqual(summary.pnl, 145085, 'Unrealized P&L must strictly be ₹1,45,085');
  assert.ok(Math.abs(summary.pnlPct - 20.75) < 0.1, 'P&L% must be ~20.75%');
});

test('2. BROKER CONSOLIDATION SPOTLIGHT (MULTI-BROKER DEDUPLICATION)', () => {
  assert.strictEqual(DEMO_BROKERS.length, 3, 'Demo portfolio must have 3 distinct brokers');
  
  // Reliance exists in both Zerodha and Groww
  const relianceHoldings = DEMO_HOLDINGS.filter(h => h.symbol === 'RELIANCE');
  assert.strictEqual(relianceHoldings.length, 2, 'Reliance must be held across 2 broker accounts');
  
  const zerodhaReliance = relianceHoldings.find(h => h.broker_account_id === 'demo-broker-1');
  const growwReliance = relianceHoldings.find(h => h.broker_account_id === 'demo-broker-2');
  
  assert.ok(zerodhaReliance, 'Must have Zerodha Reliance position');
  assert.ok(growwReliance, 'Must have Groww Reliance position');
  assert.strictEqual(zerodhaReliance.quantity, 45, 'Zerodha Reliance qty = 45');
  assert.strictEqual(growwReliance.quantity, 15, 'Groww Reliance qty = 15');
  
  const totalRelianceQty = zerodhaReliance.quantity + growwReliance.quantity;
  assert.strictEqual(totalRelianceQty, 60, 'Consolidated Reliance quantity must be 60 shares');
  
  const totalRelianceValue = (zerodhaReliance.quantity + growwReliance.quantity) * 2985;
  assert.strictEqual(totalRelianceValue, 179100, 'Consolidated Reliance value must be ₹1,79,100');
});

test('3. INVESTMENT X-RAY ON DEMO PORTFOLIO RUNS CANONICAL CALCULATIONS', () => {
  const enrichedHoldings = DEMO_HOLDINGS.map(h => ({
    ...h,
    user_id: h.user_id,
    broker_name: DEMO_BROKERS.find(b => b.id === h.broker_account_id)?.broker_name || 'Broker',
    broker_account_id: h.broker_account_id,
    instrument_id: `inst-${h.symbol}`,
    name: h.name,
    exchange: h.exchange || 'NSE',
    currency: 'INR',
    invested_value: h.quantity * h.avg_buy_price,
    current_value: h.quantity * (h.current_price || h.avg_buy_price),
    unrealized_pnl: (h.quantity * (h.current_price || h.avg_buy_price)) - (h.quantity * h.avg_buy_price),
    unrealized_pnl_percent: (((h.current_price || h.avg_buy_price) - h.avg_buy_price) / h.avg_buy_price) * 100,
    allocation_percent: 0,
    price_status: 'ACTIVE',
    price_updated_at: new Date().toISOString(),
  }));

  const xray = computeUnifiedXRay(enrichedHoldings, DEMO_BROKERS);
  assert.ok(xray, 'X-Ray computation must succeed');
  assert.strictEqual(xray.summary.total_invested_capital, 699000);
  assert.strictEqual(xray.summary.market_valued_capital, 844085);
  assert.strictEqual(xray.summary.quote_coverage_pct, 100);
  
  // 8 raw holdings consolidate into 7 unique instruments
  assert.strictEqual(xray.consolidated_instruments.length, 7, '8 holdings consolidate into 7 unique securities');
  
  const consolidatedReliance = xray.consolidated_instruments.find(i => i.symbol === 'RELIANCE');
  assert.ok(consolidatedReliance, 'Consolidated Reliance must be present');
  assert.strictEqual(consolidatedReliance.total_quantity, 60);
  assert.strictEqual(consolidatedReliance.current_value, 179100);
  assert.strictEqual(consolidatedReliance.contributions.length, 2, 'Must have 2 broker contributions');
});

test('4. SMART RISK RADAR ON DEMO PORTFOLIO AGREES NUMERICALLY WITH X-RAY', () => {
  const enrichedHoldings = DEMO_HOLDINGS.map(h => ({
    ...h,
    user_id: h.user_id,
    broker_name: DEMO_BROKERS.find(b => b.id === h.broker_account_id)?.broker_name || 'Broker',
    broker_account_id: h.broker_account_id,
    instrument_id: `inst-${h.symbol}`,
    name: h.name,
    exchange: h.exchange || 'NSE',
    currency: 'INR',
    invested_value: h.quantity * h.avg_buy_price,
    current_value: h.quantity * (h.current_price || h.avg_buy_price),
    unrealized_pnl: (h.quantity * (h.current_price || h.avg_buy_price)) - (h.quantity * h.avg_buy_price),
    unrealized_pnl_percent: (((h.current_price || h.avg_buy_price) - h.avg_buy_price) / h.avg_buy_price) * 100,
    allocation_percent: 0,
    price_status: 'ACTIVE',
    price_updated_at: new Date().toISOString(),
  }));

  const riskRadar = computeSmartRiskRadar(enrichedHoldings, DEMO_BROKERS);
  assert.ok(riskRadar, 'Risk Radar computation must succeed');
  assert.strictEqual(riskRadar.baseMetrics.risk_score, 24, 'Score must be 24 / 100');
  assert.strictEqual(riskRadar.baseMetrics.risk_label, 'Conservative', 'Internal category must be Conservative');
  assert.strictEqual(riskRadar.baseMetrics.hhi, 0.15, 'HHI decimal must be 0.15');
  assert.strictEqual(Math.round(riskRadar.baseMetrics.hhi * 10000), 1500, 'HHI on 10k scale must be 1,500');
  assert.strictEqual(riskRadar.xraySummary.cross_broker_overlaps_count, 1, 'Exactly 1 cross-broker overlap (Reliance)');
});

test('5. FUTURE LAB DETERMINISTIC BEFORE-VS-AFTER RECONCILIATION', () => {
  const enrichedHoldings = DEMO_HOLDINGS.map(h => ({
    ...h,
    user_id: h.user_id,
    broker_name: DEMO_BROKERS.find(b => b.id === h.broker_account_id)?.broker_name || 'Broker',
    broker_account_id: h.broker_account_id,
    instrument_id: `inst-${h.symbol}`,
    name: h.name,
    exchange: h.exchange || 'NSE',
    currency: 'INR',
    invested_value: h.quantity * h.avg_buy_price,
    current_value: h.quantity * (h.current_price || h.avg_buy_price),
    unrealized_pnl: (h.quantity * (h.current_price || h.avg_buy_price)) - (h.quantity * h.avg_buy_price),
    unrealized_pnl_percent: (((h.current_price || h.avg_buy_price) - h.avg_buy_price) / h.avg_buy_price) * 100,
    allocation_percent: 0,
    price_status: 'ACTIVE',
    price_updated_at: new Date().toISOString(),
  }));

  const simulatedAmount = 100000;
  const beforeAfter = calculatePortfolioBeforeAfter(enrichedHoldings, DEMO_BROKERS, simulatedAmount, 'conservative');
  assert.strictEqual(beforeAfter.baseline.valuationBase, 844085, 'Baseline must be ₹8,44,085');
  assert.strictEqual(beforeAfter.simulated.newTotalValuation, 944085, 'Simulated must be ₹9,44,085 (844085 + 100000)');
  assert.strictEqual(beforeAfter.simulated.additionalAmount, 100000);

  const allocation = calculateStrategyAllocation(simulatedAmount, 'conservative');
  assert.strictEqual(allocation.reconciledTotal, 100000, 'Strategy allocation must reconcile to ₹1,00,000');
  const sumCats = allocation.categories.reduce((acc, c) => acc + c.allocatedRupees, 0);
  assert.strictEqual(sumCats, 100000, 'Sum of category rupees must equal input amount');
});

test('6. CLEAN FEATURE NAMES (NO INTERNAL VERSION/SPRINT SUFFIXES IN VISIBLE UI)', () => {
  const sidebarContent = fs.readFileSync(path.resolve('./components/layout/Sidebar.tsx'), 'utf-8');
  assert.ok(!sidebarContent.includes('X-Ray 2.0'), 'Sidebar must not have X-Ray 2.0');
  assert.ok(!sidebarContent.includes('Risk Radar 2.0'), 'Sidebar must not have Risk Radar 2.0');
  assert.ok(!sidebarContent.includes('Future Lab 2.0'), 'Sidebar must not have Future Lab 2.0');
  assert.ok(!sidebarContent.includes('Explorer 2.0'), 'Sidebar must not have Explorer 2.0');
  assert.ok(sidebarContent.includes("'Investment X-Ray'"), 'Sidebar must have Investment X-Ray');
  assert.ok(sidebarContent.includes("'Risk Radar'"), 'Sidebar must have Risk Radar');
  assert.ok(sidebarContent.includes("'Future Lab'"), 'Sidebar must have Future Lab');
  assert.ok(sidebarContent.includes("'Investment Explorer'"), 'Sidebar must have Investment Explorer');
  assert.ok(sidebarContent.includes("'FINOVA Intelligence'"), 'Sidebar must have FINOVA Intelligence');
  assert.ok(!sidebarContent.includes("'Guest Preview'"), 'Sidebar must not have Guest Preview in Discover');

  const landingNav = fs.readFileSync(path.resolve('./components/landing/LandingNavbar.tsx'), 'utf-8');
  assert.ok(landingNav.includes('Guest Preview'), 'Landing navbar must say Guest Preview');

  const heroSection = fs.readFileSync(path.resolve('./components/landing/HeroSection.tsx'), 'utf-8');
  assert.ok(heroSection.includes('Explore Guest Preview'), 'Hero CTA must say Explore Guest Preview');
});
