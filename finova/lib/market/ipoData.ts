export type IpoCategory = 'open' | 'upcoming' | 'closed' | 'listed';
export interface VerifiedIpoItem {
  id: string; company_name: string; symbol?: string; exchange: 'NSE' | 'BSE' | 'NSE & BSE' | 'NSE SME' | 'BSE SME';
  ipo_type: string | null; category: IpoCategory; open_date: string | null; close_date: string | null;
  price_band: string | null; lot_size: number | null; issue_size_cr: number | null;
  listing_date?: string; listing_price?: number; listing_gain_pct?: number;
  status: 'OPEN' | 'UPCOMING' | 'CLOSED' | 'LISTED'; status_label: string;
  lead_managers: string[]; registrar: string | null; official_link: string; source: string; verified_at: string;
}
export interface IpoDiscoveryResponse {
  success: boolean; categories: Record<IpoCategory, VerifiedIpoItem[]>; total_count: number; open_count: number;
  as_of: string; source_attribution: string; disclaimer: string;
}
const REVIEWED_AT = '2026-10-13';
const unavailable = { ipo_type: null, open_date: null, close_date: null, price_band: null, lot_size: null, issue_size_cr: null, lead_managers: [], registrar: null };
/** Listing evidence only. Unreviewed issue terms and listing-day prices stay unavailable. */
export const VERIFIED_PRIMARY_MARKET_IPOS: VerifiedIpoItem[] = [
  { ...unavailable, id: 'ntpcgreen-2024', company_name: 'NTPC Green Energy Limited', symbol: 'NTPCGREEN', exchange: 'NSE', category: 'listed', status: 'LISTED', status_label: 'Listed archive · 27 Nov 2024', listing_date: '2024-11-27', official_link: 'https://nsearchives.nseindia.com/web/sites/default/files/2024-11/PR_List_26112024.pdf', source: 'NSE listing notice · 26 Nov 2024 · PDF p. 1', verified_at: REVIEWED_AT },
  { ...unavailable, id: 'afcons-2024', company_name: 'Afcons Infrastructure Limited', symbol: 'AFCONS', exchange: 'NSE', category: 'listed', status: 'LISTED', status_label: 'Listed archive · 4 Nov 2024', listing_date: '2024-11-04', official_link: 'https://nsearchives.nseindia.com/web/sites/default/files/2024-10/PR_list_31102024.pdf', source: 'NSE listing notice · 31 Oct 2024 · PDF p. 1', verified_at: REVIEWED_AT },
];
export function getVerifiedIpoSchedule(): IpoDiscoveryResponse {
  return { success: true, categories: { open: [], upcoming: [], closed: [], listed: VERIFIED_PRIMARY_MARKET_IPOS.filter((item) => item.category === 'listed' && item.official_link && item.listing_date) }, total_count: VERIFIED_PRIMARY_MARKET_IPOS.length, open_count: 0, as_of: REVIEWED_AT, source_attribution: 'Manually reviewed NSE listing notices', disclaimer: 'This is a small sourced archive. No reviewed current or upcoming issue records are available. Empty categories do not mean no IPOs exist. Follow the official exchanges for current issue terms.' };
}
