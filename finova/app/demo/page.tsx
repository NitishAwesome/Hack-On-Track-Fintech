'use client';

// ============================================================
// FINOVA — Read-Only Demo Investor Experience (Prompt 16)
// app/demo/page.tsx
//
// Zero-friction, fully isolated, read-only hackathon demonstration.
// Operates strictly in-memory using deterministic fixtures.
// Never accesses Supabase private user data, never mutates database rows.
// Persistent banner: "Demo Portfolio — Illustrative Data"
// ============================================================

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  Lock,
  AlertTriangle,
  Calculator,
  Compass,
} from 'lucide-react';
import { FinovaLogo } from '@/components/shared/FinovaLogo';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { AlternativeInvestmentExplorer } from '@/components/explorer/AlternativeInvestmentExplorer';
import { DEMO_BROKERS, DEMO_HOLDINGS } from '@/lib/demoData';
import { enrichHolding, roundCurrency, roundPercent } from '@/lib/calculations/portfolio';
import { computeUnifiedXRay } from '@/lib/calculations/xray';
import { formatIndianCurrency } from '@/lib/utils';

type DemoTab = 'overview' | 'holdings' | 'xray' | 'education';

export default function DemoPage() {
  const [activeTab, setActiveTab] = useState<DemoTab>('overview');
  const [holdingSearch, setHoldingSearch] = useState('');
  const [selectedAssetFilter, setSelectedAssetFilter] = useState<string>('ALL');

  // 1. Enrich raw demo holdings with calculated metrics
  const enrichedHoldings = useMemo(() => {
    return DEMO_HOLDINGS.map(enrichHolding);
  }, []);

  // 2. Compute summary metrics deterministically
  const summary = useMemo(() => {
    let totalInvested = 0;
    let totalCurrent = 0;
    let pricedCount = 0;

    for (const h of enrichedHoldings) {
      totalInvested += h.invested_value;
      if (h.current_value !== null) {
        totalCurrent += h.current_value;
        pricedCount++;
      }
    }

    const unrealizedPnL = totalCurrent - totalInvested;
    const unrealizedPnLPct = totalInvested > 0 ? (unrealizedPnL / totalInvested) * 100 : 0;

    return {
      totalInvested: roundCurrency(totalInvested),
      totalCurrent: roundCurrency(totalCurrent),
      unrealizedPnL: roundCurrency(unrealizedPnL),
      unrealizedPnLPct: roundPercent(unrealizedPnLPct),
      positionsCount: enrichedHoldings.length,
      pricedCount,
      coveragePct: roundPercent((pricedCount / enrichedHoldings.length) * 100),
    };
  }, [enrichedHoldings]);

  // 3. Compute X-Ray overlap & concentration
  const xray = useMemo(() => {
    return computeUnifiedXRay(enrichedHoldings, DEMO_BROKERS);
  }, [enrichedHoldings]);

  // 4. Asset allocation for demo portfolio
  const assetAllocation = useMemo(() => {
    const map = new Map<string, { value: number; count: number }>();
    for (const h of enrichedHoldings) {
      const cls = h.asset_class || 'other';
      const existing = map.get(cls) || { value: 0, count: 0 };
      existing.value += h.current_value || h.invested_value;
      existing.count += 1;
      map.set(cls, existing);
    }

    const totalVal = summary.totalCurrent;
    return Array.from(map.entries()).map(([cls, data]) => ({
      assetClass: cls,
      value: roundCurrency(data.value),
      count: data.count,
      pct: totalVal > 0 ? roundPercent((data.value / totalVal) * 100) : 0,
    })).sort((a, b) => b.value - a.value);
  }, [enrichedHoldings, summary]);

  // Filtered holdings
  const filteredHoldings = useMemo(() => {
    return enrichedHoldings.filter((h) => {
      const matchesSearch =
        h.name.toLowerCase().includes(holdingSearch.toLowerCase()) ||
        h.symbol.toLowerCase().includes(holdingSearch.toLowerCase());
      const matchesAsset =
        selectedAssetFilter === 'ALL' || h.asset_class.toUpperCase() === selectedAssetFilter;
      return matchesSearch && matchesAsset;
    });
  }, [enrichedHoldings, holdingSearch, selectedAssetFilter]);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground antialiased selection:bg-brand/20">
      {/* 1. PERSISTENT DEMO DISCLAIMER BANNER */}
      <div className="bg-amber-500/10 border-b border-amber-500/25 px-4 py-2.5 text-xs text-amber-500 flex flex-wrap items-center justify-between gap-2 z-50">
        <div className="flex items-center gap-2 font-medium">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
          <span className="font-bold tracking-wide uppercase text-[11px]">Demo Portfolio — Illustrative Data</span>
          <span className="text-muted/60 hidden md:inline">|</span>
          <span className="text-foreground/80 hidden md:inline">
            Isolated read-only mode for Hack on Track evaluation. No real personal records are accessed or modified.
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/register"
            className="font-semibold underline hover:text-amber-400 text-[11px] transition-colors"
          >
            Create Personal Account →
          </Link>
          <Link
            href="/"
            className="text-muted hover:text-foreground text-[11px] transition-colors"
          >
            Exit to Home
          </Link>
        </div>
      </div>

      {/* 2. DEMO TOP NAVIGATION */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-surface/85 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <FinovaLogo size="md" variant="horizontal" href="/" />
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-raised border border-border text-[11px] font-semibold text-muted">
              <Compass className="w-3.5 h-3.5 text-brand" />
              <span>Interactive Evaluation Hub</span>
            </div>
          </div>

          {/* Tab Navigation Buttons */}
          <nav className="flex items-center gap-1 bg-surface-raised p-1 rounded-xl border border-border">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'overview'
                  ? 'bg-brand text-white shadow-xs'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('holdings')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'holdings'
                  ? 'bg-brand text-white shadow-xs'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              Holdings
            </button>
            <button
              onClick={() => setActiveTab('xray')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'xray'
                  ? 'bg-brand text-white shadow-xs'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              Overlap X-Ray
            </button>
            <button
              onClick={() => setActiveTab('education')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'education'
                  ? 'bg-brand text-white shadow-xs'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              REIT & Bond Terminal
            </button>
          </nav>

          <div className="flex items-center gap-2.5">
            <ThemeToggle />
            <Link
              href="/login"
              className="hidden sm:inline-flex px-3.5 py-1.5 rounded-xl border border-border text-xs font-semibold hover:bg-surface-raised transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </header>

      {/* 3. MAIN DEMO CONTENT */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* TAB 1: OVERVIEW & DASHBOARD */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Top Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="card p-5 border border-border bg-surface space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                  Total Portfolio Value
                </span>
                <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground tabular-nums">
                  {formatIndianCurrency(summary.totalCurrent)}
                </div>
                <div className="text-[11px] text-gain flex items-center gap-1 font-semibold">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>+{formatIndianCurrency(summary.unrealizedPnL)} ({summary.unrealizedPnLPct}%)</span>
                </div>
              </div>

              <div className="card p-5 border border-border bg-surface space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                  Total Invested Capital
                </span>
                <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground tabular-nums">
                  {formatIndianCurrency(summary.totalInvested)}
                </div>
                <span className="text-[11px] text-muted">
                  Across 3 tracked broker accounts
                </span>
              </div>

              <div className="card p-5 border border-border bg-surface space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                  Tracked Brokers & Depositories
                </span>
                <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground tabular-nums">
                  3 Accounts
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-muted">
                  <span className="inline-block w-2 h-2 rounded-full bg-blue-500" /> Zerodha
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 ml-1" /> Groww
                  <span className="inline-block w-2 h-2 rounded-full bg-purple-500 ml-1" /> ICICI/CDSL
                </div>
              </div>

              <div className="card p-5 border border-border bg-surface space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                  Valuation Coverage
                </span>
                <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground tabular-nums">
                  {summary.coveragePct}%
                </div>
                <span className="text-[11px] text-muted">
                  {summary.pricedCount} of {summary.positionsCount} positions live quoted
                </span>
              </div>
            </div>

            {/* Asset Allocation & Broker Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Asset Allocation Breakdown */}
              <div className="lg:col-span-7 card p-6 border border-border bg-surface space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-foreground">Asset Class Diversification</h3>
                    <p className="text-xs text-muted">Multi-asset exposure beyond traditional equities</p>
                  </div>
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-surface-raised border border-border text-muted">
                    {assetAllocation.length} Asset Classes
                  </span>
                </div>

                <div className="space-y-3.5">
                  {assetAllocation.map((item) => (
                    <div key={item.assetClass} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-foreground capitalize">
                          {item.assetClass === 'reit'
                            ? 'Real Estate (REITs)'
                            : item.assetClass === 'invit'
                            ? 'Infrastructure (InvITs)'
                            : item.assetClass === 'bond'
                            ? 'Govt & Corporate Bonds'
                            : item.assetClass === 'sgb'
                            ? 'Sovereign Gold Bonds'
                            : item.assetClass}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-muted">{formatIndianCurrency(item.value)}</span>
                          <span className="font-bold text-brand tabular-nums">{item.pct}%</span>
                        </div>
                      </div>
                      <div className="w-full h-2 rounded-full bg-surface-raised overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-brand-600 to-brand-400 transition-all duration-500"
                          style={{ width: `${Math.max(item.pct, 4)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Broker Accounts Summary */}
              <div className="lg:col-span-5 card p-6 border border-border bg-surface space-y-5">
                <div>
                  <h3 className="text-base font-bold text-foreground">Tracked Accounts</h3>
                  <p className="text-xs text-muted">Consolidated across multiple brokers and depositories</p>
                </div>

                <div className="space-y-3">
                  {DEMO_BROKERS.map((broker) => {
                    const brokerHoldings = enrichedHoldings.filter(
                      (h) => h.broker_account_id === broker.id
                    );
                    const brokerVal = brokerHoldings.reduce(
                      (acc, h) => acc + (h.current_value || h.invested_value),
                      0
                    );
                    return (
                      <div
                        key={broker.id}
                        className="p-3.5 rounded-xl border border-border bg-surface-raised flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: broker.color_hex }}
                          />
                          <div>
                            <div className="font-semibold text-xs sm:text-sm text-foreground">
                              {broker.broker_name}
                            </div>
                            <div className="text-[11px] text-muted">{broker.account_label}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs sm:text-sm font-bold text-foreground tabular-nums">
                            {formatIndianCurrency(roundCurrency(brokerVal))}
                          </div>
                          <span className="inline-flex text-[10px] font-semibold text-muted bg-surface px-1.5 py-0.5 rounded border border-border">
                            {brokerHoldings.length} positions
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="p-3 rounded-xl border border-border bg-surface text-xs text-muted space-y-1">
                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span>Multi-Broker Data Isolation</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    FINOVA maintains strict internal ledger attribution. Adding accounts never blends tax-lot histories or distorts cost basis.
                  </p>
                </div>
              </div>
            </div>

            {/* AI Educational Insight (Deterministic Grounded Mock) */}
            <div className="card p-6 border border-border bg-gradient-to-br from-surface to-surface-raised space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-brand/10 border border-brand/20 text-brand">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">FINOVA Intelligence Engine</h3>
                  <p className="text-xs text-muted">Deterministic, explainable portfolio analysis</p>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-border bg-surface space-y-2 text-xs text-foreground/90 leading-relaxed">
                <p>
                  <strong>Portfolio Assessment:</strong> Your portfolio has a healthy defensive spine with <strong>18% allocated to REITs and InvITs</strong> and <strong>16% in Sovereign Bonds</strong>. This provides predictable cash flow distributions compared to a 100% equity allocation.
                </p>
                <p className="text-muted">
                  <strong>Risk Note:</strong> You hold Reliance Industries in both your Zerodha Kite and Groww Direct accounts (60 total shares). Check the <em>Overlap X-Ray</em> tab to inspect consolidated company concentration.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MULTI-BROKER HOLDINGS TABLE */}
        {activeTab === 'holdings' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-foreground">Consolidated Holdings</h2>
                <p className="text-xs text-muted">Every asset held across brokers and depositories in one table</p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    type="text"
                    value={holdingSearch}
                    onChange={(e) => setHoldingSearch(e.target.value)}
                    placeholder="Search holdings..."
                    className="pl-8 pr-3 py-1.5 rounded-lg text-xs bg-surface border border-border focus:outline-none focus:border-brand w-48"
                  />
                </div>

                <select
                  value={selectedAssetFilter}
                  onChange={(e) => setSelectedAssetFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg text-xs bg-surface border border-border focus:outline-none focus:border-brand text-foreground"
                >
                  <option value="ALL">All Asset Classes</option>
                  <option value="EQUITY">Equities</option>
                  <option value="REIT">REITs</option>
                  <option value="INVIT">InvITs</option>
                  <option value="BOND">Bonds</option>
                  <option value="SGB">SGBs</option>
                  <option value="ETF">ETFs</option>
                </select>
              </div>
            </div>

            {/* Holdings Table */}
            <div className="card border border-border bg-surface overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-raised border-b border-border text-muted font-semibold">
                    <tr>
                      <th className="px-4 py-3">Security & ISIN</th>
                      <th className="px-4 py-3">Broker Account</th>
                      <th className="px-4 py-3">Asset Class</th>
                      <th className="px-4 py-3 text-right">Qty</th>
                      <th className="px-4 py-3 text-right">Avg Cost</th>
                      <th className="px-4 py-3 text-right">Current Price</th>
                      <th className="px-4 py-3 text-right">Current Value</th>
                      <th className="px-4 py-3 text-right">Return</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredHoldings.map((h) => {
                      const broker = DEMO_BROKERS.find((b) => b.id === h.broker_account_id);
                      const isGain = (h.absolute_return || 0) >= 0;
                      return (
                        <tr key={h.id} className="hover:bg-surface-raised/50 transition-colors">
                          <td className="px-4 py-3.5">
                            <div className="font-semibold text-foreground">{h.name}</div>
                            <div className="text-[11px] text-muted font-mono">{h.symbol} • {h.isin}</div>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-medium bg-surface-raised border-border">
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: broker?.color_hex || '#3B82F6' }}
                              />
                              {broker?.broker_name || 'Broker'}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-surface-raised border border-border text-foreground">
                              {h.asset_class}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right font-medium tabular-nums">{h.quantity}</td>
                          <td className="px-4 py-3.5 text-right tabular-nums">{formatIndianCurrency(h.avg_buy_price)}</td>
                          <td className="px-4 py-3.5 text-right font-semibold tabular-nums">
                            {h.current_price ? formatIndianCurrency(h.current_price) : 'Unquoted'}
                          </td>
                          <td className="px-4 py-3.5 text-right font-bold text-foreground tabular-nums">
                            {h.current_value ? formatIndianCurrency(h.current_value) : formatIndianCurrency(h.invested_value)}
                          </td>
                          <td className={`px-4 py-3.5 text-right font-bold tabular-nums ${isGain ? 'text-gain' : 'text-loss'}`}>
                            {h.absolute_return !== null
                              ? `${isGain ? '+' : ''}${formatIndianCurrency(h.absolute_return)} (${h.absolute_return_pct}%)`
                              : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Read-Only Notice */}
            <div className="p-3.5 rounded-xl border border-border bg-surface-raised flex items-center justify-between text-xs text-muted">
              <span>Looking to add, edit or import tradebook CSVs?</span>
              <span className="inline-flex items-center gap-1 text-foreground font-semibold">
                <Lock className="w-3.5 h-3.5 text-muted" /> Actions Disabled in Demo Mode
              </span>
            </div>
          </div>
        )}

        {/* TAB 3: INVESTMENT X-RAY & OVERLAP */}
        {activeTab === 'xray' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-foreground">Investment X-Ray & Overlap Detection</h2>
              <p className="text-xs text-muted">Discover hidden cross-broker concentration and true exposure</p>
            </div>

            {/* Overlap Alert Card */}
            {xray.overlaps.length > 0 && (
              <div className="p-5 rounded-xl border border-amber-500/30 bg-amber-500/10 space-y-3">
                <div className="flex items-center gap-2 text-amber-500 font-bold text-sm">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>Cross-Broker Overlap Detected</span>
                </div>
                <p className="text-xs text-foreground/90 leading-relaxed">
                  FINOVA detected that you own <strong>{xray.overlaps[0].name} ({xray.overlaps[0].symbol})</strong> in multiple independent broker accounts simultaneously.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {xray.overlaps[0].brokers_breakdown.map((b) => (
                    <div
                      key={b.broker_account_id}
                      className="p-3 rounded-lg border border-border bg-surface text-xs space-y-1"
                    >
                      <div className="font-semibold text-foreground">{b.broker_name}</div>
                      <div className="flex justify-between text-muted text-[11px]">
                        <span>Quantity: <strong>{b.quantity} shares</strong></span>
                        <span>Value: <strong>{b.current_value ? formatIndianCurrency(b.current_value) : '—'}</strong></span>
                      </div>
                      <div className="text-[10px] text-brand font-medium">
                        Represents {b.share_of_instrument_pct}% of total Reliance position
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sector Breakdown */}
            <div className="card p-6 border border-border bg-surface space-y-4">
              <h3 className="text-base font-bold text-foreground">Consolidated Sector Distribution</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {xray.sector_breakdown.map((sec) => (
                  <div
                    key={sec.sector}
                    className="p-3.5 rounded-xl border border-border bg-surface-raised space-y-1"
                  >
                    <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                      <span>{sec.sector}</span>
                      <span className="text-brand tabular-nums">{sec.percentage_of_valued}%</span>
                    </div>
                    <div className="text-[11px] text-muted">
                      {sec.current_value ? formatIndianCurrency(sec.current_value) : '—'} • {sec.instruments_count} position(s)
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: ALTERNATIVE ASSETS EDUCATION TERMINAL */}
        {activeTab === 'education' && (
          <div className="space-y-6">
            <div className="p-4 rounded-xl border border-border bg-surface space-y-1">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Calculator className="w-4 h-4 text-brand" />
                <span>Interactive Alternative Investment Terminal (PS-2 Core)</span>
              </h2>
              <p className="text-xs text-muted">
                Everyday investors can use this interactive terminal to learn about REITs, InvITs, and Bonds, test cash-flow distribution calculators, and take guided knowledge checks.
              </p>
            </div>

            {/* Embedded Pure Interactive Explorer Component */}
            <AlternativeInvestmentExplorer initialCategory="reit" />
          </div>
        )}
      </main>

      {/* 4. DEMO FOOTER */}
      <footer className="border-t border-border bg-surface py-6 text-center text-xs text-muted">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>FINOVA Demo Terminal • Hack on Track 2026</span>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-foreground">Home</Link>
            <Link href="/learn" className="hover:text-foreground">Public Education</Link>
            <Link href="/terms" className="hover:text-foreground">Terms</Link>
            <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
