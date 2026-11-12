import type { Metadata } from 'next';
import { withSeo } from '../../lib/site-server';

export function generateMetadata(): Promise<Metadata> {
  return withSeo('page:/courses', {
    title: 'Courses',
    description: 'Browse ADSIGN Skill Academy courses in design, development, marketing and AI, with live classes, projects and verifiable certificates.',
    alternates: { canonical: '/courses' },
  });
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
