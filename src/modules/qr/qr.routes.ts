import { Router } from 'express';
import { qrController } from './qr.controller';
import { authStaff, optionalAuth } from '../../middlewares/auth';
import {
  resolveShopFromCustomerOrOrderToken,
  resolveShopFromRequest,
} from '../../middlewares/tenant-resolve';
import { bookingController } from '../booking/booking.controller';
import { validate } from '../../middlewares/validate';
import {
  createBookingFromQrSchema,
  identifyCustomerSchema,
} from '../../helpers/validators/booking.schema';

const router = Router();

// Public: QR "đặt đơn tại cửa" — nhận diện khách theo SĐT (phải đặt TRƯỚC /:token)
// Không có :token trong URL nên shopId phải lấy từ body (frontend gửi kèm,
// biết trước qua GET /settings/public/:shopSlug).
router.post(
  '/identify',
  resolveShopFromRequest,
  validate(identifyCustomerSchema),
  bookingController.identify,
);

// Public: customer scan QR → optional auth so staff scan also tracked.
// resolveShopFromCustomerOrOrderToken thiết lập context theo token (khách ẩn
// danh); nếu optionalAuth xác thực được JWT, context sẽ bị ghi đè bằng shopId
// thật của nhân viên đăng nhập (chặn nhân viên xem QR của tiệm khác).
router.get(
  '/:token',
  resolveShopFromCustomerOrOrderToken,
  optionalAuth,
  qrController.verifyPublic,
);

// Public: prefill data for customer re-booking flow
router.get(
  '/:token/booking-context',
  resolveShopFromCustomerOrOrderToken,
  bookingController.qrPrefill,
);

// Public: customer submits a re-booking from QR
router.post(
  '/:token/booking',
  resolveShopFromCustomerOrOrderToken,
  validate(createBookingFromQrSchema),
  bookingController.createFromQr,
);

// Staff explicit scan (always logged with staffScan meta) — context từ JWT của nhân viên.
router.post('/:token/scan', authStaff, qrController.scanStaff);

export { router as qrRouter };
