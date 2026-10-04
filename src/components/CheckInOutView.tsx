import React, { useState, useMemo } from 'react';
import { CheckInOut, CheckInOutType, Property, Customer, User, DamageItem } from '../types';
import { translations, Language } from '../lib/i18n';
import {
  KeyRound,
  LogOut as LogOutIcon,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Camera,
  Gauge,
  Droplets,
  Zap,
  Building2,
  DollarSign,
  Edit2,
  Trash2,
  X,
  FileCheck2,
  Image as ImageIcon
} from 'lucide-react';

interface CheckInOutViewProps {
  records: CheckInOut[];
  properties: Property[];
  customers: Customer[];
  users: User[];
  currentUser: User;
  language: Language;
  onSaveRecord: (record: CheckInOut) => void;
  onDeleteRecord: (id: string) => void;
  initialFilter?: string;
}

export function CheckInOutView({
  records,
  properties,
  customers,
  users,
  currentUser,
  language,
  onSaveRecord,
  onDeleteRecord,
  initialFilter,
}: CheckInOutViewProps) {
  const t = translations[language];

  const [typeFilter, setTypeFilter] = useState<string>(initialFilter || 'all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<CheckInOut | null>(null);
  const [detailModalRecord, setDetailModalRecord] = useState<CheckInOut | null>(null);

  // Form State
  const initialForm: Partial<CheckInOut> = {
    recordNumber: `CK-${Math.floor(100 + Math.random() * 900)}`,
    type: (initialFilter === 'Check-out' ? 'Check-out' : 'Check-in') as CheckInOutType,
    propertyId: properties[0]?.id || '',
    propertyCustomId: properties[0]?.propertyId || '',
    propertyTitle: properties[0]?.title || '',
    tenantName: customers[0]?.name || 'Tenant Name',
    tenantPhone: customers[0]?.phone || '081-000-0000',
    date: new Date().toISOString().slice(0, 16),
    electricityMeter: 12450.5,
    waterMeter: 840.2,
    electricityMeterImage: 'https://images.unsplash.com/photo-1558441719-8b489c63f7d1?auto=format&fit=crop&w=600&q=80',
    waterMeterImage: 'https://images.unsplash.com/photo-1585776245991-cf89dd7fc73a?auto=format&fit=crop&w=600&q=80',
    keySetsDelivered: 3,
    accessCardDelivered: 2,
    damages: [],
    depositTotal: 100000,
    depositDeductions: 0,
    depositRefunded: 100000,
    depositStatus: 'Full Refund',
    inspectorName: currentUser.name,
    recipientName: customers[0]?.name || 'Tenant Name',
    notes: 'Everything inspected in good condition. All AC remotes tested.',
  };

  const [formData, setFormData] = useState<Partial<CheckInOut>>(initialForm);

  // Damage item temporary state for form
  const [tempDamageItem, setTempDamageItem] = useState({ item: '', area: 'Living Room', cost: 0, description: '' });

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchType = typeFilter === 'all' || r.type === typeFilter;
      const q = (searchQuery || '').toLowerCase();
      const matchSearch =
        (r.recordNumber && r.recordNumber.toLowerCase().includes(q)) ||
        (r.propertyTitle && r.propertyTitle.toLowerCase().includes(q)) ||
        (r.tenantName && r.tenantName.toLowerCase().includes(q)) ||
        (r.propertyCustomId && r.propertyCustomId.toLowerCase().includes(q));

      return matchType && matchSearch;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [records, typeFilter, searchQuery]);

  const handleOpenAdd = () => {
    setEditingRecord(null);
    setFormData({
      ...initialForm,
      recordNumber: `CK-${Math.floor(100 + Math.random() * 900)}`,
      type: (typeFilter === 'Check-out' ? 'Check-out' : 'Check-in') as CheckInOutType,
    });
    setEditModalOpen(true);
  };

  const handleOpenEdit = (rec: CheckInOut) => {
    setEditingRecord(rec);
    setFormData({ ...rec, date: rec.date.slice(0, 16) });
    setEditModalOpen(true);
  };

  const handleAddDamage = () => {
    if (!tempDamageItem.item) return;
    const currentDamages = formData.damages || [];
    const newDamage: DamageItem = {
      id: `dmg-${Date.now()}`,
      item: tempDamageItem.item,
      area: tempDamageItem.area,
      description: tempDamageItem.description || 'Inspection finding',
      estimatedCost: Number(tempDamageItem.cost) || 0,
    };
    const updatedDamages = [...currentDamages, newDamage];
    const totalDeduction = updatedDamages.reduce((sum, d) => sum + d.estimatedCost, 0);
    const depositTotal = formData.depositTotal || 0;
    const refund = Math.max(0, depositTotal - totalDeduction);

    setFormData({
      ...formData,
      damages: updatedDamages,
      depositDeductions: totalDeduction,
      depositRefunded: refund,
      depositStatus: totalDeduction === 0 ? 'Full Refund' : refund > 0 ? 'Partial Deduction' : 'Fully Forfeited',
    });
    setTempDamageItem({ item: '', area: 'Living Room', cost: 0, description: '' });
  };

  const handleRemoveDamage = (id: string) => {
    const updatedDamages = (formData.damages || []).filter((d) => d.id !== id);
    const totalDeduction = updatedDamages.reduce((sum, d) => sum + d.estimatedCost, 0);
    const depositTotal = formData.depositTotal || 0;
    const refund = Math.max(0, depositTotal - totalDeduction);

    setFormData({
      ...formData,
      damages: updatedDamages,
      depositDeductions: totalDeduction,
      depositRefunded: refund,
      depositStatus: totalDeduction === 0 ? 'Full Refund' : refund > 0 ? 'Partial Deduction' : 'Fully Forfeited',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selProp = properties.find((p) => p.id === formData.propertyId);

    const toSave: CheckInOut = {
      id: editingRecord ? editingRecord.id : `ck-${Date.now()}`,
      code: formData.recordNumber || formData.code || `CK-${Math.floor(100 + Math.random() * 900)}`,
      recordNumber: formData.recordNumber || formData.code || `CK-${Math.floor(100 + Math.random() * 900)}`,
      type: (formData.type as CheckInOutType) || 'Check-in',
      propertyId: selProp?.id || formData.propertyId || '',
      propertyCustomId: selProp?.propertyId || formData.propertyCustomId || '',
      propertyTitle: selProp?.title || formData.propertyTitle || '',
      customerId: (formData as any).customerId || 'cust-1',
      customerName: formData.tenantName || (formData as any).customerName || 'Tenant',
      tenantName: formData.tenantName || 'Tenant',
      tenantPhone: formData.tenantPhone || '',
      agentId: currentUser.id,
      agentName: currentUser.name,
      date: formData.date || new Date().toISOString(),
      electricityMeter: Number(formData.electricityMeter) || 0,
      waterMeter: Number(formData.waterMeter) || 0,
      electricityMeterImage: formData.electricityMeterImage,
      waterMeterImage: formData.waterMeterImage,
      keySetsDelivered: Number(formData.keySetsDelivered) || 2,
      accessCardDelivered: Number(formData.accessCardDelivered) || 1,
      damages: formData.damages || [],
      depositAmount: Number(formData.depositTotal) || 0,
      depositTotal: Number(formData.depositTotal) || 0,
      depositReturnStatus: (formData as any).depositReturnStatus || 'Pending',
      depositDeductions: Number(formData.depositDeductions) || 0,
      depositRefunded: Number(formData.depositRefunded) || 0,
      depositStatus: formData.depositStatus || 'Full Refund',
      checklist: formData.checklist || [],
      photos: formData.photos || [],
      status: formData.status || 'Completed',
      inspectorName: formData.inspectorName || currentUser.name,
      recipientName: formData.recipientName || 'Tenant',
      notes: formData.notes,
      createdAt: editingRecord ? editingRecord.createdAt : new Date().toISOString(),
    };

    onSaveRecord(toSave);
    setEditModalOpen(false);
  };

  const formatTHB = (n?: number) => {
    if (n === undefined || n === null) return '-';
    return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(n);
  };

  return (
    <div className="space-y-5 w-full pb-10">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-red-600" />
            <h2 className="text-xl font-bold font-serif text-slate-900 tracking-wide">
              {t.navCheckInOut}
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {language === 'th'
              ? `ตรวจรับห้องและส่งมอบห้อง พร้อมจดมิเตอร์น้ำ-ไฟ ตรวจสอบเฟอร์นิเจอร์ และสรุปเงินมัดจำ`
              : `Handover inspection, utility meter readings, damage logs & deposit settlement`}
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-red-700 via-red-600 to-rose-600 hover:from-red-600 text-white text-xs font-semibold shadow-md active:scale-95 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{language === 'th' ? '+ สร้างบันทึกตรวจห้อง' : '+ New Handover'}</span>
        </button>
      </div>

      {/* Filter Tabs & Search */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Toggle Pills: All, Check-in, Check-out */}
        <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200 self-start">
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              typeFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            {language === 'th' ? 'ทั้งหมด' : 'All'}
          </button>
          <button
            onClick={() => setTypeFilter('Check-in')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              typeFilter === 'Check-in' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Check-in (ส่งมอบ)</span>
          </button>
          <button
            onClick={() => setTypeFilter('Check-out')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              typeFilter === 'Check-out' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <LogOutIcon className="w-3.5 h-3.5" />
            <span>Check-out (คืนห้อง)</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={language === 'th' ? 'ค้นหาเลขที่ตรวจ, ทรัพย์, ผู้เช่า...' : 'Search record, property, tenant...'}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-red-500/20"
          />
        </div>
      </div>

      {/* Handover Records List Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredRecords.map((r) => (
          <div
            key={r.id}
            className="rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:shadow-md transition-all p-5 flex flex-col justify-between"
          >
            <div>
              {/* Header */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                    r.type === 'Check-in' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
                  }`}>
                    {r.type}
                  </span>
                  <span className="font-mono text-xs font-bold text-slate-600">{r.recordNumber}</span>
                </div>
                <span className="text-[11px] text-slate-500 font-mono">
                  {new Date(r.date).toLocaleString()}
                </span>
              </div>

              {/* Property & Tenant */}
              <h3 className="font-bold text-sm text-slate-900 line-clamp-1 mt-1">
                {r.propertyTitle}
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Tenant: <strong className="text-slate-800">{r.tenantName}</strong> ({r.tenantPhone})
              </p>

              {/* Utility Meters Readings */}
              <div className="grid grid-cols-2 gap-2.5 my-3 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">มิเตอร์ไฟฟ้า (Elec)</span>
                    <span className="font-mono font-bold text-slate-900">{r.electricityMeter} หน่วย</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600">
                    <Droplets className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">มิเตอร์ประปา (Water)</span>
                    <span className="font-mono font-bold text-slate-900">{r.waterMeter} หน่วย</span>
                  </div>
                </div>
              </div>

              {/* Key Deliverables & Damage status */}
              <div className="space-y-1 text-xs text-slate-600">
                <div className="flex items-center justify-between">
                  <span>กุญแจ / คีย์การ์ด:</span>
                  <span className="font-semibold text-slate-800">
                    {r.keySetsDelivered} ชุด / {r.accessCardDelivered} ใบ
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span>รายการชำรุด / เสียหาย:</span>
                  <span className={`font-semibold ${r.damages && r.damages.length > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {r.damages && r.damages.length > 0 ? `${r.damages.length} รายการ (หัก ${formatTHB(r.depositDeductions)})` : 'ไม่มีความเสียหาย (เรียบร้อยดี)'}
                  </span>
                </div>

                {r.type === 'Check-out' && (
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                    <span>เงินมัดจำคืนผู้เช่า:</span>
                    <span className="font-bold text-emerald-700">
                      {formatTHB(r.depositRefunded)} ({r.depositStatus})
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions Bar */}
            <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between">
              <div className="text-[10px] text-slate-400">
                <span>Inspector: {r.inspectorName}</span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setDetailModalRecord(r)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
                >
                  {language === 'th' ? 'ดูรายงานฉบับเต็ม' : 'Full Report'}
                </button>
                <button
                  onClick={() => handleOpenEdit(r)}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700"
                  title={t.edit}
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    if (confirm(`${t.confirmDeleteDesc} (${r.recordNumber})`)) {
                      onDeleteRecord(r.id);
                    }
                  }}
                  className="p-1.5 rounded-lg border border-red-200 hover:bg-red-50 text-red-600"
                  title={t.delete}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* FULL REPORT MODAL */}
      {detailModalRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl max-h-[90vh] shadow-2xl overflow-hidden my-auto flex flex-col animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-[#0A0C10] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm font-serif">
                  {detailModalRecord.type} Inspection Report #{detailModalRecord.recordNumber}
                </h3>
              </div>
              <button onClick={() => setDetailModalRecord(null)} className="p-1 rounded-full text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <h4 className="font-bold text-slate-900 text-sm">{detailModalRecord.propertyTitle}</h4>
                <p className="text-slate-600 mt-0.5">Tenant: {detailModalRecord.tenantName} ({detailModalRecord.tenantPhone})</p>
                <p className="text-slate-400 text-[11px]">Inspection Date: {new Date(detailModalRecord.date).toLocaleString()}</p>
              </div>

              {/* Utility Meters with Photos */}
              <div>
                <h4 className="font-bold text-slate-800 text-xs mb-2">Meter Readings & Evidence</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl border border-slate-200 bg-white">
                    <span className="text-[10px] text-slate-500 font-bold block">ELECTRICITY METER</span>
                    <span className="text-base font-mono font-bold text-amber-600 block mt-0.5">{detailModalRecord.electricityMeter} kWh</span>
                    {detailModalRecord.electricityMeterImage && (
                      <img src={detailModalRecord.electricityMeterImage} alt="Elec Meter" className="w-full h-24 object-cover rounded-lg mt-2" />
                    )}
                  </div>
                  <div className="p-3 rounded-xl border border-slate-200 bg-white">
                    <span className="text-[10px] text-slate-500 font-bold block">WATER METER</span>
                    <span className="text-base font-mono font-bold text-blue-600 block mt-0.5">{detailModalRecord.waterMeter} m³</span>
                    {detailModalRecord.waterMeterImage && (
                      <img src={detailModalRecord.waterMeterImage} alt="Water Meter" className="w-full h-24 object-cover rounded-lg mt-2" />
                    )}
                  </div>
                </div>
              </div>

              {/* Damages List */}
              {detailModalRecord.damages && detailModalRecord.damages.length > 0 && (
                <div>
                  <h4 className="font-bold text-rose-700 text-xs mb-2">Itemized Damages / Defects</h4>
                  <div className="space-y-1.5">
                    {detailModalRecord.damages.map((dmg) => (
                      <div key={dmg.id} className="p-2.5 rounded-xl border border-rose-200 bg-rose-50/50 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-slate-800">{dmg.item} <span className="font-normal text-slate-500">({dmg.area})</span></p>
                          <p className="text-[11px] text-slate-600">{dmg.description}</p>
                        </div>
                        <span className="font-bold text-rose-700 font-mono">
                          {formatTHB(dmg.estimatedCost)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Deposit Settlement */}
              <div className="p-3.5 rounded-xl bg-slate-900 text-white space-y-1.5">
                <h4 className="font-bold text-amber-400 text-xs">Security Deposit Settlement</h4>
                <div className="flex justify-between text-xs text-slate-300">
                  <span>Initial Deposit Collected:</span>
                  <span className="font-mono font-bold text-white">{formatTHB(detailModalRecord.depositTotal)}</span>
                </div>
                <div className="flex justify-between text-xs text-rose-400">
                  <span>Damage Deductions:</span>
                  <span className="font-mono font-bold">- {formatTHB(detailModalRecord.depositDeductions)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-emerald-400 pt-1 border-t border-slate-800">
                  <span>Refunded to Tenant:</span>
                  <span className="font-mono">{formatTHB(detailModalRecord.depositRefunded)}</span>
                </div>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-200 text-center">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-400 block">INSPECTED BY (PEAK AGENT)</span>
                  <p className="font-serif italic font-bold text-slate-800 text-sm mt-2">{detailModalRecord.inspectorName}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-400 block">RECEIVED & AGREED BY (TENANT)</span>
                  <p className="font-serif italic font-bold text-slate-800 text-sm mt-2">{detailModalRecord.recipientName}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT HANDOVER MODAL */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl max-h-[90vh] shadow-2xl overflow-hidden my-auto flex flex-col animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-[#0A0C10] text-white flex items-center justify-between shrink-0">
              <h3 className="font-bold text-sm font-serif">
                {editingRecord ? 'Edit Handover Inspection' : 'Create New Check-in / Check-out Record'}
              </h3>
              <button onClick={() => setEditModalOpen(false)} className="p-1 rounded-full text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Record Code *</label>
                  <input
                    type="text"
                    required
                    value={formData.recordNumber || ''}
                    onChange={(e) => setFormData({ ...formData, recordNumber: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Handover Type *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as CheckInOutType })}
                    className="w-full px-3 py-2 border rounded-xl"
                  >
                    <option value="Check-in">Check-in (ส่งมอบห้อง)</option>
                    <option value="Check-out">Check-out (รับคืนห้อง)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.date || ''}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Property *</label>
                <select
                  value={formData.propertyId}
                  onChange={(e) => {
                    const sel = properties.find((p) => p.id === e.target.value);
                    setFormData({
                      ...formData,
                      propertyId: e.target.value,
                      propertyCustomId: sel?.propertyId || '',
                      propertyTitle: sel?.title || '',
                    });
                  }}
                  className="w-full px-3 py-2 border rounded-xl"
                >
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>[{p.propertyId}] {p.title}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tenant Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.tenantName || ''}
                    onChange={(e) => setFormData({ ...formData, tenantName: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl bg-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tenant Phone</label>
                  <input
                    type="text"
                    value={formData.tenantPhone || ''}
                    onChange={(e) => setFormData({ ...formData, tenantPhone: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-amber-50/40 rounded-xl border border-amber-200">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Electricity Meter (kWh) *</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={formData.electricityMeter ?? ''}
                    onChange={(e) => setFormData({ ...formData, electricityMeter: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-xl bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Water Meter (m³) *</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={formData.waterMeter ?? ''}
                    onChange={(e) => setFormData({ ...formData, waterMeter: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-xl bg-white font-mono"
                  />
                </div>
              </div>

              {/* Damage Add section */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="font-bold text-slate-800 block text-xs">Report Damaged Item / Defect</span>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="Item (e.g. Broken AC remote)"
                    value={tempDamageItem.item}
                    onChange={(e) => setTempDamageItem({ ...tempDamageItem, item: e.target.value })}
                    className="px-2 py-1.5 border rounded-lg bg-white"
                  />
                  <input
                    type="number"
                    placeholder="Cost (THB)"
                    value={tempDamageItem.cost || ''}
                    onChange={(e) => setTempDamageItem({ ...tempDamageItem, cost: Number(e.target.value) })}
                    className="px-2 py-1.5 border rounded-lg bg-white"
                  />
                  <button
                    type="button"
                    onClick={handleAddDamage}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 text-white font-semibold hover:bg-slate-700"
                  >
                    + Add Item
                  </button>
                </div>
                {/* Damages list */}
                {(formData.damages || []).map((dmg) => (
                  <div key={dmg.id} className="flex items-center justify-between text-xs p-2 bg-white rounded border">
                    <span>{dmg.item} ({formatTHB(dmg.estimatedCost)})</span>
                    <button type="button" onClick={() => handleRemoveDamage(dmg.id)} className="text-red-500 font-bold">✕</button>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Total Deposit</label>
                  <input
                    type="number"
                    value={formData.depositTotal ?? ''}
                    onChange={(e) => setFormData({ ...formData, depositTotal: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Deductions</label>
                  <input
                    type="number"
                    value={formData.depositDeductions ?? ''}
                    onChange={(e) => setFormData({ ...formData, depositDeductions: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-xl font-mono text-red-600"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Refund Amount</label>
                  <input
                    type="number"
                    value={formData.depositRefunded ?? ''}
                    onChange={(e) => setFormData({ ...formData, depositRefunded: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-xl font-mono text-emerald-600"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold"
                >
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
