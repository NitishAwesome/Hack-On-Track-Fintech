'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  side?: 'right' | 'left';
  width?: string;
}

/**
 * Drawer — slide-in panel from the right (default) or left.
 * Used for detail views, filter panels, and extended forms.
 */
export function Drawer({
  open,
  onClose,
  title,
  children,
  side = 'right',
  width = 'w-80',
}: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  const slideFrom = side === 'right' ? { x: '100%' } : { x: '-100%' };
  const positionClass = side === 'right' ? 'right-0' : 'left-0';

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-black/50"
            onClick={onClose}
          />
          <motion.div
            key="drawer-panel"
            initial={slideFrom}
            animate={{ x: 0 }}
            exit={slideFrom}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className={`fixed top-0 ${positionClass} z-50 h-full ${width} flex flex-col shadow-2xl`}
            style={{
              backgroundColor: 'rgb(var(--surface))',
              borderLeft: side === 'right' ? '1px solid rgb(var(--border))' : undefined,
              borderRight: side === 'left' ? '1px solid rgb(var(--border))' : undefined,
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0"
              style={{ borderColor: 'rgb(var(--border))' }}
            >
              <h2 className="text-base font-semibold" style={{ color: 'rgb(var(--foreground))' }}>
                {title}
              </h2>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: 'rgb(var(--muted))' }}
                aria-label="Close drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
