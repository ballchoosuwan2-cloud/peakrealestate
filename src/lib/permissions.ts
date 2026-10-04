import { User, UserRole, Property } from '../types';

/**
 * Access Scopes:
 * - 'all': Unrestricted company-wide portfolio access (Administrator)
 * - 'branch': Properties in same branch or department (Manager)
 * - 'own': Properties created by or assigned to the user (Agent)
 * - 'view_only': Operational maintenance/inspection read view (Staff)
 */
export type AccessScope = 'all' | 'branch' | 'own' | 'view_only';

export interface RolePermissions {
  canCreateProperty: boolean;
  canEditProperty: boolean;
  canArchiveProperty: boolean;
  canRestoreProperty: boolean;
  canHardDeleteProperty: boolean; // Strictly false for all production roles to prevent data loss
  canViewOwnerContact: boolean;
  canAssignAgent: boolean;
  canApproveListing: boolean;
  canExportData: boolean;
  canViewArchived: boolean;
  canBulkOperate: boolean;
  scope: AccessScope;
}

/**
 * PEAK REAL ESTATE Permission Matrix (RBAC)
 */
export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {

  Admin: {
    canCreateProperty: true,
    canEditProperty: true,
    canArchiveProperty: true,
    canRestoreProperty: true,
    canHardDeleteProperty: false, // Protected: soft delete / archive only
    canViewOwnerContact: true,
    canAssignAgent: true,
    canApproveListing: true,
    canExportData: true,
    canViewArchived: true,
    canBulkOperate: true,
    scope: 'all',
  },
  Administrator: {
    canCreateProperty: true,
    canEditProperty: true,
    canArchiveProperty: true,
    canRestoreProperty: true,
    canHardDeleteProperty: false, // Protected: soft delete / archive only
    canViewOwnerContact: true,
    canAssignAgent: true,
    canApproveListing: true,
    canExportData: true,
    canViewArchived: true,
    canBulkOperate: true,
    scope: 'all',
  },
  Manager: {
    canCreateProperty: true,
    canEditProperty: true,
    canArchiveProperty: true,
    canRestoreProperty: true,
    canHardDeleteProperty: false,
    canViewOwnerContact: true,
    canAssignAgent: true,
    canApproveListing: true,
    canExportData: true,
    canViewArchived: true,
    canBulkOperate: true,
    scope: 'branch',
  },
  Agent: {
    canCreateProperty: true,
    canEditProperty: true,
    canArchiveProperty: true,
    canRestoreProperty: false, // Agents can archive their own listing, but restoring requires manager/admin
    canHardDeleteProperty: false,
    canViewOwnerContact: true,
    canAssignAgent: false,
    canApproveListing: false,
    canExportData: true,
    canViewArchived: false,
    canBulkOperate: false,
    scope: 'own',
  },
  Staff: {
    canCreateProperty: false,
    canEditProperty: false,
    canArchiveProperty: false,
    canRestoreProperty: false,
    canHardDeleteProperty: false,
    canViewOwnerContact: false, // Masked phone & ID for operational inspection staff
    canAssignAgent: false,
    canApproveListing: false,
    canExportData: false,
    canViewArchived: false,
    canBulkOperate: false,
    scope: 'view_only',
  },
};

export type B20Permission = 'View' | 'Create' | 'Edit' | 'Archive' | 'Restore';

export const B20_ROLE_PERMISSIONS: Record<string, B20Permission[]> = {
  Admin: ['View', 'Create', 'Edit', 'Archive', 'Restore'],
  Administrator: ['View', 'Create', 'Edit', 'Archive', 'Restore'],
  Manager: ['View', 'Create', 'Edit', 'Archive', 'Restore'],
  Agent: ['View', 'Create', 'Edit'],
  Staff: ['View'],
};

/**
 * Check if an operator role can manage/modify a target role
 */
export function canManageRole(operatorRole?: string, targetRole?: string): boolean {
  if (!operatorRole || !targetRole) return false;
  const normOp = (operatorRole || '').toLowerCase();
  const normTarget = (targetRole || '').toLowerCase();
  if (normOp.includes('admin')) return true;
  if (normOp.includes('manager')) {
    return !normTarget.includes('admin') && !normTarget.includes('manager');
  }
  return false;
}

