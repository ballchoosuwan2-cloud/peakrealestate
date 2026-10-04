import React, { useState, useEffect, useRef } from 'react';
import { translations, Language } from '../lib/i18n';
import { PeakLogo } from './PeakLogo';
import { AppDatabase, STORAGE_KEY } from '../lib/storage';
import { PWAInstallButton } from './PWAInstallButton';
import { User } from '../types';
import { B28_PERMISSION_KEYS } from '../lib/permissions';
import {
  Settings,
  Shield,
  ShieldAlert,
  RotateCcw,
  CheckCircle2,
  Bell,
  Globe,
  Database,
  Building,
  Key,
  Save,
  Palette,
  Sparkles,
  Layers,
  Code,
  Download,
  Upload,
  FileSpreadsheet,
  Copy,
  Check,
  FileJson,
  AlertCircle,
  ExternalLink,
  ArrowRight,
  RefreshCw,
  Hash,
  Users,
  UserCog,
  FileText,
  Lock,
  Unlock,
  Sliders,
  History,
  AlertTriangle,
  X,
  Plus,
} from 'lucide-react';

interface SettingsViewProps {
  language: Language;
  onResetDatabase: () => void;
  database?: AppDatabase;
  onRestoreDatabase?: (newDb: AppDatabase) => void;
  currentUser?: User;
  onNavigate?: (tab: string, filter?: string) => void;
}

