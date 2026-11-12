import { prisma } from '../lib/prisma.js';
import { Prisma } from '@prisma/client';
import { fileService } from './file.service.js';
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
    return (
      user.instructorProfile || {
        slug: slugify(user.name),
        headline: '',
        bio: '',
        skills: [],
        experienceYears: null,
        avatar: null,
        socials: {},
        pendingSocials: null,
        isPublic: false,
      }
    );
  }

  /**
   * Saves the instructor's profile. Social links are moderated: removing a link takes effect at
   * once, but a new or changed link waits for a main admin's approval before it is shown
   * (admins' own links are approved directly).
   */
  async upsertOwn(userId: string, input: any, opts: { autoApproveLinks?: boolean } = {}) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, instructorProfile: true } });
    if (!user) throw new NotFoundError('User not found');
    const headline = String(input.headline || '').trim().slice(0, 140);
    const bio = String(input.bio || '').trim().slice(0, 3000);
    if (input.isPublic && (!headline || bio.length < 40)) {
      throw new BadRequestError('Add a headline and a bio of at least 40 characters before publishing your profile');
    }
    const slug = slugify(input.slug || user.name);
    const taken = await prisma.instructorProfile.findFirst({ where: { slug, NOT: { userId } } });
    if (taken) throw new BadRequestError('This profile link is already used; choose another');

    const submitted = validateSocials(input.socials || {});
    const approvedNow = (user.instructorProfile?.socials as Record<string, string>) || {};
    // Links kept unchanged stay live; removed ones disappear at once; new or edited ones wait
    const live: Record<string, string> = {};
    const pending: Record<string, string> = {};
    for (const [k, v] of Object.entries(submitted)) {
      if (opts.autoApproveLinks || approvedNow[k] === v) live[k] = v;
      else pending[k] = v;
    }
    const hasPending = Object.keys(pending).length > 0;

    const data = {
      slug,
      headline,
      bio,
      skills: (Array.isArray(input.skills) ? input.skills : String(input.skills || '').split(','))
        .map((s: string) => s.trim())
        .filter(Boolean)
        .slice(0, 12),
      experienceYears: input.experienceYears ? Math.min(60, Math.max(0, parseInt(input.experienceYears, 10) || 0)) : null,
      socials: live,
      pendingSocials: hasPending ? pending : Prisma.DbNull,
      isPublic: !!input.isPublic,
    };
    const profile = await prisma.instructorProfile.upsert({ where: { userId }, create: { userId, ...data }, update: data });

    // One open approval request per instructor, always describing the latest submission
    await prisma.changeRequest.updateMany({ where: { userId, type: 'SOCIAL_LINKS', status: 'PENDING' }, data: { status: 'CANCELLED' } });
    if (hasPending) {
      await prisma.changeRequest.create({
        data: { userId, type: 'SOCIAL_LINKS', oldValue: JSON.stringify(live), newValue: JSON.stringify(pending), reason: 'New or changed social links' },
      });
    }
    return { ...profile, linksAwaitingApproval: Object.keys(pending) };
  }

  /** Replaces the instructor's photo (already square-cropped in the browser). */
  async setPhoto(userId: string, file: { buffer: Buffer; originalname: string; mimetype: string }) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, instructorProfile: true } });
    if (!user) throw new NotFoundError('User not found');
    const stored = await fileService.save({ purpose: 'AVATAR', buffer: file.buffer, filename: file.originalname, mimetype: file.mimetype, uploadedById: userId });
    const avatar = fileService.publicUrl(stored.id);
    const previous = user.instructorProfile?.avatar;
    const profile = user.instructorProfile
      ? await prisma.instructorProfile.update({ where: { userId }, data: { avatar } })
      : await prisma.instructorProfile.create({ data: { userId, slug: await this.freeSlug(user.name), headline: '', bio: '', avatar, isPublic: false } });
    await prisma.user.update({ where: { id: userId }, data: { avatar } });
    await this.removeOwnedPhoto(previous);
    return profile;
  }

  async removePhoto(userId: string) {
    const profile = await prisma.instructorProfile.findUnique({ where: { userId } });
    if (!profile?.avatar) return { avatar: null };
    await prisma.instructorProfile.update({ where: { userId }, data: { avatar: null } });
    await prisma.user.update({ where: { id: userId }, data: { avatar: null } });
    await this.removeOwnedPhoto(profile.avatar);
    return { avatar: null };
  }

  private async removeOwnedPhoto(url?: string | null) {
    const m = url?.match(/^\/api\/v1\/files\/([0-9a-f-]{36})$/);
    if (m) await fileService.remove(m[1]);
  }

  private async freeSlug(name: string) {
    const base = slugify(name) || 'instructor';
    let slug = base;
    for (let i = 2; await prisma.instructorProfile.findUnique({ where: { slug } }); i++) slug = `${base}-${i}`;
    return slug;
  }

  /** Approved links of every instructor, for admins to review or hide. */
  async listLiveLinks() {
    const profiles = await prisma.instructorProfile.findMany({
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { displayOrder: 'asc' },
    });
    return profiles
      .map((p) => ({ userId: p.userId, name: p.user.name, email: p.user.email, slug: p.slug, socials: (p.socials as Record<string, string>) || {} }))
      .filter((p) => Object.keys(p.socials).length > 0);
  }

  async hideLink(userId: string, key: string) {
    const profile = await prisma.instructorProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundError('Instructor profile not found');
    const socials = { ...((profile.socials as Record<string, string>) || {}) };
    const removed = socials[key];
    if (!removed) throw new NotFoundError('Link not found');
    delete socials[key];
    await prisma.instructorProfile.update({ where: { userId }, data: { socials } });
    return { key, url: removed };
  }
}

/** Social links must be secure (https) addresses on the matching site. */
const SOCIAL_HOSTS: Record<string, RegExp> = {
  linkedin: /(^|\.)linkedin\.com$/,
  github: /(^|\.)github\.com$/,
  behance: /(^|\.)behance\.net$/,
  dribbble: /(^|\.)dribbble\.com$/,
  youtube: /(^|\.)(youtube\.com|youtu\.be)$/,
  instagram: /(^|\.)instagram\.com$/,
  website: /\./,
};

export function validateSocials(input: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, raw] of Object.entries(input || {})) {
    const value = String(raw || '').trim();
    if (!value) continue;
    if (!SOCIAL_KEYS.includes(key)) continue;
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      throw new BadRequestError(`The ${key} link is not a valid web address`);
    }
    if (url.protocol !== 'https:') throw new BadRequestError(`The ${key} link must start with https://`);
    if (!SOCIAL_HOSTS[key].test(url.hostname.toLowerCase())) {
      throw new BadRequestError(`The ${key} link must point to ${key === 'youtube' ? 'youtube.com' : key + (key === 'behance' ? '.net' : '.com')}`);
    }
    out[key] = url.toString().slice(0, 300);
  }
  return out;
}

export const instructorService = new InstructorService();
