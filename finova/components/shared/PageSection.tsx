'use client';

import { useId, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import './page-effects.css';

export type PageAccent = 'cyan' | 'blue' | 'violet' | 'amber' | 'teal';

/** Shared presentation; data and actions stay owned by each page. */
export function PageSection({
  title,
  description,
  eyebrow,
  icon: Icon,
  accent = 'cyan',
  action,
  children,
  className,
  id,
}: {
  title: string;
  description?: string;
  eyebrow?: string;
  icon?: LucideIcon;
  accent?: PageAccent;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  const headingId = useId();
  const reducedMotion = useReducedMotion();
  return (
    <motion.section
      id={id}
      aria-labelledby={headingId}
      data-tone={accent}
      className={cn('finova-panel finova-reveal', className)}
      initial={reducedMotion ? false : { opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.08 }}
      transition={{ duration: 0.24 }}
    >
      <div className="finova-section-heading">
        <div className="flex items-start gap-3 min-w-0">
          {Icon && (
            <span className="finova-accent-icon shrink-0">
              <Icon size={20} aria-hidden="true" />
            </span>
          )}
          <div className="min-w-0">
            {eyebrow && <p className="finova-eyebrow mb-1">{eyebrow}</p>}
            <h2
              id={headingId}
              className="text-base sm:text-lg font-bold tracking-tight text-foreground"
            >
              {title}
            </h2>
            {description && (
              <p className="text-xs text-muted mt-1 leading-relaxed">{description}</p>
            )}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </motion.section>
  );
}

export function SectionFeedback({
  loading,
  error,
  retry,
  children,
}: {
  loading?: boolean;
  error?: string | null;
  retry?: () => void;
  children?: ReactNode;
}) {
  if (loading)
    return (
      <div role="status" aria-label="Loading section" className="space-y-3 py-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-12" />
        ))}
      </div>
    );
  if (error)
    return (
      <div role="alert" className="finova-empty">
        <p className="font-semibold text-foreground">This section could not be loaded</p>
        <p className="text-xs text-muted mt-2">{error}</p>
        {retry && (
          <button type="button" className="finova-button mt-3" onClick={retry}>
            Try again
          </button>
        )}
      </div>
    );
  return <>{children}</>;
}
