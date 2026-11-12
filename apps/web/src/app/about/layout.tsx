import type { Metadata } from 'next';
import { withSeo } from '../../lib/site-server';

export function generateMetadata(): Promise<Metadata> {
  return withSeo('page:/about', {
    title: 'About us',
    description: 'About ADSIGN Skill Academy: practical, mentor-led training in creative and IT skills with real projects and verifiable certificates.',
    alternates: { canonical: '/about' },
  });
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
