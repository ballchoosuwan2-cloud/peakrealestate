import React, { useState } from 'react';
import { PeakLogo } from './PeakLogo';
import { PWAInstallButton } from './PWAInstallButton';
import { User, AppNotification, UserRole } from '../types';
import { translations, Language } from '../lib/i18n';
import {
  Bell,
  Check,
  Globe,
  LogOut,
  UserCheck,
  Shield,
  ChevronDown,
  Sparkles,
  ExternalLink
} from 'lucide-react';

interface HeaderProps {
  currentUser: User;
  onSwitchUser?: (user: User) => void;
  users?: User[];
  language: Language;
  onLanguageChange?: (lang: Language) => void;
  onLanguageToggle?: () => void;
  onRoleChange?: (role: UserRole) => void;
  notifications?: AppNotification[];
  notificationCount?: number;
  onMarkNotificationRead?: (id: string) => void;
  onLogout?: () => void;
  onOpenNotifications?: () => void;
  onOpenProfile?: () => void;
  activeTab?: string;
  onNavigate?: (tab: string) => void;
}

export function Header({
  currentUser,
  onSwitchUser,
  users = [],
  language,
  onLanguageChange,
  onLanguageToggle,
  onRoleChange,
  notifications = [],
  notificationCount,
  onMarkNotificationRead = () => {},
  onLogout = () => {},
  onOpenNotifications,
  onOpenProfile,
  activeTab = 'dashboard',
  onNavigate = () => {},
}: HeaderProps) {
  const [notifOpen, setNotifOpen] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);

  const t = translations[language];
  const unreadCount = notificationCount !== undefined ? notificationCount : notifications.filter((n) => !n.isRead).length;

  const handleLangClick = () => {
    if (onLanguageToggle) {
      onLanguageToggle();
    } else if (onLanguageChange) {
      onLanguageChange(language === 'th' ? 'en' : 'th');
    }
  };

  const roleColors: Record<string, string> = {
    Administrator: 'bg-red-950/80 text-red-300 border-red-800',
    Manager: 'bg-purple-950/80 text-purple-300 border-purple-800',
    Agent: 'bg-blue-950/80 text-blue-300 border-blue-800',
    Staff: 'bg-emerald-950/80 text-emerald-300 border-emerald-800',
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[#0A0C10] border-b border-slate-800 text-white shadow-xl">
      <div className="w-full px-3.5 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
        {/* Brand / Logo */}
        <div
          onClick={() => onNavigate('dashboard')}
          className="cursor-pointer hover:opacity-95 transition-opacity"
        >
          <PeakLogo variant="header" theme="dark" showSubtitle={true} />
        </div>

        {/* Right Section Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* In-App PWA Install Button */}
          <PWAInstallButton language={language} variant="header" />

          {/* Language Toggle */}
          <button
            onClick={handleLangClick}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-900/90 border border-slate-700/80 hover:border-slate-500 text-slate-200 transition-all hover:bg-slate-800"
            title="Switch Language (TH / EN)"
          >
            <Globe className="w-3.5 h-3.5 text-red-500" />
            <span className="font-semibold">{language.toUpperCase()}</span>
          </button>

          {/* Notifications Bell */}
          <div className="relative">
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="relative p-2 rounded-full text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 flex items-center justify-center min-w-[17px] h-[17px] px-1 text-[10px] font-bold text-white bg-red-600 rounded-full ring-2 ring-[#0A0C10] animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {notifOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setNotifOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-[#12151C] border border-slate-800 shadow-2xl z-50 overflow-hidden">
                  <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-red-500" />
                      <span className="text-sm font-semibold text-white">
                        {language === 'th' ? 'การแจ้งเตือน' : 'Notifications'}
                      </span>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                      {unreadCount} {language === 'th' ? 'ใหม่' : 'unread'}
                    </span>
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60">
                    {notifications.length === 0 ? (
                      <p className="p-6 text-center text-xs text-slate-400">
                        {language === 'th' ? 'ไม่มีการแจ้งเตือน' : 'No notifications'}
                      </p>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => {
                            onMarkNotificationRead(notif.id);
                            if (notif.linkToTab) {
                              onNavigate(notif.linkToTab);
                              setNotifOpen(false);
                            }
                          }}
                          className={`p-3 text-left cursor-pointer transition-colors hover:bg-slate-800/50 flex items-start justify-between gap-3 ${
                            !notif.isRead ? 'bg-red-950/20' : 'bg-transparent'
                          }`}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-1.5">
                              {!notif.isRead && (
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                              )}
                              <h4 className="text-xs font-semibold text-slate-100">
                                {notif.title}
                              </h4>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                              {notif.message}
                            </p>
                            <span className="text-[10px] text-slate-500 mt-1.5 block">
                              {new Date(notif.createdAt).toLocaleString(language === 'th' ? 'th-TH' : 'en-US', {
                                dateStyle: 'short',
                                timeStyle: 'short'
                              })}
                            </span>
                          </div>

                          {!notif.isRead && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onMarkNotificationRead(notif.id);
                              }}
                              className="text-slate-400 hover:text-slate-200 p-1"
                              title="Mark read"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Current User & Role Switcher */}
          <div className="relative">
            <button
              onClick={() => setRoleOpen(!roleOpen)}
              className="flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-lg hover:bg-slate-800/80 transition-all border border-slate-800/70"
            >
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-7 h-7 rounded-full object-cover border border-slate-600"
              />
              <div className="hidden md:flex flex-col text-left">
                <span className="text-xs font-medium text-slate-100 truncate max-w-[120px]">
                  {currentUser.name}
                </span>
                <span className="text-[10px] text-slate-400">
                  {currentUser.role}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
            </button>

            {/* Role Switcher Menu */}
            {roleOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setRoleOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-72 rounded-xl bg-[#12151C] border border-slate-800 shadow-2xl z-50 p-2">
                  <div className="px-3 py-2 border-b border-slate-800/80 mb-1">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                      {language === 'th' ? 'สลับบทบาททดสอบระบบ' : 'Test Role Switcher'}
                    </p>
                    <p className="text-xs text-slate-300 mt-0.5">
                      {currentUser.name} ({currentUser.role})
                    </p>
                  </div>

                  <div className="space-y-1">
                    {users.map((u) => {
                      const isSelected = u.id === currentUser.id;
                      return (
                        <button
                          key={u.id}
                          onClick={() => {
                            onSwitchUser(u);
                            setRoleOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors text-left ${
                            isSelected
                              ? 'bg-slate-800 text-white font-semibold'
                              : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <img
                              src={u.avatar}
                              alt={u.name}
                              className="w-6 h-6 rounded-full object-cover shrink-0"
                            />
                            <div className="truncate">
                              <p className="truncate">{u.name}</p>
                              <span className="text-[10px] text-slate-400 block">{u.role}</span>
                            </div>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-red-400 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>

                  <div className="border-t border-slate-800/80 mt-2 pt-2 flex justify-between gap-2 px-1">
                    <button
                      onClick={() => {
                        onNavigate('profile');
                        setRoleOpen(false);
                      }}
                      className="flex-1 py-1.5 px-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-md text-center transition-colors"
                    >
                      {t.navProfile}
                    </button>
                    <button
                      onClick={() => {
                        setRoleOpen(false);
                        onLogout();
                      }}
                      className="py-1.5 px-3 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded-md text-center transition-colors flex items-center gap-1"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      {t.navLogout}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
