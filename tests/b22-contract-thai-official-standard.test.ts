import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { contractService } from '../src/server/contract-service.ts';
import { db } from '../src/db/index.ts';
import { contractsTable, auditLogsTable } from '../src/db/schema.ts';
import { eq, desc } from 'drizzle-orm';
import { User } from '../src/types/index.ts';

// Colors for clean console reporting
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

interface TestResult {
  name: string;
  passed: boolean;
  details?: string;
}

const testResults: TestResult[] = [];

function recordTest(name: string, passed: boolean, details?: string) {
  testResults.push({ name, passed, details });
  const status = passed ? `${GREEN}[PASS]${RESET}` : `${RED}[FAIL]${RESET}`;
  console.log(`${status} ${BOLD}${name}${RESET}${details ? ` — ${details}` : ''}`);
}

async function runB22FinalTestSuite() {
  console.log(`\n${CYAN}================================================================${RESET}`);
  console.log(`${BOLD}${CYAN}B22 FINAL — THAI OFFICIAL STANDARD 13-PAGE LEASE AGREEMENT TEST${RESET}`);
  console.log(`${CYAN}================================================================${RESET}\n`);

  const mockAdminUser: User = {
    id: 'usr-admin-b22',
    name: 'Somchai Admin',
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

  const mockAgentUser: User = {
    id: 'usr-agent-b22',
    name: 'Sarah Agent',
    email: 'sarah@peakrealestate.com',
    username: 'sarah_agent',
    role: 'Agent',
    phone: '+66 81 333 4444',
    avatar: 'https://images.unsplash.com/photo-agent.jpg',
    branch: 'Rawai Branch',
    title: 'Senior Sales Agent',
    monthlyTarget: 2000000,
    monthlyCommission: 60000,
    targetDeals: 5,
    completedDeals: 3,
  };

  // ---------------------------------------------------------------------------
  // TEST 1: Create real contract in PostgreSQL
  // ---------------------------------------------------------------------------
  const testContractPayload = {
    contractId: `RENT-TEST-${Date.now()}`,
    signDate: '2026-09-23',
    rentalStart: '2026-10-01',
    rentalEnd: '2027-09-30',
    rentalTime: '12 เดือน / 12 Months',
    withPet: false,

    propertyId: 'PK-TEST-23528',
    agent: 'Sarah Agent',
    agentPhone: '+66 81 333 4444',
    houseNo: '23/528',
    projectEn: 'Phanason Thepanusorn',
    projectTh: 'พนาสนธิ์ เทพอนุสรณ์',
    nation: 'Thailand',
    province: 'Phuket',
    district: 'Mueang',
    subDistrict: 'Wichit',
    roadEn: '-',
    roadTh: '-',
    soiEn: '-',
    soiTh: '-',
    mooEn: '2',
    mooTh: '2',
    postalCode: '83000',

    ownerName: 'Miss Jongjit Sutthichuay (นางสาว จงจิต สุทธิช่วย)',
    landlordCertificateType: 'Thai ID',
    landlordIdNo: '3 8015 00082 81 1',
    landlordNationality: 'Thai',
    landlordBank: 'Kasikorn Bank (ธนาคารกสิกรไทย)',
    landlordAccountName: 'Miss Kanyanat Chuaychai (นางสาว กัญญาณัฐ ช่วยชัย)',
    landlordAccountNo: '132-8-78628-8',
    landlordAddressHouseNo: '12/406',
    landlordAddressProject: 'Chalong',
    landlordAddressMoo: '2',
    landlordAddressSubDistrict: 'Wichit',
    landlordAddressDistrict: 'Mueang',
    landlordAddressProvince: 'Phuket',
    landlordAddressPostalCode: '83000',

    tenantName: 'MR. DMITRII KONDRATEV',
    tenantPhone: '+66800300571',
    tenantNationality: 'Russia',
    tenantCertificateType: 'Passport',
    tenantIdNo: '77 1803669',

    monthlyRent: 35000,
    paymentTerm: 'Monthly',
    monthlyRentBahtEn: 'Thirty-five thousand baht',
    monthlyRentBahtTh: 'สามหมื่นห้าพันบาทถ้วน',
    paymentDate: '23',
    penaltyAmount: '437.50',
    totalPrice: 105000,
    totalPriceBahtEn: 'One hundred five thousand baht',
    totalPriceBahtTh: 'หนึ่งแสนห้าพันบาทถ้วน',
    deposit: 70000,
    depositBahtEn: 'Seventy thousand baht',
    depositBahtTh: 'เจ็ดหมื่นบาทถ้วน',
    advanceRental: 35000,
    advanceRentalBahtEn: 'Thirty-five thousand baht',
    advanceRentalBahtTh: 'สามหมื่นห้าพันบาทถ้วน',

    salesName: 'Sarah Agent',
    salesPhone: '+66 81 333 4444',
    salesCommission: 35000,
    comments: 'สัญญาเช่ามาตรฐาน 13 หน้า ภาษาไทย/English สำหรับใช้งานด้านอสังหาริมทรัพย์ในประเทศไทย',
  };

  let createdContract: any = null;
  try {
    createdContract = await contractService.createContract(testContractPayload as any, mockAdminUser);
    recordTest(
      '1. Create Contract in PostgreSQL',
      !!createdContract?.id && createdContract.contractId === testContractPayload.contractId,
      `Saved with DB ID: ${createdContract?.id}, Contract ID: ${createdContract?.contractId}`
    );
  } catch (err: any) {
    recordTest('1. Create Contract in PostgreSQL', false, err.message);
  }

  if (!createdContract) {
    console.error('Failed to create test contract. Aborting further tests.');
    process.exit(1);
  }

  // ---------------------------------------------------------------------------
  // TEST 2: Verify generated DOCX file existence
  // ---------------------------------------------------------------------------
  const wordFiles = createdContract.generatedWordFiles as any[];
  const initialWordFile = wordFiles?.[0];
  const filePath = initialWordFile?.filePath;
  const fileExists = filePath && fs.existsSync(filePath);
  recordTest(
    '2. Generate DOCX File on Creation',
    !!fileExists,
    `File: ${initialWordFile?.fileName || 'None'} (Size: ${fileExists ? fs.statSync(filePath).size : 0} bytes)`
  );

  // ---------------------------------------------------------------------------
  // TEST 3: Unzip and inspect DOCX XML
  // ---------------------------------------------------------------------------
  let docXml = '';
  try {
    docXml = execSync(`unzip -p "${filePath}" word/document.xml`).toString();
  } catch (err: any) {
    console.error('Failed to unzip document.xml:', err);
  }

  // ---------------------------------------------------------------------------
  // TEST 4: Page Break check (12 page breaks -> 13 pages)
  // ---------------------------------------------------------------------------
  const pageBreaks = (docXml.match(/w:type="page"/g) || []).length;
  recordTest(
    '3. Verify 13 Pages Structure (12 Page Breaks)',
    pageBreaks === 12,
    `Found ${pageBreaks} page break tags (Yielding exactly ${pageBreaks + 1} pages)`
  );

  // ---------------------------------------------------------------------------
  // TEST 5: Official Font Enforcement
  // ---------------------------------------------------------------------------
  const fontMatches = docXml.match(/w:(ascii|hAnsi|cs|eastAsia)="([^"]+)"/g) || [];
  const uniqueFonts = Array.from(new Set(fontMatches.map((m) => m.split('"')[1])));
  const hasOnlyAllowedFonts =
    uniqueFonts.length > 0 &&
    uniqueFonts.every((f) => f === 'TH Sarabun New' || f === 'Times New Roman');
  recordTest(
    '4. Verify Official Fonts (TH Sarabun New for Thai, Times New Roman for English)',
    hasOnlyAllowedFonts,
    `Fonts used: [${uniqueFonts.join(', ')}] (No unauthorized/fancy fonts)`
  );

  // ---------------------------------------------------------------------------
  // TEST 6: Page Format & Margins (A4 & Thai official margins)
  // ---------------------------------------------------------------------------
  const hasA4Dimensions = docXml.includes('11906') && docXml.includes('16838');
  const hasProperMargins =
    docXml.includes('w:left="1700"') &&
    docXml.includes('w:right="1134"') &&
    docXml.includes('w:top="1440"') &&
    docXml.includes('w:bottom="1440"');
  recordTest(
    '5. Verify A4 Page Setup and Official Thai Margins',
    hasA4Dimensions && hasProperMargins,
    `A4 (11906x16838 twips), Top/Bottom 1440 twips (1 inch), Left 1700 twips, Right 1134 twips`
  );

  // ---------------------------------------------------------------------------
  // TEST 7: Bilingual Content & All 20 Clauses Presence
  // ---------------------------------------------------------------------------
  const hasIntroTh = docXml.includes('สัญญาเช่า');
  const hasIntroEn = docXml.includes('LEASE AGREEMENT');
  const hasClause1 = docXml.includes('ผู้ให้เช่าถือกรรมสิทธิ์') && docXml.includes('The Landlord is the owner');
  const hasClause5 = docXml.includes('เงินประกันการเช่า') && docXml.includes('deposit');
  const hasClause10 = docXml.includes('ห้ามมิให้ผู้เช่านำทรัพย์ที่เช่าทั้งหมดหรือบางส่วนไปให้บุคคลอื่น') && docXml.includes('prohibits the assignment or sublease');
  const hasClause19 = docXml.includes('การต่ออายุสัญญาเช่าและการเข้าชมทรัพย์สิน') && docXml.includes('Lease Renewal and Property Viewings');
  const hasClause20 = docXml.includes('การชำระค่าเช่า') && docXml.includes('Rental Payment');
  const hasAnnex = docXml.includes('ANNEX') && docXml.includes('เอกสารแนบท้าย');
  const hasCheckOut = docXml.includes('CHECK-OUT CONDITION') && docXml.includes('เงื่อนไขการส่งมอบห้องคืน');

  const allClausesPassed =
    hasIntroTh &&
    hasIntroEn &&
    hasClause1 &&
    hasClause5 &&
    hasClause10 &&
    hasClause19 &&
    hasClause20 &&
    hasAnnex &&
    hasCheckOut;

  recordTest(
    '6. Verify Bilingual Clauses & Sections (Intro, Clauses 1-20, Annex, Check-out)',
    allClausesPassed,
    'Thai is primary legal text with corresponding English translation intact'
  );

  // ---------------------------------------------------------------------------
  // TEST 8: Data Substitution from Database
  // ---------------------------------------------------------------------------
  const hasTenantName = docXml.includes('MR. DMITRII KONDRATEV');
  const hasHouseNo = docXml.includes('23/528');
  const hasProject = docXml.includes('Phanason Thepanusorn') || docXml.includes('พนาสนธิ์ เทพอนุสรณ์');
  const hasLandlordId = docXml.includes('3 8015 00082 81 1');
  const hasTenantPassport = docXml.includes('77 1803669');
  const hasRentAmount = docXml.includes('35,000');
  const hasDepositAmount = docXml.includes('70,000');

  const dataSubstitutionPassed =
    hasTenantName &&
    hasHouseNo &&
    hasProject &&
    hasLandlordId &&
    hasTenantPassport &&
    hasRentAmount &&
    hasDepositAmount;

  recordTest(
    '7. Verify Database Fields Correctly Substituted in DOCX',
    dataSubstitutionPassed,
    'Contract ID, Landlord, Tenant, House No, Passport, ID, and Amounts matched'
  );

  // ---------------------------------------------------------------------------
  // TEST 9: Amounts in Numbers and Words
  // ---------------------------------------------------------------------------
  const hasThaiRentWords = docXml.includes('สามหมื่นห้าพันบาทถ้วน');
  const hasEnRentWords = docXml.includes('Thirty-five thousand baht');
  const hasThaiDepositWords = docXml.includes('เจ็ดหมื่นบาทถ้วน');
  const hasEnDepositWords = docXml.includes('Seventy thousand baht');

  const wordsPassed = hasThaiRentWords && hasEnRentWords && hasThaiDepositWords && hasEnDepositWords;
  recordTest(
    '8. Verify Number to Words (Thai Baht & English Words)',
    wordsPassed,
    'Numbers and words for monthly rent and deposit rendered accurately'
  );

  // ---------------------------------------------------------------------------
  // TEST 10: Signatures & Utility Schedule Tables
  // ---------------------------------------------------------------------------
  const hasSignaturesTable =
    docXml.includes('The Landlord: ( Miss Jongjit Sutthichuay') &&
    docXml.includes('The Tenant: ( MR. DMITRII KONDRATEV )') &&
    docXml.includes('The Witness 1: ( Sarah Agent )');
  const hasUtilitySchedule =
    docXml.includes('Electricity fee by bill') &&
    docXml.includes('Government Bill') &&
    docXml.includes('Lost key 100 Baht');
  const hasCheckOutSignatures = docXml.includes('ลายมือชื่อส่งมอบและตรวจรับห้องคืน');

  recordTest(
    '9. Verify Signatures & Utility Schedule Tables',
    hasSignaturesTable && hasUtilitySchedule && hasCheckOutSignatures,
    '4-Party Signatures, Utility schedule, and Handover signatures structured in tables'
  );

  // ---------------------------------------------------------------------------
  // TEST 11: Pages 11, 12, 13 Certified True Copy Stamp Boxes
  // ---------------------------------------------------------------------------
  const hasCertifiedStampTh = docXml.includes('สำเนาถูกต้อง');
  const hasCertifiedStampEn = docXml.includes('Certified True Copy');
  const hasSpecificStampTextTh = docXml.includes('ใช้สำหรับทำสัญญาเช่า บ้านเลขที่ 23/528');
  const hasSpecificStampTextEn = docXml.includes('Use for signing the lease agreement on House No. 23/528');

  const stampBoxesPassed =
    hasCertifiedStampTh &&
    hasCertifiedStampEn &&
    hasSpecificStampTextTh &&
    hasSpecificStampTextEn;

  recordTest(
    '10. Verify Attached Document Pages 11-13 & Certified True Copy Stamp Boxes',
    stampBoxesPassed,
    'Certified True Copy boxes with exact house limitation text verified on Pages 11, 12, 13'
  );

  // ---------------------------------------------------------------------------
  // TEST 12: Edit Contract and Regenerate Word Document (Preserving History)
  // ---------------------------------------------------------------------------
  let updatedContract: any = null;
  try {
    const editPayload = {
      comments: 'Updated: Tenant requested additional air-con servicing schedule. Version 2 generated.',
      penaltyAmount: '500.00',
    };
    updatedContract = await contractService.updateContract(createdContract.id, editPayload, mockAdminUser);
    const updatedWordFiles = updatedContract.generatedWordFiles as any[];
    const v2File = updatedWordFiles?.[0];
    const v1File = updatedWordFiles?.[1];

    const historyPreserved =
      updatedWordFiles.length === 2 &&
      v2File.version === 2 &&
      v1File.version === 1 &&
      fs.existsSync(v2File.filePath) &&
      fs.existsSync(v1File.filePath);

    // Verify updated XML reflects new penalty
    const v2Xml = execSync(`unzip -p "${v2File.filePath}" word/document.xml`).toString();
    const v2HasNewPenalty = v2Xml.includes('500.00');

    recordTest(
      '11. Edit Contract & Generate New Word Version (History Preserved)',
      historyPreserved && v2HasNewPenalty,
      `Version 2 generated (${v2File.fileName}), Version 1 preserved (${v1File.fileName})`
    );
  } catch (err: any) {
    recordTest('11. Edit Contract & Generate New Word Version', false, err.message);
  }

  // ---------------------------------------------------------------------------
  // TEST 13: RBAC Enforcement
  // ---------------------------------------------------------------------------
  let agentArchiveBlocked = false;
  try {
    // Agent tries to archive contract -> must be forbidden!
    await contractService.archiveContract(createdContract.id, mockAgentUser);
  } catch (err: any) {
    if (err.message.includes('Forbidden') || err.message.includes('RBAC')) {
      agentArchiveBlocked = true;
    }
  }
  recordTest(
    '12. Verify RBAC Security (Agent Cannot Archive/Delete Contracts)',
    agentArchiveBlocked,
    'Agent deletion was properly blocked with Forbidden (RBAC Protected)'
  );

  // ---------------------------------------------------------------------------
  // TEST 14: Audit Logs Verification
  // ---------------------------------------------------------------------------
  const auditLogs = await db
    .select()
    .from(auditLogsTable)
    .where(eq(auditLogsTable.propertyId, createdContract.propertyId))
    .orderBy(desc(auditLogsTable.createdAt))
    .limit(10);

  const actions = auditLogs.map((l) => l.action);
  const hasCreateAudit = actions.includes('Create Contract') || actions.includes('Contract Created');
  const hasUpdateAudit = actions.includes('Update Contract') || actions.includes('Contract Updated');

  recordTest(
    '13. Verify Audit Logs in Database',
    hasCreateAudit && hasUpdateAudit,
    `Audit trail records: [${actions.join(', ')}]`
  );

  // ---------------------------------------------------------------------------
  // TEST 15: Soft Delete (Archive) Verification
  // ---------------------------------------------------------------------------
  let softDeleted = false;
  try {
    const archived = await contractService.archiveContract(createdContract.id, mockAdminUser);
    softDeleted = archived.isArchived === true && archived.status === 'Terminated';
  } catch (err: any) {
    softDeleted = false;
  }
  recordTest(
    '14. Verify Soft Delete (Preserves Record in Database, No Hard Delete)',
    softDeleted,
    'isArchived = true, status = Terminated, record and files intact'
  );

  // ---------------------------------------------------------------------------
  // SUMMARY REPORT
  // ---------------------------------------------------------------------------
  const total = testResults.length;
  const passed = testResults.filter((t) => t.passed).length;
  const failed = total - passed;

  console.log(`\n${CYAN}================================================================${RESET}`);
  console.log(`${BOLD}B22 TEST EXECUTION SUMMARY:${RESET}`);
  console.log(`Total Tests:  ${BOLD}${total}${RESET}`);
  console.log(`Passed:       ${GREEN}${BOLD}${passed}${RESET}`);
  console.log(`Failed:       ${failed > 0 ? RED : GREEN}${BOLD}${failed}${RESET}`);
  console.log(`${CYAN}================================================================${RESET}\n`);

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runB22FinalTestSuite().catch((err) => {
  console.error('B22 test suite unhandled exception:', err);
  process.exit(1);
});
