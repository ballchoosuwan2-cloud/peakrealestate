import { and, desc, asc, eq, ilike, or, sql } from 'drizzle-orm';
import { db } from '../db/index.ts';
import {
  usersTable,
  propertiesTable,
  auditLogsTable,
  DbUser,
  InsertDbUser,
} from '../db/schema.ts';
import { hashPassword, DEFAULT_INITIAL_PASSWORD } from './auth-service.ts';

export type UserRole = 'Admin' | 'Manager' | 'Agent';
export type UserPermission = 'View' | 'Create' | 'Edit' | 'Archive' | 'Restore';

export const VALID_ROLES: UserRole[] = ['Admin', 'Manager', 'Agent'];
export const ALL_PERMISSIONS: UserPermission[] = ['View', 'Create', 'Edit', 'Archive', 'Restore'];

export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, UserPermission[]> = {
  Admin: ['View', 'Create', 'Edit', 'Archive', 'Restore'],
  Manager: ['View', 'Create', 'Edit', 'Archive', 'Restore'],
  Agent: ['View', 'Create', 'Edit'],
};

export interface UserFilterParams {
  search?: string;
  role?: string;
  status?: string; // 'Active' | 'Inactive' | 'all'
  page?: number;
  pageSize?: number;
  sortBy?: 'name' | 'createdAt' | 'role' | 'status';
  sortOrder?: 'asc' | 'desc';
}

export interface UserStats {
  total: number;
  active: number;
  inactive: number;
  adminCount: number;
  managerCount: number;
  agentCount: number;
}

export interface OperatorContext {
  id: string;
  name: string;
  role: string;
}

/**
 * Normalizes role string to standard B20 3-role set
 */
export function normalizeRole(roleStr?: string | null): UserRole {
  if (!roleStr) return 'Agent';
  const clean = roleStr.trim().toLowerCase();
  if (clean === 'admin' || clean === 'administrator' || clean === 'super admin') return 'Admin';
  if (clean === 'manager' || clean === 'sales manager') return 'Manager';
  return 'Agent';
}

/**
 * Checks if a given role has a specific permission
 */
export function roleHasPermission(role: string, permission: UserPermission): boolean {
  const normalized = normalizeRole(role);
  const perms = DEFAULT_ROLE_PERMISSIONS[normalized] || [];
  return perms.includes(permission);
}

