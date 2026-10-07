'use client';

import React, { useState } from 'react';
import {
  MOCK_PORTFOLIO_SUMMARY,
  MOCK_ALLOCATION_SEGMENTS,
  MOCK_HOLDINGS,
  MOCK_DISCOVER_INSIGHTS,
  MOCK_MARKET_INDICES,
  MOCK_NEWS_ITEMS,
} from '@/lib/mock/dashboardData';
import { PortfolioSummaryCard } from './PortfolioSummaryCard';
import { AllocationCard } from './AllocationCard';
import { HoldingsCard } from './HoldingsCard';
import { DiscoverCard } from './DiscoverCard';
import { MarketPulse } from './MarketPulse';
import { NewsCard } from './NewsCard';
import { RefreshCw, Plus } from 'lucide-react';
import Link from 'next/link';

export function FinovaDashboard() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
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
          <p className="text-xs sm:text-sm mt-0.5" style={{ color: 'rgb(var(--muted))' }}>
            Unified portfolio across Zerodha, Groww & depositories
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleRefresh}
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
            href="/investments"
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

      {/* Grid Row 1: Portfolio Summary (8 cols) + Asset Allocation (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col">
          <PortfolioSummaryCard
            data={MOCK_PORTFOLIO_SUMMARY}
            className="h-full"
          />
        </div>

        <div className="lg:col-span-5 xl:col-span-4 flex flex-col">
          <AllocationCard
            segments={MOCK_ALLOCATION_SEGMENTS}
            className="h-full"
          />
        </div>
      </div>

      {/* Grid Row 2: Holdings Card (8 cols) + Discover Card (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col">
          <HoldingsCard
            holdings={MOCK_HOLDINGS}
            totalCount={MOCK_HOLDINGS.length}
            limit={5}
            className="h-full"
          />
        </div>

        <div className="lg:col-span-5 xl:col-span-4 flex flex-col">
          <DiscoverCard
            insights={MOCK_DISCOVER_INSIGHTS}
            className="h-full"
          />
        </div>
      </div>

      {/* Grid Row 3: Market Pulse (6 cols) + News Card (6 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-6 flex flex-col">
          <MarketPulse
            indices={MOCK_MARKET_INDICES}
            className="h-full"
          />
        </div>

        <div className="lg:col-span-6 flex flex-col">
          <NewsCard
            newsItems={MOCK_NEWS_ITEMS}
            className="h-full"
          />
        </div>
      </div>
    </div>
  );
}
