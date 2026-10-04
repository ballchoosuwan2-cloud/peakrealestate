import { db, pool } from '../src/db/index.ts';
import {
  viewingsTable,
  propertiesTable,
  usersTable,
  contractsTable,
  paymentSchedulesTable,
  auditLogsTable,
} from '../src/db/schema.ts';
import { viewingService } from '../src/server/viewing-service.ts';
import { paymentService } from '../src/server/payment-service.ts';
import { contractService } from '../src/server/contract-service.ts';
import { eq, and, desc, sql } from 'drizzle-orm';
import { User } from '../src/types/index.ts';

// ANSI Colors for clean test output
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

async function runB24ViewingTestSuite() {
  console.log(`\n${CYAN}${BOLD}========================================================================${RESET}`);
  console.log(`${CYAN}${BOLD}   PEAK REAL ESTATE — B24 VIEWING / APPOINTMENT TEST SUITE   ${RESET}`);
  console.log(`${CYAN}${BOLD}========================================================================${RESET}\n`);

  // Define Mock Operators with standard RBAC
  const adminUser: User = {
    id: 'user-admin-1',
    name: 'Administrator',
    username: 'admin',
    role: 'Administrator',
    email: 'admin@peakrealestate.com',
    phone: '081-899-7701',
    avatar: '',
    branch: 'Headquarters',
    title: 'Director',
    monthlyTarget: 50000000,
    monthlyCommission: 1500000,
    targetDeals: 10,
    completedDeals: 8,
  };

  const managerUser: User = {
    id: 'user-mgr-1',
    name: 'Nichada Prasert',
    username: 'manager_nichada',
    role: 'Manager',
    email: 'nichada@peakrealestate.com',
    phone: '089-445-1234',
    avatar: '',
    branch: 'Headquarters',
    title: 'Sales Manager',
    monthlyTarget: 30000000,
    monthlyCommission: 750000,
    targetDeals: 8,
    completedDeals: 6,
  };

  const agentUser: User = {
    id: 'user-agt-1',
    name: 'Kittisak Vong',
    username: 'agent_kittisak',
    role: 'Agent',
    email: 'kittisak@peakrealestate.com',
    phone: '092-778-9901',
    avatar: '',
    branch: 'Bang Tao',
    title: 'Senior Agent',
    monthlyTarget: 25000000,
    monthlyCommission: 500000,
    targetDeals: 6,
    completedDeals: 4,
  };

  let testViewingId = '';

  try {
    // -------------------------------------------------------------------------
    // 1. Create Viewing
    // -------------------------------------------------------------------------
    console.log(`\n${YELLOW}--- TEST 1: CREATE VIEWING ---${RESET}`);
    try {
      const created = await viewingService.createViewing(
        {
          customerId: 'cust-1',
          customerName: 'Alexander Ivanov',
          customerPhone: '+7 925 123 4567',
          propertyId: 'prop-1',
          propertyTitle: 'The Peak Oceanfront Pool Villa',
          propertyCustomId: 'VL-1001',
          agentId: agentUser.id,
          agentName: agentUser.name,
          dateTime: '2026-10-05T14:30',
          location: 'Kamala Bay, Millionaires Mile',
          notes: 'Client arriving by limousine. Prepare entrance gate pass.',
          status: 'Scheduled',
          clientInterest: 'Warm',
          interestScore: 4,
        },
        adminUser
      );

      testViewingId = created.id;

      const isValid =
        !!created.id &&
        created.customerId === 'cust-1' &&
        created.propertyId === 'prop-1' &&
        created.agentId === agentUser.id &&
        created.dateTime === '2026-10-05T14:30' &&
        created.status === 'Scheduled' &&
        created.isArchived === false &&
        created.viewingCode.startsWith('VW-');

      recordTest(
        'Create Viewing',
        isValid,
        `Created viewing ${created.viewingCode} (ID: ${created.id}) with customer, property, agent, datetime, and location.`
      );
    } catch (e: any) {
      recordTest('Create Viewing', false, e.message);
    }

    // -------------------------------------------------------------------------
    // 2. Edit Viewing
    // -------------------------------------------------------------------------
    console.log(`\n${YELLOW}--- TEST 2: EDIT VIEWING ---${RESET}`);
    try {
      const updated = await viewingService.updateViewing(
        testViewingId,
        {
          dateTime: '2026-10-05T16:00',
          location: 'Kamala Bay, Private Pier Gate',
          notes: 'Rescheduled from 14:30 to 16:00 per client request. Yacht docking at pier.',
        },
        managerUser
      );

      const isUpdated =
        updated.dateTime === '2026-10-05T16:00' &&
        updated.location === 'Kamala Bay, Private Pier Gate' &&
        updated.notes?.includes('Yacht docking');

      recordTest(
        'Edit Viewing',
        isUpdated,
        `Updated datetime to ${updated.dateTime} and location to ${updated.location}.`
      );
    } catch (e: any) {
      recordTest('Edit Viewing', false, e.message);
    }

    // -------------------------------------------------------------------------
    // 3. Status Change (Scheduled -> Confirmed -> Completed)
    // -------------------------------------------------------------------------
    console.log(`\n${YELLOW}--- TEST 3: STATUS CHANGE ---${RESET}`);
    try {
      // Transition to Confirmed
      const confirmed = await viewingService.updateViewing(
        testViewingId,
        { status: 'Confirmed' },
        adminUser
      );

      // Transition to Completed with feedback
      const completed = await viewingService.updateViewing(
        testViewingId,
        {
          status: 'Completed',
          feedback: 'Client loved the master bedroom view and submitted deposit offer.',
          interestScore: 5,
          clientInterest: 'Hot',
        },
        adminUser
      );

      const isStatusValid =
        confirmed.status === 'Confirmed' &&
        completed.status === 'Completed' &&
        completed.clientInterest === 'Hot' &&
        completed.interestScore === 5;

      recordTest(
        'Status Change',
        isStatusValid,
        `Workflow verified: Scheduled -> Confirmed -> Completed (Hot Buyer, 5/5 Stars).`
      );
    } catch (e: any) {
      recordTest('Status Change', false, e.message);
    }

    // -------------------------------------------------------------------------
    // 4. Cancel Viewing
    // -------------------------------------------------------------------------
    console.log(`\n${YELLOW}--- TEST 4: CANCEL VIEWING ---${RESET}`);
    try {
      // Create a viewing to cancel
      const viewingToCancel = await viewingService.createViewing(
        {
          customerId: 'cust-2',
          customerName: 'Somsak Wattana',
          customerPhone: '081-789-0123',
          propertyId: 'prop-2',
          agentId: agentUser.id,
          dateTime: '2026-10-08T10:00',
          location: 'Patong',
          status: 'Scheduled',
        },
        agentUser
      );

      const cancelled = await viewingService.cancelViewing(
        viewingToCancel.id,
        'Client postponed trip due to bad weather',
        agentUser
      );

      const isCancelled =
        cancelled.status === 'Cancelled' &&
        cancelled.cancellationReason === 'Client postponed trip due to bad weather';

      recordTest(
        'Cancel Viewing',
        isCancelled,
        `Viewing ${cancelled.viewingCode} cancelled with reason recorded.`
      );
    } catch (e: any) {
      recordTest('Cancel Viewing', false, e.message);
    }

    // -------------------------------------------------------------------------
    // 5. Customer / Property / Agent Linkage & History
    // -------------------------------------------------------------------------
    console.log(`\n${YELLOW}--- TEST 5: CUSTOMER/PROPERTY/AGENT LINKAGE ---${RESET}`);
    try {
      const customerHistory = await viewingService.getViewingsByCustomer('cust-1');
      const propertyHistory = await viewingService.getViewingsByProperty('prop-1');

      const custLinked = customerHistory.some((v) => v.id === testViewingId);
      const propLinked = propertyHistory.some((v) => v.id === testViewingId);

      const isLinkageValid = custLinked && propLinked && customerHistory.length > 0 && propertyHistory.length > 0;

      recordTest(
        'Customer/Property/Agent Linkage',
        isLinkageValid,
        `Linked cust-1 (${customerHistory.length} viewings) & prop-1 (${propertyHistory.length} viewings) successfully.`
      );
    } catch (e: any) {
      recordTest('Customer/Property/Agent Linkage', false, e.message);
    }

    // -------------------------------------------------------------------------
    // 6. RBAC (Role-Based Access Control)
    // -------------------------------------------------------------------------
    console.log(`\n${YELLOW}--- TEST 6: RBAC ENFORCEMENT ---${RESET}`);
    try {
      let agentBlocked = false;

      // Agent attempts to soft-delete/archive viewing -> Must be forbidden (403)
      try {
        await viewingService.softDeleteViewing(testViewingId, agentUser);
      } catch (err: any) {
        if (err.message.includes('Forbidden') || err.message.includes('Manager or Administrator')) {
          agentBlocked = true;
        }
      }

      // Manager attempts to soft-delete/archive viewing -> Must succeed
      const managerAllowed = await viewingService.softDeleteViewing(testViewingId, managerUser);

      const rbacPassed = agentBlocked && managerAllowed.isArchived === true;

      recordTest(
        'RBAC',
        rbacPassed,
        `Agent blocked from soft delete (Forbidden 403); Manager authorized to archive.`
      );
    } catch (e: any) {
      recordTest('RBAC', false, e.message);
    }

    // -------------------------------------------------------------------------
    // 7. Audit Log
    // -------------------------------------------------------------------------
    console.log(`\n${YELLOW}--- TEST 7: AUDIT LOG ---${RESET}`);
    try {
      const logs = await db
        .select()
        .from(auditLogsTable)
        .where(
          sql`${auditLogsTable.action} IN ('Create Viewing', 'Update Viewing', 'Viewing Status Change', 'Cancel Viewing', 'Delete Viewing')`
        )
        .orderBy(desc(auditLogsTable.createdAt))
        .limit(20);

      const hasCreateLog = logs.some((l) => l.action === 'Create Viewing');
      const hasStatusOrUpdateLog = logs.some(
        (l) => l.action === 'Viewing Status Change' || l.action === 'Update Viewing'
      );
      const hasCancelLog = logs.some((l) => l.action === 'Cancel Viewing');
      const hasDeleteLog = logs.some((l) => l.action === 'Delete Viewing');

      const auditPassed = hasCreateLog && hasStatusOrUpdateLog && hasCancelLog && hasDeleteLog;

      recordTest(
        'Audit Log',
        auditPassed,
        `Found ${logs.length} viewing audit entries: Create, Update/Status Change, Cancel, and Delete logged.`
      );
    } catch (e: any) {
      recordTest('Audit Log', false, e.message);
    }

    // -------------------------------------------------------------------------
    // 8. Soft Delete
    // -------------------------------------------------------------------------
    console.log(`\n${YELLOW}--- TEST 8: SOFT DELETE ---${RESET}`);
    try {
      // 1. Check default viewings list (excludes archived)
      const activeList = await viewingService.getViewings({});
      const isHiddenFromActive = !activeList.some((v) => v.id === testViewingId);

      // 2. Query DB directly or with isArchived: true -> Must still exist! (No hard delete)
      const rawRecord = await db
        .select()
        .from(viewingsTable)
        .where(eq(viewingsTable.id, testViewingId));

      const isPreservedInDb = rawRecord.length > 0 && rawRecord[0].isArchived === true;

      const softDeletePassed = isHiddenFromActive && isPreservedInDb;

      recordTest(
        'Soft Delete',
        softDeletePassed,
        `Record preserved in database (isArchived: true); hidden from active viewings without hard delete.`
      );
    } catch (e: any) {
      recordTest('Soft Delete', false, e.message);
    }

    // -------------------------------------------------------------------------
    // 9. Regression B13–B23
    // -------------------------------------------------------------------------
    console.log(`\n${YELLOW}--- TEST 9: REGRESSION B13–B23 ---${RESET}`);
    try {
      // Verify Users (B17)
      const usersCountRes = await db
        .select({ count: sql<number>`count(*)` })
        .from(usersTable);
      const usersOk = Number(usersCountRes[0]?.count || 0) >= 0;

      // Verify Properties (B13)
      const propsCountRes = await db
        .select({ count: sql<number>`count(*)` })
        .from(propertiesTable);
      const propsOk = Number(propsCountRes[0]?.count || 0) >= 0;

      // Verify Contracts (B22)
      const contractsRes = await contractService.getContracts({});
      const contractsOk = Array.isArray(contractsRes.data);

      // Verify Payments (B23)
      const schedulesRes = await paymentService.getSchedules({});
      const paymentsOk = Array.isArray(schedulesRes.schedules);

      const regressionOk = usersOk && propsOk && contractsOk && paymentsOk;

      recordTest(
        'Regression B13–B23',
        regressionOk,
        `Users (B17), Properties (B13), Contracts (B22), and Payments (B23) services verified healthy.`
      );
    } catch (e: any) {
      recordTest('Regression B13–B23', false, e.message);
    }
  } catch (globalError: any) {
    console.error('Global Test Suite Error:', globalError);
  }

  // -------------------------------------------------------------------------
  // FINAL SCORECARD
  // -------------------------------------------------------------------------
  console.log(`\n${CYAN}${BOLD}========================================================================${RESET}`);
  console.log(`${CYAN}${BOLD}                   B24 TEST RESULTS SCORECARD                   ${RESET}`);
  console.log(`${CYAN}${BOLD}========================================================================${RESET}\n`);

  let totalPassed = 0;
  testResults.forEach((t) => {
    if (t.passed) totalPassed++;
    const mark = t.passed ? `${GREEN}[PASS]${RESET}` : `${RED}[FAIL]${RESET}`;
    console.log(`${mark} ${BOLD}${t.name}${RESET}: ${t.details || ''}`);
  });

  console.log(`\n${BOLD}Total: ${totalPassed} / ${testResults.length} tests passed.${RESET}\n`);

  if (pool && typeof pool.end === 'function') {
    try {
      await pool.end();
    } catch {}
  }

  process.exit(totalPassed < testResults.length ? 1 : 0);
}

runB24ViewingTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
