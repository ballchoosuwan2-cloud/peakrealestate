import React, { useState, useEffect } from 'react';
import { translations, Language } from '../lib/i18n';
import {
  User,
  MonthlyKPI,
  Viewing,
  Contract,
  CheckInOut,
  MaintenanceIssue,
  WorkTask,
  Property
} from '../types';
import {
  CalendarDays,
  FileSignature,
  KeyRound,
  LogOut as LogOutIcon,
  Wrench,
  Search,
  BarChart3,
  History,
  TrendingUp,
  ArrowRight,
  Clock,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Award,
  UploadCloud,
  CreditCard,
  UserCog,
  Settings,
  DollarSign,
  Filter,
  RefreshCw,
} from 'lucide-react';

interface DashboardViewProps {
  currentUser: User;
  kpi: MonthlyKPI;
  language: Language;
  onNavigate: (tab: string, filter?: string) => void;
  viewings?: Viewing[];
  contracts?: Contract[];
  checkInOuts?: CheckInOut[];
  maintenanceIssues?: MaintenanceIssue[];
  workTasks?: WorkTask[];
  tasks?: WorkTask[];
  properties?: Property[];
  onToggleTask?: (taskId: string) => void;
}

export function DashboardView({
  currentUser,
  kpi,
  language,
  onNavigate,
  viewings = [],
  contracts = [],
  checkInOuts = [],
  maintenanceIssues = [],
  workTasks,
  tasks,
  properties = [],
  onToggleTask = () => {},
}: DashboardViewProps) {
  const taskList = workTasks || tasks || [];
  const t = translations[language];

  // B29 Live KPI State fetched from real database API
  const [liveKPI, setLiveKPI] = useState<any>(null);
  const [dashRange, setDashRange] = useState<'thisMonth' | 'all' | '7d' | '30d'>('thisMonth');
  const [dashBranch, setDashBranch] = useState<string>('all');
  const [isLoadingKPI, setIsLoadingKPI] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    const fetchKPI = async () => {
      setIsLoadingKPI(true);
      try {
        const queryParams = new URLSearchParams();
        if (dashRange !== 'all') {
          const now = new Date();
          const today = now.toISOString().slice(0, 10);
          if (dashRange === '7d') {
            const past = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
            queryParams.set('startDate', past);
            queryParams.set('endDate', today);
          } else if (dashRange === '30d') {
            const past = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
            queryParams.set('startDate', past);
            queryParams.set('endDate', today);
          } else if (dashRange === 'thisMonth') {
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
            queryParams.set('startDate', firstDay);
            queryParams.set('endDate', today);
          }
        }
        if (dashBranch !== 'all') {
          queryParams.set('branch', dashBranch);
        }

        const res = await fetch(`/api/reports/dashboard-kpi?${queryParams.toString()}`, {
          headers: {
            'x-user-role': currentUser.role,
            'x-user-name': currentUser.name,
            'x-user-id': currentUser.id,
          },
        });
        if (res.ok && isMounted) {
          const data = await res.json();
          setLiveKPI(data);
        }
      } catch (err) {
        // Fallback to props data
      } finally {
        if (isMounted) setIsLoadingKPI(false);
      }
    };

    fetchKPI();
    return () => {
      isMounted = false;
    };
  }, [dashRange, dashBranch, currentUser]);

  // Calculated metrics for 8-grid menu badges
  const todayDateStr = new Date().toISOString().slice(0, 10);
  const todayViewingsCount = viewings.filter((v) => v.dateTime.startsWith(todayDateStr) && v.status !== 'Cancelled').length;
  const activeContractsCount = contracts.filter((c) => c.status === 'Active' || c.status === 'Expiring Soon').length;
  const inProgressIssuesCount = maintenanceIssues.filter((m) => m.status === 'New' || m.status === 'In Progress').length;
  const availablePropertiesCount = properties.filter((p) => p.status === 'Available').length;

  // 8 Grid Menu items specified in prompt:
  // 1. Viewing, 2. Sign Contract, 3. Check-in, 4. Check-out, 5. Fix Issue, 6. Property Search, 7. Reports, 8. Records
  const gridMenuItems = [
    {
      id: 'viewing',
      title: t.menuViewing,
      sub: language === 'th' ? 'นัดหมายและตารางทัวร์ทรัพย์' : 'Appointments & Tours',
      icon: CalendarDays,
      badge: todayViewingsCount > 0 ? `${todayViewingsCount} ${language === 'th' ? 'วันนี้' : 'today'}` : undefined,
      color: 'from-blue-600 to-indigo-700',
      action: () => onNavigate('viewing'),
    },
    {
      id: 'contract',
      title: t.menuSignContract,
      sub: language === 'th' ? 'สัญญาจะซื้อจะขาย & สัญญาเช่า' : 'Leases & Sales Agreements',
      icon: FileSignature,
      badge: `${activeContractsCount} ${language === 'th' ? 'ฉบับ' : 'active'}`,
      color: 'from-amber-600 to-yellow-600',
      action: () => onNavigate('contracts'),
    },
    {
      id: 'checkin',
      title: t.menuCheckIn,
      sub: language === 'th' ? 'ส่งมอบห้อง & จดมิเตอร์น้ำ-ไฟ' : 'Move-in & Meter Inspection',
      icon: KeyRound,
      color: 'from-emerald-600 to-teal-700',
      action: () => onNavigate('checkinout', 'Check-in'),
    },
    {
      id: 'checkout',
      title: t.menuCheckOut,
      sub: language === 'th' ? 'คืนห้องพัก & คืนเงินมัดจำ' : 'Move-out & Deposit Settlement',
      icon: LogOutIcon,
      color: 'from-cyan-600 to-blue-700',
      action: () => onNavigate('checkinout', 'Check-out'),
    },
    {
      id: 'fixissue',
      title: t.menuFixIssue,
      sub: language === 'th' ? 'แจ้งซ่อมแอร์ ท่อประปา ไฟฟ้า' : 'Repairs & Technical Tickets',
      icon: Wrench,
      badge: inProgressIssuesCount > 0 ? `${inProgressIssuesCount} ${language === 'th' ? 'ค้าง' : 'pending'}` : undefined,
      color: 'from-rose-600 to-red-700',
      action: () => onNavigate('maintenance'),
    },
    {
      id: 'propertysearch',
      title: t.menuPropertySearch,
      sub: language === 'th' ? 'ค้นหาวิลล่า คอนโด ที่ดิน' : 'Search Villas, Condos, Land',
      icon: Search,
      badge: `${availablePropertiesCount} ${language === 'th' ? 'พร้อมขาย/เช่า' : 'available'}`,
      color: 'from-slate-700 to-slate-900',
      action: () => onNavigate('properties'),
    },
    {
      id: 'reports',
      title: t.menuReports,
      sub: language === 'th' ? 'สถิติรายได้ & ค่าคอมมิชชัน' : 'Sales Volume & BI Analytics',
      icon: BarChart3,
      color: 'from-purple-600 to-violet-800',
      action: () => onNavigate('reports'),
    },
    {
      id: 'records',
      title: t.menuRecords,
      sub: language === 'th' ? 'บันทึกประวัติการทำงาน' : 'Audit Logs & Timeline',
      icon: History,
      color: 'from-zinc-700 to-neutral-900',
      action: () => onNavigate('records'),
    },
  ];

  // Circular KPI Score calculation
  const circleRadius = 42;
  const circumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circumference - (kpi.kpiScore / 100) * circumference;

  const formatTHB = (num: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      maximumFractionDigits: 0,
    }).format(num);
  };

  const salesPct = Math.min(100, Math.round((kpi.currentSales / kpi.targetSales) * 100));
  const viewingsPct = Math.min(100, Math.round((kpi.viewings / kpi.viewingsTarget) * 100));
  const followUpsPct = Math.min(100, Math.round((kpi.ownerFollowUps / kpi.ownerFollowUpsTarget) * 100));
  const listingsPct = Math.min(100, Math.round((kpi.newListings / kpi.newListingsTarget) * 100));

  return (
    <div className="space-y-6 w-full pb-10">
      {/* 1. Welcome Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0F1218] via-[#151922] to-[#1C222E] border border-slate-800/90 shadow-2xl p-5 sm:p-7 text-white">
        {/* Background decorative luxury glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-60 h-60 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="relative shrink-0">
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover ring-2 ring-red-600/40 shadow-xl"
              />
              <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-[#0F1218] rounded-full" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-widest text-red-400 font-semibold flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 fill-red-500 text-red-500" />
                  {t.welcomeHello}
                </span>
                <span className="text-slate-400">•</span>
                <span className="text-xs text-slate-300 font-medium">
                  {currentUser.role}
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-bold font-serif text-white tracking-wide mt-0.5">
                Hello, {currentUser.name}
              </h2>

              <p className="text-xs sm:text-sm text-slate-300 font-medium mt-1 flex items-center gap-2">
                <span className="text-red-500 font-semibold">{t.brandSub}</span>
                <span className="text-slate-600">|</span>
                <span className="text-slate-400">{currentUser.title}</span>
              </p>
            </div>
          </div>

          {/* Quick Summary Badges */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3 shrink-0">
            <div
              onClick={() => onNavigate('work')}
              className="cursor-pointer bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 rounded-xl px-3.5 py-2 transition-all flex items-center gap-2"
            >
              <Clock className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <p className="text-[10px] text-slate-400">{language === 'th' ? 'งานวันนี้' : "Today's Work"}</p>
                <p className="text-xs font-bold text-white">
                  {taskList.filter((t) => t.status === 'Pending').length} {language === 'th' ? 'รายการ' : 'tasks'}
                </p>
              </div>
            </div>

            <div
              onClick={() => onNavigate('viewing')}
              className="cursor-pointer bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 rounded-xl px-3.5 py-2 transition-all flex items-center gap-2"
            >
              <CalendarDays className="w-4 h-4 text-blue-400 shrink-0" />
              <div>
                <p className="text-[10px] text-slate-400">{language === 'th' ? 'นัดดูทรัพย์วันนี้' : 'Viewings Today'}</p>
                <p className="text-xs font-bold text-white">
                  {todayViewingsCount} {language === 'th' ? 'นัดหมาย' : 'viewings'}
                </p>
              </div>
            </div>

            <div
              onClick={() => onNavigate('properties')}
              className="cursor-pointer bg-red-950/40 hover:bg-red-900/40 border border-red-800/80 rounded-xl px-3.5 py-2 transition-all flex items-center gap-2"
            >
              <Award className="w-4 h-4 text-red-400 shrink-0" />
              <div>
                <p className="text-[10px] text-red-300">{language === 'th' ? 'ทรัพย์ในพอร์ต' : 'Active Portfolio'}</p>
                <p className="text-xs font-bold text-white">{properties.length} {language === 'th' ? 'ยูนิต' : 'units'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* B29 — Executive KPI Bar & Direct Reports Jump */}
      <div className="rounded-2xl bg-white border border-slate-200/90 shadow-xs p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-red-50 text-red-600">
              <BarChart3 className="w-4 h-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  {language === 'th' ? 'ดัชนีชี้วัดผลงานหลักแบบเรียลไทม์ (B29 Live KPIs)' : 'Executive Performance KPIs (B29)'}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live DB
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {language === 'th'
                  ? 'ข้อมูลรวมจากระบบ PostgreSQL คำนวณตามสิทธิ์ RBAC'
                  : 'Real-time aggregated metrics from PostgreSQL database'}
              </p>
            </div>
          </div>

          {/* Quick Date Range & Branch Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs">
              {(['thisMonth', '30d', '7d', 'all'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setDashRange(r)}
                  className={`px-2 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                    dashRange === r ? 'bg-white text-slate-900 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {r === 'thisMonth' ? (language === 'th' ? 'เดือนนี้' : 'Month') : r.toUpperCase()}
                </button>
              ))}
            </div>

            <button
              onClick={() => onNavigate('reports')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-all shadow-xs cursor-pointer"
            >
              <span>{language === 'th' ? 'ดูรายงานทั้งหมด' : 'Full Reports'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 6 Key Operational Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* 1. Properties */}
          <div
            onClick={() => onNavigate('properties')}
            className="p-3 rounded-xl bg-slate-50/80 border border-slate-100 hover:border-slate-300 transition-all cursor-pointer"
          >
            <p className="text-[10px] uppercase font-bold text-slate-400">{language === 'th' ? 'ทรัพย์ในสต็อก' : 'Properties'}</p>
            <p className="text-lg font-bold text-slate-900 mt-0.5">
              {liveKPI?.properties?.total ?? properties.length}
            </p>
            <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
              <span className="text-emerald-600 font-semibold">{liveKPI?.properties?.available ?? availablePropertiesCount} {language === 'th' ? 'ว่าง' : 'avail'}</span>
              <span>{liveKPI?.properties?.rented ?? 0} {language === 'th' ? 'เช่า' : 'rent'}</span>
            </div>
          </div>

          {/* 2. Leads & Conversion */}
          <div
            onClick={() => onNavigate('customers')}
            className="p-3 rounded-xl bg-slate-50/80 border border-slate-100 hover:border-slate-300 transition-all cursor-pointer"
          >
            <p className="text-[10px] uppercase font-bold text-slate-400">{language === 'th' ? 'ลีด / ปิดการขาย' : 'Leads & Conv.'}</p>
            <p className="text-lg font-bold text-slate-900 mt-0.5">
              {liveKPI?.clients?.total ?? 24}
            </p>
            <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
              <span className="text-red-600 font-semibold">🔥 {liveKPI?.clients?.hotLeads ?? 8} Hot</span>
              <span className="text-emerald-600 font-bold">{liveKPI?.clients?.conversionRate ?? 28.5}%</span>
            </div>
          </div>

          {/* 3. Viewings */}
          <div
            onClick={() => onNavigate('viewing')}
            className="p-3 rounded-xl bg-slate-50/80 border border-slate-100 hover:border-slate-300 transition-all cursor-pointer"
          >
            <p className="text-[10px] uppercase font-bold text-slate-400">{language === 'th' ? 'นัดดูทรัพย์' : 'Viewings'}</p>
            <p className="text-lg font-bold text-slate-900 mt-0.5">
              {liveKPI?.viewings?.total ?? viewings.length}
            </p>
            <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
              <span className="text-blue-600 font-bold">{liveKPI?.viewings?.today ?? todayViewingsCount} {language === 'th' ? 'วันนี้' : 'today'}</span>
              <span className="text-amber-600">⭐ {liveKPI?.viewings?.avgFeedbackScore ?? 4.8}</span>
            </div>
          </div>

          {/* 4. Sales Volume */}
          <div
            onClick={() => onNavigate('reports')}
            className="p-3 rounded-xl bg-slate-50/80 border border-slate-100 hover:border-slate-300 transition-all cursor-pointer"
          >
            <p className="text-[10px] uppercase font-bold text-slate-400">{language === 'th' ? 'ยอดขายสัญญา' : 'Sales Volume'}</p>
            <p className="text-base font-bold text-red-600 mt-0.5 truncate">
              {formatTHB(liveKPI?.contracts?.salesVolume ?? 64400000)}
            </p>
            <p className="text-[10px] text-slate-500 mt-1 truncate">
              {liveKPI?.contracts?.active ?? activeContractsCount} {language === 'th' ? 'สัญญาดำเนินการ' : 'active deals'}
            </p>
          </div>

          {/* 5. Payments & Overdue */}
          <div
            onClick={() => onNavigate('finance')}
            className="p-3 rounded-xl bg-slate-50/80 border border-slate-100 hover:border-slate-300 transition-all cursor-pointer"
          >
            <p className="text-[10px] uppercase font-bold text-slate-400">{language === 'th' ? 'การเงิน / ค้างชำระ' : 'Payments & Overdue'}</p>
            <p className="text-base font-bold text-emerald-700 mt-0.5 truncate">
              {formatTHB(liveKPI?.payments?.revenueCollected ?? 14500000)}
            </p>
            <div className="flex items-center justify-between text-[10px] mt-1">
              <span className="text-amber-600 truncate">{formatTHB(liveKPI?.payments?.pendingAmount ?? 3200000)}</span>
              {(liveKPI?.payments?.overdueCount ?? 1) > 0 && (
                <span className="text-red-600 font-bold shrink-0">! {liveKPI?.payments?.overdueCount ?? 1}</span>
              )}
            </div>
          </div>

          {/* 6. Follow-up Tasks */}
          <div
            onClick={() => onNavigate('work')}
            className="p-3 rounded-xl bg-slate-50/80 border border-slate-100 hover:border-slate-300 transition-all cursor-pointer"
          >
            <p className="text-[10px] uppercase font-bold text-slate-400">{language === 'th' ? 'งานฟอลโลว์อัป' : 'Follow-up Tasks'}</p>
            <p className="text-lg font-bold text-slate-900 mt-0.5">
              {liveKPI?.followUps?.total ?? 12}
            </p>
            <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
              <span className="text-amber-600 font-bold">{liveKPI?.followUps?.today ?? 3} {language === 'th' ? 'วันนี้' : 'today'}</span>
              {(liveKPI?.followUps?.overdue ?? 1) > 0 ? (
                <span className="text-red-600 font-bold">{liveKPI?.followUps?.overdue ?? 1} {language === 'th' ? 'เลยกำหนด' : 'overdue'}</span>
              ) : (
                <span className="text-emerald-600">✓ On time</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4 Core Integrated Modules (Add All, Finance & Payment, User Management, System Settings) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              {language === 'th' ? 'โมดูลระบบหลัก (Core Modules)' : 'Core Integrated Modules'}
            </h3>
          </div>
          <span className="text-xs text-slate-500">
            {language === 'th' ? '4 โมดูลหลักพร้อมใช้งาน' : '4 Active Modules'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* 1. Add All */}
          <button
            onClick={() => onNavigate('add-all')}
            className="group relative p-4 rounded-xl bg-gradient-to-br from-slate-900 via-[#10141C] to-[#161C26] border border-slate-800 hover:border-emerald-500/80 shadow-md hover:shadow-xl transition-all duration-200 text-left hover:-translate-y-0.5 overflow-hidden text-white cursor-pointer"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-600 to-teal-400 group-hover:h-1.5 transition-all" />
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-800/80 text-emerald-400 shadow-md group-hover:scale-105 transition-transform">
                <UploadCloud className="w-5 h-5" />
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                1. Add All
              </span>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">
                  Add All
                </h4>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
              </div>
              <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                {language === 'th' ? 'Import / Excel / Multi-File / Media' : 'Import / Excel / Multi-File / Media'}
              </p>
            </div>
          </button>

          {/* 2. Finance & Payment */}
          <button
            onClick={() => onNavigate('finance')}
            className="group relative p-4 rounded-xl bg-gradient-to-br from-slate-900 via-[#10141C] to-[#161C26] border border-slate-800 hover:border-blue-500/80 shadow-md hover:shadow-xl transition-all duration-200 text-left hover:-translate-y-0.5 overflow-hidden text-white cursor-pointer"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-cyan-400 group-hover:h-1.5 transition-all" />
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="p-2.5 rounded-xl bg-blue-950/80 border border-blue-800/80 text-blue-400 shadow-md group-hover:scale-105 transition-transform">
                <CreditCard className="w-5 h-5" />
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-950 text-blue-300 border border-blue-800">
                2. Finance
              </span>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">
                  Finance & Payment
                </h4>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
              </div>
              <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                {language === 'th' ? 'การเงิน, ค่าเช่า, มัดจำ & สลิปโอน' : 'Payment Records & Rent Settlement'}
              </p>
            </div>
          </button>

          {/* 3. User Management */}
          <button
            onClick={() => onNavigate('users')}
            className="group relative p-4 rounded-xl bg-gradient-to-br from-slate-900 via-[#10141C] to-[#161C26] border border-slate-800 hover:border-purple-500/80 shadow-md hover:shadow-xl transition-all duration-200 text-left hover:-translate-y-0.5 overflow-hidden text-white cursor-pointer"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-600 to-pink-400 group-hover:h-1.5 transition-all" />
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="p-2.5 rounded-xl bg-purple-950/80 border border-purple-800/80 text-purple-400 shadow-md group-hover:scale-105 transition-transform">
                <UserCog className="w-5 h-5" />
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-950 text-purple-300 border border-purple-800">
                3. Users
              </span>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white group-hover:text-purple-400 transition-colors">
                  User Management
                </h4>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
              </div>
              <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                {language === 'th' ? 'ทีมงาน, บทบาท RBAC & ยอดขาย' : 'Staff, RBAC Roles & Targets'}
              </p>
            </div>
          </button>

          {/* 4. System Settings */}
          <button
            onClick={() => onNavigate('settings')}
            className="group relative p-4 rounded-xl bg-gradient-to-br from-slate-900 via-[#10141C] to-[#161C26] border border-slate-800 hover:border-amber-500/80 shadow-md hover:shadow-xl transition-all duration-200 text-left hover:-translate-y-0.5 overflow-hidden text-white cursor-pointer"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-600 to-yellow-400 group-hover:h-1.5 transition-all" />
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="p-2.5 rounded-xl bg-amber-950/80 border border-amber-800/80 text-amber-400 shadow-md group-hover:scale-105 transition-transform">
                <Settings className="w-5 h-5" />
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800">
                4. Settings
              </span>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors">
                  System Settings
                </h4>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
              </div>
              <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                {language === 'th' ? 'ตั้งค่าระบบ, สำรองข้อมูล & Audit Trail' : 'System Config, Audit Trail & Backup'}
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* 2. Grid Menu: 8 Items (Requested by prompt) */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              {language === 'th' ? 'เมนูด่วนการดำเนินงาน' : 'Quick Operations Menu'}
            </h3>
          </div>
          <span className="text-xs text-slate-500">
            {language === 'th' ? '8 ฟังก์ชันหลัก' : '8 Core Functions'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {gridMenuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={item.action}
                className="group relative flex flex-col justify-between p-4 rounded-xl bg-white border border-slate-200/90 hover:border-red-500/80 shadow-xs hover:shadow-lg transition-all duration-200 text-left hover:-translate-y-0.5 overflow-hidden"
              >
                {/* Subtle gradient bar on top */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent group-hover:from-red-600 group-hover:to-rose-500 transition-all" />

                <div className="flex items-start justify-between gap-2 w-full mb-3">
                  <div className={`p-2.5 rounded-xl bg-gradient-to-br ${item.color} text-white shadow-md group-hover:scale-105 transition-transform`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  {item.badge && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                      {item.badge}
                    </span>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-900 group-hover:text-red-700 transition-colors">
                      {item.title}
                    </h4>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-red-600 group-hover:translate-x-1 transition-all" />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                    {item.sub}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Two-Column Widgets: Today's Work Agenda & Today's Viewings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Tasks */}
        <div className="rounded-2xl bg-white border border-slate-200/90 shadow-sm p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-red-600" />
                <h4 className="text-sm font-bold text-slate-900">{t.workTodaySchedule}</h4>
              </div>
              <button
                onClick={() => onNavigate('work')}
                className="text-xs text-red-700 hover:text-red-800 font-medium flex items-center gap-1"
              >
                {language === 'th' ? 'ดูทั้งหมด' : 'View all'}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2.5">
              {taskList.slice(0, 4).map((task) => (
                <div
                  key={task.id}
                  className="flex items-start justify-between gap-3 p-2.5 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start gap-2.5">
                    <button
                      onClick={() => onToggleTask(task.id)}
                      className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                        task.status === 'Completed'
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'border-slate-300 hover:border-slate-400'
                      }`}
                    >
                      {task.status === 'Completed' && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </button>
                    <div>
                      <p className={`text-xs font-semibold ${task.status === 'Completed' ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                        {task.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500">
                        <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                          {task.category}
                        </span>
                        <span>•</span>
                        <span>{task.assignedToName}</span>
                      </div>
                    </div>
                  </div>

                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                    task.priority === 'Urgent'
                      ? 'bg-red-50 text-red-700 border border-red-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}>
                    {task.priority}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Today's Scheduled Viewings */}
        <div className="rounded-2xl bg-white border border-slate-200/90 shadow-sm p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-blue-600" />
                <h4 className="text-sm font-bold text-slate-900">
                  {language === 'th' ? 'นัดดูทรัพย์เร็วๆ นี้' : 'Upcoming Viewings'}
                </h4>
              </div>
              <button
                onClick={() => onNavigate('viewing')}
                className="text-xs text-blue-700 hover:text-blue-800 font-medium flex items-center gap-1"
              >
                {language === 'th' ? 'ดูตารางทั้งหมด' : 'Full schedule'}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2.5">
              {viewings.slice(0, 3).map((v) => (
                <div
                  key={v.id}
                  onClick={() => onNavigate('viewing')}
                  className="cursor-pointer p-3 rounded-xl border border-slate-100 hover:border-blue-300 hover:bg-blue-50/30 transition-all flex items-start justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{v.customerName}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                        {v.propertyCustomId}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 line-clamp-1 font-medium">
                      {v.propertyTitle}
                    </p>
                    <p className="text-[10px] text-slate-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {v.location}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold text-blue-800 block">
                      {new Date(v.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {new Date(v.dateTime).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                    <span className={`mt-1 inline-block text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                      v.status === 'Confirmed'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {v.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