/**
 * Check if a user has permission to perform a specific action
 */
export function hasPermission(
  userOrRole: User | UserRole | string | null | undefined,
  action: string | keyof Omit<RolePermissions, 'scope'>
): boolean {
  if (!userOrRole) return false;
  const role: string = typeof userOrRole === 'string' ? userOrRole : userOrRole.role || 'Agent';
  const roleLower = (role || '').toLowerCase();
  
  // Check B20 basic permissions (View, Create, Edit, Archive, Restore)
  if (['View', 'Create', 'Edit', 'Archive', 'Restore'].includes(action as string)) {
    const list = B20_ROLE_PERMISSIONS[role] || (roleLower.includes('admin') ? B20_ROLE_PERMISSIONS.Admin : roleLower.includes('manager') ? B20_ROLE_PERMISSIONS.Manager : B20_ROLE_PERMISSIONS.Agent);
    return list.includes(action as B20Permission);
  }

  const perms = ROLE_PERMISSIONS[role as UserRole] || ROLE_PERMISSIONS.Staff;
  return Boolean(perms[action as keyof Omit<RolePermissions, 'scope'>]);
}

/**
 * Check if a user can edit a specific property based on role and ownership
 */
export function canUserEditProperty(user: User | null | undefined, property: Property): boolean {
  if (!user) return false;
  if (user.role === 'Administrator') return true;
  if (user.role === 'Manager') return true; // Branch/team oversight
  if (user.role === 'Agent') {
    // Agent can edit if they are assigned agent or creator
    return property.agentId === user.id || property.agentName === user.name;
  }
  return false;
}

/**
 * Check if a user can archive a specific property or has general archive permission
 */
export function canUserArchiveProperty(user: User | null | undefined, property?: Property): boolean {
  if (!user) return false;
  if (user.role === 'Administrator' || user.role === 'Manager') return true;
  if (user.role === 'Agent' && property) {
    return property.agentId === user.id || property.agentName === user.name;
  }
  return false;
}

/**
 * Check if a user can restore an archived property
 */
export function canUserRestoreProperty(user: User | null | undefined): boolean {
  if (!user) return false;
  return user.role === 'Administrator' || user.role === 'Manager';
}

/**
 * Filter properties list based on user's access scope
 */
export function filterPropertiesByScope(properties: Property[], user: User | null | undefined): Property[] {
  if (!user) return [];
  if (user.role === 'Administrator') return properties;
  if (user.role === 'Manager') {
    // In demo dataset with branch, all team listings in the branch
    return properties;
  }
  if (user.role === 'Agent') {
    // Agents see all available properties in portfolio for matching clients,
    // but their editable items are strictly their own.
    return properties;
  }
  if (user.role === 'Staff') {
    return properties;
  }
  return properties;
}

// -------------------------------------------------------------
// B28 — Granular Permission Matrix & User Overrides
// -------------------------------------------------------------

export interface B28PermissionItem {
  key: string;
  module: string;
  name: string;
  description: string;
}

