import { Router } from 'express';
import { bankController } from './bank.controller';
import { authStaff } from '../../middlewares/auth';

const router = Router();

// PUBLIC — GPM Pay gọi vào, tự verify HMAC bên trong controller.
router.post('/webhooks/gpmpay', bankController.webhook);
// Một số cổng thanh toán ping bằng GET để kiểm tra URL sống trước khi lưu webhook.
router.get('/webhooks/gpmpay', (_req, res) => res.status(200).json({ ok: true }));

// PUBLIC — link webhook riêng theo tiệm (Phase 8), tiệm tự đăng ký GPM Pay riêng.
router.post('/webhooks/gpmpay/:token', bankController.webhookByToken);
router.get('/webhooks/gpmpay/:token', bankController.pingByToken);

// STAFF — hiển thị + đối soát
router.get('/bank/today', authStaff, bankController.getToday);
router.post('/bank/sync', authStaff, bankController.sync);

export { router as bankRouter };
