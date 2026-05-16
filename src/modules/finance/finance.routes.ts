import { Router } from 'express';
import { financeController } from './finance.controller';
import { authStaff } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import {
  createTransactionSchema,
  listTransactionSchema,
  summaryTransactionSchema,
  updateTransactionSchema,
} from '../../helpers/validators/transaction.schema';

const router = Router();

router.use(authStaff);

router.get('/summary', validate(summaryTransactionSchema), financeController.summary);
router.get('/', validate(listTransactionSchema), financeController.list);
router.get('/:id', financeController.detail);
router.post('/', validate(createTransactionSchema), financeController.create);
router.patch('/:id', validate(updateTransactionSchema), financeController.update);
router.delete('/:id', financeController.remove);

export { router as financeRouter };
