'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Shield, Compass } from 'lucide-react';
import { PortfolioPreview } from './PortfolioPreview';

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-8 pb-16 sm:pt-14 sm:pb-20 lg:pt-20 lg:pb-24">
      {/* Subtle Background Radial Gradient */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] rounded-full blur-[140px] pointer-events-none opacity-20 dark:opacity-25"
        style={{
          background: 'radial-gradient(circle, rgb(var(--brand-500)) 0%, rgba(99, 102, 241, 0.4) 60%, transparent 80%)',
        }}
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left Column: Messaging & CTAs */}
          <div className="lg:col-span-6 space-y-6 text-left">
            {/* Small Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border bg-surface-raised border-border text-foreground shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
              <span>Unified Investment Intelligence</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.08] text-foreground">
              Your Investments.{' '}
              <span className="block mt-1 bg-clip-text text-transparent bg-gradient-to-r from-brand-600 via-sky-500 to-teal-500">
                Unified. Understood.
              </span>
            </h1>

            {/* Supporting Copy */}
            <p className="text-base sm:text-lg text-muted max-w-xl leading-relaxed">
              Bring your investments together, understand your portfolio clearly, and explore opportunities beyond stocks — all from one intelligent platform.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-brand-600 to-brand-500 hover:opacity-95 shadow-md transition-all hover:scale-[1.02] active:scale-[0.99] text-center"
              >
                <span>Get Started</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold border border-border bg-surface hover:bg-surface-raised transition-colors text-foreground text-center"
              >
                <Compass className="w-4 h-4 text-muted" />
                <span>Explore Finova</span>
              </Link>
            </div>

            {/* Subtle Trust Message */}
            <div className="flex items-center gap-2 pt-2 text-xs text-muted">
              <Shield className="w-3.5 h-3.5 text-brand flex-shrink-0" />
              <span>Built for portfolio visibility, analysis and investor education.</span>
            </div>
          </div>

          {/* Right Column: Interactive Portfolio Preview */}
          <div className="lg:col-span-6 w-full">
            <PortfolioPreview />
          </div>
        </div>
      </div>
    </section>
  );
}

export default HeroSection;
