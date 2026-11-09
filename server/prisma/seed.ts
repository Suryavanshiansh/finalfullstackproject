import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing existing data...');
  // Clear in reverse order of foreign keys
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.scheduleEntry.deleteMany();
  await prisma.facultyExpertise.deleteMany();
  await prisma.facultyAvailability.deleteMany();
  await prisma.approvalRecord.deleteMany();
  await prisma.evidenceAttachment.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.scoringPolicyItem.deleteMany();
  await prisma.scoringPolicy.deleteMany();
  await prisma.workloadPolicy.deleteMany();
  await prisma.timeSlot.deleteMany();
  await prisma.classroom.deleteMany();
  await prisma.course.deleteMany();
  await prisma.activityCategory.deleteMany();
  await prisma.academicSession.deleteMany();
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();

  console.log('Seeding departments...');
  const deptCSE = await prisma.department.create({
    data: {
      code: 'CSE',
      name: 'Computer Science & Engineering',
      description: 'Department of Computer Science and Engineering',
    },
  });

  const deptECE = await prisma.department.create({
    data: {
      code: 'ECE',
      name: 'Electronics & Communication Engineering',
      description: 'Department of Electronics and Communication Engineering',
    },
  });

  const deptME = await prisma.department.create({
    data: {
      code: 'MECH',
      name: 'Mechanical Engineering',
      description: 'Department of Mechanical Engineering',
    },
  });

  console.log('Seeding academic sessions...');
  const currentSession = await prisma.academicSession.create({
    data: {
      code: 'AY2025-26-S1',
      name: 'Fall Academic Term 2025-2026',
      startDate: new Date('2025-08-01'),
      endDate: new Date('2025-12-20'),
      isCurrent: true,
    },
  });

  const previousSession = await prisma.academicSession.create({
    data: {
      code: 'AY2024-25-S2',
      name: 'Spring Academic Term 2024-2025',
      startDate: new Date('2025-01-10'),
      endDate: new Date('2025-05-30'),
      isCurrent: false,
    },
  });

  console.log('Seeding activity categories...');
  const catTeaching = await prisma.activityCategory.create({
    data: {
      code: 'TEACHING',
      name: 'Teaching Workload',
      description: 'Direct lecture, tutorial, and laboratory instruction hours',
      unitLabel: 'Hours',
      defaultWeight: 0.35,
      defaultUpperLimit: 120.0,
      icon: 'book-open',
    },
  });

  const catFDP = await prisma.activityCategory.create({
    data: {
      code: 'FDP',
      name: 'Faculty Development Programs',
      description: 'Participation in workshops, seminars, and advanced faculty training',
      unitLabel: 'Programs',
      defaultWeight: 0.15,
      defaultUpperLimit: 3.0,
      icon: 'graduation-cap',
    },
  });

  const catMentoring = await prisma.activityCategory.create({
    data: {
      code: 'MENTORING',
      name: 'Student Mentoring',
      description: 'Undergraduate & postgraduate project guidance and academic counseling',
      unitLabel: 'Students',
      defaultWeight: 0.10,
      defaultUpperLimit: 15.0,
      icon: 'users',
    },
  });

  const catExtraAcademic = await prisma.activityCategory.create({
    data: {
      code: 'EXTRA_ACADEMIC',
      name: 'Extra Academic Sessions',
      description: 'Remedial coaching, bridge courses, and guest lecture series',
      unitLabel: 'Hours',
      defaultWeight: 0.10,
      defaultUpperLimit: 20.0,
      icon: 'clock',
    },
  });

  const catCommittee = await prisma.activityCategory.create({
    data: {
      code: 'COMMITTEE',
      name: 'Committee Responsibilities',
      description: 'Institutional accreditation (NBA/NAAC), syllabus revision, and exam boards',
      unitLabel: 'Committees',
      defaultWeight: 0.10,
      defaultUpperLimit: 3.0,
      icon: 'shield-check',
    },
  });

  const catAdministrative = await prisma.activityCategory.create({
    data: {
      code: 'ADMINISTRATIVE',
      name: 'Administrative Responsibilities',
      description: 'Laboratory head, timetable coordinator, or department examination officer',
      unitLabel: 'Roles',
      defaultWeight: 0.10,
      defaultUpperLimit: 2.0,
      icon: 'briefcase',
    },
  });

  const catExtracurricular = await prisma.activityCategory.create({
    data: {
      code: 'EXTRACURRICULAR',
      name: 'Extracurricular Engagement',
      description: 'Student hackathons, technical symposiums, NSS, sports, and cultural clubs',
      unitLabel: 'Events',
      defaultWeight: 0.10,
      defaultUpperLimit: 4.0,
      icon: 'sparkles',
    },
  });

  console.log('Seeding scoring and workload policies...');
  const scoringPolicy = await prisma.scoringPolicy.create({
    data: {
      academicSessionId: currentSession.id,
      name: 'University Quality & Performance Policy 2025',
      version: '1.0',
      isActive: true,
      notes: 'Standard weighted normalization policy for Faculty Evaluation and NAAC/NBA reporting.',
      items: {
        create: [
          { categoryId: catTeaching.id, weight: 0.35, upperLimit: 120.0, description: 'Lecture & Lab sessions (max 120 hrs)' },
          { categoryId: catFDP.id, weight: 0.15, upperLimit: 3.0, description: 'Faculty development workshops (max 3 programs)' },
          { categoryId: catMentoring.id, weight: 0.10, upperLimit: 15.0, description: 'Student batches mentored (max 15 students)' },
          { categoryId: catExtraAcademic.id, weight: 0.10, upperLimit: 20.0, description: 'Bridge/Remedial hours (max 20 hrs)' },
          { categoryId: catCommittee.id, weight: 0.10, upperLimit: 3.0, description: 'Institutional committees served (max 3)' },
          { categoryId: catAdministrative.id, weight: 0.10, upperLimit: 2.0, description: 'Designated administrative charges (max 2)' },
          { categoryId: catExtracurricular.id, weight: 0.10, upperLimit: 4.0, description: 'Clubs and event coordination (max 4)' },
        ],
      },
    },
  });

  await prisma.workloadPolicy.create({
    data: {
      academicSessionId: currentSession.id,
      maxTeachingHoursPerWeek: 16.0,
      minTeachingHoursPerWeek: 8.0,
      maxCommitteeCount: 3,
      maxMentoringStudents: 20,
      isActive: true,
    },
  });

  console.log('Seeding users (admin, reviewers, faculty)...');
  const passwordHash = await bcrypt.hash('Password@123', 10);

  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@fpis.edu',
      passwordHash,
      firstName: 'Eleanor',
      lastName: 'Vance',
      employeeId: 'EMP-ADM-001',
      role: 'ADMIN',
      designation: 'Dean of Academic Affairs',
      phone: '+1 (555) 019-2831',
      bio: 'Oversees university-wide academic performance, compliance standards, and strategic quality benchmarks.',
      status: 'ACTIVE',
    },
  });

  const reviewerCSE = await prisma.user.create({
    data: {
      email: 'reviewer.cs@fpis.edu',
      passwordHash,
      firstName: 'Robert',
      lastName: 'Chen',
      employeeId: 'EMP-HOD-101',
      role: 'REVIEWER',
      designation: 'Professor & Head of Department',
      departmentId: deptCSE.id,
      phone: '+1 (555) 019-2832',
      bio: 'Head of Department, Computer Science & Engineering. Chair of the Department Academic Committee.',
      status: 'ACTIVE',
    },
  });

  const reviewerECE = await prisma.user.create({
    data: {
      email: 'reviewer.ece@fpis.edu',
      passwordHash,
      firstName: 'Maria',
      lastName: 'Santos',
      employeeId: 'EMP-HOD-201',
      role: 'REVIEWER',
      designation: 'Professor & Head of Department',
      departmentId: deptECE.id,
      phone: '+1 (555) 019-2833',
      bio: 'Head of Department, Electronics & Communication Engineering.',
      status: 'ACTIVE',
    },
  });

  // Assign HODs to departments
  await prisma.department.update({ where: { id: deptCSE.id }, data: { hodId: reviewerCSE.id } });
  await prisma.department.update({ where: { id: deptECE.id }, data: { hodId: reviewerECE.id } });

  const facultyCSE1 = await prisma.user.create({
    data: {
      email: 'faculty.cs@fpis.edu',
      passwordHash,
      firstName: 'Sarah',
      lastName: 'Jenkins',
      employeeId: 'EMP-FAC-102',
      role: 'FACULTY',
      designation: 'Associate Professor',
      departmentId: deptCSE.id,
      phone: '+1 (555) 019-2834',
      bio: 'Specialist in Distributed Systems, Cloud Architecture, and Software Engineering.',
      status: 'ACTIVE',
    },
  });

  const facultyCSE2 = await prisma.user.create({
    data: {
      email: 'faculty.alex@fpis.edu',
      passwordHash,
      firstName: 'Alex',
      lastName: 'Rivera',
      employeeId: 'EMP-FAC-103',
      role: 'FACULTY',
      designation: 'Assistant Professor',
      departmentId: deptCSE.id,
      phone: '+1 (555) 019-2835',
      bio: 'Researcher in Machine Learning, Natural Language Processing, and Artificial Intelligence.',
      status: 'ACTIVE',
    },
  });

  const facultyECE1 = await prisma.user.create({
    data: {
      email: 'faculty.ece@fpis.edu',
      passwordHash,
      firstName: 'Priya',
      lastName: 'Sharma',
      employeeId: 'EMP-FAC-202',
      role: 'FACULTY',
      designation: 'Assistant Professor',
      departmentId: deptECE.id,
      phone: '+1 (555) 019-2836',
      bio: 'Research focus on VLSI design, embedded microcontrollers, and IoT sensor networks.',
      status: 'ACTIVE',
    },
  });

  console.log('Seeding courses & subjects...');
  const courseCS101 = await prisma.course.create({
    data: {
      code: 'CS101',
      name: 'Data Structures & Algorithms',
      departmentId: deptCSE.id,
      credits: 4,
      semester: 3,
      lectureHoursPerWeek: 3,
      labHoursPerWeek: 2,
    },
  });

  const courseCS202 = await prisma.course.create({
    data: {
      code: 'CS202',
      name: 'Database Management Systems',
      departmentId: deptCSE.id,
      credits: 4,
      semester: 4,
      lectureHoursPerWeek: 3,
      labHoursPerWeek: 2,
    },
  });

  const courseCS303 = await prisma.course.create({
    data: {
      code: 'CS303',
      name: 'Cloud Computing & Distributed Systems',
      departmentId: deptCSE.id,
      credits: 3,
      semester: 6,
      lectureHoursPerWeek: 3,
      labHoursPerWeek: 0,
    },
  });

  const courseEC101 = await prisma.course.create({
    data: {
      code: 'EC101',
      name: 'Signals and Systems',
      departmentId: deptECE.id,
      credits: 4,
      semester: 3,
      lectureHoursPerWeek: 3,
      labHoursPerWeek: 2,
    },
  });

  console.log('Seeding classrooms...');
  const roomLH1 = await prisma.classroom.create({
    data: { roomNumber: 'LH-101', building: 'Turing Block', capacity: 70, type: 'LECTURE_HALL', isAvailable: true },
  });
  const roomLH2 = await prisma.classroom.create({
    data: { roomNumber: 'LH-102', building: 'Turing Block', capacity: 60, type: 'LECTURE_HALL', isAvailable: true },
  });
  const roomLab1 = await prisma.classroom.create({
    data: { roomNumber: 'CS-LAB-301', building: 'Ada Lovelace Building', capacity: 45, type: 'COMPUTER_LAB', isAvailable: true },
  });
  const roomSeminar = await prisma.classroom.create({
    data: { roomNumber: 'SEM-201', building: 'Shannon Hall', capacity: 100, type: 'SEMINAR_HALL', isAvailable: true },
  });

  console.log('Seeding time slots...');
  const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  const slotConfigs = [
    { period: 1, start: '09:00', end: '10:00', label: 'Period 1 (09:00 - 10:00)' },
    { period: 2, start: '10:15', end: '11:15', label: 'Period 2 (10:15 - 11:15)' },
    { period: 3, start: '11:30', end: '12:30', label: 'Period 3 (11:30 - 12:30)' },
    { period: 4, start: '13:30', end: '14:30', label: 'Period 4 (13:30 - 14:30)' },
    { period: 5, start: '14:45', end: '15:45', label: 'Period 5 (14:45 - 15:45)' },
  ];

  const createdTimeSlots: any[] = [];
  for (const day of days) {
    for (const sc of slotConfigs) {
      const slot = await prisma.timeSlot.create({
        data: {
          dayOfWeek: day,
          startTime: sc.start,
          endTime: sc.end,
          label: `${day.slice(0, 3)} - ${sc.label}`,
          periodNumber: sc.period,
        },
      });
      createdTimeSlots.push(slot);
    }
  }

  console.log('Seeding faculty expertise & availability...');
  await prisma.facultyExpertise.createMany({
    data: [
      { facultyId: facultyCSE1.id, courseId: courseCS101.id, proficiencyLevel: 'PRIMARY' },
      { facultyId: facultyCSE1.id, courseId: courseCS303.id, proficiencyLevel: 'PRIMARY' },
      { facultyId: facultyCSE2.id, courseId: courseCS101.id, proficiencyLevel: 'SECONDARY' },
      { facultyId: facultyCSE2.id, courseId: courseCS202.id, proficiencyLevel: 'PRIMARY' },
      { facultyId: facultyECE1.id, courseId: courseEC101.id, proficiencyLevel: 'PRIMARY' },
    ],
  });

  for (const day of ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']) {
    await prisma.facultyAvailability.create({
      data: {
        facultyId: facultyCSE1.id,
        dayOfWeek: day,
        preferredSlot: day === 'FRIDAY' ? 'MORNING' : 'ANY',
        maxDailyHours: 5.0,
      },
    });
    await prisma.facultyAvailability.create({
      data: {
        facultyId: facultyCSE2.id,
        dayOfWeek: day,
        preferredSlot: 'ANY',
        maxDailyHours: 6.0,
      },
    });
  }

  console.log('Seeding schedule timetable entries...');
  const monP1 = createdTimeSlots.find((s) => s.dayOfWeek === 'MONDAY' && s.periodNumber === 1);
  const monP2 = createdTimeSlots.find((s) => s.dayOfWeek === 'MONDAY' && s.periodNumber === 2);
  const wedP3 = createdTimeSlots.find((s) => s.dayOfWeek === 'WEDNESDAY' && s.periodNumber === 3);
  const thuP4 = createdTimeSlots.find((s) => s.dayOfWeek === 'THURSDAY' && s.periodNumber === 4);

  if (monP1) {
    await prisma.scheduleEntry.create({
      data: {
        academicSessionId: currentSession.id,
        courseId: courseCS101.id,
        facultyId: facultyCSE1.id,
        classroomId: roomLH1.id,
        timeSlotId: monP1.id,
        dayOfWeek: 'MONDAY',
        isPublished: true,
      },
    });
  }

  if (monP2) {
    await prisma.scheduleEntry.create({
      data: {
        academicSessionId: currentSession.id,
        courseId: courseCS202.id,
        facultyId: facultyCSE2.id,
        classroomId: roomLH2.id,
        timeSlotId: monP2.id,
        dayOfWeek: 'MONDAY',
        isPublished: true,
      },
    });
  }

  if (wedP3) {
    await prisma.scheduleEntry.create({
      data: {
        academicSessionId: currentSession.id,
        courseId: courseCS303.id,
        facultyId: facultyCSE1.id,
        classroomId: roomLH1.id,
        timeSlotId: wedP3.id,
        dayOfWeek: 'WEDNESDAY',
        isPublished: true,
      },
    });
  }

  if (thuP4) {
    await prisma.scheduleEntry.create({
      data: {
        academicSessionId: currentSession.id,
        courseId: courseCS101.id,
        facultyId: facultyCSE1.id,
        classroomId: roomLab1.id,
        timeSlotId: thuP4.id,
        dayOfWeek: 'THURSDAY',
        isPublished: true,
      },
    });
  }

  console.log('Seeding activities with complete lifecycle statuses...');

  // 1. Approved Teaching Activity
  const act1 = await prisma.activity.create({
    data: {
      facultyId: facultyCSE1.id,
      categoryId: catTeaching.id,
      academicSessionId: currentSession.id,
      title: 'Undergraduate Lectures - CS101 Data Structures',
      description: 'Delivered 48 hours of interactive lectures covering balanced trees, hashing algorithms, and graph traversals.',
      date: new Date('2025-08-15'),
      quantitativeValue: 48.0,
      status: 'APPROVED',
      approvedValue: 48.0,
      submissionDate: new Date('2025-09-01'),
      reviewedDate: new Date('2025-09-05'),
      reviewerId: reviewerCSE.id,
      reviewerFeedback: 'Verified with departmental attendance log and lesson plan. Full credit granted.',
    },
  });

  await prisma.approvalRecord.create({
    data: {
      activityId: act1.id,
      reviewerId: reviewerCSE.id,
      action: 'APPROVE',
      previousStatus: 'UNDER_REVIEW',
      newStatus: 'APPROVED',
      comment: 'Full teaching hours verified against the central biometric attendance ledger.',
      timestamp: new Date('2025-09-05'),
    },
  });

  // 2. Approved FDP Activity
  const act2 = await prisma.activity.create({
    data: {
      facultyId: facultyCSE1.id,
      categoryId: catFDP.id,
      academicSessionId: currentSession.id,
      title: 'National Workshop on AI & Cloud-Native Architectures',
      description: 'Completed 5-day AICTE-approved Faculty Development Program on microservice resiliency and AI agent orchestration.',
      date: new Date('2025-09-10'),
      endDate: new Date('2025-09-15'),
      quantitativeValue: 1.0,
      status: 'APPROVED',
      approvedValue: 1.0,
      submissionDate: new Date('2025-09-20'),
      reviewedDate: new Date('2025-09-22'),
      reviewerId: reviewerCSE.id,
      reviewerFeedback: 'Valid certificate submitted and verified.',
    },
  });

  await prisma.approvalRecord.create({
    data: {
      activityId: act2.id,
      reviewerId: reviewerCSE.id,
      action: 'APPROVE',
      previousStatus: 'UNDER_REVIEW',
      newStatus: 'APPROVED',
      comment: 'Approved based on official certificate of completion from AICTE/ATAL.',
      timestamp: new Date('2025-09-22'),
    },
  });

  // 3. Approved Mentoring Activity
  const act3 = await prisma.activity.create({
    data: {
      facultyId: facultyCSE1.id,
      categoryId: catMentoring.id,
      academicSessionId: currentSession.id,
      title: 'Senior Capstone Project Mentoring',
      description: 'Guided 8 final-year undergraduate students across two capstone projects in distributed caching and telemetry systems.',
      date: new Date('2025-08-20'),
      quantitativeValue: 8.0,
      status: 'APPROVED',
      approvedValue: 8.0,
      submissionDate: new Date('2025-09-25'),
      reviewedDate: new Date('2025-09-28'),
      reviewerId: reviewerCSE.id,
      reviewerFeedback: 'Project phase 1 evaluation reports approved by departmental committee.',
    },
  });

  // 4. Pending / Submitted Activity (Teaching lab)
  const act4 = await prisma.activity.create({
    data: {
      facultyId: facultyCSE1.id,
      categoryId: catTeaching.id,
      academicSessionId: currentSession.id,
      title: 'Practical Hands-on Lab Sessions - CS101',
      description: 'Conducted 24 hours of algorithmic problem solving and memory profiling laboratories.',
      date: new Date('2025-09-01'),
      quantitativeValue: 24.0,
      status: 'SUBMITTED',
      submissionDate: new Date('2025-10-01'),
    },
  });

  // 5. Activity under review
  const act5 = await prisma.activity.create({
    data: {
      facultyId: facultyCSE1.id,
      categoryId: catCommittee.id,
      academicSessionId: currentSession.id,
      title: 'NBA Criteria 3 Accreditation Coordinator',
      description: 'Led course outcome mapping and program educational objectives documentation for 2025 renewal cycle.',
      date: new Date('2025-08-10'),
      quantitativeValue: 1.0,
      status: 'UNDER_REVIEW',
      submissionDate: new Date('2025-10-02'),
      reviewerId: reviewerCSE.id,
    },
  });

  // 6. Correction Requested Activity
  const act6 = await prisma.activity.create({
    data: {
      facultyId: facultyCSE1.id,
      categoryId: catExtraAcademic.id,
      academicSessionId: currentSession.id,
      title: 'Weekend Bridge Course on Advanced C++ Metaprogramming',
      description: 'Held weekend supplementary sessions for students transitioning into systems programming.',
      date: new Date('2025-09-18'),
      quantitativeValue: 12.0,
      status: 'CORRECTION_REQUESTED',
      submissionDate: new Date('2025-09-25'),
      reviewedDate: new Date('2025-09-30'),
      reviewerId: reviewerCSE.id,
      reviewerFeedback: 'Please attach the official student attendance roll sheet signed by the course tutor.',
      correctionNotes: 'Requested attendance sheet upload for verification.',
    },
  });

  await prisma.approvalRecord.create({
    data: {
      activityId: act6.id,
      reviewerId: reviewerCSE.id,
      action: 'REQUEST_CORRECTION',
      previousStatus: 'UNDER_REVIEW',
      newStatus: 'CORRECTION_REQUESTED',
      comment: 'Please attach the signed attendance roster and student feedback forms.',
      timestamp: new Date('2025-09-30'),
    },
  });

  // 7. Draft Activity
  await prisma.activity.create({
    data: {
      facultyId: facultyCSE1.id,
      categoryId: catExtracurricular.id,
      academicSessionId: currentSession.id,
      title: 'Annual Inter-College Hackathon Organizing Committee',
      description: 'Drafting sponsorship brief and technical challenge tracks for the upcoming 36-hour hackathon.',
      date: new Date('2025-10-15'),
      quantitativeValue: 1.0,
      status: 'DRAFT',
    },
  });

  // 8. Other Faculty Submissions for Reviewer Queue testing
  const act8 = await prisma.activity.create({
    data: {
      facultyId: facultyCSE2.id,
      categoryId: catTeaching.id,
      academicSessionId: currentSession.id,
      title: 'Database Systems CS202 Lectures',
      description: 'Delivered 36 lecture hours on SQL query execution plans, indexing strategies, and ACID transactions.',
      date: new Date('2025-09-01'),
      quantitativeValue: 36.0,
      status: 'SUBMITTED',
      submissionDate: new Date('2025-10-03'),
    },
  });

  const act9 = await prisma.activity.create({
    data: {
      facultyId: facultyCSE2.id,
      categoryId: catFDP.id,
      academicSessionId: currentSession.id,
      title: 'Deep Learning with PyTorch Summer School',
      description: 'Attended 2-week advanced training on transformer models and reinforcement learning.',
      date: new Date('2025-07-15'),
      endDate: new Date('2025-07-30'),
      quantitativeValue: 1.0,
      status: 'SUBMITTED',
      submissionDate: new Date('2025-10-04'),
    },
  });

  console.log('Seeding notifications...');
  await prisma.notification.createMany({
    data: [
      {
        userId: facultyCSE1.id,
        title: 'Activity Approved',
        message: 'Your activity "Undergraduate Lectures - CS101 Data Structures" was approved by Dr. Robert Chen.',
        type: 'SUCCESS',
        isRead: false,
        linkUrl: `/faculty/activities/${act1.id}`,
      },
      {
        userId: facultyCSE1.id,
        title: 'Correction Requested',
        message: 'Dr. Robert Chen requested clarification on "Weekend Bridge Course on Advanced C++".',
        type: 'WARNING',
        isRead: false,
        linkUrl: `/faculty/activities/${act6.id}`,
      },
      {
        userId: reviewerCSE.id,
        title: 'New Submissions Awaiting Review',
        message: 'There are 3 pending faculty activity submissions in the Computer Science department.',
        type: 'ACTION_REQUIRED',
        isRead: false,
        linkUrl: '/reviewer/approval-queue',
      },
      {
        userId: adminUser.id,
        title: 'System Initialized',
        message: 'Faculty Performance Intelligence System successfully seeded and active for Fall 2025.',
        type: 'INFO',
        isRead: true,
        linkUrl: '/admin/audit-logs',
      },
    ],
  });

  console.log('Seeding initial audit logs...');
  await prisma.auditLog.createMany({
    data: [
      {
        userId: adminUser.id,
        action: 'SYSTEM_SEED',
        entityType: 'SYSTEM',
        entityId: 'ROOT',
        details: 'Initial database seeding executed with academic baseline data and policies.',
      },
      {
        userId: reviewerCSE.id,
        action: 'ACTIVITY_APPROVE',
        entityType: 'ACTIVITY',
        entityId: act1.id,
        details: 'Approved teaching workload of 48.0 hours for Dr. Sarah Jenkins.',
      },
    ],
  });

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
