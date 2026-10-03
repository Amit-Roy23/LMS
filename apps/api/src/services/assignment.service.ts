import { prisma } from '../lib/prisma.js';
import { NotFoundError, BadRequestError } from '../lib/errors.js';
import { progressionService } from './progression.service.js';
import { Role, SubmissionStatus } from '@academy/shared';

export class AssignmentService {
  async getAssignmentForStudent(assignmentId: string, studentId: string, role: Role) {
    await progressionService.assertCanAccessAssignment(assignmentId, studentId, role);

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        module: { select: { id: true, title: true, courseId: true } },
      },
    });

    if (!assignment) throw new NotFoundError('Assignment not found');

    const submissions = await prisma.assignmentSubmission.findMany({
      where: { assignmentId, studentId },
      orderBy: { version: 'desc' },
      include: {
        reviewer: { select: { id: true, name: true, email: true, avatar: true } },
      },
    });

    const latestSubmission = submissions[0] || null;
    const isApproved = latestSubmission?.status === SubmissionStatus.APPROVED;

    return {
      assignment,
      submissions,
      latestSubmission,
      isApproved,
    };
  }

  async submitAssignment(params: {
    assignmentId: string;
    studentId: string;
    role: Role;
    textContent?: string | null;
    files?: string[];
    linkUrl?: string | null;
  }) {
    await progressionService.assertCanAccessAssignment(params.assignmentId, params.studentId, params.role);

    const assignment = await prisma.assignment.findUnique({
      where: { id: params.assignmentId },
      include: { module: true },
    });

    if (!assignment) throw new NotFoundError('Assignment not found');

    const latest = await prisma.assignmentSubmission.findFirst({
      where: { assignmentId: params.assignmentId, studentId: params.studentId },
      orderBy: { version: 'desc' },
    });

    if (latest && latest.status === SubmissionStatus.APPROVED) {
      throw new BadRequestError('This assignment has already been approved.');
    }

    if (latest && latest.status === SubmissionStatus.PENDING) {
      throw new BadRequestError('A submission is currently pending review by your instructor.');
    }

    const version = latest ? latest.version + 1 : 1;

    const submission = await prisma.assignmentSubmission.create({
      data: {
        assignmentId: params.assignmentId,
        studentId: params.studentId,
        version,
        textContent: params.textContent || null,
        files: params.files || [],
        linkUrl: params.linkUrl || null,
        status: SubmissionStatus.PENDING,
      },
    });

    // Re-evaluate progression
    const progression = await progressionService.getCourseProgression(assignment.module.courseId, params.studentId);

    return {
      submission,
      progression,
    };
  }

  async createAssignment(data: any) {
    return prisma.assignment.create({
      data,
    });
  }
}

export const assignmentService = new AssignmentService();
