import React, { useState, useEffect, useMemo } from 'react';
import { User, Contract, Property, PaymentSchedule, PaymentRecord, PaymentType, PaymentStatus, PaymentMethod } from '../types';
import { Language, translations } from '../lib/i18n';
import {
  CreditCard,
  Search,
  Filter,
  Calendar,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  UploadCloud,
  Check,
  X,
  Eye,
  Plus,
  ArrowRight,
  Shield,
  Download,
  Trash2,
  RefreshCw,
  ExternalLink,
  Paperclip,
  Image as ImageIcon,
  Building,
  User as UserIcon,
  Tag,
} from 'lucide-react';

interface PaymentManagementViewProps {
  currentUser: User;
  language: Language;
  contracts: Contract[];
  properties: Property[];
  onOpenContract?: (contractId: string) => void;
}

export const PaymentManagementView: React.FC<PaymentManagementViewProps> = ({
  currentUser,
  language,
  contracts,
  properties,
  onOpenContract,
}) => {
  const [schedules, setSchedules] = useState<PaymentSchedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({
    totalExpected: 0,
    totalPaid: 0,
    totalRemaining: 0,
    totalOverdue: 0,
    countPending: 0,
    countPaid: 0,
    countPartial: 0,
    countOverdue: 0,
    countCancelled: 0,
  });

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modals
  const [recordPaymentModalOpen, setRecordPaymentModalOpen] = useState(false);
  const [selectedScheduleForPayment, setSelectedScheduleForPayment] = useState<PaymentSchedule | null>(null);
  const [detailModalSchedule, setDetailModalSchedule] = useState<{
    schedule: PaymentSchedule;
    records: PaymentRecord[];
  } | null>(null);
  const [newScheduleModalOpen, setNewScheduleModalOpen] = useState(false);

  // Form states for Record Payment
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Bank Transfer');
  const [bank, setBank] = useState('Kasikorn Bank (KBANK)');
  const [accountNo, setAccountNo] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [receiptFile, setReceiptFile] = useState<{
    fileName: string;
    fileUrl: string;
    fileType: string;
    fileSize?: number;
    uploadedAt?: string;
  } | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Check RBAC permissions
  const isAdmin = (currentUser.role || '').toLowerCase().includes('admin');
  const isManager = (currentUser.role || '').toLowerCase().includes('manager');
  const canCancelOrArchive = isAdmin || isManager;

  // Load schedules from backend
  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      if (selectedType !== 'all') params.append('paymentType', selectedType);
      if (selectedStatus !== 'all') params.append('status', selectedStatus);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await fetch(`/api/payments/schedules?${params.toString()}`, {
        headers: {
          'x-user-role': currentUser.role || 'Agent',
          'x-user-name': currentUser.name || 'User',
          'x-user-id': currentUser.id || 'usr-1',
        },
      });
      const data = await res.json();
      if (data.success) {
        setSchedules(data.schedules || []);
        if (data.summary) {
          setSummary(data.summary);
        }
      }
    } catch (err) {
      console.error('Failed to fetch payment schedules:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, [selectedType, selectedStatus, startDate, endDate]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchSchedules();
  };

  // Open Record Payment Modal for a schedule
  const handleOpenRecordPayment = (schedule: PaymentSchedule) => {
    setSelectedScheduleForPayment(schedule);
    const rem = Number(schedule.remainingAmount) || 0;
    setPaymentAmount(rem > 0 ? rem.toString() : Number(schedule.amount).toString());
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentMethod('Bank Transfer');
    setReferenceNo('');
    setPaymentNotes('');
    setReceiptFile(null);
    setFormError('');

    // Pre-fill bank info from contract if available
    const contract = contracts.find((c) => c.contractId === schedule.contractId);
    if (contract?.landlordBank) {
      setBank(contract.landlordBank);
      setAccountNo(contract.landlordAccountNo || '');
    } else {
      setBank('Kasikorn Bank (KBANK)');
      setAccountNo('');
    }

    setRecordPaymentModalOpen(true);
  };

  // Upload receipt handler
  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate extension
    const validExtensions = ['.jpg', '.jpeg', '.png', '.pdf'];
    const fileName = file.name.toLowerCase();
    const isValid = validExtensions.some((ext) => fileName.endsWith(ext));
    if (!isValid) {
      setFormError('อนุญาตเฉพาะไฟล์รูปภาพ (JPG, JPEG, PNG) หรือไฟล์เอกสาร PDF เท่านั้น');
      return;
    }

    // Validate size: max 10MB
    if (file.size > 10 * 1024 * 1024) {
      setFormError('ขนาดไฟล์ต้องไม่เกิน 10MB');
      return;
    }

    setUploadingReceipt(true);
    setFormError('');

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const fileData = reader.result as string;
          const res = await fetch('/api/payments/upload-receipt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileName: file.name,
              fileData,
              fileType: file.type,
            }),
          });
          const data = await res.json();
          if (data.success && data.file) {
            setReceiptFile(data.file);
          } else {
            setFormError(data.error || 'Upload failed');
          }
        } catch (err: any) {
          setFormError(err.message || 'Upload failed');
        } finally {
          setUploadingReceipt(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setFormError(err.message || 'Failed to read file');
      setUploadingReceipt(false);
    }
  };

  // Submit payment record
  const handleSubmitPaymentRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedScheduleForPayment) return;

    const amt = parseFloat(paymentAmount);
    if (isNaN(amt) || amt <= 0) {
      setFormError('กรุณาระบุจำนวนเงินที่ถูกต้อง (ต้องมากกว่า 0)');
      return;
    }

    if (!paymentDate) {
      setFormError('กรุณาระบุวันที่ชำระเงิน');
      return;
    }

    setActionLoading(true);
    setFormError('');

    try {
      const res = await fetch('/api/payments/records', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentUser.role || 'Agent',
          'x-user-name': currentUser.name || 'User',
          'x-user-id': currentUser.id || 'usr-1',
        },
        body: JSON.stringify({
          contractId: selectedScheduleForPayment.contractId,
          paymentScheduleId: selectedScheduleForPayment.id,
          paymentDate,
          amount: amt,
          paymentMethod,
          bank,
          accountNo,
          referenceNo,
          notes: paymentNotes,
          receiptFile,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to record payment');
      }

      setRecordPaymentModalOpen(false);
      setSelectedScheduleForPayment(null);
      await fetchSchedules();
    } catch (err: any) {
      setFormError(err.message || 'Failed to record payment');
    } finally {
      setActionLoading(false);
    }
  };

  // View Schedule details and past records
  const handleViewDetails = async (schedule: PaymentSchedule) => {
    try {
      const res = await fetch(`/api/payments/schedules/${schedule.id}`);
      const data = await res.json();
      if (data.success && data.schedule) {
        setDetailModalSchedule({
          schedule: data.schedule,
          records: data.records || [],
        });
      }
    } catch (err) {
      console.error('Failed to fetch schedule details:', err);
    }
  };

  // Cancel / Soft Delete schedule
  const handleCancelSchedule = async (schedule: PaymentSchedule) => {
    if (!canCancelOrArchive) {
      alert('เฉพาะผู้จัดการ (Manager) หรือผู้ดูแลระบบ (Admin) เท่านั้นที่สามารถยกเลิกรายการกำหนดชำระได้');
      return;
    }

    if (!confirm(`คุณต้องการยกเลิกรายการกำหนดชำระ "${schedule.title}" หรือไม่? (ระบบจะเปลี่ยนสถานะเป็น Cancelled และเก็บประวัติ Audit Log)`)) {
      return;
    }

    try {
      const res = await fetch(`/api/payments/schedules/${schedule.id}`, {
        method: 'DELETE',
        headers: {
          'x-user-role': currentUser.role || 'Agent',
          'x-user-name': currentUser.name || 'User',
          'x-user-id': currentUser.id || 'usr-1',
        },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || 'Failed to cancel schedule');
        return;
      }
      await fetchSchedules();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel schedule');
    }
  };

  // Status Badge Helper
  const renderStatusBadge = (status: PaymentStatus) => {
    switch (status) {
      case 'Paid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Paid (ชำระแล้ว)
          </span>
        );
      case 'Partially Paid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
            <Clock className="w-3 h-3 text-blue-600" />
            Partially Paid (ชำระบางส่วน)
          </span>
        );
      case 'Overdue':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-100 text-red-800 border border-red-200 animate-pulse">
            <AlertTriangle className="w-3 h-3 text-red-600" />
            Overdue (เกินกำหนด)
          </span>
        );
      case 'Cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
            <X className="w-3 h-3 text-slate-500" />
            Cancelled (ยกเลิก)
          </span>
        );
      case 'Pending':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" />
            Pending (รอชำระ)
          </span>
        );
    }
  };

  // Payment Type Badge Helper
  const renderTypeBadge = (type: PaymentType) => {
    const map: Record<PaymentType, { label: string; bg: string; text: string }> = {
      Rent: { label: 'ค่าเช่า (Rent)', bg: 'bg-indigo-50', text: 'text-indigo-700' },
      Deposit: { label: 'เงินประกัน (Deposit)', bg: 'bg-emerald-50', text: 'text-emerald-700' },
      'Advance Rental': { label: 'ค่าเช่าล่วงหน้า (Advance)', bg: 'bg-purple-50', text: 'text-purple-700' },
      Commission: { label: 'คอมมิชชั่น (Commission)', bg: 'bg-amber-50', text: 'text-amber-700' },
      Other: { label: 'อื่นๆ (Other)', bg: 'bg-slate-50', text: 'text-slate-700' },
    };
    const c = map[type] || map.Other;
    return (
      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${c.bg} ${c.text} border border-slate-200`}>
        {c.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* 1. Dashboard KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Expected */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Expected (ยอดรวม)
            </span>
            <div className="p-2.5 bg-slate-100 text-slate-700 rounded-xl">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold font-mono text-slate-900">
              ฿{summary.totalExpected.toLocaleString()}
            </span>
            <p className="text-xs text-slate-400 mt-1">
              จากกำหนดชำระทั้งหมด {schedules.length} รายการ
            </p>
          </div>
        </div>

        {/* Total Paid */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
              Received (ชำระแล้ว)
            </span>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold font-mono text-emerald-600">
              ฿{summary.totalPaid.toLocaleString()}
            </span>
            <p className="text-xs text-slate-400 mt-1">
              ชำระครบ {summary.countPaid} รายการ {summary.countPartial > 0 && `(บางส่วน ${summary.countPartial})`}
            </p>
          </div>
        </div>

        {/* Total Remaining / Pending */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">
              Pending (รอชำระ)
            </span>
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold font-mono text-amber-600">
              ฿{summary.totalRemaining.toLocaleString()}
            </span>
            <p className="text-xs text-slate-400 mt-1">
              ยังไม่ถึงกำหนด {summary.countPending} รายการ
            </p>
          </div>
        </div>

        {/* Total Overdue */}
        <div className="bg-white rounded-2xl border border-red-200 p-5 shadow-sm relative overflow-hidden bg-red-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-red-600 uppercase tracking-wider">
              Overdue (เกินกำหนด)
            </span>
            <div className="p-2.5 bg-red-100 text-red-600 rounded-xl">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold font-mono text-red-600">
              ฿{summary.totalOverdue.toLocaleString()}
            </span>
            <p className="text-xs text-red-500 font-semibold mt-1">
              ค้างชำระ {summary.countOverdue} รายการ (ต้องเร่งติดตาม)
            </p>
          </div>
        </div>
      </div>

      {/* 2. Search & Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3 items-center justify-between">
          {/* Search box */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ค้นหา Contract ID, รหัสทรัพย์ (Property ID), ชื่อผู้เช่า, รายการชำระ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 transition"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Payment Type Filter */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none"
            >
              <option value="all">ทุกประเภท (All Types)</option>
              <option value="Rent">ค่าเช่า (Rent)</option>
              <option value="Deposit">เงินประกัน (Deposit)</option>
              <option value="Advance Rental">ค่าเช่าล่วงหน้า (Advance)</option>
              <option value="Commission">คอมมิชชั่น (Commission)</option>
              <option value="Other">อื่นๆ (Other)</option>
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none"
            >
              <option value="all">ทุกสถานะ (All Status)</option>
              <option value="Pending">รอชำระ (Pending)</option>
              <option value="Partially Paid">ชำระบางส่วน (Partial)</option>
              <option value="Paid">ชำระแล้ว (Paid)</option>
              <option value="Overdue">เกินกำหนด (Overdue)</option>
              <option value="Cancelled">ยกเลิกแล้ว (Cancelled)</option>
            </select>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={fetchSchedules}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
              title="Refresh data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </form>

        {/* Status Quick Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-slate-100 text-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
            Status:
          </span>
          <button
            onClick={() => setSelectedStatus('all')}
            className={`px-3 py-1 rounded-lg font-semibold transition ${
              selectedStatus === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All ({schedules.length})
          </button>
          <button
            onClick={() => setSelectedStatus('Pending')}
            className={`px-3 py-1 rounded-lg font-semibold transition flex items-center gap-1 ${
              selectedStatus === 'Pending'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            }`}
          >
            Pending ({summary.countPending})
          </button>
          <button
            onClick={() => setSelectedStatus('Partially Paid')}
            className={`px-3 py-1 rounded-lg font-semibold transition flex items-center gap-1 ${
              selectedStatus === 'Partially Paid'
                ? 'bg-blue-600 text-white'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
          >
            Partial ({summary.countPartial})
          </button>
          <button
            onClick={() => setSelectedStatus('Paid')}
            className={`px-3 py-1 rounded-lg font-semibold transition flex items-center gap-1 ${
              selectedStatus === 'Paid'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            Paid ({summary.countPaid})
          </button>
          <button
            onClick={() => setSelectedStatus('Overdue')}
            className={`px-3 py-1 rounded-lg font-semibold transition flex items-center gap-1 ${
              selectedStatus === 'Overdue'
                ? 'bg-red-600 text-white'
                : 'bg-red-50 text-red-700 hover:bg-red-100'
            }`}
          >
            Overdue ({summary.countOverdue})
          </button>
        </div>
      </div>

      {/* 3. Payment Schedules Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Payment Schedules (ตารางกำหนดชำระเงินตามสัญญา)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              เชื่อมโยงกับสัญญาเช่า B22 ติดตามยอดค้างชำระอัตโนมัติ และแนบหลักฐานการโอน
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-lg">
            {schedules.length} Schedules
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[11px] border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Due Date (วันครบกำหนด)</th>
                <th className="px-4 py-3">Schedule Item (รายการ)</th>
                <th className="px-4 py-3">Contract / Property</th>
                <th className="px-4 py-3">Payer / Tenant</th>
                <th className="px-4 py-3 text-right">Amount (ยอดเต็ม)</th>
                <th className="px-4 py-3 text-right">Paid (ชำระแล้ว)</th>
                <th className="px-4 py-3 text-right">Remaining (คงเหลือ)</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-300" />
                    กำลังโหลดข้อมูลการชำระเงิน...
                  </td>
                </tr>
              ) : schedules.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <CreditCard className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-sm">ไม่พบรายการกำหนดชำระเงิน</p>
                    <p className="text-xs text-slate-400 mt-1">
                      สามารถกด "สร้างรอบชำระจากสัญญา (Generate Payment Schedule)" ได้ที่หน้าสัญญาเช่า
                    </p>
                  </td>
                </tr>
              ) : (
                schedules.map((s) => {
                  const amt = Number(s.amount) || 0;
                  const paid = Number(s.paidAmount) || 0;
                  const remaining = Math.max(0, amt - paid);
                  const isOverdue = s.status === 'Overdue';

                  return (
                    <tr
                      key={s.id}
                      className={`hover:bg-slate-50/80 transition ${
                        isOverdue ? 'bg-red-50/30' : ''
                      }`}
                    >
                      {/* Due Date */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className={`w-3.5 h-3.5 ${isOverdue ? 'text-red-500' : 'text-slate-400'}`} />
                          <span className={`font-mono font-bold ${isOverdue ? 'text-red-600' : 'text-slate-800'}`}>
                            {s.dueDate}
                          </span>
                        </div>
                        {isOverdue && (
                          <span className="text-[10px] text-red-500 font-semibold block mt-0.5">
                            เกินกำหนดชำระ!
                          </span>
                        )}
                      </td>

                      {/* Title & Type */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{s.title}</div>
                        <div className="mt-1">{renderTypeBadge(s.paymentType)}</div>
                      </td>

                      {/* Contract / Property Link */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <span className="font-mono font-bold text-slate-800">{s.contractId}</span>
                          {onOpenContract && (
                            <button
                              onClick={() => onOpenContract(s.contractId)}
                              className="text-blue-600 hover:text-blue-800 p-0.5"
                              title="เปิดดูสัญญา"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Building className="w-3 h-3 text-slate-400" />
                          <span>{s.propertyId}</span>
                        </div>
                      </td>

                      {/* Payer / Tenant */}
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800 flex items-center gap-1">
                          <UserIcon className="w-3 h-3 text-slate-400" />
                          <span>{s.payerName || 'Tenant'}</span>
                        </div>
                        {s.payerPhone && (
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {s.payerPhone}
                          </div>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        ฿{amt.toLocaleString()}
                      </td>

                      {/* Paid Amount */}
                      <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-600 whitespace-nowrap">
                        ฿{paid.toLocaleString()}
                      </td>

                      {/* Remaining Amount */}
                      <td className="px-4 py-3 text-right font-mono font-bold whitespace-nowrap">
                        <span className={remaining > 0 ? (isOverdue ? 'text-red-600 font-extrabold' : 'text-amber-600') : 'text-slate-400'}>
                          ฿{remaining.toLocaleString()}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        {renderStatusBadge(s.status)}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Record Payment button */}
                          {s.status !== 'Paid' && s.status !== 'Cancelled' && (
                            <button
                              onClick={() => handleOpenRecordPayment(s)}
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center gap-1 shadow-sm transition"
                              title="บันทึกการรับชำระเงิน"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              บันทึกรับเงิน
                            </button>
                          )}

                          {/* View history / details */}
                          <button
                            onClick={() => handleViewDetails(s)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                            title="ดูประวัติการชำระและหลักฐาน"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Cancel / Archive button (Manager/Admin RBAC) */}
                          {canCancelOrArchive && s.status !== 'Cancelled' && (
                            <button
                              onClick={() => handleCancelSchedule(s)}
                              className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition"
                              title="ยกเลิกรายการนี้ (Cancel/Archive)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
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

      {/* 4. Record Payment Modal */}
      {recordPaymentModalOpen && selectedScheduleForPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <span className="text-[11px] font-bold text-emerald-600 tracking-wider uppercase">
                  Payment Collection (บันทึกการรับเงิน)
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">
                  {selectedScheduleForPayment.title}
                </h3>
              </div>
              <button
                onClick={() => setRecordPaymentModalOpen(false)}
                className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitPaymentRecord} className="space-y-4 text-xs">
              {/* Schedule Summary Banner */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 grid grid-cols-3 gap-2 text-center">
                <div>
                  <span className="text-slate-400 block text-[10px]">Total Amount</span>
                  <span className="font-mono font-bold text-slate-800">
                    ฿{Number(selectedScheduleForPayment.amount).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Paid So Far</span>
                  <span className="font-mono font-bold text-emerald-600">
                    ฿{Number(selectedScheduleForPayment.paidAmount).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Remaining Due</span>
                  <span className="font-mono font-bold text-amber-600">
                    ฿{Number(selectedScheduleForPayment.remainingAmount).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Amount & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Payment Amount (จำนวนเงินที่รับ) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">฿</span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Payment Date (วันที่ชำระ) *
                  </label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Payment Method (ช่องทางชำระเงิน)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Bank Transfer', 'Cash', 'Other'] as PaymentMethod[]).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`py-2 px-2 rounded-xl font-semibold border text-center transition ${
                        paymentMethod === method
                          ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {method === 'Bank Transfer' ? 'โอนเงิน (Transfer)' : method === 'Cash' ? 'เงินสด (Cash)' : 'อื่นๆ (Other)'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bank & Reference No. */}
              {paymentMethod === 'Bank Transfer' && (
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Bank (ธนาคารผู้รับเงิน)
                    </label>
                    <input
                      type="text"
                      value={bank}
                      onChange={(e) => setBank(e.target.value)}
                      placeholder="Kasikorn, SCB, BBL..."
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Reference / Slip No. (เลขอ้างอิง)
                    </label>
                    <input
                      type="text"
                      value={referenceNo}
                      onChange={(e) => setReferenceNo(e.target.value)}
                      placeholder="e.g. 202609241234567"
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Receipt File Upload */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Attach Receipt / Proof (แนบสลิปหรือหลักฐานการโอน: JPG, PNG, PDF)
                </label>
                {receiptFile ? (
                  <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <Paperclip className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div className="truncate">
                        <span className="font-semibold text-emerald-800 text-xs truncate block">
                          {receiptFile.fileName}
                        </span>
                        <span className="text-[10px] text-emerald-600 font-mono">
                          {receiptFile.fileSize ? `${(receiptFile.fileSize / 1024).toFixed(1)} KB` : 'Uploaded'}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReceiptFile(null)}
                      className="text-red-500 hover:text-red-700 p-1 rounded-lg"
                      title="ลบไฟล์"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl cursor-pointer bg-slate-50 hover:bg-emerald-50/30 transition">
                    <UploadCloud className="w-6 h-6 text-slate-400 mb-1" />
                    <span className="font-semibold text-slate-700">คลิกเพื่อเลือกไฟล์สลิป</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">
                      รองรับ JPG, JPEG, PNG, PDF (สูงสุด 10MB)
                    </span>
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf"
                      onChange={handleReceiptUpload}
                      disabled={uploadingReceipt}
                      className="hidden"
                    />
                  </label>
                )}
                {uploadingReceipt && (
                  <div className="mt-1 text-xs text-blue-600 flex items-center gap-1 font-semibold">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    กำลังอัปโหลดไฟล์หลักฐาน...
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Notes / Remark (หมายเหตุ)
                </label>
                <textarea
                  rows={2}
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="บันทึกรายละเอียดเพิ่มเติม..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setRecordPaymentModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition"
                >
                  ยกเลิก (Cancel)
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || uploadingReceipt}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm transition flex items-center gap-1.5"
                >
                  {actionLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      กำลังบันทึก...
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      ยืนยันบันทึกการรับเงิน
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Schedule Details & History Modal */}
      {detailModalSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl p-6 border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <span className="text-[11px] font-bold text-slate-400 tracking-wider uppercase">
                  Schedule History & Details
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">
                  {detailModalSchedule.schedule.title}
                </h3>
              </div>
              <button
                onClick={() => setDetailModalSchedule(null)}
                className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Financial Status Cards */}
              <div className="grid grid-cols-4 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                <div>
                  <span className="text-slate-400 block text-[10px]">Due Date</span>
                  <span className="font-mono font-bold text-slate-800">
                    {detailModalSchedule.schedule.dueDate}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Total Amount</span>
                  <span className="font-mono font-bold text-slate-900">
                    ฿{Number(detailModalSchedule.schedule.amount).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Total Paid</span>
                  <span className="font-mono font-bold text-emerald-600">
                    ฿{Number(detailModalSchedule.schedule.paidAmount).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Remaining</span>
                  <span className="font-mono font-bold text-amber-600">
                    ฿{Number(detailModalSchedule.schedule.remainingAmount).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-3 bg-white p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-500">Contract ID:</span>{' '}
                  <span className="font-mono font-bold text-slate-800">{detailModalSchedule.schedule.contractId}</span>
                </div>
                <div>
                  <span className="text-slate-500">Property ID:</span>{' '}
                  <span className="font-mono font-bold text-slate-800">{detailModalSchedule.schedule.propertyId}</span>
                </div>
                <div>
                  <span className="text-slate-500">Payer Name:</span>{' '}
                  <span className="font-semibold text-slate-800">{detailModalSchedule.schedule.payerName || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-500">Current Status:</span>{' '}
                  {renderStatusBadge(detailModalSchedule.schedule.status)}
                </div>
              </div>

              {/* Payment Transactions History */}
              <div>
                <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  Recorded Payments (ประวัติการชำระเงินจริง: {detailModalSchedule.records.length} รายการ)
                </h4>

                {detailModalSchedule.records.length === 0 ? (
                  <div className="p-4 text-center bg-slate-50 rounded-xl text-slate-400">
                    ยังไม่มีรายการบันทึกการชำระเงินสำหรับรอบนี้
                  </div>
                ) : (
                  <div className="space-y-2">
                    {detailModalSchedule.records.map((rec) => (
                      <div
                        key={rec.id}
                        className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-emerald-600 text-sm">
                              ฿{Number(rec.amount).toLocaleString()}
                            </span>
                            <span className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-semibold text-slate-700">
                              {rec.paymentMethod}
                            </span>
                            <span className="text-slate-400 font-mono text-[11px]">
                              {rec.paymentDate}
                            </span>
                          </div>
                          <div className="text-slate-500 text-[11px]">
                            {rec.bank && <span>ธนาคาร: {rec.bank} </span>}
                            {rec.referenceNo && <span className="font-mono">Ref: {rec.referenceNo} </span>}
                            {rec.notes && <span className="italic text-slate-600">"{rec.notes}"</span>}
                          </div>
                        </div>

                        {/* Receipt preview / download button */}
                        {rec.receiptFile && (
                          <a
                            href={rec.receiptFile.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg font-semibold text-slate-700 flex items-center gap-1 shadow-sm transition"
                          >
                            <Paperclip className="w-3.5 h-3.5 text-blue-500" />
                            ดูสลิปหลักฐาน
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end border-t border-slate-100 pt-3">
              <button
                onClick={() => setDetailModalSchedule(null)}
                className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl transition hover:bg-slate-800 text-xs"
              >
                ปิด (Close)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
