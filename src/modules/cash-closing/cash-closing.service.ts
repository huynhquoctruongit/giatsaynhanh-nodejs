import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { getCurrentShopId } from '../../helpers/context/tenant-context';
import { BadRequestError, ConflictError, NotFoundError } from '../../helpers/utils/errors';
import { calcGrandTotal } from '../../helpers/utils/invoice-totals';
import { fmtMoney } from '../../helpers/utils/notify-format';
import { sendPush } from '../../lib/firebase';
import type { CreateCashClosingInput } from '../../helpers/validators/cash-closing.schema';

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Mệnh giá tiền Việt dùng khi đếm két. */
export const DENOMINATIONS = [500000, 200000, 100000, 50000, 20000, 10000, 5000, 2000, 1000, 500];

export function todayVN(): string {
  return new Date(Date.now() + VN_OFFSET_MS).toISOString().slice(0, 10);
}

function dayRangeVN(date: string) {
  const [y, m, d] = date.split('-').map(Number);
  const from = new Date(Date.UTC(y, m - 1, d) - VN_OFFSET_MS);
  return { from, to: new Date(from.getTime() + DAY_MS) };
}

const closingInclude = { closedBy: { select: { id: true, name: true } } } satisfies Prisma.CashClosingInclude;

export const cashClosingService = {
  /**
   * Số liệu hệ thống tự tính cho 1 ngày (giờ VN):
   *  - đã thu = tổng tiền cần thu của các đơn có mốc thanh toán (paidAt) trong ngày
   *  - chuyển khoản = tổng tiền vào tài khoản (GPM Pay: QR cửa hàng + QR hoá đơn) trong ngày
   *  - tiền mặt phải có (chưa trừ chi phí) = đầu ngày + đã thu − chuyển khoản
   */
  async preview(date: string = todayVN()) {
    const shopId = getCurrentShopId();
    const { from, to } = dayRangeVN(date);

    const [settings, paidOrders, transferAgg, closing] = await Promise.all([
      prisma.shopSettings.findUnique({
        where: { shopId },
        select: { openingCash: true, bookingShippingFee: true, freeShipThreshold: true },
      }),
      prisma.order.findMany({
        where: { paidAt: { gte: from, lt: to }, status: { not: 'CANCELLED' } },
        select: { totalAmount: true, discountAmount: true, bookingFromConvert: { select: { id: true } } },
      }),
      // BankTransaction không tự scope theo tiệm (webhook không có tenant context) → lọc tay
      prisma.bankTransaction.aggregate({
        where: { shopId, direction: 'IN', transactionAt: { gte: from, lt: to } },
        _sum: { amount: true },
        _count: { id: true },
      }),
      prisma.cashClosing.findUnique({
        where: { shopId_date: { shopId, date } },
        include: closingInclude,
      }),
    ]);

    const openingCash = Number(settings?.openingCash ?? 750000);
    const collected = paidOrders.reduce(
      (sum, o) => sum + calcGrandTotal({ ...o, fromBooking: !!o.bookingFromConvert }, settings),
      0,
    );
    const transfers = Number(transferAgg._sum.amount ?? 0);

    return {
      date,
      openingCash,
      collected,
      orderCount: paidOrders.length,
      transfers,
      transferCount: transferAgg._count.id,
      cashFromOrders: collected - transfers,
      expectedBeforeExpenses: openingCash + collected - transfers,
      denominations: DENOMINATIONS,
      closing,
    };
  },

  /** Nhân viên chốt két. Số liệu tính lại ở server (không tin số từ máy) và lưu lại làm sổ. */
  async create(input: CreateCashClosingInput, closedById: string) {
    const date = input.date ?? todayVN();
    if (date > todayVN()) throw new BadRequestError('Không chốt két cho ngày trong tương lai');
    const p = await this.preview(date);
    if (p.closing) throw new ConflictError(`Ngày ${date} đã chốt két rồi`);

    const countedCash = DENOMINATIONS.reduce(
      (sum, d) => sum + d * (input.denominations[String(d)] ?? 0),
      0,
    );
    const expenses = input.expenses ?? 0;
    const expectedCash = p.expectedBeforeExpenses - expenses;
    const difference = countedCash - expectedCash;
    if (difference !== 0 && !input.note?.trim()) {
      throw new BadRequestError('Két lệch tiền — vui lòng ghi lý do');
    }

    const closing = await prisma.cashClosing.create({
      data: {
        shopId: getCurrentShopId(),
        date,
        openingCash: p.openingCash,
        collected: p.collected,
        transfers: p.transfers,
        expenses,
        expenseNote: input.expenseNote?.trim() || null,
        expectedCash,
        countedCash,
        difference,
        denominations: input.denominations,
        note: input.note?.trim() || null,
        closedById,
      },
      include: closingInclude,
    });

    // Báo chủ tiệm (tài khoản ADMIN) ngay khi chốt
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN', isActive: true, fcmToken: { not: null } },
      select: { fcmToken: true },
    });
    const status =
      difference === 0 ? '✅ khớp' : difference < 0 ? `🔴 thiếu ${fmtMoney(-difference)}` : `🟡 dư ${fmtMoney(difference)}`;
    void sendPush(
      admins.map((a) => a.fcmToken!),
      `💵 Chốt két ${date.split('-').reverse().slice(0, 2).join('/')} — ${status}`,
      `${closing.closedBy.name}: thu ${fmtMoney(p.collected)} (CK ${fmtMoney(p.transfers)}). ` +
        `Két đếm ${fmtMoney(countedCash)} / phải có ${fmtMoney(expectedCash)}` +
        (expenses ? ` · chi ${fmtMoney(expenses)}` : ''),
      { type: 'CASH_CLOSING', id: closing.id },
    );

    return closing;
  },

  /** Sổ chốt két theo tháng ("YYYY-MM"), mới nhất trước. */
  async list(month: string) {
    const items = await prisma.cashClosing.findMany({
      where: { date: { startsWith: month } },
      orderBy: { date: 'desc' },
      include: closingInclude,
    });
    const sum = (k: 'collected' | 'transfers' | 'expenses' | 'difference') =>
      items.reduce((s, i) => s + Number(i[k]), 0);
    return {
      month,
      items,
      totals: {
        days: items.length,
        collected: sum('collected'),
        transfers: sum('transfers'),
        expenses: sum('expenses'),
        difference: sum('difference'),
        mismatchDays: items.filter((i) => Number(i.difference) !== 0).length,
      },
    };
  },

  /** ADMIN xoá 1 lần chốt (để nhân viên chốt lại nếu nhập sai). */
  async remove(id: string) {
    const existed = await prisma.cashClosing.findUnique({ where: { id } });
    if (!existed) throw new NotFoundError('Không tìm thấy lần chốt két');
    await prisma.cashClosing.delete({ where: { id } });
  },
};
