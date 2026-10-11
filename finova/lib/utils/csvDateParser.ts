// ============================================================
// FINOVA — Strict CSV Date Parser & Calendar Normalizer (Prompt 16)
// lib/utils/csvDateParser.ts
//
// Key Principles:
// 1. Strict calendar validation: No JavaScript permissive rollover.
// 2. Exact leap-year logic for February (Gregorian calendar rules).
// 3. Robust detection & normalization for DD-MM-YYYY, YYYY-MM-DD, MM-DD-YYYY.
// 4. Ambiguity detection when day and month are both <= 12.
// 5. Preservation of timestamps and timezones when provided.
// ============================================================

export interface DateParseResult {
  isValid: boolean;
  normalizedDate: string; // YYYY-MM-DD
  normalizedIso?: string; // Full ISO 8601 string
  detectedFormat?: 'YYYY-MM-DD' | 'DD-MM-YYYY' | 'MM-DD-YYYY' | 'ISO_TIMESTAMP';
  isAmbiguous?: boolean;
  ambiguityWarning?: string;
  error?: string;
}

/**
 * Determines whether a given year is a leap year according to the Gregorian calendar.
 */
export function isLeapYear(year: number): boolean {
  if (year % 400 === 0) return true;
  if (year % 100 === 0) return false;
  return year % 4 === 0;
}

/**
 * Returns the exact days in a given month (1-indexed: 1 = Jan, 12 = Dec).
 */
export function getDaysInMonth(year: number, month: number): number {
  if (month < 1 || month > 12) return 0;
  switch (month) {
    case 1: // Jan
    case 3: // Mar
    case 5: // May
    case 7: // Jul
    case 8: // Aug
    case 10: // Oct
    case 12: // Dec
      return 31;
    case 4: // Apr
    case 6: // Jun
    case 9: // Sep
    case 11: // Nov
      return 30;
    case 2: // Feb
      return isLeapYear(year) ? 29 : 28;
    default:
      return 0;
  }
}

/**
 * Validates and normalizes trade and transaction dates from CSV files.
 * Rejects invalid calendar days (e.g. 31st April, 29th February on non-leap years).
 *
 * @param input Raw date string from CSV cell (e.g. "2024-03-15", "15/03/2024", "15-03-2024 14:30:00")
 * @param preferredFormat Optional preference when dates are ambiguous (defaults to Indian broker convention 'DD-MM-YYYY')
 */
