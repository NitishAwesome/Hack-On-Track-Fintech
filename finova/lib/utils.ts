// ============================================================
// Finova — Utility Functions
// ============================================================

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes safely
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a number as Indian Rupees (₹)
 */
export function formatCurrency(
  value: number,
  compact = false,
  decimals = 2
): string {
  if (compact) {
    if (Math.abs(value) >= 1_00_00_000) {
      return `₹${(value / 1_00_00_000).toFixed(2)}Cr`;
    }
    if (Math.abs(value) >= 1_00_000) {
      return `₹${(value / 1_00_000).toFixed(2)}L`;
    }
    if (Math.abs(value) >= 1_000) {
      return `₹${(value / 1_000).toFixed(1)}K`;
    }
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatCurrencySafe(
  value: number | null | undefined,
  fallback = 'Price unavailable',
  compact = false,
  decimals = 2
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return fallback;
  }
  return formatCurrency(value, compact, decimals);
}

/**
 * Format a percentage value with sign
 */
export function formatPercent(value: number, decimals = 2): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
}

export function formatPercentSafe(
  value: number | null | undefined,
  fallback = 'P&L unavailable',
  decimals = 2
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return fallback;
  }
  return formatPercent(value, decimals);
}

/**
 * Format a date string
 */
export function formatDate(date: string | Date, short = false): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (short) {
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  }
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Returns 'gain' | 'loss' | 'neutral' for colour coding
 */
export function gainLoss(value: number): 'gain' | 'loss' | 'neutral' {
  if (value > 0) return 'gain';
  if (value < 0) return 'loss';
  return 'neutral';
}

/**
 * Asset class display labels
 */
export const ASSET_CLASS_LABELS: Record<string, string> = {
  equity: 'Equity',
  reit: 'REIT',
  invit: 'InvIT',
  bond: 'Bond',
  sgb: 'Sovereign Gold Bond',
  etf: 'ETF',
  mf: 'Mutual Fund',
};

/**
 * Predefined broker colours for UI badges
 */
export const BROKER_COLORS = [
  '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B',
  '#10B981', '#06B6D4', '#EF4444', '#6366F1',
];

/**
 * Get a deterministic colour from the palette for a broker
 */
export function getBrokerColor(index: number): string {
  return BROKER_COLORS[index % BROKER_COLORS.length];
}

/**
 * Clamp a number between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Sleep for ms milliseconds (useful for mock delays)
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate a portfolio hash for AI insight caching
 * Based on holding IDs + current prices — changes when portfolio changes
 */
export function generatePortfolioHash(
  holdings: Array<{ id: string; current_price: number | null; quantity: number }>
): string {
  const str = holdings
    .map((h) => `${h.id}:${h.quantity}:${h.current_price ?? 0}`)
    .sort()
    .join('|');
  // Simple hash — not cryptographic
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}
