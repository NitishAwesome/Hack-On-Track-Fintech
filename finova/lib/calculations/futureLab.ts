// ============================================================
// FINOVA — Innovation One & Two: Portfolio Future Lab Engine
// lib/calculations/futureLab.ts
//
// Core calculations for:
// 1. What-If Portfolio Simulator & Before-After Analyzer
// 2. Goal Funding Progress & Zero-Growth Contribution Planning
//
// Principles:
// - Deterministic, decimal-safe arithmetic (no JS float drift)
// - Strictly read-only: never modifies actual holdings or ledger
// - Total value preservation for pure asset-class transfers
// - Grounded, transparent before-versus-after comparisons
// ============================================================

import type {
  HoldingWithMetrics,
  AssetClass,
  BrokerAccount,
} from '@/types/portfolio';
import { roundCurrency, roundPercent } from './portfolio.ts';
import { computeUnifiedXRay } from './xray.ts';
import { computeHHI } from './risk.ts';

export type SimulationScenarioType =
  | 'REALLOCATION'
  | 'NEW_CONTRIBUTION'
  | 'TARGET_ALLOCATION';

export interface AssetClassAllocationSim {
  assetClass: AssetClass;
  displayName: string;
  baselineValue: number;
  baselinePercent: number;
  simulatedValue: number;
  simulatedPercent: number;
  deltaValue: number;
  deltaPercent: number;
}

export interface WhatIfSimulationInput {
  scenarioType: SimulationScenarioType;
  additionalContribution?: number; // In INR (>= 0)
  // Target percentages for asset classes (must sum to 100)
  targetPercentages?: Partial<Record<AssetClass, number>>;
  // Or transfers: from assetClass -> to assetClass by percentage or amount
  transfer?: {
    fromClass: AssetClass;
    toClass: AssetClass;
    amount?: number; // In INR
    percentage?: number; // 0 to 100
  };
}

export interface BeforeAfterMetricComparison {
  metricName: string;
  category: 'ALLOCATION' | 'CONCENTRATION' | 'VALUATION' | 'DATA_QUALITY';
  currentValue: string;
  simulatedValue: string;
  changeDelta: string;
  direction: 'INCREASED' | 'DECREASED' | 'UNCHANGED';
  educationalNote: string;
}

export interface WhatIfSimulationResult {
  baselineSummary: {
    totalInvestedCapital: number;
    marketValuedCapital: number;
    isFullyValued: boolean;
    quoteCoveragePct: number;
    unpricedPositionsCount: number;
    coverageLimitationNote: string;
  };
  simulatedSummary: {
    totalSimulatedCapital: number;
    additionalContribution: number;
    scenarioType: SimulationScenarioType;
    allocationSumPct: number;
  };
  assetClassAllocations: AssetClassAllocationSim[];
  metricComparisons: BeforeAfterMetricComparison[];
  educationalScenarioSummary: {
    title: string;
    description: string;
    keyTakeaway: string;
    assumptionsAndLimitations: string[];
  };
}

export const CANONICAL_SIMULATION_ASSET_CLASSES: Array<{
  id: AssetClass;
  label: string;
}> = [
  { id: 'equity', label: 'Equities & Stocks' },
  { id: 'etf', label: 'Exchange Traded Funds (ETFs)' },
  { id: 'mf', label: 'Mutual Funds' },
  { id: 'bond', label: 'Bonds & Fixed Income' },
  { id: 'sgb', label: 'Gold & SGBs' },
  { id: 'reit', label: 'REITs (Real Estate)' },
  { id: 'invit', label: 'InvITs (Infrastructure)' },
];

/**
 * Validates simulation input parameters to prevent invalid percentages,
 * negative contributions, NaN, or non-summing target distributions.
 */
export function validateSimulationInput(
  input: WhatIfSimulationInput
): { isValid: boolean; error?: string } {
  if (
    input.additionalContribution !== undefined &&
    (isNaN(input.additionalContribution) || input.additionalContribution < 0)
  ) {
    return { isValid: false, error: 'Additional contribution cannot be negative.' };
  }

  if (input.targetPercentages) {
    let sum = 0;
    for (const [cls, pct] of Object.entries(input.targetPercentages)) {
      if (typeof pct !== 'number' || isNaN(pct) || pct < 0 || pct > 100) {
        return { isValid: false, error: `Invalid percentage for asset class ${cls}.` };
      }
      sum += pct;
    }
    if (Object.keys(input.targetPercentages).length > 0 && Math.abs(sum - 100) > 0.05) {
      return {
        isValid: false,
        error: `Target allocation percentages must sum to exactly 100% (currently ${sum.toFixed(1)}%).`,
      };
    }
  }

  if (input.transfer) {
    if (input.transfer.fromClass === input.transfer.toClass) {
      return { isValid: false, error: 'Source and destination asset classes must be different.' };
    }
    if (input.transfer.percentage !== undefined && (input.transfer.percentage < 0 || input.transfer.percentage > 100)) {
      return { isValid: false, error: 'Transfer percentage must be between 0% and 100%.' };
    }
    if (input.transfer.amount !== undefined && input.transfer.amount < 0) {
      return { isValid: false, error: 'Transfer amount cannot be negative.' };
    }
  }

  return { isValid: true };
}

/**
 * Executes a deterministic What-If Portfolio Allocation Simulation against
 * the user's current baseline portfolio.
 */
