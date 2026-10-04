import React, { useState, useMemo, useEffect } from 'react';
import {
  Customer,
  CustomerType,
  ClientStatus,
  ClientIntent,
  User,
  Property,
  Viewing,
  Contract,
  ClientFollowUp,
  ClientPropertyLink,
} from '../types';
import { translations, Language } from '../lib/i18n';
import {
  Users,
  Search,
  Plus,
  Phone,
  Mail,
  Calendar,
  Clock,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  History,
  Building,
  DollarSign,
  MapPin,
  Eye,
  FileText,
  CreditCard,
  UserCheck,
  Send,
  Link as LinkIcon,
  Unlink,
  Filter,
  Check,
  ArrowRight,
  Sparkles,
  Layers,
  Tag,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';

interface CustomersViewProps {
  customers: Customer[];
  onSaveCustomer: (customer: Customer) => void;
  onDeleteCustomer: (id: string) => void;
  language: Language;
  currentUser: User;
  users: User[];
  properties?: Property[];
  contracts?: Contract[];
  viewings?: Viewing[];
  initialFilter?: string;
  onScheduleViewingForCustomer?: (customer: Customer) => void;
}

export function CustomersView({
  customers = [],
  onSaveCustomer,
  onDeleteCustomer,
  language,
  currentUser,
  users = [],
  properties = [],
  contracts = [],
  viewings = [],
  initialFilter,
  onScheduleViewingForCustomer,
}: CustomersViewProps) {
  const t = translations[language];

  // Filters & State
  const [viewMode, setViewMode] = useState<'pipeline' | 'table'>('pipeline');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedLeadSource, setSelectedLeadSource] = useState<string>('all');
  const [selectedAgent, setSelectedAgent] = useState<string>('all');
  const [selectedFollowUp, setSelectedFollowUp] = useState<string>('all'); // 'all' | 'dueToday' | 'overdue' | 'upcoming'
  const [sortBy, setSortBy] = useState<'createdAt' | 'clientCode' | 'name' | 'nextFollowUpDate'>('createdAt');

  // Modals & Prompts
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [detailModalCustomer, setDetailModalCustomer] = useState<Customer | null>(null);
  const [detailTab, setDetailTab] = useState<'overview' | 'properties' | 'viewings' | 'contracts' | 'followups' | 'notes'>('overview');
  const [lostReasonPromptId, setLostReasonPromptId] = useState<string | null>(null);
  const [lostReasonInput, setLostReasonInput] = useState('');
  const [newLeadNote, setNewLeadNote] = useState('');

  // Follow-up input in Detail Modal
  const [newFollowUpDate, setNewFollowUpDate] = useState('');
  const [newFollowUpTime, setNewFollowUpTime] = useState('10:00');
  const [newFollowUpTitle, setNewFollowUpTitle] = useState('');
  const [newFollowUpPriority, setNewFollowUpPriority] = useState<string>('Normal');
  const [newFollowUpNote, setNewFollowUpNote] = useState('');
  const [newFollowUpAgent, setNewFollowUpAgent] = useState(currentUser.id);

  // Link property input in Detail Modal
  const [selectedPropToLink, setSelectedPropToLink] = useState('');
  const [propLinkNote, setPropLinkNote] = useState('');

  // Follow-up Summary Counts
  const [followUpSummary, setFollowUpSummary] = useState({
    overdue: 0,
    dueToday: 0,
    upcoming: 0,
    totalPending: 0,
  });

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Fetch follow-up summary from API
  const refreshFollowUpSummary = async () => {
    try {
      const res = await fetch('/api/clients/follow-ups/summary');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setFollowUpSummary(json.data);
        }
      }
    } catch (e) {
      // fallback calculation from local list
      let od = 0;
      let dt = 0;
      let uc = 0;
      for (const c of customers) {
        if (c.nextFollowUpDate) {
          if (c.nextFollowUpDate < todayStr) od++;
          else if (c.nextFollowUpDate === todayStr) dt++;
          else uc++;
        }
      }
      setFollowUpSummary({ overdue: od, dueToday: dt, upcoming: uc, totalPending: od + dt + uc });
    }
  };

  useEffect(() => {
    refreshFollowUpSummary();
  }, [customers, todayStr]);

  const clientTypes: CustomerType[] = ['Buyer', 'Tenant', 'Landlord', 'Investor', 'Owner', 'Lead'];
  const clientStatuses: ClientStatus[] = [
    'New',
    'Contacted',
    'Qualified',
    'Viewing',
    'Negotiation',
    'Won',
    'Lost',
    'Following Up',
    'Deposit',
    'Contract',
    'Closed',
  ];

  const pipelineStages = [
    { id: 'New', labelTh: 'ลีดใหม่', labelEn: 'New Leads', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', dot: 'bg-blue-500' },
    { id: 'Contacted', labelTh: 'ติดต่อแล้ว', labelEn: 'Contacted', color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-200', dot: 'bg-indigo-500' },
    { id: 'Qualified', labelTh: 'ประเมินคุณสมบัติ', labelEn: 'Qualified', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', dot: 'bg-amber-500' },
    { id: 'Viewing', labelTh: 'พาชมทรัพย์', labelEn: 'Viewing', color: 'text-cyan-700', bg: 'bg-cyan-50', border: 'border-cyan-200', dot: 'bg-cyan-500' },
    { id: 'Negotiation', labelTh: 'เจรจาต่อรอง', labelEn: 'Negotiation', color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200', dot: 'bg-purple-500' },
    { id: 'Won', labelTh: 'ปิดการขายสำเร็จ', labelEn: 'Won / Closed', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', dot: 'bg-emerald-500' },
    { id: 'Lost', labelTh: 'ยกเลิก / ไม่สำเร็จ', labelEn: 'Lost', color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200', dot: 'bg-rose-500' },
  ];

  const leadSources = [
    { id: 'Website', label: 'Website (เว็บไซต์หลัก)' },
    { id: 'Facebook', label: 'Facebook Ads / Page' },
    { id: 'Line', label: 'LINE Official Account' },
    { id: 'Walk-in', label: 'Walk-in (ติดต่อหน้าร้าน)' },
    { id: 'Referral', label: 'Referral (ลูกค้าแนะนำ)' },
    { id: 'Agent Network', label: 'Agent Network (เครือข่ายเอเจนต์)' },
    { id: 'Google', label: 'Google Search / SEO' },
    { id: 'Campaign', label: 'Marketing Campaign' },
    { id: 'Other', label: 'Other (ช่องทางอื่น)' },
  ];

  const defaultFormData: Partial<Customer> = {
    clientCode: '',
    firstName: '',
    lastName: '',
    companyName: '',
    phone: '',
    email: '',
    nationality: 'Thai',
    idNumber: '',
    clientType: 'Buyer',
    intent: 'Buy',
    status: 'New',
    leadSource: 'Website',
    lostReason: '',
    propertyType: 'Villa',
    budgetMin: 5000000,
    budgetMax: 20000000,
    preferredLocation: '',
    assignedAgentId: currentUser.id,
    assignedAgentName: currentUser.name,
    nextFollowUpDate: todayStr,
    notes: '',
  };

  const [formData, setFormData] = useState<Partial<Customer>>(defaultFormData);

  // Status Styling Badge Helper
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'New':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Contacted':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'Qualified':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Following Up':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Viewing':
        return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      case 'Negotiation':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Deposit':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Contract':
        return 'bg-teal-100 text-teal-800 border-teal-200';
      case 'Won':
      case 'Closed':
      case 'Closed Won':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Lost':
        return 'bg-rose-100 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getLeadSourceBadge = (source?: string) => {
    switch (source) {
      case 'Facebook':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Line':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Walk-in':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Referral':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Agent Network':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'Google':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'Campaign':
        return 'bg-teal-50 text-teal-700 border-teal-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  // Follow-up indicator
  const renderFollowUpIndicator = (date?: string) => {
    if (!date) return <span className="text-gray-400 text-xs italic">No follow-up</span>;
    if (date < todayStr) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200 animate-pulse">
          <AlertCircle className="w-3 h-3 text-rose-600" /> Overdue ({date})
        </span>
      );
    }
    if (date === todayStr) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
          <Clock className="w-3 h-3 text-amber-600" /> Due Today
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs text-blue-700 bg-blue-50 border border-blue-200">
        <Calendar className="w-3 h-3 text-blue-500" /> {date}
      </span>
    );
  };

  // Filtered & Sorted Clients
  const filteredClients = useMemo(() => {
    return (customers || []).filter((c) => {
      // Exclude archived from active list per Soft Delete rule
      if (c.isArchived) return false;

      const q = (searchQuery || '').toLowerCase();
      const code = (c.clientCode || c.customerCode || '').toLowerCase();
      const name = (c.name || `${c.firstName || ''} ${c.lastName || ''}`).toLowerCase();
      const company = (c.companyName || '').toLowerCase();
      const phone = c.phone || '';
      const email = (c.email || '').toLowerCase();
      const nationality = (c.nationality || '').toLowerCase();
      const location = (c.preferredLocation || '').toLowerCase();
      const notes = (c.notes || '').toLowerCase();
      const leadSrc = (c.leadSource || 'Website').toLowerCase();

      const matchSearch =
        !q ||
        code.includes(q) ||
        name.includes(q) ||
        company.includes(q) ||
        phone.includes(q) ||
        email.includes(q) ||
        nationality.includes(q) ||
        location.includes(q) ||
        leadSrc.includes(q) ||
        notes.includes(q);

      const type = c.clientType || c.type;
      const matchType = selectedType === 'all' || type === selectedType;

      const normStatus = (c.status || c.leadStatus || 'New');
      const matchStatus =
        selectedStatus === 'all' ||
        normStatus === selectedStatus ||
        (selectedStatus === 'Won' && (normStatus === 'Closed' || normStatus === 'Closed Won'));

      const matchSource = selectedLeadSource === 'all' || (c.leadSource || 'Website') === selectedLeadSource;

      const matchAgent = selectedAgent === 'all' || c.assignedAgentId === selectedAgent;

      let matchFollowUp = true;
      if (selectedFollowUp === 'dueToday') {
        matchFollowUp = c.nextFollowUpDate === todayStr;
      } else if (selectedFollowUp === 'overdue') {
        matchFollowUp = Boolean(c.nextFollowUpDate && c.nextFollowUpDate < todayStr);
      } else if (selectedFollowUp === 'upcoming') {
        matchFollowUp = Boolean(c.nextFollowUpDate && c.nextFollowUpDate > todayStr);
      }

      return matchSearch && matchType && matchStatus && matchSource && matchAgent && matchFollowUp;
    });
  }, [customers, searchQuery, selectedType, selectedStatus, selectedLeadSource, selectedAgent, selectedFollowUp, todayStr]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingCustomer(null);
    setFormData({
      ...defaultFormData,
      assignedAgentId: currentUser.id,
      assignedAgentName: currentUser.name,
      nextFollowUpDate: todayStr,
    });
    setEditModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (c: Customer) => {
    setEditingCustomer(c);
    setFormData({
      ...c,
      clientType: c.clientType || c.type || 'Buyer',
      status: (c.status || c.leadStatus || 'New') as ClientStatus,
      leadSource: c.leadSource || 'Website',
      lostReason: c.lostReason || '',
      firstName: c.firstName || c.name.split(' ')[0] || '',
      lastName: c.lastName || c.name.split(' ').slice(1).join(' ') || '',
      budgetMin: c.budgetMin || 0,
      budgetMax: c.budgetMax || 0,
    });
    setEditModalOpen(true);
  };

  // Open Detail Modal
  const handleOpenDetail = async (c: Customer) => {
    setDetailTab('overview');
    setDetailModalCustomer(c);

    // Fetch full enriched detail from backend to get linked properties, viewings, contracts, payments, follow-ups
    try {
      const res = await fetch(`/api/clients/${c.id}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.client) {
          setDetailModalCustomer(json.client);
        }
      }
    } catch (e) {
      console.warn('Could not fetch enriched client details:', e);
    }
  };

  // Submit Create or Edit
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();

    const firstName = (formData.firstName || formData.name || '').trim();
    if (!firstName && !formData.companyName) {
      alert(language === 'th' ? 'กรุณากรอกชื่อลูกค้าหรือชื่อบริษัท' : 'Please enter client name or company name');
      return;
    }
    if (!formData.phone || !formData.phone.trim()) {
      alert(language === 'th' ? 'กรุณากรอกเบอร์โทรศัพท์' : 'Please enter contact phone number');
      return;
    }

    const assignedUser = users.find((u) => u.id === formData.assignedAgentId) || currentUser;

    const payload = {
      ...formData,
      firstName,
      lastName: formData.lastName?.trim() || '',
      companyName: formData.companyName?.trim() || '',
      name: `${firstName} ${formData.lastName || ''}`.trim() || formData.companyName || 'Unnamed Client',
      phone: formData.phone.trim(),
      email: formData.email?.trim() || '',
      nationality: formData.nationality?.trim() || 'Thai',
      idNumber: formData.idNumber?.trim() || '',
      clientType: formData.clientType || 'Buyer',
      type: formData.clientType || 'Buyer',
      intent: formData.intent || 'Buy',
      status: formData.status || 'New',
      leadStatus: formData.status || 'New',
      leadSource: formData.leadSource || 'Website',
      lostReason: formData.lostReason?.trim() || '',
      propertyType: formData.propertyType || 'Villa',
      budgetMin: Number(formData.budgetMin) || 0,
      budgetMax: Number(formData.budgetMax) || 0,
      preferredLocation: formData.preferredLocation?.trim() || '',
      assignedAgentId: assignedUser.id,
      assignedAgentName: assignedUser.name,
      nextFollowUpDate: formData.nextFollowUpDate || null,
      notes: formData.notes?.trim() || '',
    };

    try {
      const isEdit = Boolean(editingCustomer);
      const url = isEdit ? `/api/clients/${editingCustomer!.id}` : '/api/clients';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentUser.role,
          'x-user-name': encodeURIComponent(currentUser.name),
          'x-user-id': currentUser.id,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        alert(`Error saving client: ${errJson.error || res.statusText}`);
        return;
      }

      const json = await res.json();
      if (json.success && json.client) {
        onSaveCustomer(json.client);
        if (detailModalCustomer?.id === json.client.id) {
          setDetailModalCustomer(json.client);
        }
      }

      setEditModalOpen(false);
      refreshFollowUpSummary();
    } catch (err: any) {
      console.error('Error saving client:', err);
      // Fallback local save
      const fallbackClient: Customer = {
        id: editingCustomer ? editingCustomer.id : `cust-${Date.now()}`,
        customerCode: formData.clientCode || `CLI-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        name: `${firstName} ${formData.lastName || ''}`.trim() || 'Client',
        phone: formData.phone || '',
        email: formData.email || '',
        type: (formData.clientType as CustomerType) || 'Buyer',
        leadStatus: (formData.status as any) || 'New',
        status: (formData.status as any) || 'New',
        budgetMin: Number(formData.budgetMin) || 0,
        budgetMax: Number(formData.budgetMax) || 0,
        preferredLocation: formData.preferredLocation || '',
        assignedAgentId: assignedUser.id,
        assignedAgentName: assignedUser.name,
        notes: formData.notes || '',
        timeline: [],
        createdAt: editingCustomer ? editingCustomer.createdAt : new Date().toISOString(),
      };
      onSaveCustomer(fallbackClient);
      setEditModalOpen(false);
    }
  };

  // Quick Change Status
  const handleQuickStatusChange = async (client: Customer, newStatus: ClientStatus) => {
    try {
      const res = await fetch(`/api/clients/${client.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentUser.role,
          'x-user-name': encodeURIComponent(currentUser.name),
          'x-user-id': currentUser.id,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.client) {
          onSaveCustomer(json.client);
          if (detailModalCustomer?.id === client.id) {
            setDetailModalCustomer(json.client);
          }
        }
      }
    } catch (e) {
      console.error('Failed to change status:', e);
    }
  };

  // Move Pipeline Stage (Kanban / Funnel)
  const handleMovePipelineStage = async (clientId: string, stage: string, lostReason?: string) => {
    try {
      const res = await fetch(`/api/clients/${clientId}/pipeline-stage`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentUser.role,
          'x-user-name': encodeURIComponent(currentUser.name),
          'x-user-id': currentUser.id,
        },
        body: JSON.stringify({ stage, lostReason }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.client) {
          onSaveCustomer(json.client);
          if (detailModalCustomer?.id === clientId) {
            setDetailModalCustomer(json.client);
          }
        }
      }
    } catch (e) {
      console.error('Failed to advance pipeline stage:', e);
    }
  };

  // Add Lead Note
  const handleAddLeadNote = async () => {
    if (!detailModalCustomer || !newLeadNote.trim()) return;

    try {
      const res = await fetch(`/api/clients/${detailModalCustomer.id}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentUser.role,
          'x-user-name': encodeURIComponent(currentUser.name),
          'x-user-id': currentUser.id,
        },
        body: JSON.stringify({ note: newLeadNote.trim() }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.client) {
          onSaveCustomer(json.client);
          setDetailModalCustomer(json.client);
          setNewLeadNote('');
        }
      }
    } catch (e) {
      console.error('Failed to add lead note:', e);
    }
  };

  // Add Follow-up
  const handleAddFollowUp = async () => {
    if (!detailModalCustomer) return;
    if (!newFollowUpDate) {
      alert('Please select a follow-up date.');
      return;
    }
    if (!newFollowUpNote.trim()) {
      alert('Please enter follow-up notes.');
      return;
    }

    const assignedUser = users.find((u) => u.id === newFollowUpAgent) || currentUser;

    try {
      const res = await fetch(`/api/clients/${detailModalCustomer.id}/follow-ups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentUser.role,
          'x-user-name': encodeURIComponent(currentUser.name),
          'x-user-id': currentUser.id,
        },
        body: JSON.stringify({
          title: newFollowUpTitle.trim() || newFollowUpNote.trim().slice(0, 50),
          followUpDate: newFollowUpDate,
          followUpTime: newFollowUpTime,
          followUpNote: newFollowUpNote.trim(),
          notes: newFollowUpNote.trim(),
          priority: newFollowUpPriority,
          assignedAgentId: assignedUser.id,
          assignedAgentName: assignedUser.name,
        }),
      });

      if (res.ok) {
        // Refresh detail
        handleOpenDetail(detailModalCustomer);
        setNewFollowUpTitle('');
        setNewFollowUpNote('');
        refreshFollowUpSummary();
      }
    } catch (e) {
      console.error('Error adding follow-up:', e);
    }
  };

  // Mark Follow-up Completed
  const handleCompleteFollowUp = async (followUpId: string) => {
    try {
      const res = await fetch(`/api/clients/follow-ups/${followUpId}/complete`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentUser.role,
          'x-user-name': encodeURIComponent(currentUser.name),
          'x-user-id': currentUser.id,
        },
      });

      if (res.ok && detailModalCustomer) {
        handleOpenDetail(detailModalCustomer);
        refreshFollowUpSummary();
      }
    } catch (e) {
      console.error('Error completing follow-up:', e);
    }
  };

  // Cancel Follow-up
  const handleCancelFollowUp = async (followUpId: string) => {
    const reason = prompt(
      language === 'th' ? 'กรุณาระบุเหตุผลในการยกเลิก Follow-up:' : 'Please provide reason for cancelling follow-up:',
      'Client postponed / rescheduled'
    );
    if (reason === null) return;

    try {
      const res = await fetch(`/api/follow-ups/${followUpId}/cancel`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentUser.role,
          'x-user-name': encodeURIComponent(currentUser.name),
          'x-user-id': currentUser.id,
        },
        body: JSON.stringify({ reason: reason.trim() || 'Cancelled' }),
      });

      if (res.ok && detailModalCustomer) {
        handleOpenDetail(detailModalCustomer);
        refreshFollowUpSummary();
      }
    } catch (e) {
      console.error('Error cancelling follow-up:', e);
    }
  };

  // Soft Delete Follow-up (Admin / Manager)
  const handleDeleteFollowUp = async (followUpId: string) => {
    const isManagerOrAdmin = currentUser.role === 'Admin' || currentUser.role === 'Manager' || currentUser.role === 'Administrator';
    if (!isManagerOrAdmin) {
      alert(language === 'th' ? 'สิทธิ์ไม่เพียงพอ: เฉพาะผู้จัดการฝ่ายขายหรือแอดมินเท่านั้นที่สามารถลบได้' : 'Forbidden: Only Administrators or Managers can delete tasks.');
      return;
    }

    if (!confirm(language === 'th' ? 'ต้องการลบรายการ Follow-up นี้หรือไม่? (Soft delete)' : 'Delete this follow-up task?')) return;

    try {
      const res = await fetch(`/api/follow-ups/${followUpId}`, {
        method: 'DELETE',
        headers: {
          'x-user-role': currentUser.role,
          'x-user-name': encodeURIComponent(currentUser.name),
          'x-user-id': currentUser.id,
        },
      });

      if (res.ok && detailModalCustomer) {
        handleOpenDetail(detailModalCustomer);
        refreshFollowUpSummary();
      }
    } catch (e) {
      console.error('Error deleting follow-up:', e);
    }
  };

  // Link Property to Client
  const handleLinkProperty = async () => {
    if (!detailModalCustomer || !selectedPropToLink) return;

    try {
      const res = await fetch(`/api/clients/${detailModalCustomer.id}/properties`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentUser.role,
          'x-user-name': encodeURIComponent(currentUser.name),
          'x-user-id': currentUser.id,
        },
        body: JSON.stringify({
          propertyId: selectedPropToLink,
          notes: propLinkNote.trim(),
        }),
      });

      if (res.ok) {
        setSelectedPropToLink('');
        setPropLinkNote('');
        handleOpenDetail(detailModalCustomer);
      }
    } catch (e) {
      console.error('Error linking property:', e);
    }
  };

  // Unlink Property
  const handleUnlinkProperty = async (propertyId: string) => {
    if (!detailModalCustomer) return;
    if (!confirm('Remove this property link from client?')) return;

    try {
      const res = await fetch(`/api/clients/${detailModalCustomer.id}/properties/${propertyId}`, {
        method: 'DELETE',
        headers: {
          'x-user-role': currentUser.role,
          'x-user-name': encodeURIComponent(currentUser.name),
          'x-user-id': currentUser.id,
        },
      });

      if (res.ok) {
        handleOpenDetail(detailModalCustomer);
      }
    } catch (e) {
      console.error('Error unlinking property:', e);
    }
  };

  // Soft Delete Client
  const handleSoftDelete = async (id: string, name: string) => {
    const isManagerOrAdmin =
      currentUser.role === 'Administrator' || currentUser.role === 'Manager';
    if (!isManagerOrAdmin) {
      alert(language === 'th' ? 'เฉพาะผู้จัดการหรือผู้ดูแลระบบที่สามารถจัดเก็บข้อมูลลูกค้าได้' : 'Only Managers or Administrators have permission to archive clients.');
      return;
    }

    if (!confirm(language === 'th' ? `คุณต้องการจัดเก็บข้อมูลลูกค้า ${name} (Soft Delete) หรือไม่?` : `Are you sure you want to archive client ${name} (Soft Delete)?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/clients/${id}`, {
        method: 'DELETE',
        headers: {
          'x-user-role': currentUser.role,
          'x-user-name': encodeURIComponent(currentUser.name),
          'x-user-id': currentUser.id,
        },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(`Error: ${err.error || res.statusText}`);
        return;
      }

      onDeleteCustomer(id);
      if (detailModalCustomer?.id === id) {
        setDetailModalCustomer(null);
      }
      refreshFollowUpSummary();
    } catch (e) {
      console.error('Error archiving client:', e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & KPI Stat Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-[#0A0C10] to-[#1A1D23] p-6 rounded-2xl text-white shadow-lg border border-gray-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-600/30 text-red-400 border border-red-500/30">
              B26 LEAD & SALES PIPELINE
            </span>
            <span className="text-xs text-gray-400">Stages: New → Contacted → Qualified → Viewing → Negotiation → Won/Lost</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif tracking-tight text-white flex items-center gap-3">
            <Users className="w-8 h-8 text-red-500" />
            {language === 'th' ? 'ระบบจัดการลีด & ไปป์ไลน์ฝ่ายขาย' : 'Lead & Sales Pipeline CRM'}
          </h1>
          <p className="text-sm text-gray-300 mt-1">
            {language === 'th'
              ? 'บริหารจัดการกระบวนการขาย ติดตามลีด เชื่อมโยงทรัพย์ นัดหมายชมห้อง และสัญญาครบวงจร'
              : 'End-to-end sales funnel, lead source tracking, agent assignments, viewings, and contracts'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* View Mode Switcher */}
          <div className="flex items-center bg-gray-900/90 p-1 rounded-xl border border-gray-700">
            <button
              type="button"
              onClick={() => setViewMode('pipeline')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'pipeline'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{language === 'th' ? 'ไปป์ไลน์ (Kanban)' : 'Pipeline'}</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'table'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{language === 'th' ? 'ตารางรายชื่อ' : 'Table'}</span>
            </button>
          </div>

          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-medium px-4 py-2.5 rounded-xl shadow-md transition-all transform active:scale-95 text-xs sm:text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>{language === 'th' ? 'ลงทะเบียนลีดใหม่' : 'New Lead'}</span>
          </button>
        </div>
      </div>

      {/* Follow-up Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          onClick={() => setSelectedFollowUp(selectedFollowUp === 'all' ? 'all' : 'all')}
          className={`p-4 rounded-xl border transition-all cursor-pointer bg-white shadow-sm ${
            selectedFollowUp === 'all' ? 'border-gray-400 ring-2 ring-gray-200' : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between text-gray-500 text-xs font-medium uppercase tracking-wider">
            <span>{language === 'th' ? 'ลูกค้าทั้งหมด' : 'Total Active'}</span>
            <Users className="w-4 h-4 text-gray-400" />
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-2">{filteredClients.length}</div>
          <div className="text-xs text-gray-500 mt-1">{language === 'th' ? 'ในฐานข้อมูล' : 'In system'}</div>
        </div>

        <div
          onClick={() => setSelectedFollowUp(selectedFollowUp === 'overdue' ? 'all' : 'overdue')}
          className={`p-4 rounded-xl border transition-all cursor-pointer bg-white shadow-sm ${
            selectedFollowUp === 'overdue' ? 'border-rose-400 ring-2 ring-rose-200' : 'border-rose-200 hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between text-rose-600 text-xs font-semibold uppercase tracking-wider">
            <span>{language === 'th' ? 'เกินกำหนด Follow-up' : 'Overdue Follow-up'}</span>
            <AlertCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-rose-600 mt-2">{followUpSummary.overdue}</div>
          <div className="text-xs text-rose-500 mt-1">{language === 'th' ? 'ต้องติดตามด่วน' : 'Requires immediate attention'}</div>
        </div>

        <div
          onClick={() => setSelectedFollowUp(selectedFollowUp === 'dueToday' ? 'all' : 'dueToday')}
          className={`p-4 rounded-xl border transition-all cursor-pointer bg-white shadow-sm ${
            selectedFollowUp === 'dueToday' ? 'border-amber-400 ring-2 ring-amber-200' : 'border-amber-200 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between text-amber-700 text-xs font-semibold uppercase tracking-wider">
            <span>{language === 'th' ? 'ถึงกำหนดวันนี้' : 'Due Today'}</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-600 mt-2">{followUpSummary.dueToday}</div>
          <div className="text-xs text-amber-600 mt-1">{todayStr}</div>
        </div>

        <div
          onClick={() => setSelectedFollowUp(selectedFollowUp === 'upcoming' ? 'all' : 'upcoming')}
          className={`p-4 rounded-xl border transition-all cursor-pointer bg-white shadow-sm ${
            selectedFollowUp === 'upcoming' ? 'border-blue-400 ring-2 ring-blue-200' : 'border-blue-200 hover:border-blue-300'
          }`}
        >
          <div className="flex items-center justify-between text-blue-700 text-xs font-semibold uppercase tracking-wider">
            <span>{language === 'th' ? 'นัดหมายถัดไป' : 'Upcoming Follow-up'}</span>
            <Calendar className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-blue-600 mt-2">{followUpSummary.upcoming}</div>
          <div className="text-xs text-blue-500 mt-1">{language === 'th' ? 'รอบกำหนดข้างหน้า' : 'Scheduled in future'}</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={
              language === 'th'
                ? 'ค้นหาตามชื่อ, บริษัท, รหัสลูกค้า, เบอร์โทร, สัญชาติ, ทำเลที่สนใจ...'
                : 'Search by client code, name, company, phone, email, location...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="all">{language === 'th' ? 'ทุกสถานะ' : 'All Statuses'}</option>
            {clientStatuses.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>

          {/* Lead Source Filter */}
          <select
            value={selectedLeadSource}
            onChange={(e) => setSelectedLeadSource(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="all">{language === 'th' ? 'ทุกช่องทางที่มา (All Sources)' : 'All Lead Sources'}</option>
            {leadSources.map((ls) => (
              <option key={ls.id} value={ls.id}>
                {ls.label}
              </option>
            ))}
          </select>

          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="all">{language === 'th' ? 'ทุกประเภทลูกค้า' : 'All Types'}</option>
            {clientTypes.map((tp) => (
              <option key={tp} value={tp}>
                {tp}
              </option>
            ))}
          </select>

          {/* Agent Filter */}
          <select
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="all">{language === 'th' ? 'ทุกเอเจนต์' : 'All Agents'}</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>

          {/* Follow-up filter */}
          <select
            value={selectedFollowUp}
            onChange={(e) => setSelectedFollowUp(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500 font-medium"
          >
            <option value="all">{language === 'th' ? 'ทุกกำหนดการ' : 'All Follow-ups'}</option>
            <option value="dueToday">{language === 'th' ? '⚠️ ถึงกำหนดวันนี้' : '⚠️ Due Today'}</option>
            <option value="overdue">{language === 'th' ? '🚨 เกินกำหนด (Overdue)' : '🚨 Overdue'}</option>
            <option value="upcoming">{language === 'th' ? '📅 มีนัดหมายล่วงหน้า' : '📅 Upcoming'}</option>
          </select>
        </div>
      </div>

      {/* VIEW MODE 1: LEAD PIPELINE KANBAN BOARD */}
      {viewMode === 'pipeline' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-3.5 items-start overflow-x-auto pb-4">
          {pipelineStages.map((stage) => {
            const stageLeads = filteredClients.filter((c) => {
              const s = c.status || c.leadStatus || 'New';
              if (stage.id === 'Won') {
                return s === 'Won' || s === 'Closed' || s === 'Closed Won';
              }
              return s === stage.id;
            });

            const stageValue = stageLeads.reduce(
              (acc, curr) => acc + (Number(curr.budgetMax || curr.budgetMin || 0)),
              0
            );

            return (
              <div
                key={stage.id}
                className="bg-gray-100/80 rounded-2xl p-3 border border-gray-200/80 flex flex-col min-w-[250px] shadow-xs"
              >
                {/* Stage Header */}
                <div className="flex items-center justify-between pb-2 mb-1.5 border-b border-gray-200">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${stage.dot}`} />
                    <h3 className="font-bold text-xs text-gray-900 tracking-tight">
                      {stage.id}
                    </h3>
                    <span className="text-[10px] text-gray-500 font-normal">
                      ({language === 'th' ? stage.labelTh : stage.labelEn})
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-white text-gray-700 shadow-2xs border border-gray-200">
                    {stageLeads.length}
                  </span>
                </div>

                {/* Total Stage Budget */}
                <div className="text-[11px] text-gray-500 font-medium mb-3 flex items-center justify-between px-1">
                  <span>{language === 'th' ? 'มูลค่างบรวม' : 'Est. Deal Value'}</span>
                  <span className="font-semibold text-gray-900">
                    {stageValue > 0 ? `${(stageValue / 1000000).toFixed(1)}M ฿` : '0 ฿'}
                  </span>
                </div>

                {/* Cards List */}
                <div className="space-y-3 min-h-[260px]">
                  {stageLeads.length === 0 ? (
                    <div className="py-10 text-center border-2 border-dashed border-gray-200 rounded-xl bg-white/40">
                      <span className="text-xs text-gray-400 italic">
                        {language === 'th' ? 'ไม่มีลีดในขั้นตอนนี้' : 'No leads'}
                      </span>
                    </div>
                  ) : (
                    stageLeads.map((lead) => {
                      const clientCode = lead.clientCode || lead.customerCode || 'CLI-0000';
                      const fullName = lead.name || `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || 'Client';

                      return (
                        <div
                          key={lead.id}
                          onClick={() => handleOpenDetail(lead)}
                          className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs hover:shadow-md hover:border-red-200 transition-all cursor-pointer space-y-2.5 group"
                        >
                          {/* Card Header: Code & Source */}
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[11px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-100">
                              {clientCode}
                            </span>
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getLeadSourceBadge(
                                lead.leadSource
                              )}`}
                            >
                              {lead.leadSource || 'Website'}
                            </span>
                          </div>

                          {/* Client Name & Company */}
                          <div>
                            <h4 className="font-semibold text-sm text-gray-900 group-hover:text-red-600 transition-colors">
                              {fullName}
                            </h4>
                            {lead.companyName && (
                              <p className="text-xs text-gray-500 truncate">{lead.companyName}</p>
                            )}
                          </div>

                          {/* Preference & Budget */}
                          <div className="bg-gray-50 p-2 rounded-lg text-xs space-y-1 border border-gray-100">
                            <div className="flex items-center justify-between text-gray-600">
                              <span className="font-medium text-gray-500">
                                {lead.propertyType || 'Villa'} ({lead.intent || 'Buy'})
                              </span>
                              <span className="font-bold text-gray-900">
                                {lead.budgetMax
                                  ? `${Number(lead.budgetMax).toLocaleString()} ฿`
                                  : 'Flexible'}
                              </span>
                            </div>
                            {lead.preferredLocation && (
                              <div className="flex items-center gap-1 text-[11px] text-gray-500 truncate">
                                <MapPin className="w-3 h-3 shrink-0 text-gray-400" />
                                <span className="truncate">{lead.preferredLocation}</span>
                              </div>
                            )}
                          </div>

                          {/* Contact & Agent */}
                          <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-100">
                            <a
                              href={`tel:${lead.phone}`}
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-1 text-gray-600 hover:text-red-600 font-medium"
                            >
                              <Phone className="w-3 h-3 text-gray-400" />
                              <span>{lead.phone}</span>
                            </a>
                            <div
                              className="flex items-center gap-1 text-[11px] text-gray-500"
                              title={`Assigned: ${lead.assignedAgentName}`}
                            >
                              <div className="w-4 h-4 rounded-full bg-slate-800 text-white flex items-center justify-center text-[9px] font-bold">
                                {(lead.assignedAgentName || 'A').charAt(0)}
                              </div>
                              <span className="truncate max-w-[80px]">{lead.assignedAgentName}</span>
                            </div>
                          </div>

                          {/* Follow-up alert if present */}
                          {lead.nextFollowUpDate && (
                            <div className="pt-0.5">
                              {renderFollowUpIndicator(lead.nextFollowUpDate)}
                            </div>
                          )}

                          {/* Lost Reason if lost */}
                          {lead.status === 'Lost' && lead.lostReason && (
                            <div className="text-[11px] text-rose-700 bg-rose-50 p-1.5 rounded border border-rose-100 italic">
                              Reason: {lead.lostReason}
                            </div>
                          )}

                          {/* Quick Stage Progression Buttons */}
                          <div
                            className="flex items-center justify-between pt-1 gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {stage.id !== 'Won' && stage.id !== 'Lost' && (
                              <>
                                {stage.id === 'New' && (
                                  <button
                                    onClick={() => handleMovePipelineStage(lead.id, 'Contacted')}
                                    className="flex-1 text-[11px] py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded border border-indigo-200 transition-colors flex items-center justify-center gap-1"
                                  >
                                    <span>Contacted</span>
                                    <ChevronRight className="w-3 h-3" />
                                  </button>
                                )}
                                {stage.id === 'Contacted' && (
                                  <button
                                    onClick={() => handleMovePipelineStage(lead.id, 'Qualified')}
                                    className="flex-1 text-[11px] py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 font-semibold rounded border border-amber-200 transition-colors flex items-center justify-center gap-1"
                                  >
                                    <span>Qualified</span>
                                    <ChevronRight className="w-3 h-3" />
                                  </button>
                                )}
                                {stage.id === 'Qualified' && (
                                  <button
                                    onClick={() => handleMovePipelineStage(lead.id, 'Viewing')}
                                    className="flex-1 text-[11px] py-1 bg-cyan-50 hover:bg-cyan-100 text-cyan-700 font-semibold rounded border border-cyan-200 transition-colors flex items-center justify-center gap-1"
                                  >
                                    <span>Viewing</span>
                                    <ChevronRight className="w-3 h-3" />
                                  </button>
                                )}
                                {stage.id === 'Viewing' && (
                                  <button
                                    onClick={() => handleMovePipelineStage(lead.id, 'Negotiation')}
                                    className="flex-1 text-[11px] py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 font-semibold rounded border border-purple-200 transition-colors flex items-center justify-center gap-1"
                                  >
                                    <span>Negotiation</span>
                                    <ChevronRight className="w-3 h-3" />
                                  </button>
                                )}
                                {stage.id === 'Negotiation' && (
                                  <button
                                    onClick={() => handleMovePipelineStage(lead.id, 'Won')}
                                    className="flex-1 text-[11px] py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded shadow-2xs transition-colors flex items-center justify-center gap-1"
                                  >
                                    <span>Won 🏆</span>
                                  </button>
                                )}

                                <button
                                  onClick={() => {
                                    setLostReasonPromptId(lead.id);
                                    setLostReasonInput('');
                                  }}
                                  className="text-[11px] px-2 py-1 bg-gray-100 hover:bg-rose-50 text-gray-500 hover:text-rose-600 font-medium rounded border border-gray-200 hover:border-rose-200 transition-colors"
                                  title="Mark Lost"
                                >
                                  Lost
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW MODE 2: CLIENT LIST TABLE */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">{language === 'th' ? 'รหัส / ลูกค้า' : 'Code / Client'}</th>
                  <th className="py-3.5 px-4">{language === 'th' ? 'ที่มา (Source)' : 'Source'}</th>
                  <th className="py-3.5 px-4">{language === 'th' ? 'ข้อมูลติดต่อ' : 'Contact'}</th>
                  <th className="py-3.5 px-4">{language === 'th' ? 'ประเภท / ความต้องการ' : 'Type / Intent'}</th>
                  <th className="py-3.5 px-4">{language === 'th' ? 'งบประมาณ & ทำเล' : 'Budget & Location'}</th>
                  <th className="py-3.5 px-4">{language === 'th' ? 'เอเจนต์ดูแล' : 'Assigned Agent'}</th>
                  <th className="py-3.5 px-4">{language === 'th' ? 'สถานะไปป์ไลน์' : 'Pipeline Stage'}</th>
                  <th className="py-3.5 px-4">{language === 'th' ? 'กำหนด Follow-up' : 'Follow-up Date'}</th>
                  <th className="py-3.5 px-4 text-right">{language === 'th' ? 'จัดการ' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredClients.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-gray-400">
                      <Users className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                      <p className="text-base font-medium text-gray-600">
                        {language === 'th' ? 'ไม่พบข้อมูลลูกค้า' : 'No clients found'}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {language === 'th' ? 'ลองปรับตัวกรองหรือกดลงทะเบียนลูกค้าใหม่' : 'Try adjusting your filters or register a new client'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredClients.map((client) => {
                    const clientCode = client.clientCode || client.customerCode || 'CLI-0000';
                    const fullName = client.name || `${client.firstName || ''} ${client.lastName || ''}`.trim() || 'Client';
                    const cType = client.clientType || client.type || 'Buyer';
                    const status = (client.status || client.leadStatus || 'New') as ClientStatus;

                    return (
                      <tr
                        key={client.id}
                        className="hover:bg-gray-50/80 transition-colors group cursor-pointer"
                        onClick={() => handleOpenDetail(client)}
                      >
                        {/* Code & Name */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm shadow-sm flex-shrink-0">
                              {fullName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900 flex items-center gap-1.5">
                                <span>{fullName}</span>
                                {client.companyName && (
                                  <span className="text-xs font-normal text-gray-500">
                                    ({client.companyName})
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="font-mono text-xs font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-100">
                                  {clientCode}
                                </span>
                                {client.nationality && (
                                  <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                    {client.nationality}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Lead Source */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${getLeadSourceBadge(
                              client.leadSource
                            )}`}
                          >
                            {client.leadSource || 'Website'}
                          </span>
                        </td>

                        {/* Contact */}
                        <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                          <div className="space-y-1">
                            <a
                              href={`tel:${client.phone}`}
                              className="flex items-center gap-1.5 text-xs text-gray-700 hover:text-red-600 font-medium"
                            >
                              <Phone className="w-3.5 h-3.5 text-gray-400" />
                              <span>{client.phone}</span>
                            </a>
                            {client.email && (
                              <a
                                href={`mailto:${client.email}`}
                                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-600 truncate max-w-[180px]"
                              >
                                <Mail className="w-3.5 h-3.5 text-gray-400" />
                                <span className="truncate">{client.email}</span>
                              </a>
                            )}
                          </div>
                        </td>

                        {/* Type & Intent */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col gap-1 items-start">
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                              {cType}
                            </span>
                            {client.intent && (
                              <span className="text-xs text-gray-500 font-medium flex items-center gap-1">
                                <span>Intent:</span>
                                <span className="text-gray-900 font-semibold">{client.intent}</span>
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Budget & Location */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-0.5">
                            <div className="text-xs font-semibold text-gray-900">
                              {client.budgetMax ? (
                                <span>
                                  {Number(client.budgetMin || 0).toLocaleString()} - {Number(client.budgetMax).toLocaleString()} ฿
                                </span>
                              ) : (
                                <span className="text-gray-400 italic">Not set</span>
                              )}
                            </div>
                            {client.preferredLocation && (
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                <MapPin className="w-3 h-3 text-gray-400" />
                                <span>{client.preferredLocation}</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Agent */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <div className="w-6 h-6 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-xs font-bold">
                              {(client.assignedAgentName || 'A').charAt(0)}
                            </div>
                            <span className="text-xs font-medium text-gray-800">
                              {client.assignedAgentName || 'Unassigned'}
                            </span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                          <select
                            value={status}
                            onChange={(e) => handleQuickStatusChange(client, e.target.value as ClientStatus)}
                            className={`text-xs font-semibold px-2.5 py-1 rounded-full border cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500 ${getStatusBadge(
                              status
                            )}`}
                          >
                            {clientStatuses.map((st) => (
                              <option key={st} value={st} className="bg-white text-gray-800">
                                {st}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Follow-up date */}
                        <td className="py-3.5 px-4">{renderFollowUpIndicator(client.nextFollowUpDate)}</td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <button
                              title="View Detail"
                              onClick={() => handleOpenDetail(client)}
                              className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              title="Edit Client"
                              onClick={() => handleOpenEdit(client)}
                              className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            {(currentUser.role === 'Administrator' || currentUser.role === 'Manager') && (
                              <button
                                title="Archive Client (Soft delete)"
                                onClick={() => handleSoftDelete(client.id, fullName)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
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
      )}

      {/* Lost Reason Prompt Modal */}
      {lostReasonPromptId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-gray-200 overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-2 text-rose-600 font-bold">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-base font-serif">
                {language === 'th' ? 'ระบุสาเหตุที่ยกเลิก / ไม่สำเร็จ (Lost Reason)' : 'Mark Lead as Lost'}
              </h3>
            </div>
            <p className="text-xs text-gray-600">
              {language === 'th'
                ? 'โปรดบันทึกเหตุผลเพื่อใช้ในการวิเคราะห์และปรับปรุงอัตราการปิดการขายของทีม'
                : 'Please specify the lost reason to help improve pipeline conversion insights.'}
            </p>
            <input
              type="text"
              autoFocus
              placeholder="e.g. Budget too low, selected other property, unresponsive..."
              value={lostReasonInput}
              onChange={(e) => setLostReasonInput(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setLostReasonPromptId(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                {language === 'th' ? 'ยกเลิก' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => {
                  handleMovePipelineStage(lostReasonPromptId, 'Lost', lostReasonInput.trim() || 'Client canceled');
                  setLostReasonPromptId(null);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs"
              >
                {language === 'th' ? 'ยืนยันสถานะ Lost' : 'Confirm Lost'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. CLIENT DETAIL MODAL                                    */}
      {/* ========================================================= */}
      {detailModalCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-[#0A0C10] to-[#1A1D23] text-white flex items-start justify-between border-b border-gray-800">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-red-600 text-white flex items-center justify-center text-xl font-serif font-bold shadow-md">
                  {(detailModalCustomer.name || 'C').charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-red-400 bg-red-950/60 px-2 py-0.5 rounded border border-red-800/60">
                      {detailModalCustomer.clientCode || detailModalCustomer.customerCode}
                    </span>
                    <span
                      className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${getStatusBadge(
                        detailModalCustomer.status || detailModalCustomer.leadStatus || 'New'
                      )}`}
                    >
                      {detailModalCustomer.status || detailModalCustomer.leadStatus}
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold font-serif mt-1">
                    {detailModalCustomer.name}
                  </h2>
                  {detailModalCustomer.companyName && (
                    <div className="text-sm text-gray-300 flex items-center gap-1.5 mt-0.5">
                      <Building className="w-3.5 h-3.5 text-gray-400" />
                      <span>{detailModalCustomer.companyName}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const c = detailModalCustomer;
                    setDetailModalCustomer(null);
                    handleOpenEdit(c);
                  }}
                  className="p-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                  title="Edit Client"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setDetailModalCustomer(null)}
                  className="p-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-gray-200 bg-gray-50 px-6 text-sm font-medium overflow-x-auto">
              <button
                onClick={() => setDetailTab('overview')}
                className={`py-3 px-4 border-b-2 font-medium transition-colors flex items-center gap-2 ${
                  detailTab === 'overview'
                    ? 'border-red-600 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>{language === 'th' ? 'ข้อมูลทั่วไป' : 'Overview'}</span>
              </button>
              <button
                onClick={() => setDetailTab('properties')}
                className={`py-3 px-4 border-b-2 font-medium transition-colors flex items-center gap-2 ${
                  detailTab === 'properties'
                    ? 'border-red-600 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Building className="w-4 h-4" />
                <span>{language === 'th' ? 'ทรัพย์ที่สนใจ' : 'Properties'}</span>
                <span className="text-xs bg-gray-200 text-gray-700 px-1.5 py-0.2 rounded-full">
                  {detailModalCustomer.linkedProperties?.length || 0}
                </span>
              </button>
              <button
                onClick={() => setDetailTab('viewings')}
                className={`py-3 px-4 border-b-2 font-medium transition-colors flex items-center gap-2 ${
                  detailTab === 'viewings'
                    ? 'border-red-600 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>{language === 'th' ? 'นัดหมายเข้าชม (B24)' : 'Viewings (B24)'}</span>
                <span className="text-xs bg-gray-200 text-gray-700 px-1.5 py-0.2 rounded-full">
                  {detailModalCustomer.viewings?.length || 0}
                </span>
              </button>
              <button
                onClick={() => setDetailTab('contracts')}
                className={`py-3 px-4 border-b-2 font-medium transition-colors flex items-center gap-2 ${
                  detailTab === 'contracts'
                    ? 'border-red-600 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>{language === 'th' ? 'สัญญา & การเงิน (B22/B23)' : 'Contracts & Payments'}</span>
                <span className="text-xs bg-gray-200 text-gray-700 px-1.5 py-0.2 rounded-full">
                  {detailModalCustomer.contracts?.length || 0}
                </span>
              </button>
              <button
                onClick={() => setDetailTab('followups')}
                className={`py-3 px-4 border-b-2 font-medium transition-colors flex items-center gap-2 ${
                  detailTab === 'followups'
                    ? 'border-red-600 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>{language === 'th' ? 'ประวัติ Follow-up' : 'Follow-up History'}</span>
                <span className="text-xs bg-gray-200 text-gray-700 px-1.5 py-0.2 rounded-full">
                  {detailModalCustomer.followUps?.length || 0}
                </span>
              </button>
            </div>

            {/* Tab Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* TAB 1: OVERVIEW */}
              {detailTab === 'overview' && (
                <div className="space-y-6">
                  {/* Info Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Contact Details */}
                    <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-3">
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {language === 'th' ? 'ข้อมูลติดต่อ & สัญชาติ' : 'Contact & Identification'}
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">{language === 'th' ? 'เบอร์โทรศัพท์' : 'Phone'}:</span>
                          <a href={`tel:${detailModalCustomer.phone}`} className="font-semibold text-red-600 hover:underline">
                            {detailModalCustomer.phone}
                          </a>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">Email:</span>
                          <span className="font-medium text-gray-800">{detailModalCustomer.email || '-'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">{language === 'th' ? 'สัญชาติ' : 'Nationality'}:</span>
                          <span className="font-medium text-gray-800">{detailModalCustomer.nationality || 'Thai'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">{language === 'th' ? 'เลขบัตร/พาสปอร์ต' : 'Passport / ID'}:</span>
                          <span className="font-mono text-xs text-gray-800">{detailModalCustomer.idNumber || '-'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Preferences & Requirements */}
                    <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-3">
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {language === 'th' ? 'ความต้องการ & งบประมาณ' : 'Requirements & Budget'}
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">{language === 'th' ? 'ประเภทลูกค้า' : 'Client Type'}:</span>
                          <span className="font-semibold text-gray-800">{detailModalCustomer.clientType || detailModalCustomer.type}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">{language === 'th' ? 'ต้องการ' : 'Intent'}:</span>
                          <span className="font-semibold text-gray-800">{detailModalCustomer.intent || 'Buy'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">{language === 'th' ? 'ประเภททรัพย์' : 'Property Type'}:</span>
                          <span className="font-medium text-gray-800">{detailModalCustomer.propertyType || 'Villa'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">{language === 'th' ? 'ช่วงงบประมาณ' : 'Budget Range'}:</span>
                          <span className="font-semibold text-gray-900">
                            {Number(detailModalCustomer.budgetMin || 0).toLocaleString()} - {Number(detailModalCustomer.budgetMax || 0).toLocaleString()} ฿
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">{language === 'th' ? 'ทำเลที่สนใจ' : 'Preferred Area'}:</span>
                          <span className="font-medium text-gray-800">{detailModalCustomer.preferredLocation || '-'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Agent & Management Bar */}
                  <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
                        {language === 'th' ? 'เอเจนต์ผู้รับผิดชอบ' : 'Assigned Agent'}
                      </div>
                      <div className="text-sm font-bold text-gray-900 mt-1 flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-red-600" />
                        <span>{detailModalCustomer.assignedAgentName || 'Unassigned'}</span>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
                        {language === 'th' ? 'กำหนด Follow-up ถัดไป' : 'Next Follow-up'}
                      </div>
                      <div className="mt-1">{renderFollowUpIndicator(detailModalCustomer.nextFollowUpDate)}</div>
                    </div>

                    {/* Quick schedule viewing CTA */}
                    {onScheduleViewingForCustomer && (
                      <button
                        onClick={() => {
                          onScheduleViewingForCustomer(detailModalCustomer);
                          setDetailModalCustomer(null);
                        }}
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-sm"
                      >
                        <Calendar className="w-4 h-4" />
                        <span>{language === 'th' ? 'นัดหมายพาชมทรัพย์' : 'Book Viewing (B24)'}</span>
                      </button>
                    )}
                  </div>

                  {/* Lead Notes Section */}
                  <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/70 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-red-600" />
                        <span>{language === 'th' ? 'บันทึกความคืบหน้าลีด (Lead Notes)' : 'Lead Notes & Activity Log'}</span>
                      </h4>
                      <span className="text-[11px] text-gray-500">
                        {language === 'th' ? 'บันทึกพร้อมผู้เขียนและเวลา' : 'Timestamped & logged with author'}
                      </span>
                    </div>

                    {/* Add new lead note */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder={
                          language === 'th'
                            ? 'พิมพ์บันทึกความคืบหน้าของลีดนี้... (เช่น ลูกค้าสนใจลดราคา 5%, นัดคุยเพิ่มเติม)'
                            : 'Add a new lead note (e.g., Client requested 5% discount, follow-up scheduled)...'
                        }
                        value={newLeadNote}
                        onChange={(e) => setNewLeadNote(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddLeadNote();
                          }
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                      <button
                        type="button"
                        onClick={handleAddLeadNote}
                        disabled={!newLeadNote.trim()}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors shrink-0"
                      >
                        {language === 'th' ? 'บันทึก Note' : 'Add Note'}
                      </button>
                    </div>

                    {/* Display existing notes */}
                    {detailModalCustomer.notes ? (
                      <div className="p-3 bg-white rounded-lg border border-gray-200 text-xs text-gray-800 whitespace-pre-line max-h-48 overflow-y-auto font-sans leading-relaxed">
                        {detailModalCustomer.notes}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 italic">
                        {language === 'th' ? 'ยังไม่มีบันทึกสำหรับลีดนี้' : 'No lead notes recorded yet.'}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: LINKED PROPERTIES */}
              {detailTab === 'properties' && (
                <div className="space-y-6">
                  {/* Link Property Input Form */}
                  <div className="p-4 rounded-xl border border-gray-200 bg-gray-50 space-y-3">
                    <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                      <LinkIcon className="w-3.5 h-3.5 text-red-600" />
                      <span>{language === 'th' ? 'เชื่อมโยงอสังหาริมทรัพย์ที่ลูกค้าสนใจ' : 'Link Property of Interest'}</span>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <select
                          value={selectedPropToLink}
                          onChange={(e) => setSelectedPropToLink(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                        >
                          <option value="">{language === 'th' ? '-- เลือกทรัพย์จากสต็อก --' : '-- Select property from stock --'}</option>
                          {properties.map((p) => (
                            <option key={p.propertyId || p.id} value={p.propertyId}>
                              [{p.propertyId}] {p.title} — {Number(p.price || p.rentPrice || 0).toLocaleString()} ฿ ({p.status})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <button
                          disabled={!selectedPropToLink}
                          onClick={handleLinkProperty}
                          className="w-full h-full py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
                        >
                          {language === 'th' ? 'เพิ่มทรัพย์ที่สนใจ' : 'Add Property'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Linked Properties List */}
                  <div className="space-y-3">
                    {(!detailModalCustomer.linkedProperties || detailModalCustomer.linkedProperties.length === 0) ? (
                      <div className="text-center py-8 text-gray-400">
                        <Building className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                        <p className="text-sm font-medium">{language === 'th' ? 'ยังไม่ได้เชื่อมโยงทรัพย์ที่สนใจ' : 'No linked properties yet'}</p>
                      </div>
                    ) : (
                      detailModalCustomer.linkedProperties.map((link) => (
                        <div
                          key={link.id}
                          className="p-4 rounded-xl border border-gray-200 bg-white hover:border-gray-300 transition-all flex items-center justify-between gap-4 shadow-sm"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100">
                                {link.propertyCustomId || link.propertyId}
                              </span>
                              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-700">
                                {link.category || 'Property'}
                              </span>
                              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                {link.status || 'Available'}
                              </span>
                            </div>
                            <h5 className="font-semibold text-gray-900 text-sm">{link.propertyTitle}</h5>
                            <div className="text-xs text-gray-500 flex items-center gap-3">
                              {link.area && <span>{link.area}</span>}
                              {link.price ? <span>Sale: {Number(link.price).toLocaleString()} ฿</span> : null}
                              {link.rentPrice ? <span>Rent: {Number(link.rentPrice).toLocaleString()} ฿/mo</span> : null}
                            </div>
                          </div>

                          <button
                            title="Unlink property"
                            onClick={() => handleUnlinkProperty(link.propertyId)}
                            className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Unlink className="w-4 h-4" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: VIEWINGS FROM B24 */}
              {detailTab === 'viewings' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {language === 'th' ? 'ประวัติการนัดหมายเข้าชม (เชื่อมจากระบบ B24)' : 'Viewing Appointments (Linked from B24)'}
                    </h4>
                  </div>

                  {(!detailModalCustomer.viewings || detailModalCustomer.viewings.length === 0) ? (
                    <div className="text-center py-8 text-gray-400">
                      <Calendar className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                      <p className="text-sm font-medium">{language === 'th' ? 'ไม่พบนัดหมายพาชมทรัพย์' : 'No viewing records found'}</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {detailModalCustomer.viewings.map((v: any) => (
                        <div
                          key={v.id}
                          className="p-4 rounded-xl border border-gray-200 bg-white space-y-2 shadow-sm"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100">
                                {v.viewingCode}
                              </span>
                              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800">
                                {v.status}
                              </span>
                            </div>
                            <span className="text-xs font-medium text-gray-500">{v.dateTime}</span>
                          </div>

                          <div className="font-semibold text-gray-900 text-sm">
                            {v.propertyTitle} ({v.propertyCustomId || v.propertyId})
                          </div>

                          <div className="text-xs text-gray-600 flex items-center justify-between">
                            <span>Agent: <strong>{v.agentName}</strong></span>
                            {v.location && <span>Location: {v.location}</span>}
                          </div>

                          {v.feedback && (
                            <div className="text-xs text-gray-700 bg-gray-50 p-2 rounded border border-gray-100 italic">
                              "{v.feedback}"
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: CONTRACTS & PAYMENTS */}
              {detailTab === 'contracts' && (
                <div className="space-y-6">
                  {/* Contracts */}
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                      {language === 'th' ? 'สัญญาที่เกี่ยวข้อง (เชื่อมจากระบบ B22)' : 'Related Contracts (Linked from B22)'}
                    </h4>

                    {(!detailModalCustomer.contracts || detailModalCustomer.contracts.length === 0) ? (
                      <div className="text-center py-6 text-gray-400 border border-dashed rounded-xl">
                        <FileText className="w-8 h-8 mx-auto text-gray-300 mb-1" />
                        <p className="text-xs font-medium">{language === 'th' ? 'ไม่มีสัญญาที่เชื่อมโยง' : 'No contracts linked'}</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {detailModalCustomer.contracts.map((cnt: any) => (
                          <div
                            key={cnt.id}
                            className="p-4 rounded-xl border border-gray-200 bg-white space-y-2 shadow-sm"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100">
                                  {cnt.contractId || cnt.contractNo}
                                </span>
                                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                                  {cnt.status}
                                </span>
                              </div>
                              <span className="text-xs font-semibold text-gray-800">
                                {Number(cnt.monthlyRent || cnt.totalPrice || 0).toLocaleString()} ฿
                              </span>
                            </div>

                            <div className="font-semibold text-gray-900 text-sm">
                              {cnt.projectEn || cnt.propertyId} ({cnt.contractType})
                            </div>

                            <div className="text-xs text-gray-500 flex items-center justify-between">
                              <span>Term: {cnt.rentalStart} → {cnt.rentalEnd}</span>
                              <span>Agent: {cnt.salesName || cnt.agent}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Payment Records from B23 */}
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                      {language === 'th' ? 'ประวัติการชำระเงิน (เชื่อมจากระบบ B23)' : 'Payment History (Linked from B23)'}
                    </h4>

                    {(!detailModalCustomer.payments || detailModalCustomer.payments.length === 0) ? (
                      <div className="text-center py-6 text-gray-400 border border-dashed rounded-xl">
                        <CreditCard className="w-8 h-8 mx-auto text-gray-300 mb-1" />
                        <p className="text-xs font-medium">{language === 'th' ? 'ไม่มีประวัติการชำระเงิน' : 'No payment records found'}</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {detailModalCustomer.payments.map((p: any) => (
                          <div
                            key={p.id}
                            className="p-3.5 rounded-xl border border-gray-200 bg-white flex items-center justify-between text-xs"
                          >
                            <div>
                              <div className="font-semibold text-gray-900">{p.title}</div>
                              <div className="text-gray-500">Due: {p.dueDate}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-gray-900">{Number(p.amount).toLocaleString()} ฿</div>
                              <span
                                className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                  p.status === 'Paid'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {p.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 5: FOLLOW-UP TIMELINE */}
              {detailTab === 'followups' && (
                <div className="space-y-6">
                  {/* Add New Follow-up Box */}
                  <div className="p-4 rounded-xl border border-gray-200 bg-gray-50 space-y-3">
                    <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                      <Plus className="w-3.5 h-3.5 text-red-600" />
                      <span>{language === 'th' ? 'บันทึกการติดตามลูกค้า (Follow-up Note)' : 'Add Follow-up'}</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          {language === 'th' ? 'หัวข้องานติดตาม' : 'Task Title'}
                        </label>
                        <input
                          type="text"
                          placeholder={language === 'th' ? 'เช่น โทรติดตามสัญญาเช่า, นัดพาชม...' : 'e.g. Call to discuss proposal...'}
                          value={newFollowUpTitle}
                          onChange={(e) => setNewFollowUpTitle(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          {language === 'th' ? 'ระดับความสำคัญ' : 'Priority'}
                        </label>
                        <select
                          value={newFollowUpPriority}
                          onChange={(e) => setNewFollowUpPriority(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                        >
                          <option value="Normal">Normal</option>
                          <option value="High">High</option>
                          <option value="Urgent">Urgent</option>
                          <option value="Low">Low</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          {language === 'th' ? 'วันที่ต้องติดตาม *' : 'Follow-up Date *'}
                        </label>
                        <input
                          type="date"
                          value={newFollowUpDate}
                          onChange={(e) => setNewFollowUpDate(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          {language === 'th' ? 'เวลา' : 'Time'}
                        </label>
                        <input
                          type="time"
                          value={newFollowUpTime}
                          onChange={(e) => setNewFollowUpTime(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          {language === 'th' ? 'เอเจนต์ผู้รับผิดชอบ' : 'Assigned Agent'}
                        </label>
                        <select
                          value={newFollowUpAgent}
                          onChange={(e) => setNewFollowUpAgent(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                        >
                          {users.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <textarea
                        rows={2}
                        placeholder={
                          language === 'th'
                            ? 'รายละเอียดการพูดคุย หรือสิ่งที่ต้องดำเนินการต่อไป...'
                            : 'Follow-up note or next steps...'
                        }
                        value={newFollowUpNote}
                        onChange={(e) => setNewFollowUpNote(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                      />
                    </div>

                    <div className="flex justify-end">
                      <button
                        onClick={handleAddFollowUp}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
                      >
                        {language === 'th' ? 'บันทึก Follow-up' : 'Save Follow-up'}
                      </button>
                    </div>
                  </div>

                  {/* Follow-up History */}
                  <div className="space-y-3">
                    {(!detailModalCustomer.followUps || detailModalCustomer.followUps.length === 0) ? (
                      <div className="text-center py-8 text-gray-400">
                        <Clock className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                        <p className="text-sm font-medium">{language === 'th' ? 'ยังไม่มีประวัติ Follow-up' : 'No follow-up history yet'}</p>
                      </div>
                    ) : (
                      detailModalCustomer.followUps.map((fu: any) => {
                        const isCompleted = fu.status === 'Completed';
                        const isCancelled = fu.status === 'Cancelled';
                        const isManagerOrAdmin = currentUser.role === 'Admin' || currentUser.role === 'Manager' || currentUser.role === 'Administrator';

                        return (
                          <div
                            key={fu.id}
                            className={`p-4 rounded-xl border transition-all ${
                              isCompleted
                                ? 'bg-gray-50 border-gray-200 opacity-80'
                                : isCancelled
                                ? 'bg-slate-50 border-slate-200 opacity-70'
                                : 'bg-white border-amber-200 shadow-sm'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                    isCompleted
                                      ? 'bg-green-100 text-green-800'
                                      : isCancelled
                                      ? 'bg-slate-200 text-slate-700'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {fu.status}
                                </span>
                                <span className="font-semibold text-xs text-gray-900">{fu.followUpDate}</span>
                                {fu.followUpTime && (
                                  <span className="text-xs text-gray-500">@{fu.followUpTime}</span>
                                )}
                                {fu.priority && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">
                                    {fu.priority}
                                  </span>
                                )}
                                {fu.title && (
                                  <span className="font-bold text-xs text-gray-800">— {fu.title}</span>
                                )}
                              </div>

                              <div className="flex items-center gap-1.5">
                                {!isCompleted && !isCancelled && (
                                  <>
                                    <button
                                      onClick={() => handleCompleteFollowUp(fu.id)}
                                      className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 transition-colors"
                                      title="Mark completed"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                      <span>{language === 'th' ? 'เสร็จสิ้น' : 'Complete'}</span>
                                    </button>

                                    <button
                                      onClick={() => handleCancelFollowUp(fu.id)}
                                      className="text-xs font-semibold text-rose-700 hover:text-rose-800 flex items-center gap-1 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 transition-colors"
                                      title="Cancel task"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                      <span>{language === 'th' ? 'ยกเลิก' : 'Cancel'}</span>
                                    </button>
                                  </>
                                )}

                                {isManagerOrAdmin && (
                                  <button
                                    onClick={() => handleDeleteFollowUp(fu.id)}
                                    className="p-1 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                    title="Delete follow-up (Soft delete)"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>

                            <p className="text-sm text-gray-800 whitespace-pre-line">{fu.followUpNote}</p>

                            {isCancelled && fu.cancelReason && (
                              <div className="mt-1.5 text-xs text-rose-700 bg-rose-50 p-2 rounded border border-rose-100">
                                <strong>{language === 'th' ? 'เหตุผลยกเลิก: ' : 'Cancel Reason: '}</strong>{fu.cancelReason}
                              </div>
                            )}

                            <div className="text-xs text-gray-500 mt-2 flex items-center justify-between">
                              <span>By: <strong>{fu.assignedAgentName}</strong></span>
                              {fu.completedAt && (
                                <span className="text-[11px] text-green-700">Completed: {new Date(fu.completedAt).toLocaleDateString()}</span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
              <span className="text-xs text-gray-500">
                Created: {detailModalCustomer.createdAt ? new Date(detailModalCustomer.createdAt).toLocaleDateString() : '-'}
              </span>
              <button
                onClick={() => setDetailModalCustomer(null)}
                className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg text-xs font-semibold transition-colors"
              >
                {language === 'th' ? 'ปิดหน้าต่าง' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. CREATE / EDIT CLIENT MODAL                             */}
      {/* ========================================================= */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-200 overflow-hidden my-8">
            <div className="p-5 bg-gradient-to-r from-[#0A0C10] to-[#1A1D23] text-white flex items-center justify-between border-b border-gray-800">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-red-500" />
                <h3 className="text-lg font-bold font-serif">
                  {editingCustomer
                    ? language === 'th'
                      ? 'แก้ไขข้อมูลลูกค้า'
                      : 'Edit Client'
                    : language === 'th'
                    ? 'ลงทะเบียนลูกค้าใหม่'
                    : 'Register New Client'}
                </h3>
              </div>
              <button
                onClick={() => setEditModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-white rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Names */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    {language === 'th' ? 'ชื่อจริง' : 'First Name'} *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Alexander"
                    value={formData.firstName || ''}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    {language === 'th' ? 'นามสกุล' : 'Last Name'}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ivanov"
                    value={formData.lastName || ''}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              {/* Company & Nationality */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    {language === 'th' ? 'ชื่อบริษัท (ถ้ามี)' : 'Company Name (Optional)'}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Peak Capital Ltd."
                    value={formData.companyName || ''}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    {language === 'th' ? 'สัญชาติ' : 'Nationality'}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Thai, Russian, French, Australian"
                    value={formData.nationality || ''}
                    onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              {/* Phone & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    {language === 'th' ? 'เบอร์โทรศัพท์' : 'Phone Number'} *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 081-234-5678"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="e.g. client@example.com"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              {/* Passport / ID & Client Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    {language === 'th' ? 'เลขบัตรประชาชน / พาสปอร์ต' : 'Passport / ID Number'}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 1-8399-xxxx or PA-xxxx"
                    value={formData.idNumber || ''}
                    onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    {language === 'th' ? 'ประเภทลูกค้า' : 'Client Type'}
                  </label>
                  <select
                    value={formData.clientType || 'Buyer'}
                    onChange={(e) => setFormData({ ...formData, clientType: e.target.value as CustomerType })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-red-500"
                  >
                    {clientTypes.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Intent & Property Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    {language === 'th' ? 'ความต้องการ (ซื้อ / เช่า)' : 'Intent (Buy / Rent / Both)'}
                  </label>
                  <select
                    value={formData.intent || 'Buy'}
                    onChange={(e) => setFormData({ ...formData, intent: e.target.value as ClientIntent })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-red-500"
                  >
                    <option value="Buy">Buy (ซื้อ)</option>
                    <option value="Rent">Rent (เช่า)</option>
                    <option value="Both">Both (ทั้งซื้อและเช่า)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    {language === 'th' ? 'ประเภททรัพย์ที่สนใจ' : 'Property Type'}
                  </label>
                  <select
                    value={formData.propertyType || 'Villa'}
                    onChange={(e) => setFormData({ ...formData, propertyType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-red-500"
                  >
                    <option value="Villa">Villa (พูลวิลล่า)</option>
                    <option value="Condo">Condo (คอนโดมิเนียม)</option>
                    <option value="House">House (บ้านเดี่ยว/ทาวน์เฮ้าส์)</option>
                    <option value="Land">Land (ที่ดิน)</option>
                    <option value="Commercial">Commercial (เชิงพาณิชย์)</option>
                  </select>
                </div>
              </div>

              {/* Budget Min & Max */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    {language === 'th' ? 'งบประมาณขั้นต่ำ (THB)' : 'Budget Min (THB)'}
                  </label>
                  <input
                    type="number"
                    value={formData.budgetMin || 0}
                    onChange={(e) => setFormData({ ...formData, budgetMin: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    {language === 'th' ? 'งบประมาณสูงสุด (THB)' : 'Budget Max (THB)'}
                  </label>
                  <input
                    type="number"
                    value={formData.budgetMax || 0}
                    onChange={(e) => setFormData({ ...formData, budgetMax: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              {/* Preferred Location */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  {language === 'th' ? 'ทำเลที่สนใจ' : 'Preferred Location / Area'}
                </label>
                <input
                  type="text"
                  placeholder="e.g. Kamala, Bang Tao, Rawai, Patong"
                  value={formData.preferredLocation || ''}
                  onChange={(e) => setFormData({ ...formData, preferredLocation: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                />
              </div>

              {/* Assigned Agent, Status & Lead Source */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    {language === 'th' ? 'เอเจนต์ผู้รับผิดชอบ' : 'Assigned Agent'}
                  </label>
                  <select
                    value={formData.assignedAgentId || currentUser.id}
                    onChange={(e) => {
                      const u = users.find((x) => x.id === e.target.value);
                      setFormData({
                        ...formData,
                        assignedAgentId: e.target.value,
                        assignedAgentName: u ? u.name : currentUser.name,
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-red-500"
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    {language === 'th' ? 'สถานะไปป์ไลน์' : 'Pipeline Stage'}
                  </label>
                  <select
                    value={formData.status || 'New'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as ClientStatus })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-red-500"
                  >
                    {clientStatuses.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    {language === 'th' ? 'ที่มาของลีด (Lead Source)' : 'Lead Source'}
                  </label>
                  <select
                    value={formData.leadSource || 'Website'}
                    onChange={(e) => setFormData({ ...formData, leadSource: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-red-500"
                  >
                    {leadSources.map((ls) => (
                      <option key={ls.id} value={ls.id}>
                        {ls.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Lost Reason if status is Lost */}
              {formData.status === 'Lost' && (
                <div>
                  <label className="block text-xs font-semibold text-rose-700 mb-1">
                    {language === 'th' ? 'สาเหตุที่ไม่สำเร็จ / ยกเลิก (Lost Reason)' : 'Lost Reason'} *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Budget out of range, bought elsewhere, unresponsive"
                    value={formData.lostReason || ''}
                    onChange={(e) => setFormData({ ...formData, lostReason: e.target.value })}
                    className="w-full px-3 py-2 border border-rose-300 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 bg-rose-50/30"
                  />
                </div>
              )}

              {/* Follow-up Date */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  {language === 'th' ? 'วันนัดหมายติดตามผล (Follow-up Date)' : 'Follow-up Date'}
                </label>
                <input
                  type="date"
                  value={formData.nextFollowUpDate || ''}
                  onChange={(e) => setFormData({ ...formData, nextFollowUpDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  {language === 'th' ? 'บันทึกเพิ่มเติม' : 'Notes'}
                </label>
                <textarea
                  rows={3}
                  placeholder={
                    language === 'th'
                      ? 'บันทึกรายละเอียดความต้องการพิเศษของลูกค้า...'
                      : 'Client preferences, notes...'
                  }
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  {language === 'th' ? 'ยกเลิก' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-lg text-sm font-semibold shadow-md transition-all"
                >
                  {editingCustomer
                    ? language === 'th'
                      ? 'บันทึกการแก้ไข'
                      : 'Update Client'
                    : language === 'th'
                    ? 'ลงทะเบียนลูกค้า'
                    : 'Register Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
