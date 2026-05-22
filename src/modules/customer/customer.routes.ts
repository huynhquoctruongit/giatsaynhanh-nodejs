import { Router } from 'express';
import { customerController } from './customer.controller';
import { authStaff } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import {
  createCustomerSchema,
  listCustomerSchema,
  updateCustomerSchema,
} from '../../helpers/validators/customer.schema';

const router = Router();

router.use(authStaff);

router.get('/', validate(listCustomerSchema), customerController.list);
router.get('/top', customerController.top);
router.get('/:id', customerController.detail);
router.get('/:id/stats', customerController.stats);
router.post('/', validate(createCustomerSchema), customerController.create);
router.patch('/:id', validate(updateCustomerSchema), customerController.update);
router.delete('/:id', customerController.remove);

export { router as customerRouter };
