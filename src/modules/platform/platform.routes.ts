import { Router } from 'express';
import { platformController } from './platform.controller';
import { authPlatform } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import {
  platformLoginSchema,
  createShopSchema,
  createShopAdminSchema,
} from '../../helpers/validators/platform.schema';

const router = Router();

router.post('/login', validate(platformLoginSchema), platformController.login);

router.use(authPlatform);
router.get('/shops', platformController.listShops);
router.post('/shops', validate(createShopSchema), platformController.createShop);
router.post(
  '/shops/:shopId/admins',
  validate(createShopAdminSchema),
  platformController.createShopAdmin,
);

export { router as platformRouter };
