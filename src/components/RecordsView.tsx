import React, { useState, useMemo } from 'react';
import { ActivityRecord, User } from '../types';
import { translations, Language } from '../lib/i18n';
import {
  History,
  Search,
  Filter,
  Clock,
  User as UserIcon,
  Building2,
  FileSignature,
  CalendarDays,
  KeyRound,
  Wrench,
  CheckCircle2,
  ShieldAlert
} from 'lucide-react';

interface RecordsViewProps {
  records: ActivityRecord[];
  users: User[];
  language: Language;
}

export function RecordsView({ records, users, language }: RecordsViewProps) {
  const t = translations[language];

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<string>('all');

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const q = (searchQuery || '').toLowerCase();
      const matchSearch =
        (r.description && r.description.toLowerCase().includes(q)) ||
        (r.userName && r.userName.toLowerCase().includes(q)) ||
        (r.targetId && r.targetId.toLowerCase().includes(q));

      const matchModule = selectedModule === 'all' || r.module === selectedModule;
      const matchUser = selectedUser === 'all' || r.userId === selectedUser;

      return matchSearch && matchModule && matchUser;
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [records, searchQuery, selectedModule, selectedUser]);

  const getModuleIcon = (mod: string) => {
    switch (mod) {
      case 'Properties': return <Building2 className="w-4 h-4 text-red-600" />;
      case 'Contracts': return <FileSignature className="w-4 h-4 text-amber-600" />;
      case 'Viewings': return <CalendarDays className="w-4 h-4 text-blue-600" />;
      case 'CheckInOut': return <KeyRound className="w-4 h-4 text-emerald-600" />;
      case 'Maintenance': return <Wrench className="w-4 h-4 text-rose-600" />;
      default: return <History className="w-4 h-4 text-slate-600" />;
    }
  };

  return (
    <div className="space-y-6 w-full pb-10">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-red-600" />
          <h2 className="text-xl font-bold font-serif text-slate-900 tracking-wide">
            {t.navRecords}
          </h2>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          {language === 'th'
            ? `บันทึกประวัติการทำงานและการทำธุรกรรมทั้งหมดในระบบ (${records.length} รายการ)`
            : `Comprehensive audit trail of team actions and system events`}
        </p>
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
              placeholder={language === 'th' ? 'ค้นหากิจกรรม, ผู้ปฏิบัติงาน, รหัสอ้างอิง...' : 'Search activity, user, target ID...'}
              className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/30 text-slate-900"
            />
          </div>

          <div className="sm:col-span-3">
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-xs focus:bg-white focus:outline-none"
            >
              <option value="all">{language === 'th' ? 'ทุกโมดูล' : 'All Modules'}</option>
              <option value="Properties">Properties</option>
              <option value="Customers">Customers</option>
              <option value="Viewings">Viewings</option>
              <option value="Contracts">Contracts</option>
              <option value="CheckInOut">CheckInOut</option>
              <option value="Maintenance">Maintenance</option>
            </select>
          </div>

          <div className="sm:col-span-3">
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-xs focus:bg-white focus:outline-none"
            >
              <option value="all">{language === 'th' ? 'ทุกคนในทีม' : 'All Team Members'}</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Timeline List */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-3">
        {filteredRecords.length === 0 ? (
          <p className="text-center py-8 text-slate-400 text-xs">
            {language === 'th' ? 'ไม่พบบันทึกกิจกรรมตามเงื่อนไขที่เลือก' : 'No records match filters.'}
          </p>
        ) : (
          filteredRecords.map((r) => (
            <div
              key={r.id}
              className="flex items-start justify-between gap-4 p-3.5 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 transition-all text-xs"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-slate-100 shrink-0 mt-0.5">
                  {getModuleIcon(r.module)}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{r.userName}</span>
                    <span className="px-2 py-0.2 rounded bg-slate-100 text-[10px] font-semibold text-slate-600">
                      {r.module}
                    </span>
                    {r.action && (
                      <span className="text-[10px] text-slate-400 font-mono">
                        [{r.action}]
                      </span>
                    )}
                  </div>
                  <p className="text-slate-700 mt-1 font-medium leading-relaxed">
                    {r.description}
                  </p>
                  {r.targetId && (
                    <span className="inline-block mt-1 font-mono text-[10px] text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-100">
                      ID: {r.targetId}
                    </span>
                  )}
                </div>
              </div>

              <span className="text-[10px] text-slate-400 font-mono shrink-0">
                {new Date(r.timestamp).toLocaleString()}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
