import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { sendSuccess } from '../lib/utils.js';
import { ForbiddenError } from '../lib/errors.js';
import { Role } from '@academy/shared';
import { invoiceService } from '../services/invoice.service.js';
import { paymentService } from '../services/payment/payment.service.js';
import { RazorpayProvider } from '../services/payment/razorpay.provider.js';
import { recordAudit } from '../lib/audit.js';
import { logger } from '../lib/logger.js';

const wrap =
  (fn: (req: Request, res: Response) => Promise<any>) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await fn(req, res);
    } catch (err) {
      next(err);
    }
  };

async function sendPdf(res: Response, id: string) {
  const { bytes, filename } = await invoiceService.renderPdf(id);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
  res.setHeader('Cache-Control', 'private, no-store');
  res.end(Buffer.from(bytes));
}

export const billingController = {
  /** Which gateway the checkout should open (decided by the server). */
  checkoutConfig: wrap(async (_req, res) => {
    sendSuccess(res, paymentService.checkoutConfig());
  }),

  /** Razorpay webhook: signature-checked against the raw body; always answers 200 once verified. */
  razorpayWebhook: async (req: Request, res: Response) => {
    const signature = req.headers['x-razorpay-signature'] as string | undefined;
    const raw = (req as any).rawBody as Buffer | undefined;
    if (!raw || !RazorpayProvider.verifyWebhook(raw, signature)) {
      logger.warn('Rejected Razorpay webhook with an invalid signature');
      return res.status(400).json({ success: false, error: { code: 'INVALID_SIGNATURE', message: 'Invalid signature' } });
    }
    try {
      const result = await paymentService.handleRazorpayWebhook(req.body);
      logger.info({ event: req.body?.event, ...result }, 'Razorpay webhook processed');
    } catch (err) {
      logger.error({ err, event: req.body?.event }, 'Razorpay webhook handling failed');
      return res.status(500).json({ success: false });
    }
    return res.status(200).json({ success: true });
  },

  /** Emailed invoice link (signed, 30 days). */
  publicInvoicePdf: wrap(async (req, res) => {
    const id = String(req.params.id);
    invoiceService.verifySignedUrl(id, String(req.query.exp || ''), String(req.query.sig || ''));
    await sendPdf(res, id);
  }),

  myInvoices: wrap(async (req, res) => {
    sendSuccess(res, await invoiceService.listForStudent(req.user!.userId));
  }),

  myInvoicePdf: wrap(async (req, res) => {
    const inv = await invoiceService.get(String(req.params.id));
    if (inv.studentId !== req.user!.userId) throw new ForbiddenError('This invoice belongs to another account');
    await sendPdf(res, inv.id);
  }),

  adminInvoicePdf: wrap(async (req, res) => {
    await sendPdf(res, String(req.params.id));
  }),

  /** Payments with their invoices, newest first (admins and staff). */
  listPayments: wrap(async (req, res) => {
    const status = req.query.status as string | undefined;
    const search = (req.query.search as string | undefined)?.trim();
    const payments = await prisma.payment.findMany({
      where: {
        ...(status ? { status: status as any } : {}),
        ...(search
          ? {
              OR: [
                { student: { name: { contains: search, mode: 'insensitive' } } },
                { student: { email: { contains: search, mode: 'insensitive' } } },
                { invoice: { invoiceNumber: { contains: search, mode: 'insensitive' } } },
                { providerRef: { contains: search } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        student: { select: { id: true, name: true, email: true, studentId: true } },
        course: { select: { id: true, title: true } },
        invoice: { select: { id: true, invoiceNumber: true, totalAmount: true, issuedAt: true, emailedAt: true } },
      },
    });
    const totals = payments.reduce(
      (acc, p) => {
        if (p.status === 'COMPLETED') acc.collected += p.amount;
        if (p.status === 'REFUNDED') acc.refunded += p.amount;
        return acc;
      },
      { collected: 0, refunded: 0 }
    );
    sendSuccess(res, { payments, totals, provider: paymentService.activeProviderName() });
  }),

  refund: wrap(async (req, res) => {
    if (req.user!.role !== Role.ADMIN) throw new ForbiddenError('Only a main admin can refund');
    const reason = String(req.body?.reason || '').trim() || 'Refund requested';
    const before = await prisma.payment.findUnique({ where: { id: String(req.params.id) }, select: { status: true, amount: true } });
    const payment = await paymentService.refund(String(req.params.id), reason);
    await recordAudit(req, {
      action: 'PAYMENT_REFUNDED',
      entityType: 'Payment',
      entityId: payment.id,
      before: { status: before?.status },
      after: { status: payment.status },
      details: { amount: payment.amount, reason },
    });
    sendSuccess(res, payment);
  }),
};
