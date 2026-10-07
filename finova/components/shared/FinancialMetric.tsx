'use client';

import { cn } from '@/lib/utils';
import { formatCurrency, formatPercent } from '@/lib/utils';

interface FinancialMetricProps {
  label: string;
  value: number | string;
  type?: 'currency' | 'percent' | 'number' | 'raw';
  /** Positive = green, negative = red */
  sentiment?: 'positive' | 'negative' | 'neutral' | 'auto';
  /** Shows +/- indicator before value */
  showSign?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  compact?: boolean;
}

const sizeMap = {
  sm: { value: 'text-lg font-bold', label: 'text-xs' },
  md: { value: 'text-2xl font-bold', label: 'text-xs' },
  lg: { value: 'text-3xl font-bold', label: 'text-sm' },
};

/**
 * FinancialMetric — displays a labelled financial value with proper colour coding.
 * Green for positive, red for negative. Never use colour just for decoration.
 */
export function FinancialMetric({
  label,
  value,
  type = 'currency',
  sentiment = 'neutral',
  showSign = false,
  size = 'md',
  className,
  compact = false,
}: FinancialMetricProps) {
  const numericValue = typeof value === 'number' ? value : parseFloat(String(value)) || 0;

  const derivedSentiment =
    sentiment === 'auto'
      ? numericValue > 0 ? 'positive' : numericValue < 0 ? 'negative' : 'neutral'
      : sentiment;

  const color =
    derivedSentiment === 'positive' ? 'rgb(var(--gain))' :
    derivedSentiment === 'negative' ? 'rgb(var(--loss))' :
    'rgb(var(--foreground))';

  function formatValue(): string {
    if (type === 'raw') return String(value);
    if (type === 'currency') {
      const formatted = formatCurrency(numericValue, compact);
      return showSign && numericValue > 0 ? `+${formatted}` : formatted;
    }
    if (type === 'percent') return formatPercent(numericValue);
    if (type === 'number') {
      const formatted = numericValue.toLocaleString('en-IN');
      return showSign && numericValue > 0 ? `+${formatted}` : formatted;
    }
    return String(value);
  }

  const { value: valueCls, label: labelCls } = sizeMap[size];

  return (
    <div className={cn('flex flex-col gap-0.5', className)}>
      <p className={labelCls} style={{ color: 'rgb(var(--muted))' }}>
        {label}
      </p>
      <p className={valueCls} style={{ color }}>
        {formatValue()}
      </p>
    </div>
  );
}