export function runWhatIfSimulation(
  holdings: HoldingWithMetrics[],
  brokerAccounts: BrokerAccount[] = [],
  input: WhatIfSimulationInput
): WhatIfSimulationResult {
  const validation = validateSimulationInput(input);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  const xray = computeUnifiedXRay(holdings, brokerAccounts);

  // Determine baseline valuation base (prefers market value, falls back to invested value)
  const isFullyValued = xray.data_quality.unquoted_positions === 0;
  const hasMarketValue = xray.summary.market_valued_capital !== null && xray.summary.market_valued_capital > 0;
  const baselineValuationBase = hasMarketValue
    ? xray.summary.market_valued_capital!
    : xray.summary.total_invested_capital;

  const coverageNote = isFullyValued
    ? 'Calculated using verified market prices for 100% of holdings.'
    : `Baseline reflects ${xray.summary.quote_coverage_pct}% quote coverage. ${xray.data_quality.unquoted_positions} unquoted holding(s) are excluded from market valuation.`;

  // Compute baseline allocation per canonical asset class
  const baselineClassValues = new Map<AssetClass, number>();
  for (const item of CANONICAL_SIMULATION_ASSET_CLASSES) {
    baselineClassValues.set(item.id, 0);
  }

  for (const inst of xray.consolidated_instruments) {
    const val = hasMarketValue
      ? (inst.current_value ?? 0)
      : inst.total_invested_value;
    const current = baselineClassValues.get(inst.asset_class) || 0;
    baselineClassValues.set(inst.asset_class, current + val);
  }

  // Calculate simulated values
  const simulatedClassValues = new Map<AssetClass, number>(baselineClassValues);
  const additionalContrib = roundCurrency(input.additionalContribution || 0);
  const totalSimulatedCapital = roundCurrency(baselineValuationBase + additionalContrib);

  if (input.scenarioType === 'TARGET_ALLOCATION' && input.targetPercentages) {
    // Mode A: Allocate total simulated capital according to target percentages
    for (const item of CANONICAL_SIMULATION_ASSET_CLASSES) {
      const targetPct = input.targetPercentages[item.id] || 0;
      const targetVal = roundCurrency((targetPct / 100) * totalSimulatedCapital);
      simulatedClassValues.set(item.id, targetVal);
    }
  } else if (input.scenarioType === 'REALLOCATION' && input.transfer) {
    // Mode B: Shift capital from one class to another
    const { fromClass, toClass, percentage, amount } = input.transfer;
    const currentFromVal = simulatedClassValues.get(fromClass) || 0;

    let shiftVal = 0;
    if (typeof percentage === 'number') {
      shiftVal = roundCurrency((percentage / 100) * currentFromVal);
    } else if (typeof amount === 'number') {
      shiftVal = Math.min(roundCurrency(amount), currentFromVal);
    }

    simulatedClassValues.set(fromClass, roundCurrency(currentFromVal - shiftVal));
    simulatedClassValues.set(toClass, roundCurrency((simulatedClassValues.get(toClass) || 0) + shiftVal));
  } else if (input.scenarioType === 'NEW_CONTRIBUTION' && additionalContrib > 0) {
    // Mode C: Allocate new contribution across target percentages or default to Fixed Income / Equities
    if (input.targetPercentages && Object.keys(input.targetPercentages).length > 0) {
      for (const item of CANONICAL_SIMULATION_ASSET_CLASSES) {
        const pct = input.targetPercentages[item.id] || 0;
        const contribPart = roundCurrency((pct / 100) * additionalContrib);
        simulatedClassValues.set(item.id, (simulatedClassValues.get(item.id) || 0) + contribPart);
      }
    } else {
      // Default: allocate 100% of contribution to Fixed Income / Bonds for risk mitigation demonstration
      simulatedClassValues.set('bond', (simulatedClassValues.get('bond') || 0) + additionalContrib);
    }
  }

  // Construct asset class comparisons
  const assetClassAllocations: AssetClassAllocationSim[] = CANONICAL_SIMULATION_ASSET_CLASSES.map(
    (item) => {
      const baseVal = roundCurrency(baselineClassValues.get(item.id) || 0);
      const basePct = baselineValuationBase > 0 ? roundPercent((baseVal / baselineValuationBase) * 100) : 0;

      const simVal = roundCurrency(simulatedClassValues.get(item.id) || 0);
      const simPct = totalSimulatedCapital > 0 ? roundPercent((simVal / totalSimulatedCapital) * 100) : 0;

      return {
        assetClass: item.id,
        displayName: item.label,
        baselineValue: baseVal,
        baselinePercent: basePct,
        simulatedValue: simVal,
        simulatedPercent: simPct,
        deltaValue: roundCurrency(simVal - baseVal),
        deltaPercent: roundPercent(simPct - basePct),
      };
    }
  );

  // Compute key metric comparisons
  const baseEquityPct =
    assetClassAllocations.find((a) => a.assetClass === 'equity')?.baselinePercent || 0;
  const simEquityPct =
    assetClassAllocations.find((a) => a.assetClass === 'equity')?.simulatedPercent || 0;

  const baseBondPct =
    assetClassAllocations.find((a) => a.assetClass === 'bond')?.baselinePercent || 0;
  const simBondPct =
    assetClassAllocations.find((a) => a.assetClass === 'bond')?.simulatedPercent || 0;

  const baseAltPct =
    (assetClassAllocations.find((a) => a.assetClass === 'reit')?.baselinePercent || 0) +
    (assetClassAllocations.find((a) => a.assetClass === 'invit')?.baselinePercent || 0) +
    (assetClassAllocations.find((a) => a.assetClass === 'sgb')?.baselinePercent || 0);
  const simAltPct =
    (assetClassAllocations.find((a) => a.assetClass === 'reit')?.simulatedPercent || 0) +
    (assetClassAllocations.find((a) => a.assetClass === 'invit')?.simulatedPercent || 0) +
    (assetClassAllocations.find((a) => a.assetClass === 'sgb')?.simulatedPercent || 0);

  // Single largest holding exposure (diluted across new denominator if additional contribution made)
  const topInst = [...xray.consolidated_instruments].sort((a, b) => (hasMarketValue ? (b.current_value ?? 0) - (a.current_value ?? 0) : b.total_invested_value - a.total_invested_value))[0];
  const baseTopVal = hasMarketValue ? (topInst?.current_value ?? 0) : (topInst?.total_invested_value ?? 0);
  const baseTopPct = baselineValuationBase > 0 ? roundPercent((baseTopVal / baselineValuationBase) * 100) : 0;
  const simTopPct = totalSimulatedCapital > 0 ? roundPercent((baseTopVal / totalSimulatedCapital) * 100) : 0;

  const metricComparisons: BeforeAfterMetricComparison[] = [
    {
      metricName: 'Equity Exposure',
      category: 'ALLOCATION',
      currentValue: `${baseEquityPct.toFixed(1)}%`,
      simulatedValue: `${simEquityPct.toFixed(1)}%`,
      changeDelta: `${simEquityPct >= baseEquityPct ? '+' : ''}${(simEquityPct - baseEquityPct).toFixed(1)}%`,
      direction: simEquityPct > baseEquityPct ? 'INCREASED' : simEquityPct < baseEquityPct ? 'DECREASED' : 'UNCHANGED',
      educationalNote: 'Screens for sensitivity to market corrections and economic cycle volatility.',
    },
    {
      metricName: 'Fixed Income (Bonds/Debt)',
      category: 'ALLOCATION',
      currentValue: `${baseBondPct.toFixed(1)}%`,
      simulatedValue: `${simBondPct.toFixed(1)}%`,
      changeDelta: `${simBondPct >= baseBondPct ? '+' : ''}${(simBondPct - baseBondPct).toFixed(1)}%`,
      direction: simBondPct > baseBondPct ? 'INCREASED' : simBondPct < baseBondPct ? 'DECREASED' : 'UNCHANGED',
      educationalNote: 'Provides contractual coupon cash flow and dampens equity drawdown swings.',
    },
    {
      metricName: 'Alternative Assets (REIT/InvIT/Gold)',
      category: 'ALLOCATION',
      currentValue: `${baseAltPct.toFixed(1)}%`,
      simulatedValue: `${simAltPct.toFixed(1)}%`,
      changeDelta: `${simAltPct >= baseAltPct ? '+' : ''}${(simAltPct - baseAltPct).toFixed(1)}%`,
      direction: simAltPct > baseAltPct ? 'INCREASED' : simAltPct < baseAltPct ? 'DECREASED' : 'UNCHANGED',
      educationalNote: 'Offers non-equity income distributions and inflation hedging mechanisms.',
    },
    {
      metricName: 'Largest Single Holding Concentration',
      category: 'CONCENTRATION',
      currentValue: `${baseTopPct.toFixed(1)}%`,
      simulatedValue: `${simTopPct.toFixed(1)}%`,
      changeDelta: `${simTopPct >= baseTopPct ? '+' : ''}${(simTopPct - baseTopPct).toFixed(1)}%`,
      direction: simTopPct > baseTopPct ? 'INCREASED' : simTopPct < baseTopPct ? 'DECREASED' : 'UNCHANGED',
      educationalNote: topInst
        ? `Model assumes existing ${topInst.name} holding (${baseTopPct.toFixed(1)}%) is diluted across the expanded capital base.`
        : 'Measures single-company idiosyncratic risk.',
    },
    {
      metricName: 'Total Portfolio Capital Base',
      category: 'VALUATION',
      currentValue: `₹${baselineValuationBase.toLocaleString('en-IN')}`,
      simulatedValue: `₹${totalSimulatedCapital.toLocaleString('en-IN')}`,
      changeDelta: additionalContrib > 0 ? `+₹${additionalContrib.toLocaleString('en-IN')}` : '₹0',
      direction: additionalContrib > 0 ? 'INCREASED' : 'UNCHANGED',
      educationalNote:
        additionalContrib > 0
          ? `Includes ₹${additionalContrib.toLocaleString('en-IN')} hypothetical new contribution.`
          : 'Pure reallocation preserves 100% of existing capital base.',
    },
    {
      metricName: 'Asset-Class Concentration (HHI)',
      category: 'CONCENTRATION',
      currentValue: `${(computeHHI(assetClassAllocations.map((a) => a.baselinePercent / 100)) * 100).toFixed(1)}%`,
      simulatedValue: `${(computeHHI(assetClassAllocations.map((a) => a.simulatedPercent / 100)) * 100).toFixed(1)}%`,
      changeDelta: `${
        computeHHI(assetClassAllocations.map((a) => a.simulatedPercent / 100)) >=
        computeHHI(assetClassAllocations.map((a) => a.baselinePercent / 100))
          ? '+'
          : ''
      }${(
        (computeHHI(assetClassAllocations.map((a) => a.simulatedPercent / 100)) -
          computeHHI(assetClassAllocations.map((a) => a.baselinePercent / 100))) *
        100
      ).toFixed(1)}%`,
      direction:
        computeHHI(assetClassAllocations.map((a) => a.simulatedPercent / 100)) >
        computeHHI(assetClassAllocations.map((a) => a.baselinePercent / 100))
          ? 'INCREASED'
          : computeHHI(assetClassAllocations.map((a) => a.simulatedPercent / 100)) <
            computeHHI(assetClassAllocations.map((a) => a.baselinePercent / 100))
          ? 'DECREASED'
          : 'UNCHANGED',
      educationalNote:
        'Herfindahl-Hirschman index across asset classes. Lower scores reflect a more evenly distributed asset-class mix.',
    },
  ];

  // Educational summary text
  let summaryTitle = 'Hypothetical Allocation Model';
  let summaryDesc = 'This scenario explores a calibrated redistribution across your asset categories.';
  let takeaway = 'Reallocating toward fixed income and alternatives generally stabilizes cash distributions but lowers high-beta capital appreciation.';

  if (simBondPct > baseBondPct) {
    summaryTitle = 'Defensive & Income-Weighted Scenario';
    summaryDesc = `Simulated a ${(simBondPct - baseBondPct).toFixed(1)}% increase in fixed income/bonds to enhance portfolio resilience.`;
    takeaway = 'Higher fixed-income weighting dampens drawdown volatility during market sell-offs, though inflation-adjusted upside is capped by contracted coupon rates.';
  } else if (simEquityPct > baseEquityPct) {
    summaryTitle = 'Growth-Focused Scenario';
    summaryDesc = `Simulated a ${(simEquityPct - baseEquityPct).toFixed(1)}% increase in equity allocation to boost wealth-building capacity.`;
    takeaway = 'Higher equity exposure increases long-term compounding potential, but subjects your portfolio to steeper periodic drawdown cycles.';
  }

  return {
    baselineSummary: {
      totalInvestedCapital: xray.summary.total_invested_capital,
      marketValuedCapital: baselineValuationBase,
      isFullyValued,
      quoteCoveragePct: xray.summary.quote_coverage_pct,
      unpricedPositionsCount: xray.data_quality.unquoted_positions,
      coverageLimitationNote: coverageNote,
    },
    simulatedSummary: {
      totalSimulatedCapital,
      additionalContribution: additionalContrib,
      scenarioType: input.scenarioType,
      allocationSumPct: 100,
    },
    assetClassAllocations,
    metricComparisons,
    educationalScenarioSummary: {
      title: summaryTitle,
      description: summaryDesc,
      keyTakeaway: takeaway,
      assumptionsAndLimitations: [
        'Purely an educational simulation — no real trades or orders will be executed.',
        'Market prices for existing assets reflect latest known quotes; unpriced assets use cost basis.',
        'Zero future market growth or capital gains are assumed in this scenario model.',
        'Transaction fees, brokerage charges, STT, and capital gains taxes are excluded.',
      ],
    },
  };
}

