import { prisma } from '../lib/prisma.js';
import { Role, UserStatus } from '@academy/shared';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../lib/errors.js';
import { config } from '../config/env.js';
import { normalizePhone } from '../lib/phone.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const CONSOLE_ROLES: Role[] = [Role.ADMIN, Role.STAFF, Role.INSTRUCTOR];

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
          studentId: true,
          role: true,
          phone: true,
          lastLoginAt: true,
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
      // Never return password or PIN hashes
      omit: { passwordHash: true, pinHash: true },
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

  private async assertAdminSlot(excludeUserId?: string) {
    const admins = await prisma.user.count({
      where: { role: Role.ADMIN, deletedAt: null, status: 'ACTIVE', ...(excludeUserId ? { id: { not: excludeUserId } } : {}) },
    });
    if (admins >= config.security.maxAdmins) {
      throw new ConflictError(`There can be at most ${config.security.maxAdmins} main admins. Change another admin's role first.`);
    }
  }

  /** Creates a staff, instructor or admin account with a temporary password to change on first sign-in. */
  async createConsoleUser(params: { name: string; email: string; phone?: string; role: Role }) {
    if (!CONSOLE_ROLES.includes(params.role)) throw new BadRequestError('Role must be ADMIN, STAFF or INSTRUCTOR');
    if (!params.name || !params.email) throw new BadRequestError('Name and email are required');
    if (params.role === Role.ADMIN) await this.assertAdminSlot();
    const email = params.email.toLowerCase().trim();
    const phone = normalizePhone(params.phone);
    if (params.phone && !phone) throw new BadRequestError('Please enter a valid mobile number');
    const [emailTaken, phoneTaken] = await Promise.all([
      prisma.user.findUnique({ where: { email } }),
      phone ? prisma.user.findUnique({ where: { phone } }) : null,
    ]);
    if (emailTaken) throw new ConflictError('An account with this email already exists');
    if (phoneTaken) throw new ConflictError('This mobile number is already registered');
    const tempPassword = `Ads@${crypto.randomInt(100000, 999999)}`;
    const user = await prisma.user.create({
      data: {
        name: params.name.trim(),
        email,
        phone,
        role: params.role,
        passwordHash: await bcrypt.hash(tempPassword, 10),
        mustChangePassword: true,
      },
      select: { id: true, name: true, email: true, phone: true, role: true, status: true, createdAt: true },
    });
    return { user, tempPassword };
  }

  async updateRole(actorId: string, id: string, role: Role) {
    if (!CONSOLE_ROLES.includes(role) && role !== Role.STUDENT) throw new BadRequestError('Unknown role');
    if (actorId === id) throw new ForbiddenError('You cannot change your own role');
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundError('User not found');
    if (role === Role.ADMIN && user.role !== Role.ADMIN) await this.assertAdminSlot();
    const updated = await prisma.user.update({
      where: { id },
      data: { role, ...(role !== Role.ADMIN ? { pinHash: null } : {}) },
      select: { id: true, name: true, email: true, role: true, status: true },
    });
    return { before: { role: user.role }, user: updated };
  }

  async updateUserStatus(id: string, status: UserStatus) {
    return prisma.user.update({
      where: { id },
      data: { status },
    });
  }
}

export const userService = new UserService();
