import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { hashPassword } from '../../helpers/utils/hash';
import {
  ConflictError,
  NotFoundError,
  BadRequestError,
} from '../../helpers/utils/errors';
import { toPublicUser } from '../../helpers/mappers/user.mapper';
import type {
  CreateStaffInput,
  ListStaffQuery,
  UpdateStaffInput,
  UpdateStaffPasswordInput,
  UpdateStaffPermissionsInput,
} from '../../helpers/validators/staff.schema';

export const staffService = {
  async list(params: ListStaffQuery) {
    const { search, role, isActive, page, pageSize } = params;
    const where: Prisma.UserWhereInput = {
      ...(role ? { role } : {}),
      ...(typeof isActive === 'boolean' ? { isActive } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search } },
            ],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ role: 'asc' }, { createdAt: 'desc' }],
      }),
    ]);

    return {
      items: items.map(toPublicUser),
      total,
      page,
      pageSize,
    };
  },

  async getById(id: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundError('Staff not found');
    return toPublicUser(user);
  },

  async create(input: CreateStaffInput) {
    const existed = await prisma.user.findUnique({ where: { email: input.email } });
    if (existed) throw new ConflictError('Email already in use');

    const password = await hashPassword(input.password);
    const created = await prisma.user.create({
      data: {
        email: input.email,
        password,
        name: input.name,
        phone: input.phone ?? null,
        role: input.role,
        permissions: (input.permissions ?? {}) as Prisma.InputJsonValue,
        orderViewTimeLimit: input.orderViewTimeLimit ?? 'unlimited',
      },
    });
    return toPublicUser(created);
  },

  async update(id: string, input: UpdateStaffInput, currentUserId: string) {
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) throw new NotFoundError('Staff not found');

    if (id === currentUserId && input.isActive === false) {
      throw new BadRequestError('Cannot deactivate your own account');
    }
    if (id === currentUserId && input.role && input.role !== target.role) {
      throw new BadRequestError('Cannot change your own role');
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.role !== undefined ? { role: input.role } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
    });
    return toPublicUser(updated);
  },

  async updatePermissions(
    id: string,
    input: UpdateStaffPermissionsInput,
    currentUserId: string,
  ) {
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) throw new NotFoundError('Staff not found');

    if (id === currentUserId) {
      throw new BadRequestError('Cannot edit your own permissions');
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        permissions: input.permissions as Prisma.InputJsonValue,
        ...(input.orderViewTimeLimit
          ? { orderViewTimeLimit: input.orderViewTimeLimit }
          : {}),
      },
    });
    return toPublicUser(updated);
  },

  async resetPassword(id: string, input: UpdateStaffPasswordInput) {
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) throw new NotFoundError('Staff not found');

    const hashed = await hashPassword(input.password);
    await prisma.user.update({
      where: { id },
      data: { password: hashed },
    });
  },

  async remove(id: string, currentUserId: string) {
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) throw new NotFoundError('Staff not found');

    if (id === currentUserId) {
      throw new BadRequestError('Cannot delete your own account');
    }

    try {
      await prisma.user.delete({ where: { id } });
    } catch (err) {
      // Fallback: if user has FK references (orders, scan histories), soft-disable instead.
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2003'
      ) {
        await prisma.user.update({
          where: { id },
          data: { isActive: false },
        });
        return { softDeleted: true };
      }
      throw err;
    }
    return { softDeleted: false };
  },
};
