import { Router } from 'express';
import { adminController } from '../controllers/adminController';
import { authenticateToken, requireRoles } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);
router.use(requireRoles(['ADMIN']));

router.get('/stats', (req, res, next) => adminController.getStats(req, res, next));

// Users
router.get('/users', (req, res, next) => adminController.listUsers(req, res, next));
router.post('/users', (req, res, next) => adminController.createUser(req, res, next));
router.put('/users/:id', (req, res, next) => adminController.updateUser(req, res, next));
router.post('/users/:id/reset-password', (req, res, next) => adminController.resetPassword(req, res, next));

// Departments
router.get('/departments', (req, res, next) => adminController.listDepartments(req, res, next));
router.post('/departments', (req, res, next) => adminController.createDepartment(req, res, next));
router.put('/departments/:id', (req, res, next) => adminController.updateDepartment(req, res, next));

// Courses
router.get('/courses', (req, res, next) => adminController.listCourses(req, res, next));
router.post('/courses', (req, res, next) => adminController.createCourse(req, res, next));
router.post('/courses/assign-expertise', (req, res, next) => adminController.assignExpertise(req, res, next));

// Classrooms
router.get('/classrooms', (req, res, next) => adminController.listClassrooms(req, res, next));
router.post('/classrooms', (req, res, next) => adminController.createClassroom(req, res, next));
router.put('/classrooms/:id', (req, res, next) => adminController.updateClassroom(req, res, next));

// Time slots & sessions
router.get('/time-slots', (req, res, next) => adminController.listTimeSlots(req, res, next));
router.get('/academic-sessions', (req, res, next) => adminController.listAcademicSessions(req, res, next));
router.post('/academic-sessions', (req, res, next) => adminController.createAcademicSession(req, res, next));

// Audit Logs
router.get('/audit-logs', (req, res, next) => adminController.getAuditLogs(req, res, next));

export default router;
