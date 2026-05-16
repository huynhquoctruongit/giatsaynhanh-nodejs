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

export const listOrderSchema = z.object({
  query: z.object({
    search: z.string().optional(),
    status: z.nativeEnum(OrderStatus).optional(),
    customerId: z.string().uuid().optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  }),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>['body'];
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>['body'];
