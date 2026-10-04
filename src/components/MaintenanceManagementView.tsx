import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Wrench,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HardHat,
  Users,
  DollarSign,
  FileSpreadsheet,
  Download,
  Trash2,
  Edit,
  Eye,
  Check,
  ChevronRight,
  ShieldAlert,
  Building2,
  Phone,
  Mail,
  Star,
  Activity,
  ArrowUpRight,
  Sparkles,
  ChevronDown,
  Layers,
  FileText,
  AlertCircle
} from 'lucide-react';
import { User, Property, Customer } from '../types';
import { Language, translations } from '../lib/i18n';

interface VendorItem {
  id: string;
  vendorCode: string;
  name: string;
  company?: string;
  phone: string;
  email?: string;
  serviceType: string;
  rating: string;
  isActive: boolean;
  notes?: string;
}

interface MaintenanceRequestItem {
  id: string;
  ticketNumber: string;
  propertyId: string;
  propertyCustomId?: string;
  propertyTitle: string;
  customerId?: string;
  customerName?: string;
  contractId?: string;
  title: string;
  problem: string;
  solution?: string;
  category: string;
  priority: 'Low' | 'Normal' | 'High' | 'Urgent';
  status: 'Open' | 'Assigned' | 'In Progress' | 'Waiting' | 'Completed' | 'Cancelled';
  assignedAgentId?: string;
  assignedAgentName?: string;
  assignedVendorId?: string;
  assignedVendorName?: string;
  dueDate?: string;
  startDate?: string;
  completedDate?: string;
  totalCost: string;
  paidAmount: string;
  outstandingAmount: string;
  paidBy: string;
  attachments?: any[];
  notes?: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CostItem {
  id: string;
  requestId: string;
  itemType: string;
  description: string;
  amount: string;
  paidAmount: string;
  isPaid: boolean;
  paidBy: string;
  paymentMethod?: string;
  receiptUrl?: string;
}

interface PreventiveItem {
  id: string;
  code: string;
  propertyId: string;
  propertyCustomId?: string;
  propertyTitle: string;
  title: string;
  serviceType: string;
  cycleMonths: number;
  lastServiceDate?: string;
  nextDueDate: string;
  reminderDays: number;
  assignedVendorId?: string;
  assignedVendorName?: string;
  estimatedCost: string;
  status: string;
  notes?: string;
}

interface MaintenanceManagementViewProps {
  currentUser: User;
  language: Language;
  properties: Property[];
  customers: Customer[];
  users: User[];
  activeSubTab?: 'maintenance' | 'vendors' | 'preventive' | 'reports';
  onNavigate?: (tab: string, filter?: string) => void;
}

export function MaintenanceManagementView({
  currentUser,
  language,
  properties,
  customers,
  users,
  activeSubTab = 'maintenance',
  onNavigate,
}: MaintenanceManagementViewProps) {
  const t = translations[language];
  const [subTab, setSubTab] = useState<'maintenance' | 'vendors' | 'preventive' | 'reports'>(activeSubTab);

  // Sync subTab with prop
  useEffect(() => {
    if (activeSubTab) setSubTab(activeSubTab);
  }, [activeSubTab]);

  // Data states
  const [requests, setRequests] = useState<MaintenanceRequestItem[]>([]);
  const [vendors, setVendors] = useState<VendorItem[]>([]);
  const [preventiveList, setPreventiveList] = useState<PreventiveItem[]>([]);
  const [dashboardMetrics, setDashboardMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Filters for maintenance requests
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [propertyFilter, setPropertyFilter] = useState('All');
  const [showArchived, setShowArchived] = useState(false);

  // Selected item / Modals
  const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequestItem | null>(null);
  const [requestCosts, setRequestCosts] = useState<CostItem[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showCostModal, setShowCostModal] = useState(false);
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [showPreventiveModal, setShowPreventiveModal] = useState(false);

  // Form states
  const [createForm, setCreateForm] = useState({
    propertyId: '',
    customerId: '',
    title: '',
    problem: '',
    category: 'Air Conditioner',
    priority: 'Normal',
    dueDate: '',
    assignedVendorId: '',
    assignedAgentId: currentUser.id,
    paidBy: 'Owner',
    notes: '',
    laborAmount: 0,
    partsAmount: 0,
  });

  const [vendorForm, setVendorForm] = useState({
    id: '',
    name: '',
    company: '',
    phone: '',
    email: '',
    serviceType: 'Air Conditioner',
    rating: 5.0,
    notes: '',
  });

  const [preventiveForm, setPreventiveForm] = useState({
    propertyId: '',
    title: '',
    serviceType: 'Air Conditioner',
    cycleMonths: 3,
    nextDueDate: '',
    reminderDays: 7,
    assignedVendorId: '',
    estimatedCost: 3500,
    notes: '',
  });

  const [newCostForm, setNewCostForm] = useState({
    itemType: 'Labor',
    description: '',
    amount: '',
    isPaid: false,
    paidBy: 'Owner',
  });

  // Assign form
  const [assignForm, setAssignForm] = useState({
    assignedVendorId: '',
    assignedAgentId: '',
    dueDate: '',
  });

  // Headers for backend calls
  const authHeaders = useMemo(() => ({
    'Content-Type': 'application/json',
    'x-user-role': currentUser.role,
    'x-user-name': encodeURIComponent(currentUser.name),
    'x-user-id': currentUser.id,
  }), [currentUser]);

  // Fetch Requests
  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (statusFilter !== 'All') params.append('status', statusFilter);
      if (priorityFilter !== 'All') params.append('priority', priorityFilter);
      if (categoryFilter !== 'All') params.append('category', categoryFilter);
      if (propertyFilter !== 'All') params.append('propertyId', propertyFilter);
      if (showArchived) params.append('isArchived', 'true');

      const res = await fetch(`/api/maintenance/requests?${params.toString()}`, { headers: authHeaders });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setRequests(json.data);
      }
    } catch (e: any) {
      console.error('Fetch requests error:', e);
    } finally {
      setLoading(false);
    }
  }, [authHeaders, search, statusFilter, priorityFilter, categoryFilter, propertyFilter, showArchived]);

  // Fetch Vendors
  const fetchVendors = useCallback(async () => {
    try {
      const res = await fetch('/api/maintenance/vendors', { headers: authHeaders });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setVendors(json.data);
      }
    } catch (e) {
      console.error('Fetch vendors error:', e);
    }
  }, [authHeaders]);

  // Fetch Preventive Maintenance
  const fetchPreventive = useCallback(async () => {
    try {
      const res = await fetch('/api/maintenance/preventive', { headers: authHeaders });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setPreventiveList(json.data);
      }
    } catch (e) {
      console.error('Fetch preventive error:', e);
    }
  }, [authHeaders]);

  // Fetch Dashboard
  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch('/api/maintenance/dashboard', { headers: authHeaders });
      const json = await res.json();
      if (json.success && json.data) {
        setDashboardMetrics(json.data);
      }
    } catch (e) {
      console.error('Fetch dashboard error:', e);
    }
  }, [authHeaders]);

  // Reload all
  const reloadAll = useCallback(() => {
    fetchRequests();
    fetchVendors();
    fetchPreventive();
    fetchDashboard();
  }, [fetchRequests, fetchVendors, fetchPreventive, fetchDashboard]);

  useEffect(() => {
    reloadAll();
  }, [reloadAll]);

  // Notification Banner Timeout
  const triggerSuccess = (msg: string) => {
    setActionSuccess(msg);
    setActionError(null);
    setTimeout(() => setActionSuccess(null), 4000);
  };

  const triggerError = (msg: string) => {
    setActionError(msg);
    setActionSuccess(null);
    setTimeout(() => setActionError(null), 5000);
  };

  // Open Detail / Costs
  const handleOpenDetail = async (req: MaintenanceRequestItem) => {
    setSelectedRequest(req);
    try {
      const res = await fetch(`/api/maintenance/requests/${req.id}`, { headers: authHeaders });
      const json = await res.json();
      if (json.success && json.data) {
        setSelectedRequest(json.data.request);
        setRequestCosts(json.data.costs || []);
      }
    } catch (e) {
      console.error('Fetch detail error:', e);
    }
    setShowDetailModal(true);
  };

  // Create Request Action
  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.propertyId || !createForm.title.trim()) {
      triggerError('Please select a property and provide an issue title.');
      return;
    }

    try {
      const initialCosts = [];
      if (createForm.laborAmount > 0) {
        initialCosts.push({ itemType: 'Labor', description: 'Initial Labor Estimate', amount: createForm.laborAmount });
      }
      if (createForm.partsAmount > 0) {
        initialCosts.push({ itemType: 'Parts', description: 'Spare Parts Estimate', amount: createForm.partsAmount });
      }

      const res = await fetch('/api/maintenance/requests', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          ...createForm,
          initialCosts,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        triggerSuccess(`Ticket ${json.data.ticketNumber} created successfully!`);
        setShowCreateModal(false);
        setCreateForm({
          propertyId: '',
          customerId: '',
          title: '',
          problem: '',
          category: 'Air Conditioner',
          priority: 'Normal',
          dueDate: '',
          assignedVendorId: '',
          assignedAgentId: currentUser.id,
          paidBy: 'Owner',
          notes: '',
          laborAmount: 0,
          partsAmount: 0,
        });
        reloadAll();
      } else {
        triggerError(json.error || 'Failed to create maintenance ticket');
      }
    } catch (err: any) {
      triggerError(err.message || 'Network error creating ticket');
    }
  };

  // Quick Status Update
  const handleQuickStatus = async (id: string, status: string, solution?: string) => {
    try {
      const res = await fetch(`/api/maintenance/requests/${id}/status`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ status, solution }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        triggerSuccess(`Status updated to ${status}`);
        reloadAll();
        if (selectedRequest && selectedRequest.id === id) {
          setSelectedRequest(json.data);
        }
      } else {
        triggerError(json.error || 'Status update failed');
      }
    } catch (err: any) {
      triggerError(err.message);
    }
  };

  // Complete / Approve Ticket
  const handleApproveComplete = async (id: string, solutionText?: string) => {
    try {
      const res = await fetch(`/api/maintenance/requests/${id}/complete`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ solution: solutionText || 'Maintenance work inspected and approved by operations team.' }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        triggerSuccess('Maintenance ticket approved & completed!');
        reloadAll();
        if (selectedRequest && selectedRequest.id === id) {
          setSelectedRequest(json.data);
        }
      } else {
        triggerError(json.error || 'Approval failed');
      }
    } catch (err: any) {
      triggerError(err.message);
    }
  };

  // Assign Vendor/Agent
  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;
    try {
      const res = await fetch(`/api/maintenance/requests/${selectedRequest.id}/assign`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify(assignForm),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        triggerSuccess('Assignment updated successfully!');
        setShowAssignModal(false);
        reloadAll();
      } else {
        triggerError(json.error || 'Failed to assign ticket');
      }
    } catch (err: any) {
      triggerError(err.message);
    }
  };

  // Add Cost Item
  const handleAddCost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest || !newCostForm.description || !newCostForm.amount) return;
    try {
      const res = await fetch(`/api/maintenance/requests/${selectedRequest.id}/costs`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(newCostForm),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        triggerSuccess('Cost item recorded successfully!');
        setNewCostForm({ itemType: 'Labor', description: '', amount: '', isPaid: false, paidBy: 'Owner' });
        // Refresh detail
        handleOpenDetail(selectedRequest);
        reloadAll();
      } else {
        triggerError(json.error || 'Failed to add cost');
      }
    } catch (err: any) {
      triggerError(err.message);
    }
  };

  // Delete Cost Item
  const handleDeleteCost = async (costId: string) => {
    if (!selectedRequest) return;
    try {
      const res = await fetch(`/api/maintenance/costs/${costId}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      const json = await res.json();
      if (res.ok && json.success) {
        triggerSuccess('Cost item deleted');
        handleOpenDetail(selectedRequest);
        reloadAll();
      } else {
        triggerError(json.error || 'Failed to delete cost');
      }
    } catch (err: any) {
      triggerError(err.message);
    }
  };

  // Soft Delete Request
  const handleDeleteRequest = async (id: string) => {
    if (!confirm('Are you sure you want to archive this maintenance ticket? (Soft delete)')) return;
    try {
      const res = await fetch(`/api/maintenance/requests/${id}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      const json = await res.json();
      if (res.ok && json.success) {
        triggerSuccess('Ticket archived successfully (soft deleted)');
        reloadAll();
        if (showDetailModal) setShowDetailModal(false);
      } else {
        triggerError(json.error || 'Failed to archive ticket');
      }
    } catch (err: any) {
      triggerError(err.message);
    }
  };

  // Restore Request
  const handleRestoreRequest = async (id: string) => {
    try {
      const res = await fetch(`/api/maintenance/requests/${id}/restore`, {
        method: 'POST',
        headers: authHeaders,
      });
      const json = await res.json();
      if (res.ok && json.success) {
        triggerSuccess('Ticket restored successfully!');
        reloadAll();
      } else {
        triggerError(json.error || 'Failed to restore ticket');
      }
    } catch (err: any) {
      triggerError(err.message);
    }
  };

  // Vendor Create / Edit
  const handleSaveVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorForm.name || !vendorForm.phone) {
      triggerError('Name and phone number are required for vendor.');
      return;
    }
    try {
      const isEdit = Boolean(vendorForm.id);
      const url = isEdit ? `/api/maintenance/vendors/${vendorForm.id}` : '/api/maintenance/vendors';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: authHeaders,
        body: JSON.stringify(vendorForm),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        triggerSuccess(`Vendor ${vendorForm.name} ${isEdit ? 'updated' : 'created'}!`);
        setShowVendorModal(false);
        setVendorForm({ id: '', name: '', company: '', phone: '', email: '', serviceType: 'Air Conditioner', rating: 5.0, notes: '' });
        fetchVendors();
      } else {
        triggerError(json.error || 'Vendor save failed');
      }
    } catch (err: any) {
      triggerError(err.message);
    }
  };

  // Toggle Vendor Active
  const handleToggleVendor = async (id: string) => {
    try {
      const res = await fetch(`/api/maintenance/vendors/${id}/status`, {
        method: 'PATCH',
        headers: authHeaders,
      });
      const json = await res.json();
      if (res.ok && json.success) {
        triggerSuccess('Vendor status updated');
        fetchVendors();
      } else {
        triggerError(json.error || 'Toggle failed');
      }
    } catch (err: any) {
      triggerError(err.message);
    }
  };

  // Save Preventive Maintenance
  const handleSavePreventive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preventiveForm.propertyId || !preventiveForm.title || !preventiveForm.nextDueDate) {
      triggerError('Property, title, and next due date are required.');
      return;
    }
    try {
      const res = await fetch('/api/maintenance/preventive', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(preventiveForm),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        triggerSuccess(`Preventive schedule ${json.data.code} created!`);
        setShowPreventiveModal(false);
        setPreventiveForm({
          propertyId: '',
          title: '',
          serviceType: 'Air Conditioner',
          cycleMonths: 3,
          nextDueDate: '',
          reminderDays: 7,
          assignedVendorId: '',
          estimatedCost: 3500,
          notes: '',
        });
        fetchPreventive();
        fetchDashboard();
      } else {
        triggerError(json.error || 'Failed to create schedule');
      }
    } catch (err: any) {
      triggerError(err.message);
    }
  };

  // Execute / Mark Preventive Done
  const handleExecutePreventive = async (id: string) => {
    try {
      const res = await fetch(`/api/maintenance/preventive/${id}/execute`, {
        method: 'POST',
        headers: authHeaders,
      });
      const json = await res.json();
      if (res.ok && json.success) {
        triggerSuccess('Service recorded and next schedule updated forward automatically!');
        reloadAll();
      } else {
        triggerError(json.error || 'Execution failed');
      }
    } catch (err: any) {
      triggerError(err.message);
    }
  };

  // Export CSV
  const handleExportCsv = async () => {
    try {
      const res = await fetch('/api/maintenance/export', { headers: authHeaders });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        triggerError(errJson.error || 'Export failed: Access Denied (403)');
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `maintenance-records-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      triggerSuccess('CSV report downloaded successfully!');
    } catch (err: any) {
      triggerError(err.message);
    }
  };

  // Priority Badge Color Helper
  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'Urgent':
        return 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse font-semibold';
      case 'High':
        return 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
      case 'Normal':
        return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
      default:
        return 'bg-slate-700/50 text-slate-400 border border-slate-700';
    }
  };

  // Status Badge Color Helper
  const getStatusBadge = (s: string) => {
    switch (s) {
      case 'Completed':
        return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
      case 'In Progress':
        return 'bg-sky-500/20 text-sky-400 border border-sky-500/30';
      case 'Assigned':
        return 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30';
      case 'Waiting':
        return 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
      case 'Cancelled':
        return 'bg-slate-700/40 text-slate-500 border border-slate-700';
      default:
        return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0A0C10] p-6 rounded-2xl border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-600/30 via-slate-900 to-black border border-red-500/30 flex items-center justify-center text-red-500 shadow-inner">
            <Wrench className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-white font-serif">
                Operations & Maintenance
              </h1>
              <span className="text-[11px] font-semibold uppercase tracking-wider bg-red-600/20 text-red-400 px-2.5 py-0.5 rounded-full border border-red-500/30">
                PostgreSQL • RBAC Ready
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              ระบบแจ้งซ่อม งานช่าง ผู้ให้บริการ และบำรุงรักษาเชิงป้องกันสำหรับวิลล่าและคอนโดมิเนียม
            </p>
          </div>
        </div>

        {/* Global Action CTAs */}
        <div className="flex items-center gap-3 relative z-10 flex-wrap">
          <button
            onClick={reloadAll}
            className="p-2.5 rounded-xl bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800 transition"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-red-500' : ''}`} />
          </button>

          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-slate-200 hover:bg-slate-800 border border-slate-700/80 text-xs font-semibold shadow-sm transition"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white text-xs font-semibold shadow-lg shadow-red-950/40 transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>New Ticket (แจ้งซ่อมใหม่)</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 text-xs flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-400 hover:text-white">✕</button>
        </div>
      )}

      {actionError && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-red-200 text-xs flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-red-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Navigation Sub-Tabs matching Sidebar */}
      <div className="flex items-center border-b border-slate-800 bg-[#0A0C10]/80 backdrop-blur rounded-xl px-2 py-1 gap-1">
        <button
          onClick={() => setSubTab('maintenance')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition ${
            subTab === 'maintenance'
              ? 'bg-red-600/90 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Wrench className="w-4 h-4" />
          <span>Maintenance Tickets ({requests.length})</span>
        </button>

        <button
          onClick={() => setSubTab('vendors')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition ${
            subTab === 'vendors'
              ? 'bg-red-600/90 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <HardHat className="w-4 h-4" />
          <span>Vendors / Technicians ({vendors.length})</span>
        </button>

        <button
          onClick={() => setSubTab('preventive')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition ${
            subTab === 'preventive'
              ? 'bg-red-600/90 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Preventive Maintenance ({preventiveList.length})</span>
        </button>

        <button
          onClick={() => setSubTab('reports')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition ${
            subTab === 'reports'
              ? 'bg-red-600/90 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Operations & Reports</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1. MAINTENANCE TICKETS TAB */}
      {/* ========================================================================= */}
      {subTab === 'maintenance' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-[#0A0C10] p-4 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-[280px]">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="ค้นหา Ticket #, ปัญหา, วิลล่า, ลูกค้า หรือช่าง..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-600"
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-red-600"
              >
                <option value="All">All Status (ทุกสถานะ)</option>
                <option value="Open">Open (เปิดใหม่)</option>
                <option value="Assigned">Assigned (มอบหมายแล้ว)</option>
                <option value="In Progress">In Progress (กำลังดำเนินการ)</option>
                <option value="Waiting">Waiting (รออะไหล่/ตรวจงาน)</option>
                <option value="Completed">Completed (เสร็จสิ้น)</option>
                <option value="Cancelled">Cancelled (ยกเลิก)</option>
              </select>

              {/* Priority Filter */}
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-red-600"
              >
                <option value="All">All Priority (ทุกระดับ)</option>
                <option value="Urgent">🔥 Urgent (ด่วนที่สุด)</option>
                <option value="High">High (ด่วนมาก)</option>
                <option value="Normal">Normal (ปกติ)</option>
                <option value="Low">Low (ต่ำ)</option>
              </select>

              {/* Category Filter */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-red-600 hidden md:block"
              >
                <option value="All">All Categories</option>
                <option value="Air Conditioner">Air Conditioner</option>
                <option value="Pool">Swimming Pool</option>
                <option value="Electrical">Electrical</option>
                <option value="Plumbing">Plumbing</option>
                <option value="Garden">Gardening</option>
                <option value="General">General Repairs</option>
              </select>
            </div>

            {/* Archived Toggle */}
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showArchived}
                  onChange={(e) => setShowArchived(e.target.checked)}
                  className="rounded border-slate-800 bg-slate-900 text-red-600 focus:ring-0"
                />
                <span>Show Archived</span>
              </label>
            </div>
          </div>

          {/* Tickets List */}
          {requests.length === 0 ? (
            <div className="p-12 text-center bg-[#0A0C10] rounded-2xl border border-slate-800 text-slate-500">
              <Wrench className="w-10 h-10 mx-auto mb-3 text-slate-600" />
              <p className="text-sm font-medium text-slate-300">No maintenance tickets found</p>
              <p className="text-xs text-slate-500 mt-1">Try clearing search filters or create a new ticket.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {requests.map((req) => {
                const totalCostNum = Number(req.totalCost) || 0;
                const paidAmountNum = Number(req.paidAmount) || 0;
                const outstandingNum = Number(req.outstandingAmount) || 0;

                return (
                  <div
                    key={req.id}
                    className={`bg-[#0A0C10] rounded-xl border transition-all p-5 flex flex-col justify-between hover:border-slate-700 shadow-md ${
                      req.isArchived ? 'opacity-60 border-dashed border-slate-800' : 'border-slate-800/80'
                    }`}
                  >
                    <div>
                      {/* Card Header: Ticket No, Priority, Status */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="font-mono text-xs font-semibold text-slate-400">
                          {req.ticketNumber}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getPriorityBadge(req.priority)}`}>
                            {req.priority}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getStatusBadge(req.status)}`}>
                            {req.status}
                          </span>
                        </div>
                      </div>

                      {/* Title & Problem */}
                      <h3 className="text-sm font-semibold text-white line-clamp-1 mb-1">
                        {req.title}
                      </h3>
                      <p className="text-xs text-slate-400 line-clamp-2 mb-3">
                        {req.problem}
                      </p>

                      {/* Property Link */}
                      <div className="flex items-center gap-2 text-xs text-slate-300 mb-2">
                        <Building2 className="w-3.5 h-3.5 text-red-500 shrink-0" />
                        <span className="truncate font-medium">{req.propertyTitle || req.propertyCustomId || req.propertyId}</span>
                      </div>

                      {/* Customer / Tenant if linked */}
                      {req.customerName && (
                        <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                          <Users className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span className="truncate">{req.customerName}</span>
                        </div>
                      )}

                      {/* Vendor & Agent Assignment */}
                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-900/80">
                        <div className="flex items-center gap-1.5 truncate">
                          <HardHat className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span className="truncate">{req.assignedVendorName || 'No Vendor Assigned'}</span>
                        </div>
                        {req.dueDate && (
                          <div className="flex items-center gap-1 text-slate-400">
                            <Clock className="w-3 h-3 text-slate-500" />
                            <span>Due: {req.dueDate}</span>
                          </div>
                        )}
                      </div>

                      {/* Cost Summary */}
                      <div className="mt-3 p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/60 flex items-center justify-between text-xs">
                        <div className="text-slate-400">
                          Total Cost: <span className="font-semibold text-slate-200">฿{totalCostNum.toLocaleString()}</span>
                        </div>
                        <div className="text-[11px]">
                          {outstandingNum > 0 ? (
                            <span className="text-amber-400 font-medium">Pending ฿{outstandingNum.toLocaleString()}</span>
                          ) : totalCostNum > 0 ? (
                            <span className="text-emerald-400 font-medium">Fully Paid</span>
                          ) : (
                            <span className="text-slate-500">No Cost</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-800/80 gap-2">
                      <button
                        onClick={() => handleOpenDetail(req)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Manage & Costs</span>
                      </button>

                      <button
                        onClick={() => {
                          setSelectedRequest(req);
                          setAssignForm({
                            assignedVendorId: req.assignedVendorId || '',
                            assignedAgentId: req.assignedAgentId || '',
                            dueDate: req.dueDate || '',
                          });
                          setShowAssignModal(true);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs text-amber-400 font-medium transition"
                        title="Assign Vendor/Agent"
                      >
                        Assign
                      </button>

                      {req.isArchived ? (
                        <button
                          onClick={() => handleRestoreRequest(req.id)}
                          className="px-2 py-1.5 rounded-lg bg-emerald-950/40 text-emerald-400 hover:bg-emerald-900/50 text-xs font-medium transition"
                          title="Restore Ticket"
                        >
                          Restore
                        </button>
                      ) : (
                        <button
                          onClick={() => handleDeleteRequest(req.id)}
                          className="px-2 py-1.5 rounded-lg bg-slate-900 text-slate-500 hover:text-red-400 hover:bg-red-950/30 text-xs transition"
                          title="Archive (Soft Delete)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. VENDORS & TECHNICIANS TAB */}
      {/* ========================================================================= */}
      {subTab === 'vendors' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-[#0A0C10] p-4 rounded-xl border border-slate-800">
            <div>
              <h2 className="text-sm font-semibold text-white">Vendors & Technicians Directory</h2>
              <p className="text-xs text-slate-400">ผู้รับเหมา ช่างเทคนิค และบริษัทคู่สัญญาซ่อมบำรุง</p>
            </div>
            <button
              onClick={() => {
                setVendorForm({ id: '', name: '', company: '', phone: '', email: '', serviceType: 'Air Conditioner', rating: 5.0, notes: '' });
                setShowVendorModal(true);
              }}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-red-700 text-white text-xs font-semibold shadow transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add Vendor (เพิ่มช่างใหม่)</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {vendors.map((vnd) => (
              <div
                key={vnd.id}
                className="bg-[#0A0C10] p-5 rounded-xl border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs text-slate-500">{vnd.vendorCode}</span>
                    <span className="flex items-center gap-1 text-xs font-semibold text-amber-400">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>{vnd.rating}</span>
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white mb-0.5">{vnd.name}</h3>
                  {vnd.company && <p className="text-xs text-slate-400 mb-3">{vnd.company}</p>}

                  <div className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-600/20 text-red-400 border border-red-500/30 mb-3">
                    {vnd.serviceType}
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-300">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-500" />
                      <span>{vnd.phone}</span>
                    </div>
                    {vnd.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-slate-500" />
                        <span className="truncate">{vnd.email}</span>
                      </div>
                    )}
                  </div>

                  {vnd.notes && (
                    <p className="text-[11px] text-slate-400 mt-3 p-2 rounded bg-slate-900/60 border border-slate-800/60">
                      {vnd.notes}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-800">
                  <button
                    onClick={() => handleToggleVendor(vnd.id)}
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                      vnd.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {vnd.isActive ? 'Active' : 'Inactive'}
                  </button>

                  <button
                    onClick={() => {
                      setVendorForm({
                        id: vnd.id,
                        name: vnd.name,
                        company: vnd.company || '',
                        phone: vnd.phone,
                        email: vnd.email || '',
                        serviceType: vnd.serviceType,
                        rating: Number(vnd.rating) || 5.0,
                        notes: vnd.notes || '',
                      });
                      setShowVendorModal(true);
                    }}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. PREVENTIVE MAINTENANCE TAB */}
      {/* ========================================================================= */}
      {subTab === 'preventive' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-[#0A0C10] p-4 rounded-xl border border-slate-800">
            <div>
              <h2 className="text-sm font-semibold text-white">Preventive Maintenance Schedules</h2>
              <p className="text-xs text-slate-400">แผนการล้างแอร์ ดูแลสระน้ำ ตรวจระบบไฟฟ้า และดูแลสวนตามรอบ</p>
            </div>
            <button
              onClick={() => setShowPreventiveModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-red-700 text-white text-xs font-semibold shadow transition"
            >
              <Plus className="w-4 h-4" />
              <span>New Schedule (ตั้งรอบบำรุงรักษา)</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {preventiveList.map((pm) => {
              const isOverdue = pm.nextDueDate < new Date().toISOString().split('T')[0];

              return (
                <div
                  key={pm.id}
                  className={`bg-[#0A0C10] p-5 rounded-xl border flex flex-col justify-between transition ${
                    isOverdue ? 'border-red-600/50 bg-red-950/10' : 'border-slate-800'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-xs font-bold text-slate-400">{pm.code}</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                        Every {pm.cycleMonths} Months
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-white mb-1">{pm.title}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-3">
                      <Building2 className="w-3.5 h-3.5 text-red-500 shrink-0" />
                      <span className="truncate">{pm.propertyTitle || pm.propertyCustomId || pm.propertyId}</span>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800/80 space-y-1.5 text-xs text-slate-300 mb-3">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Service:</span>
                        <span className="font-medium text-slate-200">{pm.serviceType}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Last Done:</span>
                        <span className="text-slate-400">{pm.lastServiceDate || 'Never'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Next Due:</span>
                        <span className={`font-semibold ${isOverdue ? 'text-red-400' : 'text-emerald-400'}`}>
                          {pm.nextDueDate} {isOverdue && '(Overdue)'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Est. Cost:</span>
                        <span className="font-semibold text-slate-200">฿{Number(pm.estimatedCost).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800">
                    <button
                      onClick={() => handleExecutePreventive(pm.id)}
                      className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow transition"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Execute & Advance Cycle (ตรวจเสร็จสิ้น)</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. OPERATIONS & REPORTS TAB */}
      {/* ========================================================================= */}
      {subTab === 'reports' && (
        <div className="space-y-6">
          {dashboardMetrics && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[#0A0C10] p-5 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-500 uppercase font-medium tracking-wider">Total Tickets</span>
                <div className="text-2xl font-bold text-white mt-1">{dashboardMetrics.total}</div>
                <span className="text-[11px] text-slate-400 mt-1 block">Active: {dashboardMetrics.open + dashboardMetrics.inProgress + dashboardMetrics.assigned}</span>
              </div>

              <div className="bg-[#0A0C10] p-5 rounded-xl border border-slate-800">
                <span className="text-xs text-red-400 uppercase font-medium tracking-wider">Urgent / Overdue</span>
                <div className="text-2xl font-bold text-red-500 mt-1">{dashboardMetrics.urgent + dashboardMetrics.overdue}</div>
                <span className="text-[11px] text-slate-400 mt-1 block">Urgent: {dashboardMetrics.urgent} | Overdue: {dashboardMetrics.overdue}</span>
              </div>

              <div className="bg-[#0A0C10] p-5 rounded-xl border border-slate-800">
                <span className="text-xs text-emerald-400 uppercase font-medium tracking-wider">Total Maintenance Cost</span>
                <div className="text-2xl font-bold text-emerald-400 mt-1">฿{dashboardMetrics.totalCost.toLocaleString()}</div>
                <span className="text-[11px] text-slate-400 mt-1 block">Labor: ฿{dashboardMetrics.totalLaborCost.toLocaleString()} | Parts: ฿{dashboardMetrics.totalPartsCost.toLocaleString()}</span>
              </div>

              <div className="bg-[#0A0C10] p-5 rounded-xl border border-slate-800">
                <span className="text-xs text-sky-400 uppercase font-medium tracking-wider">Avg Completion Time</span>
                <div className="text-2xl font-bold text-sky-400 mt-1">{dashboardMetrics.averageCompletionDays} Days</div>
                <span className="text-[11px] text-slate-400 mt-1 block">Completed: {dashboardMetrics.completed} tickets</span>
              </div>
            </div>
          )}

          {/* Status Breakdown & Category Breakdown */}
          {dashboardMetrics && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-[#0A0C10] p-5 rounded-xl border border-slate-800">
                <h3 className="text-sm font-semibold text-white mb-4">Tickets by Status</h3>
                <div className="space-y-3">
                  {Object.entries(dashboardMetrics.statusBreakdown || {}).map(([st, cnt]: [string, any]) => (
                    <div key={st} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">{st}</span>
                        <span className="font-semibold text-slate-200">{cnt}</span>
                      </div>
                      <div className="w-full bg-slate-900 rounded-full h-2">
                        <div
                          className="bg-red-600 h-2 rounded-full"
                          style={{ width: `${dashboardMetrics.total > 0 ? (cnt / dashboardMetrics.total) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#0A0C10] p-5 rounded-xl border border-slate-800">
                <h3 className="text-sm font-semibold text-white mb-4">Tickets by Category</h3>
                <div className="space-y-3">
                  {Object.entries(dashboardMetrics.categoryBreakdown || {}).map(([cat, cnt]: [string, any]) => (
                    <div key={cat} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">{cat}</span>
                        <span className="font-semibold text-slate-200">{cnt}</span>
                      </div>
                      <div className="w-full bg-slate-900 rounded-full h-2">
                        <div
                          className="bg-amber-500 h-2 rounded-full"
                          style={{ width: `${dashboardMetrics.total > 0 ? (cnt / dashboardMetrics.total) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: CREATE MAINTENANCE TICKET */}
      {/* ========================================================================= */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0A0C10] border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl relative">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              ✕
            </button>

            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Wrench className="w-5 h-5 text-red-500" />
              <span>Create Maintenance Ticket (เปิดใบแจ้งซ่อมใหม่)</span>
            </h2>

            <form onSubmit={handleCreateRequest} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Select Property (เลือกทรัพย์) *</label>
                  <select
                    value={createForm.propertyId}
                    onChange={(e) => setCreateForm({ ...createForm, propertyId: e.target.value })}
                    className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-white"
                    required
                  >
                    <option value="">-- Choose Property --</option>
                    {properties.map((p) => (
                      <option key={p.propertyId} value={p.propertyId}>
                        {p.title} ({p.propertyId})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Client / Tenant (ผู้แจ้ง / ผู้เช่า)</label>
                  <select
                    value={createForm.customerId}
                    onChange={(e) => setCreateForm({ ...createForm, customerId: e.target.value })}
                    className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-white"
                  >
                    <option value="">-- Optional: Link Tenant/Owner --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.type})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Issue Title (หัวข้อปัญหา) *</label>
                <input
                  type="text"
                  placeholder="e.g. Master Bedroom AC Leaking Gas & Noise"
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Problem Details (รายละเอียดอาการ / ตำแหน่ง)</label>
                <textarea
                  rows={3}
                  placeholder="Describe the issue, location in the villa, and urgency details..."
                  value={createForm.problem}
                  onChange={(e) => setCreateForm({ ...createForm, problem: e.target.value })}
                  className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-white"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Category</label>
                  <select
                    value={createForm.category}
                    onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
                    className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-white"
                  >
                    <option value="Air Conditioner">Air Conditioner</option>
                    <option value="Pool">Swimming Pool</option>
                    <option value="Electrical">Electrical</option>
                    <option value="Plumbing">Plumbing</option>
                    <option value="Garden">Gardening</option>
                    <option value="Appliance">Appliances</option>
                    <option value="General">General</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Priority (ความเร่งด่วน)</label>
                  <select
                    value={createForm.priority}
                    onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value })}
                    className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-white"
                  >
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                    <option value="Urgent">🔥 Urgent</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Due Date (กำหนดเสร็จ)</label>
                  <input
                    type="date"
                    value={createForm.dueDate}
                    onChange={(e) => setCreateForm({ ...createForm, dueDate: e.target.value })}
                    className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Assign Vendor / Contractor</label>
                  <select
                    value={createForm.assignedVendorId}
                    onChange={(e) => setCreateForm({ ...createForm, assignedVendorId: e.target.value })}
                    className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-white"
                  >
                    <option value="">-- Assign Later --</option>
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.serviceType})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Responsible Agent</label>
                  <select
                    value={createForm.assignedAgentId}
                    onChange={(e) => setCreateForm({ ...createForm, assignedAgentId: e.target.value })}
                    className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-white"
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Initial Cost Estimates */}
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
                <span className="font-semibold text-slate-300 block">Initial Cost Estimates (ประมาณการค่าใช้จ่าย)</span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 mb-1 block">Labor Estimate (ค่าแรง บาท)</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={createForm.laborAmount || ''}
                      onChange={(e) => setCreateForm({ ...createForm, laborAmount: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-white"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 mb-1 block">Parts Estimate (ค่าอะไหล่ บาท)</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={createForm.partsAmount || ''}
                      onChange={(e) => setCreateForm({ ...createForm, partsAmount: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold"
                >
                  Create Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: TICKET DETAIL & COSTS MANAGEMENT */}
      {/* ========================================================================= */}
      {showDetailModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0A0C10] border border-slate-800 rounded-2xl w-full max-w-3xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowDetailModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              ✕
            </button>

            {/* Header info */}
            <div className="flex items-center gap-3 mb-3">
              <span className="font-mono text-xs font-bold text-slate-400">{selectedRequest.ticketNumber}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getPriorityBadge(selectedRequest.priority)}`}>
                {selectedRequest.priority}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getStatusBadge(selectedRequest.status)}`}>
                {selectedRequest.status}
              </span>
            </div>

            <h2 className="text-xl font-bold text-white mb-2">{selectedRequest.title}</h2>
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-4">
              <Building2 className="w-3.5 h-3.5 text-red-500" />
              <span>{selectedRequest.propertyTitle}</span>
              {selectedRequest.customerName && (
                <>
                  <span className="text-slate-600">•</span>
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  <span>Tenant: {selectedRequest.customerName}</span>
                </>
              )}
            </div>

            {/* Problem & Solution description */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
                <span className="font-semibold text-slate-300 block mb-1">Problem Description:</span>
                <p className="text-slate-400 whitespace-pre-wrap">{selectedRequest.problem}</p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
                <span className="font-semibold text-slate-300 block mb-1">Resolution / Solution:</span>
                <p className="text-slate-400 whitespace-pre-wrap">
                  {selectedRequest.solution || 'Work in progress. No final resolution logged yet.'}
                </p>
              </div>
            </div>

            {/* Status Quick Action Bar */}
            <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 mb-6 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-300">Update Status:</span>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => handleQuickStatus(selectedRequest.id, 'Assigned')}
                  className="px-2.5 py-1 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 text-xs font-medium hover:bg-indigo-900"
                >
                  Assigned
                </button>
                <button
                  onClick={() => handleQuickStatus(selectedRequest.id, 'In Progress')}
                  className="px-2.5 py-1 rounded bg-sky-950 text-sky-300 border border-sky-800 text-xs font-medium hover:bg-sky-900"
                >
                  In Progress
                </button>
                <button
                  onClick={() => handleQuickStatus(selectedRequest.id, 'Waiting')}
                  className="px-2.5 py-1 rounded bg-amber-950 text-amber-300 border border-amber-800 text-xs font-medium hover:bg-amber-900"
                >
                  Waiting Parts
                </button>
                <button
                  onClick={() => handleApproveComplete(selectedRequest.id)}
                  className="px-3 py-1 rounded bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500 shadow"
                >
                  ✓ Approve & Complete
                </button>
              </div>
            </div>

            {/* Costs Breakdown Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  <span>Maintenance Costs Breakdown (รายละเอียดค่าใช้จ่าย)</span>
                </h3>
                <span className="text-xs text-slate-400">
                  Total: <span className="font-bold text-emerald-400">฿{Number(selectedRequest.totalCost).toLocaleString()}</span>
                </span>
              </div>

              {/* Cost Items Table */}
              <div className="bg-slate-900/90 rounded-xl border border-slate-800 overflow-hidden text-xs">
                {requestCosts.length === 0 ? (
                  <p className="p-4 text-center text-slate-500">No costs recorded for this ticket yet.</p>
                ) : (
                  <table className="w-full text-left">
                    <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="p-2.5">Item Type</th>
                        <th className="p-2.5">Description</th>
                        <th className="p-2.5">Amount (THB)</th>
                        <th className="p-2.5">Status</th>
                        <th className="p-2.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300">
                      {requestCosts.map((c) => (
                        <tr key={c.id}>
                          <td className="p-2.5 font-medium">{c.itemType}</td>
                          <td className="p-2.5">{c.description}</td>
                          <td className="p-2.5 font-semibold text-slate-200">฿{Number(c.amount).toLocaleString()}</td>
                          <td className="p-2.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${c.isPaid ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                              {c.isPaid ? 'Paid' : 'Unpaid'}
                            </span>
                          </td>
                          <td className="p-2.5 text-right">
                            <button
                              onClick={() => handleDeleteCost(c.id)}
                              className="text-slate-500 hover:text-red-400 transition"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Add New Cost Form */}
              <form onSubmit={handleAddCost} className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-xs flex flex-wrap items-center gap-2">
                <select
                  value={newCostForm.itemType}
                  onChange={(e) => setNewCostForm({ ...newCostForm, itemType: e.target.value })}
                  className="p-2 bg-slate-900 border border-slate-800 rounded text-slate-200"
                >
                  <option value="Labor">ค่าแรง (Labor)</option>
                  <option value="Parts">ค่าอะไหล่ (Parts)</option>
                  <option value="Travel">ค่าเดินทาง (Travel)</option>
                  <option value="Other">อื่น ๆ (Other)</option>
                </select>

                <input
                  type="text"
                  placeholder="Cost description..."
                  value={newCostForm.description}
                  onChange={(e) => setNewCostForm({ ...newCostForm, description: e.target.value })}
                  className="flex-1 p-2 bg-slate-900 border border-slate-800 rounded text-slate-200 placeholder-slate-500"
                  required
                />

                <input
                  type="number"
                  placeholder="Amount"
                  value={newCostForm.amount}
                  onChange={(e) => setNewCostForm({ ...newCostForm, amount: e.target.value })}
                  className="w-24 p-2 bg-slate-900 border border-slate-800 rounded text-slate-200"
                  required
                />

                <label className="flex items-center gap-1.5 text-slate-400">
                  <input
                    type="checkbox"
                    checked={newCostForm.isPaid}
                    onChange={(e) => setNewCostForm({ ...newCostForm, isPaid: e.target.checked })}
                    className="rounded bg-slate-950 border-slate-800"
                  />
                  <span>Paid</span>
                </label>

                <button
                  type="submit"
                  className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition"
                >
                  + Add Cost
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: ASSIGN VENDOR / AGENT */}
      {/* ========================================================================= */}
      {showAssignModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0A0C10] border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative text-xs">
            <button
              onClick={() => setShowAssignModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              ✕
            </button>

            <h2 className="text-base font-bold text-white mb-1">Assign Vendor & Agent</h2>
            <p className="text-slate-400 mb-4 font-mono">{selectedRequest.ticketNumber}: {selectedRequest.title}</p>

            <form onSubmit={handleAssignSubmit} className="space-y-4">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Select Contractor / Vendor</label>
                <select
                  value={assignForm.assignedVendorId}
                  onChange={(e) => setAssignForm({ ...assignForm, assignedVendorId: e.target.value })}
                  className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-white"
                >
                  <option value="">-- No Vendor Assigned --</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.serviceType})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Internal Agent In Charge</label>
                <select
                  value={assignForm.assignedAgentId}
                  onChange={(e) => setAssignForm({ ...assignForm, assignedAgentId: e.target.value })}
                  className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-white"
                >
                  <option value="">-- No Agent --</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Target Due Date</label>
                <input
                  type="date"
                  value={assignForm.dueDate}
                  onChange={(e) => setAssignForm({ ...assignForm, dueDate: e.target.value })}
                  className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold"
                >
                  Save Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: VENDOR CREATE / EDIT */}
      {/* ========================================================================= */}
      {showVendorModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0A0C10] border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative text-xs">
            <button
              onClick={() => setShowVendorModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              ✕
            </button>

            <h2 className="text-base font-bold text-white mb-4">
              {vendorForm.id ? 'Edit Vendor / Contractor' : 'Add New Vendor / Contractor'}
            </h2>

            <form onSubmit={handleSaveVendor} className="space-y-4">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Technician / Vendor Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Somchai Air Conditioning"
                  value={vendorForm.name}
                  onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })}
                  className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Company Name</label>
                <input
                  type="text"
                  placeholder="e.g. Phuket Cool Co., Ltd."
                  value={vendorForm.company}
                  onChange={(e) => setVendorForm({ ...vendorForm, company: e.target.value })}
                  className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Phone Number *</label>
                  <input
                    type="text"
                    placeholder="081-xxx-xxxx"
                    value={vendorForm.phone}
                    onChange={(e) => setVendorForm({ ...vendorForm, phone: e.target.value })}
                    className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Email</label>
                  <input
                    type="email"
                    placeholder="contact@vendor.com"
                    value={vendorForm.email}
                    onChange={(e) => setVendorForm({ ...vendorForm, email: e.target.value })}
                    className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Service Speciality</label>
                  <select
                    value={vendorForm.serviceType}
                    onChange={(e) => setVendorForm({ ...vendorForm, serviceType: e.target.value })}
                    className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-white"
                  >
                    <option value="Air Conditioner">Air Conditioner</option>
                    <option value="Pool">Swimming Pool</option>
                    <option value="Electrical">Electrical</option>
                    <option value="Plumbing">Plumbing</option>
                    <option value="Garden">Gardening</option>
                    <option value="Cleaning">Cleaning</option>
                    <option value="General">General</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Rating Score (1-5)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="5"
                    value={vendorForm.rating}
                    onChange={(e) => setVendorForm({ ...vendorForm, rating: parseFloat(e.target.value) || 5.0 })}
                    className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Notes & Certification</label>
                <textarea
                  rows={2}
                  placeholder="Contract terms, hourly rates, emergency availability..."
                  value={vendorForm.notes}
                  onChange={(e) => setVendorForm({ ...vendorForm, notes: e.target.value })}
                  className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowVendorModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold"
                >
                  Save Vendor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: PREVENTIVE MAINTENANCE SCHEDULE */}
      {/* ========================================================================= */}
      {showPreventiveModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0A0C10] border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative text-xs">
            <button
              onClick={() => setShowPreventiveModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              ✕
            </button>

            <h2 className="text-base font-bold text-white mb-4">Set Preventive Maintenance Schedule</h2>

            <form onSubmit={handleSavePreventive} className="space-y-4">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Select Property *</label>
                <select
                  value={preventiveForm.propertyId}
                  onChange={(e) => setPreventiveForm({ ...preventiveForm, propertyId: e.target.value })}
                  className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-white"
                  required
                >
                  <option value="">-- Choose Property --</option>
                  {properties.map((p) => (
                    <option key={p.propertyId} value={p.propertyId}>
                      {p.title} ({p.propertyId})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Schedule Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Quarterly AC Coil Chemical Cleaning"
                  value={preventiveForm.title}
                  onChange={(e) => setPreventiveForm({ ...preventiveForm, title: e.target.value })}
                  className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Service Type</label>
                  <select
                    value={preventiveForm.serviceType}
                    onChange={(e) => setPreventiveForm({ ...preventiveForm, serviceType: e.target.value })}
                    className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-white"
                  >
                    <option value="Air Conditioner">Air Conditioner</option>
                    <option value="Pool">Swimming Pool</option>
                    <option value="Electrical">Electrical</option>
                    <option value="Plumbing">Plumbing</option>
                    <option value="Garden">Gardening</option>
                    <option value="General">General</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Cycle Interval</label>
                  <select
                    value={preventiveForm.cycleMonths}
                    onChange={(e) => setPreventiveForm({ ...preventiveForm, cycleMonths: parseInt(e.target.value, 10) })}
                    className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-white"
                  >
                    <option value={1}>Every 1 Month (ทุกเดือน)</option>
                    <option value={2}>Every 2 Months (ทุก 2 เดือน)</option>
                    <option value={3}>Every 3 Months (ทุกไตรมาส)</option>
                    <option value={6}>Every 6 Months (ทุกครึ่งปี)</option>
                    <option value={12}>Every 12 Months (รายปี)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">First / Next Due Date *</label>
                  <input
                    type="date"
                    value={preventiveForm.nextDueDate}
                    onChange={(e) => setPreventiveForm({ ...preventiveForm, nextDueDate: e.target.value })}
                    className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Estimated Cost (THB)</label>
                  <input
                    type="number"
                    value={preventiveForm.estimatedCost}
                    onChange={(e) => setPreventiveForm({ ...preventiveForm, estimatedCost: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Assigned Vendor</label>
                <select
                  value={preventiveForm.assignedVendorId}
                  onChange={(e) => setPreventiveForm({ ...preventiveForm, assignedVendorId: e.target.value })}
                  className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-white"
                >
                  <option value="">-- No Vendor Assigned --</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.serviceType})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowPreventiveModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold"
                >
                  Save Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
