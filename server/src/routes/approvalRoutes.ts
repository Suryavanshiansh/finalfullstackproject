import { Router } from 'express';
import { approvalController } from '../controllers/approvalController';
import { authenticateToken, requireRoles } from '../middleware/auth';

const router = Router();

// Only Reviewers and Admins can access approval workflows
router.use(authenticateToken);
router.use(requireRoles(['REVIEWER', 'ADMIN']));

router.get('/queue', (req, res, next) => approvalController.getQueue(req, res, next));
router.get('/stats', (req, res, next) => approvalController.getStats(req, res, next));
router.post('/:id/start-review', (req, res, next) => approvalController.startReview(req, res, next));
router.post('/:id/approve', (req, res, next) => approvalController.approve(req, res, next));
router.post('/:id/reject', (req, res, next) => approvalController.reject(req, res, next));
router.post('/:id/request-correction', (req, res, next) =>
  approvalController.requestCorrection(req, res, next)
);

export default router;
