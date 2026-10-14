"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { EXPANDED_NSE_STOCKS } from "@/lib/market/stockCatalog";
import { findEquity } from "@/lib/research/catalog";
import type { AlignedPricePoint } from "@/lib/research/comparison";
import type { FinancialMetricId } from "@/lib/research/financials";
import type { MarketQuote } from "@/lib/market/providers/yfinanceProvider";
import { useFinancialResearch } from "@/lib/hooks/useFinancialResearch";
import { StockSearchInput } from "./StockSearchInput";
import { CompanyLogo } from "@/components/shared/CompanyLogo";

const TOOLTIP = {
  background: "rgb(var(--surface))",
  color: "rgb(var(--foreground))",
  border: "1px solid rgb(var(--border))",
  borderRadius: 12,
};
const percent = (value: number | null | undefined) =>
  value != null && Number.isFinite(value)
    ? `${value > 0 ? "+" : ""}${value.toFixed(2)}%`
    : "Unavailable";
const numeric = (value: number | null | undefined) =>
  value != null && Number.isFinite(value)
    ? value.toLocaleString("en-IN", { maximumFractionDigits: 2 })
    : "Unavailable";
export function StockResearchPanel({
  symbol,
  tab,
}: {
  symbol: string;
  tab: "financials" | "compare";
}) {
  return tab === "financials" ? (
    <FinancialResearch symbol={symbol} />
  ) : (
    <Comparison symbol={symbol} />
  );
}

