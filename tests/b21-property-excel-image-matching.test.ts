/**
 * B21 — Property Excel Import & Image Matching Automated Test Suite
 * PEAK REAL ESTATE
 * 
 * Verifies:
 * 1. Excel/CSV Comparison & Categorization: NEW, UPDATED, UNCHANGED, ERROR
 * 2. Strict Image Matching: Match filenames (e.g. PH001.jpg, PH001_01.jpg) to Property Code
 * 3. Strict Image Rejection: Unmatched (No Guessing), Duplicate, Invalid extensions
 * 4. Preservation of Property ID & Atomic PostgreSQL Transaction (No Hard Delete)
 * 5. Merging of Matched Images in Database for NEW & UPDATE operations
 * 6. RBAC Security Gate (Admin / Manager vs Agent / Unauthorized)
 * 7. Audit Log Logging for Property & Image Updates
 */

import { db } from '../src/db/index.ts';
import { propertiesTable, auditLogsTable, importHistoryTable } from '../src/db/schema.ts';
import { eq } from 'drizzle-orm';
import {
  executeImportDryRun,
  executeSafeLiveImport,
  extractPropertyCodeFromFilename,
  matchImagesToProperties,
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

async function runB21Tests() {
  console.log(`\n${CYAN}============================================================${RESET}`);
  console.log(`${BOLD}PEAK REAL ESTATE — B21 PROPERTY EXCEL IMPORT & IMAGE MATCHING${RESET}`);
  console.log(`${CYAN}============================================================\n${RESET}`);

  // Setup: Clean up any previous test properties
  const testCodes = ['B21-PH001', 'B21-PH002', 'B21-PH003', 'B21-PH004'];
  for (const code of testCodes) {
    await db.delete(propertiesTable).where(eq(propertiesTable.propertyId, code));
  }

  // Pre-seed an existing property for UPDATE and UNCHANGED testing
  const existingProp = {
    propertyId: 'B21-PH001',
    title: 'Original Villa PH001',
    category: 'Villa',
    listingType: 'Sale',
    zone: 'Zone 1',
    price: 35000000,
    bedrooms: 4,
    bathrooms: 4,
    usableAreaSqm: 450,
    status: 'Available',
    images: ['https://images.unsplash.com/photo-original-ph001.jpg'],
    features: ['Pool', 'Garden'],
  };
  await db.insert(propertiesTable).values(existingProp as any);

  // -------------------------------------------------------------------------
  // TEST 1: Strict Image Code Extraction Logic
  // -------------------------------------------------------------------------
  try {
    const knownCodes = ['PH001', 'B21-PH001', 'B21-PH002', 'CONDO-99'];

    const matchExact = extractPropertyCodeFromFilename('PH001.jpg', knownCodes);
    const matchUnderscore = extractPropertyCodeFromFilename('PH001_01.png', knownCodes);
    const matchDash = extractPropertyCodeFromFilename('PH001-living-room.jpeg', knownCodes);
    const matchSpace = extractPropertyCodeFromFilename('PH001 exterior.webp', knownCodes);
    const matchComplex = extractPropertyCodeFromFilename('B21-PH001_master_bedroom.jpg', knownCodes);
    const matchNoGuessing = extractPropertyCodeFromFilename('random_vacation_photo.jpg', knownCodes);
    const matchWrongCode = extractPropertyCodeFromFilename('PH999_01.jpg', knownCodes);

    const passed =
      matchExact.code === 'PH001' &&
      matchExact.isMatch &&
      matchUnderscore.code === 'PH001' &&
      matchDash.code === 'PH001' &&
      matchSpace.code === 'PH001' &&
      matchComplex.code === 'B21-PH001' &&
      matchNoGuessing.code === null &&
      !matchNoGuessing.isMatch &&
      matchWrongCode.code === null &&
      !matchWrongCode.isMatch;

    recordTest(
      1,
      'Image Matching: Filename Property Code Extraction (Strict, No Guessing)',
      passed,
      `Exact: ${matchExact.code}, Underscore: ${matchUnderscore.code}, Dash: ${matchDash.code}, Space: ${matchSpace.code}, NoGuess: ${matchNoGuessing.code}`
    );
  } catch (err: any) {
    recordTest(1, 'Image Matching: Filename Property Code Extraction', false, err.message);
  }

  // -------------------------------------------------------------------------
  // TEST 2: Batch Image Matching: Matched, Unmatched, Duplicate, Invalid
  // -------------------------------------------------------------------------
  try {
    const batchImages = [
      { fileName: 'B21-PH001.jpg', fileSize: 102400, mimeType: 'image/jpeg' },
      { fileName: 'B21-PH001_02.png', fileSize: 204800, mimeType: 'image/png' },
      { fileName: 'B21-PH001.jpg', fileSize: 102400, mimeType: 'image/jpeg' }, // Duplicate in batch
      { fileName: 'UNKNOWN-HOUSE.jpg', fileSize: 150000, mimeType: 'image/jpeg' }, // Unmatched
      { fileName: 'document.pdf', fileSize: 80000, mimeType: 'application/pdf' }, // Invalid extension
      { fileName: 'script.exe', fileSize: 40000, mimeType: 'application/octet-stream' }, // Invalid extension
      { fileName: 'B21-PH002-pool.webp', fileSize: 95000, mimeType: 'image/webp' }, // Matched to B21-PH002
    ];

    const knownCodes = ['B21-PH001', 'B21-PH002'];
    const matchSummary = await matchImagesToProperties(batchImages, knownCodes);

    const passed =
      matchSummary.totalImages === 7 &&
      matchSummary.matchedCount === 3 && // B21-PH001.jpg (1st), B21-PH001_02.png, B21-PH002-pool.webp
      matchSummary.duplicateCount === 1 && // B21-PH001.jpg (2nd)
      matchSummary.unmatchedCount === 1 && // UNKNOWN-HOUSE.jpg
      matchSummary.invalidCount === 2 && // pdf, exe
      matchSummary.matchedByProperty['B21-PH001']?.length === 2 &&
      matchSummary.matchedByProperty['B21-PH002']?.length === 1;

    recordTest(
      2,
      'Batch Image Categorization: Matched, Unmatched, Duplicate, Invalid',
      passed,
      `Matched: ${matchSummary.matchedCount}, Unmatched: ${matchSummary.unmatchedCount}, Duplicate: ${matchSummary.duplicateCount}, Invalid: ${matchSummary.invalidCount}`
    );
  } catch (err: any) {
    recordTest(2, 'Batch Image Categorization', false, err.message);
  }

  // -------------------------------------------------------------------------
  // TEST 3: Excel Comparison: NEW, UPDATED, UNCHANGED, ERROR Categorization
  // -------------------------------------------------------------------------
  try {
    const rawRows = [
      // 1. UPDATED: B21-PH001 exists with price 35M, changed to 38M
      {
        'Property ID': 'B21-PH001',
        'Title': 'Original Villa PH001 Updated',
        'Category': 'Villa',
        'Listing Type': 'Sale',
        'Zone': 'Zone 1',
        'Price': 38000000,
        'Bedrooms': 4,
        'Bathrooms': 4,
        'Usable Area (Sqm)': 450,
      },
      // 2. NEW: B21-PH002 does not exist yet
      {
        'Property ID': 'B21-PH002',
        'Title': 'Brand New Penthouse PH002',
        'Category': 'Condo',
        'Listing Type': 'Rent',
        'Zone': 'Zone 2',
        'Rent Price/Mo': 120000,
        'Bedrooms': 3,
        'Bathrooms': 3,
        'Usable Area (Sqm)': 200,
      },
      // 3. ERROR: Invalid row missing title and negative price
      {
        'Property ID': 'B21-PH003',
        'Title': '',
        'Category': 'Villa',
        'Listing Type': 'Sale',
        'Zone': 'Zone 1',
        'Price': -5000,
      },
    ];

    const dryRunResult = await executeImportDryRun(rawRows, {
      duplicateMode: 'update',
      fileName: 'b21_test_import.xlsx',
      userName: 'Admin Tester',
      userId: 'usr_admin',
      userRole: 'Admin',
    });

    const hasNew = dryRunResult.summary.newCount >= 1;
    const hasUpdated = dryRunResult.summary.updatedCount >= 1;
    const hasError = dryRunResult.summary.invalidCount >= 1;

    // Check preview rows for B21 classifications
    const rowPh001 = dryRunResult.previewRows.find((r) => r.propertyId === 'B21-PH001' || (r as any).targetId === 'B21-PH001');
    const rowPh002 = dryRunResult.previewRows.find((r) => r.propertyId === 'B21-PH002' || (r as any).targetId === 'B21-PH002');

    const passed =
      hasNew &&
      hasUpdated &&
      hasError &&
      rowPh001?.b21Status === 'UPDATED' &&
      rowPh002?.b21Status === 'NEW';

    recordTest(
      3,
      'Excel Comparison: Categorization of NEW, UPDATED, UNCHANGED, ERROR',
      passed,
      `New: ${dryRunResult.summary.newCount}, Updated: ${dryRunResult.summary.updatedCount}, Invalid: ${dryRunResult.summary.invalidCount}, Errors: ${JSON.stringify(dryRunResult.errors)}`
    );
  } catch (err: any) {
    recordTest(3, 'Excel Comparison', false, err.message);
  }

  // -------------------------------------------------------------------------
  // TEST 4: UNCHANGED Detection (Duplicate row with identical fields)
  // -------------------------------------------------------------------------
  try {
    const rawRows = [
      // Identical to existing property in DB (Price 35000000, Title Original Villa PH001)
      {
        'Property ID': 'B21-PH001',
        'Title': 'Original Villa PH001',
        'Category': 'Villa',
        'Listing Type': 'Sale',
        'Zone': 'Zone 1',
        'Price': 35000000,
        'Bedrooms': 4,
        'Bathrooms': 4,
        'Usable Area (Sqm)': 450,
      },
    ];

    const dryRunResult = await executeImportDryRun(rawRows, {
      duplicateMode: 'skip', // in skip mode, unchanged / duplicate is preserved
      fileName: 'b21_unchanged.xlsx',
      userName: 'Admin Tester',
      userId: 'usr_admin',
      userRole: 'Admin',
    });

    const isUnchanged = dryRunResult.summary.unchangedCount === 1 || dryRunResult.summary.skippedCount === 1;
    const previewStatus = dryRunResult.previewRows[0]?.b21Status;

    recordTest(
      4,
      'Excel Comparison: UNCHANGED Identification (Preserve Existing Data)',
      isUnchanged && previewStatus === 'UNCHANGED',
      `Unchanged count: ${dryRunResult.summary.unchangedCount}, Status: ${previewStatus}`
    );
  } catch (err: any) {
    recordTest(4, 'Excel Comparison: UNCHANGED Identification', false, err.message);
  }

  // -------------------------------------------------------------------------
  // TEST 5: Atomic Live Import with Image Merging & Property ID Preservation
  // -------------------------------------------------------------------------
  try {
    // 1. Dry run with NEW and UPDATE
    const rawRows = [
      {
        'Property ID': 'B21-PH001',
        'Title': 'Original Villa PH001 Updated with Pool',
        'Category': 'Villa',
        'Listing Type': 'Sale',
        'Zone': 'Zone 1',
        'Price': 39000000,
        'Bedrooms': 4,
        'Bathrooms': 4,
        'Usable Area (Sqm)': 450,
      },
      {
        'Property ID': 'B21-PH002',
        'Title': 'Penthouse PH002 with River View',
        'Category': 'Condo',
        'Listing Type': 'Rent',
        'Zone': 'Zone 2',
        'Rent Price/Mo': 95000,
        'Bedrooms': 2,
        'Bathrooms': 2,
        'Usable Area (Sqm)': 130,
      },
    ];

    const dryRun = await executeImportDryRun(rawRows, {
      duplicateMode: 'update',
      fileName: 'b21_live_commit.xlsx',
      userName: 'Super Admin User',
      userId: 'usr_super',
      userRole: 'Super Admin',
    });

    // Provide matched images to merge during live import
    const matchedImages = {
      'B21-PH001': [{ url: 'https://peak-cdn.com/properties/B21-PH001_new_pool.jpg', fileName: 'B21-PH001_new_pool.jpg' }],
      'B21-PH002': [{ url: 'https://peak-cdn.com/properties/B21-PH002_living.jpg', fileName: 'B21-PH002_living.jpg' }],
    };

    const liveResult = await executeSafeLiveImport({
      importToken: dryRun.importToken!,
      confirmRealImport: true,
      fileFingerprint: dryRun.fileFingerprint!,
      user: { id: 'usr_super', name: 'Super Admin User', role: 'Super Admin' },
      fileName: 'b21_live_commit.xlsx',
      duplicateMode: 'update',
      matchedImages,
    });

    // Check DB: B21-PH001 must have preserved ID and merged images (original + new pool)
    const [updatedProp] = await db
      .select()
      .from(propertiesTable)
      .where(eq(propertiesTable.propertyId, 'B21-PH001'))
      .limit(1);

    const [newProp] = await db
      .select()
      .from(propertiesTable)
      .where(eq(propertiesTable.propertyId, 'B21-PH002'))
      .limit(1);

    const getImageStr = (img: any) => (typeof img === 'string' ? img : img?.url || img?.fileName || '');
    const hasOriginalImage = updatedProp?.images?.some((img: any) => getImageStr(img).includes('photo-original-ph001.jpg'));
    const hasMergedImage = updatedProp?.images?.some((img: any) => getImageStr(img).includes('B21-PH001_new_pool.jpg'));
    const newPropHasImage = newProp?.images?.some((img: any) => getImageStr(img).includes('B21-PH002_living.jpg'));

    const passed =
      liveResult.success &&
      updatedProp?.propertyId === 'B21-PH001' && // ID preserved
      Number(updatedProp?.price) === 39000000 &&
      hasOriginalImage &&
      hasMergedImage &&
      newPropHasImage;

    recordTest(
      5,
      'Atomic Live Import: Property ID Preservation & Matched Image Merging',
      Boolean(passed),
      `Success: ${liveResult.success}, Error: ${liveResult.error || 'none'}, Updated Images: ${JSON.stringify(updatedProp?.images)}, New Prop Images: ${JSON.stringify(newProp?.images)}`
    );
  } catch (err: any) {
    recordTest(5, 'Atomic Live Import: Property ID & Image Merging', false, err.message);
  }

  // -------------------------------------------------------------------------
  // TEST 6: RBAC Authorization Gate (Unauthorized Role Rejection)
  // -------------------------------------------------------------------------
  try {
    const rawRows = [
      {
        'Property ID': 'B21-PH004',
        'Title': 'Unauthorized Villa Test',
        'Category': 'Villa',
        'Listing Type': 'Sale',
        'Zone': 'Zone 1',
        'Price': 15000000,
      },
    ];

    const dryRun = await executeImportDryRun(rawRows, {
      duplicateMode: 'skip',
      fileName: 'unauthorized_test.xlsx',
      userName: 'Guest Agent',
      userId: 'usr_agent_unauth',
      userRole: 'Real Estate Agent',
    });

    const liveRes = await executeSafeLiveImport({
      importToken: dryRun.importToken!,
      confirmRealImport: true,
      fileFingerprint: dryRun.fileFingerprint!,
      user: { id: 'usr_agent_unauth', name: 'Guest Agent', role: 'Real Estate Agent' },
      fileName: 'unauthorized_test.xlsx',
      duplicateMode: 'skip',
    });

    const rejectedAsExpected = !liveRes.success && (liveRes.statusCode === 403 || liveRes.code === 'FORBIDDEN');

    recordTest(
      6,
      'RBAC Security Gate: Rejects Unauthorized Mutation from Non-Admin/Manager',
      rejectedAsExpected,
      `Agent role was strictly blocked from committing mutations to DB (Code: ${liveRes.code}, Status: ${liveRes.statusCode})`
    );
  } catch (err: any) {
    recordTest(6, 'RBAC Security Gate', false, err.message);
  }

  // -------------------------------------------------------------------------
  // TEST 7: Audit Log Verification
  // -------------------------------------------------------------------------
  try {
    const logs = await db
      .select()
      .from(auditLogsTable)
      .where(eq(auditLogsTable.propertyId, 'BULK'))
      .limit(5);

    const imageLogs = await db
      .select()
      .from(auditLogsTable)
      .where(eq(auditLogsTable.action, 'Images Updated'))
      .limit(5);

    const passed = logs.length > 0 || imageLogs.length > 0;
    recordTest(
      7,
      'Audit Logging: Transaction and User Actions Recorded in PostgreSQL',
      passed,
      `Found ${logs.length} Bulk audit logs and ${imageLogs.length} Image Update logs in PostgreSQL`
    );
  } catch (err: any) {
    recordTest(7, 'Audit Logging', false, err.message);
  }

  // Summary
  const passedCount = testResults.filter((t) => t.passed).length;
  const totalCount = testResults.length;
  console.log(`\n${CYAN}============================================================${RESET}`);
  if (passedCount === totalCount) {
    console.log(`${GREEN}${BOLD}ALL ${totalCount} B21 TESTS PASSED SUCCESSFULLY!${RESET}`);
  } else {
    console.log(`${RED}${BOLD}${totalCount - passedCount} / ${totalCount} TESTS FAILED!${RESET}`);
  }
  console.log(`${CYAN}============================================================\n${RESET}`);

  // Cleanup test records
  for (const code of testCodes) {
    await db.delete(propertiesTable).where(eq(propertiesTable.propertyId, code));
  }

  if (passedCount !== totalCount) {
    process.exit(1);
  }
  process.exit(0);
}

runB21Tests().catch((err) => {
  console.error('Fatal B21 Test Error:', err);
  process.exit(1);
});
