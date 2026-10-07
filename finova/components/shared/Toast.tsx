'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastData {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

// Simple singleton toast store
type ToastListener = (toasts: ToastData[]) => void;
const listeners: ToastListener[] = [];
let toastState: ToastData[] = [];

function notify() {
  listeners.forEach((l) => l([...toastState]));
}

export const toast = {
  show(data: Omit<ToastData, 'id'>) {
    const id = Math.random().toString(36).slice(2);
    toastState = [...toastState, { ...data, id, duration: data.duration ?? 4000 }];
    notify();
    return id;
  },
  success(title: string, message?: string) {
    return toast.show({ type: 'success', title, message });
  },
  error(title: string, message?: string) {
    return toast.show({ type: 'error', title, message });
  },
  warning(title: string, message?: string) {
    return toast.show({ type: 'warning', title, message });
  },
  info(title: string, message?: string) {
    return toast.show({ type: 'info', title, message });
  },
  dismiss(id: string) {
    toastState = toastState.filter((t) => t.id !== id);
    notify();
  },
};

const iconMap: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle className="w-4 h-4" />,
  error: <AlertCircle className="w-4 h-4" />,
  warning: <AlertTriangle className="w-4 h-4" />,
  info: <Info className="w-4 h-4" />,
};

const colorMap: Record<ToastType, React.CSSProperties> = {
  success: { color: 'rgb(var(--gain))', borderColor: 'rgb(var(--gain) / 0.3)' },
  error: { color: 'rgb(var(--loss))', borderColor: 'rgb(var(--loss) / 0.3)' },
  warning: { color: 'rgb(var(--warning))', borderColor: 'rgb(var(--warning) / 0.3)' },
  info: { color: 'rgb(var(--info))', borderColor: 'rgb(var(--info) / 0.3)' },
};

function ToastItem({ toast: t, onDismiss }: { toast: ToastData; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, t.duration ?? 4000);
    return () => clearTimeout(timer);
  }, [t.duration, onDismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg min-w-[280px] max-w-sm"
      style={{
        backgroundColor: 'rgb(var(--surface-overlay))',
        border: `1px solid ${colorMap[t.type].borderColor}`,
        boxShadow: '0 8px 32px rgb(0 0 0 / 0.2)',
      }}
    >
      <span style={colorMap[t.type]} className="flex-shrink-0 mt-0.5">
        {iconMap[t.type]}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: 'rgb(var(--foreground))' }}>
          {t.title}
        </p>
        {t.message && (
          <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--muted))' }}>
            {t.message}
          </p>
        )}
      </div>
      <button
        onClick={onDismiss}
        className="flex-shrink-0 p-0.5 rounded transition-opacity hover:opacity-60"
        style={{ color: 'rgb(var(--muted))' }}
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
}

/**
 * ToastContainer — mount once in root layout.
 * Use the `toast` singleton to trigger toasts from anywhere.
 */
export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  useEffect(() => {
    listeners.push(setToasts);
    return () => {
      const idx = listeners.indexOf(setToasts);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence mode="sync">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} onDismiss={() => toast.dismiss(t.id)} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
