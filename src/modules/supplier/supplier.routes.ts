import { Router } from 'express';
import { supplierController } from './supplier.controller';
import { authStaff } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import {
  createSupplierSchema,
  listSupplierSchema,
  updateSupplierSchema,
} from '../../helpers/validators/supplier.schema';

const router = Router();

router.use(authStaff);

router.get('/', validate(listSupplierSchema), supplierController.list);
router.get('/:id', supplierController.detail);
router.post('/', validate(createSupplierSchema), supplierController.create);
router.patch('/:id', validate(updateSupplierSchema), supplierController.update);
router.delete('/:id', supplierController.remove);

export { router as supplierRouter };