// ============================================================
// GOAL-BASED INVESTMENT PLANNING & ZERO-GROWTH PROJECTIONS
// ============================================================

export interface GoalProgressMetrics {
  goalId: string;
  goalName: string;
  targetAmount: number;
  currentFunding: number;
  remainingAmount: number;
  fundingProgressPct: number;
  isOverfunded: boolean;
  targetDate: string;
  remainingMonths: number;
  isDeadlinePassed: boolean;
  requiredMonthlyContributionZeroGrowth: number;
}

export interface GoalContributionProjection {
  currentFunding: number;
  targetAmount: number;
  targetDate: string;
  remainingMonths: number;
  chosenMonthlyContribution: number;
  projectedContributionsTotal: number;
  projectedFundingAtDeadline: number;
  projectedFundingProgressPct: number;
  projectedGapAtDeadline: number;
  reachesTarget: boolean;
  assumptionsDisclaimer: string;
}

/**
 * Calculates remaining months between current date and a future target date.
 */
export function calculateRemainingMonths(targetDateStr: string, fromDate = new Date()): number {
  try {
    const target = new Date(targetDateStr);
    if (isNaN(target.getTime())) return 0;

    const diffYears = target.getFullYear() - fromDate.getFullYear();
    const diffMonths = target.getMonth() - fromDate.getMonth();
    const totalMonths = diffYears * 12 + diffMonths;

    return Math.max(totalMonths, 0);
  } catch {
    return 0;
  }
}

