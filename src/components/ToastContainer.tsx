import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, Bell, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'notification';
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      <AnimatePresence>
        {toasts.map((toast) => {
          const getIcon = () => {
            switch (toast.type) {
              case 'success':
                return <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />;
              case 'error':
                return <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />;
              case 'notification':
                return <Bell className="w-5 h-5 text-indigo-500 shrink-0" />;
              default:
                return <Info className="w-5 h-5 text-sky-500 shrink-0" />;
            }
          };

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.9 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="pointer-events-auto flex items-start gap-3 p-4 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 shadow-xl shadow-slate-900/5 dark:shadow-black/40 text-slate-800 dark:text-slate-100"
            >
              <div className="mt-0.5">{getIcon()}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold tracking-tight">{toast.title}</p>
                {toast.message && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed break-words">
                    {toast.message}
                  </p>
                )}
              </div>
              <button
                onClick={() => onDismiss(toast.id)}
                className="p-1 -mr-1 -mt-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
