import type { Metadata } from 'next';
import { withSeo } from '../../lib/site-server';

export function generateMetadata(): Promise<Metadata> {
  return withSeo('page:/career', {
    title: 'Career support',
    description: 'Portfolio reviews, interview preparation and placement support for ADSIGN Skill Academy students.',
    alternates: { canonical: '/career' },
  });
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
