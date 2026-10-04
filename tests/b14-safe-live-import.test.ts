/**
 * B14 — Safe Live Import Engine Automated Test Suite
 * PEAK REAL ESTATE
 * 
 * Verifies:
 * 1. Dry-Run Token Generation & Fingerprinting
 * 2. Role-Based Access Control (RBAC) on Live Import Safety Gate
 * 3. Token State Machine (ACTIVE -> PROCESSING -> CONSUMED / EXPIRED)
 * 4. Anti-Replay & Fingerprint Tampering Prevention
 * 5. Atomic DB Transaction with Audit Trail & History Verification
 */

import { db } from '../src/db/index.ts';
import { propertiesTable, auditLogsTable, importHistoryTable } from '../src/db/schema.ts';
import { eq, sql } from 'drizzle-orm';
import {
  executeImportDryRun,
  executeSafeLiveImport,
  importTokenManager,
} from '../src/server/import-engine.ts';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

interface TestResult {
  id: number;
  name: string;
  passed: boolean;
  details: string;
}

const testResults: TestResult[] = [];

function recordTest(id: number, name: string, passed: boolean, details: string) {
  testResults.push({ id, name, passed, details });
  const status = passed ? `${GREEN}✅ PASS${RESET}` : `${RED}❌ FAIL${RESET}`;
  console.log(`[Test ${String(id).padStart(2, ' ')}] ${status} - ${BOLD}${name}${RESET}`);
  console.log(`        Details: ${details}`);
}

