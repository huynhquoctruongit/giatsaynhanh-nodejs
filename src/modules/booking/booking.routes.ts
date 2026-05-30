import { Router } from 'express';
import { authStaff } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import {
  convertBookingSchema,
  listBookingSchema,
  updateBookingStatusSchema,
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
router.patch('/:id', bookingController.update);
router.delete('/:id', bookingController.remove);

export { router as bookingRouter };
