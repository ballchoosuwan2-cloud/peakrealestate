import React, { useState } from 'react';
import { translations, Language } from '../lib/i18n';
import { User } from '../types';
import {
  LayoutDashboard,
  Building2,
  Users,
  CalendarDays,
  FileText,
  KeyRound,
  Wrench,
  CheckSquare,
  BarChart3,
  History,
  UserCog,
  Settings,
  Database,
  UploadCloud,
  CreditCard,
  Layers,
  ChevronDown,
  ChevronRight,
  HardHat,
  Clock,
  Activity,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';

interface SidebarProps {
  activeTab?: string;
  currentTab?: string;
  onNavigate: (tab: string, filter?: string) => void;
  language: Language;
  currentUser: User;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  badgeCounts?: {
    work?: number;
    contracts?: number;
    maintenance?: number;
  };
}

interface NavItem {
  id: string;
  label: string;
  labelTh: string;
  icon: any;
  badge?: number;
  badgeColor?: string;
  pill?: string;
  hidden?: boolean;
}

interface NavSection {
  title: string;
  titleTh: string;
  items: NavItem[];
}

export function Sidebar({
  activeTab,
  currentTab,
  onNavigate,
  language,
  currentUser,
  collapsed = false,
  onToggleCollapse,
  badgeCounts,
}: SidebarProps) {
  const selectedTab = currentTab || activeTab || 'dashboard';
  const t = translations[language];

  const isOperationsActive =
    selectedTab === 'operations' ||
    selectedTab === 'maintenance' ||
    selectedTab === 'operations-maintenance' ||
    selectedTab === 'operations-vendors' ||
    selectedTab === 'operations-preventive' ||
    selectedTab === 'operations-reports';

  const [operationsOpen, setOperationsOpen] = useState(true);

  // Grouped Navigation matching Prime Global Asset enterprise CRM structure
  const navSections: NavSection[] = [
    {
      title: 'OVERVIEW',
      titleTh: 'ภาพรวม',
      items: [
        {
          id: 'dashboard',
          label: t.navDashboard,
          labelTh: 'แดชบอร์ด',
          icon: LayoutDashboard,
        },
      ],
    },
    {
      title: 'PORTFOLIO & INVENTORY',
      titleTh: 'คลังอสังหาฯ และโครงการ',
      items: [
        {
          id: 'properties',
          label: t.navProperties,
          labelTh: 'รายการอสังหาฯ',
          icon: Building2,
        },
        {
          id: 'projects',
          label: language === 'th' ? 'โครงการ & ผังรวม' : 'Projects & Master',
          labelTh: 'โครงการ & ผังรวม',
          icon: Layers,
          pill: 'Master',
        },
        {
          id: 'datacenter',
          label: language === 'th' ? 'Data Center (Postgres)' : 'Property Data Center',
          labelTh: 'คลังข้อมูลสต็อก (DB)',
          icon: Database,
          pill: 'Live DB',
        },
        {
          id: 'add-all',
          label: language === 'th' ? 'นำเข้าข้อมูล / Add All' : 'Bulk Import / Add All',
          labelTh: 'นำเข้าข้อมูล / Add All',
          icon: UploadCloud,
        },
      ],
    },
    {
      title: 'SALES & CLIENT CRM',
      titleTh: 'ลูกค้าและการขาย',
      items: [
        {
          id: 'customers',
          label: t.navCustomers,
          labelTh: 'ลูกค้า & ผู้สนใจ (CRM)',
          icon: Users,
        },
        {
          id: 'viewing',
          label: t.navViewings,
          labelTh: 'นัดดูทรัพย์',
          icon: CalendarDays,
        },
        {
          id: 'work',
          label: t.navWork,
          labelTh: 'งานวันนี้ & ติดตาม',
          icon: CheckSquare,
          badge: badgeCounts?.work,
          badgeColor: 'bg-amber-600',
        },
      ],
    },
    {
      title: 'TRANSACTIONS & CONTRACTS',
      titleTh: 'สัญญาและส่งมอบ',
      items: [
        {
          id: 'contracts',
          label: t.navContracts,
          labelTh: 'สัญญา & ข้อตกลง',
          icon: FileText,
          badge: badgeCounts?.contracts,
          badgeColor: 'bg-red-600',
        },
        {
          id: 'checkinout',
          label: t.navCheckInOut,
          labelTh: 'เช็คอิน / เช็คเอาท์',
          icon: KeyRound,
        },
      ],
    },
    {
      title: 'FINANCE & SETTLEMENT',
      titleTh: 'การเงินและรายได้',
      items: [
        {
          id: 'finance',
          label: t.navFinance,
          labelTh: 'การเงิน & ตารางชำระ',
          icon: CreditCard,
        },
      ],
    },
  ];

  const operationsSubItems = [
    {
      id: 'operations-maintenance',
      label: language === 'th' ? 'แจ้งซ่อม & ใบงาน' : 'Maintenance Requests',
      icon: Wrench,
      badge: badgeCounts?.maintenance,
    },
    {
      id: 'operations-vendors',
      label: language === 'th' ? 'ทะเบียนช่าง & คู่ค้า' : 'Vendors & Technicians',
      icon: HardHat,
    },
    {
      id: 'operations-preventive',
      label: language === 'th' ? 'บำรุงรักษาเชิงป้องกัน' : 'Preventive Maintenance',
      icon: Clock,
    },
    {
      id: 'operations-reports',
      label: language === 'th' ? 'รายงานงานปฏิบัติการ' : 'Maintenance Reports',
      icon: Activity,
    },
  ];

  const bottomSections: NavSection[] = [
    {
      title: 'REPORTS & INTELLIGENCE',
      titleTh: 'รายงานและประวัติ',
      items: [
        {
          id: 'reports',
          label: t.navReports,
          labelTh: 'รายงาน & วิเคราะห์ (BI)',
          icon: BarChart3,
        },
        {
          id: 'records',
          label: t.navRecords,
          labelTh: 'Audit Trail & บันทึก',
          icon: History,
        },
      ],
    },
    {
      title: 'ADMINISTRATION',
      titleTh: 'ตั้งค่าระบบ',
      items: [
        {
          id: 'users',
          label: t.navUsers,
          labelTh: 'จัดการผู้ใช้ & สิทธิ์',
          icon: UserCog,
        },
        {
          id: 'settings',
          label: t.navSettings,
          labelTh: 'ตั้งค่าระบบ & สำรอง',
          icon: Settings,
        },
      ],
    },
  ];

  return (
    <aside
      className={`hidden lg:flex flex-col ${
        collapsed ? 'w-20' : 'w-64'
      } bg-[#0A0C10] border-r border-slate-800 shrink-0 text-slate-300 min-h-[calc(100vh-4rem)] select-none transition-all duration-300 relative`}
    >
      {/* Role / Branch Banner */}
      <div className="px-3.5 py-3 mx-2.5 my-2.5 rounded-xl bg-slate-900/90 border border-slate-800/80 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-2 h-2 rounded-full bg-red-600 animate-ping shrink-0" />
          {!collapsed && (
            <div className="min-w-0">
              <span className="text-xs font-bold text-slate-100 block truncate">{currentUser.role}</span>
              <span className="text-[10px] text-slate-400 block truncate">{currentUser.branch.split(' ')[0]}</span>
            </div>
          )}
        </div>
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            aria-label="Toggle Sidebar"
          >
            {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 px-2.5 space-y-4 overflow-y-auto pb-6 scrollbar-thin scrollbar-thumb-slate-800">
        {/* Top Sections */}
        {navSections.map((section) => (
          <div key={section.title} className="space-y-1">
            {!collapsed && (
              <div className="px-3 pt-2 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>{language === 'th' ? section.titleTh : section.title}</span>
              </div>
            )}
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = selectedTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  title={collapsed ? (language === 'th' ? item.labelTh : item.label) : undefined}
                  className={`w-full flex items-center justify-between ${
                    collapsed ? 'px-3 py-2.5 justify-center' : 'px-3 py-2'
                  } rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-red-950/80 via-red-900/40 to-transparent text-white font-semibold border-l-3 border-red-600 shadow-sm'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-red-500' : 'text-slate-400'}`} />
                    {!collapsed && <span className="truncate">{language === 'th' ? item.labelTh : item.label}</span>}
                  </div>
                  {!collapsed && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.pill && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                          {item.pill}
                        </span>
                      )}
                      {item.badge && item.badge > 0 ? (
                        <span
                          className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white ${
                            item.badgeColor || 'bg-red-600'
                          }`}
                        >
                          {item.badge}
                        </span>
                      ) : null}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ))}

        {/* OPERATIONS GROUP ACCORDION */}
        <div className="space-y-1">
          {!collapsed && (
            <div className="px-3 pt-2 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>{language === 'th' ? 'ปฏิบัติการและงานช่าง' : 'OPERATIONS & REPAIRS'}</span>
            </div>
          )}
          <button
            onClick={() => {
              setOperationsOpen(!operationsOpen);
              if (!isOperationsActive) {
                onNavigate('operations-maintenance');
              }
            }}
            title={collapsed ? 'Operations' : undefined}
            className={`w-full flex items-center justify-between ${
              collapsed ? 'px-3 py-2.5 justify-center' : 'px-3 py-2'
            } rounded-lg text-xs font-medium transition-all cursor-pointer ${
              isOperationsActive
                ? 'bg-slate-900/90 text-white font-semibold border border-slate-800'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
            }`}
          >
            <div className="flex items-center gap-2.5 truncate">
              <Wrench className={`w-4 h-4 shrink-0 ${isOperationsActive ? 'text-red-500' : 'text-slate-400'}`} />
              {!collapsed && (
                <span className="truncate font-semibold">{language === 'th' ? 'งานช่าง & ปฏิบัติการ' : 'Operations & Maintenance'}</span>
              )}
            </div>
            {!collapsed && (
              <div className="flex items-center gap-1.5">
                {badgeCounts?.maintenance && badgeCounts.maintenance > 0 ? (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-600 text-white">
                    {badgeCounts.maintenance}
                  </span>
                ) : null}
                {operationsOpen ? (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                )}
              </div>
            )}
          </button>

          {/* Sub-items */}
          {operationsOpen && !collapsed && (
            <div className="ml-3 pl-2.5 border-l border-slate-800/80 mt-1 space-y-1">
              {operationsSubItems.map((sub) => {
                const SubIcon = sub.icon;
                const isSubActive =
                  selectedTab === sub.id ||
                  (sub.id === 'operations-maintenance' && selectedTab === 'maintenance');

                return (
                  <button
                    key={sub.id}
                    onClick={() => onNavigate(sub.id)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                      isSubActive
                        ? 'bg-red-600/20 text-red-400 font-semibold border border-red-500/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <SubIcon className={`w-3.5 h-3.5 shrink-0 ${isSubActive ? 'text-red-400' : 'text-slate-500'}`} />
                      <span className="truncate">{sub.label}</span>
                    </div>
                    {sub.badge && sub.badge > 0 ? (
                      <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-red-600 text-white">
                        {sub.badge}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Bottom Sections: Reports & Admin */}
        {bottomSections.map((section) => (
          <div key={section.title} className="space-y-1">
            {!collapsed && (
              <div className="px-3 pt-2 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>{language === 'th' ? section.titleTh : section.title}</span>
              </div>
            )}
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = selectedTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  title={collapsed ? (language === 'th' ? item.labelTh : item.label) : undefined}
                  className={`w-full flex items-center justify-between ${
                    collapsed ? 'px-3 py-2.5 justify-center' : 'px-3 py-2'
                  } rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-red-950/80 via-red-900/40 to-transparent text-white font-semibold border-l-3 border-red-600 shadow-sm'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-red-500' : 'text-slate-400'}`} />
                    {!collapsed && <span className="truncate">{language === 'th' ? item.labelTh : item.label}</span>}
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer / System Status */}
      <div className="p-3 border-t border-slate-900 text-[11px] text-slate-500 bg-[#07090C]">
        <div className="flex items-center justify-between">
          {!collapsed && <span>PEAK Real Estate CRM</span>}
          <span className="text-emerald-500 font-mono text-[10px] flex items-center gap-1 mx-auto lg:mx-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" /> Live DB
          </span>
        </div>
        {!collapsed && <p className="text-[10px] text-slate-600 mt-0.5">Enterprise Cloud Edition</p>}
      </div>
    </aside>
  );
}
