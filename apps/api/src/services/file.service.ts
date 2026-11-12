import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { prisma } from '../lib/prisma.js';
import { config } from '../config/env.js';
import { BadRequestError, ForbiddenError, NotFoundError, UnauthorizedError } from '../lib/errors.js';

export type FilePurpose = 'AVATAR' | 'MATERIAL';

const RULES: Record<FilePurpose, { maxBytes: number; types: Record<string, string[]> }> = {
  AVATAR: {
    maxBytes: 2 * 1024 * 1024,
    types: { 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'], 'image/webp': ['.webp'] },
  },
  MATERIAL: {
    // Vercel functions accept request bodies up to about 4.5 MB; a VPS allows larger files
    maxBytes: (process.env.VERCEL ? 4 : 25) * 1024 * 1024,
    types: {
      'application/pdf': ['.pdf'],
      'application/zip': ['.zip'],
      'application/x-zip-compressed': ['.zip'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      'application/vnd.ms-powerpoint': ['.ppt'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'text/plain': ['.txt'],
    },
  },
};

/** Checks the first bytes so a renamed executable cannot pass as a PDF or an image. */
function sniff(buf: Buffer): string | null {
  const hex = buf.subarray(0, 8).toString('hex');
  if (hex.startsWith('25504446')) return 'application/pdf';
  if (hex.startsWith('89504e47')) return 'image/png';
  if (hex.startsWith('ffd8ff')) return 'image/jpeg';
  if (buf.subarray(0, 4).toString() === 'RIFF' && buf.subarray(8, 12).toString() === 'WEBP') return 'image/webp';
  if (hex.startsWith('504b0304')) return 'zip'; // zip, docx, pptx, xlsx
  if (hex.startsWith('d0cf11e0')) return 'ole'; // legacy doc/ppt
  return null;
}

const useDisk = () => (process.env.STORAGE_DRIVER || '').toLowerCase() === 'local' && !process.env.VERCEL;

/**
 * Uploaded files: instructor photos (public) and study materials (private, downloaded only with
 * a short-lived link signed for one student). Stored in the database by default so uploads
 * survive on serverless hosting; with STORAGE_DRIVER=local they are written to disk (VPS).
 */
export class FileService {
  async save(params: { purpose: FilePurpose; buffer: Buffer; filename: string; mimetype: string; uploadedById?: string }) {
    const rule = RULES[params.purpose];
    const ext = path.extname(params.filename || '').toLowerCase();
    const allowedExts = rule.types[params.mimetype];
    if (!allowedExts || !allowedExts.includes(ext)) {
      throw new BadRequestError(`This file type is not allowed. Allowed: ${Array.from(new Set(Object.values(rule.types).flat())).join(', ')}`);
    }
    if (params.buffer.length > rule.maxBytes) {
      throw new BadRequestError(`The file is too large. Maximum ${Math.round(rule.maxBytes / 1024 / 1024)} MB.`);
    }
    const kind = sniff(params.buffer);
    const expected = params.mimetype.startsWith('image/') || params.mimetype === 'application/pdf' ? params.mimetype : null;
    if (expected && kind !== expected) throw new BadRequestError('The file content does not match its type.');
    if (!expected && params.mimetype !== 'text/plain' && !['zip', 'ole'].includes(kind || '')) {
      throw new BadRequestError('The file content does not match its type.');
    }

    const id = crypto.randomUUID();
    const safeName = path.basename(params.filename).replace(/[^\w.\- ()]/g, '_').slice(0, 120);
    let diskPath: string | null = null;
    if (useDisk()) {
      const dir = path.join(config.storage.uploadDir, params.purpose.toLowerCase());
      fs.mkdirSync(dir, { recursive: true });
      diskPath = path.join(dir, `${id}${ext}`);
      fs.writeFileSync(diskPath, params.buffer);
    }
    return prisma.storedFile.create({
      data: {
        id,
        purpose: params.purpose,
        filename: safeName,
        mimetype: params.mimetype,
        size: params.buffer.length,
        isPublic: params.purpose === 'AVATAR',
        data: diskPath ? null : new Uint8Array(params.buffer),
        diskPath,
        uploadedById: params.uploadedById || null,
      },
      select: { id: true, filename: true, mimetype: true, size: true, isPublic: true },
    });
  }

  async read(id: string) {
    const file = await prisma.storedFile.findUnique({ where: { id }, omit: { data: false } });
    if (!file) throw new NotFoundError('File not found');
    const bytes = file.data ? Buffer.from(file.data) : file.diskPath && fs.existsSync(file.diskPath) ? fs.readFileSync(file.diskPath) : null;
    if (!bytes) throw new NotFoundError('File not found');
    return { file, bytes };
  }

  async remove(id: string) {
    const file = await prisma.storedFile.findUnique({ where: { id }, select: { diskPath: true } });
    if (!file) return;
    if (file.diskPath && fs.existsSync(file.diskPath)) fs.unlinkSync(file.diskPath);
    await prisma.storedFile.delete({ where: { id } }).catch(() => undefined);
  }

  publicUrl(id: string) {
    return `/api/v1/files/${id}`;
  }

  private sign(id: string, userId: string, exp: number) {
    return crypto.createHmac('sha256', config.security.signingSecret).update(`file:${id}:${userId}:${exp}`).digest('hex');
  }

  /** A download link that works for 15 minutes and only for the student it was made for. */
  signedDownloadUrl(id: string, userId: string, ttlSeconds = 15 * 60) {
    const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
    return `/api/v1/files/${id}/download?u=${encodeURIComponent(userId)}&exp=${exp}&sig=${this.sign(id, userId, exp)}`;
  }

  verifyDownload(id: string, userId: string, exp: string, sig: string) {
    const e = parseInt(exp, 10);
    if (!e || e < Date.now() / 1000) throw new UnauthorizedError('This download link has expired. Open the lesson again to get a new one.');
    const expected = this.sign(id, userId, e);
    if (!sig || sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      throw new ForbiddenError('Invalid download link');
    }
  }
}

export const fileService = new FileService();

/** Lesson resources that live in our storage are saved with a "file:<id>" url. */
export const FILE_URL_PREFIX = 'file:';
