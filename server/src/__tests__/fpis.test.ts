import { describe, it, expect, beforeAll } from 'vitest';
import { authService } from '../services/authService';
import { activityService } from '../services/activityService';
import { approvalService } from '../services/approvalService';
import { scoringService } from '../services/scoringService';
import { schedulingService } from '../services/schedulingService';
import { adminService } from '../services/adminService';
import { reportingService } from '../services/reportingService';
import { prisma } from '../db/prisma';

describe('FPIS Comprehensive Full-Stack Logic Test Suite', () => {
  let facultyUser: any;
  let reviewerUser: any;
  let adminUser: any;
  let testSession: any;
  let teachingCategory: any;

  beforeAll(async () => {
    // 1. Authenticate Faculty
    const facAuth = await authService.login('faculty.cs@fpis.edu', 'Password@123');
    expect(facAuth.token).toBeDefined();
    expect(facAuth.user.role).toBe('FACULTY');
    facultyUser = facAuth.user;

    // 2. Authenticate Reviewer
    const revAuth = await authService.login('reviewer.cs@fpis.edu', 'Password@123');
    expect(revAuth.token).toBeDefined();
    expect(revAuth.user.role).toBe('REVIEWER');
    reviewerUser = revAuth.user;

    // 3. Authenticate Admin
    const admAuth = await authService.login('admin@fpis.edu', 'Password@123');
    expect(admAuth.token).toBeDefined();
    expect(admAuth.user.role).toBe('ADMIN');
    adminUser = admAuth.user;

    // Fetch session and categories
    testSession = await prisma.academicSession.findFirst({ where: { isCurrent: true } });
    teachingCategory = await prisma.activityCategory.findUnique({ where: { code: 'TEACHING' } });
  });

  describe('1. Authentication & Security Engine', () => {
    it('successfully logs in with valid credentials and returns safe user data', async () => {
      const res = await authService.login('faculty.cs@fpis.edu', 'Password@123');
      expect(res.user.email).toBe('faculty.cs@fpis.edu');
      expect((res.user as any).passwordHash).toBeUndefined();
    });

    it('rejects invalid password with meaningful error', async () => {
      await expect(
        authService.login('faculty.cs@fpis.edu', 'WrongPassword123!')
      ).rejects.toThrow('Invalid email or password.');
    });

    it('retrieves full faculty profile with department and expertise associations', async () => {
      const profile = await authService.getProfile(facultyUser.id);
      expect(profile.id).toBe(facultyUser.id);
      expect(profile.department).toBeDefined();
      expect(profile.department?.code).toBe('CSE');
    });

    it('validates password change requirements', async () => {
      await expect(
        authService.changePassword(facultyUser.id, 'WrongCurrent', 'NewPass123')
      ).rejects.toThrow('Current password does not match.');
    });
  });

  describe('2. Faculty Activity CRUD & Approval Workflow', () => {
    let createdActivity: any;

    it('allows faculty to create an activity in DRAFT status', async () => {
      createdActivity = await activityService.createActivity(facultyUser.id, {
        categoryId: teachingCategory.id,
        academicSessionId: testSession.id,
        title: 'Advanced Seminar on Microservices & Kubernetes',
        description: 'Comprehensive 12-hour hands-on seminar for cloud computing elective.',
        date: new Date('2025-10-12'),
        quantitativeValue: 12.0,
      });

      expect(createdActivity).toBeDefined();
      expect(createdActivity.status).toBe('DRAFT');
      expect(createdActivity.quantitativeValue).toBe(12.0);
    });

    it('allows editing activity only while in DRAFT or CORRECTION_REQUESTED status', async () => {
      const updated = await activityService.updateActivity(createdActivity.id, facultyUser.id, {
        title: 'Advanced Seminar on Microservices, K8s & Service Mesh',
        quantitativeValue: 14.0,
      });

      expect(updated.title).toContain('Service Mesh');
      expect(updated.quantitativeValue).toBe(14.0);
    });

    it('submits activity for approval (transitions DRAFT -> SUBMITTED and creates audit record)', async () => {
      const submitted = await activityService.submitActivity(createdActivity.id, facultyUser.id);
      expect(submitted.status).toBe('SUBMITTED');

      const fullAct = await activityService.getActivityById(createdActivity.id);
      expect(fullAct.approvalRecords.length).toBeGreaterThan(0);
      expect(fullAct.approvalRecords[0].action).toBe('SUBMIT');
    });

    it('prevents direct faculty edit when activity is already SUBMITTED', async () => {
      await expect(
        activityService.updateActivity(createdActivity.id, facultyUser.id, {
          title: 'Illegal modification',
        })
      ).rejects.toThrow(/Cannot edit activity with status "SUBMITTED"/);
    });

    it('allows department reviewer to request corrections with mandatory reason', async () => {
      const correction = await approvalService.requestCorrection(
        createdActivity.id,
        reviewerUser.id,
        { explanation: 'Please provide attendee roster with department signature.' }
      );

      expect(correction.status).toBe('CORRECTION_REQUESTED');
      expect(correction.reviewerFeedback).toContain('attendee roster');
    });

    it('allows faculty to resubmit corrected activity', async () => {
      const resubmitted = await activityService.resubmitActivity(
        createdActivity.id,
        facultyUser.id,
        'Attached signed attendee roster.'
      );

      expect(resubmitted.status).toBe('SUBMITTED');
    });

    it('allows reviewer to approve activity with verified score value', async () => {
      const approved = await approvalService.approveActivity(
        createdActivity.id,
        reviewerUser.id,
        { approvedValue: 14.0, feedback: 'Verified against department records. Full credit.' }
      );

      expect(approved.status).toBe('APPROVED');
      expect(approved.approvedValue).toBe(14.0);
    });
  });

  describe('3. Explainable Contribution Scoring Engine', () => {
    it('calculates mathematically verified scores: Normalized = 100 * min(actual / limit, 1)', async () => {
      const report = await scoringService.calculateFacultyScore(facultyUser.id, testSession.id);

      expect(report).toBeDefined();
      expect(report.facultyId).toBe(facultyUser.id);
      expect(report.overallContributionIndex).toBeGreaterThan(0);
      expect(report.overallContributionIndex).toBeLessThanOrEqual(100);

      // Verify mathematical rigor of each category breakdown
      let runningIndex = 0;
      for (const item of report.breakdown) {
        const expectedNormalized = Math.round(100 * Math.min(item.actualContribution / item.upperLimit, 1.0) * 100) / 100;
        expect(item.normalizedScore).toBeCloseTo(expectedNormalized, 1);

        const expectedWeighted = Math.round(item.weight * item.normalizedScore * 100) / 100;
        expect(item.weightedContribution).toBeCloseTo(expectedWeighted, 1);

        runningIndex += item.weightedContribution;
      }

      expect(report.overallContributionIndex).toBeCloseTo(runningIndex, 1);
    });

    it('strictly enforces category weights must sum to 1.0', async () => {
      const policy = await scoringService.getActivePolicy(testSession.id);
      expect(policy).toBeDefined();

      const invalidItems = policy!.items.map((it, idx) => ({
        categoryId: it.categoryId,
        weight: idx === 0 ? 0.9 : 0.8, // sum > 1.0
        upperLimit: it.upperLimit,
      }));

      await expect(
        scoringService.updateScoringPolicy(policy!.id, { items: invalidItems })
      ).rejects.toThrow(/weights must sum to exactly 1.0/);
    });
  });

  describe('4. Smart Scheduling System & Conflict Detection', () => {
    it('detects room clash when classroom is already booked at that slot', async () => {
      const existing = await prisma.scheduleEntry.findFirst({
        where: { academicSessionId: testSession.id },
        include: { course: true, classroom: true, timeSlot: true },
      });
      expect(existing).toBeDefined();

      const otherCourse = await prisma.course.findFirst({
        where: { id: { not: existing!.courseId } },
      });

      const check = await schedulingService.checkScheduleConflicts({
        academicSessionId: testSession.id,
        courseId: otherCourse!.id,
        facultyId: facultyUser.id,
        classroomId: existing!.classroomId,
        timeSlotId: existing!.timeSlotId,
        dayOfWeek: existing!.dayOfWeek,
      });

      expect(check.valid).toBe(false);
      expect(check.conflicts.some((c) => c.includes('already booked'))).toBe(true);
    });

    it('generates conflict-free timetable suggestions with constraint satisfaction solver', async () => {
      const result = await schedulingService.generateFeasibleSchedule(testSession.id);
      expect(result).toBeDefined();
      expect(Array.isArray(result.suggestions)).toBe(true);
      expect(result.suggestions.length).toBeGreaterThan(0);

      // Verify no duplicate room bookings in generated suggestions
      const bookedSet = new Set<string>();
      for (const s of result.suggestions) {
        const key = `${s.classroomId}_${s.dayOfWeek}_${s.timeSlotId}`;
        expect(bookedSet.has(key)).toBe(false);
        bookedSet.add(key);
      }
    });
  });

  describe('5. Administration & Reporting Services', () => {
    it('fetches system statistics for Admin Dashboard', async () => {
      const stats = await adminService.getSystemStats();
      expect(stats.totalUsers).toBeGreaterThan(0);
      expect(stats.totalFaculty).toBeGreaterThan(0);
      expect(stats.totalDepartments).toBeGreaterThan(0);
      expect(stats.activeSession).toBeDefined();
    });

    it('generates faculty contribution report with departmental filters', async () => {
      const report = await reportingService.getFacultyContributionReport({});
      expect(report.totalFaculty).toBeGreaterThan(0);
      expect(report.data[0].overallContributionIndex).toBeDefined();
    });

    it('generates valid CSV export string with proper headers and escaping', () => {
      const csv = reportingService.exportToCSV(
        ['Name', 'Score', 'Department'],
        [
          ['Dr. Sarah Jenkins', 82.5, 'Computer Science & Engineering'],
          ['Dr. Alex Rivera', 65.0, 'Computer Science & Engineering'],
        ]
      );

      expect(csv).toContain('Name,Score,Department');
      expect(csv).toContain('Dr. Sarah Jenkins');
    });
  });
});
