export interface OwnershipGroup {
  id: string;
  label: string;
  percent: number;
  shares?: number;
}
export interface OwnershipRecord {
  symbol: string;
  asOf: string;
  reviewedAt: string;
  documentUrl: string;
  documentTitle: string;
  pdfPage: number;
  printedPage: string;
  totalShares?: number;
  groups: OwnershipGroup[];
}
/** Manually transcribed from the official Infosys FY2025–26 annual report, PDF p.122 / printed p.153.
 * These seven categories are mutually exclusive. Mutual funds are not also included in a DII aggregate.
 * Review date is stored, never changed at request time. This is dated ownership, not a live feed. */
export const REVIEWED_OWNERSHIP: Record<string, OwnershipRecord> = {
  INFY: {
    symbol: "INFY",
    asOf: "2026-03-31",
    reviewedAt: "2026-10-14",
    documentUrl:
      "https://www.infosys.com/investors/reports-filings/annual-report/annual/documents/infosys-ar-26.pdf",
    documentTitle:
      "Infosys Integrated Annual Report 2025–26 · Category-wise shareholding",
    pdfPage: 122,
    printedPage: "153",
    totalShares: 4055591723,
    groups: [
      {
        id: "promoters",
        label: "Promoters and promoter group",
        percent: 13.3,
        shares: 539494014,
      },
      {
        id: "fpi",
        label: "Foreign portfolio investors",
        percent: 26.31,
        shares: 1067083515,
      },
      {
        id: "mutual-funds",
        label: "Mutual funds",
        percent: 21.73,
        shares: 881330104,
      },
      {
        id: "insurance",
        label: "Insurance companies",
        percent: 14.82,
        shares: 601202661,
      },
      {
        id: "resident-public",
        label: "Resident individuals (public)",
        percent: 10.62,
        shares: 430734492,
      },
      {
        id: "adr",
        label: "American depositary receipts",
        percent: 7.52,
        shares: 305054064,
      },
      { id: "other", label: "Others", percent: 5.7, shares: 230692873 },
    ],
  },
};
export function validateOwnership(record: OwnershipRecord) {
  let url: URL;
  try {
    url = new URL(record.documentUrl);
  } catch {
    return false;
  }
  const hosts = [
    "infosys.com",
    "tcs.com",
    "ril.com",
    "nseindia.com",
    "bseindia.com",
  ];
  if (
    url.protocol !== "https:" ||
    !hosts.some(
      (host) => url.hostname === host || url.hostname.endsWith(`.${host}`),
    )
  )
    return false;
  if (
    !record.groups.length ||
    new Set(record.groups.map((group) => group.id)).size !==
      record.groups.length ||
    !Number.isFinite(Date.parse(record.asOf)) ||
    !Number.isFinite(Date.parse(record.reviewedAt))
  )
    return false;
  if (
    record.groups.some(
      (group) =>
        !Number.isFinite(group.percent) ||
        group.percent < 0 ||
        group.percent > 100,
    )
  )
    return false;
  if (
    Math.abs(
      record.groups.reduce((sum, group) => sum + group.percent, 0) - 100,
    ) > 0.05
  )
    return false;
  if (record.totalShares !== undefined) {
    if (
      !Number.isSafeInteger(record.totalShares) ||
      record.totalShares <= 0 ||
      record.groups.some(
        (group) => !Number.isSafeInteger(group.shares) || group.shares! < 0,
      )
    )
      return false;
    if (
      record.groups.reduce((sum, group) => sum + group.shares!, 0) !==
      record.totalShares
    )
      return false;
    if (
      record.groups.some(
        (group) =>
          Math.abs(
            (group.shares! / record.totalShares!) * 100 - group.percent,
          ) > 0.02,
      )
    )
      return false;
  }
  return true;
}
export function getReviewedOwnership(symbol: string) {
  const record = REVIEWED_OWNERSHIP[symbol];
  return record && validateOwnership(record) ? record : null;
}
