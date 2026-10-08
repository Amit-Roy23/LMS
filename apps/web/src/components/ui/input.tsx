import React from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', error, label, id, ...props }, ref) => {
    // Always link the label to its field (screen readers, click-to-focus)
    const autoId = React.useId();
    id = id || autoId;
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-ink">
            {label}
          </label>
        )}
        <input
          id={id}
          type={type}
          ref={ref}
          className={cn(
            'flex h-11 w-full rounded-xl border border-[#cbd5e1] bg-white px-3.5 py-2 text-sm text-ink placeholder:text-slate-500 shadow-sm transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-indigo-500/15 focus:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-rose-500 focus:ring-rose-500/50 focus:border-rose-500',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs font-medium text-rose-400 mt-1">{error}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
  label?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, label, id, rows = 4, ...props }, ref) => {
    const autoId = React.useId();
    id = id || autoId;
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-ink">
            {label}
          </label>
        )}
        <textarea
          id={id}
          rows={rows}
          ref={ref}
          className={cn(
            'flex w-full rounded-xl border border-[#cbd5e1] bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-slate-500 shadow-sm transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-indigo-500/15 focus:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-rose-500 focus:ring-rose-500/50 focus:border-rose-500',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs font-medium text-rose-400 mt-1">{error}</p>}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';
