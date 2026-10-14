'use client';
import { useId, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ChartNoAxesCombined, ArrowUpRight, Clock } from 'lucide-react';
import { PageSection, SectionFeedback } from '@/components/shared/PageSection';
import { dashboardSnapshots } from '@/lib/dashboard/presentation';
import { formatCurrency } from '@/lib/utils';
import type { PortfolioSnapshotRow } from '@/types/database';

export function DashboardValueHistory({
  snapshots,
  loading,
  error,
  retry,
}: {
  snapshots: PortfolioSnapshotRow[];
  loading?: boolean;
  error?: string | null;
  retry?: () => void;
}) {
  const [range, setRange] = useState<'1M' | '3M' | '1Y' | 'All'>('All');
  const gradient = useId().replace(/:/g, '');
  const [observedAt] = useState(() => Date.now());
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(observedAt));
  const records = useMemo(() => dashboardSnapshots(snapshots, today), [snapshots, today]);
  const filtered = records.filter(
    (record) =>
      range === 'All' ||
      observedAt - Date.parse(record.snapshot_date) <=
        { '1M': 30, '3M': 90, '1Y': 365 }[range] * 86400000,
  );
  const data = filtered.map((record) => ({
    date: record.snapshot_date,
    value: record.portfolio_value!,
    invested: record.invested_value,
  }));
  return (
    <PageSection
      title="Recorded value history"
      description="Your recorded portfolio value over time, in INR."
      icon={ChartNoAxesCombined}
      accent="blue"
      className="h-full"
      action={
        <Link href="/performance" className="finova-link">
          Performance
          <ArrowUpRight size={14} />
        </Link>
      }
    >
      <SectionFeedback loading={loading} error={error} retry={retry}>
        {records.length >= 2 && (
          <div className="flex flex-wrap gap-1 mb-5" aria-label="Portfolio history range">
            {(['1M', '3M', '1Y', 'All'] as const).map((value) => (
              <button
                type="button"
                key={value}
                aria-pressed={range === value}
                onClick={() => setRange(value)}
                className={`px-3 min-h-10 rounded-lg text-xs font-semibold ${range === value ? 'bg-blue-600 text-white' : 'bg-surface-raised text-muted hover:text-foreground'}`}
              >
                {value}
              </button>
            ))}
          </div>
        )}
        {data.length >= 2 ? (
          <>
            <div
              className="h-[280px] w-full min-w-0"
              role="img"
              aria-label={`Portfolio value across ${data.length} recorded dates. A data table follows the chart.`}
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={data}
                  margin={{ left: 0, right: 12, top: 12, bottom: 8 }}
                  accessibilityLayer
                >
                  <defs>
                    <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="rgb(var(--border))" />
                  <XAxis
                    dataKey="date"
                    minTickGap={30}
                    tick={{ fill: 'rgb(var(--muted))', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(date) =>
                      new Date(`${date}T12:00:00`).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                      })
                    }
                  />
                  <YAxis
                    width={70}
                    tick={{ fill: 'rgb(var(--muted))', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => formatCurrency(value, true)}
                  />
                  <Tooltip
                    cursor={{ stroke: 'rgb(var(--brand-500))', strokeWidth: 1 }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const point = payload[0].payload as (typeof data)[number];
                      return (
                        <div className="rounded-xl border border-border bg-surface-overlay p-3 text-xs shadow-lg text-foreground">
                          <p className="text-muted mb-2">{point.date}</p>
                          <p className="tabular-nums font-semibold">
                            Value {formatCurrency(point.value)}
                          </p>
                          <p className="tabular-nums mt-1">
                            Invested {formatCurrency(point.invested)}
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Area
                    dataKey="value"
                    type="linear"
                    stroke="#3b82f6"
                    strokeWidth={2.5}
                    fill={`url(#${gradient})`}
                    isAnimationActive={false}
                    dot={data.length < 15}
                    connectNulls={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <details className="text-xs mt-3">
              <summary className="finova-link">View recorded values</summary>
              <div className="overflow-x-auto mt-2">
                <table className="finova-holdings-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th className="text-right">Value (INR)</th>
                      <th className="text-right">Invested (INR)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((point) => (
                      <tr key={point.date}>
                        <td>{point.date}</td>
                        <td className="text-right tabular-nums">{formatCurrency(point.value)}</td>
                        <td className="text-right tabular-nums">
                          {formatCurrency(point.invested)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </>
        ) : (
          <div className="finova-empty flex flex-col items-center py-8">
            <span className="finova-accent-icon mb-4">
              <Clock size={21} />
            </span>
            <p className="text-sm font-semibold text-foreground">
              {records.length >= 2
                ? 'Not enough records in this range'
                : 'Your history starts with recorded snapshots'}
            </p>
            <p className="text-xs text-muted mt-2 max-w-sm leading-relaxed">
              {records.length >= 2
                ? 'Choose a longer range to see your recorded values.'
                : 'At least two complete records on different dates are needed. Open Performance to review or deliberately record a snapshot.'}
            </p>
            <Link className="finova-link mt-3" href="/performance">
              Open Performance
              <ArrowUpRight size={14} />
            </Link>
          </div>
        )}
        <p className="text-[11px] text-muted leading-relaxed mt-4">
          Deposits, withdrawals and changes to recorded holdings can change portfolio value. This
          chart is not a cash-flow-adjusted investment return. Missing dates are not filled.
        </p>
      </SectionFeedback>
    </PageSection>
  );
}
