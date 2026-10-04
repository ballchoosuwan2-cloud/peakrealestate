import crypto from 'crypto';
import { eq, or, ilike, and, gte } from 'drizzle-orm';
import { db } from '../db/index.ts';
import {
  usersTable,
  sessionsTable,
  auditLogsTable,
  DbUser,
} from '../db/schema.ts';
import { OperatorContext } from './system-settings-service.ts';

export const DEFAULT_INITIAL_PASSWORD = 'Peak@2026';

/**
 * Hash password securely using Node crypto scrypt with random 16-byte salt
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

/**
 * Verify password against stored salt:hash using timingSafeEqual
 */
export function verifyPassword(password: string, storedHash?: string | null): boolean {
  if (!storedHash || typeof storedHash !== 'string') return false;
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, hashHex] = parts;
  try {
    const derivedKey = crypto.scryptSync(password, salt, 64);
    const keyBuffer = Buffer.from(hashHex, 'hex');
    if (derivedKey.length !== keyBuffer.length) return false;
    return crypto.timingSafeEqual(derivedKey, keyBuffer);
  } catch {
    return false;
  }
}

export class AuthService {
  /**
   * Ensure default system users have a secure hashed password if not yet set
   */
  async ensureDefaultUsersHavePassword(): Promise<void> {
    try {
      const users = await db.select().from(usersTable);
      for (const user of users) {
        if (!user.passwordHash) {
          const defaultHash = hashPassword(DEFAULT_INITIAL_PASSWORD);
          await db
            .update(usersTable)
            .set({ passwordHash: defaultHash, updatedAt: new Date() })
            .where(eq(usersTable.id, user.id));
        }
      }
    } catch (err) {
      console.warn('AuthService ensureDefaultUsersHavePassword notice:', err);
    }
  }

  /**
   * Login with Email or Username + Password
   */
  async login(
    identifier: string,
    passwordPlain: string,
    meta?: { ip?: string; userAgent?: string }
  ): Promise<{ user: Omit<DbUser, 'passwordHash'>; token: string }> {
    const cleanId = (identifier || '').trim().toLowerCase();
    if (!cleanId || !passwordPlain) {
      throw new Error('Please enter your email or username and password');
    }

    // Find user by email or username (case-insensitive)
    const matches = await db
      .select()
      .from(usersTable)
      .where(
        or(
          ilike(usersTable.email, cleanId),
          ilike(usersTable.username, cleanId)
        )
      )
      .limit(1);

    const user = matches[0];
    if (!user) {
      throw new Error('Invalid email/username or password');
    }

    if (!user.isActive || user.status === 'Inactive') {
      throw new Error('Account is deactivated. Please contact your system administrator.');
    }

    // Verify password hash
    const isValid = verifyPassword(passwordPlain, user.passwordHash);
    if (!isValid) {
      // Record failed login audit if needed
      await db.insert(auditLogsTable).values({
        action: 'Failed Login Attempt',
        userName: user.name,
        userId: user.id,
        propertyId: `auth:${user.id}`,
        oldValue: cleanId,
        newValue: 'Invalid password provided',
        createdAt: new Date(),
      }).catch(() => {});
      throw new Error('Invalid email/username or password');
    }

    // Update lastLoginAt
    const now = new Date();
    await db
      .update(usersTable)
      .set({ lastLoginAt: now, updatedAt: now })
      .where(eq(usersTable.id, user.id));

    // Create session token (valid for 7 days)
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await db.insert(sessionsTable).values({
      token,
      userId: user.id,
      expiresAt,
      ipAddress: meta?.ip || '',
      userAgent: meta?.userAgent || '',
      createdAt: now,
    });

    // Record successful login audit log
    await db.insert(auditLogsTable).values({
      action: 'Login Success',
      userName: user.name,
      userId: user.id,
      propertyId: `auth:${user.id}`,
      newValue: JSON.stringify({ ip: meta?.ip, timestamp: now.toISOString() }),
      createdAt: now,
    }).catch(() => {});

    const { passwordHash: _, ...safeUser } = user;
    return {
      user: { ...safeUser, lastLoginAt: now },
      token,
    };
  }

  /**
   * Validate session token and retrieve user
   */
  async getSessionUser(token: string): Promise<Omit<DbUser, 'passwordHash'> | null> {
    if (!token) return null;

    try {
      const now = new Date();
      const sessions = await db
        .select()
        .from(sessionsTable)
        .where(
          and(
            eq(sessionsTable.token, token),
            gte(sessionsTable.expiresAt, now)
          )
        )
        .limit(1);

      if (sessions.length === 0) return null;

      const session = sessions[0];
      const users = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, session.userId))
        .limit(1);

      if (users.length === 0) return null;
      const user = users[0];

      if (!user.isActive || user.status === 'Inactive') {
        return null;
      }

