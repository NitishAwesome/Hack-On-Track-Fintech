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
  Compass,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export type ExplorerTab = 'all' | 'movers' | 'browse' | 'sectors' | 'commodities' | 'alts' | 'ipo';

const QUICK_SEARCH_CHIPS = [
  { label: 'Nifty 50', symbol: '^NSEI' },
  { label: 'Sensex', symbol: '^BSESN' },
  { label: 'Reliance', symbol: 'RELIANCE' },
  { label: 'TCS', symbol: 'TCS' },
  { label: 'HDFC Bank', symbol: 'HDFCBANK' },
  { label: 'Infosys', symbol: 'INFY' },
  { label: 'Gold BeES', symbol: 'GOLDBEES' },
  { label: 'Embassy REIT', symbol: 'EMBASSY' },
];

export function InvestmentExplorerHub() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const tabParam = searchParams.get('tab');
  const initialSymbolParam = searchParams.get('symbol');

  // Backwards-compatibility: If a user enters /explore?symbol=RELIANCE, forward them to /explore/stocks/RELIANCE
  useEffect(() => {
    if (initialSymbolParam && initialSymbolParam.trim().length > 0) {
      router.replace(`/explore/stocks/${encodeURIComponent(initialSymbolParam.trim().toUpperCase())}`);
    }
  }, [initialSymbolParam, router]);

  const parseInitialTab = (): ExplorerTab => {
    if (!tabParam) return 'all';
    if (tabParam === 'stocks') return 'all';
    if (['all', 'movers', 'browse', 'sectors', 'commodities', 'alts', 'ipo'].includes(tabParam)) {
      return tabParam as ExplorerTab;
    }
    return 'all';
  };

  const [activeTab, setActiveTab] = useState<ExplorerTab>(parseInitialTab());

  // Navigate to dedicated stock research page
  const navigateToStock = (symbol: string) => {
    if (!symbol) return;
    router.push(`/explore/stocks/${encodeURIComponent(symbol.trim().toUpperCase())}`);
  };

  const handleTabChange = (tab: ExplorerTab) => {
    setActiveTab(tab);
    const params = new URLSearchParams(window.location.search);
    if (tab === 'all') {
      params.delete('tab');
    } else {
      params.set('tab', tab);
    }
    const query = params.toString();
    router.replace(`/explore${query ? `?${query}` : ''}`, { scroll: false });
  };

  return (
    <div className="space-y-8">
      {/* ── 2. Search Section ──────────────────────────────────── */}
      <div className="bg-surface border border-border rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
        <div className="max-w-2xl mx-auto">
          <StockSearchInput
            onSelectStock={(stock) => {
              navigateToStock(stock.symbol);
            }}
          />
        </div>

        {/* Quick Search Shortcut Chips */}
        <div className="flex items-center justify-center gap-1.5 flex-wrap pt-1">
          <span className="text-[11px] font-semibold text-muted flex items-center gap-1 mr-1">
            <Sparkles className="w-3 h-3 text-brand" />
            Trending:
          </span>
          {QUICK_SEARCH_CHIPS.map((chip) => (
            <button
              key={chip.symbol}
              type="button"
              onClick={() => navigateToStock(chip.symbol)}
              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-surface-raised/80 hover:bg-surface-raised border border-border text-foreground hover:text-brand transition-all hover-card"
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Explorer Category Navigator ───────────────────────── */}
      <div className="sticky top-16 z-30 bg-background/90 backdrop-blur-md py-2 border-y border-border/60 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {[
            { id: 'all' as ExplorerTab, label: 'All Discovery', icon: Compass, color: 'text-brand border-brand/30 ring-brand/20' },
            { id: 'movers' as ExplorerTab, label: 'Market Movers', icon: TrendingUp, color: 'text-emerald-500 border-emerald-500/30 ring-emerald-500/20' },
            { id: 'browse' as ExplorerTab, label: 'Browse Stocks', icon: Search, color: 'text-blue-500 border-blue-500/30 ring-blue-500/20' },
            { id: 'sectors' as ExplorerTab, label: 'Sectors', icon: Layers, color: 'text-cyan-500 border-cyan-500/30 ring-cyan-500/20' },
            { id: 'commodities' as ExplorerTab, label: 'Gold & Silver', icon: Coins, color: 'text-amber-500 border-amber-500/30 ring-amber-500/20' },
            { id: 'alts' as ExplorerTab, label: 'Alternative Assets', icon: Building, color: 'text-purple-500 border-purple-500/30 ring-purple-500/20' },
            { id: 'ipo' as ExplorerTab, label: 'IPO Centre', icon: BookOpen, color: 'text-rose-500 border-rose-500/30 ring-rose-500/20' },
          ].map(({ id, label, icon: Icon, color }) => (
            <button
              key={id}
              type="button"
              onClick={() => handleTabChange(id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all ${
                activeTab === id
                  ? `bg-surface-raised ${color} border shadow-xs ring-1`
                  : 'text-muted hover:text-foreground hover:bg-surface-raised border border-transparent'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Complete Discovery Flow (All 10 Sections in Exact Sequence) ── */}
      {activeTab === 'all' && (
        <div className="space-y-10">
          {/* Section 3: Market Indices */}
          <section id="section-indices" className="space-y-3 scroll-mt-28">
            <MarketIndexCards onSelectIndex={(sym) => navigateToStock(sym)} />
          </section>

          {/* Section 4: Recently Viewed */}
          <section id="section-recent" className="space-y-3 scroll-mt-28">
            <RecentlyViewedStocks onSelectStock={(sym) => navigateToStock(sym)} />
          </section>

          {/* Section 5: Market Movers */}
          <section id="section-movers" className="space-y-3 scroll-mt-28">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight">Market Movers</h2>
              </div>
              <button
                type="button"
                onClick={() => handleTabChange('movers')}
                className="text-xs font-semibold text-brand hover:underline flex items-center gap-1 group"
              >
                <span>Focus View</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
            <TrackedMoversSection onSelectStock={(sym) => navigateToStock(sym)} />
          </section>

          {/* Section 6: Explore/Browse Stocks */}
          <section id="section-stocks" className="space-y-3 scroll-mt-28">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-blue-500" />
                <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight">Explore &amp; Browse Stocks</h2>
              </div>
              <button
                type="button"
                onClick={() => handleTabChange('browse')}
                className="text-xs font-semibold text-brand hover:underline flex items-center gap-1 group"
              >
                <span>Full Directory</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
            <BrowseStocksSection onSelectStock={(sym) => navigateToStock(sym)} />
          </section>

          {/* Section 7: Sector Discovery */}
          <section id="section-sectors" className="space-y-3 scroll-mt-28">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-500" />
                <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight">Sector Discovery</h2>
              </div>
              <button
                type="button"
                onClick={() => handleTabChange('sectors')}
                className="text-xs font-semibold text-brand hover:underline flex items-center gap-1 group"
              >
                <span>Explore Sectors</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
            <SectorDiscoverySection onSelectStock={(stock) => navigateToStock(stock.symbol)} />
          </section>

          {/* Section 8: Gold & Silver */}
          <section id="section-commodities" className="space-y-3 scroll-mt-28">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-500" />
                <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight">Gold &amp; Silver Benchmarks</h2>
              </div>
              <button
                type="button"
                onClick={() => handleTabChange('commodities')}
                className="text-xs font-semibold text-brand hover:underline flex items-center gap-1 group"
              >
                <span>Precious Metals</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
            <CommoditiesOverview onSelectInstrument={(sym) => navigateToStock(sym)} />
          </section>

          {/* Section 9: Alternative Assets */}
          <section id="section-alts" className="space-y-3 scroll-mt-28">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-purple-500" />
                <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight">Alternative Assets (REITs, InvITs &amp; Bonds)</h2>
              </div>
              <button
                type="button"
                onClick={() => handleTabChange('alts')}
                className="text-xs font-semibold text-brand hover:underline flex items-center gap-1 group"
              >
                <span>Alternatives Terminal</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
            <AlternativeInvestmentsHub />
          </section>

          {/* Section 10: IPO Section */}
          <section id="section-ipo" className="space-y-3 scroll-mt-28">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-rose-500" />
                <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight">IPO Centre &amp; Primary Markets</h2>
              </div>
              <button
                type="button"
                onClick={() => handleTabChange('ipo')}
                className="text-xs font-semibold text-brand hover:underline flex items-center gap-1 group"
              >
                <span>View All Filings</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
            <IpoDiscoverySection />
          </section>
        </div>
      )}

      {/* ── Deep-Dive Tab Views ───────────────────────────────── */}
      {activeTab === 'movers' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
              Market Movers Deep Dive
            </h2>
            <button
              type="button"
              onClick={() => handleTabChange('all')}
              className="text-xs font-semibold text-brand hover:underline"
            >
              ← Back to All Discovery
            </button>
          </div>
          <TrackedMoversSection onSelectStock={(sym) => navigateToStock(sym)} />
        </div>
      )}

      {activeTab === 'browse' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Search className="w-5 h-5 text-blue-500" />
              Verified NSE Equity Catalog
            </h2>
            <button
              type="button"
              onClick={() => handleTabChange('all')}
              className="text-xs font-semibold text-brand hover:underline"
            >
              ← Back to All Discovery
            </button>
          </div>
          <BrowseStocksSection onSelectStock={(sym) => navigateToStock(sym)} />
        </div>
      )}

      {activeTab === 'sectors' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Layers className="w-5 h-5 text-cyan-500" />
              Industry Sector Breakdown
            </h2>
            <button
              type="button"
              onClick={() => handleTabChange('all')}
              className="text-xs font-semibold text-brand hover:underline"
            >
              ← Back to All Discovery
            </button>
          </div>
          <SectorDiscoverySection onSelectStock={(stock) => navigateToStock(stock.symbol)} />
        </div>
      )}

      {activeTab === 'commodities' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Coins className="w-5 h-5 text-amber-500" />
              Precious Metals &amp; Sovereign Gold
            </h2>
            <button
              type="button"
              onClick={() => handleTabChange('all')}
              className="text-xs font-semibold text-brand hover:underline"
            >
              ← Back to All Discovery
            </button>
          </div>
          <CommoditiesOverview onSelectInstrument={(sym) => navigateToStock(sym)} />
        </div>
      )}

      {activeTab === 'alts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Building className="w-5 h-5 text-purple-500" />
              Alternative Assets Terminal
            </h2>
            <button
              type="button"
              onClick={() => handleTabChange('all')}
              className="text-xs font-semibold text-brand hover:underline"
            >
              ← Back to All Discovery
            </button>
          </div>
          <AlternativeInvestmentsHub />
        </div>
      )}

      {activeTab === 'ipo' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-rose-500" />
              IPO Intelligence Centre
            </h2>
            <button
              type="button"
              onClick={() => handleTabChange('all')}
              className="text-xs font-semibold text-brand hover:underline"
            >
              ← Back to All Discovery
            </button>
          </div>
          <IpoDiscoverySection />
        </div>
      )}
    </div>
  );
}
