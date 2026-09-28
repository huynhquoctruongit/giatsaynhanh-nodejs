import { Router } from 'express';
import { timesheetController } from './timesheet.controller';
import { authStaff } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import { monthlyTimesheetSchema } from '../../helpers/validators/timesheet.schema';

const router = Router();

router.use(authStaff);

router.get('/current', timesheetController.current);
router.post('/check-in', timesheetController.checkIn);
router.post('/check-out', timesheetController.checkOut);
router.get('/monthly', validate(monthlyTimesheetSchema), timesheetController.monthly);

export { router as timesheetRouter };
