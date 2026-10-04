import React, { useState, useMemo } from 'react';
import { Contract, ContractType, ContractStatus, Property, Customer, User } from '../types';
import { translations, Language } from '../lib/i18n';
import { ContractFormModal } from './ContractFormModal';
import { ContractDocumentViewerModal } from './ContractDocumentViewerModal';
import { PaymentManagementView } from './PaymentManagementView';
import { ContractPaymentSummarySection } from './ContractPaymentSummarySection';
import {
  FileText,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  Upload,
  Calendar,
  DollarSign,
  Building2,
  User as UserIcon,
  Edit2,
  Trash2,
  X,
  FileSignature,
  Percent,
  ExternalLink,
  Shield,
  FileCheck,
  CreditCard,
  Phone,
  Eye,
  Check,
} from 'lucide-react';

interface ContractsViewProps {
  contracts: Contract[];
  properties: Property[];
  customers: Customer[];
  users: User[];
  currentUser: User;
  language: Language;
  onSaveContract: (contract: Contract) => void;
  onDeleteContract: (id: string) => void;
  preselectedProperty?: Property | null;
  initialFilter?: string;
}

export function ContractsView({
  contracts,
  properties,
  customers,
  users,
  currentUser,
  language,
  onSaveContract,
  onDeleteContract,
  preselectedProperty,
  initialFilter,
}: ContractsViewProps) {
  const t = translations[language];

  // Submenu tabs: 'rent' | 'payments' | 'sale'
  const [activeSubTab, setActiveSubTab] = useState<'rent' | 'payments' | 'sale'>('rent');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Modals
  const [b22ModalOpen, setB22ModalOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [detailModalContract, setDetailModalContract] = useState<Contract | null>(null);
  const [viewerContract, setViewerContract] = useState<Contract | null>(null);

  const isManagerOrAdmin =
    (currentUser?.role || '').toLowerCase().includes('admin') ||
    (currentUser?.role || '').toLowerCase().includes('manager');

  // Filtered contracts
  const filteredContracts = useMemo(() => {
    return contracts
      .filter((c) => {
        // Exclude soft-deleted/archived unless explicitly querying
        if (c.isArchived) return false;

        // Submenu type filter
        if (activeSubTab === 'sale') {
          const isSale =
            (c.contractType || c.type || '').toLowerCase().includes('sale') ||
            (c.type || '').includes('Sales & Purchase');
          if (!isSale) return false;
        } else {
          // 'rent' or 'payments' - show rental agreements
          const isSale =
            (c.contractType || c.type || '').toLowerCase().includes('sale') ||
            (c.type || '').includes('Sales & Purchase');
          if (isSale) return false;
        }

        const q = (searchQuery || '').toLowerCase();
        const contractIdStr = (c.contractId || c.contractNumber || c.contractNo || '').toLowerCase();
        const propTitleStr = (c.propertyTitle || c.projectEn || c.projectTh || c.propertyId || '').toLowerCase();
        const ownerStr = (c.ownerName || c.partyAName || '').toLowerCase();
        const tenantStr = (c.tenantName || c.partyBName || c.customerName || '').toLowerCase();
        const agentStr = (c.agentName || c.salesName || c.agent || '').toLowerCase();

        const matchSearch =
          !q ||
          contractIdStr.includes(q) ||
          propTitleStr.includes(q) ||
          ownerStr.includes(q) ||
          tenantStr.includes(q) ||
          agentStr.includes(q);

        const matchStatus = selectedStatus === 'all' || c.status === selectedStatus;
        return matchSearch && matchStatus;
      })
      .sort((a, b) => {
        const dateA = new Date(a.signDate || a.rentalStart || a.startDate || a.createdAt).getTime();
        const dateB = new Date(b.signDate || b.rentalStart || b.startDate || b.createdAt).getTime();
        return dateB - dateA;
      });
  }, [contracts, searchQuery, selectedStatus, activeSubTab]);

  // Statistics
  const stats = useMemo(() => {
    const active = contracts.filter((c) => !c.isArchived && c.status === 'Active');
    const expiringSoon = contracts.filter((c) => !c.isArchived && c.status === 'Expiring Soon');
    const totalRentMonthly = active.reduce((sum, c) => sum + (c.monthlyRent || c.price || 0), 0);
    return {
      total: contracts.filter((c) => !c.isArchived).length,
      active: active.length,
      expiringSoon: expiringSoon.length,
      totalRentMonthly,
    };
  }, [contracts]);

  const handleOpenCreate = () => {
    setEditingContract(null);
    setB22ModalOpen(true);
  };

  const handleOpenEdit = (c: Contract) => {
    setEditingContract(c);
    setB22ModalOpen(true);
  };

  const handleDeleteWithRBAC = (id: string) => {
    if (!isManagerOrAdmin) {
      alert('Forbidden: Only Admin and Manager roles can archive/delete contracts (RBAC Protected).');
      return;
    }
    if (confirm('Are you sure you want to archive this contract? (Soft delete: record is preserved in audit logs)')) {
      onDeleteContract(id);
    }
  };

  const handleDownloadDocx = (contract: Contract) => {
    if (contract.id) {
      window.location.href = `/api/contracts/${contract.id}/download-docx`;
    } else if (contract.currentWordFileUrl) {
      window.open(contract.currentWordFileUrl, '_blank');
    } else {
      alert('No Word document found for this contract yet.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Submenu Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold font-serif text-slate-900 tracking-wide">
              Contract Management
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
              B22 System
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Standard Bilingual Lease Agreements, Word (.docx) Generation, and Payment Schedules
          </p>

          {/* Submenu Tabs */}
          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={() => setActiveSubTab('rent')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeSubTab === 'rent'
                  ? 'bg-slate-900 text-white shadow'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <FileSignature className="w-4 h-4 text-red-500" />
              Rent Contract (สัญญาเช่า)
            </button>
            <button
              onClick={() => setActiveSubTab('payments')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeSubTab === 'payments'
                  ? 'bg-slate-900 text-white shadow'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <CreditCard className="w-4 h-4 text-emerald-500" />
              Rent Payments (ตารางชำระค่าเช่า)
            </button>
            <button
              onClick={() => setActiveSubTab('sale')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeSubTab === 'sale'
                  ? 'bg-slate-900 text-white shadow'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <Building2 className="w-4 h-4 text-blue-500" />
              Sale Contract (สัญญาซื้อขาย)
            </button>
          </div>
        </div>

        {/* Action Button: New Contract */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              const sample = contracts.find((c) => c.contractId === 'RENT-2026-0923') || contracts[0] || {
                id: 'sample-rent-model',
                contractId: 'RENT-2026-0923',
                contractNumber: 'RENT-2026-0923',
                contractType: 'Rent Contract',
                status: 'Active',
                signDate: '2026-09-23',
                rentalStart: '2026-09-23',
                rentalEnd: '2027-09-22',
                rentalTime: '12 Months',
                withPet: false,
                propertyId: 'PK-23528',
                houseNo: '23/528',
                projectEn: 'Phanason Thepanusorn',
                projectTh: 'พนาสนธิ์ เทพอนุสรณ์',
                subDistrict: 'Wichit',
                district: 'Mueang',
                province: 'Phuket',
                postalCode: '83000',
                ownerName: 'Miss Jongjit Sutthichuay (นางสาว จงจิต สุทธิช่วย)',
                landlordIdNo: '3 8015 00082 81 1',
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
                tenantNationality: 'Russia',
                tenantPhone: '+66800300571',
                tenantCertificateType: 'Passport',
                tenantIdNo: '77 1803669',
                monthlyRent: 35000,
                monthlyRentBahtEn: 'Thirty-five thousand baht',
                monthlyRentBahtTh: 'สามหมื่นห้าพันบาท',
                paymentDate: '23',
                penaltyAmount: '437.50',
                deposit: 70000,
                depositBahtEn: 'Seventy thousand baht',
                depositBahtTh: 'เจ็ดหมื่นบาท',
                advanceRental: 35000,
                advanceRentalBahtEn: 'Thirty-five thousand baht',
                advanceRentalBahtTh: 'สามหมื่นห้าพันบาท',
                totalPrice: 105000,
                totalPriceBahtEn: 'One hundred five thousand baht',
                totalPriceBahtTh: 'หนึ่งแสนห้าพันบาท',
                salesName: 'Sarah Jenkins',
                salesPhone: '+66 81 234 5678',
                salesCommission: 35000,
                comments: 'Standard 13-Page Bilingual Lease Agreement (Prime Global Asset / PEAK Real Estate)',
              };
              setViewerContract(sample);
            }}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition border border-slate-700"
            title="เปิดดูแบบร่างสัญญามาตรฐาน 13 หน้า แบบเดียวกับเอกสารทางการ"
          >
            <FileText className="w-4 h-4 text-red-400" />
            <span>ดูแบบสัญญาฉบับเต็ม 13 หน้า (Standard Template)</span>
          </button>
          <button
            onClick={handleOpenCreate}
            className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-red-600/30 transition"
          >
            <Plus className="w-4 h-4" />
            + New Contract (สร้างสัญญาใหม่)
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">Total Contracts</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</p>
          </div>
          <div className="p-3 bg-slate-100 text-slate-700 rounded-xl">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">Active Leases</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.active}</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">Expiring Soon (&lt;30d)</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{stats.expiringSoon}</p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">Monthly Rent Volume</p>
            <p className="text-xl font-bold text-slate-900 mt-1 font-mono">
              ฿{stats.totalRentMonthly.toLocaleString()}
            </p>
          </div>
          <div className="p-3 bg-red-50 text-red-600 rounded-xl">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Contract ID, Property, Tenant, Owner, or Agent..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-red-500 outline-none transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:bg-white focus:border-red-500 outline-none"
          >
            <option value="all">All Statuses (ทุกสถานะ)</option>
            <option value="Active">Active</option>
            <option value="Draft">Draft</option>
            <option value="Expiring Soon">Expiring Soon</option>
            <option value="Expired">Expired</option>
            <option value="Terminated">Terminated</option>
          </select>
        </div>
      </div>

      {/* Main Table / View Area */}
      {activeSubTab === 'rent' || activeSubTab === 'sale' ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-200 uppercase font-semibold text-[11px] tracking-wider">
                <tr>
                  <th className="px-4 py-3.5">Contract ID</th>
                  <th className="px-4 py-3.5">Property</th>
                  <th className="px-4 py-3.5">Landlord</th>
                  <th className="px-4 py-3.5">Tenant</th>
                  <th className="px-4 py-3.5">Period</th>
                  <th className="px-4 py-3.5">Rental Fee / Price</th>
                  <th className="px-4 py-3.5">Sales / Agent</th>
                  <th className="px-4 py-3.5">Word (.docx)</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredContracts.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center text-slate-400">
                      No contracts found matching the criteria.
                    </td>
                  </tr>
                ) : (
                  filteredContracts.map((c) => {
                    const cId = c.contractId || c.contractNumber || c.contractNo || c.id;
                    const monthly = c.monthlyRent || c.price || 0;
                    const wordFiles = (c.generatedWordFiles as any[]) || [];
                    const latestVersion = wordFiles[0]?.version || (c.currentWordFileUrl ? 1 : null);

                    return (
                      <tr key={c.id} className="hover:bg-slate-50/70 transition">
                        <td className="px-4 py-3 font-mono font-bold text-slate-900">
                          <button
                            onClick={() => setDetailModalContract(c)}
                            className="text-red-600 hover:text-red-700 hover:underline"
                          >
                            {cId}
                          </button>
                          <div className="text-[10px] text-slate-400 font-normal">
                            {c.contractType || c.type || 'Rent Contract'}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-800">
                            {c.projectEn || c.propertyTitle || c.propertyId}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            ID: {c.propertyId} {c.houseNo ? `• Unit ${c.houseNo}` : ''}
                          </div>
                        </td>

                        <td className="px-4 py-3 text-slate-700">
                          <div className="font-medium">{c.ownerName || c.partyAName || '-'}</div>
                          <div className="text-[11px] text-slate-400">{c.landlordNationality || 'Thai'}</div>
                        </td>

                        <td className="px-4 py-3 text-slate-700">
                          <div className="font-medium">{c.tenantName || c.partyBName || '-'}</div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {c.tenantPhone || '-'}
                          </div>
                        </td>

                        <td className="px-4 py-3 text-slate-600">
                          <div className="text-[11px]">
                            {c.rentalStart || c.startDate || '-'} → {c.rentalEnd || c.endDate || '-'}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Duration: {c.rentalTime || '12 Months'}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900 font-mono">
                            ฿{monthly.toLocaleString()}
                            <span className="text-[10px] text-slate-500 font-normal"> /mo</span>
                          </div>
                          {c.deposit !== undefined && c.deposit > 0 && (
                            <div className="text-[10px] text-slate-400">
                              Dep: ฿{c.deposit.toLocaleString()}
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3 text-slate-700">
                          <div className="font-medium">{c.salesName || c.agentName || c.agent || '-'}</div>
                          {c.salesCommission && (
                            <div className="text-[10px] text-red-600 font-semibold">
                              Comm: ฿{c.salesCommission}
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          {latestVersion ? (
                            <button
                              onClick={() => handleDownloadDocx(c)}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-lg text-[11px] font-bold flex items-center gap-1 transition"
                              title="Download Latest Word .docx"
                            >
                              <Download className="w-3 h-3 text-emerald-600" />
                              v{latestVersion} .docx
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">No Word file</span>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                              c.status === 'Active'
                                ? 'bg-emerald-100 text-emerald-700'
                                : c.status === 'Expiring Soon'
                                ? 'bg-amber-100 text-amber-700'
                                : c.status === 'Draft'
                                ? 'bg-slate-100 text-slate-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {c.status}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setViewerContract(c)}
                              className="p-1.5 text-blue-600 hover:text-blue-800 rounded-lg hover:bg-blue-50 transition"
                              title="เปิดดูสัญญาฉบับเต็ม 13 หน้า (View Full 13-Page Contract)"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDetailModalContract(c)}
                              className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOpenEdit(c)}
                              className="p-1.5 text-slate-500 hover:text-red-600 rounded-lg hover:bg-slate-100 transition"
                              title="Edit Contract"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDownloadDocx(c)}
                              className="p-1.5 text-slate-500 hover:text-emerald-600 rounded-lg hover:bg-slate-100 transition"
                              title="Download Word Document"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteWithRBAC(c.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-100 transition"
                              title="Archive Contract (Soft Delete)"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* B23 — PAYMENT MANAGEMENT LITE FULL DASHBOARD & OPERATIONS */
        <PaymentManagementView
          currentUser={currentUser}
          language={language}
          contracts={contracts}
          properties={properties}
          onOpenContract={(contractId) => {
            const found = contracts.find(
              (c) => c.contractId === contractId || c.contractNumber === contractId || c.id === contractId
            );
            if (found) {
              setDetailModalContract(found);
            }
          }}
        />
      )}

      {/* B22 Contract Form Modal (Create / Edit) */}
      <ContractFormModal
        isOpen={b22ModalOpen}
        onClose={() => setB22ModalOpen(false)}
        contract={editingContract}
        properties={properties}
        customers={customers}
        users={users}
        currentUser={currentUser}
        language={language}
        onSaved={(savedContract) => {
          onSaveContract(savedContract);
          setB22ModalOpen(false);
        }}
      />

      {/* Contract Detail View Modal */}
      {detailModalContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl p-6 border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-4">
              <div>
                <span className="text-xs font-bold text-red-600 tracking-wider uppercase">
                  Contract Details
                </span>
                <h2 className="text-xl font-bold font-serif text-slate-900 mt-0.5">
                  {detailModalContract.contractId || detailModalContract.contractNumber || detailModalContract.id}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const c = detailModalContract;
                    setDetailModalContract(null);
                    setViewerContract(c);
                  }}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
                  title="เปิดดูสัญญาฉบับเต็ม 13 หน้า พร้อมเอกสารแนบ"
                >
                  <FileText className="w-3.5 h-3.5" />
                  ดูสัญญา 13 หน้า (Full Document)
                </button>
                <button
                  onClick={() => handleDownloadDocx(detailModalContract)}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Word (.docx)
                </button>
                <button
                  onClick={() => setDetailModalContract(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <h4 className="font-bold text-slate-800 border-b border-slate-200 pb-1">
                  Contract & Dates
                </h4>
                <p><span className="text-slate-500">Sign Date:</span> {detailModalContract.signDate || '-'}</p>
                <p><span className="text-slate-500">Rental Period:</span> {detailModalContract.rentalStart || '-'} to {detailModalContract.rentalEnd || '-'}</p>
                <p><span className="text-slate-500">Duration:</span> {detailModalContract.rentalTime || '12 Months'}</p>
                <p><span className="text-slate-500">Pet Allowed:</span> {detailModalContract.withPet ? 'Yes (อนุญาต)' : 'No (ไม่อนุญาต)'}</p>
                <p><span className="text-slate-500">Status:</span> <span className="font-bold text-emerald-600">{detailModalContract.status}</span></p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <h4 className="font-bold text-slate-800 border-b border-slate-200 pb-1">
                  Property Information
                </h4>
                <p><span className="text-slate-500">Property ID:</span> {detailModalContract.propertyId}</p>
                <p><span className="text-slate-500">Project:</span> {detailModalContract.projectEn || detailModalContract.propertyTitle || '-'}</p>
                <p><span className="text-slate-500">House No:</span> {detailModalContract.houseNo || '-'}</p>
                <p><span className="text-slate-500">Location:</span> {detailModalContract.subDistrict || ''}, {detailModalContract.district || ''}, {detailModalContract.province || 'Phuket'}</p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <h4 className="font-bold text-slate-800 border-b border-slate-200 pb-1">
                  Landlord & Bank
                </h4>
                <p><span className="text-slate-500">Owner Name:</span> {detailModalContract.ownerName || '-'}</p>
                <p><span className="text-slate-500">ID/Passport:</span> {detailModalContract.landlordIdNo || '-'}</p>
                <p><span className="text-slate-500">Bank:</span> {detailModalContract.landlordBank || 'Kasikorn Bank'}</p>
                <p><span className="text-slate-500">Account No:</span> <span className="font-mono font-bold">{detailModalContract.landlordAccountNo || '-'}</span></p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <h4 className="font-bold text-slate-800 border-b border-slate-200 pb-1">
                  Tenant Information
                </h4>
                <p><span className="text-slate-500">Name:</span> {detailModalContract.tenantName || '-'}</p>
                <p><span className="text-slate-500">Phone:</span> {detailModalContract.tenantPhone || '-'}</p>
                <p><span className="text-slate-500">Nationality:</span> {detailModalContract.tenantNationality || '-'}</p>
                <p><span className="text-slate-500">ID / Passport:</span> {detailModalContract.tenantIdNo || '-'}</p>
              </div>

              <div className="md:col-span-2 bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <h4 className="font-bold text-slate-800 border-b border-slate-200 pb-1">
                  Financial Terms & Commission
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                  <div>
                    <span className="text-slate-500 block">Monthly Rent:</span>
                    <span className="font-bold text-slate-900 font-mono text-sm">
                      ฿{(detailModalContract.monthlyRent || 0).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Deposit:</span>
                    <span className="font-bold text-slate-900 font-mono text-sm">
                      ฿{(detailModalContract.deposit || 0).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Advance Rental:</span>
                    <span className="font-bold text-slate-900 font-mono text-sm">
                      ฿{(detailModalContract.advanceRental || 0).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Sales Commission:</span>
                    <span className="font-bold text-red-600 font-mono text-sm">
                      ฿{detailModalContract.salesCommission || '0'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* B23 Payment Schedule & Financial Status Integration */}
            <div className="mt-4">
              <ContractPaymentSummarySection
                contract={detailModalContract}
                currentUser={currentUser}
              />
            </div>

            <div className="mt-6 flex justify-end gap-3 border-t border-slate-200 pt-4">
              <button
                onClick={() => {
                  const toEdit = detailModalContract;
                  setDetailModalContract(null);
                  handleOpenEdit(toEdit);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-xl text-xs transition"
              >
                Edit This Contract
              </button>
              <button
                onClick={() => setDetailModalContract(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 13-Page Full Document Viewer Modal */}
      {viewerContract && (
        <ContractDocumentViewerModal
          contract={viewerContract}
          onClose={() => setViewerContract(null)}
          onDownloadDocx={handleDownloadDocx}
        />
      )}
    </div>
  );
}
