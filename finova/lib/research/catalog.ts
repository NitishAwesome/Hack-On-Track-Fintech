import { EXPANDED_NSE_STOCKS } from '@/lib/market/stockCatalog';
export const findEquity = (symbol: string) => EXPANDED_NSE_STOCKS.find(stock => stock.symbol === symbol.trim().toUpperCase());
export const sectorName = (sector: string | null | undefined) => sector?.trim() || 'Other / Unclassified';
export const SECTORS = [...new Set(EXPANDED_NSE_STOCKS.map(stock => sectorName(stock.sector)))].sort();
export const sectorStocks = (sector: string) => EXPANDED_NSE_STOCKS.filter(stock => sectorName(stock.sector) === sector);
export const INDEX_IDENTITIES: Record<string, { symbol: string; name: string; exchange: string }> = {
  NIFTY50: { symbol: 'NIFTY50', name: 'Nifty 50 Index', exchange: 'NSE' },
  SENSEX: { symbol: 'SENSEX', name: 'S&P BSE Sensex Index', exchange: 'BSE' },
  BANKNIFTY: { symbol: 'BANKNIFTY', name: 'Nifty Bank Index', exchange: 'NSE' },
};
export function normalizeResearchSymbol(value: string) {
  // Card links encode Yahoo's caret tickers; route params can retain that encoding.
  let decoded: string;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return ''; // Malformed URL symbols remain unsupported by the research route.
  }
  const symbol = decoded.trim().toUpperCase().replace(/\.(NS|BO)$/, '');
  return ({ '^NSEI': 'NIFTY50', '^BSESN': 'SENSEX', '^NSEBANK': 'BANKNIFTY' } as Record<string, string>)[symbol] || symbol;
}
export function validateWatchlistInstrument(symbol: unknown, exchange: unknown = 'NSE') {
  if (typeof symbol !== 'string' || exchange !== 'NSE') return null;
  return findEquity(symbol) || null;
}
