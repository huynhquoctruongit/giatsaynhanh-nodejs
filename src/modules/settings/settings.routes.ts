import { Router } from 'express';
import { settingsController } from './settings.controller';
import { authStaff, requireRole } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import { UserRole } from '../../helpers/enums';
import { updateSettingsSchema } from '../../helpers/validators/settings.schema';

const router = Router();

router.use(authStaff);

router.get('/', settingsController.get);
router.patch('/', requireRole(UserRole.ADMIN), validate(updateSettingsSchema), settingsController.update);

export { router as settingsRouter };
