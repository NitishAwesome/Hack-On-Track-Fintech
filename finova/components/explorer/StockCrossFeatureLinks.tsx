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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Link 1: Investment X-Ray */}
        <Link
          href="/analysis"
          className="p-3.5 rounded-xl bg-zinc-900/60 hover:bg-zinc-800 border border-border/60 hover:border-emerald-500/40 transition group flex flex-col justify-between"
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

        {/* Link 2: Future Lab */}
        <Link
          href="/future-lab"
          className="p-3.5 rounded-xl bg-zinc-900/60 hover:bg-zinc-800 border border-border/60 hover:border-cyan-500/40 transition group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between text-muted group-hover:text-cyan-400 transition">
              <Compass className="w-4 h-4 text-cyan-400" />
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
            <h5 className="font-bold text-xs text-foreground mt-2 group-hover:text-cyan-400 transition">
              Future Lab
            </h5>
            <p className="text-[11px] text-muted mt-1 leading-snug">
              Simulate hypothetical capital allocation strategies before committing live funds.
            </p>
          </div>
          <div className="mt-3 text-[10px] font-semibold text-cyan-400 flex items-center gap-0.5">
            <span>Simulate Allocation</span>
            <ChevronRight className="w-3 h-3" />
          </div>
        </Link>

        {/* Link 3: Risk Radar */}
        <Link
          href="/risk"
          className="p-3.5 rounded-xl bg-zinc-900/60 hover:bg-zinc-800 border border-border/60 hover:border-amber-500/40 transition group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between text-muted group-hover:text-amber-400 transition">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
            <h5 className="font-bold text-xs text-foreground mt-2 group-hover:text-amber-400 transition">
              Risk Radar
            </h5>
            <p className="text-[11px] text-muted mt-1 leading-snug">
              Evaluate portfolio Value at Risk (VaR), beta sensitivity, and macro stress scenarios.
            </p>
          </div>
          <div className="mt-3 text-[10px] font-semibold text-amber-400 flex items-center gap-0.5">
            <span>Understand Risk</span>
            <ChevronRight className="w-3 h-3" />
          </div>
        </Link>

        {/* Link 4: Market News */}
        <Link
          href="/news"
          className="p-3.5 rounded-xl bg-zinc-900/60 hover:bg-zinc-800 border border-border/60 hover:border-violet-500/40 transition group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between text-muted group-hover:text-violet-400 transition">
              <Newspaper className="w-4 h-4 text-violet-400" />
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
            <h5 className="font-bold text-xs text-foreground mt-2 group-hover:text-violet-400 transition">
              Financial News Feed
            </h5>
            <p className="text-[11px] text-muted mt-1 leading-snug">
              Read verified macroeconomic, RBI policy, and sector headlines across 3 news feeds.
            </p>
          </div>
          <div className="mt-3 text-[10px] font-semibold text-violet-400 flex items-center gap-0.5">
            <span>Explore Market News</span>
            <ChevronRight className="w-3 h-3" />
          </div>
        </Link>
      </div>
    </div>
  );
}
