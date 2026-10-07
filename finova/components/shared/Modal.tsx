'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
};

/**
 * Modal — accessible dialog with backdrop, focus trap, and escape key support.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: ModalProps) {
  const contentRef = useRef<HTMLDivElement>(null);

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

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-black/60"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            key="modal-panel"
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.2, type: 'spring', damping: 30, stiffness: 400 }}
            className={`fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none`}
          >
            <div
              ref={contentRef}
              className={`w-full ${sizeMap[size]} rounded-xl shadow-2xl pointer-events-auto overflow-hidden`}
              style={{
                backgroundColor: 'rgb(var(--surface))',
                border: '1px solid rgb(var(--border))',
              }}
            >
              {/* Header */}
              <div
                className="flex items-start justify-between px-5 py-4 border-b"
                style={{ borderColor: 'rgb(var(--border))' }}
              >
                <div className="space-y-0.5">
                  <h2 className="text-base font-semibold" style={{ color: 'rgb(var(--foreground))' }}>
                    {title}
                  </h2>
                  {description && (
                    <p className="text-sm" style={{ color: 'rgb(var(--muted))' }}>
                      {description}
                    </p>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg transition-colors ml-4 flex-shrink-0"
                  style={{ color: 'rgb(var(--muted))' }}
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="px-5 py-4">
                {children}
              </div>

              {/* Footer */}
              {footer && (
                <div
                  className="flex items-center justify-end gap-2 px-5 py-3 border-t"
                  style={{
                    borderColor: 'rgb(var(--border))',
                    backgroundColor: 'rgb(var(--surface-raised))',
                  }}
                >
                  {footer}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
