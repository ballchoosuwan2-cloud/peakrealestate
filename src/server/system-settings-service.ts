import { and, desc, asc, eq, ilike, or, sql, inArray } from 'drizzle-orm';
import { db } from '../db/index.ts';
import {
  systemSettingsTable,
  rolesTable,
  userPermissionOverridesTable,
  auditLogsTable,
  databaseBackupsTable,
  usersTable,
  propertiesTable,
  contractsTable,
  paymentSchedulesTable,
  paymentRecordsTable,
  viewingsTable,
  clientsTable,
  clientFollowUpsTable,
  DbRole,
  InsertDbRole,
  DbSystemSetting,
} from '../db/schema.ts';

export interface OperatorContext {
  id: string;
  name: string;
  role: string;
}

export interface PermissionDefinition {
  key: string;
  module: string;
  name: string;
  description: string;
}

export const PERMISSION_CATALOG: PermissionDefinition[] = [
  // Properties
  { key: 'properties:view', module: 'Properties', name: 'View Properties', description: 'View property listings and details' },
  { key: 'properties:create', module: 'Properties', name: 'Create Property', description: 'Create new property listings' },
  { key: 'properties:edit', module: 'Properties', name: 'Edit Property', description: 'Modify property details and media' },
  { key: 'properties:delete', module: 'Properties', name: 'Archive / Delete Property', description: 'Soft delete or archive properties' },
  { key: 'properties:export', module: 'Properties', name: 'Export Properties', description: 'Export property records to Excel / CSV' },
  { key: 'properties:view_owner', module: 'Properties', name: 'View Owner Contact', description: 'View landlord personal contact information' },

  // Clients / CRM
  { key: 'clients:view', module: 'Clients', name: 'View Clients', description: 'View client and lead profiles' },
  { key: 'clients:create', module: 'Clients', name: 'Create Client', description: 'Create new clients and sales leads' },
  { key: 'clients:edit', module: 'Clients', name: 'Edit Client', description: 'Update client details and pipeline stage' },
  { key: 'clients:delete', module: 'Clients', name: 'Archive / Delete Client', description: 'Soft delete client records' },
  { key: 'clients:export', module: 'Clients', name: 'Export Clients', description: 'Export client list to Excel / CSV' },
  { key: 'clients:assign', module: 'Clients', name: 'Assign Agent', description: 'Reassign clients to other sales agents' },

  // Viewings
  { key: 'viewings:view', module: 'Viewings', name: 'View Viewings', description: 'View site viewing appointments' },
  { key: 'viewings:create', module: 'Viewings', name: 'Create Viewing', description: 'Schedule new site viewing tours' },
  { key: 'viewings:edit', module: 'Viewings', name: 'Edit Viewing', description: 'Reschedule or edit appointment details' },
  { key: 'viewings:delete', module: 'Viewings', name: 'Cancel / Delete Viewing', description: 'Cancel viewing appointments with reason' },
  { key: 'viewings:feedback', module: 'Viewings', name: 'Record Feedback', description: 'Record client interest score and post-tour feedback' },

  // Contracts
  { key: 'contracts:view', module: 'Contracts', name: 'View Contracts', description: 'View lease and sales contracts' },
  { key: 'contracts:create', module: 'Contracts', name: 'Create Contract', description: 'Create legal lease / sales agreements' },
  { key: 'contracts:edit', module: 'Contracts', name: 'Edit Contract', description: 'Modify contract terms and tenants' },
  { key: 'contracts:delete', module: 'Contracts', name: 'Terminate / Archive Contract', description: 'Terminate or archive contracts' },
  { key: 'contracts:download_word', module: 'Contracts', name: 'Download Word Doc', description: 'Generate and download official Thai Word contract' },

  // Payments / Finance
  { key: 'payments:view', module: 'Finance', name: 'View Payments', description: 'View payment schedules and rent records' },
  { key: 'payments:create', module: 'Finance', name: 'Create Payment', description: 'Generate payment schedules' },
  { key: 'payments:edit', module: 'Finance', name: 'Edit Payment', description: 'Update payment notes and amounts' },
  { key: 'payments:record_payment', module: 'Finance', name: 'Record Payment Slip', description: 'Record paid transactions and upload bank slips' },

  // Users & Staff
  { key: 'users:view', module: 'Users', name: 'View Users', description: 'View team members and agent profiles' },
  { key: 'users:create', module: 'Users', name: 'Create User', description: 'Add new staff members and agents' },
  { key: 'users:edit', module: 'Users', name: 'Edit User', description: 'Edit staff profiles and sales targets' },
  { key: 'users:disable', module: 'Users', name: 'Disable / Deactivate User', description: 'Toggle user active status' },
  { key: 'users:manage_roles', module: 'Users', name: 'Manage Roles', description: 'Assign roles and configure permissions' },

  // Settings & System
  { key: 'settings:view', module: 'Settings', name: 'View Settings', description: 'View system configuration' },
  { key: 'settings:edit_system', module: 'Settings', name: 'Edit System Config', description: 'Modify general system settings' },
  { key: 'settings:edit_business', module: 'Settings', name: 'Edit Business Config', description: 'Modify company information and taxes' },
  { key: 'settings:edit_numbering', module: 'Settings', name: 'Edit Numbering Sequences', description: 'Configure document prefix numbering' },
  { key: 'settings:backup_restore', module: 'Settings', name: 'Backup & Restore', description: 'Create backups and restore system data' },

  // Audit Logs
  { key: 'audit_logs:view', module: 'Audit Logs', name: 'View Audit Trail', description: 'View system activity and security audit trail' },
  { key: 'audit_logs:export', module: 'Audit Logs', name: 'Export Audit Trail', description: 'Export audit logs to external file' },
];

