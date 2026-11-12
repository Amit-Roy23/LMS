/**
 * Demo study materials: a branded PDF of lesson notes for every lesson and a worksheet for
 * every module, generated from prisma/demo-content/catalog.json and stored in StoredFile.
 * Students download them through a private link that expires after 15 minutes.
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from 'pdf-lib';
import type { PrismaClient } from '@prisma/client';

const BLUE = rgb(0, 0.388, 0.678);
const RED = rgb(0.906, 0.118, 0.141);
const INK = rgb(0.09, 0.11, 0.14);
const MUTED = rgb(0.4, 0.45, 0.52);
const W = 595.28;
const H = 841.89;
const M = 56;

/** Standard PDF fonts only cover Windows-1252, so swap the few symbols outside it. */
function clean(text: string): string {
  return String(text || '')
    .replace(/→/g, '->')
    .replace(/←/g, '<-')
    .replace(/≥/g, '>=')
    .replace(/≤/g, '<=')
    .replace(/×/g, 'x')
    .replace(/[^\x09\x0A\x0D\x20-\x7E–—‘’“”•…€™©®°±·é]/g, '');
}

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const out: string[] = [];
  for (const para of clean(text).split('\n')) {
    let line = '';
    for (const word of para.split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) > width && line) {
        out.push(line);
        line = word;
      } else line = next;
    }
    out.push(line);
  }
  return out;
}

class Writer {
  page!: PDFPage;
  y = 0;
  constructor(private doc: PDFDocument, private fonts: { regular: PDFFont; bold: PDFFont; mono: PDFFont }, private footer: string) {
    this.newPage();
  }
  newPage() {
    this.page = this.doc.addPage([W, H]);
    this.page.drawRectangle({ x: 0, y: H - 6, width: W, height: 6, color: BLUE });
    this.page.drawText('ADSIGN', { x: M, y: H - 46, size: 16, font: this.fonts.bold, color: RED });
    this.page.drawText('Skill Academy  |  Creative | Digital | Studio', { x: M + 72, y: H - 45, size: 9, font: this.fonts.regular, color: BLUE });
    this.page.drawText(clean(this.footer), { x: M, y: 30, size: 8, font: this.fonts.regular, color: MUTED });
    this.page.drawRectangle({ x: 0, y: 0, width: W, height: 4, color: RED });
    this.y = H - 90;
  }
  ensure(h: number) {
    if (this.y - h < 60) this.newPage();
  }
  text(t: string, opts: { size?: number; bold?: boolean; mono?: boolean; color?: any; indent?: number; gap?: number } = {}) {
    const size = opts.size || 11;
    const font = opts.mono ? this.fonts.mono : opts.bold ? this.fonts.bold : this.fonts.regular;
    const indent = opts.indent || 0;
    for (const line of wrap(t, font, size, W - 2 * M - indent)) {
      this.ensure(size + 6);
      this.page.drawText(line, { x: M + indent, y: this.y, size, font, color: opts.color || INK });
      this.y -= size + 5;
    }
    this.y -= opts.gap ?? 4;
  }
  heading(t: string) {
    this.ensure(40);
    this.y -= 6;
    this.text(t, { size: 13, bold: true, color: BLUE, gap: 6 });
  }
  bullet(t: string) {
    const lines = wrap(t, this.fonts.regular, 11, W - 2 * M - 18);
    this.ensure(lines.length * 16);
    this.page.drawCircle({ x: M + 5, y: this.y + 3.5, size: 2.2, color: BLUE });
    lines.forEach((line) => {
      this.page.drawText(line, { x: M + 18, y: this.y, size: 11, font: this.fonts.regular, color: INK });
      this.y -= 16;
    });
    this.y -= 2;
  }
  code(lines: string[]) {
    const h = lines.length * 14 + 16;
    this.ensure(h);
    this.page.drawRectangle({ x: M, y: this.y - h + 14, width: W - 2 * M, height: h, color: rgb(0.94, 0.97, 0.99) });
    this.y -= 6;
    for (const l of lines) {
      this.page.drawText(clean(l).slice(0, 90), { x: M + 10, y: this.y, size: 9.5, font: this.fonts.mono, color: INK });
      this.y -= 14;
    }
    this.y -= 12;
  }
}

async function newDoc(title: string, footer: string) {
  const doc = await PDFDocument.create();
  doc.setTitle(clean(title));
  doc.setAuthor('ADSIGN Skill Academy');
  const fonts = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
    mono: await doc.embedFont(StandardFonts.Courier),
  };
  return { doc, w: new Writer(doc, fonts, footer) };
}

