import { prisma } from '../db/prisma';
import { ScheduleConflictCheckResult } from '../types';
import { eventService } from './eventService';

export class SchedulingService {
  /**
   * Conflict Detection Engine:
   * Validates hard constraints and soft preferences for any proposed timetable assignment.
   */
  async checkScheduleConflicts(params: {
    academicSessionId: string;
    courseId: string;
    facultyId: string;
    classroomId: string;
    timeSlotId: string;
    dayOfWeek: string;
    excludeEntryId?: string; // for updates
  }): Promise<ScheduleConflictCheckResult> {
    const {
      academicSessionId,
      courseId,
      facultyId,
      classroomId,
      timeSlotId,
      dayOfWeek,
      excludeEntryId,
    } = params;

    const conflicts: string[] = [];
    const warnings: string[] = [];

    // 1. Fetch related entities
    const [
      faculty,
      course,
      classroom,
      timeSlot,
      workloadPolicy,
      expertise,
      availability,
    ] = await Promise.all([
      prisma.user.findUnique({ where: { id: facultyId } }),
      prisma.course.findUnique({ where: { id: courseId } }),
      prisma.classroom.findUnique({ where: { id: classroomId } }),
      prisma.timeSlot.findUnique({ where: { id: timeSlotId } }),
      prisma.workloadPolicy.findFirst({
        where: { academicSessionId, isActive: true },
      }),
      prisma.facultyExpertise.findUnique({
        where: { facultyId_courseId: { facultyId, courseId } },
      }),
      prisma.facultyAvailability.findUnique({
        where: { facultyId_dayOfWeek: { facultyId, dayOfWeek } },
      }),
    ]);

    if (!faculty) conflicts.push(`Faculty record (${facultyId}) not found.`);
    if (!course) conflicts.push(`Course record (${courseId}) not found.`);
    if (!classroom) conflicts.push(`Classroom record (${classroomId}) not found.`);
    if (!timeSlot) conflicts.push(`Time slot record (${timeSlotId}) not found.`);

    if (classroom && !classroom.isAvailable) {
      conflicts.push(`Classroom ${classroom.roomNumber} is currently marked as unavailable.`);
    }

    // Hard Constraint 1: Expertise Match
    if (!expertise) {
      conflicts.push(
        `Expertise mismatch: ${faculty?.firstName} ${faculty?.lastName} is not certified to teach ${course?.code} (${course?.name}).`
      );
    }

    // Hard Constraint 2: Faculty Availability
    if (availability) {
      if (availability.preferredSlot === 'UNAVAILABLE') {
        conflicts.push(
          `Faculty unavailable: ${faculty?.firstName} ${faculty?.lastName} has marked ${dayOfWeek} as completely unavailable.`
        );
      }
    }

    // Hard Constraint 3: Overlapping assignments for Faculty (Faculty Clash)
    const facultyClash = await prisma.scheduleEntry.findFirst({
      where: {
        academicSessionId,
        facultyId,
        timeSlotId,
        dayOfWeek,
        id: excludeEntryId ? { not: excludeEntryId } : undefined,
      },
      include: { course: true, classroom: true },
    });

    if (facultyClash) {
      conflicts.push(
        `Faculty clash: ${faculty?.firstName} is already assigned to ${facultyClash.course.code} in room ${facultyClash.classroom.roomNumber} at this time.`
      );
    }

    // Hard Constraint 4: Classroom double-booking (Room Clash)
    const roomClash = await prisma.scheduleEntry.findFirst({
      where: {
        academicSessionId,
        classroomId,
        timeSlotId,
        dayOfWeek,
        id: excludeEntryId ? { not: excludeEntryId } : undefined,
      },
      include: { course: true, faculty: true },
    });

    if (roomClash) {
      conflicts.push(
        `Room conflict: Classroom ${classroom?.roomNumber} is already booked by ${roomClash.faculty.firstName} ${roomClash.faculty.lastName} for ${roomClash.course.code}.`
      );
    }

    // Hard Constraint 5: Workload Limits
    if (workloadPolicy) {
      const existingEntriesCount = await prisma.scheduleEntry.count({
        where: {
          academicSessionId,
          facultyId,
          id: excludeEntryId ? { not: excludeEntryId } : undefined,
        },
      });

      // Assuming 1 entry = 1 hour period
      const currentHours = existingEntriesCount;
      if (currentHours >= workloadPolicy.maxTeachingHoursPerWeek) {
        conflicts.push(
          `Workload limit exceeded: ${faculty?.firstName} has ${currentHours} teaching hours scheduled (maximum allowed: ${workloadPolicy.maxTeachingHoursPerWeek} hrs/week).`
        );
      } else if (currentHours + 1 > workloadPolicy.maxTeachingHoursPerWeek) {
        conflicts.push(
          `Workload limit exceeded: Adding this slot would bring total hours to ${currentHours + 1}, exceeding max of ${workloadPolicy.maxTeachingHoursPerWeek}.`
        );
      }
    }

    // Soft Preferences & Warnings
    if (availability && timeSlot) {
      const hour = parseInt(timeSlot.startTime.split(':')[0], 10);
      const isMorning = hour < 12;
      if (availability.preferredSlot === 'MORNING' && !isMorning) {
        warnings.push(
          `Preference note: ${faculty?.firstName} prefers morning slots on ${dayOfWeek}.`
        );
      } else if (availability.preferredSlot === 'AFTERNOON' && isMorning) {
        warnings.push(
          `Preference note: ${faculty?.firstName} prefers afternoon slots on ${dayOfWeek}.`
        );
      }
    }

    return {
      valid: conflicts.length === 0,
      conflicts,
      warnings,
    };
  }

