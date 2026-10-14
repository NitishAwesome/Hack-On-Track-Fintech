"use client";
import Link from "next/link";
import {
  ArrowUpRight,
  FlaskConical,
  MessagesSquare,
  Newspaper,
  PieChart,
  ShieldCheck,
} from "lucide-react";
import { INDEX_IDENTITIES } from "@/lib/research/catalog";

export function StockCrossFeatureLinks({
  symbol,
  name,
}: {
  symbol: string;
  name?: string;
}) {
  const isIndex = !!INDEX_IDENTITIES[symbol];
  const cards = [
    {
      title: "View My Exposure",
      description: isIndex
        ? "Inspect your recorded portfolio"
        : `Your recorded holdings in ${symbol}`,
      href: isIndex
        ? "/analysis"
        : `/analysis?symbol=${encodeURIComponent(symbol)}`,
      icon: PieChart,
      style: "border-blue-500/25 bg-blue-500/5 hover:bg-blue-500/10",
      color: "text-blue-700 dark:text-blue-400 bg-blue-500/15",
    },
    {
      title: "Analyze Portfolio Risk",
      description: "Portfolio-wide observations and evidence",
      href: "/risk",
      icon: ShieldCheck,
      style: "border-violet-500/25 bg-violet-500/5 hover:bg-violet-500/10",
      color: "text-violet-700 dark:text-violet-400 bg-violet-500/15",
    },
    {
      title: "Explore Scenario",
      description: "Simulate portfolio allocation strategies",
      href: "/future-lab",
      icon: FlaskConical,
      style: "border-amber-500/25 bg-amber-500/5 hover:bg-amber-500/10",
      color: "text-amber-700 dark:text-amber-400 bg-amber-500/15",
    },
    {
      title: "Ask FINOVA",
      description: `Research ${name || symbol} with editable context`,
      href: `/insights?symbol=${encodeURIComponent(symbol)}&question=${encodeURIComponent(`Help me research ${name || symbol} (${symbol}): business or benchmark identity, evidence, news and uncertainties.`)}`,
      icon: MessagesSquare,
      style: "border-teal-500/25 bg-teal-500/5 hover:bg-teal-500/10",
      color: "text-teal-700 dark:text-teal-400 bg-teal-500/15",
    },
    {
      title: "Related News",
      description: "Source-linked coverage and timestamps",
      href: `/news?symbol=${encodeURIComponent(symbol)}`,
      icon: Newspaper,
      style: "border-indigo-500/25 bg-indigo-500/5 hover:bg-indigo-500/10",
      color: "text-indigo-700 dark:text-indigo-400 bg-indigo-500/15",
    },
  ];
  return (
    <section aria-label="Connected FINOVA tools">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
        {cards.map(({ title, description, href, icon: Icon, style, color }) => (
          <Link
            key={title}
            href={href}
            className={`rounded-xl border p-4 flex items-start gap-3 transition-colors ${style}`}
          >
            <span
              className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}
            >
              <Icon size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-xs font-semibold text-foreground leading-relaxed">
                {title}
              </h3>
              <p className="text-[11px] text-muted mt-1 leading-relaxed">
                {description}
              </p>
            </div>
            <ArrowUpRight size={14} className="text-muted shrink-0" />
          </Link>
        ))}
      </div>
    </section>
  );
}