/**
 * Deterministic Goal Progress Calculation.
 * Strictly adheres to Prompt 11:
 * - Funding Progress (%) = Recorded funding / Target amount * 100
 * - Remaining amount = max(Target amount - Recorded funding, 0)
 * - Required monthly contribution under zero-growth assumption
 * - Correct overfunding handling (> 100%)
 */
export function calculateGoalProgress(
  targetAmount: number,
  currentFunding: number,
  targetDate: string,
  goalId = 'goal-temp',
  goalName = 'Investment Goal',
  now = new Date()
): GoalProgressMetrics {
  const target = Math.max(roundCurrency(targetAmount), 0);
  const funding = Math.max(roundCurrency(currentFunding), 0);

  const remainingAmount = Math.max(roundCurrency(target - funding), 0);
  const fundingProgressPct = target > 0 ? roundPercent((funding / target) * 100) : 0;
  const isOverfunded = funding > target;

  const targetDateObj = new Date(targetDate);
  const isDeadlinePassed = !isNaN(targetDateObj.getTime()) && targetDateObj < now;
  const remainingMonths = calculateRemainingMonths(targetDate, now);

  const requiredMonthlyContributionZeroGrowth =
    remainingMonths > 0
      ? roundCurrency(remainingAmount / remainingMonths)
      : remainingAmount;

  return {
    goalId,
    goalName,
    targetAmount: target,
    currentFunding: funding,
    remainingAmount,
    fundingProgressPct,
    isOverfunded,
    targetDate,
    remainingMonths,
    isDeadlinePassed,
    requiredMonthlyContributionZeroGrowth,
  };
}

