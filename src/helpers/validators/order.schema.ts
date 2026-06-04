import { z } from 'zod';
import { OrderStatus } from '../enums';

const orderItemSchema = z.object({
  productId: z.string().uuid().optional(),
  name: z.string().min(1),
  quantity: z.coerce.number().int().min(1).default(1),
  weight: z.coerce.number().nonnegative().optional(),
  unitPrice: z.coerce.number().nonnegative().default(0),
});

export const createOrderSchema = z.object({
  body: z.object({
    customerId: z.string().uuid(),
    note: z.string().optional(),
    pickupAt: z.coerce.date().optional(),
    assignedToId: z.string().uuid().optional(),
    discountAmount: z.coerce.number().nonnegative().optional().default(0),
    items: z.array(orderItemSchema).min(1, 'Order must have at least one item'),
  }),
});

export const updateOrderSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    note: z.string().optional(),
    pickupAt: z.coerce.date().optional(),
    assignedToId: z.string().uuid().optional(),
    discountAmount: z.coerce.number().nonnegative().optional(),
    items: z.array(orderItemSchema).min(1).optional(),
  }),
});

export const assignOrderSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    assignedToId: z.string().uuid(),
  }),
});

export const updateOrderStatusSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    status: z.nativeEnum(OrderStatus),
  }),
});

export const updateOrderPaymentSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    // paid=false → đánh dấu NỢ (treo); paid=true → đã thanh toán
    paid: z.boolean(),
  }),
});

export const listOrderSchema = z.object({
  query: z.object({
    search: z.string().optional(),
    status: z.nativeEnum(OrderStatus).optional(),
    customerId: z.string().uuid().optional(),
    // Lọc đơn đặt (giao tận nhà): ?fromBooking=true
    fromBooking: z
      .union([z.literal('true'), z.literal('false')])
      .optional()
      .transform((v) => (v === undefined ? undefined : v === 'true')),
    // Lọc đơn NỢ (đã giao, chưa thu tiền): ?debt=true
    debt: z
      .union([z.literal('true'), z.literal('false')])
      .optional()
      .transform((v) => (v === undefined ? undefined : v === 'true')),
    // Lọc theo ngày (FE gửi mốc 00:00 → 23:59 của ngày được chọn). Áp cho
    // createdAt; riêng tab "Đã giao" backend tự áp + sort theo deliveredAt.
    dateFrom: z.coerce.date().optional(),
    dateTo: z.coerce.date().optional(),
    page: z.coerce.number().int().min(1).default(1),
    // max 1000 để màn "Rà soát đơn" tải hết đơn còn trên kệ trong 1 lần
    pageSize: z.coerce.number().int().min(1).max(1000).default(20),
  }),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>['body'];
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>['body'];
