import React from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'white' | 'gradient';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading = false, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center whitespace-nowrap font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none select-none rounded-xl active:scale-[0.98]',
          variant === 'primary' &&
            'bg-brand-gradient text-white shadow-soft hover:shadow-lg hover:shadow-indigo-500/30 hover:brightness-110 border border-transparent',
          (variant === 'white' || variant === 'gradient') &&
            'bg-amber-500 hover:bg-amber-400 text-night-950 border border-transparent shadow-sm',
          variant === 'secondary' &&
            'bg-white hover:bg-cream-100 text-ink border border-[#e2e8f0] shadow-sm',
          variant === 'outline' &&
            'bg-white/0 hover:bg-indigo-950 text-indigo-300 border border-indigo-800 hover:border-indigo-500',
          variant === 'ghost' && 'bg-transparent hover:bg-cream-100 text-slate-400 hover:text-slate-100',
          variant === 'danger' &&
            'bg-rose-600 hover:bg-rose-500 text-white border border-transparent shadow-sm',
          // Sizes
          size === 'sm' && 'h-9 px-3.5 text-xs gap-1.5',
          size === 'md' && 'h-10 px-5 text-sm font-semibold gap-2',
          size === 'lg' && 'h-12 px-6 text-[15px] gap-2',
          size === 'icon' && 'h-10 w-10 p-0',
          className
        )}
        {...props}
      >
        {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
