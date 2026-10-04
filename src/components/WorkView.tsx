import React, { useState, useEffect, useCallback } from 'react';
import { WorkTask, Viewing, Contract, MaintenanceIssue, User, FollowUpTask, FollowUpStatus, FollowUpPriority } from '../types';
import { translations, Language } from '../lib/i18n';
import {
  CheckSquare,
  Plus,
  Clock,
  AlertTriangle,
  CalendarDays,
  FileText,
  Wrench,
  CheckCircle2,
  Filter,
  ArrowRight,
  User as UserIcon,
  Tag,
  Search,
  Check,
  X,
  Edit,
  Trash2,
  Phone,
  Calendar,
  RefreshCw,
  Eye,
  MessageSquare,
  AlertCircle,
  Building2,
  SlidersHorizontal,
  ChevronRight,
  Ban
} from 'lucide-react';

interface WorkViewProps {
  tasks: WorkTask[];
  viewings: Viewing[];
  contracts: Contract[];
  issues: MaintenanceIssue[];
  currentUser: User;
  users: User[];
  language: Language;
  onToggleTask: (id: string) => void;
  onAddTask: (task: WorkTask) => void;
  onNavigate: (tab: string, filter?: string) => void;
}

export function WorkView({
  tasks,
  viewings,
  contracts,
  issues,
  currentUser,
  users,
  language,
  onToggleTask,
  onAddTask,
  onNavigate,
}: WorkViewProps) {
  const t = translations[language];

  // Subtabs
  const [activeTab, setActiveTab] = useState<'followups' | 'agenda'>('followups');

  // Follow-up state from PostgreSQL backend
  const [followUps, setFollowUps] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({
    total: 0,
    pending: 0,
    completed: 0,
    cancelled: 0,
    overdue: 0,
    dueToday: 0,
    upcoming: 0,
  });

  // Filters for Follow-ups
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [timeframeFilter, setTimeframeFilter] = useState<string>('all');
  const [agentFilter, setAgentFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  // Customer dropdown list for creating new follow-up
  const [clientsList, setClientsList] = useState<any[]>([]);

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalTask, setEditModalTask] = useState<any | null>(null);
  const [cancelModalTask, setCancelModalTask] = useState<any | null>(null);
  const [cancelReasonText, setCancelReasonText] = useState('');
  const [detailModalTask, setDetailModalTask] = useState<any | null>(null);

  // Form State for Create/Edit
  const [formClientId, setFormClientId] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formTime, setFormTime] = useState('10:00');
  const [formPriority, setFormPriority] = useState<FollowUpPriority>('Normal');
  const [formAgentId, setFormAgentId] = useState(currentUser.id);
  const [formNote, setFormNote] = useState('');

  // Daily checklist state
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showCompleted, setShowCompleted] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState<string>('Follow-up');
  const [newTaskPriority, setNewTaskPriority] = useState<'Normal' | 'High' | 'Urgent'>('Normal');
  const [isAddingChecklist, setIsAddingChecklist] = useState(false);

  // Expiring contracts & operational alerts
  const expiringContracts = contracts.filter((c) => c.status === 'Expiring Soon');
  const todayViewings = viewings.filter((v) => v.status !== 'Cancelled');
  const urgentIssues = issues.filter((i) => i.priority === 'Urgent' || i.priority === 'High');

  // Fetch Follow-ups from PostgreSQL
  const fetchFollowUps = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (searchTerm.trim()) queryParams.set('search', searchTerm.trim());
      if (statusFilter !== 'all') queryParams.set('status', statusFilter);
      if (timeframeFilter !== 'all') queryParams.set('timeframe', timeframeFilter);
      if (agentFilter !== 'all') queryParams.set('assignedAgentId', agentFilter);
      if (priorityFilter !== 'all') queryParams.set('priority', priorityFilter);
      queryParams.set('limit', '100');

      const res = await fetch(`/api/follow-ups?${queryParams.toString()}`, {
        headers: {
          'x-user-role': currentUser.role,
          'x-user-id': currentUser.id,
          'x-user-name': encodeURIComponent(currentUser.name),
        },
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setFollowUps(json.data || []);
          if (json.summary) {
            setSummary(json.summary);
          }
        }
      }
    } catch (e) {
      console.error('Failed to fetch follow-ups:', e);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, timeframeFilter, agentFilter, priorityFilter, currentUser]);

  // Fetch clients for dropdown selector
  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch('/api/clients?limit=150', {
        headers: {
          'x-user-role': currentUser.role,
          'x-user-id': currentUser.id,
          'x-user-name': encodeURIComponent(currentUser.name),
        },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setClientsList(json.data);
          if (json.data.length > 0 && !formClientId) {
            setFormClientId(json.data[0].id);
          }
        }
      }
    } catch (e) {
      console.warn('Could not load clients list for follow-up:', e);
    }
  }, [currentUser, formClientId]);

  useEffect(() => {
    fetchFollowUps();
  }, [fetchFollowUps]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // Handle Create Follow-up
  const handleCreateFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formClientId) {
      alert(language === 'th' ? 'กรุณาเลือกลูกค้า / ลีด' : 'Please select a client/lead');
      return;
    }
    if (!formNote.trim()) {
      alert(language === 'th' ? 'กรุณาระบุรายละเอียดการติดตาม' : 'Please enter follow-up notes');
      return;
    }

    const assignedAgent = users.find((u) => u.id === formAgentId) || currentUser;

    try {
      const res = await fetch('/api/follow-ups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentUser.role,
          'x-user-id': currentUser.id,
          'x-user-name': encodeURIComponent(currentUser.name),
        },
        body: JSON.stringify({
          clientId: formClientId,
          title: formTitle.trim() || formNote.trim().slice(0, 50),
          followUpDate: formDate,
          followUpTime: formTime,
          followUpNote: formNote.trim(),
          notes: formNote.trim(),
          priority: formPriority,
          assignedAgentId: assignedAgent.id,
          assignedAgentName: assignedAgent.name,
          status: 'Pending',
        }),
      });

      if (res.ok) {
        setCreateModalOpen(false);
        setFormTitle('');
        setFormNote('');
        fetchFollowUps();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Error creating task: ${err.error || 'Failed'}`);
      }
    } catch (e: any) {
      console.error('Error creating follow-up task:', e);
      alert(e.message);
    }
  };

  // Handle Edit Follow-up
  const handleOpenEdit = (task: any) => {
    setEditModalTask(task);
    setFormTitle(task.title || '');
    setFormDate(task.followUpDate || new Date().toISOString().slice(0, 10));
    setFormTime(task.followUpTime || '10:00');
    setFormPriority(task.priority || 'Normal');
    setFormAgentId(task.assignedAgentId || currentUser.id);
    setFormNote(task.followUpNote || task.notes || '');
  };

  const handleUpdateFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModalTask) return;

    const assignedAgent = users.find((u) => u.id === formAgentId) || currentUser;

    try {
      const res = await fetch(`/api/follow-ups/${editModalTask.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentUser.role,
          'x-user-id': currentUser.id,
          'x-user-name': encodeURIComponent(currentUser.name),
        },
        body: JSON.stringify({
          title: formTitle.trim(),
          followUpDate: formDate,
          followUpTime: formTime,
          followUpNote: formNote.trim(),
          notes: formNote.trim(),
          priority: formPriority,
          assignedAgentId: assignedAgent.id,
          assignedAgentName: assignedAgent.name,
        }),
      });

      if (res.ok) {
        setEditModalTask(null);
        fetchFollowUps();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Error updating task: ${err.error || 'Failed'}`);
      }
    } catch (e: any) {
      console.error('Error updating task:', e);
      alert(e.message);
    }
  };

  // Complete Follow-up
  const handleCompleteTask = async (taskId: string) => {
    try {
      const res = await fetch(`/api/clients/follow-ups/${taskId}/complete`, {
        method: 'PATCH',
        headers: {
          'x-user-role': currentUser.role,
          'x-user-id': currentUser.id,
          'x-user-name': encodeURIComponent(currentUser.name),
        },
      });

      if (res.ok) {
        fetchFollowUps();
      }
    } catch (e) {
      console.error('Error completing task:', e);
    }
  };

  // Cancel Follow-up
  const handleCancelTask = async () => {
    if (!cancelModalTask) return;
    try {
      const res = await fetch(`/api/follow-ups/${cancelModalTask.id}/cancel`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentUser.role,
          'x-user-id': currentUser.id,
          'x-user-name': encodeURIComponent(currentUser.name),
        },
        body: JSON.stringify({
          reason: cancelReasonText.trim() || 'Cancelled by agent/manager',
        }),
      });

      if (res.ok) {
        setCancelModalTask(null);
        setCancelReasonText('');
        fetchFollowUps();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Error cancelling task: ${err.error || 'Failed'}`);
      }
    } catch (e: any) {
      console.error('Error cancelling task:', e);
    }
  };

  // Soft Delete Follow-up
  const handleDeleteTask = async (task: any) => {
    const isManagerOrAdmin = currentUser.role === 'Admin' || currentUser.role === 'Manager' || currentUser.role === 'Administrator';
    if (!isManagerOrAdmin) {
      alert(language === 'th' ? 'สิทธิ์ไม่เพียงพอ: เฉพาะผู้จัดการฝ่ายขายหรือแอดมินเท่านั้นที่สามารถลบ Task ได้' : 'Forbidden: Only Administrators or Managers can delete tasks.');
      return;
    }

    const confirmMsg = language === 'th'
      ? `คุณต้องการลบ Task ติดตามงาน "${task.title || task.followUpNote.slice(0, 30)}" หรือไม่? (Soft delete)`
      : `Are you sure you want to delete follow-up task "${task.title || task.followUpNote.slice(0, 30)}"?`;

    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/follow-ups/${task.id}`, {
        method: 'DELETE',
        headers: {
          'x-user-role': currentUser.role,
          'x-user-id': currentUser.id,
          'x-user-name': encodeURIComponent(currentUser.name),
        },
      });

      if (res.ok) {
        fetchFollowUps();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Error deleting task: ${err.error || 'Failed'}`);
      }
    } catch (e: any) {
      console.error('Error deleting task:', e);
    }
  };

  // View Task Details
  const handleOpenDetail = async (task: any) => {
    try {
      const res = await fetch(`/api/follow-ups/${task.id}`, {
        headers: {
          'x-user-role': currentUser.role,
          'x-user-id': currentUser.id,
          'x-user-name': encodeURIComponent(currentUser.name),
        },
      });
      if (res.ok) {
        const json = await res.json();
        setDetailModalTask(json.followUp || task);
      } else {
        setDetailModalTask(task);
      }
    } catch {
      setDetailModalTask(task);
    }
  };

  // Daily Checklist handlers
  const handleCreateChecklistTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const task: WorkTask = {
      id: `task-${Date.now()}`,
      title: newTaskTitle.trim(),
      dueDate: new Date().toISOString().slice(0, 10),
      priority: newTaskPriority,
      status: 'Pending',
      category: newTaskCategory as any,
      assignedToId: currentUser.id,
      assignedToName: currentUser.name,
    };

    onAddTask(task);
    setNewTaskTitle('');
    setIsAddingChecklist(false);
  };

  const filteredChecklistTasks = tasks.filter((t) => {
    const matchCat = categoryFilter === 'all' || t.category === categoryFilter;
    const matchDone = showCompleted ? true : t.status !== 'Completed';
    return matchCat && matchDone;
  });

  const isManagerOrAdmin = currentUser.role === 'Admin' || currentUser.role === 'Manager' || currentUser.role === 'Administrator';

  return (
    <div className="space-y-6 w-full pb-12 animate-in fade-in duration-200">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-red-50 text-red-600 border border-red-100">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-serif text-slate-900 tracking-tight">
                {language === 'th' ? 'ระบบติดตามงาน & วาระงาน (Follow-up Operations)' : 'Follow-up & Task Operations'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {language === 'th'
                  ? 'ระบบจัดการการติดตามลูกค้า นัดหมายสำคัญ และตารางภารกิจประจำวัน (B27 CRM)'
                  : 'Customer follow-up workflow, client appointments, and operational daily deliverables'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {activeTab === 'followups' ? (
            <button
              onClick={() => {
                setFormClientId(clientsList[0]?.id || '');
                setFormTitle('');
                setFormDate(new Date().toISOString().slice(0, 10));
                setFormTime('10:00');
                setFormPriority('Normal');
                setFormAgentId(currentUser.id);
                setFormNote('');
                setCreateModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-700 via-red-600 to-rose-600 text-white text-xs font-semibold shadow-md hover:from-red-800 hover:to-rose-700 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>{language === 'th' ? '+ สร้าง Follow-up Task' : '+ New Follow-up Task'}</span>
            </button>
          ) : (
            <button
              onClick={() => setIsAddingChecklist(!isAddingChecklist)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold shadow-md hover:bg-slate-800 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>{language === 'th' ? '+ เพิ่มเช็กลิสต์ด่วน' : '+ Add Quick Checklist'}</span>
            </button>
          )}

          <button
            onClick={() => fetchFollowUps()}
            className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Primary Sub-Navigation Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('followups')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold transition-all border-b-2 ${
            activeTab === 'followups'
              ? 'border-red-600 text-red-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>{language === 'th' ? 'งานติดตามลูกค้า (Follow-up Tasks)' : 'Client Follow-ups'}</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${
            activeTab === 'followups' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
          }`}>
            {summary.pending}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('agenda')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold transition-all border-b-2 ${
            activeTab === 'agenda'
              ? 'border-red-600 text-red-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          <span>{language === 'th' ? 'วาระงานและเช็กลิสต์ (Agenda & Checklist)' : 'Agenda & Checklist'}</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-600">
            {tasks.filter(t => t.status !== 'Completed').length}
          </span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* SUBTAB 1: CLIENT FOLLOW-UP TASKS (B27)                     */}
      {/* ========================================================= */}
      {activeTab === 'followups' && (
        <div className="space-y-6">
          {/* Follow-up Metric KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Total Active */}
            <div
              onClick={() => { setStatusFilter('all'); setTimeframeFilter('all'); }}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                statusFilter === 'all' && timeframeFilter === 'all'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                  : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="text-[11px] opacity-75 font-medium">{language === 'th' ? 'ทั้งหมด' : 'All Tasks'}</div>
              <div className="text-xl font-bold mt-1">{summary.total}</div>
            </div>

            {/* Pending */}
            <div
              onClick={() => { setStatusFilter('Pending'); setTimeframeFilter('all'); }}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                statusFilter === 'Pending' && timeframeFilter === 'all'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                  : 'bg-white text-slate-800 border-blue-200 hover:border-blue-300'
              }`}
            >
              <div className="text-[11px] font-medium text-blue-500">{language === 'th' ? 'รอดำเนินการ' : 'Pending'}</div>
              <div className="text-xl font-bold mt-1 text-blue-600">{summary.pending}</div>
            </div>

            {/* Due Today */}
            <div
              onClick={() => { setStatusFilter('Pending'); setTimeframeFilter('today'); }}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                timeframeFilter === 'today'
                  ? 'bg-amber-500 text-white border-amber-500 shadow-md'
                  : 'bg-white text-slate-800 border-amber-200 hover:border-amber-300'
              }`}
            >
              <div className="text-[11px] font-medium text-amber-600">{language === 'th' ? 'ครบกำหนดวันนี้' : 'Due Today'}</div>
              <div className="text-xl font-bold mt-1 text-amber-600">{summary.dueToday}</div>
            </div>

            {/* Overdue */}
            <div
              onClick={() => { setStatusFilter('Pending'); setTimeframeFilter('overdue'); }}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                timeframeFilter === 'overdue'
                  ? 'bg-red-600 text-white border-red-600 shadow-md'
                  : 'bg-white text-slate-800 border-red-200 hover:border-red-300'
              }`}
            >
              <div className="text-[11px] font-medium text-red-500">{language === 'th' ? 'เกินกำหนด' : 'Overdue'}</div>
              <div className="text-xl font-bold mt-1 text-red-600">{summary.overdue}</div>
            </div>

            {/* Completed */}
            <div
              onClick={() => { setStatusFilter('Completed'); setTimeframeFilter('all'); }}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                statusFilter === 'Completed'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                  : 'bg-white text-slate-800 border-emerald-200 hover:border-emerald-300'
              }`}
            >
              <div className="text-[11px] font-medium text-emerald-600">{language === 'th' ? 'เสร็จสิ้นแล้ว' : 'Completed'}</div>
              <div className="text-xl font-bold mt-1 text-emerald-600">{summary.completed}</div>
            </div>

            {/* Cancelled */}
            <div
              onClick={() => { setStatusFilter('Cancelled'); setTimeframeFilter('all'); }}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                statusFilter === 'Cancelled'
                  ? 'bg-slate-700 text-white border-slate-700 shadow-md'
                  : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="text-[11px] font-medium text-slate-500">{language === 'th' ? 'ยกเลิก' : 'Cancelled'}</div>
              <div className="text-xl font-bold mt-1 text-slate-600">{summary.cancelled}</div>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs">
              {/* Search Box */}
              <div className="md:col-span-4 relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder={language === 'th' ? 'ค้นหาชื่อลูกค้า, รหัส, ข้อความ หรือชื่อเอเจนต์...' : 'Search by client, code, notes, agent...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:border-red-500 transition-colors"
                />
              </div>

              {/* Status Filter */}
              <div className="md:col-span-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-medium"
                >
                  <option value="all">{language === 'th' ? 'สถานะ: ทั้งหมด' : 'Status: All'}</option>
                  <option value="Pending">{language === 'th' ? 'รอดำเนินการ (Pending)' : 'Pending'}</option>
                  <option value="Completed">{language === 'th' ? 'เสร็จสิ้น (Completed)' : 'Completed'}</option>
                  <option value="Cancelled">{language === 'th' ? 'ยกเลิก (Cancelled)' : 'Cancelled'}</option>
                </select>
              </div>

              {/* Timeframe Filter */}
              <div className="md:col-span-2">
                <select
                  value={timeframeFilter}
                  onChange={(e) => setTimeframeFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-medium"
                >
                  <option value="all">{language === 'th' ? 'ช่วงเวลา: ทั้งหมด' : 'Timeframe: All'}</option>
                  <option value="today">{language === 'th' ? 'วันนี้ (Today)' : 'Today'}</option>
                  <option value="overdue">{language === 'th' ? 'เกินกำหนด (Overdue)' : 'Overdue'}</option>
                  <option value="upcoming">{language === 'th' ? 'กำลังจะมาถึง (Upcoming)' : 'Upcoming'}</option>
                </select>
              </div>

              {/* Priority Filter */}
              <div className="md:col-span-2">
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-medium"
                >
                  <option value="all">{language === 'th' ? 'ความสำคัญ: ทั้งหมด' : 'Priority: All'}</option>
                  <option value="Urgent">{language === 'th' ? 'ด่วนที่สุด (Urgent)' : 'Urgent'}</option>
                  <option value="High">{language === 'th' ? 'สูง (High)' : 'High'}</option>
                  <option value="Normal">{language === 'th' ? 'ปกติ (Normal)' : 'Normal'}</option>
                  <option value="Low">{language === 'th' ? 'ต่ำ (Low)' : 'Low'}</option>
                </select>
              </div>

              {/* Agent Filter */}
              <div className="md:col-span-2">
                <select
                  value={agentFilter}
                  onChange={(e) => setAgentFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-medium"
                >
                  <option value="all">{language === 'th' ? 'เอเจนต์: ทั้งหมด' : 'Agent: All'}</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Follow-up Tasks List */}
          <div className="space-y-3">
            {loading ? (
              <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
                <p className="text-xs">{language === 'th' ? 'กำลังโหลดข้อมูล Follow-up จากฐานข้อมูล...' : 'Loading follow-up tasks...'}</p>
              </div>
            ) : followUps.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
                <Clock className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-bold text-slate-700">{language === 'th' ? 'ไม่พบรายการ Follow-up ตามเงื่อนไข' : 'No follow-up tasks found'}</p>
                <p className="text-xs text-slate-400 mt-1">{language === 'th' ? 'ลองปรับตัวกรองหรือสร้างงานติดตามลูกค้าใหม่' : 'Adjust filters or create a new follow-up task'}</p>
              </div>
            ) : (
              followUps.map((task) => {
                const isCompleted = task.status === 'Completed';
                const isCancelled = task.status === 'Cancelled';
                const todayStr = new Date().toISOString().slice(0, 10);
                const isOverdue = !isCompleted && !isCancelled && task.followUpDate < todayStr;
                const isToday = !isCompleted && !isCancelled && task.followUpDate === todayStr;

                return (
                  <div
                    key={task.id}
                    className={`p-4 rounded-2xl border transition-all bg-white hover:shadow-md ${
                      isCompleted
                        ? 'border-emerald-200 bg-emerald-50/20'
                        : isCancelled
                        ? 'border-slate-200 bg-slate-50/50 opacity-75'
                        : isOverdue
                        ? 'border-red-300 ring-1 ring-red-200'
                        : isToday
                        ? 'border-amber-300 ring-1 ring-amber-200'
                        : 'border-slate-200'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      {/* Left: Task & Client Info */}
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => {
                            if (!isCompleted && !isCancelled) {
                              handleCompleteTask(task.id);
                            }
                          }}
                          disabled={isCompleted || isCancelled}
                          className={`w-6 h-6 rounded-lg border mt-0.5 flex items-center justify-center transition-all ${
                            isCompleted
                              ? 'bg-emerald-600 border-emerald-600 text-white cursor-default'
                              : isCancelled
                              ? 'bg-slate-200 border-slate-300 text-slate-400 cursor-not-allowed'
                              : 'border-slate-300 hover:border-emerald-500 hover:bg-emerald-50 text-transparent hover:text-emerald-600 cursor-pointer'
                          }`}
                          title={isCompleted ? 'Completed' : 'Mark as complete'}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>

                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-sm text-slate-900">
                              {task.title || task.followUpNote.slice(0, 60)}
                            </span>

                            {/* Status Badge */}
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isCompleted
                                ? 'bg-emerald-100 text-emerald-800'
                                : isCancelled
                                ? 'bg-slate-200 text-slate-700'
                                : isOverdue
                                ? 'bg-red-100 text-red-800'
                                : isToday
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {task.status}
                              {isOverdue && ' (Overdue)'}
                              {isToday && ' (Today)'}
                            </span>

                            {/* Priority Badge */}
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              task.priority === 'Urgent'
                                ? 'bg-red-600 text-white'
                                : task.priority === 'High'
                                ? 'bg-amber-500 text-white'
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                              {task.priority || 'Normal'}
                            </span>
                          </div>

                          {/* Client Association */}
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                            <span className="font-semibold text-slate-900 flex items-center gap-1">
                              <Building2 className="w-3.5 h-3.5 text-slate-400" />
                              {task.clientName || 'Lead'}
                              {task.clientCode && <span className="text-[11px] text-slate-400 font-mono">({task.clientCode})</span>}
                            </span>
                            {task.clientPhone && (
                              <span className="flex items-center gap-1 text-slate-500">
                                <Phone className="w-3 h-3" />
                                {task.clientPhone}
                              </span>
                            )}
                            {task.clientType && (
                              <span className="px-1.5 py-0.2 rounded bg-slate-100 text-[10px] text-slate-600">
                                {task.clientType}
                              </span>
                            )}
                          </div>

                          {/* Follow-up Note Text */}
                          <p className="text-xs text-slate-700 mt-1 whitespace-pre-line leading-relaxed">
                            {task.followUpNote}
                          </p>

                          {/* Cancel Reason display if cancelled */}
                          {isCancelled && task.cancelReason && (
                            <div className="mt-1 p-2 rounded-lg bg-red-50 text-red-700 text-xs border border-red-100">
                              <strong>{language === 'th' ? 'เหตุผลที่ยกเลิก:' : 'Cancellation Reason:'}</strong> {task.cancelReason}
                            </div>
                          )}

                          {/* Completed Timestamp */}
                          {isCompleted && task.completedAt && (
                            <p className="text-[10px] text-emerald-600">
                              {language === 'th' ? 'เสร็จสิ้นเมื่อ:' : 'Completed on:'} {new Date(task.completedAt).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right: Date, Agent & Action Buttons */}
                      <div className="flex sm:flex-col items-end justify-between sm:justify-start gap-2 shrink-0 self-stretch sm:self-auto border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                        <div className="text-right">
                          <div className="flex items-center gap-1 text-xs font-bold text-slate-800">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>{task.followUpDate}</span>
                            <span className="text-slate-400">@</span>
                            <span className="text-slate-600">{task.followUpTime || '10:00'}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {language === 'th' ? 'เอเจนต์:' : 'Agent:'} <span className="font-semibold text-slate-700">{task.assignedAgentName}</span>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1 mt-1">
                          {/* View Detail & Audit Logs */}
                          <button
                            onClick={() => handleOpenDetail(task)}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs transition-colors"
                            title="View details & audit history"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Task */}
                          {!isCompleted && !isCancelled && (
                            <button
                              onClick={() => handleOpenEdit(task)}
                              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-blue-600 text-xs transition-colors"
                              title="Edit task"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Cancel Task */}
                          {!isCompleted && !isCancelled && (
                            <button
                              onClick={() => {
                                setCancelModalTask(task);
                                setCancelReasonText('');
                              }}
                              className="p-1.5 rounded-lg border border-slate-200 hover:bg-red-50 text-rose-600 text-xs transition-colors"
                              title="Cancel task"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Soft Delete Task (Admin/Manager only) */}
                          {isManagerOrAdmin && (
                            <button
                              onClick={() => handleDeleteTask(task)}
                              className="p-1.5 rounded-lg border border-slate-200 hover:bg-red-50 text-red-600 text-xs transition-colors"
                              title="Delete task (Soft delete)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUBTAB 2: AGENDA & DAILY CHECKLIST (Operational Alerts)   */}
      {/* ========================================================= */}
      {activeTab === 'agenda' && (
        <div className="space-y-6">
          {/* Urgent Operational Alerts Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Expiring Contracts Card */}
            <div
              onClick={() => onNavigate('contracts')}
              className="cursor-pointer p-4 rounded-2xl bg-amber-500/10 border border-amber-300 hover:border-amber-400 transition-all flex items-start gap-3"
            >
              <div className="p-2.5 rounded-xl bg-amber-500 text-white shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-900">{language === 'th' ? 'สัญญาใกล้หมดอายุ' : 'Expiring Contracts'}</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-200 text-amber-900">
                    {expiringContracts.length} {language === 'th' ? 'ฉบับ' : 'items'}
                  </span>
                </div>
                <p className="text-[11px] text-amber-800 mt-1">
                  {language === 'th' ? 'ต้องดำเนินการต่อสัญญาเช่า หรือจัดหาผู้เช่าใหม่' : 'Renew lease agreements or acquire new tenants.'}
                </p>
              </div>
            </div>

            {/* Viewings Scheduled Card */}
            <div
              onClick={() => onNavigate('viewing')}
              className="cursor-pointer p-4 rounded-2xl bg-blue-500/10 border border-blue-300 hover:border-blue-400 transition-all flex items-start gap-3"
            >
              <div className="p-2.5 rounded-xl bg-blue-600 text-white shrink-0">
                <CalendarDays className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-900">{language === 'th' ? 'นัดหมายพาลูกค้าชม' : 'Scheduled Viewings'}</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-200 text-blue-900">
                    {todayViewings.length} {language === 'th' ? 'นัดหมาย' : 'viewings'}
                  </span>
                </div>
                <p className="text-[11px] text-blue-800 mt-1">
                  {language === 'th' ? 'เตรียมเอกสารแนะนำทรัพย์และกุญแจเข้าชม' : 'Prepare brochures, property keys, and itinerary.'}
                </p>
              </div>
            </div>

            {/* Urgent Fixes Card */}
            <div
              onClick={() => onNavigate('maintenance')}
              className="cursor-pointer p-4 rounded-2xl bg-rose-500/10 border border-rose-300 hover:border-rose-400 transition-all flex items-start gap-3"
            >
              <div className="p-2.5 rounded-xl bg-rose-600 text-white shrink-0">
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-900">{language === 'th' ? 'งานซ่อมเร่งด่วน' : 'Urgent Maintenance'}</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-200 text-rose-900">
                    {urgentIssues.length} {language === 'th' ? 'รายการ' : 'tickets'}
                  </span>
                </div>
                <p className="text-[11px] text-rose-800 mt-1">
                  {language === 'th' ? 'ติดตามช่างเข้าแก้ไขและอนุมัติใบเสนอราคา' : 'Follow up technician dispatch and repair quotation.'}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Add Form */}
          {isAddingChecklist && (
            <form onSubmit={handleCreateChecklistTask} className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3 animate-in fade-in duration-200">
              <span className="text-xs font-bold text-slate-800 block">
                {language === 'th' ? 'สร้างเช็กลิสต์งานสำหรับวันนี้' : 'Quick Task Creation'}
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
                <input
                  type="text"
                  required
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="e.g. Call Mr. Alexander to confirm Kamala Villa viewing..."
                  className="sm:col-span-6 px-3 py-2 border rounded-xl"
                />
                <select
                  value={newTaskCategory}
                  onChange={(e) => setNewTaskCategory(e.target.value)}
                  className="sm:col-span-3 px-3 py-2 border rounded-xl"
                >
                  <option value="Follow-up">Follow-up</option>
                  <option value="Viewing">Viewing</option>
                  <option value="Inspection">Inspection</option>
                  <option value="Contract">Contract</option>
                  <option value="Maintenance">Maintenance</option>
                </select>
                <select
                  value={newTaskPriority}
                  onChange={(e) => setNewTaskPriority(e.target.value as any)}
                  className="sm:col-span-2 px-3 py-2 border rounded-xl"
                >
                  <option value="Normal">Normal</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
                </select>
                <button
                  type="submit"
                  className="sm:col-span-1 px-3 py-2 rounded-xl bg-red-600 text-white font-bold text-xs hover:bg-red-500"
                >
                  Save
                </button>
              </div>
            </form>
          )}

          {/* Checklist Task Section */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-red-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  {language === 'th' ? 'รายการเช็กลิสต์งาน (Checklist Tasks)' : 'Task Checklist'}
                </h3>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <label className="flex items-center gap-1.5 text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showCompleted}
                    onChange={(e) => setShowCompleted(e.target.checked)}
                    className="rounded border-slate-300 text-red-600"
                  />
                  <span>{language === 'th' ? 'แสดงงานที่เสร็จแล้ว' : 'Show Completed'}</span>
                </label>

                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 text-xs"
                >
                  <option value="all">All Categories</option>
                  <option value="Follow-up">Follow-up</option>
                  <option value="Viewing">Viewing</option>
                  <option value="Inspection">Inspection</option>
                  <option value="Contract">Contract</option>
                  <option value="Maintenance">Maintenance</option>
                </select>
              </div>
            </div>

            {/* Checklist items */}
            <div className="space-y-2.5">
              {filteredChecklistTasks.length === 0 ? (
                <p className="text-center py-8 text-slate-400 text-xs">
                  {language === 'th' ? 'ไม่มีงานค้างสำหรับเงื่อนไขนี้' : 'No tasks pending.'}
                </p>
              ) : (
                filteredChecklistTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 transition-all text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => onToggleTask(task.id)}
                        className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                          task.status === 'Completed'
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'border-slate-300 hover:border-slate-400'
                        }`}
                      >
                        {task.status === 'Completed' && <CheckCircle2 className="w-4 h-4" />}
                      </button>

                      <div>
                        <p className={`font-semibold ${task.status === 'Completed' ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                          {task.title}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                          <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">{task.category}</span>
                          <span>•</span>
                          <span>Assigned to: {task.assignedToName}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        task.priority === 'Urgent'
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : task.priority === 'High'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {task.priority}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 1: CREATE FOLLOW-UP TASK                            */}
      {/* ========================================================= */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-red-500" />
                <h3 className="font-bold text-sm font-serif">
                  {language === 'th' ? 'สร้าง Follow-up Task ใหม่' : 'Create Follow-up Task'}
                </h3>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateFollowUp} className="p-5 space-y-4 text-xs">
              {/* Linked Client */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {language === 'th' ? 'ผูกกับลูกค้า / ลีด (Required)' : 'Linked Lead / Customer *'}
                </label>
                <select
                  value={formClientId}
                  onChange={(e) => setFormClientId(e.target.value)}
                  required
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 focus:bg-white text-xs"
                >
                  <option value="">{language === 'th' ? '-- เลือกลูกค้า / ลีด --' : '-- Select Customer / Lead --'}</option>
                  {clientsList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.clientCode} — {c.firstName} {c.lastName} ({c.clientType} / {c.status})
                    </option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {language === 'th' ? 'หัวข้องานติดตาม' : 'Task Title'}
                </label>
                <input
                  type="text"
                  placeholder={language === 'th' ? 'เช่น โทรติดตามสัญญาเช่า, นัดดูโฉนดที่ดิน...' : 'e.g. Call to confirm reservation agreement...'}
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 focus:bg-white text-xs"
                />
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {language === 'th' ? 'วันที่ Follow-up (Required)' : 'Follow-up Date *'}
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 focus:bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {language === 'th' ? 'เวลา Follow-up' : 'Follow-up Time'}
                  </label>
                  <input
                    type="time"
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 focus:bg-white text-xs"
                  />
                </div>
              </div>

              {/* Priority & Agent */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {language === 'th' ? 'ระดับความสำคัญ' : 'Priority'}
                  </label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as any)}
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 focus:bg-white text-xs"
                  >
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {language === 'th' ? 'เอเจนต์ผู้รับผิดชอบ' : 'Assigned Agent'}
                  </label>
                  <select
                    value={formAgentId}
                    onChange={(e) => setFormAgentId(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 focus:bg-white text-xs"
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {language === 'th' ? 'รายละเอียด / บันทึก (Notes) *' : 'Follow-up Notes / Content *'}
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder={language === 'th' ? 'บันทึกประเด็นที่ต้องติดตาม และผลการพูดคุย...' : 'Discussion points, deliverables, action items...'}
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 focus:bg-white text-xs"
                />
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 font-bold"
                >
                  {language === 'th' ? 'ยกเลิก' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold shadow-md"
                >
                  {language === 'th' ? 'บันทึก Task' : 'Save Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: EDIT FOLLOW-UP TASK                              */}
      {/* ========================================================= */}
      {editModalTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-sm font-serif">
                  {language === 'th' ? 'แก้ไข Follow-up Task' : 'Edit Follow-up Task'}
                </h3>
              </div>
              <button
                onClick={() => setEditModalTask(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateFollowUp} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {language === 'th' ? 'หัวข้องานติดตาม' : 'Task Title'}
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 focus:bg-white text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {language === 'th' ? 'วันที่ Follow-up' : 'Follow-up Date'}
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 focus:bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {language === 'th' ? 'เวลา Follow-up' : 'Follow-up Time'}
                  </label>
                  <input
                    type="time"
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 focus:bg-white text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {language === 'th' ? 'ระดับความสำคัญ' : 'Priority'}
                  </label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as any)}
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 focus:bg-white text-xs"
                  >
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {language === 'th' ? 'เอเจนต์ผู้รับผิดชอบ' : 'Assigned Agent'}
                  </label>
                  <select
                    value={formAgentId}
                    onChange={(e) => setFormAgentId(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 focus:bg-white text-xs"
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {language === 'th' ? 'รายละเอียด / บันทึก (Notes)' : 'Follow-up Notes / Content'}
                </label>
                <textarea
                  rows={3}
                  required
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 focus:bg-white text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setEditModalTask(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 font-bold"
                >
                  {language === 'th' ? 'ยกเลิก' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md"
                >
                  {language === 'th' ? 'อัปเดตข้อมูล' : 'Update Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: CANCEL FOLLOW-UP WITH REASON                     */}
      {/* ========================================================= */}
      {cancelModalTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 bg-rose-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Ban className="w-5 h-5 text-rose-300" />
                <h3 className="font-bold text-sm font-serif">
                  {language === 'th' ? 'ยกเลิก Follow-up Task' : 'Cancel Follow-up Task'}
                </h3>
              </div>
              <button
                onClick={() => setCancelModalTask(null)}
                className="text-rose-200 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <p className="text-slate-600">
                {language === 'th'
                  ? `คุณต้องการยกเลิกงาน "${cancelModalTask.title || cancelModalTask.followUpNote.slice(0, 40)}" ใช่หรือไม่? กรุณาระบุเหตุผล:`
                  : `Are you sure you want to cancel "${cancelModalTask.title || cancelModalTask.followUpNote.slice(0, 40)}"? Please provide a reason:`}
              </p>

              <textarea
                rows={3}
                placeholder={language === 'th' ? 'ระบุเหตุผล เช่น ลูกค้าขอเลื่อนไม่มีกำหนด, เลือกโครงการอื่น...' : 'e.g. Client requested cancellation or chose other project...'}
                value={cancelReasonText}
                onChange={(e) => setCancelReasonText(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl bg-slate-50 focus:bg-white text-xs"
              />

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setCancelModalTask(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 font-bold"
                >
                  {language === 'th' ? 'ปิด' : 'Back'}
                </button>
                <button
                  type="button"
                  onClick={handleCancelTask}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-md"
                >
                  {language === 'th' ? 'ยืนยันยกเลิก Task' : 'Confirm Cancel'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 4: DETAIL & AUDIT LOG VIEWER                        */}
      {/* ========================================================= */}
      {detailModalTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-red-500" />
                <h3 className="font-bold text-sm font-serif">
                  {language === 'th' ? 'รายละเอียด Follow-up Task & ประวัติ Audit' : 'Task Details & Audit Trail'}
                </h3>
              </div>
              <button
                onClick={() => setDetailModalTask(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto text-xs">
              {/* Core summary */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900">{detailModalTask.title || 'Follow-up Task'}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    detailModalTask.status === 'Completed'
                      ? 'bg-emerald-100 text-emerald-800'
                      : detailModalTask.status === 'Cancelled'
                      ? 'bg-slate-200 text-slate-700'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {detailModalTask.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-slate-600 pt-2 border-t border-slate-200">
                  <div>
                    <span className="text-slate-400">{language === 'th' ? 'ลูกค้า / ลีด:' : 'Client:'}</span>{' '}
                    <strong>{detailModalTask.clientName} ({detailModalTask.clientCode})</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">{language === 'th' ? 'กำหนดวันเวลา:' : 'Scheduled:'}</span>{' '}
                    <strong>{detailModalTask.followUpDate} @ {detailModalTask.followUpTime || '10:00'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">{language === 'th' ? 'เอเจนต์รับผิดชอบ:' : 'Assigned Agent:'}</span>{' '}
                    <strong>{detailModalTask.assignedAgentName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">{language === 'th' ? 'ความสำคัญ:' : 'Priority:'}</span>{' '}
                    <strong>{detailModalTask.priority || 'Normal'}</strong>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200">
                  <span className="text-slate-400">{language === 'th' ? 'เนื้อหา / ข้อความ:' : 'Notes:'}</span>
                  <p className="mt-1 text-slate-800 whitespace-pre-line bg-white p-3 rounded-lg border">
                    {detailModalTask.followUpNote}
                  </p>
                </div>
              </div>

              {/* Audit Trail Section */}
              <div>
                <h4 className="font-bold text-xs text-slate-900 mb-2 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-red-600" />
                  <span>{language === 'th' ? 'ประวัติ Audit Trail (การดำเนินการทั้งหมด)' : 'Audit Trail History'}</span>
                </h4>

                {(!detailModalTask.auditLogs || detailModalTask.auditLogs.length === 0) ? (
                  <p className="text-slate-400 italic py-2">{language === 'th' ? 'ไม่มีประวัติ Audit เพิ่มเติม' : 'No audit records'}</p>
                ) : (
                  <div className="space-y-2">
                    {detailModalTask.auditLogs.map((log: any) => (
                      <div key={log.id} className="p-2.5 rounded-lg border border-slate-100 bg-white text-[11px] space-y-1">
                        <div className="flex items-center justify-between text-slate-500">
                          <span className="font-semibold text-slate-800">{log.action}</span>
                          <span>{log.createdAt ? new Date(log.createdAt).toLocaleString() : ''}</span>
                        </div>
                        <div className="text-slate-600">
                          {log.userName && <span className="font-medium text-slate-700">By {log.userName}: </span>}
                          {log.newValue || log.oldValue || '-'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t flex justify-end shrink-0">
              <button
                onClick={() => setDetailModalTask(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs"
              >
                {language === 'th' ? 'ปิดหน้าต่าง' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
