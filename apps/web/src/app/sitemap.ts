import type { MetadataRoute } from 'next';
import { fetchPublic } from '../lib/api';
import { SITE_URL } from '../lib/site';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticPages = ['', '/courses', '/instructors', '/about', '/career', '/ai', '/contact', '/terms', '/privacy', '/refund-policy'];
  const [courses, instructors] = await Promise.all([
    fetchPublic<any>('/courses?limit=100', 3600),
    fetchPublic<any[]>('/instructors', 3600),
  ]);
  const courseList: any[] = courses?.items || courses || [];
  return [
    ...staticPages.map((p) => ({ url: `${SITE_URL}${p}`, lastModified: now, changeFrequency: 'weekly' as const, priority: p === '' ? 1 : 0.7 })),
    ...courseList.map((c) => ({ url: `${SITE_URL}/courses/${c.slug}`, lastModified: c.updatedAt ? new Date(c.updatedAt) : now, changeFrequency: 'weekly' as const, priority: 0.9 })),
    ...(instructors || []).map((i) => ({ url: `${SITE_URL}/instructors/${i.slug}`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.6 })),
  ];
}