export const B28_PERMISSION_KEYS: B28PermissionItem[] = [
  { key: 'properties:view', module: 'Properties', name: 'View Properties', description: 'View property listings and details' },
  { key: 'properties:create', module: 'Properties', name: 'Create Property', description: 'Create new property listings' },
  { key: 'properties:edit', module: 'Properties', name: 'Edit Property', description: 'Modify property details and media' },
  { key: 'properties:delete', module: 'Properties', name: 'Archive / Delete Property', description: 'Soft delete or archive properties' },
  { key: 'properties:export', module: 'Properties', name: 'Export Properties', description: 'Export property records to Excel / CSV' },
  { key: 'properties:view_owner', module: 'Properties', name: 'View Owner Contact', description: 'View landlord personal contact information' },

  { key: 'clients:view', module: 'Clients', name: 'View Clients', description: 'View client and lead profiles' },
  { key: 'clients:create', module: 'Clients', name: 'Create Client', description: 'Create new clients and sales leads' },
  { key: 'clients:edit', module: 'Clients', name: 'Edit Client', description: 'Update client details and pipeline stage' },
  { key: 'clients:delete', module: 'Clients', name: 'Archive / Delete Client', description: 'Soft delete client records' },
  { key: 'clients:export', module: 'Clients', name: 'Export Clients', description: 'Export client list to Excel / CSV' },
  { key: 'clients:assign', module: 'Clients', name: 'Assign Agent', description: 'Reassign clients to other sales agents' },

  { key: 'viewings:view', module: 'Viewings', name: 'View Viewings', description: 'View site viewing appointments' },
  { key: 'viewings:create', module: 'Viewings', name: 'Create Viewing', description: 'Schedule new site viewing tours' },
  { key: 'viewings:edit', module: 'Viewings', name: 'Edit Viewing', description: 'Reschedule or edit appointment details' },
  { key: 'viewings:delete', module: 'Viewings', name: 'Cancel / Delete Viewing', description: 'Cancel viewing appointments with reason' },
  { key: 'viewings:feedback', module: 'Viewings', name: 'Record Feedback', description: 'Record client interest score and post-tour feedback' },

  { key: 'contracts:view', module: 'Contracts', name: 'View Contracts', description: 'View lease and sales contracts' },
  { key: 'contracts:create', module: 'Contracts', name: 'Create Contract', description: 'Create legal lease / sales agreements' },
  { key: 'contracts:edit', module: 'Contracts', name: 'Edit Contract', description: 'Modify contract terms and tenants' },
  { key: 'contracts:delete', module: 'Contracts', name: 'Terminate / Archive Contract', description: 'Terminate or archive contracts' },
  { key: 'contracts:download_word', module: 'Contracts', name: 'Download Word Doc', description: 'Generate and download official Thai Word contract' },

  { key: 'payments:view', module: 'Finance', name: 'View Payments', description: 'View payment schedules and rent records' },
  { key: 'payments:create', module: 'Finance', name: 'Create Payment', description: 'Generate payment schedules' },
  { key: 'payments:edit', module: 'Finance', name: 'Edit Payment', description: 'Update payment notes and amounts' },
  { key: 'payments:record_payment', module: 'Finance', name: 'Record Payment Slip', description: 'Record paid transactions and upload bank slips' },

  { key: 'users:view', module: 'Users', name: 'View Users', description: 'View team members and agent profiles' },
  { key: 'users:create', module: 'Users', name: 'Create User', description: 'Add new staff members and agents' },
  { key: 'users:edit', module: 'Users', name: 'Edit User', description: 'Edit staff profiles and sales targets' },
  { key: 'users:disable', module: 'Users', name: 'Disable / Deactivate User', description: 'Toggle user active status' },
  { key: 'users:manage_roles', module: 'Users', name: 'Manage Roles', description: 'Assign roles and configure permissions' },

  { key: 'settings:view', module: 'Settings', name: 'View Settings', description: 'View system configuration' },
  { key: 'settings:edit_system', module: 'Settings', name: 'Edit System Config', description: 'Modify general system settings' },
  { key: 'settings:edit_business', module: 'Settings', name: 'Edit Business Config', description: 'Modify company information and taxes' },
  { key: 'settings:edit_numbering', module: 'Settings', name: 'Edit Numbering Sequences', description: 'Configure document prefix numbering' },
  { key: 'settings:backup_restore', module: 'Settings', name: 'Backup & Restore', description: 'Create backups and restore system data' },

  { key: 'audit_logs:view', module: 'Audit Logs', name: 'View Audit Trail', description: 'View system activity and security audit trail' },
  { key: 'audit_logs:export', module: 'Audit Logs', name: 'Export Audit Trail', description: 'Export audit logs to external file' },

  { key: 'reports:view', module: 'Reports', name: 'View Reports & BI', description: 'View business intelligence reports and analytics' },
  { key: 'reports:export', module: 'Reports', name: 'Export Reports', description: 'Export report data to Excel / CSV / Print' },
  { key: 'reports:financial', module: 'Reports', name: 'View Financial Analytics', description: 'Access financial sales, rental, and payment metrics' },

  { key: 'maintenance:view', module: 'Maintenance', name: 'View Maintenance', description: 'View maintenance requests and history' },
  { key: 'maintenance:create', module: 'Maintenance', name: 'Create Maintenance Request', description: 'Report issue and create ticket' },
  { key: 'maintenance:edit', module: 'Maintenance', name: 'Edit Maintenance', description: 'Update maintenance details and progress' },
  { key: 'maintenance:delete', module: 'Maintenance', name: 'Delete Maintenance', description: 'Archive maintenance request' },
  { key: 'maintenance:assign', module: 'Maintenance', name: 'Assign Technician/Vendor', description: 'Assign vendor or agent to maintenance request' },
  { key: 'maintenance:approve', module: 'Maintenance', name: 'Approve & Complete Maintenance', description: 'Approve maintenance completion and resolution' },
  { key: 'maintenance:cost', module: 'Maintenance', name: 'Manage Maintenance Cost', description: 'Add and record labor, parts, travel costs' },
  { key: 'maintenance:export', module: 'Maintenance', name: 'Export Maintenance Data', description: 'Export maintenance requests to Excel/CSV' },
];