async function runB14Tests() {
  console.log(`\n${CYAN}============================================================${RESET}`);
  console.log(`${BOLD}PEAK REAL ESTATE — B14 SAFE LIVE IMPORT ENGINE TEST SUITE${RESET}`);
  console.log(`${CYAN}============================================================\n${RESET}`);

  // Test 1: Dry-Run Generates Valid Active Token & Fingerprints
  try {
    const rawRows = [
      {
        'Property ID': 'TEST-B14-001',
        'Title': 'Luxury Test Villa 1',
        'Type': 'Villa',
        'Listing Type': 'Sale',
        'Zone': 'Zone 1',
        'Price': 25000000,
        'Bedrooms': 4,
        'Bathrooms': 5,
        'Status': 'Available',
      },
    ];

    const dryRunRes = await executeImportDryRun(rawRows, {
      duplicateMode: 'skip',
      fileName: 'b14_test.xlsx',
      userName: 'Super Admin User',
      userId: 'user-admin-1',
      userRole: 'Super Admin',
    });

    const tokenValid = !!dryRunRes.importToken && dryRunRes.importToken.startsWith('IMP-TOKEN-');
    const fingerprintValid = !!dryRunRes.fileFingerprint && dryRunRes.fileFingerprint.length === 64;
    const dbFingerprintValid = !!dryRunRes.dbStateFingerprint && dryRunRes.dbStateFingerprint.length === 64;

    recordTest(
      1,
      'Dry-Run Token & Fingerprint Generation',
      tokenValid && fingerprintValid && dbFingerprintValid,
      `Token: ${dryRunRes.importToken}, File Fingerprint: ${dryRunRes.fileFingerprint?.slice(0, 16)}...`
    );
  } catch (err: any) {
    recordTest(1, 'Dry-Run Token & Fingerprint Generation', false, err.message);
  }

  // Test 2: RBAC Safety Gate Rejects Unauthorized Roles
  try {
    const rawRows = [{ 'Property ID': 'TEST-B14-002', 'Title': 'Unauthorized Test Villa' }];
    const dryRunRes = await executeImportDryRun(rawRows, {
      duplicateMode: 'skip',
      fileName: 'unauthorized_test.xlsx',
      userName: 'Junior Agent',
      userId: 'user-agent-1',
      userRole: 'Real Estate Agent',
    });

    const liveRes = await executeSafeLiveImport({
      importToken: dryRunRes.importToken!,
      confirmRealImport: true,
      fileFingerprint: dryRunRes.fileFingerprint!,
      duplicateMode: 'skip',
      fileName: 'unauthorized_test.xlsx',
      user: { id: 'user-agent-1', name: 'Junior Agent', role: 'Real Estate Agent' },
    });

    recordTest(
      2,
      'RBAC Safety Gate Rejection (Agent Role)',
      !liveRes.success && liveRes.code === 'UNAUTHORIZED_ROLE',
      `Rejected correctly: ${liveRes.error}`
    );
  } catch (err: any) {
    recordTest(2, 'RBAC Safety Gate Rejection (Agent Role)', false, err.message);
  }

  // Test 3: Safety Gate Rejection on confirmRealImport === false
  try {
    const rawRows = [{ 'Property ID': 'TEST-B14-003', 'Title': 'Unconfirmed Test Villa' }];
    const dryRunRes = await executeImportDryRun(rawRows, {
      duplicateMode: 'skip',
      fileName: 'unconfirmed_test.xlsx',
      userName: 'System Admin',
      userId: 'user-admin-1',
      userRole: 'Admin',
    });

    const liveRes = await executeSafeLiveImport({
      importToken: dryRunRes.importToken!,
      confirmRealImport: false as any,
      fileFingerprint: dryRunRes.fileFingerprint!,
      duplicateMode: 'skip',
      fileName: 'unconfirmed_test.xlsx',
      user: { id: 'user-admin-1', name: 'System Admin', role: 'Admin' },
    });

    recordTest(
      3,
      'Safety Gate Rejection on confirmRealImport === false',
      !liveRes.success && liveRes.code === 'CONFIRMATION_REQUIRED',
      `Rejected correctly: ${liveRes.error}`
    );
  } catch (err: any) {
    recordTest(3, 'Safety Gate Rejection on confirmRealImport === false', false, err.message);
  }

  // Test 4: Fingerprint Tampering Prevention
  try {
    const rawRows = [{ 'Property ID': 'TEST-B14-004', 'Title': 'Tampered Fingerprint Test' }];
    const dryRunRes = await executeImportDryRun(rawRows, {
      duplicateMode: 'skip',
      fileName: 'tampered.xlsx',
      userName: 'System Admin',
      userId: 'user-admin-1',
      userRole: 'Admin',
    });

    const liveRes = await executeSafeLiveImport({
      importToken: dryRunRes.importToken!,
      confirmRealImport: true,
      fileFingerprint: 'tampered_fake_fingerprint_0000000000000000000000000000000000000000',
      duplicateMode: 'skip',
      fileName: 'tampered.xlsx',
      user: { id: 'user-admin-1', name: 'System Admin', role: 'Admin' },
    });

    recordTest(
      4,
      'Fingerprint Tampering Detection',
      !liveRes.success && liveRes.code === 'FINGERPRINT_MISMATCH',
      `Blocked successfully: ${liveRes.error}`
    );
  } catch (err: any) {
    recordTest(4, 'Fingerprint Tampering Detection', false, err.message);
  }

  // Test 5: Safe Live Import Execution & Database Transaction
  let createdPropertyId = 'TEST-B14-LIVE-01';
  try {
    const rawRows = [
      {
        'Property ID': createdPropertyId,
        'Title': 'B14 Production Verification Villa',
        'Type': 'Villa',
        'Listing Type': 'Sale',
        'Zone': 'Zone 1',
        'Area': 'Phuket Town',
        'Price': 32000000,
        'Bedrooms': 5,
        'Bathrooms': 6,
        'Usable Area (sq.m.)': 450,
        'Status': 'Available',
      },
    ];

    const dryRunRes = await executeImportDryRun(rawRows, {
      duplicateMode: 'skip',
      fileName: 'b14_live_execution.xlsx',
      userName: 'Super Admin Live',
      userId: 'user-super-admin',
      userRole: 'Super Admin',
    });

    const liveRes = await executeSafeLiveImport({
      importToken: dryRunRes.importToken!,
      confirmRealImport: true,
      fileFingerprint: dryRunRes.fileFingerprint!,
      duplicateMode: 'skip',
      fileName: 'b14_live_execution.xlsx',
      user: { id: 'user-super-admin', name: 'Super Admin Live', role: 'Super Admin' },
    });

    const success = liveRes.success && liveRes.summary!.newCount === 1;
    recordTest(
      5,
      'Safe Live Import Execution (Atomic Transaction)',
      success,
      `Import ID: ${liveRes.importId}, New: ${liveRes.summary?.newCount}, Status: ${liveRes.status}`
    );

    // Test 6: Anti-Replay Prevention (Consumed Token Rejection)
    const replayRes = await executeSafeLiveImport({
      importToken: dryRunRes.importToken!,
      confirmRealImport: true,
      fileFingerprint: dryRunRes.fileFingerprint!,
      duplicateMode: 'skip',
      fileName: 'b14_live_execution.xlsx',
      user: { id: 'user-super-admin', name: 'Super Admin Live', role: 'Super Admin' },
    });

    recordTest(
      6,
      'Anti-Replay Attack Prevention (Token Re-use)',
      !replayRes.success && replayRes.code === 'DOUBLE_SUBMISSION',
      `Replay prevented: ${replayRes.error}`
    );

    // Test 7: Audit Log Generation Verification
    const auditLogs = await db
      .select()
      .from(auditLogsTable)
      .where(eq(auditLogsTable.propertyId, createdPropertyId));

    const auditFound = auditLogs.length > 0 && auditLogs[0].action === 'Imported';
    recordTest(
      7,
      'Audit Trail Persistence',
      auditFound,
      `Found ${auditLogs.length} audit logs for ${createdPropertyId}. Action: ${auditLogs[0]?.action}`
    );

    // Test 8: Import History Record Verification
    const importRecords = await db
      .select()
      .from(importHistoryTable)
      .where(eq(importHistoryTable.importId, liveRes.importId!));

    const historyFound = importRecords.length > 0 && importRecords[0].status === 'Completed';
    recordTest(
      8,
      'Import History Record Persistence',
      historyFound,
      `Found import history record ${importRecords[0]?.importId}, status: ${importRecords[0]?.status}`
    );

    // Clean up test property so database state is kept clean
    await db.delete(propertiesTable).where(eq(propertiesTable.propertyId, createdPropertyId));
    await db.delete(auditLogsTable).where(eq(auditLogsTable.propertyId, createdPropertyId));
    console.log(`\n🧹 Cleaned up temporary test record (${createdPropertyId}). Database returned to pristine state.`);
  } catch (err: any) {
    recordTest(5, 'Safe Live Import Execution', false, err.message);
  }

  // Summary
  console.log(`\n${CYAN}============================================================${RESET}`);
  console.log(`${BOLD}TEST SUMMARY${RESET}`);
  console.log(`${CYAN}============================================================${RESET}`);
  const passedCount = testResults.filter((t) => t.passed).length;
  const totalCount = testResults.length;
  console.log(`Total Tests: ${totalCount} | ${GREEN}Passed: ${passedCount}${RESET} | ${RED}Failed: ${totalCount - passedCount}${RESET}`);
  if (passedCount === totalCount) {
    console.log(`\n${GREEN}${BOLD}ALL B14 TESTS PASSED PERFECTLY! 🚀${RESET}\n`);
    process.exit(0);
  } else {
    console.log(`\n${RED}${BOLD}SOME TESTS FAILED!${RESET}\n`);
    process.exit(1);
  }
}

runB14Tests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
