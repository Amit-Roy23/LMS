import { prisma } from '../lib/prisma.js';
import { Role, UserStatus } from '@academy/shared';
import { NotFoundError } from '../lib/errors.js';

export class UserService {
  async listUsers(params: { page?: number; limit?: number; role?: Role; search?: string }) {
    const page = params.page || 1;
    const limit = params.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };
    if (params.role) where.role = params.role;
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { email: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          phone: true,
          avatar: true,
          status: true,
          createdAt: true,
          _count: {
            select: {
              enrollments: true,
              certificates: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async getUserById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        enrollments: {
          include: {
            course: true,
          },
        },
        certificates: {
          include: {
            course: true,
          },
        },
      },
    });

    if (!user) throw new NotFoundError('User not found');
    return user;
  }

  async updateUserStatus(id: string, status: UserStatus) {
    return prisma.user.update({
      where: { id },
      data: { status },
    });
  }
}

export const userService = new UserService();
