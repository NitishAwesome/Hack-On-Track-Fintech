'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { RefreshCw, Plus, Upload, Receipt, ArrowRight } from 'lucide-react';
import { usePrivateQuery } from '@/lib/hooks/usePrivateQuery';
import { useSession } from '@/components/providers/QueryProvider';
import { createClient } from '@/lib/supabase/client';
import { PortfolioSummaryMetrics } from './PortfolioSummaryMetrics';
import { PortfolioOverviewCard } from './PortfolioOverviewCard';
import { PortfolioExposureCard } from './PortfolioExposureCard';
import { SectionFeedback } from '@/components/shared/PageSection';
import { MyHoldingsSection } from './MyHoldingsSection';
import { DashboardValueHistory } from './DashboardValueHistory';
import { NewsRelevantToYouSection } from './NewsRelevantToYouSection';
import { AskFinovaCommandSection } from './AskFinovaCommandSection';
import { ExploreOpportunitiesSection } from './ExploreOpportunitiesSection';
import { QuickLinksCard } from './QuickLinksCard';
import { RecentActivitySection } from './RecentActivitySection';
import type { PortfolioSummary, AssetAllocation, HoldingWithMetrics } from '@/types/portfolio';
import type {
  BrokerAccountRow,
  InvestmentTransactionRow,
  PortfolioSnapshotRow,
} from '@/types/database';
import '@/components/shared/page-effects.css';

async function readResource<T>(path: string): Promise<T> {
  const response = await fetch(path);
  if (!response.ok) throw new Error('Recorded data could not be loaded. Try again.');
  return response.json();
}

