import { Router } from 'express';
import { activityController } from '../controllers/activityController';
import { authenticateToken } from '../middleware/auth';
import { evidenceUpload } from '../middleware/upload';

const router = Router();

router.use(authenticateToken);

router.get('/categories', (req, res, next) => activityController.listCategories(req, res, next));
router.get('/metrics/faculty', (req, res, next) => activityController.getFacultyMetrics(req, res, next));
router.get('/', (req, res, next) => activityController.listActivities(req, res, next));
router.post('/', (req, res, next) => activityController.createActivity(req, res, next));
router.get('/:id', (req, res, next) => activityController.getActivity(req, res, next));
router.put('/:id', (req, res, next) => activityController.updateActivity(req, res, next));
router.delete('/:id', (req, res, next) => activityController.deleteActivity(req, res, next));
router.post('/:id/submit', (req, res, next) => activityController.submitActivity(req, res, next));
router.post('/:id/resubmit', (req, res, next) => activityController.resubmitActivity(req, res, next));
router.post('/:id/evidence', evidenceUpload.single('file'), (req, res, next) =>
  activityController.uploadEvidence(req, res, next)
);
router.delete('/evidence/:evidenceId', (req, res, next) =>
  activityController.deleteEvidence(req, res, next)
);

export default router;
