/**
 * B16 — Import Management & Data Quality Center Automated Test Suite
 * PEAK REAL ESTATE
 */

import assert from 'node:assert';
import { dbService } from '../src/server/db-service.ts';
import { scanPropertyDataQuality } from '../src/server/data-quality-service.ts';
import { executeImportDryRun, executeSafeLiveImport } from '../src/server/import-engine.ts';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

async function runB16Tests() {
  console.log(`${BOLD}${CYAN}====================================================${RESET}`);
  console.log(`${BOLD}${CYAN}  PEAK REAL ESTATE — B16 AUTOMATED TEST SUITE       ${RESET}`);
  console.log(`${BOLD}${CYAN}  Import Management, Audit Trail & Data Quality     ${RESET}`);
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

  const testUser = {
    id: 'user-b16-admin',
    name: 'B16 System Administrator',
    role: 'Super Admin',
  };

  let createdImportId = '';

  // Step 0: Execute a test import to guarantee rich B16 metadata
  try {
    const rawRows = [
      {
        'Property ID': `B16-TEST-${Date.now()}`,
        'Title': 'B16 Luxury Sea View Villa',
        'Type': 'Villa',
        'Listing Type': 'Sale',
        'Zone': 'Zone 3',
        'Area': 'Kata',
        'Price': 25000000,
        'Bedrooms': 4,
        'Bathrooms': 5,
        'Usable Area (Sq.M.)': 450,
        'Status': 'Available',
      },
    ];

    const dryRun = await executeImportDryRun(rawRows, {
      duplicateMode: 'skip',
      fileName: 'b16_validation_batch.xlsx',
      userName: testUser.name,
      userId: testUser.id,
      userRole: testUser.role,
    });

    const liveRes = await executeSafeLiveImport({
      importToken: dryRun.importToken!,
      confirmRealImport: true,
      fileFingerprint: dryRun.fileFingerprint!,
      duplicateMode: 'skip',
      fileName: 'b16_validation_batch.xlsx',
      user: testUser,
    });

    if (!liveRes.success) {
      console.error('liveRes failed:', liveRes);
    }
    assert.ok(liveRes.success && liveRes.importId, 'Live import must succeed');
    createdImportId = liveRes.importId!;
  } catch (err: any) {
    console.error('Setup failed:', err);
  }

  // Test 1: Data Quality Scanner on Database
  try {
    const report = await scanPropertyDataQuality();
    const ok =
      !!report &&
      !!report.summary &&
      typeof report.summary.totalProperties === 'number' &&
      report.summary.totalProperties >= 1 &&
      typeof report.summary.valid === 'number' &&
      Array.isArray(report.issues);

    record(
      1,
      'Data Quality Scanner Execution',
      ok,
      `Total: ${report.summary.totalProperties}, Valid: ${report.summary.valid}, Warnings: ${report.summary.warnings}, Errors: ${report.summary.errors}`
    );
  } catch (err: any) {
    record(1, 'Data Quality Scanner Execution', false, err.message);
  }

  // Test 2: Search Import History
  try {
    const searchById: any = await dbService.getImportHistory({ search: createdImportId });
    const searchByFile: any = await dbService.getImportHistory({ search: 'b16_validation' });
    const searchByOp: any = await dbService.getImportHistory({ search: 'B16 System Administrator' });

    const ok =
      searchById.items.length >= 1 &&
      searchById.items[0].importId === createdImportId &&
      searchByFile.items.length >= 1 &&
      searchByOp.items.length >= 1;

    record(2, 'Import History Search (ID, Filename, Operator)', ok);
  } catch (err: any) {
    record(2, 'Import History Search (ID, Filename, Operator)', false, err.message);
  }

  // Test 3: Pagination and Sorting
  try {
    const page1: any = await dbService.getImportHistory({
      page: 1,
      pageSize: 2,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });

    const ok =
      page1.items.length <= 2 &&
      page1.totalCount >= 1 &&
      page1.page === 1 &&
      page1.pageSize === 2 &&
      page1.totalPages >= 1;

    record(3, 'Import History Pagination & Sorting', ok, `Total records: ${page1.totalCount}, Pages: ${page1.totalPages}`);
  } catch (err: any) {
    record(3, 'Import History Pagination & Sorting', false, err.message);
  }

  // Test 4: Drill-Down Detail & Masked Token Security
  try {
    const detail = await dbService.getImportDetail(createdImportId);
    const ok =
      !!detail &&
      detail.importId === createdImportId &&
      detail.rows.length >= 1 &&
      typeof detail.maskedToken === 'string' &&
      detail.maskedToken.startsWith('••••••••') &&
      !detail.maskedToken.includes('IMP-TOKEN-') &&
      typeof detail.maskedFingerprint === 'string' &&
      detail.maskedFingerprint.startsWith('••••••••');

    record(
      4,
      'Drill-Down Detail with Token & Fingerprint Masking',
      ok,
      `Masked Token: ${detail?.maskedToken}, Masked Fingerprint: ${detail?.maskedFingerprint}`
    );
  } catch (err: any) {
    record(4, 'Drill-Down Detail with Token & Fingerprint Masking', false, err.message);
  }

  // Test 5: Audit Trail Linking
  try {
    const detail = await dbService.getImportDetail(createdImportId);
    const auditSearch: any = await dbService.getAuditLogs({ search: createdImportId });

    const ok =
      !!detail &&
      Array.isArray(detail.auditLogs) &&
      detail.auditLogs.length >= 1 &&
      auditSearch.items.length >= 1;

    record(5, 'Audit Trail Linking & Cross-Search by Import ID', ok, `Found ${detail?.auditLogs?.length} linked audit records`);
  } catch (err: any) {
    record(5, 'Audit Trail Linking & Cross-Search by Import ID', false, err.message);
  }

  // Test 6: CSV Export & Formula Injection Defense
  try {
    const csvOutput = await dbService.exportImportHistoryCsv({ search: createdImportId });
    const evilInputs = ['=cmd|/c calc', '+12345', '-SUM(A1:A10)', '@maliciousURL'];
    const escapedCheck = evilInputs.every((e) => dbService.escapeFormulaInjection(e).startsWith("'"));

    const ok =
      typeof csvOutput === 'string' &&
      csvOutput.includes('Import ID,Filename,Operator') &&
      csvOutput.includes(createdImportId) &&
      escapedCheck;

    record(6, 'CSV Export with Formula Injection Defense', ok, 'Formula characters (=,+,-,@) escaped with leading single quote');
  } catch (err: any) {
    record(6, 'CSV Export with Formula Injection Defense', false, err.message);
  }

  // Test 7: Affected Properties Cross-Reference Tracking
  try {
    const detail = await dbService.getImportDetail(createdImportId);
    const ok =
      !!detail &&
      Array.isArray(detail.affectedPropertyIds) &&
      detail.affectedPropertyIds.length >= 1;

    record(7, 'Affected Property IDs Tracking in Import Metadata', ok, `Affected: ${detail?.affectedPropertyIds?.join(', ')}`);
  } catch (err: any) {
    record(7, 'Affected Property IDs Tracking in Import Metadata', false, err.message);
  }

  // Test 8: Data Quality Filter by Severity and Field
  try {
    const errorReport = await scanPropertyDataQuality({ severity: 'Error' });
    const warningReport = await scanPropertyDataQuality({ severity: 'Warning' });

    const ok =
      errorReport.issues.every((i) => i.severity === 'Error') &&
      warningReport.issues.every((i) => i.severity === 'Warning');

    record(8, 'Data Quality Filter by Severity (Error vs Warning)', ok, `Warnings: ${warningReport.issues.length}, Errors: ${errorReport.issues.length}`);
  } catch (err: any) {
    record(8, 'Data Quality Filter by Severity (Error vs Warning)', false, err.message);
  }

  // Clean up temporary test records to preserve pristine DB baseline
  try {
    const { db } = await import('../src/db/index.ts');
    const { propertiesTable } = await import('../src/db/schema.ts');
    const { ilike } = await import('drizzle-orm');
    await db.delete(propertiesTable).where(ilike(propertiesTable.propertyId, 'B16-TEST%'));
    console.log(`  ${CYAN}🧹 Cleaned up temporary B16 test records. Database returned to pristine baseline.${RESET}`);
  } catch (cleanErr) {
    console.warn('Cleanup warning:', cleanErr);
  }

  console.log(`\n${BOLD}B16 Test Results: ${passed} PASS, ${failed} FAIL${RESET}`);

  if (failed === 0) {
    console.log(`${BOLD}${GREEN}All B16 Requirements Verified Successfully!${RESET}\n`);
    process.exit(0);
  } else {
    console.error(`${BOLD}${RED}Some B16 Tests Failed.${RESET}\n`);
    process.exit(1);
  }
}

runB16Tests().catch((err) => {
  console.error('B16 Test Runner crashed:', err);
  process.exit(1);
});
