'use client';

import React from 'react';
import Link from 'next/link';
import { Sparkles, ArrowRight, MessageSquare, Bot, HelpCircle } from 'lucide-react';

const SUGGESTED_QUESTIONS = [
  'What is driving my portfolio’s return this month?',
  'Explain concentration risk across my holdings',
  'How would rising interest rates impact my sector exposure?',
];

export function AskFinovaCommandSection() {
  return (
    <div
      className="p-5 sm:p-6 rounded-2xl border relative overflow-hidden transition-all duration-200 bg-surface shadow-xs"
      style={{
        borderColor: 'rgb(var(--border))',
      }}
    >
      {/* Background Subtle Accent Glow */}
      <div
        className="absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl pointer-events-none opacity-10"
        style={{
          background: 'radial-gradient(circle, rgb(168, 85, 247) 0%, rgb(14, 165, 233) 100%)',
        }}
      />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
        {/* Left: Branding & Value Proposition */}
        <div className="space-y-3 max-w-2xl">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center border shadow-xs"
              style={{
                background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15), rgba(14, 165, 233, 0.15))',
                borderColor: 'rgba(168, 85, 247, 0.3)',
                color: '#A855F7',
              }}
            >
              <Sparkles className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
                  Ask FINOVA
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  AI Intelligence
                </span>
              </div>
              <p className="text-xs text-muted">
                Understand your portfolio, research investments and explain recent market developments.
              </p>
            </div>
          </div>

          {/* Example Question Chips */}
          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            <span className="text-[11px] font-semibold text-muted flex items-center gap-1 mr-1">
              <HelpCircle className="w-3 h-3 text-purple-400" />
              Try asking:
            </span>
            {SUGGESTED_QUESTIONS.map((q) => (
              <Link
                key={q}
                href={`/insights?q=${encodeURIComponent(q)}`}
                className="px-3 py-1 rounded-xl text-xs font-semibold bg-surface-raised/70 hover:bg-surface-raised border border-border text-foreground hover:text-purple-400 transition-all hover-card inline-flex items-center gap-1.5 shadow-xs"
              >
                <span>&ldquo;{q}&rdquo;</span>
                <ArrowRight className="w-2.5 h-2.5 opacity-60" />
              </Link>
            ))}
          </div>
        </div>

        {/* Right: Prominent Action Button */}
        <div className="shrink-0 flex items-center">
          <Link
            href="/insights"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white shadow-sm transition-all hover:opacity-90 hover:shadow-md"
            style={{
              background: 'linear-gradient(135deg, rgb(168, 85, 247), rgb(14, 165, 233))',
            }}
          >
            <Bot className="w-4 h-4" />
            <span>Open FINOVA Intelligence</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </div>
      </div>
    </div>
  );
}
