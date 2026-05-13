import { Router } from 'express';
import { authController } from './auth.controller';
import { validate } from '../../middlewares/validate';
import { authStaff, requireRole } from '../../middlewares/auth';
import { loginSchema, registerSchema } from '../../helpers/validators/auth.schema';
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

export { router as authRouter };
