"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Bookmark,
  ChartNoAxesCombined,
  Check,
  ChevronRight,
  Copy,
  ExternalLink,
  GitCompareArrows,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { safeReturnPath } from "@/lib/navigation";
import { findEquity } from "@/lib/research/catalog";
import { getCompanyProfile } from "@/lib/market/companyProfiles";
import { addRecentlyViewed } from "@/lib/market/recentlyViewed";
import { useSharedStockQuote } from "@/lib/market/sharedMarketStore";
import { useWatchlist } from "@/lib/hooks/useWatchlist";
import { useInstrumentHistory } from "@/lib/hooks/useInstrumentHistory";
import type { ChartRange } from "@/lib/services/marketData";
import { CompanyLogo } from "@/components/shared/CompanyLogo";
import {
  InteractiveStockChart,
  RESEARCH_RANGES,
} from "@/components/explorer/InteractiveStockChart";
import { StockPortfolioContext } from "@/components/explorer/StockPortfolioContext";
import { StockResearchPanel } from "@/components/explorer/StockResearchPanel";
import { StockCrossFeatureLinks } from "@/components/explorer/StockCrossFeatureLinks";
import { StockNewsSection } from "@/components/explorer/StockNewsSection";
import {
  CompanyProfileSection,
  KeyFundamentals,
  KeyMarketData,
  ResearchOutlook,
} from "@/components/explorer/ResearchInformation";
import { ShareholdingResearch } from "@/components/explorer/ShareholdingResearch";
import { TechnicalResearch } from "@/components/explorer/TechnicalResearch";
import "@/components/explorer/research.css";

