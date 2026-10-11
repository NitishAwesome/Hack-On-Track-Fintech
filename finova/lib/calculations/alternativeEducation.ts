// ============================================================
// FINOVA — Alternative Investment Educational Calculations
// lib/calculations/alternativeEducation.ts
//
// Pure TypeScript deterministic calculations for:
// - Bond Coupon, Total Annual Payout, and Current Yield
// - REIT Distribution, Distribution Yield, and Component Breakdown
// - InvIT Cash Flow, Yield, and Capital Amortization Impact
//
// Strictly labeled: Hypothetical Educational Illustrations.
// ZERO external dependencies, ZERO database mutations.
// ============================================================

export interface BondCalculatorInput {
  faceValue: number;          // e.g. 1000 or 100000 (INR)
  annualCouponRatePct: number; // e.g. 8.5 (%)
  numberOfBonds: number;       // e.g. 50 units
  purchasePricePerBond: number;// e.g. 980 (discount) or 1020 (premium)
}

export interface BondCalculatorResult {
  isValid: boolean;
  errorMessage?: string;
  faceValue: number;
  annualCouponRatePct: number;
  numberOfBonds: number;
  purchasePricePerBond: number;
  totalInvestmentCost: number;
  annualCouponPerBond: number;
  totalAnnualCoupon: number;
  currentYieldPct: number;
  priceRelationship: 'PAR' | 'DISCOUNT' | 'PREMIUM';
  yieldComparisonNote: string;
  disclaimer: string;
}

export interface ReitDistributionInput {
  unitsHeld: number;           // e.g. 500 units
  purchasePricePerUnit: number;// e.g. 320 INR
  annualDistributionPerUnit: number; // e.g. 24 INR
  dividendComponentPct?: number; // optional % of distribution as dividend
  interestComponentPct?: number; // optional % of distribution as interest
  capitalReturnComponentPct?: number; // optional % of distribution as return of capital
}

export interface ReitDistributionResult {
  isValid: boolean;
  errorMessage?: string;
  unitsHeld: number;
  purchasePricePerUnit: number;
  totalPurchaseCost: number;
  annualDistributionPerUnit: number;
  totalAnnualDistribution: number;
  distributionYieldPct: number;
  breakdown: {
    dividendAmount: number;
    interestAmount: number;
    capitalReturnAmount: number;
    dividendPct: number;
    interestPct: number;
    capitalReturnPct: number;
  };
  taxEducationNote: string;
  disclaimer: string;
}

export interface InvitDistributionInput {
  unitsHeld: number;
  purchasePricePerUnit: number;
  annualDistributionPerUnit: number;
  dividendComponentPct?: number;
  interestComponentPct?: number;
  capitalReturnComponentPct?: number;
}

export interface InvitDistributionResult extends ReitDistributionResult {
  concessionAmortizationNote: string;
}

/**
 * Validates and calculates educational bond coupon and current yield metrics.
 * 
 * Formula:
 * Annual Coupon per Bond = Face Value * (Coupon Rate / 100)
 * Total Annual Coupon = Annual Coupon per Bond * Number of Bonds
 * Current Yield (%) = (Annual Coupon per Bond / Purchase Price per Bond) * 100
 */