/**
 * Deterministic Zero-Growth Goal Contribution Illustration.
 * Section 6.1:
 * Projected contributions = Current recorded funding + Monthly contribution * Remaining contribution months
 * Illustrative funding gap at target date.
 */
export function calculateGoalContributionProjection(
  targetAmount: number,
  currentFunding: number,
  targetDate: string,
  monthlyContribution: number,
  now = new Date()
): GoalContributionProjection {
  const target = Math.max(roundCurrency(targetAmount), 0);
  const funding = Math.max(roundCurrency(currentFunding), 0);
  const monthly = Math.max(roundCurrency(monthlyContribution), 0);

  const remainingMonths = calculateRemainingMonths(targetDate, now);
  const projectedNewContributions = roundCurrency(monthly * remainingMonths);
  const projectedFundingAtDeadline = roundCurrency(funding + projectedNewContributions);

  const projectedFundingProgressPct =
    target > 0 ? roundPercent((projectedFundingAtDeadline / target) * 100) : 0;
  const projectedGapAtDeadline = Math.max(roundCurrency(target - projectedFundingAtDeadline), 0);
  const reachesTarget = projectedFundingAtDeadline >= target;

  return {
    currentFunding: funding,
    targetAmount: target,
    targetDate,
    remainingMonths,
    chosenMonthlyContribution: monthly,
    projectedContributionsTotal: projectedNewContributions,
    projectedFundingAtDeadline,
    projectedFundingProgressPct,
    projectedGapAtDeadline,
    reachesTarget,
    assumptionsDisclaimer:
      'Zero-Growth Contribution Illustration: Assumes 0% investment return to isolate your exact savings requirement. Does not represent a forecast of future asset performance or inflation.',
  };
}

// ============================================================
// FUTURE LAB 2.0: SMART INVESTMENT STRATEGY SIMULATOR ENGINE
// ============================================================

export type StrategyId = 'conservative' | 'balanced' | 'aggressive';

export interface StrategyTemplateItem {
  id: StrategyId;
  name: string;
  tagline: string;
  description: string;
  allocations: Record<AssetClass, number>;
  equityExposurePct: number;
  defensiveExposurePct: number;
  goldExposurePct: number;
  alternativesExposurePct: number;
  riskProfileLabel: string;
  volatilityDescription: string;
  shortTermFluctuations: string;
  guaranteedReturns: 'None';
  illustrativeAssetGroups: string[];
  rationalePerCategory: Record<AssetClass, string>;
  keyRiskConsiderations: string[];
}

