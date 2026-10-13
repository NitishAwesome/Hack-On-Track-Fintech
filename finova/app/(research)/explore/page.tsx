import type { Metadata } from 'next';
import { Suspense } from 'react';
import { InvestmentExplorerHub } from '@/components/explorer/InvestmentExplorerHub';
import { Compass } from 'lucide-react';
import { EXPANDED_NSE_STOCKS } from '@/lib/market/stockCatalog';
import { SECTORS, INDEX_IDENTITIES } from '@/lib/research/catalog';

export const metadata: Metadata = {
  title: 'Investment Explorer — FINOVA',
  description:
    'Advanced Indian market discovery, interactive stock charts, market indices, sectors, commodities, and investment research.',
};

export default function ExplorePage() {
  return (
    <div className="page-container space-y-6">
      {/* Page Header */}
      <div
        className="relative rounded-2xl border overflow-hidden px-6 py-5"
        style={{
          background: 'linear-gradient(135deg, rgb(var(--surface)) 0%, rgb(var(--surface-raised)) 100%)',
          borderColor: 'rgb(var(--border))',
        }}
      >
        {/* Subtle grid background */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(rgb(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, rgb(var(--foreground)) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center border shadow-sm"
                style={{
                  background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(6,182,212,0.1))',
                  borderColor: 'rgba(16,185,129,0.25)',
                  color: '#10B981',
                }}
              >
                <Compass className="w-5 h-5" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                Investment Explorer
              </h1>
            </div>
            <p className="text-sm text-muted max-w-2xl leading-relaxed">
              Discover stocks, track market indices, explore sectors, research fundamentals, and uncover investment opportunities across India&apos;s financial markets.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 shrink-0">
            {[
              { label: 'Indices', value: String(Object.keys(INDEX_IDENTITIES).length) },
              { label: 'Sectors', value: String(SECTORS.length) },
              { label: 'Equities', value: String(EXPANDED_NSE_STOCKS.length) },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="px-3 py-2 rounded-xl border text-center"
                style={{
                  backgroundColor: 'rgb(var(--surface))',
                  borderColor: 'rgb(var(--border))',
                }}
              >
                <p className="text-base font-extrabold text-foreground tabular-nums">{value}</p>
                <p className="text-[10px] uppercase font-bold text-muted tracking-wider">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Explorer Hub with Suspense */}
      <Suspense
        fallback={
          <div className="p-16 text-center text-xs text-muted flex items-center justify-center gap-2">
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

