"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  Building2,
  Coins,
  Layers,
  Landmark,
  Newspaper,
  TrendingUp,
} from "lucide-react";
import { useSession } from "@/components/providers/QueryProvider";
import { EXPANDED_NSE_STOCKS } from "@/lib/market/stockCatalog";
import { SECTORS, sectorStocks } from "@/lib/research/catalog";
import { useSharedStockQuotes } from "@/lib/market/sharedMarketStore";
import { useWatchlist } from "@/lib/hooks/useWatchlist";
import { VERIFIED_PRIMARY_MARKET_IPOS } from "@/lib/market/ipoData";
import type {
  CommoditiesResponse,
  TrackedMoversResponse,
} from "@/lib/services/marketData";
import type { NewsApiResponse } from "@/types/news";
import { CompanyLogo } from "@/components/shared/CompanyLogo";
import { MarketSparkline } from "@/components/shared/MarketSparkline";
import { DailyChange, instrumentVolume } from "@/components/shared/InstrumentMarketData";
import { DiscoveryInstrumentCard } from "./DiscoveryInstrumentCard";
import type { ExplorerTab } from "./InvestmentExplorerHub";

async function read<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal, cache: "no-store" });
  const data = await response.json();
  if (!response.ok)
    throw new Error(
      data.error || data.message || "The provider is temporarily unavailable.",
    );
  return data;
}
const money = (value: number | null | undefined) =>
  value != null && Number.isFinite(value)
    ? `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : "Unavailable";
function Heading({
  title,
  action,
  color = "text-brand",
}: {
  title: string;
  action: () => void;
  color?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 mb-4">
      <h2 className={`research-title ${color}`}>{title}</h2>
      <button
        type="button"
        className="research-button text-brand"
        onClick={action}
      >
        View all
        <ArrowUpRight size={14} />
      </button>
    </div>
  );
}
function FollowedPreview({ onStock }: { onStock: (symbol: string) => void }) {
  const watchlist = useWatchlist();
  const router = useRouter();
  if (!watchlist.userId) return null;
  return (
    <section className="research-card">
      <Heading
        title="Your Followed Stocks"
        action={() => router.push("/watchlist")}
      />
      <p className="text-xs text-muted mb-4">
        Saved privately to your FINOVA account.
      </p>
      {watchlist.isLoading ? (
        <p role="status" className="text-xs text-muted">
          Loading Watchlist…
        </p>
      ) : watchlist.isError ? (
        <p role="alert" className="text-xs text-muted">
          {watchlist.error.message}
          <button
            type="button"
            className="underline ml-2"
            onClick={() => watchlist.refetch()}
          >
            Retry
          </button>
        </p>
      ) : watchlist.items.length ? (
        <FollowedCards symbols={watchlist.items.slice(0, 6).map(item => item.symbol)} onStock={onStock} />
      ) : (
        <p className="text-xs text-muted">
          Follow a stock from its research page to build this list.
        </p>
      )}
    </section>
  );
}
function FollowedCards({ symbols, onStock }: { symbols: string[]; onStock: (symbol: string) => void }) {
  const quotes = useSharedStockQuotes(symbols);
  return <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">{symbols.map(symbol => {
    const stock = EXPANDED_NSE_STOCKS.find(item => item.symbol === symbol);
    return <DiscoveryInstrumentCard key={symbol} symbol={symbol} name={stock?.name || symbol} sector={stock?.sector} quote={quotes.getQuote(symbol)} accent="violet" onOpen={() => onStock(symbol)} />;
  })}</div>;
}
export function DiscoveryPreviews({
  onStock,
  onTab,
  onSector,
}: {
  onStock: (symbol: string) => void;
  onTab: (tab: ExplorerTab) => void;
  onSector: (sector: string) => void;
}) {
  const { userId } = useSession();
  const router = useRouter();
  const [moverTab, setMoverTab] = useState<"gainers" | "losers" | "mostActive">(
    "gainers",
  );
  const movers = useQuery({
    queryKey: ["discovery-movers"],
    staleTime: 60_000,
    queryFn: ({ signal }) =>
      read<TrackedMoversResponse>("/api/market/movers", signal),
  });
  const commodities = useQuery({
    queryKey: ["commodity-preview"],
    staleTime: 60_000,
    queryFn: ({ signal }) =>
      read<CommoditiesResponse>("/api/market/commodities", signal),
  });
  const news = useQuery({
    queryKey: ["discovery-news", userId],
    staleTime: 120_000,
    queryFn: ({ signal }) => read<NewsApiResponse>("/api/news", signal),
  });
  const stocks = [
    "RELIANCE",
    "TCS",
    "INFY",
    "HDFCBANK",
    "ICICIBANK",
    "BHARTIARTL",
  ]
    .map((symbol) =>
      EXPANDED_NSE_STOCKS.find((stock) => stock.symbol === symbol)!,
    )
    .filter(Boolean);
  const quotes = useSharedStockQuotes(stocks.map((stock) => stock.symbol));
  const list = movers.data?.[moverTab] ?? [];
  return (
    <div className="space-y-6">
      <FollowedPreview onStock={onStock} />
      <section className="research-card discovery-section" data-accent="blue">
        <Heading title="Market Movers" action={() => onTab("movers")} />
        <p className="text-xs text-muted mb-4">
          Five highlights from FINOVA’s disclosed 20-stock tracked universe.
          Rankings do not cover the entire exchange. Mini charts show the latest observed session or a labeled historical fallback.
        </p>
        <div className="flex gap-2 flex-wrap mb-4">
          {(
            [
              ["gainers", "Gainers"],
              ["losers", "Losers"],
              ["mostActive", "Most active"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`research-button ${moverTab === id ? "bg-blue-500/10 border-blue-500/40 text-brand" : ""}`}
              aria-pressed={moverTab === id}
              onClick={() => setMoverTab(id)}
            >
              {label}
            </button>
          ))}
        </div>
        {movers.isLoading ? (
          <p role="status" className="text-xs text-muted py-6">
            Loading tracked movers…
          </p>
        ) : movers.isError ? (
          <p role="alert" className="text-xs text-muted">
            {movers.error.message}
            <button className="underline ml-2" onClick={() => movers.refetch()}>
              Retry
            </button>
          </p>
        ) : !list.length ? (
          <p className="text-xs text-muted">
            No usable quotes available for this ranking.
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 xl:grid-cols-5 gap-3">
            {list.slice(0, 5).map((quote) => (
              <button
                key={quote.symbol}
                type="button"
                className="discovery-instrument p-4 text-left min-w-0" data-accent="blue"
                onClick={() => onStock(quote.symbol)}
              >
                <div className="flex items-center gap-2 mb-3">
                  <CompanyLogo symbol={quote.symbol} size="sm" />
                  <strong className="text-xs text-foreground">
                    {quote.symbol}
                  </strong>
                </div>
                <p className="text-base font-bold tabular-nums text-foreground">
                  {money(quote.price)}
                </p>
                <p
                  className={`text-xs font-semibold mt-1 tabular-nums ${quote.day_change_pct == null || quote.day_change_pct === 0 ? "text-muted" : quote.day_change_pct > 0 ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"}`}
                >
                  {quote.day_change_pct == null
                    ? "Daily movement unavailable"
                    : `${quote.day_change_pct > 0 ? "+" : ""}${quote.day_change_pct.toFixed(2)}%`}
                </p>
                <div className="my-3"><MarketSparkline symbol={quote.symbol} /></div>
                <p className="text-[10px] text-muted tabular-nums">Volume {instrumentVolume(quote.volume)} · daily quote</p>
                <p className="text-[10px] text-muted mt-3">
                  {quote.price_timestamp
                    ? new Date(quote.price_timestamp).toLocaleString("en-IN", {
                        timeZone: "Asia/Kolkata",
                      }) + " IST"
                    : "Quote time unavailable"}
                </p>
              </button>
            ))}
          </div>
        )}
      </section>
      <section className="research-card discovery-section" data-accent="cyan">
        <Heading title="Start Your Research" action={() => onTab("browse")} />
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {stocks.map((stock) => {
            const quote = quotes.getQuote(stock.symbol);
            return (
              <DiscoveryInstrumentCard key={stock.symbol} symbol={stock.symbol} name={stock.name} sector={stock.sector} quote={quote} onOpen={() => onStock(stock.symbol)} />
            );
          })}
        </div>
        <div className="mt-6 pt-5 border-t border-border">
          <p className="text-xs text-muted flex gap-2 items-center mb-3">
            <Layers size={15} />
            Discover by catalog sector
          </p>
          <div className="flex flex-wrap gap-2">
            {SECTORS.slice(0, 8).map((sector) => (
              <button
                key={sector}
                type="button"
                onClick={() => onSector(sector)}
                className="research-button"
              >
                {sector}
                <span className="text-[10px] text-muted">
                  {sectorStocks(sector).length}
                </span>
              </button>
            ))}
            <button
              type="button"
              className="research-button text-brand"
              onClick={() => onTab("sectors")}
            >
              All {SECTORS.length} sectors
              <ArrowUpRight size={14} />
            </button>
          </div>
        </div>
      </section>
      <div className="grid lg:grid-cols-2 gap-5">
        <section className="research-card discovery-section" data-accent="amber">
          <Heading
            title="Gold & Silver"
            action={() => onTab("commodities")}
            color="text-amber-700 dark:text-amber-300"
          />
          <p className="text-xs text-muted mb-4">
            Indian ETFs are quoted in INR per unit. COMEX futures use USD per
            troy ounce in the focused view.
          </p>
          {commodities.isLoading ? (
            <p role="status" className="text-xs text-muted">
              Loading metals…
            </p>
          ) : commodities.isError ? (
            <p role="alert" className="text-xs text-muted">
              {commodities.error.message}
              <button
                className="underline ml-1"
                onClick={() => commodities.refetch()}
              >
                Retry
              </button>
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {commodities.data?.etfs.slice(0, 2).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="discovery-instrument p-4 text-left" data-accent="amber"
                  onClick={() => onStock(item.symbol)}
                >
                  <Coins className="text-amber-500 mb-2" size={20} />
                  <p className="text-xs font-semibold">{item.symbol}</p>
                  <p className="text-lg font-bold text-foreground mt-2 tabular-nums">
                    {money(item.price)}
                  </p>
                  <p className="text-[10px] text-muted">{item.quotedUnit}</p>
                  <div className="mt-1"><DailyChange value={item.dayChangePercent} /></div>
                  <div className="mt-3"><MarketSparkline symbol={item.symbol} unit="per unit" /></div>
                  <p className="text-[10px] text-muted mt-3">
                    {item.source} ·{" "}
                    {item.timestamp
                      ? new Date(item.timestamp).toLocaleString("en-IN", {
                          timeZone: "Asia/Kolkata",
                        })
                      : "Time unavailable"}
                  </p>
                </button>
              ))}
            </div>
          )}
        </section>
        <section className="research-card discovery-section" data-accent="teal">
          <Heading
            title="Alternative Investments"
            action={() => onTab("alts")}
            color="text-teal-700 dark:text-teal-300"
          />
          <div className="space-y-3">
            {[
              {
                name: "REITs",
                description: "Listed real-estate investment trusts",
                href: "/reit",
                icon: Building2,
              },
              {
                name: "InvITs",
                description: "Infrastructure investment trusts",
                href: "/invit",
                icon: TrendingUp,
              },
              {
                name: "Bonds",
                description: "Fixed-income structures and issuer risks",
                href: "/bonds",
                icon: Landmark,
              },
            ].map(({ name, description, href, icon: Icon }) => (
              <Link
                href={href}
                key={name}
                className="rounded-xl border border-border bg-surface-raised/30 p-4 flex gap-3 items-center hover:border-teal-500/50"
              >
                <Icon size={20} className="text-teal-600 dark:text-teal-400" />
                <div className="flex-1">
                  <h3 className="text-xs font-semibold text-foreground">
                    {name}
                  </h3>
                  <p className="text-[11px] text-muted mt-1">{description}</p>
                </div>
                <ArrowUpRight size={15} />
              </Link>
            ))}
          </div>
        </section>
      </div>
      <div className="grid lg:grid-cols-[2fr_1fr] gap-5">
        <section className="research-card discovery-section" data-accent="violet">
          <Heading
            title="News & Market"
            action={() => router.push("/news")}
            color="text-indigo-700 dark:text-indigo-300"
          />
          {news.isLoading ? (
            <p role="status" className="text-xs text-muted">
              Loading headlines…
            </p>
          ) : news.isError ? (
            <p role="alert" className="text-xs text-muted">
              {news.error.message}
              <button className="underline ml-1" onClick={() => news.refetch()}>
                Retry
              </button>
            </p>
          ) : (
            <div className="space-y-3">
              {news.data?.articles
                .filter((article) => article.freshness !== "ARCHIVED")
                .slice(0, 3)
                .map((article) => (
                  <a
                    key={article.article_id}
                    href={article.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-xl border border-border bg-surface-raised/20 p-4 hover:border-indigo-500/50"
                  >
                    <p className="text-sm font-semibold text-foreground flex items-start gap-2">
                      <Newspaper
                        size={15}
                        className="text-indigo-500 shrink-0 mt-1"
                      />
                      {article.title}
                    </p>
                    <p className="text-[11px] text-muted mt-2">
                      {article.source_name} ·{" "}
                      {article.temporal_info?.display_label || article.pubDate}
                      {article.temporal_info?.timestamp_type === "indexed"
                        ? " · Indexing time; publication unconfirmed"
                        : ""}
                      {article.temporal_info?.is_cached ? " · Cached" : ""}
                    </p>
                  </a>
                ))}
              {!news.data?.articles.some(
                (article) => article.freshness !== "ARCHIVED",
              ) && (
                <p className="text-xs text-muted py-6">
                  No recent source-linked headlines available. The News page
                  includes the archive and provider status.
                </p>
              )}
            </div>
          )}
        </section>
        <section className="research-card discovery-section" data-accent="amber">
          <Heading
            title="IPO Archive"
            action={() => onTab("ipo")}
            color="text-amber-700 dark:text-amber-300"
          />
          <p className="text-xs text-muted mb-4">
            No reviewed current or upcoming records. Explore documented past
            listings.
          </p>
          {VERIFIED_PRIMARY_MARKET_IPOS.slice(0, 2).map((item) => (
            <a
              key={item.id}
              href={item.official_link}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-xl border border-border p-3 mt-3 hover:border-amber-500/50"
            >
              <p className="text-xs font-semibold text-foreground">
                {item.company_name}
              </p>
              <p className="text-[11px] text-muted mt-1">
                Listed {item.listing_date} · NSE notice
              </p>
              <p className="text-[10px] text-muted mt-1">
                Reviewed {item.verified_at}
              </p>
            </a>
          ))}
        </section>
      </div>
    </div>
  );
}
