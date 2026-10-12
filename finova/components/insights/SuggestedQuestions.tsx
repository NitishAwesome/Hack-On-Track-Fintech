'use client';

// ============================================================
// FINOVA — Suggested Financial Research Questions
// components/insights/SuggestedQuestions.tsx
//
// 10 real, interactive research questions covering portfolio,
// market quotes, financial news, Future Lab, and regulations.
// ============================================================

import React from 'react';
import {
  ShieldAlert,
  PieChart,
  TrendingUp,
  ArrowLeftRight,
  Newspaper,
  Layers,
  Sparkles,
  Building2,
  FileSearch,
  Scale,
} from 'lucide-react';

interface SuggestedQuestionsProps {
  onSelectQuestion: (question: string) => void;
  disabled?: boolean;
}

export const SUGGESTED_QUESTIONS = [
  {
    id: 'sq-1',
    text: 'Why is my portfolio risky?',
    category: 'Risk Radar',
    icon: ShieldAlert,
  },
  {
    id: 'sq-2',
    text: 'Which stock has the highest concentration in my portfolio?',
    category: 'Investment X-Ray',
    icon: PieChart,
  },
  {
    id: 'sq-3',
    text: 'What happens if I invest another ₹50,000?',
    category: 'Future Lab',
    icon: TrendingUp,
  },
  {
    id: 'sq-4',
    text: 'Compare RELIANCE and TCS.',
    category: 'Stock Research',
    icon: ArrowLeftRight,
  },
  {
    id: 'sq-5',
    text: 'Which recent news affects my holdings?',
    category: 'News & Market',
    icon: Newspaper,
  },
  {
    id: 'sq-6',
    text: 'How can I research portfolio diversification?',
    category: 'Diversification',
    icon: Layers,
  },
  {
    id: 'sq-7',
    text: 'Explain the Balanced strategy from Future Lab.',
    category: 'Future Lab',
    icon: Sparkles,
  },
  {
    id: 'sq-8',
    text: 'What are REITs and InvITs?',
    category: 'Education',
    icon: Building2,
  },
  {
    id: 'sq-9',
    text: 'What should I research before investing in a stock?',
    category: 'Research Guide',
    icon: FileSearch,
  },
  {
    id: 'sq-10',
    text: 'Explain a specific SEBI investment rule.',
    category: 'SEBI Compliance',
    icon: Scale,
  },
];

export function SuggestedQuestions({
  onSelectQuestion,
  disabled = false,
}: SuggestedQuestionsProps) {
  return (
    <div className="w-full">
      <div className="text-xs font-semibold mb-2.5 flex items-center gap-1.5" style={{ color: 'rgb(var(--muted))' }}>
        <Sparkles className="w-3.5 h-3.5 text-brand" />
        <span>Suggested Financial Research Queries</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {SUGGESTED_QUESTIONS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelectQuestion(item.text)}
              className="text-left p-2.5 rounded-lg border transition-all flex items-start gap-2.5 group hover:border-brand/60 hover:shadow-xs disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
              style={{
                backgroundColor: 'rgba(var(--foreground-rgb, 128,128,128), 0.02)',
                borderColor: 'rgb(var(--border))',
              }}
            >
              <div
                className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 border"
                style={{
                  backgroundColor: 'rgba(var(--foreground-rgb, 128,128,128), 0.04)',
                  borderColor: 'rgb(var(--border))',
                }}
              >
                <Icon className="w-3.5 h-3.5 text-brand group-hover:scale-110 transition-transform" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium leading-snug line-clamp-2" style={{ color: 'rgb(var(--foreground))' }}>
                  {item.text}
                </div>
                <div className="text-[10px] mt-0.5" style={{ color: 'rgb(var(--muted))' }}>
                  {item.category}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
