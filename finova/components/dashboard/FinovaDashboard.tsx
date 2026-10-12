'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { RefreshCw, Plus, Upload } from 'lucide-react';

import { PortfolioSummaryMetrics } from './PortfolioSummaryMetrics';
import { PortfolioOverviewCard } from './PortfolioOverviewCard';
import { PortfolioInsightsCard } from './PortfolioInsightsCard';
import { MarketHighlightsCard } from './MarketHighlightsCard';
import { RecentActivitySection } from './RecentActivitySection';
import { QuickLinksCard } from './QuickLinksCard';

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
      {/* 1. Welcome Hero Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Welcome back, <span className="text-brand">{userName}</span>
          </h1>
          <p className="text-xs sm:text-sm mt-1 text-muted">
            Here&apos;s a unified view of all your investments across Zerodha, Groww and more.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleSyncAll}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-border bg-surface hover:bg-surface-raised text-muted hover:text-foreground transition-all shadow-xs disabled:opacity-50"
            title="Sync all broker holdings and market valuations"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Sync Accounts</span>
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
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-xs transition-all hover:opacity-95"
            style={{
              background: 'linear-gradient(135deg, rgb(var(--brand-600)), rgb(var(--brand-400)))',
            }}
          >
            <Plus className="w-4 h-4" />
            <span>Add Investment</span>
          </Link>
        </div>
      </div>

      {/* 2. Top KPI Cards: 6 Glowing Metric Blocks in Row */}
      <PortfolioSummaryMetrics
        summary={summary}
        isLoading={summaryLoading}
      />

      {/* 3. Middle 3-Column Section: Overview Donut (4) + Insights (4) + Market Highlights (4) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Col 1: Portfolio Overview Donut + Tabs */}
        <div className="lg:col-span-4 flex flex-col">
          <PortfolioOverviewCard
            allocations={allocations}
            holdings={holdings}
            brokers={brokers}
            totalValue={summary?.total_current_value ?? null}
            isLoading={summaryLoading || holdingsLoading}
          />
        </div>

        {/* Col 2: Portfolio Insights Diagnostic */}
        <div className="lg:col-span-4 flex flex-col">
          <PortfolioInsightsCard
            summary={summary}
            holdings={holdings}
            brokers={brokers}
            isLoading={summaryLoading || holdingsLoading}
          />
        </div>

        {/* Col 3: Market Highlights Live News */}
        <div className="lg:col-span-4 flex flex-col">
          <MarketHighlightsCard />
        </div>
      </div>

      {/* 4. Lower 2-Column Section: Recent Activity Table (7) + Quick Links (5) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Col 1: Clean Financial Transaction Ledger */}
        <div className="lg:col-span-7 flex flex-col">
          <RecentActivitySection
            transactions={transactions}
            isLoading={transactionsLoading}
          />
        </div>

        {/* Col 2: 2x2 Quick Links Cards */}
        <div className="lg:col-span-5 flex flex-col">
          <QuickLinksCard />
        </div>
      </div>
    </div>
  );
}
