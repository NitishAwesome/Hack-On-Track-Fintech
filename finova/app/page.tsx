'use client';

import React from 'react';
import Link from 'next/link';
import {
  Building2,
  ArrowRight,
  PieChart,
  Sparkles,
  Lock,
  Landmark,
} from 'lucide-react';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { FinovaLogo } from '@/components/shared/FinovaLogo';

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground antialiased selection:bg-brand/20">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 border-b border-border bg-surface/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <FinovaLogo size="md" variant="full" href="/" />

          <nav className="flex items-center gap-4 sm:gap-6 text-sm">
            <Link
              href="/dashboard"
              className="hidden sm:inline-block font-medium text-muted hover:text-foreground transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/learn"
              className="hidden sm:inline-block font-medium text-muted hover:text-foreground transition-colors"
            >
              Alternatives
            </Link>
            <Link
              href="/login"
              className="font-medium text-muted hover:text-foreground transition-colors"
            >
              Sign In
            </Link>

            <ThemeToggle />

            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white shadow-sm bg-gradient-to-r from-brand-600 to-brand-500 hover:opacity-95 transition-all"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 sm:py-24 px-4 sm:px-6">
        {/* Subtle Ambient Radial Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] rounded-full blur-[120px] pointer-events-none opacity-20 dark:opacity-30 bg-gradient-to-tr from-brand-500 to-indigo-600" />

        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-brand/10 border border-brand/20 text-brand">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Fintech Hackathon PS2 · All Your Investments, in One Place</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-tight text-foreground">
            Your Investments.{' '}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-500 via-sky-400 to-indigo-400">
              Unified. Understood.
            </span>
          </h1>

          <p className="text-base sm:text-lg max-w-2xl mx-auto leading-relaxed text-muted">
            Bring your investments together, understand your portfolio clearly, and discover
            opportunities beyond stocks — across Zerodha, Groww, CDSL, REITs, InvITs, and Sovereign Bonds.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm sm:text-base font-semibold text-white shadow-md bg-gradient-to-r from-brand-600 to-brand-500 hover:opacity-95 transition-transform hover:-translate-y-0.5"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/learn"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm sm:text-base font-semibold border border-border bg-surface hover:bg-surface-raised transition-colors text-foreground"
            >
              <span>Explore Finova</span>
            </Link>
          </div>

          {/* Privacy badge */}
          <div className="flex items-center justify-center gap-2 pt-2 text-xs text-muted">
            <Lock className="w-3.5 h-3.5 text-gain" />
            <span>Privacy First: Zero broker passwords or MPINs required. Verified CAS & statement import.</span>
          </div>
        </div>
      </section>

      {/* Unified Portfolio Visual Preview Card */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-20 w-full">
        <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8 shadow-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-border gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-brand">
                Unified Portfolio Preview
              </span>
              <h2 className="text-xl sm:text-2xl font-bold mt-1 text-foreground">
                Multi-Asset Consolidation
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-sky-500/10 text-sky-500 border border-sky-500/20">
                Zerodha (Kite)
              </span>
              <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                Groww Demat
              </span>
              <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-purple-500/10 text-purple-500 border border-purple-500/20">
                CDSL Depository
              </span>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-6">
            <div className="p-4 rounded-xl border border-border bg-surface-raised">
              <p className="text-xs font-medium text-muted">Total Portfolio Value</p>
              <p className="text-xl sm:text-2xl font-bold mt-1 text-foreground tabular-nums">₹24,86,420</p>
              <p className="text-xs font-semibold mt-1 text-gain">+₹2,21,400 Overall</p>
            </div>
            <div className="p-4 rounded-xl border border-border bg-surface-raised">
              <p className="text-xs font-medium text-muted">Absolute Returns</p>
              <p className="text-xl sm:text-2xl font-bold mt-1 text-gain tabular-nums">+18.38%</p>
              <p className="text-xs text-muted mt-1">1Y Return: +31.4%</p>
            </div>
            <div className="p-4 rounded-xl border border-border bg-surface-raised">
              <p className="text-xs font-medium text-muted">Asset Classes</p>
              <p className="text-xl sm:text-2xl font-bold mt-1 text-brand tabular-nums">6 Classes</p>
              <p className="text-xs text-muted mt-1">Equities, Bonds, REITs, InvITs</p>
            </div>
            <div className="p-4 rounded-xl border border-border bg-surface-raised">
              <p className="text-xs font-medium text-muted">AI Health Score</p>
              <p className="text-xl sm:text-2xl font-bold mt-1 text-warning tabular-nums">78 / 100</p>
              <p className="text-xs text-muted mt-1">Well Balanced</p>
            </div>
          </div>

          {/* Allocation Bar */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between text-xs text-muted">
              <span className="font-medium">Multi-Asset Allocation:</span>
              <span className="font-semibold text-foreground">
                Stocks 46% · Bonds 18% · REITs 12% · InvITs 8% · MFs 10% · Cash 6%
              </span>
            </div>
            <div className="w-full h-3 rounded-full flex overflow-hidden p-0.5 border border-border bg-surface-raised">
              <div style={{ width: '46%' }} className="h-full bg-cyan-500 rounded-l-full" title="Stocks 46%" />
              <div style={{ width: '18%' }} className="h-full bg-indigo-500" title="Bonds 18%" />
              <div style={{ width: '12%' }} className="h-full bg-amber-500" title="REITs 12%" />
              <div style={{ width: '8%' }} className="h-full bg-purple-500" title="InvITs 8%" />
              <div style={{ width: '10%' }} className="h-full bg-emerald-500" title="Mutual Funds 10%" />
              <div style={{ width: '6%' }} className="h-full bg-rose-500 rounded-r-full" title="Cash 6%" />
            </div>
          </div>
        </div>
      </section>

      {/* 4 Core Pillars of Finova */}
      <section className="border-t border-border py-16 px-4 sm:px-6 bg-surface-raised/40">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Everything in One Place
            </h2>
            <p className="text-sm text-muted">
              Built specifically to bridge the knowledge and aggregation gap for Indian retail investors.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Equities */}
            <div className="card p-6 space-y-3 hover:-translate-y-1 transition-transform">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-cyan-500/10 text-cyan-500">
                <PieChart className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-base text-foreground">Stocks & Equities</h3>
              <p className="text-xs text-muted leading-relaxed">
                Aggregated holdings across Zerodha, Groww, and CDSL in a single unified view with sector breakdown.
              </p>
            </div>

            {/* REITs & InvITs */}
            <div className="card p-6 space-y-3 hover:-translate-y-1 transition-transform">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-500/10 text-amber-500">
                <Building2 className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-base text-foreground">REITs & InvITs</h3>
              <p className="text-xs text-muted leading-relaxed">
                Demystified commercial real estate and infrastructure yields with transparent dividend tracking.
              </p>
            </div>

            {/* Bonds */}
            <div className="card p-6 space-y-3 hover:-translate-y-1 transition-transform">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-indigo-500/10 text-indigo-500">
                <Landmark className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-base text-foreground">Bonds & SGBs</h3>
              <p className="text-xs text-muted leading-relaxed">
                Sovereign Gold Bonds and Government Securities tracked alongside equity for predictable fixed yield.
              </p>
            </div>

            {/* AI Diagnostics */}
            <div className="card p-6 space-y-3 hover:-translate-y-1 transition-transform">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-brand/10 text-brand">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-base text-foreground">AI Intelligence</h3>
              <p className="text-xs text-muted leading-relaxed">
                Personalized portfolio health diagnostics, banking concentration alerts, and rebalancing guidance.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-border py-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted">
          <div className="flex items-center gap-3">
            <FinovaLogo size="xs" variant="horizontal" href="/" />
            <span className="text-muted text-xs">— “Your Investments. Unified. Understood.”</span>
          </div>

          <div className="flex items-center gap-5">
            <Link href="/dashboard" className="hover:text-foreground transition-colors">
              Dashboard
            </Link>
            <Link href="/learn" className="hover:text-foreground transition-colors">
              Learn Alternatives
            </Link>
            <Link href="/login" className="hover:text-foreground transition-colors">
              Sign In
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
