import { Router } from 'express';
import {
  getPartnerDssRequests,
  getDssAuditRuns,
  exportDssAuditReport,
  getPartnerRuleChangeRequests,
  getSubmissionDss,
  getUserDssRequests,
  listPartners,
  createPartnerRuleChangeRequest,
  remindDssRequest,
  sendRecommendationToPartner,
  updateDssRequestStatus,
} from '../controllers/dssController.js';
import { authMiddleware } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { submissionIdParamSchema, uuidParamSchema } from '../schemas/common.js';
import { partnerRuleChangeRequestSchema, remindDssRequestSchema, sendDssRecommendationSchema, updateDssRequestStatusSchema } from '../schemas/dss.js';

const router = Router();

router.get('/partners', authMiddleware, listPartners);
router.get('/audit', authMiddleware, getDssAuditRuns);
router.get('/audit/export', authMiddleware, exportDssAuditReport);
router.get('/rule-change-requests', authMiddleware, getPartnerRuleChangeRequests);
router.post('/rule-change-requests', authMiddleware, validate(partnerRuleChangeRequestSchema), createPartnerRuleChangeRequest);
router.get('/submissions/:submissionId', authMiddleware, validate(submissionIdParamSchema, 'params'), getSubmissionDss);
router.post('/send', authMiddleware, validate(sendDssRecommendationSchema), sendRecommendationToPartner);
router.get('/requests/user', authMiddleware, getUserDssRequests);
router.get('/requests/partner', authMiddleware, getPartnerDssRequests);
router.post(
  '/requests/:id/remind',
  authMiddleware,
  validate(uuidParamSchema, 'params'),
  validate(remindDssRequestSchema),
  remindDssRequest
);
router.put(
  '/requests/:id/status',
  authMiddleware,
  validate(uuidParamSchema, 'params'),
  validate(updateDssRequestStatusSchema),
  updateDssRequestStatus
);

export default router;