export function calculateBondMetrics(input: BondCalculatorInput): BondCalculatorResult {
  const disclaimer = 'Hypothetical Educational Illustration — Not a Market Quote or Investment Recommendation';

  // Validation
  if (
    typeof input.faceValue !== 'number' ||
    typeof input.annualCouponRatePct !== 'number' ||
    typeof input.numberOfBonds !== 'number' ||
    typeof input.purchasePricePerBond !== 'number' ||
    isNaN(input.faceValue) ||
    isNaN(input.annualCouponRatePct) ||
    isNaN(input.numberOfBonds) ||
    isNaN(input.purchasePricePerBond)
  ) {
    return {
      isValid: false,
      errorMessage: 'All inputs must be valid finite numbers.',
      faceValue: 0,
      annualCouponRatePct: 0,
      numberOfBonds: 0,
      purchasePricePerBond: 0,
      totalInvestmentCost: 0,
      annualCouponPerBond: 0,
      totalAnnualCoupon: 0,
      currentYieldPct: 0,
      priceRelationship: 'PAR',
      yieldComparisonNote: '',
      disclaimer,
    };
  }

  if (input.faceValue <= 0) {
    return {
      isValid: false,
      errorMessage: 'Bond face value must be greater than zero.',
      faceValue: input.faceValue,
      annualCouponRatePct: input.annualCouponRatePct,
      numberOfBonds: input.numberOfBonds,
      purchasePricePerBond: input.purchasePricePerBond,
      totalInvestmentCost: 0,
      annualCouponPerBond: 0,
      totalAnnualCoupon: 0,
      currentYieldPct: 0,
      priceRelationship: 'PAR',
      yieldComparisonNote: '',
      disclaimer,
    };
  }

  if (input.purchasePricePerBond <= 0) {
    return {
      isValid: false,
      errorMessage: 'Purchase price must be greater than zero.',
      faceValue: input.faceValue,
      annualCouponRatePct: input.annualCouponRatePct,
      numberOfBonds: input.numberOfBonds,
      purchasePricePerBond: input.purchasePricePerBond,
      totalInvestmentCost: 0,
      annualCouponPerBond: 0,
      totalAnnualCoupon: 0,
      currentYieldPct: 0,
      priceRelationship: 'PAR',
      yieldComparisonNote: '',
      disclaimer,
    };
  }

  if (input.numberOfBonds < 0 || !Number.isInteger(input.numberOfBonds)) {
    return {
      isValid: false,
      errorMessage: 'Number of bonds must be a non-negative whole integer.',
      faceValue: input.faceValue,
      annualCouponRatePct: input.annualCouponRatePct,
      numberOfBonds: input.numberOfBonds,
      purchasePricePerBond: input.purchasePricePerBond,
      totalInvestmentCost: 0,
      annualCouponPerBond: 0,
      totalAnnualCoupon: 0,
      currentYieldPct: 0,
      priceRelationship: 'PAR',
      yieldComparisonNote: '',
      disclaimer,
    };
  }

  if (input.annualCouponRatePct < 0 || input.annualCouponRatePct > 100) {
    return {
      isValid: false,
      errorMessage: 'Coupon rate must be between 0% and 100%.',
      faceValue: input.faceValue,
      annualCouponRatePct: input.annualCouponRatePct,
      numberOfBonds: input.numberOfBonds,
      purchasePricePerBond: input.purchasePricePerBond,
      totalInvestmentCost: 0,
      annualCouponPerBond: 0,
      totalAnnualCoupon: 0,
      currentYieldPct: 0,
      priceRelationship: 'PAR',
      yieldComparisonNote: '',
      disclaimer,
    };
  }

  const annualCouponPerBond = input.faceValue * (input.annualCouponRatePct / 100);
  const totalAnnualCoupon = annualCouponPerBond * input.numberOfBonds;
  const totalInvestmentCost = input.purchasePricePerBond * input.numberOfBonds;
  const currentYieldPct = (annualCouponPerBond / input.purchasePricePerBond) * 100;

  let priceRelationship: 'PAR' | 'DISCOUNT' | 'PREMIUM' = 'PAR';
  let yieldComparisonNote = '';

  const priceDiff = input.purchasePricePerBond - input.faceValue;
  if (Math.abs(priceDiff) < 0.01) {
    priceRelationship = 'PAR';
    yieldComparisonNote =
      'Trading at PAR (Purchase Price = Face Value). Current yield equals the contracted coupon rate.';
  } else if (input.purchasePricePerBond < input.faceValue) {
    priceRelationship = 'DISCOUNT';
    yieldComparisonNote = `Trading at a DISCOUNT (Purchase Price < Face Value). Current yield (${currentYieldPct.toFixed(
      2
    )}%) is HIGHER than the contracted coupon rate (${input.annualCouponRatePct.toFixed(
      2
    )}%) because you invested less capital to receive the same coupon.`;
  } else {
    priceRelationship = 'PREMIUM';
    yieldComparisonNote = `Trading at a PREMIUM (Purchase Price > Face Value). Current yield (${currentYieldPct.toFixed(
      2
    )}%) is LOWER than the contracted coupon rate (${input.annualCouponRatePct.toFixed(
      2
    )}%) because you paid extra capital per bond.`;
  }

  return {
    isValid: true,
    faceValue: input.faceValue,
    annualCouponRatePct: input.annualCouponRatePct,
    numberOfBonds: input.numberOfBonds,
    purchasePricePerBond: input.purchasePricePerBond,
    totalInvestmentCost: Number(totalInvestmentCost.toFixed(2)),
    annualCouponPerBond: Number(annualCouponPerBond.toFixed(2)),
    totalAnnualCoupon: Number(totalAnnualCoupon.toFixed(2)),
    currentYieldPct: Number(currentYieldPct.toFixed(2)),
    priceRelationship,
    yieldComparisonNote,
    disclaimer,
  };
}

