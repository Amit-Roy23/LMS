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
          'inline-flex items-center justify-center font-medium transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:opacity-50 disabled:cursor-not-allowed select-none rounded-lg active:scale-[0.99]',
          // Solid Variants - NO gradients
          variant === 'primary' &&
            'bg-blue-600 hover:bg-blue-500 text-white font-semibold border border-blue-500/40 shadow-sm',
          (variant === 'white' || variant === 'gradient') &&
            'bg-white hover:bg-slate-100 text-slate-950 font-bold border border-white shadow-sm',
          variant === 'secondary' &&
            'bg-[#131826] hover:bg-[#1c2336] text-slate-200 border border-[#232d42]',
          variant === 'outline' &&
            'bg-transparent hover:bg-[#131826] text-slate-300 hover:text-white border border-[#232d42] hover:border-[#3b82f6]/50',
          variant === 'ghost' && 'bg-transparent hover:bg-[#131826] text-slate-400 hover:text-slate-100',
          variant === 'danger' &&
            'bg-rose-600 hover:bg-rose-500 text-white font-semibold border border-rose-500/40',
          // Sizes
          size === 'sm' && 'h-8 px-3 text-xs gap-1.5',
          size === 'md' && 'h-9 px-4 text-xs font-semibold gap-2',
          size === 'lg' && 'h-11 px-5 text-sm font-bold gap-2',
          size === 'icon' && 'h-9 w-9 p-0',
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
