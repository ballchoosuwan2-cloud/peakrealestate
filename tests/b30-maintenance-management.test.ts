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
import { maintenanceService } from '../src/server/maintenance-service.ts';
import { seedInitialPropertiesIfEmpty } from '../src/server/db-service.ts';
import { clientService } from '../src/server/client-service.ts';
import { systemSettingsService } from '../src/server/system-settings-service.ts';
import { contractService } from '../src/server/contract-service.ts';
import { paymentService } from '../src/server/payment-service.ts';
import { viewingService } from '../src/server/viewing-service.ts';
import { reportingService } from '../src/server/reporting-service.ts';
import { checkGranularPermission } from '../src/lib/permissions.ts';
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

async function runB30MaintenanceTestSuite() {
  console.log(`\n${CYAN}${BOLD}========================================================================${RESET}`);
  console.log(`${CYAN}${BOLD}  PEAK REAL ESTATE — B30 OPERATIONS & MAINTENANCE TEST SUITE            ${RESET}`);
  console.log(`${CYAN}${BOLD}========================================================================${RESET}\n`);

  await ensureDatabaseSchema();
  await seedInitialPropertiesIfEmpty();
  await clientService.seedInitialClientsIfEmpty();
  await maintenanceService.seedInitialMaintenanceIfEmpty();

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

  // Fetch test property & client
  const props = await db.select().from(propertiesTable).limit(1);
  const testProperty = props[0] || { propertyId: 'PROP-TEST-1', title: 'Test Luxury Villa Laguna' };

  const clients = await db.select().from(clientsTable).limit(1);
  const testClient = clients[0] || { id: 'client-test-1', firstName: 'Jean-Luc', lastName: 'Picard' };

  let createdVendorId = '';
  let createdTicketId = '';
  let createdCostId = '';
  let createdPreventiveId = '';

  // -------------------------------------------------------------------------
  // 1. VENDOR / TECHNICIAN MANAGEMENT
  // -------------------------------------------------------------------------
  console.log(`\n${YELLOW}${BOLD}[1. VENDORS & TECHNICIANS MANAGEMENT]${RESET}`);

  try {
    const vendor = await maintenanceService.createVendor(
      {
        name: 'Siam Hydro Tech & Pump Specialists',
        company: 'Siam Hydro Tech Co., Ltd.',
        phone: '081-998-1122',
        email: 'service@siamhydro.com',
        serviceType: 'Pool',
        rating: 4.9,
        notes: 'Specialist for Pentair and Hayward pump systems.',
      },
      adminOp
    );

    createdVendorId = vendor.id;
    recordTest(
      'Create Vendor',
      Boolean(vendor && vendor.vendorCode.startsWith('VND-')),
      `Vendor ${vendor.name} created with Code ${vendor.vendorCode}`
    );
  } catch (err: any) {
    recordTest('Create Vendor', false, err.message);
  }

  try {
    const updated = await maintenanceService.updateVendor(
      createdVendorId,
      {
        company: 'Siam Hydro & Automation Co., Ltd.',
        rating: 5.0,
      },
      adminOp
    );

    recordTest(
      'Update Vendor',
      Boolean(updated && updated.company === 'Siam Hydro & Automation Co., Ltd.'),
      `Updated company to ${updated?.company}`
    );
  } catch (err: any) {
    recordTest('Update Vendor', false, err.message);
  }

  try {
    const toggled = await maintenanceService.toggleVendorActive(createdVendorId, adminOp);
    recordTest(
      'Toggle Vendor Active Status',
      Boolean(toggled && toggled.isActive === false),
      `Toggled status to isActive = ${toggled?.isActive}`
    );

    // Toggle back
    await maintenanceService.toggleVendorActive(createdVendorId, adminOp);
  } catch (err: any) {
    recordTest('Toggle Vendor Active Status', false, err.message);
  }

  try {
    const list = await maintenanceService.listVendors({ search: 'Siam Hydro' });
    recordTest(
      'Search & Filter Vendors',
      Boolean(list.length > 0 && list.some((v) => v.id === createdVendorId)),
      `Found ${list.length} vendor(s) matching search`
    );
  } catch (err: any) {
    recordTest('Search & Filter Vendors', false, err.message);
  }

  // -------------------------------------------------------------------------
  // 2. MAINTENANCE REQUESTS CRUD & PROPERTY/CUSTOMER INTEGRATION
  // -------------------------------------------------------------------------
  console.log(`\n${YELLOW}${BOLD}[2. MAINTENANCE REQUESTS & PROPERTY LINKAGE]${RESET}`);

  try {
    const request = await maintenanceService.createMaintenanceRequest(
      {
        propertyId: testProperty.propertyId,
        propertyCustomId: testProperty.propertyId,
        propertyTitle: testProperty.title,
        customerId: testClient.id,
        customerName: `${testClient.firstName} ${testClient.lastName || ''}`.trim(),
        title: 'Master Villa Infinity Edge Leakage & Tile Repair',
        problem: 'Water line dropping by 5cm daily near infinity weir. Loose glass mosaic tiles found.',
        category: 'Pool',
        priority: 'Urgent',
        dueDate: '2026-10-10',
        assignedVendorId: createdVendorId,
        assignedAgentId: agentOp.id,
        assignedAgentName: agentOp.name,
        notes: 'Priority guest check-in scheduled in 10 days.',
      },
      adminOp
    );

    createdTicketId = request.id;
    recordTest(
      'Create Maintenance Request with Property & Customer Link',
      Boolean(request && request.ticketNumber.startsWith('MNT-') && request.propertyId === testProperty.propertyId),
      `Created ${request.ticketNumber}: ${request.title} for ${request.propertyTitle}`
    );
  } catch (err: any) {
    recordTest('Create Maintenance Request with Property & Customer Link', false, err.message);
  }

  try {
    const detail = await maintenanceService.getMaintenanceRequestById(createdTicketId);
    recordTest(
      'Get Maintenance Request Detail with Vendor Association',
      Boolean(detail.request && detail.vendor && detail.vendor.id === createdVendorId),
      `Loaded ticket ${detail.request?.ticketNumber} linked to vendor ${detail.vendor?.name}`
    );
  } catch (err: any) {
    recordTest('Get Maintenance Request Detail with Vendor Association', false, err.message);
  }

  try {
    const updated = await maintenanceService.updateMaintenanceRequest(
      createdTicketId,
      {
        solution: 'Found cracked overflow pipe fitting. Replaced with reinforced PVC joint.',
        priority: 'High',
      },
      managerOp
    );

    recordTest(
      'Update Maintenance Request Details & Solution',
      Boolean(updated && updated.priority === 'High' && updated.solution?.includes('reinforced PVC')),
      `Updated priority to High and saved solution notes`
    );
  } catch (err: any) {
    recordTest('Update Maintenance Request Details & Solution', false, err.message);
  }

  // -------------------------------------------------------------------------
  // 3. ASSIGNMENT & STATUS WORKFLOW
  // -------------------------------------------------------------------------
  console.log(`\n${YELLOW}${BOLD}[3. ASSIGNMENT & STATUS TRANSITIONS]${RESET}`);

  try {
    const assigned = await maintenanceService.assignMaintenance(
      createdTicketId,
      {
        assignedVendorId: createdVendorId,
        assignedAgentId: agentOp.id,
        assignedAgentName: agentOp.name,
        dueDate: '2026-10-08',
      },
      adminOp
    );

    recordTest(
      'Assign Vendor & Agent to Ticket',
      Boolean(assigned && assigned.status === 'Assigned' && assigned.dueDate === '2026-10-08'),
      `Status transitioned to 'Assigned' with Due Date 2026-10-08`
    );
  } catch (err: any) {
    recordTest('Assign Vendor & Agent to Ticket', false, err.message);
  }

  try {
    const inProgress = await maintenanceService.updateRequestStatus(createdTicketId, 'In Progress', undefined, staffOp);
    recordTest(
      'Transition Status to In Progress',
      Boolean(inProgress && inProgress.status === 'In Progress' && inProgress.startDate),
      `Started work on ${inProgress?.startDate}`
    );
  } catch (err: any) {
    recordTest('Transition Status to In Progress', false, err.message);
  }

  try {
    const waiting = await maintenanceService.updateRequestStatus(createdTicketId, 'Waiting', 'Waiting for imported pool adhesive curing', staffOp);
    recordTest(
      'Transition Status to Waiting Parts/Adhesive',
      Boolean(waiting && waiting.status === 'Waiting'),
      `Status changed to Waiting`
    );
  } catch (err: any) {
    recordTest('Transition Status to Waiting Parts/Adhesive', false, err.message);
  }

  // -------------------------------------------------------------------------
  // 4. MAINTENANCE COST MANAGEMENT
  // -------------------------------------------------------------------------
  console.log(`\n${YELLOW}${BOLD}[4. MAINTENANCE COST MANAGEMENT]${RESET}`);

  try {
    const costLabor = await maintenanceService.addMaintenanceCost(
      createdTicketId,
      {
        itemType: 'Labor',
        description: 'Underwater tile grouting & fitting replacement labor (2 days)',
        amount: 2500,
        isPaid: true,
        paidBy: 'Owner',
      },
      adminOp
    );

    createdCostId = costLabor?.id || '';

    const costParts = await maintenanceService.addMaintenanceCost(
      createdTicketId,
      {
        itemType: 'Parts',
        description: 'Epoxy swimming pool grout & high-pressure fitting union',
        amount: 1800,
        isPaid: false,
        paidBy: 'Owner',
      },
      adminOp
    );

    const check = await maintenanceService.getMaintenanceRequestById(createdTicketId);
    const totalCost = Number(check.request?.totalCost);
    const paidAmount = Number(check.request?.paidAmount);
    const outstanding = Number(check.request?.outstandingAmount);

    recordTest(
      'Add Labor & Parts Costs with Auto-Recalculation',
      Boolean(totalCost === 4300 && paidAmount === 2500 && outstanding === 1800),
      `Total Cost: ฿${totalCost.toLocaleString()}, Paid: ฿${paidAmount.toLocaleString()}, Outstanding: ฿${outstanding.toLocaleString()}`
    );
  } catch (err: any) {
    recordTest('Add Labor & Parts Costs with Auto-Recalculation', false, err.message);
  }

  try {
    const deleted = await maintenanceService.deleteMaintenanceCost(createdCostId, adminOp);
    const check = await maintenanceService.getMaintenanceRequestById(createdTicketId);
    const totalCost = Number(check.request?.totalCost);

    recordTest(
      'Delete Cost Item & Recalculate Request Balance',
      Boolean(deleted && totalCost === 1800),
      `Removed labor item. Updated Total Cost: ฿${totalCost}`
    );
  } catch (err: any) {
    recordTest('Delete Cost Item & Recalculate Request Balance', false, err.message);
  }

  // -------------------------------------------------------------------------
  // 5. APPROVE & COMPLETE WORK
  // -------------------------------------------------------------------------
  console.log(`\n${YELLOW}${BOLD}[5. APPROVE & COMPLETE WORK]${RESET}`);

  try {
    const completed = await maintenanceService.updateRequestStatus(
      createdTicketId,
      'Completed',
      'All leak tests passed with zero level drop over 24 hours. Owner verified and signed completion form.',
      managerOp
    );

    recordTest(
      'Approve & Complete Maintenance Request',
      Boolean(completed && completed.status === 'Completed' && completed.completedDate),
      `Ticket completed on ${completed?.completedDate} with final sign-off`
    );
  } catch (err: any) {
    recordTest('Approve & Complete Maintenance Request', false, err.message);
  }

  // -------------------------------------------------------------------------
  // 6. SOFT DELETE & RESTORE
  // -------------------------------------------------------------------------
  console.log(`\n${YELLOW}${BOLD}[6. SOFT DELETE (isArchived) & RESTORE]${RESET}`);

  try {
    const archived = await maintenanceService.softDeleteRequest(createdTicketId, adminOp);
    const listActive = await maintenanceService.listMaintenanceRequests({ isArchived: false });
    const inActive = listActive.data.some((r) => r.id === createdTicketId);

    recordTest(
      'Soft Delete Maintenance Request (isArchived = true)',
      Boolean(archived && !inActive),
      `Soft deleted ticket successfully omitted from active lists`
    );
  } catch (err: any) {
    recordTest('Soft Delete Maintenance Request (isArchived = true)', false, err.message);
  }

  try {
    const restored = await maintenanceService.restoreRequest(createdTicketId, adminOp);
    const listActive = await maintenanceService.listMaintenanceRequests({ isArchived: false });
    const inActive = listActive.data.some((r) => r.id === createdTicketId);

    recordTest(
      'Restore Maintenance Request (isArchived = false)',
      Boolean(restored && inActive),
      `Restored ticket successfully reappears in active queries`
    );
  } catch (err: any) {
    recordTest('Restore Maintenance Request (isArchived = false)', false, err.message);
  }

  // -------------------------------------------------------------------------
  // 7. PREVENTIVE MAINTENANCE CYCLES
  // -------------------------------------------------------------------------
  console.log(`\n${YELLOW}${BOLD}[7. PREVENTIVE MAINTENANCE SCHEDULES]${RESET}`);

  try {
    const pm = await maintenanceService.createPreventiveMaintenance(
      {
        propertyId: testProperty.propertyId,
        propertyCustomId: testProperty.propertyId,
        propertyTitle: testProperty.title,
        title: 'Biannual Pool Sand Filter & Chemical Media Replacement',
        serviceType: 'Pool',
        cycleMonths: 6,
        nextDueDate: '2026-10-15',
        reminderDays: 7,
        assignedVendorId: createdVendorId,
        estimatedCost: 5500,
        notes: 'Replace AFM activated glass filter media.',
      },
      adminOp
    );

    createdPreventiveId = pm.id;
    recordTest(
      'Create Preventive Maintenance Schedule',
      Boolean(pm && pm.code.startsWith('PM-') && pm.cycleMonths === 6),
      `Created ${pm.code}: ${pm.title} (Every ${pm.cycleMonths} Months)`
    );
  } catch (err: any) {
    recordTest('Create Preventive Maintenance Schedule', false, err.message);
  }

  try {
    const beforeExecute = await db.select().from(preventiveMaintenanceTable).where(eq(preventiveMaintenanceTable.id, createdPreventiveId));
    const oldDue = beforeExecute[0].nextDueDate;

    const executed = await maintenanceService.markPreventiveServiceDone(createdPreventiveId, adminOp);
    const newDue = executed?.nextDueDate;

    recordTest(
      'Execute Preventive Service & Advance Schedule Cycle',
      Boolean(executed && executed.lastServiceDate && newDue && newDue > oldDue),
      `Service executed today. Next due date pushed from ${oldDue} to ${newDue}`
    );
  } catch (err: any) {
    recordTest('Execute Preventive Service & Advance Schedule Cycle', false, err.message);
  }

  // -------------------------------------------------------------------------
  // 8. RBAC PERMISSIONS & 403 BACKEND ENFORCEMENT
  // -------------------------------------------------------------------------
  console.log(`\n${YELLOW}${BOLD}[8. RBAC PERMISSIONS & ACCESS CONTROL (HTTP 403 ENFORCEMENT)]${RESET}`);

  // Admin has all permissions
  const adminHasAll = [
    'maintenance:view',
    'maintenance:create',
    'maintenance:edit',
    'maintenance:delete',
    'maintenance:assign',
    'maintenance:approve',
    'maintenance:cost',
    'maintenance:export',
  ].every((p) => checkGranularPermission('Administrator', p));

  recordTest(
    'Admin Has Full Operations Permissions',
    adminHasAll,
    'Administrator granted all 8 maintenance permissions'
  );

  // Manager has approve, delete, assign
  const managerCanApprove = checkGranularPermission('Manager', 'maintenance:approve');
  const managerCanDelete = checkGranularPermission('Manager', 'maintenance:delete');
  recordTest(
    'Manager Can Approve & Delete Tickets',
    managerCanApprove && managerCanDelete,
    'Manager has operational oversight permissions'
  );

  // Agent cannot approve or hard delete
  const agentCanCreate = checkGranularPermission('Agent', 'maintenance:create');
  const agentCanDelete = checkGranularPermission('Agent', 'maintenance:delete');
  const agentCanApprove = checkGranularPermission('Agent', 'maintenance:approve');
  recordTest(
    'Agent RBAC Enforcement (No Delete, No Approve)',
    agentCanCreate && !agentCanDelete && !agentCanApprove,
    'Agent restricted from deleting or approving tickets (would yield HTTP 403)'
  );

  // Staff (Technician/Operations)
  const staffCanView = checkGranularPermission('Staff', 'maintenance:view');
  const staffCanEdit = checkGranularPermission('Staff', 'maintenance:edit');
  const staffCanDelete = checkGranularPermission('Staff', 'maintenance:delete');
  recordTest(
    'Staff RBAC Enforcement (Can View/Edit, Cannot Delete)',
    staffCanView && staffCanEdit && !staffCanDelete,
    'Staff technician can view & update tickets but cannot delete'
  );

  // -------------------------------------------------------------------------
  // 9. AUDIT TRAIL VERIFICATION
  // -------------------------------------------------------------------------
  console.log(`\n${YELLOW}${BOLD}[9. AUDIT TRAIL VERIFICATION]${RESET}`);

  try {
    const logs = await db
      .select()
      .from(auditLogsTable)
      .where(eq(auditLogsTable.propertyId, testProperty.propertyId))
      .orderBy(desc(auditLogsTable.createdAt))
      .limit(5);

    const hasMntLogs = logs.some((l) => l.action.toLowerCase().includes('maintenance') || l.action.toLowerCase().includes('status'));

    recordTest(
      'Verify Audit Logs for Operations Actions',
      hasMntLogs,
      `Found ${logs.length} audit entries recorded for property ${testProperty.propertyId}`
    );
  } catch (err: any) {
    recordTest('Verify Audit Logs for Operations Actions', false, err.message);
  }

  // -------------------------------------------------------------------------
  // 10. DASHBOARD METRICS & CSV EXPORT
  // -------------------------------------------------------------------------
  console.log(`\n${YELLOW}${BOLD}[10. DASHBOARD METRICS & CSV EXPORT]${RESET}`);

  try {
    const metrics = await maintenanceService.getDashboardMetrics();
    recordTest(
      'Calculate Maintenance Dashboard Metrics',
      Boolean(metrics && metrics.total > 0 && metrics.totalCost >= 0 && metrics.statusBreakdown),
      `Total: ${metrics.total}, Active: ${metrics.open + metrics.inProgress}, Cost: ฿${metrics.totalCost.toLocaleString()}`
    );
  } catch (err: any) {
    recordTest('Calculate Maintenance Dashboard Metrics', false, err.message);
  }

  try {
    const csv = await maintenanceService.exportMaintenanceRequestsCsv();
    recordTest(
      'Generate UTF-8 BOM CSV Export',
      Boolean(csv && csv.startsWith('\uFEFFTicket Number') && csv.includes('Total Cost (THB)')),
      `Generated CSV with UTF-8 BOM (${csv.length} bytes)`
    );
  } catch (err: any) {
    recordTest('Generate UTF-8 BOM CSV Export', false, err.message);
  }

  // -------------------------------------------------------------------------
  // 11. REGRESSION TESTS (B25–B29)
  // -------------------------------------------------------------------------
  console.log(`\n${YELLOW}${BOLD}[11. REGRESSION SUITE: B25 — B29]${RESET}`);

  // Regression B25: Client / CRM Management Lite
  try {
    const clientResult = await clientService.getClients({}, adminOp);
    recordTest(
      'Regression B25: Client / CRM Management Intact',
      Boolean(clientResult && clientResult.clients && clientResult.clients.length > 0),
      `Clients accessible: ${clientResult?.clients?.length} active clients in database`
    );
  } catch (err: any) {
    recordTest('Regression B25: Client / CRM Management Intact', false, err.message);
  }

  // Regression B26: Sales Pipeline & Lead Stages
  try {
    const pipeline = await clientService.getPipelineSummary(adminOp);
    recordTest(
      'Regression B26: Sales Pipeline Intact',
      Boolean(pipeline && pipeline.stages && Object.keys(pipeline.stages).length > 0),
      `Pipeline stages active: ${Object.keys(pipeline?.stages || {}).length}, Active Value: THB ${(pipeline?.totalActiveValue || 0).toLocaleString()}`
    );
  } catch (err: any) {
    recordTest('Regression B26: Sales Pipeline Intact', false, err.message);
  }

  // Regression B27: Follow-up Tasks
  try {
    const followUps = await clientService.getFollowUps({}, adminOp);
    recordTest(
      'Regression B27: Follow-up Task Management Intact',
      Boolean(followUps && Array.isArray(followUps.data)),
      `Follow-up records query returned: ${followUps?.data?.length || 0} tasks`
    );
  } catch (err: any) {
    recordTest('Regression B27: Follow-up Task Management Intact', false, err.message);
  }

  // Regression B28: System Administration & RBAC
  try {
    const roles = await systemSettingsService.getRoles();
    const bizSettings = await systemSettingsService.getSettings('business');
    recordTest(
      'Regression B28: System Settings & Roles Intact',
      Boolean(Array.isArray(roles) && roles.length >= 4 && bizSettings),
      `Roles configured: ${roles?.length}, Company: ${bizSettings?.data?.companyName || 'PEAK REAL ESTATE'}`
    );
  } catch (err: any) {
    recordTest('Regression B28: System Settings & Roles Intact', false, err.message);
  }

  // Regression B29: Dashboard & Reporting BI
  try {
    const reportKpi = await reportingService.getDashboardKPI({}, adminOp);
    recordTest(
      'Regression B29: Reporting & BI Dashboard Intact',
      Boolean(reportKpi && reportKpi.success && reportKpi.properties && reportKpi.contracts),
      `KPIs generated: Active deals, closed revenue, and agent ranking intact`
    );
  } catch (err: any) {
    recordTest('Regression B29: Reporting & BI Dashboard Intact', false, err.message);
  }

  // -------------------------------------------------------------------------
  // FINAL TEST REPORT SUMMARY
  // -------------------------------------------------------------------------
  console.log(`\n${CYAN}${BOLD}========================================================================${RESET}`);
  console.log(`${CYAN}${BOLD}                   TEST SUITE EXECUTION SUMMARY                         ${RESET}`);
  console.log(`${CYAN}${BOLD}========================================================================${RESET}`);

  const passedCount = testResults.filter((t) => t.passed).length;
  const failedCount = testResults.filter((t) => !t.passed).length;

  console.log(`Total Tests Run: ${BOLD}${testResults.length}${RESET}`);
  console.log(`Passed:         ${GREEN}${BOLD}${passedCount}${RESET}`);
  console.log(`Failed:         ${failedCount > 0 ? RED : GREEN}${BOLD}${failedCount}${RESET}`);

  if (failedCount > 0) {
    console.log(`\n${RED}${BOLD}Some tests failed. See details above.${RESET}`);
    process.exit(1);
  } else {
    console.log(`\n${GREEN}${BOLD}✓ ALL B30 TESTS & REGRESSION CHECKS PASSED PERFECTLY!${RESET}\n`);
    process.exit(0);
  }
}

runB30MaintenanceTestSuite().catch((err) => {
  console.error('Fatal Test Suite Error:', err);
  process.exit(1);
});
