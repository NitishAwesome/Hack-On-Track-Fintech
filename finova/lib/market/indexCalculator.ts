// ============================================================
// FINOVA — Market Index Change & Valuation Calculation Engine
// Strictly computes index levels, previous closes, daily point
// changes, and percentage changes adhering to financial standards:
//   change = currentPrice - previousClose
//   changePercent = (change / previousClose) * 100
// ============================================================

export interface RawIndexChartMeta {
  regularMarketPrice?: number | null;
  regularMarketTime?: number | null;
  fulldayChange?: number | null;
  fulldayChangePercent?: number | null;
  regularMarketChangePercent?: number | null;
  chartPreviousClose?: number | null;
  previousClose?: number | null;
  regularMarketPreviousClose?: number | null;
  currency?: string | null;
}

export interface RawIndexChartResult {
  meta?: RawIndexChartMeta;
  timestamp?: (number | null)[] | null;
  indicators?: {
    quote?: Array<{
      close?: (number | null)[] | null;
      open?: (number | null)[] | null;
      high?: (number | null)[] | null;
      low?: (number | null)[] | null;
      volume?: (number | null)[] | null;
    }>;
  };
}

export interface IndexCalculationResult {
  isValid: boolean;
  currentPrice: number;
  previousClose: number | null;
  change: number | null;
  changePercent: number | null;
  tradeTimestamp: string;
  isStale: boolean;
  rejectionReason?: string;
}

export interface IndexCalculationOptions {
  /** Timezone for exchange session demarcation. Defaults to Asia/Kolkata for Indian indices. */
  exchangeTimezone?: string;
  /** Maximum allowable staleness in calendar days. Defaults to 10 days. */
  maxStalenessDays?: number;
  /** Maximum allowable future clock skew in seconds. Defaults to 3600 (1 hour). */
  futureSkewSeconds?: number;
}

const DEFAULT_OPTIONS: Required<IndexCalculationOptions> = {
  exchangeTimezone: 'Asia/Kolkata',
  maxStalenessDays: 10,
  futureSkewSeconds: 3600,
};

/**
 * Pure mathematical helper to derive point change and percentage from current price and previous close.
 * Returns null if previous close is missing, non-positive, or non-finite.
 */
export function deriveChangeAndPercent(
  currentPrice: number | null | undefined,
  previousClose: number | null | undefined
): { change: number | null; changePercent: number | null } {
  if (
    currentPrice === null ||
    currentPrice === undefined ||
    typeof currentPrice !== 'number' ||
    isNaN(currentPrice) ||
    !isFinite(currentPrice) ||
    currentPrice <= 0 ||
    previousClose === null ||
    previousClose === undefined ||
    typeof previousClose !== 'number' ||
    isNaN(previousClose) ||
    !isFinite(previousClose) ||
    previousClose <= 0
  ) {
    return { change: null, changePercent: null };
  }

  // Exact difference
  const rawChange = currentPrice - previousClose;
  const rawPercent = (rawChange / previousClose) * 100;

  // Round to 2 decimal places with epsilon to prevent floating-point rounding artifacts
  const change = Math.round((rawChange + Number.EPSILON) * 100) / 100;
  const changePercent = Math.round((rawPercent + Number.EPSILON) * 100) / 100;

  return { change, changePercent };
}

/**
 * Robustly calculates index metrics from provider chart responses.
 *
 * Solves the Yahoo Finance `chartPreviousClose` defect:
 * In Yahoo Finance chart API, `chartPreviousClose` is the close preceding the start
 * of the chart query interval, NOT the official previous trading session's close.
 *
 * This function:
 * 1. Checks provider's official `fulldayChange` to derive the implied previous close.
 * 2. Cross-verifies against historical daily closing bars mapped by exchange timezone.
 * 3. Rejects stale or corrupt data without fabricating fake numbers.
 */
