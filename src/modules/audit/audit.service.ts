import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { getCurrentShopId } from '../../helpers/context/tenant-context';
import { NotFoundError } from '../../helpers/utils/errors';
import { todayVN } from '../cash-closing/cash-closing.service';
import { scanHistoryService } from '../qr/scan-history.service';
import { notifyAdmins } from '../../lib/firebase';
import { fmtVNTime } from '../../helpers/utils/notify-format';

export type AuditResult = 'VERIFIED' | 'ANOMALY';

const auditInclude = {
  auditedBy: { select: { id: true, name: true } },
  order: {
    select: {
      id: true,
      code: true,
      status: true,
      totalAmount: true,
      customer: { select: { id: true, name: true } },
    },
  },
} satisfies Prisma.OrderAuditInclude;

const toResponse = (a: Prisma.OrderAuditGetPayload<{ include: typeof auditInclude }>) => ({
  id: a.id,
  date: a.date,
  result: a.result as AuditResult,
  auditedAt: a.auditedAt,
  auditedBy: a.auditedBy,
  order: { ...a.order, totalAmount: Number(a.order.totalAmount) },
});

export const auditService = {
  /** Các đơn đã quét trong ngày (mọi máy) — màn Rà soát gọi lại mỗi vài giây để đồng bộ. */
  async list(date: string = todayVN()) {
    const items = await prisma.orderAudit.findMany({
      where: { date },
      orderBy: { auditedAt: 'desc' },
      include: auditInclude,
    });
    return { date, items: items.map(toResponse) };
  },

  /**
   * Ghi nhận 1 lần quét bịch hôm nay. Đơn đã được quét (bởi máy khác) → trả về bản cũ
   * + duplicate=true để máy này báo "X đã quét lúc …" thay vì ghi trùng.
   */
  async mark(
    input: { orderId: string; result: AuditResult },
    userId: string,
    req?: { ip?: string; userAgent?: string },
  ) {
    const date = todayVN();
    const order = await prisma.order.findUnique({ where: { id: input.orderId }, select: { id: true } });
    if (!order) throw new NotFoundError('Không tìm thấy đơn');

    const existing = await prisma.orderAudit.findUnique({
      where: { orderId_date: { orderId: input.orderId, date } },
      include: auditInclude,
    });
    if (existing) return { duplicate: true, audit: toResponse(existing) };

    // Lần quét đầu tiên của người này hôm nay = "bắt đầu rà soát" → báo chủ tiệm
    const firstOfUserToday = (await prisma.orderAudit.count({ where: { date, auditedById: userId } })) === 0;

    try {
      const created = await prisma.orderAudit.create({
        data: { shopId: getCurrentShopId(), date, orderId: input.orderId, result: input.result, auditedById: userId },
        include: auditInclude,
      });
      await scanHistoryService.log({
        orderId: input.orderId,
        userId,
        action: 'AUDIT',
        ip: req?.ip,
        userAgent: req?.userAgent,
        meta: { result: input.result, date },
      });
      if (firstOfUserToday) {
        const onShelf = await prisma.order.count({ where: { status: 'READY' } });
        void notifyAdmins(
          prisma,
          `🔍 ${created.auditedBy.name} bắt đầu rà soát kệ`,
          `Bắt đầu lúc ${fmtVNTime(created.auditedAt)} · ${onShelf} bịch chờ giao trên kệ`,
          { type: 'AUDIT_STARTED', userId },
          userId,
        );
      }
      return { duplicate: false, audit: toResponse(created) };
    } catch (e) {
      // 2 máy quét cùng lúc 1 bịch → máy sau đọc lại bản đã ghi
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        const again = await prisma.orderAudit.findUniqueOrThrow({
          where: { orderId_date: { orderId: input.orderId, date } },
          include: auditInclude,
        });
        return { duplicate: true, audit: toResponse(again) };
      }
      throw e;
    }
  },

  /** "Bắt đầu lại": xoá kết quả rà soát hôm nay (của mọi máy). */
  async reset(date: string = todayVN()) {
    const { count } = await prisma.orderAudit.deleteMany({ where: { date } });
    return { date, deleted: count };
  },

  /** Lịch sử rà soát theo tháng ("YYYY-MM"): mỗi ngày bao nhiêu bịch, bất thường, ai quét, giờ đầu/cuối. */
  async summary(month: string) {
    const rows = await prisma.orderAudit.findMany({
      where: { date: { startsWith: month } },
      select: { date: true, result: true, auditedAt: true, auditedBy: { select: { name: true } } },
      orderBy: { auditedAt: 'asc' },
    });
    const byDay = new Map<
      string,
      { date: string; verified: number; anomaly: number; users: Map<string, number>; firstAt: Date; lastAt: Date }
    >();
    for (const r of rows) {
      let d = byDay.get(r.date);
      if (!d) {
        d = { date: r.date, verified: 0, anomaly: 0, users: new Map(), firstAt: r.auditedAt, lastAt: r.auditedAt };
        byDay.set(r.date, d);
      }
      if (r.result === 'ANOMALY') d.anomaly += 1;
      else d.verified += 1;
      d.users.set(r.auditedBy.name, (d.users.get(r.auditedBy.name) ?? 0) + 1);
      d.lastAt = r.auditedAt;
    }
    return {
      month,
      days: [...byDay.values()]
        .sort((a, b) => b.date.localeCompare(a.date))
        .map((d) => ({
          date: d.date,
          verified: d.verified,
          anomaly: d.anomaly,
          firstAt: d.firstAt,
          lastAt: d.lastAt,
          users: [...d.users.entries()].map(([name, count]) => ({ name, count })),
        })),
    };
  },
};
