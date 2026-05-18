import type { Booking, BookingItem, Customer, Order } from '@prisma/client';

type BookingWith = Booking & {
  items?: BookingItem[];
  customer?: Customer | null;
  sourceOrder?: Pick<Order, 'id' | 'code'> | null;
  convertedOrder?: Pick<Order, 'id' | 'code'> | null;
};

export const toBookingResponse = (booking: BookingWith) => ({
  id: booking.id,
  code: booking.code,
  status: booking.status,
  phone: booking.phone,
  address: booking.address,
  note: booking.note,
  pickupAt: booking.pickupAt,
  deliveryAt: booking.deliveryAt,
  createdAt: booking.createdAt,
  updatedAt: booking.updatedAt,
  customer: booking.customer
    ? {
        id: booking.customer.id,
        name: booking.customer.name,
        phone: booking.customer.phone,
        address: booking.customer.address,
      }
    : null,
  sourceOrder: booking.sourceOrder
    ? { id: booking.sourceOrder.id, code: booking.sourceOrder.code }
    : null,
  convertedOrder: booking.convertedOrder
    ? { id: booking.convertedOrder.id, code: booking.convertedOrder.code }
    : null,
  items:
    booking.items?.map((i) => ({
      id: i.id,
      productId: i.productId,
      name: i.name,
      quantity: i.quantity,
      weight: i.weight ? Number(i.weight) : null,
      unitPrice: Number(i.unitPrice),
      subtotal: Number(i.unitPrice) * i.quantity,
    })) ?? [],
});

export type BookingResponse = ReturnType<typeof toBookingResponse>;