  /**
   * Automated Feasible Schedule Generator:
   * Uses constraint-satisfaction heuristic to generate non-conflicting schedule assignments.
   */
  async generateFeasibleSchedule(academicSessionId: string, departmentId?: string) {
    // 1. Fetch courses, classrooms, timeslots, and qualified faculty
    const courses = await prisma.course.findMany({
      where: departmentId ? { departmentId } : {},
      include: {
        expertises: { include: { faculty: true } },
      },
    });

    const classrooms = await prisma.classroom.findMany({
      where: { isAvailable: true },
    });

    const timeSlots = await prisma.timeSlot.findMany({
      orderBy: [{ dayOfWeek: 'asc' }, { periodNumber: 'asc' }],
    });

    const workloadPolicy = await prisma.workloadPolicy.findFirst({
      where: { academicSessionId, isActive: true },
    });
    const maxWorkload = workloadPolicy?.maxTeachingHoursPerWeek || 16;

    // Track assigned state in memory during simulation
    const facultyBookings = new Map<string, Set<string>>(); // facultyId -> Set of "day_slotId"
    const roomBookings = new Map<string, Set<string>>(); // roomId -> Set of "day_slotId"
    const facultyHours = new Map<string, number>();

    const generatedSuggestions: Array<{
      courseId: string;
      courseCode: string;
      courseName: string;
      facultyId: string;
      facultyName: string;
      classroomId: string;
      roomNumber: string;
      timeSlotId: string;
      dayOfWeek: string;
      timeSlotLabel: string;
    }> = [];

    const unassignedCourses: Array<{ courseCode: string; reason: string }> = [];

    for (const course of courses) {
      const qualified = course.expertises
        .filter((e) => e.faculty.status === 'ACTIVE')
        .sort((a, b) => (a.proficiencyLevel === 'PRIMARY' ? -1 : 1));

      if (qualified.length === 0) {
        unassignedCourses.push({
          courseCode: course.code,
          reason: 'No active faculty member has registered expertise for this course.',
        });
        continue;
      }

      const hoursNeeded = course.lectureHoursPerWeek || 3;
      let hoursAssigned = 0;

      for (let h = 0; h < hoursNeeded; h++) {
        let assigned = false;

        // Try qualified faculty
        for (const exp of qualified) {
          const fid = exp.facultyId;
          const currentLoad = facultyHours.get(fid) || 0;
          if (currentLoad >= maxWorkload) continue;

          // Try time slots
          for (const slot of timeSlots) {
            const slotKey = `${slot.dayOfWeek}_${slot.id}`;

            if (facultyBookings.get(fid)?.has(slotKey)) continue;

            // Try suitable classroom
            const isLab = course.labHoursPerWeek > 0 && h >= course.lectureHoursPerWeek;
            const suitableRooms = classrooms.filter((r) =>
              isLab ? r.type === 'COMPUTER_LAB' : r.type === 'LECTURE_HALL'
            );

            for (const room of (suitableRooms.length > 0 ? suitableRooms : classrooms)) {
              if (roomBookings.get(room.id)?.has(slotKey)) continue;

              // Valid slot found!
              if (!facultyBookings.has(fid)) facultyBookings.set(fid, new Set());
              if (!roomBookings.has(room.id)) roomBookings.set(room.id, new Set());

              facultyBookings.get(fid)!.add(slotKey);
              roomBookings.get(room.id)!.add(slotKey);
              facultyHours.set(fid, currentLoad + 1);

              generatedSuggestions.push({
                courseId: course.id,
                courseCode: course.code,
                courseName: course.name,
                facultyId: fid,
                facultyName: `${exp.faculty.firstName} ${exp.faculty.lastName}`,
                classroomId: room.id,
                roomNumber: room.roomNumber,
                timeSlotId: slot.id,
                dayOfWeek: slot.dayOfWeek,
                timeSlotLabel: slot.label,
              });

              assigned = true;
              hoursAssigned++;
              break;
            }

            if (assigned) break;
          }

          if (assigned) break;
        }

        if (!assigned) {
          unassignedCourses.push({
            courseCode: course.code,
            reason: `Could only allocate ${hoursAssigned}/${hoursNeeded} periods due to faculty workload or room availability bottlenecks.`,
          });
          break;
        }
      }
    }

    return {
      academicSessionId,
      totalGenerated: generatedSuggestions.length,
      suggestions: generatedSuggestions,
      unassigned: unassignedCourses,
    };
  }

