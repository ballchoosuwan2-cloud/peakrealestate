import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  Header,
  Footer,
  PageNumber,
  PageBreak,
} from 'docx';
import fs from 'fs';
import path from 'path';
import { DbContract } from '../db/schema.ts';
import { numberToThaiBaht, numberToEnglishWords } from '../lib/number-words.ts';

// Contracts generated documents directory
export const GENERATED_CONTRACTS_DIR = path.join(process.cwd(), 'public', 'generated_contracts');
if (!fs.existsSync(GENERATED_CONTRACTS_DIR)) {
  fs.mkdirSync(GENERATED_CONTRACTS_DIR, { recursive: true });
}

// Strict Thai Official Document Fonts:
// Thai: TH Sarabun New (Official Thai Government Font)
// English: Times New Roman (Official Formal English Font)
const FONT_TH = 'TH Sarabun New';
const FONT_EN = 'Times New Roman';

function safeStr(val: any, fallback = '-'): string {
  if (val === undefined || val === null || String(val).trim() === '') return fallback;
  return String(val).trim();
}

function formatMoney(amount: any): string {
  const num = Number(amount);
  if (isNaN(num)) return '0';
  return num.toLocaleString('en-US');
}

/**
 * Official typography helper for Thai text runs
 */
function thRun(
  text: string,
  opts: { bold?: boolean; size?: number; underline?: boolean } = {}
): TextRun {
  return new TextRun({
    text,
    font: FONT_TH,
    size: opts.size || 28, // 14-16pt in TH Sarabun New
    bold: opts.bold || false,
    underline: opts.underline ? {} : undefined,
  });
}

/**
 * Official typography helper for English text runs
 */
function enRun(
  text: string,
  opts: { bold?: boolean; italics?: boolean; size?: number; underline?: boolean } = {}
): TextRun {
  return new TextRun({
    text,
    font: FONT_EN,
    size: opts.size || 20, // 10-11pt in Times New Roman
    bold: opts.bold || false,
    italics: opts.italics !== undefined ? opts.italics : true, // english translation runs italicized by default
    underline: opts.underline ? {} : undefined,
  });
}

/**
 * Create a page break paragraph
 */
function createPageBreak(): Paragraph {
  return new Paragraph({
    children: [new PageBreak()],
  });
}

/**
 * Create formal certified true copy stamp box for attached documents (Pages 11, 12, 13)
 */
