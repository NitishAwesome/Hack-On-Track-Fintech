'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { RefreshCw, Plus, Upload } from 'lucide-react';

import { PortfolioSummaryMetrics } from './PortfolioSummaryMetrics';
import { PortfolioPerformanceSection } from './PortfolioPerformanceSection';
import { AssetAllocationSection } from './AssetAllocationSection';
import { HoldingsPreviewSection } from './HoldingsPreviewSection';
import { BrokerAccountsSection } from './BrokerAccountsSection';
import { RecentActivitySection } from './RecentActivitySection';

import type { PortfolioSummary, AssetAllocation, HoldingWithMetrics } from '@/types/portfolio';
import type { BrokerAccountRow, PortfolioSnapshotRow, InvestmentTransactionRow } from '@/types/database';

export function FinovaDashboard() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Section 1: Summary & Allocation
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [allocations, setAllocations] = useState<AssetAllocation[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  // Section 2: Holdings
  const [holdings, setHoldings] = useState<HoldingWithMetrics[]>([]);
  const [holdingsLoading, setHoldingsLoading] = useState(true);
  const [holdingsError, setHoldingsError] = useState<string | null>(null);

  // Section 3: Broker Accounts
  const [brokers, setBrokers] = useState<BrokerAccountRow[]>([]);
  const [brokersLoading, setBrokersLoading] = useState(true);
  const [brokersError, setBrokersError] = useState<string | null>(null);

  // Section 4: Snapshots
  const [snapshots, setSnapshots] = useState<PortfolioSnapshotRow[]>([]);
  const [snapshotsLoading, setSnapshotsLoading] = useState(true);
  const [snapshotsError, setSnapshotsError] = useState<string | null>(null);

  // Section 5: Transactions
  const [transactions, setTransactions] = useState<InvestmentTransactionRow[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(true);
  const [transactionsError, setTransactionsError] = useState<string | null>(null);

  // Fetch Summary & Allocation
  const fetchSummary = useCallback(async () => {
    try {
      setSummaryLoading(true);
      setSummaryError(null);
      const res = await fetch('/api/portfolio/summary');
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to load portfolio summary');
      }
      const data = await res.json();
      setSummary(data.summary || null);
      setAllocations(data.assetAllocation || []);
    } catch (err) {
      setSummaryError(err instanceof Error ? err.message : 'Unable to connect to summary service');
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  // Fetch Holdings
  const fetchHoldings = useCallback(async () => {
    try {
      setHoldingsLoading(true);
      setHoldingsError(null);
      const res = await fetch('/api/portfolio/holdings');
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to load holdings');
      }
      const data = await res.json();
      setHoldings(data.holdings || []);
    } catch (err) {
      setHoldingsError(err instanceof Error ? err.message : 'Unable to connect to holdings service');
    } finally {
      setHoldingsLoading(false);
    }
  }, []);

  // Fetch Brokers
  const fetchBrokers = useCallback(async () => {
    try {
      setBrokersLoading(true);
      setBrokersError(null);
      const res = await fetch('/api/brokers');
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to load broker accounts');
      }
      const data = await res.json();
      setBrokers(data.brokers || []);
    } catch (err) {
      setBrokersError(err instanceof Error ? err.message : 'Unable to connect to broker service');
    } finally {
      setBrokersLoading(false);
    }
  }, []);

  // Fetch Snapshots
  const fetchSnapshots = useCallback(async () => {
    try {
      setSnapshotsLoading(true);
      setSnapshotsError(null);
      const res = await fetch('/api/portfolio/snapshots');
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to load snapshots');
      }
      const data = await res.json();
      setSnapshots(data.snapshots || []);
    } catch (err) {
      setSnapshotsError(err instanceof Error ? err.message : 'Unable to connect to snapshots service');
    } finally {
      setSnapshotsLoading(false);
    }
  }, []);

  // Fetch Transactions
  const fetchTransactions = useCallback(async () => {
    try {
      setTransactionsLoading(true);
      setTransactionsError(null);
      const res = await fetch('/api/portfolio/transactions');
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to load transactions');
      }
      const data = await res.json();
      setTransactions(data.transactions || []);
    } catch (err) {
      setTransactionsError(err instanceof Error ? err.message : 'Unable to connect to transactions service');
    } finally {
      setTransactionsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchSummary();
    fetchHoldings();
    fetchBrokers();
    fetchSnapshots();
    fetchTransactions();
  }, [fetchSummary, fetchHoldings, fetchBrokers, fetchSnapshots, fetchTransactions]);

  // Sync button handler
  const handleSyncAll = async () => {
    setIsRefreshing(true);
    await Promise.allSettled([
      fetchSummary(),
      fetchHoldings(),
      fetchBrokers(),
      fetchSnapshots(),
      fetchTransactions(),
    ]);
    setIsRefreshing(false);
  };

  return (
    <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner / Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <h1
            className="text-xl sm:text-2xl font-bold tracking-tight"
            style={{ color: 'rgb(var(--foreground))' }}
          >
            Dashboard
          </h1>
          <p className="text-xs sm:text-sm mt-0.5 text-muted">
            Unified multi-asset overview across Zerodha, Groww & manual depositories
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleSyncAll}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-150 hover:bg-surface-raised"
            style={{
              backgroundColor: 'rgb(var(--surface))',
              borderColor: 'rgb(var(--border))',
              color: 'rgb(var(--muted))',
            }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>

          <Link
            href="/holdings"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-150 hover:bg-surface-raised"
            style={{
              backgroundColor: 'rgb(var(--surface))',
              borderColor: 'rgb(var(--border))',
              color: 'rgb(var(--foreground))',
            }}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import CSV</span>
          </Link>

          <Link
            href="/holdings"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white shadow-sm transition-all duration-150 hover:opacity-95"
            style={{
              background: 'linear-gradient(135deg, rgb(var(--brand-600)), rgb(var(--brand-400)))',
            }}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Investment</span>
          </Link>
        </div>
      </div>

      {/* Row 1: Portfolio Summary Metrics (6 Cards) */}
      <PortfolioSummaryMetrics
        summary={summary}
        isLoading={summaryLoading}
      />

      {/* Row 2: Portfolio Performance (8 cols) + Asset Allocation (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col">
          <PortfolioPerformanceSection
            snapshots={snapshots}
            isLoading={snapshotsLoading}
            error={snapshotsError}
            onRetry={fetchSnapshots}
          />
        </div>

        <div className="lg:col-span-5 xl:col-span-4 flex flex-col">
          <AssetAllocationSection
            allocations={allocations}
            totalValue={summary?.total_current_value ?? null}
            isLoading={summaryLoading}
            error={summaryError}
            onRetry={fetchSummary}
          />
        </div>
      </div>

      {/* Row 3: Holdings Preview (8 cols) + Broker Accounts (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col">
          <HoldingsPreviewSection
            holdings={holdings}
            totalCount={holdings.length}
            isLoading={holdingsLoading}
            error={holdingsError}
            onRetry={fetchHoldings}
          />
        </div>

        <div className="lg:col-span-5 xl:col-span-4 flex flex-col">
          <BrokerAccountsSection
            brokers={brokers}
            isLoading={brokersLoading}
            error={brokersError}
            onRetry={fetchBrokers}
          />
        </div>
      </div>

      {/* Row 4: Recent Activity Ledger (Full Width) */}
      <div className="w-full">
        <RecentActivitySection
          transactions={transactions}
          isLoading={transactionsLoading}
          error={transactionsError}
          onRetry={fetchTransactions}
        />
      </div>
    </div>
  );
}
