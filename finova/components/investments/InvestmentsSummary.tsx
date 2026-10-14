'use client';

import Link from 'next/link';
import { Wallet, Layers, TrendingUp, Building2, ArrowUpRight } from 'lucide-react';
import { PercentageBadge } from '@/components/shared/PercentageBadge';
import { formatCurrency } from '@/lib/utils';
import type { PortfolioSummary } from '@/types/portfolio';

export function InvestmentsSummary({
  summary,
  loading,
  unavailable,
  brokerCount,
}: {
  summary: PortfolioSummary;
  loading: boolean;
  unavailable: boolean;
  brokerCount: number | null;
}) {
  const missing = loading || unavailable;
  const metrics = [
    {
      title: 'Total Invested',
      icon: Layers,
      tone: 'blue',
      value: formatCurrency(summary.total_invested_value),
      detail: `Across ${summary.holding_count} recorded positions`,
    },
    {
      title: summary.is_valuation_complete ? 'Current Valuation' : 'Valued Subtotal',
      icon: Wallet,
      tone: 'cyan',
      value:
        summary.priced_current_value === null || summary.priced_current_value === undefined
          ? 'Valuation unavailable'
          : formatCurrency(summary.priced_current_value),
      detail: `${summary.priced_count ?? 0} of ${summary.holding_count} positions quoted${summary.is_valuation_complete ? '' : ' · partial valuation'}`,
    },
    {
      title: 'Unrealized P&L',
      icon: TrendingUp,
      tone: 'teal',
      value:
        summary.total_absolute_return === null
          ? 'P&L unavailable'
          : `${summary.total_absolute_return > 0 ? '+' : ''}${formatCurrency(summary.total_absolute_return)}`,
      detail: 'Based on priced positions · excludes realized returns',
    },
    {
      title: 'Accounts & Coverage',
      icon: Building2,
      tone: 'violet',
      value:
        brokerCount === null
          ? 'Accounts unavailable'
          : `${brokerCount} ${brokerCount === 1 ? 'Broker' : 'Brokers'}`,
      detail: 'Manual / imported broker and depository accounts',
    },
  ];
  return (
    <section
      aria-label="Investment summary"
      className="grid grid-cols-1 min-[360px]:grid-cols-2 xl:grid-cols-4 gap-4"
    >
      {metrics.map(({ title, icon: Icon, tone, value, detail }, index) => (
        <div key={title} data-tone={tone} className="finova-tile investment-summary p-4 sm:p-5">
          <div className="flex items-start gap-3 mb-5">
            <span className="finova-accent-icon shrink-0">
              <Icon size={20} aria-hidden="true" />
            </span>
            <h2 className="text-[11px] sm:text-xs font-semibold text-muted pt-2">{title}</h2>
          </div>
          {loading ? (
            <div className="skeleton h-7 w-3/4" />
          ) : (
            <p
              className={`text-lg sm:text-2xl font-extrabold tabular-nums tracking-tight break-words ${index === 2 && !missing && summary.total_absolute_return !== null ? (summary.total_absolute_return > 0 ? 'text-gain' : summary.total_absolute_return < 0 ? 'text-loss' : 'text-foreground') : 'text-foreground'}`}
            >
              {unavailable ? 'Unavailable' : value}
            </p>
          )}
          {index === 2 && !missing && summary.total_absolute_return_pct !== null && (
            <div className="mt-2">
              <PercentageBadge value={summary.total_absolute_return_pct} size="sm" />
            </div>
          )}
          <p className="text-[11px] text-muted leading-relaxed mt-3">
            {missing
              ? loading
                ? 'Loading recorded data…'
                : 'Retry to load recorded data'
              : detail}
          </p>
          {index === 3 && (
            <Link href="/brokers" className="finova-link mt-1">
              Manage accounts <ArrowUpRight size={13} />
            </Link>
          )}
        </div>
      ))}
    </section>
  );
}
