'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, ArrowUpRight, ArrowRight } from 'lucide-react';
import { PageSection } from '@/components/shared/PageSection';
const QUESTIONS = [
  'Explain concentration across my holdings',
  'Help me understand my portfolio allocation',
  'What should I check when researching a company?',
];
export function AskFinovaCommandSection() {
  const [question, setQuestion] = useState('');
  const router = useRouter();
  const open = (text: string) => router.push(`/insights?question=${encodeURIComponent(text)}`);
  return (
    <PageSection
      title="Ask FINOVA"
      eyebrow="UNDERSTAND YOUR NEXT QUESTION"
      description="Bring your recorded portfolio into a conversation."
      icon={Sparkles}
      accent="violet"
      className="h-full"
    >
      <div className="space-y-4">
        <p className="text-sm text-foreground leading-relaxed">
          Turn an observation into a question. Explore your allocation, understand concentration, or
          research a company.
        </p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (question.trim()) open(question.trim());
          }}
          className="space-y-3"
        >
          <label htmlFor="dashboard-finova-question" className="sr-only">
            Your question for FINOVA
          </label>
          <textarea
            id="dashboard-finova-question"
            rows={2}
            maxLength={2000}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="What would you like to understand?"
            className="w-full text-sm rounded-xl border border-border bg-surface px-3 py-3 resize-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15 outline-none"
          />
          <button
            type="submit"
            disabled={!question.trim()}
            className="finova-button w-full !bg-violet-600 !text-white !border-transparent hover:!bg-violet-700"
          >
            Open in FINOVA Intelligence
            <ArrowUpRight size={15} />
          </button>
        </form>
        <div className="space-y-1 pt-1">
          {QUESTIONS.map((text) => (
            <button
              key={text}
              type="button"
              onClick={() => open(text)}
              className="flex justify-between items-center gap-3 text-left w-full text-xs text-muted hover:text-foreground py-2.5 min-h-11"
            >
              <span>{text}</span>
              <ArrowRight size={14} className="shrink-0" />
            </button>
          ))}
        </div>
        <p className="text-[11px] text-muted leading-relaxed">
          Your question opens as an editable draft. You choose when to send it.
        </p>
      </div>
    </PageSection>
  );
}
