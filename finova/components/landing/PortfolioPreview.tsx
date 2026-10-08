'use client';

import React, { useState } from 'react';
import { TrendingUp, ShieldCheck, PieChart } from 'lucide-react';

export function PortfolioPreview() {
  const [activeTab, setActiveTab] = useState<'1M' | '3M' | '1Y'>('1Y');

  return (
    <div
      className="relative rounded-2xl border transition-all duration-300 select-none overflow-hidden"
      style={{
        backgroundColor: 'rgb(var(--surface))',
        borderColor: 'rgb(var(--border))',
        boxShadow: 'var(--shadow-raised)',
      }}
    >
      {/* Top Banner with Sample Portfolio badge */}
      <div
        className="flex items-center justify-between px-5 py-3 border-b text-xs"
        style={{
          borderColor: 'rgb(var(--border))',
          backgroundColor: 'rgb(var(--surface-raised))',
        }}
      >
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold tracking-wide text-foreground">Finova Portfolio Hub</span>
        </div>
        <span
          className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border"
          style={{
            backgroundColor: 'rgb(var(--surface))',
            borderColor: 'rgb(var(--border))',
            color: 'rgb(var(--muted))',
          }}
        >
          Sample Portfolio
        </span>
      </div>

      <div className="p-5 sm:p-6 space-y-5">
        {/* Metric Summary */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
              Total Portfolio Value
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground tabular-nums">
                ₹24,86,420
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:items-end">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
              Total Returns
            </span>
            <div className="flex items-center gap-1.5 mt-1 font-semibold text-xs sm:text-sm text-gain tabular-nums">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+₹2,21,400</span>
              <span className="px-1.5 py-0.2 rounded text-[11px] font-bold bg-gain-bg text-gain">
                +9.78%
              </span>
            </div>
          </div>
        </div>

        {/* Portfolio Area Curve */}
        <div className="relative pt-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-medium text-muted">Growth Trajectory</span>
            <div className="flex items-center gap-1">
              {(['1M', '3M', '1Y'] as const).map((period) => (
                <button
                  key={period}
                  type="button"
                  onClick={() => setActiveTab(period)}
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded transition-colors ${
                    activeTab === period
                      ? 'bg-brand text-white'
                      : 'text-muted hover:text-foreground'
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>

          <svg viewBox="0 0 400 110" className="w-full h-24 sm:h-28 overflow-visible" fill="none">
            <defs>
              <linearGradient id="heroChartGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgb(var(--brand-500))" stopOpacity="0.25" />
                <stop offset="100%" stopColor="rgb(var(--brand-500))" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Subtle Grid Lines */}
            <line x1="0" y1="25" x2="400" y2="25" stroke="rgb(var(--border))" strokeDasharray="3 3" opacity="0.6" />
            <line x1="0" y1="70" x2="400" y2="70" stroke="rgb(var(--border))" strokeDasharray="3 3" opacity="0.6" />

            {/* Area Fill */}
            <path
              d="M 0 95 C 45 90, 80 82, 120 75 C 160 68, 200 80, 240 55 C 280 32, 330 40, 400 15 L 400 110 L 0 110 Z"
              fill="url(#heroChartGrad)"
            />

            {/* Curve Stroke */}
            <path
              d="M 0 95 C 45 90, 80 82, 120 75 C 160 68, 200 80, 240 55 C 280 32, 330 40, 400 15"
              stroke="rgb(var(--brand-500))"
              strokeWidth="2.5"
              strokeLinecap="round"
            />

            {/* Active Point Indicator */}
            <circle cx="400" cy="15" r="4.5" fill="rgb(var(--brand-500))" />
            <circle cx="400" cy="15" r="8" stroke="rgb(var(--brand-500))" strokeWidth="1.5" opacity="0.4" />
          </svg>
        </div>

        {/* Multi-Asset Allocation Bar */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-[11px] font-semibold">
            <span className="text-muted flex items-center gap-1.5">
              <PieChart className="w-3.5 h-3.5 text-brand" />
              <span>Multi-Asset Allocation</span>
            </span>
            <span className="text-muted text-[10px]">4 Asset Classes</span>
          </div>

          {/* Segmented bar */}
          <div className="h-2.5 w-full rounded-full overflow-hidden flex bg-surface-raised gap-0.5">
            <div className="h-full bg-blue-500" style={{ width: '52%' }} title="Stocks: 52%" />
            <div className="h-full bg-teal-500" style={{ width: '18%' }} title="REITs: 18%" />
            <div className="h-full bg-indigo-500" style={{ width: '15%' }} title="InvITs: 15%" />
            <div className="h-full bg-amber-500" style={{ width: '15%' }} title="Bonds: 15%" />
          </div>

          {/* Asset legend with percentages */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
              <span className="text-muted">Stocks</span>
              <span className="font-semibold text-foreground ml-auto">52%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-teal-500 flex-shrink-0" />
              <span className="text-muted">REITs</span>
              <span className="font-semibold text-foreground ml-auto">18%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0" />
              <span className="text-muted">InvITs</span>
              <span className="font-semibold text-foreground ml-auto">15%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
              <span className="text-muted">Bonds</span>
              <span className="font-semibold text-foreground ml-auto">15%</span>
            </div>
          </div>
        </div>

        {/* Portfolio Health Score Footer */}
        <div
          className="p-3 rounded-xl border flex items-center justify-between text-xs"
          style={{
            backgroundColor: 'rgb(var(--surface-raised))',
            borderColor: 'rgb(var(--border))',
          }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-brand/10 text-brand">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Portfolio Health</p>
              <p className="text-[10px] text-muted">Balanced across asset classes</p>
            </div>
          </div>

          <div className="flex items-baseline gap-1 text-right">
            <span className="text-base font-bold text-foreground tabular-nums">72</span>
            <span className="text-[11px] text-muted font-medium">/ 100</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PortfolioPreview;