export const B28_STANDARD_ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: [
    'properties:view', 'properties:create', 'properties:edit', 'properties:delete', 'properties:export', 'properties:view_owner',
    'clients:view', 'clients:create', 'clients:edit', 'clients:delete', 'clients:export', 'clients:assign',
    'viewings:view', 'viewings:create', 'viewings:edit', 'viewings:delete', 'viewings:feedback',
    'contracts:view', 'contracts:create', 'contracts:edit', 'contracts:delete', 'contracts:download_word',
    'payments:view', 'payments:create', 'payments:edit', 'payments:record_payment',
    'users:view', 'users:create', 'users:edit', 'users:disable', 'users:manage_roles',
    'settings:view', 'settings:edit_system', 'settings:edit_business', 'settings:edit_numbering', 'settings:backup_restore',
    'audit_logs:view', 'audit_logs:export',
    'reports:view', 'reports:export', 'reports:financial',
    'maintenance:view', 'maintenance:create', 'maintenance:edit', 'maintenance:delete', 'maintenance:assign', 'maintenance:approve', 'maintenance:cost', 'maintenance:export',
  ],
  manager: [
    'properties:view', 'properties:create', 'properties:edit', 'properties:delete', 'properties:export', 'properties:view_owner',
    'clients:view', 'clients:create', 'clients:edit', 'clients:export', 'clients:assign',
    'viewings:view', 'viewings:create', 'viewings:edit', 'viewings:feedback',
    'contracts:view', 'contracts:create', 'contracts:edit', 'contracts:download_word',
    'payments:view', 'payments:record_payment',
    'users:view', 'settings:view', 'audit_logs:view',
    'reports:view', 'reports:export', 'reports:financial',
    'maintenance:view', 'maintenance:create', 'maintenance:edit', 'maintenance:delete', 'maintenance:assign', 'maintenance:approve', 'maintenance:cost', 'maintenance:export',
  ],
  agent: [
    'properties:view', 'properties:create', 'properties:edit', 'properties:export', 'properties:view_owner',
    'clients:view', 'clients:create', 'clients:edit',
    'viewings:view', 'viewings:create', 'viewings:edit', 'viewings:feedback',
    'contracts:view', 'contracts:create',
    'payments:view',
    'reports:view',
    'maintenance:view', 'maintenance:create', 'maintenance:edit', 'maintenance:assign', 'maintenance:cost', 'maintenance:export',
  ],
  staff: [
    'properties:view', 'viewings:view', 'payments:view',
    'maintenance:view', 'maintenance:create', 'maintenance:edit', 'maintenance:cost',
  ],
};

export function checkGranularPermission(
  userRole?: string,
  permissionKey?: string,
  userOverrides?: Array<{ permissionKey: string; granted: boolean }>
): boolean {
  if (!userRole || !permissionKey) return false;
  const roleLower = userRole.toLowerCase();

  // Admin has unrestricted access
  if (roleLower === 'admin' || roleLower === 'administrator') return true;

  // Check user specific overrides
  if (userOverrides && userOverrides.length > 0) {
    const ov = userOverrides.find((o) => o.permissionKey === permissionKey);
    if (ov !== undefined) {
      return ov.granted;
    }
  }

  // Check role standard permissions
  const roleKey = roleLower.includes('admin') ? 'admin' : roleLower.includes('manager') ? 'manager' : roleLower.includes('staff') ? 'staff' : 'agent';
  const rolePerms = B28_STANDARD_ROLE_PERMISSIONS[roleKey] || [];
  return rolePerms.includes(permissionKey);
}

