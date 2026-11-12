import { prisma } from '../lib/prisma.js';
import { config } from '../config/env.js';
import { BadRequestError, NotFoundError } from '../lib/errors.js';
import { DEFAULT_PAGES, PAGE_SLUGS } from './site-defaults.js';

/** Default WhatsApp number for new-enquiry alerts (client's admissions phone). */
export const DEFAULT_ADMISSIONS_WHATSAPP = '+919681386103';

const PHONE = /^\+?[0-9][0-9 -]{7,18}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Rule = { public: boolean; editors: 'ADMIN' | 'OFFICE'; label: string; max: number; check?: (v: string) => string | null; normalise?: (v: string) => string };

/**
 * The website settings editable from the admin console. Public ones are served to the
 * website; private ones (alert numbers) stay on the server.
 */
export const SITE_SETTINGS: Record<string, Rule> = {
  'contact.email': { public: true, editors: 'ADMIN', label: 'Contact email', max: 120, check: (v) => (EMAIL.test(v) ? null : 'Enter a valid email address') },
  'contact.phone': { public: true, editors: 'ADMIN', label: 'Contact phone', max: 20, check: (v) => (PHONE.test(v) ? null : 'Enter a valid phone number, e.g. +91 98765 43210') },
  'contact.whatsapp': { public: true, editors: 'ADMIN', label: 'WhatsApp chat number', max: 20, check: (v) => (PHONE.test(v) ? null : 'Enter a valid phone number, e.g. +91 98765 43210') },
  'contact.address': { public: true, editors: 'ADMIN', label: 'Address', max: 300 },
  'contact.hours': { public: true, editors: 'ADMIN', label: 'Office hours', max: 120 },
  'notify.admissionsWhatsapp': {
    public: false,
    editors: 'ADMIN',
    label: 'WhatsApp number for new-enquiry alerts',
    max: 20,
    check: (v) => (PHONE.test(v) ? null : 'Enter a valid phone number with country code, e.g. +919681386103'),
    normalise: (v) => v.replace(/[\s-]/g, ''),
  },
  'seo.defaultTitle': { public: true, editors: 'OFFICE', label: 'Default page title', max: 70 },
  'seo.defaultDescription': { public: true, editors: 'OFFICE', label: 'Default description', max: 200 },
  'seo.searchConsole': {
    public: true,
    editors: 'OFFICE',
    label: 'Google Search Console verification code',
    max: 300,
    // Accept the bare code or the whole <meta name="google-site-verification" content="..."> tag
    normalise: (v) => v.match(/content=["']([^"']+)["']/)?.[1] ?? v,
    check: (v) => (/^[A-Za-z0-9_-]{10,100}$/.test(v) ? null : 'Paste the code from Search Console (the content="..." part of the HTML tag)'),
  },
  'analytics.gaId': { public: true, editors: 'OFFICE', label: 'Google Analytics 4 ID', max: 20, normalise: (v) => v.toUpperCase(), check: (v) => (/^G-[A-Z0-9]{4,16}$/.test(v) ? null : 'GA4 IDs look like G-XXXXXXXXXX') },
  'analytics.adsId': { public: true, editors: 'OFFICE', label: 'Google Ads ID', max: 20, normalise: (v) => v.toUpperCase(), check: (v) => (/^AW-\d{6,14}$/.test(v) ? null : 'Google Ads IDs look like AW-123456789') },
  'analytics.pixelId': { public: true, editors: 'OFFICE', label: 'Meta Pixel ID', max: 20, check: (v) => (/^\d{10,20}$/.test(v) ? null : 'Meta Pixel IDs are 15–16 digits') },
};

const DEFAULTS: Record<string, string> = {
  'contact.hours': 'Monday to Saturday, 10am – 7pm IST',
};

const SEO_KEY = /^(page:\/[a-z0-9\-/]*|course:[a-z0-9-]{1,120}|instructor:[a-z0-9-]{1,120})$/;

