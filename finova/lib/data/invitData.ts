// ============================================================
// FINOVA — Verified Indian InvITs Dataset
// lib/data/invitData.ts
//
// Grounded in official SEBI registrations, NHAI concessions,
// CERC tariff regulations, and published investor presentations.
// ============================================================

export type InvitInfraCategory = 'Power Transmission' | 'Roads & Highways' | 'Renewables & Grid' | 'Telecom & Digital';

export interface InvitQuarterlyDistribution {
  period: string;
  recordDate: string;
  totalDpu: number; // Distribution Per Unit in INR
  interestDpu: number;
  dividendDpu: number;
  capitalRepaymentDpu: number;
  otherDpu?: number;
}

export interface InvitItem {
  symbol: string;
  name: string;
  isin: string;
  exchange: 'NSE' | 'BSE';
  infraCategory: InvitInfraCategory;
  sponsor: string;
  investmentManager: string;
  unitPrice: number;
  previousClose: number;
  dayChange: number;
  dayChangePct: number;
  high52w: number;
  low52w: number;
  marketCapCr: number;
  concessionType: string;
  averageRemainingConcessionYears: number; // Crucial: InvIT assets amortize
  isConcessionFinite: boolean; // True for BOT roads, false/long-term perpetual for regulated transmission
  netDebtToGavPct: number; // SEBI cap 49% (or 70% with AAA credit rating and track record)
  creditRating: string;
  ratingAgency: string;
  networkSizeKm: number;
  operationalSpvCount: number;
  majorAssets: string[];
  keyCounterparties: string[];
  distributionFrequency: 'Quarterly' | 'Semi-Annual';
  distributionsHistory: InvitQuarterlyDistribution[];
  trailingAnnualDpu: number;
  trailingYieldPct: number;
  observedRiskLevel: 'Lower Observed Exposure Risk' | 'Moderate Observed Exposure Risk' | 'Higher Observed Exposure Risk';
  riskFactors: {
    trafficOrVolumeRisk: 'High' | 'Moderate' | 'Low (Regulated Tariff)';
    concessionAmortizationRisk: 'High' | 'Moderate' | 'Low';
    regulatoryTariffRisk: 'Moderate' | 'Low';
    leverageRisk: 'Conservative' | 'Moderate' | 'Elevated';
  };
  riskRationale: string;
  overviewSummary: string;
  lastUpdated: string;
  dataSource: string;
}

