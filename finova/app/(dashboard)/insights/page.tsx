'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ExternalLink, Newspaper, BookmarkPlus } from 'lucide-react';
import { AIInsightCard } from '@/components/insights/AIInsightCard';
import { SkeletonCard } from '@/components/shared/Skeletons';
import { formatDate } from '@/lib/utils';
import type { NewsArticle, HoldingWithMetrics } from '@/types/portfolio';

async function fetchHoldings() {
  const res = await fetch('/api/portfolio/holdings');
  if (!res.ok) throw new Error();
  return res.json();
}

async function fetchNews(symbols: string) {
  const res = await fetch(`/api/news?symbols=${symbols}`);
  if (!res.ok) throw new Error();
  return res.json();
}

export default function InsightsPage() {
  const { data: holdingsData } = useQuery({ queryKey: ['holdings'], queryFn: fetchHoldings });
  const holdings: HoldingWithMetrics[] = holdingsData?.holdings ?? [];
  const symbols = holdings.slice(0, 5).map((h) => h.symbol).join(',');

  const { data: newsData, isLoading: newsLoading } = useQuery({
    queryKey: ['news', symbols],
    queryFn: () => fetchNews(symbols),
    enabled: true,
  });

  const articles: NewsArticle[] = newsData?.articles ?? [];
  const noApiKey = newsData?.message?.includes('NEWSDATA_API_KEY');

  return (
    <div className="page-container space-y-6">
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: 'rgb(var(--foreground))' }}>
          Insights
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'rgb(var(--muted))' }}>
          AI analysis and market news relevant to your portfolio
        </p>
      </div>

      {/* AI Insights */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold" style={{ color: 'rgb(var(--foreground))' }}>
          AI Portfolio Analysis
        </h2>
        <AIInsightCard insightType="portfolio_summary" />
        <AIInsightCard insightType="diversification_advice" />
      </div>

      {/* News */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold" style={{ color: 'rgb(var(--foreground))' }}>
          Market News
          {holdings.length > 0 && (
            <span className="ml-2 text-xs font-normal" style={{ color: 'rgb(var(--muted))' }}>
              related to your holdings
            </span>
          )}
        </h2>

        {noApiKey && (
          <div
            className="card p-4 text-sm"
            style={{ backgroundColor: 'rgb(var(--warning-bg))', borderColor: 'rgb(var(--warning))' }}
          >
            <p style={{ color: 'rgb(var(--warning))' }}>
              Add <code className="font-mono text-xs">NEWSDATA_API_KEY</code> to your .env.local to enable live news.
            </p>
          </div>
        )}

        {newsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} lines={4} />)}
          </div>
        ) : articles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {articles.map((article, i) => (
              <motion.div
                key={article.article_id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="card p-4 flex flex-col gap-2 group"
              >
                <div className="flex items-start justify-between gap-2">
                  <a
                    href={article.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium leading-snug hover:underline flex-1"
                    style={{ color: 'rgb(var(--foreground))' }}
                  >
                    {article.title}
                  </a>
                  <a
                    href={article.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: 'rgb(var(--muted))' }}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
                {article.description && (
                  <p className="text-xs line-clamp-2" style={{ color: 'rgb(var(--muted))' }}>
                    {article.description}
                  </p>
                )}
                <div className="flex items-center justify-between mt-auto pt-1">
                  <span className="text-xs" style={{ color: 'rgb(var(--muted))' }}>
                    {article.source_name} · {article.pubDate ? formatDate(article.pubDate, true) : ''}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        ) : !noApiKey ? (
          <div className="card p-8 flex flex-col items-center gap-2 text-center">
            <Newspaper className="w-8 h-8" style={{ color: 'rgb(var(--muted))' }} />
            <p className="text-sm" style={{ color: 'rgb(var(--muted))' }}>
              No news available at this time.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
