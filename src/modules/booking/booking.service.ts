import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { BookingStatus } from '../../helpers/enums';
import { BadRequestError, NotFoundError } from '../../helpers/utils/errors';
import { generateOrderCode } from '../../helpers/utils/order-code';
import { generateQrToken } from '../../helpers/utils/qr';
import type {
  ConvertBookingInput,
  CreateBookingFromQrInput,
} from '../../helpers/validators/booking.schema';

const bookingInclude = {
  items: true,
  customer: true,
  sourceOrder: { select: { id: true, code: true } },
  convertedOrder: { select: { id: true, code: true } },
} satisfies Prisma.BookingInclude;

const generateBookingCode = (): string => {
  const code = generateOrderCode();
  return code.replace(/^LD-/, 'BK-');
};

export const bookingService = {
  async getQrPrefill(token: string) {
    const order = await prisma.order.findUnique({
      where: { qrToken: token },
      include: { customer: true, items: true },
    });
    if (!order) throw new NotFoundError('Mã QR không hợp lệ hoặc đã bị huỷ');
    if (!order.customer) throw new NotFoundError('Đơn không có khách hàng');

    const [activeOrders, services] = await Promise.all([
      prisma.order.findMany({
        where: {
          customerId: order.customer.id,
          status: { notIn: ['DELIVERED', 'CANCELLED'] },
        },
        include: { items: true },
        orderBy: { createdAt: 'desc' },
        take: 2,
      }),
      prisma.product.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
        take: 100,
      }),
    ]);

    return {
      sourceOrder: {
        id: order.id,
        code: order.code,
        createdAt: order.createdAt,
      },
      customer: {
        id: order.customer.id,
        name: order.customer.name,
        phone: order.customer.phone,
        address: order.customer.address,
      },
      items: order.items.map((i) => ({
        productId: i.productId,
        name: i.name,
        quantity: i.quantity,
        weight: i.weight ? Number(i.weight) : null,
        unitPrice: Number(i.unitPrice),
      })),
      activeOrders: activeOrders.map((o) => ({
        id: o.id,
        code: o.code,
        status: o.status,
        totalAmount: Number(o.totalAmount),
        createdAt: o.createdAt,
        pickupAt: o.pickupAt,
        items: o.items.map((i) => ({
          name: i.name,
          quantity: i.quantity,
          weight: i.weight ? Number(i.weight) : null,
        })),
      })),
      services: services.map((p) => ({
        id: p.id,
        name: p.name,
        unit: p.unit,
        price: Number(p.price),
      })),
    };
  },

  async createFromQr(token: string, input: CreateBookingFromQrInput) {
    const order = await prisma.order.findUnique({
      where: { qrToken: token },
      include: { customer: true },
    });
    if (!order) throw new NotFoundError('Mã QR không hợp lệ hoặc đã bị huỷ');
    if (!order.customer) throw new NotFoundError('Đơn không có khách hàng');

    const customerId = order.customer.id;
    const trimmedPhone = input.phone.trim();
    const trimmedAddress = input.address.trim();

    return prisma.$transaction(async (tx) => {
      const customerUpdate: Prisma.CustomerUpdateInput = {};
      if (trimmedPhone && trimmedPhone !== order.customer!.phone) {
        const existing = await tx.customer.findUnique({
          where: { phone: trimmedPhone },
        });
        if (!existing || existing.id === customerId) {
          customerUpdate.phone = trimmedPhone;
        }
      }
      if (trimmedAddress && trimmedAddress !== (order.customer!.address ?? '')) {
        customerUpdate.address = trimmedAddress;
      }
      if (Object.keys(customerUpdate).length > 0) {
        await tx.customer.update({
          where: { id: customerId },
          data: customerUpdate,
        });
      }

      return tx.booking.create({
        data: {
          code: generateBookingCode(),
          status: BookingStatus.PENDING,
          customerId,
          sourceOrderId: order.id,
          phone: trimmedPhone,
          address: trimmedAddress,
          pickupAt: input.pickupAt,
          deliveryAt: input.deliveryAt,
          note: input.note,
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
        include: bookingInclude,
      });
    });
  },

  async list(params: {
    search?: string;
    status?: BookingStatus;
    customerId?: string;
    page: number;
    pageSize: number;
  }) {
    const { search, status, customerId, page, pageSize } = params;
    const where: Prisma.BookingWhereInput = {
      ...(status ? { status } : {}),
      ...(customerId ? { customerId } : {}),
      ...(search
        ? {
            OR: [
              { code: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search } },
              { address: { contains: search, mode: 'insensitive' } },
              { customer: { name: { contains: search, mode: 'insensitive' } } },
              { customer: { phone: { contains: search } } },
            ],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      prisma.booking.count({ where }),
      prisma.booking.findMany({
        where,
        include: bookingInclude,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return { items, total, page, pageSize };
  },

  async getById(id: string) {
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: bookingInclude,
    });
    if (!booking) throw new NotFoundError('Booking không tồn tại');
    return booking;
  },

  async updateStatus(id: string, status: BookingStatus, _reason?: string) {
    const booking = await this.getById(id);
    if (
      booking.status === BookingStatus.CONVERTED ||
      booking.status === BookingStatus.CANCELLED
    ) {
      throw new BadRequestError(
        'Không thể đổi trạng thái booking đã chuyển đổi hoặc đã huỷ',
      );
    }
    if (
      status !== BookingStatus.CONFIRMED &&
      status !== BookingStatus.CANCELLED
    ) {
      throw new BadRequestError('Trạng thái không hợp lệ');
    }
    return prisma.booking.update({
      where: { id },
      data: { status },
      include: bookingInclude,
    });
  },

  async convertToOrder(
    id: string,
    input: ConvertBookingInput,
    createdById?: string,
  ) {
    const booking = await this.getById(id);
    if (booking.status === BookingStatus.CONVERTED) {
      throw new BadRequestError('Booking đã được chuyển thành đơn');
    }
    if (booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestError('Booking đã bị huỷ, không thể chuyển đổi');
    }

    const items = input.items?.length
      ? input.items
      : booking.items.map((i) => ({
          productId: i.productId ?? undefined,
          name: i.name,
          quantity: i.quantity,
          weight: i.weight ? Number(i.weight) : undefined,
          unitPrice: Number(i.unitPrice),
        }));

    const total = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
    const discountAmount = input.discountAmount ?? 0;

    return prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          code: generateOrderCode(),
          qrToken: generateQrToken(),
          customerId: booking.customerId,
          note: input.note ?? booking.note ?? undefined,
          pickupAt: input.pickupAt ?? booking.pickupAt ?? undefined,
          totalAmount: total,
          discountAmount,
          createdById,
          items: {
            create: items.map((i) => ({
              productId: i.productId,
              name: i.name,
              quantity: i.quantity,
              weight: i.weight,
              unitPrice: i.unitPrice,
            })),
          },
        },
      });

      await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: BookingStatus.CONVERTED,
          convertedOrderId: order.id,
        },
      });

      return tx.booking.findUniqueOrThrow({
        where: { id: booking.id },
        include: bookingInclude,
      });
    });
  },
};
