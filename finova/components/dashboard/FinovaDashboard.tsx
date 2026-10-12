'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { RefreshCw, Plus, Upload } from 'lucide-react';

// Subcomponents
import { PortfolioSummaryMetrics } from './PortfolioSummaryMetrics';
import { PortfolioOverviewCard } from './PortfolioOverviewCard';
import { PortfolioExposureCard } from './PortfolioExposureCard';
import { MyHoldingsSection } from './MyHoldingsSection';
import { NewsRelevantToYouSection } from './NewsRelevantToYouSection';
import { AskFinovaCommandSection } from './AskFinovaCommandSection';
import { ExploreOpportunitiesSection } from './ExploreOpportunitiesSection';
import { BeyondStocksSection } from './BeyondStocksSection';
import { PortfolioInsightsCard } from './PortfolioInsightsCard';
import { QuickLinksCard } from './QuickLinksCard';
import { RecentActivitySection } from './RecentActivitySection';

// Types & Supabase
import type { PortfolioSummary, AssetAllocation, HoldingWithMetrics } from '@/types/portfolio';
import type { BrokerAccountRow, InvestmentTransactionRow } from '@/types/database';
import { createClient } from '@/lib/supabase/client';

export function FinovaDashboard() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [userName, setUserName] = useState<string>('Investor');

  // Summary & Allocation
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [allocations, setAllocations] = useState<AssetAllocation[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(true);

  // Holdings
  const [holdings, setHoldings] = useState<HoldingWithMetrics[]>([]);
  const [holdingsLoading, setHoldingsLoading] = useState(true);

  // Broker Accounts
  const [brokers, setBrokers] = useState<BrokerAccountRow[]>([]);
  const [brokersLoading, setBrokersLoading] = useState(true);

  // Transactions
  const [transactions, setTransactions] = useState<InvestmentTransactionRow[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(true);

  // Fetch current user display name
  useEffect(() => {
    async function loadUser() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const rawName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Investor';
          setUserName(rawName.charAt(0).toUpperCase() + rawName.slice(1));
        }
      } catch {
        // fallback to Investor
      }
    }
    loadUser();
  }, []);

  // Fetch Summary
  const fetchSummary = useCallback(async () => {
    try {
      setSummaryLoading(true);
      const res = await fetch('/api/portfolio/summary');
      if (!res.ok) return;
      const data = await res.json();
      setSummary(data.summary || null);
      setAllocations(data.assetAllocation || []);
    } catch {
      // ignore
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  // Fetch Holdings
  const fetchHoldings = useCallback(async () => {
    try {
      setHoldingsLoading(true);
      const res = await fetch('/api/portfolio/holdings');
      if (!res.ok) return;
      const data = await res.json();
      setHoldings(data.holdings || []);
    } catch {
      // ignore
    } finally {
      setHoldingsLoading(false);
    }
  }, []);

  // Fetch Brokers
  const fetchBrokers = useCallback(async () => {
    try {
      setBrokersLoading(true);
      const res = await fetch('/api/brokers');
      if (!res.ok) return;
      const data = await res.json();
      setBrokers(data.brokers || []);
    } catch {
      // ignore
    } finally {
      setBrokersLoading(false);
    }
  }, []);

  // Fetch Transactions
  const fetchTransactions = useCallback(async () => {
    try {
      setTransactionsLoading(true);
      const res = await fetch('/api/portfolio/transactions');
      if (!res.ok) return;
      const data = await res.json();
      setTransactions(data.transactions || []);
    } catch {
      // ignore
    } finally {
      setTransactionsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    let active = true;
    if (active) {
      fetchSummary();
      fetchHoldings();
      fetchBrokers();
      fetchTransactions();
    }
    return () => {
      active = false;
    };
  }, [fetchSummary, fetchHoldings, fetchBrokers, fetchTransactions]);

  // Sync button handler
  const handleSyncAll = async () => {
    setIsRefreshing(true);
    await Promise.allSettled([
      fetchSummary(),
      fetchHoldings(),
      fetchBrokers(),
      fetchTransactions(),
    ]);
    setIsRefreshing(false);
  };

  return (
    <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6 space-y-6">
      {/* ── Welcome Header ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <div
              className="w-1.5 h-8 rounded-full shrink-0"
              style={{ background: 'linear-gradient(180deg, rgb(var(--brand-400)), rgb(var(--brand-600)))' }}
            />
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground leading-none">
              Welcome back, <span className="text-gradient">{userName}</span>
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted ml-4 pl-3 border-l-2 border-border-subtle">
            FINOVA Command Center · Unified portfolio analytics, live market feeds &amp; intelligence.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            onClick={handleSyncAll}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-border bg-surface hover:bg-surface-raised text-muted hover:text-foreground transition-all shadow-xs disabled:opacity-50"
            title="Sync all broker holdings and market valuations"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>

          <Link
            href="/holdings"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-border bg-surface hover:bg-surface-raised text-foreground transition-all shadow-xs"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import CSV</span>
          </Link>

          <Link
            href="/holdings"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-sm transition-all hover:opacity-90 hover:shadow-md"
            style={{
              background: 'linear-gradient(135deg, rgb(var(--brand-600)), rgb(var(--brand-400)))',
            }}
          >
            <Plus className="w-4 h-4" />
            <span>Add Investment</span>
          </Link>
        </div>
      </div>

      {/* ── B. Portfolio Summary (6 KPI Metrics) ──────────────── */}
      <PortfolioSummaryMetrics
        summary={summary}
        isLoading={summaryLoading}
      />

      {/* ── C. Portfolio Analysis (Enlarged Donut + Exposure Breakdown) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left: Portfolio Overview Donut (7 cols) */}
        <div className="lg:col-span-7 flex flex-col">
          <div className="flex-1">
            <PortfolioOverviewCard
              allocations={allocations}
              holdings={holdings}
              brokers={brokers}
              totalValue={summary?.total_current_value ?? null}
              isLoading={summaryLoading || holdingsLoading}
            />
          </div>
        </div>

        {/* Right: Portfolio Exposure & Top Holding Concentration (5 cols) */}
        <div className="lg:col-span-5 flex flex-col">
          <div className="flex-1">
            <PortfolioExposureCard
              holdings={holdings}
              allocations={allocations}
              totalValue={summary?.total_current_value ?? null}
              isLoading={summaryLoading || holdingsLoading}
            />
          </div>
        </div>
      </div>

      {/* ── D. My Holdings (Top 5-6 Positions with Logos, Prices, P&L) ─ */}
      <MyHoldingsSection
        holdings={holdings}
        totalValue={summary?.total_current_value ?? null}
        isLoading={holdingsLoading}
      />

      {/* ── E. Recent News (News Relevant to You with Fallback Images) ── */}
      <NewsRelevantToYouSection />

      {/* ── F. FINOVA Intelligence (Ask FINOVA Command Container) ─── */}
      <AskFinovaCommandSection />

      {/* ── G. New Investment Ideas (Explore New Opportunities) ───── */}
      <ExploreOpportunitiesSection
        allocations={allocations}
        holdings={holdings}
      />

      {/* ── H. Beyond Stocks (REITs / InvITs / Bonds Discovery) ─────── */}
      <BeyondStocksSection />

      {/* ── I & J. Portfolio Insights (5 cols) + Quick Actions (7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Section I: Portfolio Insights (Actionable observations) */}
        <div className="lg:col-span-5 flex flex-col">
          <div className="flex-1">
            <PortfolioInsightsCard
              summary={summary}
              holdings={holdings}
              brokers={brokers}
              isLoading={summaryLoading || holdingsLoading}
            />
          </div>
        </div>

        {/* Section J: Quick Actions */}
        <div className="lg:col-span-7 flex flex-col">
          <div className="flex-1">
            <QuickLinksCard />
          </div>
        </div>
      </div>

      {/* ── J. Recent Activity (Ledger of recent trade executions) ─── */}
      <div className="w-full">
        <RecentActivitySection
          transactions={transactions}
          isLoading={transactionsLoading}
        />
      </div>
    </div>
  );
}
