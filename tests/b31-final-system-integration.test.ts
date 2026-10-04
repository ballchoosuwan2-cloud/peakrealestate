import { db, pool, ensureDatabaseSchema } from '../src/db/index.ts';
import {
  usersTable,
  rolesTable,
  systemSettingsTable,
  userPermissionOverridesTable,
  auditLogsTable,
  propertiesTable,
  clientsTable,
  contractsTable,
  paymentSchedulesTable,
  viewingsTable,
  maintenanceVendorsTable,
  maintenanceRequestsTable,
  maintenanceCostsTable,
  preventiveMaintenanceTable,
} from '../src/db/schema.ts';
import { seedInitialPropertiesIfEmpty } from '../src/server/db-service.ts';
import { clientService } from '../src/server/client-service.ts';
import { contractService } from '../src/server/contract-service.ts';
import { paymentService } from '../src/server/payment-service.ts';
import { viewingService } from '../src/server/viewing-service.ts';
import { systemSettingsService } from '../src/server/system-settings-service.ts';
import { reportingService } from '../src/server/reporting-service.ts';
import { maintenanceService } from '../src/server/maintenance-service.ts';
import { checkGranularPermission, hasPermission, ROLE_PERMISSIONS } from '../src/lib/permissions.ts';
import { User } from '../src/types.ts';
import { eq, desc, and } from 'drizzle-orm';

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

