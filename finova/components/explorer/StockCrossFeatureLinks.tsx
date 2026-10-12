'use client';

import React from 'react';
import Link from 'next/link';
import {
  Compass,
  PieChart,
  ShieldAlert,
  Newspaper,
  ChevronRight,
  ArrowUpRight,
} from 'lucide-react';

interface StockCrossFeatureLinksProps {
  symbol: string;
  name?: string;
}

export function StockCrossFeatureLinks({ symbol }: StockCrossFeatureLinksProps) {
  return (
    <div className="bg-card/70 border border-border/70 rounded-2xl p-5 backdrop-blur-sm space-y-4">
      <div className="flex items-center justify-between border-b border-border/40 pb-3">
        <h4 className="text-sm font-bold text-foreground tracking-tight flex items-center gap-2">
          <span>FINOVA Intelligence Suite</span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Cross-Feature Connected
          </span>
        </h4>
        <span className="text-[11px] text-muted">Active context: {symbol}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Link 1: Investment X-Ray */}
        <Link
          href="/analysis"
          className="p-3.5 rounded-xl bg-surface-raised hover:bg-surface border border-border hover:border-brand/40 transition group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between text-muted group-hover:text-emerald-400 transition">
              <PieChart className="w-4 h-4 text-emerald-400" />
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
            <h5 className="font-bold text-xs text-foreground mt-2 group-hover:text-emerald-400 transition">
              Investment X-Ray
            </h5>
            <p className="text-[11px] text-muted mt-1 leading-snug">
              Inspect existing portfolio exposure, concentration caps, and asset class weights.
            </p>
          </div>
          <div className="mt-3 text-[10px] font-semibold text-emerald-400 flex items-center gap-0.5">
            <span>View My Exposure</span>
            <ChevronRight className="w-3 h-3" />
          </div>
        </Link>

        {/* Link 2: Risk Radar */}
        <Link
          href="/risk"
          className="p-3.5 rounded-xl bg-surface-raised hover:bg-surface border border-border hover:border-amber-500/40 transition group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between text-muted group-hover:text-amber-500 transition">
              <ShieldAlert className="w-4 h-4 text-amber-500" />
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
            <h5 className="font-bold text-xs text-foreground mt-2 group-hover:text-amber-500 transition">
              Risk Radar
            </h5>
            <p className="text-[11px] text-muted mt-1 leading-snug">
              Evaluate portfolio concentration risk, beta sensitivity, and stress scenarios.
            </p>
          </div>
          <div className="mt-3 text-[10px] font-semibold text-amber-500 flex items-center gap-0.5">
            <span>Analyze Portfolio Risk</span>
            <ChevronRight className="w-3 h-3" />
          </div>
        </Link>

        {/* Link 3: Future Lab */}
        <Link
          href="/future-lab"
          className="p-3.5 rounded-xl bg-surface-raised hover:bg-surface border border-border hover:border-cyan-500/40 transition group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between text-muted group-hover:text-cyan-500 transition">
              <Compass className="w-4 h-4 text-cyan-500" />
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
            <h5 className="font-bold text-xs text-foreground mt-2 group-hover:text-cyan-500 transition">
              Future Lab
            </h5>
            <p className="text-[11px] text-muted mt-1 leading-snug">
              Simulate hypothetical capital allocation strategies before committing funds.
            </p>
          </div>
          <div className="mt-3 text-[10px] font-semibold text-cyan-500 flex items-center gap-0.5">
            <span>Explore Scenario</span>
            <ChevronRight className="w-3 h-3" />
          </div>
        </Link>

        {/* Link 4: FINOVA Intelligence */}
        <Link
          href={`/insights?q=${encodeURIComponent(symbol)}`}
          className="p-3.5 rounded-xl bg-surface-raised hover:bg-surface border border-border hover:border-rose-500/40 transition group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between text-muted group-hover:text-rose-500 transition">
              <Compass className="w-4 h-4 text-rose-500" />
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
            <h5 className="font-bold text-xs text-foreground mt-2 group-hover:text-rose-500 transition">
              FINOVA Intelligence
            </h5>
            <p className="text-[11px] text-muted mt-1 leading-snug">
              Ask AI about risk drivers, business moat, earnings catalysts, and sector outlook.
            </p>
          </div>
          <div className="mt-3 text-[10px] font-semibold text-rose-500 flex items-center gap-0.5">
            <span>Ask FINOVA</span>
            <ChevronRight className="w-3 h-3" />
          </div>
        </Link>

        {/* Link 5: Market News */}
        <Link
          href={`/news?symbol=${encodeURIComponent(symbol)}`}
          className="p-3.5 rounded-xl bg-surface-raised hover:bg-surface border border-border hover:border-violet-500/40 transition group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between text-muted group-hover:text-violet-400 transition">
              <Newspaper className="w-4 h-4 text-violet-400" />
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
            <h5 className="font-bold text-xs text-foreground mt-2 group-hover:text-violet-400 transition">
              News & Market
            </h5>
            <p className="text-[11px] text-muted mt-1 leading-snug">
              Read verified macroeconomic, RBI policy, and sector headlines across connected feeds.
            </p>
          </div>
          <div className="mt-3 text-[10px] font-semibold text-violet-400 flex items-center gap-0.5">
            <span>Related News</span>
            <ChevronRight className="w-3 h-3" />
          </div>
        </Link>
      </div>
    </div>
  );
}