export const STRATEGY_TEMPLATES: Record<StrategyId, StrategyTemplateItem> = {
  conservative: {
    id: 'conservative',
    name: 'Conservative Strategy',
    tagline: 'Stability, Capital Preservation & Liquidity',
    description:
      'Lower market-risk exposure with an emphasis on capital stability and liquidity. Designed to buffer against broad market downturns.',
    allocations: {
      bond: 50,
      mf: 25,
      sgb: 15,
      etf: 10,
      equity: 0,
      reit: 0,
      invit: 0,
    },
    equityExposurePct: 25, // via diversified equity/hybrid mutual funds
    defensiveExposurePct: 60, // 50% bonds + 10% liquid/debt ETFs
    goldExposurePct: 15,
    alternativesExposurePct: 0,
    riskProfileLabel: 'Generally Lower Volatility',
    volatilityDescription:
      'Lower sensitivity to equity market drawdowns; portfolio value is anchored by debt coupon stability and gold inflation hedging.',
    shortTermFluctuations: 'Still possible due to interest rate cycle shifts or gold price volatility.',
    guaranteedReturns: 'None',
    illustrativeAssetGroups: [
      'High-quality fixed income (50%)',
      'Diversified equity mutual funds (25%)',
      'Gold & Sovereign Gold Bonds (15%)',
      'Liquid instruments & liquid ETFs (10%)',
    ],
    rationalePerCategory: {
      bond: 'Provides contractual coupon yield and dampens equity market drawdowns.',
      mf: 'Allows participation in long-term economic expansion through diversified professional management.',
      sgb: 'Acts as a monetary store of value and macro inflation hedge.',
      etf: 'Liquid and low-duration debt instruments maintain cash liquidity for emergencies or future opportunities.',
      equity: 'Direct single-stock exposure is omitted in conservative templates to avoid idiosyncratic business risk.',
      reit: 'Real estate yields have interest rate sensitivity; omitted in conservative templates.',
      invit: 'Infrastructure trusts omitted in conservative templates to minimize sector concentration.',
    },
    keyRiskConsiderations: [
      'Inflation Risk: Fixed-coupon debt may underperform headline inflation during sharp CPI spikes.',
      'Interest Rate Risk: Bond prices decline when the Reserve Bank of India (RBI) hikes benchmark repo rates.',
      'No Capital Guarantee: Mutual funds and gold are subject to market volatility; capital is not guaranteed.',
    ],
  },
  balanced: {
    id: 'balanced',
    name: 'Balanced Strategy',
    tagline: 'Long-Term Growth with Defensive Cushion',
    description:
      'A calibrated mix of long-term capital growth exposure and defensive asset classes to balance compounding and drawdown resilience.',
    allocations: {
      equity: 35,
      bond: 30,
      mf: 15,
      sgb: 10,
      reit: 10,
      etf: 0,
      invit: 0,
    },
    equityExposurePct: 50, // 35% direct equities + 15% diversified mutual funds
    defensiveExposurePct: 30, // 30% bonds
    goldExposurePct: 10,
    alternativesExposurePct: 10, // 10% REITs
    riskProfileLabel: 'Intermediate Volatility',
    volatilityDescription:
      'Moderate drawdowns during market corrections; coupon income, real estate distributions, and gold dampen equity swings.',
    shortTermFluctuations: 'Possible and expected during periodic market corrections.',
    guaranteedReturns: 'None',
    illustrativeAssetGroups: [
      'Diversified equities & individual stocks (35%)',
      'Quality fixed income & corporate bonds (30%)',
      'Diversified equity mutual funds (15%)',
      'Gold & Sovereign Gold Bonds (10%)',
      'Real Estate Investment Trusts (REITs) (10%)',
    ],
    rationalePerCategory: {
      equity: 'Drives primary compounding through ownership of profitable domestic enterprises.',
      bond: 'Stabilizes portfolio volatility and provides predictable semi-annual coupon cash flows.',
      mf: 'Broadens exposure across mid/large-cap sectors beyond individual stock holdings.',
      sgb: 'Provides non-correlated macro hedge against currency depreciation and geopolitical uncertainty.',
      reit: 'Offers mandatory 90% NDCF distribution yield backed by commercial real estate assets.',
      etf: 'Included optionally or substituted for broad index tracking.',
      invit: 'Can complement REIT allocation for infrastructure utility yield.',
    },
    keyRiskConsiderations: [
      'Cyclical Equity Volatility: Equities (50% combined) will experience temporary 10–20% pullbacks in market corrections.',
      'Commercial Real Estate Demand: REIT distributions depend on commercial lease occupancy and tenant retention.',
      'Credit Risk: Corporate debt instruments carry credit default and rating downgrade risks.',
    ],
  },
  aggressive: {
    id: 'aggressive',
    name: 'Aggressive Strategy',
    tagline: 'Maximum Capital Appreciation Focus',
    description:
      'Higher equity exposure tailored for investors with long investment horizons and greater willingness to tolerate market drawdown cycles.',
    allocations: {
      equity: 60,
      mf: 20,
      bond: 10,
      reit: 5,
      sgb: 5,
      etf: 0,
      invit: 0,
    },
    equityExposurePct: 80, // 60% direct stocks + 20% mutual funds
    defensiveExposurePct: 10, // 10% bonds
    goldExposurePct: 5,
    alternativesExposurePct: 5, // 5% REITs
    riskProfileLabel: 'Generally Higher Volatility',
    volatilityDescription:
      'High sensitivity to broader equity market movements; high potential compounding with significant interim drawdowns.',
    shortTermFluctuations: 'Potentially substantial during bear markets and economic recessions.',
    guaranteedReturns: 'None',
    illustrativeAssetGroups: [
      'Individual equities & leading sector stocks (60%)',
      'High-growth equity mutual funds / mid-cap funds (20%)',
      'Quality fixed income cushion (10%)',
      'Real estate investment trusts (5%)',
      'Gold & SGBs (5%)',
    ],
    rationalePerCategory: {
      equity: 'Maximizes long-term capital compounding by taking direct business ownership stakes.',
      mf: 'Provides thematic or multi-cap diversification to complement direct stock bets.',
      bond: 'Maintains a minimal liquidity cushion to deploy during major market dips.',
      reit: 'Generates quarterly yields to reinvest into high-conviction growth opportunities.',
      sgb: 'Small gold hedge preserves purchasing power during currency shocks.',
      etf: 'Optional index tracking vehicle.',
      invit: 'Alternative utility yield exposure.',
    },
    keyRiskConsiderations: [
      'Steep Market Drawdowns: 80% equity exposure can experience 20–40% temporary portfolio value declines in severe bear markets.',
      'Company Idiosyncratic Risk: Individual stock concentration requires ongoing fundamental monitoring of corporate governance and earnings.',
      'Horizon Dependency: Capital required in under 3 years should not be deployed in this strategy.',
    ],
  },
};

export interface AllocatedCategory {
  assetClass: AssetClass;
  displayName: string;
  percentage: number;
  allocatedRupees: number;
  rationale: string;
}

export interface StrategyAllocationResult {
  strategyId: StrategyId;
  strategyName: string;
  totalAmount: number;
  categories: AllocatedCategory[];
  reconciledTotal: number;
  exposures: {
    equityPct: number;
    equityRupees: number;
    defensivePct: number;
    defensiveRupees: number;
    goldPct: number;
    goldRupees: number;
    alternativesPct: number;
    alternativesRupees: number;
  };
  narrativeExplanation: string;
  keyRiskConsiderations: string[];
}

/**
 * Calculates exact rupee allocations for an investment amount based on the chosen strategy template.
 * Guarantees that the sum of allocated rupees strictly reconciles to the input amount down to the last paisa.
 */
