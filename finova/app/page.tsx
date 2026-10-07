import Link from 'next/link';
import {
  TrendingUp, Building2, Zap, Shield, ArrowRight,
  PieChart, Sparkles, CheckCircle2, ChevronRight, Lock
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'rgb(var(--background))', color: 'rgb(var(--foreground))' }}>
      {/* Navigation Header */}
      <header
        className="sticky top-0 z-40 border-b backdrop-blur-md"
        style={{
          borderColor: 'rgb(var(--border))',
          backgroundColor: 'rgb(var(--background) / 0.85)',
        }}
      >
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-base shadow-sm"
              style={{ background: 'linear-gradient(135deg, rgb(var(--brand-600)), rgb(var(--brand-400)))' }}
            >
              F
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight" style={{ color: 'rgb(var(--foreground))' }}>
                Finova
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full"
                style={{ backgroundColor: 'rgb(var(--brand-500) / 0.12)', color: 'rgb(var(--brand-500))' }}>
                PS2 Edition
              </span>
            </div>
          </Link>

          <nav className="flex items-center gap-3 sm:gap-6 text-sm">
            <Link
              href="/learn"
              className="hidden sm:inline-block font-medium hover:text-blue-500 transition-colors"
              style={{ color: 'rgb(var(--muted))' }}
            >
              Learn Alternatives
            </Link>
            <Link
              href="/login"
              className="font-medium hover:text-blue-500 transition-colors"
              style={{ color: 'rgb(var(--muted))' }}
            >
              Sign In
            </Link>
            <Link
              href="/portfolio"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90 shadow-sm"
              style={{ background: 'linear-gradient(135deg, rgb(var(--brand-600)), rgb(var(--brand-400)))' }}
            >
              Open Dashboard
              <ArrowRight className="w-4 h-4" />
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 sm:py-24 px-4">
        {/* Subtle background glow */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] rounded-full blur-[120px] pointer-events-none opacity-20"
          style={{ background: 'radial-gradient(circle, rgb(var(--brand-500)), #8B5CF6)' }}
        />

        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-6">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{
              backgroundColor: 'rgb(var(--brand-500) / 0.1)',
              border: '1px solid rgb(var(--brand-500) / 0.25)',
              color: 'rgb(var(--brand-500))',
            }}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Hack On Track — PS2: All Your Investments, in One Place
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-tight">
            Your Investments.{' '}
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage: 'linear-gradient(135deg, rgb(var(--brand-500)), #8B5CF6)',
              }}
            >
              Unified. Understood.
            </span>
          </h1>

          <p className="text-base sm:text-lg max-w-2xl mx-auto leading-relaxed" style={{ color: 'rgb(var(--muted))' }}>
            A unified wealth platform designed for Indian retail investors. Bring all your demat accounts,
            depositories, equities, REITs, InvITs, and Government Bonds into one clean, intelligent view — powered by Google Gemini AI.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
            <Link
              href="/portfolio"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-base font-semibold text-white shadow-lg transition-transform hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg, rgb(var(--brand-600)), rgb(var(--brand-400)))' }}
            >
              Explore Unified Dashboard
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/learn"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-base font-medium transition-colors"
              style={{
                backgroundColor: 'rgb(var(--surface-raised))',
                border: '1px solid rgb(var(--border))',
                color: 'rgb(var(--foreground))',
              }}
            >
              Understand REITs & Bonds
            </Link>
          </div>

          {/* Privacy badge */}
          <div className="flex items-center justify-center gap-2 pt-2 text-xs" style={{ color: 'rgb(var(--muted))' }}>
            <Lock className="w-3.5 h-3.5" style={{ color: 'rgb(var(--gain))' }} />
            <span>Privacy First: Zero broker passwords, MPINs, or OTPs ever stored.</span>
          </div>
        </div>
      </section>

      {/* Live Sample Portfolio Snapshot Card */}
      <section className="max-w-5xl mx-auto px-4 pb-20 w-full">
        <div
          className="rounded-2xl border p-6 sm:p-8 shadow-xl"
          style={{
            backgroundColor: 'rgb(var(--surface))',
            borderColor: 'rgb(var(--border))',
          }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b gap-4" style={{ borderColor: 'rgb(var(--border))' }}>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgb(var(--brand-500))' }}>
                Finova Multi-Broker Engine
              </span>
              <h2 className="text-xl sm:text-2xl font-bold mt-1" style={{ color: 'rgb(var(--foreground))' }}>
                Unified Portfolio Preview
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-blue-500/10 text-blue-500 border border-blue-500/20">
                Zerodha (Kite)
              </span>
              <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                Groww Demat
              </span>
              <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-purple-500/10 text-purple-500 border border-purple-500/20">
                CDSL Depository
              </span>
            </div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-6">
            <div className="p-4 rounded-xl border" style={{ backgroundColor: 'rgb(var(--surface-raised))', borderColor: 'rgb(var(--border))' }}>
              <p className="text-xs" style={{ color: 'rgb(var(--muted))' }}>Total Value</p>
              <p className="text-xl sm:text-2xl font-bold mt-1" style={{ color: 'rgb(var(--foreground))' }}>₹14,25,800</p>
              <p className="text-[11px] mt-1" style={{ color: 'rgb(var(--gain))' }}>+₹2,21,400 Overall</p>
            </div>
            <div className="p-4 rounded-xl border" style={{ backgroundColor: 'rgb(var(--surface-raised))', borderColor: 'rgb(var(--border))' }}>
              <p className="text-xs" style={{ color: 'rgb(var(--muted))' }}>Absolute Return</p>
              <p className="text-xl sm:text-2xl font-bold mt-1" style={{ color: 'rgb(var(--gain))' }}>+18.38%</p>
              <p className="text-[11px] mt-1" style={{ color: 'rgb(var(--muted))' }}>Invested: ₹12,04,400</p>
            </div>
            <div className="p-4 rounded-xl border" style={{ backgroundColor: 'rgb(var(--surface-raised))', borderColor: 'rgb(var(--border))' }}>
              <p className="text-xs" style={{ color: 'rgb(var(--muted))' }}>Risk Health Score</p>
              <p className="text-xl sm:text-2xl font-bold mt-1" style={{ color: '#F59E0B' }}>48 / 100</p>
              <p className="text-[11px] mt-1" style={{ color: 'rgb(var(--muted))' }}>Moderate · Diversified</p>
            </div>
            <div className="p-4 rounded-xl border" style={{ backgroundColor: 'rgb(var(--surface-raised))', borderColor: 'rgb(var(--border))' }}>
              <p className="text-xs" style={{ color: 'rgb(var(--muted))' }}>Asset Classes</p>
              <p className="text-xl sm:text-2xl font-bold mt-1" style={{ color: 'rgb(var(--brand-500))' }}>5 Classes</p>
              <p className="text-[11px] mt-1" style={{ color: 'rgb(var(--muted))' }}>Stocks, REIT, InvIT, Bonds</p>
            </div>
          </div>

          {/* Allocation Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs" style={{ color: 'rgb(var(--muted))' }}>
              <span>Multi-Asset Allocation Breakdown:</span>
              <span className="font-medium text-foreground">Equities 48% · REITs 22% · InvITs 14% · Govt Bonds 16%</span>
            </div>
            <div className="w-full h-3 rounded-full flex overflow-hidden">
              <div style={{ width: '48%', backgroundColor: '#3B82F6' }} title="Equities 48%" />
              <div style={{ width: '22%', backgroundColor: '#8B5CF6' }} title="REITs 22%" />
              <div style={{ width: '14%', backgroundColor: '#F59E0B' }} title="InvITs 14%" />
              <div style={{ width: '16%', backgroundColor: '#10B981' }} title="Govt Bonds 16%" />
            </div>
          </div>
        </div>
      </section>

      {/* Problem & Solution Pillar Section */}
      <section className="border-t py-16 px-4" style={{ borderColor: 'rgb(var(--border))', backgroundColor: 'rgb(var(--surface-raised) / 0.5)' }}>
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-3xl font-bold tracking-tight" style={{ color: 'rgb(var(--foreground))' }}>
              Solving the Indian Retail Investor Puzzle
            </h2>
            <p className="text-sm" style={{ color: 'rgb(var(--muted))' }}>
              Most retail investors hold accounts across multiple apps and miss out on high-yield alternatives.
              Finova bridges the gap in 4 key ways:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1 */}
            <div className="card p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-500/10 text-blue-500">
                <PieChart className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-base" style={{ color: 'rgb(var(--foreground))' }}>
                Unified Across Brokers
              </h3>
              <p className="text-xs leading-relaxed" style={{ color: 'rgb(var(--muted))' }}>
                Aggregate holdings from Zerodha, Groww, Angel One, CDSL, and NSDL into one consolidated net-worth view.
              </p>
            </div>

            {/* Card 2 */}
            <div className="card p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-purple-500/10 text-purple-500">
                <Building2 className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-base" style={{ color: 'rgb(var(--foreground))' }}>
                Alternative Assets Decoded
              </h3>
              <p className="text-xs leading-relaxed" style={{ color: 'rgb(var(--muted))' }}>
                Demystify commercial REITs (office dividends), InvITs (infrastructure yields), and sovereign bonds with plain-English guides.
              </p>
            </div>

            {/* Card 3 */}
            <div className="card p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-500/10 text-amber-500">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-base" style={{ color: 'rgb(var(--foreground))' }}>
                Gemini AI Diagnostics
              </h3>
              <p className="text-xs leading-relaxed" style={{ color: 'rgb(var(--muted))' }}>
                Personalized portfolio health checks, concentration alerts, and rebalancing suggestions powered by Google Gemini.
              </p>
            </div>

            {/* Card 4 */}
            <div className="card p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-500/10 text-emerald-500">
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-base" style={{ color: 'rgb(var(--foreground))' }}>
                Bank-Grade Privacy
              </h3>
              <p className="text-xs leading-relaxed" style={{ color: 'rgb(var(--muted))' }}>
                Zero broker credentials, MPINs, or OTPs stored. Import via standard CSV/CAS statement or manual entry.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t py-8 px-4" style={{ borderColor: 'rgb(var(--border))' }}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs" style={{ color: 'rgb(var(--muted))' }}>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded flex items-center justify-center text-white text-[10px] font-bold bg-blue-600">
              F
            </div>
            <span className="font-semibold" style={{ color: 'rgb(var(--foreground))' }}>Finova</span>
            <span>— Hack On Track (Fintech PS2)</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/portfolio" className="hover:underline">Dashboard</Link>
            <Link href="/holdings" className="hover:underline">Holdings</Link>
            <Link href="/learn" className="hover:underline">Learn</Link>
            <Link href="/risk" className="hover:underline">Risk</Link>
            <Link href="/insights" className="hover:underline">AI Insights</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
