'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle, TrendingDown, BookOpen, Cpu, ShieldAlert } from 'lucide-react';
import { FinovaLogo } from '@/components/shared/FinovaLogo';
import { ThemeToggle } from '@/components/layout/ThemeToggle';

export default function RiskDisclosurePage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-surface/85 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <FinovaLogo size="sm" variant="horizontal" />
          </Link>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Home</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        {/* Title Block */}
        <div className="space-y-4 mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Essential Investor Notice · Version 1.0.0-draft</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Investment Risk Disclosure</h1>
          <p className="text-xs text-muted">
            Important Information About Market Risks, Portfolio Metrics & Educational Tools · Written for Retail Investors
          </p>
        </div>

        {/* Clear Summary Callout */}
        <div className="p-5 rounded-2xl border border-amber-500/30 bg-amber-500/5 mb-8 space-y-2">
          <h2 className="text-sm font-bold text-amber-500 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" />
            <span>Core Takeaway for Every Finova User</span>
          </h2>
          <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed">
            All securities and investments can fluctuate in price and may lose capital.
            Finova is an analytics and educational dashboard—never execute trades solely on platform metrics or AI explanations.
            Always perform your own research and consult a SEBI-registered financial adviser before investing.
          </p>
        </div>

        {/* 6 Key Disclosures Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {/* 1. Securities Can Lose Value */}
          <div className="p-5 rounded-xl border border-border bg-surface space-y-2">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-rose-500" />
              <h3 className="text-sm font-bold text-foreground">1. Capital Loss & Volatility</h3>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              Equities, REITs, InvITs, and mutual funds are subject to market forces. Economic downturns, geopolitical events,
              and company performance can cause asset prices to drop significantly. You may receive back less than your invested capital.
            </p>
          </div>

          {/* 2. Past Performance */}
          <div className="p-5 rounded-xl border border-border bg-surface space-y-2">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-brand" />
              <h3 className="text-sm font-bold text-foreground">2. Historical Returns Are Not Guarantees</h3>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              Past performance, 1-year annualized returns, and historical benchmark charts do not indicate or guarantee future performance.
              A stock or fund that gained last year may experience losses in subsequent periods.
            </p>
          </div>

          {/* 3. News Incompleteness */}
          <div className="p-5 rounded-xl border border-border bg-surface space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-bold text-foreground">3. Market News & Feed Timeliness</h3>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              News headlines and market sentiment badges displayed on Finova originate from external feeds.
              Market conditions move rapidly; news articles may be delayed, incomplete, or speculative.
            </p>
          </div>

          {/* 4. Risk Scores Are Heuristics */}
          <div className="p-5 rounded-xl border border-border bg-surface space-y-2">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-sky-500" />
              <h3 className="text-sm font-bold text-foreground">4. Risk Scores Are Quantitative Estimates</h3>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              Finova&apos;s portfolio health scores and concentration indicators (such as HHI metrics) are mathematical heuristics.
              A &ldquo;Low Risk&rdquo; label does not guarantee safety, nor does it protect your portfolio from macroeconomic drawdowns.
            </p>
          </div>

          {/* 5. AI Explanations */}
          <div className="p-5 rounded-xl border border-border bg-surface space-y-2">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-purple-500" />
              <h3 className="text-sm font-bold text-foreground">5. AI Explanations & Limitations</h3>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              AI-generated summaries (powered by Google Gemini) are designed to explain financial concepts in plain English.
              Generative models can occasionally hallucinate or oversimplify nuanced tax or regulatory considerations.
            </p>
          </div>

          {/* 6. Non-Advisory Status */}
          <div className="p-5 rounded-xl border border-border bg-surface space-y-2">
            <div className="flex items-center gap-2">
              <ShieldCheckIcon className="w-4 h-4 text-emerald-500" />
              <h3 className="text-sm font-bold text-foreground">6. Non-Advisory Nature of Finova</h3>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              Finova does not provide personalized investment advice, stock recommendations, or portfolio management services.
              Investment decisions are exclusively the responsibility of the investor.
            </p>
          </div>
        </div>

        {/* Specific Asset Class Guidance */}
        <div className="p-6 rounded-2xl border border-border bg-surface-raised space-y-4">
          <h3 className="text-sm font-bold text-foreground">Asset Class Risk Primer</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-muted">
            <div className="space-y-1">
              <p className="font-semibold text-foreground">Real Estate Investment Trusts (REITs)</p>
              <p>Subject to commercial real estate tenancy vacancies, interest rate spikes, and property valuation shifts.</p>
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-foreground">Infrastructure Investment Trusts (InvITs)</p>
              <p>Subject to concession project timelines, regulatory toll tariff adjustments, and long-term debt servicing.</p>
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-foreground">Corporate Bonds & NCDs</p>
              <p>Subject to credit rating downgrade risk, liquidity risk in secondary markets, and interest-rate duration risk.</p>
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-foreground">Equities & ETFs</p>
              <p>Subject to direct company business risk, earnings fluctuations, sector concentration, and market drawdowns.</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 text-center text-xs text-muted">
        <p>© {new Date().getFullYear()} FINOVA. Hackathon Prototype · Educational Demonstration.</p>
      </footer>
    </div>
  );
}

function ShieldCheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
    </svg>
  );
}
