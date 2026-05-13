import { Router } from 'express';
import { productController } from './product.controller';
import { authStaff } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import {
  createProductSchema,
  listProductSchema,
  updateProductSchema,
} from '../../helpers/validators/product.schema';

const router = Router();

router.use(authStaff);

router.get('/', validate(listProductSchema), productController.list);
router.get('/:id', productController.detail);
router.post('/', validate(createProductSchema), productController.create);
router.patch('/:id', validate(updateProductSchema), productController.update);
router.delete('/:id', productController.remove);

export { router as productRouter };
