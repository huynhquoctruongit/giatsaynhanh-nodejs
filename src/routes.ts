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

// Debug FCM — kiểm tra Firebase init + token đã lưu
router.get('/debug/fcm', async (_req, res) => {
  try {
    const { prisma } = await import('./config/prisma.js');
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, fcmToken: true },
    });
    const hasServiceAccount = !!process.env.FIREBASE_SERVICE_ACCOUNT;
    const tokens = users.filter((u: { fcmToken: string | null }) => u.fcmToken);
    res.json({
      success: true,
      data: {
        hasServiceAccount,
        totalUsers: users.length,
        usersWithToken: tokens.length,
        tokens: tokens.map((u: { name: string; fcmToken: string | null }) => ({
          name: u.name,
          tokenPreview: u.fcmToken?.slice(0, 20) + '...',
        })),
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
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
