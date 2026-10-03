import { prisma } from '../lib/prisma.js';
import { NotFoundError, BadRequestError } from '../lib/errors.js';
import { progressionService } from './progression.service.js';
import { Role, SubmissionStatus } from '@academy/shared';

export class FinalProjectService {
  async getProjectForStudent(finalProjectId: string, studentId: string, role: Role) {
    const project = await prisma.finalProject.findUnique({
      where: { id: finalProjectId },
      include: {
        course: { select: { id: true, title: true } },
      },
    });

    if (!project) throw new NotFoundError('Final project not found');

    if (role === Role.STUDENT) {
      const progression = await progressionService.getCourseProgression(project.courseId, studentId);
      if (!progression.isAllModulesCompleted || !progression.mockTestPassed) {
        throw new BadRequestError('Final project is locked. You must complete all modules and pass the mock test first.');
      }
    }

    const submissions = await prisma.projectSubmission.findMany({
      where: { finalProjectId, studentId },
      orderBy: { createdAt: 'desc' },
      include: {
        reviewer: { select: { id: true, name: true, email: true, avatar: true } },
      },
    });

    const latestSubmission = submissions[0] || null;
    const isApproved = latestSubmission?.status === SubmissionStatus.APPROVED;

    return {
      project,
      submissions,
      latestSubmission,
      isApproved,
    };
  }

  async submitProject(params: {
    finalProjectId: string;
    studentId: string;
    description: string;
    files?: string[];
    linkUrl?: string | null;
  }) {
    const project = await prisma.finalProject.findUnique({
      where: { id: params.finalProjectId },
      include: { course: true },
    });

    if (!project) throw new NotFoundError('Final project not found');

    const progression = await progressionService.getCourseProgression(project.courseId, params.studentId);
    if (!progression.isAllModulesCompleted || !progression.mockTestPassed) {
      throw new BadRequestError('Final project is locked. Please pass prior stages first.');
    }

    const latest = await prisma.projectSubmission.findFirst({
      where: { finalProjectId: params.finalProjectId, studentId: params.studentId },
      orderBy: { createdAt: 'desc' },
    });

    if (latest && latest.status === SubmissionStatus.APPROVED) {
      throw new BadRequestError('Final project has already been approved.');
    }

    const submission = await prisma.projectSubmission.create({
      data: {
        finalProjectId: params.finalProjectId,
        studentId: params.studentId,
        description: params.description,
        files: params.files || [],
        linkUrl: params.linkUrl || null,
        status: SubmissionStatus.PENDING,
      },
    });

    const updatedProgression = await progressionService.getCourseProgression(project.courseId, params.studentId);

    return {
      submission,
      progression: updatedProgression,
    };
  }
}

export const finalProjectService = new FinalProjectService();