export function calculateStrategyAllocation(
  amount: number,
  strategyId: StrategyId
): StrategyAllocationResult {
  if (typeof amount !== 'number' || isNaN(amount) || amount <= 0 || !isFinite(amount)) {
    throw new Error('Please enter a valid positive investment amount.');
  }

  const template = STRATEGY_TEMPLATES[strategyId];
  if (!template) {
    throw new Error(`Unknown strategy template: ${strategyId}`);
  }

  // Active categories from template (where percentage > 0)
  const activeEntries = Object.entries(template.allocations).filter(([, pct]) => pct > 0) as [
    AssetClass,
    number,
  ][];

  // Calculate raw rupees and round
  let sumRupees = 0;
  const categories: AllocatedCategory[] = activeEntries.map(([assetClass, pct]) => {
    const rupees = roundCurrency((pct / 100) * amount);
    sumRupees = roundCurrency(sumRupees + rupees);
    return {
      assetClass,
      displayName:
        CANONICAL_SIMULATION_ASSET_CLASSES.find((c) => c.id === assetClass)?.label ||
        assetClass.toUpperCase(),
      percentage: pct,
      allocatedRupees: rupees,
      rationale: template.rationalePerCategory[assetClass] || '',
    };
  });

  // Reconcile residual difference (if any, due to float rounding) to the largest category
  const residual = roundCurrency(amount - sumRupees);
  if (residual !== 0 && categories.length > 0) {
    const largestCat = categories.reduce(
      (max, c) => (c.allocatedRupees > max.allocatedRupees ? c : max),
      categories[0]
    );
    largestCat.allocatedRupees = roundCurrency(largestCat.allocatedRupees + residual);
  }

  // Calculate broad group exposures
  const equityRupees = categories
    .filter((c) => c.assetClass === 'equity' || c.assetClass === 'mf')
    .reduce((sum, c) => roundCurrency(sum + c.allocatedRupees), 0);
  const defensiveRupees = categories
    .filter((c) => c.assetClass === 'bond' || c.assetClass === 'etf')
    .reduce((sum, c) => roundCurrency(sum + c.allocatedRupees), 0);
  const goldRupees = categories
    .filter((c) => c.assetClass === 'sgb')
    .reduce((sum, c) => roundCurrency(sum + c.allocatedRupees), 0);
  const alternativesRupees = categories
    .filter((c) => c.assetClass === 'reit' || c.assetClass === 'invit')
    .reduce((sum, c) => roundCurrency(sum + c.allocatedRupees), 0);

  const narrativeExplanation = `Allocating ₹${amount.toLocaleString('en-IN')} across the ${template.name} divides your capital into ${template.equityExposurePct}% equities & funds, ${template.defensiveExposurePct}% defensive debt & liquid assets, and ${template.goldExposurePct}% gold hedges. This educational template demonstrates how multi-asset diversification distributes risk across distinct economic cycles.`;

  return {
    strategyId,
    strategyName: template.name,
    totalAmount: amount,
    categories,
    reconciledTotal: amount,
    exposures: {
      equityPct: template.equityExposurePct,
      equityRupees,
      defensivePct: template.defensiveExposurePct,
      defensiveRupees,
      goldPct: template.goldExposurePct,
      goldRupees,
      alternativesPct: template.alternativesExposurePct,
      alternativesRupees,
    },
    narrativeExplanation,
    keyRiskConsiderations: template.keyRiskConsiderations,
  };
}

export interface PortfolioBeforeAfterResult {
  hasHoldings: boolean;
  baseline: {
    valuationBase: number;
    isMarketValued: boolean;
    quoteCoveragePct: number;
    equityWeightPct: number;
    assetClassBreakdown: Array<{
      assetClass: AssetClass;
      displayName: string;
      value: number;
      percentage: number;
    }>;
    riskScore: number;
    riskLabel: string;
  };
  simulated: {
    additionalAmount: number;
    newTotalValuation: number;
    equityWeightPct: number;
    assetClassBreakdown: Array<{
      assetClass: AssetClass;
      displayName: string;
      value: number;
      percentage: number;
      deltaValue: number;
      deltaPercentage: number;
    }>;
    provisionalRiskNotice: string;
  };
  observations: string[];
}

/**
 * Computes deterministic Before-versus-After comparison grounded on the user's real portfolio.
 * Discloses that category-level simulations do not invent stock-level risk or HHI scores.
 */