async function lessonNotes(courseTitle: string, moduleTitle: string, title: string, c: any) {
  const { doc, w } = await newDoc(`${title}: lesson notes`, 'Lesson notes for enrolled students of ADSIGN Skill Academy. Personal use only; please do not share.');
  w.text(courseTitle.toUpperCase(), { size: 9, bold: true, color: MUTED, gap: 2 });
  w.text(moduleTitle, { size: 10, color: MUTED, gap: 8 });
  w.text(title, { size: 20, bold: true, gap: 10 });
  if (c?.summary) w.text(c.summary, { size: 12, color: MUTED, gap: 10 });
  if (c?.points?.length) {
    w.heading('Key ideas');
    c.points.forEach((p: string) => w.bullet(p));
  }
  if (c?.example?.lines?.length) {
    w.heading(`Example${c.example.label ? `: ${c.example.label}` : ''}`);
    if (c.example.kind === 'code') w.code(c.example.lines);
    else c.example.lines.forEach((l: string) => w.bullet(l));
  }
  if (c?.recap) {
    w.heading('Recap');
    w.text(c.recap);
  }
  w.heading('Your notes');
  for (let i = 0; i < 6; i++) {
    w.ensure(22);
    w.page.drawLine({ start: { x: M, y: w.y }, end: { x: W - M, y: w.y }, thickness: 0.6, color: rgb(0.85, 0.88, 0.92) });
    w.y -= 22;
  }
  return Buffer.from(await doc.save());
}

async function moduleWorksheet(courseTitle: string, moduleTitle: string, lessons: { title: string; c: any }[]) {
  const { doc, w } = await newDoc(`${moduleTitle}: worksheet`, 'Module worksheet for enrolled students of ADSIGN Skill Academy. Personal use only.');
  w.text(courseTitle.toUpperCase(), { size: 9, bold: true, color: MUTED, gap: 6 });
  w.text(`${moduleTitle}: practice worksheet`, { size: 18, bold: true, gap: 8 });
  w.text('Work through these after watching the module. They prepare you for the module quiz and the assignment.', { color: MUTED, gap: 8 });
  let n = 1;
  for (const { title, c } of lessons) {
    w.heading(title);
    for (const p of (c?.points || []).slice(0, 2)) {
      w.text(`${n++}. In your own words, explain: ${p.replace(/\.$/, '')}.`, { gap: 2 });
      for (let i = 0; i < 2; i++) {
        w.ensure(20);
        w.page.drawLine({ start: { x: M + 14, y: w.y - 4 }, end: { x: W - M, y: w.y - 4 }, thickness: 0.6, color: rgb(0.85, 0.88, 0.92) });
        w.y -= 20;
      }
    }
  }
  w.heading('Self-check before the quiz');
  ['I can explain every key idea without looking at my notes.', 'I tried each example myself.', 'I know which lesson to rewatch if I get stuck.'].forEach((t) => w.bullet(`[  ]  ${t}`));
  return Buffer.from(await doc.save());
}

export async function seedStudyMaterials(prisma: PrismaClient) {
  const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, 'demo-content/catalog.json'), 'utf8'));
  const content = new Map<string, any>();
  for (const course of catalog.courses) for (const m of course.modules) for (const l of m.lessons) content.set(l.title, l);
  for (const [title, l] of Object.entries<any>(catalog.fullstackLessons || {})) content.set(title, l);

  // Replace the old placeholder links with real files
  await prisma.lessonResource.deleteMany({});
  await prisma.storedFile.deleteMany({ where: { purpose: 'MATERIAL' } });

  const courses = await prisma.course.findMany({
    where: { deletedAt: null },
    include: { modules: { where: { deletedAt: null }, orderBy: { order: 'asc' }, include: { lessons: { where: { deletedAt: null }, orderBy: { order: 'asc' } } } } },
  });
  let files = 0;
  for (const course of courses) {
    for (const mod of course.modules) {
      for (const [li, lesson] of mod.lessons.entries()) {
        const notes = await lessonNotes(course.title, mod.title, lesson.title, content.get(lesson.title));
        await attach(prisma, lesson.id, `${lesson.title.replace(/^[\d.]+\s*/, '')}: lesson notes`, notes);
        files++;
        if (li === 0) {
          const sheet = await moduleWorksheet(course.title, mod.title, mod.lessons.map((l) => ({ title: l.title, c: content.get(l.title) })));
          await attach(prisma, lesson.id, `Module ${mod.order} practice worksheet`, sheet);
          files++;
        }
      }
    }
  }
  console.log(`✅ Seeded ${files} study material PDFs`);
}

async function attach(prisma: PrismaClient, lessonId: string, title: string, pdf: Buffer) {
  const id = crypto.randomUUID();
  const filename = `${title.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').slice(0, 80) || 'notes'}.pdf`;
  await prisma.storedFile.create({
    data: { id, purpose: 'MATERIAL', filename, mimetype: 'application/pdf', size: pdf.length, isPublic: false, data: new Uint8Array(pdf) },
  });
  await prisma.lessonResource.create({ data: { lessonId, title, type: 'PDF', url: `file:${id}`, sizeBytes: pdf.length } });
}
