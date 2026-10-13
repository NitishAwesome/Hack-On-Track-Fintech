'use client';

import React from 'react';
import { Sparkles, ShieldCheck, AlertCircle } from 'lucide-react';

export function InsightPreviewSection() {
  return (
    <section className="py-20 sm:py-24 border-b border-border select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-brand/10 text-brand border border-brand/20">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Product Preview</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-foreground">
            Know what matters to your portfolio.
          </h2>

          <p className="text-sm sm:text-base text-muted max-w-2xl mx-auto leading-relaxed">
            Instead of generic market noise, Finova filters corporate developments and macroeconomic releases based on your actual holdings.
          </p>
        </div>

        {/* Interactive Sample News Intelligence Card */}
        <div className="max-w-3xl mx-auto mt-14">
          <div
            className="rounded-2xl border p-6 sm:p-8 space-y-6"
            style={{
              backgroundColor: 'rgb(var(--surface))',
              borderColor: 'rgb(var(--border))',
              boxShadow: 'var(--shadow-raised)',
            }}
          >
            {/* Card Header with prominent Sample Preview Badge */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-brand/10 text-brand font-bold text-sm">
                  ICICI
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground">ICICI Bank Ltd.</h3>
                  <p className="text-[11px] text-muted font-mono">NSE: ICICIBANK · Banking Sector</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-brand/10 text-brand border border-brand/20">
                  Product Preview
                </span>
                <span className="text-[10px] font-semibold text-muted px-2 py-0.5 rounded bg-surface-raised border border-border">
                  Sample Data
                </span>
              </div>
            </div>

            {/* News Sample Headline */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-500">
                <ShieldCheck className="w-4 h-4" />
                <span>Relevant to your portfolio</span>
                <span className="text-muted font-normal text-[11px]">· Portfolio Exposure: 12%</span>
              </div>

              <h4 className="text-base sm:text-lg font-bold text-foreground leading-snug">
                “Private Sector Lender Reports 14.2% YoY Domestic Loan Growth, Driven by Retail and SME Portfolios”
              </h4>
              <p className="text-xs text-muted leading-relaxed">
                Source: Illustrative Financial Digest · Indicative Preview Event
              </p>
            </div>

            {/* AI Contextual Insight Box */}
            <div
              className="p-4 sm:p-5 rounded-xl border space-y-2"
              style={{
                backgroundColor: 'rgb(var(--surface-raised))',
                borderColor: 'rgb(var(--border))',
              }}
            >
              <div className="flex items-center gap-2 text-xs font-bold text-brand">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Finova Intelligence Context</span>
              </div>

              <p className="text-xs sm:text-sm text-foreground leading-relaxed">
                “This type of news may be relevant because ICICI Bank represents a meaningful portion (12%) of this sample portfolio. Credit expansion in retail lending tends to support net interest margins, but monitor provisions for unsecured loans.”
              </p>
            </div>

            {/* Clarification Disclaimer */}
            <div className="flex items-center gap-2 text-[11px] text-muted pt-1">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>
                Demo illustration. The signed-in workspace provides portfolio context and sourced news when its providers are available.
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default InsightPreviewSection;
