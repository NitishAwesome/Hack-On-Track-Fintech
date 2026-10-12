'use client';

// ============================================================
// FINOVA — Holding-Level X-Ray Component
// components/analysis/HoldingsXRayTable.tsx
// ============================================================

import React, { useState } from 'react';
import {
  Search,
  Filter,
  Eye,
  ArrowUpDown,
} from 'lucide-react';
import { formatIndianCurrency, formatPercent } from '@/lib/utils';
import type {
  ConsolidatedInstrumentExposure,
  UnifiedXRayAnalysis,
} from '@/lib/calculations/xray';

interface HoldingsXRayTableProps {
  data: UnifiedXRayAnalysis;
  selectedAssetClassFilter: string;
  selectedSectorFilter: string;
  onSelectAssetClass: (assetClass: string) => void;
  onSelectSector: (sector: string) => void;
  onViewDetailedAnalysis: (instrument: ConsolidatedInstrumentExposure) => void;
}

export function HoldingsXRayTable({
  data,
  selectedAssetClassFilter,
  selectedSectorFilter,
  onSelectAssetClass,
  onSelectSector,
  onViewDetailedAnalysis,
}: HoldingsXRayTableProps) {
  const { consolidated_instruments, broker_breakdown, asset_class_breakdown, sector_breakdown } =
    data;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrokerFilter, setSelectedBrokerFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'weight' | 'value' | 'pnl' | 'name'>('weight');
  const [sortAsc, setSortAsc] = useState(false);

  // Filter instruments
  const filtered = consolidated_instruments.filter((inst) => {
    // 1. Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSymbol = inst.symbol.toLowerCase().includes(q);
      const matchName = inst.name.toLowerCase().includes(q);
      const matchIsin = inst.isin?.toLowerCase().includes(q);
      if (!matchSymbol && !matchName && !matchIsin) return false;
    }

    // 2. Broker filter
    if (selectedBrokerFilter !== 'all') {
      const hasBroker = inst.contributions.some(
        (c) => c.broker_account_id === selectedBrokerFilter
      );
      if (!hasBroker) return false;
    }

    // 3. Asset class filter
    if (selectedAssetClassFilter !== 'all') {
      if (inst.asset_class !== selectedAssetClassFilter) return false;
    }

    // 4. Sector filter
    if (selectedSectorFilter !== 'all') {
      const s = inst.sector || 'Unclassified';
      if (s.toLowerCase() !== selectedSectorFilter.toLowerCase()) return false;
    }

    return true;
  });

  // Sort instruments
  const sorted = [...filtered].sort((a, b) => {
    let comparison = 0;
    if (sortBy === 'weight') {
      comparison = b.percentage_of_valued_portfolio - a.percentage_of_valued_portfolio;
    } else if (sortBy === 'value') {
      const valA = a.current_value ?? a.total_invested_value;
      const valB = b.current_value ?? b.total_invested_value;
      comparison = valB - valA;
    } else if (sortBy === 'pnl') {
      const pnlA = a.current_value !== null ? a.current_value - a.total_invested_value : -9999999;
      const pnlB = b.current_value !== null ? b.current_value - b.total_invested_value : -9999999;
      comparison = pnlB - pnlA;
    } else if (sortBy === 'name') {
      comparison = a.name.localeCompare(b.name);
    }
    return sortAsc ? -comparison : comparison;
  });

  function toggleSort(field: typeof sortBy) {
    if (sortBy === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(field);
      setSortAsc(false);
    }
  }

  return (
    <div className="card p-5 space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-foreground">Holding-Level Portfolio X-Ray</h2>
            <span className="text-[11px] px-2 py-0.5 rounded font-semibold bg-brand-500/10 text-brand-500">
              {filtered.length} of {consolidated_instruments.length} Holdings Shown
            </span>
          </div>
          <p className="text-xs text-muted mt-0.5">
            Consolidated instrument positions, broker provenance, valuation metrics, and news outlook.
          </p>
        </div>

        {/* Clear Filters Button if any active */}
        {(selectedAssetClassFilter !== 'all' ||
          selectedSectorFilter !== 'all' ||
          selectedBrokerFilter !== 'all' ||
          searchQuery.trim() !== '') && (
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedBrokerFilter('all');
              onSelectAssetClass('all');
              onSelectSector('all');
            }}
            className="text-xs text-brand-500 hover:underline inline-flex items-center gap-1 self-start md:self-auto"
          >
            <Filter className="w-3 h-3" />
            <span>Clear all filters</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Search symbol, name, ISIN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-border bg-surface text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        {/* Asset Class Filter */}
        <select
          value={selectedAssetClassFilter}
          onChange={(e) => onSelectAssetClass(e.target.value)}
          className="text-xs px-2.5 py-2 rounded-lg border border-border bg-surface text-foreground"
        >
          <option value="all">All Asset Classes</option>
          {asset_class_breakdown
            .filter((a) => a.invested_value > 0)
            .map((a) => (
              <option key={a.asset_class} value={a.asset_class}>
                {a.display_name}
              </option>
            ))}
        </select>

        {/* Sector Filter */}
        <select
          value={selectedSectorFilter}
          onChange={(e) => onSelectSector(e.target.value)}
          className="text-xs px-2.5 py-2 rounded-lg border border-border bg-surface text-foreground"
        >
          <option value="all">All Sectors</option>
          {sector_breakdown
            .filter((s) => s.invested_value > 0)
            .map((s) => (
              <option key={s.sector} value={s.sector}>
                {s.sector}
              </option>
            ))}
        </select>

        {/* Broker Filter */}
        <select
          value={selectedBrokerFilter}
          onChange={(e) => setSelectedBrokerFilter(e.target.value)}
          className="text-xs px-2.5 py-2 rounded-lg border border-border bg-surface text-foreground"
        >
          <option value="all">All Brokers ({broker_breakdown.length})</option>
          {broker_breakdown.map((b) => (
            <option key={b.broker_account_id} value={b.broker_account_id}>
              {b.broker_name}
            </option>
          ))}
        </select>
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-xs">
          <thead className="bg-muted/10 text-muted uppercase tracking-wider text-[10px] border-b border-border">
            <tr>
              <th
                className="py-3 px-4 cursor-pointer hover:text-foreground"
                onClick={() => toggleSort('name')}
              >
                <div className="flex items-center gap-1">
                  <span>Instrument</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-3">Asset / Sector</th>
              <th className="py-3 px-3 text-center">Brokers</th>
              <th className="py-3 px-3 text-right">Qty &amp; Avg Cost</th>
              <th className="py-3 px-3 text-right">Price &amp; Quote Status</th>
              <th
                className="py-3 px-3 text-right cursor-pointer hover:text-foreground"
                onClick={() => toggleSort('value')}
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Market Value</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                className="py-3 px-3 text-right cursor-pointer hover:text-foreground"
                onClick={() => toggleSort('pnl')}
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Unrealized P&amp;L</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                className="py-3 px-3 text-right cursor-pointer hover:text-foreground"
                onClick={() => toggleSort('weight')}
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Weight</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-4 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {sorted.map((inst) => {
              const avgBuyPrice =
                inst.total_quantity > 0
                  ? inst.total_invested_value / inst.total_quantity
                  : 0;

              const pnl =
                inst.current_value !== null
                  ? inst.current_value - inst.total_invested_value
                  : null;

              const pnlPct =
                inst.current_value !== null && inst.total_invested_value > 0
                  ? ((inst.current_value - inst.total_invested_value) /
                      inst.total_invested_value) *
                    100
                  : null;

              const isHighConcentration =
                inst.percentage_of_valued_portfolio >= 25;
              const isModerateConcentration =
                inst.percentage_of_valued_portfolio >= 15 &&
                inst.percentage_of_valued_portfolio < 25;

              return (
                <tr
                  key={inst.canonical_key}
                  className="hover:bg-muted/5 transition-colors"
                >
                  {/* Instrument Name & ISIN */}
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-semibold text-foreground">{inst.name}</p>
                      <div className="flex items-center gap-1.5 text-[11px] text-muted">
                        <span className="font-mono font-medium">{inst.symbol}</span>
                        {inst.isin && (
                          <>
                            <span>•</span>
                            <span className="font-mono text-[10px]">{inst.isin}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Asset & Sector */}
                  <td className="py-3 px-3">
                    <div className="space-y-0.5">
                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-muted/10 text-foreground uppercase">
                        {inst.asset_class}
                      </span>
                      <p className="text-[11px] text-muted truncate max-w-[130px]">
                        {inst.sector || 'Unclassified'}
                      </p>
                    </div>
                  </td>

                  {/* Broker Badges */}
                  <td className="py-3 px-3 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        inst.broker_count > 1
                          ? 'bg-brand-500/20 text-brand-600 dark:text-brand-300 border border-brand-500/30'
                          : 'bg-muted/20 text-muted'
                      }`}
                      title={inst.broker_names.join(', ')}
                    >
                      {inst.broker_count}{' '}
                      {inst.broker_count > 1 ? 'Overlaps' : 'Broker'}
                    </span>
                  </td>

                  {/* Qty & Avg Buy */}
                  <td className="py-3 px-3 text-right font-mono">
                    <p className="font-medium text-foreground">{inst.total_quantity}</p>
                    <p className="text-[10px] text-muted">
                      Avg: {formatIndianCurrency(avgBuyPrice)}
                    </p>
                  </td>

                  {/* Price & Quote Status */}
                  <td className="py-3 px-3 text-right font-mono">
                    {inst.current_price !== null ? (
                      <div>
                        <p className="font-semibold text-foreground">
                          {formatIndianCurrency(inst.current_price)}
                        </p>
                        <p className="text-[10px] text-gain font-sans">Active quote</p>
                      </div>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-sans bg-warning/10 text-warning border border-warning/20">
                        Unquoted
                      </span>
                    )}
                  </td>

                  {/* Market Value */}
                  <td className="py-3 px-3 text-right font-mono">
                    <p className="font-semibold text-foreground">
                      {inst.current_value !== null
                        ? formatIndianCurrency(inst.current_value)
                        : formatIndianCurrency(inst.total_invested_value)}
                    </p>
                    <p className="text-[10px] text-muted">
                      Inv: {formatIndianCurrency(inst.total_invested_value)}
                    </p>
                  </td>

                  {/* Unrealized P&L */}
                  <td className="py-3 px-3 text-right font-mono">
                    {pnl !== null ? (
                      <div>
                        <span
                          className={`font-semibold ${
                            pnl >= 0 ? 'text-gain' : 'text-loss'
                          }`}
                        >
                          {pnl >= 0 ? '+' : ''}
                          {formatIndianCurrency(pnl)}
                        </span>
                        <p
                          className={`text-[10px] font-semibold ${
                            pnl >= 0 ? 'text-gain' : 'text-loss'
                          }`}
                        >
                          ({formatPercent(pnlPct || 0)})
                        </p>
                      </div>
                    ) : (
                      <span className="text-[11px] text-muted italic font-sans">—</span>
                    )}
                  </td>

                  {/* Weight & Concentration Flag */}
                  <td className="py-3 px-3 text-right font-mono">
                    <p className="font-bold text-brand-500">
                      {inst.is_quoted
                        ? `${inst.percentage_of_valued_portfolio.toFixed(1)}%`
                        : '—'}
                    </p>
                    {isHighConcentration && (
                      <span className="text-[9px] px-1 rounded font-sans font-semibold bg-loss/10 text-loss">
                        High Conc
                      </span>
                    )}
                    {isModerateConcentration && (
                      <span className="text-[9px] px-1 rounded font-sans font-semibold bg-warning/10 text-warning">
                        Mod Conc
                      </span>
                    )}
                  </td>

                  {/* View Detailed Analysis Action Button */}
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => onViewDetailedAnalysis(inst)}
                      className="px-2.5 py-1.5 rounded-lg border border-brand-500/30 bg-brand-500/10 text-brand-600 dark:text-brand-400 hover:bg-brand-500/20 text-[11px] font-semibold inline-flex items-center gap-1 transition-colors"
                      title="View Detailed Analysis"
                    >
                      <Eye className="w-3 h-3" />
                      <span>X-Ray Deep Dive</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View (Responsive, No Overflow) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:hidden">
        {sorted.map((inst) => {
          const pnl =
            inst.current_value !== null
              ? inst.current_value - inst.total_invested_value
              : null;
          const pnlPct =
            inst.current_value !== null && inst.total_invested_value > 0
              ? ((inst.current_value - inst.total_invested_value) /
                  inst.total_invested_value) *
                100
              : null;

          return (
            <div
              key={inst.canonical_key}
              className="p-3.5 rounded-xl border border-border bg-surface/50 space-y-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">{inst.name}</p>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted font-mono">
                    <span>{inst.symbol}</span>
                    <span>•</span>
                    <span className="uppercase">{inst.asset_class}</span>
                  </div>
                </div>

                <span className="text-xs font-bold font-mono text-brand-500">
                  {inst.percentage_of_valued_portfolio.toFixed(1)}%
                </span>
              </div>

              <div className="pt-2 border-t border-border/60 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted">Current Value:</span>
                  <span className="font-mono font-semibold text-foreground">
                    {inst.current_value !== null
                      ? formatIndianCurrency(inst.current_value)
                      : formatIndianCurrency(inst.total_invested_value)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Unrealized P&amp;L:</span>
                  <span
                    className={`font-mono font-semibold ${
                      pnl !== null && pnl >= 0 ? 'text-gain' : 'text-loss'
                    }`}
                  >
                    {pnl !== null
                      ? `${pnl >= 0 ? '+' : ''}${formatIndianCurrency(pnl)} (${formatPercent(
                          pnlPct || 0
                        )})`
                      : 'Unquoted'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Brokers:</span>
                  <span className="font-medium text-foreground">
                    {inst.broker_names.join(', ')}
                  </span>
                </div>
              </div>

              <button
                onClick={() => onViewDetailedAnalysis(inst)}
                className="w-full mt-2 py-2 rounded-lg border border-brand-500/30 bg-brand-500/10 text-brand-600 dark:text-brand-400 font-semibold text-xs inline-flex items-center justify-center gap-1.5"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>View Detailed Analysis</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
