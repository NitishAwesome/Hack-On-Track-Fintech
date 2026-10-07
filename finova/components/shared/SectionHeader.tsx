'use client';

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  actionText?: string;
  actionHref?: string;
  onActionClick?: () => void;
  className?: string;
  actionElement?: React.ReactNode;
}

export function SectionHeader({
  title,
  subtitle,
  badge,
  actionText,
  actionHref,
  onActionClick,
  className,
  actionElement,
}: SectionHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between pb-3', className)}>
      <div className="flex items-center gap-2.5">
        <div>
          <div className="flex items-center gap-2">
            <h2
              className="text-base font-semibold tracking-tight leading-none"
              style={{ color: 'rgb(var(--foreground))' }}
            >
              {title}
            </h2>
            {badge && <div>{badge}</div>}
          </div>
          {subtitle && (
            <p className="text-xs mt-1" style={{ color: 'rgb(var(--muted))' }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {actionElement}
        {actionText && (
          actionHref ? (
            <Link
              href={actionHref}
              className="inline-flex items-center gap-1 text-xs font-medium transition-colors hover:opacity-80 group"
              style={{ color: 'rgb(var(--brand-500))' }}
            >
              <span>{actionText}</span>
              <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          ) : (
            <button
              onClick={onActionClick}
              className="inline-flex items-center gap-1 text-xs font-medium transition-colors hover:opacity-80"
              style={{ color: 'rgb(var(--brand-500))' }}
            >
              <span>{actionText}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )
        )}
      </div>
    </div>
  );
}
