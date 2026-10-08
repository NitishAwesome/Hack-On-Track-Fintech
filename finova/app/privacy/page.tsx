'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Lock } from 'lucide-react';
import { FinovaLogo } from '@/components/shared/FinovaLogo';
import { ThemeToggle } from '@/components/layout/ThemeToggle';

export default function PrivacyPage() {
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
            <Lock className="w-3.5 h-3.5" />
            <span>Privacy Guidelines</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Privacy Policy</h1>
          <p className="text-xs text-muted">Last updated: October 2026 · Finova Educational Prototype</p>
        </div>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6 text-muted text-sm leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-foreground">1. Privacy Principles</h2>
            <p>
              Finova is built upon the foundational belief that your personal financial holdings belong exclusively to you. We do not sell, rent, or monetize personal user portfolio records.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-foreground">2. Information Collection</h2>
            <p>
              In this prototype release, information processed includes account email addresses used for authentication, user-input or statement-imported asset holdings (such as quantity and purchase cost), and basic analytical preferences.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-foreground">3. What We Never Store</h2>
            <p>
              Finova strictly never stores, transmits, or asks for:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Broker trading passwords or PINs</li>
              <li>Two-factor authentication SMS/TOTP codes</li>
              <li>Depository CDSL/NSDL TPINs</li>
              <li>Bank account net-banking credentials</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-foreground">4. Storage & Security Architecture</h2>
            <p>
              All server-side queries execute within protected API boundaries using server-only environment configurations. User data is isolated by user identification identifiers with row-level security constraints.
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
