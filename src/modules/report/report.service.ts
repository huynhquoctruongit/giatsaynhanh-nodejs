import { prisma } from '../../config/prisma';

// Server chạy UTC (Render) → phải tính mốc ngày theo giờ VN (UTC+7), nếu không
// các số tổng quan sẽ reset lúc 7h sáng VN (nửa đêm UTC) thay vì nửa đêm VN.
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
const dayRange = (date: Date) => {
  const shifted = new Date(date.getTime() + VN_OFFSET_MS);
  shifted.setUTCHours(0, 0, 0, 0); // đầu ngày theo giờ VN
  const start = new Date(shifted.getTime() - VN_OFFSET_MS);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
  return { start, end };
};

const dateRange = (from?: Date, to?: Date) => ({
  ...(from ? { gte: from } : {}),
  ...(to ? { lte: to } : {}),
});

export const reportService = {
  async dashboard(date: Date = new Date()) {
    const { start, end } = dayRange(date);

    const [
      revenueResult,
      deliveredRevenueResult,
      newOrders,
      deliveredOrders,
      ordersByStatus,
    ] = await Promise.all([
      // Doanh thu = tổng tiền MỌI đơn tạo trong ngày, trừ đơn đã huỷ
      // (đơn bị xoá đã không còn trong DB nên tự loại)
      prisma.order.aggregate({
        where: {
          status: { not: 'CANCELLED' },
          createdAt: { gte: start, lte: end },
        },
        _sum: { totalAmount: true },
      }),
      // Lợi nhuận = tổng tiền đơn THU TIỀN trong ngày (đơn nợ chưa thu → chưa tính)
      prisma.order.aggregate({
        where: { paidAt: { gte: start, lte: end } },
        _sum: { totalAmount: true },
      }),
      prisma.order.count({ where: { createdAt: { gte: start, lte: end } } }),
      prisma.order.count({
        where: { status: 'DELIVERED', deliveredAt: { gte: start, lte: end } },
      }),
      prisma.order.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
    ]);

    const revenue = Number(revenueResult._sum.totalAmount ?? 0);
    const profit = Number(deliveredRevenueResult._sum.totalAmount ?? 0);

    const statusMap: Record<string, number> = {};
    for (const row of ordersByStatus) {
      statusMap[row.status] = row._count.id;
    }

    const allStatuses = ['CREATED', 'RECEIVED', 'WASHING', 'READY', 'DELIVERED', 'CANCELLED'];
    const statusLabels: Record<string, string> = {
      CREATED: 'Đơn mới',
      RECEIVED: 'Đã nhận',
      WASHING: 'Đang giặt',
      READY: 'Sẵn sàng',
      DELIVERED: 'Đã giao',
      CANCELLED: 'Đã hủy',
    };
    const actionStatuses = ['CREATED', 'RECEIVED', 'WASHING', 'READY'];

    const ordersByStatusFormatted = Object.fromEntries(
      allStatuses.map((s) => [s, statusMap[s] ?? 0]),
    );

    const todoList = actionStatuses
      .map((s) => ({ status: s, label: statusLabels[s], count: statusMap[s] ?? 0 }))
      .filter((t) => t.count > 0);

    return {
      revenue,
      profit,
      newOrders,
      deliveredOrders,
      ordersByStatus: ordersByStatusFormatted,
      todoList,
    };
  },

  async financial(params: { from?: Date; to?: Date }) {
    const { from, to } = params;
    const filter = dateRange(from, to);

    const [revenueResult, expenseResult, incomeByCategory, expenseByCategory, dailyOrders] =
      await Promise.all([
        prisma.order.aggregate({
          where: { paidAt: { not: null, ...filter } },
          _sum: { totalAmount: true },
        }),
        prisma.transaction.aggregate({
          where: { type: 'EXPENSE', date: filter },
          _sum: { amount: true },
        }),
        prisma.transaction.groupBy({
          by: ['category'],
          where: { type: 'INCOME', date: filter },
          _sum: { amount: true },
          orderBy: { _sum: { amount: 'desc' } },
        }),
        prisma.transaction.groupBy({
          by: ['category'],
          where: { type: 'EXPENSE', date: filter },
          _sum: { amount: true },
          orderBy: { _sum: { amount: 'desc' } },
        }),
        prisma.order.findMany({
          where: { paidAt: { not: null, ...filter } },
          select: { paidAt: true, totalAmount: true },
        }),
      ]);

    const revenue = Number(revenueResult._sum.totalAmount ?? 0);
    const expenses = Number(expenseResult._sum.amount ?? 0);
    const profit = revenue - expenses;

    // Group by date
    const dailyMap: Record<string, number> = {};
    for (const order of dailyOrders) {
      if (!order.paidAt) continue;
      const key = order.paidAt.toISOString().slice(0, 10);
      dailyMap[key] = (dailyMap[key] ?? 0) + Number(order.totalAmount);
    }
    const dailyRevenue = Object.entries(dailyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, amount]) => ({ date, amount }));

    return {
      revenue,
      expenses,
      profit,
      incomeByCategory: incomeByCategory.map((r) => ({
        category: r.category,
        total: Number(r._sum.amount ?? 0),
      })),
      expenseByCategory: expenseByCategory.map((r) => ({
        category: r.category,
        total: Number(r._sum.amount ?? 0),
      })),
      dailyRevenue,
    };
  },

  async sales(params: { from?: Date; to?: Date }) {
    const { from, to } = params;
    const filter = dateRange(from, to);

    const [totalOrders, revenueResult, ordersByStatus, topProductsRaw] = await Promise.all([
      prisma.order.count({ where: { createdAt: filter } }),
      prisma.order.aggregate({
        where: { paidAt: { not: null, ...filter } },
        _sum: { totalAmount: true },
      }),
      prisma.order.groupBy({
        by: ['status'],
        where: { createdAt: filter },
        _count: { id: true },
      }),
      prisma.orderItem.groupBy({
        by: ['name'],
        where: { order: { createdAt: filter } },
        _count: { id: true },
        _sum: { unitPrice: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
    ]);

    const totalRevenue = Number(revenueResult._sum.totalAmount ?? 0);
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const statusMap: Record<string, number> = {};
    for (const row of ordersByStatus) {
      statusMap[row.status] = row._count.id;
    }

    return {
      totalOrders,
      totalRevenue,
      avgOrderValue,
      topProducts: topProductsRaw.map((r) => ({
        name: r.name,
        count: r._count.id,
        revenue: Number(r._sum.unitPrice ?? 0),
      })),
      ordersByStatus: statusMap,
    };
  },

  async inventory() {
    const [totalItems, allItems, recentImports, recentExports] = await Promise.all([
      prisma.inventoryItem.count({ where: { isActive: true } }),
      prisma.inventoryItem.findMany({
        where: { isActive: true, minQuantity: { not: null } },
        select: { id: true, name: true, quantity: true, minQuantity: true, unit: true },
      }),
      prisma.inventoryLog.findMany({
        where: { type: 'IMPORT' },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          item: { select: { id: true, name: true, unit: true } },
          createdBy: { select: { id: true, name: true } },
        },
      }),
      prisma.inventoryLog.findMany({
        where: { type: 'EXPORT' },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          item: { select: { id: true, name: true, unit: true } },
          createdBy: { select: { id: true, name: true } },
        },
      }),
    ]);

    const lowStockItems = allItems.filter(
      (item) => item.minQuantity !== null && item.quantity <= item.minQuantity,
    );

    return {
      totalItems,
      lowStockItems,
      recentImports,
      recentExports,
    };
  },
};
