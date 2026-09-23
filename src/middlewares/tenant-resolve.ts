import type { Request, Response, NextFunction } from 'express';
import { prismaUnscoped } from '../config/prisma';
import { BadRequestError, NotFoundError } from '../helpers/utils/errors';
import { runWithShop } from '../helpers/context/tenant-context';

/**
 * Route công khai có `:token` trong URL (QR khách quét — Customer.qrToken
 * hoặc, để tương thích ngược, Order.qrToken — cả 2 đều global-unique, xem
 * resolveCustomerFromToken trong booking.service.ts). Không có JWT nên suy ra
 * shopId trực tiếp từ token bằng prismaUnscoped, trước khi vào tenant context.
 */
export const resolveShopFromCustomerOrOrderToken = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  try {
    const token = req.params.token;
    const customer = await prismaUnscoped.customer.findUnique({
      where: { qrToken: token },
      select: { shopId: true },
    });
    if (customer) return runWithShop(customer.shopId, next);

    const order = await prismaUnscoped.order.findUnique({
      where: { qrToken: token },
      select: { shopId: true },
    });
    if (!order) throw new NotFoundError('Invalid QR token');
    runWithShop(order.shopId, next);
  } catch (err) {
    next(err);
  }
};

/**
 * Route công khai KHÔNG có token trong URL (vd: nhận diện khách theo SĐT khi
 * đặt đơn tại quầy). Frontend (trang /[shopSlug]/dat-don) đã biết `shopId`
 * của tiệm từ GET /settings/public/:shopSlug và phải gửi kèm trong body/query.
 */
export const resolveShopFromRequest = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  try {
    const shopId = (req.body?.shopId ?? req.query?.shopId) as string | undefined;
    if (!shopId) throw new BadRequestError('Thiếu shopId');
    const shop = await prismaUnscoped.shop.findUnique({
      where: { id: shopId },
      select: { id: true, isActive: true },
    });
    if (!shop || !shop.isActive) throw new NotFoundError('Shop not found');
    runWithShop(shop.id, next);
  } catch (err) {
    next(err);
  }
};
