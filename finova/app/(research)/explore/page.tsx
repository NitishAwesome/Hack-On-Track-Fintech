import type { Metadata } from "next";
import { Suspense } from "react";
import { Compass } from "lucide-react";
import { InvestmentExplorerHub } from "@/components/explorer/InvestmentExplorerHub";
import { EXPANDED_NSE_STOCKS } from "@/lib/market/stockCatalog";
import { SECTORS, INDEX_IDENTITIES } from "@/lib/research/catalog";
export const metadata: Metadata = {
  title: "Investment Explorer — FINOVA",
  description:
    "Discover supported Indian instruments, research sourced financials, explore genuine OHLCV history and compare price performance.",
};
export default function ExplorePage() {
  return (
    <div className="page-container space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4 sm:items-center">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-blue-700 dark:text-cyan-400 font-bold flex items-center gap-2 mb-2">
            <Compass size={14} />
            DISCOVER · UNDERSTAND · COMPARE
          </p>
          <h1 className="text-2xl sm:text-3xl text-foreground font-bold tracking-tight">
            Investment Explorer
          </h1>
          <p className="text-sm text-muted mt-2 max-w-2xl">
            Find a business. Understand its story. Research the evidence behind
            the price.
          </p>
        </div>
        <div className="flex gap-5 text-xs text-muted">
          {[
            ["Equities", EXPANDED_NSE_STOCKS.length],
            ["Sectors", SECTORS.length],
            ["Indices", Object.keys(INDEX_IDENTITIES).length],
          ].map(([label, value]) => (
            <div key={label}>
              <strong className="text-xl text-foreground tabular-nums block">
                {value}
              </strong>
              <span className="text-[10px] uppercase tracking-wider">
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
      <Suspense
        fallback={
          <p role="status" className="py-20 text-center text-sm text-muted">
            Loading discovery…
          </p>
        }
      >
        <InvestmentExplorerHub />
      </Suspense>
    </div>
  );
}
