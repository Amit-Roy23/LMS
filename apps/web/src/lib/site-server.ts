import type { Metadata } from 'next';
import { fetchPublic } from './api';

export interface SiteConfigServer {
  settings: Record<string, string>;
  seo: Record<string, { title: string | null; description: string | null; image: string | null; noindex: boolean }>;
}

/** Server-side read of the public website settings (cached for a minute). */
export async function getSiteConfig(): Promise<SiteConfigServer> {
  return (await fetchPublic<SiteConfigServer>('/site-config', 60)) || { settings: {}, seo: {} };
}

/**
 * Merges the SEO team's overrides (admin console → SEO & analytics) into a page's built-in metadata.
 * key: "page:/about", "course:<slug>" or "instructor:<slug>".
 */
export async function withSeo(key: string, base: Metadata): Promise<Metadata> {
  const { seo } = await getSiteConfig();
  const o = seo[key];
  if (!o) return base;
  const title = o.title || undefined;
  const description = o.description || undefined;
  const og = (base.openGraph || {}) as NonNullable<Metadata['openGraph']>;
  const tw = (base.twitter || {}) as NonNullable<Metadata['twitter']>;
  return {
    ...base,
    ...(title ? { title: { absolute: title } } : {}),
    ...(description ? { description } : {}),
    openGraph: {
      ...og,
      ...(title ? { title } : {}),
      ...(description ? { description } : {}),
      ...(o.image ? { images: [{ url: o.image, width: 1200, height: 630 }] } : {}),
    },
    twitter: {
      ...tw,
      ...(title ? { title } : {}),
      ...(description ? { description } : {}),
      ...(o.image ? { images: [o.image] } : {}),
    },
    ...(o.noindex ? { robots: { index: false, follow: true } } : {}),
  };
}
