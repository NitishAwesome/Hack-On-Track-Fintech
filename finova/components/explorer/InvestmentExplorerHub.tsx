'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { EXPANDED_NSE_STOCKS } from '@/lib/market/stockCatalog';
import type { MarketQuote } from '@/lib/services/marketData';

import { MarketIndexCards } from './MarketIndexCards';
import { StockSearchInput } from './StockSearchInput';
import { InteractiveStockChart } from './InteractiveStockChart';
import { PriceRangeBar } from './PriceRangeBar';
import { CompanyOverviewCard } from './CompanyOverviewCard';
import { TrackedMoversSection } from './TrackedMoversSection';
import { SectorDiscoverySection } from './SectorDiscoverySection';
import { CommoditiesOverview } from './CommoditiesOverview';
import { IpoDiscoverySection } from './IpoDiscoverySection';
import { StockCrossFeatureLinks } from './StockCrossFeatureLinks';
import { StockNewsSection } from './StockNewsSection';
import { AlternativeInvestmentExplorer } from './AlternativeInvestmentExplorer';

import {
  TrendingUp,
  Layers,
  Coins,
  Building,
  BookOpen,
} from 'lucide-react';

export type ExplorerTab = 'stocks' | 'sectors' | 'commodities' | 'alts' | 'ipo';

interface SelectedStockState {
  symbol: string;
  name: string;
  exchange: string;
  isin: string;
  sector: string;
  industry: string;
}

const DEFAULT_STOCK: SelectedStockState = {
  symbol: 'RELIANCE',
  name: 'Reliance Industries Ltd',
  exchange: 'NSE',
  isin: 'INE002A01018',
  sector: 'Energy',
  industry: 'Oil & Gas Refining & Marketing',
};

