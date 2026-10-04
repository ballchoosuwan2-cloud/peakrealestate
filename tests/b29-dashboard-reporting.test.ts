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
import { reportingService } from '../src/server/reporting-service.ts';
import { seedInitialPropertiesIfEmpty } from '../src/server/db-service.ts';
import { clientService } from '../src/server/client-service.ts';
import { systemSettingsService } from '../src/server/system-settings-service.ts';
import { contractService } from '../src/server/contract-service.ts';
import { paymentService } from '../src/server/payment-service.ts';
import { viewingService } from '../src/server/viewing-service.ts';
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

async function runB29DashboardReportingTestSuite() {
  console.log(`\n${CYAN}${BOLD}========================================================================${RESET}`);
  console.log(`${CYAN}${BOLD}     PEAK REAL ESTATE — B29 DASHBOARD & REPORTING TEST SUITE            ${RESET}`);
  console.log(`${CYAN}${BOLD}========================================================================${RESET}\n`);

  await ensureDatabaseSchema();
  await seedInitialPropertiesIfEmpty();
  await clientService.seedInitialClientsIfEmpty();

  // Test Operators
  const adminOp: User = {
    id: 'user-admin-1',
    name: 'Administrator',
    role: 'Administrator',
    branch: 'Phuket Head Office',
    email: 'admin@peakrealestate.com',
    phone: '081-234-5678',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    title: 'Managing Director',
  };

  const managerOp: User = {
    id: 'user-mgr-1',
    name: 'Nichada Manager',
    role: 'Manager',
    branch: 'Laguna Branch',
    email: 'nichada@peakrealestate.com',
    phone: '089-987-6543',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150',
    title: 'Branch Director',
  };

  const agentOp: User = {
    id: 'user-agt-1',
    name: 'Kittisak Agent',
    role: 'Agent',
    branch: 'Phuket Head Office',
    email: 'kittisak@peakrealestate.com',
    phone: '086-123-4567',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    title: 'Senior Property Consultant',
  };

  const staffOp: User = {
    id: 'user-staff-1',
    name: 'Prasert Staff',
    role: 'Staff',
    branch: 'Phuket Head Office',
    email: 'prasert@peakrealestate.com',
    phone: '084-555-6677',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    title: 'Operations Coordinator',
  };

  // Seed sample contracts if empty
  const existingContracts = await db.select().from(contractsTable);
  if (existingContracts.length === 0) {
    await db.insert(contractsTable).values([
      {
        id: 'cnt-b29-001',
        contractId: 'CNT-2026-001',
        propertyId: 'prop-1',
        contractType: 'Sale Contract',
        signDate: '2026-03-01',
        rentalStart: '2026-03-01',
        rentalEnd: '2027-03-01',
        status: 'Active',
        agent: 'Kittisak Agent',
        agentPhone: '086-123-4567',
        ownerName: 'Phuket Prime Land Holdings',
        tenantName: 'Alexander Wright',
        tenantPhone: '+44 7911 123456',
        monthlyRent: '3500000',
        salesCommission: '1575000',
        isArchived: false,
      },
      {
        id: 'cnt-b29-002',
        contractId: 'CNT-2026-002',
        propertyId: 'prop-2',
        contractType: 'Rent Contract',
        signDate: '2026-02-01',
        rentalStart: '2026-02-01',
        rentalEnd: '2027-01-31',
        status: 'Active',
        agent: 'Kittisak Agent',
        agentPhone: '086-123-4567',
        ownerName: 'Laguna Property Asset Co.',
        tenantName: 'David Miller',
        tenantPhone: '+61 4 1234 5678',
        monthlyRent: '200000',
        depositSecurity: '400000',
        salesCommission: '200000',
        isArchived: false,
      },
    ]);
  }

  // Seed sample payment schedules if empty
  const existingSchedules = await db.select().from(paymentSchedulesTable);
  if (existingSchedules.length === 0) {
    await db.insert(paymentSchedulesTable).values([
      {
        id: 'sch-b29-001',
        contractId: 'CNT-2026-001',
        propertyId: 'prop-1',
        title: 'Down Payment 20%',
        paymentType: 'Deposit',
        amount: '9000000',
        paidAmount: '9000000',
        remainingAmount: '0',
        dueDate: '2026-03-15',
        status: 'Paid',
        isArchived: false,
      },
      {
        id: 'sch-b29-002',
        contractId: 'CNT-2026-002',
        propertyId: 'prop-2',
        title: 'Monthly Rent April 2026',
        paymentType: 'Rent',
        amount: '200000',
        paidAmount: '0',
        remainingAmount: '200000',
        dueDate: '2026-04-01',
        status: 'Pending',
        isArchived: false,
      },
      {
        id: 'sch-b29-003',
        contractId: 'CNT-2026-002',
        propertyId: 'prop-2',
        title: 'Overdue Maintenance Fee',
        paymentType: 'Other',
        amount: '25000',
        paidAmount: '0',
        remainingAmount: '25000',
        dueDate: '2026-02-15',
        status: 'Overdue',
        isArchived: false,
      },
    ]);
  }

  // Seed sample viewings if empty
  const existingViewings = await db.select().from(viewingsTable);
  if (existingViewings.length === 0) {
    await db.insert(viewingsTable).values([
      {
        id: 'viw-b29-001',
        viewingCode: 'VIW-2026-001',
        customerId: 'cust-1',
        customerName: 'Alexander Wright',
        propertyId: 'prop-1',
        propertyTitle: 'The Peak Oceanfront Pool Villa',
        agentId: 'user-agt-1',
        agentName: 'Kittisak Agent',
        dateTime: '2026-09-29T14:00',
        status: 'Scheduled',
        interestScore: 5,
        clientInterest: 'Hot',
        location: 'Kata Beach',
        isArchived: false,
      },
      {
        id: 'viw-b29-002',
        viewingCode: 'VIW-2026-002',
        customerId: 'cust-2',
        customerName: 'Somchai Ratanakul',
        propertyId: 'prop-2',
        propertyTitle: 'Skyline Sea View Penthouse Patong',
        agentId: 'user-agt-1',
        agentName: 'Kittisak Agent',
        dateTime: '2026-09-28T10:30',
        status: 'Completed',
        interestScore: 5,
        clientInterest: 'Hot',
        location: 'Patong Beach',
        isArchived: false,
      },
    ]);
  }

  // -------------------------------------------------------------
  // 1. Dashboard KPI
  // -------------------------------------------------------------
  console.log(`${YELLOW}${BOLD}--- 1. Dashboard KPI ---${RESET}`);
  try {
    const kpi = await reportingService.getDashboardKPI({}, adminOp);
    const passed =
      kpi.success === true &&
      kpi.properties !== undefined &&
      kpi.clients !== undefined &&
      kpi.contracts !== undefined &&
      kpi.payments !== undefined &&
      kpi.contracts.salesVolume >= 0 &&
      kpi.payments.revenueCollected >= 0;

    recordTest(
      'Dashboard KPI Aggregation',
      passed,
      `Sales Vol: THB ${kpi.contracts.salesVolume.toLocaleString()}, Collected: THB ${kpi.payments.revenueCollected.toLocaleString()}, Total Clients: ${kpi.clients.total}`
    );
  } catch (err: any) {
    recordTest('Dashboard KPI Aggregation', false, err.message);
  }

  // -------------------------------------------------------------
  // 2. Sales Report
  // -------------------------------------------------------------
  console.log(`${YELLOW}${BOLD}--- 2. Sales Report ---${RESET}`);
  try {
    const salesReport = await reportingService.getReportData('sales', {}, adminOp);
    const passed =
      salesReport.success === true &&
      salesReport.reportType === 'sales' &&
      Array.isArray(salesReport.data) &&
      salesReport.columns.some((c) => c.key === 'totalValue');

    recordTest(
      'Sales Report Generation',
      passed,
      `Deals count: ${salesReport.data.length}, Gross Value: THB ${(salesReport.summary.totalSalesVolume || 0).toLocaleString()}`
    );
  } catch (err: any) {
    recordTest('Sales Report Generation', false, err.message);
  }

  // -------------------------------------------------------------
  // 3. Rental Report
  // -------------------------------------------------------------
  console.log(`${YELLOW}${BOLD}--- 3. Rental Report ---${RESET}`);
  try {
    const rentalReport = await reportingService.getReportData('rental', {}, adminOp);
    const passed =
      rentalReport.success === true &&
      rentalReport.reportType === 'rental' &&
      Array.isArray(rentalReport.data) &&
      rentalReport.columns.some((c) => c.key === 'rentPrice');

    recordTest(
      'Rental Report Generation',
      passed,
      `Lease contracts: ${rentalReport.data.length}, Monthly Rent: THB ${(rentalReport.summary.totalMonthlyRent || 0).toLocaleString()}`
    );
  } catch (err: any) {
    recordTest('Rental Report Generation', false, err.message);
  }

  // -------------------------------------------------------------
  // 4. Payment Report
  // -------------------------------------------------------------
  console.log(`${YELLOW}${BOLD}--- 4. Payment Report ---${RESET}`);
  try {
    const paymentReport = await reportingService.getReportData('payment', {}, adminOp);
    const passed =
      paymentReport.success === true &&
      paymentReport.reportType === 'payment' &&
      Array.isArray(paymentReport.data) &&
      paymentReport.summary.totalDue !== undefined;

    recordTest(
      'Payment & Overdue Report',
      passed,
      `Schedules: ${paymentReport.data.length}, Total Due: THB ${paymentReport.summary.totalDue.toLocaleString()}, Overdue items: ${paymentReport.summary.overdueCount}`
    );
  } catch (err: any) {
    recordTest('Payment & Overdue Report', false, err.message);
  }

  // -------------------------------------------------------------
  // 5. Lead Funnel
  // -------------------------------------------------------------
  console.log(`${YELLOW}${BOLD}--- 5. Lead Funnel ---${RESET}`);
  try {
    const charts = await reportingService.getChartAnalytics({}, adminOp);
    const passed =
      charts.success === true &&
      Array.isArray(charts.leadFunnel) &&
      charts.leadFunnel.length >= 6 &&
      charts.leadFunnel.some((f: any) => f.stage === 'New Lead') &&
      charts.leadFunnel.some((f: any) => f.stage === 'Closed Won');

    recordTest(
      'Lead Funnel Pipeline Stages',
      passed,
      `Funnel Stages: ${charts.leadFunnel.map((f: any) => f.stage).join(' -> ')}`
    );
  } catch (err: any) {
    recordTest('Lead Funnel Pipeline Stages', false, err.message);
  }

  // -------------------------------------------------------------
  // 6. Agent Performance
  // -------------------------------------------------------------
  console.log(`${YELLOW}${BOLD}--- 6. Agent Performance ---${RESET}`);
  try {
    const perfReport = await reportingService.getReportData('agent_performance', {}, adminOp);
    const passed =
      perfReport.success === true &&
      perfReport.reportType === 'agent_performance' &&
      Array.isArray(perfReport.data) &&
      perfReport.data.length > 0;

    recordTest(
      'Agent Performance Ranking',
      passed,
      `Top Agent: ${perfReport.data[0]?.name}, Deals: ${perfReport.data[0]?.dealsCount}, Volume: THB ${perfReport.data[0]?.salesVolume?.toLocaleString()}`
    );
  } catch (err: any) {
    recordTest('Agent Performance Ranking', false, err.message);
  }

  // -------------------------------------------------------------
  // 7. Date Filter
  // -------------------------------------------------------------
  console.log(`${YELLOW}${BOLD}--- 7. Date Filter ---${RESET}`);
  try {
    const pastYearKPI = await reportingService.getDashboardKPI(
      { startDate: '2020-01-01', endDate: '2020-12-31' },
      adminOp
    );
    const currentYearKPI = await reportingService.getDashboardKPI(
      { startDate: '2026-01-01', endDate: '2026-12-31' },
      adminOp
    );

    const passed =
      pastYearKPI.success === true &&
      currentYearKPI.success === true &&
      pastYearKPI.contracts.total <= currentYearKPI.contracts.total;

    recordTest(
      'Date Range Filtering',
      passed,
      `2020 Deals: ${pastYearKPI.contracts.total}, 2026 Deals: ${currentYearKPI.contracts.total}`
    );
  } catch (err: any) {
    recordTest('Date Range Filtering', false, err.message);
  }

  // -------------------------------------------------------------
  // 8. RBAC 403 Backend Enforcement
  // -------------------------------------------------------------
  console.log(`${YELLOW}${BOLD}--- 8. RBAC 403 Enforcement ---${RESET}`);
  try {
    let staffBlocked = false;
    try {
      await reportingService.exportReport('sales', 'excel', {}, staffOp);
    } catch (err: any) {
      if (err.message.includes('Forbidden') || err.message.includes('403')) {
        staffBlocked = true;
      }
    }

    let adminAllowed = false;
    try {
      const res = await reportingService.exportReport('sales', 'excel', {}, adminOp);
      if (res && res.fileBuffer && res.fileBuffer.length > 0) {
        adminAllowed = true;
      }
    } catch (err) {
      adminAllowed = false;
    }

    const passed = staffBlocked && adminAllowed;
    recordTest(
      'RBAC 403 Backend Enforcement',
      passed,
      `Staff export blocked (403): ${staffBlocked}, Admin allowed: ${adminAllowed}`
    );
  } catch (err: any) {
    recordTest('RBAC 403 Backend Enforcement', false, err.message);
  }

  // -------------------------------------------------------------
  // 9. Export Permission (Excel & CSV)
  // -------------------------------------------------------------
  console.log(`${YELLOW}${BOLD}--- 9. Export Permission (Excel & CSV) ---${RESET}`);
  try {
    const excelExport = await reportingService.exportReport('sales', 'excel', {}, adminOp);
    const csvExport = await reportingService.exportReport('sales', 'csv', {}, managerOp);

    const passed =
      excelExport.fileBuffer instanceof Buffer &&
      excelExport.fileBuffer.length > 0 &&
      excelExport.fileName.endsWith('.xlsx') &&
      csvExport.fileBuffer instanceof Buffer &&
      csvExport.fileBuffer.length > 0 &&
      csvExport.fileName.endsWith('.csv');

    recordTest(
      'Report Export (Excel & CSV)',
      passed,
      `Excel Size: ${excelExport.fileBuffer.length} bytes, CSV Size: ${csvExport.fileBuffer.length} bytes`
    );
  } catch (err: any) {
    recordTest('Report Export (Excel & CSV)', false, err.message);
  }

  // -------------------------------------------------------------
  // 10. Audit Log on Export
  // -------------------------------------------------------------
  console.log(`${YELLOW}${BOLD}--- 10. Audit Log on Export ---${RESET}`);
  try {
    // Generate an export to trigger audit log
    await reportingService.exportReport('payment', 'excel', {}, adminOp);

    // Verify in auditLogsTable
    const recentLogs = await db
      .select()
      .from(auditLogsTable)
      .where(eq(auditLogsTable.action, 'EXPORT_REPORT'))
      .orderBy(desc(auditLogsTable.createdAt))
      .limit(5);

    const passed = recentLogs.length > 0 && recentLogs.some((l) => l.propertyId === 'reports:payment');
    recordTest(
      'Audit Trail Log on Export',
      passed,
      `Found ${recentLogs.length} EXPORT_REPORT entries. Latest: ${recentLogs[0]?.propertyId}`
    );
  } catch (err: any) {
    recordTest('Audit Trail Log on Export', false, err.message);
  }

  // -------------------------------------------------------------
  // 11. Regression B25 — Client CRM Management Lite
  // -------------------------------------------------------------
  console.log(`${YELLOW}${BOLD}--- 11. Regression B25 (Client CRM) ---${RESET}`);
  try {
    const clientResult = await clientService.getClients({}, adminOp);
    const passed = clientResult.clients && clientResult.clients.length > 0;
    recordTest(
      'Regression B25 (Client CRM)',
      passed,
      `Retrieved ${clientResult.clients.length} active clients`
    );
  } catch (err: any) {
    recordTest('Regression B25 (Client CRM)', false, err.message);
  }

  // -------------------------------------------------------------
  // 12. Regression B26 — Lead Sales Pipeline
  // -------------------------------------------------------------
  console.log(`${YELLOW}${BOLD}--- 12. Regression B26 (Sales Pipeline) ---${RESET}`);
  try {
    const pipeline = await clientService.getPipelineSummary(adminOp);
    const passed = pipeline && pipeline.stages && Object.keys(pipeline.stages).length > 0;
    recordTest(
      'Regression B26 (Sales Pipeline)',
      passed,
      `Active pipeline stages: ${Object.keys(pipeline.stages).length}, Total Deal Value: THB ${(pipeline.totalActiveValue || 0).toLocaleString()}`
    );
  } catch (err: any) {
    recordTest('Regression B26 (Sales Pipeline)', false, err.message);
  }

  // -------------------------------------------------------------
  // 13. Regression B27 — Follow-up Task Management
  // -------------------------------------------------------------
  console.log(`${YELLOW}${BOLD}--- 13. Regression B27 (Follow-up Tasks) ---${RESET}`);
  try {
    const followUps = await clientService.getFollowUps({}, adminOp);
    const passed = followUps && Array.isArray(followUps.data);
    recordTest(
      'Regression B27 (Follow-up Tasks)',
      passed,
      `Follow-up records retrieved: ${followUps.data.length}, Overdue count: ${followUps.summary?.overdue ?? 0}`
    );
  } catch (err: any) {
    recordTest('Regression B27 (Follow-up Tasks)', false, err.message);
  }

  // -------------------------------------------------------------
  // 14. Regression B28 — System Administration & Settings
  // -------------------------------------------------------------
  console.log(`${YELLOW}${BOLD}--- 14. Regression B28 (System Settings & Roles) ---${RESET}`);
  try {
    const roles = await systemSettingsService.getRoles();
    const bizSettings = await systemSettingsService.getSettings('business');
    const passed = Array.isArray(roles) && roles.length >= 4 && bizSettings !== undefined;
    recordTest(
      'Regression B28 (System Settings & Roles)',
      passed,
      `Roles configured: ${roles.length}, Company: ${bizSettings?.data?.companyName || 'PEAK REAL ESTATE'}`
    );
  } catch (err: any) {
    recordTest('Regression B28 (System Settings & Roles)', false, err.message);
  }

  // -------------------------------------------------------------
  // SCORECARD SUMMARY
  // -------------------------------------------------------------
  console.log(`\n${CYAN}${BOLD}========================================================================${RESET}`);
  console.log(`${CYAN}${BOLD}                   B29 TEST RESULTS SCORECARD                            ${RESET}`);
  console.log(`${CYAN}${BOLD}========================================================================${RESET}`);

  let totalPassed = 0;
  for (const t of testResults) {
    const status = t.passed ? `${GREEN}[PASS]${RESET}` : `${RED}[FAIL]${RESET}`;
    console.log(`${status}   ${BOLD}${t.name}${RESET}: ${t.details || ''}`);
    if (t.passed) totalPassed++;
  }

  console.log(`\n${BOLD}Total: ${totalPassed} / ${testResults.length} tests passed.${RESET}\n`);

  if (totalPassed < testResults.length) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runB29DashboardReportingTestSuite().catch((err) => {
  console.error('Fatal B29 Test Suite error:', err);
  process.exit(1);
});
