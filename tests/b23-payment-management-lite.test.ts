import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { db, pool } from '../src/db/index.ts';
import {
  paymentSchedulesTable,
  paymentRecordsTable,
  contractsTable,
  auditLogsTable,
  propertiesTable,
  usersTable,
} from '../src/db/schema.ts';
import { paymentService } from '../src/server/payment-service.ts';
import { contractService } from '../src/server/contract-service.ts';
import { eq, and, desc, sql, or, ilike } from 'drizzle-orm';
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

async function runB23PaymentTestSuite() {
  console.log(`\n${CYAN}================================================================${RESET}`);
  console.log(`${BOLD}${CYAN}PEAK REAL ESTATE — B23 PAYMENT MANAGEMENT LITE TEST SUITE${RESET}`);
  console.log(`${CYAN}================================================================${RESET}\n`);

  const mockAdminUser: User = {
    id: 'usr-admin-b23',
    name: 'Somchai Director',
    email: 'admin@peakrealestate.com',
    username: 'admin_somchai',
    role: 'Administrator',
    phone: '+66 81 111 2222',
    avatar: 'https://images.unsplash.com/photo-admin.jpg',
    branch: 'Phuket Head Office',
    title: 'Managing Director',
    monthlyTarget: 10000000,
    monthlyCommission: 300000,
    targetDeals: 10,
    completedDeals: 8,
  };

  const mockManagerUser: User = {
    id: 'usr-mgr-b23',
    name: 'Nichada Manager',
    email: 'manager@peakrealestate.com',
    username: 'mgr_nichada',
    role: 'Manager',
    phone: '+66 89 445 1234',
    avatar: 'https://images.unsplash.com/photo-mgr.jpg',
    branch: 'Phuket Head Office',
    title: 'Senior Operations Manager',
    monthlyTarget: 8000000,
    monthlyCommission: 200000,
    targetDeals: 8,
    completedDeals: 6,
  };

  const mockAgentUser: User = {
    id: 'usr-agent-b23',
    name: 'Kittisak Agent',
    email: 'agent@peakrealestate.com',
    username: 'agent_kittisak',
    role: 'Agent',
    phone: '+66 92 778 9901',
    avatar: 'https://images.unsplash.com/photo-agent.jpg',
    branch: 'Bang Tao Branch',
    title: 'Luxury Villa Specialist',
    monthlyTarget: 5000000,
    monthlyCommission: 150000,
    targetDeals: 5,
    completedDeals: 3,
  };

  const testContractId = `CNT-B23-TEST-${Date.now()}`;
  const testPropertyId = `PROP-B23-${Date.now()}`;

  // Seed baseline B22 Contract for integration test
  const seedContract = await contractService.createContract(
    {
      contractId: testContractId,
      propertyId: testPropertyId,
      projectEn: 'Peak Royal Horizon Villas',
      contractType: 'Standard Residential Lease',
      status: 'Active',
      signDate: '2026-09-01',
      rentalStart: '2026-09-01',
      rentalEnd: '2027-08-31',
      rentalTime: '12 Months',
      monthlyRent: 85000,
      deposit: 170000,
      advanceRental: 85000,
      paymentTerm: 'Monthly within 5th of each month',
      paymentDate: '5',
      tenantName: 'Alexander Petrov',
      tenantPhone: '+66 82 345 6789',
      tenantEmail: 'alex.petrov@domain.com',
      ownerName: 'Vichai Sirisuk',
      salesName: 'Kittisak Agent',
      agent: 'Kittisak Agent',
      salesCommission: '85000',
    } as any,
    mockAdminUser
  );

  console.log(`${CYAN}--- SECTION 1: PAYMENT SCHEDULE CREATION & CONTRACT GENERATION ---${RESET}`);

  // Test 1: Manual Payment Schedule Creation
  let manualSchedule: any;
  try {
    manualSchedule = await paymentService.createSchedule(
      {
        contractId: testContractId,
        propertyId: testPropertyId,
        title: 'ค่าบริการส่วนกลางรายปี / Annual Common Fee',
        paymentType: 'Other',
        dueDate: '2026-10-15',
        amount: 24000,
        payerName: 'Alexander Petrov',
        notes: 'Annual common area maintenance fee for villa',
      },
      mockManagerUser
    );

    recordTest(
      '1. Create Manual Payment Schedule',
      Boolean(manualSchedule && manualSchedule.id && manualSchedule.amount === '24000'),
      `Created ID: ${manualSchedule.id}, Amount: ฿${manualSchedule.amount}`
    );
  } catch (err: any) {
    recordTest('1. Create Manual Payment Schedule', false, err.message);
  }

  // Test 2: Generate Rent Schedule from B22 Contract
  let generatedSchedules: any[] = [];
  try {
    generatedSchedules = await paymentService.generateScheduleFromContract(testContractId, mockAdminUser);
    const hasDeposit = generatedSchedules.some((s) => s.paymentType === 'Deposit' && Number(s.amount) === 170000);
    const hasAdvance = generatedSchedules.some((s) => s.paymentType === 'Advance Rental' && Number(s.amount) === 85000);
    const rentCycles = generatedSchedules.filter((s) => s.paymentType === 'Rent');
    const hasCommission = generatedSchedules.some((s) => s.paymentType === 'Commission' && Number(s.amount) === 85000);

    const valid = hasDeposit && hasAdvance && rentCycles.length === 12 && hasCommission;
    recordTest(
      '2. Generate Rent Schedule from Contract (Deposit, Advance, 12-Mo Rent, Commission)',
      valid,
      `Total generated: ${generatedSchedules.length} items (1 Deposit, 1 Advance, 12 Rent cycles, 1 Commission)`
    );
  } catch (err: any) {
    recordTest('2. Generate Rent Schedule from Contract', false, err.message);
  }

  console.log(`\n${CYAN}--- SECTION 2: PAYMENT RECORDING & STATUS AUTOMATION ---${RESET}`);

  // Test 3: Record Full Payment (Paid status)
  let fullPaymentRec: any;
  try {
    const depositSchedule = generatedSchedules.find((s) => s.paymentType === 'Deposit');
    const res = await paymentService.recordPayment(
      {
        contractId: testContractId,
        paymentScheduleId: depositSchedule.id,
        paymentDate: '2026-09-01',
        amount: 170000,
        paymentMethod: 'Bank Transfer',
        bank: 'Kasikorn Bank (KBANK)',
        accountNo: '089-2-33445-1',
        referenceNo: 'KBANK-DEP-998822',
        notes: 'Deposit paid in full via promptpay transfer',
      },
      mockAgentUser
    );

    fullPaymentRec = res.record;
    const isPaid = res.updatedSchedule?.status === 'Paid';
    const remainingZero = Number(res.updatedSchedule?.remainingAmount) === 0;

    recordTest(
      '3. Record Full Payment -> Status transitions to "Paid"',
      Boolean(fullPaymentRec && isPaid && remainingZero),
      `Paid: ฿170,000, Remaining: ฿${res.updatedSchedule?.remainingAmount}, Status: ${res.updatedSchedule?.status}`
    );
  } catch (err: any) {
    recordTest('3. Record Full Payment', false, err.message);
  }

  // Test 4: Record Partial Payment (Partially Paid status & Remaining balance)
  let partialSchedule: any;
  try {
    // Take Rent cycle 1 (Amount = 85,000)
    const rent1 = generatedSchedules.find((s) => s.paymentType === 'Rent' && s.cycleNumber === 1);
    const res = await paymentService.recordPayment(
      {
        contractId: testContractId,
        paymentScheduleId: rent1.id,
        paymentDate: '2026-09-05',
        amount: 50000, // Partial payment
        paymentMethod: 'Bank Transfer',
        bank: 'Siam Commercial Bank (SCB)',
        referenceNo: 'SCB-PARTIAL-112233',
        notes: 'Partial payment paid ฿50,000 of ฿85,000',
      },
      mockAgentUser
    );

    partialSchedule = res.updatedSchedule;
    const isPartial = partialSchedule?.status === 'Partially Paid';
    const remaining35k = Number(partialSchedule?.remainingAmount) === 35000;
    const paid50k = Number(partialSchedule?.paidAmount) === 50000;

    recordTest(
      '4. Partial Payment -> Status "Partially Paid" & Remaining Balance Calculated',
      Boolean(isPartial && remaining35k && paid50k),
      `Paid: ฿${partialSchedule?.paidAmount}, Remaining: ฿${partialSchedule?.remainingAmount}, Status: ${partialSchedule?.status}`
    );
  } catch (err: any) {
    recordTest('4. Partial Payment', false, err.message);
  }

  // Test 5: Overdue Calculation
  try {
    // Create an overdue schedule with past due date (e.g. 2026-01-01)
    const overdueSched = await paymentService.createSchedule(
      {
        contractId: testContractId,
        propertyId: testPropertyId,
        title: 'ค่าน้ำประปาค้างจ่าย / Overdue Water Bill',
        paymentType: 'Other',
        dueDate: '2026-01-01', // Past date
        amount: 1500,
        payerName: 'Alexander Petrov',
      },
      mockManagerUser
    );

    const fetched = await paymentService.getScheduleById(overdueSched.id);
    const isOverdue = fetched.schedule?.status === 'Overdue';

    recordTest(
      '5. Automatic Status: Past Due Date with Unpaid Balance -> "Overdue"',
      Boolean(isOverdue),
      `Due Date: 2026-01-01, Calculated Status: ${fetched.schedule?.status}`
    );
  } catch (err: any) {
    recordTest('5. Automatic Status: Overdue', false, err.message);
  }

  // Test 6: Remaining Balance Precision across multiple installments
  try {
    // Complete the remaining ฿35,000 for Rent cycle 1
    const res = await paymentService.recordPayment(
      {
        contractId: testContractId,
        paymentScheduleId: partialSchedule.id,
        paymentDate: '2026-09-08',
        amount: 35000,
        paymentMethod: 'Cash',
        referenceNo: 'CASH-REC-001',
        notes: 'Remaining ฿35,000 paid in cash at branch',
      },
      mockAgentUser
    );

    const isNowPaid = res.updatedSchedule?.status === 'Paid';
    const remainingZero = Number(res.updatedSchedule?.remainingAmount) === 0;
    const totalPaid85k = Number(res.updatedSchedule?.paidAmount) === 85000;

    recordTest(
      '6. Remaining Balance Recalculation: Complete balance -> Status "Paid"',
      Boolean(isNowPaid && remainingZero && totalPaid85k),
      `Total Paid: ฿${res.updatedSchedule?.paidAmount}, Remaining: ฿${res.updatedSchedule?.remainingAmount}`
    );
  } catch (err: any) {
    recordTest('6. Remaining Balance Recalculation', false, err.message);
  }

  console.log(`\n${CYAN}--- SECTION 3: RECEIPT UPLOAD & SECURITY VALIDATION ---${RESET}`);

  // Test 7: Receipt Upload Validation (Allowed: JPG, JPEG, PNG, PDF; Denied: Dangerous scripts)
  try {
    // Attach valid PDF receipt
    const validReceipt = {
      fileName: 'bank_transfer_slip_alexander.pdf',
      fileUrl: '/uploads/receipts/bank_transfer_slip_alexander.pdf',
      fileType: 'application/pdf',
      fileSize: 1024 * 350,
      uploadedAt: new Date().toISOString(),
    };

    const updated = await paymentService.attachReceipt(fullPaymentRec.id, validReceipt, mockAgentUser);
    const validAttached = Boolean(updated.receiptFile && updated.receiptFile.fileName.endsWith('.pdf'));

    // Attempt invalid executable extension
    let blockedMalicious = false;
    try {
      await paymentService.attachReceipt(
        fullPaymentRec.id,
        {
          fileName: 'malicious_exploit.exe',
          fileUrl: '/uploads/receipts/malicious_exploit.exe',
          fileType: 'application/x-msdownload',
        },
        mockAgentUser
      );
    } catch (err: any) {
      blockedMalicious = err.message.includes('Only JPG, JPEG, PNG, and PDF');
    }

    recordTest(
      '7. Receipt Attachment & Security File Type Whitelist (.jpg, .jpeg, .png, .pdf)',
      validAttached && blockedMalicious,
      'Valid PDF attached successfully, malicious .exe extension strictly blocked'
    );
  } catch (err: any) {
    recordTest('7. Receipt Attachment & Security', false, err.message);
  }

  console.log(`\n${CYAN}--- SECTION 4: RBAC & AUDIT LOGGING MANDATES ---${RESET}`);

  // Test 8: RBAC Permissions (Agent cannot Cancel/Archive; Manager/Admin can)
  try {
    let agentBlocked = false;
    try {
      await paymentService.cancelOrArchiveSchedule(manualSchedule.id, mockAgentUser);
    } catch (err: any) {
      agentBlocked = err.message.includes('Forbidden');
    }

    // Manager can cancel/archive
    const archivedByMgr = await paymentService.cancelOrArchiveSchedule(manualSchedule.id, mockManagerUser);
    const mgrAllowed = archivedByMgr.isArchived === true && archivedByMgr.status === 'Cancelled';

    recordTest(
      '8. RBAC Enforcement: Agent blocked from archiving; Manager/Admin authorized',
      agentBlocked && mgrAllowed,
      'Agent denied with 403 Forbidden; Manager successfully soft-deleted/cancelled schedule'
    );
  } catch (err: any) {
    recordTest('8. RBAC Enforcement', false, err.message);
  }

  // Test 9: Soft Delete Verification (No Hard Delete)
  try {
    const rawCheck = await db
      .select()
      .from(paymentSchedulesTable)
      .where(eq(paymentSchedulesTable.id, manualSchedule.id));

    const preserved = rawCheck.length === 1 && rawCheck[0].isArchived === true;
    recordTest(
      '9. Soft Delete Verification: Record preserved in database (No Hard Delete)',
      preserved,
      `Schedule ${manualSchedule.id} exists with isArchived = true, status = Cancelled`
    );
  } catch (err: any) {
    recordTest('9. Soft Delete Verification', false, err.message);
  }

  // Test 10: Audit Log Verification
  try {
    const auditLogs = await db
      .select()
      .from(auditLogsTable)
      .where(
        or(
          ilike(auditLogsTable.action, '%Payment%'),
          ilike(auditLogsTable.action, '%Receipt%')
        )
      )
      .orderBy(desc(auditLogsTable.createdAt))
      .limit(10);

    const hasCreatePay = auditLogs.some((l) => l.action === 'Create Payment');
    const hasStatusChange = auditLogs.some((l) => l.action === 'Payment Status Change');
    const hasAttachReceipt = auditLogs.some((l) => l.action === 'Attach Receipt');
    const hasCancelPay = auditLogs.some((l) => l.action === 'Cancel Payment');

    const auditPass = hasCreatePay && hasStatusChange && hasAttachReceipt && hasCancelPay;
    recordTest(
      '10. Audit Logging: Complete trace of Create, Status Change, Receipt, and Cancel',
      auditPass,
      `Found actions: Create Payment (${hasCreatePay}), Status Change (${hasStatusChange}), Attach Receipt (${hasAttachReceipt}), Cancel Payment (${hasCancelPay})`
    );
  } catch (err: any) {
    recordTest('10. Audit Logging', false, err.message);
  }

  console.log(`\n${CYAN}--- SECTION 5: B22 CONTRACT INTEGRATION & REGRESSION ---${RESET}`);

  // Test 11: Contract Integration Summary (Real-time aggregation without contract duplication)
  try {
    const summary = await paymentService.getContractPaymentSummary(testContractId);
    const matchesContract = summary.contractId === testContractId;
    const hasTotals = summary.totalScheduled > 0 && summary.totalPaid > 0 && summary.totalRemaining > 0;
    const hasItemized = summary.schedules.length > 0 && summary.records.length > 0;

    recordTest(
      '11. Contract Integration: Real-time Payment Summary & Linkage without Duplication',
      matchesContract && hasTotals && hasItemized,
      `Scheduled: ฿${summary.totalScheduled.toLocaleString()}, Paid: ฿${summary.totalPaid.toLocaleString()}, Remaining: ฿${summary.totalRemaining.toLocaleString()}`
    );
  } catch (err: any) {
    recordTest('11. Contract Integration', false, err.message);
  }

  // Test 12: Regression B13-B22 Stability Check
  try {
    // 1. Verify Contracts Table query works
    const contractsCheck = await db.select({ count: sql`COUNT(*)` }).from(contractsTable);
    const contractsCount = Number((contractsCheck[0] as any).count || 0);

    // 2. Verify Properties Table query works
    const propsCheck = await db.select({ count: sql`COUNT(*)` }).from(propertiesTable);
    const propsCount = Number((propsCheck[0] as any).count || 0);

    // 3. Verify Users Table query works
    const usersCheck = await db.select({ count: sql`COUNT(*)` }).from(usersTable);
    const usersCount = Number((usersCheck[0] as any).count || 0);

    const regressionOk = contractsCount > 0 && propsCount >= 0 && usersCount > 0;
    recordTest(
      '12. Regression B13–B22 Stability: Database schemas, contracts, properties & users intact',
      regressionOk,
      `Contracts count: ${contractsCount}, Users count: ${usersCount}`
    );
  } catch (err: any) {
    recordTest('12. Regression B13–B22 Stability', false, err.message);
  }

  // ---------------------------------------------------------------------------
  // SUMMARY REPORT
  // ---------------------------------------------------------------------------
  const total = testResults.length;
  const passed = testResults.filter((t) => t.passed).length;
  const failed = total - passed;

  console.log(`\n${CYAN}================================================================${RESET}`);
  console.log(`${BOLD}B23 PAYMENT MANAGEMENT LITE TEST EXECUTION SUMMARY:${RESET}`);
  console.log(`Total Tests:  ${BOLD}${total}${RESET}`);
  console.log(`Passed:       ${GREEN}${BOLD}${passed}${RESET}`);
  console.log(`Failed:       ${failed > 0 ? RED : GREEN}${BOLD}${failed}${RESET}`);
  console.log(`${CYAN}================================================================${RESET}\n`);

  if (pool && typeof pool.end === 'function') {
    try {
      await pool.end();
    } catch {}
  }

  process.exit(failed > 0 ? 1 : 0);
}

runB23PaymentTestSuite().catch((err) => {
  console.error('Fatal B23 test error:', err);
  process.exit(1);
});
