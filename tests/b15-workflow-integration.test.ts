/**
 * B15 — Import UI & Production Workflow Integration Verification Suite
 * PEAK REAL ESTATE
 */

import { db } from '../src/db/index.ts';
import { propertiesTable, auditLogsTable, importHistoryTable } from '../src/db/schema.ts';
import { eq, sql } from 'drizzle-orm';
import {
  executeImportDryRun,
  executeSafeLiveImport,
  importTokenManager,
  analyzeColumnMapping,
  validateFileSecurity,
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

async function runB15TestSuite() {
  console.log(`${CYAN}============================================================${RESET}`);
  console.log(`${BOLD}PEAK REAL ESTATE — B15 WORKFLOW INTEGRATION TEST SUITE${RESET}`);
  console.log(`${CYAN}============================================================${RESET}`);

  // Test 1: Upload Security Validation (Magic Bytes & File Inspection)
  try {
    const fakeCsvBuffer = Buffer.from('Property ID,Title,Price\nB15-PROP-01,Test Villa,15000000', 'utf-8');
    const result = validateFileSecurity('test_b15.csv', fakeCsvBuffer.length, fakeCsvBuffer, 'text/csv');
    const passed = result.isValid && result.cleanFileName === 'test_b15.csv' && result.detectedType === 'csv';
    recordTest(1, 'Upload Security Inspection (CSV)', passed, `Valid: ${result.isValid}, CleanName: ${result.cleanFileName}`);
  } catch (err: any) {
    recordTest(1, 'Upload Security Inspection (CSV)', false, err.message);
  }

  // Test 2: Smart Column Mapping Analysis with Thai and English Headers
  try {
    const rawHeaders = ['รหัสทรัพย์', 'ชื่อโครงการ', 'ประเภททรัพย์', 'ราคาขาย', 'โซน'];
    const analysis = analyzeColumnMapping(rawHeaders);
    const hasPropId = analysis.mappedFields.some((m) => m.sourceColumn === 'รหัสทรัพย์' && m.targetField === 'propertyId');
    const hasTitle = analysis.mappedFields.some((m) => m.sourceColumn === 'ชื่อโครงการ' && m.targetField === 'title');
    const hasPrice = analysis.mappedFields.some((m) => m.sourceColumn === 'ราคาขาย' && m.targetField === 'price');
    const passed = hasPropId && hasTitle && hasPrice;
    recordTest(2, 'Smart Column Mapping (Thai Synonyms)', passed, `Mapped: ${analysis.mappedFields.length} fields accurately`);
  } catch (err: any) {
    recordTest(2, 'Smart Column Mapping (Thai Synonyms)', false, err.message);
  }

  // Test 3: Dry-Run Simulation (Token TTL, Fingerprint, 0 DB Mutations)
  let dryRunToken = '';
  let dryRunFingerprint = '';
  const createdPropertyId = 'B15-VERIFY-01';

  try {
    const initialProps = await db.select({ count: sql<number>`count(*)::int` }).from(propertiesTable);
    const initialCount = initialProps[0]?.count || 0;

    const dryRun = await executeImportDryRun(
      [
        {
          'Property ID': createdPropertyId,
          'Title': 'B15 Production Verification Villa',
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
      ],
      {
        duplicateMode: 'skip',
        fileName: 'b15_production_batch.xlsx',
        userName: 'Super Admin',
        userId: 'u-admin-01',
        userRole: 'Super Admin',
      }
    );

    const postProps = await db.select({ count: sql<number>`count(*)::int` }).from(propertiesTable);
    const postCount = postProps[0]?.count || 0;

    const zeroMutation = initialCount === postCount;
    const tokenValid = !!dryRun.importToken && dryRun.importToken.startsWith('IMP-TOKEN-');
    dryRunToken = dryRun.importToken;
    dryRunFingerprint = dryRun.fileFingerprint;

    const passed = zeroMutation && tokenValid && dryRun.summary.newCount === 1;
    recordTest(
      3,
      'Dry-Run Simulation (Zero Mutation Guarantee)',
      passed,
      `Token: ${dryRunToken}, DB delta: ${postCount - initialCount}, New: ${dryRun.summary.newCount}`
    );
  } catch (err: any) {
    recordTest(3, 'Dry-Run Simulation (Zero Mutation Guarantee)', false, err.message);
  }

  // Test 4: Role-Based Access Control on Live Commit (Agent role blocked)
  try {
    const agentRes = await executeSafeLiveImport({
      importToken: dryRunToken,
      confirmRealImport: true,
      fileFingerprint: dryRunFingerprint,
      duplicateMode: 'skip',
      fileName: 'b15_production_batch.xlsx',
      user: {
        id: 'u-agent-01',
        name: 'Somchai Agent',
        role: 'Real Estate Agent',
      },
    });

    const agentBlocked = !agentRes.success && agentRes.code === 'UNAUTHORIZED_ROLE';
    recordTest(4, 'RBAC Authorization Barrier on Safety Gate', agentBlocked, `Agent rejected: ${agentRes.error}`);
  } catch (err: any) {
    recordTest(4, 'RBAC Authorization Barrier on Safety Gate', false, err.message);
  }

  // Test 5: Live Import Execution with Super Admin (Atomic Transaction)
  let liveImportId = '';
  try {
    const liveRes = await executeSafeLiveImport({
      importToken: dryRunToken,
      confirmRealImport: true,
      fileFingerprint: dryRunFingerprint,
      duplicateMode: 'skip',
      fileName: 'b15_production_batch.xlsx',
      user: {
        id: 'u-admin-01',
        name: 'Super Admin',
        role: 'Super Admin',
      },
    });

    liveImportId = liveRes.importId || '';
    const passed = liveRes.success && liveRes.summary?.newCount === 1 && liveRes.affectedPropertyIds?.includes(createdPropertyId);
    recordTest(
      5,
      'Live Import Execution (Atomic Transaction)',
      passed,
      `ImportId: ${liveImportId}, Affected IDs: ${liveRes.affectedPropertyIds?.join(', ')}`
    );
  } catch (err: any) {
    recordTest(5, 'Live Import Execution (Atomic Transaction)', false, err.message);
  }

  // Test 6: Anti-Replay Protection (Token Consumed)
  try {
    const replayRes = await executeSafeLiveImport({
      importToken: dryRunToken,
      confirmRealImport: true,
      fileFingerprint: dryRunFingerprint,
      duplicateMode: 'skip',
      fileName: 'b15_production_batch.xlsx',
      user: {
        id: 'u-admin-01',
        name: 'Super Admin',
        role: 'Super Admin',
      },
    });

    const replayBlocked = !replayRes.success && replayRes.code === 'DOUBLE_SUBMISSION';
    recordTest(6, 'Anti-Replay Attack Protection', replayBlocked, `Replay prevented: ${replayRes.error}`);
  } catch (err: any) {
    recordTest(6, 'Anti-Replay Attack Protection', false, err.message);
  }

  // Test 7: Audit Trail Verification in PostgreSQL
  try {
    const auditEntries = await db
      .select()
      .from(auditLogsTable)
      .where(eq(auditLogsTable.propertyId, createdPropertyId));
    const passed = auditEntries.length > 0 && auditEntries[0].action === 'Imported';
    recordTest(7, 'Audit Trail Verification', passed, `Found ${auditEntries.length} audit logs. Action: ${auditEntries[0]?.action}`);
  } catch (err: any) {
    recordTest(7, 'Audit Trail Verification', false, err.message);
  }

  // Test 8: Import History Verification in PostgreSQL
  try {
    const historyEntries = await db
      .select()
      .from(importHistoryTable)
      .where(eq(importHistoryTable.importId, liveImportId));
    const passed = historyEntries.length > 0 && historyEntries[0].status === 'Completed';
    recordTest(
      8,
      'Import History Record Verification',
      passed,
      `Found import record: ${historyEntries[0]?.importId}, Status: ${historyEntries[0]?.status}`
    );
  } catch (err: any) {
    recordTest(8, 'Import History Record Verification', false, err.message);
  }

  // Cleanup: Delete test property and audit log to keep database pristine
  try {
    await db.delete(propertiesTable).where(eq(propertiesTable.propertyId, createdPropertyId));
    await db.delete(auditLogsTable).where(eq(auditLogsTable.propertyId, createdPropertyId));
    console.log(`\n🧹 Cleaned up temporary test record (${createdPropertyId}). Database returned to pristine state.`);
  } catch (err) {
    console.error('Cleanup warning:', err);
  }

  console.log(`\n${CYAN}============================================================${RESET}`);
  console.log(`${BOLD}B15 INTEGRATION TEST SUMMARY${RESET}`);
  console.log(`${CYAN}============================================================${RESET}`);
  const total = testResults.length;
  const passedCount = testResults.filter((t) => t.passed).length;
  const failedCount = total - passedCount;

  console.log(`Total Tests: ${total} | ${GREEN}Passed: ${passedCount}${RESET} | ${failedCount > 0 ? RED : ''}Failed: ${failedCount}${RESET}`);

  if (failedCount === 0) {
    console.log(`${GREEN}${BOLD}ALL B15 TESTS PASSED PERFECTLY! 🚀${RESET}\n`);
    process.exit(0);
  } else {
    console.log(`${RED}${BOLD}SOME B15 TESTS FAILED.${RESET}\n`);
    process.exit(1);
  }
}

runB15TestSuite().catch((err) => {
  console.error('Fatal error in B15 test runner:', err);
  process.exit(1);
});
