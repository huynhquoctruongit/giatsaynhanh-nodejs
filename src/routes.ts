import { Router } from 'express';
import { authRouter } from './modules/auth/auth.routes';
import { customerRouter } from './modules/customer/customer.routes';
import { orderRouter } from './modules/order/order.routes';
import { productRouter } from './modules/product/product.routes';
import { qrRouter } from './modules/qr/qr.routes';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});

router.use('/auth', authRouter);
router.use('/customers', customerRouter);
router.use('/products', productRouter);
router.use('/orders', orderRouter);
router.use('/qr', qrRouter);

export { router as apiRouter };
