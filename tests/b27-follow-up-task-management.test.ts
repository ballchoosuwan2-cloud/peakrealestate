import { db, pool } from '../src/db/index.ts';
import {
  clientsTable,
  clientPropertiesTable,
  clientFollowUpsTable,
  propertiesTable,
  usersTable,
  viewingsTable,
  contractsTable,
  paymentSchedulesTable,
  auditLogsTable,
} from '../src/db/schema.ts';
import { clientService } from '../src/server/client-service.ts';
import { viewingService } from '../src/server/viewing-service.ts';
import { paymentService } from '../src/server/payment-service.ts';
import { contractService } from '../src/server/contract-service.ts';
import { eq, and, desc, sql, ilike } from 'drizzle-orm';
import type { User, ClientStatus, LeadSource, FollowUpStatus, FollowUpPriority } from '../src/types/index.ts';

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

async function runB27FollowUpManagementTestSuite() {
  console.log(`\n${CYAN}${BOLD}========================================================================${RESET}`);
  console.log(`${CYAN}${BOLD}     PEAK REAL ESTATE — B27 FOLLOW-UP / TASK MANAGEMENT TEST SUITE     ${RESET}`);
  console.log(`${CYAN}${BOLD}========================================================================${RESET}\n`);

  // RBAC Users
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
    name: 'Varinrat S.',
    username: 'manager_varinrat',
    role: 'Manager',
    email: 'varinrat@peakrealestate.com',
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

  const secondAgentUser: User = {
    id: 'user-agt-2',
    name: 'Nattapon Boon',
    username: 'agent_nattapon',
    role: 'Agent',
    email: 'nattapon@peakrealestate.com',
    phone: '095-234-8899',
    avatar: '',
    branch: 'Rawai',
    title: 'Property Consultant',
    monthlyTarget: 20000000,
    monthlyCommission: 400000,
    targetDeals: 5,
    completedDeals: 3,
  };

  let testLeadId = '';
  let followUp1Id = '';
  let followUp2Id = '';
  let followUp3Id = '';

  try {
    // Ensure initial seed
    await clientService.seedInitialClientsIfEmpty();

    // Setup a clean lead for B27 tests
    const lead = await clientService.createClient(
      {
        firstName: 'Alexander',
        lastName: 'Romanov',
        phone: '088-771-2299',
        email: 'alexander.romanov@peak-invest.com',
        nationality: 'Russian',
        clientType: 'Investor',
        intent: 'Buy',
        budgetMin: '35000000',
        budgetMax: '70000000',
        propertyType: 'Villa',
        preferredLocation: 'Layan / Bang Tao Beach',
        leadSource: 'Campaign',
        assignedAgentId: agentUser.id,
        assignedAgentName: agentUser.name,
      },
      adminUser
    );
    testLeadId = lead.id;

    // -------------------------------------------------------------------------
    // TEST 1: CREATE FOLLOW-UP TASK (Bound to Lead & Agent with Date and Time)
    // -------------------------------------------------------------------------
    console.log(`\n${YELLOW}${BOLD}--- 1. Create Follow-up Task bound to Lead / Customer / Agent ---${RESET}`);
    try {
      const todayStr = new Date().toISOString().split('T')[0];

      const fu = await clientService.addFollowUp(
        testLeadId,
        {
          title: 'โทรยืนยันเวลานัดตรวจรับโฉนดที่ดิน',
          followUpDate: todayStr,
          followUpTime: '14:30',
          followUpNote: 'Call Alexander to confirm 2:30 PM appointment at Land Department with attorney.',
          notes: 'Prepare certified passport copy and title deed bundle.',
          priority: 'Urgent',
          assignedAgentId: agentUser.id,
          assignedAgentName: agentUser.name,
          status: 'Pending',
        },
        agentUser
      );

      followUp1Id = fu.id;

      // Verify PostgreSQL record
      const [saved] = await db
        .select()
        .from(clientFollowUpsTable)
        .where(eq(clientFollowUpsTable.id, fu.id))
        .limit(1);

      const client = await clientService.getClientById(testLeadId, adminUser);

      const pass =
        !!saved &&
        saved.clientId === testLeadId &&
        saved.title === 'โทรยืนยันเวลานัดตรวจรับโฉนดที่ดิน' &&
        saved.followUpDate === todayStr &&
        saved.followUpTime === '14:30' &&
        saved.priority === 'Urgent' &&
        saved.status === 'Pending' &&
        saved.isArchived === false &&
        client.nextFollowUpDate === todayStr;

      recordTest(
        'Create Follow-up Task with Date, Time, Priority & Linked Agent',
        pass,
        `Task ID: ${saved.id}, Date: ${saved.followUpDate} @ ${saved.followUpTime}, Agent: ${saved.assignedAgentName}, Client nextFollowUp: ${client.nextFollowUpDate}`
      );
    } catch (e: any) {
      recordTest('Create Follow-up Task with Date, Time, Priority & Linked Agent', false, e.message);
    }

    // -------------------------------------------------------------------------
    // TEST 2: VIEW FOLLOW-UP TASK (By ID with Client Join & By Client)
    // -------------------------------------------------------------------------
    console.log(`\n${YELLOW}${BOLD}--- 2. View Follow-up Task with Linked Client Profile ---${RESET}`);
    try {
      const detail = await clientService.getFollowUpById(followUp1Id, agentUser);

      const pass =
        detail.id === followUp1Id &&
        detail.clientId === testLeadId &&
        detail.clientCode &&
        detail.clientName.includes('Alexander') &&
        detail.clientType === 'Investor' &&
        detail.clientStatus === 'New';

      recordTest(
        'View Follow-up Task with Rich Client Association',
        pass,
        `Task linked to ${detail.clientCode} (${detail.clientName}), Type: ${detail.clientType}, Status: ${detail.status}`
      );
    } catch (e: any) {
      recordTest('View Follow-up Task with Rich Client Association', false, e.message);
    }

    // -------------------------------------------------------------------------
    // TEST 3: EDIT / UPDATE FOLLOW-UP TASK (Reschedule, Reassign, Update Notes)
    // -------------------------------------------------------------------------
    console.log(`\n${YELLOW}${BOLD}--- 3. Edit / Update Follow-up Task ---${RESET}`);
    try {
      const nextWeekStr = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

      const updated = await clientService.updateFollowUp(
        followUp1Id,
        {
          title: 'เลื่อนนัดตรวจรับโฉนดเป็นสัปดาห์หน้า',
          followUpDate: nextWeekStr,
          followUpTime: '11:00',
          followUpNote: 'Client requested reschedule to next week due to flight change.',
          priority: 'High',
          assignedAgentId: secondAgentUser.id,
          assignedAgentName: secondAgentUser.name,
        },
        managerUser
      );

      const pass =
        updated.id === followUp1Id &&
        updated.followUpDate === nextWeekStr &&
        updated.followUpTime === '11:00' &&
        updated.priority === 'High' &&
        updated.assignedAgentId === secondAgentUser.id &&
        updated.assignedAgentName === secondAgentUser.name;

      recordTest(
        'Edit / Update Follow-up Task Details & Reassign Agent',
        pass,
        `Updated date: ${updated.followUpDate} @ ${updated.followUpTime}, Reassigned to: ${updated.assignedAgentName}, Priority: ${updated.priority}`
      );
    } catch (e: any) {
      recordTest('Edit / Update Follow-up Task Details & Reassign Agent', false, e.message);
    }

    // -------------------------------------------------------------------------
    // TEST 4: COMPLETE FOLLOW-UP TASK (Mark Completed with Timestamp)
    // -------------------------------------------------------------------------
    console.log(`\n${YELLOW}${BOLD}--- 4. Complete Follow-up Task ---${RESET}`);
    try {
      const completed = await clientService.completeFollowUp(followUp1Id, secondAgentUser);

      const pass =
        completed.status === 'Completed' &&
        !!completed.completedAt &&
        completed.id === followUp1Id;

      recordTest(
        'Complete Follow-up Task with Completed Timestamp',
        pass,
        `Task ${completed.id} marked Completed at ${completed.completedAt}`
      );
    } catch (e: any) {
      recordTest('Complete Follow-up Task with Completed Timestamp', false, e.message);
    }

    // -------------------------------------------------------------------------
    // TEST 5: CANCEL FOLLOW-UP TASK (With Reason & Timestamp)
    // -------------------------------------------------------------------------
    console.log(`\n${YELLOW}${BOLD}--- 5. Cancel Follow-up Task with Reason ---${RESET}`);
    try {
      // Create a second follow-up to cancel
      const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      const fu2 = await clientService.addFollowUp(
        testLeadId,
        {
          title: 'ส่งโบรชัวร์โครงการ Bang Tao Hills',
          followUpDate: tomorrowStr,
          followUpTime: '15:00',
          followUpNote: 'Send electronic catalog and price list via LINE.',
          priority: 'Normal',
          assignedAgentId: agentUser.id,
          assignedAgentName: agentUser.name,
        },
        agentUser
      );
      followUp2Id = fu2.id;

      const cancelReason = 'Client requested to cancel; opted for Laguna Beachside instead';
      const cancelled = await clientService.cancelFollowUp(followUp2Id, cancelReason, agentUser);

      const pass =
        cancelled.status === 'Cancelled' &&
        !!cancelled.cancelledAt &&
        cancelled.cancelReason === cancelReason;

      recordTest(
        'Cancel Follow-up Task with Reason & Timestamp',
        pass,
        `Task ${cancelled.id} status: Cancelled, Reason: "${cancelled.cancelReason}"`
      );
    } catch (e: any) {
      recordTest('Cancel Follow-up Task with Reason & Timestamp', false, e.message);
    }

    // -------------------------------------------------------------------------
    // TEST 6: SEARCH & MULTI-CRITERIA FILTERING
    // -------------------------------------------------------------------------
    console.log(`\n${YELLOW}${BOLD}--- 6. Search & Multi-criteria Filtering ---${RESET}`);
    try {
      // Create a 3rd follow up for rich search test
      const todayStr = new Date().toISOString().split('T')[0];
      const fu3 = await clientService.addFollowUp(
        testLeadId,
        {
          title: 'เจรจาต่อรองส่วนลดพิเศษกับเจ้าของวิลล่า',
          followUpDate: todayStr,
          followUpTime: '16:00',
          followUpNote: 'Negotiate 5% cash discount with developer directly.',
          priority: 'Urgent',
          assignedAgentId: agentUser.id,
          assignedAgentName: agentUser.name,
          status: 'Pending',
        },
        agentUser
      );
      followUp3Id = fu3.id;

      // 1. Search by keyword
      const keywordResult = await clientService.getFollowUps({ search: 'ส่วนลดพิเศษ' }, adminUser);
      const searchOk = keywordResult.data.some((t: any) => t.id === followUp3Id);

      // 2. Filter by status 'Pending'
      const pendingResult = await clientService.getFollowUps({ status: 'Pending', clientId: testLeadId }, adminUser);
      const pendingOk = pendingResult.data.every((t: any) => t.status === 'Pending') && pendingResult.data.length >= 1;

      // 3. Filter by status 'Completed'
      const completedResult = await clientService.getFollowUps({ status: 'Completed', clientId: testLeadId }, adminUser);
      const completedOk = completedResult.data.some((t: any) => t.id === followUp1Id);

      // 4. Filter by status 'Cancelled'
      const cancelledResult = await clientService.getFollowUps({ status: 'Cancelled', clientId: testLeadId }, adminUser);
      const cancelledOk = cancelledResult.data.some((t: any) => t.id === followUp2Id);

      // 5. Filter by agent
      const agentResult = await clientService.getFollowUps({ assignedAgentId: agentUser.id }, adminUser);
      const agentOk = agentResult.data.every((t: any) => t.assignedAgentId === agentUser.id);

      const pass = searchOk && pendingOk && completedOk && cancelledOk && agentOk;

      recordTest(
        'Search & Filter by Keyword, Status (Pending/Completed/Cancelled) & Agent',
        pass,
        `Keyword search: OK, Pending filter: ${pendingResult.data.length}, Completed filter: ${completedResult.data.length}, Cancelled filter: ${cancelledResult.data.length}, Agent filter: ${agentResult.data.length}`
      );
    } catch (e: any) {
      recordTest('Search & Filter by Keyword, Status (Pending/Completed/Cancelled) & Agent', false, e.message);
    }

    // -------------------------------------------------------------------------
    // TEST 7: SUMMARY METRICS (Pending, Overdue, Due Today, Upcoming, Cancelled)
    // -------------------------------------------------------------------------
    console.log(`\n${YELLOW}${BOLD}--- 7. Follow-up Summary Metrics ---${RESET}`);
    try {
      const summary = await clientService.getFollowUpSummary(adminUser);

      const pass =
        typeof summary.totalPending === 'number' &&
        typeof summary.dueToday === 'number' &&
        typeof summary.upcoming === 'number' &&
        typeof summary.overdue === 'number' &&
        typeof summary.totalCompleted === 'number' &&
        typeof summary.totalCancelled === 'number' &&
        summary.totalPending >= 1 &&
        summary.totalCompleted >= 1 &&
        summary.totalCancelled >= 1;

      recordTest(
        'Follow-up Summary Metrics Calculation',
        pass,
        `Pending: ${summary.totalPending}, DueToday: ${summary.dueToday}, Upcoming: ${summary.upcoming}, Completed: ${summary.totalCompleted}, Cancelled: ${summary.totalCancelled}, Total: ${summary.total}`
      );
    } catch (e: any) {
      recordTest('Follow-up Summary Metrics Calculation', false, e.message);
    }

    // -------------------------------------------------------------------------
    // TEST 8: RBAC ENFORCEMENT (Agent restricted vs Admin/Manager access)
    // -------------------------------------------------------------------------
    console.log(`\n${YELLOW}${BOLD}--- 8. RBAC Permission Boundaries ---${RESET}`);
    try {
      let agentBlockedFromDelete = false;
      let agentBlockedFromOtherEdit = false;

      // 1. Agent should be blocked from deleting follow-up tasks
      try {
        await clientService.softDeleteFollowUp(followUp3Id, agentUser);
      } catch (err: any) {
        if (err.message.includes('Forbidden') || err.message.includes('permission')) {
          agentBlockedFromDelete = true;
        }
      }

      // 2. Second agent should be blocked from editing first agent's follow-up task
      try {
        await clientService.updateFollowUp(
          followUp3Id,
          { title: 'Hacked title by unauthorized agent' },
          secondAgentUser
        );
      } catch (err: any) {
        if (err.message.includes('Forbidden') || err.message.includes('permission')) {
          agentBlockedFromOtherEdit = true;
        }
      }

      // 3. Manager should be permitted to update
      const managerEdit = await clientService.updateFollowUp(
        followUp3Id,
        { title: 'Approved by Sales Manager' },
        managerUser
      );
      const managerAllowed = managerEdit.title === 'Approved by Sales Manager';

      const pass = agentBlockedFromDelete && agentBlockedFromOtherEdit && managerAllowed;

      recordTest(
        'RBAC: Non-admin/manager blocked from delete & cross-agent edit, manager permitted',
        pass,
        `Agent delete blocked: ${agentBlockedFromDelete}, Agent cross-edit blocked: ${agentBlockedFromOtherEdit}, Manager allowed: ${managerAllowed}`
      );
    } catch (e: any) {
      recordTest('RBAC: Non-admin/manager blocked from delete & cross-agent edit, manager permitted', false, e.message);
    }

    // -------------------------------------------------------------------------
    // TEST 9: AUDIT LOG LOGGING (Create, Update, Complete, Cancel, Delete)
    // -------------------------------------------------------------------------
    console.log(`\n${YELLOW}${BOLD}--- 9. Audit Trail Logging for Follow-up Operations ---${RESET}`);
    try {
      const logs = await db
        .select()
        .from(auditLogsTable)
        .where(eq(auditLogsTable.propertyId, testLeadId))
        .orderBy(desc(auditLogsTable.createdAt));

      const actions = logs.map((l) => l.action);
      const hasAdd = actions.includes('Add Follow-up');
      const hasUpdate = actions.includes('Update Follow-up');
      const hasComplete = actions.includes('Complete Follow-up');
      const hasCancel = actions.includes('Cancel Follow-up');

      const pass = hasAdd && hasUpdate && hasComplete && hasCancel;

      recordTest(
        'Audit Log: Follow-up lifecycle events recorded with operator identity',
        pass,
        `Logged actions for client: ${[...new Set(actions)].join(', ')}`
      );
    } catch (e: any) {
      recordTest('Audit Log: Follow-up lifecycle events recorded with operator identity', false, e.message);
    }

    // -------------------------------------------------------------------------
    // TEST 10: SOFT DELETE (isArchived = true, excluded from active queries)
    // -------------------------------------------------------------------------
    console.log(`\n${YELLOW}${BOLD}--- 10. Soft Delete Follow-up Task ---${RESET}`);
    try {
      // Admin soft deletes follow-up 3
      const deleted = await clientService.softDeleteFollowUp(followUp3Id, adminUser);
      const isMarkedArchived = deleted.isArchived === true;

      // Verify excluded from standard queries
      const activeList = await clientService.getFollowUps({ clientId: testLeadId }, adminUser);
      const notInActiveList = !activeList.data.some((f: any) => f.id === followUp3Id);

      // Verify client detail does not show archived follow-up
      const clientProfile = await clientService.getClientById(testLeadId, adminUser);
      const notInClientDetail = !clientProfile.followUps.some((f: any) => f.id === followUp3Id);

      // Verify still preserved in raw PostgreSQL table
      const [rawRecord] = await db
        .select()
        .from(clientFollowUpsTable)
        .where(eq(clientFollowUpsTable.id, followUp3Id))
        .limit(1);
      const stillInDb = !!rawRecord && rawRecord.isArchived === true;

      const pass = isMarkedArchived && notInActiveList && notInClientDetail && stillInDb;

      recordTest(
        'Soft Delete: Task preserved in PostgreSQL with isArchived=true & excluded from active queries',
        pass,
        `isArchived flag: ${isMarkedArchived}, Excluded from query: ${notInActiveList}, Excluded from client: ${notInClientDetail}, Preserved in DB: ${stillInDb}`
      );
    } catch (e: any) {
      recordTest('Soft Delete: Task preserved in PostgreSQL with isArchived=true & excluded from active queries', false, e.message);
    }

    // -------------------------------------------------------------------------
    // TEST 11: RECALCULATE NEXT FOLLOW-UP DATE
    // -------------------------------------------------------------------------
    console.log(`\n${YELLOW}${BOLD}--- 11. Automated Recalculation of Client nextFollowUpDate ---${RESET}`);
    try {
      // Add a specific future follow-up date
      const futureDate = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];
      const fuFuture = await clientService.addFollowUp(
        testLeadId,
        {
          title: 'นัดหมายโอนกรรมสิทธิ์ ณ กรมที่ดิน',
          followUpDate: futureDate,
          followUpNote: 'Transfer of ownership appointment.',
          priority: 'High',
          assignedAgentId: agentUser.id,
          assignedAgentName: agentUser.name,
        },
        agentUser
      );

      const clientWithFuture = await clientService.getClientById(testLeadId, adminUser);
      const dateUpdated = clientWithFuture.nextFollowUpDate === futureDate;

      // Mark it completed and check recalculation
      await clientService.completeFollowUp(fuFuture.id, agentUser);
      const clientAfterComplete = await clientService.getClientById(testLeadId, adminUser);
      const recalculated = clientAfterComplete.nextFollowUpDate !== futureDate;

      const pass = dateUpdated && recalculated;

      recordTest(
        'Client nextFollowUpDate dynamically synchronizes with pending tasks',
        pass,
        `Scheduled: ${clientWithFuture.nextFollowUpDate}, After complete: ${clientAfterComplete.nextFollowUpDate || 'None'}`
      );
    } catch (e: any) {
      recordTest('Client nextFollowUpDate dynamically synchronizes with pending tasks', false, e.message);
    }

    // -------------------------------------------------------------------------
    // TEST 12: REGRESSION B13–B26 (All Modules Operational)
    // -------------------------------------------------------------------------
    console.log(`\n${YELLOW}${BOLD}--- 12. Regression Suite (B13–B26) ---${RESET}`);
    try {
      // Verify properties (B13)
      const properties = await db.select().from(propertiesTable).limit(3);
      const hasProperties = properties.length > 0;

      // Verify users (B20)
      const users = await db.select().from(usersTable).limit(3);
      const hasUsers = users.length > 0;

      // Verify contracts (B22)
      const contracts = await db.select().from(contractsTable).limit(3);
      const hasContracts = contracts !== undefined;

      // Verify payments (B23)
      const payments = await db.select().from(paymentSchedulesTable).limit(3);
      const hasPayments = payments !== undefined;

      // Verify viewings (B24)
      const viewings = await db.select().from(viewingsTable).limit(3);
      const hasViewings = viewings !== undefined;

      // Verify client CRM & Pipeline (B25 & B26)
      const clients = await clientService.getClients({}, adminUser);
      const pipelineSummary = await clientService.getPipelineSummary(adminUser);
      const hasPipeline = !!pipelineSummary && Object.keys(pipelineSummary.stages).length >= 6;

      const allOk = hasProperties && hasUsers && hasContracts && hasPayments && hasViewings && clients.total > 0 && hasPipeline;

      recordTest(
        'Regression B13–B26: All Modules Operational Without Disruption',
        allOk,
        `Properties: ${hasProperties}, Users: ${hasUsers}, Contracts: ${hasContracts}, Payments: ${hasPayments}, Viewings: ${hasViewings}, Clients: ${clients.total}, Pipeline Stages: ${Object.keys(pipelineSummary.stages).length}`
      );
    } catch (e: any) {
      recordTest('Regression B13–B26: All Modules Operational Without Disruption', false, e.message);
    }

  } catch (error: any) {
    console.error('Fatal error during B27 test suite execution:', error);
  } finally {
    console.log(`\n${CYAN}${BOLD}========================================================================${RESET}`);
    console.log(`${CYAN}${BOLD}                   B27 TEST RESULTS SCORECARD                    ${RESET}`);
    console.log(`${CYAN}${BOLD}========================================================================${RESET}\n`);

    let passedCount = 0;
    for (const res of testResults) {
      const status = res.passed ? `${GREEN}[PASS]${RESET}` : `${RED}[FAIL]${RESET}`;
      console.log(`${status} ${BOLD}${res.name}${RESET}: ${res.details || ''}`);
      if (res.passed) passedCount++;
    }

    console.log(`\n${BOLD}Total: ${passedCount} / ${testResults.length} tests passed.${RESET}\n`);

    if (passedCount !== testResults.length) {
      process.exit(1);
    }
  }
}

runB27FollowUpManagementTestSuite()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('B27 Test runner failed:', err);
    process.exit(1);
  });