export class SiteService {
  /** All site settings with defaults applied. */
  async getSettings(includePrivate = false): Promise<Record<string, string>> {
    const rows = await prisma.setting.findMany({ where: { key: { in: Object.keys(SITE_SETTINGS) } } });
    const stored = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    const out: Record<string, string> = {};
    for (const [key, rule] of Object.entries(SITE_SETTINGS)) {
      if (!rule.public && !includePrivate) continue;
      out[key] = stored[key] ?? DEFAULTS[key] ?? '';
    }
    if (includePrivate && !stored['notify.admissionsWhatsapp']) {
      out['notify.admissionsWhatsapp'] = config.notifications.admissionsWhatsapp || DEFAULT_ADMISSIONS_WHATSAPP;
    }
    return out;
  }

  /** WhatsApp number that receives new-enquiry alerts (console setting, then env, then default). */
  async admissionsWhatsapp(): Promise<string> {
    const row = await prisma.setting.findUnique({ where: { key: 'notify.admissionsWhatsapp' } });
    return row?.value || config.notifications.admissionsWhatsapp || DEFAULT_ADMISSIONS_WHATSAPP;
  }

  /** Validate and save several settings at once. Returns the before/after of what changed. */
  async updateSettings(values: Record<string, unknown>, role: string) {
    const changes: { key: string; before: string; after: string }[] = [];
    const current = await this.getSettings(true);
    const clean: Record<string, string> = {};
    for (const [key, raw] of Object.entries(values || {})) {
      const rule = SITE_SETTINGS[key];
      if (!rule) throw new BadRequestError(`Unknown setting: ${key}`);
      if (rule.editors === 'ADMIN' && role !== 'ADMIN') throw new BadRequestError(`Only a main admin can change "${rule.label}"`);
      let v = String(raw ?? '').trim();
      if (rule.normalise && v) v = rule.normalise(v);
      if (v.length > rule.max) throw new BadRequestError(`"${rule.label}" must be at most ${rule.max} characters`);
      if (v && rule.check) {
        const problem = rule.check(v);
        if (problem) throw new BadRequestError(`${rule.label}: ${problem}`);
      }
      if (key === 'notify.admissionsWhatsapp' && !v) throw new BadRequestError('Keep a WhatsApp number for enquiry alerts');
      clean[key] = v;
    }
    for (const [key, value] of Object.entries(clean)) {
      if ((current[key] ?? '') === value) continue;
      await prisma.setting.upsert({
        where: { key },
        create: { key, value, category: key.split('.')[0].toUpperCase(), description: SITE_SETTINGS[key].label },
        update: { value },
      });
      changes.push({ key, before: current[key] ?? '', after: value });
    }
    return { settings: await this.getSettings(true), changes };
  }

  // ---------- Website pages ----------

  async getPage(slug: string) {
    const page = await prisma.sitePage.findUnique({ where: { slug } });
    if (page) return { slug, title: page.title, content: page.content, updatedAt: page.updatedAt, isDefault: false };
    const d = DEFAULT_PAGES[slug];
    if (!d) throw new NotFoundError('Page not found');
    return { slug, title: d.title, content: d.content, updatedAt: null, isDefault: true };
  }

  async listPages() {
    const pages = await prisma.sitePage.findMany({ include: { _count: { select: { versions: true } } } });
    const bySlug = Object.fromEntries(pages.map((p) => [p.slug, p]));
    return PAGE_SLUGS.map((slug) => {
      const p = bySlug[slug];
      return {
        slug,
        title: p?.title ?? DEFAULT_PAGES[slug].title,
        updatedAt: p?.updatedAt ?? null,
        versions: p?._count.versions ?? 0,
      };
    });
  }