export function calculateIndexMetrics(
  symbol: string,
  chartResult?: RawIndexChartResult | null,
  options?: IndexCalculationOptions
): IndexCalculationResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const meta = chartResult?.meta;

  // 1. Current Price Validation
  const rawPrice = meta?.regularMarketPrice;
  if (
    rawPrice === null ||
    rawPrice === undefined ||
    typeof rawPrice !== 'number' ||
    isNaN(rawPrice) ||
    !isFinite(rawPrice) ||
    rawPrice <= 0
  ) {
    return {
      isValid: false,
      currentPrice: 0,
      previousClose: null,
      change: null,
      changePercent: null,
      tradeTimestamp: new Date().toISOString(),
      isStale: false,
      rejectionReason: `Invalid or non-positive index level: ${rawPrice}`,
    };
  }

  const currentPrice = Math.round((rawPrice + Number.EPSILON) * 100) / 100;

  // 2. Timestamp Validation
  let tradeTimeMs: number;
  if (typeof meta?.regularMarketTime === 'number' && meta.regularMarketTime > 0) {
    tradeTimeMs = meta.regularMarketTime < 10000000000 ? meta.regularMarketTime * 1000 : meta.regularMarketTime;
  } else {
    tradeTimeMs = Date.now();
  }

  const nowMs = Date.now();
  const maxFutureMs = nowMs + opts.futureSkewSeconds * 1000;
  if (tradeTimeMs > maxFutureMs) {
    return {
      isValid: false,
      currentPrice,
      previousClose: null,
      change: null,
      changePercent: null,
      tradeTimestamp: new Date(tradeTimeMs).toISOString(),
      isStale: false,
      rejectionReason: `Index timestamp is in the future: ${new Date(tradeTimeMs).toISOString()}`,
    };
  }

  const maxAgeMs = opts.maxStalenessDays * 24 * 60 * 60 * 1000;
  const ageMs = nowMs - tradeTimeMs;
  const isStale = ageMs > maxAgeMs;

  if (isStale) {
    return {
      isValid: false,
      currentPrice,
      previousClose: null,
      change: null,
      changePercent: null,
      tradeTimestamp: new Date(tradeTimeMs).toISOString(),
      isStale: true,
      rejectionReason: `Index quote is stale (${Math.round(ageMs / 86400000)} days old > ${opts.maxStalenessDays} days limit)`,
    };
  }

  const tradeTimestamp = new Date(tradeTimeMs).toISOString();

  // 3. Demarcate Exchange Trading Sessions via Exchange Timezone
  let tradeDateInExchangeTz: string;
  try {
    tradeDateInExchangeTz = new Intl.DateTimeFormat('en-CA', {
      timeZone: opts.exchangeTimezone,
    }).format(new Date(tradeTimeMs));
  } catch {
    tradeDateInExchangeTz = new Date(tradeTimeMs).toISOString().slice(0, 10);
  }

  // Candidate A: Implied previous close from Yahoo's official fulldayChange
  let candidateFromChange: number | null = null;
  if (typeof meta?.fulldayChange === 'number' && !isNaN(meta.fulldayChange) && isFinite(meta.fulldayChange)) {
    const implied = currentPrice - meta.fulldayChange;
    if (implied > 0) {
      candidateFromChange = Math.round((implied + Number.EPSILON) * 100) / 100;
    }
  }

  // Candidate B: Historical daily closing bar from the session immediately prior to current session
  let candidateFromBar: number | null = null;
  const timestamps = chartResult?.timestamp || [];
  const closes = chartResult?.indicators?.quote?.[0]?.close || [];

  if (timestamps.length > 0 && closes.length > 0) {
    for (let i = timestamps.length - 1; i >= 0; i--) {
      const barTs = timestamps[i];
      const barClose = closes[i];
      if (typeof barTs !== 'number' || barClose === null || barClose === undefined || typeof barClose !== 'number' || barClose <= 0) {
        continue;
      }

      let barDateInExchangeTz: string;
      try {
        barDateInExchangeTz = new Intl.DateTimeFormat('en-CA', {
          timeZone: opts.exchangeTimezone,
        }).format(new Date(barTs * 1000));
      } catch {
        barDateInExchangeTz = new Date(barTs * 1000).toISOString().slice(0, 10);
      }

      // Must strictly belong to a calendar trading day prior to current session
      if (barDateInExchangeTz < tradeDateInExchangeTz) {
        candidateFromBar = Math.round((barClose + Number.EPSILON) * 100) / 100;
        break;
      }
    }
  }

  // Candidate C: Explicit previous close fields in meta
  let candidateFromMeta: number | null = null;
  const rawMetaPrev = meta?.previousClose ?? meta?.regularMarketPreviousClose;
  if (typeof rawMetaPrev === 'number' && !isNaN(rawMetaPrev) && isFinite(rawMetaPrev) && rawMetaPrev > 0) {
    candidateFromMeta = Math.round((rawMetaPrev + Number.EPSILON) * 100) / 100;
  }

  // 4. Cross-Verification & Final Previous Close Selection
  let previousClose: number | null = null;

  if (candidateFromChange !== null && candidateFromBar !== null) {
    // Cross-verify: Candidate A and B should agree within 1% (accounting for penny rounding)
    const discrepancy = Math.abs(candidateFromChange - candidateFromBar) / candidateFromBar;
    if (discrepancy < 0.015) {
      // High confidence match
      previousClose = candidateFromChange;
    } else {
      // If discrepancy, prefer historical daily closing bar as ground truth
      previousClose = candidateFromBar;
    }
  } else if (candidateFromChange !== null) {
    previousClose = candidateFromChange;
  } else if (candidateFromBar !== null) {
    previousClose = candidateFromBar;
  } else if (candidateFromMeta !== null) {
    previousClose = candidateFromMeta;
  }

  // 5. Derive Point Change & Percentage
  const { change, changePercent } = deriveChangeAndPercent(currentPrice, previousClose);

  return {
    isValid: true,
    currentPrice,
    previousClose,
    change,
    changePercent,
    tradeTimestamp,
    isStale: false,
  };
}
