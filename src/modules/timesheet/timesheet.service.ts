import { prisma } from '../../config/prisma';
import { getCurrentShopId } from '../../helpers/context/tenant-context';
import { BadRequestError, NotFoundError } from '../../helpers/utils/errors';
import type { UpdateTimeEntryInput } from '../../helpers/validators/timesheet.schema';
import {
  HOURLY_RATE_SUNDAY,
  HOURLY_RATE_WEEKDAY,
  calcEntryPay,
  monthRangeVN,
} from '../../helpers/utils/timesheet';

export const timesheetService = {
  /** Ca đang mở (đã vào, chưa kết) của nhân viên — null nếu chưa vào ca. */
  getCurrent(userId: string) {
    return prisma.timeEntry.findFirst({
      where: { userId, checkOut: null },
      orderBy: { checkIn: 'desc' },
    });
  },

  async checkIn(userId: string) {
    const open = await this.getCurrent(userId);
    if (open) throw new BadRequestError('Bạn đang trong ca, hãy kết ca trước');
    return prisma.timeEntry.create({
      data: { shopId: getCurrentShopId(), userId, checkIn: new Date() },
    });
  },

  async checkOut(userId: string) {
    const open = await this.getCurrent(userId);
    if (!open) throw new BadRequestError('Bạn chưa vào ca');
    return prisma.timeEntry.update({
      where: { id: open.id },
      data: { checkOut: new Date() },
    });
  },

  /** ADMIN sửa giờ vào/ra của 1 ca chấm công. */
  async update(id: string, input: UpdateTimeEntryInput) {
    const entry = await prisma.timeEntry.findUnique({ where: { id } });
    if (!entry) throw new NotFoundError('Không tìm thấy ca chấm công');
    if (!input.checkOut) {
      // Mở lại ca: không được có ca đang mở khác của cùng nhân viên
      const open = await prisma.timeEntry.findFirst({
        where: { userId: entry.userId, checkOut: null, id: { not: id } },
      });
      if (open) throw new BadRequestError('Nhân viên đang có ca khác chưa kết');
    }
    return prisma.timeEntry.update({
      where: { id },
      data: { checkIn: input.checkIn, checkOut: input.checkOut },
    });
  },

  async remove(id: string) {
    const entry = await prisma.timeEntry.findUnique({ where: { id } });
    if (!entry) throw new NotFoundError('Không tìm thấy ca chấm công');
    await prisma.timeEntry.delete({ where: { id } });
  },

  /**
   * Thống kê tháng: mỗi nhân viên 1 dòng tổng + danh sách ca (đã làm tròn 30').
   * `userId` undefined = tất cả nhân viên (chỉ ADMIN được gọi kiểu này).
   */
  async monthly(month: string, userId?: string) {
    const { from, to } = monthRangeVN(month);
    const entries = await prisma.timeEntry.findMany({
      where: { checkIn: { gte: from, lt: to }, ...(userId ? { userId } : {}) },
      orderBy: { checkIn: 'asc' },
      include: { user: { select: { id: true, name: true } } },
    });

    const byUser = new Map<
      string,
      {
        userId: string;
        name: string;
        totalHours: number;
        totalAmount: number;
        entries: Array<{
          id: string;
          checkIn: Date;
          checkOut: Date | null;
          roundedIn: Date;
          roundedOut: Date | null;
          hours: number;
          isSunday: boolean;
          rate: number;
          amount: number;
        }>;
      }
    >();

    for (const e of entries) {
      const pay = calcEntryPay(e.checkIn, e.checkOut);
      let row = byUser.get(e.userId);
      if (!row) {
        row = { userId: e.userId, name: e.user.name, totalHours: 0, totalAmount: 0, entries: [] };
        byUser.set(e.userId, row);
      }
      row.totalHours += pay.hours;
      row.totalAmount += pay.amount;
      row.entries.push({ id: e.id, checkIn: e.checkIn, checkOut: e.checkOut, ...pay });
    }

    const users = [...byUser.values()].sort((a, b) => a.name.localeCompare(b.name, 'vi'));
    return {
      month,
      rates: { weekday: HOURLY_RATE_WEEKDAY, sunday: HOURLY_RATE_SUNDAY },
      totalHours: users.reduce((s, u) => s + u.totalHours, 0),
      totalAmount: users.reduce((s, u) => s + u.totalAmount, 0),
      users,
    };
  },
};
