import { Router } from 'express';
import { shiftController } from './shift.controller';
import { authStaff } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import {
  createShiftSchema,
  closeShiftSchema,
  addAttendanceSchema,
  checkOutSchema,
  listShiftSchema,
} from '../../helpers/validators/shift.schema';

const router = Router();

router.use(authStaff);

router.get('/current', shiftController.current);
router.get('/', validate(listShiftSchema), shiftController.list);
router.get('/:id', shiftController.detail);
router.post('/', validate(createShiftSchema), shiftController.create);
router.patch('/:id/close', validate(closeShiftSchema), shiftController.close);
router.post('/:id/attendance', validate(addAttendanceSchema), shiftController.addAttendance);
router.patch(
  '/:id/attendance/:attendanceId/checkout',
  validate(checkOutSchema),
  shiftController.checkout,
);

export { router as shiftRouter };
