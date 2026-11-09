import { prisma } from '../db/prisma';
import { eventService } from './eventService';

export class ApprovalService {
  async getReviewerQueue(params: {
    reviewerDepartmentId?: string | null;
    status?: string;
    categoryId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const {
      reviewerDepartmentId,
      status,
      categoryId,
      search,
      page = 1,
      limit = 20,
    } = params;

    const where: any = {};

    if (reviewerDepartmentId) {
      where.faculty = { departmentId: reviewerDepartmentId };
    }

    if (status) {
      where.status = status;
    } else {
      where.status = { in: ['SUBMITTED', 'UNDER_REVIEW', 'CORRECTION_REQUESTED'] };
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { faculty: { firstName: { contains: search } } },
        { faculty: { lastName: { contains: search } } },
      ];
    }

    const [total, items] = await Promise.all([
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
              department: true,
            },
          },
          evidence: true,
          approvalRecords: {
            include: {
              reviewer: {
                select: { firstName: true, lastName: true },
              },
            },
            orderBy: { timestamp: 'desc' },
          },
        },
        orderBy: { submissionDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data: items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async startReview(activityId: string, reviewerId: string) {
    const activity = await prisma.activity.findUnique({ where: { id: activityId } });
    if (!activity) throw new Error('Activity not found.');

    if (activity.status !== 'SUBMITTED') {
      throw new Error(`Cannot start review on activity with status "${activity.status}".`);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const act = await tx.activity.update({
        where: { id: activityId },
        data: {
          status: 'UNDER_REVIEW',
          reviewerId,
        },
      });

      await tx.approvalRecord.create({
        data: {
          activityId,
          reviewerId,
          action: 'START_REVIEW',
          previousStatus: 'SUBMITTED',
          newStatus: 'UNDER_REVIEW',
          comment: 'Reviewer commenced assessment of submitted activity and supporting documents.',
        },
      });

      return act;
    });

    return updated;
  }

  async approveActivity(
    activityId: string,
    reviewerId: string,
    data: { approvedValue?: number; feedback?: string }
  ) {
    const activity = await prisma.activity.findUnique({
      where: { id: activityId },
      include: { faculty: true, category: true },
    });
    if (!activity) throw new Error('Activity not found.');

    if (!['SUBMITTED', 'UNDER_REVIEW'].includes(activity.status)) {
      throw new Error(`Cannot approve activity with status "${activity.status}".`);
    }

    const verifiedValue =
      data.approvedValue !== undefined && data.approvedValue !== null
        ? Number(data.approvedValue)
        : activity.quantitativeValue;

    if (verifiedValue < 0) {
      throw new Error('Approved value cannot be negative.');
    }

    const updated = await prisma.$transaction(async (tx) => {
      const act = await tx.activity.update({
        where: { id: activityId },
        data: {
          status: 'APPROVED',
          approvedValue: verifiedValue,
          reviewerFeedback: data.feedback?.trim() || 'Approved after review.',
          reviewedDate: new Date(),
          reviewerId,
        },
      });

      await tx.approvalRecord.create({
        data: {
          activityId,
          reviewerId,
          action: 'APPROVE',
          previousStatus: activity.status,
          newStatus: 'APPROVED',
          comment: data.feedback?.trim() || `Approved with verified value: ${verifiedValue} ${activity.category.unitLabel}`,
        },
      });

      return act;
    });

    await eventService.emitNotification({
      userId: activity.facultyId,
      title: 'Activity Approved',
      message: `Your activity "${activity.title}" was approved (${verifiedValue} ${activity.category.unitLabel}).`,
      type: 'SUCCESS',
      linkUrl: `/faculty/activities/${activityId}`,
    });

    await eventService.emitAuditLog({
      userId: reviewerId,
      action: 'ACTIVITY_APPROVE',
      entityType: 'ACTIVITY',
      entityId: activityId,
      details: `Approved activity "${activity.title}" for ${activity.faculty.firstName} ${activity.faculty.lastName}`,
    });

    return updated;
  }

  async rejectActivity(
    activityId: string,
    reviewerId: string,
    data: { reason: string }
  ) {
    if (!data.reason || data.reason.trim().length < 5) {
      throw new Error('A mandatory rejection reason (minimum 5 characters) is required.');
    }

    const activity = await prisma.activity.findUnique({
      where: { id: activityId },
      include: { faculty: true },
    });
    if (!activity) throw new Error('Activity not found.');

    if (!['SUBMITTED', 'UNDER_REVIEW'].includes(activity.status)) {
      throw new Error(`Cannot reject activity with status "${activity.status}".`);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const act = await tx.activity.update({
        where: { id: activityId },
        data: {
          status: 'REJECTED',
          approvedValue: 0,
          reviewerFeedback: data.reason.trim(),
          reviewedDate: new Date(),
          reviewerId,
        },
      });

      await tx.approvalRecord.create({
        data: {
          activityId,
          reviewerId,
          action: 'REJECT',
          previousStatus: activity.status,
          newStatus: 'REJECTED',
          comment: data.reason.trim(),
        },
      });

      return act;
    });

