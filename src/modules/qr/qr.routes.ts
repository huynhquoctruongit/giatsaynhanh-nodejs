import { Router } from 'express';
import { qrController } from './qr.controller';
import { authStaff, optionalAuth } from '../../middlewares/auth';

const router = Router();

// Public: customer scan QR → optional auth so staff scan also tracked
router.get('/:token', optionalAuth, qrController.verifyPublic);

// Staff explicit scan (always logged with staffScan meta)
router.post('/:token/scan', authStaff, qrController.scanStaff);

export { router as qrRouter };
