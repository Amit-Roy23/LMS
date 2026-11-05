import { prisma } from '../lib/prisma.js';
import { BadRequestError, ConflictError, NotFoundError } from '../lib/errors.js';

/** Models whose changes can be undone from the activity log. */
const MODELS: Record<string, { delegate: () => any; softDelete: boolean }> = {
  Course: { delegate: () => prisma.course, softDelete: true },
  Module: { delegate: () => prisma.module, softDelete: true },
  Lesson: { delegate: () => prisma.lesson, softDelete: true },
  LiveSession: { delegate: () => prisma.liveSession, softDelete: false },
  PracticeTask: { delegate: () => prisma.practiceTask, softDelete: false },
  LessonResource: { delegate: () => prisma.lessonResource, softDelete: false },
  Batch: { delegate: () => prisma.batch, softDelete: false },
  Inquiry: { delegate: () => prisma.inquiry, softDelete: false },
};

const DATE_FIELDS = new Set(['startsAt', 'startDate', 'endDate', 'createdAt', 'updatedAt', 'deletedAt']);
const reviveDates = (data: Record<string, any>) =>
  Object.fromEntries(Object.entries(data).map(([k, v]) => [k, DATE_FIELDS.has(k) && typeof v === 'string' ? new Date(v) : v]));

export class ActivityService {
  async list(params: { actorRole?: string; entityType?: string; userId?: string; take?: number; cursor?: string }) {
    const where: any = {};
    if (params.actorRole) where.actorRole = params.actorRole;
    if (params.entityType) where.entityType = params.entityType;
    if (params.userId) where.userId = params.userId;
    const items = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(params.take || 50, 200),
      ...(params.cursor ? { skip: 1, cursor: { id: params.cursor } } : {}),
      include: { user: { select: { name: true, email: true, role: true } }, revertedBy: { select: { name: true } } },
    });
    return items.map((i) => ({ ...i, revertible: this.isRevertible(i) }));
  }

  isRevertible(entry: { action: string; entityType: string; revertedAt: Date | null; before: any }) {
    if (entry.revertedAt || !MODELS[entry.entityType]) return false;
    if (entry.action.endsWith('_UPDATED')) return !!entry.before && Object.keys(entry.before).length > 0;
    return entry.action.endsWith('_DELETED') || entry.action.endsWith('_CREATED');
  }

  /** Undoes a logged change: restores old field values, a deleted item, or removes a created one. */
  async revert(id: string, adminId: string, force = false) {
    const entry = await prisma.auditLog.findUnique({ where: { id } });
    if (!entry) throw new NotFoundError('Activity not found');
    if (!this.isRevertible(entry)) throw new BadRequestError('This activity cannot be undone');
    const model = MODELS[entry.entityType];
    const delegate = model.delegate();
    const entityId = entry.entityId!;

    if (entry.action.endsWith('_UPDATED')) {
      const before = entry.before as Record<string, any>;
      const after = (entry.after || {}) as Record<string, any>;
      const current = await delegate.findUnique({ where: { id: entityId } });
      if (!current) throw new NotFoundError(`${entry.entityType} no longer exists`);
      // Refuse to silently overwrite edits made after this one, unless forced
      const changedSince = Object.keys(after).filter(
        (k) => JSON.stringify(current[k] instanceof Date ? current[k].toISOString() : current[k]) !== JSON.stringify(after[k])
      );
      if (changedSince.length && !force) {
        throw new ConflictError(`These fields were changed again later: ${changedSince.join(', ')}. Undo anyway?`, { changedSince });
      }
      await delegate.update({ where: { id: entityId }, data: reviveDates(before) });
    } else if (entry.action.endsWith('_DELETED')) {
      if (model.softDelete) {
        await delegate.update({ where: { id: entityId }, data: { deletedAt: null } });
      } else {
        const snapshot = entry.before as Record<string, any>;
        if (!snapshot) throw new BadRequestError('No snapshot was kept for this item');
        const exists = await delegate.findUnique({ where: { id: entityId } });
        if (!exists) await delegate.create({ data: reviveDates(snapshot) });
      }
    } else if (entry.action.endsWith('_CREATED')) {
      if (model.softDelete) await delegate.update({ where: { id: entityId }, data: { deletedAt: new Date() } });
      else await delegate.delete({ where: { id: entityId } }).catch(() => undefined);
    }

    await prisma.$transaction([
      prisma.auditLog.update({ where: { id }, data: { revertedAt: new Date(), revertedById: adminId } }),
      prisma.auditLog.create({
        data: {
          userId: adminId,
          actorRole: 'ADMIN',
          action: 'ACTIVITY_REVERTED',
          entityType: entry.entityType,
          entityId,
          details: { revertedActivityId: id, revertedAction: entry.action },
        },
      }),
    ]);
    return { message: 'Change undone' };
  }
}

export const activityService = new ActivityService();
