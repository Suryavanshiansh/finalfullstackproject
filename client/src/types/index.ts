export type UserRole = 'FACULTY' | 'REVIEWER' | 'ADMIN';

export type ActivityStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'CORRECTION_REQUESTED'
  | 'APPROVED'
  | 'REJECTED';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  employeeId: string;
  role: UserRole;
  designation: string;
  departmentId?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  status?: string;
  department?: Department | null;
}

export interface Department {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  hodId?: string | null;
  _count?: { users: number; courses: number };
}

export interface AcademicSession {
  id: string;
  code: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

export interface ActivityCategory {
  id: string;
  code: string;
  name: string;
  description: string;
  unitLabel: string;
  defaultWeight: number;
  defaultUpperLimit: number;
  icon: string;
}

export interface EvidenceAttachment {
  id: string;
  activityId: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  filePath: string;
  uploadedAt: string;
}

export interface ApprovalRecord {
  id: string;
  activityId: string;
  reviewerId: string;
  action: string;
  previousStatus: string;
  newStatus: string;
  comment?: string | null;
  timestamp: string;
  reviewer?: {
    id: string;
    firstName: string;
    lastName: string;
    designation: string;
  };
}

export interface Activity {
  id: string;
  facultyId: string;
  categoryId: string;
  academicSessionId: string;
  title: string;
  description: string;
  date: string;
  endDate?: string | null;
  quantitativeValue: number;
  status: ActivityStatus;
  approvedValue?: number | null;
  reviewerFeedback?: string | null;
  correctionNotes?: string | null;
  submissionDate?: string | null;
  reviewedDate?: string | null;
  reviewerId?: string | null;
  createdAt: string;
  updatedAt: string;
  category: ActivityCategory;
  academicSession?: AcademicSession;
  faculty: {
    id: string;
    firstName: string;
    lastName: string;
    employeeId: string;
    designation: string;
    department?: Department | null;
  };
  reviewer?: {
    id: string;
    firstName: string;
    lastName: string;
    designation: string;
  } | null;
  evidence: EvidenceAttachment[];
  approvalRecords?: ApprovalRecord[];
}

export interface ScoreCategoryBreakdown {
  categoryId: string;
  categoryCode: string;
  categoryName: string;
  icon: string;
  unitLabel: string;
  actualContribution: number;
  upperLimit: number;
  normalizedScore: number;
  weight: number;
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
  overallContributionIndex: number;
  tier: 'EXEMPLARY' | 'COMMENDABLE' | 'SATISFACTORY' | 'DEVELOPING' | 'NEEDS_IMPROVEMENT';
  tierLabel: string;
  breakdown: ScoreCategoryBreakdown[];
  calculatedAt: string;
}

export interface ScoringPolicyItem {
  id: string;
  policyId: string;
  categoryId: string;
  weight: number;
  upperLimit: number;
  description?: string | null;
  category: ActivityCategory;
}

export interface ScoringPolicy {
  id: string;
  academicSessionId: string;
  name: string;
  version: string;
  isActive: boolean;
  notes?: string | null;
  items: ScoringPolicyItem[];
}

export interface Course {
  id: string;
  code: string;
  name: string;
  departmentId: string;
  credits: number;
  semester: number;
  lectureHoursPerWeek: number;
  labHoursPerWeek: number;
  department?: Department;
  expertises?: Array<{
    id: string;
    facultyId: string;
    courseId: string;
    proficiencyLevel: string;
    faculty: User;
  }>;
}

export interface Classroom {
  id: string;
  roomNumber: string;
  building: string;
  capacity: number;
  type: string;
  isAvailable: boolean;
}

export interface TimeSlot {
  id: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  label: string;
  periodNumber: number;
}

export interface ScheduleEntry {
  id: string;
  academicSessionId: string;
  courseId: string;
  facultyId: string;
  classroomId: string;
  timeSlotId: string;
  dayOfWeek: string;
  isPublished: boolean;
  course: Course;
  faculty: User;
  classroom: Classroom;
  timeSlot: TimeSlot;
}

export interface FacultyAvailability {
  id: string;
  facultyId: string;
  dayOfWeek: string;
  preferredSlot: 'MORNING' | 'AFTERNOON' | 'ANY' | 'UNAVAILABLE';
  maxDailyHours: number;
  notes?: string | null;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ACTION_REQUIRED';
  isRead: boolean;
  linkUrl?: string | null;
  createdAt: string;
}

export interface AuditLogItem {
  id: string;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  details?: string | null;
  ipAddress?: string | null;
  createdAt: string;
  user?: {
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  } | null;
}
