"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/components/providers/QueryProvider";
import { ExternalLink, Newspaper, RefreshCw, Sparkles } from "lucide-react";
import type { PersonalizedNewsArticle, NewsApiResponse } from "@/types/news";

function Thumbnail({ article }: { article: PersonalizedNewsArticle }) {
  const [failed, setFailed] = useState(false);
  return article.image_url &&
    /^https?:\/\//.test(article.image_url) &&
    !failed ? (
    <Image
      src={article.image_url}
      alt=""
      width={96}
      height={72}
      unoptimized
      onError={() => setFailed(true)}
      className="w-20 sm:w-24 h-18 object-cover rounded-lg shrink-0"
    />
  ) : (
    <div className="w-16 h-16 bg-indigo-500/10 text-indigo-500 rounded-xl flex items-center justify-center shrink-0">
      <Newspaper size={23} />
    </div>
  );
}
type Explanation = {
  loading: boolean;
  text?: string;
  error?: string;
  source?: string;
  model?: string;
};
interface StockNewsProps {
  symbol: string;
  companyName?: string;
  sector?: string;
  preview?: boolean;
}
export function StockNewsSection(props: StockNewsProps) {
  const { userId } = useSession();
  // AI responses may contain server-verified portfolio context. An owner change unmounts all local response state.
  return (
    <StockNewsWorkspace
      key={`${userId || "guest"}:${props.symbol}`}
      {...props}
      userId={userId}
    />
  );
}
function StockNewsWorkspace({
  symbol,
  companyName,
  sector,
  preview = false,
  userId,
}: StockNewsProps & { userId: string | null }) {
  const [filter, setFilter] = useState<"recent" | "archive">("recent");
  const [explanations, setExplanations] = useState<Record<string, Explanation>>(
    {},
  );
  const query = useQuery({
    queryKey: ["research-news", symbol, userId],
    staleTime: 120_000,
    queryFn: async ({ signal }): Promise<NewsApiResponse> => {
      const response = await fetch(
        `/api/news?symbol=${encodeURIComponent(symbol)}`,
        { signal, cache: "no-store" },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          data.message ||
            data.error ||
            "News providers are temporarily unavailable.",
        );
      return data;
    },
  });
  const all = query.data?.articles ?? [],
    articles = all.filter((article) =>
      filter === "archive"
        ? article.freshness === "ARCHIVED"
        : article.freshness !== "ARCHIVED",
    );
  const analyze = async (article: PersonalizedNewsArticle) => {
    if (!userId || explanations[article.article_id]?.loading) return;
    setExplanations((previous) => ({
      ...previous,
      [article.article_id]: { loading: true },
    }));
    try {
      const response = await fetch("/api/ai/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "news_article",
          stock: { symbol, name: companyName || symbol, sector },
          article: {
            title: article.title,
            source_name: article.source_name,
            pubDate: article.pubDate,
            description: article.description,
            link: article.link,
            is_delayed_feed: article.temporal_info?.is_delayed_feed,
            timestamp_display:
              article.temporal_info?.display_label ||
              `${article.pubDate} (${article.temporal_info?.timestamp_type || "publication time"})`,
          },
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          data.error || `AI analysis is unavailable (${response.status}).`,
        );
      setExplanations((previous) => ({
        ...previous,
        [article.article_id]: {
          loading: false,
          text: data.explanation,
          source: data.source,
          model: data.model,
        },
      }));
    } catch (error) {
      setExplanations((previous) => ({
        ...previous,
        [article.article_id]: {
          loading: false,
          error:
            error instanceof Error
              ? error.message
              : "AI analysis is unavailable.",
        },
      }));
    }
  };
  const content = (
    <>
      <div className="flex flex-wrap justify-between items-start gap-3">
        <div>
          <h3 className="text-base font-bold text-foreground">
            {preview ? "Recent Coverage" : "News & AI Research"}
          </h3>
          <p className="text-xs text-muted mt-1">
            {companyName || symbol} · source-linked coverage
          </p>
        </div>
        <button
          type="button"
          className="research-icon-button"
          aria-label="Refresh company news"
          disabled={query.isFetching}
          onClick={() => query.refetch()}
        >
          <RefreshCw
            size={16}
            className={query.isFetching ? "animate-spin" : ""}
          />
        </button>
      </div>
      <div className="flex flex-wrap gap-2 mt-4">
        {(["recent", "archive"] as const).map((value) => (
          <button
            type="button"
            key={value}
            aria-pressed={filter === value}
            className={`research-button ${filter === value ? "text-indigo-700 dark:text-indigo-300 border-indigo-500/40 bg-indigo-500/10" : ""}`}
            onClick={() => setFilter(value)}
          >
            {value === "recent" ? "Recent coverage" : "Archive"} (
            {
              all.filter((article) =>
                value === "archive"
                  ? article.freshness === "ARCHIVED"
                  : article.freshness !== "ARCHIVED",
              ).length
            }
            )
          </button>
        ))}
      </div>
      {query.isLoading ? (
        <p role="status" className="py-10 text-xs text-muted">
          Loading company news…
        </p>
      ) : query.isError ? (
        <p role="alert" className="py-5 text-xs text-muted">
          {query.error.message}{" "}
          <button className="underline" onClick={() => query.refetch()}>
            Retry news
          </button>
        </p>
      ) : articles.length === 0 ? (
        <div className="py-8 text-xs text-muted leading-relaxed">
          <p className="font-semibold text-foreground">
            No {filter === "archive" ? "archived" : "recent"} matches available.
          </p>
          <p className="mt-2">
            {query.data?.message ||
              "The connected feeds have no matching records in this category."}{" "}
            {all.length > 0 && "Try the other coverage category."}
          </p>
        </div>
      ) : (
        <div className="space-y-3 mt-4">
          {articles.slice(0, preview ? 3 : 12).map((article) => {
            const ai = explanations[article.article_id],
              temporal = article.temporal_info;
            return (
              <article
                key={article.article_id}
                className="rounded-xl border border-border bg-surface-raised/30 p-3 sm:p-4"
              >
                <div className="flex items-start gap-3">
                  <Thumbnail article={article} />
                  <div className="min-w-0 flex-1">
                    <a
                      href={article.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-semibold text-foreground hover:text-indigo-700 dark:hover:text-indigo-300 leading-snug inline-flex gap-2"
                    >
                      <span>{article.title}</span>
                      <ExternalLink size={13} className="shrink-0 mt-1" />
                    </a>
                    <div className="text-[11px] text-muted flex flex-wrap gap-x-2 gap-y-1 mt-2">
                      <span>{article.source_name}</span>
                      <span>·</span>
                      <span>
                        {temporal?.display_label ||
                          new Date(article.pubDate).toLocaleString("en-IN", {
                            timeZone: "Asia/Kolkata",
                          }) + " IST"}
                      </span>
                      <span className="capitalize">
                        · {article.source_provider}
                      </span>
                      {temporal?.is_cached && <span>· Cached</span>}
                      {temporal?.is_delayed_feed && (
                        <span className="text-amber-700 dark:text-amber-400">
                          · Delayed feed
                        </span>
                      )}
                    </div>
                    {temporal?.timestamp_type === "indexed" && (
                      <p className="text-[10px] text-muted mt-1">
                        Provider indexing time; publication time is unconfirmed.
                      </p>
                    )}
                    {!preview && article.description && (
                      <p className="text-xs text-muted leading-relaxed mt-2 line-clamp-3">
                        {article.description}
                      </p>
                    )}
                    {!preview && article.explanation && (
                      <p className="text-[11px] text-muted mt-2">
                        Relevance: {article.explanation}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  {userId ? (
                    <button
                      type="button"
                      disabled={ai?.loading}
                      className="research-button text-teal-700 dark:text-teal-300 border-teal-500/30 bg-teal-500/10"
                      onClick={() => analyze(article)}
                    >
                      <Sparkles size={14} />
                      {ai?.loading
                        ? "Analyzing…"
                        : ai?.text || ai?.error
                          ? "Retry AI analysis"
                          : "Analyze with FINOVA AI"}
                    </button>
                  ) : (
                    <Link
                      className="research-button text-teal-700 dark:text-teal-300 border-teal-500/30"
                      href={`/login?next=${encodeURIComponent(`/explore/stocks/${symbol}?tab=news`)}`}
                    >
                      <Sparkles size={14} />
                      Sign in for AI analysis
                    </Link>
                  )}
                  <a
                    href={article.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-brand underline"
                  >
                    Read original source
                  </a>
                </div>
                {ai?.error && (
                  <p
                    role="alert"
                    className="mt-3 text-xs text-amber-700 dark:text-amber-400"
                  >
                    {ai.error} No AI conclusion is shown. You can retry or
                    review the original source.
                  </p>
                )}
                {ai?.text && (
                  <div className="mt-3 p-4 border border-teal-500/25 bg-teal-500/5 rounded-xl">
                    <p className="text-[11px] font-bold text-teal-700 dark:text-teal-300 mb-2">
                      {ai.source === "gemini"
                        ? `FINOVA AI · ${ai.model || "Gemini"}`
                        : "AI unavailable · sourced-context guidance"}
                    </p>
                    <p className="text-xs leading-relaxed text-foreground whitespace-pre-wrap">
                      {ai.text}
                    </p>
                    <p className="text-[10px] text-muted mt-3">
                      Educational interpretation of the supplied article. Check
                      the linked source and company filings; no Buy/Sell
                      recommendation or price target.
                    </p>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
      <p className="text-[11px] text-muted mt-4">
        Provider access, indexing and retrieval times do not independently
        verify a headline or make it live news.
      </p>
    </>
  );
  return preview ? (
    <div className="min-w-0">{content}</div>
  ) : (
    <section className="research-card border-t-2 border-t-indigo-500/60">
      {content}
    </section>
  );
}