export const VERIFIED_INDIAN_INVITS: InvitItem[] = [
  {
    symbol: 'PGINVIT',
    name: 'POWERGRID Infrastructure Investment Trust',
    isin: 'INE0CW523019',
    exchange: 'NSE',
    infraCategory: 'Power Transmission',
    sponsor: 'Power Grid Corporation of India (Maharatna PSU)',
    investmentManager: 'POWERGRID Unchahar Transmission Ltd',
    unitPrice: 98.0,
    previousClose: 97.4,
    dayChange: 0.6,
    dayChangePct: 0.62,
    high52w: 112.0,
    low52w: 88.0,
    marketCapCr: 8918,
    concessionType: 'Regulated Tariff-Based Competitive Bidding (TBCB) / 35-year CERC availability model',
    averageRemainingConcessionYears: 29.5,
    isConcessionFinite: false, // Transmission licenses renewable under Electricity Act; 35-year base
    netDebtToGavPct: 12.4, // Extremely low leverage
    creditRating: 'AAA',
    ratingAgency: 'CRISIL / ICRA / CARE',
    networkSizeKm: 3656,
    operationalSpvCount: 5,
    majorAssets: [
      'PVTL: Powergrid Vizag Transmission (Andhra Pradesh/Telangana)',
      'PKTL: Powergrid Kala Amb Transmission (Himachal Pradesh)',
      'PPTL: Powergrid Parli Transmission (Maharashtra)',
      'PWTL: Powergrid Warora Transmission (Maharashtra/Madhya Pradesh)',
      'PJTL: Powergrid Jabalpur Transmission (Madhya Pradesh)',
    ],
    keyCounterparties: ['Central Transmission Utility (CTU) via Point of Connection (PoC) pooling pool'],
    distributionFrequency: 'Quarterly',
    distributionsHistory: [
      { period: 'Q1 FY26', recordDate: '2025-08-07', totalDpu: 3.00, interestDpu: 2.15, dividendDpu: 0.55, capitalRepaymentDpu: 0.30 },
      { period: 'Q4 FY25', recordDate: '2025-05-10', totalDpu: 3.00, interestDpu: 2.15, dividendDpu: 0.55, capitalRepaymentDpu: 0.30 },
      { period: 'Q3 FY25', recordDate: '2025-02-05', totalDpu: 3.00, interestDpu: 2.10, dividendDpu: 0.55, capitalRepaymentDpu: 0.35 },
      { period: 'Q2 FY25', recordDate: '2024-11-04', totalDpu: 3.00, interestDpu: 2.10, dividendDpu: 0.50, capitalRepaymentDpu: 0.40 },
    ],
    trailingAnnualDpu: 12.00,
    trailingYieldPct: 12.24,
    observedRiskLevel: 'Lower Observed Exposure Risk',
    riskFactors: {
      trafficOrVolumeRisk: 'Low (Regulated Tariff)',
      concessionAmortizationRisk: 'Low',
      regulatoryTariffRisk: 'Low',
      leverageRisk: 'Conservative',
    },
    riskRationale:
      'Zero traffic volume risk. Revenue model is availability-based: revenue is paid by CTU national power pool regardless of how much electricity passes through the lines as long as system availability exceeds 98% (historically >99.7%). Ultra-low debt leverage (12.4% Net Debt/GAV) and backed by Maharatna PSU Power Grid Corp.',
    overviewSummary:
      'India’s safest infrastructure cash flow trust. Owns inter-state power transmission systems earning contracted tariffs pooled across all Indian power discoms through the Central Transmission Utility.',
    lastUpdated: '2026-10-09',
    dataSource: 'NSE / Official Trust Disclosures',
  },
  {
    symbol: 'IRBINVIT',
    name: 'IRB InvIT Fund',
    isin: 'INE183W23014',
    exchange: 'NSE',
    infraCategory: 'Roads & Highways',
    sponsor: 'IRB Infrastructure Developers',
    investmentManager: 'IRB Infrastructure Private Limited',
    unitPrice: 68.0,
    previousClose: 68.2,
    dayChange: -0.2,
    dayChangePct: -0.29,
    high52w: 75.0,
    low52w: 58.0,
    marketCapCr: 3944,
    concessionType: 'Build-Operate-Transfer (BOT) Toll Road Concessions with NHAI',
    averageRemainingConcessionYears: 14.8,
    isConcessionFinite: true, // Concessions will expire and transfer back to Government of India
    netDebtToGavPct: 32.8,
    creditRating: 'AAA',
    ratingAgency: 'India Ratings / CARE',
    networkSizeKm: 4050,
    operationalSpvCount: 7,
    majorAssets: [
      'Surat–Dahisar NH-8 Toll Project (Gujarat/Maharashtra)',
      'Tumkur–Chitradurga NH-4 Toll Project (Karnataka)',
      'Bharuch–Surat NH-8 Project (Gujarat)',
      'Jaipur–Deoli NH-12 Project (Rajasthan)',
      'Omalur–Salem NH-7 Project (Tamil Nadu)',
      'Talegaon–Amravati NH-6 Project (Maharashtra)',
      'Pathankot–Amritsar NH-15 Project (Punjab)',
    ],
    keyCounterparties: ['National Highways Authority of India (NHAI)', 'Automobile & Freight Commercial Traffic'],
    distributionFrequency: 'Quarterly',
    distributionsHistory: [
      { period: 'Q1 FY26', recordDate: '2025-08-12', totalDpu: 1.95, interestDpu: 1.20, dividendDpu: 0.10, capitalRepaymentDpu: 0.65 },
      { period: 'Q4 FY25', recordDate: '2025-05-16', totalDpu: 1.90, interestDpu: 1.15, dividendDpu: 0.10, capitalRepaymentDpu: 0.65 },
      { period: 'Q3 FY25', recordDate: '2025-02-12', totalDpu: 1.85, interestDpu: 1.15, dividendDpu: 0.05, capitalRepaymentDpu: 0.65 },
      { period: 'Q2 FY25', recordDate: '2024-11-10', totalDpu: 1.80, interestDpu: 1.10, dividendDpu: 0.05, capitalRepaymentDpu: 0.65 },
    ],
    trailingAnnualDpu: 7.50,
    trailingYieldPct: 11.03,
    observedRiskLevel: 'Moderate Observed Exposure Risk',
    riskFactors: {
      trafficOrVolumeRisk: 'High',
      concessionAmortizationRisk: 'High',
      regulatoryTariffRisk: 'Moderate',
      leverageRisk: 'Moderate',
    },
    riskRationale:
      'High cash yield (11.03%) with important structural characteristics: road concessions are finite (average 14.8 years remaining), meaning unitholders receive significant "Return of Capital" as the asset amortizes toward zero at concession hand-back. Toll collection fluctuates with regional GDP growth and commercial truck freight traffic.',
    overviewSummary:
      'India’s first publicly listed InvIT, operating toll highway corridors across the Golden Quadrilateral. Revenue is derived directly from FASTag electronic toll collection on national highways.',
    lastUpdated: '2026-10-09',
    dataSource: 'NSE / Official Trust Disclosures',
  },
  {
    symbol: 'INDIGRID',
    name: 'India Grid Trust',
    isin: 'INE219X23014',
    exchange: 'NSE',
    infraCategory: 'Power Transmission',
    sponsor: 'KKR & Sterlite Power',
    investmentManager: 'IndiGrid Investment Managers Limited',
    unitPrice: 135.0,
    previousClose: 134.5,
    dayChange: 0.5,
    dayChangePct: 0.37,
    high52w: 148.0,
    low52w: 125.0,
    marketCapCr: 10460,
    concessionType: 'TBCB Inter-State Transmission & Solar PPA (SECI)',
    averageRemainingConcessionYears: 28.0,
    isConcessionFinite: false,
    netDebtToGavPct: 48.0, // Near 49% cap
    creditRating: 'AAA',
    ratingAgency: 'CRISIL / ICRA',
    networkSizeKm: 8400,
    operationalSpvCount: 18,
    majorAssets: [
      'Bhopal Dhule Transmission Company (MP/Maharashtra)',
      'Jabalpur Transmission Company (MP)',
      'Purulia & Kharagpur Transmission (West Bengal)',
      'East-North Interconnection Company (Assam/Bihar)',
      'Kallam Transmission Project (Maharashtra)',
      'Solar Generation SPVs (100 MW, SECI PPA)',
    ],
    keyCounterparties: ['CTU (Central Transmission Utility)', 'SECI (Solar Energy Corporation of India)'],
    distributionFrequency: 'Quarterly',
    distributionsHistory: [
      { period: 'Q1 FY26', recordDate: '2025-08-06', totalDpu: 3.55, interestDpu: 2.50, dividendDpu: 0.65, capitalRepaymentDpu: 0.40 },
      { period: 'Q4 FY25', recordDate: '2025-05-09', totalDpu: 3.50, interestDpu: 2.45, dividendDpu: 0.65, capitalRepaymentDpu: 0.40 },
      { period: 'Q3 FY25', recordDate: '2025-02-04', totalDpu: 3.45, interestDpu: 2.40, dividendDpu: 0.65, capitalRepaymentDpu: 0.40 },
      { period: 'Q2 FY25', recordDate: '2024-11-05', totalDpu: 3.45, interestDpu: 2.40, dividendDpu: 0.65, capitalRepaymentDpu: 0.40 },
    ],
    trailingAnnualDpu: 13.95,
    trailingYieldPct: 10.33,
    observedRiskLevel: 'Moderate Observed Exposure Risk',
    riskFactors: {
      trafficOrVolumeRisk: 'Low (Regulated Tariff)',
      concessionAmortizationRisk: 'Low',
      regulatoryTariffRisk: 'Low',
      leverageRisk: 'Elevated',
    },
    riskRationale:
      'Institutional private-equity backed (KKR) transmission giant with 18 operational SPVs and stable availability contracts (>99.5%). Leverage is at 48% Net Debt/GAV (close to the SEBI unitholder cap of 49%), making distribution yield sensitive to debt refinancing interest rates.',
    overviewSummary:
      'Leading infrastructure trust backed by global investor KKR, holding over 8,400 circuit km of transmission lines and 100 MW utility solar capacity.',
    lastUpdated: '2026-10-09',
    dataSource: 'NSE / Official Trust Disclosures',
  },
  {
    symbol: 'NHIT',
    name: 'National Highways Infra Trust',
    isin: 'INE0K5G23010',
    exchange: 'NSE',
    infraCategory: 'Roads & Highways',
    sponsor: 'National Highways Authority of India (NHAI)',
    investmentManager: 'National Highways Infra Investment Managers',
    unitPrice: 118.0,
    previousClose: 117.5,
    dayChange: 0.5,
    dayChangePct: 0.43,
    high52w: 126.0,
    low52w: 105.0,
    marketCapCr: 12400,
    concessionType: 'Toll-Operate-Transfer (TOT) 20-30 Year Concession directly with NHAI',
    averageRemainingConcessionYears: 24.2,
    isConcessionFinite: true,
    netDebtToGavPct: 22.5,
    creditRating: 'AAA',
    ratingAgency: 'CARE / CRISIL',
    networkSizeKm: 1520,
    operationalSpvCount: 15,
    majorAssets: [
      'Agra–Gwalior NH-3 Tollway (UP/MP)',
      'Shivpuri–Jhansi NH-25 Tollway (MP/UP)',
      'Borkhedi–Wadner–Deori NH-7 Corridor (Maharashtra)',
      'Belgaum–Khanapur Corridor (Karnataka)',
      'Hyderabad–Bangalore Section NH-44 (Telangana)',
    ],
    keyCounterparties: ['National Highways Authority of India (NHAI, Govt of India)'],
    distributionFrequency: 'Semi-Annual',
    distributionsHistory: [
      { period: 'H1 FY26', recordDate: '2025-09-18', totalDpu: 6.20, interestDpu: 4.10, dividendDpu: 0.90, capitalRepaymentDpu: 1.20 },
      { period: 'H2 FY25', recordDate: '2025-03-24', totalDpu: 6.10, interestDpu: 4.00, dividendDpu: 0.90, capitalRepaymentDpu: 1.20 },
      { period: 'H1 FY25', recordDate: '2024-09-20', totalDpu: 6.00, interestDpu: 3.90, dividendDpu: 0.90, capitalRepaymentDpu: 1.20 },
    ],
    trailingAnnualDpu: 12.30,
    trailingYieldPct: 10.42,
    observedRiskLevel: 'Lower Observed Exposure Risk',
    riskFactors: {
      trafficOrVolumeRisk: 'Moderate',
      concessionAmortizationRisk: 'Moderate',
      regulatoryTariffRisk: 'Low',
      leverageRisk: 'Conservative',
    },
    riskRationale:
      'Sponsored directly by Government of India through NHAI. High sovereign stewardship, low debt ratio (22.5%), and long 24+ year concession tenures. Semi-annual distribution schedule with consistent AAA rating profile.',
    overviewSummary:
      'Sovereign-backed highway infrastructure investment trust sponsored by NHAI to monetize national highways through long-term institutional asset concessions.',
    lastUpdated: '2026-10-09',
    dataSource: 'NSE / Official Trust Disclosures',
  },
];

export function getInvitBySymbol(symbol: string): InvitItem | undefined {
  if (!symbol) return undefined;
  const clean = symbol.trim().toUpperCase();
  return VERIFIED_INDIAN_INVITS.find((i) => i.symbol === clean || i.isin === clean);
}
