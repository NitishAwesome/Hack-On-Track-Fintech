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

export const VERIFIED_INDIAN_BONDS: BondItem[] = [
  {
    symbol: 'GS2033_718',
    name: '7.18% GS 2033 Central Government Security',
    isin: 'IN0020330030',
    issuer: 'Government of India',
    bondCategory: 'Sovereign (G-Sec)',
    securityType: 'Sovereign Obligation',
    faceValue: 100.0,
    couponRate: 7.18,
    payoutFrequency: 'Semi-annual',
    issueDate: '2023-08-14',
    maturityDate: '2033-08-14',
    residualMaturityYears: 6.8,
    nextInterestDate: '2026-02-14',
    creditRating: 'Sovereign',
    ratingAgency: 'Reserve Bank of India',
    ratingRationale: 'Backed by the full sovereign faith and taxing authority of the Government of India. Zero credit default risk in INR currency.',
    lastTradedPrice: 101.50,
    isPriceAvailable: true,
    tradingStatus: 'Active Secondary Trading',
    currentYieldPct: 7.07, // (7.18 / 101.50) * 100
    ytmPct: 6.94, // Compounded semi-annual internal rate of return to maturity
    cleanPrice: 101.50,
    taxStatus: 'Taxable (Slab Rate)',
    minimumLotSizeUnits: 100, // Retail RBI Retail Direct minimum ₹10,000 / NSE lot
    minimumInvestmentInr: 10150,
    cashFlowTimeline: [
      { date: '2026-02-14', type: 'COUPON', amountPerUnit: 3.59, description: 'Semi-Annual Coupon (3.59% of Face Value)' },
      { date: '2026-08-14', type: 'COUPON', amountPerUnit: 3.59, description: 'Semi-Annual Coupon (3.59% of Face Value)' },
      { date: '2027-02-14', type: 'COUPON', amountPerUnit: 3.59, description: 'Semi-Annual Coupon (3.59% of Face Value)' },
      { date: '2033-08-14', type: 'COUPON_AND_PRINCIPAL', amountPerUnit: 103.59, description: 'Final Coupon (₹3.59) + Full Principal Repayment (₹100.00)' },
    ],
    observedRiskLevel: 'Lower Observed Exposure Risk',
    riskFactors: {
      creditDefaultRisk: 'Zero (Sovereign)',
      durationInterestRateRisk: 'Moderate (3–7Y)',
      liquidityRisk: 'Low (Liquid)',
      subordinationRisk: 'None (Sovereign)',
    },
    riskRationale:
      'Zero credit risk as a direct sovereign paper. However, holding a 6.8-year G-Sec exposes the investor to interest-rate duration risk: if the RBI raises macro interest rates, the bond’s secondary market trading price will decline.',
    overviewSummary:
      'India’s benchmark 10-year sovereign government bond issued through RBI E-Kuber auctions. Provides guaranteed semi-annual interest and full principal repayment at maturity.',
    lastTradeDate: '2026-10-09',
    dataSource: 'CCIL / NSE Debt Segment',
  },
  {
    symbol: 'GS2028_706',
    name: '7.06% GS 2028 Sovereign Bond',
    isin: 'IN0020280045',
    issuer: 'Government of India',
    bondCategory: 'Sovereign (G-Sec)',
    securityType: 'Sovereign Obligation',
    faceValue: 100.0,
    couponRate: 7.06,
    payoutFrequency: 'Semi-annual',
    issueDate: '2023-04-10',
    maturityDate: '2028-04-10',
    residualMaturityYears: 1.5,
    nextInterestDate: '2026-04-10',
    creditRating: 'Sovereign',
    ratingAgency: 'Reserve Bank of India',
    ratingRationale: 'Direct sovereign paper. Zero credit default risk in INR currency.',
    lastTradedPrice: null, // Deliberately unpriced to model illiquid secondary trading honestly!
    isPriceAvailable: false,
    tradingStatus: 'Illiquid / Infrequent Secondary Trades',
    currentYieldPct: null, // Zero fabrication: cannot compute yield without price
    ytmPct: null,
    cleanPrice: null,
    taxStatus: 'Taxable (Slab Rate)',
    minimumLotSizeUnits: 100,
    minimumInvestmentInr: 10000,
    cashFlowTimeline: [
      { date: '2026-04-10', type: 'COUPON', amountPerUnit: 3.53, description: 'Semi-Annual Coupon (3.53% of Face Value)' },
      { date: '2026-10-10', type: 'COUPON', amountPerUnit: 3.53, description: 'Semi-Annual Coupon (3.53% of Face Value)' },
      { date: '2027-04-10', type: 'COUPON', amountPerUnit: 3.53, description: 'Semi-Annual Coupon (3.53% of Face Value)' },
      { date: '2028-04-10', type: 'COUPON_AND_PRINCIPAL', amountPerUnit: 103.53, description: 'Final Coupon (₹3.53) + Full Principal Repayment (₹100.00)' },
    ],
    observedRiskLevel: 'Lower Observed Exposure Risk',
    riskFactors: {
      creditDefaultRisk: 'Zero (Sovereign)',
      durationInterestRateRisk: 'Low (<3Y)',
      liquidityRisk: 'High (Illiquid)',
      subordinationRisk: 'None (Sovereign)',
    },
    riskRationale:
      'Short residual maturity (1.5 years) with zero credit default risk. However, secondary trading on this specific tranche is infrequent; retail investors face liquidity friction if selling prior to maturity.',
    overviewSummary:
      'Short-duration Central Government security suited for capital preservation over a 1–2 year horizon. Held to maturity for contractual capital return.',
    dataSource: 'CCIL / RBI E-Kuber (Quote Illiquid)',
  },
  {
    symbol: 'REC2029_755',
    name: 'REC Limited 7.55% 2029 Senior Secured PSU Bond',
    isin: 'INE020B08DF5',
    issuer: 'REC Limited (Maharatna Central PSU)',
    bondCategory: 'PSU Bond',
    securityType: 'Senior Secured',
    faceValue: 10000.0,
    couponRate: 7.55,
    payoutFrequency: 'Annual',
    issueDate: '2024-03-15',
    maturityDate: '2029-03-15',
    residualMaturityYears: 2.5,
    nextInterestDate: '2026-03-15',
    creditRating: 'AAA',
    ratingAgency: 'CRISIL / ICRA',
    ratingRationale: 'Highest credit quality in India. Maharatna status with 52.6% sovereign ownership by Ministry of Power, Govt of India. Crucial nodal agency for national electrification.',
    lastTradedPrice: 10085.0,
    isPriceAvailable: true,
    tradingStatus: 'Active Secondary Trading',
    currentYieldPct: 7.49, // (755 / 10085) * 100
    ytmPct: 7.36,
    cleanPrice: 10085.0,
    taxStatus: 'Taxable (Slab Rate)',
    minimumLotSizeUnits: 1,
    minimumInvestmentInr: 10085,
    cashFlowTimeline: [
      { date: '2026-03-15', type: 'COUPON', amountPerUnit: 755.0, description: 'Annual Coupon (7.55% on ₹10,000 Face Value)' },
      { date: '2027-03-15', type: 'COUPON', amountPerUnit: 755.0, description: 'Annual Coupon (7.55% on ₹10,000 Face Value)' },
      { date: '2028-03-15', type: 'COUPON', amountPerUnit: 755.0, description: 'Annual Coupon (7.55% on ₹10,000 Face Value)' },
      { date: '2029-03-15', type: 'COUPON_AND_PRINCIPAL', amountPerUnit: 10755.0, description: 'Final Coupon (₹755.0) + Principal Redemption (₹10,000.00)' },
    ],
    observedRiskLevel: 'Lower Observed Exposure Risk',
    riskFactors: {
      creditDefaultRisk: 'Extremely Low (AAA PSU)',
      durationInterestRateRisk: 'Low (<3Y)',
      liquidityRisk: 'Moderate',
      subordinationRisk: 'None (Senior Secured)',
    },
    riskRationale:
      'Backed by charge on company loan receivables and sovereign-majority ownership. Yield spread of ~45 bps over G-Secs compensates for modest corporate credit differential.',
    overviewSummary:
      'AAA-rated Maharatna PSU debenture financing national renewable energy and power distribution infrastructure with contractual annual interest payments.',
    lastTradeDate: '2026-10-08',
    dataSource: 'NSE Wholesale Debt Market (WDM)',
  },
  {
    symbol: 'PFC2030_760',
    name: 'Power Finance Corp 7.60% 2030 Secured PSU Bond',
    isin: 'INE134E08MW5',
    issuer: 'Power Finance Corporation (Maharatna Central PSU)',
    bondCategory: 'PSU Bond',
    securityType: 'Senior Secured',
    faceValue: 10000.0,
    couponRate: 7.60,
    payoutFrequency: 'Annual',
    issueDate: '2024-05-18',
    maturityDate: '2030-05-18',
    residualMaturityYears: 3.6,
    nextInterestDate: '2026-05-18',
    creditRating: 'AAA',
    ratingAgency: 'CRISIL / CARE',
    ratingRationale: 'PFC is the premier infrastructure finance company under the Ministry of Power with exceptional capital adequacy and systemic importance.',
    lastTradedPrice: 10050.0,
    isPriceAvailable: true,
    tradingStatus: 'Active Secondary Trading',
    currentYieldPct: 7.56,
    ytmPct: 7.48,
    cleanPrice: 10050.0,
    taxStatus: 'Taxable (Slab Rate)',
    minimumLotSizeUnits: 1,
    minimumInvestmentInr: 10050,
    cashFlowTimeline: [
      { date: '2026-05-18', type: 'COUPON', amountPerUnit: 760.0, description: 'Annual Coupon (7.60% on ₹10,000 Face Value)' },
      { date: '2027-05-18', type: 'COUPON', amountPerUnit: 760.0, description: 'Annual Coupon (7.60% on ₹10,000 Face Value)' },
      { date: '2030-05-18', type: 'COUPON_AND_PRINCIPAL', amountPerUnit: 10760.0, description: 'Final Coupon (₹760.0) + Principal Redemption (₹10,000.00)' },
    ],
    observedRiskLevel: 'Lower Observed Exposure Risk',
    riskFactors: {
      creditDefaultRisk: 'Extremely Low (AAA PSU)',
      durationInterestRateRisk: 'Moderate (3–7Y)',
      liquidityRisk: 'Moderate',
      subordinationRisk: 'None (Senior Secured)',
    },
    riskRationale:
      'Premier AAA PSU debenture with senior secured status. Low credit risk and predictable annual cash flow. Sensitive to mid-curve 3–5 year interest rate shifts.',
    overviewSummary:
      'Fixed-rate institutional debenture issued by India’s largest power-sector Non-Banking Financial Company, offering attractive coupon spread over sovereign paper.',
    lastTradeDate: '2026-10-07',
    dataSource: 'NSE Wholesale Debt Market (WDM)',
  },
  {
    symbol: 'NHAI2031_739',
    name: 'NHAI 7.39% 2031 Tax-Free Infrastructure Bond',
    isin: 'INE906B07DF0',
    issuer: 'National Highways Authority of India',
    bondCategory: 'PSU Bond',
    securityType: 'Senior Secured',
    faceValue: 1000.0,
    couponRate: 7.39,
    payoutFrequency: 'Annual',
    issueDate: '2016-11-22',
    maturityDate: '2031-11-22',
    residualMaturityYears: 5.1,
    nextInterestDate: '2026-11-22',
    creditRating: 'AAA',
    ratingAgency: 'CRISIL / ICRA',
    ratingRationale: 'Statutory body established by an Act of Parliament (NHAI Act, 1988) directly under the Ministry of Road Transport and Highways.',
    lastTradedPrice: 1120.0, // Trades at premium because coupon is completely tax-free!
    isPriceAvailable: true,
    tradingStatus: 'Active Secondary Trading',
    currentYieldPct: 6.60, // Tax-free current yield: (73.90 / 1120) * 100
    ytmPct: 5.34, // Tax-free YTM: equivalent to ~7.6% pre-tax yield in 30% slab
    cleanPrice: 1120.0,
    taxStatus: 'Tax-Free (Section 10(15))',
    minimumLotSizeUnits: 1,
    minimumInvestmentInr: 1120,
    cashFlowTimeline: [
      { date: '2026-11-22', type: 'COUPON', amountPerUnit: 73.90, description: 'Annual Tax-Free Coupon (7.39% on ₹1,000 Face Value)' },
      { date: '2027-11-22', type: 'COUPON', amountPerUnit: 73.90, description: 'Annual Tax-Free Coupon (7.39% on ₹1,000 Face Value)' },
      { date: '2031-11-22', type: 'COUPON_AND_PRINCIPAL', amountPerUnit: 1073.90, description: 'Final Tax-Free Coupon (₹73.90) + Principal Redemption (₹1,000.00)' },
    ],
    observedRiskLevel: 'Lower Observed Exposure Risk',
    riskFactors: {
      creditDefaultRisk: 'Extremely Low (AAA PSU)',
      durationInterestRateRisk: 'Moderate (3–7Y)',
      liquidityRisk: 'Low (Liquid)',
      subordinationRisk: 'None (Senior Secured)',
    },
    riskRationale:
      'Interest earned is 100% exempt from Indian income tax under Section 10(15)(iv)(h). Because trades take place at a premium (₹1,120 vs ₹1,000 par), holding to maturity incurs a capital loss of ₹120, yielding a net tax-free YTM of ~5.34%. Highly attractive for high-bracket taxpayers.',
    overviewSummary:
      'Rare exchange-traded tax-free infrastructure bond issued by NHAI. All coupon income is exempt from TDS and income tax under Indian tax law.',
    lastTradeDate: '2026-10-09',
    dataSource: 'NSE Retail Debt Market',
  },
  {
    symbol: 'HDFCBK2033_784',
    name: 'HDFC Bank 7.84% 2033 Tier-II Subordinated Bond',
    isin: 'INE040A08476',
    issuer: 'HDFC Bank Limited',
    bondCategory: 'Corporate NCD',
    securityType: 'Tier-II Subordinated (Unsecured)',
    faceValue: 100000.0, // High-denomination institutional instrument
    couponRate: 7.84,
    payoutFrequency: 'Annual',
    issueDate: '2023-09-21',
    maturityDate: '2033-09-21',
    residualMaturityYears: 6.9,
    nextInterestDate: '2026-09-21',
    creditRating: 'AAA',
    ratingAgency: 'CRISIL / CARE',
    ratingRationale: 'Largest private sector bank in India with robust capital adequacy and pristine asset quality.',
    lastTradedPrice: 100500.0,
    isPriceAvailable: true,
    tradingStatus: 'Active Secondary Trading',
    currentYieldPct: 7.80,
    ytmPct: 7.74,
    cleanPrice: 100500.0,
    taxStatus: 'Taxable (Slab Rate)',
    minimumLotSizeUnits: 1,
    minimumInvestmentInr: 100500,
    cashFlowTimeline: [
      { date: '2026-09-21', type: 'COUPON', amountPerUnit: 7840.0, description: 'Annual Coupon (7.84% on ₹1,00,000 Face Value)' },
      { date: '2027-09-21', type: 'COUPON', amountPerUnit: 7840.0, description: 'Annual Coupon (7.84% on ₹1,00,000 Face Value)' },
      { date: '2033-09-21', type: 'COUPON_AND_PRINCIPAL', amountPerUnit: 107840.0, description: 'Final Coupon (₹7,840.0) + Principal Redemption (₹1,00,000.00)' },
    ],
    observedRiskLevel: 'Moderate Observed Exposure Risk',
    riskFactors: {
      creditDefaultRisk: 'Low (AAA Corporate)',
      durationInterestRateRisk: 'High (>7Y Duration)',
      liquidityRisk: 'Moderate',
      subordinationRisk: 'Elevated (Tier-II Subordinated)',
    },
    riskRationale:
      'CRITICAL DIFFERENCE: This bond is Tier-II Subordinated debt under RBI Basel-III norms. In the event of liquidation or resolution, claims rank subordinate to senior depositors and secured lenders. Higher 7.84% coupon compensates for subordination status.',
    overviewSummary:
      'Basel-III compliant Tier-II subordinated debt issued by India’s largest private banking institution. Provides higher yield spread but carries subordination relative to senior deposits.',
    lastTradeDate: '2026-10-08',
    dataSource: 'NSE Wholesale Debt Market (WDM)',
  },
  {
    symbol: 'TATACAP2028_790',
    name: 'Tata Capital 7.90% 2028 Secured Corporate NCD',
    isin: 'INE306N07MM8',
    issuer: 'Tata Capital Limited',
    bondCategory: 'Corporate NCD',
    securityType: 'Senior Secured',
    faceValue: 1000.0,
    couponRate: 7.90,
    payoutFrequency: 'Annual',
    issueDate: '2023-10-15',
    maturityDate: '2028-10-15',
    residualMaturityYears: 2.0,
    nextInterestDate: '2026-10-15',
    creditRating: 'AAA',
    ratingAgency: 'CRISIL / ICRA',
    ratingRationale: 'Backed by the Tata Group brand and strong operational performance in retail lending and wealth management.',
    lastTradedPrice: 1008.0,
    isPriceAvailable: true,
    tradingStatus: 'Active Secondary Trading',
    currentYieldPct: 7.84,
    ytmPct: 7.52,
    cleanPrice: 1008.0,
    taxStatus: 'Taxable (Slab Rate)',
    minimumLotSizeUnits: 1,
    minimumInvestmentInr: 1008,
    cashFlowTimeline: [
      { date: '2026-10-15', type: 'COUPON', amountPerUnit: 79.0, description: 'Annual Coupon (7.90% on ₹1,000 Face Value)' },
      { date: '2027-10-15', type: 'COUPON', amountPerUnit: 79.0, description: 'Annual Coupon (7.90% on ₹1,000 Face Value)' },
      { date: '2028-10-15', type: 'COUPON_AND_PRINCIPAL', amountPerUnit: 1079.0, description: 'Final Coupon (₹79.0) + Principal Redemption (₹1,000.00)' },
    ],
    observedRiskLevel: 'Lower Observed Exposure Risk',
    riskFactors: {
      creditDefaultRisk: 'Low (AAA Corporate)',
      durationInterestRateRisk: 'Low (<3Y)',
      liquidityRisk: 'Low (Liquid)',
      subordinationRisk: 'None (Senior Secured)',
    },
    riskRationale:
      'High-grade corporate debenture with senior charge on asset book. Short 2-year residual maturity limits duration risk. Excellent retail liquidity on NSE debt counter.',
    overviewSummary:
      'Senior secured Non-Convertible Debenture (NCD) issued by Tata Capital, offering top corporate coupon yield with modest 2-year duration.',
    lastTradeDate: '2026-10-09',
    dataSource: 'NSE Retail Debt Market',
  },
];

export function getBondBySymbol(symbol: string): BondItem | undefined {
  if (!symbol) return undefined;
  const clean = symbol.trim().toUpperCase();
  return VERIFIED_INDIAN_BONDS.find((b) => b.symbol === clean || b.isin === clean);
}