export class UserService {
  /**
   * Fetch users with search, role filter, status filter, and pagination
   */
  async getUsers(params: UserFilterParams = {}) {
    const page = Math.max(1, Number(params.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(params.pageSize) || 50));
    const offset = (page - 1) * pageSize;

    const conditions = [];

    // Search by Name, Email, Phone, Username, or Title
    if (params.search && params.search.trim()) {
      const q = `%${params.search.trim()}%`;
      conditions.push(
        or(
          ilike(usersTable.name, q),
          ilike(usersTable.email, q),
          ilike(usersTable.phone, q),
          ilike(usersTable.username, q),
          ilike(usersTable.title, q)
        )
      );
    }

    // Role filter
    if (params.role && params.role !== 'all') {
      const targetRole = normalizeRole(params.role);
      conditions.push(eq(usersTable.role, targetRole));
    }

    // Status filter
    if (params.status && params.status !== 'all') {
      const isActive = params.status.toLowerCase() === 'active';
      conditions.push(eq(usersTable.isActive, isActive));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Run query
    const users = await db
      .select()
      .from(usersTable)
      .where(whereClause)
      .limit(pageSize)
      .offset(offset)
      .orderBy(asc(usersTable.name));

    // Get total count for pagination
    const totalCountResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(usersTable)
      .where(whereClause);
    const total = Number(totalCountResult[0]?.count || 0);

    // Get global stats
    const allUsers = await db.select().from(usersTable);
    const stats: UserStats = {
      total: allUsers.length,
      active: allUsers.filter((u) => u.isActive).length,
      inactive: allUsers.filter((u) => !u.isActive).length,
      adminCount: allUsers.filter((u) => normalizeRole(u.role) === 'Admin').length,
      managerCount: allUsers.filter((u) => normalizeRole(u.role) === 'Manager').length,
      agentCount: allUsers.filter((u) => normalizeRole(u.role) === 'Agent').length,
    };

    // Calculate linked properties count for each user/agent
    const properties = await db
      .select({ agentId: propertiesTable.agentId, agentName: propertiesTable.agentName })
      .from(propertiesTable);

    const enrichedUsers = users.map((u) => {
      const linkedProps = properties.filter(
        (p) => p.agentId === u.id || (p.agentName && p.agentName.toLowerCase() === u.name.toLowerCase())
      );
      return {
        ...u,
        role: normalizeRole(u.role),
        assignedPropertiesCount: linkedProps.length,
      };
    });

    return {
      data: enrichedUsers,
      users: enrichedUsers,
      items: enrichedUsers,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
      stats,
    };
  }

  /**
   * Get single user by ID with linked properties and stats
   */
  async getUserById(id: string) {
    const users = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
    if (!users || users.length === 0) return null;

    const user = users[0];
    const assignedProps = await db
      .select()
      .from(propertiesTable)
      .where(
        or(
          eq(propertiesTable.agentId, user.id),
          ilike(propertiesTable.agentName, user.name)
        )
      );

    return {
      ...user,
      role: normalizeRole(user.role),
      assignedProperties: assignedProps,
      assignedPropertiesCount: assignedProps.length,
    };
  }

  /**
   * Create a new User
   */
  async createUser(userData: InsertDbUser, operator: OperatorContext) {
    // 1. Role validation & normalization
    const role = normalizeRole(userData.role);
    const id = userData.id || `usr-${Date.now()}`;
    const email = userData.email?.trim().toLowerCase();

    if (!email) {
      throw new Error('Email is required');
    }
    if (!userData.name?.trim()) {
      throw new Error('Full name is required');
    }

    // Check duplicate email
    const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (existing.length > 0) {
      throw new Error(`A user with email ${email} already exists`);
    }

    const permissions = userData.permissions || DEFAULT_ROLE_PERMISSIONS[role];
    const isActive = userData.isActive !== undefined ? userData.isActive : true;
    const status = isActive ? 'Active' : 'Inactive';

    const rawPassword = (userData as any).password || (userData as any).initialPassword || DEFAULT_INITIAL_PASSWORD;
    const passwordHash = userData.passwordHash || hashPassword(rawPassword);

    const insertPayload: InsertDbUser = {
      ...userData,
      id,
      name: userData.name.trim(),
      email,
      username: userData.username?.trim() || email.split('@')[0],
      passwordHash,
      role,
      phone: userData.phone || '',
      avatar: userData.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      branch: userData.branch || 'Phuket Head Office',
      department: userData.department || 'Sales',
      title: userData.title || (role === 'Agent' ? 'Real Estate Agent' : `${role} Officer`),
      isActive,
      status,
      permissions: permissions as any,
      monthlyTarget: userData.monthlyTarget || '20000000',
      monthlyCommission: userData.monthlyCommission || '500000',
      targetDeals: userData.targetDeals || 5,
      completedDeals: userData.completedDeals || 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const inserted = await db.insert(usersTable).values(insertPayload).returning();
    const createdUser = inserted[0];

    // Audit Log: 'Create User'
    await db.insert(auditLogsTable).values({
      propertyId: `user:${createdUser.id}`,
      action: 'Create User',
      userName: operator.name || 'System',
      userId: operator.id || null,
      oldValue: null,
      newValue: JSON.stringify({
        id: createdUser.id,
        name: createdUser.name,
        email: createdUser.email,
        role: createdUser.role,
        status: createdUser.status,
      }),
      createdAt: new Date(),
    });

    return createdUser;
  }

  /**
   * Update existing User
   */
  async updateUser(id: string, updates: Partial<InsertDbUser>, operator: OperatorContext) {
    const existing = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
    if (!existing || existing.length === 0) {
      throw new Error(`User ${id} not found`);
    }
    const oldUser = existing[0];

    // Check duplicate email if changed
    if (updates.email && updates.email.toLowerCase() !== oldUser.email.toLowerCase()) {
      const duplicate = await db.select().from(usersTable).where(eq(usersTable.email, updates.email.toLowerCase())).limit(1);
      if (duplicate.length > 0) {
        throw new Error(`Email ${updates.email} is already taken by another user`);
      }
    }

    const newRole = updates.role ? normalizeRole(updates.role) : normalizeRole(oldUser.role);
    const newIsActive = updates.isActive !== undefined ? updates.isActive : (updates.status ? updates.status === 'Active' : oldUser.isActive);
    const newStatus = newIsActive ? 'Active' : 'Inactive';

    // Role changed check
    const roleChanged = normalizeRole(oldUser.role) !== newRole;
    // Status changed check
    const statusChanged = oldUser.isActive !== newIsActive || oldUser.status !== newStatus;

    const payload: Partial<InsertDbUser> = {
      ...updates,
      role: newRole,
      isActive: newIsActive,
      status: newStatus,
      updatedAt: new Date(),
    };

    const updated = await db.update(usersTable).set(payload).where(eq(usersTable.id, id)).returning();
    const result = updated[0];

    // Audit logs for specific changes
    if (roleChanged) {
      await db.insert(auditLogsTable).values({
        propertyId: `user:${id}`,
        action: 'Role Change',
        userName: operator.name || 'System',
        userId: operator.id || null,
        oldValue: oldUser.role,
        newValue: newRole,
        createdAt: new Date(),
      });
    }

    if (statusChanged) {
      await db.insert(auditLogsTable).values({
        propertyId: `user:${id}`,
        action: 'Active / Inactive',
        userName: operator.name || 'System',
        userId: operator.id || null,
        oldValue: oldUser.status,
        newValue: newStatus,
        createdAt: new Date(),
      });
    }

    // Check if other profile fields changed
    const otherFieldsChanged = Object.keys(updates).some(
      (k) => !['role', 'isActive', 'status', 'updatedAt'].includes(k) && (updates as any)[k] !== undefined && (updates as any)[k] !== (oldUser as any)[k]
    );

    // General edit audit if profile attributes changed or neither role/status changed
    if (otherFieldsChanged || (!roleChanged && !statusChanged)) {
      await db.insert(auditLogsTable).values({
        propertyId: `user:${id}`,
        action: 'Edit User',
        userName: operator.name || 'System',
        userId: operator.id || null,
        oldValue: JSON.stringify({
          name: oldUser.name,
          role: oldUser.role,
          status: oldUser.status,
          email: oldUser.email,
        }),
        newValue: JSON.stringify({
          name: result.name,
          role: result.role,
          status: result.status,
          email: result.email,
        }),
        createdAt: new Date(),
      });
    }

    return result;
  }

  /**
   * Toggle Active / Inactive status
   */
  async toggleUserStatus(id: string, operator: OperatorContext) {
    const existing = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
    if (!existing || existing.length === 0) {
      throw new Error(`User ${id} not found`);
    }
    const current = existing[0];
    const newIsActive = !current.isActive;
    const newStatus = newIsActive ? 'Active' : 'Inactive';

    const updated = await db
      .update(usersTable)
      .set({
        isActive: newIsActive,
        status: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(usersTable.id, id))
      .returning();

    // Audit Log: 'Active / Inactive'
    await db.insert(auditLogsTable).values({
      propertyId: `user:${id}`,
      action: 'Active / Inactive',
      userName: operator.name || 'System',
      userId: operator.id || null,
      oldValue: current.status,
      newValue: newStatus,
      createdAt: new Date(),
    });

    return updated[0];
  }

  /**
   * Soft Delete / Deactivate User (Strict requirement: Never hard delete!)
   */
  async deactivateUser(id: string, operator: OperatorContext) {
    const existing = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
    if (!existing || existing.length === 0) {
      throw new Error(`User ${id} not found`);
    }
    const current = existing[0];

    const updated = await db
      .update(usersTable)
      .set({
        isActive: false,
        status: 'Inactive',
        updatedAt: new Date(),
      })
      .where(eq(usersTable.id, id))
      .returning();

    return updated[0];
  }

  /**
   * Activate User
   */
  async activateUser(id: string, operator: OperatorContext) {
    const existing = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
    if (!existing || existing.length === 0) {
      throw new Error(`User ${id} not found`);
    }
    const current = existing[0];

    const updated = await db
      .update(usersTable)
      .set({
        isActive: true,
        status: 'Active',
        updatedAt: new Date(),
      })
      .where(eq(usersTable.id, id))
      .returning();

    // Audit Log: 'Active / Inactive'
    await db.insert(auditLogsTable).values({
      propertyId: `user:${id}`,
      action: 'Active / Inactive',
      userName: operator.name || 'System',
      userId: operator.id || null,
      oldValue: current.status,
      newValue: 'Active',
      createdAt: new Date(),
    });

    return updated[0];
  }

  /**
   * Alias for getUsers matching items format
   */
  async listUsers(params: UserFilterParams = {}) {
    const res = await this.getUsers(params);
    return {
      items: res.users,
      total: res.total,
      page: res.page,
      pageSize: res.pageSize,
      totalPages: res.totalPages,
      stats: res.stats,
    };
  }

  /**
   * Get properties assigned to an agent
   */
  async getAgentProperties(agentId: string) {
    const user = await this.getUserById(agentId);
    if (!user) return [];

    return db
      .select()
      .from(propertiesTable)
      .where(
        or(
          eq(propertiesTable.agentId, agentId),
          ilike(propertiesTable.agentName, user.name)
        )
      );
  }
}

export const userService = new UserService();
