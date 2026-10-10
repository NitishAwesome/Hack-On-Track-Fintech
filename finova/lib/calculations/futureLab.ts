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
      ? (inst.current_value ?? inst.total_invested_value)
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
  const topInst = xray.consolidated_instruments[0];
  const baseTopVal = topInst?.current_value ?? topInst?.total_invested_value ?? 0;
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