    await eventService.emitNotification({
      userId: activity.facultyId,
      title: 'Activity Rejected',
      message: `Your activity "${activity.title}" was rejected: ${data.reason}`,
      type: 'WARNING',
      linkUrl: `/faculty/activities/${activityId}`,
    });

    await eventService.emitAuditLog({
      userId: reviewerId,
      action: 'ACTIVITY_REJECT',
      entityType: 'ACTIVITY',
      entityId: activityId,
      details: `Rejected activity "${activity.title}". Reason: ${data.reason}`,
    });

    return updated;
  }

  async requestCorrection(
    activityId: string,
    reviewerId: string,
    data: { explanation: string }
  ) {
    if (!data.explanation || data.explanation.trim().length < 5) {
      throw new Error('A mandatory correction explanation (minimum 5 characters) is required.');
    }

    const activity = await prisma.activity.findUnique({
      where: { id: activityId },
      include: { faculty: true },
    });
    if (!activity) throw new Error('Activity not found.');

    if (!['SUBMITTED', 'UNDER_REVIEW'].includes(activity.status)) {
      throw new Error(`Cannot request correction on activity with status "${activity.status}".`);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const act = await tx.activity.update({
        where: { id: activityId },
        data: {
          status: 'CORRECTION_REQUESTED',
          reviewerFeedback: data.explanation.trim(),
          reviewedDate: new Date(),
          reviewerId,
        },
      });

      await tx.approvalRecord.create({
        data: {
          activityId,
          reviewerId,
          action: 'REQUEST_CORRECTION',
          previousStatus: activity.status,
          newStatus: 'CORRECTION_REQUESTED',
          comment: data.explanation.trim(),
        },
      });

      return act;
    });

    await eventService.emitNotification({
      userId: activity.facultyId,
      title: 'Correction Requested on Activity',
      message: `Reviewer requested corrections for "${activity.title}": ${data.explanation}`,
      type: 'ACTION_REQUIRED',
      linkUrl: `/faculty/activities/${activityId}`,
    });

    await eventService.emitAuditLog({
      userId: reviewerId,
      action: 'ACTIVITY_REQUEST_CORRECTION',
      entityType: 'ACTIVITY',
      entityId: activityId,
      details: `Requested correction for "${activity.title}": ${data.explanation}`,
    });

    return updated;
  }

  async getReviewerDashboardStats(departmentId?: string | null) {
    const whereDept = departmentId ? { faculty: { departmentId } } : {};

    const [
      pendingCount,
      underReviewCount,
      approvedThisMonth,
      correctionCount,
      facultyList,
    ] = await Promise.all([
      prisma.activity.count({ where: { ...whereDept, status: 'SUBMITTED' } }),
      prisma.activity.count({ where: { ...whereDept, status: 'UNDER_REVIEW' } }),
      prisma.activity.count({ where: { ...whereDept, status: 'APPROVED' } }),
      prisma.activity.count({ where: { ...whereDept, status: 'CORRECTION_REQUESTED' } }),
      prisma.user.findMany({
        where: departmentId ? { departmentId, role: 'FACULTY' } : { role: 'FACULTY' },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeId: true,
          designation: true,
          activities: {
            select: { status: true, approvedValue: true, categoryId: true },
          },
        },
      }),
    ]);

    const facultySummary = facultyList.map((f) => {
      const approvedActs = f.activities.filter((a) => a.status === 'APPROVED');
      const pendingActs = f.activities.filter((a) =>
        ['SUBMITTED', 'UNDER_REVIEW', 'CORRECTION_REQUESTED'].includes(a.status)
      );

      return {
        id: f.id,
        name: `${f.firstName} ${f.lastName}`,
        employeeId: f.employeeId,
        designation: f.designation,
        totalApproved: approvedActs.length,
        totalPending: pendingActs.length,
      };
    });

    return {
      pendingApprovals: pendingCount,
      underReview: underReviewCount,
      approvedTotal: approvedThisMonth,
      correctionRequested: correctionCount,
      facultyCount: facultyList.length,
      facultySummary,
    };
  }
}

export const approvalService = new ApprovalService();