export function InvestmentExplorerHub() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialTabParam = searchParams.get('tab') as ExplorerTab;
  const initialSymbolParam = searchParams.get('symbol');

  const [activeTab, setActiveTab] = useState<ExplorerTab>(
    ['stocks', 'sectors', 'commodities', 'alts', 'ipo'].includes(initialTabParam)
      ? initialTabParam
      : 'stocks'
  );

  const [selectedStock, setSelectedStock] = useState<SelectedStockState>(() => {
    if (initialSymbolParam) {
      const match = EXPANDED_NSE_STOCKS.find(
        (s) => s.symbol.toUpperCase() === initialSymbolParam.toUpperCase()
      );
      if (match) {
        return {
          symbol: match.symbol,
          name: match.name,
          exchange: 'NSE',
          isin: match.isin,
          sector: match.sector,
          industry: match.industry,
        };
      }
      return {
        symbol: initialSymbolParam.toUpperCase(),
        name: initialSymbolParam.toUpperCase(),
        exchange: initialSymbolParam.startsWith('^') ? 'INDEX' : 'NSE',
        isin: '',
        sector: '',
        industry: '',
      };
    }
    return DEFAULT_STOCK;
  });

  const [quote, setQuote] = useState<MarketQuote | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadQuote() {
      try {
        const res = await fetch(
          `/api/market/quotes?symbol=${encodeURIComponent(selectedStock.symbol)}&exchange=${encodeURIComponent(
            selectedStock.exchange
          )}`
        );
        if (res.ok && isMounted) {
          const json = await res.json();
          const q = json.quotes?.[selectedStock.symbol] || json.quotes?.[selectedStock.symbol.toUpperCase()] || null;
          setQuote(q);
        }
      } catch {
        // Fallback cleanly
      }
    }

    if (selectedStock.symbol) {
      loadQuote();
    }

    return () => {
      isMounted = false;
    };
  }, [selectedStock.symbol, selectedStock.exchange]);

  // Handle stock selection from search, movers, or sectors
  const handleSelectStock = (stock: {
    symbol: string;
    name: string;
    exchange: string;
    isin?: string;
    sector?: string;
    industry?: string;
  }) => {
    const catalogMatch = EXPANDED_NSE_STOCKS.find(
      (s) => s.symbol.toUpperCase() === stock.symbol.toUpperCase()
    );

    setSelectedStock({
      symbol: stock.symbol.toUpperCase(),
      name: stock.name || catalogMatch?.name || stock.symbol,
      exchange: stock.exchange || 'NSE',
      isin: stock.isin || catalogMatch?.isin || '',
      sector: stock.sector || catalogMatch?.sector || '',
      industry: stock.industry || catalogMatch?.industry || '',
    });

    setActiveTab('stocks');

    // Update URL query param smoothly without full page reload
    const params = new URLSearchParams(window.location.search);
    params.set('symbol', stock.symbol.toUpperCase());
    params.set('tab', 'stocks');
    router.replace(`/explore?${params.toString()}`, { scroll: false });
  };

  const handleSelectSymbolOnly = (symbol: string) => {
    const match = EXPANDED_NSE_STOCKS.find((s) => s.symbol.toUpperCase() === symbol.toUpperCase());
    if (match) {
      handleSelectStock({
        symbol: match.symbol,
        name: match.name,
        exchange: 'NSE',
        isin: match.isin,
        sector: match.sector,
        industry: match.industry,
      });
    } else {
      handleSelectStock({
        symbol: symbol.toUpperCase(),
        name: symbol.toUpperCase(),
        exchange: symbol.startsWith('^') ? 'INDEX' : 'NSE',
      });
    }
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
          <StockSearchInput onSelectStock={handleSelectStock} />
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

      {/* Tab 1: Stocks & Market Experience */}
      {activeTab === 'stocks' && (
        <div className="space-y-6">
          {/* Section A: Indian Market Index Cards */}
          <MarketIndexCards
            selectedIndex={selectedStock.symbol}
            onSelectIndex={(indexSym, indexName) => {
              handleSelectStock({
                symbol: indexSym,
                name: indexName,
                exchange: 'INDEX',
                sector: 'Benchmark Index',
              });
            }}
          />

          {/* Section B: Selected Stock Detail & Interactive Chart */}
          <div className="space-y-6">
            {/* Interactive Price Graph with 1D-MAX intervals */}
            <InteractiveStockChart
              symbol={selectedStock.symbol}
              exchange={selectedStock.exchange}
              companyName={selectedStock.name}
              defaultRange="1M"
            />

            {/* Price Performance Range Bars (Intraday & 52-Week) */}
            <PriceRangeBar
              currentPrice={quote?.price ?? 0}
              currency={quote?.currency ?? 'INR'}
              dayLow={quote?.previousClose ? Math.min(quote.price, quote.previousClose) * 0.995 : null}
              dayHigh={quote?.previousClose ? Math.max(quote.price, quote.previousClose) * 1.005 : null}
              fiftyTwoWeekLow={quote?.low_52w ?? null}
              fiftyTwoWeekHigh={quote?.high_52w ?? null}
            />

            {/* Company Fundamentals and Business Profile */}
            <CompanyOverviewCard
              symbol={selectedStock.symbol}
              name={selectedStock.name}
              exchange={selectedStock.exchange}
              currentPrice={quote?.price ?? null}
              dayChange={quote?.day_change ?? null}
              dayChangePercent={quote?.day_change_pct ?? null}
              previousClose={quote?.previousClose ?? null}
              dayHigh={quote?.previousClose ? Math.max(quote.price, quote.previousClose) * 1.005 : null}
              dayLow={quote?.previousClose ? Math.min(quote.price, quote.previousClose) * 0.995 : null}
              fiftyTwoWeekHigh={quote?.high_52w ?? null}
              fiftyTwoWeekLow={quote?.low_52w ?? null}
              volume={quote?.volume ?? null}
              sector={selectedStock.sector}
              industry={selectedStock.industry}
              isin={selectedStock.isin}
              currency={quote?.currency ?? 'INR'}
            />

            {/* Cross-Feature Links (X-Ray, Future Lab, Risk Radar, News) */}
            <StockCrossFeatureLinks
              symbol={selectedStock.symbol}
            />

            {/* Stock Specific News */}
            <StockNewsSection
              symbol={selectedStock.symbol}
            />
          </div>

          {/* Section C: Tracked Movers */}
          <TrackedMoversSection onSelectStock={handleSelectSymbolOnly} />
        </div>
      )}

      {/* Tab 2: Sector Discovery */}
      {activeTab === 'sectors' && (
        <SectorDiscoverySection onSelectStock={handleSelectStock} />
      )}

      {/* Tab 3: Gold & Silver */}
      {activeTab === 'commodities' && (
        <CommoditiesOverview
          onSelectInstrument={(sym, name) => {
            handleSelectStock({
              symbol: sym,
              name: name,
              exchange: sym.endsWith('.NS') ? 'NSE' : 'COMMODITY',
            });
          }}
        />
      )}

      {/* Tab 4: Alternative Assets (Preserved 100% of REITs, InvITs, and Bonds) */}
      {activeTab === 'alts' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-violet-500/10 border border-violet-500/20 text-xs text-violet-300">
            <strong>Alternative Assets Module:</strong> In-depth research, dividend yield distribution analysis, and risk profiles for Indian REITs, InvITs, and Government/Corporate Bonds.
          </div>
          <AlternativeInvestmentExplorer initialCategory="reit" />
        </div>
      )}

      {/* Tab 5: IPO Centre */}
      {activeTab === 'ipo' && <IpoDiscoverySection />}
    </div>
  );
}
