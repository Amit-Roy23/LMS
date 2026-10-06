import React from 'react';
import { cn } from '../../lib/utils';

/** Small hand-drawn "spark" lines used as a playful accent next to headings. */
export function Burst({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth={4}
      strokeLinecap="round"
      aria-hidden
      className={cn('w-10 h-10 text-peach-600', className)}
    >
      <path d="M10 30 L4 26" />
      <path d="M18 18 L14 6" />
      <path d="M30 20 L40 10" />
      <path d="M32 32 L44 32" />
    </svg>
  );
}

/** Loose underline squiggle. */
export function Squiggle({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      aria-hidden
      className={cn('w-28 h-4 text-peach-500', className)}
    >
      <path d="M2 10 C 14 2, 22 2, 30 9 S 50 16, 60 8 S 82 1, 92 9 S 110 14, 118 6" />
    </svg>
  );
}
