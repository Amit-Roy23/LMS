import React from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'blue' | 'success' | 'warning' | 'danger' | 'purple' | 'outline' | 'slate' | 'cyan';
  size?: 'sm' | 'md';
}

export function Badge({ className, variant = 'primary', size = 'sm', children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full border shrink-0',
        size === 'sm' && 'px-2.5 py-0.5 text-[11px] leading-tight',
        size === 'md' && 'px-3 py-1 text-xs font-semibold',
        // Solid, crisp technical badge colors
        (variant === 'primary' || variant === 'blue') && 'bg-indigo-50 text-indigo-300 border-indigo-800',
        variant === 'success' && 'bg-emerald-50 text-emerald-300 border-emerald-800',
        variant === 'warning' && 'bg-amber-50 text-amber-300 border-amber-800',
        variant === 'danger' && 'bg-rose-50 text-rose-300 border-rose-800',
        variant === 'purple' && 'bg-violet-50 text-violet-300 border-violet-800',
        variant === 'cyan' && 'bg-sky-50 text-sky-300 border-sky-800',
        variant === 'slate' && 'bg-cream-100 text-slate-300 border-[#e2e8f0]',
        variant === 'outline' && 'bg-transparent text-slate-300 border-[#e2e8f0]',
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
