import { Prisma } from '@prisma/client';
import { OrderStatus } from '../../helpers/enums';
import { prisma } from '../../config/prisma';
import { BadRequestError, NotFoundError } from '../../helpers/utils/errors';
import { generateOrderCode } from '../../helpers/utils/order-code';
import { generateQrToken } from '../../helpers/utils/qr';
import { sendPush, getActiveTokens } from '../../lib/firebase';
import type {
  CreateOrderInput,
  UpdateOrderInput,
} from '../../helpers/validators/order.schema';

const orderInclude = {
  items: true,
  customer: true,
  assignedTo: { select: { id: true, name: true } },
  bookingFromConvert: { select: { id: true, code: true } },
} satisfies Prisma.OrderInclude;

// Nếu có cân (weight) thì lấy: cân × đơn giá × SL (giặt sấy tính theo kg)
// Nếu không có cân thì lấy: SL × đơn giá (giặt khô tính theo cái)
const lineTotal = (i: { quantity: number; unitPrice: number; weight?: number | null }) =>
  i.weight && i.weight > 0
    ? i.weight * i.unitPrice * (i.quantity || 1)
    : i.quantity * i.unitPrice;

const calcTotal = (items: CreateOrderInput['items']) =>
  items.reduce((sum, i) => sum + lineTotal(i), 0);

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  // Đơn được tạo ở trạng thái READY (đã giặt xong), chỉ chờ khách lấy
  CREATED: [OrderStatus.READY, OrderStatus.CANCELLED],
  RECEIVED: [OrderStatus.READY, OrderStatus.CANCELLED],
  WASHING: [OrderStatus.READY, OrderStatus.CANCELLED],
  READY: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
  DELIVERED: [],
  CANCELLED: [],
};

export const orderService = {
  /** Đếm số đơn theo từng trạng thái (dùng cho chips ở màn danh sách) */
  async statusCounts(): Promise<Record<string, number>> {
    const groups = await prisma.order.groupBy({
      by: ['status'],
      _count: { id: true },
    });
    const counts: Record<string, number> = {};
    for (const g of groups) counts[g.status] = g._count.id;
    return counts;
  },

  async list(params: {
    search?: string;
    status?: OrderStatus;
    customerId?: string;
    page: number;
    pageSize: number;
  }) {
    const { search, status, customerId, page, pageSize } = params;
    const where: Prisma.OrderWhereInput = {
      ...(status ? { status } : {}),
      ...(customerId ? { customerId } : {}),
      ...(search
        ? {
            OR: [
              { code: { contains: search } },
              { customer: { name: { contains: search } } },
              { customer: { phone: { contains: search } } },
            ],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        include: orderInclude,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return { items, total, page, pageSize };
  },

  async getById(id: string) {
    const order = await prisma.order.findUnique({
      where: { id },
      include: orderInclude,
    });
    if (!order) throw new NotFoundError('Order not found');
    return order;
  },

  async getByToken(token: string) {
    const order = await prisma.order.findUnique({
      where: { qrToken: token },
      include: orderInclude,
    });
    if (!order) throw new NotFoundError('Invalid QR token');
    return order;
  },

  async create(input: CreateOrderInput, createdById?: string) {
    const customer = await prisma.customer.findUnique({
      where: { id: input.customerId },
    });
    if (!customer) throw new NotFoundError('Customer not found');

    const total = calcTotal(input.items);
    const discountAmount = input.discountAmount ?? 0;

    const order = await prisma.order.create({
      data: {
        code: generateOrderCode(),
        qrToken: generateQrToken(),
        customerId: input.customerId,
        status: OrderStatus.READY,
        note: input.note,
        pickupAt: input.pickupAt,
        totalAmount: total,
        discountAmount,
        assignedToId: input.assignedToId,
        createdById,
        items: {
          create: input.items.map((i) => ({
            productId: i.productId,
            name: i.name,
            quantity: i.quantity,
            weight: i.weight,
            unitPrice: i.unitPrice,
          })),
        },
      },
      include: orderInclude,
    });

    // Push notification — fire and forget
    getActiveTokens(prisma).then((tokens) =>
      sendPush(
        tokens,
        '🧺 Đơn mới',
        `${order.code} · ${order.customer?.name ?? 'Khách'}`,
        { orderId: order.id, type: 'NEW_ORDER' },
      ),
    );

    return order;
  },

  async update(id: string, input: UpdateOrderInput) {
    const order = await this.getById(id);

    if (order.status === OrderStatus.DELIVERED || order.status === OrderStatus.CANCELLED) {
      throw new BadRequestError('Cannot update a delivered/cancelled order');
    }

    const total = input.items ? calcTotal(input.items) : undefined;

    return prisma.$transaction(async (tx) => {
      if (input.items) {
        await tx.orderItem.deleteMany({ where: { orderId: id } });
        await tx.orderItem.createMany({
          data: input.items.map((i) => ({
            orderId: id,
            productId: i.productId,
            name: i.name,
            quantity: i.quantity,
            weight: i.weight,
            unitPrice: i.unitPrice,
          })),
        });
      }

      return tx.order.update({
        where: { id },
        data: {
          note: input.note,
          pickupAt: input.pickupAt,
          ...(total !== undefined ? { totalAmount: total } : {}),
          ...(input.discountAmount !== undefined ? { discountAmount: input.discountAmount } : {}),
          ...(input.assignedToId !== undefined ? { assignedToId: input.assignedToId } : {}),
        },
        include: orderInclude,
      });
    });
  },

  async updateStatus(id: string, status: OrderStatus) {
    const order = await this.getById(id);
    const allowed = VALID_TRANSITIONS[order.status as OrderStatus] ?? [];
    if (!allowed.includes(status)) {
      throw new BadRequestError(
        `Cannot transition from ${order.status} to ${status}`,
      );
    }

    const updated = await prisma.order.update({
      where: { id },
      data: {
        status,
        deliveredAt: status === OrderStatus.DELIVERED ? new Date() : order.deliveredAt,
      },
      include: orderInclude,
    });

    // Push notification khi đơn được giao thành công
    if (status === OrderStatus.DELIVERED) {
      getActiveTokens(prisma).then((tokens) =>
        sendPush(
          tokens,
          '✅ Đơn đã giao',
          `${updated.code} · ${updated.customer?.name ?? 'Khách'} đã nhận đồ`,
          { orderId: updated.id, type: 'ORDER_DELIVERED' },
        ),
      );
    }

    return updated;
  },

  async assign(id: string, assignedToId: string) {
    await this.getById(id);
    return prisma.order.update({
      where: { id },
      data: { assignedToId },
      include: orderInclude,
    });
  },

  async remove(id: string) {
    const order = await this.getById(id);
    if (order.status === OrderStatus.DELIVERED) {
      throw new BadRequestError('Cannot delete a delivered order');
    }
    await prisma.order.delete({ where: { id } });
  },
};
