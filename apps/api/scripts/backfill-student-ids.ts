/**
 * Gives every student without an official ID one (ADS-YYYY-NNNNNN), oldest account first.
 * Safe to run more than once:  npm run db:backfill-ids
 */
import { PrismaClient } from '@prisma/client';

async function nextStudentId(tx: any): Promise<string> {
  const year = new Date().getFullYear();
  const counter = await tx.sequenceCounter.upsert({
    where: { name: `student_id_${year}` },
    create: { name: `student_id_${year}`, value: 1 },
    update: { value: { increment: 1 } },
  });
  return `ADS-${year}-${String(counter.value).padStart(6, '0')}`;
}

async function main() {
  const prisma = new PrismaClient();
  const students = await prisma.user.findMany({
    where: { role: 'STUDENT', studentId: null, deletedAt: null },
    orderBy: { createdAt: 'asc' },
    select: { id: true, email: true },
  });
  for (const s of students) {
    const studentId = await prisma.$transaction(async (tx) => {
      const id = await nextStudentId(tx);
      await tx.user.update({ where: { id: s.id }, data: { studentId: id } });
      return id;
    });
    console.log(`${s.email} -> ${studentId}`);
  }
  console.log(`Done: ${students.length} student(s) given an ID`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
