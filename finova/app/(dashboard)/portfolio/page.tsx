'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  TrendingUp, Wallet, BarChart3, Building2,
  Briefcase, RefreshCw, AlertCircle
} from 'lucide-react';
import { StatCard } from '@/components/shared/StatCard';
import { SkeletonCard, SkeletonChart } from '@/components/shared/Skeletons';
import { EmptyState } from '@/components/shared/EmptyState';
import { AllocationChart } from '@/components/portfolio/AllocationChart';
import { BrokerAllocationChart } from '@/components/portfolio/BrokerAllocationChart';
import { AIInsightCard } from '@/components/insights/AIInsightCard';
import Link from 'next/link';

async function fetchPortfolioSummary() {
  const res = await fetch('/api/portfolio/summary');
  if (!res.ok) throw new Error('Failed to load portfolio');
  return res.json();
}

export default function PortfolioPage() {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['portfolio-summary'],
    queryFn: fetchPortfolioSummary,
  });

  const summary = data?.summary;
  const assetAllocation = data?.assetAllocation ?? [];
  const brokerAllocation = data?.brokerAllocation ?? [];

  if (isLoading) {
    return (
      <div className="page-container space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SkeletonChart height={280} />
          <SkeletonChart height={280} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="card p-8 flex flex-col items-center gap-3 text-center">
          <AlertCircle className="w-10 h-10" style={{ color: 'rgb(var(--loss))' }} />
          <p className="font-medium" style={{ color: 'rgb(var(--foreground))' }}>
            Failed to load portfolio
          </p>
          <button onClick={() => refetch()} className="text-sm" style={{ color: 'rgb(var(--brand-500))' }}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  const hasHoldings = summary?.holding_count > 0;

  return (
    <div className="page-container space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'rgb(var(--foreground))' }}>
            Portfolio Overview
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'rgb(var(--muted))' }}>
            All your investments in one place
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors"
            style={{
              backgroundColor: 'rgb(var(--surface-raised))',
              border: '1px solid rgb(var(--border))',
              color: 'rgb(var(--muted))',
            }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <Link
            href="/holdings"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white"
            style={{ background: 'linear-gradient(135deg, rgb(var(--brand-600)), rgb(var(--brand-400)))' }}
          >
            + Add Holding
          </Link>
        </div>
      </div>

      {!hasHoldings ? (
        <EmptyState
          icon={<Briefcase className="w-8 h-8" style={{ color: 'rgb(var(--brand-500))' }} />}
          title="Your portfolio is empty"
          description="Add your holdings manually or import a CSV to get started with your unified investment view."
          action={
            <Link
              href="/holdings"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white"
              style={{ background: 'linear-gradient(135deg, rgb(var(--brand-600)), rgb(var(--brand-400)))' }}
            >
              Add your first holding
            </Link>
          }
        />
      ) : (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Total Portfolio Value"
              value={summary.total_current_value}
              type="currency"
              icon={<Wallet className="w-4 h-4" style={{ color: 'rgb(var(--brand-500))' }} />}
              delay={0}
            />
            <StatCard
              label="Total Invested"
              value={summary.total_invested_value}
              type="currency"
              icon={<BarChart3 className="w-4 h-4" style={{ color: 'rgb(var(--muted))' }} />}
              delay={0.05}
            />
            <StatCard
              label="Total Returns"
              value={summary.total_absolute_return}
              type="currency"
              changePct={summary.total_absolute_return_pct}
              icon={<TrendingUp className="w-4 h-4" style={{
                color: summary.total_absolute_return >= 0 ? 'rgb(var(--gain))' : 'rgb(var(--loss))'
              }} />}
              delay={0.1}
            />
            <StatCard
              label="Holdings"
              value={summary.holding_count}
              type="number"
              subtitle={`across ${summary.broker_count} broker${summary.broker_count !== 1 ? 's' : ''}`}
              icon={<Building2 className="w-4 h-4" style={{ color: 'rgb(var(--muted))' }} />}
              delay={0.15}
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <AllocationChart data={assetAllocation} />
            <BrokerAllocationChart data={brokerAllocation} />
          </div>

          {/* AI Insight */}
          <AIInsightCard insightType="portfolio_summary" />
        </>
      )}
    </div>
  );
}
