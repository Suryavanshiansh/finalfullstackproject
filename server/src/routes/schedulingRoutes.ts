import { Router } from 'express';
import { schedulingController } from '../controllers/schedulingController';
import { authenticateToken, requireRoles } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/timetable', (req, res, next) => schedulingController.getTimetable(req, res, next));
router.post('/check-conflicts', (req, res, next) => schedulingController.checkConflicts(req, res, next));
router.get('/availability', (req, res, next) => schedulingController.getAvailability(req, res, next));
router.put('/availability', (req, res, next) => schedulingController.updateAvailability(req, res, next));

// Generation, committing, and modifying schedules reserved for Reviewers and Admins
router.post('/generate', requireRoles(['REVIEWER', 'ADMIN']), (req, res, next) =>
  schedulingController.generate(req, res, next)
);
router.post('/commit', requireRoles(['REVIEWER', 'ADMIN']), (req, res, next) =>
  schedulingController.commit(req, res, next)
);
router.delete('/entries/:id', requireRoles(['REVIEWER', 'ADMIN']), (req, res, next) =>
  schedulingController.deleteEntry(req, res, next)
);

export default router;
