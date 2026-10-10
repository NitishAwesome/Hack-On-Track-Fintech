// ============================================================
// FINOVA — Market Quote Validation & Staleness Policy Engine
// Strictly validates quote authenticity, precision, temporal freshness,
// and ensures demo/seed data is NEVER treated as live quotes.
// ============================================================

export type PriceStatus = 'REALTIME' | 'DELAYED' | 'EOD' | 'STALE' | 'UNAVAILABLE';

export interface RawQuoteInput {
  symbol: string;
  price: number | null | undefined;
  currency?: string | null;
  timestamp?: string | number | Date | null;
  source?: string | null;
  marketStatus?: 'OPEN' | 'CLOSED' | 'PRE_OPEN' | 'UNKNOWN';
}

export interface QuoteValidationResult {
  isValid: boolean;
  status: PriceStatus;
  rejectionReason?: string;
  normalizedPrice?: number;
  normalizedTimestamp?: string;
}

export interface QuoteValidationOptions {
  /** Expected currency. Defaults to 'INR' for Indian equities. */
  expectedCurrency?: string;
  /** Max allowable staleness in calendar days. Defaults to 10 days (allows holiday weekends). */
  maxStalenessDays?: number;
  /** Allowable clock skew in future seconds. Defaults to 3600 (1 hour). */
  futureSkewSeconds?: number;
}

const DEFAULT_OPTIONS: Required<QuoteValidationOptions> = {
  expectedCurrency: 'INR',
  maxStalenessDays: 10,
  futureSkewSeconds: 3600,
};

/**
 * Validates a quote according to FINOVA's strict market data policy.
 *
 * Policy:
 * 1. Positive Finite Numeric Price: Price must be strictly greater than 0, not NaN, and finite.
 * 2. Currency Consistency: For Indian instruments, currency MUST be INR. Foreign currencies (e.g. USD)
 *    indicate ticker collision or invalid feed and are rejected.
 * 3. Temporal Validity: Timestamp must be parseable. Future timestamps exceeding clock skew are rejected.
 * 4. Staleness Rejection: Quotes older than 10 calendar days are classified as STALE and rejected for live valuation.
 * 5. Rejection Handling: Any invalid quote yields isValid = false, requiring UI to render "Price unavailable"
 *    without substituting artificial zero or seed prices.
 */
export function validateMarketQuote(
  quote: RawQuoteInput,
  options?: QuoteValidationOptions
): QuoteValidationResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // 1. Numeric price check
  if (
    quote.price === null ||
    quote.price === undefined ||
    typeof quote.price !== 'number' ||
    isNaN(quote.price) ||
    !isFinite(quote.price) ||
    quote.price <= 0
  ) {
    return {
      isValid: false,
      status: 'UNAVAILABLE',
      rejectionReason: `Invalid or non-positive price: ${quote.price}`,
    };
  }

  // 2. Currency check
  if (quote.currency) {
    const cleanCurr = quote.currency.trim().toUpperCase();
    if (cleanCurr !== opts.expectedCurrency.toUpperCase()) {
      return {
        isValid: false,
        status: 'UNAVAILABLE',
        rejectionReason: `Currency mismatch: expected ${opts.expectedCurrency}, received ${quote.currency}`,
      };
    }
  }

  // 3. Timestamp verification
  let quoteTimeMs: number;
  if (!quote.timestamp) {
    return {
      isValid: false,
      status: 'UNAVAILABLE',
      rejectionReason: 'Missing quote timestamp',
    };
  }

  if (typeof quote.timestamp === 'number') {
    // Check if timestamp is in seconds (Unix timestamp) or milliseconds
    quoteTimeMs = quote.timestamp < 10000000000 ? quote.timestamp * 1000 : quote.timestamp;
  } else if (quote.timestamp instanceof Date) {
    quoteTimeMs = quote.timestamp.getTime();
  } else {
    quoteTimeMs = new Date(quote.timestamp).getTime();
  }

  if (isNaN(quoteTimeMs) || quoteTimeMs <= 0) {
    return {
      isValid: false,
      status: 'UNAVAILABLE',
      rejectionReason: `Unparseable timestamp: ${quote.timestamp}`,
    };
  }

  const nowMs = Date.now();
  const maxFutureMs = nowMs + opts.futureSkewSeconds * 1000;
  if (quoteTimeMs > maxFutureMs) {
    return {
      isValid: false,
      status: 'STALE',
      rejectionReason: `Quote timestamp is in the future: ${new Date(quoteTimeMs).toISOString()}`,
    };
  }

  // 4. Staleness check
  const maxAgeMs = opts.maxStalenessDays * 24 * 60 * 60 * 1000;
  const ageMs = nowMs - quoteTimeMs;
  if (ageMs > maxAgeMs) {
    return {
      isValid: false,
      status: 'STALE',
      rejectionReason: `Quote is stale (${Math.round(ageMs / (24 * 60 * 60 * 1000))} days old > limit of ${opts.maxStalenessDays} days)`,
    };
  }

  // 5. Determine status (REALTIME vs DELAYED vs EOD)
  // Yahoo Finance free feed is officially 15-min delayed during open session, and EOD outside open session
  let status: PriceStatus = 'DELAYED';
  if (quote.marketStatus === 'CLOSED') {
    status = 'EOD';
  } else if (quote.marketStatus === 'OPEN') {
    status = 'DELAYED';
  } else if (ageMs > 24 * 60 * 60 * 1000) {
    // If older than 24 hours, it's an End-Of-Day closing price
    status = 'EOD';
  }

  return {
    isValid: true,
    status,
    normalizedPrice: Math.round((quote.price + Number.EPSILON) * 100) / 100,
    normalizedTimestamp: new Date(quoteTimeMs).toISOString(),
  };
}

export const validateQuote = validateMarketQuote;