export const DEFAULT_SYSTEM_SETTINGS: Record<string, any> = {
  system: {
    systemName: 'PEAK REAL ESTATE',
    siteTitle: 'PEAK REAL ESTATE — Luxury Property CRM',
    timezone: 'Asia/Bangkok',
    defaultLanguage: 'th',
    maintenanceMode: false,
    sessionTimeoutMinutes: 120,
  },
  business: {
    companyName: 'PEAK REAL ESTATE',
    companySubtitle: 'พีค เรียล เอสเตท',
    taxId: '0835564012345',
    branch: 'Phuket Head Office',
    defaultCommissionRate: 3.0,
    vatRate: 7.0,
    companyAddress: '124/8 Moo 5, Rawai, Mueang Phuket, Phuket 83130',
    contactPhone: '076-684-900',
    contactEmail: 'contact@peakrealestate.com',
  },
  numbering: {
    propertyPrefix: 'PROP-',
    propertyPadding: 4,
    propertyNextSeq: 1001,
    contractPrefix: 'CNT-',
    contractPadding: 4,
    contractNextSeq: 1001,
    viewingPrefix: 'VW-',
    viewingPadding: 4,
    viewingNextSeq: 1001,
    paymentPrefix: 'PAY-',
    paymentPadding: 4,
    paymentNextSeq: 1001,
    clientPrefix: 'CLI-',
    clientPadding: 4,
    clientNextSeq: 1001,
  },
  notification: {
    emailAlerts: true,
    inAppAlerts: true,
    contractExpiryNoticeDays: 30,
    followUpReminderHours: 24,
    recipientEmails: ['admin@peakrealestate.com', 'operations@peakrealestate.com'],
  },
};

export class SystemSettingsService {
  /**
   * Helper: Check if operator has Administrator privileges
   */
  isAdmin(operator: OperatorContext): boolean {
    const role = (operator.role || '').toLowerCase();
    return role === 'admin' || role === 'administrator' || role === 'super admin';
  }

  /**
   * Enforce admin-only access, throws Error with code FORBIDDEN if not admin
   */
  requireAdmin(operator: OperatorContext, actionName = 'This action') {
    if (!this.isAdmin(operator)) {
      const err = new Error(`Forbidden: ${actionName} requires Administrator privileges`);
      (err as any).statusCode = 403;
      (err as any).code = 'FORBIDDEN';
      throw err;
    }
  }

  // -------------------------------------------------------------
  // 1. Settings Operations (System, Business, Numbering, Notification)
  // -------------------------------------------------------------

  async getSettings(category: string) {
    const records = await db
      .select()
      .from(systemSettingsTable)
      .where(eq(systemSettingsTable.category, category))
      .limit(1);

    if (records.length > 0) {
      return {
        category,
        data: {
          ...(DEFAULT_SYSTEM_SETTINGS[category] || {}),
          ...records[0].data,
        },
        updatedBy: records[0].updatedBy,
        updatedByName: records[0].updatedByName,
        updatedAt: records[0].updatedAt,
      };
    }

    return {
      category,
      data: DEFAULT_SYSTEM_SETTINGS[category] || {},
      updatedBy: null,
      updatedByName: 'Default Configuration',
      updatedAt: new Date(),
    };
  }

