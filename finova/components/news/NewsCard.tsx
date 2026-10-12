'use client';
/* eslint-disable @next/next/no-img-element */

// ============================================================
// FINOVA — Editorial Financial News Card Component
// components/news/NewsCard.tsx
//
// Modern financial news card with verified timestamps,
// evidence-based freshness indicators, delayed feed disclosures,
// and publisher transparency.
// ============================================================

import React, { useState } from 'react';
import {
  Sparkles,
  ExternalLink,
  TrendingUp,
  Building2,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Newspaper,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import type { PersonalizedNewsArticle } from '@/types/news';
import { resolveArticleTemporalInfo } from '@/lib/news/temporalUtils';

interface NewsCardProps {
  article: PersonalizedNewsArticle;
  isFeatured?: boolean;
  onExplainAi: (article: PersonalizedNewsArticle) => void;
  isExpandedReason: boolean;
  onToggleReason: () => void;
}

export function NewsCard({
  article,
  isFeatured = false,
  onExplainAi,
  isExpandedReason,
  onToggleReason,
}: NewsCardProps) {
  const [imgError, setImgError] = useState(false);
  const hasValidImage = Boolean(article.image_url && !imgError);

  // Resolve verified temporal and provider metadata
  const temporal = article.temporal_info || resolveArticleTemporalInfo(article);

  const handleCardClick = (e: React.MouseEvent) => {
    // If the click came from an interactive button or link, don't trigger article opening
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a')) {
      return;
    }
    window.open(article.link, '_blank', 'noopener,noreferrer');
  };

  // Helper for evidence-based badge
  const renderFreshnessBadge = () => {
    if (temporal.is_delayed_feed) {
      return (
        <span
          className="px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide border flex items-center gap-1 shadow-2xs"
          style={{
            backgroundColor: 'rgba(245, 158, 11, 0.15)',
            borderColor: 'rgba(245, 158, 11, 0.35)',
            color: '#fbbf24',
          }}
          title="NewsData.io free feed with ~12-hour access delay"
        >
          <Clock className="w-2.5 h-2.5" />
          Delayed Feed (~12h)
        </span>
      );
    }

    if (temporal.freshness_badge === 'RECENTLY_PUBLISHED') {
      return (
        <span
          className="px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide border flex items-center gap-1 shadow-2xs"
          style={{
            backgroundColor: 'rgb(var(--brand-500) / 0.15)',
            borderColor: 'rgb(var(--brand-500) / 0.35)',
            color: 'rgb(var(--brand-400))',
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
          Recently Published
        </span>
      );
    }

    if (temporal.freshness_badge === 'PUBLISHED_TODAY') {
      return (
        <span
          className="px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide border flex items-center gap-1 shadow-2xs"
          style={{
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            borderColor: 'rgba(16, 185, 129, 0.35)',
            color: '#34d399',
          }}
        >
          Published Today
        </span>
      );
    }

    if (temporal.freshness_badge === 'INDEXED_RECENTLY') {
      return (
        <span
          className="px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide border flex items-center gap-1 shadow-2xs"
          style={{
            backgroundColor: 'rgba(6, 182, 212, 0.15)',
            borderColor: 'rgba(6, 182, 212, 0.35)',
            color: '#22d3ee',
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          Indexed Recently
        </span>
      );
    }

    if (temporal.freshness_badge === 'INDEXED_TODAY') {
      return (
        <span
          className="px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide border flex items-center gap-1 shadow-2xs"
          style={{
            backgroundColor: 'rgba(20, 184, 166, 0.15)',
            borderColor: 'rgba(20, 184, 166, 0.35)',
            color: '#2dd4bf',
          }}
        >
          Indexed Today
        </span>
      );
    }

    if (temporal.freshness_badge === 'TIME_UNAVAILABLE') {
      return (
        <span
          className="px-2 py-0.5 rounded text-[10px] font-medium border text-muted"
          style={{
            backgroundColor: 'rgb(var(--surface-raised))',
            borderColor: 'rgb(var(--border))',
          }}
        >
          Date Unavailable
        </span>
      );
    }

    return (
      <span
        className="px-2 py-0.5 rounded text-[10px] font-medium border text-muted"
        style={{
          backgroundColor: 'rgb(var(--surface-raised))',
          borderColor: 'rgb(var(--border))',
        }}
      >
        Older Article
      </span>
    );
  };

  // -------------------------------------------------------------
  // FEATURED CARD (Wide editorial hero layout)
  // -------------------------------------------------------------
  if (isFeatured) {
    return (
      <article
        onClick={handleCardClick}
        className="group relative rounded-2xl border transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl hover:shadow-black/5 dark:hover:shadow-black/25 hover:border-brand/40 cursor-pointer overflow-hidden"
        style={{
          backgroundColor: 'rgb(var(--surface))',
          borderColor: 'rgb(var(--border))',
        }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
          {/* Image Column */}
          <div className="lg:col-span-6 relative aspect-[16/10] lg:aspect-auto lg:min-h-[360px] overflow-hidden bg-surface-raised">
            {hasValidImage ? (
              <img
                src={article.image_url!}
                alt={article.title}
                loading="lazy"
                onError={() => setImgError(true)}
                className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
              />
            ) : (
              <div
                className="w-full h-full min-h-[220px] flex flex-col items-center justify-center gap-2.5 p-6 text-center select-none"
                style={{
                  background:
                    'linear-gradient(135deg, rgb(var(--surface-raised)), rgb(var(--surface)))',
                }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center border shadow-xs"
                  style={{
                    backgroundColor: 'rgb(var(--surface))',
                    borderColor: 'rgb(var(--border))',
                    color: 'rgb(var(--brand-500))',
                  }}
                >
                  <Newspaper className="w-6 h-6 opacity-75" />
                </div>
                <span
                  className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: 'rgb(var(--muted))' }}
                >
                  {article.source_name || 'Market Wire'}
                </span>
              </div>
            )}

            {/* Overlaid Badges */}
            <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5 z-10">
              <span
                className="px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider backdrop-blur-md shadow-sm border"
                style={{
                  backgroundColor: 'rgb(var(--surface) / 0.85)',
                  borderColor: 'rgb(var(--border))',
                  color: 'rgb(var(--foreground))',
                }}
              >
                Lead Story
              </span>

              {renderFreshnessBadge()}

              {temporal.is_cached && (
                <span
                  className="px-2 py-0.5 rounded text-[10px] font-medium backdrop-blur-md border"
                  style={{
                    backgroundColor: 'rgb(var(--surface) / 0.75)',
                    borderColor: 'rgb(var(--border))',
                    color: 'rgb(var(--muted))',
                  }}
                >
                  Cached
                </span>
              )}
            </div>

            {/* Relative Time Pill on Image */}
            <div className="absolute top-3 right-3 z-10">
              <span
                className="px-2 py-0.5 rounded text-[10px] font-medium backdrop-blur-md border shadow-xs"
                style={{
                  backgroundColor: 'rgb(var(--surface) / 0.85)',
                  borderColor: 'rgb(var(--border))',
                  color: 'rgb(var(--foreground))',
                }}
              >
                {temporal.relative_time}
              </span>
            </div>
          </div>

          {/* Editorial Content Column */}
          <div className="lg:col-span-6 p-6 sm:p-7 flex flex-col justify-between gap-4">
            <div className="space-y-3.5">
              {/* Category & Portfolio Match Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-1.5">
                  {article.relevance_category === 'DIRECT_HOLDING' && (
                    <span
                      className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"
                      style={{
                        backgroundColor: 'rgb(var(--brand-500) / 0.12)',
                        color: 'rgb(var(--brand-500))',
                      }}
                    >
                      <Building2 className="w-3 h-3" />
                      Direct Holding Match
                    </span>
                  )}

                  {article.relevance_category === 'SECTOR_RELEVANCE' && (
                    <span
                      className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider"
                      style={{
                        backgroundColor: 'rgb(var(--info-bg) / 0.4)',
                        color: 'rgb(var(--info))',
                      }}
                    >
                      Sector: {article.matched_sector}
                    </span>
                  )}

                  {article.relevance_category === 'GENERAL_MARKET' && (
                    <span
                      className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider"
                      style={{
                        backgroundColor: 'rgb(var(--surface-raised))',
                        color: 'rgb(var(--muted))',
                      }}
                    >
                      Indian Markets
                    </span>
                  )}
                </div>

                <span className="text-[10px] font-medium text-muted">
                  Relevance: {article.relevance_score}/100
                </span>
              </div>

              {/* Publisher & Verified Timestamp Metadata Box */}
              <div
                className="p-3 rounded-xl border flex flex-col gap-1 text-xs"
                style={{
                  backgroundColor: 'rgb(var(--surface-raised))',
                  borderColor: 'rgb(var(--border))',
                }}
              >
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm tracking-tight text-foreground">
                      {article.source_name || 'Financial Media'}
                    </span>
                    <span title="Source-attributed media publisher">
                      <ShieldCheck className="w-3.5 h-3.5 text-brand" />
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-foreground/90">
                    {temporal.display_label}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted pt-0.5 border-t border-border/40">
                  <span className="flex items-center gap-1 font-medium text-foreground/75">
                    <Clock className="w-3 h-3 text-muted" />
                    {temporal.relative_time}
                  </span>
                  <span>·</span>
                  <span>News source: {temporal.provider_display_name}</span>
                  {temporal.is_delayed_feed && (
                    <>
                      <span>·</span>
                      <span className="text-amber-400 font-medium">Delayed feed (~12h delay)</span>
                    </>
                  )}
                  {temporal.is_cached && (
                    <>
                      <span>·</span>
                      <span>Cached</span>
                    </>
                  )}
                </div>
              </div>

              {/* Headline */}
              <h2
                className="text-lg sm:text-xl font-bold leading-snug tracking-tight group-hover:text-brand transition-colors line-clamp-3"
                style={{ color: 'rgb(var(--foreground))' }}
              >
                {article.title}
              </h2>

              {/* Description */}
              {article.description && (
                <p
                  className="text-xs sm:text-sm leading-relaxed line-clamp-3"
                  style={{ color: 'rgb(var(--muted))' }}
                >
                  {article.description}
                </p>
              )}

              {/* Matched Holding Context Pill */}
              {article.matched_holding && (
                <div
                  className="p-3 rounded-xl border flex items-center justify-between text-xs"
                  style={{
                    backgroundColor: 'rgb(var(--surface-raised))',
                    borderColor: 'rgb(var(--border))',
                  }}
                >
                  <div
                    className="flex items-center gap-1.5 font-semibold"
                    style={{ color: 'rgb(var(--foreground))' }}
                  >
                    <TrendingUp className="w-3.5 h-3.5 text-brand" />
                    <span>
                      {article.matched_holding.name} ({article.matched_holding.symbol})
                    </span>
                  </div>

                  <div
                    className="flex items-center gap-2 text-[11px]"
                    style={{ color: 'rgb(var(--muted))' }}
                  >
                    {article.matched_holding.weight_pct !== null && (
                      <span>~{article.matched_holding.weight_pct}% portfolio weight</span>
                    )}
                    {article.matched_holding.is_cross_broker && (
                      <span className="text-brand font-medium">· Multi-Broker</span>
                    )}
                  </div>
                </div>
              )}

              {/* Expandable "Why this matters" section */}
              <div
                className="rounded-xl border overflow-hidden transition-all text-xs"
                style={{
                  backgroundColor: 'rgb(var(--surface-raised))',
                  borderColor: 'rgb(var(--border))',
                }}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleReason();
                  }}
                  className="w-full p-2.5 flex items-center justify-between font-semibold hover:bg-surface-raised/60 transition-colors"
                  style={{ color: 'rgb(var(--foreground))' }}
                >
                  <span className="flex items-center gap-1.5 text-[11px]">
                    <HelpCircle className="w-3.5 h-3.5 text-brand" />
                    Why is this relevant to your portfolio?
                  </span>
                  {isExpandedReason ? (
                    <ChevronUp className="w-3.5 h-3.5 text-muted" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-muted" />
                  )}
                </button>

                {isExpandedReason && (
                  <div
                    className="p-3 pt-0 border-t text-[11px] leading-relaxed space-y-2"
                    style={{
                      borderColor: 'rgb(var(--border))',
                      color: 'rgb(var(--muted))',
                    }}
                  >
                    <p>{article.explanation}</p>
                    {article.investigation_prompts && article.investigation_prompts.length > 0 && (
                      <div className="pt-1">
                        <span className="font-semibold text-foreground text-[10px] uppercase tracking-wider block mb-0.5">
                          Investigation Prompt:
                        </span>
                        <p className="italic text-[10px]">{article.investigation_prompts[0]}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Actions Row */}
            <div
              className="pt-3 border-t flex items-center justify-between gap-3 text-xs"
              style={{ borderColor: 'rgb(var(--border))' }}
            >
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted">
                  Source-attributed coverage
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onExplainAi(article);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all hover:bg-surface-raised text-brand"
                  style={{
                    borderColor: 'rgb(var(--border))',
                    backgroundColor: 'rgb(var(--surface))',
                  }}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>AI Smart Insight</span>
                </button>

                <a
                  href={article.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted hover:text-foreground transition-colors"
                >
                  <span>Read story</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </article>
    );
  }

  // -------------------------------------------------------------
  // REGULAR CARD (Clean editorial grid card)
  // -------------------------------------------------------------
  return (
    <article
      onClick={handleCardClick}
      className="group relative rounded-2xl border transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl hover:shadow-black/5 dark:hover:shadow-black/25 hover:border-brand/40 cursor-pointer overflow-hidden flex flex-col justify-between"
      style={{
        backgroundColor: 'rgb(var(--surface))',
        borderColor: 'rgb(var(--border))',
      }}
    >
      <div>
        {/* Card Image Banner */}
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-surface-raised">
          {hasValidImage ? (
            <img
              src={article.image_url!}
              alt={article.title}
              loading="lazy"
              onError={() => setImgError(true)}
              className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
            />
          ) : (
            <div
              className="w-full h-full flex flex-col items-center justify-center gap-2 p-4 text-center select-none"
              style={{
                background:
                  'linear-gradient(135deg, rgb(var(--surface-raised)), rgb(var(--surface)))',
              }}
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center border shadow-2xs"
                style={{
                  backgroundColor: 'rgb(var(--surface))',
                  borderColor: 'rgb(var(--border))',
                  color: 'rgb(var(--brand-500))',
                }}
              >
                <Newspaper className="w-4 h-4 opacity-75" />
              </div>
              <span
                className="text-[11px] font-medium uppercase tracking-wider"
                style={{ color: 'rgb(var(--muted))' }}
              >
                {article.source_name || 'Financial News'}
              </span>
            </div>
          )}

          {/* Badges Overlay on Image */}
          <div className="absolute top-2.5 left-2.5 flex flex-wrap items-center gap-1.5 z-10">
            {article.relevance_category === 'DIRECT_HOLDING' && (
              <span
                className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider backdrop-blur-md shadow-xs flex items-center gap-1"
                style={{
                  backgroundColor: 'rgb(var(--surface) / 0.9)',
                  color: 'rgb(var(--brand-500))',
                }}
              >
                <Building2 className="w-3 h-3" />
                Direct Match
              </span>
            )}

            {renderFreshnessBadge()}
          </div>

          <div className="absolute top-2.5 right-2.5 z-10">
            <span
              className="px-2 py-0.5 rounded text-[10px] font-medium backdrop-blur-md shadow-xs border"
              style={{
                backgroundColor: 'rgb(var(--surface) / 0.85)',
                borderColor: 'rgb(var(--border))',
                color: 'rgb(var(--foreground))',
              }}
            >
              {temporal.relative_time}
            </span>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-4 sm:p-5 space-y-3">
          {/* Publisher & Temporal Metadata Row */}
          <div
            className="p-2.5 rounded-xl border flex flex-col gap-1 text-xs"
            style={{
              backgroundColor: 'rgb(var(--surface-raised))',
              borderColor: 'rgb(var(--border))',
            }}
          >
            <div className="flex items-center justify-between gap-1">
              <span className="font-bold text-xs truncate max-w-[160px] text-foreground">
                {article.source_name || 'Financial Media'}
              </span>
              <span className="text-[10px] font-semibold text-foreground/90 shrink-0">
                {temporal.display_label}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-muted pt-0.5 border-t border-border/40">
              <span className="font-medium text-foreground/70">{temporal.relative_time}</span>
              <span>·</span>
              <span>via {temporal.provider_display_name}</span>
              {temporal.is_delayed_feed && (
                <>
                  <span>·</span>
                  <span className="text-amber-400 font-medium">~12h delay</span>
                </>
              )}
              {temporal.is_cached && (
                <>
                  <span>·</span>
                  <span>Cached</span>
                </>
              )}
            </div>
          </div>

          {/* Headline */}
          <h3
            className="text-sm sm:text-base font-bold leading-snug tracking-tight group-hover:text-brand transition-colors line-clamp-2"
            style={{ color: 'rgb(var(--foreground))' }}
          >
            {article.title}
          </h3>

          {/* Description snippet */}
          {article.description && (
            <p
              className="text-xs leading-relaxed line-clamp-2"
              style={{ color: 'rgb(var(--muted))' }}
            >
              {article.description}
            </p>
          )}

          {/* Matched Holding Pill */}
          {article.matched_holding && (
            <div
              className="p-2.5 rounded-xl border flex items-center justify-between text-xs"
              style={{
                backgroundColor: 'rgb(var(--surface-raised))',
                borderColor: 'rgb(var(--border))',
              }}
            >
              <div
                className="flex items-center gap-1.5 font-semibold truncate"
                style={{ color: 'rgb(var(--foreground))' }}
              >
                <TrendingUp className="w-3.5 h-3.5 text-brand shrink-0" />
                <span className="truncate">
                  {article.matched_holding.symbol}
                </span>
              </div>

              {article.matched_holding.weight_pct !== null && (
                <span className="text-[11px] shrink-0" style={{ color: 'rgb(var(--muted))' }}>
                  ~{article.matched_holding.weight_pct}% weight
                </span>
              )}
            </div>
          )}

          {/* "Why this matters" Collapsible */}
          <div
            className="rounded-xl border overflow-hidden transition-all text-xs"
            style={{
              backgroundColor: 'rgb(var(--surface-raised))',
              borderColor: 'rgb(var(--border))',
            }}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleReason();
              }}
              className="w-full p-2.5 flex items-center justify-between font-semibold hover:bg-surface-raised/60 transition-colors text-left cursor-pointer"
              style={{ color: 'rgb(var(--foreground))' }}
            >
              <span className="flex items-center gap-1.5 text-[11px] truncate">
                <HelpCircle className="w-3.5 h-3.5 text-brand shrink-0" />
                <span className="truncate">Why relevant to your portfolio?</span>
              </span>
              {isExpandedReason ? (
                <ChevronUp className="w-3.5 h-3.5 text-muted shrink-0" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-muted shrink-0" />
              )}
            </button>

            {isExpandedReason && (
              <div
                className="p-3 pt-0 border-t text-[11px] leading-relaxed space-y-1.5"
                style={{
                  borderColor: 'rgb(var(--border))',
                  color: 'rgb(var(--muted))',
                }}
              >
                <p>{article.explanation}</p>
                {article.investigation_prompts && article.investigation_prompts.length > 0 && (
                  <p className="italic text-[10px] text-foreground/80 pt-1 border-t border-border/50">
                    Prompt: {article.investigation_prompts[0]}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer Action Buttons */}
      <div
        className="p-4 pt-2 border-t flex items-center justify-between gap-2 text-xs"
        style={{ borderColor: 'rgb(var(--border))' }}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onExplainAi(article);
          }}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all hover:bg-surface-raised text-brand cursor-pointer"
          style={{
            borderColor: 'rgb(var(--border))',
            backgroundColor: 'rgb(var(--surface))',
          }}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>AI Smart Insight</span>
        </button>

        <a
          href={article.link}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted hover:text-foreground transition-colors cursor-pointer"
        >
          <span>Read story</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </article>
  );
}