function FinancialResearch({ symbol }: { symbol: string }) {
  const query = useFinancialResearch(symbol),
    metrics = query.data?.metrics ?? [];
  const [chartMetric, setChartMetric] = useState<FinancialMetricId>("revenue");
  const records = metrics
    .filter((metric) => metric.id === chartMetric)
    .sort((a, b) => a.periodEnd.localeCompare(b.periodEnd));
  return (
    <section className="research-card border-t-2 border-t-violet-500/60">
      <p className="research-eyebrow text-violet-700 dark:text-violet-400">
        OFFICIAL REPORTING · ANNUAL
      </p>
      <h2 className="research-title">Financial Statements</h2>
      {query.isLoading ? (
        <p role="status" className="py-12 text-xs text-muted">
          Loading reported financials…
        </p>
      ) : query.isError ? (
        <p role="alert" className="text-xs text-muted py-5">
          {query.error.message}{" "}
          <button className="underline" onClick={() => query.refetch()}>
            Retry
          </button>
        </p>
      ) : !metrics.length ? (
        <div className="py-12 text-sm text-muted">
          <p className="font-semibold text-foreground">
            No reviewed financial records available for {symbol}.
          </p>
          <p className="mt-3">
            The reviewed dataset currently covers RELIANCE, TCS and INFY.
            Quarterly figures, balance-sheet ratios and longer financial
            histories remain unavailable.
          </p>
        </div>
      ) : (
        <>
          <p className="text-xs text-muted mt-3">
            Consolidated · Ind AS · actual annual periods and units below.
            Figures are not TTM.
          </p>
          <div className="flex flex-wrap gap-2 mt-5">
            {metrics
              .filter((metric) => metric.period === "FY2025–26")
              .map((metric) => (
                <button
                  className={`research-button ${chartMetric === metric.id ? "border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-300" : ""}`}
                  type="button"
                  key={metric.id}
                  aria-pressed={chartMetric === metric.id}
                  onClick={() => setChartMetric(metric.id)}
                >
                  {metric.label}
                </button>
              ))}
          </div>
          <p className="text-xs text-muted mt-4">
            {records[0]?.label} · {records[0]?.unit} · two sourced annual
            observations
          </p>
          <div
            className="mt-4"
            role="img"
            aria-label={`${records[0]?.label}: ${records.map((record) => `${record.period} ${numeric(record.value)} ${record.unit}`).join("; ")}`}
          >
            <ResponsiveContainer width="100%" height={270}>
              <BarChart data={records}>
                <CartesianGrid
                  stroke="rgb(var(--border))"
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis
                  dataKey="period"
                  tick={{ fill: "rgb(var(--muted))", fontSize: 11 }}
                />
                <YAxis
                  tick={{ fill: "rgb(var(--muted))", fontSize: 10 }}
                  width={72}
                />
                <Tooltip
                  contentStyle={TOOLTIP}
                  formatter={(value) => numeric(Number(value))}
                />
                <Bar
                  dataKey="value"
                  name={records[0]?.label}
                  fill="#8b5cf6"
                  radius={[6, 6, 0, 0]}
                  isAnimationActive={false}
                  maxBarSize={100}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="overflow-x-auto mt-5">
            <table className="w-full text-left text-xs">
              <caption className="text-left text-muted pb-3">
                Reported values with direct document references
              </caption>
              <thead className="border-b border-border">
                <tr>
                  <th className="py-3 pr-3">Metric / unit</th>
                  <th className="pr-3">FY2025–26</th>
                  <th className="pr-3">FY2024–25</th>
                  <th>Official source</th>
                </tr>
              </thead>
              <tbody>
                {metrics
                  .filter((metric) => metric.period === "FY2025–26")
                  .map((metric) => {
                    const previous = metrics.find(
                      (item) =>
                        item.id === metric.id && item.period === "FY2024–25",
                    );
                    return (
                      <tr key={metric.id} className="border-b border-border">
                        <td className="py-4 pr-3 min-w-40">
                          {metric.label}
                          <span className="block text-muted mt-1">
                            {metric.unit}
                          </span>
                        </td>
                        <td className="pr-3 tabular-nums whitespace-nowrap">
                          {numeric(metric.value)}
                        </td>
                        <td className="pr-3 tabular-nums whitespace-nowrap">
                          {numeric(previous?.value)}
                        </td>
                        <td className="min-w-36">
                          <a
                            href={`${metric.documentUrl}#page=${metric.pdfPage}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-brand underline"
                          >
                            PDF p. {metric.pdfPage} · printed{" "}
                            {metric.printedPage}
                          </a>
                          <span className="block text-[10px] text-muted mt-1">
                            Reviewed {metric.reviewedAt}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-muted mt-5">
            Net profit here means profit attributable to owners. Margins,
            balance-sheet figures, quarterly history and price-dependent ratios
            require additional reconciled records and are not synthesized.
          </p>
        </>
      )}
    </section>
  );
}

interface ComparisonResponse {
  first: { symbol: string; name: string; quote: MarketQuote | null };
  second: { symbol: string; name: string; quote: MarketQuote | null };
  points: AlignedPricePoint[];
  firstPerformance: number | null;
  secondPerformance: number | null;
  priceBasis: string;
  largeDiscontinuity: boolean;
}
function Comparison({ symbol }: { symbol: string }) {
  const router = useRouter(),
    pathname = usePathname(),
    params = useSearchParams();
  const second = params.get("compare") || "",
    current = findEquity(symbol);
  const range = ["1M", "3M", "1Y"].includes(params.get("range") || "")
    ? params.get("range")!
    : "1M";
  const valid = second !== symbol && !!findEquity(second);
  const peers = EXPANDED_NSE_STOCKS.filter(
    (stock) => stock.symbol !== symbol && stock.sector === current?.sector,
  );
  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    next.set(key, value);
    router.push(`${pathname}?${next}`, { scroll: false });
  };
  const query = useQuery({
    queryKey: ["stock-comparison", symbol, second, range],
    enabled: valid,
    staleTime: 60_000,
    queryFn: async ({ signal }): Promise<ComparisonResponse> => {
      const response = await fetch(
        `/api/research/compare?first=${encodeURIComponent(symbol)}&second=${encodeURIComponent(second)}&range=${range}`,
        { signal },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Comparison data is unavailable.");
      return data;
    },
  });
  const firstReports = useFinancialResearch(symbol),
    secondReports = useFinancialResearch(valid ? second : symbol),
    data = query.data;
  const metricRows = data
    ? [
        [
          "Shared-window price change",
          percent(data.firstPerformance),
          percent(data.secondPerformance),
        ],
        [
          "Daily price movement",
          percent(data.first.quote?.day_change_pct),
          percent(data.second.quote?.day_change_pct),
        ],
        [
          "Latest quote · INR",
          numeric(data.first.quote?.price),
          numeric(data.second.quote?.price),
        ],
        [
          "Reported volume",
          numeric(data.first.quote?.volume),
          numeric(data.second.quote?.volume),
        ],
        [
          "52-week low · INR",
          numeric(data.first.quote?.low_52w),
          numeric(data.second.quote?.low_52w),
        ],
        [
          "52-week high · INR",
          numeric(data.first.quote?.high_52w),
          numeric(data.second.quote?.high_52w),
        ],
        ...(
          ["revenue", "ownerProfit", "dilutedEps", "operatingCashFlow"] as const
        ).map((id) => {
          const first = firstReports.data?.metrics.find(
              (metric) => metric.id === id && metric.period === "FY2025–26",
            ),
            next = secondReports.data?.metrics.find(
              (metric) => metric.id === id && metric.period === "FY2025–26",
            );
          return [
            `${first?.label || next?.label || id} · FY2025–26 · ${first?.unit || next?.unit || "reported unit"}`,
            numeric(first?.value),
            numeric(next?.value),
          ];
        }),
        ...[
          "Market capitalization",
          "P/E (TTM)",
          "P/B",
          "ROE",
          "Debt / equity",
          "Dividend yield",
        ].map((label) => [label, "Unavailable", "Unavailable"]),
      ]
    : [];
  return (
    <section className="research-card border-t-2 border-t-blue-500/60">
      <p className="research-eyebrow text-blue-700 dark:text-blue-400">
        TWO COMPANIES · ONE SHARED WINDOW
      </p>
      <h2 className="research-title">Compare Stocks</h2>
      <p className="text-xs text-muted mt-3">
        Start with a sector peer or choose any distinct supported NSE equity.
      </p>
      <div className="grid md:grid-cols-2 gap-3 mt-5">
        <StockSearchInput
          onSelectStock={(stock) => update("compare", stock.symbol)}
        />
        <select
          aria-label="Second stock"
          value={second}
          onChange={(event) => update("compare", event.target.value)}
          className="min-w-0 w-full rounded-xl bg-surface-raised border border-border p-3 text-xs text-foreground"
        >
          <option value="">Choose a second supported stock</option>
          {EXPANDED_NSE_STOCKS.filter((stock) => stock.symbol !== symbol).map(
            (stock) => (
              <option key={stock.symbol} value={stock.symbol}>
                {stock.symbol} · {stock.name}
              </option>
            ),
          )}
        </select>
      </div>
      {peers.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <span className="text-[11px] text-muted">
            {current?.sector} peers:
          </span>
          {peers.slice(0, 6).map((peer) => (
            <button
              key={peer.symbol}
              type="button"
              className="research-button"
              onClick={() => update("compare", peer.symbol)}
            >
              {peer.symbol}
            </button>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-2 mt-4">
        {["1M", "3M", "1Y"].map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={range === value}
            className={`research-button ${range === value ? "text-blue-700 dark:text-blue-300 bg-blue-500/10 border-blue-500/40" : ""}`}
            onClick={() => update("range", value)}
          >
            {value}
          </button>
        ))}
      </div>
      {!valid ? (
        <p className="py-12 text-sm text-muted">
          {second === symbol
            ? "Choose a different company; comparing a stock with itself is not supported."
            : "Select a second stock to align real trading dates."}
        </p>
      ) : query.isLoading ? (
        <p role="status" className="py-12 text-xs text-muted">
          Loading common trading dates…
        </p>
      ) : query.isError ? (
        <p role="alert" className="py-6 text-xs text-muted">
          {query.error.message}{" "}
          <button className="underline" onClick={() => query.refetch()}>
            Retry comparison
          </button>
        </p>
      ) : (
        data && (
          <>
            <div className="grid sm:grid-cols-2 gap-4 mt-6">
              {[data.first, data.second].map((stock, index) => (
                <div
                  key={stock.symbol}
                  className="p-4 rounded-xl border border-border bg-surface-raised/40"
                >
                  <div className="flex gap-3 items-center">
                    <CompanyLogo
                      symbol={stock.symbol}
                      name={stock.name}
                      size="md"
                    />
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {stock.name}
                      </p>
                      <p className="text-[11px] text-muted">
                        {stock.symbol} · NSE
                      </p>
                    </div>
                  </div>
                  <p className="text-2xl font-bold tabular-nums text-foreground mt-4">
                    {percent(
                      index === 0
                        ? data.firstPerformance
                        : data.secondPerformance,
                    )}
                  </p>
                  <p className="text-[11px] text-muted mt-1">
                    Shared-window price performance
                  </p>
                  <p className="text-[10px] text-muted mt-3">
                    Quote{" "}
                    {stock.quote?.price_timestamp
                      ? new Date(stock.quote.price_timestamp).toLocaleString(
                          "en-IN",
                          { timeZone: "Asia/Kolkata" },
                        ) + " IST"
                      : "time unavailable"}{" "}
                    · {stock.quote?.status || "Unavailable"}
                  </p>
                </div>
              ))}
            </div>
            {data.points.length < 2 ? (
              <p className="py-12 text-sm text-muted">
                Insufficient common trading dates.
              </p>
            ) : (
              <>
                <p className="text-xs text-muted mt-6">
                  {data.points[0].date} to {data.points.at(-1)!.date} · Both
                  series start at 100 on the first shared date; missing dates
                  are excluded.
                </p>
                <div
                  className="mt-4"
                  role="img"
                  aria-label={`${symbol} and ${second} normalized price performance over common trading dates`}
                >
                  <ResponsiveContainer width="100%" height={310}>
                    <LineChart data={data.points}>
                      <CartesianGrid
                        stroke="rgb(var(--border))"
                        strokeDasharray="3 3"
                      />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: "rgb(var(--muted))", fontSize: 10 }}
                        minTickGap={40}
                      />
                      <YAxis
                        domain={["auto", "auto"]}
                        tick={{ fill: "rgb(var(--muted))", fontSize: 10 }}
                      />
                      <Tooltip
                        contentStyle={TOOLTIP}
                        formatter={(value) => numeric(Number(value))}
                      />
                      <Legend />
                      <Line
                        type="linear"
                        name={symbol}
                        dataKey="first"
                        stroke="#3b82f6"
                        dot={false}
                        isAnimationActive={false}
                      />
                      <Line
                        type="linear"
                        name={second}
                        dataKey="second"
                        stroke="#14b8a6"
                        dot={false}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
            <div className="overflow-x-auto mt-6">
              <table className="w-full text-left text-xs">
                <caption className="text-left text-muted pb-3">
                  Quote statistics and comparable consolidated annual records ·
                  gaps stay unavailable
                </caption>
                <thead className="border-b border-border">
                  <tr>
                    <th className="py-3 pr-4">Metric / reporting period</th>
                    <th className="pr-4">{symbol}</th>
                    <th>{second}</th>
                  </tr>
                </thead>
                <tbody>
                  {metricRows.map(([label, first, next]) => (
                    <tr key={label} className="border-b border-border">
                      <td className="py-3 pr-4 min-w-48 text-muted">{label}</td>
                      <td className="pr-4 tabular-nums whitespace-nowrap">
                        {first}
                      </td>
                      <td className="tabular-nums whitespace-nowrap">{next}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap gap-3 text-[11px] text-muted mt-4">
              {[firstReports, secondReports].map((report, index) => {
                const metric = report.data?.metrics[0];
                return metric ? (
                  <a
                    key={index}
                    href={`${metric.documentUrl}#page=${metric.pdfPage}`}
                    className="text-brand underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {index === 0 ? symbol : second} · annual report · reviewed{" "}
                    {metric.reviewedAt}
                  </a>
                ) : (
                  <span key={index}>
                    {index === 0 ? symbol : second}: no reviewed annual report
                    available
                  </span>
                );
              })}
            </div>
            <p className="text-[11px] text-muted mt-5 leading-relaxed">
              {data.priceBasis} Price performance excludes dividends. Higher
              absolute share prices and missing metrics do not establish
              investment quality. Reporting dates and units must be compared
              consistently.
            </p>
            {data.largeDiscontinuity && (
              <p
                role="status"
                className="text-xs text-amber-700 dark:text-amber-300 mt-3"
              >
                A large price discontinuity was detected. Verify splits, other
                corporate actions and observations before interpreting
                performance.
              </p>
            )}
          </>
        )
      )}
    </section>
  );
}
