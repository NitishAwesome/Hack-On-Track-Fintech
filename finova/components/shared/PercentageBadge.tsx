'use client';

import { cn, formatPercent, gainLoss } from '@/lib/utils';

interface PercentageBadgeProps {
  value: number;
  size?: 'sm' | 'md';
  showSign?: boolean;
}

export function PercentageBadge({
  value,
  size = 'md',
  showSign = true,
}: PercentageBadgeProps) {
  const gl = gainLoss(value);

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md font-medium',
        size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-sm',
        {
          'badge-gain': gl === 'gain',
          'badge-loss': gl === 'loss',
          'badge-neutral': gl === 'neutral',
        }
      )}
    >
      {showSign && value > 0 ? '+' : ''}
      {value.toFixed(2)}%
    </span>
  );
}
