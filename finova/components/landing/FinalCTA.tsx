'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Compass } from 'lucide-react';

export function FinalCTA() {
  return (
    <section className="py-20 sm:py-28 relative overflow-hidden select-none">
      {/* Background radial accent */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] rounded-full blur-[130px] pointer-events-none opacity-20 dark:opacity-25"
        style={{
          background: 'radial-gradient(circle, rgb(var(--brand-500)) 0%, rgba(99, 102, 241, 0.3) 60%, transparent 80%)',
        }}
        aria-hidden="true"
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 space-y-6">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-foreground">
          See your investments more clearly.
        </h2>

        <p className="text-base sm:text-lg text-muted max-w-xl mx-auto leading-relaxed">
          Create your Finova account and start building a unified view of your portfolio.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
          <Link
            href="/register"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-brand-600 to-brand-500 hover:opacity-95 shadow-md transition-all hover:scale-[1.02] active:scale-[0.99]"
          >
            <span>Create Account</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            href="/dashboard"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-sm font-semibold border border-border bg-surface hover:bg-surface-raised transition-colors text-foreground shadow-xs"
          >
            <Compass className="w-4 h-4 text-muted" />
            <span>Explore Platform</span>
          </Link>
        </div>

        <p className="text-xs text-muted pt-2">
          Fast registration · Built for Indian retail investors
        </p>
      </div>
    </section>
  );
}

export default FinalCTA;
