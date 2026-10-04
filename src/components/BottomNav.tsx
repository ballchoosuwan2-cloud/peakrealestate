import React, { useState } from 'react';
import { translations, Language } from '../lib/i18n';
import { User } from '../types';
import {
  Home,
  CheckSquare,
  Building2,
  User as UserIcon,
  Grid,
  X,
  Users,
  CalendarDays,
  FileText,
  KeyRound,
  Wrench,
  BarChart3,
  History,
  UserCog,
  Settings,
  LogOut,
  Database,
  UploadCloud,
  CreditCard,
} from 'lucide-react';

interface BottomNavProps {
  activeTab?: string;
  currentTab?: string;
  onNavigate: (tab: string) => void;
  language: Language;
  currentUser: User;
  onLogout?: () => void;
  badgeCounts?: {
    work?: number;
    contracts?: number;
    maintenance?: number;
  };
}

export function BottomNav({
  activeTab,
  currentTab,
  onNavigate,
  language,
  currentUser,
  onLogout,
  badgeCounts,
}: BottomNavProps) {
  const selectedTab = currentTab || activeTab || 'dashboard';
  const [moreDrawerOpen, setMoreDrawerOpen] = useState(false);
  const t = translations[language];

  const navItems = [
    { id: 'dashboard', label: t.bottomHome, icon: Home },
    { id: 'work', label: t.bottomWork, icon: CheckSquare },
    { id: 'properties', label: t.bottomProperty, icon: Building2 },
    { id: 'profile', label: t.bottomMy, icon: UserIcon },
    { id: 'more', label: t.bottomMore, icon: Grid },
  ];

  const moreMenuItems = [
    { id: 'add-all', label: t.navAddAll, icon: UploadCloud, desc: 'Excel Import / Multi-File Merge' },
    { id: 'finance', label: t.navFinance, icon: CreditCard, desc: 'Payment Records & Rent Settlement' },
    { id: 'users', label: t.navUsers, icon: UserCog, desc: 'Team & Role Access' },
    { id: 'settings', label: t.navSettings, icon: Settings, desc: 'System Configuration' },
    { id: 'datacenter', label: (t as any).navDataCenter || 'Property Data Center', icon: Database, desc: 'Live PostgreSQL Database & Bulk Tools' },
    { id: 'customers', label: t.navCustomers, icon: Users, desc: 'Clients & Leads CRM' },
    { id: 'viewing', label: t.navViewings, icon: CalendarDays, desc: 'Appointments & Site Tours' },
    { id: 'contracts', label: t.navContracts, icon: FileText, desc: 'Leases, Sales & Listings' },
    { id: 'checkinout', label: t.navCheckInOut, icon: KeyRound, desc: 'Meter Readings & Handover' },
    { id: 'maintenance', label: t.navMaintenance, icon: Wrench, desc: 'Fix Issues & Repairs' },
    { id: 'reports', label: t.navReports, icon: BarChart3, desc: 'Analytics & Financial BI', hidden: currentUser.role === 'Staff' },
    { id: 'records', label: t.navRecords, icon: History, desc: 'Audit & Activity Trail' },
  ];

  return (
    <>
      {/* Mobile Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0A0C10] border-t border-slate-800/90 shadow-2xl backdrop-blur-md px-1 py-1 safe-area-pb">
        <div className="grid grid-cols-5 items-center justify-items-center h-14 max-w-md mx-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isMore = item.id === 'more';
            const isActive = isMore
              ? moreDrawerOpen
              : (selectedTab === item.id || (item.id === 'profile' && selectedTab === 'my')) && !moreDrawerOpen;

            return (
              <button
                key={item.id}
                onClick={() => {
                  if (isMore) {
                    setMoreDrawerOpen(!moreDrawerOpen);
                  } else {
                    setMoreDrawerOpen(false);
                    onNavigate(item.id);
                  }
                }}
                className={`flex flex-col items-center justify-center w-full h-full py-1 text-center transition-all ${
                  isActive ? 'text-red-500' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110 stroke-[2.4]' : 'scale-100'}`} />
                  {item.id === 'work' && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                  )}
                </div>
                <span className="text-[10px] font-medium mt-0.5 tracking-tight truncate max-w-[55px]">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* More Drawer Modal for Mobile */}
      {moreDrawerOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={() => setMoreDrawerOpen(false)}
          />
          <div className="lg:hidden fixed bottom-14 left-0 right-0 z-50 bg-[#12151C] border-t border-slate-800 rounded-t-2xl shadow-2xl max-h-[75vh] overflow-y-auto p-4 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <div className="flex items-center gap-2">
                <Grid className="w-5 h-5 text-red-500" />
                <h3 className="text-sm font-bold text-white tracking-wide">
                  {language === 'th' ? 'เมนูระบบทั้งหมด' : 'All System Modules'}
                </h3>
              </div>
              <button
                onClick={() => setMoreDrawerOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-full hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {moreMenuItems
                .filter((item) => !item.hidden)
                .map((item) => {
                  const Icon = item.icon;
                  const isCurrent = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onNavigate(item.id);
                        setMoreDrawerOpen(false);
                      }}
                      className={`flex items-start gap-3 p-3 rounded-xl text-left transition-all ${
                        isCurrent
                          ? 'bg-red-950/60 border border-red-800 text-white'
                          : 'bg-slate-900/70 border border-slate-800/80 text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      <div className={`p-2 rounded-lg shrink-0 ${isCurrent ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-300'}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-xs font-semibold text-slate-100 truncate">{item.label}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5 truncate">{item.desc}</p>
                      </div>
                    </button>
                  );
                })}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-6 h-6 rounded-full object-cover border border-slate-600"
                />
                <span className="text-xs text-slate-300 truncate max-w-[150px]">
                  {currentUser.name}
                </span>
              </div>
              <button
                onClick={() => {
                  setMoreDrawerOpen(false);
                  onLogout();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-400 hover:text-red-300 bg-red-950/40 rounded-lg"
              >
                <LogOut className="w-3.5 h-3.5" />
                {t.navLogout}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
