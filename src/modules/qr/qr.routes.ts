import { Router } from 'express';
import { qrController } from './qr.controller';
import { authStaff, optionalAuth } from '../../middlewares/auth';
import { bookingController } from '../booking/booking.controller';
import { validate } from '../../middlewares/validate';
import { createBookingFromQrSchema } from '../../helpers/validators/booking.schema';

const router = Router();

// Public: customer scan QR → optional auth so staff scan also tracked
router.get('/:token', optionalAuth, qrController.verifyPublic);

// Public: prefill data for customer re-booking flow
router.get('/:token/booking-context', bookingController.qrPrefill);

// Public: customer submits a re-booking from QR
router.post(
  '/:token/booking',
  validate(createBookingFromQrSchema),
  bookingController.createFromQr,
);

// Staff explicit scan (always logged with staffScan meta)
router.post('/:token/scan', authStaff, qrController.scanStaff);

export { router as qrRouter };
