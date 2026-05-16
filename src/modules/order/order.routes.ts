import { Router } from 'express';
import { orderController } from './order.controller';
import { authStaff } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import {
  assignOrderSchema,
  createOrderSchema,
  listOrderSchema,
  updateOrderSchema,
  updateOrderStatusSchema,
} from '../../helpers/validators/order.schema';

const router = Router();

router.use(authStaff);

router.get('/', validate(listOrderSchema), orderController.list);
router.get('/:id', orderController.detail);
router.post('/', validate(createOrderSchema), orderController.create);
router.patch('/:id', validate(updateOrderSchema), orderController.update);
router.patch(
  '/:id/status',
  validate(updateOrderStatusSchema),
  orderController.updateStatus,
);
router.delete('/:id', orderController.remove);
router.patch('/:id/assign', validate(assignOrderSchema), orderController.assign);

router.get('/:id/qr', orderController.qrDataUrl);
router.get('/:id/qr.png', orderController.qrPng);

router.get('/:id/scan-history', orderController.scanHistory);

export { router as orderRouter };
