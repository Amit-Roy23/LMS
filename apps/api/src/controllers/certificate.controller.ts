import { Request, Response, NextFunction } from 'express';
import { certificateService } from '../services/certificate.service.js';
import { prisma } from '../lib/prisma.js';
import { sendSuccess } from '../lib/utils.js';

export class CertificateController {
  async getMyCertificates(req: Request, res: Response, next: NextFunction) {
    try {
      const certificates = await prisma.certificate.findMany({
        where: { studentId: req.user!.userId },
        include: {
          course: { select: { id: true, title: true, slug: true, thumbnail: true } },
        },
        orderBy: { issuedAt: 'desc' },
      });
      return sendSuccess(res, certificates);
    } catch (err) {
      next(err);
    }
  }

  async verifyCertificate(req: Request, res: Response, next: NextFunction) {
    try {
      const certificateId = req.params.certificateId as string;
      const data = await certificateService.verifyCertificate(certificateId);
      return sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  }

  async claimCertificate(req: Request, res: Response, next: NextFunction) {
    try {
      const { courseId } = req.body;
      const certificate = await certificateService.issueCertificateIfEligible(
        courseId,
        req.user!.userId
      );
      return sendSuccess(res, certificate, 201);
    } catch (err) {
      next(err);
    }
  }

  async revokeCertificate(req: Request, res: Response, next: NextFunction) {
    try {
      const certificateId = req.params.certificateId as string;
      const { reason } = req.body;
      const updated = await certificateService.revokeCertificate(
        certificateId,
        reason
      );
      return sendSuccess(res, updated);
    } catch (err) {
      next(err);
    }
  }
}

export const certificateController = new CertificateController();
