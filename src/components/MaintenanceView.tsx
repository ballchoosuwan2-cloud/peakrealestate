import React, { useState, useMemo } from 'react';
import { MaintenanceIssue, IssuePriority, IssueStatus, Property, User } from '../types';
import { translations, Language } from '../lib/i18n';
import {
  Wrench,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  Clock,
  CheckCircle2,
  DollarSign,
  User as UserIcon,
  Building2,
  Image as ImageIcon,
  Edit2,
  Trash2,
  X,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';

interface MaintenanceViewProps {
  issues: MaintenanceIssue[];
  properties: Property[];
  users: User[];
  currentUser: User;
  language: Language;
  onSaveIssue: (issue: MaintenanceIssue) => void;
  onDeleteIssue: (id: string) => void;
}

export function MaintenanceView({
  issues,
  properties,
  users,
  currentUser,
  language,
  onSaveIssue,
  onDeleteIssue,
}: MaintenanceViewProps) {
  const t = translations[language];

  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingIssue, setEditingIssue] = useState<MaintenanceIssue | null>(null);

  const priorities: IssuePriority[] = ['Low', 'Medium', 'High', 'Urgent'];
  const statuses: IssueStatus[] = ['New', 'In Progress', 'Waiting Parts', 'Resolved', 'Closed'];

  const initialForm: Partial<MaintenanceIssue> = {
    ticketNumber: `TKT-${Math.floor(100 + Math.random() * 900)}`,
    propertyId: properties[0]?.id || '',
    propertyCustomId: properties[0]?.propertyId || '',
    propertyTitle: properties[0]?.title || '',
    title: '',
    category: 'Air Conditioning',
    priority: 'High',
    status: 'New',
    reportedBy: 'Tenant',
    assignedVendor: 'Phuket Cool Air Services',
    vendorPhone: '089-111-2233',
    estimatedCost: 3500,
    paidBy: 'Owner',
    images: ['https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=600&q=80'],
    description: '',
  };

  const [formData, setFormData] = useState<Partial<MaintenanceIssue>>(initialForm);

  const filteredIssues = useMemo(() => {
    return issues.filter((i) => {
      const q = (searchQuery || '').toLowerCase();
      const matchSearch =
        (i.title && i.title.toLowerCase().includes(q)) ||
        (i.ticketNumber && i.ticketNumber.toLowerCase().includes(q)) ||
        (i.propertyTitle && i.propertyTitle.toLowerCase().includes(q)) ||
        (i.assignedVendor && i.assignedVendor.toLowerCase().includes(q));

      const matchPriority = priorityFilter === 'all' || i.priority === priorityFilter;
      const matchStatus = statusFilter === 'all' || i.status === statusFilter;

      return matchSearch && matchPriority && matchStatus;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [issues, searchQuery, priorityFilter, statusFilter]);

  const handleOpenAdd = () => {
    setEditingIssue(null);
    setFormData({
      ...initialForm,
      ticketNumber: `TKT-${Math.floor(100 + Math.random() * 900)}`,
    });
    setEditModalOpen(true);
  };

  const handleOpenEdit = (issue: MaintenanceIssue) => {
    setEditingIssue(issue);
    setFormData({ ...issue });
    setEditModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selProp = properties.find((p) => p.id === formData.propertyId);

    const toSave: MaintenanceIssue = {
      id: editingIssue ? editingIssue.id : `iss-${Date.now()}`,
      issueCode: formData.ticketNumber || formData.issueCode || `TKT-${Math.floor(100 + Math.random() * 900)}`,
      ticketNumber: formData.ticketNumber || formData.issueCode || `TKT-${Math.floor(100 + Math.random() * 900)}`,
      propertyId: selProp?.id || formData.propertyId || '',
      propertyCustomId: selProp?.propertyId || formData.propertyCustomId || '',
      propertyTitle: selProp?.title || formData.propertyTitle || '',
      title: formData.title || 'Maintenance Request',
      category: formData.category || 'General',
      priority: (formData.priority as IssuePriority) || 'Medium',
      status: (formData.status as IssueStatus) || 'New',
      reportedBy: formData.reportedBy || 'Tenant',
      reporterPhone: (formData as any).reporterPhone || '081-000-0000',
      assignedToId: (formData as any).assignedToId || currentUser.id,
      assignedToName: formData.assignedVendor || (formData as any).assignedToName || currentUser.name,
      assignedVendor: formData.assignedVendor,
      vendorPhone: formData.vendorPhone,
      estimatedCost: Number(formData.estimatedCost) || 0,
      actualCost: formData.actualCost ? Number(formData.actualCost) : undefined,
      cost: Number(formData.actualCost || formData.estimatedCost || 0),
      paidBy: (formData.paidBy as any) || 'Owner',
      photos: formData.images || (formData as any).photos || [],
      images: formData.images || (formData as any).photos || [],
      resolutionHistory: (formData as any).resolutionHistory || [],
      description: formData.description || '',
      createdAt: editingIssue ? editingIssue.createdAt : new Date().toISOString(),
      resolvedAt: formData.status === 'Resolved' || formData.status === 'Closed' ? new Date().toISOString() : undefined,
    };

    onSaveIssue(toSave);
    setEditModalOpen(false);
  };

  const priorityBadge = (p: IssuePriority) => {
    switch (p) {
      case 'Urgent': return 'bg-red-50 text-red-700 border-red-200 animate-pulse font-bold';
      case 'High': return 'bg-amber-50 text-amber-700 border-amber-200 font-semibold';
      case 'Medium': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Low': return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const statusBadge = (s: IssueStatus) => {
    switch (s) {
      case 'New': return 'bg-red-50 text-red-700 border-red-200';
      case 'In Progress': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Waiting Parts': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Resolved': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Closed': return 'bg-slate-100 text-slate-500 border-slate-200';
    }
  };

  const formatTHB = (n?: number) => {
    if (!n) return '-';
    return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(n);
  };

  return (
    <div className="space-y-5 w-full pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-red-600" />
            <h2 className="text-xl font-bold font-serif text-slate-900 tracking-wide">
              {t.navMaintenance}
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {language === 'th'
              ? `ระบบแจ้งซ่อมและแก้ปัญหา ติดตามช่าง ค่าใช้จ่าย และสถานะการแก้ไข (${issues.length} รายการ)`
              : `Maintenance tickets, technician dispatching, costs and resolution tracking`}
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-red-700 via-red-600 to-rose-600 hover:from-red-600 text-white text-xs font-semibold shadow-md active:scale-95 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{t.fabAddIssue}</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-6 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={language === 'th' ? 'ค้นหาปัญหา, เลขที่ตั๋ว, ทรัพย์, ช่าง...' : 'Search issue, ticket #, property, vendor...'}
              className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/30 text-slate-900"
            />
          </div>

          <div className="sm:col-span-3">
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-xs focus:bg-white focus:outline-none"
            >
              <option value="all">{language === 'th' ? 'ทุกระดับความเร่งด่วน' : 'All Priorities'}</option>
              {priorities.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-xs focus:bg-white focus:outline-none"
            >
              <option value="all">{language === 'th' ? 'ทุกสถานะตั๋วซ่อม' : 'All Ticket Statuses'}</option>
              {statuses.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tickets List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredIssues.map((issue) => (
          <div
            key={issue.id}
            className="rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:shadow-md transition-all p-4.5 flex flex-col justify-between"
          >
            <div>
              {/* Header: Ticket Number, Priority and Status */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="font-mono text-xs font-bold text-slate-600">
                  {issue.ticketNumber}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] border ${priorityBadge(issue.priority)}`}>
                    {issue.priority}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusBadge(issue.status)}`}>
                    {issue.status}
                  </span>
                </div>
              </div>

              {/* Title & Category */}
              <h3 className="font-bold text-sm text-slate-900 line-clamp-1">
                {issue.title}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                หมวดหมู่: <strong className="text-slate-700">{issue.category}</strong>
              </p>

              {/* Property Details */}
              <div className="my-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                <p className="font-semibold text-slate-800 line-clamp-1">{issue.propertyTitle}</p>
                <span className="font-mono text-[10px] text-slate-400">{issue.propertyCustomId}</span>
              </div>

              {/* Description */}
              <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                {issue.description}
              </p>

              {/* Vendor & Cost */}
              <div className="mt-3 pt-2.5 border-t border-slate-100 text-xs space-y-1">
                <div className="flex items-center justify-between text-slate-600">
                  <span>ผู้รับเหมา/ช่าง:</span>
                  <span className="font-semibold text-slate-800 truncate max-w-[140px]">{issue.assignedVendor || '-'}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>ค่าใช้จ่ายประเมิน:</span>
                  <span className="font-bold text-red-700">{formatTHB(issue.estimatedCost)} ({issue.paidBy})</span>
                </div>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="pt-3.5 mt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-mono">
                {new Date(issue.createdAt).toLocaleDateString()}
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleOpenEdit(issue)}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700"
                  title={t.edit}
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    if (confirm(`${t.confirmDeleteDesc} (${issue.ticketNumber})`)) {
                      onDeleteIssue(issue.id);
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

      {/* CREATE / EDIT ISSUE MODAL */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl max-h-[90vh] shadow-2xl overflow-hidden my-auto flex flex-col animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-[#0A0C10] text-white flex items-center justify-between shrink-0">
              <h3 className="font-bold text-sm font-serif">
                {editingIssue ? 'Edit Maintenance Ticket' : 'Report New Maintenance Issue / Fix'}
              </h3>
              <button onClick={() => setEditModalOpen(false)} className="p-1 rounded-full text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ticket Number *</label>
                  <input
                    type="text"
                    required
                    value={formData.ticketNumber || ''}
                    onChange={(e) => setFormData({ ...formData, ticketNumber: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Priority (ความเร่งด่วน)</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as IssuePriority })}
                    className="w-full px-3 py-2 border rounded-xl"
                  >
                    {priorities.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ticket Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as IssueStatus })}
                    className="w-full px-3 py-2 border rounded-xl"
                  >
                    {statuses.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Property (ทรัพย์ที่มีปัญหา) *</label>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Issue Title *</label>
                  <input
                    type="text"
                    required
                    value={formData.title || ''}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Master Bedroom Air Conditioner Not Cooling"
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category</label>
                  <input
                    type="text"
                    value={formData.category || ''}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="Air Conditioning, Plumbing, Electric, Pool..."
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Assigned Vendor / Tech</label>
                  <input
                    type="text"
                    value={formData.assignedVendor || ''}
                    onChange={(e) => setFormData({ ...formData, assignedVendor: e.target.value })}
                    placeholder="Vendor company or technician name"
                    className="w-full px-3 py-2 border rounded-xl bg-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Vendor Contact Phone</label>
                  <input
                    type="text"
                    value={formData.vendorPhone || ''}
                    onChange={(e) => setFormData({ ...formData, vendorPhone: e.target.value })}
                    placeholder="089-xxx-xxxx"
                    className="w-full px-3 py-2 border rounded-xl bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Estimated Cost (THB)</label>
                  <input
                    type="number"
                    value={formData.estimatedCost ?? ''}
                    onChange={(e) => setFormData({ ...formData, estimatedCost: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Paid By (ผู้รับผิดชอบค่าใช้จ่าย)</label>
                  <select
                    value={formData.paidBy}
                    onChange={(e) => setFormData({ ...formData, paidBy: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-xl"
                  >
                    <option value="Owner">Owner (เจ้าของทรัพย์)</option>
                    <option value="Tenant">Tenant (ผู้เช่า)</option>
                    <option value="Agency">Agency (บริษัท/เอเจนซี่)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Issue Description & Notes</label>
                <textarea
                  rows={3}
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Details of the issue, tenant comments..."
                  className="w-full px-3 py-2 border rounded-xl"
                />
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
