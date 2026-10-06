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
          'inline-flex items-center justify-center whitespace-nowrap font-medium transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:ring-offset-1 focus:ring-offset-cream disabled:opacity-50 disabled:cursor-not-allowed select-none rounded-full active:scale-[0.98]',
          // Solid Variants - NO gradients
          variant === 'primary' &&
            'bg-plum hover:bg-plum-500 text-cream font-semibold border border-transparent shadow-soft',
          (variant === 'white' || variant === 'gradient') &&
            'bg-peach-500 hover:bg-peach-600 text-plum font-semibold border border-transparent shadow-soft',
          variant === 'secondary' &&
            'bg-cream-100 hover:bg-cream-200 text-ink border border-[#e7d5bd]',
          variant === 'outline' &&
            'bg-transparent hover:bg-plum hover:text-cream text-plum border-2 border-plum',
          variant === 'ghost' && 'bg-transparent hover:bg-[#f6ead8] text-slate-400 hover:text-slate-100',
          variant === 'danger' &&
            'bg-rose-600 hover:bg-rose-500 text-cream font-semibold border border-rose-500/40',
          // Sizes
          size === 'sm' && 'h-8 px-3.5 text-xs gap-1.5',
          size === 'md' && 'h-10 px-5 text-sm font-semibold gap-2',
          size === 'lg' && 'h-12 px-7 text-sm font-semibold gap-2',
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
