export type UserRole = 'FACULTY' | 'REVIEWER' | 'ADMIN';

export type ActivityStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'CORRECTION_REQUESTED'
  | 'APPROVED'
  | 'REJECTED';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  employeeId: string;
  departmentId: string | null;
  designation: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export interface ScoreCategoryBreakdown {
  categoryId: string;
  categoryCode: string;
  categoryName: string;
  icon: string;
  unitLabel: string;
  actualContribution: number;
  upperLimit: number;
  normalizedScore: number; // 0 to 100
  weight: number; // 0.0 to 1.0
  weightedContribution: number;
  approvedCount: number;
  pendingCount: number;
}

export interface FacultyScoreReport {
  facultyId: string;
  facultyName: string;
  employeeId: string;
  departmentName: string;
  academicSessionId: string;
  academicSessionName: string;
  policyName: string;
  policyVersion: string;
  overallContributionIndex: number; // 0 to 100
  tier: 'EXEMPLARY' | 'COMMENDABLE' | 'SATISFACTORY' | 'DEVELOPING' | 'NEEDS_IMPROVEMENT';
  tierLabel: string;
  breakdown: ScoreCategoryBreakdown[];
  calculatedAt: string;
}

export interface ScheduleConflictCheckResult {
  valid: boolean;
  conflicts: string[];
  warnings: string[];
}
