'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

import { MarketIndexCards } from './MarketIndexCards';
import { RecentlyViewedStocks } from './RecentlyViewedStocks';
import { StockSearchInput } from './StockSearchInput';
import { TrackedMoversSection } from './TrackedMoversSection';
import { BrowseStocksSection } from './BrowseStocksSection';
import { SectorDiscoverySection } from './SectorDiscoverySection';
import { CommoditiesOverview } from './CommoditiesOverview';
import { IpoDiscoverySection } from './IpoDiscoverySection';
import { AlternativeInvestmentsHub } from '@/components/alternatives/AlternativeInvestmentsHub';

import {
  TrendingUp,
  Search,
  Layers,
  Coins,
  Building,
  BookOpen,
} from 'lucide-react';

export type ExplorerTab = 'stocks' | 'browse' | 'sectors' | 'commodities' | 'alts' | 'ipo';

export function InvestmentExplorerHub() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialTabParam = searchParams.get('tab') as ExplorerTab;
  const initialSymbolParam = searchParams.get('symbol');

  // Backwards-compatibility: If a user enters /explore?symbol=RELIANCE, forward them to /explore/stocks/RELIANCE
  useEffect(() => {
    if (initialSymbolParam && initialSymbolParam.trim().length > 0) {
      router.replace(`/explore/stocks/${encodeURIComponent(initialSymbolParam.trim().toUpperCase())}`);
    }
  }, [initialSymbolParam, router]);

  const [activeTab, setActiveTab] = useState<ExplorerTab>(
    ['stocks', 'browse', 'sectors', 'commodities', 'alts', 'ipo'].includes(initialTabParam)
      ? initialTabParam
      : 'stocks'
  );

  // Navigate to dedicated stock research page
  const navigateToStock = (symbol: string) => {
    if (!symbol) return;
    router.push(`/explore/stocks/${encodeURIComponent(symbol.trim().toUpperCase())}`);
  };

  const handleTabChange = (tab: ExplorerTab) => {
    setActiveTab(tab);
    const params = new URLSearchParams(window.location.search);
    params.set('tab', tab);
    router.replace(`/explore?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="space-y-6">
      {/* Universal Search Bar */}
      <div className="bg-gradient-to-r from-card/80 via-zinc-900/90 to-card/80 border border-border/80 rounded-2xl p-4 shadow-xl backdrop-blur-md">
        <div className="max-w-2xl mx-auto">
          <StockSearchInput
            onSelectStock={(stock) => {
              navigateToStock(stock.symbol);
            }}
          />
        </div>
      </div>

      {/* Explorer Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-border/60 pb-2 scrollbar-none">
        <button
          type="button"
          onClick={() => handleTabChange('stocks')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-all ${
            activeTab === 'stocks'
              ? 'bg-zinc-800 text-emerald-400 border border-emerald-500/30 shadow-md ring-1 ring-emerald-500/20'
              : 'text-muted hover:text-foreground hover:bg-zinc-900/80 border border-transparent'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Stocks & Market</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('browse')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-all ${
            activeTab === 'browse'
              ? 'bg-zinc-800 text-emerald-400 border border-emerald-500/30 shadow-md ring-1 ring-emerald-500/20'
              : 'text-muted hover:text-foreground hover:bg-zinc-900/80 border border-transparent'
          }`}
        >
          <Search className="w-4 h-4" />
          <span>Browse Stocks</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('sectors')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-all ${
            activeTab === 'sectors'
              ? 'bg-zinc-800 text-cyan-400 border border-cyan-500/30 shadow-md ring-1 ring-cyan-500/20'
              : 'text-muted hover:text-foreground hover:bg-zinc-900/80 border border-transparent'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Sectors</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('commodities')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-all ${
            activeTab === 'commodities'
              ? 'bg-zinc-800 text-amber-400 border border-amber-500/30 shadow-md ring-1 ring-amber-500/20'
              : 'text-muted hover:text-foreground hover:bg-zinc-900/80 border border-transparent'
          }`}
        >
          <Coins className="w-4 h-4" />
          <span>Gold & Silver</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('alts')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-all ${
            activeTab === 'alts'
              ? 'bg-zinc-800 text-violet-400 border border-violet-500/30 shadow-md ring-1 ring-violet-500/20'
              : 'text-muted hover:text-foreground hover:bg-zinc-900/80 border border-transparent'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Alternative Assets (REITs/Bonds)</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('ipo')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-all ${
            activeTab === 'ipo'
              ? 'bg-zinc-800 text-rose-400 border border-rose-500/30 shadow-md ring-1 ring-rose-500/20'
              : 'text-muted hover:text-foreground hover:bg-zinc-900/80 border border-transparent'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>IPO Centre</span>
        </button>
      </div>

      {/* Tab 1: Stocks & Market Experience (Groww-style discovery flow) */}
      {activeTab === 'stocks' && (
        <div className="space-y-6">
          {/* 1. Major Indian Indices */}
          <MarketIndexCards
            onSelectIndex={(indexSym) => {
              navigateToStock(indexSym);
            }}
          />

          {/* 2. Recently Viewed Stocks (Directly below indices) */}
          <RecentlyViewedStocks
            onSelectStock={(sym) => {
              navigateToStock(sym);
            }}
          />

          {/* 3. Market Movers (Gainers, Losers, Most Active) */}
          <TrackedMoversSection
            onSelectStock={(sym) => {
              navigateToStock(sym);
            }}
          />

          {/* 4. Browse Supported Stocks Catalog Section */}
          <BrowseStocksSection
            onSelectStock={(sym) => {
              navigateToStock(sym);
            }}
          />
        </div>
      )}

      {/* Tab 1b: Dedicated Browse Stocks Tab */}
      {activeTab === 'browse' && (
        <BrowseStocksSection
          onSelectStock={(sym) => {
            navigateToStock(sym);
          }}
        />
      )}

      {/* Tab 2: Sector Discovery */}
      {activeTab === 'sectors' && (
        <SectorDiscoverySection
          onSelectStock={(stock) => {
            navigateToStock(stock.symbol);
          }}
        />
      )}

      {/* Tab 3: Gold & Silver */}
      {activeTab === 'commodities' && (
        <CommoditiesOverview
          onSelectInstrument={(sym) => {
            navigateToStock(sym);
          }}
        />
      )}

      {/* Tab 4: Alternative Assets (REITs, InvITs, and Bonds) */}
      {activeTab === 'alts' && (
        <div className="space-y-4">
          <AlternativeInvestmentsHub />
        </div>
      )}

      {/* Tab 5: IPO Centre */}
      {activeTab === 'ipo' && <IpoDiscoverySection />}
    </div>
  );
}
