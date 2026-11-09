import { Router } from 'express';
import { reportingController } from '../controllers/reportingController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/faculty-contribution', (req, res, next) =>
  reportingController.getFacultyContributionReport(req, res, next)
);
router.get('/department-analytics', (req, res, next) =>
  reportingController.getDepartmentAnalytics(req, res, next)
);
router.get('/activity-participation', (req, res, next) =>
  reportingController.getActivityParticipation(req, res, next)
);
router.get('/export/csv', (req, res, next) => reportingController.exportCSV(req, res, next));

export default router;
