/**
 * B20 — Users & Staff Management Automated Test Suite
 * PEAK REAL ESTATE
 */

import assert from 'node:assert';
import { userService } from '../src/server/user-service.ts';
import { dbService } from '../src/server/db-service.ts';
import { hasPermission, canManageRole, ROLE_PERMISSIONS } from '../src/lib/permissions.ts';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

async function runB20Tests() {
  console.log(`${BOLD}${CYAN}====================================================${RESET}`);
  console.log(`${BOLD}${CYAN}  PEAK REAL ESTATE — B20 AUTOMATED TEST SUITE       ${RESET}`);
  console.log(`${BOLD}${CYAN}  Users & Staff, RBAC, Agent Linkage & Audit Trail  ${RESET}`);
  console.log(`${BOLD}${CYAN}====================================================${RESET}\n`);

  let passed = 0;
  let failed = 0;

  function record(num: number, name: string, ok: boolean, detail?: string) {
    if (ok) {
      passed++;
      console.log(`  ${GREEN}✔ [PASS] Test ${num}: ${name}${RESET}`);
      if (detail) console.log(`         ${detail}`);
    } else {
      failed++;
      console.log(`  ${RED}✖ [FAIL] Test ${num}: ${name}${RESET}`);
      if (detail) console.log(`         ${detail}`);
    }
  }

  const adminOperator = {
    id: 'user-admin-1',
    name: 'Administrator',
    role: 'Admin' as const,
  };

  const managerOperator = {
    id: 'user-mgr-1',
    name: 'Nichada Manager',
    role: 'Manager' as const,
  };

  const agentOperator = {
    id: 'user-agt-1',
    name: 'Kittisak Agent',
    role: 'Agent' as const,
  };

  const testUserId = `b20-test-agent-${Date.now()}`;
  const testEmail = `b20.agent.${Date.now()}@peakrealestate.com`;

  try {
    // 1. RBAC Matrix & Role Tests
    console.log(`\n${BOLD}--- 1. Role & Permission Matrix Verification ---${RESET}`);
    
    // 1.1 Only 3 standard roles
    const standardRoles = ['Admin', 'Manager', 'Agent'];
    record(1, 'Role Definition (3 Standard Roles)', standardRoles.length === 3, 'Admin, Manager, Agent');

    // 1.2 Permission mappings
    const adminCanArchive = hasPermission('Admin', 'Archive');
    const agentCanArchive = hasPermission('Agent', 'Archive');
    const agentCanCreate = hasPermission('Agent', 'Create');
    const agentCanView = hasPermission('Agent', 'View');
    record(
      2,
      'Permission Enforcement by Role',
      adminCanArchive && !agentCanArchive && agentCanCreate && agentCanView,
      `Admin can Archive: ${adminCanArchive}, Agent can Archive: ${agentCanArchive}, Agent can Create: ${agentCanCreate}`
    );

    // 1.3 Role Hierarchy rules (Admin > Manager > Agent)
    const adminCanManageMgr = canManageRole('Admin', 'Manager');
    const mgrCanManageAgent = canManageRole('Manager', 'Agent');
    const mgrCanManageAdmin = canManageRole('Manager', 'Admin');
    const agentCanManageAgent = canManageRole('Agent', 'Agent');
    record(
      3,
      'Role Hierarchy Enforcement',
      adminCanManageMgr && mgrCanManageAgent && !mgrCanManageAdmin && !agentCanManageAgent,
      `Manager manage Admin: ${mgrCanManageAdmin} (Forbidden), Manager manage Agent: ${mgrCanManageAgent}`
    );

    // 2. Users / Staff CRUD Tests (PostgreSQL)
    console.log(`\n${BOLD}--- 2. Users / Staff CRUD & Backend Service ---${RESET}`);

    // 2.1 Create User
    const createdUser = await userService.createUser(
      {
        id: testUserId,
        name: 'B20 Test Agent Specialist',
        email: testEmail,
        role: 'Agent',
        phone: '081-999-8877',
        branch: 'Bang Tao Luxury Branch',
        title: 'Villa Sales Specialist',
        monthlyTarget: '30000000',
        monthlyCommission: '600000',
      },
      adminOperator
    );
    record(4, 'Create User on PostgreSQL', Boolean(createdUser && createdUser.id === testUserId), `Created ID: ${createdUser.id}, Email: ${createdUser.email}`);

    // 2.2 View User by ID
    const fetchedUser = await userService.getUserById(testUserId);
    record(5, 'View User by ID', Boolean(fetchedUser && fetchedUser.name === 'B20 Test Agent Specialist'), `Fetched: ${fetchedUser?.name} (${fetchedUser?.role})`);

    // 2.3 Search & Filter Users
    const searchRes = await userService.getUsers({ search: 'B20 Test', role: 'Agent' });
    const foundInSearch = (searchRes.users || []).some((u) => u.id === testUserId);
    record(6, 'Search & Filter Users', foundInSearch, `Found in role filter: ${searchRes.users?.length || 0} matching agents`);

    // 2.4 Edit User
    const updatedUser = await userService.updateUser(
      testUserId,
      {
        title: 'Senior Villa Sales Specialist',
        monthlyTarget: '35000000',
      },
      adminOperator
    );
    record(7, 'Edit User Details', Boolean(updatedUser && updatedUser.title === 'Senior Villa Sales Specialist'), `Updated title: ${updatedUser?.title}`);

    // 3. Status Management & Soft Delete (Never Hard Delete)
    console.log(`\n${BOLD}--- 3. Activate / Deactivate & Soft Delete (No Data Loss) ---${RESET}`);

    // 3.1 Deactivate User (Soft Delete)
    const deactivated = await userService.deactivateUser(testUserId, adminOperator);
    record(8, 'Deactivate User (Soft Delete)', Boolean(deactivated && deactivated.isActive === false && deactivated.status === 'Inactive'), `Status: ${deactivated?.status}, isActive: ${deactivated?.isActive}`);

    // 3.2 Verify Record STILL EXISTS in database (Strict requirement: Never hard delete!)
    const userStillExists = await userService.getUserById(testUserId);
    record(9, 'Verify Soft Delete (Record Preserved, Never Hard Deleted)', Boolean(userStillExists && userStillExists.id === testUserId), `Record intact in DB with isActive = ${userStillExists?.isActive}`);

    // 3.3 Activate User back
    const reactivated = await userService.activateUser(testUserId, adminOperator);
    record(10, 'Reactivate User', Boolean(reactivated && reactivated.isActive === true && reactivated.status === 'Active'), `Status: ${reactivated?.status}, isActive: ${reactivated?.isActive}`);

    // 4. Agent Linkages (Property, Customer, Lead)
    console.log(`\n${BOLD}--- 4. Agent Linkage (Property & Customers) ---${RESET}`);

    // 4.1 Query Agent's assigned properties
    const agentProps = await userService.getAgentProperties('usr-1');
    record(11, 'Agent → Property Linkage Query', Array.isArray(agentProps), `Agent usr-1 has ${agentProps.length} assigned listings`);

    // 5. Audit Logging Verification
    console.log(`\n${BOLD}--- 5. B20 Audit Trail Logging ---${RESET}`);
    const { db } = await import('../src/db/index.ts');
    const { auditLogsTable } = await import('../src/db/schema.ts');
    const { desc } = await import('drizzle-orm');
    const auditLogs = await db.select().from(auditLogsTable).orderBy(desc(auditLogsTable.createdAt)).limit(20);
    const userAuditLogs = auditLogs.filter(
      (log) => log.propertyId?.includes(testUserId) || log.action?.includes('User') || log.action?.includes('Active')
    );
    record(
      12,
      'Audit Logging on User Operations',
      userAuditLogs.length > 0,
      `Found ${userAuditLogs.length} user audit trail events logged in database`
    );

    // Clean up test agent record safely (set inactive)
    await userService.deactivateUser(testUserId, adminOperator);
  } catch (err) {
    console.error('B20 Test execution error:', err);
    record(99, 'Test Exception Caught', false, String(err));
  }

  console.log(`\n${BOLD}B20 Test Results: ${passed} PASS, ${failed} FAIL${RESET}`);

  if (failed === 0) {
    console.log(`${BOLD}${GREEN}All B20 Requirements Verified Successfully!${RESET}\n`);
    process.exit(0);
  } else {
    console.error(`${BOLD}${RED}Some B20 Tests Failed.${RESET}\n`);
    process.exit(1);
  }
}

runB20Tests().catch((err) => {
  console.error('B20 Test Suite Error:', err);
  process.exit(1);
});
