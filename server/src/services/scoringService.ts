import { prisma } from '../db/prisma';
import { FacultyScoreReport, ScoreCategoryBreakdown } from '../types';
import { eventService } from './eventService';

export class ScoringService {
  /**
   * Calculates the explainable Contribution Score for a specific faculty member.
   * Only APPROVED activities contribute to the Actual Contribution.
   */
  async calculateFacultyScore(
    facultyId: string,
    academicSessionId?: string
  ): Promise<FacultyScoreReport> {
    const faculty = await prisma.user.findUnique({
      where: { id: facultyId },
      include: { department: true },
    });

    if (!faculty) throw new Error('Faculty member not found.');

    // 1. Resolve Academic Session
    let session = academicSessionId
      ? await prisma.academicSession.findUnique({ where: { id: academicSessionId } })
      : await prisma.academicSession.findFirst({ where: { isCurrent: true } });

    if (!session) {
      session = await prisma.academicSession.findFirst({ orderBy: { createdAt: 'desc' } });
    }
    if (!session) throw new Error('No academic session found for scoring.');

    // 2. Fetch Active Scoring Policy
    const policy = await prisma.scoringPolicy.findFirst({
      where: { academicSessionId: session.id, isActive: true },
      include: {
        items: {
          include: { category: true },
        },
      },
    });

    if (!policy || policy.items.length === 0) {
      throw new Error(`No active scoring policy defined for session "${session.name}".`);
    }

    // 3. Fetch all approved & pending activities for this faculty in this session
    const [approvedActivities, pendingActivities] = await Promise.all([
      prisma.activity.findMany({
        where: {
          facultyId,
          academicSessionId: session.id,
          status: 'APPROVED',
        },
        select: {
          categoryId: true,
          approvedValue: true,
          quantitativeValue: true,
        },
      }),
      prisma.activity.findMany({
        where: {
          facultyId,
          academicSessionId: session.id,
          status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'CORRECTION_REQUESTED'] },
        },
        select: {
          categoryId: true,
        },
      }),
    ]);

    // Group actual approved contribution by category
    const approvedSums: Record<string, number> = {};
    const approvedCounts: Record<string, number> = {};
    for (const act of approvedActivities) {
      const val = act.approvedValue ?? act.quantitativeValue;
      approvedSums[act.categoryId] = (approvedSums[act.categoryId] || 0) + val;
      approvedCounts[act.categoryId] = (approvedCounts[act.categoryId] || 0) + 1;
    }

    const pendingCounts: Record<string, number> = {};
    for (const act of pendingActivities) {
      pendingCounts[act.categoryId] = (pendingCounts[act.categoryId] || 0) + 1;
    }

    // 4. Calculate Normalized Score and Weighted Contribution for each category
    const breakdown: ScoreCategoryBreakdown[] = [];
    let overallContributionIndex = 0;

    for (const item of policy.items) {
      const actual = approvedSums[item.categoryId] || 0;
      const upperLimit = item.upperLimit > 0 ? item.upperLimit : 1.0;

      // Formula: Normalized Score = 100 * min(actual / upper limit, 1)
      const ratio = Math.min(actual / upperLimit, 1.0);
      const normalizedScore = Math.round(100 * ratio * 100) / 100; // 2 decimal precision

      // Weighted Contribution = weight * normalizedScore
      const weightedContrib = Math.round(item.weight * normalizedScore * 100) / 100;
      overallContributionIndex += weightedContrib;

      breakdown.push({
        categoryId: item.categoryId,
        categoryCode: item.category.code,
        categoryName: item.category.name,
        icon: item.category.icon,
        unitLabel: item.category.unitLabel,
        actualContribution: Math.round(actual * 100) / 100,
        upperLimit: item.upperLimit,
        normalizedScore,
        weight: item.weight,
        weightedContribution: weightedContrib,
        approvedCount: approvedCounts[item.categoryId] || 0,
        pendingCount: pendingCounts[item.categoryId] || 0,
      });
    }

    overallContributionIndex = Math.round(overallContributionIndex * 100) / 100;

    // 5. Determine Qualitative Performance Tier
    let tier: FacultyScoreReport['tier'] = 'NEEDS_IMPROVEMENT';
    let tierLabel = 'Needs Improvement';

    if (overallContributionIndex >= 85) {
      tier = 'EXEMPLARY';
      tierLabel = 'Exemplary Performance (Tier A+)';
    } else if (overallContributionIndex >= 70) {
      tier = 'COMMENDABLE';
      tierLabel = 'Commendable Performance (Tier A)';
    } else if (overallContributionIndex >= 55) {
      tier = 'SATISFACTORY';
      tierLabel = 'Satisfactory Progress (Tier B)';
    } else if (overallContributionIndex >= 40) {
      tier = 'DEVELOPING';
      tierLabel = 'Developing / Threshold (Tier C)';
    }

    return {
      facultyId: faculty.id,
      facultyName: `${faculty.firstName} ${faculty.lastName}`,
      employeeId: faculty.employeeId,
      departmentName: faculty.department?.name || 'Unassigned',
      academicSessionId: session.id,
      academicSessionName: session.name,
      policyName: policy.name,
      policyVersion: policy.version,
      overallContributionIndex,
      tier,
      tierLabel,
      breakdown,
      calculatedAt: new Date().toISOString(),
    };
  }

  /**
   * Department-wide scores summary for Reviewer and Admin dashboards
   */
  async getDepartmentScoresSummary(departmentId: string, academicSessionId?: string) {
    const facultyMembers = await prisma.user.findMany({
      where: { departmentId, role: 'FACULTY', status: 'ACTIVE' },
      select: { id: true, firstName: true, lastName: true, employeeId: true, designation: true },
    });

    const reports = await Promise.all(
      facultyMembers.map(async (f) => {
        try {
          return await this.calculateFacultyScore(f.id, academicSessionId);
        } catch (e) {
          return null;
        }
      })
    );

    const validReports = reports.filter((r): r is FacultyScoreReport => r !== null);
    const averageScore = validReports.length > 0
      ? Math.round((validReports.reduce((sum, r) => sum + r.overallContributionIndex, 0) / validReports.length) * 100) / 100
      : 0;

    return {
      departmentId,
      facultyScores: validReports,
      averageScore,
      totalFaculty: validReports.length,
    };
  }

  /**
   * Scoring policy management: configure weights & upper limits.
   * STRICT REQUIREMENT: Weights must sum to 1.0.
   */
  async updateScoringPolicy(
    policyId: string,
    data: {
      name?: string;
      version?: string;
      notes?: string;
      items: Array<{
        categoryId: string;
        weight: number;
        upperLimit: number;
        description?: string;
      }>;
    },
    userId?: string
  ) {
    // 1. Verify weights sum to 1.0 (with 0.001 floating point tolerance)
    const totalWeight = data.items.reduce((sum, item) => sum + item.weight, 0);
    if (Math.abs(totalWeight - 1.0) > 0.001) {
      throw new Error(
        `Scoring policy category weights must sum to exactly 1.0. Current total is ${totalWeight.toFixed(3)}.`
      );
    }

    // 2. Validate individual bounds
    for (const item of data.items) {
      if (item.weight < 0 || item.weight > 1) {
        throw new Error('Each category weight must be between 0.0 and 1.0.');
      }
      if (item.upperLimit <= 0) {
        throw new Error('Category upper limit must be greater than zero.');
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const p = await tx.scoringPolicy.update({
        where: { id: policyId },
        data: {
          name: data.name,
          version: data.version,
          notes: data.notes,
        },
      });

      // Update policy items
      for (const it of data.items) {
        await tx.scoringPolicyItem.upsert({
          where: {
            policyId_categoryId: {
              policyId,
              categoryId: it.categoryId,
            },
          },
          update: {
            weight: it.weight,
            upperLimit: it.upperLimit,
            description: it.description,
          },
          create: {
            policyId,
            categoryId: it.categoryId,
            weight: it.weight,
            upperLimit: it.upperLimit,
            description: it.description,
          },
        });
      }

      return tx.scoringPolicy.findUnique({
        where: { id: policyId },
        include: { items: { include: { category: true } } },
      });
    });

    if (userId) {
      await eventService.emitAuditLog({
        userId,
        action: 'SCORING_POLICY_UPDATE',
        entityType: 'SCORING_POLICY',
        entityId: policyId,
        details: `Updated policy "${updated?.name}" (v${updated?.version}). Weights sum verified: ${totalWeight.toFixed(2)}`,
      });
    }

    return updated;
  }

  async getActivePolicy(academicSessionId?: string) {
    let session = academicSessionId
      ? await prisma.academicSession.findUnique({ where: { id: academicSessionId } })
      : await prisma.academicSession.findFirst({ where: { isCurrent: true } });

    if (!session) {
      session = await prisma.academicSession.findFirst({ orderBy: { createdAt: 'desc' } });
    }

    if (!session) return null;

    return prisma.scoringPolicy.findFirst({
      where: { academicSessionId: session.id, isActive: true },
      include: {
        academicSession: true,
        items: {
          include: { category: true },
        },
      },
    });
  }
}

export const scoringService = new ScoringService();
