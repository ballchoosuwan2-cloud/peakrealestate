import { db, pool, ensureDatabaseSchema } from '../src/db/index.ts';
import {
  usersTable,
  rolesTable,
  systemSettingsTable,
  userPermissionOverridesTable,
  auditLogsTable,
  databaseBackupsTable,
  propertiesTable,
  clientsTable,
  clientFollowUpsTable,
  contractsTable,
  paymentSchedulesTable,
  viewingsTable,
} from '../src/db/schema.ts';
import { userService } from '../src/server/user-service.ts';
import { systemSettingsService } from '../src/server/system-settings-service.ts';
import { clientService } from '../src/server/client-service.ts';
import { viewingService } from '../src/server/viewing-service.ts';
import { contractService } from '../src/server/contract-service.ts';
import { paymentService } from '../src/server/payment-service.ts';
import { checkGranularPermission } from '../src/lib/permissions.ts';
import { eq, and, sql } from 'drizzle-orm';

// ANSI Colors for test output
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

interface TestRecord {
  name: string;
  passed: boolean;
  details?: string;
}

const testResults: TestRecord[] = [];

function recordTest(name: string, passed: boolean, details?: string) {
  testResults.push({ name, passed, details });
  const status = passed ? `${GREEN}[PASS]${RESET}` : `${RED}[FAIL]${RESET}`;
  console.log(`${status} ${BOLD}${name}${RESET}${details ? ` — ${details}` : ''}`);
}

