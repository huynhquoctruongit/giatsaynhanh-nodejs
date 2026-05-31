import { z } from 'zod';
import { BookingStatus } from '../enums';

const phoneRegex = /^[0-9+()\-\s]+$/;

const bookingItemSchema = z.object({
  productId: z.string().uuid().optional(),
  name: z.string().min(1),
  quantity: z.coerce.number().int().min(1).default(1),
  weight: z.coerce.number().nonnegative().optional(),
  unitPrice: z.coerce.number().nonnegative().default(0),
});

export const createBookingFromQrSchema = z.object({
  params: z.object({ token: z.string().min(1) }),
  body: z.object({
    phone: z.string().min(8).max(20).regex(phoneRegex, 'Số điện thoại không hợp lệ'),
    address: z.string().min(1, 'Vui lòng nhập địa chỉ'),
    pickupAt: z.coerce.date().optional(),
    deliveryAt: z.coerce.date().optional(),
    note: z.string().optional(),
    items: z
      .array(bookingItemSchema)
      .min(1, 'Cần ít nhất 1 sản phẩm cần giặt lại'),
  }),
});

// QR "đặt đơn tại cửa" (generic, không token) — nhận diện khách theo SĐT
export const identifyCustomerSchema = z.object({
  body: z.object({
    phone: z.string().min(8).max(20).regex(phoneRegex, 'Số điện thoại không hợp lệ'),
    name: z.string().max(120).optional(),
    address: z.string().max(255).optional(),
  }),
});

export const listBookingSchema = z.object({
  query: z.object({
    search: z.string().optional(),
    status: z.nativeEnum(BookingStatus).optional(),
    customerId: z.string().uuid().optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  }),
});

export const updateBookingStatusSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    status: z.enum([BookingStatus.CONFIRMED, BookingStatus.CANCELLED]),
    reason: z.string().optional(),
  }),
});

export const convertBookingSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    items: z.array(bookingItemSchema).min(1).optional(),
    pickupAt: z.coerce.date().optional(),
    note: z.string().optional(),
    discountAmount: z.coerce.number().nonnegative().optional().default(0),
  }),
});

export type CreateBookingFromQrInput = z.infer<
  typeof createBookingFromQrSchema
>['body'];
export type ConvertBookingInput = z.infer<typeof convertBookingSchema>['body'];
