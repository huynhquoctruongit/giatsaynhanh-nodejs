import { Router } from 'express';
import { orderController } from './order.controller';
import { authStaff, requireRole } from '../../middlewares/auth';
import { UserRole } from '../../helpers/enums';
import { validate } from '../../middlewares/validate';
import {
  assignOrderSchema,
  createOrderSchema,
  listOrderSchema,
  updateOrderPaymentSchema,
  updateOrderSchema,
  updateOrderStatusSchema,
} from '../../helpers/validators/order.schema';

const router = Router();

router.use(authStaff);

router.get('/status-counts', orderController.statusCounts);
router.get('/product-counts', orderController.productCounts);
router.get('/deleted', requireRole(UserRole.ADMIN), orderController.deleted);
router.get('/', validate(listOrderSchema), orderController.list);
router.get('/:id', orderController.detail);
router.post('/', validate(createOrderSchema), orderController.create);
router.patch('/:id', validate(updateOrderSchema), orderController.update);
router.patch(
  '/:id/status',
  validate(updateOrderStatusSchema),
  orderController.updateStatus,
);
router.patch(
  '/:id/payment',
  validate(updateOrderPaymentSchema),
  orderController.setPayment,
);
router.delete('/:id', orderController.remove);
router.patch('/:id/assign', validate(assignOrderSchema), orderController.assign);

router.get('/:id/qr', orderController.qrDataUrl);
router.get('/:id/qr.png', orderController.qrPng);

router.get('/:id/scan-history', orderController.scanHistory);

export { router as orderRouter };
