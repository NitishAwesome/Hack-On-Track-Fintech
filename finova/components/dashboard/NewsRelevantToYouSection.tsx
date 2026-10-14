'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Newspaper, ArrowUpRight, ExternalLink } from 'lucide-react';
import { usePrivateQuery } from '@/lib/hooks/usePrivateQuery';
import { PageSection, SectionFeedback } from '@/components/shared/PageSection';
import { isRecentArticle, resolveArticleTemporalInfo } from '@/lib/news/temporalUtils';
import type { PersonalizedNewsArticle } from '@/types/news';

export function NewsRelevantToYouSection() {
  const [view, setView] = useState<'recent' | 'archive'>('recent');
  const query = usePrivateQuery<{
    articles: PersonalizedNewsArticle[];
    meta?: { cached?: boolean };
  }>({
    queryKey: ['news', 'dashboard'],
    staleTime: 300000,
    queryFn: async () => {
      const response = await fetch('/api/news');
      if (!response.ok) throw new Error('The news providers could not be reached.');
      return response.json();
    },
  });
  const articles = (query.data?.articles ?? [])
    .filter(
      (article) =>
        /^https?:\/\//.test(article.link) &&
        (view === 'recent' ? isRecentArticle(article) : !isRecentArticle(article)),
    )
    .slice(0, 3);
  return (
    <PageSection
      title="News & your portfolio"
      description="Source-linked coverage, with portfolio relevance where available."
      icon={Newspaper}
      accent="teal"
      action={
        <Link href="/news" className="finova-link">
          News & Market
          <ArrowUpRight size={14} />
        </Link>
      }
    >
      <div className="flex flex-wrap justify-between gap-3 items-center mb-5">
        <div
          className="flex gap-1 rounded-lg bg-surface-raised/50 p-1"
          aria-label="News publication period"
        >
          {(['recent', 'archive'] as const).map((value) => (
            <button
              type="button"
              key={value}
              aria-pressed={view === value}
              onClick={() => setView(value)}
              className={`min-h-10 px-3 text-xs font-semibold rounded-md ${view === value ? 'bg-teal-700 text-white' : 'text-muted hover:text-foreground'}`}
            >
              {value === 'recent' ? 'Recent' : 'Archive'}
            </button>
          ))}
        </div>
        <span className="text-[11px] text-muted">
          {query.data?.meta?.cached ? 'Cached provider feed' : 'Provider-reported coverage'}
        </span>
      </div>
      <SectionFeedback
        loading={query.isLoading}
        error={query.error?.message}
        retry={() => {
          void query.refetch();
        }}
      >
        {!articles.length ? (
          <div className="finova-empty">
            <p className="text-sm font-semibold">
              {view === 'recent'
                ? 'No recent headlines available'
                : 'No archive headlines available'}
            </p>
            <p className="text-xs text-muted mt-2">
              Feed availability varies. Check the other view or open News & Market for provider
              details.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-4">
            {articles.map((article) => {
              const time = resolveArticleTemporalInfo(article, query.data?.meta?.cached);
              const image =
                article.image_url && /^https?:\/\//.test(article.image_url)
                  ? article.image_url
                  : null;
              return (
                <a
                  key={article.article_id}
                  href={article.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="finova-tile flex flex-col overflow-hidden group"
                  data-tone="teal"
                >
                  <div className="relative h-36 bg-surface-raised overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center text-muted">
                      <Newspaper size={32} strokeWidth={1.3} />
                    </div>
                    {image && (
                      <Image
                        src={image}
                        alt=""
                        fill
                        unoptimized
                        sizes="(max-width: 768px) 100vw, 33vw"
                        loading="lazy"
                        className="object-cover transition-transform duration-300 group-hover:scale-[1.025]"
                        onError={(event) => {
                          event.currentTarget.style.visibility = 'hidden';
                        }}
                      />
                    )}
                  </div>
                  <div className="p-5 flex flex-col flex-1">
                    <p className="finova-eyebrow mb-2">
                      {article.matched_holding?.symbol
                        ? `YOUR HOLDING · ${article.matched_holding.symbol}`
                        : article.matched_sector
                          ? `SECTOR · ${article.matched_sector}`
                          : 'MARKET COVERAGE'}
                    </p>
                    <h3 className="text-sm font-bold text-foreground leading-relaxed group-hover:text-brand">
                      {article.title}
                    </h3>
                    <p className="text-xs text-muted mt-2 line-clamp-2 leading-relaxed">
                      {article.description || article.explanation}
                    </p>
                    <div className="border-t border-border pt-3 mt-4 flex-1 flex flex-col justify-end">
                      <p className="text-[11px] font-semibold text-foreground flex justify-between gap-2">
                        {article.source_name}
                        <ExternalLink size={12} className="shrink-0" />
                      </p>
                      <p className="text-[10px] text-muted mt-1 leading-relaxed">
                        {time.display_label} · {time.formatted_ist}
                      </p>
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </SectionFeedback>
    </PageSection>
  );
}
