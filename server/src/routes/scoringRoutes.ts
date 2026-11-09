import { Router } from 'express';
import { scoringController } from '../controllers/scoringController';
import { authenticateToken, requireRoles } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/my-score', (req, res, next) => scoringController.getMyScore(req, res, next));
router.get('/policy/active', (req, res, next) => scoringController.getActivePolicy(req, res, next));
router.get('/faculty/:facultyId', (req, res, next) => scoringController.getFacultyScore(req, res, next));
router.get('/department/:departmentId', requireRoles(['REVIEWER', 'ADMIN']), (req, res, next) =>
  scoringController.getDepartmentScores(req, res, next)
);
router.put('/policy/:id', requireRoles(['ADMIN']), (req, res, next) =>
  scoringController.updatePolicy(req, res, next)
);

export default router;
