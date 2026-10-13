// ============================================================
// FINOVA — Temporal & Timestamp Transparency Utilities
// lib/news/temporalUtils.ts
//
// Key Principles:
// 1. Never invent timestamps.
// 2. Strict provider-specific timestamp attribution:
//    - Marketaux: genuine publication timestamp ("Published: ... IST")
//    - NewsData.io: genuine publication timestamp + 12h free feed delay disclosure
//    - GDELT: genuine indexing/discovery timestamp ("Indexed: ... IST")
// 3. Indian Standard Time (Asia/Kolkata) with explicit IST label.
// 4. Consistent SSR/CSR rendering to prevent hydration mismatches.
// 5. Evidence-based freshness labels (no false "LIVE" or "Real-Time" claims).
// ============================================================

export type TimestampType = 'published' | 'indexed' | 'unavailable';

/** Recent means dated within 72 hours. Undated and implausible future items stay in the archive. */
export function isRecentArticle(article: { pubDate?: string | null }, now = Date.now()): boolean {
  const timestamp = article.pubDate ? new Date(article.pubDate).getTime() : NaN;
  return Number.isFinite(timestamp) && timestamp >= now - 72 * 60 * 60 * 1000 && timestamp <= now + 2 * 60 * 60 * 1000;
}

export type FreshnessBadgeType =
  | 'RECENTLY_PUBLISHED'
  | 'PUBLISHED_TODAY'
  | 'INDEXED_RECENTLY'
  | 'INDEXED_TODAY'
  | 'DELAYED_FEED'
  | 'OLDER_ARTICLE'
  | 'TIME_UNAVAILABLE';

export interface ArticleTemporalInfo {
  timestamp_type: TimestampType;
  raw_timestamp: string | null;
  formatted_ist: string; // e.g. "11 Oct 2026, 3:30 PM IST" or "Publication time unavailable"
  relative_time: string; // e.g. "3 hours ago", "Indexed 2 hours ago", "Yesterday"
  display_label: string; // e.g. "Published: 11 Oct 2026, 3:30 PM IST" or "Indexed: 11 Oct 2026, 3:30 PM IST"
  freshness_badge: FreshnessBadgeType;
  freshness_label: string; // e.g. "Recently published", "Published today", "Delayed feed (~12h)"
  is_delayed_feed: boolean;
  delay_note?: string; // e.g. "NewsData.io Free feed (~12h access delay)"
  provider_display_name: string; // e.g. "Marketaux", "GDELT 2.0", "NewsData.io"
  is_cached: boolean;
  retrieved_ist?: string | null; // e.g. "Retrieved: 12 Oct 2026, 1:15 AM IST"
  is_future_or_invalid: boolean;
}

/**
 * Validates whether a date string is parseable and not wildly in the future
 * (allows up to 2 hours of clock skew).
 */
export function isValidTimestamp(dateStr: string | null | undefined): boolean {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const parsed = new Date(dateStr).getTime();
  if (isNaN(parsed) || parsed <= 0) return false;

  // Max 2 hours into the future for plausible clock skew
  const twoHoursFromNow = Date.now() + 2 * 60 * 60 * 1000;
  if (parsed > twoHoursFromNow) return false;

  // Min valid year: 2000
  const year2000 = new Date('2000-01-01T00:00:00Z').getTime();
  if (parsed < year2000) return false;

  return true;
}

/**
 * Formats a timestamp into Indian Standard Time (Asia/Kolkata):
 * e.g. "11 Oct 2026, 3:30 PM IST"
 */
export function formatIST(dateInput: Date | string | number | null | undefined): string | null {
  if (!dateInput) return null;
  const d = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return null;

  try {
    const formatter = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    return `${formatter.format(d)} IST`;
  } catch {
    return null;
  }
}

/**
 * Computes human-readable relative time dynamically.
 * If prefix is supplied (e.g. "Indexed"), outputs "Indexed 3 hours ago".
 */
export function formatRelativeTime(
  dateInput: Date | string | number | null | undefined,
  prefix?: string
): string {
  if (!dateInput) return 'Time unavailable';
  const d = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return 'Time unavailable';

  const now = Date.now();
  const diffMs = now - d.getTime();

  // If timestamp is slightly in future (within clock skew)
  if (diffMs < 0 && diffMs > -2 * 60 * 60 * 1000) {
    return prefix ? `${prefix} just now` : 'Just now';
  }

  const diffSec = Math.max(0, Math.floor(diffMs / 1000));
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  let rel = '';
  if (diffMin < 1) {
    rel = 'Just now';
  } else if (diffMin < 60) {
    rel = diffMin === 1 ? '1 minute ago' : `${diffMin} minutes ago`;
  } else if (diffHour < 24) {
    rel = diffHour === 1 ? '1 hour ago' : `${diffHour} hours ago`;
  } else if (diffDay === 1) {
    rel = 'Yesterday';
  } else if (diffDay < 7) {
    rel = `${diffDay} days ago`;
  } else {
    // Over a week: return formatted date
    const formatted = formatIST(d);
    return formatted ? formatted.replace(' IST', '') : `${diffDay} days ago`;
  }

  if (prefix) {
    if (rel === 'Yesterday') {
      return `${prefix} yesterday`;
    }
    if (rel === 'Just now') {
      return `${prefix} just now`;
    }
    return `${prefix} ${rel}`;
  }

  return rel;
}

