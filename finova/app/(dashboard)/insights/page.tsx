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
import { FinovaIntelligenceWorkspace } from '@/components/insights/FinovaIntelligenceWorkspace';

export default function InsightsPage() {
  return (
    <div className="page-container py-4">
      <FinovaIntelligenceWorkspace />
    </div>
  );
}
