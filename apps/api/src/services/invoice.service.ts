import crypto from 'crypto';
import { PDFDocument, StandardFonts, rgb, PDFFont } from 'pdf-lib';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { config } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { NotFoundError, UnauthorizedError } from '../lib/errors.js';
import { INDIAN_STATES, isIndianState } from '../lib/indian-states.js';
import { notificationService } from './notification/notification.service.js';
import { NotificationChannel, PaymentStatus } from '@academy/shared';

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Indian financial year label for a date, e.g. 2026-27 (April to March). */
export function financialYear(d = new Date()) {
  const y = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
  return `${y}-${String((y + 1) % 100).padStart(2, '0')}`;
}

/**
 * Splits a GST-inclusive course price into taxable value and tax.
 * Same state as the academy: CGST + SGST (half each); another state: IGST.
 */
export function computeGst(total: number, rate: number, intraState: boolean) {
  const taxable = round2(total / (1 + rate / 100));
  const tax = round2(total - taxable);
  const half = round2(tax / 2);
  return intraState
    ? { taxable, cgst: half, sgst: round2(tax - half), igst: 0, tax }
    : { taxable, cgst: 0, sgst: 0, igst: tax, tax };
}

const money = (n: number | Prisma.Decimal, currency = 'INR') =>
  `${currency === 'INR' ? 'INR' : currency} ${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export class InvoiceService {
  /** Issues the tax invoice for a completed payment (idempotent: one invoice per payment). */
  async issueForPayment(paymentId: string, opts: { email?: boolean } = {}) {
    const existing = await prisma.invoice.findUnique({ where: { paymentId } });
    if (existing) return existing;

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { student: { include: { studentProfile: true } }, course: true },
    });
    if (!payment || payment.status !== PaymentStatus.COMPLETED) return null;

    const billing = ((payment.metadata as any) || {}).billing || {};
    const seller = config.invoice;
    const buyerState = isIndianState(billing.state) ? billing.state : seller.state;
    const intra = buyerState === seller.state;
    const gst = computeGst(payment.amount, seller.gstRate, intra);
    const fy = financialYear(payment.updatedAt || new Date());

    const invoice = await prisma.$transaction(async (tx) => {
      const counter = await tx.sequenceCounter.upsert({
        where: { name: `INVOICE-${fy}` },
        create: { name: `INVOICE-${fy}`, value: 1 },
        update: { value: { increment: 1 } },
      });
      return tx.invoice.create({
        data: {
          invoiceNumber: `${seller.prefix}/${fy}/${String(counter.value).padStart(5, '0')}`,
          paymentId: payment.id,
          studentId: payment.studentId,
          courseId: payment.courseId,
          financialYear: fy,
          issuedAt: payment.updatedAt || new Date(),
          buyerName: billing.name || payment.student.name,
          buyerEmail: payment.student.email,
          buyerPhone: payment.student.phone,
          buyerAddress: billing.address || [payment.student.studentProfile?.address, payment.student.studentProfile?.city].filter(Boolean).join(', ') || null,
          buyerState,
          buyerGstin: billing.gstin || null,
          sellerName: seller.sellerName,
          sellerGstin: seller.gstin || null,
          sellerAddress: seller.address || null,
          sellerState: seller.state,
          placeOfSupply: `${buyerState} (${INDIAN_STATES[buyerState] || seller.stateCode})`,
          sacCode: seller.sacCode,
          description: `${payment.course.title}: online course access`,
          currency: payment.currency,
          gstRate: seller.gstRate,
          taxableAmount: gst.taxable,
          cgstAmount: gst.cgst,
          sgstAmount: gst.sgst,
          igstAmount: gst.igst,
          totalAmount: payment.amount,
        },
      });
    });

    if (opts.email !== false) {
      notificationService
        .enqueueNotification({
          to: payment.student.email,
          channel: NotificationChannel.EMAIL,
          templateKey: 'invoice_issued',
          userId: payment.studentId,
          idempotencyKey: `invoice_${invoice.id}`,
          variables: {
            studentName: payment.student.name,
            invoiceNumber: invoice.invoiceNumber,
            courseTitle: payment.course.title,
            total: money(invoice.totalAmount, invoice.currency),
            downloadUrl: this.signedDownloadUrl(invoice.id),
          },
        })
        .then(() => prisma.invoice.update({ where: { id: invoice.id }, data: { emailedAt: new Date() } }))
        .catch((err) => logger.error({ err, invoiceId: invoice.id }, 'Failed to email invoice'));
    }
    return invoice;
  }

  private sign(id: string, exp: number) {
    return crypto.createHmac('sha256', config.security.signingSecret).update(`invoice:${id}:${exp}`).digest('hex');
  }

  /** A 30-day download link for emails (works without signing in). */
  signedDownloadUrl(id: string) {
    const exp = Math.floor(Date.now() / 1000) + 30 * 86400;
    return `${config.clientUrl}/api/v1/invoices/${id}/pdf?exp=${exp}&sig=${this.sign(id, exp)}`;
  }

  verifySignedUrl(id: string, exp: string, sig: string) {
    const e = parseInt(exp, 10);
    if (!e || e < Date.now() / 1000) throw new UnauthorizedError('This invoice link has expired. Download it from your dashboard.');
    const expected = this.sign(id, e);
    if (!sig || sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      throw new UnauthorizedError('Invalid invoice link');
    }
  }

  async get(id: string) {
    const invoice = await prisma.invoice.findUnique({ where: { id }, include: { payment: { select: { status: true, provider: true, providerRef: true, metadata: true } } } });
    if (!invoice) throw new NotFoundError('Invoice not found');
    return invoice;
  }

  async listForStudent(studentId: string) {
    return prisma.invoice.findMany({ where: { studentId }, orderBy: { issuedAt: 'desc' } });
  }

  /** Renders the invoice as an A4 PDF. */
  async renderPdf(id: string): Promise<{ bytes: Uint8Array; filename: string }> {
    const inv = await this.get(id);
    const pdf = await PDFDocument.create();
    pdf.setTitle(`Tax Invoice ${inv.invoiceNumber}`);
    pdf.setAuthor(inv.sellerName);
    const page = pdf.addPage([595.28, 841.89]);
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const blue = rgb(0, 0.388, 0.678);
    const red = rgb(0.906, 0.118, 0.141);
    const ink = rgb(0.09, 0.11, 0.14);
    const muted = rgb(0.4, 0.45, 0.52);
    const line = rgb(0.886, 0.91, 0.94);
    const W = 595.28;
    const M = 48;
    const text = (t: string, x: number, y: number, size = 10, f: PDFFont = font, color = ink) =>
      page.drawText(t, { x, y, size, font: f, color });
    const right = (t: string, xRight: number, y: number, size = 10, f: PDFFont = font, color = ink) =>
      text(t, xRight - f.widthOfTextAtSize(t, size), y, size, f, color);

    // Header band
    page.drawRectangle({ x: 0, y: 841.89 - 6, width: W, height: 6, color: blue });
    text('ADSIGN', M, 790, 22, bold, red);
    text('Skill Academy  |  Creative | Digital | Studio', M, 774, 9, font, blue);
    right('TAX INVOICE', W - M, 792, 16, bold, ink);
    right(inv.invoiceNumber, W - M, 776, 10, bold, blue);
    right(`Date: ${inv.issuedAt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`, W - M, 762, 9, font, muted);

    // Seller / buyer
    let y = 728;
    text('FROM', M, y, 8, bold, muted);
    text('BILL TO', W / 2 + 10, y, 8, bold, muted);
    y -= 14;
    const left = [inv.sellerName, inv.sellerAddress || '', `State: ${inv.sellerState} (${config.invoice.stateCode})`, `GSTIN: ${inv.sellerGstin || 'to be configured'}`, config.invoice.email, config.invoice.phone].filter(Boolean);
    const rightCol = [inv.buyerName, inv.buyerEmail, inv.buyerPhone || '', inv.buyerAddress || '', `State: ${inv.buyerState || '-'}`, inv.buyerGstin ? `GSTIN: ${inv.buyerGstin}` : ''].filter(Boolean);
    for (let i = 0; i < Math.max(left.length, rightCol.length); i++) {
      if (left[i]) text(left[i]!.slice(0, 60), M, y, i === 0 ? 11 : 9, i === 0 ? bold : font);
      if (rightCol[i]) text(rightCol[i]!.slice(0, 60), W / 2 + 10, y, i === 0 ? 11 : 9, i === 0 ? bold : font);
      y -= 14;
    }
    y -= 6;
    text(`Place of supply: ${inv.placeOfSupply}`, M, y, 9, font, muted);
    right(`Payment ref: ${(inv.payment.providerRef || '').slice(0, 40)}`, W - M, y, 9, font, muted);

    // Line item table
    y -= 26;
    page.drawRectangle({ x: M, y: y - 6, width: W - 2 * M, height: 22, color: rgb(0.941, 0.969, 0.988) });
    text('Description', M + 8, y, 9, bold);
    text('SAC', 330, y, 9, bold);
    right('Taxable value', W - M - 8, y, 9, bold);
    y -= 26;
    text(inv.description.slice(0, 55), M + 8, y, 10);
    text(inv.sacCode, 330, y, 10);
    right(money(inv.taxableAmount, inv.currency), W - M - 8, y, 10);
    y -= 14;
    page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 1, color: line });

    // Totals
    const rows: [string, Prisma.Decimal | number][] = [['Taxable value', inv.taxableAmount]];
    const rate = Number(inv.gstRate);
    if (Number(inv.igstAmount) > 0) rows.push([`IGST @ ${rate}%`, inv.igstAmount]);
    else {
      rows.push([`CGST @ ${rate / 2}%`, inv.cgstAmount]);
      rows.push([`SGST @ ${rate / 2}%`, inv.sgstAmount]);
    }
    y -= 22;
    for (const [label, val] of rows) {
      text(label, 330, y, 10, font, muted);
      right(money(val, inv.currency), W - M - 8, y, 10);
      y -= 18;
    }
    y -= 10;
    page.drawRectangle({ x: 320, y: y - 8, width: W - M - 320, height: 26, color: blue });
    text('Total (incl. GST)', 330, y, 11, bold, rgb(1, 1, 1));
    right(money(inv.totalAmount, inv.currency), W - M - 8, y, 11, bold, rgb(1, 1, 1));

    y -= 40;
    const paid = inv.payment.status === PaymentStatus.COMPLETED;
    text(paid ? 'PAID' : `STATUS: ${inv.payment.status}`, M, y, 12, bold, paid ? rgb(0.02, 0.47, 0.34) : red);
    const via = inv.payment.provider === 'RAZORPAY' ? 'Paid online via Razorpay' : inv.payment.provider === 'MOCK' ? 'Demo payment (simulated gateway)' : `Paid via ${inv.payment.provider}`;
    text(via, M, y - 14, 9, font, muted);

    // Footer
    text('This is a computer-generated invoice and does not require a signature.', M, 70, 8, font, muted);
    text('Course prices are inclusive of GST. Reverse charge: No.', M, 58, 8, font, muted);
    page.drawRectangle({ x: 0, y: 0, width: W, height: 6, color: red });

    const bytes = await pdf.save();
    return { bytes, filename: `${inv.invoiceNumber.replace(/\//g, '-')}.pdf` };
  }
}

export const invoiceService = new InvoiceService();
