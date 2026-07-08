import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { NotFoundError, BadRequestError } from '../../helpers/utils/errors';
import type {
  CreateCustomerInput,
  UpdateCustomerInput,
} from '../../helpers/validators/customer.schema';

export const customerService = {
  async list(params: { search?: string; sort?: 'recent' | 'orders'; page: number; pageSize: number }) {
    const { search, sort, page, pageSize } = params;
    let where: Prisma.CustomerWhereInput = {};
    if (search) {
      // Tìm không dấu: unaccent(name) khớp cả khi gõ có dấu lẫn không dấu
      const rows = await prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM "Customer"
        WHERE unaccent(LOWER(name)) LIKE unaccent(LOWER(${`%${search}%`}))
           OR phone LIKE ${`%${search}%`}
      `;
      where = { id: { in: rows.map((r) => r.id) } };
    }

    const [total, items] = await Promise.all([
      prisma.customer.count({ where }),
      prisma.customer.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { _count: { select: { orders: true } } },
        // sort='orders' → khách giặt nhiều nhất lên đầu
        orderBy:
          sort === 'orders'
            ? [{ orders: { _count: 'desc' } }, { createdAt: 'desc' }]
            : { createdAt: 'desc' },
      }),
    ]);

    return {
      items: items.map(({ _count, ...c }) => ({ ...c, orderCount: _count.orders })),
      total,
      page,
      pageSize,
    };
  },

  async getById(id: string) {
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: { orders: { orderBy: { createdAt: 'desc' }, take: 10 } },
    });
    if (!customer) throw new NotFoundError('Customer not found');
    return customer;
  },

  async create(input: CreateCustomerInput) {
    // Phone rỗng → null để nhiều khách không SĐT không đụng ràng buộc @unique
    const phone = input.phone?.trim() ? input.phone.trim() : null;
    return prisma.customer.create({ data: { ...input, phone } });
  },

  async update(id: string, input: UpdateCustomerInput) {
    await this.getById(id);
    const data: Omit<UpdateCustomerInput, 'phone'> & { phone?: string | null } = { ...input };
    if ('phone' in input) {
      data.phone = input.phone?.trim() ? input.phone.trim() : null;
    }
    return prisma.customer.update({ where: { id }, data });
  },

  async remove(id: string) {
    await this.getById(id);

    // Kiểm tra ràng buộc khoá ngoại trước khi xoá để tránh lỗi 500
    const orderCount = await prisma.order.count({ where: { customerId: id } });
    if (orderCount > 0) {
      throw new BadRequestError('Không thể xoá khách hàng đã có đơn hàng trong hệ thống. Hãy gộp khách hàng hoặc sửa lại đơn hàng trước.');
    }

    const bookingCount = await prisma.booking.count({ where: { customerId: id } });
    if (bookingCount > 0) {
      throw new BadRequestError('Không thể xoá khách hàng đã có lịch đặt trong hệ thống.');
    }

    const debtCount = await prisma.customerDebt.count({ where: { customerId: id } });
    if (debtCount > 0) {
      throw new BadRequestError('Không thể xoá khách hàng đang có lịch sử nợ trong hệ thống.');
    }

    await prisma.customer.delete({ where: { id } });
  },

  /**
   * Thống kê 1 khách: số lần giặt, tổng tiền, TB/đơn, tần suất giặt
   */
  async getStats(id: string) {
    const customer = await prisma.customer.findUnique({ where: { id } });
    if (!customer) throw new NotFoundError('Customer not found');

    // Lấy mọi đơn đã giao của khách (không tính CANCELLED) để tính tiền
    const deliveredOrders = await prisma.order.findMany({
      where: {
        customerId: id,
        status: { notIn: ['CANCELLED'] },
      },
      select: {
        id: true,
        code: true,
        totalAmount: true,
        discountAmount: true,
        status: true,
        createdAt: true,
        deliveredAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const orderCount = deliveredOrders.length;
    const totalSpent = deliveredOrders.reduce(
      (sum, o) =>
        sum + Number(o.totalAmount) - Number(o.discountAmount ?? 0),
      0,
    );
    const avgOrderValue = orderCount > 0 ? totalSpent / orderCount : 0;

    const firstOrder = deliveredOrders[deliveredOrders.length - 1] ?? null;
    const lastOrder = deliveredOrders[0] ?? null;

    const now = Date.now();
    const daysSinceLastOrder = lastOrder
      ? Math.floor(
          (now - new Date(lastOrder.createdAt).getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : null;

    // Tần suất: tính avg interval giữa các đơn liên tiếp
    let averageIntervalDays: number | null = null;
    if (orderCount >= 2) {
      // Sort cũ → mới
      const sorted = [...deliveredOrders].sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
      let total = 0;
      for (let i = 1; i < sorted.length; i++) {
        const diff =
          new Date(sorted[i].createdAt).getTime() -
          new Date(sorted[i - 1].createdAt).getTime();
        total += diff;
      }
      averageIntervalDays = total / (sorted.length - 1) / (1000 * 60 * 60 * 24);
    }

    // Label tần suất
    let frequencyLabel = 'Khách mới';
    let frequencyTone: 'new' | 'frequent' | 'regular' | 'rare' = 'new';
    if (averageIntervalDays !== null) {
      if (averageIntervalDays <= 3) {
        frequencyLabel = 'Hàng ngày';
        frequencyTone = 'frequent';
      } else if (averageIntervalDays <= 9) {
        frequencyLabel = 'Vài ngày / lần';
        frequencyTone = 'frequent';
      } else if (averageIntervalDays <= 17) {
        frequencyLabel = 'Hàng tuần';
        frequencyTone = 'regular';
      } else if (averageIntervalDays <= 35) {
        frequencyLabel = 'Vài tuần / lần';
        frequencyTone = 'regular';
      } else if (averageIntervalDays <= 90) {
        frequencyLabel = 'Hàng tháng';
        frequencyTone = 'regular';
      } else {
        frequencyLabel = 'Thỉnh thoảng';
        frequencyTone = 'rare';
      }
    } else if (orderCount === 1) {
      frequencyLabel = 'Khách mới (1 đơn)';
      frequencyTone = 'new';
    }

    return {
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        address: customer.address,
      },
      orderCount,
      totalSpent,
      avgOrderValue,
      firstOrderAt: firstOrder?.createdAt ?? null,
      lastOrderAt: lastOrder?.createdAt ?? null,
      daysSinceLastOrder,
      averageIntervalDays,
      frequencyLabel,
      frequencyTone,
      // 5 đơn gần đây (cho UI hiển thị nhanh)
      recentOrders: deliveredOrders.slice(0, 5).map((o) => ({
        id: o.id,
        code: o.code,
        totalAmount: Number(o.totalAmount),
        discountAmount: Number(o.discountAmount ?? 0),
        status: o.status,
        createdAt: o.createdAt,
        deliveredAt: o.deliveredAt,
      })),
    };
  },

  /**
   * Top khách hàng theo tổng chi tiêu (mặc định all-time, có thể filter from/to)
   */
  async topCustomers(params: {
    from?: Date;
    to?: Date;
    limit?: number;
  }) {
    const { from, to, limit = 20 } = params;
    const dateFilter =
      from || to
        ? {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: to } : {}),
          }
        : undefined;

    // Group by customerId, sum totalAmount của đơn không huỷ
    const grouped = await prisma.order.groupBy({
      by: ['customerId'],
      where: {
        status: { notIn: ['CANCELLED'] },
        ...(dateFilter ? { createdAt: dateFilter } : {}),
      },
      _sum: {
        totalAmount: true,
        discountAmount: true,
      },
      _count: { id: true },
      _max: { createdAt: true },
      _min: { createdAt: true },
      orderBy: { _sum: { totalAmount: 'desc' } },
      take: limit,
    });

    const customerIds = grouped.map((g) => g.customerId);
    const customers = await prisma.customer.findMany({
      where: { id: { in: customerIds } },
      select: { id: true, name: true, phone: true, address: true },
    });
    const customerMap = new Map(customers.map((c) => [c.id, c]));

    const now = Date.now();
    return grouped.map((g) => {
      const orderCount = g._count.id;
      const totalSpent =
        Number(g._sum.totalAmount ?? 0) -
        Number(g._sum.discountAmount ?? 0);
      const firstAt = g._min.createdAt;
      const lastAt = g._max.createdAt;
      const span =
        firstAt && lastAt && orderCount >= 2
          ? (new Date(lastAt).getTime() - new Date(firstAt).getTime()) /
            (orderCount - 1) /
            (1000 * 60 * 60 * 24)
          : null;
      const daysSinceLast = lastAt
        ? Math.floor((now - new Date(lastAt).getTime()) / (1000 * 60 * 60 * 24))
        : null;

      let frequencyLabel = 'Khách mới';
      if (span !== null) {
        if (span <= 3) frequencyLabel = 'Hàng ngày';
        else if (span <= 9) frequencyLabel = 'Vài ngày / lần';
        else if (span <= 17) frequencyLabel = 'Hàng tuần';
        else if (span <= 35) frequencyLabel = 'Vài tuần / lần';
        else if (span <= 90) frequencyLabel = 'Hàng tháng';
        else frequencyLabel = 'Thỉnh thoảng';
      } else if (orderCount === 1) {
        frequencyLabel = 'Khách mới (1 đơn)';
      }

      return {
        customer: customerMap.get(g.customerId) ?? {
          id: g.customerId,
          name: '—',
          phone: '',
          address: null,
        },
        orderCount,
        totalSpent,
        avgOrderValue: orderCount > 0 ? totalSpent / orderCount : 0,
        firstOrderAt: firstAt,
        lastOrderAt: lastAt,
        daysSinceLastOrder: daysSinceLast,
        averageIntervalDays: span,
        frequencyLabel,
      };
    });
  },
};