export function parseAndNormalizeCsvDate(
  input: string | null | undefined,
  preferredFormat: 'DD-MM-YYYY' | 'YYYY-MM-DD' | 'MM-DD-YYYY' = 'DD-MM-YYYY'
): DateParseResult {
  if (!input || typeof input !== 'string') {
    return {
      isValid: false,
      normalizedDate: '',
      error: 'Missing or empty date value.',
    };
  }

  const trimmed = input.trim();
  if (!trimmed || trimmed.toLowerCase() === 'null' || trimmed.toLowerCase() === 'undefined') {
    return {
      isValid: false,
      normalizedDate: '',
      error: 'Empty date string.',
    };
  }

  // Check if string has time component (e.g. "2024-03-15T10:30:00.000Z" or "2024-03-15 14:30:00")
  let datePart = trimmed;
  let timePart = '00:00:00';
  let hasExplicitTime = false;

  if (trimmed.includes('T')) {
    const parts = trimmed.split('T');
    datePart = parts[0];
    timePart = parts[1].replace(/Z$/, '').trim();
    hasExplicitTime = true;
  } else if (trimmed.includes(' ')) {
    const parts = trimmed.split(/\s+/);
    datePart = parts[0];
    if (parts.length > 1 && parts[1].includes(':')) {
      timePart = parts[1];
      hasExplicitTime = true;
    }
  }

  // Extract date components using common separators (-, /, .)
  const separators = ['-', '/', '.'];
  let parts: string[] = [];

  for (const sep of separators) {
    if (datePart.includes(sep)) {
      parts = datePart.split(sep);
      break;
    }
  }

  if (parts.length !== 3) {
    return {
      isValid: false,
      normalizedDate: '',
      error: `Invalid date format "${trimmed}". Expected YYYY-MM-DD or DD-MM-YYYY.`,
    };
  }

  const p1 = parseInt(parts[0], 10);
  const p2 = parseInt(parts[1], 10);
  const p3 = parseInt(parts[2], 10);

  if (isNaN(p1) || isNaN(p2) || isNaN(p3)) {
    return {
      isValid: false,
      normalizedDate: '',
      error: `Non-numeric date components in "${trimmed}".`,
    };
  }

  let year: number;
  let month: number;
  let day: number;
  let detectedFormat: 'YYYY-MM-DD' | 'DD-MM-YYYY' | 'MM-DD-YYYY';
  let isAmbiguous = false;
  let ambiguityWarning: string | undefined;

  // Case 1: First part is 4 digits -> YYYY-MM-DD
  if (parts[0].length === 4 || p1 >= 1000) {
    year = p1;
    month = p2;
    day = p3;
    detectedFormat = 'YYYY-MM-DD';
  }
  // Case 2: Third part is 4 digits -> DD-MM-YYYY or MM-DD-YYYY
  else if (parts[2].length === 4 || p3 >= 1000) {
    year = p3;
    // Disambiguate p1 vs p2
    if (p1 > 12 && p2 <= 12) {
      // p1 must be day (e.g. 25-04-2024)
      day = p1;
      month = p2;
      detectedFormat = 'DD-MM-YYYY';
    } else if (p2 > 12 && p1 <= 12) {
      // p2 must be day (e.g. 04-25-2024)
      month = p1;
      day = p2;
      detectedFormat = 'MM-DD-YYYY';
    } else if (p1 <= 12 && p2 <= 12) {
      // Both are <= 12 -> Ambiguous! (e.g. 04-05-2024 could be 4 May or 5 April)
      isAmbiguous = true;
      if (preferredFormat === 'MM-DD-YYYY') {
        month = p1;
        day = p2;
        detectedFormat = 'MM-DD-YYYY';
        ambiguityWarning = `Date "${trimmed}" is ambiguous (interpreted as MM-DD-YYYY: ${month}/${day}/${year}).`;
      } else {
        // Default Indian financial convention: DD-MM-YYYY
        day = p1;
        month = p2;
        detectedFormat = 'DD-MM-YYYY';
        ambiguityWarning = `Date "${trimmed}" is ambiguous (interpreted as DD-MM-YYYY: ${day}/${month}/${year}).`;
      }
    } else {
      return {
        isValid: false,
        normalizedDate: '',
        error: `Both day and month cannot be greater than 12 in "${trimmed}".`,
      };
    }
  } else {
    return {
      isValid: false,
      normalizedDate: '',
      error: `Could not identify 4-digit calendar year in "${trimmed}".`,
    };
  }

  // Strict Gregorian year boundaries (reasonable range for investment records: 1970 to 2099)
  if (year < 1970 || year > 2099) {
    return {
      isValid: false,
      normalizedDate: '',
      error: `Year ${year} is outside valid trading record range (1970-2099).`,
    };
  }

  // Month boundary check (1 to 12)
  if (month < 1 || month > 12) {
    return {
      isValid: false,
      normalizedDate: '',
      error: `Invalid month ${month} in date "${trimmed}". Expected month between 01 and 12.`,
    };
  }

  // Strict Calendar Day check against exact days in this specific month/year
  const maxDays = getDaysInMonth(year, month);
  if (day < 1 || day > maxDays) {
    if (month === 2 && day === 29 && !isLeapYear(year)) {
      return {
        isValid: false,
        normalizedDate: '',
        error: `Invalid leap day: February 29th does not exist in non-leap year ${year}.`,
      };
    }
    return {
      isValid: false,
      normalizedDate: '',
      error: `Invalid day ${day} for month ${month} in year ${year} (max days: ${maxDays}).`,
    };
  }

  // Format zero-padded YYYY-MM-DD
  const mmStr = month.toString().padStart(2, '0');
  const ddStr = day.toString().padStart(2, '0');
  const normalizedDate = `${year}-${mmStr}-${ddStr}`;

  // Time validation if present
  let normalizedIso = `${normalizedDate}T00:00:00.000Z`;
  if (hasExplicitTime) {
    const timeParts = timePart.split(':');
    const hh = parseInt(timeParts[0] || '0', 10);
    const min = parseInt(timeParts[1] || '0', 10);
    const ss = parseInt(timeParts[2]?.split('.')[0] || '0', 10);

    if (hh >= 0 && hh <= 23 && min >= 0 && min <= 59 && ss >= 0 && ss <= 59) {
      const hhStr = hh.toString().padStart(2, '0');
      const minStr = min.toString().padStart(2, '0');
      const ssStr = ss.toString().padStart(2, '0');
      normalizedIso = `${normalizedDate}T${hhStr}:${minStr}:${ssStr}.000Z`;
    }
  }

  return {
    isValid: true,
    normalizedDate,
    normalizedIso,
    detectedFormat,
    isAmbiguous,
    ambiguityWarning,
  };
}
