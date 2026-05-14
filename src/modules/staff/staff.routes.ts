import { Router } from 'express';
import { staffController } from './staff.controller';
import { authStaff, requireRole } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import { UserRole } from '../../helpers/enums';
import {
  createStaffSchema,
  listStaffSchema,
  updateStaffPasswordSchema,
  updateStaffPermissionsSchema,
  updateStaffSchema,
} from '../../helpers/validators/staff.schema';

const router = Router();

router.use(authStaff, requireRole(UserRole.ADMIN));

router.get('/', validate(listStaffSchema), staffController.list);
router.get('/:id', staffController.detail);
router.post('/', validate(createStaffSchema), staffController.create);
router.patch('/:id', validate(updateStaffSchema), staffController.update);
router.patch(
  '/:id/permissions',
  validate(updateStaffPermissionsSchema),
  staffController.updatePermissions,
);
router.patch(
  '/:id/password',
  validate(updateStaffPasswordSchema),
  staffController.resetPassword,
);
router.delete('/:id', staffController.remove);

export { router as staffRouter };
