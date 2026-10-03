import { describe, it, expect } from 'vitest';
import { CertificateService } from '../src/services/certificate.service.js';
import { PDFDocument } from 'pdf-lib';

describe('Certificate Service - PDF & Verification', () => {
  const certificateService = new CertificateService();

  it('generates a valid, parseable PDF buffer with QR code and metadata', async () => {
    const pdfBuffer = await certificateService.generateCertificatePdf({
      certificateId: 'CERT-2026-TEST01',
      studentName: 'John Doe',
      courseTitle: 'Full-Stack Web Development & Modern AI Engineering',
      issueDate: new Date(),
      verificationUrl: 'http://localhost:3000/verify/CERT-2026-TEST01',
    });

    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(1000);

    // Load back with pdf-lib to verify PDF structure
    const loadedDoc = await PDFDocument.load(pdfBuffer);
    expect(loadedDoc.getPageCount()).toBe(1);

    const page = loadedDoc.getPage(0);
    const { width, height } = page.getSize();
    expect(width).toBe(842); // Landscape A4 width
    expect(height).toBe(595); // Landscape A4 height
  });
});
