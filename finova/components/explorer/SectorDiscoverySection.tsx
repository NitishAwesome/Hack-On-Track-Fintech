'use client';

import React, { useState, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { EXPANDED_NSE_STOCKS } from '@/lib/market/stockCatalog';
import { SECTORS as CATALOG_SECTORS, sectorName } from '@/lib/research/catalog';
import { useSharedStockQuotes } from '@/lib/market/sharedMarketStore';
import { DiscoveryInstrumentCard } from './DiscoveryInstrumentCard';
import {
  Cpu,
  Landmark,
  Zap,
  HeartPulse,
  ShoppingBag,
  Car,
  Pickaxe,
  Hammer,
  Radio,
  Search,
  Layers,
} from 'lucide-react';

interface SectorDiscoverySectionProps {
  onSelectStock: (stock: { symbol: string; name: string; exchange: string; isin: string; sector: string; industry: string }) => void;
}

interface SectorConfig {
  id: string;
  name: string;
  icon: React.ElementType;
  matchSectors: string[];
}

const SECTOR_ICONS: SectorConfig[] = [
  { id: 'it', name: 'Information Technology', icon: Cpu, matchSectors: ['Information Technology'] },
  { id: 'financials', name: 'Financial Services & Banking', icon: Landmark, matchSectors: ['Financial Services'] },
  { id: 'energy', name: 'Energy, Oil & Gas', icon: Zap, matchSectors: ['Energy'] },
  { id: 'healthcare', name: 'Healthcare & Pharma', icon: HeartPulse, matchSectors: ['Healthcare'] },
  { id: 'fmcg', name: 'Consumer Goods (FMCG)', icon: ShoppingBag, matchSectors: ['Fast Moving Consumer Goods', 'Consumer Durables'] },
  { id: 'auto', name: 'Automobile & Transport', icon: Car, matchSectors: ['Automobile'] },
  { id: 'metals', name: 'Metals & Mining', icon: Pickaxe, matchSectors: ['Metals & Mining', 'Materials'] },
  { id: 'infra', name: 'Construction & Infra', icon: Hammer, matchSectors: ['Construction', 'Services'] },
  { id: 'power', name: 'Power & Utilities', icon: Zap, matchSectors: ['Power'] },
  { id: 'telecom', name: 'Telecommunications', icon: Radio, matchSectors: ['Telecommunication'] },
];
const SECTORS: SectorConfig[] = CATALOG_SECTORS.map((name) => ({ id: name, name, matchSectors: [name], icon: SECTOR_ICONS.find((sector) => sector.matchSectors.includes(name))?.icon || Layers }));

export function SectorDiscoverySection({ onSelectStock }: SectorDiscoverySectionProps) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const selectedSectorId = CATALOG_SECTORS.includes(params.get('sector') || '') ? params.get('sector')! : 'Information Technology';
  const setSelectedSectorId = (value: string) => {
    const next = new URLSearchParams(params.toString());
    next.set('sector', value);
    next.delete('page');
    router.push(`${pathname}?${next}`, { scroll: false });
  };
  const [searchFilter, setSearchFilter] = useState<string>('');

  const currentSector = SECTORS.find((s) => s.id === selectedSectorId) || SECTORS[0];

  const sectorStocks = useMemo(() => {
    return EXPANDED_NSE_STOCKS.filter((stock) =>
      currentSector.matchSectors.includes(sectorName(stock.sector))
    );
  }, [currentSector]);

  const filteredStocks = useMemo(() => {
    const q = searchFilter.trim().toUpperCase();
    if (!q) return sectorStocks;
    return sectorStocks.filter(
      (s) =>
        s.symbol.toUpperCase().includes(q) ||
        s.name.toUpperCase().includes(q) ||
        s.industry.toUpperCase().includes(q)
    );
  }, [sectorStocks, searchFilter]);
  const pageSize = 12;
  const pages = Math.max(1, Math.ceil(filteredStocks.length / pageSize));
  const page = Math.min(pages, Math.max(1, Number.parseInt(params.get('page') || '1') || 1));
  const visibleStocks = filteredStocks.slice((page - 1) * pageSize, page * pageSize);
  const { getQuote } = useSharedStockQuotes(visibleStocks.map(stock => stock.symbol));
  const changePage = (nextPage: number) => {
    const next = new URLSearchParams(params.toString());
    next.set('page', String(nextPage));
    router.push(`${pathname}?${next}`, { scroll: false });
  };

  return (
    <div className="research-card discovery-section space-y-6" data-accent="violet">
      {/* Title */}
      <div>
        <h3 className="text-lg font-bold text-foreground tracking-tight flex items-center gap-2">
          <Layers className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
          Sector-Wise Market Discovery
        </h3>
        <p className="text-xs text-muted mt-0.5">
          Explore NSE-listed equities organized across India’s core industrial sectors.
        </p>
      </div>

      {/* Sector Category Pills */}
      <div className="flex flex-wrap gap-2">
        {SECTORS.map((sec) => {
          const Icon = sec.icon;
          const isSelected = sec.id === selectedSectorId;
          const count = EXPANDED_NSE_STOCKS.filter((s) => sec.matchSectors.includes(sectorName(s.sector))).length;

          return (
            <button
              key={sec.id}
              type="button"
              onClick={() => {
                setSelectedSectorId(sec.id);
                setSearchFilter('');
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                isSelected
                  ? 'bg-surface-raised text-emerald-500 border border-emerald-500/30 shadow-sm ring-1 ring-emerald-500/20'
                  : 'bg-surface hover:bg-surface-raised text-muted hover:text-foreground border border-border/70'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{sec.name}</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] bg-surface-raised text-muted border border-border">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filter and Results Count */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2 border-t border-border/40">
        <div className="text-xs text-muted">
          Showing <strong className="text-foreground">{filteredStocks.length}</strong> equities in{' '}
          <strong className="text-emerald-500">{currentSector.name}</strong>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted pointer-events-none" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder={`Filter ${currentSector.name}...`}
            className="w-full pl-9 pr-3 py-1.5 bg-surface border border-border rounded-lg text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
          />
        </div>
      </div>

      <p className="text-[11px] text-muted">Price trends use the latest observed session, with a labeled fallback when intraday history is unavailable. Quotes and chart-period returns measure different windows.</p>
      {/* Stock Cards Grid */}
      {filteredStocks.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {visibleStocks.map((item) => (
            <DiscoveryInstrumentCard key={item.symbol} symbol={item.symbol} name={item.name} sector={currentSector.name} quote={getQuote(item.symbol)} accent="violet" onOpen={() => onSelectStock({ ...item, exchange: 'NSE' })} />
          ))}
        </div>
      ) : (
        <div className="p-8 text-center text-xs text-muted bg-surface-raised rounded-xl border border-border/40">
          No equities matching &quot;{searchFilter}&quot; in {currentSector.name}.
        </div>
      )}
      {pages > 1 && <div className="flex flex-wrap gap-3 justify-between items-center text-xs text-muted"><span>Page {page} of {pages} · {filteredStocks.length} stocks</span><div className="flex gap-2"><button type="button" className="research-button" disabled={page === 1} onClick={() => changePage(page - 1)}>Previous</button><button type="button" className="research-button" disabled={page === pages} onClick={() => changePage(page + 1)}>Next</button></div></div>}
    </div>
  );
}
