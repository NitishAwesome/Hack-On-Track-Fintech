'use client';

// ============================================================
// FINOVA — IPO Intelligence & Discovery Centre
// components/explorer/IpoDiscoverySection.tsx
//
// Real Primary Market Discovery:
// - Categories: Open for Subscription, Upcoming IPOs, Recently Closed, Recently Listed
// - Verified Attributes: Company name, Exchange, IPO type, Open/Close dates,
//   Price band, Lot size, Issue size, Listing date, Status, Source & Verification timestamp, Official link
// - Explicit empty-schedule handling for inter-schedule bidding lulls
// - Educational RHP Due Diligence & ASBA Guidelines preserved
// - Strict Non-Advisory / Non-Execution: Informational discovery only.
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  FileText,
  CheckCircle2,
  ExternalLink,
  BookOpen,
  Scale,
  Calendar,
  Layers,
  Clock,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';
import type { VerifiedIpoItem, IpoCategory, IpoDiscoveryResponse } from '@/lib/market/ipoData';
import { getVerifiedIpoSchedule } from '@/lib/market/ipoData';

export function IpoDiscoverySection() {
  const [activeCategory, setActiveCategory] = useState<IpoCategory>('listed');
  const [ipoData, setIpoData] = useState<IpoDiscoveryResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const res = await fetch('/api/market/ipo');
        if (res.ok) {
          const json: IpoDiscoveryResponse = await res.json();
          if (isMounted) {
            setIpoData(json);
            // Default to 'open' if issues exist, else 'upcoming'
            if (json.categories.open.length > 0) {
              setActiveCategory('open');
            }
          }
        } else {
          // Fallback to static module if offline
          if (isMounted) {
            setIpoData(getVerifiedIpoSchedule());
          }
        }
      } catch {
        if (isMounted) {
          setIpoData(getVerifiedIpoSchedule());
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, []);

  const currentItems: VerifiedIpoItem[] = ipoData
    ? ipoData.categories[activeCategory] || []
    : [];

  return (
    <div className="bg-card/70 border border-border/70 rounded-2xl p-6 backdrop-blur-sm space-y-6">
      {/* ─── Header ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-foreground tracking-tight flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
              IPO Discovery &amp; Listing Archive
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
              Reviewed Archive
            </span>
          </div>
          <p className="text-xs text-muted mt-0.5">
            A small archive of documented listings. Current and upcoming coverage is unavailable.
          </p>
        </div>

        {/* Source Attribution Badge */}
        <div className="flex items-center gap-1.5 text-[11px] text-muted bg-surface-raised px-3 py-1.5 rounded-xl border border-border">
          <Clock className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
          <span>NSE notices · reviewed {ipoData?.as_of || '2026-10-13'}</span>
        </div>
      </div>

      {/* ─── Category Selection Tabs ───────────────────────────── */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface border border-border overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveCategory('open')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap ${
            activeCategory === 'open'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-muted hover:text-foreground'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Open for Subscription ({ipoData?.categories.open.length || 0})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveCategory('upcoming')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap ${
            activeCategory === 'upcoming'
              ? 'bg-surface-raised text-emerald-700 dark:text-emerald-400 border border-border shadow-sm'
              : 'text-muted hover:text-foreground'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Upcoming IPOs ({ipoData?.categories.upcoming.length || 0})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveCategory('closed')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap ${
            activeCategory === 'closed'
              ? 'bg-surface-raised text-amber-700 dark:text-amber-400 border border-border shadow-sm'
              : 'text-muted hover:text-foreground'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Recently Closed ({ipoData?.categories.closed.length || 0})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveCategory('listed')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap ${
            activeCategory === 'listed'
              ? 'bg-surface-raised text-blue-600 dark:text-blue-400 border border-border shadow-sm'
              : 'text-muted hover:text-foreground'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Listing Archive ({ipoData?.categories.listed.length || 0})</span>
        </button>
      </div>

      {/* ─── Offerings Cards Grid ───────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-44 rounded-xl bg-surface/50 border border-border/40 animate-pulse p-4" />
          ))}
        </div>
      ) : currentItems.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {currentItems.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-xl bg-surface/70 border border-border/70 hover:border-border transition space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-foreground">{item.company_name}</h4>
                    {item.symbol && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-raised text-muted font-mono font-semibold">
                        {item.symbol}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-muted mt-0.5">
                    <span className="text-foreground font-medium">{item.exchange}</span>
                    <span>•</span>
                    <span>{item.ipo_type}</span>
                  </div>
                </div>

                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                    item.status === 'OPEN'
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                      : item.status === 'UPCOMING'
                      ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                      : item.status === 'CLOSED'
                      ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
                      : 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20'
                  }`}
                >
                  {item.status_label}
                </span>
              </div>

              {/* Data Grid: Price, Lot, Issue Size, Dates */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2.5 rounded-lg bg-surface-raised/60 border border-border/50 text-xs">
                <div>
                  <span className="text-[10px] text-muted block">Price Band</span>
                  <span className="font-bold text-foreground font-mono">{item.price_band ?? 'Unavailable'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted block">Lot Size</span>
                  <span className="font-bold text-foreground font-mono">{item.lot_size === null ? 'Unavailable' : `${item.lot_size} Shares`}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted block">Issue Size</span>
                  <span className="font-bold text-foreground font-mono">{item.issue_size_cr === null ? 'Unavailable' : `₹${item.issue_size_cr.toLocaleString('en-IN')} Cr`}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted block">
                    Listing Date
                  </span>
                  <span className="font-bold text-foreground font-mono">
                    {item.listing_date || 'Unavailable'}
                  </span>
                </div>
              </div>

              {/* Timestamps, Source & Verification Links */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] pt-1 border-t border-border/40">
                <div className="text-muted truncate">
                  <span>{item.open_date && item.close_date ? `Bidding: ${item.open_date} to ${item.close_date}` : 'Bidding terms not reviewed'}</span>
                  <span className="mx-1">•</span>
                  <span>{item.source} · Reviewed {item.verified_at}</span>
                </div>

                <a
                  href={item.official_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition shrink-0"
                >
                  <span>Official Filings Link</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Transparent Empty State when No Offerings are Open (e.g. inter-schedule lull) */
        <div className="p-8 rounded-xl bg-surface/50 border border-border/50 text-center space-y-3">
          <Calendar className="w-8 h-8 text-emerald-700 dark:text-emerald-400 mx-auto opacity-70" />
          <div>
            <h4 className="text-sm font-bold text-foreground">
              No reviewed records available in this category
            </h4>
            <p className="text-xs text-muted max-w-md mx-auto mt-1 leading-relaxed">
              This archive does not provide a reviewed current issue schedule. Check the official exchange notices for current issues; an empty category does not mean no IPOs exist.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setActiveCategory('listed')}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition"
            >
              View Listing Archive
            </button>
            <a
              href="https://www.nseindia.com/market-data/all-upcoming-issues-ipo"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-surface-raised hover:bg-surface text-foreground border border-border transition flex items-center gap-1"
            >
              <span>NSE Live Schedule</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}

      {/* ─── Mandatory Educational Framework & Due Diligence Guide ─── */}
      <div className="pt-2 border-t border-border/40 space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
          <Scale className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
          Essential Guide to Indian Initial Public Offerings
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-surface/60 border border-border/50 space-y-2">
            <h5 className="text-sm font-bold text-foreground flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              ASBA &amp; UPI Mandatory Process
            </h5>
            <p className="text-xs text-foreground/90 leading-relaxed">
              Read the issue prospectus and your bank or broker’s ASBA/UPI instructions before applying. FINOVA provides research and does not accept applications or place orders.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-surface/60 border border-border/50 space-y-2">
            <h5 className="text-sm font-bold text-foreground flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              Price Bands &amp; Cut-Off Bidding
            </h5>
            <p className="text-xs text-foreground/90 leading-relaxed">
              Check the issue’s price band, lot size and investor-category rules in its prospectus. Cut-off bidding does not guarantee allotment. These issue terms are unavailable unless reviewed with a direct source.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-surface/60 border border-border/50 space-y-2">
            <h5 className="text-sm font-bold text-foreground flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              Investor Category Quotas (SEBI)
            </h5>
            <p className="text-xs text-foreground/90 leading-relaxed">
              Investor-category allocations depend on the issue and applicable rules. Review the prospectus for:
            </p>
            <ul className="text-[11px] text-muted space-y-1 list-disc list-inside">
              <li><strong className="text-foreground">QIB:</strong> Qualified institutional investor allocation.</li>
              <li><strong className="text-foreground">NII:</strong> Non-institutional investor allocation.</li>
              <li><strong className="text-foreground">RII:</strong> Retail individual investor allocation.</li>
            </ul>
          </div>

          <div className="p-4 rounded-xl bg-surface/60 border border-border/50 space-y-2">
            <h5 className="text-sm font-bold text-foreground flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              Allotment Lottery &amp; Listing Day
            </h5>
            <p className="text-xs text-foreground/90 leading-relaxed">
              Check the registrar’s official basis of allotment and the exchange listing notice. An expected date alone does not prove a listing occurred. FINOVA marks a listing only when reviewed listing evidence is available.
            </p>
          </div>
        </div>
      </div>

      {/* RHP Due Diligence Checklist */}
      <div className="p-4 rounded-xl bg-surface/50 border border-border/40 space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
          Investor Due Diligence: What to Check in the RHP (Red Herring Prospectus)
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-surface-raised border border-border/40">
            <strong className="text-foreground block mb-1">1. Objects of the Issue</strong>
            <span className="text-muted text-[11px]">
              Differentiate Fresh Issue (proceeds expand the company&apos;s balance sheet) versus Offer for Sale (OFS, proceeds exit to existing promoters/PE investors).
            </span>
          </div>

          <div className="p-3 rounded-lg bg-surface-raised border border-border/40">
            <strong className="text-foreground block mb-1">2. Promoters &amp; Debt Levels</strong>
            <span className="text-muted text-[11px]">
              Scrutinize Debt-to-Equity ratios, promoter share pledge status, and key litigations disclosed in the SEBI draft filing.
            </span>
          </div>

          <div className="p-3 rounded-lg bg-surface-raised border border-border/40">
            <strong className="text-foreground block mb-1">3. Valuation &amp; Peers</strong>
            <span className="text-muted text-[11px]">
              Compare the P/E ratio, ROCE, and EV/EBITDA of the IPO against established listed peers on the NSE and BSE.
            </span>
          </div>
        </div>
      </div>

      {/* Official Exchange Verification Footnote */}
      <div className="flex flex-wrap items-center justify-between text-xs text-muted pt-2 border-t border-border/30 gap-2">
        <div className="flex items-center gap-3">
          <a
            href="https://www.sebi.gov.in/filings/public-issues.html"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-emerald-700 dark:hover:text-emerald-400 flex items-center gap-1 transition"
          >
            SEBI Public Filings <ExternalLink className="w-3 h-3" />
          </a>
          <a
            href="https://www.nseindia.com/market-data/all-upcoming-issues-ipo"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-emerald-700 dark:hover:text-emerald-400 flex items-center gap-1 transition"
          >
            NSE Official IPO Portal <ExternalLink className="w-3 h-3" />
          </a>
          <a
            href="https://www.bseindia.com/publicissue.html"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-emerald-700 dark:hover:text-emerald-400 flex items-center gap-1 transition"
          >
            BSE Primary Market <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        <span className="text-[11px] text-muted">
          Non-Advisory Mandate: Informational IPO Discovery Only
        </span>
      </div>
    </div>
  );
}