export function FinovaDashboard() {
  const { userId } = useSession();
  const [identity, setIdentity] = useState<{ owner: string | null; name: string }>({
    owner: null,
    name: 'Investor',
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshStatus, setRefreshStatus] = useState('');
  const summaryQuery = usePrivateQuery({
    queryKey: ['portfolio-summary'],
    queryFn: () =>
      readResource<{ summary: PortfolioSummary; assetAllocation: AssetAllocation[] }>(
        '/api/portfolio/summary',
      ),
  });
  const holdingsQuery = usePrivateQuery({
    queryKey: ['holdings'],
    queryFn: () => readResource<{ holdings: HoldingWithMetrics[] }>('/api/portfolio/holdings'),
  });
  const brokersQuery = usePrivateQuery({
    queryKey: ['brokers'],
    queryFn: () => readResource<{ brokers: BrokerAccountRow[] }>('/api/brokers'),
  });
  const transactionsQuery = usePrivateQuery({
    queryKey: ['transactions', 'dashboard'],
    queryFn: () =>
      readResource<{ transactions: InvestmentTransactionRow[] }>('/api/portfolio/transactions'),
  });
  const historyQuery = usePrivateQuery({
    queryKey: ['portfolio-snapshots'],
    staleTime: 60000,
    queryFn: () =>
      readResource<{ snapshots: PortfolioSnapshotRow[] }>('/api/portfolio/snapshots?limit=365'),
  });
  const summary = summaryQuery.data?.summary ?? null;
  const holdings = holdingsQuery.data?.holdings ?? [];
  const brokers = brokersQuery.data?.brokers ?? [];
  const summaryError =
    summaryQuery.error?.message || holdingsQuery.error?.message || brokersQuery.error?.message;
  const name = identity.owner === userId ? identity.name : 'Investor';
  useEffect(() => {
    let cancelled = false;
    void createClient()
      .auth.getUser()
      .then(({ data }) => {
        if (cancelled || data.user?.id !== userId) return;
        const raw =
          data.user?.user_metadata?.full_name || data.user?.email?.split('@')[0] || 'Investor';
        setIdentity({ owner: userId, name: raw.charAt(0).toUpperCase() + raw.slice(1) });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [userId]);
  const refresh = async () => {
    setIsRefreshing(true);
    setRefreshStatus('');
    try {
      const results = await Promise.allSettled([
        summaryQuery.refetch(),
        holdingsQuery.refetch(),
        brokersQuery.refetch(),
        transactionsQuery.refetch(),
        historyQuery.refetch(),
      ]);
      setRefreshStatus(
        results.some((result) => result.status === 'rejected' || result.value.isError)
          ? 'Refresh finished. Some sections could not be loaded; use their retry controls.'
          : 'Recorded data refreshed. Quotes retain their provider timestamps.',
      );
    } finally {
      setIsRefreshing(false);
    }
  };
  return (
    <div
      className="finova-dashboard w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-7"
      key={userId || 'guest'}
    >
      <header
        className="flex flex-col xl:flex-row xl:items-center justify-between gap-5"
        data-tone="cyan"
      >
        <div className="min-w-0">
          <p className="finova-eyebrow mb-2">YOUR PORTFOLIO · YOUR PERSPECTIVE</p>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Welcome back, <span className="text-gradient">{name}</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted mt-2 leading-relaxed">
            A clear view of your recorded investments, latest available quotes and next questions.
          </p>
        </div>
        <div className="flex items-center flex-wrap gap-2 shrink-0">
          <Link className="finova-button finova-button-primary" href="/holdings?action=add">
            <Plus size={15} />
            Add Investment
          </Link>
          <Link className="finova-button" href="/holdings?action=import">
            <Upload size={14} />
            Import CSV
          </Link>
          <Link className="finova-button" href="/transactions?action=add">
            <Receipt size={14} />
            Record Transaction
          </Link>
          <button
            type="button"
            className="finova-button"
            disabled={isRefreshing}
            onClick={() => {
              void refresh();
            }}
            aria-label="Refresh recorded portfolio data"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </header>
      {refreshStatus && (
        <p role="status" className="text-xs text-muted">
          {refreshStatus}
        </p>
      )}
      {summaryError && (
        <div
          role="alert"
          className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-xs text-foreground"
        >
          Some recorded data could not be loaded. The affected sections show retry controls.
        </div>
      )}
      <PortfolioSummaryMetrics summary={summary} isLoading={summaryQuery.isPending} />
      {summary && (
        <div className="flex flex-wrap justify-between gap-2 text-[11px] text-muted px-1">
          <span>
            {summary.priced_count ?? 0} of {summary.holding_count} positions quoted ·{' '}
            {summary.stale_count ?? 0} cached/stale
          </span>
          <span>
            {summary.is_valuation_complete
              ? 'Complete valuation'
              : 'Partial valuation · available quotes only'}{' '}
            ·{' '}
            <Link href="/performance" className="text-brand hover:underline">
              Understand the figures
            </Link>
          </span>
        </div>
      )}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
        <div className="xl:col-span-7 min-w-0">
          <SectionFeedback
            error={summaryError}
            retry={() => {
              void refresh();
            }}
          >
            <PortfolioOverviewCard
              allocations={summaryQuery.data?.assetAllocation ?? []}
              holdings={holdings}
              brokers={brokers}
              totalValue={summary?.total_current_value ?? null}
              isLoading={
                summaryQuery.isPending || holdingsQuery.isPending || brokersQuery.isPending
              }
            />
          </SectionFeedback>
        </div>
        <div className="xl:col-span-5 min-w-0">
          <SectionFeedback
            error={summaryError}
            retry={() => {
              void refresh();
            }}
          >
            <PortfolioExposureCard
              holdings={holdings}
              allocations={summaryQuery.data?.assetAllocation ?? []}
              totalValue={summary?.total_current_value ?? null}
              isLoading={summaryQuery.isPending || holdingsQuery.isPending}
            />
          </SectionFeedback>
        </div>
      </div>
      <MyHoldingsSection
        holdings={holdings}
        isLoading={holdingsQuery.isPending}
        error={holdingsQuery.error?.message}
        onRetry={() => {
          void holdingsQuery.refetch();
        }}
      />
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
        <div className="xl:col-span-7 min-w-0">
          <DashboardValueHistory
            snapshots={historyQuery.data?.snapshots ?? []}
            loading={historyQuery.isPending}
            error={historyQuery.error?.message}
            retry={() => {
              void historyQuery.refetch();
            }}
          />
        </div>
        <div className="xl:col-span-5 min-w-0">
          <AskFinovaCommandSection />
        </div>
      </div>
      <NewsRelevantToYouSection key={userId} />
      <ExploreOpportunitiesSection />
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
        <div className="xl:col-span-7 min-w-0">
          <RecentActivitySection
            transactions={transactionsQuery.data?.transactions ?? []}
            isLoading={transactionsQuery.isPending}
            error={transactionsQuery.error?.message}
            onRetry={() => {
              void transactionsQuery.refetch();
            }}
          />
        </div>
        <div className="xl:col-span-5 min-w-0">
          <QuickLinksCard />
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted px-1 pb-2">
        <span>Recorded investments. Clear context. Deliberate decisions.</span>
        <Link
          href="/learn"
          className="inline-flex items-center gap-1 hover:text-foreground min-h-10"
        >
          Keep learning
          <ArrowRight size={13} />
        </Link>
      </div>
    </div>
  );
}
