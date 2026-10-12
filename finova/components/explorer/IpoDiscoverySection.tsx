'use client';

import React from 'react';
import {
  FileText,
  ShieldAlert,
  CheckCircle2,
  ExternalLink,
  BookOpen,
  Scale,
} from 'lucide-react';

export function IpoDiscoverySection() {
  return (
    <div className="bg-card/70 border border-border/70 rounded-2xl p-6 backdrop-blur-sm space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-bold text-foreground tracking-tight flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-emerald-400" />
          IPO Intelligence & Discovery Centre
        </h3>
        <p className="text-xs text-muted mt-0.5">
          Educational guidance and market infrastructure transparency for Initial Public Offerings in India.
        </p>
      </div>

      {/* Honest Availability Disclosure (Mandatory as per Section 13) */}
      <div className="p-4 rounded-xl bg-zinc-900/80 border border-amber-500/30 space-y-2">
        <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>Live Bidding Feed Status: Exchange API License Required</span>
        </div>
        <p className="text-xs text-zinc-300 leading-relaxed">
          FINOVA enforces a strict <strong className="text-white">Zero-Fabrication Policy</strong>. Live retail IPO book-building schedules, real-time subscription multiples, and allotment statuses require licensed direct integration with primary exchange distribution engines (<strong className="text-white">NSE e-IPO</strong> and <strong className="text-white">BSE StAR IPO</strong>) or registered Registrar & Transfer Agents (Link Intime, KFintech).
        </p>
        <p className="text-[11px] text-zinc-400 leading-relaxed">
          Because non-licensed feeds frequently report unverified grey market premiums (GMP) or stale listing dates, live open IPO bidding schedules are temporarily paused until verified exchange distributor credentials are tied to FINOVA’s production cluster.
        </p>
      </div>

      {/* Indian Retail IPO Educational Framework */}
      <div className="space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
          <Scale className="w-3.5 h-3.5 text-emerald-400" />
          Essential Guide to Indian Initial Public Offerings
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-border/50 space-y-2">
            <h5 className="text-sm font-bold text-foreground flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ASBA & UPI Mandatory Process
            </h5>
            <p className="text-xs text-zinc-300 leading-relaxed">
              In India, retail investor IPO applications must be routed via <strong className="text-white">ASBA</strong> (Application Supported by Blocked Amount) using a UPI mandate (up to ₹5,00,000). Money is never deducted upfront from your savings account; it is only lien-blocked until the Basis of Allotment is finalized by the Registrar.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-zinc-900/60 border border-border/50 space-y-2">
            <h5 className="text-sm font-bold text-foreground flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Price Bands & Cut-Off Bidding
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
              Allotment Lottery & Listing Day
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
            <strong className="text-foreground block mb-1">2. Promoters & Debt Levels</strong>
            <span className="text-muted text-[11px]">
              Scrutinize Debt-to-Equity ratios, promoter share pledge status, and key litigations disclosed in the SEBI draft filing.
            </span>
          </div>

          <div className="p-3 rounded-lg bg-zinc-900/80 border border-border/40">
            <strong className="text-foreground block mb-1">3. Valuation & Peers</strong>
            <span className="text-muted text-[11px]">
              Compare the P/E ratio, ROCE, and EV/EBITDA of the IPO against established listed peers on the NSE and BSE.
            </span>
          </div>
        </div>
      </div>

      {/* Official Links */}
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
            NSE Official IPO Bidding <ExternalLink className="w-3 h-3" />
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
          FINOVA Market Integrity Policy
        </span>
      </div>
    </div>
  );
}
