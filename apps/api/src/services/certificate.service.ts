import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import QRCode from 'qrcode';
import { prisma } from '../lib/prisma.js';
import { storageService } from './storage/storage.service.js';
import { progressionService } from './progression.service.js';
import { generateCertificateId } from '../lib/utils.js';
import { config } from '../config/env.js';
import { BadRequestError, NotFoundError } from '../lib/errors.js';
import { CertificateStatus } from '@academy/shared';
import { logger } from '../lib/logger.js';

export class CertificateService {
  async generateCertificatePdf(params: {
    certificateId: string;
    studentName: string;
    courseTitle: string;
    issueDate: Date;
    verificationUrl: string;
  }): Promise<Buffer> {
    const pdfDoc = await PDFDocument.create();
    // Landscape A4: 841.89 x 595.28
    const page = pdfDoc.addPage([842, 595]);
    const { width, height } = page.getSize();

    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const timesRomanBoldItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanBoldItalic);

    // Generate QR Code PNG Buffer
    const qrBuffer = await QRCode.toBuffer(params.verificationUrl, {
      width: 120,
      margin: 1,
      color: { dark: '#1e1b4b', light: '#ffffff' },
    });
    const qrImage = await pdfDoc.embedPng(qrBuffer);

    // Background & Borders
    // Outer border
    page.drawRectangle({
      x: 20,
      y: 20,
      width: width - 40,
      height: height - 40,
      borderColor: rgb(0.31, 0.27, 0.9), // Indigo #4f46e5
      borderWidth: 3,
      color: rgb(0.98, 0.98, 1.0),
    });

    // Inner decorative border
    page.drawRectangle({
      x: 30,
      y: 30,
      width: width - 60,
      height: height - 60,
      borderColor: rgb(0.79, 0.73, 0.98), // Violet #c4b5fd
      borderWidth: 1,
    });

    // Academy Header
    page.drawText('ONLINE CREATIVE & IT ACADEMY', {
      x: 200,
      y: 520,
      size: 22,
      font: helveticaBold,
      color: rgb(0.12, 0.11, 0.29),
    });

    page.drawText('OFFICIAL CERTIFICATE OF COMPLETION & MASTERY', {
      x: 240,
      y: 490,
      size: 11,
      font: helvetica,
      color: rgb(0.31, 0.27, 0.9),
    });

    // "This is proudly presented to"
    page.drawText('This is to certify that', {
      x: 360,
      y: 430,
      size: 13,
      font: helvetica,
      color: rgb(0.4, 0.45, 0.55),
    });

    // Student Name
    const nameWidth = timesRomanBoldItalic.widthOfTextAtSize(params.studentName, 32);
    page.drawText(params.studentName, {
      x: (width - nameWidth) / 2,
      y: 380,
      size: 32,
      font: timesRomanBoldItalic,
      color: rgb(0.1, 0.1, 0.35),
    });

    // Divider line under student name
    page.drawLine({
      start: { x: 180, y: 365 },
      end: { x: width - 180, y: 365 },
      thickness: 1.5,
      color: rgb(0.31, 0.27, 0.9),
    });

    // Course Completion Text
    page.drawText('has successfully completed the comprehensive training curriculum and rigorous assessment requirements for', {
      x: 130,
      y: 330,
      size: 12,
      font: helvetica,
      color: rgb(0.3, 0.3, 0.4),
    });

    const courseWidth = helveticaBold.widthOfTextAtSize(params.courseTitle, 18);
    page.drawText(params.courseTitle, {
      x: (width - courseWidth) / 2,
      y: 290,
      size: 18,
      font: helveticaBold,
      color: rgb(0.12, 0.11, 0.29),
    });

    // Date and ID
    const formattedDate = params.issueDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    page.drawText(`Issued on: ${formattedDate}`, {
      x: 100,
      y: 190,
      size: 11,
      font: helvetica,
      color: rgb(0.3, 0.35, 0.45),
    });

    page.drawText(`Certificate ID: ${params.certificateId}`, {
      x: 100,
      y: 170,
      size: 11,
      font: helveticaBold,
      color: rgb(0.1, 0.1, 0.2),
    });

    // Signatures
    page.drawLine({
      start: { x: 100, y: 110 },
      end: { x: 260, y: 110 },
      thickness: 1,
      color: rgb(0.5, 0.5, 0.6),
    });
    page.drawText('Academic Director', {
      x: 135,
      y: 90,
      size: 10,
      font: helvetica,
      color: rgb(0.4, 0.4, 0.5),
    });

