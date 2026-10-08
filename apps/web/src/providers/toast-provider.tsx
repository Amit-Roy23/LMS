'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '../lib/utils';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextType {
  toast: (title: string, options?: { type?: ToastType; message?: string; duration?: number }) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (title: string, options?: { type?: ToastType; message?: string; duration?: number }) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: ToastItem = {
        id,
        title,
        message: options?.message,
        type: options?.type || 'info',
      };

      setToasts((prev) => [...prev, newToast]);

      const duration = options?.duration ?? 4000;
      setTimeout(() => {
        removeToast(id);
      }, duration);
    },
    [removeToast]
  );

  const success = useCallback(
    (title: string, message?: string) => toast(title, { type: 'success', message }),
    [toast]
  );

  const error = useCallback(
    (title: string, message?: string) => toast(title, { type: 'error', message }),
    [toast]
  );

  const info = useCallback(
    (title: string, message?: string) => toast(title, { type: 'info', message }),
    [toast]
  );

  return (
    <ToastContext.Provider value={{ toast, success, error, info }}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-md w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-2xl border transition-all duration-300 animate-slide-in-right',
              t.type === 'success' && 'bg-slate-900/95 border-emerald-500/50 text-emerald-300',
              t.type === 'error' && 'bg-slate-900/95 border-rose-500/50 text-rose-300',
              t.type === 'info' && 'bg-slate-900/95 border-indigo-500/50 text-indigo-300'
            )}
          >
            {t.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />}
            {t.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-400 mt-0.5 shrink-0" />}
            {t.type === 'info' && <Info className="w-5 h-5 text-indigo-400 mt-0.5 shrink-0" />}

            <div className="flex-1 text-sm">
              <p className="font-semibold text-ink">{t.title}</p>
              {t.message && <p className="text-slate-300 text-xs mt-1">{t.message}</p>}
            </div>

            <button
              onClick={() => removeToast(t.id)}
              className="text-slate-400 hover:text-ink p-1 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