export function calculatePortfolioBeforeAfter(
  holdings: HoldingWithMetrics[],
  brokerAccounts: BrokerAccount[] = [],
  investmentAmount: number,
  strategyId: StrategyId
): PortfolioBeforeAfterResult {
  const allocation = calculateStrategyAllocation(investmentAmount, strategyId);

  // 1. If empty portfolio
  if (!holdings || holdings.length === 0) {
    const simBreakdown = allocation.categories.map((c) => ({
      assetClass: c.assetClass,
      displayName: c.displayName,
      value: c.allocatedRupees,
      percentage: c.percentage,
      deltaValue: c.allocatedRupees,
      deltaPercentage: c.percentage,
    }));

    return {
      hasHoldings: false,
      baseline: {
        valuationBase: 0,
        isMarketValued: true,
        quoteCoveragePct: 100,
        equityWeightPct: 0,
        assetClassBreakdown: [],
        riskScore: 0,
        riskLabel: 'Conservative',
      },
      simulated: {
        additionalAmount: investmentAmount,
        newTotalValuation: investmentAmount,
        equityWeightPct: allocation.exposures.equityPct,
        assetClassBreakdown: simBreakdown,
        provisionalRiskNotice:
          'Provisional: Category-level simulation only. Specific securities not designated. Insufficient information to calculate a security-level post-investment risk score.',
      },
      observations: [
        `You currently have zero recorded holdings. Deploying ₹${investmentAmount.toLocaleString('en-IN')} across the ${allocation.strategyName} establishes an initial multi-asset portfolio with ${allocation.exposures.equityPct}% equity and ${allocation.exposures.defensivePct}% defensive assets.`,
      ],
    };
  }

  // 2. Compute baseline via unified X-Ray
  const xray = computeUnifiedXRay(holdings, brokerAccounts);
  const isMarketValued =
    xray.summary.market_valued_capital !== null && xray.summary.market_valued_capital > 0;
  const baselineValuationBase = isMarketValued
    ? xray.summary.market_valued_capital!
    : xray.summary.total_invested_capital;

  // Build baseline asset map
  const baselineMap = new Map<AssetClass, number>();
  for (const item of CANONICAL_SIMULATION_ASSET_CLASSES) {
    baselineMap.set(item.id, 0);
  }
  for (const inst of xray.consolidated_instruments) {
    const val = isMarketValued
      ? (inst.current_value ?? 0)
      : inst.total_invested_value;
    baselineMap.set(inst.asset_class, (baselineMap.get(inst.asset_class) || 0) + val);
  }

  const baselineBreakdown = CANONICAL_SIMULATION_ASSET_CLASSES.map((item) => {
    const val = roundCurrency(baselineMap.get(item.id) || 0);
    const pct = baselineValuationBase > 0 ? roundPercent((val / baselineValuationBase) * 100) : 0;
    return {
      assetClass: item.id,
      displayName: item.label,
      value: val,
      percentage: pct,
    };
  }).filter((b) => b.value > 0);

  const baselineEquityVal =
    (baselineMap.get('equity') || 0) +
    (baselineMap.get('etf') || 0) +
    (baselineMap.get('mf') || 0);
  const baselineEquityPct =
    baselineValuationBase > 0 ? roundPercent((baselineEquityVal / baselineValuationBase) * 100) : 0;

  // 3. Compute Simulated Post-Scenario Portfolio
  const newTotalValuation = roundCurrency(baselineValuationBase + investmentAmount);
  const simulatedMap = new Map<AssetClass, number>(baselineMap);

  for (const cat of allocation.categories) {
    simulatedMap.set(
      cat.assetClass,
      roundCurrency((simulatedMap.get(cat.assetClass) || 0) + cat.allocatedRupees)
    );
  }

  const simulatedBreakdown = CANONICAL_SIMULATION_ASSET_CLASSES.map((item) => {
    const baseVal = roundCurrency(baselineMap.get(item.id) || 0);
    const basePct = baselineValuationBase > 0 ? roundPercent((baseVal / baselineValuationBase) * 100) : 0;
    const simVal = roundCurrency(simulatedMap.get(item.id) || 0);
    const simPct = newTotalValuation > 0 ? roundPercent((simVal / newTotalValuation) * 100) : 0;

    return {
      assetClass: item.id,
      displayName: item.label,
      value: simVal,
      percentage: simPct,
      deltaValue: roundCurrency(simVal - baseVal),
      deltaPercentage: roundPercent(simPct - basePct),
    };
  }).filter((b) => b.value > 0);

  const simEquityVal =
    (simulatedMap.get('equity') || 0) +
    (simulatedMap.get('etf') || 0) +
    (simulatedMap.get('mf') || 0);
  const simEquityPct =
    newTotalValuation > 0 ? roundPercent((simEquityVal / newTotalValuation) * 100) : 0;

  // 4. Generate grounded observations
  const observations: string[] = [];

  if (baselineEquityPct >= 90 && simEquityPct < baselineEquityPct) {
    observations.push(
      `Your current portfolio is heavily tilted toward equities (${baselineEquityPct.toFixed(1)}%). Adding ₹${investmentAmount.toLocaleString('en-IN')} via the ${allocation.strategyName} would introduce non-equity defensive assets, bringing your overall equity weight down to ${simEquityPct.toFixed(1)}%.`
    );
  } else if (simEquityPct > baselineEquityPct) {
    observations.push(
      `This scenario increases your overall equity exposure from ${baselineEquityPct.toFixed(1)}% to ${simEquityPct.toFixed(1)}%, prioritizing higher compounding potential while increasing vulnerability to market corrections.`
    );
  } else {
    observations.push(
      `Adding ₹${investmentAmount.toLocaleString('en-IN')} reinforces a balanced multi-asset profile, maintaining equity exposure at ${simEquityPct.toFixed(1)}% alongside fixed income and gold cushions.`
    );
  }

  if (allocation.exposures.defensiveRupees > 0) {
    observations.push(
      `Fixed income and debt instruments would receive ₹${allocation.exposures.defensiveRupees.toLocaleString('en-IN')} in this simulation, dampening drawdown volatility during periods of market stress.`
    );
  }

  return {
    hasHoldings: true,
    baseline: {
      valuationBase: baselineValuationBase,
      isMarketValued,
      quoteCoveragePct: xray.summary.quote_coverage_pct,
      equityWeightPct: baselineEquityPct,
      assetClassBreakdown: baselineBreakdown,
      riskScore: xray.summary.risk_score,
      riskLabel: xray.summary.risk_label,
    },
    simulated: {
      additionalAmount: investmentAmount,
      newTotalValuation,
      equityWeightPct: simEquityPct,
      assetClassBreakdown: simulatedBreakdown,
      provisionalRiskNotice:
        'Provisional: Category simulation only. Specific instruments not designated. Insufficient information to calculate a security-level post-investment risk score.',
    },
    observations,
  };
}

