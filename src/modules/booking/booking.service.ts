import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { BookingStatus } from '../../helpers/enums';
import { BadRequestError, NotFoundError } from '../../helpers/utils/errors';
import { generateOrderCode } from '../../helpers/utils/order-code';
import { generateQrToken } from '../../helpers/utils/qr';
import { sendPush, getActiveTokens } from '../../lib/firebase';
import { fmtVNTime } from '../../helpers/utils/notify-format';
import type {
  ConvertBookingInput,
  CreateBookingFromQrInput,
} from '../../helpers/validators/booking.schema';

// Resolve token → { customer, sourceOrder }
// Supports both new customer-level QR and legacy order-level QR (backward compat).
async function resolveCustomerFromToken(token: string) {
  // New: customer-level QR (permanent)
  const customer = await prisma.customer.findUnique({
    where: { qrToken: token },
  });
  if (customer) {
    const sourceOrder = await prisma.order.findFirst({
      where: { customerId: customer.id },
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    });
    return { customer, sourceOrder };
  }

  // Legacy: order-level QR (backward compat for already-printed invoices)
  const order = await prisma.order.findUnique({
    where: { qrToken: token },
    include: { customer: true, items: true },
  });
  if (!order) throw new NotFoundError('Mã QR không hợp lệ hoặc đã bị huỷ');
  if (!order.customer) throw new NotFoundError('Đơn không có khách hàng');
  return { customer: order.customer, sourceOrder: order };
}

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
  /**
   * QR "đặt đơn tại cửa" (generic): nhận diện khách theo SĐT.
   * Có khách → dùng lại (cập nhật địa chỉ nếu khác); chưa có → tạo mới.
   * Trả về qrToken của khách để FE lưu localStorage + chuyển vào flow /q/{token}.
   */
  async identifyCustomer(input: { phone: string; name?: string; address?: string }) {
    const phone = input.phone.trim();
    if (!phone) throw new BadRequestError('Vui lòng nhập số điện thoại');
    const name = input.name?.trim();
    const address = input.address?.trim();

    let customer = await prisma.customer.findFirst({
      where: { phone },
      orderBy: { createdAt: 'desc' },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: { name: name || `Khách ${phone}`, phone, address: address || null },
      });
    } else if (address && address !== (customer.address ?? '')) {
      customer = await prisma.customer.update({
        where: { id: customer.id },
        data: { address },
      });
    }

    return { token: customer.qrToken, name: customer.name };
  },

  async getQrPrefill(token: string) {
    const { customer, sourceOrder } = await resolveCustomerFromToken(token);

    const [activeOrders, services, hiddenProducts] = await Promise.all([
      prisma.order.findMany({
        where: {
          customerId: customer.id,
          status: { notIn: ['DELIVERED', 'CANCELLED'] },
        },
        include: { items: true },
        orderBy: { createdAt: 'desc' },
        take: 2,
      }),
      prisma.product.findMany({
        // Ẩn dịch vụ nội bộ (Phụ thu...) khỏi web đặt lịch của khách
        where: { isActive: true, hiddenFromBooking: false },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        take: 100,
      }),
      // Dịch vụ bị ẩn — để lọc cả khỏi danh sách "đặt lại đơn cũ" (items điền sẵn)
      prisma.product.findMany({
        where: { hiddenFromBooking: true },
        select: { id: true },
      }),
    ]);
    const hiddenProductIds = new Set(hiddenProducts.map((p) => p.id));

    return {
      sourceOrder: sourceOrder
        ? { id: sourceOrder.id, code: sourceOrder.code, createdAt: sourceOrder.createdAt }
        : null,
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        address: customer.address,
      },
      items: (sourceOrder?.items ?? [])
        // Bỏ dịch vụ đã ẩn khỏi web khỏi phần "đặt lại đơn cũ"
        .filter((i) => !i.productId || !hiddenProductIds.has(i.productId))
        .map((i) => ({
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
    const { customer, sourceOrder } = await resolveCustomerFromToken(token);

    const customerId = customer.id;
    const trimmedPhone = input.phone.trim();
    const trimmedAddress = input.address.trim();

    const booking = await prisma.$transaction(async (tx) => {
      // Khách quét QR nhập SĐT/địa chỉ → cập nhật thẳng vào hồ sơ khách
      // (phone không còn unique nên luôn cập nhật được, kể cả trùng số)
      const customerUpdate: Prisma.CustomerUpdateInput = {};
      if (trimmedPhone && trimmedPhone !== customer.phone) {
        customerUpdate.phone = trimmedPhone;
      }
      if (trimmedAddress && trimmedAddress !== (customer.address ?? '')) {
        customerUpdate.address = trimmedAddress;
      }
      if (Object.keys(customerUpdate).length > 0) {
        await tx.customer.update({ where: { id: customerId }, data: customerUpdate });
      }

      return tx.booking.create({
        data: {
          code: generateBookingCode(),
          status: BookingStatus.PENDING,
          customerId,
          sourceOrderId: sourceOrder?.id,
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

    // Push: khách vừa đặt lịch giao nhận tận nhà
    getActiveTokens(prisma).then((tokens) =>
      sendPush(
        tokens,
        'Đặt giao nhận',
        `${booking.customer?.name ?? 'Khách'} - ${booking.phone || booking.customer?.phone || '—'} - ${booking.pickupAt ? fmtVNTime(booking.pickupAt) : 'chưa hẹn giờ'}`,
        { bookingId: booking.id, type: 'NEW_BOOKING' },
      ),
    );

    return booking;
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

    // Tính tổng theo cân nặng nếu có (giống đơn thường): có cân → cân × đơn giá × SL
    const total = items.reduce((sum, i) => {
      const w = i.weight ? Number(i.weight) : 0;
      const line = w > 0 ? w * i.unitPrice * (i.quantity || 1) : i.quantity * i.unitPrice;
      return sum + line;
    }, 0);
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

  async update(
    id: string,
    input: {
      note?: string | null;
      phone?: string;
      address?: string;
      pickupAt?: string | null;
      deliveryAt?: string | null;
    },
    isAdmin = false,
  ) {
    const booking = await this.getById(id);
    if (!isAdmin && (booking.status === BookingStatus.CONVERTED || booking.status === BookingStatus.CANCELLED)) {
      throw new BadRequestError('Không thể sửa đặt lịch đã chuyển đơn hoặc đã huỷ');
    }
    return prisma.booking.update({
      where: { id },
      data: {
        note: input.note,
        phone: input.phone,
        address: input.address,
        pickupAt: input.pickupAt !== undefined ? (input.pickupAt ? new Date(input.pickupAt) : null) : undefined,
        deliveryAt: input.deliveryAt !== undefined ? (input.deliveryAt ? new Date(input.deliveryAt) : null) : undefined,
      },
      include: bookingInclude,
    });
  },

  async remove(id: string, isAdmin = false) {
    const booking = await this.getById(id);
    if (!isAdmin && booking.status === BookingStatus.CONVERTED) {
      throw new BadRequestError('Không thể xoá đặt lịch đã chuyển thành đơn');
    }
    await prisma.booking.delete({ where: { id } });
  },
};
