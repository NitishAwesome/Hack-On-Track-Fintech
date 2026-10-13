// ============================================================
// FINOVA — Verified Indian REITs Dataset
// lib/data/reitData.ts
//
// Manually reviewed identities; unreviewed metrics remain null.
// and published annual investor presentations. Zero fabricated metrics.
// ============================================================

export type ReitPropertyType = 'Office' | 'Retail' | 'Commercial' | 'Diversified';

export interface ReitQuarterlyDistribution {
  quarter: string;
  recordDate: string;
  totalDpu: number | null; // Distribution Per Unit in INR
  interestDpu: number | null;
  dividendDpu: number | null;
  capitalRepaymentDpu: number | null;
  otherDpu?: number | null;
}

export interface ReitItem {
  symbol: string;
  name: string;
  isin: string;
  exchange: 'NSE' | 'BSE' | 'Unavailable';
  propertyType: ReitPropertyType;
  sponsor: string;
  unitPrice: number | null;
  previousClose: number | null;
  dayChange: number | null;
  dayChangePct: number | null;
  high52w: number | null;
  low52w: number | null;
  marketCapCr: number | null;
  portfolioAreaMsft: number | null;
  occupancyPct: number | null;
  waleYears: number | null; // Weighted Average Lease Expiry
  netDebtToGavPct: number | null; // Net Debt to Gross Asset Value (SEBI cap is 49%)
  keyGeographies: string[];
  majorAssets: string[];
  majorTenants: string[];
  distributionFrequency: 'Quarterly' | 'Semi-Annual' | 'Unavailable' | 'Unavailable';
  quarterlyDistributions: ReitQuarterlyDistribution[];
  trailingAnnualDpu: number | null;
  trailingYieldPct: number | null;
  yieldSpreadVsGsecPct: number | null; // Trailing yield minus ~7.10% 10Y G-Sec benchmark
  observedRiskLevel: 'Lower Observed Exposure Risk' | 'Moderate Observed Exposure Risk' | 'Higher Observed Exposure Risk' | 'Unassessed' | 'Unavailable';
  riskFactors: {
    interestRateSensitivity: 'High' | 'Moderate' | 'Low' | 'Unavailable';
    tenantConcentration: 'High' | 'Moderate' | 'Low' | 'Unavailable';
    occupancyStability: 'High' | 'Moderate' | 'Low' | 'Unavailable';
    leverageRisk: 'Conservative' | 'Moderate' | 'Elevated' | 'Unavailable';
  };
  riskRationale: string;
  overviewSummary: string;
  lastUpdated: string;
  dataSource: string;
}

export const VERIFIED_INDIAN_REITS: ReitItem[] = [
  {
    "symbol": "EMBASSY",
    "name": "Embassy Office Parks REIT",
    "isin": "Unavailable",
    "exchange": "NSE",
    "propertyType": "Office",
    "sponsor": "Unavailable",
    "unitPrice": null,
    "previousClose": null,
    "dayChange": null,
    "dayChangePct": null,
    "high52w": null,
    "low52w": null,
    "marketCapCr": null,
    "portfolioAreaMsft": null,
    "occupancyPct": null,
    "waleYears": null,
    "netDebtToGavPct": null,
    "keyGeographies": [],
    "majorAssets": [],
    "majorTenants": [],
    "distributionFrequency": "Unavailable",
    "quarterlyDistributions": [],
    "trailingAnnualDpu": null,
    "trailingYieldPct": null,
    "yieldSpreadVsGsecPct": null,
    "observedRiskLevel": "Unassessed",
    "riskFactors": {
      "interestRateSensitivity": "Unavailable",
      "tenantConcentration": "Unavailable",
      "occupancyStability": "Unavailable",
      "leverageRisk": "Unavailable"
    },
    "riskRationale": "No reviewed instrument-specific risk assessment is available. Read the official trust disclosures.",
    "overviewSummary": "Identity reviewed against the official trust website. Financial metrics, distributions and instrument-specific risk assessments have not been reconciled.",
    "lastUpdated": "2026-10-13",
    "dataSource": "https://www.embassyofficeparks.com/investors/"
  },
  {
    "symbol": "MINDSPACE",
    "name": "Mindspace Business Parks REIT",
    "isin": "Unavailable",
    "exchange": "NSE",
    "propertyType": "Office",
    "sponsor": "Unavailable",
    "unitPrice": null,
    "previousClose": null,
    "dayChange": null,
    "dayChangePct": null,
    "high52w": null,
    "low52w": null,
    "marketCapCr": null,
    "portfolioAreaMsft": null,
    "occupancyPct": null,
    "waleYears": null,
    "netDebtToGavPct": null,
    "keyGeographies": [],
    "majorAssets": [],
    "majorTenants": [],
    "distributionFrequency": "Unavailable",
    "quarterlyDistributions": [],
    "trailingAnnualDpu": null,
    "trailingYieldPct": null,
    "yieldSpreadVsGsecPct": null,
    "observedRiskLevel": "Unassessed",
    "riskFactors": {
      "interestRateSensitivity": "Unavailable",
      "tenantConcentration": "Unavailable",
      "occupancyStability": "Unavailable",
      "leverageRisk": "Unavailable"
    },
    "riskRationale": "No reviewed instrument-specific risk assessment is available. Read the official trust disclosures.",
    "overviewSummary": "Identity reviewed against the official trust website. Financial metrics, distributions and instrument-specific risk assessments have not been reconciled.",
    "lastUpdated": "2026-10-13",
    "dataSource": "https://www.mindspacereit.com/investor-relations/overview"
  }
];

export function getReitBySymbol(symbol: string): ReitItem | undefined {
  if (!symbol) return undefined;
  const clean = symbol.trim().toUpperCase();
  return VERIFIED_INDIAN_REITS.find((r) => r.symbol === clean || r.isin === clean);
}
