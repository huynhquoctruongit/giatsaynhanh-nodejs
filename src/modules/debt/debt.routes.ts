import { Router } from 'express';
import { debtController } from './debt.controller';
import { authStaff } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import {
  createCustomerDebtSchema,
  updateCustomerDebtSchema,
  createSupplierDebtSchema,
  updateSupplierDebtSchema,
  payDebtSchema,
  listCustomerDebtSchema,
  listSupplierDebtSchema,
} from '../../helpers/validators/debt.schema';

const router = Router();

router.use(authStaff);

router.get('/summary', debtController.summary);

// Customer debts
router.get('/customers', validate(listCustomerDebtSchema), debtController.listCustomer);
router.get('/customers/:id', debtController.detailCustomer);
router.post('/customers', validate(createCustomerDebtSchema), debtController.createCustomer);
router.patch('/customers/:id', validate(updateCustomerDebtSchema), debtController.updateCustomer);
router.delete('/customers/:id', debtController.removeCustomer);
router.patch('/customers/:id/pay', validate(payDebtSchema), debtController.payCustomer);

// Supplier debts
router.get('/suppliers', validate(listSupplierDebtSchema), debtController.listSupplier);
router.get('/suppliers/:id', debtController.detailSupplier);
router.post('/suppliers', validate(createSupplierDebtSchema), debtController.createSupplier);
router.patch('/suppliers/:id', validate(updateSupplierDebtSchema), debtController.updateSupplier);
router.delete('/suppliers/:id', debtController.removeSupplier);
router.patch('/suppliers/:id/pay', validate(payDebtSchema), debtController.paySupplier);

export { router as debtRouter };
