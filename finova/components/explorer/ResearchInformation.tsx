"use client";
import {
  ArrowUpRight,
  Building2,
  CheckCheck,
  ExternalLink,
  Flame,
  Globe,
  MapPin,
  Radio,
  Store,
  Waves,
} from "lucide-react";
import type {
  MarketQuote,
  HistoricalChartResponse,
} from "@/lib/services/marketData";
import { getCompanyProfile } from "@/lib/market/companyProfiles";
import { useFinancialResearch } from "@/lib/hooks/useFinancialResearch";
import { comparableGrowth } from "@/lib/research/financialPresentation";
import { finite, technicalStudy } from "@/lib/research/technicals";
import { PriceRangeBar } from "./PriceRangeBar";
import { compactVolume } from "./PriceHistoryCanvas";
import { StockNewsSection } from "./StockNewsSection";

export function KeyMarketData({
  quote,
  history,
  isIndex,
}: {
  quote: MarketQuote | null | undefined;
  history?: HistoricalChartResponse;
  isIndex: boolean;
}) {
  const money = (value: unknown) =>
    finite(value)
      ? `${isIndex ? "" : "₹"}${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}${isIndex ? " pts" : ""}`
      : "Unavailable";
  const study = technicalStudy(history?.points ?? [], history?.interval ?? "");
  const rows = [
    ["Open", money(quote?.sessionOpen)],
    ["Previous close", money(quote?.previousClose)],
    [
      "Reported volume",
      finite(quote?.volume) && quote.volume >= 0
        ? compactVolume(quote.volume)
        : "Unavailable",
    ],
    [
      "Average volume · last 20 daily observations",
      finite(study.avgVolume) ? compactVolume(study.avgVolume) : "Unavailable",
    ],
  ];
  return (
    <section className="research-card border-t-2 border-t-blue-500/60 min-w-0">
      <p className="research-eyebrow text-blue-700 dark:text-blue-400">
        PRICE & ACTIVITY
      </p>
      <h2 className="research-title">Key Market Data</h2>
      <div className="mt-4">
        <PriceRangeBar
          currentPrice={quote?.price ?? null}
          currency={isIndex ? "POINTS" : (quote?.currency ?? "INR")}
          dayLow={quote?.dayLow}
          dayHigh={quote?.dayHigh}
          fiftyTwoWeekLow={quote?.low_52w}
          fiftyTwoWeekHigh={quote?.high_52w}
        />
      </div>
      <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="border-b border-border py-3 flex justify-between items-start gap-3 text-xs"
          >
            <dt className="text-muted max-w-[60%]">{label}</dt>
            <dd className="font-semibold text-foreground text-right tabular-nums">
              {value}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-[11px] text-muted">
        Quote statistics come from the provider. Volume average requires 20
        actual daily observations in the selected history; missing session
        extremes remain unavailable.
      </p>
    </section>
  );
}

