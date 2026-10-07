'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid
} from 'recharts';
import { PercentageBadge } from '@/components/shared/PercentageBadge';
import { SkeletonCard, SkeletonChart } from '@/components/shared/Skeletons';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatCurrency, ASSET_CLASS_LABELS } from '@/lib/utils';
import { BarChart3 } from 'lucide-react';
import type { HoldingWithMetrics } from '@/types/portfolio';

async function fetchHoldings() {
  const res = await fetch('/api/portfolio/holdings');
  if (!res.ok) throw new Error('Failed to load holdings');
  return res.json();
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="card px-3 py-2 text-xs">
      <p className="font-medium mb-1" style={{ color: 'rgb(var(--foreground))' }}>{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: 'rgb(var(--muted))' }}>
          {p.name}: {formatCurrency(p.value, true)}
        </p>
      ))}
    </div>
  );
}

export default function PerformancePage() {
  const { data, isLoading } = useQuery({ queryKey: ['holdings'], queryFn: fetchHoldings });
  const holdings: HoldingWithMetrics[] = data?.holdings ?? [];

  // Sort by absolute return % for gainers/losers
  const gainers = [...holdings].sort((a, b) => b.absolute_return_pct - a.absolute_return_pct).slice(0, 5);
  const losers = [...holdings].sort((a, b) => a.absolute_return_pct - b.absolute_return_pct).slice(0, 5);

  // Simulated performance chart data (cumulative invested vs value over time)
  // In Phase 2 this will use real transaction history
  const chartData = holdings.length > 0
    ? Array.from({ length: 12 }, (_, i) => {
        const month = new Date();
        month.setMonth(month.getMonth() - (11 - i));
        const factor = 0.85 + (i / 11) * 0.25;
        return {
          month: month.toLocaleDateString('en-IN', { month: 'short' }),
          Invested: holdings.reduce((s, h) => s + h.invested_value, 0) * (0.7 + i * 0.025),
          Value: holdings.reduce((s, h) => s + h.current_value, 0) * factor,
        };
      })
    : [];

  if (isLoading) {
    return (
      <div className="page-container space-y-5">
        <SkeletonChart height={300} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SkeletonCard lines={5} />
          <SkeletonCard lines={5} />
        </div>
      </div>
    );
  }

  return (
    <div className="page-container space-y-6">
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: 'rgb(var(--foreground))' }}>
          Performance
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'rgb(var(--muted))' }}>
          Investment vs portfolio value over time
        </p>
      </div>

      {holdings.length === 0 ? (
        <EmptyState
          icon={<BarChart3 className="w-8 h-8" style={{ color: 'rgb(var(--brand-500))' }} />}
          title="No data yet"
          description="Add holdings to see your performance charts."
        />
      ) : (
        <>
          {/* Performance Chart */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="card p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold" style={{ color: 'rgb(var(--foreground))' }}>
                Portfolio Growth (Indicative)
              </h2>
              <span className="text-xs px-2 py-1 rounded-md" style={{ backgroundColor: 'rgb(var(--warning-bg))', color: 'rgb(var(--warning))' }}>
                Historical data requires transaction log
              </span>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="rgb(var(--brand-500))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="rgb(var(--brand-500))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorInvested" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="rgb(var(--muted))" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="rgb(var(--muted))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'rgb(var(--muted))' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => formatCurrency(v, true)} tick={{ fontSize: 11, fill: 'rgb(var(--muted))' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="Invested" stroke="rgb(var(--muted))" strokeWidth={1.5} fill="url(#colorInvested)" />
                <Area type="monotone" dataKey="Value" stroke="rgb(var(--brand-500))" strokeWidth={2} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Gainers & Losers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Top Gainers */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card p-5">
              <h2 className="text-sm font-semibold mb-4" style={{ color: 'rgb(var(--foreground))' }}>
                Top Gainers
              </h2>
              <div className="space-y-3">
                {gainers.filter((h) => h.absolute_return_pct >= 0).slice(0, 5).map((h) => (
                  <div key={h.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'rgb(var(--foreground))' }}>{h.name}</p>
                      <p className="text-xs" style={{ color: 'rgb(var(--muted))' }}>{h.symbol} · {ASSET_CLASS_LABELS[h.asset_class]}</p>
                    </div>
                    <div className="text-right">
                      <PercentageBadge value={h.absolute_return_pct} size="sm" />
                      <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--gain))' }}>
                        +{formatCurrency(h.absolute_return, true)}
                      </p>
                    </div>
                  </div>
                ))}
                {gainers.filter((h) => h.absolute_return_pct >= 0).length === 0 && (
                  <p className="text-sm" style={{ color: 'rgb(var(--muted))' }}>No gainers yet</p>
                )}
              </div>
            </motion.div>

            {/* Top Losers */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="card p-5">
              <h2 className="text-sm font-semibold mb-4" style={{ color: 'rgb(var(--foreground))' }}>
                Underperformers
              </h2>
              <div className="space-y-3">
                {losers.filter((h) => h.absolute_return_pct < 0).slice(0, 5).map((h) => (
                  <div key={h.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'rgb(var(--foreground))' }}>{h.name}</p>
                      <p className="text-xs" style={{ color: 'rgb(var(--muted))' }}>{h.symbol} · {ASSET_CLASS_LABELS[h.asset_class]}</p>
                    </div>
                    <div className="text-right">
                      <PercentageBadge value={h.absolute_return_pct} size="sm" />
                      <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--loss))' }}>
                        {formatCurrency(h.absolute_return, true)}
                      </p>
                    </div>
                  </div>
                ))}
                {losers.filter((h) => h.absolute_return_pct < 0).length === 0 && (
                  <p className="text-sm" style={{ color: 'rgb(var(--muted))' }}>All holdings in profit 🎉</p>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </div>
  );
}
