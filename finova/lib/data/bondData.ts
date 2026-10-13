// ============================================================
// FINOVA — Verified Indian Bonds & Listed Debt Dataset
// lib/data/bondData.ts
//
// Grounded in CCIL, RBI E-Kuber, and NSE Debt Segment listings.
// Explicitly enforces truth in fixed income:
// - Never confuses Coupon Rate with YTM or guaranteed total return.
// - Transparently discloses illiquid pricing when secondary trades are absent.
// - Clearly articulates credit risk vs interest-rate duration sensitivity.
// ============================================================

export type BondCategory = 'Sovereign (G-Sec)' | 'PSU Bond' | 'Corporate NCD';
export type BondSecurityType = 'Sovereign Obligation' | 'Senior Secured' | 'Tier-II Subordinated (Unsecured)';
export type PayoutFrequency = 'Annual' | 'Semi-annual';

export interface BondCashFlowEvent {
  date: string;
  type: 'COUPON' | 'PRINCIPAL' | 'COUPON_AND_PRINCIPAL';
  amountPerUnit: number;
  description: string;
}

export interface BondItem {
  symbol: string;
  name: string;
  isin: string;
  issuer: string;
  bondCategory: BondCategory;
  securityType: BondSecurityType;
  faceValue: number; // In INR
  couponRate: number; // Contractual % on face value
  payoutFrequency: PayoutFrequency;
  issueDate: string;
  maturityDate: string;
  residualMaturityYears: number;
  nextInterestDate: string;
  creditRating: string;
  ratingAgency: string;
  ratingRationale: string;
  lastTradedPrice: number | null; // Null if illiquid / price unavailable
  isPriceAvailable: boolean;
  tradingStatus: 'Active Secondary Trading' | 'Illiquid / Infrequent Secondary Trades' | 'Institutional Trading Only';
  currentYieldPct: number | null; // (Annual Coupon Amount / Last Traded Price) * 100
  ytmPct: number | null; // Yield to Maturity % — null when price unavailable
  cleanPrice: number | null;
  taxStatus: 'Taxable (Slab Rate)' | 'Tax-Free (Section 10(15))';
  minimumLotSizeUnits: number;
  minimumInvestmentInr: number;
  cashFlowTimeline: BondCashFlowEvent[];
  observedRiskLevel: 'Lower Observed Exposure Risk' | 'Moderate Observed Exposure Risk' | 'Higher Observed Exposure Risk';
  riskFactors: {
    creditDefaultRisk: 'Zero (Sovereign)' | 'Extremely Low (AAA PSU)' | 'Low (AAA Corporate)' | 'Moderate (Subordinated)';
    durationInterestRateRisk: 'High (>7Y Duration)' | 'Moderate (3–7Y)' | 'Low (<3Y)';
    liquidityRisk: 'High (Illiquid)' | 'Moderate' | 'Low (Liquid)';
    subordinationRisk: 'None (Senior Secured)' | 'None (Sovereign)' | 'Elevated (Tier-II Subordinated)';
  };
  riskRationale: string;
  overviewSummary: string;
  lastTradeDate?: string;
  dataSource: string;
}

// No specific bond issues have reviewed terms or pricing.
export const VERIFIED_INDIAN_BONDS: BondItem[] = [];

export function getBondBySymbol(symbol: string): BondItem | undefined {
  if (!symbol) return undefined;
  const clean = symbol.trim().toUpperCase();
  return VERIFIED_INDIAN_BONDS.find((b) => b.symbol === clean || b.isin === clean);
}
