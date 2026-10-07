'use client';

import { cn } from '@/lib/utils';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  onClick?: () => void;
}

const paddingMap = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

/**
 * GlassCard — selective glass-morphism for featured content.
 * Use sparingly: AI insight cards, premium overlays, highlighted stats.
 * Do NOT apply to every card.
 */
export function GlassCard({
  children,
  className,
  style,
  padding = 'md',
  hover = false,
  onClick,
}: GlassCardProps) {
  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter') onClick(); } : undefined}
      className={cn(
        'rounded-xl border overflow-hidden',
        hover && 'transition-all duration-200 cursor-pointer',
        paddingMap[padding],
        className
      )}
      style={{
        backgroundColor: 'rgb(var(--surface) / 0.6)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderColor: 'rgb(var(--border) / 0.7)',
        boxShadow: '0 4px 24px rgb(0 0 0 / 0.08)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
