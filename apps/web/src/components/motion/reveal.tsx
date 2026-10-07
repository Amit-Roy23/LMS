'use client';

import React, { useEffect, useRef } from 'react';
import { cn } from '../../lib/utils';

interface RevealProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Delay in ms before the element animates in (useful for staggering lists). */
  delay?: number;
  as?: 'div' | 'section' | 'li' | 'article';
}

/** Fades and lifts its children into view the first time they scroll into the viewport. */
export function Reveal({ delay = 0, as: Tag = 'div', className, style, children, ...props }: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === 'undefined') {
      node.classList.add('is-visible');
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return React.createElement(
    Tag,
    {
      ref,
      className: cn('reveal', className),
      style: { ...style, ['--reveal-delay' as string]: `${delay}ms` },
      ...props,
    },
    children
  );
}
