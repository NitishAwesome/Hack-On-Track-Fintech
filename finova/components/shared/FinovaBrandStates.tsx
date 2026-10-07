'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { FinovaSymbol } from './FinovaLogo';
import { cn } from '@/lib/utils';

interface FinovaLoadingProps {
  /** Optional status text below the logo */
  message?: string;
  /** Size of the pulsing icon */
  size?: number;
  /** Whether to render as full-screen overlay or container centered */
  fullScreen?: boolean;
  className?: string;
}

/**
 * Subtle branded loading state using the Finova icon.
 * Simple, elegant pulse animation without excessive motion.
 */
export function FinovaLoading({
  message = 'Loading your portfolio...',
  size = 48,
  fullScreen = false,
  className = '',
}: FinovaLoadingProps) {
  const containerClasses = fullScreen
    ? 'fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-md'
    : 'flex flex-col items-center justify-center py-16 px-4';

  return (
    <div className={cn(containerClasses, className)} role="status" aria-label="Loading">
      <motion.div
        animate={{
          opacity: [0.65, 1, 0.65],
          scale: [0.97, 1.02, 0.97],
        }}
        transition={{
          duration: 2.2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="relative flex items-center justify-center"
      >
        {/* Soft ambient backlight halo */}
        <div
          className="absolute inset-0 rounded-full blur-xl opacity-25"
          style={{
            background: 'radial-gradient(circle, rgb(var(--brand-500)) 0%, transparent 70%)',
            transform: 'scale(1.6)',
          }}
        />
        <FinovaSymbol size={size} />
      </motion.div>

      {message && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-4 text-xs font-medium text-muted tracking-wide"
        >
          {message}
        </motion.p>
      )}
      <span className="sr-only">Loading...</span>
    </div>
  );
}

interface FinovaEmptyStateProps {
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  iconSize?: number;
  className?: string;
}

/**
 * Branded empty state component using the Finova emblem.
 */
export function FinovaEmptyState({
  title,
  description,
  action,
  iconSize = 40,
  className = '',
}: FinovaEmptyStateProps) {
  return (
    <div className={cn('card p-10 flex flex-col items-center text-center max-w-md mx-auto', className)}>
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 bg-brand/10 border border-brand/20 shadow-sm">
        <FinovaSymbol size={iconSize} />
      </div>
      <h3 className="text-base font-semibold text-foreground tracking-tight">{title}</h3>
      {description && (
        <p className="mt-1.5 text-xs text-muted max-w-sm leading-relaxed">{description}</p>
      )}
      {action && (
        <div className="mt-5">
          {action.href ? (
            <a
              href={action.href}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-brand shadow-sm hover:opacity-95 transition-opacity"
            >
              {action.label}
            </a>
          ) : (
            <button
              onClick={action.onClick}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-brand shadow-sm hover:opacity-95 transition-opacity"
            >
              {action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default FinovaLoading;
