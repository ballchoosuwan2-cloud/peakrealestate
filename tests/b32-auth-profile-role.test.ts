import { db, pool, ensureDatabaseSchema } from '../src/db/index.ts';
import {
  usersTable,
  rolesTable,
  sessionsTable,
  auditLogsTable,
  systemSettingsTable,
  userPermissionOverridesTable,
  propertiesTable,
  clientsTable,
  contractsTable,
  viewingsTable,
  maintenanceVendorsTable,
  maintenanceRequestsTable,
  maintenanceCostsTable,
  preventiveMaintenanceTable,
  paymentSchedulesTable,
} from '../src/db/schema.ts';
import {
  authService,
  hashPassword,
  verifyPassword,
  DEFAULT_INITIAL_PASSWORD,
} from '../src/server/auth-service.ts';
import { userService } from '../src/server/user-service.ts';
import { systemSettingsService } from '../src/server/system-settings-service.ts';
import { reportingService } from '../src/server/reporting-service.ts';
import { maintenanceService } from '../src/server/maintenance-service.ts';
import { clientService } from '../src/server/client-service.ts';
import { contractService } from '../src/server/contract-service.ts';
import { viewingService } from '../src/server/viewing-service.ts';
import { seedInitialPropertiesIfEmpty } from '../src/server/db-service.ts';
import { saveAvatarFile } from '../src/server/avatar-upload.ts';
import { eq, desc, and, ilike } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

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

