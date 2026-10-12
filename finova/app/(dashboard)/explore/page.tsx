import type { Metadata } from 'next';
import { Suspense } from 'react';
import { InvestmentExplorerHub } from '@/components/explorer/InvestmentExplorerHub';
import { Compass, Sparkles } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Investment Explorer — FINOVA',
  description:
    'Advanced Indian market discovery, interactive stock charts, market indices, sectors, commodities, and investment research.',
};

export default function ExplorePage() {
  return (
    <div className="page-container space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/50 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Compass className="w-5 h-5" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              Investment Explorer
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Market Discovery
            </span>
          </div>
          <p className="text-sm text-muted mt-1.5 max-w-3xl">
            Explore major Indian market indices, interactive historical price charts (1D to MAX), sector breakdowns, verified fundamentals, precious metals, and cross-feature intelligence.
          </p>
        </div>
      </div>

      {/* Main Explorer Hub with Suspense */}
      <Suspense
        fallback={
          <div className="p-12 text-center text-xs text-muted flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
            Loading Investment Explorer...
          </div>
        }
      >
        <InvestmentExplorerHub />
      </Suspense>
    </div>
  );
}
