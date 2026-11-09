import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { activityService } from '../services/activityService';
import { prisma } from '../db/prisma';

const createActivitySchema = z.object({
  categoryId: z.string().min(1, 'Category is required'),
  academicSessionId: z.string().optional(),
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(5, 'Description must be at least 5 characters'),
  date: z.string().min(1, 'Date is required'),
  endDate: z.string().optional(),
  quantitativeValue: z.number().min(0.01, 'Value must be greater than zero'),
});

const updateActivitySchema = z.object({
  categoryId: z.string().optional(),
  title: z.string().min(3).optional(),
  description: z.string().min(5).optional(),
  date: z.string().optional(),
  endDate: z.string().optional().nullable(),
  quantitativeValue: z.number().min(0.01).optional(),
});

export class ActivityController {
  async listCategories(_req: Request, res: Response, next: NextFunction) {
    try {
      const categories = await prisma.activityCategory.findMany({
        orderBy: { defaultWeight: 'desc' },
      });
      res.json({ success: true, data: categories });
    } catch (err) {
      next(err);
    }
  }

  async listActivities(req: Request, res: Response, next: NextFunction) {
    try {
      const { categoryId, status, academicSessionId, search, page, limit } = req.query;

      let facultyId = req.query.facultyId as string;
      let departmentId = req.query.departmentId as string;

      // Faculty role can ONLY see their own activities
      if (req.user?.role === 'FACULTY') {
        facultyId = req.user.id;
      } else if (req.user?.role === 'REVIEWER') {
        // Reviewers default to their department if not filtering by specific faculty
        if (!facultyId && !departmentId && req.user.departmentId) {
          departmentId = req.user.departmentId;
        }
      }

      const result = await activityService.listActivities({
        facultyId,
        departmentId,
        categoryId: categoryId as string,
        status: status as any,
        academicSessionId: academicSessionId as string,
        search: search as string,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20,
      });

      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  async getActivity(req: Request, res: Response, next: NextFunction) {
    try {
      const activity = await activityService.getActivityById(req.params.id);

      // Access check
      if (req.user?.role === 'FACULTY' && activity.facultyId !== req.user.id) {
        res.status(403).json({
          success: false,
          error: { message: 'Unauthorized to view this activity.' },
        });
        return;
      }

      res.json({ success: true, data: activity });
    } catch (err) {
      next(err);
    }
  }

  async createActivity(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
        return;
      }
      const data = createActivitySchema.parse(req.body);
      const activity = await activityService.createActivity(req.user.id, data);
      res.status(201).json({ success: true, data: activity });
    } catch (err) {
      next(err);
    }
  }

  async updateActivity(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
        return;
      }
      const data = updateActivitySchema.parse(req.body);
      const activity = await activityService.updateActivity(req.params.id, req.user.id, data);
      res.json({ success: true, data: activity });
    } catch (err) {
      next(err);
    }
  }

  async deleteActivity(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
        return;
      }
      const isAdmin = req.user.role === 'ADMIN';
      const result = await activityService.deleteActivity(req.params.id, req.user.id, isAdmin);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async submitActivity(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
        return;
      }
      const activity = await activityService.submitActivity(req.params.id, req.user.id);
      res.json({ success: true, data: activity });
    } catch (err) {
      next(err);
    }
  }

  async resubmitActivity(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
        return;
      }
      const notes = (req.body.notes as string) || 'Corrections addressed and resubmitted.';
      const activity = await activityService.resubmitActivity(req.params.id, req.user.id, notes);
      res.json({ success: true, data: activity });
    } catch (err) {
      next(err);
    }
  }

  async uploadEvidence(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
        return;
      }
      if (!req.file) {
        res.status(400).json({ success: false, error: { message: 'No file uploaded.' } });
        return;
      }

      const evidence = await activityService.addEvidence(req.params.id, req.user.id, req.file);
      res.status(201).json({ success: true, data: evidence });
    } catch (err) {
      next(err);
    }
  }

  async deleteEvidence(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
        return;
      }
      const result = await activityService.deleteEvidence(req.params.evidenceId, req.user.id);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async getFacultyMetrics(req: Request, res: Response, next: NextFunction) {
    try {
      const facultyId = (req.query.facultyId as string) || req.user?.id;
      if (!facultyId) {
        res.status(400).json({ success: false, error: { message: 'Faculty ID required' } });
        return;
      }
      const metrics = await activityService.getFacultyDashboardMetrics(
        facultyId,
        req.query.academicSessionId as string
      );
      res.json({ success: true, data: metrics });
    } catch (err) {
      next(err);
    }
  }
}

export const activityController = new ActivityController();
