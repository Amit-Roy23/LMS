import React from 'react';
import { cn } from '../../lib/utils';

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number; // 0 to 100
  color?: 'indigo' | 'emerald' | 'purple' | 'amber';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function Progress({
  value = 0,
  color = 'indigo',
  size = 'md',
  showLabel = false,
  className,
  ...props
}: ProgressProps) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div className={cn('w-full flex items-center gap-3', className)} {...props}>
      <div
        className={cn(
          'w-full bg-slate-800 rounded-full overflow-hidden relative border border-slate-700/50',
          size === 'sm' && 'h-1.5',
          size === 'md' && 'h-2.5',
          size === 'lg' && 'h-4'
        )}
      >
        <div
          className={cn(
            'h-full transition-all duration-500 rounded-full',
            color === 'indigo' && 'bg-blue-600',
            color === 'emerald' && 'bg-emerald-500',
            color === 'purple' && 'bg-violet-500',
            color === 'amber' && 'bg-amber-500'
          )}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-mono font-semibold text-slate-300 min-w-[38px] text-right">
          {Math.round(clamped)}%
        </span>
      )}
    </div>
  );
}
