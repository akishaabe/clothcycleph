import { Router } from 'express';
import {
  createAdminUser,
  deleteAdminUser,
  getAdminUsers,
  updateAdminUser,
} from '../controllers/adminController.js';
import { authMiddleware } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { uuidParamSchema } from '../schemas/common.js';

const router = Router();

router.use(authMiddleware);
router.get('/users', getAdminUsers);
router.post('/users', createAdminUser);
router.put('/users/:id', validate(uuidParamSchema, 'params'), updateAdminUser);
router.delete('/users/:id', validate(uuidParamSchema, 'params'), deleteAdminUser);

export default router;