const TABS = [
  ["overview", "Overview"],
  ["chart", "Chart"],
  ["fundamentals", "Fundamentals"],
  ["financials", "Financials"],
  ["shareholding", "Shareholding"],
  ["news", "News & Research"],
  ["compare", "Compare"],
  ["technicals", "Technicals"],
] as const;
interface Instrument {
  symbol: string;
  name: string;
  exchange: string;
  isin: string;
  sector: string;
  industry: string;
}
function FollowStock({
  symbol,
  returnTo,
}: {
  symbol: string;
  returnTo: string;
}) {
  const watchlist = useWatchlist(),
    router = useRouter();
  const followed = watchlist.items.some((item) => item.symbol === symbol);
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        aria-pressed={followed}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white px-5 min-h-11 text-sm font-semibold shadow-sm disabled:opacity-50"
        disabled={
          watchlist.sessionLoading ||
          watchlist.mutation.isPending ||
          (!!watchlist.userId && (watchlist.isLoading || watchlist.isError))
        }
        onClick={() => {
          if (!watchlist.userId)
            router.push(`/login?next=${encodeURIComponent(returnTo)}`);
          else watchlist.mutation.mutate({ symbol, followed: !followed });
        }}
      >
        {followed ? <Check size={17} /> : <Plus size={17} />}
        {watchlist.mutation.isPending
          ? "Saving…"
          : followed
            ? "Following"
            : "Follow"}
      </button>
      {(watchlist.isError || watchlist.mutation.isError) && (
        <p
          role="alert"
          className="text-[11px] text-amber-700 dark:text-amber-400 max-w-56"
        >
          {watchlist.error?.message || watchlist.mutation.error?.message}
          <button
            type="button"
            className="underline ml-1"
            onClick={() => watchlist.refetch()}
          >
            Retry
          </button>
        </p>
      )}
    </div>
  );
}
export function DedicatedStockDetailClient({
  initialStock,
}: {
  initialStock: Instrument;
}) {
  const { symbol, name, exchange, isin, sector, industry } = initialStock;
  const router = useRouter(),
    pathname = usePathname(),
    params = useSearchParams(),
    menuRef = useRef<HTMLDetailsElement>(null);
  const [copyStatus, setCopyStatus] = useState("");
  const from = safeReturnPath(params.get("from"));
  const explorerReturn =
    from === "/explore" || from.startsWith("/explore?") ? from : "/explore";
  const isIndex = exchange === "INDEX",
    equity = !!findEquity(symbol),
    profile = getCompanyProfile(symbol);
  const tabs = isIndex
    ? TABS.filter(([id]) =>
        ["overview", "chart", "news", "technicals"].includes(id),
      )
    : TABS;
  const requested = params.get("tab") || "overview";
  const tab = tabs.some(([id]) => id === requested) ? requested : "overview";
  const range = RESEARCH_RANGES.includes(params.get("chartRange") as ChartRange)
    ? (params.get("chartRange") as ChartRange)
    : "1Y";
  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    next.set(key, value);
    router.push(`${pathname}?${next}`, { scroll: false });
  };
  const selectTab = (value: string) => update("tab", value);
  const { quote, refreshNow, isRefreshing, updateStatusLabel } =
    useSharedStockQuote(symbol);
  const history = useInstrumentHistory(
    symbol,
    exchange,
    range,
    ["overview", "chart", "technicals"].includes(tab),
  );
  const price = quote?.price,
    change = quote?.day_change,
    pct = quote?.day_change_pct;
  const positive = change != null && change > 0;
  const changeClass =
    change === 0 || change == null
      ? "text-muted"
      : positive
        ? "text-emerald-700 dark:text-emerald-400"
        : "text-rose-700 dark:text-rose-400";
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyStatus("Research link copied.");
    } catch {
      setCopyStatus("Copy is unavailable. You can copy the address bar link.");
    }
    menuRef.current?.removeAttribute("open");
  };
  useEffect(() => {
    addRecentlyViewed({ symbol, name, exchange });
  }, [symbol, name, exchange]);
  const chart = (
    <InteractiveStockChart
      symbol={symbol}
      exchange={exchange}
      companyName={name}
      range={range}
      onRangeChange={(value) => update("chartRange", value)}
      workspace={tab === "chart" || tab === "technicals"}
    />
  );
  return (
    <div className="page-container explorer-research space-y-6">
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
        <Link
          href={explorerReturn}
          aria-label="Back to Investment Explorer"
          className="research-icon-button border border-border"
        >
          <ArrowLeft size={18} />
        </Link>
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link
                className="text-brand hover:underline"
                href={explorerReturn}
              >
                Investment Explorer
              </Link>
            </li>
            <li>
              <ChevronRight size={14} />
            </li>
            <li aria-current="page" className="text-foreground font-medium">
              {name}
            </li>
          </ol>
        </nav>
      </div>
      <section className="research-card border-t-2 border-t-blue-500/60">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
          <div className="flex gap-4 items-start min-w-0">
            {isIndex ? (
              <div className="rounded-2xl bg-blue-500/15 text-blue-600 dark:text-blue-400 p-4">
                <ChartNoAxesCombined size={32} />
              </div>
            ) : (
              <CompanyLogo symbol={symbol} name={name} size="xl" />
            )}
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight leading-tight break-words">
                {name}
              </h1>
              <div className="flex flex-wrap items-center gap-2 mt-3 text-[11px] text-muted">
                <strong className="text-foreground tracking-wide">
                  {symbol}
                </strong>
                <span>· {isIndex ? "Benchmark index" : exchange}</span>
                {sector && (
                  <span className="rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 px-2.5 py-1">
                    {sector}
                  </span>
                )}
                {industry && (
                  <span className="rounded-full bg-surface-raised border border-border px-2.5 py-1">
                    {industry}
                  </span>
                )}
              </div>
              {isin && (
                <p className="text-[10px] text-muted mt-2">ISIN {isin}</p>
              )}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 xl:shrink-0">
            <div>
              <p className="text-3xl sm:text-4xl font-bold tracking-tight tabular-nums text-foreground">
                {price != null
                  ? `${isIndex ? "" : "₹"}${price.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${isIndex ? " pts" : ""}`
                  : "Quote unavailable"}
              </p>
              <p
                className={`text-sm font-semibold tabular-nums mt-2 ${changeClass}`}
              >
                {change != null && pct != null
                  ? `${change > 0 ? "▲ +" : change < 0 ? "▼ " : ""}${change.toFixed(2)} (${pct > 0 ? "+" : ""}${pct.toFixed(2)}%) daily`
                  : "Daily movement unavailable"}
              </p>
              <p className="text-[11px] text-muted mt-2 max-w-[260px]">
                {quote?.price_timestamp
                  ? new Date(quote.price_timestamp).toLocaleString("en-IN", {
                      timeZone: "Asia/Kolkata",
                    }) + " IST"
                  : "Quote time unavailable"}{" "}
                · {quote?.source || "Provider unavailable"}
              </p>
              <p className="text-[10px] text-muted mt-1">
                {quote?.status === "STALE"
                  ? "Stale cached quote · original quote time retained"
                  : updateStatusLabel}
              </p>
            </div>
            <div className="flex items-start gap-2">
              {equity && (
                <FollowStock
                  symbol={symbol}
                  returnTo={`${pathname}?${params}`}
                />
              )}
              <details
                className="research-menu relative"
                ref={menuRef}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    menuRef.current?.removeAttribute("open");
                    menuRef.current?.querySelector("summary")?.focus();
                  }
                }}
              >
                <summary
                  className="research-icon-button border border-border"
                  aria-label="More research actions"
                >
                  <MoreHorizontal size={20} />
                </summary>
                <div className="research-menu-panel">
                  {equity && (
                    <button
                      type="button"
                      onClick={() => {
                        selectTab("compare");
                        menuRef.current?.removeAttribute("open");
                      }}
                    >
                      <GitCompareArrows size={15} />
                      Add to comparison
                    </button>
                  )}
                  <button type="button" onClick={copy}>
                    <Copy size={15} />
                    Copy research link
                  </button>
                  {profile?.officialWebsite && (
                    <a
                      href={profile.officialWebsite}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink size={15} />
                      Official company website
                    </a>
                  )}
                  {equity && (
                    <Link
                      href={`/analysis?symbol=${encodeURIComponent(symbol)}`}
                    >
                      <Bookmark size={15} />
                      View portfolio exposure
                    </Link>
                  )}
                  <Link
                    href={`/insights?symbol=${encodeURIComponent(symbol)}&question=${encodeURIComponent(`Help me research ${name} (${symbol}), its business, evidence and risks.`)}`}
                  >
                    <Sparkles size={15} />
                    Ask FINOVA
                  </Link>
                </div>
              </details>
              <button
                type="button"
                className="research-icon-button border border-border"
                aria-label="Refresh quote"
                disabled={isRefreshing}
                onClick={() => refreshNow()}
              >
                <RefreshCw
                  size={17}
                  className={isRefreshing ? "animate-spin" : ""}
                />
              </button>
            </div>
          </div>
        </div>
        {copyStatus && (
          <p role="status" className="text-xs text-muted mt-3">
            {copyStatus}
          </p>
        )}
      </section>
      <nav
        aria-label="Stock research sections"
        className="flex overflow-x-auto gap-1 border-b border-border -mt-1 pb-1"
      >
        {tabs.map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-current={tab === id ? "page" : undefined}
            aria-pressed={tab === id}
            onClick={() => selectTab(id)}
            className={`min-h-11 shrink-0 px-4 text-xs font-semibold border-b-2 ${tab === id ? "border-cyan-500 text-cyan-700 dark:text-cyan-400" : "border-transparent text-muted hover:text-foreground hover:border-border"}`}
          >
            {label}
          </button>
        ))}
      </nav>
      {tab === "overview" && (
        <>
          {chart}
          <div className={`grid gap-5 ${isIndex ? "" : "lg:grid-cols-2"}`}>
            <KeyMarketData
              quote={quote}
              history={history.data}
              isIndex={isIndex}
            />
            {!isIndex && (
              <KeyFundamentals
                symbol={symbol}
                onOpen={() => selectTab("fundamentals")}
              />
            )}
          </div>
          <CompanyProfileSection
            symbol={symbol}
            name={name}
            sector={sector}
            industry={industry}
            isIndex={isIndex}
          />
          <ResearchOutlook
            symbol={symbol}
            name={name}
            sector={sector}
            onNews={() => selectTab("news")}
          />
          <StockCrossFeatureLinks symbol={symbol} name={name} />
          {equity && <StockPortfolioContext symbol={symbol} />}
        </>
      )}
      {tab === "chart" && chart}
      {tab === "fundamentals" && <KeyFundamentals symbol={symbol} full />}
      {(tab === "financials" || tab === "compare") && (
        <StockResearchPanel symbol={symbol} tab={tab} />
      )}
      {tab === "shareholding" && <ShareholdingResearch symbol={symbol} />}
      {tab === "news" && (
        <StockNewsSection symbol={symbol} companyName={name} sector={sector} />
      )}
      {tab === "technicals" && (
        <>
          {chart}
          <TechnicalResearch
            history={history.data}
            quote={quote}
            onDailyRange={() => update("chartRange", "1Y")}
          />
        </>
      )}
    </div>
  );
}
