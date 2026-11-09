import { prisma } from '../db/prisma';
import { scoringService } from './scoringService';

export class ReportingService {
  async getFacultyContributionReport(params: {
    departmentId?: string;
    academicSessionId?: string;
  }) {
    let session = params.academicSessionId
      ? await prisma.academicSession.findUnique({ where: { id: params.academicSessionId } })
      : await prisma.academicSession.findFirst({ where: { isCurrent: true } });

    if (!session) {
      session = await prisma.academicSession.findFirst({ orderBy: { createdAt: 'desc' } });
    }

    const facultyList = await prisma.user.findMany({
      where: {
        role: 'FACULTY',
        status: 'ACTIVE',
        departmentId: params.departmentId || undefined,
      },
      include: { department: true },
      orderBy: { lastName: 'asc' },
    });

    const rows = await Promise.all(
      facultyList.map(async (faculty) => {
        try {
          const scoreReport = await scoringService.calculateFacultyScore(faculty.id, session?.id);
          return {
            facultyId: faculty.id,
            name: `${faculty.firstName} ${faculty.lastName}`,
            employeeId: faculty.employeeId,
            designation: faculty.designation,
            department: faculty.department?.name || 'Unassigned',
            departmentCode: faculty.department?.code || 'N/A',
            overallContributionIndex: scoreReport.overallContributionIndex,
            tier: scoreReport.tier,
            tierLabel: scoreReport.tierLabel,
            categoryBreakdown: scoreReport.breakdown.reduce((acc, b) => {
              acc[b.categoryCode] = {
                actual: b.actualContribution,
                normalized: b.normalizedScore,
                weighted: b.weightedContribution,
              };
              return acc;
            }, {} as Record<string, any>),
          };
        } catch (e) {
          return {
            facultyId: faculty.id,
            name: `${faculty.firstName} ${faculty.lastName}`,
            employeeId: faculty.employeeId,
            designation: faculty.designation,
            department: faculty.department?.name || 'Unassigned',
            departmentCode: faculty.department?.code || 'N/A',
            overallContributionIndex: 0,
            tier: 'NEEDS_IMPROVEMENT',
            tierLabel: 'Needs Improvement',
            categoryBreakdown: {},
          };
        }
      })
    );

    return {
      academicSession: session?.name || 'N/A',
      generatedAt: new Date().toISOString(),
      totalFaculty: rows.length,
      data: rows,
    };
  }

  async getDepartmentAnalytics(academicSessionId?: string) {
    const departments = await prisma.department.findMany({
      include: {
        users: { where: { role: 'FACULTY', status: 'ACTIVE' } },
      },
    });

    const results = await Promise.all(
      departments.map(async (dept) => {
        const scores = await scoringService.getDepartmentScoresSummary(dept.id, academicSessionId);
        const activitiesCount = await prisma.activity.count({
          where: { faculty: { departmentId: dept.id } },
        });
        const approvedCount = await prisma.activity.count({
          where: { faculty: { departmentId: dept.id }, status: 'APPROVED' },
        });

        return {
          departmentId: dept.id,
          code: dept.code,
          name: dept.name,
          facultyCount: dept.users.length,
          averageOCI: scores.averageScore,
          activitiesSubmitted: activitiesCount,
          activitiesApproved: approvedCount,
          approvalRate:
            activitiesCount > 0 ? Math.round((approvedCount / activitiesCount) * 100) : 0,
        };
      })
    );

    return results;
  }

  async getActivityParticipationReport(categoryId?: string, academicSessionId?: string) {
    const where: any = {};
    if (categoryId) where.categoryId = categoryId;
    if (academicSessionId) where.academicSessionId = academicSessionId;

    const activities = await prisma.activity.findMany({
      where,
      include: {
        category: true,
        faculty: {
          select: {
            firstName: true,
            lastName: true,
            employeeId: true,
            department: { select: { code: true, name: true } },
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    // Aggregate by category
    const categoryStats: Record<
      string,
      { code: string; name: string; total: number; approved: number; units: number }
    > = {};

    for (const act of activities) {
      if (!categoryStats[act.category.code]) {
        categoryStats[act.category.code] = {
          code: act.category.code,
          name: act.category.name,
          total: 0,
          approved: 0,
          units: 0,
        };
      }
      categoryStats[act.category.code].total++;
      if (act.status === 'APPROVED') {
        categoryStats[act.category.code].approved++;
        categoryStats[act.category.code].units += act.approvedValue ?? act.quantitativeValue;
      }
    }

    return {
      summary: Object.values(categoryStats),
      details: activities,
    };
  }

  exportToCSV(headers: string[], rows: (string | number)[][]): string {
    const escape = (val: string | number) => {
      const str = String(val ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const lines = [
      headers.map(escape).join(','),
      ...rows.map((row) => row.map(escape).join(',')),
    ];

    return lines.join('\r\n');
  }
}

export const reportingService = new ReportingService();
