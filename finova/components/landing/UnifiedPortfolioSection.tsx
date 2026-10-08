'use client';

import React from 'react';
import { Layers, Building2, Zap, Landmark, Banknote, TrendingUp, PieChart, Wallet } from 'lucide-react';

export function UnifiedPortfolioSection() {
  const assetClasses = [
    { name: 'Stocks', icon: TrendingUp, desc: 'Equities & ETFs', color: 'bg-blue-500' },
    { name: 'Mutual Funds', icon: Layers, desc: 'SIP & Lumpsum', color: 'bg-sky-500' },
    { name: 'REITs', icon: Building2, desc: 'Commercial Real Estate', color: 'bg-teal-500' },
    { name: 'InvITs', icon: Zap, desc: 'Power & Highways', color: 'bg-indigo-500' },
    { name: 'Bonds', icon: Landmark, desc: 'G-Secs & Corporate', color: 'bg-amber-500' },
    { name: 'Cash', icon: Banknote, desc: 'Liquid & Balances', color: 'bg-slate-400' },
  ];

  return (
    <section id="investments" className="py-20 sm:py-24 border-b border-border bg-surface-raised/30 select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <p className="text-xs font-bold uppercase tracking-widest text-brand">Holistic Wealth</p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-foreground">
            One portfolio. Every investment.
          </h2>
          <p className="text-sm sm:text-base text-muted max-w-2xl mx-auto leading-relaxed">
            Consolidate traditional equities, mutual funds, alternative yield trusts, and fixed-income assets under a single intuitive pane.
          </p>
        </div>

        {/* 6 Asset Categories Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-12 mb-12">
          {assetClasses.map((cat) => {
            const Icon = cat.icon;
            return (
              <div
                key={cat.name}
                className="p-3.5 rounded-xl border border-border bg-surface text-center flex flex-col items-center justify-center space-y-1.5 shadow-xs"
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-surface-raised text-foreground">
                  <Icon className="w-4 h-4 text-brand" />
                </div>
                <p className="text-xs font-bold text-foreground">{cat.name}</p>
                <p className="text-[10px] text-muted">{cat.desc}</p>
              </div>
            );
          })}
        </div>

        {/* Premium Unified Portfolio Preview Card */}
        <div
          className="max-w-4xl mx-auto rounded-2xl border p-6 sm:p-8"
          style={{
            backgroundColor: 'rgb(var(--surface))',
            borderColor: 'rgb(var(--border))',
            boxShadow: 'var(--shadow-raised)',
          }}
        >
          {/* Header Metric Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pb-6 border-b border-border">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted">
                Portfolio Value
              </p>
              <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground mt-1 tabular-nums">
                ₹24,86,420
              </p>
              <p className="text-[11px] text-muted mt-0.5">Across 3 Connected Depository Sources</p>
            </div>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted">
                Total Net Returns
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gain tabular-nums">
                  +₹2,21,400
                </span>
                <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-gain-bg text-gain">
                  +9.78%
                </span>
              </div>
              <p className="text-[11px] text-muted mt-0.5">Time-weighted annualized rate</p>
            </div>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted">
                Asset Health
              </p>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                  Optimal
                </span>
                <span className="text-xs text-muted font-semibold">(Low cash drag)</span>
              </div>
              <p className="text-[11px] text-muted mt-0.5">6 asset classes utilized</p>
            </div>
          </div>

          {/* Allocation & Broker Breakdown in Two Columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6">
            {/* Left: Asset Class Breakdown */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-foreground">
                <span className="flex items-center gap-1.5">
                  <PieChart className="w-3.5 h-3.5 text-brand" />
                  <span>Asset Allocation Breakdown</span>
                </span>
                <span className="text-muted text-[11px]">100% Total</span>
              </div>

              <div className="space-y-2">
                {[
                  { label: 'Stocks (Direct Equity)', pct: 48, val: '₹11.93L', color: 'bg-blue-500' },
                  { label: 'REITs (Commercial Real Estate)', pct: 18, val: '₹4.47L', color: 'bg-teal-500' },
                  { label: 'InvITs (Infrastructure)', pct: 15, val: '₹3.73L', color: 'bg-indigo-500' },
                  { label: 'Bonds & SGBs', pct: 12, val: '₹2.98L', color: 'bg-amber-500' },
                  { label: 'Mutual Funds & Cash', pct: 7, val: '₹1.75L', color: 'bg-slate-400' },
                ].map((item) => (
                  <div key={item.label} className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-muted">{item.label}</span>
                      <span className="font-semibold text-foreground tabular-nums">
                        {item.val} ({item.pct}%)
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-surface-raised rounded-full overflow-hidden">
                      <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Depository / Broker Distribution */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-foreground">
                <span className="flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5 text-brand" />
                  <span>Broker Distribution</span>
                </span>
                <span className="text-muted text-[11px]">Sample View</span>
              </div>

              <div className="space-y-2.5">
                {[
                  { name: 'Zerodha Kite', tag: 'Direct Equity & ETFs', val: '₹12,40,000', share: '50%' },
                  { name: 'Groww', tag: 'Mutual Funds & SGBs', val: '₹7,80,000', share: '31%' },
                  { name: 'Direct CDSL / NSE', tag: 'InvITs & Physical Bonds', val: '₹4,66,420', share: '19%' },
                ].map((broker) => (
                  <div
                    key={broker.name}
                    className="p-3 rounded-xl border border-border bg-surface-raised/60 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-semibold text-foreground">{broker.name}</p>
                      <p className="text-[10px] text-muted">{broker.tag}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-foreground tabular-nums">{broker.val}</p>
                      <p className="text-[10px] text-muted font-medium">{broker.share}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default UnifiedPortfolioSection;