/**
 * Calculates educational REIT distribution, yield, and tax component breakdown.
 */
export function calculateReitDistribution(input: ReitDistributionInput): ReitDistributionResult {
  const disclaimer = 'Hypothetical Educational Illustration — Not a Market Quote or Investment Recommendation';

  if (
    typeof input.unitsHeld !== 'number' ||
    typeof input.purchasePricePerUnit !== 'number' ||
    typeof input.annualDistributionPerUnit !== 'number' ||
    isNaN(input.unitsHeld) ||
    isNaN(input.purchasePricePerUnit) ||
    isNaN(input.annualDistributionPerUnit)
  ) {
    return {
      isValid: false,
      errorMessage: 'All inputs must be valid numbers.',
      unitsHeld: 0,
      purchasePricePerUnit: 0,
      totalPurchaseCost: 0,
      annualDistributionPerUnit: 0,
      totalAnnualDistribution: 0,
      distributionYieldPct: 0,
      breakdown: {
        dividendAmount: 0,
        interestAmount: 0,
        capitalReturnAmount: 0,
        dividendPct: 0,
        interestPct: 0,
        capitalReturnPct: 0,
      },
      taxEducationNote: '',
      disclaimer,
    };
  }

  if (input.unitsHeld <= 0 || !Number.isInteger(input.unitsHeld)) {
    return {
      isValid: false,
      errorMessage: 'Units held must be a positive whole integer.',
      unitsHeld: input.unitsHeld,
      purchasePricePerUnit: input.purchasePricePerUnit,
      totalPurchaseCost: 0,
      annualDistributionPerUnit: 0,
      totalAnnualDistribution: 0,
      distributionYieldPct: 0,
      breakdown: { dividendAmount: 0, interestAmount: 0, capitalReturnAmount: 0, dividendPct: 0, interestPct: 0, capitalReturnPct: 0 },
      taxEducationNote: '',
      disclaimer,
    };
  }

  if (input.purchasePricePerUnit <= 0) {
    return {
      isValid: false,
      errorMessage: 'Purchase price per unit must be greater than zero.',
      unitsHeld: input.unitsHeld,
      purchasePricePerUnit: input.purchasePricePerUnit,
      totalPurchaseCost: 0,
      annualDistributionPerUnit: 0,
      totalAnnualDistribution: 0,
      distributionYieldPct: 0,
      breakdown: { dividendAmount: 0, interestAmount: 0, capitalReturnAmount: 0, dividendPct: 0, interestPct: 0, capitalReturnPct: 0 },
      taxEducationNote: '',
      disclaimer,
    };
  }

  if (input.annualDistributionPerUnit < 0) {
    return {
      isValid: false,
      errorMessage: 'Annual distribution per unit cannot be negative.',
      unitsHeld: input.unitsHeld,
      purchasePricePerUnit: input.purchasePricePerUnit,
      totalPurchaseCost: 0,
      annualDistributionPerUnit: 0,
      totalAnnualDistribution: 0,
      distributionYieldPct: 0,
      breakdown: { dividendAmount: 0, interestAmount: 0, capitalReturnAmount: 0, dividendPct: 0, interestPct: 0, capitalReturnPct: 0 },
      taxEducationNote: '',
      disclaimer,
    };
  }

  const totalPurchaseCost = input.unitsHeld * input.purchasePricePerUnit;
  const totalAnnualDistribution = input.unitsHeld * input.annualDistributionPerUnit;
  const distributionYieldPct = (input.annualDistributionPerUnit / input.purchasePricePerUnit) * 100;

  // Normalized component percentages (defaults to 40% dividend, 40% interest, 20% return of capital if unspecified)
  let divPct = input.dividendComponentPct ?? 40;
  let intPct = input.interestComponentPct ?? 40;
  let capPct = input.capitalReturnComponentPct ?? 20;

  const sumPct = divPct + intPct + capPct;
  if (sumPct > 0) {
    divPct = (divPct / sumPct) * 100;
    intPct = (intPct / sumPct) * 100;
    capPct = (capPct / sumPct) * 100;
  }

  const dividendAmount = totalAnnualDistribution * (divPct / 100);
  const interestAmount = totalAnnualDistribution * (intPct / 100);
  const capitalReturnAmount = totalAnnualDistribution * (capPct / 100);

  const taxEducationNote =
    'In India, REIT distributions are split into dividend, interest, and return of capital/amortization. Interest is generally taxable at your slab rate. Dividends may be exempt or taxed depending on the SPV tax regime. Return of capital reduces your acquisition cost basis for capital gains purposes under Section 56(2)(xii). Consult a qualified tax advisor.';

  return {
    isValid: true,
    unitsHeld: input.unitsHeld,
    purchasePricePerUnit: input.purchasePricePerUnit,
    totalPurchaseCost: Number(totalPurchaseCost.toFixed(2)),
    annualDistributionPerUnit: input.annualDistributionPerUnit,
    totalAnnualDistribution: Number(totalAnnualDistribution.toFixed(2)),
    distributionYieldPct: Number(distributionYieldPct.toFixed(2)),
    breakdown: {
      dividendAmount: Number(dividendAmount.toFixed(2)),
      interestAmount: Number(interestAmount.toFixed(2)),
      capitalReturnAmount: Number(capitalReturnAmount.toFixed(2)),
      dividendPct: Number(divPct.toFixed(1)),
      interestPct: Number(intPct.toFixed(1)),
      capitalReturnPct: Number(capPct.toFixed(1)),
    },
    taxEducationNote,
    disclaimer,
  };
}

/**
 * Calculates educational InvIT cash distribution and highlights concession lifespan amortization.
 */
export function calculateInvitDistribution(input: InvitDistributionInput): InvitDistributionResult {
  const baseResult = calculateReitDistribution(input);
  if (!baseResult.isValid) {
    return {
      ...baseResult,
      concessionAmortizationNote: '',
    };
  }

  const concessionAmortizationNote =
    'Crucial Infrastructure Distinction: Unlike REITs which own perpetual commercial freehold land, many InvIT assets (such as BOT toll highways) operate under finite government concessions (e.g. 15–25 years). As concession life runs down, underlying asset value amortizes toward zero. Part of your distribution is return of capital compensating for this terminal amortization.';

  return {
    ...baseResult,
    concessionAmortizationNote,
  };
}
