import React, { useState, useMemo } from 'react';
import { Viewing, ViewingStatus, Customer, Property, User } from '../types';
import { translations, Language } from '../lib/i18n';
import {
  CalendarDays,
  Plus,
  Search,
  Filter,
  Clock,
  MapPin,
  User as UserIcon,
  Building2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Star,
  Edit2,
  Trash2,
  X,
  MessageSquareQuote,
  Flame,
  Snowflake,
  SunMedium,
  List,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  History,
  Ban,
  Phone,
  FileText
} from 'lucide-react';

interface ViewingViewProps {
  viewings: Viewing[];
  properties: Property[];
  customers: Customer[];
  users: User[];
  currentUser: User;
  language: Language;
  onSaveViewing: (viewing: Viewing) => void;
  onDeleteViewing: (id: string) => void;
  preselectedProperty?: Property | null;
  preselectedCustomer?: Customer | null;
}

export function ViewingView({
  viewings,
  properties,
  customers,
  users,
  currentUser,
  language,
  onSaveViewing,
  onDeleteViewing,
  preselectedProperty,
  preselectedCustomer,
}: ViewingViewProps) {
  const t = translations[language];

  // View Mode: List vs Calendar
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [agentFilter, setAgentFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all'); // all, today, tomorrow, this-week, upcoming, past
  const [interestFilter, setInterestFilter] = useState<string>('all');

  // Calendar navigation state
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);

  // Modals
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingViewing, setEditingViewing] = useState<Viewing | null>(null);
  const [feedbackModalViewing, setFeedbackModalViewing] = useState<Viewing | null>(null);
  const [cancelModalViewing, setCancelModalViewing] = useState<Viewing | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');

  // History Modal State (Customer or Property)
  const [historyTarget, setHistoryTarget] = useState<{
    type: 'customer' | 'property';
    id: string;
    name: string;
  } | null>(null);

  // Feedback form state
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [feedbackInterest, setFeedbackInterest] = useState<'Hot' | 'Warm' | 'Cold'>('Hot');
  const [feedbackRating, setFeedbackRating] = useState<number>(5);

  const statuses: ViewingStatus[] = ['Scheduled', 'Confirmed', 'Completed', 'Cancelled', 'No Show'];

  const initialForm: Partial<Viewing> = {
    viewingCode: `VW-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    customerId: preselectedCustomer?.id || customers[0]?.id || '',
    customerName: preselectedCustomer?.name || customers[0]?.name || '',
    customerPhone: preselectedCustomer?.phone || customers[0]?.phone || '',
    propertyId: preselectedProperty?.id || properties[0]?.id || '',
    propertyCustomId: preselectedProperty?.propertyId || properties[0]?.propertyId || '',
    propertyTitle: preselectedProperty?.title || properties[0]?.title || '',
    agentId: currentUser.id,
    agentName: currentUser.name,
    dateTime: new Date(Date.now() + 86400000).toISOString().slice(0, 16), // Tomorrow
    location: preselectedProperty?.district || 'Kamala, Phuket',
    status: 'Scheduled',
    clientInterest: 'Warm',
    interestScore: 4,
    notes: 'Tour scheduled. Prepare brochure and key lock code.',
  };

  const [formData, setFormData] = useState<Partial<Viewing>>(initialForm);

  // Filter logic
  const filteredViewings = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const tomorrow = new Date(Date.now() + 86400000);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10);

    return viewings.filter((v) => {
      const q = (searchQuery || '').toLowerCase();
      const matchSearch =
        !q ||
        (v.customerName && v.customerName.toLowerCase().includes(q)) ||
        (v.customerPhone && v.customerPhone.toLowerCase().includes(q)) ||
        (v.propertyTitle && v.propertyTitle.toLowerCase().includes(q)) ||
        (v.propertyCustomId && v.propertyCustomId.toLowerCase().includes(q)) ||
        (v.viewingCode && v.viewingCode.toLowerCase().includes(q)) ||
        (v.location && v.location.toLowerCase().includes(q));

      // Status match (normalize 'No-show' and 'No Show')
      const vStatus = (v.status || '').replace('No-show', 'No Show');
      const matchStatus = statusFilter === 'all' || vStatus === statusFilter;

      // Agent match
      const matchAgent = agentFilter === 'all' || v.agentId === agentFilter || v.agentName === agentFilter;

      // Interest match
      const matchInterest = interestFilter === 'all' || v.clientInterest === interestFilter;

      // Date match
      const vDateStr = (v.dateTime || '').slice(0, 10);
      let matchDate = true;
      if (dateFilter === 'today') {
        matchDate = vDateStr === todayStr;
      } else if (dateFilter === 'tomorrow') {
        matchDate = vDateStr === tomorrowStr;
      } else if (dateFilter === 'this-week') {
        const vDate = new Date(v.dateTime);
        const dayOfWeek = now.getDay();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - dayOfWeek);
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 7);
        matchDate = vDate >= startOfWeek && vDate < endOfWeek;
      } else if (dateFilter === 'upcoming') {
        matchDate = vDateStr >= todayStr;
      } else if (dateFilter === 'past') {
        matchDate = vDateStr < todayStr;
      }

      // Selected calendar date
      if (selectedCalendarDate) {
        matchDate = matchDate && vDateStr === selectedCalendarDate;
      }

      return matchSearch && matchStatus && matchAgent && matchInterest && matchDate;
    }).sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
  }, [viewings, searchQuery, statusFilter, agentFilter, dateFilter, interestFilter, selectedCalendarDate]);

  // Calendar dates helper
  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: Array<{
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      viewingsCount: number;
      hasConfirmed: boolean;
    }> = [];

    // Prev month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevDate = new Date(year, month - 1, d);
      const dateStr = prevDate.toISOString().slice(0, 10);
      days.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: false,
        viewingsCount: viewings.filter((v) => (v.dateTime || '').startsWith(dateStr)).length,
        hasConfirmed: false,
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const curDate = new Date(year, month, d);
      const dateStr = curDate.toISOString().slice(0, 10);
      const dayViewings = viewings.filter((v) => (v.dateTime || '').startsWith(dateStr));
      days.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: true,
        viewingsCount: dayViewings.length,
        hasConfirmed: dayViewings.some((v) => v.status === 'Confirmed' || v.status === 'Scheduled'),
      });
    }

    // Next month padding to fill 35 or 42 grid slots
    const totalSlots = days.length <= 35 ? 35 : 42;
    const remaining = totalSlots - days.length;
    for (let d = 1; d <= remaining; d++) {
      const nextDate = new Date(year, month + 1, d);
      const dateStr = nextDate.toISOString().slice(0, 10);
      days.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: false,
        viewingsCount: viewings.filter((v) => (v.dateTime || '').startsWith(dateStr)).length,
        hasConfirmed: false,
      });
    }

    return days;
  }, [calendarMonth, viewings]);

  const handleOpenAdd = () => {
    setEditingViewing(null);
    setFormData({
      ...initialForm,
      viewingCode: `VW-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      customerId: preselectedCustomer?.id || customers[0]?.id || '',
      customerName: preselectedCustomer?.name || customers[0]?.name || '',
      customerPhone: preselectedCustomer?.phone || customers[0]?.phone || '',
      propertyId: preselectedProperty?.id || properties[0]?.id || '',
      propertyCustomId: preselectedProperty?.propertyId || properties[0]?.propertyId || '',
      propertyTitle: preselectedProperty?.title || properties[0]?.title || '',
      dateTime: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
      agentId: currentUser.id,
      agentName: currentUser.name,
      location: preselectedProperty?.district || 'Kamala, Phuket',
    });
    setEditModalOpen(true);
  };

  const handleOpenEdit = (v: Viewing) => {
    setEditingViewing(v);
    setFormData({
      ...v,
      status: (v.status === 'No-show' ? 'No Show' : v.status) as ViewingStatus,
      dateTime: v.dateTime ? v.dateTime.slice(0, 16) : '',
    });
    setEditModalOpen(true);
  };

  const handleOpenCancel = (v: Viewing) => {
    setCancelModalViewing(v);
    setCancellationReason('');
  };

  const handleConfirmCancel = () => {
    if (!cancelModalViewing) return;
    const updated: Viewing = {
      ...cancelModalViewing,
      status: 'Cancelled',
      notes: cancellationReason
        ? `${cancelModalViewing.notes ? cancelModalViewing.notes + ' | ' : ''}Cancelled: ${cancellationReason}`
        : cancelModalViewing.notes,
    };
    onSaveViewing(updated);
    setCancelModalViewing(null);
  };

  const handleOpenFeedback = (v: Viewing) => {
    setFeedbackModalViewing(v);
    setFeedbackNotes(v.feedback || '');
    setFeedbackInterest((v.clientInterest as any) || 'Warm');
    setFeedbackRating(v.interestScore || 4);
  };

  const handleSaveFeedback = () => {
    if (!feedbackModalViewing) return;
    const updated: Viewing = {
      ...feedbackModalViewing,
      status: 'Completed',
      feedback: feedbackNotes,
      clientInterest: feedbackInterest,
      interestScore: feedbackRating,
    };
    onSaveViewing(updated);
    setFeedbackModalViewing(null);
  };

  const handleSubmitViewing = (e: React.FormEvent) => {
    e.preventDefault();

    const selectedProp = properties.find((p) => p.id === formData.propertyId || p.propertyId === formData.propertyId);
    const selectedCust = customers.find((c) => c.id === formData.customerId);
    const selectedAgent = users.find((u) => u.id === formData.agentId) || currentUser;

    const toSave: Viewing = {
      id: editingViewing ? editingViewing.id : `view-${Date.now()}`,
      viewingCode: formData.viewingCode || `VW-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      customerId: selectedCust?.id || formData.customerId || '',
      customerName: selectedCust?.name || formData.customerName || 'Customer',
      customerPhone: selectedCust?.phone || formData.customerPhone || '',
      propertyId: selectedProp?.id ? String(selectedProp.id) : (formData.propertyId || ''),
      propertyCustomId: selectedProp?.propertyId || formData.propertyCustomId || '',
      propertyTitle: selectedProp?.title || formData.propertyTitle || 'Property',
      agentId: selectedAgent.id,
      agentName: selectedAgent.name,
      dateTime: formData.dateTime || new Date().toISOString(),
      location: formData.location || (selectedProp ? `${selectedProp.district}, ${selectedProp.city}` : 'Phuket'),
      status: (formData.status as ViewingStatus) || 'Scheduled',
      notes: formData.notes || '',
      feedback: formData.feedback || '',
      interestScore: formData.interestScore || 4,
      clientInterest: formData.clientInterest || 'Warm',
      createdAt: editingViewing ? editingViewing.createdAt : new Date().toISOString(),
    };

    onSaveViewing(toSave);
    setEditModalOpen(false);
  };

  const statusBadge = (s: ViewingStatus) => {
    switch (s) {
      case 'Scheduled':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Confirmed':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Completed':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Cancelled':
        return 'bg-slate-100 text-slate-500 border-slate-200';
      case 'No-show':
      case 'No Show':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const interestBadge = (lvl?: 'Hot' | 'Warm' | 'Cold' | string) => {
    if (lvl === 'Hot') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
          <Flame className="w-3 h-3 text-rose-500 fill-rose-500" /> Hot Buyer
        </span>
      );
    }
    if (lvl === 'Warm') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
          <SunMedium className="w-3 h-3 text-amber-500" /> Warm Interest
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
        <Snowflake className="w-3 h-3 text-slate-400" /> Cold / Browsing
      </span>
    );
  };

  // History list items
  const historyViewings = useMemo(() => {
    if (!historyTarget) return [];
    if (historyTarget.type === 'customer') {
      return viewings.filter((v) => v.customerId === historyTarget.id);
    } else {
      return viewings.filter(
        (v) => v.propertyId === historyTarget.id || v.propertyCustomId === historyTarget.id
      );
    }
  }, [historyTarget, viewings]);

  return (
    <div className="space-y-5 w-full pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-red-600" />
            <h2 className="text-xl font-bold font-serif text-slate-900 tracking-wide">
              {language === 'th' ? 'ระบบนัดดูทรัพย์ (Viewing & Appointment Management)' : 'Viewing & Appointment Management'}
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {language === 'th'
              ? `จัดการตารางนัดหมายพาชมอสังหาริมทรัพย์ ${viewings.length} รายการ เชื่อมต่อ Customer, Property, Users และติดตามประวัติ`
              : `Manage property tours, appointments, client feedback, and linked customer/property histories`}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* View Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'list'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>{language === 'th' ? 'รายการ (List)' : 'List View'}</span>
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'calendar'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>{language === 'th' ? 'ปฏิทิน (Calendar)' : 'Calendar'}</span>
            </button>
          </div>

          {/* Schedule Button */}
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-red-700 via-red-600 to-rose-600 hover:from-red-600 text-white text-xs font-semibold shadow-md active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>{language === 'th' ? '+ สร้างนัดดูทรัพย์' : '+ Schedule Tour'}</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Search */}
          <div className="sm:col-span-4 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                language === 'th'
                  ? 'ค้นหาลูกค้า, ทรัพย์, รหัส, เบอร์โทร, สถานที่...'
                  : 'Search customer, property, code, phone, location...'
              }
              className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/30 text-slate-900"
            />
          </div>

          {/* Filter Agent */}
          <div className="sm:col-span-3">
            <select
              value={agentFilter}
              onChange={(e) => setAgentFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-xs focus:bg-white focus:outline-none text-slate-800"
            >
              <option value="all">{language === 'th' ? 'เอเจนต์ทุกคน (All Agents)' : 'All Agents'}</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          </div>

          {/* Filter Status */}
          <div className="sm:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-xs focus:bg-white focus:outline-none text-slate-800"
            >
              <option value="all">{language === 'th' ? 'ทุกสถานะนัดหมาย (All Statuses)' : 'All Statuses'}</option>
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Date Range */}
          <div className="sm:col-span-2">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-xs focus:bg-white focus:outline-none text-slate-800"
            >
              <option value="all">{language === 'th' ? 'ทุกช่วงเวลา' : 'All Dates'}</option>
              <option value="today">{language === 'th' ? 'วันนี้ (Today)' : 'Today'}</option>
              <option value="tomorrow">{language === 'th' ? 'พรุ่งนี้ (Tomorrow)' : 'Tomorrow'}</option>
              <option value="this-week">{language === 'th' ? 'สัปดาห์นี้ (This Week)' : 'This Week'}</option>
              <option value="upcoming">{language === 'th' ? 'ที่กำลังจะถึง (Upcoming)' : 'Upcoming'}</option>
              <option value="past">{language === 'th' ? 'นัดหมายที่ผ่านมา (Past)' : 'Past'}</option>
            </select>
          </div>
        </div>

        {selectedCalendarDate && (
          <div className="flex items-center justify-between px-3 py-2 bg-red-50/80 border border-red-200 rounded-xl text-xs text-red-900">
            <span>
              {language === 'th' ? 'กรองเฉพาะวันที่:' : 'Filtering by date:'}{' '}
              <strong className="font-semibold">{selectedCalendarDate}</strong>
            </span>
            <button
              onClick={() => setSelectedCalendarDate(null)}
              className="font-bold underline hover:text-red-700 text-[11px]"
            >
              {language === 'th' ? 'ล้างตัวกรองวันที่' : 'Clear date filter'}
            </button>
          </div>
        )}
      </div>

      {/* CALENDAR VIEW */}
      {viewMode === 'calendar' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-serif font-bold text-slate-900 text-base">
                {calendarMonth.toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US', {
                  month: 'long',
                  year: 'numeric',
                })}
              </h3>
              <button
                onClick={() => {
                  setCalendarMonth(new Date());
                  setSelectedCalendarDate(new Date().toISOString().slice(0, 10));
                }}
                className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              >
                {language === 'th' ? 'วันนี้ (Today)' : 'Today'}
              </button>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() =>
                  setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))
                }
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() =>
                  setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))
                }
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1.5 text-center">
            {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map((day, idx) => (
              <div key={idx} className="py-1 text-xs font-bold text-slate-400">
                {language === 'th' ? day : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][idx]}
              </div>
            ))}

            {calendarDays.map((cell, idx) => {
              const isSelected = selectedCalendarDate === cell.dateStr;
              const isToday = cell.dateStr === new Date().toISOString().slice(0, 10);

              return (
                <button
                  key={idx}
                  onClick={() => {
                    if (isSelected) {
                      setSelectedCalendarDate(null);
                    } else {
                      setSelectedCalendarDate(cell.dateStr);
                    }
                  }}
                  className={`min-h-[64px] p-1.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                    cell.isCurrentMonth
                      ? isSelected
                        ? 'bg-red-50 border-red-500 shadow-xs'
                        : isToday
                        ? 'bg-slate-50 border-slate-900 font-bold'
                        : 'bg-white border-slate-100 hover:border-slate-300'
                      : 'bg-slate-50/50 border-slate-100 text-slate-300 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span
                      className={`inline-block w-5 h-5 text-center leading-5 rounded-full ${
                        isToday ? 'bg-red-600 text-white font-bold' : isSelected ? 'font-bold text-red-600' : ''
                      }`}
                    >
                      {cell.dayNumber}
                    </span>
                    {cell.viewingCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
                        {cell.viewingCount}
                      </span>
                    )}
                  </div>

                  {cell.viewingCount > 0 && (
                    <div className="mt-1">
                      <div className="w-full bg-slate-200 h-1 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${cell.hasConfirmed ? 'bg-emerald-500' : 'bg-blue-500'}`}
                          style={{ width: '100%' }}
                        />
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEWINGS LIST / CARDS */}
      {filteredViewings.length === 0 ? (
        <div className="text-center py-16 bg-white border border-dashed border-slate-300 rounded-2xl">
          <CalendarDays className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700">
            {language === 'th' ? 'ไม่พบนัดหมายพาชมทรัพย์ที่ตรงกับเงื่อนไข' : 'No viewing appointments found'}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {language === 'th' ? 'ลองปรับตัวกรอง หรือสร้างนัดดูทรัพย์ใหม่' : 'Try adjusting your filters or schedule a new viewing'}
          </p>
          <button
            onClick={handleOpenAdd}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white text-xs font-semibold rounded-xl hover:bg-red-500"
          >
            <Plus className="w-4 h-4" />
            <span>{language === 'th' ? 'สร้างนัดดูทรัพย์' : 'Schedule Viewing'}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredViewings.map((v) => {
            const vStatus = (v.status || '').replace('No-show', 'No Show') as ViewingStatus;

            return (
              <div
                key={v.id}
                className="rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:shadow-md transition-all p-4.5 flex flex-col justify-between"
              >
                <div>
                  {/* Header: Code & Status */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-mono text-xs font-bold text-slate-600">
                      {v.viewingCode}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusBadge(vStatus)}`}>
                      {vStatus}
                    </span>
                  </div>

                  {/* Date & Time pill */}
                  <div className="flex items-center gap-1.5 p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs font-semibold text-slate-800 mb-3">
                    <Clock className="w-3.5 h-3.5 text-red-600 shrink-0" />
                    <span>
                      {new Date(v.dateTime).toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                    <span>•</span>
                    <span className="text-red-700">
                      {new Date(v.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} น.
                    </span>
                  </div>

                  {/* Property details */}
                  <div className="space-y-2 text-xs">
                    <div>
                      <div className="flex items-center justify-between text-slate-400 text-[10px]">
                        <div className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          <span>PROPERTY:</span>
                          <span className="font-mono text-slate-800 font-bold">{v.propertyCustomId}</span>
                        </div>
                        <button
                          onClick={() =>
                            setHistoryTarget({
                              type: 'property',
                              id: v.propertyId || v.propertyCustomId,
                              name: v.propertyTitle,
                            })
                          }
                          className="text-red-600 hover:text-red-700 flex items-center gap-0.5 font-medium"
                          title="View property appointments history"
                        >
                          <History className="w-3 h-3" />
                          <span>{language === 'th' ? 'ประวัติ' : 'History'}</span>
                        </button>
                      </div>
                      <h4 className="font-bold text-slate-900 line-clamp-1 mt-0.5">
                        {v.propertyTitle}
                      </h4>
                      <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{v.location}</span>
                      </p>
                    </div>

                    {/* Customer details */}
                    <div className="pt-2 border-t border-slate-100">
                      <div className="flex items-center justify-between text-slate-400 text-[10px]">
                        <div className="flex items-center gap-1">
                          <UserIcon className="w-3 h-3" />
                          <span>CLIENT:</span>
                        </div>
                        <button
                          onClick={() =>
                            setHistoryTarget({
                              type: 'customer',
                              id: v.customerId,
                              name: v.customerName,
                            })
                          }
                          className="text-red-600 hover:text-red-700 flex items-center gap-0.5 font-medium"
                          title="View customer appointments history"
                        >
                          <History className="w-3 h-3" />
                          <span>{language === 'th' ? 'ประวัติ' : 'History'}</span>
                        </button>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="font-semibold text-slate-800">{v.customerName}</span>
                        <span className="text-slate-500 flex items-center gap-1 font-mono text-[11px]">
                          <Phone className="w-2.5 h-2.5" />
                          {v.customerPhone || 'N/A'}
                        </span>
                      </div>
                    </div>

                    {/* Assigned Agent */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">AGENT:</span>
                      <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                        {v.agentName}
                      </span>
                    </div>

                    {/* Notes if present */}
                    {v.notes && (
                      <div className="p-2 rounded-lg bg-slate-50 text-[11px] text-slate-600 border border-slate-100">
                        <span className="font-bold text-slate-500">Note: </span>
                        {v.notes}
                      </div>
                    )}

                    {/* Feedback preview & Interest */}
                    <div className="pt-2 border-t border-slate-100 space-y-1.5">
                      <div className="flex items-center justify-between">
                        {interestBadge(v.clientInterest)}
                        {v.interestScore && (
                          <div className="flex items-center gap-0.5 text-amber-500">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`w-3 h-3 ${
                                  i < (v.interestScore || 0) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                                }`}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                      {v.feedback && (
                        <p className="text-[11px] text-slate-600 bg-amber-50/60 p-2 rounded-lg border border-amber-200/50 italic line-clamp-2">
                          "{v.feedback}"
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions Bar */}
                <div className="pt-3.5 mt-3 border-t border-slate-100 flex items-center justify-between gap-1.5">
                  <button
                    onClick={() => handleOpenFeedback(v)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-colors"
                  >
                    <MessageSquareQuote className="w-3.5 h-3.5 text-red-400" />
                    <span>{language === 'th' ? 'ผลชมทรัพย์' : 'Feedback'}</span>
                  </button>

                  <div className="flex items-center gap-1">
                    {/* Cancel button if not already cancelled */}
                    {v.status !== 'Cancelled' && (
                      <button
                        onClick={() => handleOpenCancel(v)}
                        className="p-1.5 rounded-lg border border-amber-200 hover:bg-amber-50 text-amber-700"
                        title={language === 'th' ? 'ยกเลิกนัด' : 'Cancel Appointment'}
                      >
                        <Ban className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Edit button */}
                    <button
                      onClick={() => handleOpenEdit(v)}
                      className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700"
                      title={t.edit}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete / Soft Delete button */}
                    <button
                      onClick={() => {
                        if (confirm(`${t.confirmDeleteDesc} (${v.viewingCode})`)) {
                          onDeleteViewing(v.id);
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
            );
          })}
        </div>
      )}

      {/* CANCEL VIEWING MODAL */}
      {cancelModalViewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-[#0A0C10] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Ban className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-sm font-serif">
                  {language === 'th' ? 'ยกเลิกนัดหมายพาชมทรัพย์' : 'Cancel Viewing Appointment'}
                </h3>
              </div>
              <button
                onClick={() => setCancelModalViewing(null)}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <p className="text-slate-500 text-[11px]">
                  Viewing Code: <strong className="text-slate-800">{cancelModalViewing.viewingCode}</strong>
                </p>
                <p className="text-slate-800 font-bold">{cancelModalViewing.propertyTitle}</p>
                <p className="text-slate-600">Client: {cancelModalViewing.customerName}</p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {language === 'th' ? 'ระบุเหตุผลการยกเลิกนัด (Cancellation Reason)' : 'Reason for Cancellation'}
                </label>
                <textarea
                  rows={3}
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  placeholder={
                    language === 'th'
                      ? 'เช่น ลูกค้าติดธุระด่วน, ขอเลื่อนไม่มีกำหนด, หรือทรัพย์ถูกจองไปแล้ว...'
                      : 'e.g., Client rescheduled, emergency, property under offer...'
                  }
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 focus:bg-white text-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setCancelModalViewing(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold"
                >
                  {t.cancel}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCancel}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold shadow-xs"
                >
                  {language === 'th' ? 'ยืนยันยกเลิกนัด' : 'Confirm Cancel'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HISTORY MODAL (Customer / Property) */}
      {historyTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-[#0A0C10] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-red-500" />
                <h3 className="font-bold text-sm font-serif">
                  {historyTarget.type === 'customer'
                    ? language === 'th'
                      ? `ประวัติการนัดดูทรัพย์ของลูกค้า: ${historyTarget.name}`
                      : `Viewing History for Client: ${historyTarget.name}`
                    : language === 'th'
                    ? `ประวัติการนัดดูทรัพย์ของ: ${historyTarget.name}`
                    : `Viewing History for Property: ${historyTarget.name}`}
                </h3>
              </div>
              <button
                onClick={() => setHistoryTarget(null)}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-3 max-h-[70vh] overflow-y-auto text-xs">
              {historyViewings.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <History className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p>{language === 'th' ? 'ยังไม่มีประวัติการนัดหมาย' : 'No viewing records found'}</p>
                </div>
              ) : (
                historyViewings.map((hv) => (
                  <div
                    key={hv.id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2 hover:bg-white transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-700">{hv.viewingCode}</span>
                        <span className="text-slate-400">•</span>
                        <span className="font-semibold text-slate-800">
                          {new Date(hv.dateTime).toLocaleDateString()} {new Date(hv.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} น.
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusBadge(hv.status)}`}>
                        {hv.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                      <div>
                        <span className="text-slate-400">Property: </span>
                        <strong>{hv.propertyTitle}</strong> ({hv.propertyCustomId})
                      </div>
                      <div>
                        <span className="text-slate-400">Client: </span>
                        <strong>{hv.customerName}</strong> ({hv.customerPhone})
                      </div>
                      <div>
                        <span className="text-slate-400">Agent: </span>
                        <strong>{hv.agentName}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400">Location: </span>
                        {hv.location}
                      </div>
                    </div>

                    {hv.feedback && (
                      <div className="p-2 rounded-lg bg-amber-50/80 border border-amber-200/60 text-[11px] text-slate-700 italic">
                        Feedback: "{hv.feedback}" ({hv.interestScore || 5}/5 ⭐)
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setHistoryTarget(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold"
              >
                {language === 'th' ? 'ปิด' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FEEDBACK MODAL */}
      {feedbackModalViewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-[#0A0C10] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquareQuote className="w-5 h-5 text-red-500" />
                <h3 className="font-bold text-sm font-serif">
                  {language === 'th' ? 'บันทึกผลการพาชม (Viewing Feedback)' : 'Viewing Feedback & Score'}
                </h3>
              </div>
              <button
                onClick={() => setFeedbackModalViewing(null)}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <p className="text-slate-500 text-[11px]">
                  Appointment Code: <strong className="text-slate-800">{feedbackModalViewing.viewingCode}</strong>
                </p>
                <p className="text-slate-800 font-bold text-sm mt-0.5">{feedbackModalViewing.propertyTitle}</p>
                <p className="text-slate-600">Client: {feedbackModalViewing.customerName}</p>
              </div>

              {/* Interest Level Selection */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  {language === 'th' ? 'ระดับความสนใจของลูกค้า (Interest Level)' : 'Client Interest Level'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Hot', 'Warm', 'Cold'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setFeedbackInterest(lvl)}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all ${
                        feedbackInterest === lvl
                          ? lvl === 'Hot'
                            ? 'bg-red-600 text-white border-red-600'
                            : lvl === 'Warm'
                            ? 'bg-amber-500 text-white border-amber-500'
                            : 'bg-slate-700 text-white border-slate-700'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rating 1-5 */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {language === 'th' ? 'คะแนนความชอบของลูกค้า (1 - 5 ดาว)' : 'Interest Rating (1-5)'}
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFeedbackRating(star)}
                      className="p-1 text-amber-400 hover:scale-110 transition-transform"
                    >
                      <Star
                        className={`w-6 h-6 ${star <= feedbackRating ? 'fill-amber-400' : 'text-slate-200'}`}
                      />
                    </button>
                  ))}
                  <span className="text-xs font-bold text-slate-700 ml-2">{feedbackRating} / 5</span>
                </div>
              </div>

              {/* Feedback Textarea */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {language === 'th' ? 'ความคิดเห็น/ข้อเสนอแนะของลูกค้า' : 'Client Feedback & Objection Notes'}
                </label>
                <textarea
                  rows={3}
                  value={feedbackNotes}
                  onChange={(e) => setFeedbackNotes(e.target.value)}
                  placeholder="เช่น ชอบสระว่ายน้ำและวิวทะเล ขอต่อรองราคาเหลือ 23 ล้าน หรือพร้อมมัดจำใน 3 วัน..."
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setFeedbackModalViewing(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold"
                >
                  {t.cancel}
                </button>
                <button
                  type="button"
                  onClick={handleSaveFeedback}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold"
                >
                  {language === 'th' ? 'บันทึก Feedback' : 'Save Feedback'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT VIEWING MODAL */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-[#0A0C10] text-white flex items-center justify-between">
              <h3 className="font-bold text-sm font-serif">
                {editingViewing
                  ? language === 'th'
                    ? 'แก้ไขนัดหมายพาชม'
                    : 'Edit Viewing Appointment'
                  : language === 'th'
                  ? 'สร้างนัดหมายพาชมทรัพย์ใหม่'
                  : 'Schedule New Viewing Tour'}
              </h3>
              <button
                onClick={() => setEditModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitViewing} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Viewing Code *</label>
                  <input
                    type="text"
                    required
                    value={formData.viewingCode || ''}
                    onChange={(e) => setFormData({ ...formData, viewingCode: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Appointment Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as ViewingStatus })}
                    className="w-full px-3 py-2 border rounded-xl"
                  >
                    {statuses.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Select Customer */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Select Customer (เลือกลูกค้าจากระบบ) *
                </label>
                <select
                  value={formData.customerId}
                  onChange={(e) => {
                    const found = customers.find((c) => c.id === e.target.value);
                    setFormData({
                      ...formData,
                      customerId: e.target.value,
                      customerName: found?.name || '',
                      customerPhone: found?.phone || '',
                    });
                  }}
                  className="w-full px-3 py-2 border rounded-xl text-slate-800"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone}) - {c.type}
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Property */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Select Property (เลือกทรัพย์จากฐานข้อมูล) *
                </label>
                <select
                  value={formData.propertyId}
                  onChange={(e) => {
                    const found = properties.find((p) => p.id === e.target.value || p.propertyId === e.target.value);
                    setFormData({
                      ...formData,
                      propertyId: e.target.value,
                      propertyCustomId: found?.propertyId || '',
                      propertyTitle: found?.title || '',
                      location: found ? `${found.district}, ${found.city}` : formData.location,
                    });
                  }}
                  className="w-full px-3 py-2 border rounded-xl text-slate-800"
                >
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.propertyId}] {p.title} - {p.district}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date & Time and Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Date & Time (วันและเวลา) *</label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.dateTime || ''}
                    onChange={(e) => setFormData({ ...formData, dateTime: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Meeting Location (สถานที่นัดพบ) *</label>
                  <input
                    type="text"
                    required
                    value={formData.location || ''}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="เช่น ล็อบบี้โครงการ, หน้าประตูรั้ววิลล่า"
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>
              </div>

              {/* Assigned Agent */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Assigned Agent (ผู้รับผิดชอบจากระบบ Users) *</label>
                <select
                  value={formData.agentId}
                  onChange={(e) => {
                    const found = users.find((u) => u.id === e.target.value);
                    setFormData({
                      ...formData,
                      agentId: e.target.value,
                      agentName: found?.name || '',
                    });
                  }}
                  className="w-full px-3 py-2 border rounded-xl text-slate-800"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role}) - {u.branch || 'Head Office'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Note */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Note (บันทึกข้อความ / คำแนะนำ)</label>
                <textarea
                  rows={2}
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="รหัสประตู, ข้อความถึงคนขับรถ, เอกสารที่ต้องเตรียม..."
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