  async getAllSettings() {
    const categories = ['system', 'business', 'numbering', 'notification'];
    const result: Record<string, any> = {};

    for (const cat of categories) {
      const s = await this.getSettings(cat);
      result[cat] = s.data;
    }

    return result;
  }

  async updateSettings(category: string, data: Record<string, any>, operator: OperatorContext) {
    this.requireAdmin(operator, `Updating ${category} settings`);

    const existing = await this.getSettings(category);
    const mergedData = {
      ...existing.data,
      ...data,
    };

    const payload = {
      id: category,
      category,
      data: mergedData,
      updatedBy: operator.id,
      updatedByName: operator.name,
      updatedAt: new Date(),
    };

    await db
      .insert(systemSettingsTable)
      .values(payload)
      .onConflictDoUpdate({
        target: systemSettingsTable.id,
        set: {
          data: mergedData,
          updatedBy: operator.id,
          updatedByName: operator.name,
          updatedAt: new Date(),
        },
      });

    // Record in Audit Log
    await db.insert(auditLogsTable).values({
      propertyId: `settings:${category}`,
      action: `Update ${category.toUpperCase()} Settings`,
      userName: operator.name,
      userId: operator.id,
      oldValue: JSON.stringify(existing.data),
      newValue: JSON.stringify(mergedData),
      createdAt: new Date(),
    });

    return {
      category,
      data: mergedData,
      updatedBy: operator.id,
      updatedByName: operator.name,
      updatedAt: new Date(),
    };
  }

  // -------------------------------------------------------------
  // 2. Numbering / Prefix Generator
  // -------------------------------------------------------------

  async getNextNumber(entity: 'property' | 'contract' | 'viewing' | 'payment' | 'client'): Promise<string> {
    const numbering = await this.getSettings('numbering');
    const data = numbering.data;

    let prefix = 'DOC-';
    let padding = 4;
    let seq = 1001;

    switch (entity) {
      case 'property':
        prefix = data.propertyPrefix || 'PROP-';
        padding = data.propertyPadding || 4;
        seq = Number(data.propertyNextSeq || 1001);
        data.propertyNextSeq = seq + 1;
        break;
      case 'contract':
        prefix = data.contractPrefix || 'CNT-';
        padding = data.contractPadding || 4;
        seq = Number(data.contractNextSeq || 1001);
        data.contractNextSeq = seq + 1;
        break;
      case 'viewing':
        prefix = data.viewingPrefix || 'VW-';
        padding = data.viewingPadding || 4;
        seq = Number(data.viewingNextSeq || 1001);
        data.viewingNextSeq = seq + 1;
        break;
      case 'payment':
        prefix = data.paymentPrefix || 'PAY-';
        padding = data.paymentPadding || 4;
        seq = Number(data.paymentNextSeq || 1001);
        data.paymentNextSeq = seq + 1;
        break;
      case 'client':
        prefix = data.clientPrefix || 'CLI-';
        padding = data.clientPadding || 4;
        seq = Number(data.clientNextSeq || 1001);
        data.clientNextSeq = seq + 1;
        break;
    }

    // Update seq in DB
    await db
      .insert(systemSettingsTable)
      .values({
        id: 'numbering',
        category: 'numbering',
        data,
        updatedByName: 'Auto Sequencer',
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: systemSettingsTable.id,
        set: {
          data,
          updatedAt: new Date(),
        },
      });

    const formattedNumber = `${prefix}${String(seq).padStart(padding, '0')}`;
    return formattedNumber;
  }

  // -------------------------------------------------------------
  // 3. Role Management & Permission Matrix
  // -------------------------------------------------------------

  async getRoles() {
    const roles = await db.select().from(rolesTable).orderBy(asc(rolesTable.name));
    return roles;
  }

  async getRoleById(roleId: string) {
    const norm = roleId.toLowerCase().trim();
    const rows = await db
      .select()
      .from(rolesTable)
      .where(or(eq(rolesTable.id, norm), ilike(rolesTable.name, roleId)))
      .limit(1);

    return rows[0] || null;
  }

  async createRole(
    roleData: { id: string; name: string; description?: string; permissions: string[] },
    operator: OperatorContext
  ) {
    this.requireAdmin(operator, 'Creating new role');

    const cleanId = roleData.id.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '');
    if (!cleanId) throw new Error('Role ID is required');
    if (!roleData.name?.trim()) throw new Error('Role name is required');

