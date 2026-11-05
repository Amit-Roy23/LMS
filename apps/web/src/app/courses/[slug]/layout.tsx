import type { Metadata } from 'next';
import { fetchPublic } from '../../../lib/api';
import { SITE_URL } from '../../../lib/site';

type Props = { params: Promise<{ slug: string }>; children: React.ReactNode };

async function getCourse(slug: string) {
  return fetchPublic<any>(`/courses/${slug}`, 300);
}

/** Server-rendered title, description, social preview and Course structured data for each course page. */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const course = await getCourse(slug);
  if (!course) return { title: 'Course' };
  const description = String(course.description || '').slice(0, 160);
  return {
    title: course.title,
    description,
    alternates: { canonical: `/courses/${slug}` },
    openGraph: {
      type: 'website',
      title: course.title,
      description,
      url: `/courses/${slug}`,
      images: [{ url: course.thumbnail || '/brand/og.png', width: 1200, height: 630, alt: course.title }],
    },
  };
}

export default async function CourseLayout({ params, children }: Props) {
  const { slug } = await params;
  const course = await getCourse(slug);
  const jsonLd = course
    ? {
        '@context': 'https://schema.org',
        '@type': 'Course',
        name: course.title,
        description: String(course.description || '').slice(0, 500),
        url: `${SITE_URL}/courses/${slug}`,
        image: course.thumbnail ? `${SITE_URL}${course.thumbnail}` : undefined,
        provider: { '@type': 'Organization', name: 'ADSIGN Skill Academy', sameAs: SITE_URL },
        ...(course.instructor?.name ? { instructor: { '@type': 'Person', name: course.instructor.name } } : {}),
        offers: { '@type': 'Offer', price: course.price, priceCurrency: course.currency || 'INR', category: 'Paid', availability: 'https://schema.org/InStock' },
        hasCourseInstance: { '@type': 'CourseInstance', courseMode: course.hasLive ? 'Blended' : 'Online' },
        ...(course.reviewsCount
          ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: course.averageRating, reviewCount: course.reviewsCount } }
          : {}),
      }
    : null;
  return (
    <>
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />}
      {children}
    </>
  );
}
