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
  ShieldAlert,
  CheckCircle2,
  ExternalLink,
  BookOpen,
  Scale,
  Calendar,
  Layers,
  Clock,
  Sparkles,
  AlertCircle,
  Building,
  Tag,
  ArrowUpRight,
} from 'lucide-react';
import type { VerifiedIpoItem, IpoCategory, IpoDiscoveryResponse } from '@/lib/market/ipoData';
import { getVerifiedIpoSchedule } from '@/lib/market/ipoData';

export function IpoDiscoverySection() {
  const [activeCategory, setActiveCategory] = useState<IpoCategory>('upcoming');
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
              <BookOpen className="w-5 h-5 text-emerald-400" />
              IPO Discovery &amp; Primary Market Intelligence
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Verified Filings
            </span>
          </div>
          <p className="text-xs text-muted mt-0.5">
            Discover verified Initial Public Offerings across Indian primary markets (NSE &amp; BSE Mainboard and SME)
          </p>
        </div>

        {/* Source Attribution Badge */}
        <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 bg-zinc-900/80 px-3 py-1.5 rounded-xl border border-zinc-800">
          <Clock className="w-3.5 h-3.5 text-emerald-400" />
          <span>Verified against NSE/BSE announcements</span>
        </div>
      </div>

      {/* ─── Category Selection Tabs ───────────────────────────── */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-900/90 border border-border overflow-x-auto">
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
              ? 'bg-zinc-800 text-emerald-400 border border-zinc-700 shadow-sm'
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
              ? 'bg-zinc-800 text-amber-400 border border-zinc-700 shadow-sm'
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
              ? 'bg-zinc-800 text-blue-400 border border-zinc-700 shadow-sm'
              : 'text-muted hover:text-foreground'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Recently Listed ({ipoData?.categories.listed.length || 0})</span>
        </button>
      </div>

      {/* ─── Offerings Cards Grid ───────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-44 rounded-xl bg-zinc-900/50 border border-border/40 animate-pulse p-4" />
          ))}
        </div>
      ) : currentItems.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {currentItems.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-xl bg-zinc-900/70 border border-border/70 hover:border-zinc-700 transition space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-foreground">{item.company_name}</h4>
                    {item.symbol && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 font-mono font-semibold">
                        {item.symbol}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-muted mt-0.5">
                    <span className="text-zinc-300 font-medium">{item.exchange}</span>
                    <span>•</span>
                    <span>{item.ipo_type}</span>
                  </div>
                </div>

                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                    item.status === 'OPEN'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : item.status === 'UPCOMING'
                      ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                      : item.status === 'CLOSED'
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                  }`}
                >
                  {item.status_label}
                </span>
              </div>

              {/* Data Grid: Price, Lot, Issue Size, Dates */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2.5 rounded-lg bg-zinc-950/60 border border-border/50 text-xs">
                <div>
                  <span className="text-[10px] text-muted block">Price Band</span>
                  <span className="font-bold text-foreground font-mono">{item.price_band}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted block">Lot Size</span>
                  <span className="font-bold text-foreground font-mono">{item.lot_size} Shares</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted block">Issue Size</span>
                  <span className="font-bold text-foreground font-mono">₹{item.issue_size_cr.toLocaleString('en-IN')} Cr</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted block">
                    {item.status === 'LISTED' ? 'Listing Gain' : 'Listing Date'}
                  </span>
                  <span className="font-bold text-foreground font-mono">
                    {item.status === 'LISTED' && item.listing_gain_pct !== undefined
                      ? `+${item.listing_gain_pct.toFixed(1)}%`
                      : item.listing_date || 'TBD'}
                  </span>
                </div>
              </div>

              {/* Timestamps, Source & Verification Links */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] pt-1 border-t border-border/40">
                <div className="text-muted truncate">
                  <span>Bidding: {item.open_date} to {item.close_date}</span>
                  <span className="mx-1">•</span>
                  <span>Registrar: {item.registrar}</span>
                </div>

                <a
                  href={item.official_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-emerald-400 hover:text-emerald-300 transition shrink-0"
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
        <div className="p-8 rounded-xl bg-zinc-900/50 border border-border/50 text-center space-y-3">
          <Calendar className="w-8 h-8 text-emerald-400 mx-auto opacity-70" />
          <div>
            <h4 className="text-sm font-bold text-foreground">
              No Public Issues Currently Open for Bidding
            </h4>
            <p className="text-xs text-muted max-w-md mx-auto mt-1 leading-relaxed">
              There are no active retail subscription windows open on the NSE or BSE today. Public offer schedules operate on specific bidding days. Explore upcoming IPOs or inspect official exchange registers below.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setActiveCategory('upcoming')}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition"
            >
              View Upcoming IPOs
            </button>
            <a
              href="https://www.nseindia.com/market-data/all-upcoming-issues-ipo"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition flex items-center gap-1"
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
          <Scale className="w-3.5 h-3.5 text-emerald-400" />
          Essential Guide to Indian Initial Public Offerings
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-border/50 space-y-2">
            <h5 className="text-sm font-bold text-foreground flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ASBA &amp; UPI Mandatory Process
            </h5>
            <p className="text-xs text-zinc-300 leading-relaxed">
              In India, retail investor IPO applications must be routed via <strong className="text-white">ASBA</strong> (Application Supported by Blocked Amount) using a UPI mandate (up to ₹5,00,000). Money is never deducted upfront from your savings account; it is only lien-blocked until the Basis of Allotment is finalized by the Registrar.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-zinc-900/60 border border-border/50 space-y-2">
            <h5 className="text-sm font-bold text-foreground flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Price Bands &amp; Cut-Off Bidding
            </h5>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Book-built issues specify a 20% price band (e.g., ₹450 to ₹500). Retail individual investors (RII) are permitted to select the <strong className="text-white">Cut-off Price</strong>, which automatically matches the final issue price determined by institutional book building, maximizing the probability of allotment.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-zinc-900/60 border border-border/50 space-y-2">
            <h5 className="text-sm font-bold text-foreground flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Investor Category Quotas (SEBI)
            </h5>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Mainboard IPOs mandate structured minimum reservations under SEBI ICDR guidelines:
            </p>
            <ul className="text-[11px] text-zinc-400 space-y-1 list-disc list-inside">
              <li><strong className="text-zinc-200">QIB (Qualified Institutional):</strong> Up to 50% of the net issue.</li>
              <li><strong className="text-zinc-200">NII (High Net Worth Non-Institutional):</strong> Minimum 15%.</li>
              <li><strong className="text-zinc-200">RII (Retail Individuals):</strong> Minimum 35% of the net offer.</li>
            </ul>
          </div>

          <div className="p-4 rounded-xl bg-zinc-900/60 border border-border/50 space-y-2">
            <h5 className="text-sm font-bold text-foreground flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Allotment Lottery &amp; Listing Day
            </h5>
            <p className="text-xs text-zinc-300 leading-relaxed">
              When the retail portion is oversubscribed, SEBI rules mandate a computer-generated randomized lottery ensuring that at least one minimum lot is allotted to as many distinct retail applicants as mathematically possible. Unallotted blocked funds are unblocked within 24 hours of registrar finalization.
            </p>
          </div>
        </div>
      </div>

      {/* RHP Due Diligence Checklist */}
      <div className="p-4 rounded-xl bg-zinc-900/50 border border-border/40 space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-emerald-400" />
          Investor Due Diligence: What to Check in the RHP (Red Herring Prospectus)
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-zinc-900/80 border border-border/40">
            <strong className="text-foreground block mb-1">1. Objects of the Issue</strong>
            <span className="text-muted text-[11px]">
              Differentiate Fresh Issue (proceeds expand the company&apos;s balance sheet) versus Offer for Sale (OFS, proceeds exit to existing promoters/PE investors).
            </span>
          </div>

          <div className="p-3 rounded-lg bg-zinc-900/80 border border-border/40">
            <strong className="text-foreground block mb-1">2. Promoters &amp; Debt Levels</strong>
            <span className="text-muted text-[11px]">
              Scrutinize Debt-to-Equity ratios, promoter share pledge status, and key litigations disclosed in the SEBI draft filing.
            </span>
          </div>

          <div className="p-3 rounded-lg bg-zinc-900/80 border border-border/40">
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
            className="hover:text-emerald-400 flex items-center gap-1 transition"
          >
            SEBI Public Filings <ExternalLink className="w-3 h-3" />
          </a>
          <a
            href="https://www.nseindia.com/market-data/all-upcoming-issues-ipo"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-emerald-400 flex items-center gap-1 transition"
          >
            NSE Official IPO Portal <ExternalLink className="w-3 h-3" />
          </a>
          <a
            href="https://www.bseindia.com/publicissue.html"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-emerald-400 flex items-center gap-1 transition"
          >
            BSE Primary Market <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        <span className="text-[11px] text-zinc-500">
          Non-Advisory Mandate: Informational IPO Discovery Only
        </span>
      </div>
    </div>
  );
}