    const existing = await this.getRoleById(cleanId);
    if (existing) {
      throw new Error(`Role with ID "${cleanId}" already exists`);
    }

    const payload: InsertDbRole = {
      id: cleanId,
      name: roleData.name.trim(),
      description: roleData.description || '',
      permissions: roleData.permissions || [],
      isSystem: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const inserted = await db.insert(rolesTable).values(payload).returning();

    // Audit Log
    await db.insert(auditLogsTable).values({
      propertyId: `role:${cleanId}`,
      action: 'Create Role',
      userName: operator.name,
      userId: operator.id,
      newValue: JSON.stringify(inserted[0]),
      createdAt: new Date(),
    });

    return inserted[0];
  }

  async updateRole(
    roleId: string,
    updates: { name?: string; description?: string; permissions?: string[] },
    operator: OperatorContext
  ) {
    this.requireAdmin(operator, 'Updating role permissions');

    const role = await this.getRoleById(roleId);
    if (!role) {
      throw new Error(`Role "${roleId}" not found`);
    }

    const updated = await db
      .update(rolesTable)
      .set({
        name: updates.name?.trim() || role.name,
        description: updates.description !== undefined ? updates.description : role.description,
        permissions: updates.permissions !== undefined ? updates.permissions : role.permissions,
        updatedAt: new Date(),
      })
      .where(eq(rolesTable.id, role.id))
      .returning();

    // Audit Log
    await db.insert(auditLogsTable).values({
      propertyId: `role:${role.id}`,
      action: 'Update Role Matrix',
      userName: operator.name,
      userId: operator.id,
      oldValue: JSON.stringify({ name: role.name, permissions: role.permissions }),
      newValue: JSON.stringify({ name: updated[0].name, permissions: updated[0].permissions }),
      createdAt: new Date(),
    });

    return updated[0];
  }

  async deleteRole(roleId: string, operator: OperatorContext) {
    this.requireAdmin(operator, 'Deleting role');

    const role = await this.getRoleById(roleId);
    if (!role) {
      throw new Error(`Role "${roleId}" not found`);
    }

    if (role.isSystem) {
      throw new Error(`Cannot delete system role "${role.name}"`);
    }

    // Check if any user currently has this role
    const usersWithRole = await db
      .select({ count: sql<number>`count(*)` })
      .from(usersTable)
      .where(ilike(usersTable.role, role.name));

    if (Number(usersWithRole[0]?.count || 0) > 0) {
      throw new Error(`Cannot delete role "${role.name}" because users are currently assigned to it`);
    }

    await db.delete(rolesTable).where(eq(rolesTable.id, role.id));

    // Audit Log
    await db.insert(auditLogsTable).values({
      propertyId: `role:${role.id}`,
      action: 'Delete Role',
      userName: operator.name,
      userId: operator.id,
      oldValue: JSON.stringify(role),
      createdAt: new Date(),
    });

    return { success: true, deletedRoleId: role.id };
  }

  // -------------------------------------------------------------
  // 4. User Permission Overrides
  // -------------------------------------------------------------

  async getUserPermissionOverrides(userId: string) {
    const overrides = await db
      .select()
      .from(userPermissionOverridesTable)
      .where(eq(userPermissionOverridesTable.userId, userId));
    return overrides;
  }

