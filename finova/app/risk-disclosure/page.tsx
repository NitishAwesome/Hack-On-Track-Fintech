'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { FinovaLogo } from '@/components/shared/FinovaLogo';
import { ThemeToggle } from '@/components/layout/ThemeToggle';

export default function RiskDisclosurePage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-surface/80 backdrop-blur-md">
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

      {/* Content */}
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="space-y-4 mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Standard Market Risk Disclosure</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Risk Disclosure</h1>
          <p className="text-xs text-muted">Mandatory Financial Notice · Finova Educational Prototype</p>
        </div>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6 text-muted text-sm leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-foreground">1. Market Risk in Financial Securities</h2>
            <p>
              Investments in securities markets are subject to market risks. Read all related scheme documents carefully before investing. Past performance of any instrument, index, fund, or asset class is not indicative of future returns.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-foreground">2. Specific Asset Class Risks</h2>
            <div className="space-y-3 pt-1">
              <div>
                <strong className="text-foreground">Equities & Stocks:</strong> Volatility risk, business performance risk, macroeconomic drawdowns, and loss of principal capital.
              </div>
              <div>
                <strong className="text-foreground">REITs (Real Estate Investment Trusts):</strong> Commercial occupancy fluctuations, interest-rate cycles, property valuation declines, and tenant concentration risk.
              </div>
              <div>
                <strong className="text-foreground">InvITs (Infrastructure Investment Trusts):</strong> Project execution delays, concession expiration risks, regulatory tariff adjustments, and debt servicing dynamics.
              </div>
              <div>
                <strong className="text-foreground">Bonds & Debt Instruments:</strong> Credit default risk, interest rate duration risk, and liquidity constraints in secondary exchange trading.
              </div>
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-foreground">3. Prototype Disclaimer</h2>
            <p>
              Finova does not guarantee any specific returns, capital preservation, or risk-adjusted superiority. Any diagnostic health scores or diversification indicators are quantitative heuristics designed for educational analysis only.
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-border py-6 text-center text-xs text-muted">
        <p>© {new Date().getFullYear()} FINOVA. Hackathon Prototype.</p>
      </footer>
    </div>
  );
}