  /**
   * Commit generated suggestions or manual timetable modifications to database.
   * STRICT REQUIREMENT: Requires human confirmation before finalizing.
   */
  async commitSchedule(
    academicSessionId: string,
    entries: Array<{
      courseId: string;
      facultyId: string;
      classroomId: string;
      timeSlotId: string;
      dayOfWeek: string;
    }>,
    userId: string,
    clearExisting = false
  ) {
    // Validate every single entry against hard constraints before persisting
    for (const entry of entries) {
      const check = await this.checkScheduleConflicts({
        academicSessionId,
        courseId: entry.courseId,
        facultyId: entry.facultyId,
        classroomId: entry.classroomId,
        timeSlotId: entry.timeSlotId,
        dayOfWeek: entry.dayOfWeek,
      });

      if (!check.valid) {
        throw new Error(
          `Schedule validation failed: ${check.conflicts.join('; ')}`
        );
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      if (clearExisting) {
        await tx.scheduleEntry.deleteMany({
          where: { academicSessionId },
        });
      }

      const created = await Promise.all(
        entries.map((e) =>
          tx.scheduleEntry.create({
            data: {
              academicSessionId,
              courseId: e.courseId,
              facultyId: e.facultyId,
              classroomId: e.classroomId,
              timeSlotId: e.timeSlotId,
              dayOfWeek: e.dayOfWeek,
              isPublished: true,
            },
          })
        )
      );

      return created;
    });

    await eventService.emitAuditLog({
      userId,
      action: 'SCHEDULE_COMMIT',
      entityType: 'SCHEDULE',
      entityId: academicSessionId,
      details: `Committed ${entries.length} verified schedule timetable entries.`,
    });

    return {
      message: `Successfully finalized and published ${result.length} schedule entries.`,
      count: result.length,
    };
  }

  async getTimetable(params: {
    academicSessionId?: string;
    facultyId?: string;
    classroomId?: string;
    departmentId?: string;
    dayOfWeek?: string;
  }) {
    let sessionId = params.academicSessionId;
    if (!sessionId) {
      const cur = await prisma.academicSession.findFirst({ where: { isCurrent: true } });
      sessionId = cur?.id;
    }

    const where: any = {};
    if (sessionId) where.academicSessionId = sessionId;
    if (params.facultyId) where.facultyId = params.facultyId;
    if (params.classroomId) where.classroomId = params.classroomId;
    if (params.dayOfWeek) where.dayOfWeek = params.dayOfWeek;
    if (params.departmentId) {
      where.course = { departmentId: params.departmentId };
    }

    const entries = await prisma.scheduleEntry.findMany({
      where,
      include: {
        course: { include: { department: true } },
        faculty: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeId: true,
            designation: true,
          },
        },
        classroom: true,
        timeSlot: true,
      },
      orderBy: [{ dayOfWeek: 'asc' }, { timeSlot: { periodNumber: 'asc' } }],
    });

    return entries;
  }

  async deleteScheduleEntry(entryId: string, userId: string) {
    const entry = await prisma.scheduleEntry.findUnique({ where: { id: entryId } });
    if (!entry) throw new Error('Schedule entry not found.');

    await prisma.scheduleEntry.delete({ where: { id: entryId } });

    await eventService.emitAuditLog({
      userId,
      action: 'SCHEDULE_DELETE_ENTRY',
      entityType: 'SCHEDULE',
      entityId: entryId,
      details: 'Deleted schedule entry.',
    });

    return { message: 'Schedule entry deleted.' };
  }
}

export const schedulingService = new SchedulingService();
