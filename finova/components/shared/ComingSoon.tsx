'use client';

import { motion } from 'framer-motion';
import { Rocket, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface ComingSoonProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  eta?: string;
}

/**
 * ComingSoon — polished placeholder for unimplemented routes.
 * Not a fake UI — clearly communicates future availability.
 */
export function ComingSoon({
  title,
  description,
  icon,
  eta,
}: ComingSoonProps) {
  return (
    <div className="page-container">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="max-w-md mx-auto flex flex-col items-center text-center py-16 gap-5"
      >
        {/* Icon */}
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, rgb(var(--brand-600) / 0.15), rgb(var(--brand-400) / 0.1))',
            border: '1px solid rgb(var(--brand-500) / 0.2)',
          }}
        >
          <span style={{ color: 'rgb(var(--brand-500))' }}>
            {icon ?? <Rocket className="w-7 h-7" />}
          </span>
        </div>

        {/* Text */}
        <div className="space-y-2">
          <h1 className="text-xl font-semibold" style={{ color: 'rgb(var(--foreground))' }}>
            {title}
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: 'rgb(var(--muted))' }}>
            {description ??
              'This feature is in development and will be available soon. Stay tuned for updates.'}
          </p>
          {eta && (
            <p
              className="text-xs font-medium px-3 py-1 rounded-full inline-block"
              style={{
                backgroundColor: 'rgb(var(--brand-500) / 0.1)',
                color: 'rgb(var(--brand-500))',
                border: '1px solid rgb(var(--brand-500) / 0.2)',
              }}
            >
              {eta}
            </p>
          )}
        </div>

        {/* Back link */}
        <Link
          href="/portfolio"
          className="flex items-center gap-2 text-sm font-medium transition-opacity hover:opacity-70"
          style={{ color: 'rgb(var(--muted))' }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Portfolio
        </Link>
      </motion.div>
    </div>
  );
}