  async savePage(slug: string, input: { title?: unknown; content?: unknown }, userId: string) {
    if (!DEFAULT_PAGES[slug]) throw new NotFoundError('Page not found');
    const title = String(input.title ?? '').trim();
    const content = String(input.content ?? '').replace(/\r\n/g, '\n').trim();
    if (title.length < 2 || title.length > 120) throw new BadRequestError('Title must be 2–120 characters');
    if (content.length < 20) throw new BadRequestError('The page needs some content (at least 20 characters)');
    if (content.length > 50000) throw new BadRequestError('The page is too long (50,000 characters at most)');
    const before = await this.getPage(slug);
    if (!before.isDefault && before.title === title && before.content === content) return { page: before, changed: false };
    await prisma.$transaction(async (tx) => {
      await tx.sitePage.upsert({ where: { slug }, create: { slug, title, content, updatedById: userId }, update: { title, content, updatedById: userId } });
      await tx.sitePageVersion.create({ data: { slug, title, content, createdById: userId } });
    });
    return { page: await this.getPage(slug), changed: true, before };
  }

  async versions(slug: string) {
    if (!DEFAULT_PAGES[slug]) throw new NotFoundError('Page not found');
    const rows = await prisma.sitePageVersion.findMany({ where: { slug }, orderBy: { createdAt: 'desc' }, take: 50 });
    const authorIds = [...new Set(rows.map((r) => r.createdById).filter(Boolean))] as string[];
    const authors = await prisma.user.findMany({ where: { id: { in: authorIds } }, select: { id: true, name: true } });
    const name = Object.fromEntries(authors.map((a) => [a.id, a.name]));
    return rows.map((r) => ({ id: r.id, title: r.title, content: r.content, createdAt: r.createdAt, author: r.createdById ? name[r.createdById] || 'Unknown' : 'System' }));
  }

  /** Restoring saves the old wording as a new version, so nothing is ever lost. */
  async restore(slug: string, versionId: string, userId: string) {
    const v = await prisma.sitePageVersion.findFirst({ where: { id: versionId, slug } });
    if (!v) throw new NotFoundError('Version not found');
    return this.savePage(slug, { title: v.title, content: v.content }, userId);
  }

  // ---------- SEO ----------

  async listSeo() {
    return prisma.seoEntry.findMany({ orderBy: { key: 'asc' } });
  }

  async saveSeo(key: string, input: { title?: unknown; description?: unknown; image?: unknown; noindex?: unknown }, userId: string) {
    if (!SEO_KEY.test(key)) throw new BadRequestError('Unknown page key');
    const title = String(input.title ?? '').trim();
    const description = String(input.description ?? '').trim();
    const image = String(input.image ?? '').trim();
    const noindex = input.noindex === true || input.noindex === 'true';
    if (title.length > 70) throw new BadRequestError('Keep the title to 70 characters or fewer (Google cuts longer ones)');
    if (description.length > 200) throw new BadRequestError('Keep the description to 200 characters or fewer');
    if (image && !/^(https:\/\/[^\s]+|\/[^\s]*)$/.test(image)) throw new BadRequestError('Share image must be an https:// address or a path like /brand/og.png');
    const before = await prisma.seoEntry.findUnique({ where: { key } });
    if (!title && !description && !image && !noindex) {
      if (before) await prisma.seoEntry.delete({ where: { key } });
      return { entry: null, before };
    }
    const data = { title: title || null, description: description || null, image: image || null, noindex, updatedById: userId };
    const entry = await prisma.seoEntry.upsert({ where: { key }, create: { key, ...data }, update: data });
    return { entry, before };
  }

  /** Everything the public website needs: public settings and SEO overrides. */
  async publicConfig() {
    const [settings, seo] = await Promise.all([this.getSettings(false), this.listSeo()]);
    return {
      settings,
      seo: Object.fromEntries(seo.map((s) => [s.key, { title: s.title, description: s.description, image: s.image, noindex: s.noindex }])),
    };
  }
}

export const siteService = new SiteService();
