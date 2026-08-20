'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';
import { useStore } from '@/store';
import type { ToastType } from '@/types';
import { cn } from '@/lib/utils';

const icons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle size={16} className="text-green-500" />,
  error:   <XCircle size={16} className="text-red-500" />,
  warning: <AlertCircle size={16} className="text-amber-500" />,
  info:    <Info size={16} className="text-blue-500" />,
};

const borders: Record<ToastType, string> = {
  success: 'border-green-100',
  error:   'border-red-100',
  warning: 'border-amber-100',
  info:    'border-blue-100',
};

export function ToastContainer() {
  const { toasts, removeToast } = useStore();

  return (
    <div className="fixed bottom-24 md:bottom-6 right-4 z-[200] flex flex-col gap-2 items-end pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 40, scale: 0.92 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className={cn(
              'pointer-events-auto flex items-center gap-3 bg-white border rounded-2xl px-4 py-3 shadow-lg min-w-[200px] max-w-[320px]',
              borders[toast.type]
            )}
          >
            {icons[toast.type]}
            <span className="text-sm text-[#1A1A1A] flex-1 leading-snug">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-[#9B9590] hover:text-[#1A1A1A] transition-colors"
            >
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
