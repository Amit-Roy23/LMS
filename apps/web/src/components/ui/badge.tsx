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
        (variant === 'primary' || variant === 'blue') && 'bg-blue-950/60 text-blue-400 border-blue-500/30',
        variant === 'success' && 'bg-emerald-950/60 text-emerald-400 border-emerald-500/30',
        variant === 'warning' && 'bg-amber-950/60 text-amber-400 border-amber-500/30',
        variant === 'danger' && 'bg-rose-950/60 text-rose-400 border-rose-500/30',
        variant === 'purple' && 'bg-purple-950/60 text-purple-400 border-purple-500/30',
        variant === 'cyan' && 'bg-cyan-950/60 text-cyan-400 border-cyan-500/30',
        variant === 'slate' && 'bg-cream-100 text-slate-300 border-[#e7d5bd]',
        variant === 'outline' && 'bg-transparent text-slate-300 border-[#e7d5bd]',
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
