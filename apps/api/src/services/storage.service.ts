import crypto from 'crypto';
import { VideoProvider } from '@academy/shared';

export interface SignedUrlPayload {
  key: string;
  expires: number;
}

export class StorageService {
  private secret: string;
  private defaultTtl: number;
  private driver: string;

  constructor() {
    this.secret = process.env.STORAGE_SECRET || process.env.JWT_SECRET || 'academy-lms-secure-storage-secret-key';
    this.defaultTtl = parseInt(process.env.SIGNED_URL_TTL || '3600', 10);
    this.driver = process.env.STORAGE_DRIVER || 'LOCAL';
  }

  /**
   * Generates a tamper-proof HMAC signed URL for secure resource downloads or video streams
   */
  getSignedUrl(fileKeyOrUrl: string, ttlSeconds?: number): string {
    const ttl = ttlSeconds || this.defaultTtl;
    const expires = Math.floor(Date.now() / 1000) + ttl;

    // If it's already an external absolute URL that doesn't need signing (e.g. external link)
    if (fileKeyOrUrl.startsWith('http://') || fileKeyOrUrl.startsWith('https://')) {
      if (!fileKeyOrUrl.includes('/api/v1/storage/') && !fileKeyOrUrl.includes('/uploads/')) {
        return fileKeyOrUrl;
      }
    }

    const dataToSign = `${fileKeyOrUrl}:${expires}`;
    const signature = crypto
      .createHmac('sha256', this.secret)
      .update(dataToSign)
      .digest('hex');

    const encodedKey = encodeURIComponent(fileKeyOrUrl);
    return `/api/v1/storage/download?key=${encodedKey}&expires=${expires}&signature=${signature}`;
  }

  /**
   * Static helper: Generates signed token
   */
  static generateSignedUrl(fileKey: string, ttlSeconds = 3600): { token: string; expiresAt: number } {
    const secret = process.env.STORAGE_SECRET || process.env.JWT_SECRET || 'academy-lms-secure-storage-secret-key';
    const expiresAt = Date.now() + ttlSeconds * 1000;
    const dataToSign = `${fileKey}:${expiresAt}`;
    const token = crypto
      .createHmac('sha256', secret)
      .update(dataToSign)
      .digest('hex');

    return { token: `${token}.${expiresAt}`, expiresAt };
  }

  /**
   * Static helper: Verifies signed token
   */
  static verifySignedToken(fileKey: string, tokenWithExpiry: string): boolean {
    const secret = process.env.STORAGE_SECRET || process.env.JWT_SECRET || 'academy-lms-secure-storage-secret-key';
    const parts = tokenWithExpiry.split('.');
    if (parts.length !== 2) return false;

    const [signature, expiresAtStr] = parts;
    const expiresAt = parseInt(expiresAtStr, 10);
    if (Date.now() > expiresAt) return false;

    const dataToSign = `${fileKey}:${expiresAt}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(dataToSign)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }

  /**
   * Verifies the HMAC signature and expiration for a signed resource request
   */
  verifySignedUrl(fileKey: string, expires: number, signature: string): boolean {
    if (Date.now() / 1000 > expires) {
      return false; // Expired
    }

    const dataToSign = `${fileKey}:${expires}`;
    const expectedSignature = crypto
      .createHmac('sha256', this.secret)
      .update(dataToSign)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }

  /**
   * Protected Video URL Resolver:
   * Returns authorized playable URL for the student player.
   * Note: For YouTube/Vimeo, privacy mode URLs are returned.
   * // TODO(client-requirement): Recommend Vimeo Enterprise / Bunny Stream / Mux for HLS signed tokens with DRM.
   */
  getPlayableVideoUrl(
    lesson: { id: string; videoUrl: string; videoProvider: VideoProvider },
    studentId: string
  ): { playableUrl: string; provider: VideoProvider } {
    const { videoUrl, videoProvider } = lesson;

    if (videoProvider === VideoProvider.MP4 || videoProvider === VideoProvider.HLS) {
      // Return short-lived signed URL for self-hosted / private storage MP4 or HLS
      const signedUrl = this.getSignedUrl(videoUrl, 7200);
      return { playableUrl: signedUrl, provider: videoProvider };
    }

    if (videoProvider === VideoProvider.YOUTUBE) {
      // Return unlisted/nocookie embed url
      return { playableUrl: videoUrl, provider: VideoProvider.YOUTUBE };
    }

    if (videoProvider === VideoProvider.VIMEO) {
      return { playableUrl: videoUrl, provider: VideoProvider.VIMEO };
    }

    return { playableUrl: videoUrl, provider: videoProvider || VideoProvider.OTHER };
  }
}

export const storageService = new StorageService();
