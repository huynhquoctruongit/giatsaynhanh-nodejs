import { Router } from 'express';
import { platformController } from './platform.controller';
import { authPlatform } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import {
  platformLoginSchema,
  createShopSchema,
  createShopAdminSchema,
  shopIdParamSchema,
  setWebhookSecretSchema,
  activateSubscriptionSchema,
  updatePlanConfigSchema,
} from '../../helpers/validators/platform.schema';

const router = Router();

router.post('/login', validate(platformLoginSchema), platformController.login);

// Public: bảng giá trên landing page — phải đặt TRƯỚC authPlatform
router.get('/public/plans', platformController.listPlanConfigs);

router.use(authPlatform);
router.get('/shops', platformController.listShops);
router.post('/shops', validate(createShopSchema), platformController.createShop);
router.post(
  '/shops/:shopId/admins',
  validate(createShopAdminSchema),
  platformController.createShopAdmin,
);
router.post(
  '/shops/:shopId/webhook/token',
  validate(shopIdParamSchema),
  platformController.rotateWebhookToken,
);
router.put(
  '/shops/:shopId/webhook/secret',
  validate(setWebhookSecretSchema),
  platformController.setWebhookSecret,
);
router.patch(
  '/shops/:shopId/subscription',
  validate(activateSubscriptionSchema),
  platformController.activateSubscription,
);
router.get('/plans', platformController.listPlanConfigs);
router.put('/plans/:plan', validate(updatePlanConfigSchema), platformController.updatePlanConfig);

export { router as platformRouter };
