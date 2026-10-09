'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { PieChart, Plus, AlertCircle, HelpCircle } from 'lucide-react';
import type { AssetAllocation } from '@/types/portfolio';
import { formatCurrency, formatPercent } from '@/lib/utils';

interface AssetAllocationSectionProps {
  allocations: AssetAllocation[];
  totalValue: number | null;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

const ASSET_CONFIG: Record<
  string,
  { label: string; color: string; description: string }
> = {
  equity: {
    label: 'Stocks & Equities',
    color: '#3B82F6', // Blue
    description: 'Direct equity shares',
  },
  mf: {
    label: 'Mutual Funds',
    color: '#10B981', // Emerald
    description: 'Active & index funds',
  },
  reit: {
    label: 'REITs',
    color: '#8B5CF6', // Purple
    description: 'Real estate investment trusts',
  },
  invit: {
    label: 'InvITs',
    color: '#EC4899', // Pink
    description: 'Infrastructure investment trusts',
  },
  bond: {
    label: 'Bonds & Fixed Income',
    color: '#F59E0B', // Amber
    description: 'Government & corporate debt',
  },
  sgb: {
    label: 'Sovereign Gold',
    color: '#EAB308', // Gold
    description: 'RBI sovereign gold bonds',
  },
  other: {
    label: 'Other Depository Assets',
    color: '#6B7280', // Gray
    description: 'Uncategorized holdings',
  },
};

export function AssetAllocationSection({
  allocations,
  totalValue,
  isLoading,
  error,
  onRetry,
}: AssetAllocationSectionProps) {
  const [hoveredClass, setHoveredClass] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div
        className="p-6 sm:p-7 rounded-2xl border flex flex-col justify-between h-[360px] animate-pulse"
        style={{
          backgroundColor: 'rgb(var(--surface))',
          borderColor: 'rgb(var(--border))',
        }}
      >
        <div className="h-4 w-32 bg-slate-700/30 rounded mb-4" />
        <div className="h-4 w-full bg-slate-700/20 rounded-full mb-6" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-6 w-full bg-slate-800/10 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="p-6 sm:p-7 rounded-2xl border flex flex-col items-center justify-center text-center h-[360px]"
        style={{
          backgroundColor: 'rgb(var(--surface))',
          borderColor: 'rgb(var(--border))',
        }}
      >
        <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3 bg-red-500/10 text-red-500">
          <AlertCircle className="w-5 h-5" />
        </div>
        <h3 className="text-sm font-semibold mb-1" style={{ color: 'rgb(var(--foreground))' }}>
          Unable to Load Allocation
        </h3>
        <p className="text-xs text-muted max-w-sm mb-4">{error}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border hover:bg-surface-raised transition-colors"
            style={{ borderColor: 'rgb(var(--border))', color: 'rgb(var(--foreground))' }}
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  const hasHoldings = allocations.length > 0 && allocations.some((a) => a.value > 0);

  return (
    <div
      className="p-6 sm:p-7 rounded-2xl border flex flex-col justify-between transition-all duration-200"
      style={{
        backgroundColor: 'rgb(var(--surface))',
        borderColor: 'rgb(var(--border))',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2
              className="text-base sm:text-lg font-bold tracking-tight"
              style={{ color: 'rgb(var(--foreground))' }}
            >
              Asset Allocation
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Portfolio distribution by asset class
            </p>
          </div>
          <Link
            href="/holdings"
            className="text-xs font-semibold hover:underline"
            style={{ color: 'rgb(var(--brand-500))' }}
          >
            View All →
          </Link>
        </div>

        {hasHoldings ? (
          <>
            {/* Segmented Bar */}
            <div
              className="w-full h-3 rounded-full overflow-hidden flex p-0.5 my-4 border"
              style={{
                backgroundColor: 'rgb(var(--surface-raised))',
                borderColor: 'rgb(var(--border))',
              }}
            >
              {allocations.map((item) => {
                const config = ASSET_CONFIG[item.asset_class] || ASSET_CONFIG.other;
                const isHovered = hoveredClass === item.asset_class;
                const isAnyHovered = hoveredClass !== null;
                const opacity = isAnyHovered ? (isHovered ? 1 : 0.4) : 1;

                return (
                  <div
                    key={item.asset_class}
                    className="h-full first:rounded-l-full last:rounded-r-full transition-all duration-200 cursor-pointer"
                    style={{
                      width: `${item.percentage}%`,
                      backgroundColor: config.color,
                      opacity,
                      transform: isHovered ? 'scaleY(1.2)' : 'scaleY(1)',
                    }}
                    title={`${config.label}: ${item.percentage}% (${formatCurrency(item.value)})`}
                    onMouseEnter={() => setHoveredClass(item.asset_class)}
                    onMouseLeave={() => setHoveredClass(null)}
                  />
                );
              })}
            </div>

            {/* Allocation breakdown list */}
            <div className="space-y-2 mt-3 max-h-[220px] overflow-y-auto pr-1">
              {allocations.map((item) => {
                const config = ASSET_CONFIG[item.asset_class] || ASSET_CONFIG.other;
                const isHovered = hoveredClass === item.asset_class;

                return (
                  <div
                    key={item.asset_class}
                    className={`flex items-center justify-between p-2 rounded-xl transition-all duration-150 ${
                      isHovered ? 'bg-surface-raised' : 'hover:bg-surface-raised/50'
                    }`}
                    onMouseEnter={() => setHoveredClass(item.asset_class)}
                    onMouseLeave={() => setHoveredClass(null)}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: config.color }}
                      />
                      <div className="truncate">
                        <div
                          className="text-xs font-semibold truncate flex items-center gap-1.5"
                          style={{ color: 'rgb(var(--foreground))' }}
                        >
                          <span>{config.label}</span>
                          {item.unquoted_count ? (
                            <span
                              className="inline-flex items-center text-[10px] text-amber-500 font-normal"
                              title={`${item.unquoted_count} unquoted asset(s) at cost price`}
                            >
                              <HelpCircle className="w-2.5 h-2.5" />
                            </span>
                          ) : null}
                        </div>
                        <div className="text-[11px] text-muted">
                          {item.holding_count} {item.holding_count === 1 ? 'asset' : 'assets'}
                        </div>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0 pl-3">
                      <div
                        className="text-xs font-bold tabular-nums"
                        style={{ color: 'rgb(var(--foreground))' }}
                      >
                        {formatCurrency(item.value)}
                      </div>
                      <div className="text-[11px] font-medium text-muted tabular-nums">
                        {item.percentage}%
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div
            className="flex flex-col items-center justify-center text-center p-8 rounded-xl border border-dashed my-2"
            style={{
              borderColor: 'rgb(var(--border))',
              backgroundColor: 'rgba(var(--surface-raised) / 0.4)',
            }}
          >
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center mb-3 shadow-sm"
              style={{
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                color: '#3B82F6',
              }}
            >
              <PieChart className="w-5 h-5" />
            </div>
            <h3
              className="text-sm font-bold mb-1"
              style={{ color: 'rgb(var(--foreground))' }}
            >
              No Asset Allocation Available
            </h3>
            <p className="text-xs text-muted max-w-xs mb-3.5 leading-relaxed">
              Add your manual investments or import your demat holdings to visualize your multi-asset
              diversification.
            </p>
            <Link
              href="/holdings"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white shadow-sm"
              style={{
                background: 'linear-gradient(135deg, rgb(var(--brand-600)), rgb(var(--brand-400)))',
              }}
            >
              <Plus className="w-3 h-3" />
              <span>Add Investment</span>
            </Link>
          </div>
        )}
      </div>

      {hasHoldings && totalValue && (
        <div
          className="pt-3 border-t flex items-center justify-between text-xs mt-3"
          style={{ borderColor: 'rgb(var(--border) / 0.6)' }}
        >
          <span className="text-muted">Total Portfolio Allocation</span>
          <span className="font-bold tabular-nums" style={{ color: 'rgb(var(--foreground))' }}>
            {formatCurrency(totalValue)}
          </span>
        </div>
      )}
    </div>
  );
}
