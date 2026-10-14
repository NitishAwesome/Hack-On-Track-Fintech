'use client';
import Link from 'next/link';
import { ArrowUpRight, Clock } from 'lucide-react';
import type { InvestmentTransactionRow } from '@/types/database';
import { formatCurrency, formatStockPrice } from '@/lib/utils';
import { finiteValue } from '@/lib/dashboard/presentation';
import { PageSection, SectionFeedback } from '@/components/shared/PageSection';

export function RecentActivitySection({
  transactions,
  isLoading,
  error,
  onRetry,
}: {
  transactions: InvestmentTransactionRow[];
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}) {
  const rows = [...transactions]
    .sort((a, b) => (b.transaction_date || '').localeCompare(a.transaction_date || ''))
    .slice(0, 5);
  return (
    <PageSection
      title="Recent recorded activity"
      description="Your latest transaction records, kept separate from market movements."
      icon={Clock}
      accent="blue"
      className="h-full"
      action={
        <Link href="/transactions" className="finova-link">
          View all
          <ArrowUpRight size={14} />
        </Link>
      }
    >
      <SectionFeedback loading={isLoading} error={error} retry={onRetry}>
        {!rows.length ? (
          <div className="finova-empty">
            <p className="text-sm font-semibold">No transaction records yet</p>
            <p className="text-xs text-muted mt-2">
              Recorded purchases, sales and income will appear here.
            </p>
            <Link className="finova-link mt-2" href="/transactions?action=add">
              Record a transaction
              <ArrowUpRight size={14} />
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="finova-holdings-table">
              <thead>
                <tr>
                  <th>Date / Asset</th>
                  <th>Type</th>
                  <th className="text-right">Quantity</th>
                  <th className="text-right">Price</th>
                  <th className="text-right">Recorded amount</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((transaction) => {
                  const extended = transaction as InvestmentTransactionRow & {
                    symbol?: string;
                    instrument?: { symbol?: string; instrument_name?: string };
                  };
                  const symbol =
                    extended.symbol || extended.instrument?.symbol || 'Recorded instrument';
                  const date =
                    transaction.transaction_date &&
                    Number.isFinite(Date.parse(transaction.transaction_date))
                      ? new Date(
                          `${transaction.transaction_date.slice(0, 10)}T12:00:00`,
                        ).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : 'Date unavailable';
                  const amount = finiteValue(transaction.net_amount)
                    ? transaction.net_amount
                    : finiteValue(transaction.gross_amount)
                      ? transaction.gross_amount
                      : null;
                  return (
                    <tr key={transaction.id}>
                      <td>
                        <p className="text-xs font-semibold text-foreground">{symbol}</p>
                        <p className="text-[10px] text-muted mt-1 whitespace-nowrap">{date}</p>
                      </td>
                      <td>
                        <span className="px-2 py-1 rounded-md text-[10px] font-semibold text-foreground bg-surface-raised">
                          {transaction.transaction_type || 'Unspecified'}
                        </span>
                      </td>
                      <td className="text-right tabular-nums">
                        {finiteValue(transaction.quantity)
                          ? transaction.quantity.toLocaleString('en-IN')
                          : '—'}
                      </td>
                      <td className="text-right tabular-nums whitespace-nowrap">
                        {finiteValue(transaction.unit_price)
                          ? formatStockPrice(transaction.unit_price)
                          : '—'}
                      </td>
                      <td className="text-right font-semibold tabular-nums whitespace-nowrap">
                        {amount === null ? 'Unavailable' : formatCurrency(amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionFeedback>
    </PageSection>
  );
}
