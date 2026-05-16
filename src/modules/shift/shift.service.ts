import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { BadRequestError, NotFoundError } from '../../helpers/utils/errors';
import type {
  CreateShiftInput,
  CloseShiftInput,
  AddAttendanceInput,
  CheckOutInput,
} from '../../helpers/validators/shift.schema';

const shiftInclude = {
  openedBy: { select: { id: true, name: true } },
  _count: { select: { attendances: true } },
} satisfies Prisma.ShiftInclude;

export const shiftService = {
  async list(params: {
    isOpen?: boolean;
    from?: Date;
    to?: Date;
    page: number;
    pageSize: number;
  }) {
    const { isOpen, from, to, page, pageSize } = params;
    const where: Prisma.ShiftWhereInput = {
      ...(isOpen !== undefined ? { isOpen } : {}),
      ...(from || to
        ? {
            startTime: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      prisma.shift.count({ where }),
      prisma.shift.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { startTime: 'desc' },
        include: shiftInclude,
      }),
    ]);

    return { items, total, page, pageSize };
  },

  async getCurrent() {
    return prisma.shift.findFirst({
      where: { isOpen: true },
      orderBy: { startTime: 'desc' },
      include: {
        ...shiftInclude,
        attendances: {
          include: { user: { select: { id: true, name: true } } },
        },
      },
    });
  },

  async getById(id: string) {
    const shift = await prisma.shift.findUnique({
      where: { id },
      include: {
        ...shiftInclude,
        attendances: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { checkIn: 'asc' },
        },
      },
    });
    if (!shift) throw new NotFoundError('Shift not found');
    return shift;
  },

  async create(input: CreateShiftInput, openedById: string) {
    return prisma.$transaction(async (tx) => {
      const shift = await tx.shift.create({
        data: {
          name: input.name,
          note: input.note,
          startTime: new Date(),
          isOpen: true,
          openedById,
        },
        include: shiftInclude,
      });

      await tx.shiftAttendance.create({
        data: {
          shiftId: shift.id,
          userId: openedById,
          checkIn: new Date(),
        },
      });

      return shift;
    });
  },

  async close(id: string, input: CloseShiftInput) {
    const shift = await this.getById(id);
    if (!shift.isOpen) throw new BadRequestError('Shift is already closed');

    return prisma.shift.update({
      where: { id },
      data: {
        isOpen: false,
        endTime: new Date(),
        note: input.note ?? shift.note,
      },
      include: shiftInclude,
    });
  },

  async addAttendance(shiftId: string, input: AddAttendanceInput) {
    const shift = await this.getById(shiftId);
    if (!shift.isOpen) throw new BadRequestError('Cannot add attendance to a closed shift');

    const user = await prisma.user.findUnique({ where: { id: input.userId } });
    if (!user) throw new NotFoundError('User not found');

    return prisma.shiftAttendance.create({
      data: {
        shiftId,
        userId: input.userId,
        checkIn: input.checkIn ?? new Date(),
        note: input.note,
      },
      include: { user: { select: { id: true, name: true } } },
    });
  },

  async checkout(shiftId: string, attendanceId: string, input: CheckOutInput) {
    await this.getById(shiftId);

    const attendance = await prisma.shiftAttendance.findUnique({
      where: { id: attendanceId },
    });
    if (!attendance || attendance.shiftId !== shiftId) {
      throw new NotFoundError('Attendance record not found');
    }
    if (attendance.checkOut) {
      throw new BadRequestError('Already checked out');
    }

    return prisma.shiftAttendance.update({
      where: { id: attendanceId },
      data: { checkOut: input.checkOut ?? new Date() },
      include: { user: { select: { id: true, name: true } } },
    });
  },
};
