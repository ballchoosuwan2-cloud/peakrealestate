import React, { useState } from 'react';
import {
  X,
  Download,
  Printer,
  ChevronLeft,
  ChevronRight,
  FileText,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  DollarSign,
  Building,
  User,
  Stamp,
  ExternalLink,
} from 'lucide-react';
import { Contract } from '../types';

interface ContractDocumentViewerModalProps {
  contract: Contract | any;
  onClose: () => void;
  onDownloadDocx?: (contract: any) => void;
}

export const ContractDocumentViewerModal: React.FC<ContractDocumentViewerModalProps> = ({
  contract,
  onClose,
  onDownloadDocx,
}) => {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const totalPages = 13;

  const houseNo = contract.houseNo || '23/528';
  const project = contract.projectEn || contract.projectTh || 'Phanason Thepanusorn';
  const ownerName = contract.ownerName || 'นางสาว จงจิต สุทธิช่วย / Miss Jongjit Sutthichuay';
  const tenantName = contract.tenantName || 'MR. DMITRII KONDRATEV';
  const monthlyRent = Number(contract.monthlyRent || 35000).toLocaleString();
  const deposit = Number(contract.deposit || 70000).toLocaleString();
  const advanceRental = Number(contract.advanceRental || 35000).toLocaleString();
  const totalPrice = Number(contract.totalPrice || 105000).toLocaleString();
  const penalty = contract.penaltyAmount || '437.50';
  const signDate = contract.signDate || '2026-09-23';
  const rentalStart = contract.rentalStart || '2026-09-23';
  const rentalEnd = contract.rentalEnd || '2027-09-22';
  const rentalTime = contract.rentalTime || '12 Months';
  const bankName = contract.landlordBank || 'Kasikorn Bank (ธนาคารกสิกรไทย)';
  const accountNo = contract.landlordAccountNo || '132-8-78628-8';
  const accountName = contract.landlordAccountName || 'Miss Kanyanat Chuaychai (นางสาว กัญญาณัฐ ช่วยชัย)';
  const landlordIdNo = contract.landlordIdNo || '3 8015 00082 81 1';
  const tenantIdNo = contract.tenantIdNo || '77 1803669';
  const tenantPhone = contract.tenantPhone || '+66800300571';
  const tenantNationality = contract.tenantNationality || 'Russia';
  const agentName = contract.salesName || contract.agent || 'Sarah Jenkins';

  const pageLabels = [
    'หน้า 1: ข้อมูลคู่สัญญา',
    'หน้า 2: ข้อ 1-3 ทรัพย์สิน & ค่าเช่า',
    'หน้า 3: ข้อ 4-5 เบี้ยปรับ & มัดจำ',
    'หน้า 4: ข้อ 6-10 การใช้สอยทรัพย์',
    'หน้า 5: ข้อ 11-15 การดัดแปลง & ดูแล',
    'หน้า 6: ข้อ 16-18 ข้อพิพาท & อัคคีภัย',
    'หน้า 7: ข้อ 19-20 ต่อสัญญา & ชำระเงิน',
    'หน้า 8: กฎหมาย, ลงนาม & ตารางบิล',
    'หน้า 9: Annex ข้อตกลงเพิ่มเติม',
    'หน้า 10: Check-out Condition',
    'หน้า 11: เอกสาร Passport ผู้เช่า',
    'หน้า 12: เอกสาร บัตร ปชช ผู้ให้เช่า',
    'หน้า 13: เอกสาร ทะเบียนบ้านทรัพย์',
  ];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col max-h-[96vh] text-slate-100 overflow-hidden print:border-none print:shadow-none print:max-h-none print:w-full print:bg-white print:text-black">
        {/* Header Bar */}
        <div className="px-5 py-3.5 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-red-400 font-mono">
                  สัญญาเช่ามาตรฐาน 13 หน้า (Standard Bilingual Agreement)
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {contract.status || 'Active'}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold font-serif text-white flex items-center gap-2">
                {contract.contractId || contract.contractNumber || 'RENT-2026-0923'}
                <span className="text-xs font-normal text-slate-400">
                  — {houseNo} {project}
                </span>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onDownloadDocx && (
              <button
                onClick={() => onDownloadDocx(contract)}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
                title="Download full Word document (.docx)"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .docx</span>
              </button>
            )}
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition"
              title="Print or Save as PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Page Selector Tabs */}
        <div className="px-4 py-2 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between gap-2 overflow-x-auto shrink-0 print:hidden text-xs">
          <div className="flex items-center gap-1 overflow-x-auto py-1 scrollbar-thin">
            {pageLabels.map((lbl, idx) => {
              const pNum = idx + 1;
              const isActive = currentPage === pNum;
              return (
                <button
                  key={pNum}
                  onClick={() => setCurrentPage(pNum)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                    isActive
                      ? 'bg-red-600 text-white shadow-sm font-semibold'
                      : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  P.{pNum}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-2">
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none transition"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono text-slate-300 min-w-[70px] text-center">
              {currentPage} / {totalPages}
            </span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none transition"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Document Body Viewport (Simulating Realistic A4 Paper) */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-slate-950/40 flex justify-center print:p-0 print:bg-white print:overflow-visible">
          <div className="w-full max-w-3xl bg-white text-slate-900 rounded-xl shadow-xl border border-slate-200 p-6 sm:p-10 font-sans leading-relaxed text-sm relative print:border-none print:shadow-none print:max-w-none print:p-0">
            {/* Page Header Info */}
            <div className="flex justify-between items-center text-[11px] text-slate-600 border-b border-slate-200 pb-2 mb-6">
              <span>PEAK REAL ESTATE / PRIME GLOBAL ASSET</span>
              <span>
                Page {currentPage} of {totalPages} — {pageLabels[currentPage - 1]}
              </span>
            </div>

            {/* PAGE 1: Intro, Landlord & Tenant */}
            {currentPage === 1 && (
              <div className="space-y-6">
                <div className="text-center space-y-1">
                  <h1 className="text-2xl font-bold font-serif text-slate-900 tracking-wide">สัญญาเช่า</h1>
                  <h2 className="text-xl font-bold font-serif text-slate-800 tracking-wider">LEASE AGREEMENT</h2>
                </div>

                <div className="space-y-3 pt-4 text-xs sm:text-sm">
                  <p>
                    <span className="font-semibold">สัญญาฉบับนี้ทำขึ้นเมื่อวันที่/ This agreement is made on</span>{' '}
                    <span className="underline font-mono font-medium">{signDate}</span>
                  </p>
                  <p>
                    <span className="font-semibold">ที่ (at)</span>{' '}
                    <span className="underline font-medium">{contract.subDistrict || 'Wichit'}, {contract.province || 'Phuket'}</span>
                  </p>

                  <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <p className="font-semibold text-slate-800">
                      สัญญาฉบับนี้ทำขึ้นโดยและระหว่าง (by and between)
                    </p>
                    <p className="text-base font-bold text-slate-900">{ownerName}</p>
                    <p className="text-slate-700">
                      อาศัยอยู่ เลขที่ <span className="font-medium">{contract.landlordAddressHouseNo || '12/406'}</span>{' '}
                      โครงการ <span className="font-medium">{contract.landlordAddressProject || 'Chalong'}</span>{' '}
                      หมู่ที่ <span className="font-medium">{contract.landlordAddressMoo || '2'}</span>{' '}
                      ตำบล <span className="font-medium">{contract.landlordAddressSubDistrict || 'Wichit'}</span>{' '}
                      อำเภอ <span className="font-medium">{contract.landlordAddressDistrict || 'Mueang'}</span>{' '}
                      จังหวัด <span className="font-medium">{contract.landlordAddressProvince || 'Phuket'}</span>{' '}
                      รหัสไปรษณีย์ <span className="font-medium">{contract.landlordAddressPostalCode || '83000'}</span>
                    </p>
                    <p className="text-slate-700">
                      หมายเลขหนังสือเดินทาง/บัตรประจำตัวประชาชนเลขที่{' '}
                      <span className="font-mono font-bold text-slate-900">{landlordIdNo}</span> ต่อไปในสัญญานี้เรียกว่า{' '}
                      <span className="font-bold text-red-700">“ผู้ให้เช่า”</span>
                    </p>
                    <p className="text-xs text-slate-600 italic">
                      Hereinafter referred to as “The Landlord” who resides at the address; House No.{' '}
                      {contract.landlordAddressHouseNo || '12/406'} Project {contract.landlordAddressProject || 'Chalong'}{' '}
                      Moo {contract.landlordAddressMoo || '2'}, Sub-District {contract.landlordAddressSubDistrict || 'Wichit'},{' '}
                      District {contract.landlordAddressDistrict || 'Mueang'}, Province {contract.landlordAddressProvince || 'Phuket'}{' '}
                      Postal code {contract.landlordAddressPostalCode || '83000'} Passport No./Thai ID No. {landlordIdNo} On one part.
                    </p>
                  </div>

                  <div className="text-center font-bold text-slate-600 my-2">— ฝ่ายหนึ่ง กับ AND —</div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <p className="text-base font-bold text-slate-900">{tenantName}</p>
                    <p className="text-slate-700">
                      Passport no. <span className="font-mono font-bold">{tenantIdNo}</span> | Nationality:{' '}
                      <span className="font-medium">{tenantNationality}</span> | Phone:{' '}
                      <span className="font-mono font-medium">{tenantPhone}</span>
                    </p>
                    <p className="text-slate-700">
                      ต่อไปในสัญญานี้เรียกว่า <span className="font-bold text-red-700">“ผู้เช่า”</span> อีกฝ่ายหนึ่ง โดยที่คู่สัญญาทั้งสองฝ่าย ตกลงกันดังนี้
                    </p>
                    <p className="text-xs text-slate-600 italic">
                      Hereinafter referred to as “The Tenant” on the other part. WHEREBY both parties agree as follows;
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* PAGE 2: Clauses 1-3 */}
            {currentPage === 2 && (
              <div className="space-y-6">
                <div className="border-b border-slate-200 pb-3">
                  <h3 className="text-lg font-bold text-slate-900">ข้อตกลงและเงื่อนไขการเช่า (Clauses 1 - 3)</h3>
                </div>

                <div className="space-y-4">
                  {/* Clause 1 */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <p className="font-bold text-slate-900">1. ข้อมูลทรัพย์สินและวัตถุประสงค์การพักอาศัย</p>
                    <p className="text-slate-800">
                      ผู้ให้เช่าถือกรรมสิทธิ์ และมีสิทธิครอบครองบ้าน เลขที่ <span className="font-bold">{houseNo}</span> โครงการ{' '}
                      <span className="font-bold">{project}</span> หมู่ที่ {contract.mooEn || '2'} ถนน {contract.roadEn || '-'} ซอย {contract.soiEn || '-'} ตำบล{' '}
                      {contract.subDistrict || 'Wichit'} อำเภอ {contract.district || 'Mueang'} จังหวัด {contract.province || 'Phuket'} รหัสไปรษณีย์{' '}
                      {contract.postalCode || '83000'} ต่อไปนี้ในสัญญาเรียกว่า “ทรัพย์สิน” อัตราค่าเช่าเดือนละ{' '}
                      <span className="font-bold text-red-700 font-mono">฿{monthlyRent}</span> บาท ({contract.monthlyRentBahtTh || 'สามหมื่นห้าพันบาท'}) โดยมีวัตถุประสงค์เพื่อพักอาศัยเท่านั้น
                    </p>
                    <p className="text-xs text-slate-600 italic">
                      1. The Landlord is the owner and has the right to occupy The Premises located at House No. {houseNo} Project {project} Moo {contract.mooEn || '2'}, Sub-District {contract.subDistrict || 'Wichit'}, District {contract.district || 'Mueang'}, Province {contract.province || 'Phuket'} Postal code {contract.postalCode || '83000'} Hereafter referred to in the contract as The Premises, which The Landlord agrees to rent {monthlyRent} Baht ({contract.monthlyRentBahtEn || 'Thirty-five thousand baht'}) per month. The intent of this Lease agreement is to be used the “The Premises” as a residence only.
                    </p>
                  </div>

                  {/* Clause 2 */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <p className="font-bold text-slate-900">2. ระยะเวลาการเช่า (Lease Duration)</p>
                    <p className="text-slate-800">
                      สัญญานี้มีข้อตกลงกัน มีกำหนดระยะเวลา <span className="font-bold">{rentalTime}</span> เริ่มต้นวันที่{' '}
                      <span className="font-mono font-bold underline">{rentalStart}</span> หมดอายุสัญญาวันที่{' '}
                      <span className="font-mono font-bold underline">{rentalEnd}</span>
                    </p>
                    <p className="text-xs text-slate-600 italic">
                      2. The duration of this agreement shall be {rentalTime}. Starting from Date {rentalStart} till Date {rentalEnd}.
                    </p>
                  </div>

                  {/* Clause 3 */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <p className="font-bold text-slate-900">3. การจ่ายเงินค่าเช่าและบัญชีธนาคาร (Payment Term)</p>
                    <p className="text-slate-800">
                      การจ่ายเงินค่าเช่า ผู้เช่าจะต้องจ่ายเป็นจำนวนเงิน <span className="font-bold font-mono">฿{monthlyRent}</span> บาท โดยจ่ายภายในวันที่{' '}
                      <span className="font-bold underline">{contract.paymentDate || '23'}</span> ของแต่ละเดือนปฏิทิน ผ่านบัญชี{' '}
                      <span className="font-bold">{bankName}</span> หมายเลขบัญชี{' '}
                      <span className="font-mono font-bold text-red-700 bg-red-50 px-1 py-0.5 rounded">{accountNo}</span> ชื่อบัญชี{' '}
                      <span className="font-bold">{accountName}</span> ซึ่งทั้งสองฝ่ายได้ตกลงกันไว้ ณ วันทำสัญญา
                    </p>
                    <p className="text-xs text-slate-600 italic">
                      3. The rental fee payment shall be {monthlyRent} Baht, which the The Tenant agrees to transfer on the {contract.paymentDate || '23'} day of each calendar month to The Landlord's bank account Bank {bankName} Account No.: {accountNo} Account Name {accountName} which both parties have agreed upon on the date of this agreement.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* PAGE 3: Clauses 4-5 */}
            {currentPage === 3 && (
              <div className="space-y-6">
                <div className="border-b border-slate-200 pb-3">
                  <h3 className="text-lg font-bold text-slate-900">เบี้ยปรับและเงินประกัน (Clauses 4 - 5)</h3>
                </div>

                <div className="space-y-4">
                  {/* Clause 4 */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <p className="font-bold text-slate-900">4. เบี้ยปรับกรณีชำระล่าช้า (Late Payment & Termination)</p>
                    <p className="text-slate-800 text-xs sm:text-sm leading-relaxed">
                      กรณีผู้เช่าชำระค่าเช่าเดือนใดล่าช้า ผู้เช่ายอมจ่ายดอกเบี้ยในอัตราร้อยละ 1.25 ต่อเดือน ของจำนวนเงินค่าเช่าที่ค้างจ่าย ชำระ{' '}
                      <span className="font-bold font-mono text-red-700">{penalty} บาท/วัน</span> นับแต่วันที่ครบกำหนดชำระ แต่ไม่เกิน 5 วัน และหากชำระล่าช้าเกิน 5 วัน นับตั้งแต่วันที่ครบสัญญาจะถือว่าผู้เช่าผิดนัดผิดสัญญา และผู้ให้เช่ามีสิทธิบอกเลิกสัญญาได้ทันทีโดยมิต้องบอกกล่าวล่วงหน้าอีก และ/หรือระงับหรือตัดการให้บริการต่างๆ เช่นระบบปรับอากาศ ไฟฟ้า ประปา หรือบริการทั่วไปได้ทันที
                    </p>
                    <p className="text-xs text-slate-600 italic">
                      4. The late payment in any month is subject to interest at the rate of 1.25 percent per month on the outstanding balance amount calculated from the original due date {penalty} Baht/day if The Tenant fails to make rental payments by the due date not more than 5 days. The lease will be terminated if The Tenant does not pay within 5 days. The Landlord shall have the right to immediately terminate this agreement without prior notice, and/or suspend electrical/water/air-con utilities.
                    </p>
                  </div>

                  {/* Clause 5 */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <p className="font-bold text-slate-900">5. เงินประกันการเช่าและค่าเช่าล่วงหน้า (Security Deposit & Advance Rent)</p>
                    <p className="text-slate-800 text-xs sm:text-sm leading-relaxed">
                      ผู้เช่าได้มอบเงินประกันการเช่าเป็นเงินจำนวน <span className="font-bold font-mono">฿{deposit} บาท</span> ({contract.depositBahtTh || 'เจ็ดหมื่นบาท'}) และค่าเช่าล่วงหน้าจำนวน{' '}
                      <span className="font-bold font-mono">฿{advanceRental} บาท</span> ({contract.advanceRentalBahtTh || 'สามหมื่นห้าพันบาท'}) รวมเป็นเงิน{' '}
                      <span className="font-bold font-mono text-emerald-700">฿{totalPrice} บาท</span> ({contract.totalPriceBahtTh || 'หนึ่งแสนห้าพันบาท'}) เพื่อเป็นหลักประกันการปฏิบัติตามสัญญา
                    </p>
                    <p className="text-slate-800 text-xs sm:text-sm leading-relaxed">
                      ผู้ให้เช่าจะคืนเงินจำนวนดังกล่าวให้แก่ผู้เช่าทันทีหลังจากสัญญาเช่าสิ้นสุดลงและเช็คความเรียบร้อยของสถานที่แล้ว โดยผู้ให้เช่าต้องดูแลระบบไฟฟ้า ปั๊มน้ำ และระบบน้ำ ให้อยู่ในสภาพพร้อมใช้งาน หากเกิดปัญหาอันไม่ได้เกิดจากความประมาทเลินเล่อของผู้เช่า ภายใน 3 เดือน นับแต่วันเริ่มสัญญา ผู้ให้เช่าต้องรับผิดชอบแต่เพียงผู้เดียว
                    </p>
                    <p className="text-xs text-slate-600 italic">
                      5. The Tenant provides a deposit of {deposit} Baht and advance rental in the amount of {advanceRental} Baht, totaling {totalPrice} Baht. The Landlord will refund the deposit upon termination after checking The Premises. In the event of issues with electrical, pumps, and water systems not resulting from tenant negligence within 3 months, The Landlord is solely responsible.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* PAGE 4: Clauses 6-10 */}
            {currentPage === 4 && (
              <div className="space-y-6">
                <div className="border-b border-slate-200 pb-3">
                  <h3 className="text-lg font-bold text-slate-900">การใช้สอยและหน้าที่ของผู้เช่า (Clauses 6 - 10)</h3>
                </div>

                <div className="space-y-3 text-xs sm:text-sm">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="font-bold text-slate-900">6. ค่าสาธารณูปโภค (Utilities Responsibility)</p>
                    <p className="text-slate-800">
                      ตลอดระยะเวลาในการเช่า ค่าน้ำประปา ค่าโทรศัพท์ ค่าไฟฟ้า อินเตอร์เน็ต และค่าทำความสะอาด ผู้เช่าเป็นผู้รับผิดชอบแต่เพียงผู้เดียว
                    </p>
                    <p className="text-xs text-slate-600 italic">
                      6. The Tenant is responsible for electricity, gas, internet, phone, cleaning, and water per meter usage.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="font-bold text-slate-900">7. การรักษาซ่อมแซมทรัพย์สิน (Maintenance & Reasonable Wear and Tear)</p>
                    <p className="text-slate-800">
                      ผู้เช่าจะต้องรับผิดชอบต่อความเสียหาย และรักษาซ่อมแซมเหมือนเช่นบุคคลควรระวังรักษาทรัพย์สินของตน ยกเว้นความเสียหายเนื่องจากเสื่อมสภาพที่ยอมรับได้
                    </p>
                    <p className="text-xs text-slate-600 italic">
                      7. The Tenant shall maintain the property with due care. Reasonable wear and tear are acceptable.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="font-bold text-slate-900">8. สิ่งของผิดกฎหมาย (Illegal Items Prohibited)</p>
                    <p className="text-slate-800">
                      ผู้เช่าจะต้องไม่นำสินค้า สิ่งของ หรือวัสดุที่ผิดกฎหมายเข้ามาไว้หรือจำหน่ายในทรัพย์สินที่เช่า
                    </p>
                    <p className="text-xs text-slate-600 italic">
                      8. The Tenant is not allowed to bring illegal materials to The Premises for storage or sale.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="font-bold text-slate-900">9. ทรัพย์สินส่วนตัวของผู้เช่า (Tenant's Belongings)</p>
                    <p className="text-slate-800">
                      ผู้ให้เช่าไม่ต้องรับผิดชอบต่อความเสียหายหรือสูญหายแก่ทรัพย์สินที่ผู้เช่านำมาไว้ในทรัพย์สินที่เช่า
                    </p>
                    <p className="text-xs text-slate-600 italic">
                      9. The Landlord is not responsible for any loss or damage to The Tenant's property.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="font-bold text-slate-900">10. ห้ามเช่าช่วงหรือโอนสิทธิ (No Sublease / Assignment)</p>
                    <p className="text-slate-800">
                      ห้ามมิให้ผู้เช่านำทรัพย์ที่เช่าทั้งหมดหรือบางส่วนไปให้บุคคลอื่นหรือโอนสิทธิการเช่า เว้นแต่จะได้รับอนุญาตเป็นลายลักษณ์อักษรจากผู้ให้เช่า
                    </p>
                    <p className="text-xs text-slate-600 italic">
                      10. Assignment or sublease of The Premises is prohibited without prior written consent of The Landlord.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* PAGE 5: Clauses 11-15 */}
            {currentPage === 5 && (
              <div className="space-y-6">
                <div className="border-b border-slate-200 pb-3">
                  <h3 className="text-lg font-bold text-slate-900">การดัดแปลงและการสิ้นสุดสัญญา (Clauses 11 - 15)</h3>
                </div>

                <div className="space-y-3 text-xs sm:text-sm">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="font-bold text-slate-900">11. การต่อเติมดัดแปลง (Alterations & Renovations)</p>
                    <p className="text-slate-800">
                      หากผู้เช่าประสงค์จะต่อเติมดัดแปลง ต้องได้รับความยินยอมเป็นลายลักษณ์อักษรจากผู้ให้เช่าก่อน สิ่งใดที่เป็นการตกแต่งถาวรให้ตกเป็นกรรมสิทธิ์ของผู้ให้เช่า
                    </p>
                    <p className="text-xs text-slate-600 italic">
                      11. Permanent modifications become Landlord property. Temporary additions must be removed at Tenant's expense.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="font-bold text-slate-900">12. การย้ายออกเมื่อเลิกสัญญา (Vacating Premises in 24 Hours)</p>
                    <p className="text-slate-800">
                      เมื่อสัญญาสิ้นสุด ผู้เช่าต้องขนย้ายสิ่งของและบริวารออกไปภายใน 24 ชั่วโมง หากไม่ยอมออก ผู้ให้เช่ามีสิทธิริบเงินประกันและเข้าครอบครองทรัพย์สินทันที
                    </p>
                    <p className="text-xs text-slate-600 italic">
                      12. Tenant will move out in 24 hours upon lease termination. Landlord may seize deposit and repossess.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="font-bold text-slate-900">13. การแก้ไขข้อตกลง (Written Amendments)</p>
                    <p className="text-slate-800">การแก้ไขเปลี่ยนแปลงข้อตกลงต้องทำเป็นลายลักษณ์อักษรและลงนามโดยทั้งสองฝ่าย</p>
                    <p className="text-xs text-slate-600 italic">13. Any changes must be made in writing and signed by both parties.</p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="font-bold text-slate-900">14. ความเสียหายต่อโครงสร้างหลัก (Major Structural Repairs)</p>
                    <p className="text-slate-800">
                      ผู้ให้เช่าตกลงซ่อมแซมความเสียหายของทรัพย์สินหลักซึ่งไม่ได้เกิดจากผู้เช่า เช่น ภัยธรรมชาติ แผ่นดินไหว น้ำท่วม
                    </p>
                    <p className="text-xs text-slate-600 italic">14. Landlord repairs structural damage from natural disasters or war.</p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="font-bold text-slate-900">15. การซ่อมแซมเล็กน้อยของผู้เช่า (Minor Maintenance)</p>
                    <p className="text-slate-800">ผู้เช่าตกลงที่จะซ่อมแซมทรัพย์สินที่ไม่ใช่ความเสียหายหลัก เช่น หลอดไฟขาด สายโทรศัพท์ เป็นต้น</p>
                    <p className="text-xs text-slate-600 italic">15. Tenant maintains minor items like bulbs and consumable fittings.</p>
                  </div>
                </div>
              </div>
            )}

            {/* PAGE 6: Clauses 16-18 */}
            {currentPage === 6 && (
              <div className="space-y-6">
                <div className="border-b border-slate-200 pb-3">
                  <h3 className="text-lg font-bold text-slate-900">ข้อพิพาท, อัคคีภัย และการตรวจตรา (Clauses 16 - 18)</h3>
                </div>

                <div className="space-y-4 text-xs sm:text-sm">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <p className="font-bold text-slate-900">16. การระงับข้อพิพาทโดยบุคคลที่สาม (Dispute Mediation)</p>
                    <p className="text-slate-800">
                      กรณีที่มีการละเมิดสัญญาเกิดขึ้น เพื่อความเป็นธรรมแก่ทั้งสองฝ่าย จะต้องมีบุคคลที่สามคือเจ้าหน้าที่ที่มีความเป็นกลาง ไม่มีส่วนได้เสีย มาเป็นผู้พิจารณาตัดสิน
                    </p>
                    <p className="text-xs text-slate-600 italic">
                      16. In the case of a breach of contract, a neutral third-party mediator agreed upon by both parties shall be used to settle the matter.
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <p className="font-bold text-slate-900">17. อัคคีภัยและความรับผิดชอบ (Fire & Insurance Coverage)</p>
                    <p className="text-slate-800">
                      ถ้าเกิดอัคคีภัยขึ้นไม่ว่ากรณีใด สัญญาเช่าถือเป็นอันสิ้นสุดลง หากเกิดจากความประมาทของผู้เช่า ผู้เช่าต้องรับผิดชอบความเสียหายในส่วนที่เกินความคุ้มครองของประกันภัย
                    </p>
                    <p className="text-xs text-slate-600 italic">
                      17. The lease terminates in case of fire. If caused by Tenant negligence, Tenant is liable for damages exceeding insurance coverage.
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <p className="font-bold text-slate-900">18. สิทธิในการเข้าตรวจตราสถานที่ (Inspection Notice 24 Hours)</p>
                    <p className="text-slate-800">
                      ผู้เช่ายินยอมให้ผู้ให้เช่าหรือตัวแทนเข้าตรวจตราสถานที่เช่าเมื่อมีเหตุจำเป็น โดยจะแจ้งล่วงหน้าอย่างน้อย 24 ชั่วโมง
                    </p>
                    <p className="text-xs text-slate-600 italic">
                      18. Landlord or authorized agents may enter with 24 hours prior notice for emergencies, safety, or routine annual inspection.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* PAGE 7: Clauses 19-20 */}
            {currentPage === 7 && (
              <div className="space-y-6">
                <div className="border-b border-slate-200 pb-3">
                  <h3 className="text-lg font-bold text-slate-900">การต่อสัญญาและระเบียบการชำระเงิน (Clauses 19 - 20)</h3>
                </div>

                <div className="space-y-4 text-xs sm:text-sm">
                  {/* Clause 19 */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <p className="font-bold text-slate-900">19. การต่ออายุสัญญาเช่าและการเข้าชมทรัพย์สิน (Lease Renewal & Viewings)</p>
                    <p className="text-slate-800 leading-relaxed">
                      หากผู้เช่าประสงค์จะต่ออายุสัญญาเช่า จะต้องแจ้งล่วงหน้าไม่น้อยกว่า 60 วันก่อนวันสิ้นสุดสัญญาเช่า หากไม่ประสงค์จะต่ออายุ ในช่วง 60 วันสุดท้าย ผู้เช่ายินยอมให้ตัวแทนนำผู้สนใจเช่ารายใหม่เข้าชมทรัพย์สินได้ โดยจะแจ้งล่วงหน้าก่อนเข้าชมทุกครั้ง
                    </p>
                    <p className="text-xs text-slate-600 italic">
                      19. If Tenant wishes to renew, notify Landlord at least 60 days in advance. If not renewing, during the final 60 days, prospective tenants may view the property with reasonable notice.
                    </p>
                  </div>

                  {/* Clause 20 */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <p className="font-bold text-slate-900">
                      20. การชำระค่าเช่าและข้อกำหนดตัวแทนนายหน้า (Rental Payment Disclaimer)
                    </p>
                    <p className="text-slate-800 leading-relaxed">
                      สัญญาฉบับนี้จัดทำขึ้นโดย บริษัท ไพร์ม โกลบอลแอสเสท จำกัด / PEAK REAL ESTATE ซึ่งทำหน้าที่เป็นนายหน้า ทั้งนี้บริษัทไม่มีนโยบายให้พนักงานขายรับชำระค่าเช่าโดยตรงจากผู้เช่า ผู้เช่าต้องโอนเข้าบัญชีผู้ให้เช่าโดยตรงเท่านั้น หรือนำเงินสดมาชำระ ณ สำนักงานของบริษัทโดยตรง หากผู้เช่าจ่ายให้บุคคลอื่น บริษัทขอสงวนสิทธิ์ไม่รับผิดชอบต่อความสูญเสียใดๆ ทั้งสิ้น
                    </p>
                    <p className="text-xs text-slate-600 italic">
                      20. This agreement is prepared by Prime Global Asset Co., Ltd. / PEAK REAL ESTATE. The Company does not authorize staff to collect rent directly. Tenant must transfer to Landlord's bank account or pay cash at the company office only.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* PAGE 8: Governing Law, Signatures & Utilities Schedule */}
            {currentPage === 8 && (
              <div className="space-y-6">
                <div className="border-b border-slate-200 pb-2">
                  <h3 className="text-base font-bold text-slate-900">การบังคับใช้กฎหมายและลงนาม (Governing Law & Signatures)</h3>
                </div>

                <div className="space-y-2 text-xs">
                  <p className="font-bold">สัญญานี้ได้ทำขึ้นทั้งภาษาไทยและภาษาอังกฤษ โดยยึดภาษาไทยเป็นหลัก</p>
                  <p className="italic text-slate-600">
                    This agreement shall be governed and interpreted under the law of Thailand; Thai version prevails.
                  </p>
                  <p className="pt-2 text-slate-700">
                    สัญญานี้ทำขึ้นเป็นสองฉบับ มีข้อความถูกต้องตรงกัน ทั้งสองฝ่ายได้อ่านและเข้าใจข้อความดีแล้ว จึงได้ลงลายมือชื่อไว้ต่อหน้าพยาน
                  </p>
                </div>

                {/* Signature Box */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200 text-xs">
                  <div className="p-3 border border-slate-300 rounded-lg text-center space-y-3">
                    <p className="font-bold text-slate-700">ผู้ให้เช่า (The Landlord)</p>
                    <div className="h-12 flex items-end justify-center border-b border-dashed border-slate-400">
                      <span className="font-serif italic text-slate-500">[ลายมือชื่อ]</span>
                    </div>
                    <p className="font-medium">{ownerName}</p>
                  </div>

                  <div className="p-3 border border-slate-300 rounded-lg text-center space-y-3">
                    <p className="font-bold text-slate-700">ผู้เช่า (The Tenant)</p>
                    <div className="h-12 flex items-end justify-center border-b border-dashed border-slate-400">
                      <span className="font-serif italic text-slate-500">[ลายมือชื่อ]</span>
                    </div>
                    <p className="font-medium">{tenantName}</p>
                  </div>

                  <div className="p-3 border border-slate-300 rounded-lg text-center space-y-3">
                    <p className="font-bold text-slate-700">พยานที่ 1 (Witness 1)</p>
                    <div className="h-10 flex items-end justify-center border-b border-dashed border-slate-400">
                      <span className="font-serif italic text-slate-500">[ลายมือชื่อ]</span>
                    </div>
                    <p className="font-medium">{agentName}</p>
                  </div>

                  <div className="p-3 border border-slate-300 rounded-lg text-center space-y-3">
                    <p className="font-bold text-slate-700">พยานที่ 2 (Witness 2)</p>
                    <div className="h-10 flex items-end justify-center border-b border-dashed border-slate-400">
                      <span className="font-serif italic text-slate-500">[ลายมือชื่อ]</span>
                    </div>
                    <p className="font-medium">( _______________________ )</p>
                  </div>
                </div>

                {/* Utility Schedule */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                  <p className="font-bold text-slate-900">ผู้เช่าจะชำระ The Tenant shall pay:</p>
                  <p>1. ค่าไฟฟ้า Electricity fee by bill: <span className="font-semibold">Government Bill (บิลหลวง)</span></p>
                  <p>2. ค่าน้ำ Water fee by bill: <span className="font-semibold">Government Bill (บิลหลวง)</span></p>
                  <p>3. ค่าอินเตอร์เน็ต Internet-Wifi: <span className="font-semibold">-</span></p>
                  <p>4. ค่าทำความสะอาด Cleaning Service Fee: <span className="font-semibold">-</span></p>
                  <p>5. หากกุญแจหายดอกละ 100 บาท Lost key: <span className="font-semibold text-red-600">100 Baht/Each</span></p>
                </div>
              </div>
            )}

            {/* PAGE 9: ANNEX Extra Conditions */}
            {currentPage === 9 && (
              <div className="space-y-6">
                <div className="text-center space-y-1 border-b border-slate-200 pb-3">
                  <h2 className="text-xl font-bold font-serif text-slate-900">ANNEX</h2>
                  <h3 className="text-sm font-semibold text-slate-600">เอกสารแนบท้ายสัญญาและข้อตกลงพิเศษ</h3>
                </div>

                <div className="space-y-4 text-xs sm:text-sm">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                    <p className="font-bold text-slate-900">1. ข้อตกลงเพิ่มเติม (Extra Condition):</p>
                    <ul className="space-y-2 list-disc pl-5 text-slate-800">
                      <li>
                        ผู้เช่าต้องไม่ทิ้งกระดาษ ผ้าอนามัย รวมถึงพลาสติกและที่ปั่นหูลงโถส้วม
                        <br />
                        <span className="text-xs text-slate-600 italic">Do not leave paper or sanitary pads, including plastics and cotton buds in the toilet.</span>
                      </li>
                      <li>
                        เมื่อไฟตก ผู้เช่าต้องหยุดใช้งานเครื่องใช้ไฟฟ้าทุกชนิดที่มีมอเตอร์
                        <br />
                        <span className="text-xs text-slate-600 italic">When the power failure occurs, Tenant must stop using appliances generated by motor.</span>
                      </li>
                      <li>
                        ผู้เช่าต้องไม่นำสิ่งของที่จัดเตรียมไว้ใช้ในบ้าน ไปใช้นอกสถานที่เช่า
                        <br />
                        <span className="text-xs text-slate-600 italic">Tenant must not take items in the house for use outside the property.</span>
                      </li>
                      <li>
                        ผู้เช่าจะต้องไม่สูบบุหรี่หรือกัญชาภายในบ้าน หรือส่งกลิ่นรบกวนเพื่อนบ้าน หากพบการกระทำดังกล่าว จะต้องชำระค่าทำความสะอาดพิเศษตามจริง
                        <br />
                        <span className="text-xs text-slate-600 italic">Tenant must not smoke cigarettes or cannabis inside the house or surrounding area causing disturbance.</span>
                      </li>
                      <li>
                        ทรัพย์สินที่อยู่ในบ้านถูกบันทึกเป็นภาพถ่าย / Items in the house are saved by photo.
                      </li>
                    </ul>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <p className="font-bold text-slate-900">2. การนัดตรวจสภาพก่อนย้ายออก (7 Days Notice Before Move-out)</p>
                    <p className="text-slate-800">
                      เมื่อสิ้นสุดสัญญาเช่า ก่อนผู้เช่าจะทำการย้ายออก ผู้เช่าจะต้องแจ้งนัดหมายล่วงหน้ากับตัวแทนของผู้ให้เช่าอย่างน้อย 7 วัน เพื่อตรวจสอบความเสียหายก่อนคืนเงินประกัน
                    </p>
                    <p className="text-xs text-slate-600 italic">
                      Upon termination, before moving out, tenant must schedule an inspection at least 7 days in advance before security deposit refund.
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <p className="font-bold text-slate-900">3. เวลาเช็คอิน-เช็คเอาท์ (Check-in / Check-out Window)</p>
                    <p className="text-slate-800 font-semibold text-red-700">
                      เวลาเช็คอินเช็คเอาท์ต้องเป็นช่วงเวลาระหว่าง 09:00 - 18:00 น. เท่านั้น
                    </p>
                    <p className="text-xs text-slate-600 italic">Check-in and check-out time must be between 09:00 - 18:00 only.</p>
                  </div>
                </div>
              </div>
            )}

            {/* PAGE 10: Check Out Condition & Final Handover Signatures */}
            {currentPage === 10 && (
              <div className="space-y-6">
                <div className="text-center space-y-1 border-b border-slate-200 pb-3">
                  <h2 className="text-xl font-bold font-serif text-slate-900">Check out condition</h2>
                  <h3 className="text-sm font-semibold text-slate-600">เงื่อนไขการส่งมอบห้องเมื่อสิ้นสุดสัญญา</h3>
                </div>

                <div className="space-y-4 text-xs sm:text-sm">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                    <div className="space-y-2 text-slate-800">
                      <p>
                        <span className="font-bold">1. ค่าทำความสะอาด:</span> ผู้ให้เช่าสามารถเรียกเก็บค่าทำความสะอาดได้ขึ้นอยู่กับขนาดบ้าน หรือถ้าบ้านสกปรกมาก ค่าใช้จ่ายอยู่ที่ประมาณ 2,000 - 5,000 บาท
                        <br />
                        <span className="text-xs text-slate-600 italic">The Landlord has right to charge for cleaning (approx 2,000-5,000 Baht).</span>
                      </p>
                      <p>
                        <span className="font-bold">2. ล้างเครื่องปรับอากาศ:</span> เครื่องละ 800 บาท
                        <br />
                        <span className="text-xs text-slate-600 italic">Air condition cleaning 800 Baht each.</span>
                      </p>
                      <p>
                        <span className="font-bold">3. ตรวจสอบอุปกรณ์ไฟฟ้า:</span> ผู้เช่าต้องตรวจสอบให้แน่ใจว่าอุปกรณ์ไฟฟ้าและสิ่งของต่างๆ ใช้งานได้ปกติ
                        <br />
                        <span className="text-xs text-slate-600 italic">Make sure all electric equipment and property are fully working.</span>
                      </p>
                      <p>
                        <span className="font-bold">4. ใบเสร็จค่าน้ำค่าไฟ:</span> ผู้เช่าต้องนำใบเสร็จค่าไฟฟ้าและค่าน้ำ 2 เดือนสุดท้าย แสดงในวันย้ายออก
                        <br />
                        <span className="text-xs text-slate-600 italic">Tenant must show the last 2 bills of electric and water on check-out date.</span>
                      </p>
                    </div>
                  </div>

                  <div className="pt-6">
                    <p className="text-xs font-semibold text-center text-slate-600 mb-4">
                      รับทราบและตกลงตามเงื่อนไขการ Check-out
                    </p>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div className="p-4 border border-slate-300 rounded-xl text-center space-y-3">
                        <p className="font-bold text-slate-700">ผู้ให้เช่า (The Landlord)</p>
                        <div className="h-12 flex items-end justify-center border-b border-dashed border-slate-400">
                          <span className="font-serif italic text-slate-500">[ลายมือชื่อ]</span>
                        </div>
                        <p className="font-medium">{ownerName}</p>
                      </div>

                      <div className="p-4 border border-slate-300 rounded-xl text-center space-y-3">
                        <p className="font-bold text-slate-700">ผู้เช่า (The Tenant)</p>
                        <div className="h-12 flex items-end justify-center border-b border-dashed border-slate-400">
                          <span className="font-serif italic text-slate-500">[ลายมือชื่อ]</span>
                        </div>
                        <p className="font-medium">{tenantName}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PAGE 11: Attachment - Passport The Tenant with Certified True Copy Stamp */}
            {currentPage === 11 && (
              <div className="space-y-4">
                <div className="border-b border-slate-200 pb-2 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Attachment: Passport The Tenant</h3>
                    <p className="text-xs text-slate-500">เอกสารหนังสือเดินทางผู้เช่า พร้อมประทับตรากำกับวัตถุประสงค์</p>
                  </div>
                  <span className="text-xs font-mono font-bold bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-200">
                    {tenantName}
                  </span>
                </div>

                <div className="relative border-2 border-dashed border-slate-300 rounded-2xl p-6 min-h-[380px] flex flex-col items-center justify-center bg-slate-50/70 overflow-hidden">
                  {/* Certified True Copy Watermark Stamp */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
                    <div className="rotate-[-18deg] border-4 border-red-500/80 rounded-2xl px-6 py-4 text-center bg-red-50/60 shadow-lg max-w-md">
                      <p className="text-sm font-bold text-red-700 tracking-wide">
                        สำเนาถูกต้อง
                      </p>
                      <p className="text-base font-extrabold text-red-600 font-mono mt-0.5">
                        ใช้สำหรับทำสัญญาเช่า {houseNo} เท่านั้น
                      </p>
                      <p className="text-[11px] text-red-500 font-medium mt-0.5">
                        Use for signing the lease agreement on {houseNo} only
                      </p>
                    </div>
                  </div>

                  <div className="z-10 text-center space-y-2">
                    <div className="w-20 h-20 mx-auto bg-blue-100 text-blue-700 rounded-2xl flex items-center justify-center shadow-inner">
                      <User className="w-10 h-10" />
                    </div>
                    <h4 className="font-bold text-slate-800 text-base">{tenantName}</h4>
                    <p className="text-xs text-slate-600 font-mono">
                      Passport No: <span className="font-bold">{tenantIdNo}</span> | Nationality: {tenantNationality}
                    </p>
                    <p className="text-xs text-slate-500">
                      Mobile: {tenantPhone}
                    </p>
                    <div className="pt-4">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Verified Identity Document (ยืนยันตัวตนแล้ว)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PAGE 12: Attachment - Owner Thai ID with Certified True Copy Stamp */}
            {currentPage === 12 && (
              <div className="space-y-4">
                <div className="border-b border-slate-200 pb-2 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Attachment: Owner Thai ID</h3>
                    <p className="text-xs text-slate-500">สำเนาบัตรประจำตัวประชาชนผู้ให้เช่า พร้อมประทับตรากำกับวัตถุประสงค์</p>
                  </div>
                  <span className="text-xs font-mono font-bold bg-amber-50 text-amber-700 px-2 py-1 rounded border border-amber-200">
                    {ownerName}
                  </span>
                </div>

                <div className="relative border-2 border-dashed border-slate-300 rounded-2xl p-6 min-h-[380px] flex flex-col items-center justify-center bg-slate-50/70 overflow-hidden">
                  {/* Certified True Copy Watermark Stamp */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
                    <div className="rotate-[-18deg] border-4 border-red-500/80 rounded-2xl px-6 py-4 text-center bg-red-50/60 shadow-lg max-w-md">
                      <p className="text-sm font-bold text-red-700 tracking-wide">
                        สำเนาถูกต้อง
                      </p>
                      <p className="text-base font-extrabold text-red-600 font-mono mt-0.5">
                        ใช้สำหรับทำสัญญาเช่า {houseNo} เท่านั้น
                      </p>
                      <p className="text-[11px] text-red-500 font-medium mt-0.5">
                        Use for signing the lease agreement on {houseNo} only
                      </p>
                    </div>
                  </div>

                  <div className="z-10 text-center space-y-2">
                    <div className="w-20 h-20 mx-auto bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center shadow-inner">
                      <ShieldCheck className="w-10 h-10" />
                    </div>
                    <h4 className="font-bold text-slate-800 text-base">{ownerName}</h4>
                    <p className="text-xs text-slate-600 font-mono">
                      Thai Citizen ID: <span className="font-bold">{landlordIdNo}</span>
                    </p>
                    <p className="text-xs text-slate-500">
                      Bank: {bankName} (Acc: {accountNo})
                    </p>
                    <div className="pt-4">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Verified Landlord Ownership (ยืนยันกรรมสิทธิ์ผู้ให้เช่า)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PAGE 13: Attachment - House Registration with Certified True Copy Stamp */}
            {currentPage === 13 && (
              <div className="space-y-4">
                <div className="border-b border-slate-200 pb-2 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Attachment: House Registration</h3>
                    <p className="text-xs text-slate-500">สำเนาทะเบียนบ้านทรัพย์สินที่เช่า พร้อมประทับตรากำกับวัตถุประสงค์</p>
                  </div>
                  <span className="text-xs font-mono font-bold bg-purple-50 text-purple-700 px-2 py-1 rounded border border-purple-200">
                    House No. {houseNo}
                  </span>
                </div>

                <div className="relative border-2 border-dashed border-slate-300 rounded-2xl p-6 min-h-[380px] flex flex-col items-center justify-center bg-slate-50/70 overflow-hidden">
                  {/* Certified True Copy Watermark Stamp */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
                    <div className="rotate-[-18deg] border-4 border-red-500/80 rounded-2xl px-6 py-4 text-center bg-red-50/60 shadow-lg max-w-md">
                      <p className="text-sm font-bold text-red-700 tracking-wide">
                        สำเนาถูกต้อง
                      </p>
                      <p className="text-base font-extrabold text-red-600 font-mono mt-0.5">
                        ใช้สำหรับทำสัญญาเช่า {houseNo} เท่านั้น
                      </p>
                      <p className="text-[11px] text-red-500 font-medium mt-0.5">
                        Use for signing the lease agreement on {houseNo} only
                      </p>
                    </div>
                  </div>

                  <div className="z-10 text-center space-y-2">
                    <div className="w-20 h-20 mx-auto bg-purple-100 text-purple-700 rounded-2xl flex items-center justify-center shadow-inner">
                      <Building className="w-10 h-10" />
                    </div>
                    <h4 className="font-bold text-slate-800 text-base">บ้านเลขที่ {houseNo}</h4>
                    <p className="text-xs text-slate-600">
                      โครงการ {project} หมู่ที่ {contract.mooEn || '2'}
                    </p>
                    <p className="text-xs text-slate-500">
                      ตำบล {contract.subDistrict || 'Wichit'}, อำเภอ {contract.district || 'Mueang'}, จังหวัด {contract.province || 'Phuket'} {contract.postalCode || '83000'}
                    </p>
                    <div className="pt-4">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Official Property Registration Record
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Document Bottom Footer */}
            <div className="mt-8 pt-4 border-t border-slate-200 flex flex-wrap justify-between items-center text-[11px] text-slate-500">
              <span>PEAK Real Estate CRM — B22 Contract Management</span>
              <span>Doc Ref: {contract.contractId || 'RENT-2026-0923'} | Sign Date: {signDate}</span>
            </div>
          </div>
        </div>

        {/* Modal Bottom Action Controls */}
        <div className="px-5 py-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0 print:hidden">
          <div className="text-xs text-slate-400 hidden sm:block">
            ใช้ปุ่มลูกศรหรือแถบแท็บด้านบนเพื่อเปิดดูสัญญาแต่ละหน้า (1 ถึง 13)
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold disabled:opacity-40 disabled:pointer-events-none transition flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>ก่อนหน้า</span>
            </button>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold disabled:opacity-40 disabled:pointer-events-none transition flex items-center gap-1"
            >
              <span>ถัดไป</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-bold transition ml-2"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
