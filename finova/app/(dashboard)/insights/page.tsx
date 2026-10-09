'use client';

// ============================================================
// FINOVA — AI Portfolio Intelligence & News Page
// /insights route
// ============================================================

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ExternalLink, Newspaper } from 'lucide-react';
import { PortfolioIntelligenceHub } from '@/components/insights/PortfolioIntelligenceHub';
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
    <div className="page-container space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'rgb(var(--foreground))' }}>
          Portfolio Intelligence & Insights
        </h1>
        <p className="text-sm mt-1" style={{ color: 'rgb(var(--muted))' }}>
          Deterministic risk calculations, sector concentrations, and AI-powered portfolio synthesis
        </p>
      </div>

      {/* Primary Section: Complete AI Portfolio Intelligence & Risk Diagnostics Hub */}
      <PortfolioIntelligenceHub />

      {/* Secondary Section: Personalized Market News */}
      <div className="space-y-4 pt-4 border-t" style={{ borderColor: 'rgb(var(--border))' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Newspaper className="w-4 h-4 text-brand" />
            <h2 className="text-sm font-semibold" style={{ color: 'rgb(var(--foreground))' }}>
              Holdings-Relevant Market News
            </h2>
          </div>
          {holdings.length > 0 && (
            <span className="text-xs" style={{ color: 'rgb(var(--muted))' }}>
              Filtered for top portfolio symbols
            </span>
          )}
        </div>

        {noApiKey && (
          <div
            className="card p-4 text-xs"
            style={{ backgroundColor: 'rgb(var(--warning-bg))', borderColor: 'rgb(var(--warning))' }}
          >
            <p style={{ color: 'rgb(var(--warning))' }}>
              Add <code className="font-mono text-xs font-bold">NEWSDATA_API_KEY</code> to your .env.local to enable real-time financial news integration.
            </p>
          </div>
        )}

        {newsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} lines={4} />
            ))}
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
            <p className="text-xs" style={{ color: 'rgb(var(--muted))' }}>
              No recent news articles matched your active holdings.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
