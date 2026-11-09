import { prisma } from '../db/prisma';
import { ActivityStatus } from '../types';
import { eventService } from './eventService';
import fs from 'fs';

export class ActivityService {
  async listActivities(params: {
    facultyId?: string;
    departmentId?: string;
    categoryId?: string;
    status?: ActivityStatus;
    academicSessionId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const {
      facultyId,
      departmentId,
      categoryId,
      status,
      academicSessionId,
      search,
      page = 1,
      limit = 20,
    } = params;

    const where: any = {};

    if (facultyId) {
      where.facultyId = facultyId;
    } else if (departmentId) {
      where.faculty = { departmentId };
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (status) {
      where.status = status;
    }

    if (academicSessionId) {
      where.academicSessionId = academicSessionId;
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const [total, activities] = await Promise.all([
      prisma.activity.count({ where }),
      prisma.activity.findMany({
        where,
        include: {
          category: true,
          academicSession: true,
          faculty: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeId: true,
              designation: true,
              department: { select: { id: true, code: true, name: true } },
            },
          },
          evidence: true,
          reviewer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              designation: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data: activities,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getActivityById(id: string) {
    const activity = await prisma.activity.findUnique({
      where: { id },
      include: {
        category: true,
        academicSession: true,
        evidence: true,
        faculty: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeId: true,
            designation: true,
            department: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            designation: true,
          },
        },
        approvalRecords: {
          include: {
            reviewer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                designation: true,
              },
            },
          },
          orderBy: { timestamp: 'desc' },
        },
      },
    });

    if (!activity) throw new Error('Activity not found.');
    return activity;
  }

  async createActivity(
    facultyId: string,
    data: {
      categoryId: string;
      academicSessionId?: string;
      title: string;
      description: string;
      date: string | Date;
      endDate?: string | Date;
      quantitativeValue: number;
    }
  ) {
    // Resolve current academic session if not provided
    let sessionId = data.academicSessionId;
    if (!sessionId) {
      const current = await prisma.academicSession.findFirst({
        where: { isCurrent: true },
      });
      if (!current) throw new Error('No active academic session found.');
      sessionId = current.id;
    }

    const activity = await prisma.activity.create({
      data: {
        facultyId,
        categoryId: data.categoryId,
        academicSessionId: sessionId,
        title: data.title.trim(),
        description: data.description.trim(),
        date: new Date(data.date),
        endDate: data.endDate ? new Date(data.endDate) : null,
        quantitativeValue: Number(data.quantitativeValue),
        status: 'DRAFT',
      },
      include: {
        category: true,
        academicSession: true,
      },
    });

    await eventService.emitAuditLog({
      userId: facultyId,
      action: 'ACTIVITY_CREATE',
      entityType: 'ACTIVITY',
      entityId: activity.id,
      details: `Created draft activity: "${activity.title}" (${activity.category.name})`,
    });

    return activity;
  }

  async updateActivity(
    id: string,
    facultyId: string,
    data: {
      categoryId?: string;
      title?: string;
      description?: string;
      date?: string | Date;
      endDate?: string | Date | null;
      quantitativeValue?: number;
    }
  ) {
    const existing = await prisma.activity.findUnique({ where: { id } });
    if (!existing) throw new Error('Activity not found.');

    if (existing.facultyId !== facultyId) {
      throw new Error('Unauthorized: You can only edit your own activities.');
    }

    if (!['DRAFT', 'CORRECTION_REQUESTED'].includes(existing.status)) {
      throw new Error(
        `Cannot edit activity with status "${existing.status}". Only DRAFT and CORRECTION_REQUESTED activities can be modified.`
      );
    }

    const updated = await prisma.activity.update({
      where: { id },
      data: {
        categoryId: data.categoryId || existing.categoryId,
        title: data.title ? data.title.trim() : existing.title,
        description: data.description ? data.description.trim() : existing.description,
        date: data.date ? new Date(data.date) : existing.date,
        endDate: data.endDate !== undefined ? (data.endDate ? new Date(data.endDate) : null) : existing.endDate,
        quantitativeValue: data.quantitativeValue !== undefined ? Number(data.quantitativeValue) : existing.quantitativeValue,
      },
      include: {
        category: true,
        evidence: true,
      },
    });

    await eventService.emitAuditLog({
      userId: facultyId,
      action: 'ACTIVITY_UPDATE',
      entityType: 'ACTIVITY',
      entityId: id,
      details: `Updated activity: "${updated.title}"`,
    });

    return updated;
  }

  async deleteActivity(id: string, facultyId: string, isAdmin = false) {
    const existing = await prisma.activity.findUnique({
      where: { id },
      include: { evidence: true },
    });
    if (!existing) throw new Error('Activity not found.');

    if (!isAdmin && existing.facultyId !== facultyId) {
      throw new Error('Unauthorized: You can only delete your own activities.');
    }

    if (!isAdmin && !['DRAFT', 'REJECTED'].includes(existing.status)) {
      throw new Error(
        `Cannot delete activity with status "${existing.status}". Only DRAFT and REJECTED submissions can be deleted.`
      );
    }

    // Clean up uploaded files on disk
    for (const ev of existing.evidence) {
      if (fs.existsSync(ev.filePath)) {
        try {
          fs.unlinkSync(ev.filePath);
        } catch (e) {
          console.warn('Could not delete file:', ev.filePath);
        }
      }
    }

    await prisma.activity.delete({ where: { id } });

    await eventService.emitAuditLog({
      userId: facultyId,
      action: 'ACTIVITY_DELETE',
      entityType: 'ACTIVITY',
      entityId: id,
      details: `Deleted activity "${existing.title}"`,
    });

    return { message: 'Activity deleted successfully.' };
  }

  async submitActivity(id: string, facultyId: string) {
    const existing = await prisma.activity.findUnique({
      where: { id },
      include: { evidence: true, faculty: { include: { department: true } } },
    });
    if (!existing) throw new Error('Activity not found.');

    if (existing.facultyId !== facultyId) {
      throw new Error('Unauthorized: You can only submit your own activities.');
    }

    if (existing.status !== 'DRAFT') {
      throw new Error(`Cannot submit activity with status "${existing.status}". Expected DRAFT.`);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const act = await tx.activity.update({
        where: { id },
        data: {
          status: 'SUBMITTED',
          submissionDate: new Date(),
        },
      });

      await tx.approvalRecord.create({
        data: {
          activityId: id,
          reviewerId: facultyId, // original submitter action record
          action: 'SUBMIT',
          previousStatus: 'DRAFT',
          newStatus: 'SUBMITTED',
          comment: 'Submitted for department review.',
        },
      });

      return act;
    });

    // Notify Department Reviewer if available
    if (existing.faculty.department?.hodId) {
      await eventService.emitNotification({
        userId: existing.faculty.department.hodId,
        title: 'New Activity Submitted for Review',
        message: `${existing.faculty.firstName} ${existing.faculty.lastName} submitted "${existing.title}" for approval.`,
        type: 'ACTION_REQUIRED',
        linkUrl: `/reviewer/approval-queue?activityId=${id}`,
      });
    }

    await eventService.emitAuditLog({
      userId: facultyId,
      action: 'ACTIVITY_SUBMIT',
      entityType: 'ACTIVITY',
      entityId: id,
      details: `Submitted activity "${existing.title}" for review.`,
    });

    return updated;
  }

  async resubmitActivity(id: string, facultyId: string, notes: string) {
    const existing = await prisma.activity.findUnique({
      where: { id },
      include: { faculty: { include: { department: true } } },
    });
    if (!existing) throw new Error('Activity not found.');

    if (existing.facultyId !== facultyId) {
      throw new Error('Unauthorized: You can only resubmit your own activities.');
    }

    if (existing.status !== 'CORRECTION_REQUESTED') {
      throw new Error(
        `Cannot resubmit activity with status "${existing.status}". Expected CORRECTION_REQUESTED.`
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const act = await tx.activity.update({
        where: { id },
        data: {
          status: 'SUBMITTED',
          correctionNotes: notes,
          submissionDate: new Date(),
        },
      });

      await tx.approvalRecord.create({
        data: {
          activityId: id,
          reviewerId: facultyId,
          action: 'RESUBMIT',
          previousStatus: 'CORRECTION_REQUESTED',
          newStatus: 'SUBMITTED',
          comment: `Resubmitted with corrections: ${notes}`,
        },
      });

      return act;
    });

    if (existing.reviewerId) {
      await eventService.emitNotification({
        userId: existing.reviewerId,
        title: 'Activity Resubmitted with Corrections',
        message: `${existing.faculty.firstName} ${existing.faculty.lastName} resubmitted "${existing.title}".`,
        type: 'ACTION_REQUIRED',
        linkUrl: `/reviewer/approval-queue?activityId=${id}`,
      });
    }

    return updated;
  }

  async addEvidence(
    activityId: string,
    facultyId: string,
    file: Express.Multer.File
  ) {
    const activity = await prisma.activity.findUnique({ where: { id: activityId } });
    if (!activity) throw new Error('Activity not found.');

    if (activity.facultyId !== facultyId) {
      throw new Error('Unauthorized: You cannot attach evidence to someone else’s activity.');
    }

    const evidence = await prisma.evidenceAttachment.create({
      data: {
        activityId,
        fileName: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
        filePath: file.path,
      },
    });

    return evidence;
  }

  async deleteEvidence(evidenceId: string, facultyId: string) {
    const evidence = await prisma.evidenceAttachment.findUnique({
      where: { id: evidenceId },
      include: { activity: true },
    });

    if (!evidence) throw new Error('Evidence file not found.');

    if (evidence.activity.facultyId !== facultyId) {
      throw new Error('Unauthorized: You cannot delete this evidence.');
    }

    if (['APPROVED', 'UNDER_REVIEW'].includes(evidence.activity.status)) {
      throw new Error('Cannot delete evidence from an activity that is under review or approved.');
    }

    if (fs.existsSync(evidence.filePath)) {
      try {
        fs.unlinkSync(evidence.filePath);
      } catch (err) {
        console.warn('Could not remove file on disk:', evidence.filePath);
      }
    }

    await prisma.evidenceAttachment.delete({ where: { id: evidenceId } });
    return { message: 'Evidence removed.' };
  }

  async getFacultyDashboardMetrics(facultyId: string, academicSessionId?: string) {
    let sessionId = academicSessionId;
    if (!sessionId) {
      const current = await prisma.academicSession.findFirst({ where: { isCurrent: true } });
      sessionId = current?.id;
    }

    const where: any = { facultyId };
    if (sessionId) where.academicSessionId = sessionId;

    const [
      totalSubmitted,
      approvedCount,
      pendingCount,
      correctionCount,
      rejectedCount,
      teachingWorkloadAgg,
    ] = await Promise.all([
      prisma.activity.count({ where }),
      prisma.activity.count({ where: { ...where, status: 'APPROVED' } }),
      prisma.activity.count({
        where: { ...where, status: { in: ['SUBMITTED', 'UNDER_REVIEW'] } },
      }),
      prisma.activity.count({ where: { ...where, status: 'CORRECTION_REQUESTED' } }),
      prisma.activity.count({ where: { ...where, status: 'REJECTED' } }),
      prisma.activity.aggregate({
        where: {
          ...where,
          category: { code: 'TEACHING' },
          status: 'APPROVED',
        },
        _sum: { approvedValue: true },
      }),
    ]);

    const teachingHoursApproved = teachingWorkloadAgg._sum.approvedValue || 0;

    return {
      totalSubmitted,
      approvedCount,
      pendingCount,
      correctionCount,
      rejectedCount,
      teachingHoursApproved,
    };
  }
}

export const activityService = new ActivityService();
