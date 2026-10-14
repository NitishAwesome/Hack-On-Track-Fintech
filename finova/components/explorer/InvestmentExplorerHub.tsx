"use client";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  Building2,
  ChartNoAxesCombined,
  Coins,
  Compass,
  Layers,
  Search,
  TrendingUp,
} from "lucide-react";
import { RecentlyViewedStocks } from "./RecentlyViewedStocks";
import { StockSearchInput } from "./StockSearchInput";
import { TrackedMoversSection } from "./TrackedMoversSection";
import { BrowseStocksSection } from "./BrowseStocksSection";
import { SectorDiscoverySection } from "./SectorDiscoverySection";
import { CommoditiesOverview } from "./CommoditiesOverview";
import { IpoDiscoverySection } from "./IpoDiscoverySection";
import { AlternativeInvestmentsHub } from "@/components/alternatives/AlternativeInvestmentsHub";
import { DiscoveryPreviews } from "./DiscoveryPreviews";
import { Modal } from "@/components/shared/Modal";
import { InteractiveStockChart } from "./InteractiveStockChart";
import "./research.css";

export type ExplorerTab =
  "all" | "movers" | "browse" | "sectors" | "commodities" | "alts" | "ipo";
const TABS = [
  { id: "all", label: "All Discovery", icon: Compass },
  { id: "movers", label: "Market Movers", icon: TrendingUp },
  { id: "browse", label: "Browse Stocks", icon: Search },
  { id: "sectors", label: "Sectors", icon: Layers },
  { id: "commodities", label: "Gold & Silver", icon: Coins },
  { id: "alts", label: "Alternative Assets", icon: Building2 },
  { id: "ipo", label: "IPO Centre", icon: BookOpen },
] as const;
export function InvestmentExplorerHub() {
  const params = useSearchParams(),
    router = useRouter();
  const [metal, setMetal] = useState<{ symbol: string; name: string } | null>(
    null,
  );
  const initialSymbol = params.get("symbol"),
    rawTab = params.get("tab");
  const activeTab: ExplorerTab =
    rawTab === "stocks"
      ? "browse"
      : TABS.some((tab) => tab.id === rawTab)
        ? (rawTab as ExplorerTab)
        : "all";
  const navigate = (symbol: string) => {
    const from = `/explore${params.size ? `?${params}` : ""}`;
    router.push(
      `/explore/stocks/${encodeURIComponent(symbol.trim().toUpperCase())}?from=${encodeURIComponent(from)}`,
    );
  };
  const changeTab = (tab: ExplorerTab) => {
    const next = new URLSearchParams(params.toString());
    next.delete("symbol");
    if (tab === "all") next.delete("tab");
    else next.set("tab", tab);
    router.push(`/explore${next.size ? `?${next}` : ""}`, { scroll: false });
  };
  const sector = (value: string) => {
    const next = new URLSearchParams(params.toString());
    next.set("tab", "browse");
    next.set("sector", value);
    next.delete("page");
    router.push(`/explore?${next}`, { scroll: false });
  };
  useEffect(() => {
    if (initialSymbol?.trim()) {
      const next = new URLSearchParams(params.toString());
      next.delete("symbol");
      router.replace(
        `/explore/stocks/${encodeURIComponent(initialSymbol.trim().toUpperCase())}?from=${encodeURIComponent(`/explore${next.size ? `?${next}` : ""}`)}`,
      );
    }
  }, [initialSymbol, params, router]);
  return (
    <div className="space-y-6 explorer-research">
      <section className="research-card border-t-2 border-t-cyan-500/60">
        <div className="max-w-4xl">
          <p className="research-eyebrow text-cyan-700 dark:text-cyan-400 mb-3">
            YOUR NEXT RESEARCH STARTS HERE
          </p>
          <StockSearchInput onSelectStock={(stock) => navigate(stock.symbol)} />
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <span className="text-[11px] text-muted mr-1">Quick searches</span>
          {[
            { name: "Reliance", symbol: "RELIANCE" },
            { name: "TCS", symbol: "TCS" },
            { name: "Infosys", symbol: "INFY" },
            { name: "HDFC Bank", symbol: "HDFCBANK" },
            { name: "Gold BeES", symbol: "GOLDBEES" },
          ].map((stock) => (
            <button
              type="button"
              key={stock.symbol}
              onClick={() => navigate(stock.symbol)}
              className="research-button min-h-9"
            >
              {stock.name}
            </button>
          ))}
        </div>
      </section>
      <nav
        aria-label="Explorer categories"
        className="flex overflow-x-auto gap-1 border-b border-border pb-1"
      >
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={`flex items-center gap-2 px-4 min-h-11 text-xs font-semibold whitespace-nowrap border-b-2 ${activeTab === id ? "border-cyan-500 text-cyan-700 dark:text-cyan-400" : "border-transparent text-muted hover:text-foreground"}`}
            aria-pressed={activeTab === id}
            onClick={() => changeTab(id)}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </nav>
      {activeTab === "all" ? (
        <>
          <section
            aria-label="Research Indian benchmarks"
            className="grid sm:grid-cols-3 gap-3"
          >
            {[
              {
                name: "NIFTY 50",
                ticker: "^NSEI",
                exchange: "NSE",
                description: "Broad-market benchmark",
              },
              {
                name: "SENSEX",
                ticker: "^BSESN",
                exchange: "BSE",
                description: "BSE market benchmark",
              },
              {
                name: "NIFTY BANK",
                ticker: "^NSEBANK",
                exchange: "NSE",
                description: "Banking-sector benchmark",
              },
            ].map((index) => (
              <button
                type="button"
                key={index.ticker}
                onClick={() => navigate(index.ticker)}
                className="rounded-xl border border-border bg-surface px-4 py-4 flex gap-3 items-center text-left hover:border-brand/50"
              >
                <ChartNoAxesCombined
                  size={23}
                  className="text-blue-600 dark:text-blue-400"
                />
                <div className="flex-1">
                  <h2 className="text-sm font-semibold text-foreground">
                    {index.name}
                  </h2>
                  <p className="text-[11px] text-muted mt-1">
                    {index.exchange} · {index.description}
                  </p>
                </div>
                <ArrowUpRight size={15} className="text-muted" />
              </button>
            ))}
          </section>
          <RecentlyViewedStocks onSelectStock={navigate} />
          <DiscoveryPreviews
            onStock={navigate}
            onTab={changeTab}
            onSector={sector}
          />
        </>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between gap-3 items-center">
            <h2 className="research-title">
              {TABS.find((tab) => tab.id === activeTab)?.label}
            </h2>
            <button
              type="button"
              className="research-button"
              onClick={() => changeTab("all")}
            >
              <ArrowLeft size={14} />
              All discovery
            </button>
          </div>
          {activeTab === "movers" && (
            <TrackedMoversSection onSelectStock={navigate} />
          )}
          {activeTab === "browse" && (
            <BrowseStocksSection onSelectStock={navigate} />
          )}
          {activeTab === "sectors" && (
            <SectorDiscoverySection
              onSelectStock={(stock) => navigate(stock.symbol)}
            />
          )}
          {activeTab === "commodities" && (
            <CommoditiesOverview
              onSelectInstrument={(symbol, name) => {
                if (["GC=F", "SI=F"].includes(symbol))
                  setMetal({ symbol, name });
                else navigate(symbol);
              }}
            />
          )}
          {activeTab === "alts" && <AlternativeInvestmentsHub />}
          {activeTab === "ipo" && <IpoDiscoverySection />}
        </div>
      )}
      <Modal
        open={!!metal}
        onClose={() => setMetal(null)}
        title={`${metal?.name || "Commodity"} · Futures benchmark`}
        description="COMEX futures history · USD per troy ounce. A futures continuation series includes contract rolls and is separate from Indian ETF units or physical metal spot prices."
        size="xl"
      >
        {metal && (
          <InteractiveStockChart
            symbol={metal.symbol}
            exchange="COMMODITY"
            companyName={metal.name}
            workspace
          />
        )}
      </Modal>
    </div>
  );
}
