import { Router } from 'express';
import { authRouter } from './modules/auth/auth.routes';
import { bookingRouter } from './modules/booking/booking.routes';
import { customerRouter } from './modules/customer/customer.routes';
import { debtRouter } from './modules/debt/debt.routes';
import { financeRouter } from './modules/finance/finance.routes';
import { inventoryRouter } from './modules/inventory/inventory.routes';
import { orderRouter } from './modules/order/order.routes';
import { productRouter } from './modules/product/product.routes';
import { qrRouter } from './modules/qr/qr.routes';
import { reportRouter } from './modules/report/report.routes';
import { settingsRouter } from './modules/settings/settings.routes';
import { shiftRouter } from './modules/shift/shift.routes';
import { staffRouter } from './modules/staff/staff.routes';
import { supplierRouter } from './modules/supplier/supplier.routes';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});

router.use('/auth', authRouter);
router.use('/bookings', bookingRouter);
router.use('/customers', customerRouter);
router.use('/debt', debtRouter);
router.use('/finance', financeRouter);
router.use('/inventory', inventoryRouter);
router.use('/orders', orderRouter);
router.use('/products', productRouter);
router.use('/qr', qrRouter);
router.use('/report', reportRouter);
router.use('/settings', settingsRouter);
router.use('/shifts', shiftRouter);
router.use('/staff', staffRouter);
router.use('/suppliers', supplierRouter);

export { router as apiRouter };
