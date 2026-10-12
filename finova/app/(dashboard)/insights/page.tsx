'use client';

// ============================================================
// FINOVA — AI Intelligence & Research Workspace
// /insights route
//
// Integrated conversational assistant powered by Gemini with
// authenticated portfolio context, stock research, source grounding,
// and persistent conversation history.
// ============================================================

import React from 'react';
import Link from 'next/link';
import { BarChart3, Shield, FlaskConical, Compass } from 'lucide-react';
import { FinovaIntelligenceWorkspace } from '@/components/insights/FinovaIntelligenceWorkspace';

export default function InsightsPage() {
  return (
    <div className="page-container space-y-4 py-3">
      {/* Cross-Page Navigation Quick Links */}
      <div className="flex flex-wrap items-center justify-end gap-2 border-b border-border pb-3">
        <Link
          href="/analysis"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-border bg-surface hover:bg-surface-raised transition-colors text-foreground"
        >
          <BarChart3 className="w-3.5 h-3.5 text-brand" />
          <span>Investment X-Ray</span>
        </Link>
        <Link
          href="/risk"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-border bg-surface hover:bg-surface-raised transition-colors text-foreground"
        >
          <Shield className="w-3.5 h-3.5 text-amber-500" />
          <span>Risk Radar</span>
        </Link>
        <Link
          href="/future-lab"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-border bg-surface hover:bg-surface-raised transition-colors text-foreground"
        >
          <FlaskConical className="w-3.5 h-3.5 text-purple-400" />
          <span>Future Lab</span>
        </Link>
        <Link
          href="/explore"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-border bg-surface hover:bg-surface-raised transition-colors text-foreground"
        >
          <Compass className="w-3.5 h-3.5 text-emerald-400" />
          <span>Investment Explorer</span>
        </Link>
      </div>

      {/* Primary Experience: Complete AI Research Assistant & Diagnostics Hub */}
      <FinovaIntelligenceWorkspace />
    </div>
  );
}