export function SettingsView({
  language,
  onResetDatabase,
  database,
  onRestoreDatabase,
  currentUser,
  onNavigate,
}: SettingsViewProps) {
  const t = translations[language];

  // Active Tab: 'business' | 'system' | 'numbering' | 'roles' | 'overrides' | 'notifications' | 'audit' | 'backup'
  const [activeTab, setActiveTab] = useState<
    'business' | 'system' | 'numbering' | 'roles' | 'overrides' | 'notifications' | 'audit' | 'backup'
  >('business');

  // Loading & Feedback
  const [loading, setLoading] = useState(false);
  const [savingCategory, setSavingCategory] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // 1. Business & Company Settings
  const [businessSettings, setBusinessSettings] = useState({
    companyName: 'PEAK REAL ESTATE',
    companySubtitle: 'พีค เรียล เอสเตท',
    taxId: '0835564012345',
    branch: 'Phuket Head Office',
    defaultCommissionRate: 3.0,
    vatRate: 7.0,
    companyAddress: '124/8 Moo 5, Rawai, Mueang Phuket, Phuket 83130',
    contactPhone: '076-684-900',
    contactEmail: 'contact@peakrealestate.com',
  });

  // 2. System Settings
  const [systemSettings, setSystemSettings] = useState({
    systemName: 'PEAK REAL ESTATE',
    siteTitle: 'PEAK REAL ESTATE — Luxury Property CRM',
    timezone: 'Asia/Bangkok',
    defaultLanguage: 'th',
    maintenanceMode: false,
    sessionTimeoutMinutes: 120,
  });

  // 3. Numbering Settings
  const [numberingSettings, setNumberingSettings] = useState({
    propertyPrefix: 'PROP-',
    propertyPadding: 4,
    propertyNextSeq: 1001,
    contractPrefix: 'CNT-',
    contractPadding: 4,
    contractNextSeq: 1001,
    viewingPrefix: 'VW-',
    viewingPadding: 4,
    viewingNextSeq: 1001,
    paymentPrefix: 'PAY-',
    paymentPadding: 4,
    paymentNextSeq: 1001,
    clientPrefix: 'CLI-',
    clientPadding: 4,
    clientNextSeq: 1001,
  });

  // 4. Notification Settings
  const [notificationSettings, setNotificationSettings] = useState({
    emailAlerts: true,
    inAppAlerts: true,
    contractExpiryNoticeDays: 30,
    followUpReminderHours: 24,
    recipientEmails: ['admin@peakrealestate.com', 'operations@peakrealestate.com'],
  });
  const [newRecipientEmail, setNewRecipientEmail] = useState('');

  // 5. Roles & Permission Matrix
  const [roles, setRoles] = useState<any[]>([]);
  const [selectedRole, setSelectedRole] = useState<any | null>(null);

  // 6. User Permission Overrides
  const [usersList, setUsersList] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [userOverrides, setUserOverrides] = useState<any[]>([]);
  const [effectivePermissions, setEffectivePermissions] = useState<string[]>([]);

  // 7. Audit Logs
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditFilterAction, setAuditFilterAction] = useState<string>('');
  const [auditLoading, setAuditLoading] = useState<boolean>(false);

  // 8. Backups
  const [backups, setBackups] = useState<any[]>([]);
  const [backupLoading, setBackupLoading] = useState<boolean>(false);
  const [restoreValidationResult, setRestoreValidationResult] = useState<any | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch initial settings from API
  const fetchAllSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        const s = data.settings || data.data || {};
        if (s.business) setBusinessSettings((prev) => ({ ...prev, ...s.business }));
        if (s.system) setSystemSettings((prev) => ({ ...prev, ...s.system }));
        if (s.numbering) setNumberingSettings((prev) => ({ ...prev, ...s.numbering }));
        if (s.notification) setNotificationSettings((prev) => ({ ...prev, ...s.notification }));
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await fetch('/api/roles');
      if (res.ok) {
        const data = await res.json();
        const rList = data.roles || data.items || [];
        setRoles(rList);
        if (rList.length > 0 && !selectedRole) {
          setSelectedRole(rList[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching roles:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users?pageSize=100');
      if (res.ok) {
        const data = await res.json();
        const uList = data.users || data.items || data.data || [];
        setUsersList(uList);
        if (uList.length > 0 && !selectedUserId) {
          setSelectedUserId(uList[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const fetchUserOverrides = async (userId: string) => {
    if (!userId) return;
    try {
      const [ovRes, effRes] = await Promise.all([
        fetch(`/api/users/${userId}/overrides`),
        fetch(`/api/users/${userId}/effective-permissions`),
      ]);
      if (ovRes.ok) {
        const ovData = await ovRes.json();
        setUserOverrides(ovData.overrides || []);
      }
      if (effRes.ok) {
        const effData = await effRes.json();
        setEffectivePermissions(effData.effectivePermissions || []);
      }
    } catch (err) {
      console.error('Error fetching user overrides:', err);
    }
  };

  const fetchAuditLogs = async () => {
    setAuditLoading(true);
    try {
      const url = auditFilterAction
        ? `/api/audit-logs?action=${encodeURIComponent(auditFilterAction)}&limit=50`
        : '/api/audit-logs?limit=50';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.logs || data.items || []);
      }
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setAuditLoading(false);
    }
  };

  const fetchBackups = async () => {
    try {
      const res = await fetch('/api/backups');
      if (res.ok) {
        const data = await res.json();
        setBackups(Array.isArray(data) ? data : data.backups || []);
      }
    } catch (err) {
      console.error('Error fetching backups:', err);
    }
  };

  useEffect(() => {
    fetchAllSettings();
    fetchRoles();
    fetchUsers();
    fetchAuditLogs();
    fetchBackups();
  }, []);

  useEffect(() => {
    if (selectedUserId) {
      fetchUserOverrides(selectedUserId);
    }
  }, [selectedUserId]);

  // Headers for API calls
  const getAuthHeaders = () => {
    return {
      'Content-Type': 'application/json',
      'x-user-role': currentUser?.role || 'Administrator',
      'x-user-name': currentUser?.name || 'Administrator',
      'x-user-id': currentUser?.id || 'admin-user',
    };
  };

  // Save Settings Category
  const handleSaveCategory = async (category: string, data: any) => {
    setSavingCategory(category);
    try {
      const res = await fetch(`/api/settings/${category}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });

      if (res.status === 403) {
        showToast('HTTP 403 Forbidden: คุณไม่มีสิทธิ์เข้าถึง (ต้องเป็น Administrator เท่านั้น)', 'error');
        return;
      }

      if (!res.ok) {
        const errData = await res.json();
        showToast(errData.error || `ไม่สามารถบันทึก ${category} ได้`, 'error');
        return;
      }

      showToast(`บันทึกการตั้งค่า ${category} เรียบร้อยแล้ว`, 'success');
      fetchAuditLogs();
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย', 'error');
    } finally {
      setSavingCategory(null);
    }
  };

  // Update Role Permissions
  const handleToggleRolePermission = async (roleId: string, permissionKey: string) => {
    if (!selectedRole) return;
    const currentPerms: string[] = selectedRole.permissions || [];
    const exists = currentPerms.includes(permissionKey);
    const updatedPerms = exists
      ? currentPerms.filter((p) => p !== permissionKey)
      : [...currentPerms, permissionKey];

    try {
      const res = await fetch(`/api/roles/${roleId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ permissions: updatedPerms }),
      });

      if (res.status === 403) {
        showToast('HTTP 403: เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่สามารถแก้ไขสิทธิ์ของ Role ได้', 'error');
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setSelectedRole(data.role);
        setRoles((prev) => prev.map((r) => (r.id === roleId ? data.role : r)));
        showToast(`อัปเดตสิทธิ์สำหรับบทบาท ${selectedRole.name} สำเร็จ`, 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาด', 'error');
    }
  };

  // Toggle User Permission Override
  const handleSetUserOverride = async (userId: string, permissionKey: string, granted: boolean) => {
    try {
      const res = await fetch(`/api/users/${userId}/overrides`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ permissionKey, granted }),
      });

      if (res.status === 403) {
        showToast('HTTP 403: คุณไม่มีสิทธิ์จัดการ User Permission Override', 'error');
        return;
      }

      if (res.ok) {
        showToast(`ตั้งค่า Override "${permissionKey}" = ${granted ? 'GRANT' : 'REVOKE'} เรียบร้อย`, 'success');
        fetchUserOverrides(userId);
      }
    } catch (err: any) {
      showToast(err.message || 'Error setting override', 'error');
    }
  };

  const handleRemoveUserOverride = async (userId: string, permissionKey: string) => {
    try {
      const res = await fetch(`/api/users/${userId}/overrides/${encodeURIComponent(permissionKey)}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (res.status === 403) {
        showToast('HTTP 403: คุณไม่มีสิทธิ์ลบ Override', 'error');
        return;
      }

      if (res.ok) {
        showToast(`ลบ Override สำหรับ "${permissionKey}" เรียบร้อย`, 'success');
        fetchUserOverrides(userId);
      }
    } catch (err: any) {
      showToast(err.message || 'Error removing override', 'error');
    }
  };

  // Create Full Backup
  const handleCreateFullBackup = async () => {
    setBackupLoading(true);
    try {
      const res = await fetch('/api/backups/create', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ userName: currentUser?.name || 'Administrator' }),
      });

      if (res.status === 403) {
        showToast('HTTP 403: เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่สามารถสำรองข้อมูลระบบได้', 'error');
        return;
      }

      if (res.ok) {
        const data = await res.json();
        showToast(`สำรองข้อมูลระบบสำเร็จ (ID: ${data.backupId || data.id})`, 'success');
        fetchBackups();

        // Download JSON file
        if (data.jsonString || data.data) {
          const blob = new Blob([data.jsonString || JSON.stringify(data.data, null, 2)], {
            type: 'application/json',
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `peak_real_estate_full_backup_${Date.now()}.json`;
          a.click();
          URL.revokeObjectURL(url);
        }
      }
    } catch (err: any) {
      showToast(err.message || 'ไม่สามารถสำรองข้อมูลได้', 'error');
    } finally {
      setBackupLoading(false);
    }
  };

  // Validate Backup File
  const handleSelectBackupFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        const valRes = await fetch('/api/backups/validate', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ backupData: parsed }),
        });

        if (valRes.ok) {
          const valData = await valRes.json();
          setRestoreValidationResult({
            ...valData,
            rawPayload: parsed,
          });
          if (valData.valid) {
            showToast('ตรวจสอบไฟล์สำรองข้อมูลผ่านสมบูรณ์ พร้อมสำหรับการกู้คืน', 'success');
          } else {
            showToast(`ไฟล์สำรองข้อมูลไม่สมบูรณ์: ${valData.errors.join(', ')}`, 'error');
          }
        }
      } catch (err: any) {
        showToast('รูปแบบไฟล์ JSON ไม่ถูกต้อง', 'error');
      }
    };
    reader.readAsText(file);
  };

  // Execute Restore from Validated Backup
  const handleExecuteRestore = async () => {
    if (!restoreValidationResult || !restoreValidationResult.valid) return;
    setBackupLoading(true);

    try {
      const res = await fetch('/api/backups/restore-full', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ backupData: restoreValidationResult.rawPayload }),
      });

      if (res.status === 403) {
        showToast('HTTP 403: เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่สามารถกู้คืนข้อมูลได้', 'error');
        return;
      }

      if (res.ok) {
        showToast('กู้คืนฐานข้อมูลและระบบตั้งค่าสำเร็จเรียบร้อยแล้ว', 'success');
        setRestoreValidationResult(null);
        fetchAllSettings();
        fetchRoles();
        fetchUsers();
        fetchAuditLogs();
      } else {
        const data = await res.json();
        showToast(data.error || 'การกู้คืนล้มเหลว', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error restoring database', 'error');
    } finally {
      setBackupLoading(false);
    }
  };

  const isAdmin = currentUser?.role === 'Administrator' || currentUser?.role === 'Admin';

  return (
    <div className="space-y-6 pb-20">
      {/* ------------------------------------------------------------- */}
      {/* 1. TOP LUXURY DARK BANNER (PEAK REAL ESTATE DESIGN SYSTEM)     */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-[#0A0C10] border border-slate-800/90 rounded-2xl p-6 sm:p-7 shadow-2xl relative overflow-hidden text-white">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-amber-500 to-red-600 opacity-90" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-red-600 to-red-800 text-white shadow-lg shadow-red-950/60 border border-red-500/30">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-red-950 text-red-400 border border-red-800/80">
                  B28 SYSTEM ADMINISTRATION
                </span>
                <span className="text-xs text-slate-400">• Role: {currentUser?.role || 'Administrator'}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-serif mt-0.5">
                System Administration & Settings
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <PWAInstallButton language={language} variant="header" />
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                isAdmin
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  : 'bg-amber-950 text-amber-300 border border-amber-800'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>{isAdmin ? 'Admin Full Access' : 'Read-Only Mode'}</span>
            </span>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-slate-300 mt-3 max-w-4xl leading-relaxed">
          ศูนย์ควบคุมระบบองค์กร PEAK REAL ESTATE: จัดการข้อมูลธุรกิจ, อัตราคอมมิชชันและภาษี, รหัสเอกสารอัตโนมัติ (Numbering Sequences), เมทริกซ์สิทธิ์ตามบทบาท (Permission Matrix), และระบบสำรองกู้คืนข้อมูล
        </p>

        {/* Toast Alert */}
        {toastMessage && (
          <div
            className={`mt-4 p-3 rounded-xl border text-xs font-semibold flex items-center justify-between gap-2 shadow-lg transition-all ${
              toastMessage.type === 'success'
                ? 'bg-emerald-950/90 text-emerald-200 border-emerald-800'
                : 'bg-red-950/90 text-red-200 border-red-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {toastMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              )}
              <span>{toastMessage.text}</span>
            </div>
            <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. SUB-NAVIGATION TABS                                          */}
      {/* ------------------------------------------------------------- */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-slate-200">
        {[
          { id: 'business', label: '1. ข้อมูลธุรกิจ (Business)', icon: Building },
          { id: 'system', label: '2. ตั้งค่าระบบ (System)', icon: Sliders },
          { id: 'numbering', label: '3. เลขที่เอกสาร (Numbering)', icon: Hash },
          { id: 'roles', label: '4. สิทธิ์ตามบทบาท (Roles Matrix)', icon: Shield },
          { id: 'overrides', label: '5. สิทธิ์รายบุคคล (User Overrides)', icon: UserCog },
          { id: 'notifications', label: '6. การแจ้งเตือน (Notifications)', icon: Bell },
          { id: 'audit', label: '7. ประวัติกิจกรรม (Audit Trail)', icon: History },
          { id: 'backup', label: '8. สำรอง & กู้คืน (Backup & Restore)', icon: Database },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-red-500' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. TAB 1: BUSINESS SETTINGS                                   */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'business' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-900">ข้อมูลองค์กรและพารามิเตอร์ทางธุรกิจ (Business Settings)</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                กำหนดชื่อบริษัท, เลขประจำตัวผู้เสียภาษี, สำนักงานใหญ่/สาขา, อัตราคอมมิชชันเริ่มต้น และข้อมูลสัญญา
              </p>
            </div>
            <button
              onClick={() => handleSaveCategory('business', businessSettings)}
              disabled={savingCategory === 'business'}
              className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md shadow-red-950/20 inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{savingCategory === 'business' ? 'กำลังบันทึก...' : 'บันทึกข้อมูลธุรกิจ'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">ชื่อบริษัท (ภาษาอังกฤษ):</label>
              <input
                type="text"
                value={businessSettings.companyName}
                onChange={(e) => setBusinessSettings({ ...businessSettings, companyName: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 focus:ring-1 focus:ring-red-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">ชื่อบริษัท (ภาษาไทย):</label>
              <input
                type="text"
                value={businessSettings.companySubtitle}
                onChange={(e) => setBusinessSettings({ ...businessSettings, companySubtitle: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 focus:ring-1 focus:ring-red-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">เลขประจำตัวผู้เสียภาษี (Tax ID):</label>
              <input
                type="text"
                value={businessSettings.taxId}
                onChange={(e) => setBusinessSettings({ ...businessSettings, taxId: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 focus:ring-1 focus:ring-red-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">สาขาหลัก (Head Office / Branch):</label>
              <input
                type="text"
                value={businessSettings.branch}
                onChange={(e) => setBusinessSettings({ ...businessSettings, branch: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 focus:ring-1 focus:ring-red-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">อัตราคอมมิชชันเริ่มต้น (% Default Commission):</label>
              <input
                type="number"
                step="0.1"
                value={businessSettings.defaultCommissionRate}
                onChange={(e) => setBusinessSettings({ ...businessSettings, defaultCommissionRate: parseFloat(e.target.value) || 0 })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 focus:ring-1 focus:ring-red-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">อัตราภาษีมูลค่าเพิ่ม (% VAT Rate):</label>
              <input
                type="number"
                step="0.1"
                value={businessSettings.vatRate}
                onChange={(e) => setBusinessSettings({ ...businessSettings, vatRate: parseFloat(e.target.value) || 0 })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 focus:ring-1 focus:ring-red-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">เบอร์โทรศัพท์ติดต่อ:</label>
              <input
                type="text"
                value={businessSettings.contactPhone}
                onChange={(e) => setBusinessSettings({ ...businessSettings, contactPhone: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 focus:ring-1 focus:ring-red-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">อีเมลติดต่อ:</label>
              <input
                type="email"
                value={businessSettings.contactEmail}
                onChange={(e) => setBusinessSettings({ ...businessSettings, contactEmail: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 focus:ring-1 focus:ring-red-500 focus:outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-bold text-slate-700 block mb-1.5">ที่ตั้งสำนักงาน (ใช้ในหัวเอกสารและสัญญาเช่า):</label>
              <textarea
                rows={2}
                value={businessSettings.companyAddress}
                onChange={(e) => setBusinessSettings({ ...businessSettings, companyAddress: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 focus:ring-1 focus:ring-red-500 focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 4. TAB 2: SYSTEM SETTINGS                                     */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'system' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-900">การตั้งค่าระบบหลัก (System Settings)</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                ชื่อระบบ, เขตเวลา (Timezone), โหมดปิดปรับปรุงระบบ (Maintenance Mode) และความปลอดภัย
              </p>
            </div>
            <button
              onClick={() => handleSaveCategory('system', systemSettings)}
              disabled={savingCategory === 'system'}
              className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md shadow-red-950/20 inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{savingCategory === 'system' ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่าระบบ'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">ชื่อระบบ (System Name):</label>
              <input
                type="text"
                value={systemSettings.systemName}
                onChange={(e) => setSystemSettings({ ...systemSettings, systemName: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 focus:ring-1 focus:ring-red-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">หัวข้อเว็บ (Site Title):</label>
              <input
                type="text"
                value={systemSettings.siteTitle}
                onChange={(e) => setSystemSettings({ ...systemSettings, siteTitle: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 focus:ring-1 focus:ring-red-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">เขตเวลาของระบบ (Timezone):</label>
              <select
                value={systemSettings.timezone}
                onChange={(e) => setSystemSettings({ ...systemSettings, timezone: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 focus:ring-1 focus:ring-red-500 focus:outline-none"
              >
                <option value="Asia/Bangkok">Asia/Bangkok (GMT+7)</option>
                <option value="Asia/Singapore">Asia/Singapore (GMT+8)</option>
                <option value="Europe/London">Europe/London (GMT+0)</option>
                <option value="America/New_York">America/New_York (EST)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">ภาษาเริ่มต้น (Default Language):</label>
              <select
                value={systemSettings.defaultLanguage}
                onChange={(e) => setSystemSettings({ ...systemSettings, defaultLanguage: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 focus:ring-1 focus:ring-red-500 focus:outline-none"
              >
                <option value="th">ไทย (Thai)</option>
                <option value="en">English (US/UK)</option>
              </select>
            </div>
            <div className="md:col-span-2 p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900">โหมดปิดปรับปรุงระบบ (Maintenance Mode)</h4>
                <p className="text-[11px] text-slate-500">
                  เมื่อเปิดใช้งาน ผู้ใช้ทั่วไปจะไม่สามารถแก้ไขข้อมูลได้ เฉพาะ Administrator เท่านั้นที่มีสิทธิ์เข้าถึง
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={systemSettings.maintenanceMode}
                  onChange={(e) => setSystemSettings({ ...systemSettings, maintenanceMode: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 5. TAB 3: NUMBERING & PREFIX SEQUENCES                        */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'numbering' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-900">การสร้างเลขที่เอกสารอัตโนมัติ (Numbering & Prefix Sequences)</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                กำหนดคำนำหน้า (Prefix) และลำดับตัวเลขสำหรับอสังหาริมทรัพย์, สัญญา, นัดหมาย, การชำระเงิน และลูกค้า
              </p>
            </div>
            <button
              onClick={() => handleSaveCategory('numbering', numberingSettings)}
              disabled={savingCategory === 'numbering'}
              className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md shadow-red-950/20 inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{savingCategory === 'numbering' ? 'กำลังบันทึก...' : 'บันทึกลำดับเลขที่'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { key: 'property', name: 'รหัสอสังหาฯ (Properties)', prefix: 'propertyPrefix', pad: 'propertyPadding', seq: 'propertyNextSeq' },
              { key: 'contract', name: 'เลขที่สัญญา (Contracts)', prefix: 'contractPrefix', pad: 'contractPadding', seq: 'contractNextSeq' },
              { key: 'viewing', name: 'รหัสนัดหมาย (Viewings)', prefix: 'viewingPrefix', pad: 'viewingPadding', seq: 'viewingNextSeq' },
              { key: 'payment', name: 'เลขที่ใบชำระเงิน (Payments)', prefix: 'paymentPrefix', pad: 'paymentPadding', seq: 'paymentNextSeq' },
              { key: 'client', name: 'รหัสลูกค้า (Clients / Leads)', prefix: 'clientPrefix', pad: 'clientPadding', seq: 'clientNextSeq' },
            ].map((item) => {
              const currentPrefix = (numberingSettings as any)[item.prefix] || 'DOC-';
              const currentPad = (numberingSettings as any)[item.pad] || 4;
              const currentSeq = (numberingSettings as any)[item.seq] || 1001;
              const preview = `${currentPrefix}${String(currentSeq).padStart(currentPad, '0')}`;

              return (
                <div key={item.key} className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900">{item.name}</h4>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      ตัวอย่าง: {preview}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">Prefix:</label>
                      <input
                        type="text"
                        value={currentPrefix}
                        onChange={(e) => setNumberingSettings({ ...numberingSettings, [item.prefix]: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-mono font-bold text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">จำนวนหลัก (Padding):</label>
                      <input
                        type="number"
                        min="2"
                        max="8"
                        value={currentPad}
                        onChange={(e) => setNumberingSettings({ ...numberingSettings, [item.pad]: parseInt(e.target.value) || 4 })}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-mono text-slate-800"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">ลำดับถัดไป (Next Sequence):</label>
                      <input
                        type="number"
                        value={currentSeq}
                        onChange={(e) => setNumberingSettings({ ...numberingSettings, [item.seq]: parseInt(e.target.value) || 1 })}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-mono font-bold text-slate-800"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 6. TAB 4: ROLES & PERMISSION MATRIX                            */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'roles' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-900">เมทริกซ์สิทธิ์ตามบทบาท (Role & Permission Matrix)</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                กำหนดสิทธิ์การดู, สร้าง, แก้ไข, ลบ และส่งออกข้อมูลของแต่ละบทบาท (Role) ในทุกโมดูล
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600">เลือกบทบาท:</span>
              <div className="flex flex-wrap gap-1.5">
                {roles.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setSelectedRole(r)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      selectedRole?.id === r.id
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {r.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {selectedRole && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{selectedRole.name}</h3>
                  <p className="text-xs text-slate-500">{selectedRole.description || 'Standard Role'}</p>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-slate-200 text-slate-800">
                  มีสิทธิ์ {selectedRole.permissions?.length || 0} จาก {B28_PERMISSION_KEYS.length} รายการ
                </span>
              </div>

              {/* Matrix Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">โมดูล (Module)</th>
                      <th className="py-3 px-4">ชื่อสิทธิ์ (Permission Name)</th>
                      <th className="py-3 px-4">คีย์ (Permission Key)</th>
                      <th className="py-3 px-4 text-center">สถานะสิทธิ์</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {B28_PERMISSION_KEYS.map((perm) => {
                      const hasPerm = (selectedRole.permissions || []).includes(perm.key);
                      return (
                        <tr key={perm.key} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-4 font-semibold text-slate-800">{perm.module}</td>
                          <td className="py-2.5 px-4 text-slate-700">
                            <span className="font-medium">{perm.name}</span>
                            <span className="block text-[10px] text-slate-400">{perm.description}</span>
                          </td>
                          <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500">{perm.key}</td>
                          <td className="py-2.5 px-4 text-center">
                            <button
                              onClick={() => handleToggleRolePermission(selectedRole.id, perm.key)}
                              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                hasPerm
                                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                  : 'bg-slate-200 hover:bg-slate-300 text-slate-600'
                              }`}
                            >
                              {hasPerm ? 'เปิดใช้งาน (Allowed)' : 'ปิด (Denied)'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 7. TAB 5: USER PERMISSION OVERRIDES                           */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'overrides' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-900">กำหนดสิทธิ์พิเศษรายบุคคล (User Permission Overrides)</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                อนุญาต (Force Grant) หรือระงับ (Force Revoke) สิทธิ์เฉพาะบุคคลนอกเหนือจากสิทธิ์พื้นฐานของ Role
              </p>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-700 whitespace-nowrap">เลือกพนักงาน:</label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-800 bg-white"
              >
                {usersList.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div>
                <span className="text-slate-500">พนักงานที่เลือก:</span>{' '}
                <strong className="text-slate-900 font-bold">
                  {usersList.find((u) => u.id === selectedUserId)?.name || selectedUserId}
                </strong>
                <span className="ml-2 text-slate-400">
                  (บทบาท: {usersList.find((u) => u.id === selectedUserId)?.role || 'Agent'})
                </span>
              </div>
              <div>
                <span className="text-slate-500">สิทธิ์สุทธิ (Effective Permissions):</span>{' '}
                <span className="font-bold text-emerald-700">{effectivePermissions.length} รายการ</span>
              </div>
            </div>

            {/* Overrides Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">สิทธิ์ (Permission)</th>
                    <th className="py-3 px-4">สิทธิ์ตาม Role</th>
                    <th className="py-3 px-4">การ Override ปัจจุบัน</th>
                    <th className="py-3 px-4 text-center">สิทธิ์สุทธิ</th>
                    <th className="py-3 px-4 text-right">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {B28_PERMISSION_KEYS.slice(0, 15).map((perm) => {
                    const ov = userOverrides.find((o) => o.permissionKey === perm.key);
                    const isEffective = effectivePermissions.includes(perm.key);

                    return (
                      <tr key={perm.key} className="hover:bg-slate-50">
                        <td className="py-2.5 px-4 font-semibold text-slate-800">
                          {perm.name}
                          <span className="block text-[10px] text-slate-400 font-mono">{perm.key}</span>
                        </td>
                        <td className="py-2.5 px-4 text-slate-600">
                          {perm.module} Standard
                        </td>
                        <td className="py-2.5 px-4">
                          {ov ? (
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                ov.granted
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {ov.granted ? 'FORCE GRANTED (+)' : 'FORCE REVOKED (-)'}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">- ไม่มี Override -</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isEffective
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {isEffective ? 'มีสิทธิ์ (Allowed)' : 'ไม่มีสิทธิ์'}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => handleSetUserOverride(selectedUserId, perm.key, true)}
                              className="px-2 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-bold border border-emerald-200 cursor-pointer"
                            >
                              Grant (+)
                            </button>
                            <button
                              onClick={() => handleSetUserOverride(selectedUserId, perm.key, false)}
                              className="px-2 py-1 rounded bg-red-50 hover:bg-red-100 text-red-700 text-[10px] font-bold border border-red-200 cursor-pointer"
                            >
                              Revoke (-)
                            </button>
                            {ov && (
                              <button
                                onClick={() => handleRemoveUserOverride(selectedUserId, perm.key)}
                                className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold cursor-pointer"
                              >
                                ล้าง
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 8. TAB 6: NOTIFICATIONS & ALERTS                              */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'notifications' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-900">การแจ้งเตือนและการส่งต่ออีเมล (Notification Settings)</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                กำหนดเกณฑ์วันหมดอายุสัญญา, ชั่วโมงแจ้งเตือน Follow-up และรายชื่อผู้รับการแจ้งเตือนฉุกเฉิน
              </p>
            </div>
            <button
              onClick={() => handleSaveCategory('notification', notificationSettings)}
              disabled={savingCategory === 'notification'}
              className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md shadow-red-950/20 inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{savingCategory === 'notification' ? 'กำลังบันทึก...' : 'บันทึกการแจ้งเตือน'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
              <h4 className="text-xs font-bold text-slate-900">ช่องทางการแจ้งเตือนหลัก</h4>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificationSettings.emailAlerts}
                    onChange={(e) => setNotificationSettings({ ...notificationSettings, emailAlerts: e.target.checked })}
                    className="w-4 h-4 text-red-600 rounded border-slate-300"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">การแจ้งเตือนผ่านอีเมล (Email Alerts)</span>
                    <span className="text-[11px] text-slate-500">ส่งอีเมลสรุปงานและสัญญาใกล้หมดอายุ</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificationSettings.inAppAlerts}
                    onChange={(e) => setNotificationSettings({ ...notificationSettings, inAppAlerts: e.target.checked })}
                    className="w-4 h-4 text-red-600 rounded border-slate-300"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">การแจ้งเตือนในระบบ (In-App Badges)</span>
                    <span className="text-[11px] text-slate-500">แสดงตัวเลขและกระดิ่งแจ้งเตือนบนแถบเมนู</span>
                  </div>
                </label>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
              <h4 className="text-xs font-bold text-slate-900">เกณฑ์เงื่อนเวลา (Thresholds)</h4>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  แจ้งเตือนสัญญาก่อนหมดอายุ (วัน):
                </label>
                <input
                  type="number"
                  value={notificationSettings.contractExpiryNoticeDays}
                  onChange={(e) =>
                    setNotificationSettings({
                      ...notificationSettings,
                      contractExpiryNoticeDays: parseInt(e.target.value) || 30,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  แจ้งเตือนภารกิจติดตามล่วงหน้า (ชั่วโมง):
                </label>
                <input
                  type="number"
                  value={notificationSettings.followUpReminderHours}
                  onChange={(e) =>
                    setNotificationSettings({
                      ...notificationSettings,
                      followUpReminderHours: parseInt(e.target.value) || 24,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800"
                />
              </div>
            </div>

            <div className="md:col-span-2 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <h4 className="text-xs font-bold text-slate-900">รายชื่ออีเมลรับการแจ้งเตือนส่วนกลาง (Admin Distribution List)</h4>
              <div className="flex flex-wrap gap-2">
                {notificationSettings.recipientEmails.map((email, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white border border-slate-300 text-xs font-medium text-slate-800 shadow-xs"
                  >
                    <span>{email}</span>
                    <button
                      onClick={() =>
                        setNotificationSettings({
                          ...notificationSettings,
                          recipientEmails: notificationSettings.recipientEmails.filter((_, i) => i !== idx),
                        })
                      }
                      className="text-slate-400 hover:text-red-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-2 max-w-md pt-2">
                <input
                  type="email"
                  placeholder="เพิ่มอีเมลใหม่ e.g. manager@peakrealestate.com"
                  value={newRecipientEmail}
                  onChange={(e) => setNewRecipientEmail(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                />
                <button
                  onClick={() => {
                    if (newRecipientEmail && !notificationSettings.recipientEmails.includes(newRecipientEmail)) {
                      setNotificationSettings({
                        ...notificationSettings,
                        recipientEmails: [...notificationSettings.recipientEmails, newRecipientEmail.trim()],
                      });
                      setNewRecipientEmail('');
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-white text-xs font-semibold cursor-pointer"
                >
                  เพิ่มอีเมล
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 9. TAB 7: AUDIT TRAIL LOGS                                    */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-900">ประวัติกิจกรรมและความปลอดภัย (Security Audit Trail)</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                บันทึกทุกการแก้ไขข้อมูลสำคัญ, การเปลี่ยนสิทธิ์, การตั้งค่าระบบ และการสำรองกู้คืน
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={fetchAuditLogs}
                disabled={auditLoading}
                className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 inline-flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${auditLoading ? 'animate-spin' : ''}`} />
                <span>รีเฟรช Log</span>
              </button>
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">วันและเวลา</th>
                  <th className="py-3 px-4">การกระทำ (Action)</th>
                  <th className="py-3 px-4">เป้าหมาย (Target)</th>
                  <th className="py-3 px-4">ผู้ดำเนินการ (Operator)</th>
                  <th className="py-3 px-4">รายละเอียดการเปลี่ยนแปลง</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      ไม่พบบันทึกกิจกรรมในระบบ
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString('th-TH')}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="font-bold text-slate-900 px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-mono text-slate-600 text-[11px]">
                        {log.propertyId || '-'}
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-slate-800">
                        {log.userName}
                      </td>
                      <td className="py-2.5 px-4 text-slate-500 text-[11px] max-w-xs truncate" title={log.newValue || ''}>
                        {log.newValue || log.oldValue || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 10. TAB 8: BACKUP & RESTORE VALIDATION                        */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'backup' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-900">การสำรองและกู้คืนฐานข้อมูล (Backup & Disaster Recovery)</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                สำรองข้อมูลทั้งระบบ 100% พร้อมการตรวจสอบความสมบูรณ์ก่อนกู้คืน (Schema & Data Validation)
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCreateFullBackup}
                disabled={backupLoading}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5 text-red-500" />
                <span>{backupLoading ? 'กำลังสร้าง Backup...' : 'สร้างไฟล์สำรอง 100%'}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Upload & Validate Backup */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-red-100 text-red-700">
                  <Upload className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-bold text-slate-900">กู้คืนระบบจากไฟล์สำรอง (Restore from JSON)</h4>
              </div>

              <p className="text-xs text-slate-500">
                ระบบจะตรวจสอบเวอร์ชัน, โครงสร้างตาราง และจำนวนระเบียนก่อนกู้คืน เพื่อป้องกันความเสียหายของข้อมูลเดิม
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleSelectBackupFile}
                className="hidden"
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3 rounded-xl border-2 border-dashed border-slate-300 hover:border-red-400 bg-white hover:bg-red-50/20 text-xs font-bold text-slate-700 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <FileJson className="w-4 h-4 text-red-600" />
                <span>คลิกเพื่อเลือกไฟล์สำรองข้อมูล (.json)</span>
              </button>

              {/* Validation Result Box */}
              {restoreValidationResult && (
                <div
                  className={`p-4 rounded-xl border space-y-3 ${
                    restoreValidationResult.valid
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-red-50 border-red-200 text-red-900'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {restoreValidationResult.valid ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                    )}
                    <h5 className="text-xs font-bold">
                      {restoreValidationResult.valid ? 'ไฟล์ผ่านการตรวจสอบความสมบูรณ์' : 'ไฟล์ไม่ผ่านการตรวจสอบ'}
                    </h5>
                  </div>

                  {restoreValidationResult.valid ? (
                    <div className="text-[11px] space-y-1">
                      <p>• อสังหาริมทรัพย์: {restoreValidationResult.summary.propertiesCount} รายการ</p>
                      <p>• ผู้ใช้งาน / พนักงาน: {restoreValidationResult.summary.usersCount} รายการ</p>
                      <p>• สัญญา: {restoreValidationResult.summary.contractsCount} รายการ</p>
                      <p>• ลูกค้า / ลีด: {restoreValidationResult.summary.clientsCount} รายการ</p>
                      <p>• สร้างเมื่อ: {new Date(restoreValidationResult.summary.createdAt).toLocaleString('th-TH')}</p>

                      <div className="pt-2">
                        <button
                          onClick={handleExecuteRestore}
                          disabled={backupLoading}
                          className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm cursor-pointer"
                        >
                          ยืนยันการกู้คืนข้อมูลทันที
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-[11px] text-red-700">
                      {restoreValidationResult.errors.map((e: string, i: number) => (
                        <p key={i}>• {e}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Backups History Table */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <h4 className="text-sm font-bold text-slate-900">ประวัติการสร้างไฟล์สำรองในระบบ</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {backups.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">ยังไม่มีประวัติการสำรองข้อมูล</p>
                ) : (
                  backups.map((bk) => (
                    <div
                      key={bk.id || bk.backupId}
                      className="p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between text-xs"
                    >
                      <div>
                        <p className="font-semibold text-slate-900">{bk.fileName}</p>
                        <p className="text-[10px] text-slate-500">
                          {bk.recordCount || 0} ระเบียน • {((bk.fileSize || 0) / 1024).toFixed(1)} KB • {bk.createdByName}
                        </p>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        {bk.status || 'Success'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
