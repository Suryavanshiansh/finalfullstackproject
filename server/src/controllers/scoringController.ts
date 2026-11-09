import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { scoringService } from '../services/scoringService';

const policyUpdateSchema = z.object({
  name: z.string().optional(),
  version: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(
    z.object({
      categoryId: z.string(),
      weight: z.number().min(0).max(1),
      upperLimit: z.number().min(0.01),
      description: z.string().optional(),
    })
  ).min(1, 'At least one category policy item is required'),
});

export class ScoringController {
  async getMyScore(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
        return;
      }
      const sessionId = req.query.academicSessionId as string;
      const report = await scoringService.calculateFacultyScore(req.user.id, sessionId);
      res.json({ success: true, data: report });
    } catch (err) {
      next(err);
    }
  }

  async getFacultyScore(req: Request, res: Response, next: NextFunction) {
    try {
      const { facultyId } = req.params;
      const sessionId = req.query.academicSessionId as string;

      // Access checks: Faculty can only see own score, Reviewers only their department
      if (req.user?.role === 'FACULTY' && req.user.id !== facultyId) {
        res.status(403).json({
          success: false,
          error: { message: 'Unauthorized to view another faculty member’s score.' },
        });
        return;
      }

      const report = await scoringService.calculateFacultyScore(facultyId, sessionId);
      res.json({ success: true, data: report });
    } catch (err) {
      next(err);
    }
  }

  async getDepartmentScores(req: Request, res: Response, next: NextFunction) {
    try {
      const { departmentId } = req.params;
      const sessionId = req.query.academicSessionId as string;

      if (req.user?.role === 'REVIEWER' && req.user.departmentId !== departmentId) {
        res.status(403).json({
          success: false,
          error: { message: 'Unauthorized to view another department’s score report.' },
        });
        return;
      }

      const summary = await scoringService.getDepartmentScoresSummary(departmentId, sessionId);
      res.json({ success: true, data: summary });
    } catch (err) {
      next(err);
    }
  }

  async getActivePolicy(req: Request, res: Response, next: NextFunction) {
    try {
      const sessionId = req.query.academicSessionId as string;
      const policy = await scoringService.getActivePolicy(sessionId);
      res.json({ success: true, data: policy });
    } catch (err) {
      next(err);
    }
  }

  async updatePolicy(req: Request, res: Response, next: NextFunction) {
    try {
      const data = policyUpdateSchema.parse(req.body);
      const updated = await scoringService.updateScoringPolicy(
        req.params.id,
        data,
        req.user?.id
      );
      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }
}

export const scoringController = new ScoringController();
