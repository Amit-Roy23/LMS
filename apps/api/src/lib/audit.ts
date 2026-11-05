import { Request } from 'express';
import { prisma } from './prisma.js';
import { getIp } from './request-info.js';
import { logger } from './logger.js';

/** Picks the fields a request changed, so the activity log can show and undo them. */
export function changedFields(before: Record<string, any> | null | undefined, patch: Record<string, any>) {
  const b: Record<string, any> = {};
  const a: Record<string, any> = {};
  if (!before) return { before: b, after: a };
  for (const key of Object.keys(patch || {})) {
    if (!(key in before)) continue;
    const oldVal = before[key];
    const newVal = patch[key];
    const same = JSON.stringify(oldVal instanceof Date ? oldVal.toISOString() : oldVal) === JSON.stringify(newVal);
    if (!same) {
      b[key] = oldVal;
      a[key] = newVal;
    }
  }
  return { before: b, after: a };
}

/** Writes an activity-log entry; never fails the request it describes. */
export async function recordAudit(
  req: Request,
  entry: { action: string; entityType: string; entityId?: string | null; before?: any; after?: any; details?: any }
) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: req.user?.userId || null,
        actorRole: req.user?.role || null,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId || null,
        before: entry.before ?? undefined,
        after: entry.after ?? undefined,
        details: entry.details ?? undefined,
        ipAddress: getIp(req),
      },
    });
  } catch (err) {
    logger.error({ err, action: entry.action }, 'Failed to write audit log');
  }
}