      const { passwordHash: _, ...safeUser } = user;
      return safeUser;
    } catch {
      return null;
    }
  }

  /**
   * Terminate session (Logout)
   */
  async destroySession(token: string): Promise<void> {
    if (!token) return;
    try {
      const user = await this.getSessionUser(token);
      await db.delete(sessionsTable).where(eq(sessionsTable.token, token));

      if (user) {
        await db.insert(auditLogsTable).values({
          action: 'Logout',
          userName: user.name,
          userId: user.id,
          propertyId: `auth:${user.id}`,
          createdAt: new Date(),
        }).catch(() => {});
      }
    } catch (e) {
      console.warn('destroySession error:', e);
    }
  }

  /**
   * Update current user's password (with current password verification)
   */
  async changePassword(
    userId: string,
    currentPasswordPlain: string,
    newPasswordPlain: string,
    operator: OperatorContext
  ): Promise<void> {
    if (!newPasswordPlain || newPasswordPlain.length < 6) {
      throw new Error('New password must be at least 6 characters');
    }

    const users = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (users.length === 0) {
      throw new Error('User not found');
    }

    const user = users[0];

    // If not admin, require valid current password
    const isAdmin = operator.role === 'Admin' || operator.role === 'Administrator';
    if (!isAdmin || operator.id === userId) {
      const isValid = verifyPassword(currentPasswordPlain, user.passwordHash);
      if (!isValid) {
        throw new Error('Current password is incorrect');
      }
    }

    const newHash = hashPassword(newPasswordPlain);
    await db
      .update(usersTable)
      .set({ passwordHash: newHash, updatedAt: new Date() })
      .where(eq(usersTable.id, userId));

    // Audit log
    await db.insert(auditLogsTable).values({
      action: 'Change Password',
      userName: operator.name,
      userId: operator.id,
      propertyId: `user:${userId}`,
      newValue: 'Password changed successfully',
      createdAt: new Date(),
    });
  }

  /**
   * Admin Reset User Password
   */
  async resetPassword(
    userId: string,
    newPasswordPlain: string,
    operator: OperatorContext
  ): Promise<void> {
    if (operator.role !== 'Admin' && operator.role !== 'Administrator') {
      throw new Error('Only administrators can reset user passwords');
    }

    if (!newPasswordPlain || newPasswordPlain.length < 6) {
      throw new Error('New password must be at least 6 characters');
    }

    const users = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (users.length === 0) {
      throw new Error('User not found');
    }

    const newHash = hashPassword(newPasswordPlain);
    await db
      .update(usersTable)
      .set({ passwordHash: newHash, updatedAt: new Date() })
      .where(eq(usersTable.id, userId));

    // Audit log
    await db.insert(auditLogsTable).values({
      action: 'Reset Password (Admin)',
      userName: operator.name,
      userId: operator.id,
      propertyId: `user:${userId}`,
      newValue: 'Admin reset password for user',
      createdAt: new Date(),
    });
  }

  /**
   * Update User Profile (Name, Username, Email, Phone, Avatar)
   */
  async updateProfile(
    userId: string,
    updates: {
      name?: string;
      username?: string;
      email?: string;
      phone?: string;
      avatar?: string;
      branch?: string;
      department?: string;
      title?: string;
      monthlyTarget?: string | number;
      monthlyCommission?: string | number;
      targetDeals?: number;
      completedDeals?: number;
    },
    operator: OperatorContext
  ): Promise<Omit<DbUser, 'passwordHash'>> {
    // Only self or Admin can update
    const isAdmin = operator.role === 'Admin' || operator.role === 'Administrator';
    if (!isAdmin && operator.id !== userId) {
      throw new Error('You do not have permission to update this profile');
    }

    const users = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (users.length === 0) {
      throw new Error('User not found');
    }
    const user = users[0];

    // Check unique email if updating email
    if (updates.email && updates.email.toLowerCase() !== user.email.toLowerCase()) {
      const emailConflict = await db
        .select()
        .from(usersTable)
        .where(ilike(usersTable.email, updates.email.trim()))
        .limit(1);
      if (emailConflict.length > 0 && emailConflict[0].id !== userId) {
        throw new Error('Email is already registered by another account');
      }
    }

    // Check unique username if updating username
    if (updates.username && updates.username.toLowerCase() !== (user.username || '').toLowerCase()) {
      const usernameConflict = await db
        .select()
        .from(usersTable)
        .where(ilike(usersTable.username, updates.username.trim()))
        .limit(1);
      if (usernameConflict.length > 0 && usernameConflict[0].id !== userId) {
        throw new Error('Username is already taken');
      }
    }

    const setPayload: Partial<DbUser> = {
      updatedAt: new Date(),
    };

    if (updates.name !== undefined) setPayload.name = updates.name.trim();
    if (updates.username !== undefined) setPayload.username = updates.username.trim();
    if (updates.email !== undefined) setPayload.email = updates.email.trim();
    if (updates.phone !== undefined) setPayload.phone = updates.phone.trim();
    if (updates.avatar !== undefined) setPayload.avatar = updates.avatar.trim();
    if (updates.monthlyTarget !== undefined) setPayload.monthlyTarget = String(updates.monthlyTarget);
    if (updates.monthlyCommission !== undefined) setPayload.monthlyCommission = String(updates.monthlyCommission);
    if (updates.targetDeals !== undefined) setPayload.targetDeals = Number(updates.targetDeals);
    if (updates.completedDeals !== undefined) setPayload.completedDeals = Number(updates.completedDeals);
    if (isAdmin) {
      if (updates.branch !== undefined) setPayload.branch = updates.branch.trim();
      if (updates.department !== undefined) setPayload.department = updates.department.trim();
      if (updates.title !== undefined) setPayload.title = updates.title.trim();
    }

    const updated = await db
      .update(usersTable)
      .set(setPayload)
      .where(eq(usersTable.id, userId))
      .returning();

    const updatedUser = updated[0];

    // Audit log
    await db.insert(auditLogsTable).values({
      action: 'Update Profile',
      userName: operator.name,
      userId: operator.id,
      propertyId: `user:${userId}`,
      oldValue: JSON.stringify({
        name: user.name,
        username: user.username,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
      }),
      newValue: JSON.stringify({
        name: updatedUser.name,
        username: updatedUser.username,
        email: updatedUser.email,
        phone: updatedUser.phone,
        avatar: updatedUser.avatar,
      }),
      createdAt: new Date(),
    });

    const { passwordHash: _, ...safeUser } = updatedUser;
    return safeUser;
  }
}

export const authService = new AuthService();
