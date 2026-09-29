import { Router } from 'express';
import { timesheetController } from './timesheet.controller';
import { authStaff, requireRole } from '../../middlewares/auth';
import { UserRole } from '../../helpers/enums';
import { validate } from '../../middlewares/validate';
import {
  monthlyTimesheetSchema,
  timeEntryIdSchema,
  updateTimeEntrySchema,
} from '../../helpers/validators/timesheet.schema';

const router = Router();

router.use(authStaff);

router.get('/current', timesheetController.current);
router.post('/check-in', timesheetController.checkIn);
router.post('/check-out', timesheetController.checkOut);
router.get('/monthly', validate(monthlyTimesheetSchema), timesheetController.monthly);
// Sửa / xoá ca chấm công: chỉ ADMIN
router.patch('/:id', requireRole(UserRole.ADMIN), validate(updateTimeEntrySchema), timesheetController.update);
router.delete('/:id', requireRole(UserRole.ADMIN), validate(timeEntryIdSchema), timesheetController.remove);

export { router as timesheetRouter };
