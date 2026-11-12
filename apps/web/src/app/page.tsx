import type { Metadata } from 'next';
import { HomePage } from '../components/marketing/home-page';
import { withSeo } from '../lib/site-server';

export const revalidate = 60;

export function generateMetadata(): Promise<Metadata> {
  return withSeo('page:/', { alternates: { canonical: '/' } });
}

export default function Page() {
  return <HomePage />;
}
