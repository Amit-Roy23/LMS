import { prisma } from '../lib/prisma.js';
import { BadRequestError, NotFoundError } from '../lib/errors.js';

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);

const SOCIAL_KEYS = ['linkedin', 'github', 'behance', 'dribbble', 'youtube', 'instagram', 'website'];

/** Public instructor profiles shown on the website. */
export class InstructorService {
  async listPublic() {
    const profiles = await prisma.instructorProfile.findMany({
      where: { isPublic: true, user: { status: 'ACTIVE', deletedAt: null } },
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
            coursesTeaching: { where: { status: 'PUBLISHED', deletedAt: null }, select: { id: true, _count: { select: { enrollments: true } } } },
          },
        },
      },
    });
    return profiles.map((p) => ({
      slug: p.slug,
      name: p.user.name,
      avatar: p.avatar || p.user.avatar,
      headline: p.headline,
      skills: p.skills,
      experienceYears: p.experienceYears,
      courses: p.user.coursesTeaching.length,
      learners: p.user.coursesTeaching.reduce((n, c) => n + c._count.enrollments, 0),
    }));
  }

  async getPublic(slug: string) {
    const p = await prisma.instructorProfile.findUnique({
      where: { slug },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
            status: true,
            coursesTeaching: {
              where: { status: 'PUBLISHED', deletedAt: null },
              select: {
                id: true,
                slug: true,
                title: true,
                description: true,
                thumbnail: true,
                price: true,
                currency: true,
                level: true,
                category: true,
                _count: { select: { enrollments: true } },
                feedbacks: { select: { rating: true } },
                modules: { where: { deletedAt: null }, select: { _count: { select: { lessons: { where: { deletedAt: null } } } } } },
              },
            },
          },
        },
      },
    });
    if (!p || !p.isPublic || p.user.status !== 'ACTIVE') throw new NotFoundError('Instructor not found');
    const ratings = p.user.coursesTeaching.flatMap((c) => c.feedbacks.map((f) => f.rating));
    return {
      slug: p.slug,
      name: p.user.name,
      avatar: p.avatar || p.user.avatar,
      headline: p.headline,
      bio: p.bio,
      skills: p.skills,
      experienceYears: p.experienceYears,
      socials: p.socials,
      averageRating: ratings.length ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : null,
      reviewsCount: ratings.length,
      learners: p.user.coursesTeaching.reduce((n, c) => n + c._count.enrollments, 0),
      courses: p.user.coursesTeaching.map(({ feedbacks, _count, modules, ...c }) => {
        const r = feedbacks.map((f) => f.rating);
        return {
          ...c,
          enrolledStudentsCount: _count.enrollments,
          lessonsCount: modules.reduce((n, m) => n + m._count.lessons, 0),
          averageRating: r.length ? r.reduce((a, b) => a + b, 0) / r.length : null,
          reviewsCount: r.length,
        };
      }),
    };
  }

  async getOwn(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, instructorProfile: true } });
    if (!user) throw new NotFoundError('User not found');
    return user.instructorProfile || { slug: slugify(user.name), headline: '', bio: '', skills: [], experienceYears: null, avatar: null, socials: {}, isPublic: false };
  }

  async upsertOwn(userId: string, input: any) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
    if (!user) throw new NotFoundError('User not found');
    const headline = String(input.headline || '').trim().slice(0, 140);
    const bio = String(input.bio || '').trim().slice(0, 3000);
    if (input.isPublic && (!headline || bio.length < 40)) {
      throw new BadRequestError('Add a headline and a bio of at least 40 characters before publishing your profile');
    }
    const slug = slugify(input.slug || user.name);
    const taken = await prisma.instructorProfile.findFirst({ where: { slug, NOT: { userId } } });
    if (taken) throw new BadRequestError('This profile link is already used; choose another');
    const socials: Record<string, string> = Object.fromEntries(
      Object.entries<string>(input.socials || {}).filter(([k, v]) => SOCIAL_KEYS.includes(k) && typeof v === 'string' && /^https:\/\//.test(v as string))
    );
    const data = {
      slug,
      headline,
      bio,
      skills: (Array.isArray(input.skills) ? input.skills : String(input.skills || '').split(','))
        .map((s: string) => s.trim())
        .filter(Boolean)
        .slice(0, 12),
      experienceYears: input.experienceYears ? Math.min(60, Math.max(0, parseInt(input.experienceYears, 10) || 0)) : null,
      avatar: typeof input.avatar === 'string' && /^https?:\/\//.test(input.avatar) ? input.avatar : null,
      socials,
      isPublic: !!input.isPublic,
    };
    return prisma.instructorProfile.upsert({ where: { userId }, create: { userId, ...data }, update: data });
  }
}

export const instructorService = new InstructorService();
