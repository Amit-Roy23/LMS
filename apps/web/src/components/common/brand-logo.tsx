/* eslint-disable @next/next/no-img-element */
import React from 'react';
import { BRAND } from '../../lib/brand';
import { cn } from '../../lib/utils';

interface BrandLogoProps {
  /** `light` for white/gray surfaces, `dark` for charcoal surfaces (sidebar, footer, hero panels). */
  tone?: 'light' | 'dark';
  /** Text under the wordmark; defaults to the brand tagline. Pass `null` to hide it. */
  caption?: React.ReactNode | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZES = {
  sm: { mark: 'h-8', word: 'h-[15px]', caption: 'text-[10px]', tile: 'p-1 rounded-lg' },
  md: { mark: 'h-9 sm:h-10', word: 'h-4 sm:h-[18px]', caption: 'text-[11px]', tile: 'p-1.5 rounded-xl' },
  lg: { mark: 'h-12', word: 'h-6', caption: 'text-xs', tile: 'p-2 rounded-xl' },
};

/** ADSIGN mark + wordmark lockup. */
export function BrandLogo({ tone = 'light', caption, size = 'md', className }: BrandLogoProps) {
  const s = SIZES[size];
  const text = caption === undefined ? BRAND.tagline : caption;
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <span className={cn('shrink-0', tone === 'dark' && cn('bg-white shadow-soft', s.tile))}>
        <img src={BRAND.mark} alt="" className={cn('w-auto', s.mark)} />
      </span>
      <span className="flex flex-col justify-center gap-1 leading-none">
        <img src={BRAND.wordmark} alt={BRAND.name} className={cn('w-auto self-start', s.word)} />
        {text && (
          <span
            className={cn(
              'font-semibold tracking-wide whitespace-nowrap',
              s.caption,
              tone === 'dark' ? 'text-sky-800' : 'text-indigo-400'
            )}
          >
            {text}
          </span>
        )}
      </span>
    </span>
  );
}

/** Square mark only, e.g. for loading states. */
export function BrandMark({ className }: { className?: string }) {
  return <img src={BRAND.mark} alt={BRAND.name} className={cn('w-auto', className)} />;
}
