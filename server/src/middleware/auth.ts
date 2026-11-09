import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { prisma } from '../db/prisma';
import { AuthUser, UserRole } from '../types';

export async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : (req.query?.token as string);

  if (!token) {
    res.status(401).json({
      success: false,
      error: { message: 'Authentication required. Missing token.', code: 'UNAUTHORIZED' },
    });
    return;
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret) as { userId: string };
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        employeeId: true,
        departmentId: true,
        designation: true,
        status: true,
      },
    });

    if (!user || user.status !== 'ACTIVE') {
      res.status(401).json({
        success: false,
        error: { message: 'User account is inactive or not found.', code: 'USER_INACTIVE' },
      });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role as UserRole,
      firstName: user.firstName,
      lastName: user.lastName,
      employeeId: user.employeeId,
      departmentId: user.departmentId,
      designation: user.designation,
    };

    next();
  } catch (err) {
    res.status(401).json({
      success: false,
      error: { message: 'Invalid or expired authentication token.', code: 'INVALID_TOKEN' },
    });
  }
}

export function requireRoles(roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { message: 'Authentication required.', code: 'UNAUTHORIZED' },
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: {
          message: `Access denied. Requires one of roles: ${roles.join(', ')}.`,
          code: 'FORBIDDEN',
        },
      });
      return;
    }

    next();
  };
}

export async function requireDepartmentAccess(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: { message: 'Authentication required.', code: 'UNAUTHORIZED' },
    });
    return;
  }

  // Administrators have global access across all departments
  if (req.user.role === 'ADMIN') {
    return next();
  }

  const targetDeptId = (req.query.departmentId as string) || req.body.departmentId;
  if (targetDeptId && targetDeptId !== req.user.departmentId) {
    res.status(403).json({
      success: false,
      error: {
        message: 'Department isolation: You can only access records for your assigned department.',
        code: 'CROSS_DEPARTMENT_FORBIDDEN',
      },
    });
    return;
  }

  next();
}
