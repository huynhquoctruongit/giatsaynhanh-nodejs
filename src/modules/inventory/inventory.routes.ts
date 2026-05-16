import { Router } from 'express';
import { inventoryController } from './inventory.controller';
import { authStaff } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import {
  createInventoryItemSchema,
  updateInventoryItemSchema,
  listInventoryItemSchema,
  createInventoryLogSchema,
  listInventoryLogSchema,
} from '../../helpers/validators/inventory.schema';

const router = Router();

router.use(authStaff);

router.get('/low-stock', inventoryController.lowStock);
router.get('/logs', validate(listInventoryLogSchema), inventoryController.listLogs);
router.post('/logs', validate(createInventoryLogSchema), inventoryController.createLog);

router.get('/', validate(listInventoryItemSchema), inventoryController.listItems);
router.get('/:id', inventoryController.detailItem);
router.post('/', validate(createInventoryItemSchema), inventoryController.createItem);
router.patch('/:id', validate(updateInventoryItemSchema), inventoryController.updateItem);
router.delete('/:id', inventoryController.removeItem);

export { router as inventoryRouter };
