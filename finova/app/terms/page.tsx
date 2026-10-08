'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, AlertCircle, FileText } from 'lucide-react';
import { FinovaLogo } from '@/components/shared/FinovaLogo';
import { ThemeToggle } from '@/components/layout/ThemeToggle';

export default function TermsPage() {
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
        {/* Page Header */}
        <div className="space-y-4 mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand/10 text-brand border border-brand/20">
            <FileText className="w-3.5 h-3.5" />
            <span>Legal Agreement · Version 1.0.0-draft</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Terms of Service</h1>
          <p className="text-xs text-muted">
            Effective Date: October 8, 2026 · Finova Educational Prototype · Status: Draft subject to legal review
          </p>
        </div>

        {/* Prototype Notice Banner */}
        <div className="p-4 rounded-xl border border-warning/30 bg-warning-bg/15 text-xs text-foreground mb-8 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-warning">Hackathon Prototype Notice</p>
            <p className="text-muted leading-relaxed">
              Finova is currently a hackathon prototype developed for the &ldquo;Hack on Track FinTech&rdquo; challenge.
              This document represents a foundational draft for demonstration and educational purposes. Certain operational,
              corporate, and regulatory provisions contain placeholders marked with brackets (&ldquo;[ ... ]&rdquo;) that must
              be finalized by project owners and qualified legal counsel prior to commercial launch.
            </p>
          </div>
        </div>

        {/* Structured Legal Terms */}
        <div className="prose prose-sm dark:prose-invert max-w-none space-y-8 text-muted text-sm leading-relaxed">
          {/* Section 1 */}
          <section className="space-y-2">
            <h2 className="text-base font-bold text-foreground">1. Introduction and Scope</h2>
            <p>
              These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of the Finova application, website,
              and related tools (collectively, the &ldquo;Platform&rdquo;), developed as a fintech portfolio intelligence solution.
              By creating an account, accessing, or using Finova, you acknowledge that you have read, understood, and agreed to be bound by these Terms.
              If you do not agree, you must discontinue using the Platform immediately.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-2">
            <h2 className="text-base font-bold text-foreground">2. Eligibility and Account Responsibilities</h2>
            <p>
              To create an account on Finova, you must be at least 18 years of age and legally competent to enter into a binding contract
              under the laws of India or your jurisdiction of residence.
            </p>
            <p>
              You agree to provide accurate, truthful, and up-to-date registration information. You are solely responsible for maintaining
              the confidentiality of your login credentials and for all activities that occur under your account. You agree to notify Finova immediately
              upon discovering any unauthorized use or security compromise.
            </p>
          </section>

          {/* Section 3 */}
          <section className="space-y-2">
            <h2 className="text-base font-bold text-foreground">3. Purpose of the Finova Platform</h2>
            <p>
              Finova is designed as an analytical, educational, and aggregation tool for retail investors. The Platform allows users to organize
              their personal multi-asset investment records across Indian capital market instruments, including Equities, Real Estate Investment
              Trusts (REITs), Infrastructure Investment Trusts (InvITs), Sovereign Gold Bonds (SGBs), and Debt Instruments.
            </p>
            <p className="font-medium text-foreground">
              Finova is NOT a stockbroker, depository participant, portfolio management service (PMS), mutual fund distributor, or SEBI-registered
              Investment Adviser (RIA).
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-2">
            <h2 className="text-base font-bold text-foreground">4. Portfolio Information and User-Provided Data</h2>
            <p>
              In the current prototype, portfolio records are created via manual entry or uploaded statements. You retain full ownership of
              your financial data. You represent that you have the lawful right to input and process all holdings information you provide.
            </p>
            <p>
              Calculated metrics—such as portfolio health scores, Herfindahl-Hirschman Index (HHI) concentration metrics, asset allocations,
              and returns—are mathematical approximations derived from user-entered figures and publicly available market indicators.
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-2">
            <h2 className="text-base font-bold text-foreground">5. Third-Party Financial-Data Providers</h2>
            <p>
              Benchmark market data (e.g., Nifty 50, Sensex, Bank Nifty) and financial news feeds displayed on Finova originate from third-party
              prototype sources (including Yahoo Finance and news APIs).
            </p>
            <p>
              Finova does not guarantee the accuracy, timeliness, completeness, or continuous availability of external market data.
              Feed data may be delayed, intermittent, or subject to upstream rate limits. Live trading decisions must never be executed solely based
              upon prototype data feeds.
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-2">
            <h2 className="text-base font-bold text-foreground">6. Educational Analysis & Financial-Risk Limitations</h2>
            <p>
              All insights, AI-assisted portfolio summaries, risk metrics, and educational cards provided by Finova are strictly for
              informational and educational purposes. Nothing on the Platform constitutes personalized investment advice, tax advice, legal counsel,
              or a recommendation to buy, hold, or sell any security.
            </p>
            <p>
              Investments in capital markets are subject to market risks, including the loss of principal capital. Users must exercise independent
              due diligence and consult a SEBI-registered financial advisor before undertaking real financial commitments.
            </p>
          </section>

          {/* Section 7 */}
          <section className="space-y-2">
            <h2 className="text-base font-bold text-foreground">7. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Use the Platform for any unlawful, fraudulent, or market-manipulation purpose;</li>
              <li>Attempt to decompile, reverse engineer, or compromise the source code or infrastructure;</li>
              <li>Probe, scan, or breach system security, session tokens, or authentication mechanisms;</li>
              <li>Scrape, harvest, or automate bulk extractions of platform data without explicit authorization;</li>
              <li>Impersonate another individual or register accounts using false identity details.</li>
            </ul>
          </section>

          {/* Section 8 */}
          <section className="space-y-2">
            <h2 className="text-base font-bold text-foreground">8. Service Availability and Prototype Limitations</h2>
            <p>
              Finova is provided on an &ldquo;AS IS&rdquo; and &ldquo;AS AVAILABLE&rdquo; basis without warranties of any kind, whether express,
              implied, statutory, or otherwise. As an evolving hackathon prototype, features, user interfaces, database schemas, and analytical models
              may be updated, modified, or temporarily interrupted without prior notice.
            </p>
          </section>

          {/* Section 9 */}
          <section className="space-y-2">
            <h2 className="text-base font-bold text-foreground">9. Intellectual Property</h2>
            <p>
              All proprietary logos, trademarks, design systems, algorithms, source code, and user interface layouts created for Finova
              are the intellectual property of the Finova project team. You are granted a limited, personal, non-exclusive, non-transferable license
              to access and use the Platform for your personal, non-commercial evaluation.
            </p>
          </section>

          {/* Section 10 */}
          <section className="space-y-2">
            <h2 className="text-base font-bold text-foreground">10. Account Suspension and Termination Principles</h2>
            <p>
              Finova reserves the right to suspend or terminate user accounts, with or without prior notice, if a user violates these Terms,
              engages in abusive platform behavior, or compromises the security of other users or service infrastructure.
              You may discontinue your account at any time.
            </p>
          </section>

          {/* Section 11 */}
          <section className="space-y-2">
            <h2 className="text-base font-bold text-foreground">11. Changes to the Terms</h2>
            <p>
              We may revise these Terms as platform functionality evolves or regulatory requirements dictate. Updated versions will be published
              on this page with a revised version and effective date. Continued use of Finova following published changes constitutes acceptance of the
              revised terms.
            </p>
          </section>

          {/* Section 12 */}
          <section className="space-y-2">
            <h2 className="text-base font-bold text-foreground">12. Contact Information & Project Owner Details</h2>
            <div className="p-4 rounded-xl border border-border bg-surface-raised space-y-1">
              <p className="font-semibold text-foreground">Project Contact Placeholders:</p>
              <p>Organization: <span className="text-foreground">[Finova Project Team / Entity Name Pending]</span></p>
              <p>Support Email: <span className="text-foreground">[legal@finova.in / team-contact@hackathon.local]</span></p>
              <p>Jurisdiction: <span className="text-foreground">Bengaluru, Karnataka, India</span></p>
              <p className="text-xs text-muted pt-1">
                Notice: Formal legal corporate entity and dispute resolution mechanisms to be completed prior to commercial deployment.
              </p>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 text-center text-xs text-muted">
        <p>© {new Date().getFullYear()} FINOVA. Hackathon Prototype · Educational Demonstration.</p>
      </footer>
    </div>
  );
}
