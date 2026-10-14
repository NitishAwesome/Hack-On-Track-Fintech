'use client';
import { useMemo } from 'react';
import Link from 'next/link';
import { Briefcase, ArrowUpRight } from 'lucide-react';
import { CompanyLogo } from '@/components/shared/CompanyLogo';
import { MarketSparkline } from '@/components/shared/MarketSparkline';
import { PageSection, SectionFeedback } from '@/components/shared/PageSection';
import { DailyChange } from '@/components/shared/InstrumentMarketData';
import { dashboardHoldings } from '@/lib/dashboard/presentation';
import { valuationBasis } from '@/lib/calculations/valuationBasis';
import { findEquity } from '@/lib/research/catalog';
import { formatCurrency, formatPercent, formatStockPrice } from '@/lib/utils';
import type { HoldingWithMetrics } from '@/types/portfolio';

type Preview = ReturnType<typeof dashboardHoldings>[number];
function holdingDestination(row: Preview) {
  return findEquity(row.identity.symbol)
    ? `/explore/stocks/${encodeURIComponent(row.identity.symbol)}?from=${encodeURIComponent('/dashboard')}`
    : '/investments';
}
function Identity({ row }: { row: Preview }) {
  return (
    <Link href={holdingDestination(row)} className="flex items-center gap-3 min-h-11 group min-w-0">
      <CompanyLogo symbol={row.identity.symbol} name={row.identity.name} size="sm" />
      <div className="min-w-0">
        <span className="block text-sm font-bold text-foreground group-hover:text-brand">
          {row.identity.symbol}
        </span>
        <span className="block text-[11px] text-muted max-w-48 truncate">{row.identity.name}</span>
        <span className="block text-[10px] text-muted mt-1">
          Qty {row.quantity.toLocaleString('en-IN')} · {row.accounts}{' '}
          {row.accounts === 1 ? 'account' : 'accounts'}
        </span>
      </div>
      <ArrowUpRight size={13} className="shrink-0 text-muted group-hover:text-brand" />
    </Link>
  );
}
function Valuation({ row }: { row: Preview }) {
  return (
    <>
      <p className="font-bold text-foreground tabular-nums">
        {row.currentValue === null ? 'Unavailable' : formatCurrency(row.currentValue)}
      </p>
      <p className="text-[10px] text-muted mt-1">
        {row.partial
          ? 'Valued subtotal'
          : row.currentPrice !== null
            ? `Quote ${formatStockPrice(row.currentPrice)}`
            : 'Latest price unavailable'}
        {row.stale ? ' · cached/stale' : ''}
      </p>
    </>
  );
}
function Profit({ row }: { row: Preview }) {
  return (
    <>
      <p
        className={`font-semibold tabular-nums ${row.pnl === null || row.pnl === 0 ? 'text-muted' : row.pnl > 0 ? 'text-gain' : 'text-loss'}`}
      >
        {row.pnl === null ? 'Unavailable' : `${row.pnl > 0 ? '+' : ''}${formatCurrency(row.pnl)}`}
      </p>
      <p className="text-[10px] text-muted mt-1 tabular-nums">
        {row.pnlPct === null
          ? 'Return unavailable'
          : `${formatPercent(row.pnlPct)}${row.partial ? ' · priced cost' : ''}`}
      </p>
    </>
  );
}
function Trend({ row }: { row: Preview }) {
  return findEquity(row.identity.symbol) &&
    (!row.identity.exchange || row.identity.exchange === 'NSE') ? (
    <MarketSparkline symbol={row.identity.symbol} exchange="NSE" />
  ) : (
    <span className="text-[11px] text-muted">History unavailable</span>
  );
}
export function MyHoldingsSection({
  holdings,
  isLoading,
  error,
  onRetry,
}: {
  holdings: HoldingWithMetrics[];
  totalValue?: number | null;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}) {
  const rows = useMemo(() => dashboardHoldings(holdings).slice(0, 6), [holdings]);
  const basis = valuationBasis(holdings);
  return (
    <PageSection
      title="Your largest holdings"
      eyebrow="KNOW WHAT YOU OWN"
      description={`Up to six instruments consolidated across accounts · weights use ${basis.label.toLowerCase()}.`}
      icon={Briefcase}
      accent="cyan"
      action={
        <Link href="/investments" className="finova-link">
          View all investments
          <ArrowUpRight size={14} />
        </Link>
      }
    >
      <SectionFeedback loading={isLoading} error={error} retry={onRetry}>
        {!rows.length ? (
          <div className="finova-empty">
            <p className="font-semibold">Bring your investments together</p>
            <p className="text-xs text-muted mt-2">
              Add a recorded position or import a portfolio to see holdings and quote coverage here.
            </p>
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              <Link href="/holdings?action=add" className="finova-button finova-button-primary">
                Add investment
              </Link>
              <Link href="/holdings?action=import" className="finova-button">
                Import CSV
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="finova-holdings-table">
                <thead>
                  <tr>
                    <th>Instrument & position</th>
                    <th className="text-right">Market value</th>
                    <th className="text-right">Weight</th>
                    <th className="text-right">Unrealized P&L</th>
                    <th className="text-right">Daily change</th>
                    <th>Price trend</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.key}>
                      <td>
                        <Identity row={row} />
                      </td>
                      <td className="text-right whitespace-nowrap">
                        <Valuation row={row} />
                      </td>
                      <td className="text-right tabular-nums">
                        {row.weight === null ? '—' : `${row.weight.toFixed(1)}%`}
                      </td>
                      <td className="text-right whitespace-nowrap">
                        <Profit row={row} />
                      </td>
                      <td className="text-right">
                        <DailyChange value={row.identity.day_change_pct} />
                      </td>
                      <td>
                        <Trend row={row} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="grid grid-cols-1 gap-3 md:hidden">
              {rows.map((row) => (
                <article key={row.key} className="min-w-0 rounded-xl border border-border p-4 bg-surface">
                  <div className="flex items-start justify-between gap-3">
                    <Identity row={row} />
                    <span className="text-[11px] font-semibold tabular-nums shrink-0">
                      {row.weight !== null ? `${row.weight.toFixed(1)}%` : '—'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
                    <div>
                      <p className="text-[10px] text-muted mb-1">Market value</p>
                      <Valuation row={row} />
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-muted mb-1">Unrealized P&L</p>
                      <Profit row={row} />
                    </div>
                  </div>
                  <div className="flex flex-wrap justify-between items-center gap-3 pt-3 mt-3 border-t border-border">
                    <Trend row={row} />
                    <div className="text-right">
                      <p className="text-[10px] text-muted mb-1">Daily change</p>
                      <DailyChange value={row.identity.day_change_pct} />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </SectionFeedback>
    </PageSection>
  );
}
