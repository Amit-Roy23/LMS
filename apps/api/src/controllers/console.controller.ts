import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../lib/utils.js';
import { stepUpService } from '../services/step-up.service.js';
import { activityService } from '../services/activity.service.js';
import { changeRequestService } from '../services/change-request.service.js';
import { deviceService } from '../services/device.service.js';

const wrap =
  (fn: (req: Request, res: Response) => Promise<any>) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await fn(req, res);
    } catch (err) {
      next(err);
    }
  };

/** Admin security (PIN, step-up), activity log with undo, approvals and device support. */
export const consoleController = {
  securityStatus: wrap(async (req, res) => {
    sendSuccess(res, { hasPin: await stepUpService.hasPin(req.user!.userId), stepUpActive: stepUpService.isValid(req) });
  }),
  setPin: wrap(async (req, res) => {
    sendSuccess(res, await stepUpService.setPin(req.user!.userId, req.body || {}));
  }),
  startStepUp: wrap(async (req, res) => {
    sendSuccess(res, await stepUpService.start(req.user!.userId, req.body?.pin));
  }),
  verifyStepUp: wrap(async (req, res) => {
    sendSuccess(res, await stepUpService.verify(req.user!.userId, req.body?.challengeId, req.body?.code));
  }),

  listActivity: wrap(async (req, res) => {
    sendSuccess(
      res,
      await activityService.list({
        actorRole: req.query.actorRole as string,
        entityType: req.query.entityType as string,
        userId: req.query.userId as string,
        cursor: req.query.cursor as string,
        take: parseInt(req.query.take as string) || 50,
      })
    );
  }),
  revertActivity: wrap(async (req, res) => {
    sendSuccess(res, await activityService.revert(String(req.params.id), req.user!.userId, !!req.body?.force));
  }),

  listChangeRequests: wrap(async (req, res) => {
    sendSuccess(res, await changeRequestService.list(req.query.status as string));
  }),
  approveChangeRequest: wrap(async (req, res) => {
    const keys = Array.isArray(req.body?.keys) ? req.body.keys.map(String) : undefined;
    sendSuccess(res, await changeRequestService.decideWithKeys(String(req.params.id), req.user!.userId, keys, req.body?.note));
  }),
  rejectChangeRequest: wrap(async (req, res) => {
    sendSuccess(res, await changeRequestService.decide(String(req.params.id), req.user!.userId, false, req.body?.note));
  }),

  userDevices: wrap(async (req, res) => {
    sendSuccess(res, await deviceService.list(String(req.params.id)));
  }),
  revokeUserDevice: wrap(async (req, res) => {
    await deviceService.revokeForUser(String(req.params.id), String(req.params.deviceId), 'Signed out by the academy');
    sendSuccess(res, { message: 'Device signed out' });
  }),
};
