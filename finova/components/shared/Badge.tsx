'use client';

import { cn } from '@/lib/utils';

type BadgeVariant = 'gain' | 'loss' | 'neutral' | 'brand' | 'warning' | 'info' | 'outline';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  className?: string;
  dot?: boolean;
}

const variantStyles: Record<BadgeVariant, React.CSSProperties> = {
  gain: {
    color: 'rgb(var(--gain))',
    backgroundColor: 'rgb(var(--gain-bg))',
    border: '1px solid rgb(var(--gain) / 0.2)',
  },
  loss: {
    color: 'rgb(var(--loss))',
    backgroundColor: 'rgb(var(--loss-bg))',
    border: '1px solid rgb(var(--loss) / 0.2)',
  },
  neutral: {
    color: 'rgb(var(--muted))',
    backgroundColor: 'rgb(var(--surface-raised))',
    border: '1px solid rgb(var(--border))',
  },
  brand: {
    color: 'rgb(var(--brand-500))',
    backgroundColor: 'rgb(var(--brand-500) / 0.1)',
    border: '1px solid rgb(var(--brand-500) / 0.2)',
  },
  warning: {
    color: 'rgb(var(--warning))',
    backgroundColor: 'rgb(var(--warning-bg))',
    border: '1px solid rgb(var(--warning) / 0.2)',
  },
  info: {
    color: 'rgb(var(--info))',
    backgroundColor: 'rgb(var(--info-bg))',
    border: '1px solid rgb(var(--info) / 0.2)',
  },
  outline: {
    color: 'rgb(var(--foreground))',
    backgroundColor: 'transparent',
    border: '1px solid rgb(var(--border))',
  },
};

const sizeStyles = {
  sm: 'text-[10px] px-1.5 py-0.5 font-semibold',
  md: 'text-xs px-2 py-0.5 font-semibold',
};

/**
 * Badge — semantic status labels. Only use colour with meaning.
 */
export function Badge({
  children,
  variant = 'neutral',
  size = 'md',
  className,
  dot,
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full',
        sizeStyles[size],
        className
      )}
      style={variantStyles[variant]}
    >
      {dot && (
        <span
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: 'currentColor' }}
        />
      )}
      {children}
    </span>
  );
}
