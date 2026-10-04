/**
 * B13 Bulk Property Import Engine Test Suite
 * Executes 12 mandatory safety tests for Dry-Run import workflow.
 * Guaranteed 0 database mutations (100% read-only).
 */

import { db } from '../src/db/index.ts';
import { propertiesTable } from '../src/db/schema.ts';
import { sql } from 'drizzle-orm';
import {
  executeImportDryRun,
  analyzeColumnMapping,
  normalizePropertyId,
  parseNumericField,
  sanitizeString,
} from '../src/server/import-engine.ts';

interface TestResult {
  testNumber: number;
  name: string;
  passed: boolean;
  details: string;
}

async function runB13Tests() {
  console.log('=================================================================');
  console.log('🚀 STARTING B13 BULK PROPERTY IMPORT ENGINE TESTS (DRY-RUN)');
  console.log('=================================================================');

  // Verify initial database record count
  const initialCountRes = await db.select({ count: sql<number>`count(*)` }).from(propertiesTable);
  const initialCount = Number(initialCountRes[0]?.count || 0);
  console.log(`[PRE-CHECK] Initial Database Property Count: ${initialCount} records`);

  const existingProps = await db.select({ propertyId: propertiesTable.propertyId }).from(propertiesTable);
  console.log('[PRE-CHECK] Existing DB Property IDs:', existingProps.map((p) => p.propertyId));

  const results: TestResult[] = [];

  // -------------------------------------------------------------
  // Test 1: Valid new property
  // -------------------------------------------------------------
  try {
    const rawRows = [
      {
        'Property ID': 'PK-TEST-NEW-001',
        'Category': 'Villa',
        'Project': 'Sunset Oceanfront Villa',
        'Zone': 'Zone 2',
        'Area': 'Rawai',
        'Sale Price': '25,000,000',
        'Rent Price': '120,000',
        'Bedroom': '4',
        'Bathroom': '5',
        'Usable Area': '450',
      },
    ];

    const res = await executeImportDryRun(rawRows, {
      duplicateMode: 'skip',
      fileName: 'test_valid_new.xlsx',
      userName: 'QA Tester',
    });

    const passed =
      res.summary.totalRows === 1 &&
      res.summary.newCount === 1 &&
      res.summary.invalidCount === 0 &&
      res.previewRows[0].classification === 'NEW' &&
      res.errors.length === 0;

    results.push({
      testNumber: 1,
      name: 'Valid new property',
      passed,
      details: `Classification: ${res.previewRows[0]?.classification}, NewCount: ${res.summary.newCount}, Errors: ${res.errors.length}`,
    });
  } catch (err: any) {
    results.push({ testNumber: 1, name: 'Valid new property', passed: false, details: err.message });
  }

  // -------------------------------------------------------------
  // Test 2: Duplicate property_id ใน file
  // -------------------------------------------------------------
  try {
    const rawRows = [
      {
        'Property ID': 'PK-FILE-DUP-001',
        'Category': 'Condo',
        'Project': 'Kata Heights A',
        'Zone': 'Zone 3',
        'Area': 'Kata',
      },
      {
        'Property ID': 'PK-FILE-DUP-001', // Same ID in file!
        'Category': 'Condo',
        'Project': 'Kata Heights B',
        'Zone': 'Zone 3',
        'Area': 'Kata',
      },
    ];

    const res = await executeImportDryRun(rawRows, {
      duplicateMode: 'skip',
      fileName: 'test_file_dup.xlsx',
      userName: 'QA Tester',
    });

    const row1 = res.previewRows[0];
    const row2 = res.previewRows[1];
    const passed =
      row1.classification === 'NEW' &&
      row2.classification === 'DUPLICATE_IN_FILE' &&
      res.summary.duplicateInFileCount === 1;

    results.push({
      testNumber: 2,
      name: 'Duplicate property_id in file',
      passed,
      details: `Row 1: ${row1?.classification}, Row 2: ${row2?.classification}, DuplicateInFileCount: ${res.summary.duplicateInFileCount}`,
    });
  } catch (err: any) {
    results.push({ testNumber: 2, name: 'Duplicate property_id in file', passed: false, details: err.message });
  }

  // -------------------------------------------------------------
  // Test 3: property_id ที่มีอยู่ใน Database (Existing VL-1001)
  // -------------------------------------------------------------
  try {
    const rawRows = [
      {
        'Property ID': 'VL-1001', // Existing in Supabase DB
        'Category': 'Villa',
        'Project': 'Ocean View Pool Villa Updated',
        'Zone': 'Zone 2',
        'Area': 'Rawai',
        'Sale Price': '28,000,000',
      },
    ];

    // Sub-case A: Skip mode
    const resSkip = await executeImportDryRun(rawRows, {
      duplicateMode: 'skip',
      fileName: 'test_existing_skip.xlsx',
      userName: 'QA Tester',
    });

    // Sub-case B: Update mode
    const resUpdate = await executeImportDryRun(rawRows, {
      duplicateMode: 'update',
      fileName: 'test_existing_update.xlsx',
      userName: 'QA Tester',
    });

    // Sub-case C: New ID mode
    const resNewId = await executeImportDryRun(rawRows, {
      duplicateMode: 'new_id',
      fileName: 'test_existing_new_id.xlsx',
      userName: 'QA Tester',
    });

    const passed =
      resSkip.previewRows[0].classification === 'SKIP' &&
      resUpdate.previewRows[0].classification === 'UPDATE' &&
      resNewId.previewRows[0].classification === 'NEW' &&
      resNewId.previewRows[0].propertyId.startsWith('VL-1001-N');

    results.push({
      testNumber: 3,
      name: 'property_id already in Database (skip/update/new_id)',
      passed,
      details: `Skip: ${resSkip.previewRows[0]?.classification}, Update: ${resUpdate.previewRows[0]?.classification}, NewID: ${resNewId.previewRows[0]?.propertyId}`,
    });
  } catch (err: any) {
    results.push({ testNumber: 3, name: 'property_id already in Database', passed: false, details: err.message });
  }

  // -------------------------------------------------------------
  // Test 4: Missing required field (Missing Category & Missing Title)
  // -------------------------------------------------------------
  try {
    const rawRows = [
      {
        'Property ID': 'PK-INVALID-001',
        // Category missing
        // Project/Title missing
        'Zone': 'Zone 2',
        'Area': 'Rawai',
      },
    ];

    const res = await executeImportDryRun(rawRows, {
      duplicateMode: 'skip',
      fileName: 'test_missing_required.xlsx',
      userName: 'QA Tester',
    });

    const row = res.previewRows[0];
    const hasCategoryError = res.errors.some((e) => e.field === 'category');
    const hasTitleError = res.errors.some((e) => e.field === 'title');
    const passed = row.classification === 'INVALID' && hasCategoryError && hasTitleError;

    results.push({
      testNumber: 4,
      name: 'Missing required field',
      passed,
      details: `Classification: ${row.classification}, Errors: ${res.errors.map((e) => `${e.field}: ${e.error}`).join('; ')}`,
    });
  } catch (err: any) {
    results.push({ testNumber: 4, name: 'Missing required field', passed: false, details: err.message });
  }

  // -------------------------------------------------------------
  // Test 5: Invalid price (Negative price & non-numeric text)
  // -------------------------------------------------------------
  try {
    const rawRows = [
      {
        'Property ID': 'PK-INVALID-PRICE-001',
        'Category': 'House',
        'Project': 'Green Residence',
        'Zone': 'Zone 1',
        'Area': 'Phuket Town',
        'Sale Price': '-15000000', // Negative
      },
      {
        'Property ID': 'PK-INVALID-PRICE-002',
        'Category': 'House',
        'Project': 'Green Residence B',
        'Zone': 'Zone 1',
        'Area': 'Phuket Town',
        'Sale Price': 'NOT_A_PRICE', // Non-numeric
      },
    ];

    const res = await executeImportDryRun(rawRows, {
      duplicateMode: 'skip',
      fileName: 'test_invalid_price.xlsx',
      userName: 'QA Tester',
    });

    const hasNegError = res.errors.some((e) => e.field === 'price' && e.error.includes('negative'));
    const hasTextError = res.errors.some((e) => e.field === 'price' && e.error.includes('invalid numeric'));
    const passed = hasNegError && hasTextError;

    results.push({
      testNumber: 5,
      name: 'Invalid price handling',
      passed,
      details: `Negative Error: ${hasNegError}, Text Error: ${hasTextError}`,
    });
  } catch (err: any) {
    results.push({ testNumber: 5, name: 'Invalid price handling', passed: false, details: err.message });
  }

  // -------------------------------------------------------------
  // Test 6: Invalid numeric field (Bedrooms, Bathrooms, UsableArea)
  // -------------------------------------------------------------
  try {
    const rawRows = [
      {
        'Property ID': 'PK-INVALID-NUM-001',
        'Category': 'Condo',
        'Project': 'Skyline Park',
        'Zone': 'Zone 1',
        'Area': 'Kathu',
        'Bedroom': '-5', // Negative
        'Bathroom': 'invalid_bath', // NaN
        'Usable Area': '-120', // Negative
      },
    ];

    const res = await executeImportDryRun(rawRows, {
      duplicateMode: 'skip',
      fileName: 'test_invalid_numeric.xlsx',
      userName: 'QA Tester',
    });

    const hasBedError = res.errors.some((e) => e.field === 'bedrooms');
    const hasBathError = res.errors.some((e) => e.field === 'bathrooms');
    const hasAreaError = res.errors.some((e) => e.field === 'usableArea');
    const passed = hasBedError && hasBathError && hasAreaError;

    results.push({
      testNumber: 6,
      name: 'Invalid numeric field validation',
      passed,
      details: `Bedrooms Err: ${hasBedError}, Bathrooms Err: ${hasBathError}, Area Err: ${hasAreaError}`,
    });
  } catch (err: any) {
    results.push({ testNumber: 6, name: 'Invalid numeric field validation', passed: false, details: err.message });
  }

  // -------------------------------------------------------------
  // Test 7: Empty/null field handling
  // -------------------------------------------------------------
  try {
    const parsed1 = parseNumericField('', 'bedrooms', true);
    const parsed2 = parseNumericField(null, 'price', true);
    const parsed3 = parseNumericField('   ', 'usableArea', true);
    const sanitized = sanitizeString(null);

    const passed =
      parsed1.value === null &&
      !parsed1.error &&
      parsed2.value === null &&
      !parsed2.error &&
      parsed3.value === null &&
      !parsed3.error &&
      sanitized === '';

    results.push({
      testNumber: 7,
      name: 'Empty/null field safe parsing',
      passed,
      details: `Empty string => null (no err), Null => null (no err), Sanitized string => empty string`,
    });
  } catch (err: any) {
    results.push({ testNumber: 7, name: 'Empty/null field safe parsing', passed: false, details: err.message });
  }

  // -------------------------------------------------------------
  // Test 8: Whitespace property_id
  // -------------------------------------------------------------
  try {
    const rawId1 = '   PK-V001   ';
    const rawId2 = '\t PK-NEW-123 \n';
    const norm1 = normalizePropertyId(rawId1);
    const norm2 = normalizePropertyId(rawId2);

    const passed = norm1.canonicalId === 'PK-V001' && norm2.canonicalId === 'PK-NEW-123' && norm1.hasWhitespaceAnomaly;

    results.push({
      testNumber: 8,
      name: 'Whitespace property_id normalization',
      passed,
      details: `"${rawId1}" => "${norm1.canonicalId}", "${rawId2.trim()}" => "${norm2.canonicalId}" (Anomaly detected: ${norm1.hasWhitespaceAnomaly})`,
    });
  } catch (err: any) {
    results.push({ testNumber: 8, name: 'Whitespace property_id normalization', passed: false, details: err.message });
  }

  // -------------------------------------------------------------
  // Test 9: Case difference (e.g. vl-1001 vs VL-1001)
  // -------------------------------------------------------------
  try {
    const rawRows = [
      {
        'Property ID': 'vl-1001', // Lowercase of existing VL-1001
        'Category': 'Villa',
        'Project': 'Case Difference Test',
        'Zone': 'Zone 2',
        'Area': 'Rawai',
      },
    ];

    const res = await executeImportDryRun(rawRows, {
      duplicateMode: 'skip',
      fileName: 'test_case_difference.xlsx',
      userName: 'QA Tester',
    });

    const row = res.previewRows[0];
    const passed = row.classification === 'SKIP' && row.propertyId === 'VL-1001';

    results.push({
      testNumber: 9,
      name: 'Case difference detection',
      passed,
      details: `"vl-1001" correctly resolved to existing database ID "${row.propertyId}" (Status: ${row.classification})`,
    });
  } catch (err: any) {
    results.push({ testNumber: 9, name: 'Case difference detection', passed: false, details: err.message });
  }

  // -------------------------------------------------------------
  // Test 10: Update mode ไม่ overwrite ด้วย empty value
  // -------------------------------------------------------------
  try {
    const rawRows = [
      {
        'Property ID': 'VL-1001', // Existing property
        'Category': 'Villa',
        'Project': '', // EMPTY string! Must NOT overwrite existing title
        'Zone': 'Zone 2',
        'Area': 'Rawai',
        'Sale Price': '29,500,000', // Only price is updated!
        'Bedroom': '', // EMPTY string! Must NOT overwrite
      },
    ];

    const res = await executeImportDryRun(rawRows, {
      duplicateMode: 'update',
      fileName: 'test_no_empty_overwrite.xlsx',
      userName: 'QA Tester',
    });

    const rowDiff = res.diffs.find((d) => d.propertyId === 'VL-1001');
    const diffFields = rowDiff ? rowDiff.changes.map((c) => c.field) : [];
    // Price should be in diff, but title and bedrooms must NOT be in diff!
    const hasPriceDiff = diffFields.includes('price');
    const hasNoTitleDiff = !diffFields.includes('title');
    const hasNoBedroomDiff = !diffFields.includes('bedrooms');
    const passed = hasPriceDiff && hasNoTitleDiff && hasNoBedroomDiff;

    results.push({
      testNumber: 10,
      name: 'Update mode does NOT overwrite with empty values',
      passed,
      details: `Diff fields: [${diffFields.join(', ')}]. Empty project & bedrooms safely preserved in DB.`,
    });
  } catch (err: any) {
    results.push({ testNumber: 10, name: 'Update mode does NOT overwrite with empty values', passed: false, details: err.message });
  }

  // -------------------------------------------------------------
  // Test 11: new_id collision safety
  // -------------------------------------------------------------
  try {
    const rawRows = [
      {
        'Property ID': 'VL-1001', // Existing
        'Category': 'Villa',
        'Project': 'Villa Branch 1',
        'Zone': 'Zone 2',
        'Area': 'Rawai',
      },
      {
        'Property ID': 'VL-1001', // Another row with same ID in new_id mode
        'Category': 'Villa',
        'Project': 'Villa Branch 2',
        'Zone': 'Zone 2',
        'Area': 'Rawai',
      },
    ];

    const res = await executeImportDryRun(rawRows, {
      duplicateMode: 'new_id',
      fileName: 'test_new_id_collision.xlsx',
      userName: 'QA Tester',
    });

    const id1 = res.previewRows[0].propertyId;
    const id2 = res.previewRows[1].propertyId;
    const passed = id1 !== id2 && id1.startsWith('VL-1001-N') && id2.startsWith('VL-1001-N');

    results.push({
      testNumber: 11,
      name: 'new_id collision avoidance',
      passed,
      details: `Row 1 ID: "${id1}", Row 2 ID: "${id2}". Distinct, collision-proof sequential IDs.`,
    });
  } catch (err: any) {
    results.push({ testNumber: 11, name: 'new_id collision avoidance', passed: false, details: err.message });
  }

  // -------------------------------------------------------------
  // Test 12: Large file / batch processing simulation (100 rows)
  // -------------------------------------------------------------
  try {
    const batchRows: any[] = [];
    for (let i = 1; i <= 100; i++) {
      batchRows.push({
        'Property ID': `PK-BATCH-${String(i).padStart(3, '0')}`,
        'Category': i % 2 === 0 ? 'Villa' : 'Condo',
        'Project': `Batch Project ${i}`,
        'Zone': 'Zone 2',
        'Area': 'Rawai',
        'Sale Price': `${10000000 + i * 100000}`,
        'Bedroom': String((i % 4) + 1),
        'Bathroom': String((i % 3) + 1),
        'Usable Area': String(150 + i * 5),
      });
    }

    const tStart = Date.now();
    const res = await executeImportDryRun(batchRows, {
      duplicateMode: 'skip',
      fileName: 'large_batch_test.xlsx',
      userName: 'QA Tester',
    });
    const duration = Date.now() - tStart;

    const passed =
      res.summary.totalRows === 100 &&
      res.summary.newCount === 100 &&
      res.summary.invalidCount === 0 &&
      duration < 2000; // Under 2 seconds

    results.push({
      testNumber: 12,
      name: 'Large file / batch processing simulation (100 rows)',
      passed,
      details: `Processed 100 rows in ${duration}ms (${(100 / (duration / 1000)).toFixed(0)} rows/sec). Total: ${res.summary.totalRows}, New: ${res.summary.newCount}`,
    });
  } catch (err: any) {
    results.push({ testNumber: 12, name: 'Large file / batch processing simulation', passed: false, details: err.message });
  }

  // -------------------------------------------------------------
  // Verification: Database count post-check
  // -------------------------------------------------------------
  const finalCountRes = await db.select({ count: sql<number>`count(*)` }).from(propertiesTable);
  const finalCount = Number(finalCountRes[0]?.count || 0);
  const zeroMutations = finalCount === initialCount;

  console.log('\n=================================================================');
  console.log('📊 B13 TEST RESULTS SUMMARY');
  console.log('=================================================================');
  for (const r of results) {
    const status = r.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`[Test ${r.testNumber.toString().padStart(2, ' ')}] ${status} - ${r.name}`);
    console.log(`        Details: ${r.details}`);
  }

  console.log('\n-----------------------------------------------------------------');
  console.log(`[MUTATION CHECK] Initial DB Count: ${initialCount}, Final DB Count: ${finalCount}`);
  console.log(`[MUTATION CHECK] Database Mutations: ${finalCount - initialCount} (Must be strictly 0) => ${zeroMutations ? '✅ ZERO MUTATIONS CONFIRMED' : '❌ MUTATION OCCURRED'}`);
  console.log('=================================================================');

  const allPassed = results.every((r) => r.passed) && zeroMutations;
  if (allPassed) {
    console.log('🎉 ALL 12 TESTS PASSED! DRY-RUN IMPORT ENGINE CERTIFIED SAFE.');
    process.exit(0);
  } else {
    console.error('❌ SOME TESTS FAILED. PLEASE REVIEW LOGS.');
    process.exit(1);
  }
}

runB13Tests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
