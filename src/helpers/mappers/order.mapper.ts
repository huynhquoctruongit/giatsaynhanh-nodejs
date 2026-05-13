import type { Order, OrderItem, Customer } from '@prisma/client';
import { buildQrUrl } from '../utils/qr';

type OrderWith = Order & {
  items?: OrderItem[];
  customer?: Customer | null;
};

export const toOrderResponse = (order: OrderWith) => ({
  id: order.id,
  code: order.code,
  status: order.status,
  totalAmount: Number(order.totalAmount),
  note: order.note,
  pickupAt: order.pickupAt,
  deliveredAt: order.deliveredAt,
  createdAt: order.createdAt,
  updatedAt: order.updatedAt,
  customer: order.customer
    ? {
        id: order.customer.id,
        name: order.customer.name,
        phone: order.customer.phone,
        address: order.customer.address,
      }
    : null,
  items:
    order.items?.map((i) => ({
      id: i.id,
      productId: i.productId,
      name: i.name,
      quantity: i.quantity,
      weight: i.weight ? Number(i.weight) : null,
      unitPrice: Number(i.unitPrice),
      subtotal: Number(i.unitPrice) * i.quantity,
    })) ?? [],
  qr: {
    token: order.qrToken,
    url: buildQrUrl(order.qrToken),
  },
});

export const toPublicOrderResponse = (order: OrderWith) => ({
  code: order.code,
  status: order.status,
  totalAmount: Number(order.totalAmount),
  note: order.note,
  pickupAt: order.pickupAt,
  deliveredAt: order.deliveredAt,
  createdAt: order.createdAt,
  customer: order.customer
    ? {
        name: order.customer.name,
        phone: maskPhone(order.customer.phone),
      }
    : null,
  items:
    order.items?.map((i) => ({
      name: i.name,
      quantity: i.quantity,
      weight: i.weight ? Number(i.weight) : null,
    })) ?? [],
});

function maskPhone(phone: string): string {
  if (phone.length <= 4) return phone;
  return `${phone.slice(0, 3)}****${phone.slice(-2)}`;
}
