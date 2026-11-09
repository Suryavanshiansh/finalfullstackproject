import bcrypt from 'bcryptjs';
import { prisma } from '../db/prisma';
import { eventService } from './eventService';

export class AdminService {
  async getSystemStats() {
    const [
      totalUsers,
      totalFaculty,
      totalReviewers,
      totalDepartments,
      totalCourses,
      totalClassrooms,
      totalActivities,
      pendingActivities,
      activeSession,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'FACULTY' } }),
      prisma.user.count({ where: { role: 'REVIEWER' } }),
      prisma.department.count(),
      prisma.course.count(),
      prisma.classroom.count(),
      prisma.activity.count(),
      prisma.activity.count({ where: { status: { in: ['SUBMITTED', 'UNDER_REVIEW'] } } }),
      prisma.academicSession.findFirst({ where: { isCurrent: true } }),
    ]);

    return {
      totalUsers,
      totalFaculty,
      totalReviewers,
      totalDepartments,
      totalCourses,
      totalClassrooms,
      totalActivities,
      pendingActivities,
      activeSession,
    };
  }

  // User Management
  async listUsers(params: {
    role?: string;
    departmentId?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { role, departmentId, status, search, page = 1, limit = 20 } = params;
    const where: any = {};
    if (role) where.role = role;
    if (departmentId) where.departmentId = departmentId;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { email: { contains: search } },
        { employeeId: { contains: search } },
      ];
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          employeeId: true,
          role: true,
          designation: true,
          status: true,
          phone: true,
          department: { select: { id: true, code: true, name: true } },
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data: users,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async createUser(data: {
    email: string;
    passwordPlain: string;
    firstName: string;
    lastName: string;
    employeeId: string;
    role: string;
    designation: string;
    departmentId?: string;
    phone?: string;
  }, adminId?: string) {
    const existingEmail = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase().trim() },
    });
    if (existingEmail) throw new Error('User with this email already exists.');

    const existingEmp = await prisma.user.findUnique({
      where: { employeeId: data.employeeId.trim() },
    });
    if (existingEmp) throw new Error('User with this employee ID already exists.');

    const passwordHash = await bcrypt.hash(data.passwordPlain || 'Password@123', 10);

    const user = await prisma.user.create({
      data: {
        email: data.email.toLowerCase().trim(),
        passwordHash,
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        employeeId: data.employeeId.trim(),
        role: data.role,
        designation: data.designation.trim(),
        departmentId: data.departmentId || null,
        phone: data.phone || null,
        status: 'ACTIVE',
      },
      include: { department: true },
    });

    if (adminId) {
      await eventService.emitAuditLog({
        userId: adminId,
        action: 'ADMIN_CREATE_USER',
        entityType: 'USER',
        entityId: user.id,
        details: `Created new ${user.role} user: ${user.firstName} ${user.lastName} (${user.email})`,
      });
    }

    const { passwordHash: _, ...safeUser } = user;
    return safeUser;
  }

  async updateUser(
    id: string,
    data: {
      firstName?: string;
      lastName?: string;
      designation?: string;
      departmentId?: string | null;
      role?: string;
      status?: string;
      phone?: string;
    },
    adminId?: string
  ) {
    const updated = await prisma.user.update({
      where: { id },
      data,
      include: { department: true },
    });

    if (adminId) {
      await eventService.emitAuditLog({
        userId: adminId,
        action: 'ADMIN_UPDATE_USER',
        entityType: 'USER',
        entityId: id,
        details: `Updated user profile for ${updated.firstName} ${updated.lastName}`,
      });
    }

    const { passwordHash: _, ...safeUser } = updated;
    return safeUser;
  }

  async resetUserPassword(userId: string, newPasswordPlain: string, adminId?: string) {
    const passwordHash = await bcrypt.hash(newPasswordPlain, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    if (adminId) {
      await eventService.emitAuditLog({
        userId: adminId,
        action: 'ADMIN_RESET_PASSWORD',
        entityType: 'USER',
        entityId: userId,
        details: 'Admin reset user password.',
      });
    }

    return { message: 'Password has been reset successfully.' };
  }

  // Department Management
  async listDepartments() {
    return prisma.department.findMany({
      include: {
        _count: {
          select: { users: true, courses: true },
        },
      },
      orderBy: { code: 'asc' },
    });
  }

  async createDepartment(data: { code: string; name: string; description?: string }, adminId?: string) {
    const dept = await prisma.department.create({
      data: {
        code: data.code.toUpperCase().trim(),
        name: data.name.trim(),
        description: data.description?.trim(),
      },
    });

    if (adminId) {
      await eventService.emitAuditLog({
        userId: adminId,
        action: 'CREATE_DEPARTMENT',
        entityType: 'DEPARTMENT',
        entityId: dept.id,
        details: `Created department ${dept.code} - ${dept.name}`,
      });
    }

    return dept;
  }

  async updateDepartment(
    id: string,
    data: { name?: string; description?: string; hodId?: string | null },
    adminId?: string
  ) {
    const dept = await prisma.department.update({
      where: { id },
      data,
    });

    if (adminId) {
      await eventService.emitAuditLog({
        userId: adminId,
        action: 'UPDATE_DEPARTMENT',
        entityType: 'DEPARTMENT',
        entityId: id,
        details: `Updated department ${dept.code}`,
      });
    }

    return dept;
  }

  // Course Management
  async listCourses(departmentId?: string) {
    return prisma.course.findMany({
      where: departmentId ? { departmentId } : {},
      include: {
        department: true,
        expertises: {
          include: {
            faculty: {
              select: { id: true, firstName: true, lastName: true, employeeId: true },
            },
          },
        },
      },
      orderBy: { code: 'asc' },
    });
  }

  async createCourse(data: {
    code: string;
    name: string;
    departmentId: string;
    credits?: number;
    semester?: number;
    lectureHoursPerWeek?: number;
    labHoursPerWeek?: number;
  }, adminId?: string) {
    const course = await prisma.course.create({
      data: {
        code: data.code.toUpperCase().trim(),
        name: data.name.trim(),
        departmentId: data.departmentId,
        credits: data.credits || 3,
        semester: data.semester || 1,
        lectureHoursPerWeek: data.lectureHoursPerWeek || 3,
        labHoursPerWeek: data.labHoursPerWeek || 0,
      },
      include: { department: true },
    });

    if (adminId) {
      await eventService.emitAuditLog({
        userId: adminId,
        action: 'CREATE_COURSE',
        entityType: 'COURSE',
        entityId: course.id,
        details: `Created course ${course.code} - ${course.name}`,
      });
    }

    return course;
  }

  async assignExpertise(courseId: string, facultyId: string, proficiencyLevel: string = 'PRIMARY') {
    return prisma.facultyExpertise.upsert({
      where: { facultyId_courseId: { facultyId, courseId } },
      update: { proficiencyLevel },
      create: { facultyId, courseId, proficiencyLevel },
    });
  }

  // Classroom Management
  async listClassrooms() {
    return prisma.classroom.findMany({
      orderBy: { roomNumber: 'asc' },
    });
  }

  async createClassroom(data: {
    roomNumber: string;
    building: string;
    capacity: number;
    type: string;
  }, adminId?: string) {
    const room = await prisma.classroom.create({
      data: {
        roomNumber: data.roomNumber.trim(),
        building: data.building.trim(),
        capacity: Number(data.capacity),
        type: data.type,
      },
    });

    if (adminId) {
      await eventService.emitAuditLog({
        userId: adminId,
        action: 'CREATE_CLASSROOM',
        entityType: 'CLASSROOM',
        entityId: room.id,
        details: `Created classroom ${room.roomNumber} (${room.type})`,
      });
    }

    return room;
  }

  async updateClassroom(id: string, data: { isAvailable?: boolean; capacity?: number; type?: string }) {
    return prisma.classroom.update({
      where: { id },
      data,
    });
  }

  // Audit Logs
  async getAuditLogs(params: {
    userId?: string;
    entityType?: string;
    action?: string;
    page?: number;
    limit?: number;
  }) {
    const { userId, entityType, action, page = 1, limit = 30 } = params;
    const where: any = {};
    if (userId) where.userId = userId;
    if (entityType) where.entityType = entityType;
    if (action) where.action = { contains: action };

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: { firstName: true, lastName: true, email: true, role: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data: logs,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // Academic Sessions
  async listAcademicSessions() {
    return prisma.academicSession.findMany({
      orderBy: { startDate: 'desc' },
    });
  }

  async createAcademicSession(data: {
    name: string;
    code: string;
    startDate: string | Date;
    endDate: string | Date;
    isCurrent?: boolean;
  }) {
    if (data.isCurrent) {
      await prisma.academicSession.updateMany({
        data: { isCurrent: false },
      });
    }

    return prisma.academicSession.create({
      data: {
        name: data.name,
        code: data.code,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        isCurrent: !!data.isCurrent,
      },
    });
  }
}

export const adminService = new AdminService();