export function KeyFundamentals({
  symbol,
  full = false,
  onOpen,
}: {
  symbol: string;
  full?: boolean;
  onOpen?: () => void;
}) {
  const query = useFinancialResearch(symbol),
    metrics = query.data?.metrics ?? [],
    current = metrics.filter((metric) => metric.period === "FY2025–26");
  return (
    <section className="research-card border-t-2 border-t-violet-500/60 min-w-0">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="research-eyebrow text-violet-700 dark:text-violet-400">
            REPORTED BUSINESS PERFORMANCE
          </p>
          <h2 className="research-title">Key Fundamentals</h2>
        </div>
        {!full && onOpen && (
          <button
            type="button"
            onClick={onOpen}
            className="research-icon-button"
            aria-label="View all fundamentals"
          >
            <ArrowUpRight size={17} />
          </button>
        )}
      </div>
      {query.isLoading ? (
        <p role="status" className="text-xs text-muted py-8">
          Loading sourced annual figures…
        </p>
      ) : query.isError ? (
        <p role="alert" className="text-xs text-muted py-4">
          {query.error.message}{" "}
          <button className="underline" onClick={() => query.refetch()}>
            Retry
          </button>
        </p>
      ) : (
        <>
          <p className="text-xs text-muted mt-3">
            {current.length
              ? "FY2025–26 · Consolidated · Ind AS · INR"
              : "No reviewed annual reporting available for this company."}
          </p>
          <div
            className={`grid grid-cols-2 ${full ? "lg:grid-cols-4" : ""} gap-3 mt-4`}
          >
            {current.map((metric) => {
              const previous = metrics.find(
                (item) => item.id === metric.id && item.period === "FY2024–25",
              );
              const growth = comparableGrowth(metric, previous);
              return (
                <div
                  key={metric.id}
                  className="rounded-xl border border-border bg-surface-raised/50 p-3 min-w-0"
                >
                  <p className="text-[11px] text-muted min-h-8">
                    {metric.label}
                  </p>
                  <p className="text-base sm:text-lg font-bold text-foreground tabular-nums mt-1 break-words">
                    {metric.value?.toLocaleString("en-IN", {
                      maximumFractionDigits: 2,
                    }) ?? "Unavailable"}
                  </p>
                  <p className="text-[10px] text-muted">{metric.unit}</p>
                  {growth !== null && (
                    <p
                      className={`text-[11px] mt-2 tabular-nums ${growth > 0 ? "text-emerald-700 dark:text-emerald-400" : growth < 0 ? "text-rose-700 dark:text-rose-400" : "text-muted"}`}
                    >
                      {growth > 0 ? "+" : ""}
                      {growth.toFixed(2)}% vs FY2024–25
                    </p>
                  )}
                  <a
                    className="inline-flex text-[10px] text-brand mt-2 underline"
                    href={`${metric.documentUrl}#page=${metric.pdfPage}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Report · p. {metric.printedPage}
                  </a>
                </div>
              );
            })}
          </div>
          <dl
            className={`grid grid-cols-2 ${full ? "lg:grid-cols-4" : ""} gap-3 mt-3`}
          >
            {[
              "P/E (TTM)",
              "P/B",
              "ROE",
              "Debt / equity",
              ...(full ? ["Dividend yield", "Market capitalization"] : []),
            ].map((label) => (
              <div
                key={label}
                className="rounded-xl border border-border px-3 py-2.5"
              >
                <dt className="text-[11px] text-muted">{label}</dt>
                <dd className="text-xs font-semibold text-muted mt-1">
                  Unavailable
                </dd>
              </div>
            ))}
          </dl>
          <p className="text-[11px] text-muted mt-4">
            Annual EPS and profit are not TTM. Ratios, size classification and
            yields need reconciled provider or reporting inputs and are not
            inferred from these annual records.
            {current[0] && ` Reports reviewed ${current[0].reviewedAt}.`}
          </p>
        </>
      )}
    </section>
  );
}

export function CompanyProfileSection({
  symbol,
  name,
  sector,
  industry,
  isIndex = false,
}: {
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  isIndex?: boolean;
}) {
  const profile = getCompanyProfile(symbol);
  const indices: Record<string, { description: string; website: string }> = {
    NIFTY50: {
      description:
        "An NSE broad-market equity benchmark. Its level is expressed in index points; it is not a company or a directly owned share.",
      website:
        "https://www.niftyindices.com/indices/equity/broad-based-indices/NIFTY-50",
    },
    BANKNIFTY: {
      description:
        "An NSE banking-sector equity benchmark. Index performance describes the constituent basket, not a single bank or portfolio holding.",
      website:
        "https://www.niftyindices.com/indices/equity/sectoral-indices/nifty-bank",
    },
    SENSEX: {
      description:
        "A BSE equity-market benchmark. Index levels and price history are separate from company earnings, ownership and financial statements.",
      website: "https://www.bseindia.com/sensex/code/16/",
    },
  };
  const benchmark = indices[symbol],
    website = isIndex ? benchmark?.website : profile?.officialWebsite;
  return (
    <section className="research-card border-t-2 border-t-teal-500/60">
      <div className="flex flex-wrap justify-between items-start gap-3">
        <div>
          <p className="research-eyebrow text-teal-700 dark:text-teal-400">
            {isIndex ? "BENCHMARK IDENTITY" : "UNDERSTAND THE BUSINESS"}
          </p>
          <h2 className="research-title">
            {isIndex ? "Index Overview" : "Company Overview"}
          </h2>
        </div>
        {website && (
          <a
            className="research-button text-brand"
            href={website}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Globe size={15} />
            Official website
            <ExternalLink size={13} />
          </a>
        )}
      </div>
      <p className="text-sm text-foreground leading-relaxed max-w-5xl mt-5">
        {isIndex
          ? benchmark?.description
          : profile?.description ||
            `A reviewed company description for ${name} is not available yet. Explore the price history and consult the issuer's official disclosures.`}
      </p>
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted mt-4">
        {sector && (
          <span className="flex gap-2 items-center">
            <Building2 size={14} />
            {sector}
            {industry ? ` · ${industry}` : ""}
          </span>
        )}
        {profile?.headquarters && (
          <span className="flex gap-2 items-center">
            <MapPin size={14} />
            {profile.headquarters}
          </span>
        )}
      </div>
      {profile?.keySegments.length ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mt-6">
          {profile.keySegments.map((segment, index) => {
            const Icon = /retail|consumer/i.test(segment)
              ? Store
              : /digital|communication/i.test(segment)
                ? Radio
                : /energy|oil|gas/i.test(segment)
                  ? Flame
                  : Waves;
            const colors = [
              "text-amber-700 dark:text-amber-400 bg-amber-500/10",
              "text-violet-700 dark:text-violet-400 bg-violet-500/10",
              "text-teal-700 dark:text-teal-400 bg-teal-500/10",
              "text-blue-700 dark:text-blue-400 bg-blue-500/10",
              "text-cyan-700 dark:text-cyan-400 bg-cyan-500/10",
            ];
            return (
              <div
                key={segment}
                className="rounded-xl border border-border p-4 bg-surface-raised/30"
              >
                <div
                  className={`rounded-xl h-10 w-10 flex items-center justify-center mb-3 ${colors[index % colors.length]}`}
                >
                  <Icon size={19} />
                </div>
                <h3 className="text-xs font-semibold text-foreground leading-relaxed">
                  {segment}
                </h3>
              </div>
            );
          })}
        </div>
      ) : null}
      <p className="text-[11px] text-muted mt-5">
        {isIndex
          ? "Source: official index administrator; provider quote history is shown above."
          : "Existing FINOVA curated business profile. Confirm business changes, locations and segment definitions in the issuer’s latest official disclosures."}
      </p>
    </section>
  );
}

export function ResearchOutlook({
  symbol,
  name,
  sector,
  onNews,
}: {
  symbol: string;
  name: string;
  sector: string;
  onNews: () => void;
}) {
  return (
    <section className="research-card border-t-2 border-t-indigo-500/60">
      <div className="flex justify-between items-start gap-3">
        <div>
          <p className="research-eyebrow text-indigo-700 dark:text-indigo-400">
            EVIDENCE BEFORE CONCLUSIONS
          </p>
          <h2 className="research-title">Research & Outlook</h2>
        </div>
        <button
          className="research-button text-brand"
          type="button"
          onClick={onNews}
        >
          All news
          <ArrowUpRight size={15} />
        </button>
      </div>
      <div className="grid lg:grid-cols-[1fr_2fr] gap-5 mt-5">
        <div className="rounded-xl bg-surface-raised/40 border border-border p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <CheckCheck size={17} className="text-teal-500" />
            Research checklist
          </h3>
          <ul className="text-xs text-muted space-y-3 leading-relaxed">
            <li>Read the latest company filing and its reporting scope.</li>
            <li>Compare earnings with operating cash flow.</li>
            <li>Check ownership dates and corporate actions.</li>
            <li>Separate daily movement from period performance.</li>
          </ul>
          <p className="text-[11px] text-muted mt-4 border-t border-border pt-3">
            No sourced analyst consensus or price-target feed is connected.
          </p>
        </div>
        <StockNewsSection
          symbol={symbol}
          companyName={name}
          sector={sector}
          preview
        />
      </div>
    </section>
  );
}
