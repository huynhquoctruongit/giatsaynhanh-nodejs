import { Router } from 'express';
import { cashClosingController } from './cash-closing.controller';
import { authStaff, requireRole } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import { UserRole } from '../../helpers/enums';
import {
  cashClosingIdSchema,
  createCashClosingSchema,
  listCashClosingSchema,
  previewCashClosingSchema,
} from '../../helpers/validators/cash-closing.schema';

const router = Router();

router.use(authStaff);

// Nhân viên: xem số liệu hôm nay + chốt két
router.get('/preview', validate(previewCashClosingSchema), cashClosingController.preview);
router.post('/', validate(createCashClosingSchema), cashClosingController.create);
// Chủ tiệm: sổ chốt két theo tháng, xoá để cho chốt lại
router.get('/', requireRole(UserRole.ADMIN), validate(listCashClosingSchema), cashClosingController.list);
router.delete('/:id', requireRole(UserRole.ADMIN), validate(cashClosingIdSchema), cashClosingController.remove);

export { router as cashClosingRouter };
