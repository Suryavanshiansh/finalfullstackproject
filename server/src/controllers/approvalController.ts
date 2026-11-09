import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { approvalService } from '../services/approvalService';

const approveSchema = z.object({
  approvedValue: z.number().min(0).optional(),
  feedback: z.string().optional(),
});

const rejectSchema = z.object({
  reason: z.string().min(5, 'Rejection reason must be at least 5 characters'),
});

const correctionSchema = z.object({
  explanation: z.string().min(5, 'Correction explanation must be at least 5 characters'),
});

export class ApprovalController {
  async getQueue(req: Request, res: Response, next: NextFunction) {
    try {
      const { status, categoryId, search, page, limit } = req.query;

      // Restrict Reviewer to their own department (Admins see all)
      let departmentId: string | null = null;
      if (req.user?.role === 'REVIEWER') {
        departmentId = req.user.departmentId;
      } else if (req.query.departmentId) {
        departmentId = req.query.departmentId as string;
      }

      const queue = await approvalService.getReviewerQueue({
        reviewerDepartmentId: departmentId,
        status: status as string,
        categoryId: categoryId as string,
        search: search as string,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20,
      });

      res.json({ success: true, ...queue });
    } catch (err) {
      next(err);
    }
  }

  async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      let departmentId: string | null = null;
      if (req.user?.role === 'REVIEWER') {
        departmentId = req.user.departmentId;
      } else if (req.query.departmentId) {
        departmentId = req.query.departmentId as string;
      }

      const stats = await approvalService.getReviewerDashboardStats(departmentId);
      res.json({ success: true, data: stats });
    } catch (err) {
      next(err);
    }
  }

  async startReview(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
        return;
      }
      const activity = await approvalService.startReview(req.params.id, req.user.id);
      res.json({ success: true, data: activity });
    } catch (err) {
      next(err);
    }
  }

  async approve(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
        return;
      }
      const data = approveSchema.parse(req.body);
      const activity = await approvalService.approveActivity(req.params.id, req.user.id, data);
      res.json({ success: true, data: activity });
    } catch (err) {
      next(err);
    }
  }

  async reject(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
        return;
      }
      const data = rejectSchema.parse(req.body);
      const activity = await approvalService.rejectActivity(req.params.id, req.user.id, data);
      res.json({ success: true, data: activity });
    } catch (err) {
      next(err);
    }
  }

  async requestCorrection(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
        return;
      }
      const data = correctionSchema.parse(req.body);
      const activity = await approvalService.requestCorrection(
        req.params.id,
        req.user.id,
        data
      );
      res.json({ success: true, data: activity });
    } catch (err) {
      next(err);
    }
  }
}

export const approvalController = new ApprovalController();
