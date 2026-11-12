import type { Metadata } from 'next';
import { fetchPublic } from '../../lib/api';
import { getSiteConfig, withSeo } from '../../lib/site-server';
import { PolicyPage } from './policy-page';
import { ContactLine } from './contact-line';
import { Markdown } from './markdown';

interface SitePageData {
  slug: string;
  title: string;
  content: string;
  updatedAt: string | null;
}

export async function getSitePage(slug: string) {
  return fetchPublic<SitePageData>(`/site-pages/${slug}`, 60);
}

export async function policyMetadata(slug: string, path: string, fallbackTitle: string): Promise<Metadata> {
  const page = await getSitePage(slug);
  return withSeo(`page:${path}`, { title: page?.title || fallbackTitle, alternates: { canonical: path } });
}

const updatedLabel = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' }) : 'November 2026';

/** Policy page whose wording is edited by a main admin in Console → Website pages. */
export async function EditablePolicy({ slug, path, fallbackTitle }: { slug: string; path: string; fallbackTitle: string }) {
  const [page, { settings }] = await Promise.all([getSitePage(slug), getSiteConfig()]);
  const email = settings['contact.email'] || process.env.NEXT_PUBLIC_SUPPORT_EMAIL || '';
  const phone = settings['contact.phone'] || process.env.NEXT_PUBLIC_SUPPORT_PHONE || '';
  return (
    <PolicyPage title={page?.title || fallbackTitle} updated={updatedLabel(page?.updatedAt ?? null)} current={path}>
      {page ? (
        <Markdown source={page.content} />
      ) : (
        <p>This page is being updated. Please check back shortly, or contact us for a copy.</p>
      )}
      <ContactLine email={email} phone={phone} />
    </PolicyPage>
  );
}
