"use client";
import { useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { ExternalLink, Users } from "lucide-react";
import { getReviewedOwnership } from "@/lib/research/shareholding";
const COLORS = [
  "#3b82f6",
  "#14b8a6",
  "#8b5cf6",
  "#f59e0b",
  "#06b6d4",
  "#6366f1",
  "#94a3b8",
];
export function ShareholdingResearch({ symbol }: { symbol: string }) {
  const record = getReviewedOwnership(symbol),
    [selected, setSelected] = useState<string | null>(null);
  return (
    <section className="research-card border-t-2 border-t-violet-500/60">
      <p className="research-eyebrow text-violet-700 dark:text-violet-400">
        DATED OWNERSHIP DISCLOSURES
      </p>
      <h2 className="research-title flex gap-2 items-center">
        <Users size={19} />
        Shareholding
      </h2>
      {!record ? (
        <div className="py-12 max-w-2xl">
          <h3 className="font-semibold text-foreground">
            No reviewed ownership filing available for {symbol}.
          </h3>
          <p className="text-sm text-muted mt-3 leading-relaxed">
            A reconciled official filing is required before ownership
            percentages can be displayed. The current reviewed dataset covers
            Infosys as at 31 March 2026.
          </p>
          <div className="flex flex-wrap gap-3 mt-5">
            <a
              className="research-button"
              href={`https://www.nseindia.com/get-quotes/equity?symbol=${encodeURIComponent(symbol)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              NSE issuer disclosures
              <ExternalLink size={14} />
            </a>
            <a
              className="research-button"
              href="https://www.bseindia.com/corporates/ShareholdingPattern.html"
              target="_blank"
              rel="noopener noreferrer"
            >
              BSE filings
              <ExternalLink size={14} />
            </a>
          </div>
        </div>
      ) : (
        <>
          <p className="text-xs text-muted mt-3">
            As at {record.asOf} · reviewed {record.reviewedAt}. This is a
            reported historical snapshot, not current live ownership.
          </p>
          <div className="grid md:grid-cols-2 gap-5 mt-5 items-center">
            <div
              className="relative min-w-0"
              role="img"
              aria-label={`Reported ownership distribution for ${symbol}. Percentages reconcile to 100 percent.`}
            >
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={record.groups}
                    dataKey="percent"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    innerRadius="62%"
                    outerRadius="86%"
                    paddingAngle={1}
                    stroke="rgb(var(--surface))"
                    isAnimationActive={false}
                    onMouseEnter={(_, index) =>
                      setSelected(record.groups[index].id)
                    }
                    onMouseLeave={() => setSelected(null)}
                  >
                    {record.groups.map((group, index) => (
                      <Cell
                        key={group.id}
                        fill={COLORS[index % COLORS.length]}
                        opacity={selected && selected !== group.id ? 0.35 : 1}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => `${Number(value).toFixed(2)}%`}
                    contentStyle={{
                      background: "rgb(var(--surface))",
                      color: "rgb(var(--foreground))",
                      borderColor: "rgb(var(--border))",
                      borderRadius: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 pointer-events-none flex flex-col justify-center items-center">
                <strong className="text-2xl font-bold text-foreground">
                  100.00%
                </strong>
                <span className="text-[11px] text-muted">
                  Reported ownership
                </span>
              </div>
            </div>
            <div className="space-y-2">
              {record.groups.map((group, index) => (
                <button
                  type="button"
                  key={group.id}
                  aria-pressed={selected === group.id}
                  onClick={() =>
                    setSelected((previous) =>
                      previous === group.id ? null : group.id,
                    )
                  }
                  className="w-full min-h-11 flex justify-between gap-3 items-center px-3 py-2 rounded-xl border border-border bg-surface-raised/30 text-xs text-left"
                >
                  <span className="flex gap-2 items-center">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: COLORS[index % COLORS.length] }}
                    />
                    {group.label}
                  </span>
                  <strong className="tabular-nums">
                    {group.percent.toFixed(2)}%
                  </strong>
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto mt-6">
            <table className="w-full text-xs text-left">
              <caption className="text-left text-muted pb-3">
                Mutually exclusive categories from the same filing; mutual funds
                are not counted again inside a DII subtotal.
              </caption>
              <thead className="border-b border-border text-muted">
                <tr>
                  <th className="py-3">Ownership group</th>
                  <th className="text-right">Shares</th>
                  <th className="text-right">Ownership</th>
                </tr>
              </thead>
              <tbody>
                {record.groups.map((group) => (
                  <tr key={group.id} className="border-b border-border">
                    <td className="py-3 pr-3">{group.label}</td>
                    <td className="text-right tabular-nums">
                      {group.shares?.toLocaleString("en-IN") ?? "Unavailable"}
                    </td>
                    <td className="text-right tabular-nums">
                      {group.percent.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-bold">
                  <td className="pt-3">Total</td>
                  <td className="text-right pt-3 tabular-nums">
                    {record.totalShares?.toLocaleString("en-IN")}
                  </td>
                  <td className="text-right pt-3">100.00%</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <a
            className="inline-flex gap-2 items-center text-xs text-brand underline mt-5"
            href={`${record.documentUrl}#page=${record.pdfPage}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Official source · {record.documentTitle} · printed p.{" "}
            {record.printedPage}
            <ExternalLink size={13} />
          </a>
        </>
      )}
    </section>
  );
}
