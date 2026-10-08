'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Lock, ShieldCheck, Database, EyeOff } from 'lucide-react';
import { FinovaLogo } from '@/components/shared/FinovaLogo';
import { ThemeToggle } from '@/components/layout/ThemeToggle';

export default function PrivacyPage() {
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
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand/10 text-brand border border-brand/20">
            <Lock className="w-3.5 h-3.5" />
            <span>Privacy Policy · Version 1.0.0-draft</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Privacy Policy</h1>
          <p className="text-xs text-muted">
            Effective Date: October 8, 2026 · Finova Educational Prototype · Transparent Data Handling
          </p>
        </div>

        {/* Core Principles Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="p-4 rounded-xl border border-border bg-surface-raised space-y-1.5">
            <Database className="w-4 h-4 text-brand" />
            <h3 className="text-xs font-bold text-foreground">User-Owned Data</h3>
            <p className="text-[11px] text-muted leading-relaxed">
              We never monetize, rent, or sell your personal portfolio entries to third-party advertisers.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-border bg-surface-raised space-y-1.5">
            <EyeOff className="w-4 h-4 text-brand" />
            <h3 className="text-xs font-bold text-foreground">Zero Broker Passwords</h3>
            <p className="text-[11px] text-muted leading-relaxed">
              Finova never asks for, stores, or handles trading passwords, OTPs, or CDSL/NSDL TPINs.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-border bg-surface-raised space-y-1.5">
            <ShieldCheck className="w-4 h-4 text-brand" />
            <h3 className="text-xs font-bold text-foreground">Isolated Security</h3>
            <p className="text-[11px] text-muted leading-relaxed">
              Database rows are protected by Postgres Row Level Security (RLS) linked to your encrypted user session.
            </p>
          </div>
        </div>

        {/* Structured Privacy Sections */}
        <div className="prose prose-sm dark:prose-invert max-w-none space-y-8 text-muted text-sm leading-relaxed">
          {/* Section 1 */}
          <section className="space-y-2">
            <h2 className="text-base font-bold text-foreground">1. What Information Finova Collects</h2>
            <p>In this prototype release, Finova collects only information necessary to deliver user authentication and portfolio intelligence:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong className="text-foreground">Account Credentials:</strong> Full name, verified email address, mobile number, and secure hashed authentication credentials managed via Supabase Auth.</li>
              <li><strong className="text-foreground">Portfolio Data:</strong> Asset holdings, symbols (e.g. RELIANCE, EMBASSY), quantity, purchase cost, and asset classification inputted manually or via file upload.</li>
              <li><strong className="text-foreground">Agreement Records:</strong> Audit timestamps and version numbers corresponding to your acceptance of platform terms and disclosures.</li>
              <li><strong className="text-foreground">Technical Log Data:</strong> Minimal browser user-agent and session tokens required for security verification and session preservation.</li>
            </ul>
          </section>

          {/* Section 2 */}
          <section className="space-y-2">
            <h2 className="text-base font-bold text-foreground">2. Why We Collect This Data</h2>
            <p>Your data is processed strictly for the following operational reasons:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Authenticating your session and ensuring only you can access your investment dashboard;</li>
              <li>Calculating asset class distribution (Equities, REITs, InvITs, Bonds) and diversification scores (Herfindahl-Hirschman Index);</li>
              <li>Generating educational risk warnings (e.g. high concentration in a single asset);</li>
              <li>Maintaining legal audit trails verifying agreement acceptance.</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-2">
            <h2 className="text-base font-bold text-foreground">3. How Authentication Works</h2>
            <p>
              Authentication is powered by <strong className="text-foreground">Supabase Auth</strong>. We do not store plaintext passwords
              in our application tables. Passwords are cryptographically salted and hashed using industry-standard bcrypt hashing
              directly within Supabase Auth engine.
            </p>
            <p>
              Session tokens are stored in secure, encrypted HTTP cookies with SameSite protection to guard against cross-site request forgery (CSRF).
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-2">
            <h2 className="text-base font-bold text-foreground">4. How Portfolio Information Is Stored</h2>
            <p>
              Portfolio data is stored in a dedicated PostgreSQL database hosted via Supabase. We enforce
              <strong className="text-foreground"> Row Level Security (RLS)</strong> on every user-facing table (`profiles`, `user_agreements`,
              `holdings`, `broker_accounts`). This cryptographic database-level rule guarantees that queries executed by User A cannot read,
              update, or access records belonging to User B.
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-2">
            <h2 className="text-base font-bold text-foreground">5. Third-Party Service Providers</h2>
            <p>Finova currently connects with the following external technology services:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong className="text-foreground">Supabase Inc.</strong> — Managed PostgreSQL database, authentication, and encrypted session infrastructure.</li>
              <li><strong className="text-foreground">Yahoo Finance (Prototype Feed)</strong> — Public benchmark index market quotes (Nifty 50, Sensex, Bank Nifty). No user portfolio details or credentials are ever sent to Yahoo Finance.</li>
              <li><strong className="text-foreground">Google Gemini API (Generative AI)</strong> — Used for generating educational explainers and portfolio diversification context.</li>
            </ul>
          </section>

          {/* Section 6 */}
          <section className="space-y-2">
            <h2 className="text-base font-bold text-foreground">6. What Information Is Shared With AI Services</h2>
            <p>
              When AI insight generation is activated, Finova transmits <strong className="text-foreground">only aggregated, anonymous quantitative metrics</strong>
              (such as: &ldquo;Portfolio has 60% Equity, 20% REIT, 20% Cash with moderate risk appetite&rdquo;).
            </p>
            <p className="font-semibold text-foreground">
              We NEVER send your name, email address, phone number, account ID, PAN, or exact rupee balances to AI model providers.
            </p>
          </section>

          {/* Section 7 */}
          <section className="space-y-2">
            <h2 className="text-base font-bold text-foreground">7. What Is and Is Not Currently Implemented</h2>
            <div className="p-4 rounded-xl border border-border bg-surface space-y-2">
              <p><strong className="text-emerald-500">Currently Implemented:</strong> Email/password signup, email verification flow, manual holdings entry, diversification analysis, and RLS data isolation.</p>
              <p><strong className="text-amber-500">Not Implemented (Future Roadmap):</strong> Live broker account synchronization (Zerodha/Groww OAuth), live exchange trading, automated depository statement fetching via CDSL/NSDL APIs.</p>
            </div>
          </section>

          {/* Section 8 */}
          <section className="space-y-2">
            <h2 className="text-base font-bold text-foreground">8. Account Deletion and Data Requests</h2>
            <p>
              You maintain the right to delete your Finova account at any time. When an account deletion is requested, all associated
              profile records, portfolio holdings, and cached analytics will be deleted from active application tables via database cascading constraints.
            </p>
            <p>
              To request full data export or deletion during prototype evaluation, contact <span className="text-foreground">[privacy@finova.in / team-contact@hackathon.local]</span>.
            </p>
          </section>

          {/* Section 9 */}
          <section className="space-y-2">
            <h2 className="text-base font-bold text-foreground">9. Contact Information Placeholders</h2>
            <div className="p-4 rounded-xl border border-border bg-surface-raised space-y-1">
              <p className="font-semibold text-foreground">Privacy Officer / Project Team Contact:</p>
              <p>Email: <span className="text-foreground">[privacy@finova.in / team-contact@hackathon.local]</span></p>
              <p>Entity: <span className="text-foreground">[Finova Project Team / Corporate Name Pending]</span></p>
              <p>Location: <span className="text-foreground">Bengaluru, Karnataka, India</span></p>
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