async function runB28SystemAdministrationTestSuite() {
  console.log(`\n${CYAN}${BOLD}========================================================================${RESET}`);
  console.log(`${CYAN}${BOLD}     PEAK REAL ESTATE — B28 SYSTEM ADMINISTRATION TEST SUITE            ${RESET}`);
  console.log(`${CYAN}${BOLD}========================================================================${RESET}\n`);

  await ensureDatabaseSchema();

  // Operators for testing
  const adminOp = {
    id: 'user-admin-1',
    name: 'Administrator',
    role: 'Administrator',
  };

  const managerOp = {
    id: 'user-mgr-1',
    name: 'Nichada Manager',
    role: 'Manager',
  };

  const agentOp = {
    id: 'user-agt-1',
    name: 'Kittisak Agent',
    role: 'Agent',
  };

  // -------------------------------------------------------------
  // 1. User CRUD & Disable
  // -------------------------------------------------------------
  console.log(`${YELLOW}${BOLD}--- 1. User Management (CRUD / Disable / Soft-delete) ---${RESET}`);
  try {
    const testUserId = `b28-user-${Date.now()}`;
    const testUserEmail = `b28.agent.${Date.now()}@peakrealestate.com`;

    // Create user
    const createdUser = await userService.createUser(
      {
        id: testUserId,
        name: 'Waraporn B28 Test',
        email: testUserEmail,
        username: `waraporn_${Date.now()}`,
        role: 'Agent',
        phone: '089-111-2233',
        branch: 'Laguna Branch',
        title: 'Property Consultant',
      },
      adminOp
    );

    // Read user
    const fetchedUser = await userService.getUserById(testUserId);

    // Update user
    const updatedUser = await userService.updateUser(
      testUserId,
      { phone: '089-999-8877', title: 'Senior Property Consultant' },
      adminOp
    );

    // Disable / Deactivate user
    const deactivated = await userService.deactivateUser(testUserId, adminOp);

    // Verify status is Inactive and isActive is false
    const afterDisable = await userService.getUserById(testUserId);

    const passed =
      Boolean(createdUser) &&
      fetchedUser?.id === testUserId &&
      updatedUser.phone === '089-999-8877' &&
      afterDisable?.isActive === false &&
      afterDisable?.status === 'Inactive';

    recordTest(
      'User CRUD & Disable (Soft Deactivate)',
      passed,
      `Created ID: ${testUserId}, Updated: true, Disabled status: ${afterDisable?.status}`
    );
  } catch (err: any) {
    recordTest('User CRUD & Disable (Soft Deactivate)', false, err.message);
  }

  // -------------------------------------------------------------
  // 2. Role CRUD
  // -------------------------------------------------------------
  console.log(`\n${YELLOW}${BOLD}--- 2. Role Management CRUD ---${RESET}`);
  const customRoleId = `legal_officer_${Date.now()}`;
  try {
    // Create Role
    const newRole = await systemSettingsService.createRole(
      {
        id: customRoleId,
        name: 'Legal Officer',
        description: 'Handles contract legal compliance and lease reviews',
        permissions: ['contracts:view', 'contracts:edit', 'contracts:download_word'],
      },
      adminOp
    );

    // Read Role
    const fetchedRole = await systemSettingsService.getRoleById(customRoleId);

    // Update Role
    const updatedRole = await systemSettingsService.updateRole(
      customRoleId,
      {
        description: 'Senior Legal Officer and Contract Specialist',
        permissions: ['contracts:view', 'contracts:create', 'contracts:edit', 'contracts:download_word'],
      },
      adminOp
    );

    // Read roles list
    const allRoles = await systemSettingsService.getRoles();

    const passed =
      Boolean(newRole) &&
      fetchedRole?.name === 'Legal Officer' &&
      (updatedRole.permissions as string[]).includes('contracts:create') &&
      allRoles.some((r) => r.id === customRoleId);

    recordTest(
      'Role CRUD (Create, Read, Update, List)',
      passed,
      `Role ID: ${customRoleId}, Permissions count: ${updatedRole.permissions.length}, System role count: ${allRoles.length}`
    );
  } catch (err: any) {
    recordTest('Role CRUD (Create, Read, Update, List)', false, err.message);
  }

  // -------------------------------------------------------------
  // 3. Assign Role to User
  // -------------------------------------------------------------
  console.log(`\n${YELLOW}${BOLD}--- 3. Assign Role to User ---${RESET}`);
  try {
    const roleAssignUserId = `usr-assign-${Date.now()}`;
    await userService.createUser(
      {
        id: roleAssignUserId,
        name: 'Role Assignment Target',
        email: `role.target.${Date.now()}@peakrealestate.com`,
        role: 'Agent',
      },
      adminOp
    );

    // Reassign role to Manager
    const reassigned = await userService.updateUser(
      roleAssignUserId,
      { role: 'Manager' },
      adminOp
    );

    const passed = reassigned.role === 'Manager';
    recordTest(
      'Assign & Change User Role',
      passed,
      `User ID: ${roleAssignUserId}, New Role: ${reassigned.role}`
    );
  } catch (err: any) {
    recordTest('Assign & Change User Role', false, err.message);
  }

  // -------------------------------------------------------------
  // 4. Permission Matrix & Verification
  // -------------------------------------------------------------
  console.log(`\n${YELLOW}${BOLD}--- 4. Permission Matrix Inspection ---${RESET}`);
  try {
    const adminCheck = checkGranularPermission('Administrator', 'settings:edit_system');
    const managerCheck = checkGranularPermission('Manager', 'contracts:edit');
    const agentCheckBlocked = checkGranularPermission('Agent', 'users:create');
    const staffCheckAllowed = checkGranularPermission('Staff', 'properties:view');
    const staffCheckBlocked = checkGranularPermission('Staff', 'properties:delete');

    const passed =
      adminCheck === true &&
      managerCheck === true &&
      agentCheckBlocked === false &&
      staffCheckAllowed === true &&
      staffCheckBlocked === false;

    recordTest(
      'Permission Matrix (Granular Role Check)',
      passed,
      `Admin access: ${adminCheck}, Manager contract access: ${managerCheck}, Agent user management blocked: ${!agentCheckBlocked}`
    );
  } catch (err: any) {
    recordTest('Permission Matrix (Granular Role Check)', false, err.message);
  }

  // -------------------------------------------------------------
  // 5. User Permission Override
  // -------------------------------------------------------------
  console.log(`\n${YELLOW}${BOLD}--- 5. User Permission Override (Grant & Revoke) ---${RESET}`);
  try {
    const overrideUserId = `usr-override-${Date.now()}`;
    await userService.createUser(
      {
        id: overrideUserId,
        name: 'Override Candidate',
        email: `override.${Date.now()}@peakrealestate.com`,
        role: 'Agent', // Normally does not have properties:delete
      },
      adminOp
    );

    // Check before override
    const beforeOverride = await systemSettingsService.checkUserPermission(
      overrideUserId,
      'Agent',
      'properties:delete'
    );

    // 1. Force Grant 'properties:delete' to this agent
    await systemSettingsService.setUserPermissionOverride(
      overrideUserId,
      'properties:delete',
      true,
      adminOp
    );

    const afterGrant = await systemSettingsService.checkUserPermission(
      overrideUserId,
      'Agent',
      'properties:delete'
    );

    // 2. Force Revoke 'properties:export' from this agent
    await systemSettingsService.setUserPermissionOverride(
      overrideUserId,
      'properties:export',
      false,
      adminOp
    );

    const afterRevoke = await systemSettingsService.checkUserPermission(
      overrideUserId,
      'Agent',
      'properties:export'
    );

    // Check effective permissions list
    const effective = await systemSettingsService.getEffectiveUserPermissions(overrideUserId);

    const passed =
      beforeOverride === false &&
      afterGrant === true &&
      afterRevoke === false &&
      effective.includes('properties:delete') &&
      !effective.includes('properties:export');

    recordTest(
      'User Permission Override (Explicit Grant & Revoke)',
      passed,
      `Before grant: ${beforeOverride}, After grant: ${afterGrant}, After revoke: ${afterRevoke}`
    );
  } catch (err: any) {
    recordTest('User Permission Override (Explicit Grant & Revoke)', false, err.message);
  }

  // -------------------------------------------------------------
  // 6. Backend Permission Enforcement & RBAC HTTP 403
  // -------------------------------------------------------------
  console.log(`\n${YELLOW}${BOLD}--- 6. Backend Permission Enforcement & HTTP 403 Simulation ---${RESET}`);
  try {
    let agentGot403 = false;
    let managerGot403 = false;
    let adminAllowed = false;

    // Agent attempts to update system settings
    try {
      await systemSettingsService.updateSettings('system', { maintenanceMode: true }, agentOp);
    } catch (e: any) {
      if (e.statusCode === 403 || e.code === 'FORBIDDEN') {
        agentGot403 = true;
      }
    }

    // Manager attempts to create a new role
    try {
      await systemSettingsService.createRole({ id: 'illegal_role', name: 'Illegal', permissions: [] }, managerOp);
    } catch (e: any) {
      if (e.statusCode === 403 || e.code === 'FORBIDDEN') {
        managerGot403 = true;
      }
    }

    // Admin attempts to update system settings
    try {
      await systemSettingsService.updateSettings('system', { sessionTimeoutMinutes: 180 }, adminOp);
      adminAllowed = true;
    } catch (e) {
      adminAllowed = false;
    }

    const passed = agentGot403 && managerGot403 && adminAllowed;
    recordTest(
      'Backend Permission Enforcement (HTTP 403 on Non-Admin)',
      passed,
      `Agent 403: ${agentGot403}, Manager 403: ${managerGot403}, Admin allowed: ${adminAllowed}`
    );
  } catch (err: any) {
    recordTest('Backend Permission Enforcement (HTTP 403 on Non-Admin)', false, err.message);
  }

  // -------------------------------------------------------------
  // 7. System Settings
  // -------------------------------------------------------------
  console.log(`\n${YELLOW}${BOLD}--- 7. System Settings (General, Timezone, Maintenance) ---${RESET}`);
  try {
    const updated = await systemSettingsService.updateSettings(
      'system',
      {
        systemName: 'PEAK REAL ESTATE LUXURY PORTAL',
        timezone: 'Asia/Bangkok',
        maintenanceMode: false,
      },
      adminOp
    );

    const fetched = await systemSettingsService.getSettings('system');

    const passed =
      fetched.data.systemName === 'PEAK REAL ESTATE LUXURY PORTAL' &&
      fetched.data.timezone === 'Asia/Bangkok';

    recordTest(
      'System Settings Management',
      passed,
      `System Name: ${fetched.data.systemName}, Timezone: ${fetched.data.timezone}`
    );
  } catch (err: any) {
    recordTest('System Settings Management', false, err.message);
  }

  // -------------------------------------------------------------
  // 8. Business Settings
  // -------------------------------------------------------------
  console.log(`\n${YELLOW}${BOLD}--- 8. Business Settings (Company, Tax, Commission, VAT) ---${RESET}`);
  try {
    await systemSettingsService.updateSettings(
      'business',
      {
        companyName: 'PEAK REAL ESTATE CO., LTD.',
        taxId: '0835564099887',
        defaultCommissionRate: 3.5,
        vatRate: 7.0,
      },
      adminOp
    );

    const fetched = await systemSettingsService.getSettings('business');

    const passed =
      fetched.data.companyName === 'PEAK REAL ESTATE CO., LTD.' &&
      fetched.data.taxId === '0835564099887' &&
      Number(fetched.data.defaultCommissionRate) === 3.5;

    recordTest(
      'Business Settings Management',
      passed,
      `Company: ${fetched.data.companyName}, Commission: ${fetched.data.defaultCommissionRate}%`
    );
  } catch (err: any) {
    recordTest('Business Settings Management', false, err.message);
  }

  // -------------------------------------------------------------
  // 9. Numbering / Prefix Settings & Auto-Sequencing
  // -------------------------------------------------------------
  console.log(`\n${YELLOW}${BOLD}--- 9. Numbering / Prefix Settings & Sequence Generator ---${RESET}`);
  try {
    await systemSettingsService.updateSettings(
      'numbering',
      {
        propertyPrefix: 'PROP-PK-',
        propertyPadding: 5,
        propertyNextSeq: 2001,
      },
      adminOp
    );

    const nextPropNumber = await systemSettingsService.getNextNumber('property');
    const nextContractNumber = await systemSettingsService.getNextNumber('contract');

    const passed = nextPropNumber === 'PROP-PK-02001' && nextContractNumber.startsWith('CNT-');
    recordTest(
      'Numbering Settings & Sequence Generator',
      passed,
      `Generated Property No: ${nextPropNumber}, Contract No: ${nextContractNumber}`
    );
  } catch (err: any) {
    recordTest('Numbering Settings & Sequence Generator', false, err.message);
  }

  // -------------------------------------------------------------
  // 10. Notification Settings
  // -------------------------------------------------------------
  console.log(`\n${YELLOW}${BOLD}--- 10. Notification Settings ---${RESET}`);
  try {
    await systemSettingsService.updateSettings(
      'notification',
      {
        contractExpiryNoticeDays: 45,
        followUpReminderHours: 12,
        emailAlerts: true,
      },
      adminOp
    );

    const fetched = await systemSettingsService.getSettings('notification');

    const passed =
      fetched.data.contractExpiryNoticeDays === 45 &&
      fetched.data.followUpReminderHours === 12;

    recordTest(
      'Notification Settings Management',
      passed,
      `Notice Days: ${fetched.data.contractExpiryNoticeDays}, Reminder Hours: ${fetched.data.followUpReminderHours}`
    );
  } catch (err: any) {
    recordTest('Notification Settings Management', false, err.message);
  }

  // -------------------------------------------------------------
  // 11. Audit Trail Logging
  // -------------------------------------------------------------
  console.log(`\n${YELLOW}${BOLD}--- 11. Audit Trail Logging & History Query ---${RESET}`);
  try {
    const logs = await systemSettingsService.getAuditLogs({ limit: 10 });
    const hasSettingLogs = logs.items.some((l) => l.action.toLowerCase().includes('setting'));

    const passed = logs.items.length > 0 && hasSettingLogs;
    recordTest(
      'Audit Trail Log System',
      passed,
      `Total Log Entries: ${logs.total}, Recent entries contains setting change: ${hasSettingLogs}`
    );
  } catch (err: any) {
    recordTest('Audit Trail Log System', false, err.message);
  }

  // -------------------------------------------------------------
  // 12. Full System Backup Creation
  // -------------------------------------------------------------
  console.log(`\n${YELLOW}${BOLD}--- 12. Full System Backup Creation ---${RESET}`);
  let backupSnapshot: any = null;
  try {
    const backup = await systemSettingsService.createFullBackup(adminOp);
    backupSnapshot = backup.data;

    const passed =
      Boolean(backup.backupId) &&
      backup.metadata.version === 'B28.1' &&
      backup.metadata.totalRecords > 0 &&
      Array.isArray(backup.data.tables.users) &&
      Array.isArray(backup.data.tables.properties);

    recordTest(
      'Full System Backup Snapshot',
      passed,
      `Backup ID: ${backup.backupId}, Version: ${backup.metadata.version}, Records: ${backup.metadata.totalRecords}`
    );
  } catch (err: any) {
    recordTest('Full System Backup Snapshot', false, err.message);
  }

  // -------------------------------------------------------------
  // 13. Restore Validation
  // -------------------------------------------------------------
  console.log(`\n${YELLOW}${BOLD}--- 13. Backup Restore Validation (Integrity Checks) ---${RESET}`);
  try {
    // Valid backup test
    const validCheck = systemSettingsService.validateBackupFile(backupSnapshot);

    // Corrupted backup test (missing tables)
    const corruptedCheck = systemSettingsService.validateBackupFile({
      metadata: { version: '1.0' },
      tables: { random: [] },
    });

    const passed = validCheck.valid === true && corruptedCheck.valid === false && corruptedCheck.errors.length > 0;
    recordTest(
      'Backup Restore Validation (Integrity Gate)',
      passed,
      `Valid backup passed: ${validCheck.valid}, Corrupted rejected: ${!corruptedCheck.valid} (${corruptedCheck.errors[0]})`
    );
  } catch (err: any) {
    recordTest('Backup Restore Validation (Integrity Gate)', false, err.message);
  }

  // -------------------------------------------------------------
  // 14. Regressions: B25, B26, B27 System Verification
  // -------------------------------------------------------------
  console.log(`\n${YELLOW}${BOLD}--- 14. Regressions Verification (B25, B26, B27) ---${RESET}`);
  try {
    // B25 Client CRM
    const clients = await clientService.getClients({ limit: 5 });
    const b25Ok = Array.isArray(clients.clients);

    // B26 Pipeline
    const pipeline = await clientService.getPipelineSummary();
    const b26Ok = Boolean(pipeline && typeof pipeline.totalActiveLeads === 'number');

    // B27 Follow-ups
    const followUps = await clientService.getFollowUpSummary();
    const b27Ok = Boolean(followUps && typeof followUps.totalPending === 'number');

    const passed = b25Ok && b26Ok && b27Ok;
    recordTest(
      'Regression Suite (B25 Client CRM, B26 Sales Pipeline, B27 Tasks)',
      passed,
      `B25 Clients: ${clients.total}, B26 Pipeline: ${pipeline.totalActiveLeads}, B27 Pending Tasks: ${followUps.totalPending}`
    );
  } catch (err: any) {
    recordTest('Regression Suite (B25 Client CRM, B26 Sales Pipeline, B27 Tasks)', false, err.message);
  }

  // -------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------
  console.log(`\n${CYAN}${BOLD}========================================================================${RESET}`);
  console.log(`${CYAN}${BOLD}                   B28 TEST RESULTS SCORECARD                           ${RESET}`);
  console.log(`${CYAN}${BOLD}========================================================================${RESET}\n`);

  let allPassed = true;
  for (const res of testResults) {
    const status = res.passed ? `${GREEN}[PASS]${RESET}` : `${RED}[FAIL]${RESET}`;
    console.log(`${status}  ${BOLD}${res.name}${RESET}${res.details ? `: ${res.details}` : ''}`);
    if (!res.passed) allPassed = false;
  }

  const passedCount = testResults.filter((r) => r.passed).length;
  console.log(`\n${BOLD}Total: ${passedCount} / ${testResults.length} tests passed.${RESET}\n`);

  if (!allPassed) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runB28SystemAdministrationTestSuite().catch((err) => {
  console.error('Test suite failed unexpectedly:', err);
  process.exit(1);
});