/**
 * Checks if a timestamp falls within today's calendar date in IST
 */
export function isTodayIST(d: Date): boolean {
  try {
    const formatter = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    });
    const nowParts = formatter.format(new Date());
    const targetParts = formatter.format(d);
    return nowParts === targetParts;
  } catch {
    return false;
  }
}

/**
 * Resolves complete temporal metadata for an article based on its provider,
 * verified timestamp, and cache state.
 */
export function resolveArticleTemporalInfo(
  article: {
    pubDate?: string | null;
    retrieved_at?: string | null;
    source_provider?: string;
  },
  isCached = false
): ArticleTemporalInfo {
  const provider = article.source_provider || 'newsdata';
  const rawTimestamp = article.pubDate || null;
  const valid = isValidTimestamp(rawTimestamp);

  const parsedDate = valid && rawTimestamp ? new Date(rawTimestamp) : null;
  const formattedIst = parsedDate ? formatIST(parsedDate) : null;

  // Provider display name
  let providerDisplayName = 'NewsData.io';
  if (provider === 'marketaux') providerDisplayName = 'Marketaux';
  else if (provider === 'gdelt') providerDisplayName = 'GDELT 2.0';
  else if (provider === 'newsdata') providerDisplayName = 'NewsData.io';

  const isDelayedFeed = provider === 'newsdata';
  const delayNote = isDelayedFeed
    ? 'NewsData.io free feed (~12-hour access delay)'
    : undefined;

  // Format retrieval time for cached metadata
  const retrievedDate = article.retrieved_at && isValidTimestamp(article.retrieved_at)
    ? new Date(article.retrieved_at)
    : null;
  const retrievedIst = retrievedDate ? formatIST(retrievedDate) : null;

  // Case 1: Missing or invalid timestamp
  if (!valid || !parsedDate || !formattedIst) {
    return {
      timestamp_type: 'unavailable',
      raw_timestamp: null,
      formatted_ist: 'Publication time unavailable',
      relative_time: 'Publication time unavailable',
      display_label: 'Publication time unavailable',
      freshness_badge: 'TIME_UNAVAILABLE',
      freshness_label: 'Publication time unavailable',
      is_delayed_feed: isDelayedFeed,
      delay_note: delayNote,
      provider_display_name: providerDisplayName,
      is_cached: isCached,
      retrieved_ist: retrievedIst,
      is_future_or_invalid: true,
    };
  }

  const ageHours = (Date.now() - parsedDate.getTime()) / (1000 * 60 * 60);

  // Case 2: GDELT (Indexed / Discovery Timestamp)
  if (provider === 'gdelt') {
    const relIndexed = formatRelativeTime(parsedDate, 'Indexed');
    let badge: FreshnessBadgeType = 'OLDER_ARTICLE';
    let label = 'Older article';

    if (ageHours < 6) {
      badge = 'INDEXED_RECENTLY';
      label = 'Indexed recently';
    } else if (isTodayIST(parsedDate)) {
      badge = 'INDEXED_TODAY';
      label = 'Indexed today';
    }

    return {
      timestamp_type: 'indexed',
      raw_timestamp: rawTimestamp,
      formatted_ist: formattedIst,
      relative_time: relIndexed,
      display_label: `Indexed: ${formattedIst}`,
      freshness_badge: badge,
      freshness_label: label,
      is_delayed_feed: false,
      provider_display_name: 'GDELT 2.0',
      is_cached: isCached,
      retrieved_ist: retrievedIst,
      is_future_or_invalid: false,
    };
  }

  // Case 3: NewsData.io (Delayed Feed)
  if (provider === 'newsdata') {
    const relPub = formatRelativeTime(parsedDate);
    return {
      timestamp_type: 'published',
      raw_timestamp: rawTimestamp,
      formatted_ist: formattedIst,
      relative_time: relPub,
      display_label: `Published: ${formattedIst}`,
      freshness_badge: 'DELAYED_FEED',
      freshness_label: 'Delayed feed (~12h)',
      is_delayed_feed: true,
      delay_note: 'NewsData.io free feed (~12-hour access delay)',
      provider_display_name: 'NewsData.io',
      is_cached: isCached,
      retrieved_ist: retrievedIst,
      is_future_or_invalid: false,
    };
  }

  // Case 4: MarketAux (Genuine Published Timestamp)
  const relPub = formatRelativeTime(parsedDate);
  let badge: FreshnessBadgeType = 'OLDER_ARTICLE';
  let label = 'Older article';

  if (ageHours < 6) {
    badge = 'RECENTLY_PUBLISHED';
    label = 'Recently published';
  } else if (isTodayIST(parsedDate)) {
    badge = 'PUBLISHED_TODAY';
    label = 'Published today';
  }

  return {
    timestamp_type: 'published',
    raw_timestamp: rawTimestamp,
    formatted_ist: formattedIst,
    relative_time: relPub,
    display_label: `Published: ${formattedIst}`,
    freshness_badge: badge,
    freshness_label: label,
    is_delayed_feed: false,
    provider_display_name: 'Marketaux',
    is_cached: isCached,
    retrieved_ist: retrievedIst,
    is_future_or_invalid: false,
  };
}
