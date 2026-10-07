'use client';

import { motion } from 'framer-motion';
import { FinovaSymbol } from './FinovaLogo';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="flex flex-col items-center justify-center py-16 px-4 text-center"
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 border transition-colors shadow-sm"
        style={{
          backgroundColor: 'rgb(var(--surface-raised))',
          borderColor: 'rgb(var(--border))',
        }}
      >
        {icon || <FinovaSymbol size={32} />}
      </div>
      <h3 className="text-base font-semibold mb-1" style={{ color: 'rgb(var(--foreground))' }}>
        {title}
      </h3>
      <p className="text-sm max-w-xs" style={{ color: 'rgb(var(--muted))' }}>
        {description}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  );
}