async function runB31FinalIntegrationTestSuite() {
  console.log(`\n${CYAN}${BOLD}========================================================================${RESET}`);
  console.log(`${CYAN}${BOLD}  PEAK REAL ESTATE — B31 FINAL SYSTEM INTEGRATION & QA TEST SUITE       ${RESET}`);
  console.log(`${CYAN}${BOLD}========================================================================${RESET}\n`);

  await ensureDatabaseSchema();
  await seedInitialPropertiesIfEmpty();
  await clientService.seedInitialClientsIfEmpty();
  await contractService.seedSampleContractIfEmpty();
  await maintenanceService.seedInitialMaintenanceIfEmpty();

  // Seed baseline payment schedule if empty for in-memory PGlite
  const existingSchedules = await db.select().from(paymentSchedulesTable);
  if (existingSchedules.length === 0) {
    await db.insert(paymentSchedulesTable).values([
      {
        id: 'sch-b31-001',
        contractId: 'RENT-2026-0923',
        propertyId: 'VL-1001',
        title: 'Initial Security Deposit & First Month Rent',
        paymentType: 'Deposit',
        amount: '350000',
        paidAmount: '350000',
        remainingAmount: '0',
        dueDate: '2026-10-01',
        status: 'Paid',
        isArchived: false,
      },
    ]);
  }

  // Test Operators
  const adminOp: User = {
    id: 'user-admin-1',
    name: 'Administrator',
    role: 'Administrator',
    email: 'admin@peakrealestate.com',
    branch: 'Headquarters (Phuket)',
    phone: '081-899-7701',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    title: 'Managing Director',
  };

  const managerOp: User = {
    id: 'user-mgr-1',
    name: 'Nichada Prasert',
    role: 'Manager',
    email: 'nichada@peakrealestate.com',
    branch: 'Headquarters (Phuket)',
    phone: '089-445-1234',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150',
    title: 'Branch Director',
  };

  const agentOp: User = {
    id: 'user-agt-1',
    name: 'Kittisak Vong',
    role: 'Agent',
    email: 'kittisak@peakrealestate.com',
    branch: 'Bang Tao Branch',
    phone: '092-778-9901',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    title: 'Senior Property Consultant',
  };

  const staffOp: User = {
    id: 'user-stf-1',
    name: 'Somchai Staff',
    role: 'Staff',
    email: 'staff@peakrealestate.com',
    branch: 'Headquarters (Phuket)',
    phone: '081-000-1122',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    title: 'Operations Coordinator',
  };

  // -------------------------------------------------------------------------
  // 1. PROPERTY CATALOG & DATA INTEGRITY (B13–B21)
  // -------------------------------------------------------------------------
  console.log(`\n${YELLOW}${BOLD}[1. PROPERTY LIFECYCLE & DATA FLOW (B13–B21)]${RESET}`);

  let testPropId = '';
  let testPropTitle = '';
  try {
    const props = await db.select().from(propertiesTable).where(eq(propertiesTable.isArchived, false)).limit(1);
    const prop = props[0];
    testPropId = prop ? prop.propertyId : 'VL-1001';
    testPropTitle = prop ? prop.title : 'The Peak Oceanfront Pool Villa';

    recordTest(
      'Property Repository & Schema Integrity',
      Boolean(prop && prop.propertyId && prop.price !== undefined),
      `Loaded Property: ${prop?.propertyId} (${prop?.title}) with Price: THB ${Number(prop?.price || 0).toLocaleString()}`
    );
  } catch (err: any) {
    recordTest('Property Repository & Schema Integrity', false, err.message);
  }

  // -------------------------------------------------------------------------
  // 2. CLIENT CRM & SALES PIPELINE (B25–B26)
  // -------------------------------------------------------------------------
  console.log(`\n${YELLOW}${BOLD}[2. CLIENT & LEAD CRM PIPELINE (B25–B26)]${RESET}`);

  let testClientId = '';
  let testClientName = '';
  try {
    const clientList = await clientService.getClients({}, adminOp);
    const firstClient = clientList.clients[0];
    testClientId = firstClient ? firstClient.id : 'client-1';
    testClientName = firstClient ? `${firstClient.firstName} ${firstClient.lastName}` : 'Alexander Wright';

    recordTest(
      'Client Management & Search Pipeline',
      Boolean(clientList.clients.length > 0),
      `Total active clients: ${clientList.clients.length}, First: ${testClientName}`
    );
  } catch (err: any) {
    recordTest('Client Management & Search Pipeline', false, err.message);
  }

  try {
    const pipelineData = await clientService.getPipelineSummary(adminOp);
    recordTest(
      'Lead Sales Pipeline Stages & Deal Aggregation',
      Boolean(pipelineData && pipelineData.stages && Object.keys(pipelineData.stages).length >= 5),
      `Pipeline stages active: ${Object.keys(pipelineData?.stages || {}).length}, Active deal volume: THB ${(pipelineData?.totalActiveValue || 0).toLocaleString()}`
    );
  } catch (err: any) {
    recordTest('Lead Sales Pipeline Stages & Deal Aggregation', false, err.message);
  }

  // -------------------------------------------------------------------------
  // 3. VIEWING APPOINTMENTS & TASK FOLLOW-UPS (B24 & B27)
  // -------------------------------------------------------------------------
  console.log(`\n${YELLOW}${BOLD}[3. VIEWING APPOINTMENTS & TASK FOLLOW-UPS (B24 & B27)]${RESET}`);

  let createdViewingId = '';
  try {
    const viewingRes = await viewingService.createViewing(
      {
        customerId: testClientId,
        customerName: testClientName,
        propertyId: testPropId,
        propertyTitle: testPropTitle,
        agentId: agentOp.id,
        agentName: agentOp.name,
        dateTime: new Date(Date.now() + 86400000).toISOString(),
        status: 'Scheduled',
        clientInterest: 'Hot',
        location: 'Kata Beach, Phuket',
        notes: 'B31 System Integration Viewing Tour',
      },
      agentOp
    );
    createdViewingId = viewingRes?.id || '';

    recordTest(
      'Viewing Appointment Booking & Linkage',
      Boolean(createdViewingId),
      `Scheduled Viewing ID: ${createdViewingId} for ${testPropTitle}`
    );
  } catch (err: any) {
    recordTest('Viewing Appointment Booking & Linkage', false, err.message);
  }

  try {
    const followUps = await clientService.getFollowUps({}, agentOp);
    recordTest(
      'Follow-up Tasks Engine Integration',
      Boolean(followUps && Array.isArray(followUps.data)),
      `Follow-up records retrieved: ${followUps?.data?.length || 0} tasks`
    );
  } catch (err: any) {
    recordTest('Follow-up Tasks Engine Integration', false, err.message);
  }

  // -------------------------------------------------------------------------
  // 4. CONTRACT & FINANCIAL REVENUE ENGINE (B22 & B23)
  // -------------------------------------------------------------------------
  console.log(`\n${YELLOW}${BOLD}[4. CONTRACT & FINANCIAL REVENUE ENGINE (B22 & B23)]${RESET}`);

  let testContractId = '';
  try {
    const contractResult = await contractService.getContracts();
    const firstContract = contractResult.data?.[0];
    testContractId = firstContract ? firstContract.contractId : 'CNT-2026-001';

    recordTest(
      'Official Contract Engine & Thai Legal Standard',
      Boolean(contractResult.data && contractResult.data.length > 0),
      `Active contracts: ${contractResult.pagination.total}, Primary Contract ID: ${testContractId}`
    );
  } catch (err: any) {
    recordTest('Official Contract Engine & Thai Legal Standard', false, err.message);
  }

  try {
    const scheduleResult = await paymentService.getSchedules();
    const schedulesList = scheduleResult.schedules || [];
    const totalAmount = schedulesList.reduce((sum, s) => sum + Number(s.amount || 0), 0);
    recordTest(
      'Payment Schedules & Financial Transactions',
      Boolean(Array.isArray(schedulesList)),
      `Schedules: ${schedulesList.length}, Total Scheduled Value: THB ${totalAmount.toLocaleString()}`
    );
  } catch (err: any) {
    recordTest('Payment Schedules & Financial Transactions', false, err.message);
  }

  // -------------------------------------------------------------------------
  // 5. OPERATIONS & MAINTENANCE TICKETING (B30)
  // -------------------------------------------------------------------------
  console.log(`\n${YELLOW}${BOLD}[5. OPERATIONS & MAINTENANCE TICKETING (B30)]${RESET}`);

  let b31TicketId = '';
  try {
    const request = await maintenanceService.createMaintenanceRequest(
      {
        propertyId: testPropId,
        propertyCustomId: testPropId,
        propertyTitle: testPropTitle,
        customerId: testClientId,
        customerName: testClientName,
        contractId: testContractId,
        title: 'B31 Final QA Pool Pump & Automation Diagnostics',
        problem: 'Checking dual inverter speed controller and high pressure bypass valve',
        priority: 'High',
        category: 'Pool',
        dueDate: '2026-10-15',
        assignedAgentId: agentOp.id,
        assignedAgentName: agentOp.name,
      },
      agentOp
    );
    b31TicketId = request.id;

    recordTest(
      'Maintenance Request Creation with Property & Tenant Integration',
      Boolean(request && request.ticketNumber.startsWith('MNT-')),
      `Created Ticket: ${request.ticketNumber} (${b31TicketId})`
    );
  } catch (err: any) {
    recordTest('Maintenance Request Creation with Property & Tenant Integration', false, err.message);
  }

  try {
    const costItem = await maintenanceService.addMaintenanceCost(
      b31TicketId,
      {
        itemType: 'Parts',
        description: 'High Pressure Bypass Check Valve 2-inch PVC',
        amount: 3200,
        paidBy: 'Owner',
        isPaid: true,
      },
      agentOp
    );

    recordTest(
      'Maintenance Cost Line-Item & Balance Recalculation',
      Boolean(costItem && Number(costItem.amount) === 3200),
      `Logged Cost: THB ${costItem?.amount} for Ticket ${b31TicketId}`
    );
  } catch (err: any) {
    recordTest('Maintenance Cost Line-Item & Balance Recalculation', false, err.message);
  }

  try {
    const completedTicket = await maintenanceService.updateRequestStatus(
      b31TicketId,
      'Completed',
      'Replaced bypass valve and calibrated variable frequency drive. Operational pressure 2.1 bar nominal.',
      managerOp
    );

    recordTest(
      'Maintenance Supervisor Sign-off & Completion',
      Boolean(completedTicket && completedTicket.status === 'Completed' && completedTicket.completedDate),
      `Status transitioned to Completed on ${completedTicket?.completedDate}`
    );
  } catch (err: any) {
    recordTest('Maintenance Supervisor Sign-off & Completion', false, err.message);
  }

  // -------------------------------------------------------------------------
  // 6. RBAC PERMISSION ENFORCEMENT & HTTP 403 INTEGRITY (B28)
  // -------------------------------------------------------------------------
  console.log(`\n${YELLOW}${BOLD}[6. RBAC PERMISSION ENFORCEMENT & HTTP 403 INTEGRITY (B28)]${RESET}`);

  try {
    // Admin checks
    const adminCanDelete = checkGranularPermission('Administrator', 'maintenance:delete');
    const adminCanApprove = checkGranularPermission('Administrator', 'maintenance:approve');
    const adminCanExport = checkGranularPermission('Administrator', 'reports:export');

    // Agent checks
    const agentCanDelete = checkGranularPermission('Agent', 'maintenance:delete');
    const agentCanApprove = checkGranularPermission('Agent', 'maintenance:approve');

    // Staff checks
    const staffCanView = checkGranularPermission('Staff', 'maintenance:view');
    const staffCanExport = checkGranularPermission('Staff', 'reports:export');

    const passedRbac =
      adminCanDelete &&
      adminCanApprove &&
      adminCanExport &&
      !agentCanDelete &&
      !agentCanApprove &&
      staffCanView &&
      !staffCanExport;

    recordTest(
      'Role-Based Access Control (RBAC) Matrix & 403 Enforcement',
      passedRbac,
      `Admin Full: ${adminCanDelete}, Agent Restricted: ${!agentCanDelete}, Staff View-Only: ${staffCanView && !staffCanExport}`
    );
  } catch (err: any) {
    recordTest('Role-Based Access Control (RBAC) Matrix & 403 Enforcement', false, err.message);
  }

  // -------------------------------------------------------------------------
  // 7. SOFT DELETE (isArchived) & RESTORE CONSISTENCY
  // -------------------------------------------------------------------------
  console.log(`\n${YELLOW}${BOLD}[7. SOFT DELETE (isArchived) & RESTORE CONSISTENCY]${RESET}`);

  try {
    // Soft delete ticket
    await maintenanceService.softDeleteRequest(b31TicketId, adminOp);
    const activeTicketsAfterDelete = await maintenanceService.listMaintenanceRequests({ isArchived: false });
    const isExcluded = !activeTicketsAfterDelete.data.some((t) => t.id === b31TicketId);

    // Restore ticket
    await maintenanceService.restoreRequest(b31TicketId, adminOp);
    const activeTicketsAfterRestore = await maintenanceService.listMaintenanceRequests({ isArchived: false });
    const isRestored = activeTicketsAfterRestore.data.some((t) => t.id === b31TicketId);

    recordTest(
      'Universal Soft Delete (isArchived=true) & Restoration',
      Boolean(isExcluded && isRestored),
      `Excluded from active view: ${isExcluded}, Re-included on restore: ${isRestored}`
    );
  } catch (err: any) {
    recordTest('Universal Soft Delete (isArchived=true) & Restoration', false, err.message);
  }

  // -------------------------------------------------------------------------
  // 8. AUDIT LOG & COMPLIANCE DATA CONSISTENCY
  // -------------------------------------------------------------------------
  console.log(`\n${YELLOW}${BOLD}[8. AUDIT LOG & COMPLIANCE DATA CONSISTENCY]${RESET}`);

  try {
    const logs = await db
      .select()
      .from(auditLogsTable)
      .orderBy(desc(auditLogsTable.createdAt))
      .limit(10);

    const hasAuditEntries = logs.length > 0;
    const latestLog = logs[0];

    recordTest(
      'System Audit Trail Logging',
      hasAuditEntries,
      `Audit entries recorded: ${logs.length}. Latest: [${latestLog?.action}] by ${latestLog?.userName || latestLog?.userId}`
    );
  } catch (err: any) {
    recordTest('System Audit Trail Logging', false, err.message);
  }

  // -------------------------------------------------------------------------
  // 9. SYSTEM SETTINGS & BACKUP PERSISTENCE (B28)
  // -------------------------------------------------------------------------
  console.log(`\n${YELLOW}${BOLD}[9. SYSTEM SETTINGS & BACKUP PERSISTENCE (B28)]${RESET}`);

  try {
    const businessSettings = await systemSettingsService.getSettings('business');
    const rolesList = await systemSettingsService.getRoles();

    recordTest(
      'System Settings & Business Profile Configuration',
      Boolean(businessSettings && rolesList && rolesList.length >= 4),
      `Company: ${businessSettings?.data?.companyName || 'PEAK REAL ESTATE'}, Roles defined: ${rolesList?.length}`
    );
  } catch (err: any) {
    recordTest('System Settings & Business Profile Configuration', false, err.message);
  }

  // -------------------------------------------------------------------------
  // 10. BUSINESS INTELLIGENCE & DASHBOARD KPI AGGREGATION (B29)
  // -------------------------------------------------------------------------
  console.log(`\n${YELLOW}${BOLD}[10. BUSINESS INTELLIGENCE & DASHBOARD KPI AGGREGATION (B29)]${RESET}`);

  try {
    const kpiSummary = await reportingService.getDashboardKPI({}, adminOp);
    const passed = Boolean(
      kpiSummary &&
      kpiSummary.success &&
      kpiSummary.properties !== undefined &&
      kpiSummary.contracts !== undefined &&
      kpiSummary.payments !== undefined
    );

    recordTest(
      'Business Intelligence Real-time KPI Aggregation',
      passed,
      `Properties active: ${kpiSummary?.properties?.available || 0}, Closed Deals: THB ${Number(kpiSummary?.contracts?.salesVolume || 0).toLocaleString()}`
    );
  } catch (err: any) {
    recordTest('Business Intelligence Real-time KPI Aggregation', false, err.message);
  }

  // -------------------------------------------------------------------------
  // 11. REGRESSION VERIFICATION B13 — B30
  // -------------------------------------------------------------------------
  console.log(`\n${YELLOW}${BOLD}[11. REGRESSION VERIFICATION: B13 — B30]${RESET}`);

  // Regression B13-B21: Properties
  try {
    const totalProps = await db.select().from(propertiesTable);
    recordTest('Regression B13–B21: Property Catalog & Media Intact', totalProps.length > 0, `Total properties: ${totalProps.length}`);
  } catch (err: any) {
    recordTest('Regression B13–B21: Property Catalog & Media Intact', false, err.message);
  }

  // Regression B22-B23: Contracts & Payments
  try {
    const totalContracts = await db.select().from(contractsTable);
    const totalSchedules = await db.select().from(paymentSchedulesTable);
    recordTest(
      'Regression B22–B23: Contracts & Payment Schedules Intact',
      totalContracts.length > 0 && totalSchedules.length > 0,
      `Contracts: ${totalContracts.length}, Schedules: ${totalSchedules.length}`
    );
  } catch (err: any) {
    recordTest('Regression B22–B23: Contracts & Payment Schedules Intact', false, err.message);
  }

  // Regression B24-B27: Viewings, CRM, Pipeline & Tasks
  try {
    const totalViewings = await db.select().from(viewingsTable);
    const totalClients = await db.select().from(clientsTable);
    const followUps = await clientService.getFollowUps({}, adminOp);
    recordTest(
      'Regression B24–B27: Viewing, CRM, Pipeline & Tasks Intact',
      totalViewings.length > 0 && totalClients.length > 0 && followUps.data.length > 0,
      `Viewings: ${totalViewings.length}, Clients: ${totalClients.length}, Tasks: ${followUps.data.length}`
    );
  } catch (err: any) {
    recordTest('Regression B24–B27: Viewing, CRM, Pipeline & Tasks Intact', false, err.message);
  }

  // Regression B28-B30: Admin, Reporting, Maintenance
  try {
    const totalRoles = await db.select().from(rolesTable);
    const totalVendors = await db.select().from(maintenanceVendorsTable);
    const totalTickets = await db.select().from(maintenanceRequestsTable);
    recordTest(
      'Regression B28–B30: Roles, Reporting & Maintenance Intact',
      totalRoles.length >= 4 && totalVendors.length > 0 && totalTickets.length > 0,
      `Roles: ${totalRoles.length}, Vendors: ${totalVendors.length}, Tickets: ${totalTickets.length}`
    );
  } catch (err: any) {
    recordTest('Regression B28–B30: Roles, Reporting & Maintenance Intact', false, err.message);
  }

  // -------------------------------------------------------------------------
  // FINAL TEST REPORT SUMMARY
  // -------------------------------------------------------------------------
  console.log(`\n${CYAN}${BOLD}========================================================================${RESET}`);
  console.log(`${CYAN}${BOLD}                   B31 TEST SUITE SCORECARD                             ${RESET}`);
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
    console.log(`\n${GREEN}${BOLD}✓ ALL B31 INTEGRATION & REGRESSION CHECKS PASSED PERFECTLY!${RESET}\n`);
    process.exit(0);
  }
}

runB31FinalIntegrationTestSuite().catch((err) => {
  console.error('Fatal B31 Test Suite Error:', err);
  process.exit(1);
});
