// ============================================================
// FINOVA — Market Symbol Resolution Engine
// Resolves Indian exchange symbols (NSE/BSE) to market data
// provider tickers (e.g. Yahoo Finance .NS / .BO suffixes)
// ============================================================

export type SupportedExchange = 'NSE' | 'BSE' | 'OTHER';

/**
 * Standard index mappings for Indian markets
 */
export const KNOWN_INDICES: Record<string, string> = {
  NIFTY: '^NSEI',
  NIFTY50: '^NSEI',
  'NIFTY 50': '^NSEI',
  '^NSEI': '^NSEI',
  SENSEX: '^BSESN',
  BSESN: '^BSESN',
  '^BSESN': '^BSESN',
  BANKNIFTY: '^NSEBANK',
  NIFTYBANK: '^NSEBANK',
  'NIFTY BANK': '^NSEBANK',
  '^NSEBANK': '^NSEBANK',
};

export const INDEX_NAME_TO_SYMBOL: Record<string, string> = {
  'NIFTY 50': '^NSEI',
  'SENSEX': '^BSESN',
  'NIFTY BANK': '^NSEBANK',
};

export function getIndexDisplayName(symbol: string): string {
  const s = symbol.trim().toUpperCase();
  if (s === '^NSEI' || s === 'NIFTY 50' || s === 'NIFTY50' || s === 'NIFTY') return 'NIFTY 50';
  if (s === '^BSESN' || s === 'SENSEX' || s === 'BSESN') return 'BSE SENSEX';
  if (s === '^NSEBANK' || s === 'NIFTY BANK' || s === 'BANKNIFTY') return 'NIFTY BANK';
  return s;
}

export function normalizeSymbol(symbol: string): string {
  if (!symbol) return '';
  return symbol.trim().toUpperCase();
}

export function isValidEquitySymbol(symbol: string): boolean {
  return isIndianEquity(symbol);
}

/**
 * Resolves an Indian market symbol and exchange to the corresponding Yahoo Finance ticker.
 *
 * Rules:
 * 1. Special indices map directly to Yahoo index tickers (^NSEI, ^BSESN, ^NSEBANK).
 * 2. If the symbol already contains a provider suffix (.NS, .BO) or prefix (^), it is preserved.
 * 3. NSE instruments (stocks, REITs, InvITs, ETFs) are suffixed with .NS (e.g. TCS -> TCS.NS).
 * 4. BSE instruments are suffixed with .BO (e.g. TCS -> TCS.BO).
 * 5. Returns null for empty or invalid symbol strings.
 */
export function resolveYahooFinanceSymbol(
  symbol: string,
  exchange: string = 'NSE'
): string | null {
  if (!symbol || typeof symbol !== 'string') return null;

  const trimmed = symbol.trim().toUpperCase();
  if (!trimmed) return null;

  // 1. Direct index check
  if (KNOWN_INDICES[trimmed]) {
    return KNOWN_INDICES[trimmed];
  }

  // 2. Already formatted ticker or commodity futures (=F)
  if (trimmed.startsWith('^') || trimmed.endsWith('.NS') || trimmed.endsWith('.BO') || trimmed.includes('=')) {
    return trimmed;
  }

  const cleanExchange = (exchange || 'NSE').trim().toUpperCase();

  // 3. Exchange-specific suffix
  if (cleanExchange === 'BSE') {
    return `${trimmed}.BO`;
  }

  // Default to NSE for Indian stock markets
  return `${trimmed}.NS`;
}

/**
 * Extracts the base symbol by stripping provider suffixes (.NS, .BO)
 */
export function extractBaseSymbol(ticker: string): string {
  if (!ticker) return '';
  const upper = ticker.trim().toUpperCase();
  if (upper.startsWith('^') || upper.includes('=')) return upper;
  return upper.replace(/\.(NS|BO)$/i, '');
}

/**
 * Identifies exchange from provider ticker suffix
 */
export function extractExchangeFromTicker(ticker: string): SupportedExchange {
  if (!ticker) return 'OTHER';
  const upper = ticker.trim().toUpperCase();
  if (upper.endsWith('.NS')) return 'NSE';
  if (upper.endsWith('.BO')) return 'BSE';
  return 'OTHER';
}

/**
 * Normalizes input exchange to standard NSE / BSE
 */
export function normalizeExchange(exchange?: string): SupportedExchange {
  if (!exchange) return 'NSE';
  const upper = exchange.trim().toUpperCase();
  if (upper === 'BSE') return 'BSE';
  if (upper === 'NSE') return 'NSE';
  return 'NSE';
}

/**
 * Checks whether symbol is a candidate Indian equity
 */
export function isIndianEquity(symbol: string): boolean {
  if (!symbol) return false;
  const upper = symbol.trim().toUpperCase();
  if (upper.startsWith('^') || upper.includes('=')) return false;
  return /^[A-Z0-9_\-]+(\.(NS|BO))?$/.test(upper);
}

/**
 * Checks whether symbol is a market index (^NSEI, SENSEX, etc.)
 */
export function isIndexSymbol(symbol: string): boolean {
  if (!symbol) return false;
  const upper = symbol.trim().toUpperCase();
  return upper.startsWith('^') || Boolean(KNOWN_INDICES[upper]);
}

/**
 * Resolves symbol to provider ticker, with asset-class aware mapping (e.g. commodities to ETFs)
 */
export function toProviderTicker(symbol: string, assetClass?: string): string {
  if (!symbol) return '';
  const upper = symbol.trim().toUpperCase();
  if (assetClass === 'commodity') {
    if (upper === 'GOLD') return 'GOLDBEES.NS';
    if (upper === 'SILVER') return 'SILVERBEES.NS';
  }
  return resolveYahooFinanceSymbol(upper) || upper;
}
