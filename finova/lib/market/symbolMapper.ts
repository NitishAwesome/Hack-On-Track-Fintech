// ============================================================
// FINOVA — Market Symbol Resolution Engine
// Resolves Indian exchange symbols (NSE/BSE) to market data
// provider tickers (e.g. Yahoo Finance .NS / .BO suffixes)
// ============================================================

export type SupportedExchange = 'NSE' | 'BSE' | 'OTHER';

/**
 * Standard index mappings for Indian markets
 */
const KNOWN_INDICES: Record<string, string> = {
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

  // 2. Already formatted ticker
  if (trimmed.startsWith('^') || trimmed.endsWith('.NS') || trimmed.endsWith('.BO')) {
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
  if (upper.startsWith('^')) return upper;
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
  if (upper.startsWith('^')) return false;
  return /^[A-Z0-9_\-]+(\.(NS|BO))?$/.test(upper);
}
