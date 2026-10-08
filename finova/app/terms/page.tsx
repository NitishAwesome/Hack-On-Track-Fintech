'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Shield } from 'lucide-react';
import { FinovaLogo } from '@/components/shared/FinovaLogo';
import { ThemeToggle } from '@/components/layout/ThemeToggle';

export default function TermsPage() {
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
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand/10 text-brand border border-brand/20">
            <Shield className="w-3.5 h-3.5" />
            <span>Prototype Terms of Use</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Terms of Service</h1>
          <p className="text-xs text-muted">Last updated: October 2026 · Finova Educational Prototype</p>
        </div>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6 text-muted text-sm leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-foreground">1. Prototype Purpose & Non-Advisory Nature</h2>
            <p>
              Finova is currently a hackathon prototype application developed to demonstrate portfolio aggregation, multi-asset allocation analysis, and investor education across Indian financial instruments including Equities, REITs, InvITs, and Bonds.
            </p>
            <p>
              The platform does not provide investment advice, financial planning, portfolio management services, or brokerage services. Nothing on Finova should be construed as an offer, recommendation, or solicitation to buy or sell any financial security.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-foreground">2. Illustrative & Market Data</h2>
            <p>
              Market quotes, metrics, health scores, and sample calculations presented on the platform are for illustrative and educational purposes. When live market feeds are active, market data is subject to exchange delays and availability.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-foreground">3. User Responsibility</h2>
            <p>
              Users are solely responsible for evaluating the risks and merits associated with the use of any financial information before making investment decisions. Always consult a SEBI-registered Investment Advisor or certified financial planner before executing trades.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-foreground">4. Credential Security & Third-Party Platforms</h2>
            <p>
              Finova does not store trading passwords, MPINs, or biometric keys for third-party brokers (such as Zerodha, Groww, or Angel One). Any statement import processes operate in read-only mode.
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
