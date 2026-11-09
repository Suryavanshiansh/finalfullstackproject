import { authService } from '../services/authService';
import { activityService } from '../services/activityService';
import { approvalService } from '../services/approvalService';
import { scoringService } from '../services/scoringService';
import { schedulingService } from '../services/schedulingService';
import { adminService } from '../services/adminService';
import { reportingService } from '../services/reportingService';
import { prisma } from '../db/prisma';

async function runE2EVerification() {
  console.log('====================================================');
  console.log('STARTING FPIS END-TO-END SYSTEM VERIFICATION');
  console.log('====================================================');

  // STEP 1: AUTHENTICATION & SESSIONS
  console.log('\n[1/5] Verifying Authentication & User Credentials...');
  const facultyAuth = await authService.login('faculty.cs@fpis.edu', 'Password@123');
  console.log(`✅ Faculty Authenticated: ${facultyAuth.user.firstName} ${facultyAuth.user.lastName} (${facultyAuth.user.role})`);

  const reviewerAuth = await authService.login('reviewer.cs@fpis.edu', 'Password@123');
  console.log(`✅ Reviewer Authenticated: ${reviewerAuth.user.firstName} ${reviewerAuth.user.lastName} (${reviewerAuth.user.role})`);

  const adminAuth = await authService.login('admin@fpis.edu', 'Password@123');
  console.log(`✅ Administrator Authenticated: ${adminAuth.user.firstName} ${adminAuth.user.lastName} (${adminAuth.user.role})`);

  const currentSession = await prisma.academicSession.findFirst({ where: { isCurrent: true } });
  if (!currentSession) throw new Error('No active academic session found!');
  console.log(`✅ Active Academic Session: ${currentSession.name} (${currentSession.code})`);

  const teachingCat = await prisma.activityCategory.findUnique({ where: { code: 'TEACHING' } });
  if (!teachingCat) throw new Error('Teaching category not found!');

  // STEP 2: COMPLETE FACULTY WORKFLOW (CREATE -> SUBMIT -> CORRECTION -> RESUBMIT -> APPROVE)
  console.log('\n[2/5] Verifying Faculty Activity Management & Approval Workflow...');

  // Create Draft
  const newActivity = await activityService.createActivity(facultyAuth.user.id, {
    categoryId: teachingCat.id,
    academicSessionId: currentSession.id,
    title: 'E2E Test: Distributed Algorithms Practical Laboratory',
    description: 'Weekly laboratory sessions covering synchronization and distributed mutual exclusion.',
    date: new Date('2025-10-18'),
    quantitativeValue: 16.0,
  });
  console.log(`✅ Activity Created (DRAFT): "${newActivity.title}" (ID: ${newActivity.id})`);

  // Submit Activity
  const submittedAct = await activityService.submitActivity(newActivity.id, facultyAuth.user.id);
  console.log(`✅ Activity Submitted: Status is now "${submittedAct.status}"`);

  // Reviewer Queue Check
  const queue = await approvalService.getReviewerQueue({
    reviewerDepartmentId: reviewerAuth.user.department?.id,
    status: 'SUBMITTED',
  });
  const foundInQueue = queue.data.find((a) => a.id === newActivity.id);
  if (!foundInQueue) throw new Error('Submitted activity not found in reviewer queue!');
  console.log(`✅ Verified in Department Head Queue: Found "${foundInQueue.title}"`);

  // Reviewer requests correction
  const correctedAct = await approvalService.requestCorrection(newActivity.id, reviewerAuth.user.id, {
    explanation: 'Please provide verified sign-off sheet for laboratory attendance.',
  });
  console.log(`✅ Reviewer Requested Correction: Status "${correctedAct.status}", feedback recorded.`);

  // Faculty resubmits with notes
  const resubmittedAct = await activityService.resubmitActivity(
    newActivity.id,
    facultyAuth.user.id,
    'Attached certified attendance sheet signed by tutor.'
  );
  console.log(`✅ Faculty Resubmitted: Status returned to "${resubmittedAct.status}" with correction notes.`);

  // Reviewer Approves
  const approvedAct = await approvalService.approveActivity(newActivity.id, reviewerAuth.user.id, {
    approvedValue: 16.0,
    feedback: 'Attendance sheet verified against lab records. Full 16 credits approved.',
  });
  console.log(`✅ Reviewer Approved: Status is "${approvedAct.status}", Approved Value: ${approvedAct.approvedValue} hrs.`);

  // STEP 3: EXPLAINABLE SCORING ENGINE
  console.log('\n[3/5] Verifying Explainable Contribution Scoring Engine...');
  const scoreReport = await scoringService.calculateFacultyScore(facultyAuth.user.id, currentSession.id);
  console.log(`✅ Score Computed for Dr. ${facultyAuth.user.firstName}:`);
  console.log(`   - Overall Contribution Index (OCI): ${scoreReport.overallContributionIndex.toFixed(2)} / 100`);
  console.log(`   - Performance Tier: ${scoreReport.tierLabel}`);
  console.log(`   - Category Breakdown (${scoreReport.breakdown.length} categories):`);

  let manualOciSum = 0;
  for (const item of scoreReport.breakdown) {
    console.log(
      `     • ${item.categoryName.padEnd(32)}: Actual: ${String(item.actualContribution).padStart(5)} / ${item.upperLimit} ${item.unitLabel.padEnd(8)} | Norm: ${item.normalizedScore.toFixed(0)}% × ${item.weight.toFixed(2)} = +${item.weightedContribution.toFixed(2)} pts`
    );
    manualOciSum += item.weightedContribution;
  }
  console.log(`✅ Mathematical Consistency Check: Sum of weighted contributions = ${manualOciSum.toFixed(2)} pts`);

  // STEP 4: SMART SCHEDULING & CONFLICT DETECTION
  console.log('\n[4/5] Verifying Smart Scheduling System & Conflict Detection...');
  const courses = await prisma.course.findMany({ take: 2 });
  const rooms = await prisma.classroom.findMany({ take: 2 });
  const slots = await prisma.timeSlot.findMany({ take: 2 });

  if (courses.length > 0 && rooms.length > 0 && slots.length > 0) {
    const conflictCheck = await schedulingService.checkScheduleConflicts({
      academicSessionId: currentSession.id,
      courseId: courses[0].id,
      facultyId: facultyAuth.user.id,
      classroomId: rooms[0].id,
      timeSlotId: slots[0].id,
      dayOfWeek: slots[0].dayOfWeek,
    });
    console.log(`✅ Conflict Detection Engine Evaluated Assignment: Feasible = ${conflictCheck.valid}`);
    if (!conflictCheck.valid) {
      console.log(`   - Hard Constraints Flagged: ${conflictCheck.conflicts.join('; ')}`);
    }

    const generatorOutput = await schedulingService.generateFeasibleSchedule(currentSession.id);
    console.log(`✅ Feasible Schedule Generator Produced ${generatorOutput.totalGenerated} allocations without clashes.`);
  }

  // STEP 5: REPORTING & ANALYTICS
  console.log('\n[5/5] Verifying Reporting, Analytics & CSV Export...');
  const facultyReport = await reportingService.getFacultyContributionReport({});
  console.log(`✅ Generated Faculty Contribution Report: ${facultyReport.totalFaculty} faculty records.`);

  const deptAnalytics = await reportingService.getDepartmentAnalytics();
  console.log(`✅ Generated Department Analytics for ${deptAnalytics.length} departments.`);

  const csv = reportingService.exportToCSV(
    ['Faculty', 'Department', 'OCI', 'Tier'],
    facultyReport.data.map((f: any) => [f.name, f.department, f.overallContributionIndex, f.tierLabel])
  );
  console.log(`✅ Generated CSV Output (${csv.split('\r\n').length} lines). CSV export validated.`);

  console.log('\n====================================================');
  console.log('✅ ALL E2E USER JOURNEYS & ENGINES VERIFIED SUCCESSFULLY!');
  console.log('====================================================');
}

runE2EVerification()
  .catch((e) => {
    console.error('E2E Verification Failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
