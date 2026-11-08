import { Router } from 'express';
import { authController } from './auth.controller';
import { validate } from '../../middlewares/validate';
import { authStaff, requireRole } from '../../middlewares/auth';
import {
  linkShopSchema,
  loginSchema,
  registerSchema,
  switchShopSchema,
} from '../../helpers/validators/auth.schema';
import { UserRole } from '../../helpers/enums';

const router = Router();

router.post('/login', validate(loginSchema), authController.login);

router.post(
  '/register',
  authStaff,
  requireRole(UserRole.ADMIN),
  validate(registerSchema),
  authController.register,
);

router.get('/me', authStaff, authController.me);
// Đổi tiệm cho chủ quản lý nhiều tiệm (chỉ ADMIN)
const adminOnly = [authStaff, requireRole(UserRole.ADMIN)];
router.get('/linked-shops', ...adminOnly, authController.linkedShops);
router.post('/linked-shops', ...adminOnly, validate(linkShopSchema), authController.linkShop);
router.delete('/linked-shops/:shopId', ...adminOnly, authController.unlinkShop);
router.post('/switch-shop', ...adminOnly, validate(switchShopSchema), authController.switchShop);

router.patch('/fcm-token', authStaff, authController.updateFcmToken);
router.delete('/fcm-token', authStaff, authController.clearFcmToken);

export { router as authRouter };
