import { Router } from 'express';
import { notificationController } from '../controllers/notificationController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/', (req, res, next) => notificationController.listUserNotifications(req, res, next));
router.put('/:id/read', (req, res, next) => notificationController.markAsRead(req, res, next));
router.put('/read-all', (req, res, next) => notificationController.markAllAsRead(req, res, next));

export default router;
