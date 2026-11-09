import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../db/prisma';
import { config } from '../config';
import { eventService } from './eventService';

export class AuthService {
  async login(email: string, passwordPlain: string, ipAddress?: string) {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { department: true },
    });

    if (!user) {
      throw new Error('Invalid email or password.');
    }

    if (user.status !== 'ACTIVE') {
      throw new Error('This account has been deactivated. Contact the administrator.');
    }

    const isMatch = await bcrypt.compare(passwordPlain, user.passwordHash);
    if (!isMatch) {
      throw new Error('Invalid email or password.');
    }

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        departmentId: user.departmentId,
      },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    await eventService.emitAuditLog({
      userId: user.id,
      action: 'USER_LOGIN',
      entityType: 'USER',
      entityId: user.id,
      details: `Successful login by ${user.role} (${user.email})`,
      ipAddress,
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        employeeId: user.employeeId,
        designation: user.designation,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        department: user.department ? {
          id: user.department.id,
          code: user.department.code,
          name: user.department.name,
        } : null,
      },
    };
  }

  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        department: true,
        availabilities: true,
        expertises: {
          include: { course: true },
        },
      },
    });

    if (!user) {
      throw new Error('User not found.');
    }

    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }

  async updateProfile(userId: string, data: { phone?: string; bio?: string; avatarUrl?: string }) {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        phone: data.phone,
        bio: data.bio,
        avatarUrl: data.avatarUrl,
      },
      include: { department: true },
    });

    const { passwordHash, ...safeUser } = updated;
    return safeUser;
  }

  async changePassword(userId: string, currentPasswordPlain: string, newPasswordPlain: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found.');

    const isMatch = await bcrypt.compare(currentPasswordPlain, user.passwordHash);
    if (!isMatch) {
      throw new Error('Current password does not match.');
    }

    if (newPasswordPlain.length < 6) {
      throw new Error('New password must be at least 6 characters.');
    }

    const newHash = await bcrypt.hash(newPasswordPlain, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    await eventService.emitAuditLog({
      userId,
      action: 'PASSWORD_CHANGE',
      entityType: 'USER',
      entityId: userId,
      details: 'User successfully changed account password.',
    });

    return { message: 'Password updated successfully.' };
  }
}

export const authService = new AuthService();
