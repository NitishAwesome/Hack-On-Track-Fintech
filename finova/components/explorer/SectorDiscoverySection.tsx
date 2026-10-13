'use client';

import React, { useState, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { EXPANDED_NSE_STOCKS } from '@/lib/market/stockCatalog';
import { SECTORS as CATALOG_SECTORS, sectorName } from '@/lib/research/catalog';
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
  ChevronRight,
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

  return (
    <div className="bg-card/70 border border-border/70 rounded-2xl p-6 backdrop-blur-sm space-y-6">
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
          <Search className="absolute left-3 w-3.5 h-3.5 text-muted pointer-events-none" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder={`Filter ${currentSector.name}...`}
            className="w-full pl-9 pr-3 py-1.5 bg-surface border border-border rounded-lg text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
          />
        </div>
      </div>

      {/* Stock Cards Grid */}
      {filteredStocks.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {filteredStocks.map((item) => (
            <button
              key={item.symbol}
              type="button"
              onClick={() =>
                onSelectStock({
                  symbol: item.symbol,
                  name: item.name,
                  exchange: 'NSE',
                  isin: item.isin,
                  sector: item.sector,
                  industry: item.industry,
                })
              }
              className="p-4 text-left rounded-xl bg-surface hover:bg-surface-raised border border-border/70 hover:border-emerald-500/30 transition group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sm text-foreground group-hover:text-emerald-500 transition">
                    {item.symbol}
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] bg-surface-raised text-muted border border-border">
                    NSE
                  </span>
                </div>
                <div className="text-xs text-foreground font-medium mt-1 truncate">
                  {item.name}
                </div>
                <div className="text-[11px] text-muted truncate mt-0.5">
                  {item.industry}
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-border/40 flex items-center justify-between text-[11px] text-muted group-hover:text-emerald-500 transition">
                <span className="font-mono text-[10px] text-muted">{item.isin}</span>
                <span className="flex items-center gap-0.5 font-semibold">
                  Inspect chart <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="p-8 text-center text-xs text-muted bg-surface-raised rounded-xl border border-border/40">
          No equities matching &quot;{searchFilter}&quot; in {currentSector.name}.
        </div>
      )}
    </div>
  );
}
