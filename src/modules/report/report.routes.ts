import { Router } from 'express';
import { reportController } from './report.controller';
import { authStaff } from '../../middlewares/auth';

const router = Router();

router.use(authStaff);

router.get('/dashboard', reportController.dashboard);
router.get('/financial', reportController.financial);
router.get('/sales', reportController.sales);
router.get('/inventory', reportController.inventory);

export { router as reportRouter };
