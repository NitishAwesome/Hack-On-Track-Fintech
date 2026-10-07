'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

/**
 * ErrorState — displayed when a data fetch fails.
 */
export function ErrorState({
  message = 'Something went wrong while loading data.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="card p-10 flex flex-col items-center gap-3 text-center">
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center"
        style={{ backgroundColor: 'rgb(var(--loss-bg))' }}
      >
        <AlertTriangle className="w-5 h-5" style={{ color: 'rgb(var(--loss))' }} />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium" style={{ color: 'rgb(var(--foreground))' }}>
          Failed to load
        </p>
        <p className="text-xs" style={{ color: 'rgb(var(--muted))' }}>
          {message}
        </p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
          style={{
            color: 'rgb(var(--brand-500))',
            backgroundColor: 'rgb(var(--brand-500) / 0.08)',
            border: '1px solid rgb(var(--brand-500) / 0.2)',
          }}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Try again
        </button>
      )}
    </div>
  );
}
