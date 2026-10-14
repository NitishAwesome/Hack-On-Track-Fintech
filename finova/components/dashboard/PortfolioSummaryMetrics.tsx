'use client';
import Link from 'next/link';
import { Wallet, Landmark, TrendingUp, Percent, Layers, Building2 } from 'lucide-react';
import type { PortfolioSummary } from '@/types/portfolio';
import { formatCurrency, formatPercent } from '@/lib/utils';
import { finiteValue } from '@/lib/dashboard/presentation';

export function PortfolioSummaryMetrics({
  summary,
  isLoading,
}: {
  summary: PortfolioSummary | null;
  isLoading?: boolean;
}) {
  if (isLoading)
    return (
      <div className="finova-metrics" role="status" aria-label="Loading portfolio metrics">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="finova-tile finova-metric">
            <div className="skeleton h-4 w-24 mb-5" />
            <div className="skeleton h-7 w-full mb-3" />
            <div className="skeleton h-3 w-24" />
          </div>
        ))}
      </div>
    );
  const complete = summary?.is_valuation_complete;
  const current = complete ? summary?.total_current_value : summary?.priced_current_value;
  const pnl = summary?.total_absolute_return;
  const returnPct = summary?.total_absolute_return_pct;
  const cards = [
    {
      label: complete
        ? 'Current Value'
        : summary?.holding_count
          ? 'Valued Subtotal'
          : 'Current Value',
      value: finiteValue(current) ? formatCurrency(current) : 'Unavailable',
      note: complete ? 'Latest available quotes' : 'Priced positions only',
      icon: Wallet,
      tone: 'cyan',
      href: '/investments',
      movement: null,
    },
    {
      label: 'Total Invested',
      value: finiteValue(summary?.total_invested_value)
        ? formatCurrency(summary!.total_invested_value)
        : 'Unavailable',
      note: 'Cost across recorded positions',
      icon: Landmark,
      tone: 'blue',
      href: '/investments',
      movement: null,
    },
    {
      label: 'Unrealized P&L',
      value: finiteValue(pnl) ? `${pnl > 0 ? '+' : ''}${formatCurrency(pnl)}` : 'Unavailable',
      note: complete ? 'On your current holdings' : 'Priced positions only',
      icon: TrendingUp,
      tone: 'teal',
      href: '/performance',
      movement: pnl,
    },
    {
      label: 'Unrealized Return',
      value: finiteValue(returnPct) ? formatPercent(returnPct) : 'Unavailable',
      note: 'Gain or loss on priced cost',
      icon: Percent,
      tone: 'teal',
      href: '/performance',
      movement: returnPct,
    },
    {
      label: 'Holdings',
      value: summary ? String(summary.holding_count) : '—',
      note: 'Recorded investment positions',
      icon: Layers,
      tone: 'violet',
      href: '/investments',
      movement: null,
    },
    {
      label: 'Broker Accounts',
      value: summary ? String(summary.broker_count) : '—',
      note: 'Manual or imported accounts',
      icon: Building2,
      tone: 'blue',
      href: '/brokers',
      movement: null,
    },
  ];
  return (
    <section aria-label="Portfolio summary" className="finova-metrics">
      {cards.map(({ label, value, note, icon: Icon, tone, href, movement }) => (
        <Link
          key={label}
          href={href}
          data-tone={tone}
          className="finova-tile finova-metric flex flex-col justify-between"
        >
          <div className="flex items-start justify-between gap-2">
            <span className="finova-accent-icon !w-9 !h-9">
              <Icon size={18} aria-hidden="true" />
            </span>
            <span className="text-[11px] font-medium text-muted text-right pt-1">{label}</span>
          </div>
          <p
            className={`mt-4 text-lg sm:text-xl font-extrabold tracking-tight tabular-nums break-words ${finiteValue(movement) && movement !== 0 ? (movement > 0 ? 'text-gain' : 'text-loss') : 'text-foreground'}`}
          >
            {value}
          </p>
          <p className="mt-2 text-[11px] text-muted leading-relaxed">{note}</p>
        </Link>
      ))}
    </section>
  );
}
