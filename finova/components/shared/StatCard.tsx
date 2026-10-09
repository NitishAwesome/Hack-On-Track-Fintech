'use client';

import { motion } from 'framer-motion';
import { cn, formatCurrency, formatPercent, gainLoss } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: number | string;
  type?: 'currency' | 'percent' | 'number' | 'raw';
  change?: number | null;
  changePct?: number | null;
  compact?: boolean;
  subtitle?: string;
  icon?: React.ReactNode;
  delay?: number;
}

export function StatCard({
  label,
  value,
  type = 'currency',
  change,
  changePct,
  compact = false,
  subtitle,
  icon,
  delay = 0,
}: StatCardProps) {
  const gl = changePct != null ? gainLoss(changePct) : 'neutral';

  function formatValue(v: number | string): string {
    if (typeof v === 'string') return v;
    if (type === 'currency') return formatCurrency(v, compact);
    if (type === 'percent') return formatPercent(v);
    if (type === 'number') return v.toLocaleString('en-IN');
    return String(v);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className="card p-5 space-y-2"
    >
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium" style={{ color: 'rgb(var(--muted))' }}>
          {label}
        </p>
        {icon && (
          <div className="p-1.5 rounded-lg" style={{ backgroundColor: 'rgb(var(--surface-raised))' }}>
            {icon}
          </div>
        )}
      </div>

      <p className="text-2xl font-semibold tracking-tight" style={{ color: 'rgb(var(--foreground))' }}>
        {formatValue(value)}
      </p>

      {(changePct != null || change != null) && (
        <div className="flex items-center gap-1.5">
          {gl === 'gain' && <TrendingUp className="w-3.5 h-3.5 text-gain" />}
          {gl === 'loss' && <TrendingDown className="w-3.5 h-3.5 text-loss" />}
          {gl === 'neutral' && <Minus className="w-3.5 h-3.5 text-muted" />}

          {changePct != null && (
            <span
              className={cn('text-xs font-medium', {
                'text-gain': gl === 'gain',
                'text-loss': gl === 'loss',
                'text-muted': gl === 'neutral',
              })}
            >
              {formatPercent(changePct)}
            </span>
          )}

          {change != null && type === 'currency' && (
            <span className="text-xs" style={{ color: 'rgb(var(--muted))' }}>
              ({formatCurrency(change, compact)})
            </span>
          )}
        </div>
      )}

      {subtitle && (
        <p className="text-xs" style={{ color: 'rgb(var(--muted))' }}>
          {subtitle}
        </p>
      )}
    </motion.div>
  );
}
