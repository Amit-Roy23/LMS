import type { Metadata } from 'next';
import { withSeo } from '../../lib/site-server';

export function generateMetadata(): Promise<Metadata> {
  return withSeo('page:/ai', {
    title: 'AI & Labs',
    description: 'Hands-on AI and lab programs at ADSIGN Skill Academy.',
    alternates: { canonical: '/ai' },
  });
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
