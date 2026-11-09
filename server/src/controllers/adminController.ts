import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { adminService } from '../services/adminService';
import { prisma } from '../db/prisma';

const createUserSchema = z.object({
  email: z.string().email(),
  passwordPlain: z.string().min(6).optional(),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  employeeId: z.string().min(2),
  role: z.enum(['FACULTY', 'REVIEWER', 'ADMIN']),
  designation: z.string().min(2),
  departmentId: z.string().optional(),
  phone: z.string().optional(),
});

const updateUserSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  designation: z.string().optional(),
  departmentId: z.string().optional().nullable(),
  role: z.enum(['FACULTY', 'REVIEWER', 'ADMIN']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  phone: z.string().optional(),
});

const createDeptSchema = z.object({
  code: z.string().min(2).max(10),
  name: z.string().min(3),
  description: z.string().optional(),
});

const createCourseSchema = z.object({
  code: z.string().min(2),
  name: z.string().min(3),
  departmentId: z.string(),
  credits: z.number().min(1).max(10).optional(),
  semester: z.number().min(1).max(8).optional(),
  lectureHoursPerWeek: z.number().min(0).max(20).optional(),
  labHoursPerWeek: z.number().min(0).max(20).optional(),
});

const createClassroomSchema = z.object({
  roomNumber: z.string().min(2),
  building: z.string().min(2),
  capacity: z.number().min(10),
  type: z.enum(['LECTURE_HALL', 'COMPUTER_LAB', 'SEMINAR_HALL']),
});

export class AdminController {
  async getStats(_req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await adminService.getSystemStats();
      res.json({ success: true, data: stats });
    } catch (err) {
      next(err);
    }
  }

  // Users
  async listUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const { role, departmentId, status, search, page, limit } = req.query;
      const users = await adminService.listUsers({
        role: role as string,
        departmentId: departmentId as string,
        status: status as string,
        search: search as string,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20,
      });
      res.json({ success: true, ...users });
    } catch (err) {
      next(err);
    }
  }

  async createUser(req: Request, res: Response, next: NextFunction) {
    try {
      const data = createUserSchema.parse(req.body);
      const user = await adminService.createUser(
        { ...data, passwordPlain: data.passwordPlain || 'Password@123' },
        req.user?.id
      );
      res.status(201).json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  }

  async updateUser(req: Request, res: Response, next: NextFunction) {
    try {
      const data = updateUserSchema.parse(req.body);
      const user = await adminService.updateUser(req.params.id, data, req.user?.id);
      res.json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { newPassword } = req.body;
      if (!newPassword || newPassword.length < 6) {
        res.status(400).json({ success: false, error: { message: 'Password must be at least 6 characters' } });
        return;
      }
      const result = await adminService.resetUserPassword(req.params.id, newPassword, req.user?.id);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  // Departments
  async listDepartments(_req: Request, res: Response, next: NextFunction) {
    try {
      const depts = await adminService.listDepartments();
      res.json({ success: true, data: depts });
    } catch (err) {
      next(err);
    }
  }

  async createDepartment(req: Request, res: Response, next: NextFunction) {
    try {
      const data = createDeptSchema.parse(req.body);
      const dept = await adminService.createDepartment(data, req.user?.id);
      res.status(201).json({ success: true, data: dept });
    } catch (err) {
      next(err);
    }
  }

  async updateDepartment(req: Request, res: Response, next: NextFunction) {
    try {
      const dept = await adminService.updateDepartment(req.params.id, req.body, req.user?.id);
      res.json({ success: true, data: dept });
    } catch (err) {
      next(err);
    }
  }

  // Courses
  async listCourses(req: Request, res: Response, next: NextFunction) {
    try {
      const courses = await adminService.listCourses(req.query.departmentId as string);
      res.json({ success: true, data: courses });
    } catch (err) {
      next(err);
    }
  }

  async createCourse(req: Request, res: Response, next: NextFunction) {
    try {
      const data = createCourseSchema.parse(req.body);
      const course = await adminService.createCourse(data, req.user?.id);
      res.status(201).json({ success: true, data: course });
    } catch (err) {
      next(err);
    }
  }

  async assignExpertise(req: Request, res: Response, next: NextFunction) {
    try {
      const { courseId, facultyId, proficiencyLevel } = req.body;
      const result = await adminService.assignExpertise(courseId, facultyId, proficiencyLevel);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  // Classrooms
  async listClassrooms(_req: Request, res: Response, next: NextFunction) {
    try {
      const rooms = await adminService.listClassrooms();
      res.json({ success: true, data: rooms });
    } catch (err) {
      next(err);
    }
  }

  async createClassroom(req: Request, res: Response, next: NextFunction) {
    try {
      const data = createClassroomSchema.parse(req.body);
      const room = await adminService.createClassroom(data, req.user?.id);
      res.status(201).json({ success: true, data: room });
    } catch (err) {
      next(err);
    }
  }

  async updateClassroom(req: Request, res: Response, next: NextFunction) {
    try {
      const room = await adminService.updateClassroom(req.params.id, req.body);
      res.json({ success: true, data: room });
    } catch (err) {
      next(err);
    }
  }

  // Time Slots
  async listTimeSlots(_req: Request, res: Response, next: NextFunction) {
    try {
      const slots = await prisma.timeSlot.findMany({
        orderBy: [{ dayOfWeek: 'asc' }, { periodNumber: 'asc' }],
      });
      res.json({ success: true, data: slots });
    } catch (err) {
      next(err);
    }
  }

  // Academic Sessions
  async listAcademicSessions(_req: Request, res: Response, next: NextFunction) {
    try {
      const sessions = await adminService.listAcademicSessions();
      res.json({ success: true, data: sessions });
    } catch (err) {
      next(err);
    }
  }

  async createAcademicSession(req: Request, res: Response, next: NextFunction) {
    try {
      const session = await adminService.createAcademicSession(req.body);
      res.status(201).json({ success: true, data: session });
    } catch (err) {
      next(err);
    }
  }

  // Audit Logs
  async getAuditLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, entityType, action, page, limit } = req.query;
      const logs = await adminService.getAuditLogs({
        userId: userId as string,
        entityType: entityType as string,
        action: action as string,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 30,
      });
      res.json({ success: true, ...logs });
    } catch (err) {
      next(err);
    }
  }
}

export const adminController = new AdminController();