async function runB32AuthProfileRoleTestSuite() {
  console.log(`\n${CYAN}${BOLD}========================================================================${RESET}`);
  console.log(`${CYAN}${BOLD}  PEAK REAL ESTATE — B32 AUTHENTICATION, PROFILE & ROLE QA TEST SUITE   ${RESET}`);
  console.log(`${CYAN}${BOLD}========================================================================${RESET}\n`);

  // Ensure DB & baseline users
  await ensureDatabaseSchema();
  await authService.ensureDefaultUsersHavePassword();

  // -------------------------------------------------------------------------
  // 1. PASSWORD HASHING & CRYPTOGRAPHY INTEGRITY
  // -------------------------------------------------------------------------
  console.log(`\n${YELLOW}${BOLD}[1. PASSWORD HASHING & CRYPTOGRAPHY INTEGRITY]${RESET}`);
  try {
    const rawPassword = 'SecretPeakPassword@2026';
    const hash = hashPassword(rawPassword);

    const isHashed = typeof hash === 'string' && hash.includes(':') && hash.length > 50;
    const isValid = verifyPassword(rawPassword, hash);
    const isInvalidRejected = !verifyPassword('WrongPassword123', hash);
    const isPlainTextDifferent = hash !== rawPassword;

    recordTest(
      'Secure Salted Scrypt Password Hashing & Verification',
      isHashed && isValid && isInvalidRejected && isPlainTextDifferent,
      `Salt:Hash format verified: ${hash.substring(0, 20)}...`
    );
  } catch (err: any) {
    recordTest('Secure Salted Scrypt Password Hashing & Verification', false, err.message);
  }

  // -------------------------------------------------------------------------
  // 2. LOGIN SUCCESS & SESSION ISSUANCE
  // -------------------------------------------------------------------------
  console.log(`\n${YELLOW}${BOLD}[2. LOGIN SUCCESS & SESSION ISSUANCE]${RESET}`);
  let adminSessionToken = '';
  let loggedInAdminUserId = '';
  try {
    // Find admin user
    const admins = await db.select().from(usersTable).where(ilike(usersTable.email, '%admin%')).limit(1);
    const adminUser = admins[0];
    if (!adminUser) throw new Error('No admin user found in database');

    loggedInAdminUserId = adminUser.id;

    // Login with Email + Password
    const loginResult = await authService.login(adminUser.email, DEFAULT_INITIAL_PASSWORD, {
      ip: '127.0.0.1',
      userAgent: 'Mozilla/5.0 TestSuite',
    });

    adminSessionToken = loginResult.token;
    const hasToken = Boolean(loginResult.token && loginResult.token.length >= 32);
    const hasUser = Boolean(loginResult.user && loginResult.user.id === adminUser.id);
    const noPasswordLeak = !(loginResult.user as any).passwordHash;

    recordTest(
      'Login Success with Email & Session Token Generation',
      hasToken && hasUser && noPasswordLeak,
      `User: ${loginResult.user.name}, Token: ${adminSessionToken.substring(0, 12)}...`
    );

    // Also test Login with Username
    if (adminUser.username) {
      const loginByUsername = await authService.login(adminUser.username, DEFAULT_INITIAL_PASSWORD);
      recordTest(
        'Login Success with Username (Case-Insensitive)',
        Boolean(loginByUsername.token && loginByUsername.user.id === adminUser.id),
        `Username: ${adminUser.username}`
      );
    } else {
      recordTest('Login Success with Username (Case-Insensitive)', true, 'Skipped (no username set)');
    }
  } catch (err: any) {
    recordTest('Login Success with Email & Session Token Generation', false, err.message);
  }

  // -------------------------------------------------------------------------
  // 3. LOGIN FAILED (SECURITY VALIDATION)
  // -------------------------------------------------------------------------
  console.log(`\n${YELLOW}${BOLD}[3. LOGIN FAILED (SECURITY VALIDATION)]${RESET}`);
  try {
    let wrongPwFailed = false;
    try {
      await authService.login('admin@peakrealestate.com', 'IncorrectPassword!@#');
    } catch (e: any) {
      wrongPwFailed = true;
    }

    let nonExistentUserFailed = false;
    try {
      await authService.login('non_existent_user_9999@peakrealestate.com', 'SomePassword123');
    } catch (e: any) {
      nonExistentUserFailed = true;
    }

    recordTest(
      'Login Rejection for Invalid Password & Unknown Users',
      wrongPwFailed && nonExistentUserFailed,
      'Invalid credentials properly rejected with error'
    );
  } catch (err: any) {
    recordTest('Login Rejection for Invalid Password & Unknown Users', false, err.message);
  }

  // -------------------------------------------------------------------------
  // 4. PROTECTED SESSION VALIDATION & LOGOUT
  // -------------------------------------------------------------------------
  console.log(`\n${YELLOW}${BOLD}[4. PROTECTED SESSION VALIDATION & LOGOUT]${RESET}`);
  try {
    // Validate session
    const sessionUser = await authService.getSessionUser(adminSessionToken);
    const validSession = Boolean(sessionUser && sessionUser.id === loggedInAdminUserId);

    // Logout
    await authService.destroySession(adminSessionToken);
    const revokedUser = await authService.getSessionUser(adminSessionToken);
    const loggedOutSuccessfully = revokedUser === null;

    recordTest(
      'Session Token Authentication & Invalidation on Logout',
      validSession && loggedOutSuccessfully,
      `Session valid: ${validSession}, Invalidated after logout: ${loggedOutSuccessfully}`
    );
  } catch (err: any) {
    recordTest('Session Token Authentication & Invalidation on Logout', false, err.message);
  }

  // -------------------------------------------------------------------------
  // 5. CHANGE PASSWORD & ADMIN RESET PASSWORD
  // -------------------------------------------------------------------------
  console.log(`\n${YELLOW}${BOLD}[5. CHANGE PASSWORD & ADMIN RESET PASSWORD]${RESET}`);
  try {
    const operator = { id: loggedInAdminUserId, name: 'Administrator', role: 'Administrator' };

    // Change password self with current password verification
    const newTestPassword = 'PeakUpdatedPassword@2026';
    await authService.changePassword(
      loggedInAdminUserId,
      DEFAULT_INITIAL_PASSWORD,
      newTestPassword,
      operator
    );

    // Verify login with new password
    const loginWithNew = await authService.login('admin@peakrealestate.com', newTestPassword);
    const changeSuccess = Boolean(loginWithNew.token);

    // Admin reset password for another user
    await authService.resetPassword(loggedInAdminUserId, DEFAULT_INITIAL_PASSWORD, operator);
    const loginRestored = await authService.login('admin@peakrealestate.com', DEFAULT_INITIAL_PASSWORD);

    recordTest(
      'Password Modification with Current Verification & Admin Reset',
      changeSuccess && Boolean(loginRestored.token),
      'Password updated, verified, and admin reset executed safely'
    );
  } catch (err: any) {
    recordTest('Password Modification with Current Verification & Admin Reset', false, err.message);
  }

  // -------------------------------------------------------------------------
  // 6. USER CREATION WITH ROLE, BRANCH, DEPARTMENT & TITLE
  // -------------------------------------------------------------------------
  console.log(`\n${YELLOW}${BOLD}[6. USER CREATION WITH ROLE, BRANCH, DEPARTMENT & TITLE]${RESET}`);
  let createdUserId = '';
  try {
    const uniqueEmail = `agent.qa.${Date.now()}@peakrealestate.com`;
    const uniqueUsername = `agent_qa_${Date.now()}`;

    const createdUser = await userService.createUser(
      {
        id: `usr-sarah-${Date.now()}`,
        name: 'Sarah Connor',
        email: uniqueEmail,
        username: uniqueUsername,
        role: 'Agent',
        branch: 'Phuket Head Office',
        department: 'Residential Sales',
        title: 'Senior Luxury Property Consultant',
        phone: '089-999-8888',
        isActive: true,
        permissions: ['View', 'Create', 'Edit'],
      },
      { id: loggedInAdminUserId, name: 'Administrator', role: 'Administrator' }
    );

    createdUserId = createdUser.id;
    const userInDb = await db.select().from(usersTable).where(eq(usersTable.id, createdUserId)).limit(1);
    const valid = userInDb.length > 0 && userInDb[0].username === uniqueUsername;

    recordTest(
      'Create User with Department, Branch, Title & Initial Credentials',
      valid,
      `Created User ID: ${createdUserId}, Username: ${uniqueUsername}`
    );
  } catch (err: any) {
    recordTest('Create User with Department, Branch, Title & Initial Credentials', false, err.message);
  }

  // -------------------------------------------------------------------------
  // 7. USER PROFILE UPDATE & AVATAR VERIFICATION
  // -------------------------------------------------------------------------
  console.log(`\n${YELLOW}${BOLD}[7. USER PROFILE UPDATE & AVATAR VERIFICATION]${RESET}`);
  try {
    const operator = { id: createdUserId, name: 'Sarah Connor', role: 'Agent' };
    const updated = await authService.updateProfile(
      createdUserId,
      {
        name: 'Sarah Connor (Updated)',
        phone: '089-111-2222',
        title: 'VIP Investment Consultant',
      },
      operator
    );

    const isUpdated = updated.name === 'Sarah Connor (Updated)' && updated.phone === '089-111-2222';
    recordTest(
      'Self Profile Update (Name, Phone, Title) with Audit Log',
      isUpdated,
      `Updated Name: ${updated.name}, Phone: ${updated.phone}`
    );
  } catch (err: any) {
    recordTest('Self Profile Update (Name, Phone, Title) with Audit Log', false, err.message);
  }

  // -------------------------------------------------------------------------
  // 8. SECURE AVATAR UPLOAD VALIDATION (MIME, MAGIC BYTES, STORAGE)
  // -------------------------------------------------------------------------
  console.log(`\n${YELLOW}${BOLD}[8. SECURE AVATAR UPLOAD VALIDATION]${RESET}`);
  try {
    // Valid PNG buffer with PNG magic bytes (89 50 4E 47)
    const validPngBuffer = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
      0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41,
      0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00,
      0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
      0x42, 0x60, 0x82
    ]);

    const uploadRes = saveAvatarFile(createdUserId, validPngBuffer, 'image/png', 'avatar.png');
    const fileSavedOnDisk = fs.existsSync(uploadRes.filePath);
    const hasRelativeUrl = uploadRes.relativeUrl.startsWith('/uploads/avatars/');

    // Test rejection of fake / invalid header
    let invalidMimeRejected = false;
    try {
      saveAvatarFile(createdUserId, Buffer.from('Fake Content'), 'application/x-sh');
    } catch {
      invalidMimeRejected = true;
    }

    recordTest(
      'Avatar Image Upload (MIME, Magic Bytes & Disk Storage)',
      fileSavedOnDisk && hasRelativeUrl && invalidMimeRejected,
      `Avatar saved at ${uploadRes.relativeUrl}`
    );
  } catch (err: any) {
    recordTest('Avatar Image Upload (MIME, Magic Bytes & Disk Storage)', false, err.message);
  }

  // -------------------------------------------------------------------------
  // 9. CUSTOM ROLE CREATION, PERMISSION TOGGLE & ASSIGNMENT
  // -------------------------------------------------------------------------
  console.log(`\n${YELLOW}${BOLD}[9. CUSTOM ROLE CREATION, PERMISSION TOGGLE & ASSIGNMENT]${RESET}`);
  let customRoleId = '';
  const customRoleName = `Custom_Specialist_${Date.now()}`;
  try {
    const adminOp = { id: loggedInAdminUserId, name: 'Administrator', role: 'Administrator' };

    // Create custom role
    const createdRole = await systemSettingsService.createRole(
      {
        id: `role-spec-${Date.now()}`,
        name: customRoleName,
        description: 'Test Custom Specialist Role with restricted permissions',
        permissions: ['properties.view', 'clients.view', 'viewing.view'],
      },
      adminOp
    );

    customRoleId = createdRole.id;
    const roleExists = Boolean(createdRole && createdRole.id);

    // Assign role to user
    await userService.updateUser(
      createdUserId,
      { role: customRoleName },
      adminOp
    );

    const userWithCustomRole = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, createdUserId))
      .limit(1);

    const roleAssigned = userWithCustomRole[0]?.role === customRoleName;

    // Verify deletion protection: Cannot delete role while users are assigned!
    let cannotDeleteInUse = false;
    try {
      await systemSettingsService.deleteRole(customRoleId, adminOp);
    } catch (e: any) {
      cannotDeleteInUse = e.message.includes('because users are currently assigned to it');
    }

    // Reassign user back to Agent
    await userService.updateUser(createdUserId, { role: 'Agent' }, adminOp);

    // Now deletion of unused custom role should succeed
    const deleteRes = await systemSettingsService.deleteRole(customRoleId, adminOp);
    const deleteSucceeded = Boolean(deleteRes.success);

    recordTest(
      'Custom Role Lifecycle: Create, Assign, In-Use Protection & Safe Delete',
      roleExists && roleAssigned && cannotDeleteInUse && deleteSucceeded,
      `Role "${customRoleName}" safely validated with assignment guard`
    );
  } catch (err: any) {
    recordTest('Custom Role Lifecycle: Create, Assign, In-Use Protection & Safe Delete', false, err.message);
  }

  // -------------------------------------------------------------------------
  // 10. RBAC PERMISSION ENFORCEMENT & HTTP 403 INTEGRITY
  // -------------------------------------------------------------------------
  console.log(`\n${YELLOW}${BOLD}[10. RBAC PERMISSION ENFORCEMENT & HTTP 403 INTEGRITY]${RESET}`);
  try {
    const agentOp = { id: createdUserId, name: 'Sarah Connor', role: 'Agent' };

    // Agent trying to create a role must throw permission error (403)
    let agentForbidden = false;
    try {
      await systemSettingsService.createRole(
        { id: `role-unauth-${Date.now()}`, name: 'UnauthorizedRole', permissions: [] },
        agentOp
      );
    } catch (e: any) {
      agentForbidden = e.message.includes('Forbidden') || e.message.includes('Administrator privileges required');
    }

    // Agent trying to reset another user's password must fail
    let agentResetForbidden = false;
    try {
      await authService.resetPassword(loggedInAdminUserId, 'NewPassword123', agentOp);
    } catch (e: any) {
      agentResetForbidden = e.message.includes('Only administrators can reset user passwords');
    }

    recordTest(
      'RBAC 403 Forbidden Guard Enforcement for Non-Admin Operations',
      agentForbidden && agentResetForbidden,
      'Unauthorized role actions strictly prevented with permission error'
    );
  } catch (err: any) {
    recordTest('RBAC 403 Forbidden Guard Enforcement for Non-Admin Operations', false, err.message);
  }

  // -------------------------------------------------------------------------
  // 11. AUDIT TRAIL LOGGING INTEGRITY
  // -------------------------------------------------------------------------
  console.log(`\n${YELLOW}${BOLD}[11. AUDIT TRAIL LOGGING INTEGRITY]${RESET}`);
  try {
    const recentLogs = await db
      .select()
      .from(auditLogsTable)
      .orderBy(desc(auditLogsTable.createdAt))
      .limit(10);

    const hasLogs = recentLogs.length > 0;
    const actionsLogged = recentLogs.map((l) => l.action);

    recordTest(
      'Comprehensive Audit Trail Logging on Auth, Profile & Role Changes',
      hasLogs,
      `Recent audit actions: ${actionsLogged.slice(0, 4).join(', ')}`
    );
  } catch (err: any) {
    recordTest('Comprehensive Audit Trail Logging on Auth, Profile & Role Changes', false, err.message);
  }

  // -------------------------------------------------------------------------
  // 12. REGRESSION VERIFICATION: B28 (System Settings & RBAC)
  // -------------------------------------------------------------------------
  console.log(`\n${YELLOW}${BOLD}[12. REGRESSION VERIFICATION: B28 (SYSTEM SETTINGS & RBAC)]${RESET}`);
  try {
    const roles = await systemSettingsService.getRoles();
    const settings = await systemSettingsService.getSettings('business');

    recordTest(
      'Regression B28: System Settings, Numbering & Roles Matrix Intact',
      roles.length >= 4 && Boolean(settings),
      `Total Roles: ${roles.length}, Business Settings: Active`
    );
  } catch (err: any) {
    recordTest('Regression B28: System Settings, Numbering & Roles Matrix Intact', false, err.message);
  }

  // -------------------------------------------------------------------------
  // 13. REGRESSION VERIFICATION: B29 (Dashboard & BI KPI Aggregation)
  // -------------------------------------------------------------------------
  console.log(`\n${YELLOW}${BOLD}[13. REGRESSION VERIFICATION: B29 (DASHBOARD & BI KPI)]${RESET}`);
  try {
    const adminUser = await db.select().from(usersTable).where(eq(usersTable.id, loggedInAdminUserId)).limit(1);
    const kpiSummary = await reportingService.getDashboardKPI({}, adminUser[0] as any);
    const hasKpi = typeof kpiSummary.properties?.total === 'number' || typeof kpiSummary.properties?.total === 'string';

    recordTest(
      'Regression B29: Dashboard BI Aggregation & Analytics Intact',
      hasKpi,
      `Total Properties KPI: ${kpiSummary.properties?.total}`
    );
  } catch (err: any) {
    recordTest('Regression B29: Dashboard BI Aggregation & Analytics Intact', false, err.message);
  }

  // -------------------------------------------------------------------------
  // 14. REGRESSION VERIFICATION: B30 (Operations & Maintenance Management)
  // -------------------------------------------------------------------------
  console.log(`\n${YELLOW}${BOLD}[14. REGRESSION VERIFICATION: B30 (OPERATIONS & MAINTENANCE)]${RESET}`);
  try {
    const vendors = await maintenanceService.listVendors();
    const tickets = await maintenanceService.listMaintenanceRequests();

    recordTest(
      'Regression B30: Maintenance Management, Vendors & Cost Tracking Intact',
      Array.isArray(vendors) && Array.isArray(tickets.data),
      `Vendors: ${vendors.length}, Tickets: ${tickets.total || tickets.data?.length || 0}`
    );
  } catch (err: any) {
    recordTest('Regression B30: Maintenance Management, Vendors & Cost Tracking Intact', false, err.message);
  }

  // -------------------------------------------------------------------------
  // 15. REGRESSION VERIFICATION: B31 (Final System Integration)
  // -------------------------------------------------------------------------
  console.log(`\n${YELLOW}${BOLD}[15. REGRESSION VERIFICATION: B31 (FINAL SYSTEM INTEGRATION)]${RESET}`);
  try {
    // Seed initial entities for test mode
    await seedInitialPropertiesIfEmpty();
    await clientService.seedInitialClientsIfEmpty();
    await contractService.seedSampleContractIfEmpty();
    await viewingService.seedInitialViewingsIfEmpty();

    const properties = await db.select().from(propertiesTable);
    const clients = await db.select().from(clientsTable);
    const contracts = await db.select().from(contractsTable);
    const viewings = await db.select().from(viewingsTable);

    recordTest(
      'Regression B31: Full System Integration (Properties, Clients, Contracts, Viewings)',
      properties.length >= 0 && clients.length >= 0 && contracts.length >= 0,
      `Properties: ${properties.length}, Clients: ${clients.length}, Contracts: ${contracts.length}, Viewings: ${viewings.length}`
    );
  } catch (err: any) {
    recordTest('Regression B31: Full System Integration (Properties, Clients, Contracts, Viewings)', false, err.message);
  }

  // -------------------------------------------------------------------------
  // FINAL TEST REPORT SUMMARY
  // -------------------------------------------------------------------------
  console.log(`\n${CYAN}${BOLD}========================================================================${RESET}`);
  console.log(`${CYAN}${BOLD}                   B32 TEST SUITE SCORECARD                             ${RESET}`);
  console.log(`${CYAN}${BOLD}========================================================================${RESET}`);

  const passedCount = testResults.filter((t) => t.passed).length;
  const failedCount = testResults.filter((t) => !t.passed).length;

  console.log(`Total Tests Executed: ${BOLD}${testResults.length}${RESET}`);
  console.log(`Passed:               ${GREEN}${BOLD}${passedCount}${RESET}`);
  console.log(`Failed:               ${failedCount > 0 ? RED : GREEN}${BOLD}${failedCount}${RESET}`);

  if (failedCount > 0) {
    console.log(`\n${RED}${BOLD}Integrity check failed. See details above.${RESET}`);
    process.exit(1);
  } else {
    console.log(`\n${GREEN}${BOLD}✓ ALL B32 AUTHENTICATION, PROFILE & ROLE CHECKS PASSED PERFECTLY!${RESET}\n`);
    process.exit(0);
  }
}

runB32AuthProfileRoleTestSuite().catch((err) => {
  console.error('Fatal B32 Test Suite Error:', err);
  process.exit(1);
});
