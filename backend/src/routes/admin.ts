import { Router } from 'express';
import {
  createAdminUser,
  createDssRule,
  deleteAdminUser,
  deleteDssRule,
  getAdminSubmissions,
  getAdminUsers,
  getDssRules,
  updateAdminSubmissionStatus,
  updateAdminUser,
  updateDssRule,
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
router.get('/submissions', getAdminSubmissions);
router.put('/submissions/:id/status', validate(uuidParamSchema, 'params'), updateAdminSubmissionStatus);
router.get('/dss-rules', getDssRules);
router.post('/dss-rules', createDssRule);
router.put('/dss-rules/:id', validate(uuidParamSchema, 'params'), updateDssRule);
router.delete('/dss-rules/:id', validate(uuidParamSchema, 'params'), deleteDssRule);

export default router;
