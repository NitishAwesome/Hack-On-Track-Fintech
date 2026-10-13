// ============================================================
// FINOVA — Verified Indian InvITs Dataset
// lib/data/invitData.ts
//
// Manually reviewed identities; unreviewed metrics remain null.
// CERC tariff regulations, and published investor presentations.
// ============================================================

export type InvitInfraCategory = 'Power Transmission' | 'Roads & Highways' | 'Renewables & Grid' | 'Telecom & Digital';

export interface InvitQuarterlyDistribution {
  period: string;
  recordDate: string;
  totalDpu: number | null; // Distribution Per Unit in INR
  interestDpu: number | null;
  dividendDpu: number | null;
  capitalRepaymentDpu: number | null;
  otherDpu?: number | null;
}

export interface InvitItem {
  symbol: string;
  name: string;
  isin: string;
  exchange: 'NSE' | 'BSE' | 'Unavailable';
  infraCategory: InvitInfraCategory;
  sponsor: string;
  investmentManager: string;
  unitPrice: number | null;
  previousClose: number | null;
  dayChange: number | null;
  dayChangePct: number | null;
  high52w: number | null;
  low52w: number | null;
  marketCapCr: number | null;
  concessionType: string;
  averageRemainingConcessionYears: number | null; // Crucial: InvIT assets amortize
  isConcessionFinite: boolean | null; // True for BOT roads, false/long-term perpetual for regulated transmission
  netDebtToGavPct: number | null; // SEBI cap 49% (or 70% with AAA credit rating and track record)
  creditRating: string;
  ratingAgency: string;
  networkSizeKm: number | null;
  operationalSpvCount: number | null;
  majorAssets: string[];
  keyCounterparties: string[];
  distributionFrequency: 'Quarterly' | 'Semi-Annual' | 'Unavailable' | 'Unavailable';
  distributionsHistory: InvitQuarterlyDistribution[];
  trailingAnnualDpu: number | null;
  trailingYieldPct: number | null;
  observedRiskLevel: 'Lower Observed Exposure Risk' | 'Moderate Observed Exposure Risk' | 'Higher Observed Exposure Risk' | 'Unassessed' | 'Unavailable';
  riskFactors: {
    trafficOrVolumeRisk: 'High' | 'Moderate' | 'Low (Regulated Tariff)' | 'Unavailable';
    concessionAmortizationRisk: 'High' | 'Moderate' | 'Low' | 'Unavailable';
    regulatoryTariffRisk: 'Moderate' | 'Low' | 'Unavailable';
    leverageRisk: 'Conservative' | 'Moderate' | 'Elevated' | 'Unavailable';
  };
  riskRationale: string;
  overviewSummary: string;
  lastUpdated: string;
  dataSource: string;
}

export const VERIFIED_INDIAN_INVITS: InvitItem[] = [
  {
    "symbol": "PGINVIT",
    "name": "POWERGRID Infrastructure Investment Trust",
    "isin": "Unavailable",
    "exchange": "NSE",
    "infraCategory": "Power Transmission",
    "sponsor": "Unavailable",
    "investmentManager": "Unavailable",
    "unitPrice": null,
    "previousClose": null,
    "dayChange": null,
    "dayChangePct": null,
    "high52w": null,
    "low52w": null,
    "marketCapCr": null,
    "concessionType": "Unavailable",
    "averageRemainingConcessionYears": null,
    "isConcessionFinite": null,
    "netDebtToGavPct": null,
    "creditRating": "Unavailable",
    "ratingAgency": "Unavailable",
    "networkSizeKm": null,
    "operationalSpvCount": null,
    "majorAssets": [],
    "keyCounterparties": [],
    "distributionFrequency": "Unavailable",
    "distributionsHistory": [],
    "trailingAnnualDpu": null,
    "trailingYieldPct": null,
    "observedRiskLevel": "Unassessed",
    "riskFactors": {
      "trafficOrVolumeRisk": "Unavailable",
      "concessionAmortizationRisk": "Unavailable",
      "regulatoryTariffRisk": "Unavailable",
      "leverageRisk": "Unavailable"
    },
    "riskRationale": "No reviewed instrument-specific risk assessment is available. Read the official trust disclosures.",
    "overviewSummary": "Identity reviewed against the official trust website. Financial metrics, distributions and instrument-specific risk assessments have not been reconciled.",
    "lastUpdated": "2026-10-13",
    "dataSource": "https://pginvit.in/"
  },
  {
    "symbol": "IRBINVIT",
    "name": "IRB InvIT Fund",
    "isin": "Unavailable",
    "exchange": "NSE",
    "infraCategory": "Roads & Highways",
    "sponsor": "Unavailable",
    "investmentManager": "Unavailable",
    "unitPrice": null,
    "previousClose": null,
    "dayChange": null,
    "dayChangePct": null,
    "high52w": null,
    "low52w": null,
    "marketCapCr": null,
    "concessionType": "Unavailable",
    "averageRemainingConcessionYears": null,
    "isConcessionFinite": null,
    "netDebtToGavPct": null,
    "creditRating": "Unavailable",
    "ratingAgency": "Unavailable",
    "networkSizeKm": null,
    "operationalSpvCount": null,
    "majorAssets": [],
    "keyCounterparties": [],
    "distributionFrequency": "Unavailable",
    "distributionsHistory": [],
    "trailingAnnualDpu": null,
    "trailingYieldPct": null,
    "observedRiskLevel": "Unassessed",
    "riskFactors": {
      "trafficOrVolumeRisk": "Unavailable",
      "concessionAmortizationRisk": "Unavailable",
      "regulatoryTariffRisk": "Unavailable",
      "leverageRisk": "Unavailable"
    },
    "riskRationale": "No reviewed instrument-specific risk assessment is available. Read the official trust disclosures.",
    "overviewSummary": "Identity reviewed against the official trust website. Financial metrics, distributions and instrument-specific risk assessments have not been reconciled.",
    "lastUpdated": "2026-10-13",
    "dataSource": "https://www.irbinvit.co.in/"
  }
];

export function getInvitBySymbol(symbol: string): InvitItem | undefined {
  if (!symbol) return undefined;
  const clean = symbol.trim().toUpperCase();
  return VERIFIED_INDIAN_INVITS.find((i) => i.symbol === clean || i.isin === clean);
}