function createCertifiedStampBox(
  premisesHouseNo: string,
  premisesProject: string,
  signerLabelTh: string,
  signerLabelEn: string,
  signerName: string
): Table {
  const border = { style: BorderStyle.SINGLE, size: 10, color: '1E293B' };
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: {
              top: border,
              bottom: border,
              left: border,
              right: border,
            },
            margins: {
              top: 200,
              bottom: 200,
              left: 300,
              right: 300,
            },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 80, after: 60 },
                children: [
                  thRun('สำเนาถูกต้อง', { bold: true, size: 30 }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 40 },
                children: [
                  enRun('Certified True Copy', { bold: true, italics: false, size: 22 }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 60 },
                children: [
                  thRun(
                    `ใช้สำหรับทำสัญญาเช่า บ้านเลขที่ ${premisesHouseNo} โครงการ ${premisesProject} เท่านั้น`,
                    { bold: true, size: 26 }
                  ),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 140 },
                children: [
                  enRun(
                    `Use for signing the lease agreement on House No. ${premisesHouseNo} (${premisesProject}) only`,
                    { italics: true, size: 20 }
                  ),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 120, after: 60 },
                children: [
                  thRun(`ลงชื่อ / Signed: .....................................................................`, { size: 26 }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 80 },
                children: [
                  thRun(`( ${signerName} )`, { bold: true, size: 26 }),
                  thRun(` [${signerLabelTh} / ${signerLabelEn}]`, { size: 24 }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

/**
 * Generate a bilingual (Thai/English) Lease Agreement Word document (.docx)
 * matching the 13-page official standard contract model
 */
export async function generateLeaseContractDocx(
  contract: DbContract,
  version = 1
): Promise<{ fileName: string; filePath: string; relativeUrl: string; buffer: Buffer }> {
  const contractNo = contract.contractId || `RENT-${Date.now()}`;
  const signDate = contract.signDate || new Date().toISOString().slice(0, 10);
  const rentalStart = contract.rentalStart || '-';
  const rentalEnd = contract.rentalEnd || '-';
  const rentalMonths = contract.rentalTime || '12 เดือน / 12 Months';

  const monthlyRentNum = Number(contract.monthlyRent) || 0;
  const monthlyRentStr = formatMoney(monthlyRentNum);
  const monthlyRentTh = contract.monthlyRentBahtTh || numberToThaiBaht(monthlyRentNum);
  const monthlyRentEn = contract.monthlyRentBahtEn || numberToEnglishWords(monthlyRentNum);

  const depositNum = Number(contract.deposit) || 0;
  const depositStr = formatMoney(depositNum);
  const depositTh = contract.depositBahtTh || numberToThaiBaht(depositNum);
  const depositEn = contract.depositBahtEn || numberToEnglishWords(depositNum);

  const advanceRentNum = Number(contract.advanceRental) || 0;
  const advanceRentStr = formatMoney(advanceRentNum);
  const advanceRentTh = contract.advanceRentalBahtTh || numberToThaiBaht(advanceRentNum);
  const advanceRentEn = contract.advanceRentalBahtEn || numberToEnglishWords(advanceRentNum);

  const totalNum = depositNum + advanceRentNum;
  const totalStr = formatMoney(totalNum);
  const totalTh = contract.totalPriceBahtTh || numberToThaiBaht(totalNum);
  const totalEn = contract.totalPriceBahtEn || numberToEnglishWords(totalNum);

  const paymentDate = safeStr(contract.paymentDate, '23');
  const penaltyAmount = safeStr(contract.penaltyAmount, '437.50');

  // Landlord details
  const ownerName = safeStr(contract.ownerName, 'นางสาว จงจิต สุทธิช่วย / Miss Jongjit Sutthichuay');
  const landlordIdNo = safeStr(contract.landlordIdNo, '3 8015 00082 81 1');
  const landlordNationality = safeStr(contract.landlordNationality, 'ไทย / Thai');
  const landlordBank = safeStr(contract.landlordBank, 'ธนาคารกสิกรไทย / Kasikorn Bank');
  const landlordAccount = safeStr(contract.landlordAccountName, 'นางสาว กัญญาณัฐ ช่วยชัย / Miss Kanyanat Chuaychai');
  const landlordAccountNo = safeStr(contract.landlordAccountNo, '132-8-78628-8');
  const landlordHouseNo = safeStr(contract.landlordAddressHouseNo, '12/406');
  const landlordProject = safeStr(contract.landlordAddressProject, 'Chalong');
  const landlordMoo = safeStr(contract.landlordAddressMoo, '2');
  const landlordSubDistrict = safeStr(contract.landlordAddressSubDistrict, 'ตำบลวิชิต / Wichit');
  const landlordDistrict = safeStr(contract.landlordAddressDistrict, 'อำเภอเมือง / Mueang');
  const landlordProvince = safeStr(contract.landlordAddressProvince, 'ภูเก็ต / Phuket');
  const landlordPostalCode = safeStr(contract.landlordAddressPostalCode, '83000');

  // Tenant details
  const tenantName = safeStr(contract.tenantName, 'MR. DMITRII KONDRATEV');
  const tenantPhone = safeStr(contract.tenantPhone, '+66800300571');
  const tenantNationality = safeStr(contract.tenantNationality, 'Russia');
  const tenantIdNo = safeStr(contract.tenantIdNo, '77 1803669');

  // Premises details
  const premisesProject =
    (contract.projectTh && contract.projectEn && contract.projectTh !== contract.projectEn
      ? `${contract.projectTh} (${contract.projectEn})`
      : contract.projectTh || contract.projectEn) || 'พนาสนธิ์ เทพอนุสรณ์ / Phanason Thepanusorn';
  const premisesHouseNo = contract.houseNo || '23/528';
  const premisesMoo = contract.mooEn || contract.mooTh || '2';
  const premisesSubDistrict = contract.subDistrict || 'ตำบลวิชิต / Wichit';
  const premisesDistrict = contract.district || 'อำเภอเมือง / Mueang';
  const premisesProvince = contract.province || 'ภูเก็ต / Phuket';
  const premisesPostalCode = contract.postalCode || '83000';

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: FONT_TH,
            size: 28,
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: {
              width: 11906, // A4 width in twips (210mm)
              height: 16838, // A4 height in twips (297mm)
            },
            margin: {
              top: 1440, // 1 inch (2.54 cm)
              bottom: 1440, // 1 inch (2.54 cm)
              left: 1700, // standard Thai government binding margin
              right: 1134, // 2 cm standard right margin
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                spacing: { after: 100 },
                children: [
                  thRun('PEAK REAL ESTATE / PRIME GLOBAL ASSET — สัญญาเช่า / LEASE AGREEMENT', {
                    size: 18,
                    bold: true,
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  thRun('หน้า / Page ', { size: 18 }),
                  new TextRun({ children: [PageNumber.CURRENT] }),
                  thRun(' จาก / of ', { size: 18 }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES] }),
                  thRun(` — สัญญาเลขที่ ${contractNo}`, { size: 18 }),
                ],
              }),
            ],
          }),
        },
        children: [
          // =========================================================================
          // PAGE 1: Intro, Date, Parties (The Landlord & The Tenant)
          // =========================================================================
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 100, after: 60 },
            children: [
              thRun('สัญญาเช่า', { bold: true, size: 36 }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 180 },
            children: [
              enRun('LEASE AGREEMENT', { bold: true, italics: false, size: 26 }),
            ],
          }),

          // Contract No. & Date
          new Paragraph({
            spacing: { after: 80 },
            children: [
              thRun('เลขที่สัญญา / Contract No.: ', { bold: true, size: 28 }),
              thRun(` ${contractNo} `, { bold: true, underline: true, size: 28 }),
            ],
          }),
          new Paragraph({
            spacing: { after: 80 },
            children: [
              thRun('สัญญาฉบับนี้ทำขึ้นเมื่อวันที่ / This agreement is made on: ', { bold: true, size: 28 }),
              thRun(` ${signDate} `, { underline: true, size: 28 }),
            ],
          }),
          new Paragraph({
            spacing: { after: 140 },
            children: [
              thRun('ที่ (at): ', { bold: true, size: 28 }),
              thRun(` ${premisesSubDistrict}, ${premisesDistrict}, ${premisesProvince} `, { underline: true, size: 28 }),
            ],
          }),

          // Landlord intro
          new Paragraph({
            spacing: { after: 60 },
            children: [
              thRun('สัญญาฉบับนี้ทำขึ้นโดยและระหว่าง ', { bold: true, size: 28 }),
              thRun(ownerName, { bold: true, size: 28 }),
            ],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [
              enRun('(by and between) ', { italics: true, size: 20 }),
              enRun(ownerName, { bold: true, italics: false, size: 20 }),
            ],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [
              thRun(
                `อาศัยอยู่ เลขที่ ${landlordHouseNo} โครงการ ${landlordProject} หมู่ที่ ${landlordMoo} ตำบล ${landlordSubDistrict} อำเภอ ${landlordDistrict} จังหวัด ${landlordProvince} รหัสไปรษณีย์ ${landlordPostalCode} สัญชาติ ${landlordNationality} หมายเลขหนังสือเดินทาง/บัตรประจำตัวประชาชนเลขที่ ${landlordIdNo} ต่อไปในสัญญานี้เรียกว่า "ผู้ให้เช่า"`,
                { size: 28 }
              ),
            ],
          }),
          new Paragraph({
            spacing: { after: 140 },
            children: [
              enRun(
                `Hereinafter referred to as "The Landlord" who resides at the address; House No. ${landlordHouseNo} Project ${landlordProject} Moo ${landlordMoo}, Sub-District ${landlordSubDistrict}, District ${landlordDistrict}, Province ${landlordProvince} Postal code ${landlordPostalCode}, Nationality: ${landlordNationality}, Passport No./Thai ID No. ${landlordIdNo} On one part.`,
                { italics: true, size: 20 }
              ),
            ],
          }),

          // Divider
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 80, after: 80 },
            children: [
              thRun('— ฝ่ายหนึ่ง กับ AND —', { bold: true, size: 28 }),
            ],
          }),

          // Tenant intro
          new Paragraph({
            spacing: { after: 60 },
            children: [
              thRun(`${tenantName} `, { bold: true, size: 28 }),
              thRun(`หมายเลขหนังสือเดินทาง (Passport no.) ${tenantIdNo} สัญชาติ (Nationality) ${tenantNationality} หมายเลขโทรศัพท์ (Phone) ${tenantPhone}`, { size: 28 }),
            ],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [
              thRun('ต่อไปในสัญญานี้เรียกว่า "ผู้เช่า" อีกฝ่ายหนึ่ง โดยที่คู่สัญญาทั้งสองฝ่าย ตกลงกันดังนี้', { size: 28 }),
            ],
          }),
          new Paragraph({
            spacing: { after: 180 },
            children: [
              enRun(
                `Hereinafter referred to as "The Tenant" on the other part. WHEREBY both parties agree as follows;`,
                { italics: true, size: 20 }
              ),
            ],
          }),

          // END OF PAGE 1 -> PAGE BREAK
          createPageBreak(),

          // =========================================================================
          // PAGE 2: Clauses 1 - 3 (Premises, Term, Payment)
          // =========================================================================
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 80, after: 120 },
            children: [
              thRun('ข้อตกลงและเงื่อนไขการเช่า', { bold: true, size: 32 }),
              thRun(' / ', { size: 30 }),
              enRun('TERMS AND CONDITIONS', { bold: true, italics: false, size: 24 }),
            ],
          }),

          // Clause 1
          new Paragraph({
            spacing: { after: 60 },
            children: [
              thRun(
                `1. ผู้ให้เช่าถือกรรมสิทธิ์ และมีสิทธิครอบครองบ้าน เลขที่ ${premisesHouseNo} โครงการ ${premisesProject} หมู่ที่ ${premisesMoo} ตำบล ${premisesSubDistrict} อำเภอ ${premisesDistrict} จังหวัด ${premisesProvince} รหัสไปรษณีย์ ${premisesPostalCode} ต่อไปนี้ในสัญญาเรียกว่า "ทรัพย์สิน" อัตราค่าเช่าเดือนละ ${monthlyRentStr} บาท ( ${monthlyRentTh} ) โดยมีวัตถุประสงค์เพื่อพักอาศัยเท่านั้น`,
                { size: 28 }
              ),
            ],
          }),
          new Paragraph({
            spacing: { after: 140 },
            children: [
              enRun(
                `1. The Landlord is the owner and has the right to occupy The Premises located at House No. ${premisesHouseNo} Project ${premisesProject} Moo ${premisesMoo}, Sub-District ${premisesSubDistrict}, District ${premisesDistrict}, Province ${premisesProvince} Postal code ${premisesPostalCode} Hereafter referred to in the contract as The Premises, which The Landlord agrees to rent ${monthlyRentStr} Baht ( ${monthlyRentEn} ) per month. The intent of this Lease agreement is to be used "The Premises" as a residence only.`,
                { italics: true, size: 20 }
              ),
            ],
          }),

          // Clause 2
          new Paragraph({
            spacing: { after: 60 },
            children: [
              thRun(
                `2. สัญญานี้มีข้อตกลงกัน มีกำหนดระยะเวลา ${rentalMonths} เริ่มต้นวันที่ ${rentalStart} หมดอายุสัญญาวันที่ ${rentalEnd}`,
                { size: 28 }
              ),
            ],
          }),
          new Paragraph({
            spacing: { after: 140 },
            children: [
              enRun(
                `2. The duration of this agreement shall be ${rentalMonths}. Starting from Date ${rentalStart} till Date ${rentalEnd}`,
                { italics: true, size: 20 }
              ),
            ],
          }),

          // Clause 3
          new Paragraph({
            spacing: { after: 60 },
            children: [
              thRun(
                `3. การจ่ายเงินค่าเช่า ผู้เช่าจะต้องจ่ายเป็นจำนวนเงิน ${monthlyRentStr} บาท ( ${monthlyRentTh} ) โดยจ่ายภายในวันที่ ${paymentDate} ของแต่ละเดือนปฏิทิน ผ่านบัญชี ${landlordBank} หมายเลขบัญชี ${landlordAccountNo} ชื่อบัญชี ${landlordAccount} ซึ่งทั้งสองฝ่ายได้ตกลงกันไว้ ณ วันทำสัญญา`,
                { size: 28 }
              ),
            ],
          }),
          new Paragraph({
            spacing: { after: 180 },
            children: [
              enRun(
                `3. The rental fee payment shall be ${monthlyRentStr} Baht ( ${monthlyRentEn} ), which The Tenant agrees to transfer on the ${paymentDate} day of each calendar month to The Landlord's bank account Bank ${landlordBank} Account No.: ${landlordAccountNo} Account Name ${landlordAccount} which both parties have agreed upon on the date of this agreement.`,
                { italics: true, size: 20 }
              ),
            ],
          }),

          // END OF PAGE 2 -> PAGE BREAK
          createPageBreak(),

          // =========================================================================
          // PAGE 3: Clauses 4 - 5 (Late Payment Penalty, Security Deposit & Advance)
          // =========================================================================
          new Paragraph({
            spacing: { before: 80, after: 60 },
            children: [
              thRun(
                `4. กรณีผู้เช่าชำระค่าเช่าเดือนใดล่าช้า ผู้เช่ายอมจ่ายดอกเบี้ยในอัตราร้อยละ 1.25 ต่อเดือน ของจำนวนเงินค่าเช่าที่ค้างจ่าย ชำระ ${penaltyAmount} บาท/วัน นับแต่วันที่ครบกำหนดชำระ แต่ไม่เกิน 5 วันและหากชำระล่าช้าเกิน 5 วัน นับตั้งแต่วันที่ครบสัญญาจะถือว่าผู้เช่าผิดนัดผิดสัญญาและผู้ให้เช่ามีสิทธิบอกเลิกสัญญาได้ทันทีโดยมิต้องบอกกล่าวล่วงหน้าอีกและ/หรือระงับหรือตกลงยินยอมให้ผู้ให้เช่ามีสิทธิที่จะดำเนินการงดหรือตัดการให้บริการต่างๆ ตามสัญญาให้บริการ เช่นระบบปรับอากาศ ระบบไฟฟ้า บริการโทรศัพท์หรือการสื่อสารอื่นๆ และบริการทั่วไปที่จัดให้แก่ผู้เช่าหรือสถานที่เช่าได้ทันทีตามที่ผู้ให้เช่าเห็นสมควรโดยผู้เช่าจะไม่โต้แย้งคัดค้านและเรียกร้องค่าเสียหายใดๆ จากผู้ให้เช่าทั้งสิ้นและจะไม่เรียกค่าชดเชยใด ๆ ทั้งสิ้นจากผู้ให้เช่าสำหรับความเสียหายหรือความไม่สะดวกที่เกิดขึ้นดังกล่าว`,
                { size: 28 }
              ),
            ],
          }),
          new Paragraph({
            spacing: { after: 140 },
            children: [
              enRun(
                `4. The late payment in any month is subject to interest at the rate of 1.25 percent per month on the outstanding balance amount calculated from the original due date ${penaltyAmount} Baht/day if The Tenant fails to make rental payments by the due date not more than 5 days. The lease will be terminated if The Tenant does not pay within 5 days. The Tenant may be deemed in default and The Landlord shall have the right to immediately terminate this agreement without prior notice, and/or to immediately suspend or terminate, in accordance with the Service agreement, the various services, such as air-conditioning, electrical, and water supply, telephone, or any other communication services, and any general service regularly provided to The Tenant or to the premise, as he sees fit, and The Tenant shall not oppose or contest such termination or suspension and shall not claim any form of compensation from Landlord for any damages or inconveniences resulting from such action.`,
                { italics: true, size: 20 }
              ),
            ],
          }),

          // Clause 5
          new Paragraph({
            spacing: { after: 60 },
            children: [
              thRun(
                `5. ผู้เช่าได้มอบเงินประกันการเช่าเป็นเงินจำนวน ${depositStr} บาท ( ${depositTh} ) และค่าเช่าล่วงหน้าจำนวน ${advanceRentStr} บาท ( ${advanceRentTh} ) รวมเป็นเงิน ${totalStr} บาท ( ${totalTh} ) ซึ่งเงินประกันที่ได้กล่าวไปข้างต้น เป็นเงินเพื่อเป็นการประกันการปฏิบัติการตามสัญญา และเป็นการประกันความเสียหายต่างๆ ที่อาจจะเกิดขึ้นแก่ทรัพย์สินที่เช่าเนื่องจากความผิดของผู้เช่าหรือบริวารของผู้เช่าซึ่งได้นำมาอาศัยอยู่ในทรัพย์สิน ถ้าผู้เช่าได้ปฏิบัติตามสัญญาถูกต้องเรียบร้อยและทรัพย์สินที่เช่าไม่ได้รับความเสียหายแต่อย่างใดแล้ว ผู้ให้เช่าจะคืนเงินจำนวนดังกล่าวให้แก่ผู้เช่าทันทีหลังจากสัญญาเช่าสิ้นสุดลงหากมีการยกเลิกสัญญาไม่ได้เกิดจากความผิดของผู้เช่า ผู้ให้เช่าตกลงจะคืนเงินประกันให้แก่ผู้เช่าหลังจากวันที่สัญญาสิ้นสุด หลังจากเช็คความเรียบร้อยของสถานที่ให้เช่าแล้ว โดยผู้ให้เช่าต้องดูแลระบบไฟฟ้า ปั๊มน้ำ และระบบน้ำ ให้อยู่ในสภาพพร้อมใช้งาน หากเกิดปัญหาด้าน ระบบไฟฟ้า ปั๊มน้ำ และระบบน้ำ รวมถึงเฟอร์นิเจอร์อันไม่ได้เกิดจากการกระทำอันประมาทเลินเล่อของผู้เช่า ภายใน 3 เดือน นับตั้งแต่วันที่เริ่มสัญญาผู้ให้เช่าต้องรับผิดชอบเพียงผู้เดียว`,
                { size: 28 }
              ),
            ],
          }),
          new Paragraph({
            spacing: { after: 180 },
            children: [
              enRun(
                `5. The Tenant provides a deposit of ${depositStr} Baht ( ${depositEn} ) and rental fee in advance in amount of ${advanceRentStr} Baht ( ${advanceRentEn} ) in a total of ${totalStr} Baht (${totalEn}). The aforementioned security deposit is intended to serve as a guarantee for any damage or loss that The Landlord might suffer as a result of The Tenant's breach, non-performance, or non-observance of any covenants contained herein. The Landlord shall return the security deposit to The Tenant at the end of this agreement if there is no damage to The Premises. Notwithstanding the foregoing, if the termination of this agreement is not caused by The Tenant's fault, the deposit shall be refunded to The Tenant in full after checking The Premises. The Landlord rents the house assuming that all electricity, plumbing, and water systems are well working. In the event of issues with electrical systems, water pumps, water systems, as well as furniture that are not a result of deliberate or malicious actions by The Tenant, within 3 months from the commencement date of the lease, The Landlord shall be solely responsible.`,
                { italics: true, size: 20 }
              ),
            ],
          }),

          // END OF PAGE 3 -> PAGE BREAK
          createPageBreak(),

          // =========================================================================
          // PAGE 4: Clauses 6 - 10 (Utilities, Care, Illegal Items, Valuables, Sublease)
          // =========================================================================
          // Clause 6
          new Paragraph({
            spacing: { before: 80, after: 60 },
            children: [
              thRun(
                `6. ตลอดระยะเวลาในการเช่า ค่าน้ำประปา, ค่าโทรศัพท์, ค่าไฟฟ้า, อินเตอร์เน็ต และค่าทำความสะอาด หรือค่าใช้จ่ายอื่นใดอันเกิดจากผู้เช่า ไม่ว่าในกรณีใด ๆ ทั้งสิ้น ผู้เช่าจะเป็นผู้รับผิดชอบแต่เพียงผู้เดียว`,
                { size: 28 }
              ),
            ],
          }),
          new Paragraph({
            spacing: { after: 120 },
            children: [
              enRun(
                `6. The Tenant is responsible for the costs of electricity, gas, Internet, telephone, cleaning expenses, and water per individual meter of usage at The Premises, as well as any other expenses incurred by The Tenant's actions during the duration of this lease.`,
                { italics: true, size: 20 }
              ),
            ],
          }),

          // Clause 7
          new Paragraph({
            spacing: { after: 60 },
            children: [
              thRun(
                `7. ผู้เช่าจะต้องรับผิดชอบต่อความเสียหาย และจะรักษาซ่อมแซมทรัพย์สินที่เช่าเหมือนเช่นบุคคลควรระวัง รักษาทรัพย์สินของตน ยกเว้นความเสียหายเนื่องจาก เสื่อมสภาพที่ยอมรับได้`,
                { size: 28 }
              ),
            ],
          }),
          new Paragraph({
            spacing: { after: 120 },
            children: [
              enRun(
                `7. The Tenant shall be responsible for any loss or damage to The Premises, furniture, fixtures, and electrical appliances, and shall maintain The Premises in the same manner as a responsible person would maintain his own property. Reasonable wear and tear are acceptable.`,
                { italics: true, size: 20 }
              ),
            ],
          }),

          // Clause 8
          new Paragraph({
            spacing: { after: 60 },
            children: [
              thRun(
                `8. ผู้เช่าจะต้องไม่นำ สินค้า สิ่งของ วัสดุที่ผิดกฎหมายเข้ามาไว้หรือขาย หรือจำหน่ายในทรัพย์สินที่เช่า หรือเมื่อผู้ให้เช่าพิจารณา เห็นว่า สินค้าใด วัตถุไม่สมควรจะอยู่ในทรัพย์สินที่เช่าผู้เช่าต้องขนย้ายสิ่งของนั้น ๆ ออกไปจากทรัพย์สินที่เช่าทันที ด้วยค่าใช้จ่ายของผู้เช่าเอง`,
                { size: 28 }
              ),
            ],
          }),
          new Paragraph({
            spacing: { after: 120 },
            children: [
              enRun(
                `8. The Tenant is not allowed to bring any illegal materials to The Premises for storage or sale. If The Landlord considers certain items inappropriate to be kept or sold on The Premises, The Tenant is responsible for their removal cost.`,
                { italics: true, size: 20 }
              ),
            ],
          }),

          // Clause 9
          new Paragraph({
            spacing: { after: 60 },
            children: [
              thRun(
                `9. ผู้ให้เช่าไม่ต้องรับผิดชอบต่อความเสียหาย หรือสูญหายแก่ทรัพย์สินที่ผู้เช่านำมาไว้ในทรัพย์สินที่เช่า`,
                { size: 28 }
              ),
            ],
          }),
          new Paragraph({
            spacing: { after: 120 },
            children: [
              enRun(
                `9. The Landlord is not responsible for any loss or damage to The Tenant's property or belongings.`,
                { italics: true, size: 20 }
              ),
            ],
          }),

          // Clause 10
          new Paragraph({
            spacing: { after: 60 },
            children: [
              thRun(
                `10. ห้ามมิให้ผู้เช่านำทรัพย์ที่เช่าทั้งหมดหรือบางส่วนไปให้บุคคลอื่นหรือโอนสิทธิการเช่าให้แก่บุคคลอื่น เว้นแต่จะได้รับอนุญาตเป็นลายลักษณ์อักษรจากผู้ให้เช่า ซึ่งความยินยอมดังกล่าวจะต้องไม่ถูกยับยั้ง มีเงื่อนไข หรือทำให้ล่าช้าโดยเหตุไม่อันควร และห้ามผู้เช่านำทรัพย์สินที่เช่าตามสัญญานี้ไปประกอบกิจการอันผิดกฎหมาย ศีลธรรม ขนบธรรมเนียม หรือทำให้บ้านใกล้เคียงได้รับความเดือดร้อนโดยเด็ดขาด`,
                { size: 28 }
              ),
            ],
          }),
          new Paragraph({
            spacing: { after: 180 },
            children: [
              enRun(
                `10. The Landlord prohibits the assignment or sublease of The Premises or any part thereof without prior written consent, which consent shall not be unreasonably withheld, conditioned, or delayed. Additionally, The Tenant may not use The Premises for illegal, immoral, unusual, or disturbing purposes.`,
                { italics: true, size: 20 }
              ),
            ],
          }),

          // END OF PAGE 4 -> PAGE BREAK
          createPageBreak(),

          // =========================================================================
          // PAGE 5: Clauses 11 - 15 (Modification, Eviction, Written Consent, Force Majeure, Minor Repairs)
          // =========================================================================
          // Clause 11
          new Paragraph({
            spacing: { before: 80, after: 60 },
            children: [
              thRun(
                `11. หากผู้เช่าประสงค์จะต่อเติมดัดแปลง ซ่อมแซม ตกแต่งส่วนหนึ่งส่วนใดของทรัพย์สินที่เช่านับถัดจากวันที่สัญญาเช่ามีผลผูกพันเป็นต้นไป ผู้เช่าต้องกระทำด้วยค่าใช้จ่ายของผู้เช่าเองทั้งสิ้น และต้องได้รับความยินยอมเป็นลายลักษณ์อักษรจากผู้ให้เช่าก่อนซึ่งความยินยอมดังกล่าวจะต้องไม่ถูกยับยั้งมีเงื่อนไข หรือทำให้ล่าช้า โดยไม่มีเหตุอันควร หากมีการยกเลิกสัญญา หรือสัญญาสิ้นสุด สิ่งใดที่เป็นการต่อเติม ดัดแปลง ซ่อมแซม หรือตกแต่งถาวรผู้เช่าตกลงมอบกรรมสิทธิ์ในสิ่งนั้นให้แก่ผู้ให้เช่า สิ่งใดที่เป็นการต่อเติมดัดแปลง ซ่อมแซม ตกแต่งชั่วคราวผู้เช่าจะรื้อถอนและขนย้ายออกไปจากทรัพย์สินที่เช่าด้วยค่าใช้จ่ายของผู้เช่าเอง`,
                { size: 28 }
              ),
            ],
          }),
          new Paragraph({
            spacing: { after: 120 },
            children: [
              enRun(
                `11. The Tenant shall not make any modification to any part of the Premise without the prior written consent of The Landlord, with consent shall not be unreasonably withheld, conditioned, or delayed. If The Tenant modifies the permanent structure of The Premises or decorates following the given consent, The Tenant agrees to transfer the ownership of the modified or decorated property to The Landlord. Any temporary structure added with the consent of The Landlord at the expense of The Tenant will be removed and retained by The Tenant at the termination of this Agreement.`,
                { italics: true, size: 20 }
              ),
            ],
          }),

          // Clause 12
          new Paragraph({
            spacing: { after: 60 },
            children: [
              thRun(
                `12. หากผู้เช่าประพฤติผิดสัญญา หรือหากสัญญาเช่าต้องเลิกกัน ผู้เช่าต้องขนย้ายสินค้า วัตถุสิ่งของรวมทั้งบริวารออกไปจาก ทรัพย์สินภายใน 24 ชั่วโมง นับจากวันที่สัญญานี้เลิกกัน หากผู้เช่าไม่ยอมเลิกใช้ประโยชน์หรือไม่ยอมขนทรัพย์สิน และ บริวาร ออกไปจากที่เช่าดังกล่าว ผู้ให้เช่ามีสิทธิริบเงินประกัน และมีสิทธิเข้าครอบครองทรัพย์ที่เช่า ได้ทันที`,
                { size: 28 }
              ),
            ],
          }),
          new Paragraph({
            spacing: { after: 120 },
            children: [
              enRun(
                `12. If The Tenant infringes any section of this agreement, or the agreement ends for whatever reason, The Tenant will move out, at its own cost, all of its belongings, possessions, as well as its dependents from the Premise in 24 hours since the date of termination. The Landlord shall have the right to seize the deposit and repossess The Premises.`,
                { italics: true, size: 20 }
              ),
            ],
          }),

          // Clause 13
          new Paragraph({
            spacing: { after: 60 },
            children: [
              thRun(
                `13. ในกรณีใด ๆ ก็ตาม จะไม่ถือว่ามีการแก้ไขเปลี่ยนแปลงข้อตกลงใด ๆ ในสัญญานี้ เว้นแต่การแก้ไขเปลี่ยนแปลงนั้นจะเป็น ลายลักษณ์อักษรและลงลายมือชื่อโดยคู่สัญญาทั้งสองฝ่าย`,
                { size: 28 }
              ),
            ],
          }),
          new Paragraph({
            spacing: { after: 120 },
            children: [
              enRun(
                `13. Any changes or modifications to this agreement must be done in writing and signed by both parties.`,
                { italics: true, size: 20 }
              ),
            ],
          }),

          // Clause 14
          new Paragraph({
            spacing: { after: 60 },
            children: [
              thRun(
                `14. ภายใต้บังคับข้อ 6 แห่งสัญญานี้ ผู้ให้เช่าตกลงซ่อมแซมในส่วนความเสียหายของทรัพย์สินหลัก ซึ่งไม่ได้เกิดจากการกระทำของผู้เช่า เช่นแผ่นดินไหว พายุน้ำท่วม หรือภัยจากสงคราม`,
                { size: 28 }
              ),
            ],
          }),
          new Paragraph({
            spacing: { after: 120 },
            children: [
              enRun(
                `14. Notwithstanding section 6, The Landlord shall be responsible for damage to the building or contents in storage caused by natural phenomena such as earthquakes, storms, or floods, as well as damage caused by war.`,
                { italics: true, size: 20 }
              ),
            ],
          }),

          // Clause 15
          new Paragraph({
            spacing: { after: 60 },
            children: [
              thRun(
                `15. ผู้เช่าตกลงที่จะซ่อมแซมทรัพย์สินที่ไม่ใช่ความเสียหายหลัก เช่น หลอดไฟขาด หรือสายโทรศัพท์ขาด เป็นต้น`,
                { size: 28 }
              ),
            ],
          }),
          new Paragraph({
            spacing: { after: 180 },
            children: [
              enRun(
                `15. The Tenant shall be responsible for the maintenance; for example, the light bulb goes out; the telephone cord wears out, etc.`,
                { italics: true, size: 20 }
              ),
            ],
          }),

          // END OF PAGE 5 -> PAGE BREAK
          createPageBreak(),

          // =========================================================================
          // PAGE 6: Clauses 16 - 18 (Dispute Mediator, Fire/Insurance, Landlord Inspection)
          // =========================================================================
          // Clause 16
          new Paragraph({
            spacing: { before: 80, after: 60 },
            children: [
              thRun(
                `16. กรณีที่มีการละเมิดสัญญาเกิดขึ้น เพื่อความเป็นธรรมแก่ทั้งสองฝ่ายจะต้องมีบุคคลที่สามคือเจ้าหน้าที่ที่มีความเป็นกลางไม่มีความเกี่ยวข้องสัมพันธ์กับฝ่ายหนึ่งฝ่ายใดเป็นพิเศษ และต้องมาจากการ ตกลงระหว่างทั้งสองฝ่าย มาเป็นผู้พิจารณาตัดสิน`,
                { size: 28 }
              ),
            ],
          }),
          new Paragraph({
            spacing: { after: 140 },
            children: [
              enRun(
                `16. In the case of a breach of contract, a mediator shall be used to settle the matter. This mediator shall be a neutral third party who has no special relationship with either party and takes no side.`,
                { italics: true, size: 20 }
              ),
            ],
          }),

          // Clause 17
          new Paragraph({
            spacing: { after: 60 },
            children: [
              thRun(
                `17. ถ้าหากเกิดอัคคีภัยขึ้นไม่ว่ากรณีใดๆ ทั้งสิ้น ในสัญญาเช่านี้ ถือเป็นอันสิ้นสุดลง หรือ กรณีเกิดอัคคีภัยเนื่องจากความประมาทเลินเล่อของผู้เช่า (เช่น การใช้อุปกรณ์ไฟฟ้า หรือ เกิดจากการใช้แก๊สหุงต้ม) ผู้เช่าจะรับผิดชอบความเสียหายในส่วนที่เกินความคุ้มครองของประกันภัยและบริเวณใกล้ ๆ อื่นที่เกิดขึ้น`,
                { size: 28 }
              ),
            ],
          }),
          new Paragraph({
            spacing: { after: 140 },
            children: [
              enRun(
                `17. This lease is considered to be ended in the case of any fire, regardless of the cause. Or, in the event of a fire caused by The Tenant's negligence (such as the use of electrical equipment or the use of LPG), The Tenant will be responsible for any damages that exceed the insurance coverage and the surrounding area.`,
                { italics: true, size: 20 }
              ),
            ],
          }),

          // Clause 18
          new Paragraph({
            spacing: { after: 60 },
            children: [
              thRun(
                `18. ผู้เช่ายินยอมให้ผู้ให้เช่าหรือตัวแทนเข้าตรวจตราสถานที่เช่าได้ ตามที่เห็นสมควรหรือเมื่อมีเหตุจำเป็น และเร่งด่วนผู้ให้เช่าจะแจ้งให้ผู้เช่าทราบล่วงหน้า 24 ชั่วโมงโดยผู้เช่าจะอำนวยความสะดวกทันที`,
                { size: 28 }
              ),
            ],
          }),
          new Paragraph({
            spacing: { after: 180 },
            children: [
              enRun(
                `18. The Landlord or Landlord's agents may enter the premises in the event of an emergency, Landlord may also enter the premises to conduct an annual inspection to check for safety or maintenance problems. The Landlord will give notice 24 hours.`,
                { italics: true, size: 20 }
              ),
            ],
          }),

          // END OF PAGE 6 -> PAGE BREAK
          createPageBreak(),

          // =========================================================================
          // PAGE 7: Clauses 19 - 20 (Renewal & Viewings, Agent Payment Disclaimer)
          // =========================================================================
          // Clause 19
          new Paragraph({
            spacing: { before: 80, after: 60 },
            children: [
              thRun(
                `19. การต่ออายุสัญญาเช่าและการเข้าชมทรัพย์สิน\nหากผู้เช่าประสงค์จะต่ออายุสัญญาเช่า ผู้เช่าจะต้องแจ้งความประสงค์ดังกล่าวแก่ผู้ให้เช่าล่วงหน้าไม่น้อยกว่า 60 วันก่อนวันสิ้นสุดสัญญาเช่า ในกรณีที่ผู้เช่าไม่ประสงค์จะต่ออายุสัญญาเช่า ในช่วงระยะเวลา 60 วันก่อนวันสิ้นสุดสัญญาเช่า ผู้เช่าตกลงและยินยอมให้ผู้ให้เช่าหรือตัวแทนของผู้ให้เช่า นำผู้ที่สนใจเช่าทรัพย์สินเข้าชมทรัพย์สินที่เช่าได้โดยผู้ให้เช่าหรือตัวแทนของผู้ให้เช่าจะต้องแจ้งให้ผู้เช่าทราบล่วงหน้าก่อนเข้าชมทุกครั้ง และผู้เช่าจะให้ความร่วมมือและอำนวยความสะดวกตามสมควร`,
                { size: 28 }
              ),
            ],
          }),
          new Paragraph({
            spacing: { after: 140 },
            children: [
              enRun(
                `19. Lease Renewal and Property Viewings\nIf the Tenant wishes to renew the lease, the Tenant shall notify the Landlord of such intention at least 60 days prior to the expiry date of this Lease Agreement. If the Tenant does not wish to renew the lease, during the 60-day period prior to the expiry date of this Lease Agreement, the Tenant agrees and permits the Landlord or the Landlord's authorized representative to bring prospective tenants to view the leased property. The Landlord or the Landlord's representative shall provide the Tenant with prior notice before each viewing, and the Tenant shall reasonably cooperate and facilitate such viewings.`,
                { italics: true, size: 20 }
              ),
            ],
          }),

          // Clause 20
          new Paragraph({
            spacing: { after: 60 },
            children: [
              thRun(
                `20. การชำระค่าเช่า\nสัญญาฉบับนี้จัดทำขึ้นโดย บริษัท ไพร์ม โกลบอลแอสเสท จำกัด (Prime Global Asset Co., Ltd.) / PEAK REAL ESTATE ซึ่งทำหน้าที่เป็นนายหน้า ทั้งนี้บริษัทไม่มีนโยบายให้พนักงานขายหรือตัวแทนของบริษัทรับชำระค่าเช่าโดยตรงจากผู้เช่า ผู้เช่าจะต้องชำระค่าเช่าโดยการโอนเงินเข้าบัญชีธนาคารของผู้ให้เช่าโดยตรงเท่านั้น หรือในกรณีที่ผู้เช่าประสงค์จะชำระค่าเช่าเป็นเงินสด ผู้เช่าจะต้องนำเงินสดมาชำระ ณ สำนักงานของบริษัทโดยตรงเท่านั้น ผู้เช่ารับทราบและตกลงปฏิบัติตามวิธีการชำระเงินดังกล่าว หากผู้เช่าชำระเงินให้แก่บุคคลอื่นซึ่งมิใช่ผู้ให้เช่าหรือชำระนอกเหนือจากวิธีการที่กำหนดไว้ในข้อนี้ บริษัทขอสงวนสิทธิ์ ไม่รับผิดชอบต่อความเสียหาย ความสูญเสีย หรือข้อพิพาทใด ๆ ที่เกิดขึ้นจากการชำระเงินดังกล่าวในทุกกรณี`,
                { size: 28 }
              ),
            ],
          }),
          new Paragraph({
            spacing: { after: 180 },
            children: [
              enRun(
                `20. Rental Payment\nThis Lease Agreement is prepared by Prime Global Asset Co., Ltd. / PEAK REAL ESTATE, acting as a real estate agent. The Company does not authorize its sales staff or representatives to directly collect rental payments from the Tenant. The Tenant shall pay the rent by transferring the payment directly to the Landlord's bank account only. If the Tenant wishes to pay the rent in cash, the Tenant must make such payment directly at the Company's office only. The Tenant acknowledges and agrees to comply with the payment methods specified above. If the Tenant makes any payment to any person other than the Landlord or makes any payment through a method other than those specified in this Clause, the Company reserves the right to disclaim any responsibility or liability for any loss, damage, dispute, or other consequences arising from such payment in all cases.`,
                { italics: true, size: 20 }
              ),
            ],
          }),

          // END OF PAGE 7 -> PAGE BREAK
          createPageBreak(),

          // =========================================================================
          // PAGE 8: Governing Law, 4-Party Signatures & Utility Payment Schedule
          // =========================================================================
          new Paragraph({
            spacing: { before: 80, after: 60 },
            children: [
              thRun('สัญญานี้ได้ทำขึ้นทั้งภาษาไทยและภาษาอังกฤษ โดยยึดภาษาไทยเป็นหลัก', { bold: true, size: 28 }),
            ],
          }),
          new Paragraph({
            spacing: { after: 100 },
            children: [
              enRun(
                'This agreement shall be governed and interpreted under the law of Thailand, in case the English translation is made, the parties agree that the interpretation and enforcement under this agreement shall apply to the Thai version.',
                { italics: true, size: 20 }
              ),
            ],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [
              thRun(
                `สัญญานี้ทำขึ้นเป็นสองฉบับ มีข้อความถูกต้องตรงกัน ทั้งสองฝ่ายได้อ่านและเข้าใจข้อความโดยตลอดดีแล้วและตกลงที่จะปฏิบัติตามทุกประการ จึงได้ลงลายมือและประทับตรา (ถ้ามี) ไว้เป็นหลักฐานต่อหน้าพยาน และถือไว้ฝ่ายละฉบับ`,
                { size: 28 }
              ),
            ],
          }),
          new Paragraph({
            spacing: { after: 140 },
            children: [
              enRun(
                'This agreement is prepared in duplicate identical wording. Both parties have read and fully understand its contents and agree to comply with its terms and conditions. The Landlord and The Tenant are to keep one signed copy each.',
                { italics: true, size: 20 }
              ),
            ],
          }),

          // 4-Party Signatures Table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        spacing: { before: 80, after: 60 },
                        children: [thRun('ผู้ให้เช่า ลงชื่อ _________________________________', { size: 26 })],
                      }),
                      new Paragraph({
                        spacing: { after: 80 },
                        children: [enRun(`The Landlord: ( ${ownerName} )`, { size: 20 })],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        spacing: { before: 80, after: 60 },
                        children: [thRun('ผู้เช่า ลงชื่อ _________________________________', { size: 26 })],
                      }),
                      new Paragraph({
                        spacing: { after: 80 },
                        children: [enRun(`The Tenant: ( ${tenantName} )`, { size: 20 })],
                      }),
                    ],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        spacing: { before: 80, after: 60 },
                        children: [thRun('พยานที่ 1 ลงชื่อ _________________________________', { size: 26 })],
                      }),
                      new Paragraph({
                        spacing: { after: 80 },
                        children: [enRun(`The Witness 1: ( ${contract.salesName || contract.agent || 'PEAK Agent'} )`, { size: 20 })],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        spacing: { before: 80, after: 60 },
                        children: [thRun('พยานที่ 2 ลงชื่อ _________________________________', { size: 26 })],
                      }),
                      new Paragraph({
                        spacing: { after: 80 },
                        children: [enRun('The Witness 2: ( _________________________________ )', { size: 20 })],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),

          // Utility Schedule
          new Paragraph({
            spacing: { before: 140, after: 60 },
            children: [
              thRun('ผู้เช่าจะชำระ / The Tenant shall pay:', { bold: true, size: 28 }),
            ],
          }),
          new Paragraph({
            spacing: { after: 40 },
            children: [
              thRun('1. ค่าไฟฟ้า (Electricity fee by bill): ', { bold: true, size: 26 }),
              thRun('ตามใบเสร็จเรียกเก็บจากหน่วยงานราชการ / Government Bill', { size: 26 }),
            ],
          }),
          new Paragraph({
            spacing: { after: 40 },
            children: [
              thRun('2. ค่าน้ำประปา (Water fee by bill): ', { bold: true, size: 26 }),
              thRun('ตามใบเสร็จเรียกเก็บจากหน่วยงานราชการ / Government Bill', { size: 26 }),
            ],
          }),
          new Paragraph({
            spacing: { after: 40 },
            children: [
              thRun('3. ค่าอินเตอร์เน็ต (Internet-Wifi): ', { bold: true, size: 26 }),
              thRun('ผู้เช่าชำระตามการใช้งาน / -', { size: 26 }),
            ],
          }),
          new Paragraph({
            spacing: { after: 40 },
            children: [
              thRun('4. ค่าทำความสะอาด (Cleaning Service Fee): ', { bold: true, size: 26 }),
              thRun('ผู้เช่าชำระตามการใช้งาน / -', { size: 26 }),
            ],
          }),
          new Paragraph({
            spacing: { after: 140 },
            children: [
              thRun('5. หากกุญแจหายดอกละ 100 บาท (Lost key 100 Baht/Each)', { bold: true, size: 26 }),
            ],
          }),

          // END OF PAGE 8 -> PAGE BREAK
          createPageBreak(),

          // =========================================================================
          // PAGE 9: ANNEX (เอกสารแนบท้าย) - Additional Living Rules
          // =========================================================================
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 80, after: 60 },
            children: [
              thRun('ANNEX (เอกสารแนบท้าย)', { bold: true, size: 34 }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 140 },
            children: [
              enRun('Additional Rules and Living Regulations', { bold: true, italics: false, size: 24 }),
            ],
          }),

          new Paragraph({
            spacing: { after: 60 },
            children: [
              thRun('1. ข้อตกลงเพิ่มเติม (Extra Condition):', { bold: true, size: 28 }),
            ],
          }),
          new Paragraph({
            spacing: { after: 50 },
            children: [
              thRun(
                '- ผู้เช่าต้องไม่ทิ้งกระดาษ ผ้าอนามัย รวมถึงพลาสติกและที่ปั่นหู ลงโถส้วม / Do not leave the paper or sanitary pads, including plastics and cotton bud in the toilet.',
                { size: 26 }
              ),
            ],
          }),
          new Paragraph({
            spacing: { after: 50 },
            children: [
              thRun(
                '- เมื่อไฟตก ผู้เช่าต้องหยุดใช้งานเครื่องใช้ไฟฟ้าทุกชนิดที่มีมอเตอร์ / When the power failure, The Tenant have to stop using electrical appliances generated by the motor.',
                { size: 26 }
              ),
            ],
          }),
          new Paragraph({
            spacing: { after: 50 },
            children: [
              thRun(
                '- ผู้เช่าต้องไม่นำสิ่งของที่จัดเตรียมไว้ใช้ในบ้าน ไปใช้นอกสถานที่เช่า / The Tenant must not take items in the house for using outside the property.',
                { size: 26 }
              ),
            ],
          }),
          new Paragraph({
            spacing: { after: 50 },
            children: [
              thRun(
                '- ผู้เช่าจะต้องไม่สูบบุหรี่หรือกัญชาภายในบ้าน หรือสูบบริเวณบ้านและส่งกลิ่นรบกวนเพื่อนบ้าน หากตรวจสอบพบว่าผู้เช่ากระทำการดังกล่าวผู้เช่าจะต้องชำระเงินค่าทำความสะอาดเพิ่มเติมตามค่าใช้จ่ายที่เกิดขึ้นจริง / The tenant must not smoke cigarettes or cannabis inside the house or in the surrounding area if it causes a disturbance to neighbors. If it is found that the tenant has engaged in such activities, the tenant will be responsible for paying additional cleaning fees as per the actual costs incurred.',
                { size: 26 }
              ),
            ],
          }),
          new Paragraph({
            spacing: { after: 120 },
            children: [
              thRun(
                '- ทรัพย์สินที่อยู่ในบ้านถูกบันทึกเป็นภาพถ่าย / Items in the house have been recorded and saved by photo.',
                { size: 26 }
              ),
            ],
          }),

          new Paragraph({
            spacing: { after: 60 },
            children: [
              thRun(
                '2. เมื่อสิ้นสุดสัญญาเช่า ก่อนผู้เช่าจะทำการย้ายออก ผู้เช่าจะต้องแจ้งนัดหมายล่วงหน้ากับตัวแทนของผู้ให้เช่า และให้เวลาในการตรวจสอบความเสียหายของทรัพย์สินทั้งหมดก่อนจะคืนเงินประกันการเช่าให้แก่ผู้เช่า อย่างน้อย 7 วัน หรือตามความเหมาะสม / Upon the termination of the lease, before moving out, the tenant must schedule an appointment with the landlord\'s representative to allow time for inspecting the property for any damages. This inspection should be conducted at least 7 days in advance or as deemed appropriate before the security deposit is returned to the tenant.',
                { size: 26 }
              ),
            ],
          }),
          new Paragraph({
            spacing: { after: 140 },
            children: [
              thRun(
                '3. เวลาเช็คอินเช็คเอาท์ต้องเป็นช่วงเวลาระหว่าง 09:00-18:00 เท่านั้น / Check-in and check-out time must be between 09:00-18:00 only.',
                { bold: true, size: 26 }
              ),
            ],
          }),

          // END OF PAGE 9 -> PAGE BREAK
          createPageBreak(),

          // =========================================================================
          // PAGE 10: Check-out Condition & Handover Signatures
          // =========================================================================
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 80, after: 60 },
            children: [
              thRun('เงื่อนไขการส่งมอบห้องคืน', { bold: true, size: 34 }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 140 },
            children: [
              enRun('CHECK-OUT CONDITION', { bold: true, italics: false, size: 24 }),
            ],
          }),

          new Paragraph({
            spacing: { after: 60 },
            children: [
              thRun(
                '1. ผู้ให้เช่าสามารถเรียกเก็บค่าทำความสะอาดได้ขึ้นอยู่กับขนาดบ้าน หรือถ้าบ้านสกปรกมาก ค่าใช้จ่ายจะอยู่ที่ประมาณ 2,000-5,000 บาท / The Landlord has right to charge for cleaning, based on the size of the house. If the house is significantly dirty, the cost will be approximately 2,000-5,000 Baht.',
                { size: 26 }
              ),
            ],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [
              thRun(
                '2. ล้างเครื่องปรับอากาศเครื่องละ 800 บาท / Air condition cleaning 800 Baht each.',
                { size: 26 }
              ),
            ],
          }),
          new Paragraph({
            spacing: { after: 60 },
            children: [
              thRun(
                '3. ผู้เช่าต้องตรวจสอบให้แน่ใจว่าอุปกรณ์ไฟฟ้าและสิ่งของต่างๆ ใช้งานได้ปกติ / Make sure all the electric equipment and all the property are working.',
                { size: 26 }
              ),
            ],
          }),
          new Paragraph({
            spacing: { after: 140 },
            children: [
              thRun(
                '4. ผู้เช่าต้องนำใบเสร็จค่าไฟฟ้าและค่าน้ำ 2 เดือนสุดท้าย แสดงให้ผู้ให้เช่าดู ในวันที่ย้ายออก / The Tenant have to show the last 2 bills of electric and water on check-out date.',
                { size: 26 }
              ),
            ],
          }),

          // Check-out signatures
          new Paragraph({
            spacing: { before: 100, after: 60 },
            children: [
              thRun('ลายมือชื่อส่งมอบและตรวจรับห้องคืน / Check-out Confirmation Signatures:', { bold: true, size: 26 }),
            ],
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        spacing: { before: 80, after: 60 },
                        children: [thRun('ผู้ให้เช่า ลงชื่อ _________________________________', { size: 26 })],
                      }),
                      new Paragraph({
                        spacing: { after: 80 },
                        children: [enRun(`The Landlord: ( ${ownerName} )`, { size: 20 })],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        spacing: { before: 80, after: 60 },
                        children: [thRun('ผู้เช่า ลงชื่อ _________________________________', { size: 26 })],
                      }),
                      new Paragraph({
                        spacing: { after: 80 },
                        children: [enRun(`The Tenant: ( ${tenantName} )`, { size: 20 })],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),

          // END OF PAGE 10 -> PAGE BREAK
          createPageBreak(),

          // =========================================================================
          // PAGE 11: Attached Document 1 — The Tenant's Passport
          // =========================================================================
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 80, after: 40 },
            children: [
              thRun('เอกสารแนบ 1', { bold: true, size: 32 }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 },
            children: [
              enRun("ATTACHED DOCUMENT 1: THE TENANT'S PASSPORT", { bold: true, italics: false, size: 24 }),
            ],
          }),
          new Paragraph({
            spacing: { after: 40 },
            children: [
              thRun(`ชื่อผู้เช่า (Tenant Name): `, { bold: true, size: 26 }),
              thRun(`${tenantName}`, { size: 26 }),
            ],
          }),
          new Paragraph({
            spacing: { after: 40 },
            children: [
              thRun(`เลขที่หนังสือเดินทาง (Passport No.): `, { bold: true, size: 26 }),
              thRun(`${tenantIdNo}`, { size: 26 }),
              thRun(`  |  สัญชาติ (Nationality): `, { bold: true, size: 26 }),
              thRun(`${tenantNationality}`, { size: 26 }),
            ],
          }),
          new Paragraph({
            spacing: { after: 140 },
            children: [
              thRun(`หมายเลขโทรศัพท์ (Phone No.): `, { bold: true, size: 26 }),
              thRun(`${tenantPhone}`, { size: 26 }),
            ],
          }),

          // Passport Certified True Copy Stamp Box
          createCertifiedStampBox(
            premisesHouseNo,
            premisesProject,
            'ผู้เช่า',
            'The Tenant',
            tenantName
          ),

          // END OF PAGE 11 -> PAGE BREAK
          createPageBreak(),

          // =========================================================================
          // PAGE 12: Attached Document 2 — The Landlord's Identification Card
          // =========================================================================
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 80, after: 40 },
            children: [
              thRun('เอกสารแนบ 2', { bold: true, size: 32 }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 },
            children: [
              enRun("ATTACHED DOCUMENT 2: THE LANDLORD'S IDENTIFICATION CARD", { bold: true, italics: false, size: 24 }),
            ],
          }),
          new Paragraph({
            spacing: { after: 40 },
            children: [
              thRun(`ชื่อผู้ให้เช่า (Landlord Name): `, { bold: true, size: 26 }),
              thRun(`${ownerName}`, { size: 26 }),
            ],
          }),
          new Paragraph({
            spacing: { after: 40 },
            children: [
              thRun(`เลขประจำตัวประชาชน (Identification No.): `, { bold: true, size: 26 }),
              thRun(`${landlordIdNo}`, { size: 26 }),
              thRun(`  |  สัญชาติ (Nationality): `, { bold: true, size: 26 }),
              thRun(`${landlordNationality}`, { size: 26 }),
            ],
          }),
          new Paragraph({
            spacing: { after: 140 },
            children: [
              thRun(`ที่อยู่ตามทะเบียน: `, { bold: true, size: 26 }),
              thRun(`${landlordHouseNo} โครงการ ${landlordProject} ม.${landlordMoo} ต.${landlordSubDistrict} อ.${landlordDistrict} จ.${landlordProvince} ${landlordPostalCode}`, { size: 26 }),
            ],
          }),

          // Landlord ID Certified True Copy Stamp Box
          createCertifiedStampBox(
            premisesHouseNo,
            premisesProject,
            'ผู้ให้เช่า',
            'The Landlord',
            ownerName
          ),

          // END OF PAGE 12 -> PAGE BREAK
          createPageBreak(),

          // =========================================================================
          // PAGE 13: Attached Document 3 — Leased Premises House Registration Certificate
          // =========================================================================
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 80, after: 40 },
            children: [
              thRun('เอกสารแนบ 3', { bold: true, size: 32 }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 },
            children: [
              enRun('ATTACHED DOCUMENT 3: LEASED PREMISES HOUSE REGISTRATION', { bold: true, italics: false, size: 24 }),
            ],
          }),
          new Paragraph({
            spacing: { after: 40 },
            children: [
              thRun(`สำเนาทะเบียนบ้านทรัพย์สินที่เช่า: `, { bold: true, size: 26 }),
              thRun(`บ้านเลขที่ ${premisesHouseNo} โครงการ ${premisesProject}`, { size: 26 }),
            ],
          }),
          new Paragraph({
            spacing: { after: 40 },
            children: [
              thRun(`ที่ตั้งทรัพย์สิน: `, { bold: true, size: 26 }),
              thRun(`หมู่ที่ ${premisesMoo} ตำบล ${premisesSubDistrict} อำเภอ ${premisesDistrict} จังหวัด ${premisesProvince} รหัสไปรษณีย์ ${premisesPostalCode}`, { size: 26 }),
            ],
          }),
          new Paragraph({
            spacing: { after: 140 },
            children: [
              thRun(`รหัสทรัพย์สินในระบบ (Property ID): `, { bold: true, size: 26 }),
              thRun(`${contract.propertyId || '-'}`, { size: 26 }),
            ],
          }),

          // House Registration Certified True Copy Stamp Box
          createCertifiedStampBox(
            premisesHouseNo,
            premisesProject,
            'ผู้ให้เช่า',
            'The Landlord',
            ownerName
          ),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const cleanContractId = contractNo.replace(/[^a-zA-Z0-9_-]/g, '_');
  const timestamp = Date.now();
  const fileName = `PEAK_Lease_Agreement_${cleanContractId}_v${version}_${timestamp}.docx`;
  const filePath = path.join(GENERATED_CONTRACTS_DIR, fileName);

  fs.writeFileSync(filePath, buffer);

  const relativeUrl = `/generated_contracts/${fileName}`;
  return { fileName, filePath, relativeUrl, buffer };
}
