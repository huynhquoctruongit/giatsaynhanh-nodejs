import { Router } from 'express';
import { productController } from './product.controller';
import { authStaff } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import {
  createProductSchema,
  listProductSchema,
  reorderProductSchema,
  updateProductSchema,
} from '../../helpers/validators/product.schema';

const router = Router();

router.use(authStaff);

router.get('/', validate(listProductSchema), productController.list);
router.get('/:id', productController.detail);
router.post('/', validate(createProductSchema), productController.create);
// /reorder phải đứng TRƯỚC /:id (nếu không sẽ khớp nhầm :id='reorder')
router.patch('/reorder', validate(reorderProductSchema), productController.reorder);
router.patch('/:id', validate(updateProductSchema), productController.update);
router.delete('/:id', productController.remove);

export { router as productRouter };
