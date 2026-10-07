'use client';

import React from 'react';
import { HoldingItem } from '@/types/dashboard';
import { formatCurrency, formatPercent } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface HoldingRowProps {
  holding: HoldingItem;
  className?: string;
}

export function HoldingRow({ holding, className }: HoldingRowProps) {
  const isPositive = holding.change24hPercentage >= 0;

  return (
    <tr
      className={cn(
        'group transition-colors duration-150 border-b last:border-b-0 cursor-pointer',
        className
      )}
      style={{
        borderColor: 'rgb(var(--border) / 0.6)',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.backgroundColor = 'rgb(var(--surface-raised) / 0.7)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
      }}
    >
      {/* Asset: Icon + Name + Symbol */}
      <td className="py-3 pl-3 pr-4">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-sm text-white"
            style={{
              backgroundColor: holding.avatarColor,
            }}
          >
            {holding.avatarInitial}
          </div>

          <div className="min-w-0">
            <p
              className="text-sm font-semibold truncate leading-tight group-hover:text-brand transition-colors"
              style={{ color: 'rgb(var(--foreground))' }}
            >
              {holding.name}
            </p>
            <p
              className="text-[11px] font-mono mt-0.5 tracking-tight"
              style={{ color: 'rgb(var(--muted))' }}
            >
              {holding.symbol}
            </p>
          </div>
        </div>
      </td>

      {/* Value */}
      <td className="py-3 px-4 text-right">
        <span
          className="text-sm font-bold tabular-nums"
          style={{ color: 'rgb(var(--foreground))' }}
        >
          {formatCurrency(holding.currentValue)}
        </span>
      </td>

      {/* 24H Change */}
      <td className="py-3 px-4 text-right">
        <span
          className="text-xs font-semibold tabular-nums px-2 py-0.5 rounded"
          style={{
            color: isPositive ? 'rgb(var(--gain))' : 'rgb(var(--loss))',
            backgroundColor: isPositive
              ? 'rgb(var(--gain) / 0.1)'
              : 'rgb(var(--loss) / 0.1)',
          }}
        >
          {isPositive ? '+' : ''}
          {formatPercent(holding.change24hPercentage)}
        </span>
      </td>

      {/* Portfolio Weight */}
      <td className="py-3 pl-4 pr-3 text-right">
        <span
          className="text-xs font-medium tabular-nums"
          style={{ color: 'rgb(var(--muted))' }}
        >
          {holding.portfolioWeightPercentage}%
        </span>
      </td>
    </tr>
  );
}
