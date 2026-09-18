import { Router } from 'express';
import { bankController } from './bank.controller';
import { authStaff } from '../../middlewares/auth';

const router = Router();

// PUBLIC — GPM Pay gọi vào, tự verify HMAC bên trong controller.
router.post('/webhooks/gpmpay', bankController.webhook);

// STAFF — hiển thị + đối soát
router.get('/bank/today', authStaff, bankController.getToday);
router.post('/bank/sync', authStaff, bankController.sync);

export { router as bankRouter };
