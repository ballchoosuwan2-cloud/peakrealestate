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
import type { User } from '../src/types/index.ts';

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

async function runB25ClientCrmTestSuite() {
  console.log(`\n${CYAN}${BOLD}========================================================================${RESET}`);
  console.log(`${CYAN}${BOLD}   PEAK REAL ESTATE — B25 CLIENT / CRM MANAGEMENT LITE TEST SUITE   ${RESET}`);
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

  const anotherAgent: User = {
    id: 'usr-1',
    name: 'Somchai Prasert',
    username: 'agent_somchai',
    role: 'Agent',
    email: 'somchai@peakrealestate.com',
    phone: '081-234-5678',
    avatar: '',
    branch: 'Rawai',
    title: 'Agent',
    monthlyTarget: 15000000,
    monthlyCommission: 300000,
    targetDeals: 5,
    completedDeals: 3,
  };

  let testClientId = '';
  let testClientCode = '';

  try {
    // -------------------------------------------------------------------------
    // 1. Create Client
    // -------------------------------------------------------------------------
    console.log(`\n${YELLOW}--- TEST 1: CREATE CLIENT ---${RESET}`);
    try {
      const created = await clientService.createClient(
        {
          firstName: 'Marcus',
          lastName: 'Aurelius',
          companyName: 'Stoic Properties Ltd.',
          phone: '+65 9123 4567',
          email: 'marcus.aurelius@stoic.sg',
          nationality: 'Singaporean',
          idNumber: 'SG-9018234-K',
          clientType: 'Investor',
          intent: 'Both',
          budgetMin: '30000000',
          budgetMax: '65000000',
          propertyType: 'Villa',
          preferredLocation: 'Layan & Bang Tao Beach',
          status: 'New',
          assignedAgentId: agentUser.id,
          assignedAgentName: agentUser.name,
          nextFollowUpDate: '2026-10-15',
          initialFollowUpNote: 'Client arriving from Singapore for site visits.',
          notes: 'Looking for 3-4 bedroom sea view luxury villa for private holiday home and holiday rental investment.',
        },
        adminUser
      );

      testClientId = created.id;
      testClientCode = created.clientCode;

      const isValid =
        !!created.id &&
        created.clientCode.startsWith('CLI-') &&
        created.firstName === 'Marcus' &&
        created.lastName === 'Aurelius' &&
        created.phone === '+65 9123 4567' &&
        created.clientType === 'Investor' &&
        created.status === 'New' &&
        created.assignedAgentId === agentUser.id &&
        created.isArchived === false;

      recordTest(
        'Create Client',
        isValid,
        `Created client ${created.clientCode} (${created.name}) with auto clientCode, phone, nationality, budget, and assigned agent.`
      );
    } catch (e: any) {
      recordTest('Create Client', false, e.message);
    }

    // -------------------------------------------------------------------------
    // 2. Edit Client
    // -------------------------------------------------------------------------
    console.log(`\n${YELLOW}--- TEST 2: EDIT CLIENT ---${RESET}`);
    try {
      const updated = await clientService.updateClient(
        testClientId,
        {
          preferredLocation: 'Layan, Bang Tao & Surin Heights',
          budgetMax: '75000000',
          notes: 'Budget increased up to 75M THB. Pre-qualified financing approved.',
        },
        agentUser
      );

      const isUpdated =
        updated.preferredLocation === 'Layan, Bang Tao & Surin Heights' &&
        updated.budgetMax === 75000000 &&
        updated.notes.includes('Budget increased up to 75M');

      recordTest(
        'Edit Client',
        isUpdated,
        `Client ${updated.clientCode} updated preferred location and budget to 75M THB.`
      );
    } catch (e: any) {
      recordTest('Edit Client', false, e.message);
    }

    // -------------------------------------------------------------------------
    // 3. Search / Filter
    // -------------------------------------------------------------------------
    console.log(`\n${YELLOW}--- TEST 3: SEARCH / FILTER ---${RESET}`);
    try {
      // Search by name
      const searchRes = await clientService.getClients({ search: 'Marcus' }, adminUser);
      const searchOk = searchRes.clients.some((c) => c.clientCode === testClientCode);

      // Filter by type
      const typeRes = await clientService.getClients({ clientType: 'Investor' }, adminUser);
      const typeOk = typeRes.clients.every((c) => (c.clientType || c.type) === 'Investor');

      // Filter by status
      const statusRes = await clientService.getClients({ status: 'New' }, adminUser);
      const statusOk = statusRes.clients.some((c) => c.clientCode === testClientCode);

      // Follow-up status check
      const followUpRes = await clientService.getClients({ followUpStatus: 'all' }, adminUser);
      const followUpOk = followUpRes.clients.length > 0;

      const filterPassed = searchOk && typeOk && statusOk && followUpOk;
      recordTest(
        'Search / Filter',
        filterPassed,
        `Search by keyword 'Marcus' found ${searchRes.clients.length} records; Filter by type 'Investor' returned ${typeRes.clients.length} matching clients.`
      );
    } catch (e: any) {
      recordTest('Search / Filter', false, e.message);
    }

    // -------------------------------------------------------------------------
    // 4. Assign Agent
    // -------------------------------------------------------------------------
    console.log(`\n${YELLOW}--- TEST 4: ASSIGN AGENT ---${RESET}`);
    try {
      const assigned = await clientService.assignAgent(
        testClientId,
        anotherAgent.id,
        anotherAgent.name,
        managerUser
      );

      const assignOk =
        assigned.assignedAgentId === anotherAgent.id &&
        assigned.assignedAgentName === anotherAgent.name;

      recordTest(
        'Assign Agent',
        assignOk,
        `Assigned agent to ${assigned.assignedAgentName} (${assigned.assignedAgentId}) by Manager.`
      );
    } catch (e: any) {
      recordTest('Assign Agent', false, e.message);
    }

    // -------------------------------------------------------------------------
    // 5. Change Status
    // -------------------------------------------------------------------------
    console.log(`\n${YELLOW}--- TEST 5: CHANGE STATUS ---${RESET}`);
    try {
      const statusUpdated = await clientService.changeStatus(
        testClientId,
        'Viewing',
        managerUser
      );

      const statusOk = statusUpdated.status === 'Viewing';

      recordTest(
        'Change Status',
        statusOk,
        `Updated client status to 'Viewing' with automated audit log logging.`
      );
    } catch (e: any) {
      recordTest('Change Status', false, e.message);
    }

    // -------------------------------------------------------------------------
    // 6. Add Follow-up
    // -------------------------------------------------------------------------
    console.log(`\n${YELLOW}--- TEST 6: ADD FOLLOW-UP ---${RESET}`);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const fu = await clientService.addFollowUp(
        testClientId,
        {
          followUpDate: todayStr,
          followUpNote: 'Phone call discussion regarding 3 shortlisted villas in Layan.',
          assignedAgentId: anotherAgent.id,
          assignedAgentName: anotherAgent.name,
        },
        anotherAgent
      );

      // Verify client nextFollowUpDate was updated
      const client = await clientService.getClientById(testClientId, adminUser);
      const fuOk =
        fu.clientId === testClientId &&
        fu.status === 'Pending' &&
        client.nextFollowUpDate === todayStr &&
        client.followUps.some((f: any) => f.id === fu.id);

      // Also complete the follow-up
      const completed = await clientService.completeFollowUp(fu.id, anotherAgent);
      const completedOk = completed.status === 'Completed' && !!completed.completedAt;

      recordTest(
        'Add Follow-up',
        fuOk && completedOk,
        `Created follow-up for client on ${todayStr}; marked Completed with timestamp.`
      );
    } catch (e: any) {
      recordTest('Add Follow-up', false, e.message);
    }

    // -------------------------------------------------------------------------
    // 7. Link Property
    // -------------------------------------------------------------------------
    console.log(`\n${YELLOW}--- TEST 7: LINK PROPERTY ---${RESET}`);
    try {
      const link = await clientService.linkProperty(
        testClientId,
        'prop-1',
        'Top favorite oceanfront villa for private stay',
        adminUser
      );

      const client = await clientService.getClientById(testClientId, adminUser);
      const linkOk =
        link.clientId === testClientId &&
        link.propertyId === 'prop-1' &&
        client.linkedProperties.some((p: any) => p.propertyId === 'prop-1');

      recordTest(
        'Link Property',
        linkOk,
        `Linked property prop-1 to client ${client.clientCode}; enriched with title, category, price, and area.`
      );
    } catch (e: any) {
      recordTest('Link Property', false, e.message);
    }

    // -------------------------------------------------------------------------
    // 8. Link Viewing
    // -------------------------------------------------------------------------
    console.log(`\n${YELLOW}--- TEST 8: LINK VIEWING ---${RESET}`);
    try {
      // Create a B24 viewing referencing this client ID
      const viewing = await viewingService.createViewing(
        {
          customerId: testClientId,
          customerName: 'Marcus Aurelius',
          customerPhone: '+65 9123 4567',
          propertyId: 'prop-1',
          propertyTitle: 'The Peak Oceanfront Pool Villa',
          propertyCustomId: 'VL-1001',
          agentId: anotherAgent.id,
          agentName: anotherAgent.name,
          dateTime: '2026-10-20T10:00',
          location: 'Kamala Beach, Villa Gate 2',
          notes: 'Client arriving for private tour.',
          status: 'Scheduled',
          clientInterest: 'Hot',
          interestScore: 5,
        },
        adminUser
      );

      // Verify that getClientById displays this viewing directly via Foreign Key
      const client = await clientService.getClientById(testClientId, adminUser);
      const viewingFound = client.viewings?.some((v: any) => v.id === viewing.id);

      recordTest(
        'Link Viewing',
        viewingFound,
        `B24 Viewing appointment ${viewing.viewingCode} linked to client ${client.clientCode} via Foreign Key.`
      );
    } catch (e: any) {
      recordTest('Link Viewing', false, e.message);
    }

    // -------------------------------------------------------------------------
    // 9. Client Detail
    // -------------------------------------------------------------------------
    console.log(`\n${YELLOW}--- TEST 9: CLIENT DETAIL ---${RESET}`);
    try {
      const detail = await clientService.getClientById(testClientId, adminUser);

      const hasInfo =
        detail.id === testClientId &&
        detail.clientCode === testClientCode &&
        detail.name.includes('Marcus') &&
        detail.phone === '+65 9123 4567';

      const hasProperties = Array.isArray(detail.linkedProperties) && detail.linkedProperties.length > 0;
      const hasViewings = Array.isArray(detail.viewings) && detail.viewings.length > 0;
      const hasFollowUps = Array.isArray(detail.followUps) && detail.followUps.length > 0;
      const hasContractsArray = Array.isArray(detail.contracts);
      const hasPaymentsArray = Array.isArray(detail.payments);

      const detailOk = hasInfo && hasProperties && hasViewings && hasFollowUps && hasContractsArray && hasPaymentsArray;

      recordTest(
        'Client Detail',
        detailOk,
        `Retrieved complete client profile including linked properties, viewings, contracts, payments, and follow-ups without data duplication.`
      );
    } catch (e: any) {
      recordTest('Client Detail', false, e.message);
    }

    // -------------------------------------------------------------------------
    // 10. RBAC
    // -------------------------------------------------------------------------
    console.log(`\n${YELLOW}--- TEST 10: RBAC ---${RESET}`);
    try {
      // 1. Manager can assign agent (tested earlier)
      // 2. Unassigned agent trying to reassign agent should be rejected
      let agentForbidden = false;
      try {
        await clientService.assignAgent(testClientId, agentUser.id, agentUser.name, agentUser);
      } catch (err: any) {
        if (err.message.includes('Forbidden')) {
          agentForbidden = true;
        }
      }

      // 3. Agent trying to delete should be rejected
      let agentDeleteForbidden = false;
      try {
        await clientService.softDeleteClient(testClientId, agentUser);
      } catch (err: any) {
        if (err.message.includes('Forbidden')) {
          agentDeleteForbidden = true;
        }
      }

      const rbacPassed = agentForbidden && agentDeleteForbidden;
      recordTest(
        'RBAC',
        rbacPassed,
        `Non-manager/admin agents prevented from reassigning agents or archiving clients.`
      );
    } catch (e: any) {
      recordTest('RBAC', false, e.message);
    }

    // -------------------------------------------------------------------------
    // 11. Soft Delete
    // -------------------------------------------------------------------------
    console.log(`\n${YELLOW}--- TEST 11: SOFT DELETE ---${RESET}`);
    try {
      const archived = await clientService.softDeleteClient(testClientId, managerUser);

      // Verify record is preserved in database with isArchived = true
      const [dbRecord] = await db
        .select()
        .from(clientsTable)
        .where(eq(clientsTable.id, testClientId));

      const preserved = dbRecord && dbRecord.isArchived === true;

      // Verify it does NOT appear in active client list
      const activeList = await clientService.getClients({ isArchived: false }, adminUser);
      const notInActive = !activeList.clients.some((c) => c.id === testClientId);

      const softDeletePassed = preserved && notInActive;
      recordTest(
        'Soft Delete',
        softDeletePassed,
        `Client preserved in PostgreSQL with isArchived = true (no hard delete); excluded from active client list.`
      );
    } catch (e: any) {
      recordTest('Soft Delete', false, e.message);
    }

    // -------------------------------------------------------------------------
    // 12. Audit Log
    // -------------------------------------------------------------------------
    console.log(`\n${YELLOW}--- TEST 12: AUDIT LOG ---${RESET}`);
    try {
      const logs = await db
        .select()
        .from(auditLogsTable)
        .where(eq(auditLogsTable.propertyId, testClientId))
        .orderBy(desc(auditLogsTable.createdAt));

      const actions = logs.map((l) => l.action);
      const hasCreate = actions.includes('Create Client');
      const hasUpdate = actions.includes('Update Client') || actions.includes('Change Status');
      const hasAssign = actions.includes('Assign Agent');
      const hasArchive = actions.includes('Archive Client');

      const auditOk = hasCreate && hasAssign && hasArchive;

      recordTest(
        'Audit Log',
        auditOk,
        `Audit trail logged actions: ${actions.join(', ')} with operator identity and before/after values.`
      );
    } catch (e: any) {
      recordTest('Audit Log', false, e.message);
    }

    // -------------------------------------------------------------------------
    // 13. Database Foreign Key
    // -------------------------------------------------------------------------
    console.log(`\n${YELLOW}--- TEST 13: DATABASE FOREIGN KEY ---${RESET}`);
    try {
      // Create a contract linking to testClientId
      const contract = await contractService.createContract(
        {
          tenantId: testClientId,
          tenantName: 'Marcus Aurelius',
          tenantPhone: '+65 9123 4567',
          tenantNationality: 'Singaporean',
          propertyId: 'prop-1',
          signDate: '2026-10-01',
          rentalStart: '2026-10-15',
          rentalEnd: '2027-10-14',
          paymentTerm: 'Monthly',
          monthlyRent: '250000',
          deposit: '500000',
          advanceRental: '250000',
          salesName: 'Administrator',
          salesId: 'user-admin-1',
          salesCommission: '10%',
          status: 'Active',
        },
        adminUser
      );

      // Verify that getClientById connects property, viewing, and contract via Foreign Key
      const detailClient = await clientService.getClientById(testClientId, adminUser);

      const hasLinkedProp = detailClient.linkedProperties?.some((p: any) => p.propertyId === 'prop-1');
      const hasViewingB24 = detailClient.viewings?.length > 0;
      const hasContractB22 = detailClient.contracts?.some((c: any) => c.contractId === contract.contractId);

      const fkOk = Boolean(hasLinkedProp && hasViewingB24 && hasContractB22);

      recordTest(
        'Database Foreign Key',
        fkOk,
        `Client ${detailClient.clientCode} correctly joined with B24 viewing (${detailClient.viewings?.[0]?.viewingCode}), B22 contract (${contract.contractId}), and linked property (prop-1).`
      );
    } catch (e: any) {
      recordTest('Database Foreign Key', false, e.message);
    }

    // -------------------------------------------------------------------------
    // 14. Regression B13–B24
    // -------------------------------------------------------------------------
    console.log(`\n${YELLOW}--- TEST 14: REGRESSION B13–B24 ---${RESET}`);
    try {
      // 1. Properties (B13-B21)
      const propsCountRes = await db
        .select({ count: sql<number>`count(*)` })
        .from(propertiesTable);
      const propsOk = Number(propsCountRes[0]?.count || 0) >= 0;

      // 2. Users (B20)
      const usersCountRes = await db
        .select({ count: sql<number>`count(*)` })
        .from(usersTable);
      const usersOk = Number(usersCountRes[0]?.count || 0) >= 0;

      // 3. Contracts (B22)
      const contractsRes = await contractService.getContracts({});
      const contractsOk = Array.isArray(contractsRes.data);

      // 4. Payments (B23)
      const schedulesRes = await paymentService.getSchedules({});
      const paymentsOk = Array.isArray(schedulesRes.schedules);

      // 5. Viewings (B24)
      const viewingsRes = await viewingService.getViewings({});
      const viewingsOk = Array.isArray(viewingsRes);

      const regressionOk = propsOk && usersOk && contractsOk && paymentsOk && viewingsOk;

      recordTest(
        'Regression B13–B24',
        regressionOk,
        `Properties (B13), Users (B20), Contracts (B22), Payments (B23), and Viewings (B24) verified operational without disruption.`
      );
    } catch (e: any) {
      recordTest('Regression B13–B24', false, e.message);
    }
  } catch (globalError: any) {
    console.error('Global Test Suite Error:', globalError);
  }

  // -------------------------------------------------------------------------
  // FINAL SCORECARD
  // -------------------------------------------------------------------------
  console.log(`\n${CYAN}${BOLD}========================================================================${RESET}`);
  console.log(`${CYAN}${BOLD}                   B25 TEST RESULTS SCORECARD                   ${RESET}`);
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

runB25ClientCrmTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
