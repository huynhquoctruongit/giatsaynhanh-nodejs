import { Router } from 'express';
import { authStaff, requireRole } from '../../middlewares/auth';
import { UserRole } from '../../helpers/enums';
import { validate } from '../../middlewares/validate';
import {
  convertBookingSchema,
  listBookingSchema,
  updateBookingStatusSchema,
  updateBookingSchema,
} from '../../helpers/validators/booking.schema';
import { bookingController } from './booking.controller';

const router = Router();

router.use(authStaff);

router.get('/', validate(listBookingSchema), bookingController.list);
router.get('/:id', bookingController.detail);
router.patch(
  '/:id/status',
  validate(updateBookingStatusSchema),
  bookingController.updateStatus,
);
router.post(
  '/:id/convert',
  validate(convertBookingSchema),
  bookingController.convert,
);
// Sửa / xoá đặt lịch: chỉ ADMIN
router.patch('/:id', requireRole(UserRole.ADMIN), validate(updateBookingSchema), bookingController.update);
router.delete('/:id', requireRole(UserRole.ADMIN), bookingController.remove);

export { router as bookingRouter };
