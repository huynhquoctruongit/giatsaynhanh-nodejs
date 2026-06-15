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

// Doanh thu = đơn ĐÃ GIẶT (READY, tính theo ngày tạo) + ĐÃ GIAO (DELIVERED,
// tính theo ngày giao). Đơn đang xử lý / đã huỷ KHÔNG tính.
async function revenueInRange(filter: { gte?: Date; lte?: Date }) {
  const [ready, delivered] = await Promise.all([
    prisma.order.aggregate({
      where: { status: 'READY', createdAt: filter },
      _sum: { totalAmount: true },
    }),
    prisma.order.aggregate({
      where: { status: 'DELIVERED', deliveredAt: filter },
      _sum: { totalAmount: true },
    }),
  ]);
  return Number(ready._sum.totalAmount ?? 0) + Number(delivered._sum.totalAmount ?? 0);
}

export const reportService = {
  async dashboard(date: Date = new Date()) {
    const { start, end } = dayRange(date);

    const [
      revenue,
      collectedResult,
      newOrders,
      deliveredOrders,
      ordersByStatus,
    ] = await Promise.all([
      // Doanh thu = đơn ĐÃ GIẶT (READY) + ĐÃ GIAO (DELIVERED) trong ngày
      revenueInRange({ gte: start, lte: end }),
      // "Đã thu" = tổng tiền đơn THU TIỀN trong ngày (đơn nợ chưa thu → chưa tính)
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

    // "Đã thu" (FE đang gọi field này là profit) = tiền thực thu trong ngày
    const profit = Number(collectedResult._sum.totalAmount ?? 0);

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

    const [revenue, expenseResult, incomeByCategory, expenseByCategory, readyOrders, deliveredOrders, paidOrders] =
      await Promise.all([
        revenueInRange(filter),
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
          where: { status: 'READY', createdAt: filter },
          select: { createdAt: true, totalAmount: true },
        }),
        prisma.order.findMany({
          where: { status: 'DELIVERED', deliveredAt: filter },
          select: { deliveredAt: true, totalAmount: true },
        }),
        // Tiền thực thu (đã thanh toán) trong khoảng — theo paidAt
        prisma.order.findMany({
          where: { paidAt: filter },
          select: { paidAt: true, totalAmount: true },
        }),
      ]);

    const expenses = Number(expenseResult._sum.amount ?? 0);
    const profit = revenue - expenses;
    // "Lợi nhuận" theo cách hiểu của chủ tiệm = tiền thực thu trong khoảng
    const collected = paidOrders.reduce((s, o) => s + Number(o.totalAmount), 0);

    // Gom theo ngày VN (UTC+7) để khớp mốc ngày người dùng thấy
    const vnDayKey = (d: Date) => new Date(d.getTime() + VN_OFFSET_MS).toISOString().slice(0, 10);

    // Doanh thu theo ngày: đã giặt theo ngày tạo, đã giao theo ngày giao
    const dailyMap: Record<string, number> = {};
    for (const o of readyOrders) {
      const key = vnDayKey(o.createdAt);
      dailyMap[key] = (dailyMap[key] ?? 0) + Number(o.totalAmount);
    }
    for (const o of deliveredOrders) {
      if (!o.deliveredAt) continue;
      const key = vnDayKey(o.deliveredAt);
      dailyMap[key] = (dailyMap[key] ?? 0) + Number(o.totalAmount);
    }
    const dailyRevenue = Object.entries(dailyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, amount]) => ({ date, amount }));

    // Tiền thực thu theo ngày (cho biểu đồ cột "Lợi nhuận theo ngày")
    const collectedMap: Record<string, number> = {};
    for (const o of paidOrders) {
      if (!o.paidAt) continue;
      const key = vnDayKey(o.paidAt);
      collectedMap[key] = (collectedMap[key] ?? 0) + Number(o.totalAmount);
    }
    const dailyCollected = Object.entries(collectedMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, amount]) => ({ date, amount }));

    return {
      revenue,
      expenses,
      profit,
      collected,
      incomeByCategory: incomeByCategory.map((r) => ({
        category: r.category,
        total: Number(r._sum.amount ?? 0),
      })),
      expenseByCategory: expenseByCategory.map((r) => ({
        category: r.category,
        total: Number(r._sum.amount ?? 0),
      })),
      dailyRevenue,
      dailyCollected,
    };
  },

  async sales(params: { from?: Date; to?: Date }) {
    const { from, to } = params;
    const filter = dateRange(from, to);

    const [totalOrders, totalRevenue, ordersByStatus, topProductsRaw] = await Promise.all([
      prisma.order.count({ where: { createdAt: filter } }),
      // Doanh thu = đơn đã giặt + đã giao
      revenueInRange(filter),
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
