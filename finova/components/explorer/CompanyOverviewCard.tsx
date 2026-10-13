'use client';

import React from 'react';
import { getCompanyProfile } from '@/lib/market/companyProfiles';
import {
  Building2,
  Globe,
  ExternalLink,
  Calendar,
  MapPin,
  Hash,
  BarChart3,
} from 'lucide-react';

interface CompanyOverviewCardProps {
  symbol: string;
  name: string;
  exchange?: string;
  currentPrice?: number | null;
  dayChange?: number | null;
  dayChangePercent?: number | null;
  previousClose?: number | null;
  dayHigh?: number | null;
  dayLow?: number | null;
  fiftyTwoWeekHigh?: number | null;
  fiftyTwoWeekLow?: number | null;
  volume?: number | null;
  sector?: string;
  industry?: string;
  isin?: string;
  currency?: string;
}

export function CompanyOverviewCard({
  symbol,
  name,
  exchange = 'NSE',
  currentPrice,
  dayChange,
  dayChangePercent,
  previousClose,
  dayHigh,
  dayLow,
  fiftyTwoWeekHigh,
  fiftyTwoWeekLow,
  volume,
  sector,
  industry,
  isin,
  currency = 'INR',
}: CompanyOverviewCardProps) {
  const profile = getCompanyProfile(symbol);
  const currencySymbol = currency === 'USD' ? '$' : '₹';

  const formatPrice = (val?: number | null) => {
    if (typeof val !== 'number' || isNaN(val)) return '—';
    return `${currencySymbol}${val.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatVolume = (vol?: number | null) => {
    if (typeof vol !== 'number' || isNaN(vol)) return '—';
    if (vol >= 10000000) return `${(vol / 10000000).toFixed(2)} Cr`;
    if (vol >= 100000) return `${(vol / 100000).toFixed(2)} L`;
    if (vol >= 1000) return `${(vol / 1000).toFixed(1)}K`;
    return vol.toLocaleString('en-IN');
  };

  return (
    <div className="bg-card/70 border border-border/70 rounded-2xl p-6 backdrop-blur-sm space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-surface-raised dark:bg-zinc-800 text-foreground dark:text-zinc-300 border border-border dark:border-zinc-700">
              {exchange}
            </span>
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
              {symbol}
            </span>
            {isin && (
              <span className="text-[11px] text-muted dark:text-zinc-500 font-mono hidden md:inline-flex items-center gap-1">
                <Hash className="w-3 h-3" />
                {isin}
              </span>
            )}
          </div>
          <h2 className="text-2xl font-black text-foreground mt-1 tracking-tight">
            {profile?.name || name || symbol}
          </h2>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted">
            {sector && <span>{sector}</span>}
            {sector && industry && <span>•</span>}
            {industry && <span>{industry}</span>}
          </div>
        </div>

        {typeof currentPrice === 'number' && (
          <div className="sm:text-right">
            <div className="text-3xl font-black text-foreground tracking-tight">
              {formatPrice(currentPrice)}
            </div>
            {typeof dayChange === 'number' && (
              <div
                className={`text-xs font-bold mt-0.5 flex items-center sm:justify-end gap-1 ${
                  dayChange >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                }`}
              >
                <span>{dayChange >= 0 ? '+' : ''}{formatPrice(dayChange)}</span>
                <span>({dayChange >= 0 ? '+' : ''}{dayChangePercent?.toFixed(2)}%)</span>
                <span className="text-muted font-normal">Today</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Fundamentals & Trading Metrics Grid */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted mb-3 flex items-center gap-1.5">
          <BarChart3 className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
          Key Market Statistics
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-surface-raised border border-border">
            <span className="text-[10px] text-muted block uppercase">Previous Close</span>
            <span className="text-sm font-bold text-foreground mt-0.5 block">
              {formatPrice(previousClose)}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-surface-raised border border-border">
            <span className="text-[10px] text-muted block uppercase">Day High</span>
            <span className="text-sm font-bold text-foreground mt-0.5 block">
              {formatPrice(dayHigh)}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-surface-raised border border-border">
            <span className="text-[10px] text-muted block uppercase">Day Low</span>
            <span className="text-sm font-bold text-foreground mt-0.5 block">
              {formatPrice(dayLow)}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-surface-raised border border-border">
            <span className="text-[10px] text-muted block uppercase">Volume</span>
            <span className="text-sm font-bold text-foreground mt-0.5 block">
              {formatVolume(volume)}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-surface-raised border border-border">
            <span className="text-[10px] text-muted block uppercase">52-Week High</span>
            <span className="text-sm font-bold text-foreground mt-0.5 block">
              {formatPrice(fiftyTwoWeekHigh)}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-surface-raised border border-border">
            <span className="text-[10px] text-muted block uppercase">52-Week Low</span>
            <span className="text-sm font-bold text-foreground mt-0.5 block">
              {formatPrice(fiftyTwoWeekLow)}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-surface-raised border border-border">
            <span className="text-[10px] text-muted block uppercase">Exchange</span>
            <span className="text-sm font-bold text-foreground mt-0.5 block">
              {exchange} (National Stock Exchange)
            </span>
          </div>

          <div className="p-3 rounded-xl bg-surface-raised border border-border">
            <span className="text-[10px] text-muted block uppercase">Trading Currency</span>
            <span className="text-sm font-bold text-foreground mt-0.5 block">
              {currency} (Indian Rupee)
            </span>
          </div>
        </div>
      </div>

      {/* About the Company */}
      <div className="space-y-3 pt-2 border-t border-border/40">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
            About the Company
          </h4>
          {profile?.officialWebsite && (
            <a
              href={profile.officialWebsite}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-emerald-700 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 flex items-center gap-1 font-medium transition"
            >
              <Globe className="w-3.5 h-3.5" />
              Official Website
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>

        {profile ? (
          <div className="space-y-3">
            <p className="text-xs sm:text-sm text-foreground dark:text-zinc-300 leading-relaxed">
              {profile.description}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
              {profile.headquarters && (
                <div className="flex items-center gap-2 text-muted">
                  <MapPin className="w-3.5 h-3.5 text-muted dark:text-zinc-400 shrink-0" />
                  <span>Headquarters: <strong className="text-foreground dark:text-zinc-200">{profile.headquarters}</strong></span>
                </div>
              )}
              {profile.foundedYear && (
                <div className="flex items-center gap-2 text-muted">
                  <Calendar className="w-3.5 h-3.5 text-muted dark:text-zinc-400 shrink-0" />
                  <span>Incorporated: <strong className="text-foreground dark:text-zinc-200">{profile.foundedYear}</strong></span>
                </div>
              )}
            </div>

            {profile.keySegments && profile.keySegments.length > 0 && (
              <div className="pt-2">
                <span className="text-[11px] font-semibold text-muted block mb-1.5">Key Business Segments:</span>
                <div className="flex flex-wrap gap-1.5">
                  {profile.keySegments.map((seg) => (
                    <span
                      key={seg}
                      className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-surface-raised dark:bg-zinc-800 text-foreground dark:text-zinc-300 border border-border/60 dark:border-zinc-700/60"
                    >
                      {seg}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-surface-raised border border-border text-xs text-muted">
            Company description currently unavailable for <strong className="text-foreground">{symbol}</strong>. Detailed business profiles are curated for benchmark equities from verified annual filings and stock exchange registries.
          </div>
        )}
      </div>
    </div>
  );
}
