export type FinancialMetricId = 'revenue' | 'ownerProfit' | 'dilutedEps' | 'operatingCashFlow';
export interface FinancialMetric {
  id: FinancialMetricId; label: string; value: number | null; unit: 'INR crore' | 'INR / share';
  period: 'FY2025–26' | 'FY2024–25'; periodEnd: string; basis: 'Consolidated'; accountingStandard: 'Ind AS';
  documentUrl: string; documentTitle: string; pdfPage: number; printedPage: string; reviewedAt: string;
}
interface ReportDefinition { symbol: string; documentUrl: string; documentTitle: string; rows: Array<{ id: FinancialMetricId; label: string; values: [number | null, number | null]; pdfPage: number; printedPage: string }> }
const REPORTS: ReportDefinition[] = [
  { symbol: 'RELIANCE', documentUrl: 'https://www.ril.com/ar2025-26/pdf/07_RIL_IAR_2025-26_Consolidated_22-05-26.pdf', documentTitle: 'Reliance Integrated Annual Report 2025–26 · Consolidated financial statements', rows: [
    { id: 'revenue', label: 'Revenue from operations (net of GST)', values: [1075675, 980136], pdfPage: 15, printedPage: '198' },
    { id: 'ownerProfit', label: 'Profit attributable to owners', values: [80775, 69648], pdfPage: 16, printedPage: '199' },
    { id: 'dilutedEps', label: 'Diluted earnings per share', values: [59.69, 51.47], pdfPage: 16, printedPage: '199' },
    { id: 'operatingCashFlow', label: 'Net operating cash flow', values: [192113, 178703], pdfPage: 19, printedPage: '202' },
  ] },
  { symbol: 'TCS', documentUrl: 'https://www.tcs.com/content/dam/tcs/investor-relations/financial-statements/2025-26/q4/IND%20AS/Consolidated.pdf', documentTitle: 'TCS audited consolidated financial statements · year ended 31 March 2026', rows: [
    { id: 'revenue', label: 'Revenue from operations', values: [267021, 255324], pdfPage: 2, printedPage: '2' },
    { id: 'ownerProfit', label: 'Profit attributable to owners', values: [49210, 48553], pdfPage: 2, printedPage: '2' },
    { id: 'dilutedEps', label: 'Diluted earnings per share', values: [136.01, 134.19], pdfPage: 2, printedPage: '2' },
    { id: 'operatingCashFlow', label: 'Net operating cash flow', values: [52094, 48908], pdfPage: 6, printedPage: '6' },
  ] },
  { symbol: 'INFY', documentUrl: 'https://www.infosys.com/investors/reports-filings/annual-report/annual/documents/infosys-ar-26.pdf', documentTitle: 'Infosys Integrated Annual Report 2025–26 · Consolidated Ind AS statements', rows: [
    { id: 'revenue', label: 'Revenue from operations', values: [178650, 162990], pdfPage: 287, printedPage: '318' },
    { id: 'ownerProfit', label: 'Profit attributable to owners', values: [29440, 26713], pdfPage: 288, printedPage: '319' },
    { id: 'dilutedEps', label: 'Diluted earnings per share', values: [71.46, 64.34], pdfPage: 288, printedPage: '319' },
    { id: 'operatingCashFlow', label: 'Net operating cash flow', values: [33986, 35694], pdfPage: 294, printedPage: '325' },
  ] },
];
/** Manually reviewed annual facts. Review dates change only when the source is reviewed. */
export const CURATED_FINANCIALS: Record<string, FinancialMetric[]> = Object.fromEntries(REPORTS.map(report => [report.symbol, report.rows.flatMap(row => row.values.map((value, i) => ({ id: row.id, label: row.label, value, unit: row.id === 'dilutedEps' ? 'INR / share' as const : 'INR crore' as const, period: i === 0 ? 'FY2025–26' as const : 'FY2024–25' as const, periodEnd: i === 0 ? '2026-03-31' : '2025-03-31', basis: 'Consolidated' as const, accountingStandard: 'Ind AS' as const, documentUrl: report.documentUrl, documentTitle: report.documentTitle, pdfPage: row.pdfPage, printedPage: row.printedPage, reviewedAt: '2026-10-13' })))]));