  async setUserPermissionOverride(
    userId: string,
    permissionKey: string,
    granted: boolean,
    operator: OperatorContext
  ) {
    this.requireAdmin(operator, 'Setting user permission override');

    const id = `uov-${userId}-${permissionKey}`;
    const payload = {
      id,
      userId,
      permissionKey,
      granted,
      grantedBy: operator.name,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const inserted = await db
      .insert(userPermissionOverridesTable)
      .values(payload)
      .onConflictDoUpdate({
        target: userPermissionOverridesTable.id,
        set: {
          granted,
          grantedBy: operator.name,
          updatedAt: new Date(),
        },
      })
      .returning();

    // Audit Log
    await db.insert(auditLogsTable).values({
      propertyId: `user:${userId}:override:${permissionKey}`,
      action: 'User Permission Override',
      userName: operator.name,
      userId: operator.id,
      newValue: JSON.stringify({ userId, permissionKey, granted }),
      createdAt: new Date(),
    });

    return inserted[0];
  }

  async deleteUserPermissionOverride(userId: string, permissionKey: string, operator: OperatorContext) {
    this.requireAdmin(operator, 'Deleting user permission override');

    const id = `uov-${userId}-${permissionKey}`;
    await db.delete(userPermissionOverridesTable).where(eq(userPermissionOverridesTable.id, id));

    // Audit Log
    await db.insert(auditLogsTable).values({
      propertyId: `user:${userId}:override:${permissionKey}`,
      action: 'Remove Permission Override',
      userName: operator.name,
      userId: operator.id,
      createdAt: new Date(),
    });

    return { success: true, userId, permissionKey };
  }

  async getEffectiveUserPermissions(userId: string): Promise<string[]> {
    const users = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (users.length === 0) return [];

    const user = users[0];
    const roleObj = await this.getRoleById(user.role);
    const basePermissions: string[] = roleObj ? (roleObj.permissions as string[]) : [];

    const overrides = await this.getUserPermissionOverrides(userId);
    const permSet = new Set<string>(basePermissions);

    for (const ov of overrides) {
      if (ov.granted) {
        permSet.add(ov.permissionKey);
      } else {
        permSet.delete(ov.permissionKey);
      }
    }

    return Array.from(permSet);
  }

  async checkUserPermission(userId: string, userRole: string, permissionKey: string): Promise<boolean> {
    const roleLower = (userRole || '').toLowerCase();
    // Super Administrator has all permissions
    if (roleLower === 'admin' || roleLower === 'administrator') return true;

    // Check specific user overrides
    const overrides = await this.getUserPermissionOverrides(userId);
    const override = overrides.find((o) => o.permissionKey === permissionKey);
    if (override !== undefined) {
      return override.granted;
    }

    // Fall back to role permissions
    const roleObj = await this.getRoleById(userRole);
    if (!roleObj) return false;

    return (roleObj.permissions as string[]).includes(permissionKey);
  }

  // -------------------------------------------------------------
  // 5. Backup & Restore Validation
  // -------------------------------------------------------------

  async createFullBackup(operator: OperatorContext) {
    this.requireAdmin(operator, 'Creating full system backup');

    const [
      props,
      users,
      contracts,
      schedules,
      records,
      viewings,
      clients,
      followUps,
      settings,
      roles,
      overrides,
    ] = await Promise.all([
      db.select().from(propertiesTable),
      db.select().from(usersTable),
      db.select().from(contractsTable),
      db.select().from(paymentSchedulesTable),
      db.select().from(paymentRecordsTable),
      db.select().from(viewingsTable),
      db.select().from(clientsTable),
      db.select().from(clientFollowUpsTable),
      db.select().from(systemSettingsTable),
      db.select().from(rolesTable),
      db.select().from(userPermissionOverridesTable),
    ]);

    const backupId = `bkp-${Date.now()}`;
    const timestamp = new Date().toISOString();
    const totalRecords =
      props.length +
      users.length +
      contracts.length +
      schedules.length +
      records.length +
      viewings.length +
      clients.length +
      followUps.length;

    const backupData = {
      metadata: {
        backupId,
        version: 'B28.1',
        createdAt: timestamp,
        createdByName: operator.name,
        createdById: operator.id,
        system: 'PEAK REAL ESTATE',
        totalRecords,
      },
      tables: {
        properties: props,
        users,
        contracts,
        paymentSchedules: schedules,
        paymentRecords: records,
        viewings,
        clients,
        clientFollowUps: followUps,
        systemSettings: settings,
        roles,
        userPermissionOverrides: overrides,
      },
    };

    const jsonStr = JSON.stringify(backupData);

    // Save record to databaseBackupsTable
    await db.insert(databaseBackupsTable).values({
      backupId,
      fileName: `peak_backup_${timestamp.replace(/[:.]/g, '-').slice(0, 19)}.json`,
      fileSize: jsonStr.length,
      recordCount: totalRecords,
      status: 'Success',
      createdByName: operator.name,
      createdAt: new Date(),
    });

    // Record in Audit Log
    await db.insert(auditLogsTable).values({
      propertyId: `backup:${backupId}`,
      action: 'Create Backup',
      userName: operator.name,
      userId: operator.id,
      newValue: JSON.stringify({ backupId, totalRecords }),
      createdAt: new Date(),
    });

    return {
      backupId,
      metadata: backupData.metadata,
      data: backupData,
      jsonString: jsonStr,
    };
  }

  validateBackupFile(backupJson: any): { valid: boolean; errors: string[]; summary?: any } {
    const errors: string[] = [];

    if (!backupJson || typeof backupJson !== 'object') {
      errors.push('Invalid JSON payload: root must be an object');
      return { valid: false, errors };
    }

    if (!backupJson.tables || typeof backupJson.tables !== 'object') {
      errors.push('Missing "tables" object in backup file');
    }

    const tables = backupJson.tables || {};
    const requiredTables = ['properties', 'users', 'contracts', 'clients'];
    for (const t of requiredTables) {
      if (!Array.isArray(tables[t])) {
        errors.push(`Table "${t}" is missing or is not an array`);
      }
    }

    const summary = {
      propertiesCount: Array.isArray(tables.properties) ? tables.properties.length : 0,
      usersCount: Array.isArray(tables.users) ? tables.users.length : 0,
      contractsCount: Array.isArray(tables.contracts) ? tables.contracts.length : 0,
      clientsCount: Array.isArray(tables.clients) ? tables.clients.length : 0,
      viewingsCount: Array.isArray(tables.viewings) ? tables.viewings.length : 0,
      paymentsCount: Array.isArray(tables.paymentSchedules) ? tables.paymentSchedules.length : 0,
      version: backupJson.metadata?.version || 'Unknown',
      createdAt: backupJson.metadata?.createdAt || 'Unknown',
    };

    return {
      valid: errors.length === 0,
      errors,
      summary,
    };
  }

  async restoreBackup(backupJson: any, operator: OperatorContext) {
    this.requireAdmin(operator, 'Restoring system database from backup');

    const validation = this.validateBackupFile(backupJson);
    if (!validation.valid) {
      throw new Error(`Backup validation failed: ${validation.errors.join(', ')}`);
    }

    const tables = backupJson.tables;

    // Restore system settings if present
    if (Array.isArray(tables.systemSettings) && tables.systemSettings.length > 0) {
      for (const item of tables.systemSettings) {
        if (item.id && item.category) {
          await db
            .insert(systemSettingsTable)
            .values({
              id: item.id,
              category: item.category,
              data: item.data || {},
              updatedByName: operator.name,
              updatedAt: new Date(),
            })
            .onConflictDoUpdate({
              target: systemSettingsTable.id,
              set: {
                data: item.data || {},
                updatedByName: operator.name,
                updatedAt: new Date(),
              },
            });
        }
      }
    }

    // Restore roles if present
    if (Array.isArray(tables.roles) && tables.roles.length > 0) {
      for (const r of tables.roles) {
        if (r.id && r.name) {
          await db
            .insert(rolesTable)
            .values({
              id: r.id,
              name: r.name,
              description: r.description || '',
              permissions: r.permissions || [],
              isSystem: Boolean(r.isSystem),
            })
            .onConflictDoUpdate({
              target: rolesTable.id,
              set: {
                name: r.name,
                description: r.description || '',
                permissions: r.permissions || [],
              },
            });
        }
      }
    }

    // Record in Audit Log
    await db.insert(auditLogsTable).values({
      propertyId: 'system:restore',
      action: 'Restore Backup',
      userName: operator.name,
      userId: operator.id,
      newValue: JSON.stringify(validation.summary),
      createdAt: new Date(),
    });

    return {
      success: true,
      restoredSummary: validation.summary,
      restoredBy: operator.name,
      timestamp: new Date().toISOString(),
    };
  }

  // -------------------------------------------------------------
  // 6. Audit Trail Logging & Retrieval
  // -------------------------------------------------------------

  async getAuditLogs(params: {
    module?: string;
    action?: string;
    userName?: string;
    limit?: number;
    offset?: number;
  } = {}) {
    const limit = Math.min(200, Math.max(1, params.limit || 50));
    const offset = Math.max(0, params.offset || 0);

    const conditions = [];

    if (params.action) {
      conditions.push(ilike(auditLogsTable.action, `%${params.action.trim()}%`));
    }
    if (params.userName) {
      conditions.push(ilike(auditLogsTable.userName, `%${params.userName.trim()}%`));
    }
    if (params.module) {
      conditions.push(ilike(auditLogsTable.propertyId, `${params.module.trim().toLowerCase()}:%`));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const logs = await db
      .select()
      .from(auditLogsTable)
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(auditLogsTable.createdAt));

    const countRes = await db
      .select({ count: sql<number>`count(*)` })
      .from(auditLogsTable)
      .where(whereClause);

    return {
      items: logs,
      total: Number(countRes[0]?.count || 0),
      limit,
      offset,
    };
  }
}

export const systemSettingsService = new SystemSettingsService();
