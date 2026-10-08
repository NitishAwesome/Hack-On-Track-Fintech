'use client';

import React from 'react';
import Link from 'next/link';
import { FinovaLogo } from '@/components/shared/FinovaLogo';

export function LandingFooter() {
  return (
    <footer className="border-t border-border bg-surface-raised/40 select-none text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10">
          {/* Brand Col */}
          <div className="md:col-span-2 space-y-3">
            <Link href="/" className="inline-block">
              <FinovaLogo size="sm" variant="horizontal" />
            </Link>
            <p className="text-muted leading-relaxed max-w-sm">
              Your Investments. Unified. Understood.
            </p>
            <p className="text-[11px] text-muted/80 max-w-sm leading-relaxed">
              Consolidated portfolio tracking, multi-asset intelligence, and risk analysis for Indian retail investors.
            </p>
          </div>

          {/* Product Links */}
          <div className="space-y-3">
            <p className="font-bold uppercase tracking-wider text-[11px] text-foreground">
              Product
            </p>
            <ul className="space-y-2 text-muted">
              <li>
                <Link href="/dashboard" className="hover:text-foreground transition-colors">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link href="/analysis" className="hover:text-foreground transition-colors">
                  Portfolio Analysis
                </Link>
              </li>
              <li>
                <Link href="/explore" className="hover:text-foreground transition-colors">
                  Explore Investments
                </Link>
              </li>
              <li>
                <Link href="/news" className="hover:text-foreground transition-colors">
                  News & Insights
                </Link>
              </li>
            </ul>
          </div>

          {/* Investment Types */}
          <div className="space-y-3">
            <p className="font-bold uppercase tracking-wider text-[11px] text-foreground">
              Investment Types
            </p>
            <ul className="space-y-2 text-muted">
              <li>
                <Link href="/explore" className="hover:text-foreground transition-colors">
                  Stocks
                </Link>
              </li>
              <li>
                <Link href="/reit" className="hover:text-foreground transition-colors">
                  REITs
                </Link>
              </li>
              <li>
                <Link href="/invit" className="hover:text-foreground transition-colors">
                  InvITs
                </Link>
              </li>
              <li>
                <Link href="/bonds" className="hover:text-foreground transition-colors">
                  Bonds
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal Links */}
          <div className="space-y-3">
            <p className="font-bold uppercase tracking-wider text-[11px] text-foreground">
              Legal
            </p>
            <ul className="space-y-2 text-muted">
              <li>
                <Link href="/terms" className="hover:text-foreground transition-colors">
                  Terms
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-foreground transition-colors">
                  Privacy
                </Link>
              </li>
              <li>
                <Link href="/risk-disclosure" className="hover:text-foreground transition-colors">
                  Risk Disclosure
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Disclaimer & Copyright */}
        <div className="mt-12 pt-8 border-t border-border space-y-4 text-muted">
          <p className="text-[11px] leading-relaxed max-w-4xl text-muted/90">
            Finova is currently a hackathon prototype focused on portfolio aggregation, analysis and investor education. Information presented on the platform should not be interpreted as guaranteed investment advice or guaranteed returns.
          </p>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-muted">
            <p>© {new Date().getFullYear()} FINOVA. All rights reserved.</p>
            <p>Designed for Fintech Hackathon · Track PS2</p>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default LandingFooter;
