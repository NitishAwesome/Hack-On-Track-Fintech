'use client';

import React from 'react';
import Link from 'next/link';
import { HoldingItem } from '@/types/dashboard';
import { HoldingRow } from './HoldingRow';
import { SectionHeader } from '@/components/shared/SectionHeader';
import { ResponsiveTable } from '@/components/shared/ResponsiveTable';
import { cn } from '@/lib/utils';

interface HoldingsCardProps {
  holdings: HoldingItem[];
  totalCount?: number;
  className?: string;
  limit?: number;
}

export function HoldingsCard({
  holdings,
  totalCount = 32,
  className,
  limit = 5,
}: HoldingsCardProps) {
  const displayedHoldings = limit ? holdings.slice(0, limit) : holdings;

  return (
    <div
      className={cn(
        'relative flex flex-col justify-between p-6 sm:p-7 rounded-2xl border transition-all duration-200',
        className
      )}
      style={{
        backgroundColor: 'rgb(var(--surface))',
        borderColor: 'rgb(var(--border))',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      {/* Header */}
      <SectionHeader
        title="Holdings"
        subtitle={`Top assets by portfolio weight`}
        actionText={`View all ${totalCount}`}
        actionHref="/investments"
      />

      {/* Table */}
      <div className="mt-3 -mx-3">
        <ResponsiveTable>
          <thead>
            <tr
              className="border-b text-[10px] uppercase font-bold tracking-wider"
              style={{
                borderColor: 'rgb(var(--border))',
                color: 'rgb(var(--muted))',
              }}
            >
              <th className="py-2.5 pl-3 pr-4 font-semibold text-left">Asset</th>
              <th className="py-2.5 px-4 font-semibold text-right">Value</th>
              <th className="py-2.5 px-4 font-semibold text-right">24H</th>
              <th className="py-2.5 pl-4 pr-3 font-semibold text-right">Weight</th>
            </tr>
          </thead>
          <tbody>
            {displayedHoldings.map((holding) => (
              <HoldingRow key={holding.id} holding={holding} />
            ))}
          </tbody>
        </ResponsiveTable>
      </div>

      {/* Footer link for mobile or quick navigation */}
      <div
        className="pt-3 border-t flex items-center justify-between text-xs mt-2"
        style={{ borderColor: 'rgb(var(--border) / 0.5)' }}
      >
        <span style={{ color: 'rgb(var(--muted))' }}>
          Showing {displayedHoldings.length} of {totalCount} holdings
        </span>
        <Link
          href="/investments"
          className="font-medium hover:underline"
          style={{ color: 'rgb(var(--brand-500))' }}
        >
          Manage Holdings →
        </Link>
      </div>
    </div>
  );
}
