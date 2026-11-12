import type { MetadataRoute } from 'next';
import { fetchPublic } from '../lib/api';
import { SITE_URL } from '../lib/site';
import { getSiteConfig } from '../lib/site-server';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticPages = ['', '/courses', '/instructors', '/about', '/career', '/ai', '/contact', '/terms', '/privacy', '/refund-policy'];
  const [courses, instructors, { seo }] = await Promise.all([
    fetchPublic<any>('/courses?limit=100', 3600),
    fetchPublic<any[]>('/instructors', 3600),
    getSiteConfig(),
  ]);
  // Pages the SEO team marked "hide from Google" are left out
  const hidden = (key: string) => !!seo[key]?.noindex;
  const courseList: any[] = (courses?.items || courses || []).filter((c: any) => !hidden(`course:${c.slug}`));
  return [
    ...staticPages.filter((p) => !hidden(`page:${p || '/'}`)).map((p) => ({ url: `${SITE_URL}${p}`, lastModified: now, changeFrequency: 'weekly' as const, priority: p === '' ? 1 : 0.7 })),
    ...courseList.map((c) => ({ url: `${SITE_URL}/courses/${c.slug}`, lastModified: c.updatedAt ? new Date(c.updatedAt) : now, changeFrequency: 'weekly' as const, priority: 0.9 })),
    ...(instructors || []).filter((i) => !hidden(`instructor:${i.slug}`)).map((i) => ({ url: `${SITE_URL}/instructors/${i.slug}`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.6 })),
  ];
}
