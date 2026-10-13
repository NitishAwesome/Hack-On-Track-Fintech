'use client';

import { useState } from 'react';
import { usePrivateQuery as useQuery } from '@/lib/hooks/usePrivateQuery';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

interface AIInsightCardProps {
  insightType?: string;
}

async function fetchInsight(insightType: string) {
  const res = await fetch('/api/ai/insights', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ insight_type: insightType }),
  });
  if (!res.ok) throw new Error('Failed to load insight');
  return res.json();
}

export function AIInsightCard({ insightType = 'portfolio_summary' }: AIInsightCardProps) {
  const [expanded, setExpanded] = useState(true);

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['ai-insight', insightType],
    queryFn: () => fetchInsight(insightType),
    staleTime: 4 * 60 * 60 * 1000,
  });

  const insight = data?.insight;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className="card overflow-hidden"
    >
      {/* Header — using div + role button to avoid nested <button> hydration error */}
      <div
        id="ai-insight-toggle"
        role="button"
        tabIndex={0}
        onClick={() => setExpanded(!expanded)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setExpanded(!expanded); }}
        className="w-full flex items-center justify-between px-5 py-4 transition-colors cursor-pointer"
        style={{ backgroundColor: 'transparent' }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, rgb(var(--brand-600)), rgb(var(--brand-400)))' }}
          >
            <Sparkles className="w-3.5 h-3.5 text-foreground dark:text-white" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold" style={{ color: 'rgb(var(--foreground))' }}>
              AI Portfolio Insight
            </p>
            {insight?.cached && (
              <p className="text-xs" style={{ color: 'rgb(var(--muted))' }}>
                Cached · refreshes every 4 hours
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); refetch(); }}
            disabled={isFetching}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'rgb(var(--muted))' }}
            title="Refresh insight"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
          {expanded ? (
            <ChevronUp className="w-4 h-4" style={{ color: 'rgb(var(--muted))' }} />
          ) : (
            <ChevronDown className="w-4 h-4" style={{ color: 'rgb(var(--muted))' }} />
          )}
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div
              className="px-5 pb-5 pt-0"
              style={{ borderTop: '1px solid rgb(var(--border))' }}
            >
              {isLoading || isFetching ? (
                <div className="pt-4 space-y-2">
                  <div className="skeleton h-4 w-full" />
                  <div className="skeleton h-4 w-5/6" />
                  <div className="skeleton h-4 w-4/5" />
                </div>
              ) : error ? (
                <p className="pt-4 text-sm" style={{ color: 'rgb(var(--muted))' }}>
                  Could not load AI insight. Ensure your Gemini API key is configured.
                </p>
              ) : (
                <p className="pt-4 text-sm leading-relaxed" style={{ color: 'rgb(var(--foreground))' }}>
                  {insight?.text}
                </p>
              )}

              <p className="mt-3 text-xs" style={{ color: 'rgb(var(--muted))' }}>
                ⚠ For informational purposes only. Not financial advice.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
