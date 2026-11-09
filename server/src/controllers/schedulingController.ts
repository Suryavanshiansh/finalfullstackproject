import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { schedulingService } from '../services/schedulingService';
import { prisma } from '../db/prisma';

const checkConflictSchema = z.object({
  academicSessionId: z.string(),
  courseId: z.string(),
  facultyId: z.string(),
  classroomId: z.string(),
  timeSlotId: z.string(),
  dayOfWeek: z.string(),
  excludeEntryId: z.string().optional(),
});

const commitScheduleSchema = z.object({
  academicSessionId: z.string(),
  entries: z.array(
    z.object({
      courseId: z.string(),
      facultyId: z.string(),
      classroomId: z.string(),
      timeSlotId: z.string(),
      dayOfWeek: z.string(),
    })
  ).min(1, 'At least one schedule entry is required to commit'),
  clearExisting: z.boolean().optional(),
});

const availabilitySchema = z.array(
  z.object({
    dayOfWeek: z.string(),
    preferredSlot: z.enum(['MORNING', 'AFTERNOON', 'ANY', 'UNAVAILABLE']),
    maxDailyHours: z.number().min(0).max(12).optional(),
    notes: z.string().optional(),
  })
);

export class SchedulingController {
  async getTimetable(req: Request, res: Response, next: NextFunction) {
    try {
      const { academicSessionId, classroomId, departmentId, dayOfWeek } = req.query;
      let facultyId = req.query.facultyId as string;

      if (req.user?.role === 'FACULTY' && !facultyId) {
        // Faculty default to viewing own schedule unless explicitly requesting department
        facultyId = req.user.id;
      }

      const entries = await schedulingService.getTimetable({
        academicSessionId: academicSessionId as string,
        facultyId,
        classroomId: classroomId as string,
        departmentId: departmentId as string,
        dayOfWeek: dayOfWeek as string,
      });

      res.json({ success: true, data: entries });
    } catch (err) {
      next(err);
    }
  }

  async checkConflicts(req: Request, res: Response, next: NextFunction) {
    try {
      const data = checkConflictSchema.parse(req.body);
      const result = await schedulingService.checkScheduleConflicts(data);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async generate(req: Request, res: Response, next: NextFunction) {
    try {
      const { academicSessionId, departmentId } = req.body;
      if (!academicSessionId) {
        res.status(400).json({ success: false, error: { message: 'academicSessionId is required' } });
        return;
      }

      const result = await schedulingService.generateFeasibleSchedule(
        academicSessionId,
        departmentId
      );
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async commit(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
        return;
      }
      const data = commitScheduleSchema.parse(req.body);
      const result = await schedulingService.commitSchedule(
        data.academicSessionId,
        data.entries,
        req.user.id,
        data.clearExisting
      );
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async deleteEntry(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
        return;
      }
      const result = await schedulingService.deleteScheduleEntry(req.params.id, req.user.id);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async getAvailability(req: Request, res: Response, next: NextFunction) {
    try {
      const facultyId = (req.query.facultyId as string) || req.user?.id;
      if (!facultyId) {
        res.status(400).json({ success: false, error: { message: 'Faculty ID required' } });
        return;
      }

      const availabilities = await prisma.facultyAvailability.findMany({
        where: { facultyId },
        orderBy: { dayOfWeek: 'asc' },
      });

      res.json({ success: true, data: availabilities });
    } catch (err) {
      next(err);
    }
  }

  async updateAvailability(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
        return;
      }
      const facultyId = req.user.id;
      const data = availabilitySchema.parse(req.body);

      const results = await prisma.$transaction(
        data.map((item) =>
          prisma.facultyAvailability.upsert({
            where: {
              facultyId_dayOfWeek: {
                facultyId,
                dayOfWeek: item.dayOfWeek,
              },
            },
            update: {
              preferredSlot: item.preferredSlot,
              maxDailyHours: item.maxDailyHours || 6.0,
              notes: item.notes,
            },
            create: {
              facultyId,
              dayOfWeek: item.dayOfWeek,
              preferredSlot: item.preferredSlot,
              maxDailyHours: item.maxDailyHours || 6.0,
              notes: item.notes,
            },
          })
        )
      );

      res.json({ success: true, data: results });
    } catch (err) {
      next(err);
    }
  }
}

export const schedulingController = new SchedulingController();