    page.drawLine({
      start: { x: 340, y: 110 },
      end: { x: 500, y: 110 },
      thickness: 1,
      color: rgb(0.5, 0.5, 0.6),
    });
    page.drawText('Lead Instructor', {
      x: 380,
      y: 90,
      size: 10,
      font: helvetica,
      color: rgb(0.4, 0.4, 0.5),
    });

    // Embed QR Code on the right
    page.drawImage(qrImage, {
      x: 660,
      y: 80,
      width: 100,
      height: 100,
    });
    page.drawText('Scan to Verify', {
      x: 680,
      y: 65,
      size: 9,
      font: helveticaBold,
      color: rgb(0.31, 0.27, 0.9),
    });

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }

  async issueCertificateIfEligible(courseId: string, studentId: string) {
    const progression = await progressionService.getCourseProgression(courseId, studentId);

    if (!progression.certificateEligible) {
      throw new BadRequestError('Student has not yet completed all prerequisites for certificate issuance');
    }

    // Check if certificate already exists
    const existing = await prisma.certificate.findUnique({
      where: {
        studentId_courseId: {
          studentId,
          courseId,
        },
      },
    });

    if (existing) {
      return existing;
    }

    const student = await prisma.user.findUnique({ where: { id: studentId } });
    const course = await prisma.course.findUnique({ where: { id: courseId } });

    if (!student || !course) {
      throw new NotFoundError('Student or Course not found');
    }

    const certId = generateCertificateId();
    const verificationUrl = `${config.clientUrl}/verify/${certId}`;
    const issueDate = new Date();

    const pdfBuffer = await this.generateCertificatePdf({
      certificateId: certId,
      studentName: student.name,
      courseTitle: course.title,
      issueDate,
      verificationUrl,
    });

    const fileInfo = await storageService.saveBuffer(
      pdfBuffer,
      `${certId}.pdf`,
      'application/pdf',
      'certificates'
    );

    const certificate = await prisma.certificate.create({
      data: {
        certificateId: certId,
        studentId,
        courseId,
        issuedAt: issueDate,
        status: CertificateStatus.VALID,
        pdfUrl: fileInfo.url,
        metadata: {
          studentName: student.name,
          courseTitle: course.title,
          verificationUrl,
        },
      },
    });

    // Mark Enrollment as COMPLETED
    await prisma.enrollment.updateMany({
      where: { studentId, courseId },
      data: { status: 'COMPLETED', completedAt: issueDate },
    });

    // Create Notification
    await prisma.notification.create({
      data: {
        userId: studentId,
        title: '🎉 Congratulations! Certificate Issued',
        message: `You have successfully completed ${course.title}. Your certificate ${certId} is ready for download.`,
        type: 'CERTIFICATE_ISSUED',
        link: `/student/certificates`,
      },
    });

    logger.info({ certId, studentId, courseId }, 'Certificate issued and generated successfully');

    return certificate;
  }

  async verifyCertificate(certificateId: string) {
    const cert = await prisma.certificate.findUnique({
      where: { certificateId },
      include: {
        student: { select: { id: true, name: true, email: true, avatar: true } },
        course: { select: { id: true, title: true, slug: true, description: true } },
      },
    });

    if (!cert) {
      throw new NotFoundError(`Certificate ${certificateId} was not found or is invalid`);
    }

    return {
      certificateId: cert.certificateId,
      studentName: cert.student.name,
      studentEmail: cert.student.email,
      courseTitle: cert.course.title,
      courseSlug: cert.course.slug,
      issuedAt: cert.issuedAt,
      revokedAt: cert.revokedAt,
      status: cert.status,
      pdfUrl: cert.pdfUrl,
      isValid: cert.status === CertificateStatus.VALID,
    };
  }

  async revokeCertificate(certificateId: string, reason?: string) {
    const cert = await prisma.certificate.findUnique({
      where: { certificateId },
    });

    if (!cert) {
      throw new NotFoundError('Certificate not found');
    }

    const updated = await prisma.certificate.update({
      where: { certificateId },
      data: {
        status: CertificateStatus.REVOKED,
        revokedAt: new Date(),
        metadata: {
          ...((cert.metadata as any) || {}),
          revocationReason: reason || 'Revoked by administrator',
        },
      },
    });

    return updated;
  }
}

export const certificateService = new CertificateService();
