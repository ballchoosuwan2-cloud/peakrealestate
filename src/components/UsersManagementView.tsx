import React, { useState, useEffect, useRef } from 'react';
import { User, UserRole } from '../types';
import { translations, Language } from '../lib/i18n';
import {
  UserCog,
  Plus,
  Search,
  Mail,
  Phone,
  Building,
  CheckCircle2,
  Edit2,
  Trash2,
  X,
  UserCheck,
  Eye,
  Shield,
  Check,
  Power,
  Home,
  UserX,
  KeyRound,
  Camera,
  Upload,
  Clock,
  Briefcase,
  AlertCircle,
  Tag,
  Lock,
  Layers,
  ChevronRight
} from 'lucide-react';

interface UsersManagementViewProps {
  users: User[];
  currentUser: User;
  onSaveUser: (user: User) => void;
  onDeleteUser: (id: string) => void;
  onSwitchUser: (user: User) => void;
  onToggleStatus?: (id: string) => void;
  language: Language;
}

interface RoleItem {
  id: string;
  name: string;
  description?: string;
  isSystem: boolean;
  permissions: string[];
}

export function UsersManagementView({
  users,
  currentUser,
  onSaveUser,
  onDeleteUser,
  onSwitchUser,
  onToggleStatus,
  language,
}: UsersManagementViewProps) {
  const t = translations[language];
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tabs: 'users' or 'roles'
  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [resetPasswordModalUser, setResetPasswordModalUser] = useState<User | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [resetPwLoading, setResetPwLoading] = useState(false);
  const [resetPwSuccess, setResetPwSuccess] = useState<string | null>(null);

  // Role Management State
  const [dbRoles, setDbRoles] = useState<RoleItem[]>([]);
  const [selectedRole, setSelectedRole] = useState<RoleItem | null>(null);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [roleForm, setRoleForm] = useState<{ name: string; description: string; permissions: string[] }>({
    name: '',
    description: '',
    permissions: ['properties.view', 'clients.view'],
  });
  const [roleActionLoading, setRoleActionLoading] = useState(false);

  // Feedback Toast
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const getAuthHeaders = () => {
    const token = localStorage.getItem('peak_auth_token') || sessionStorage.getItem('peak_auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'x-user-role': currentUser?.role || 'Administrator',
      'x-user-name': encodeURIComponent(currentUser?.name || 'Administrator'),
      'x-user-id': currentUser?.id || 'admin-user',
    };
  };

  // Fetch Roles from Backend
  const fetchRoles = async () => {
    try {
      const res = await fetch('/api/roles', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        const list = data.roles || data.items || [];
        setDbRoles(list);
        if (list.length > 0 && !selectedRole) {
          setSelectedRole(list[0]);
        }
      }
    } catch (e) {
      console.warn('Failed to fetch roles from API:', e);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const isCurrentAdminOrManager =
    currentUser.role === 'Admin' ||
    currentUser.role === 'Administrator' ||
    currentUser.role === 'Manager';

  const isCurrentAdmin =
    currentUser.role === 'Admin' ||
    currentUser.role === 'Administrator';

  // Standard roles list fallback merged with dbRoles
  const availableRoleNames = Array.from(
    new Set([
      'Administrator',
      'Admin',
      'Manager',
      'Agent',
      'Staff',
      ...dbRoles.map((r) => r.name),
      ...users.map((u) => u.role),
    ].filter(Boolean))
  );

  const initialForm: Partial<User> = {
    name: '',
    username: '',
    email: '',
    role: 'Agent',
    branch: 'Phuket Head Office',
    department: 'Sales',
    phone: '',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    title: 'Real Estate Agent',
    status: 'Active',
    isActive: true,
  };

  const [formData, setFormData] = useState<Partial<User>>(initialForm);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const filteredUsers = users.filter((u) => {
    const query = searchQuery.trim().toLowerCase();
    const matchSearch =
      !query ||
      (u.name && u.name.toLowerCase().includes(query)) ||
      (u.email && u.email.toLowerCase().includes(query)) ||
      (u.phone && u.phone.includes(query)) ||
      (u.title && u.title.toLowerCase().includes(query)) ||
      (u.username && u.username.toLowerCase().includes(query));

    const matchRole = roleFilter === 'all' || u.role === roleFilter;

    const isUserActive = u.isActive !== undefined ? u.isActive : u.status !== 'Inactive';
    const matchStatus =
      statusFilter === 'all' ||
      (statusFilter === 'Active' && isUserActive) ||
      (statusFilter === 'Inactive' && !isUserActive);

    return matchSearch && matchRole && matchStatus;
  });

  const handleOpenAdd = () => {
    setEditingUser(null);
    setFormData({
      ...initialForm,
      status: 'Active',
      isActive: true,
    });
    setAvatarPreview(null);
    setEditModalOpen(true);
  };

  const handleOpenEdit = (u: User) => {
    setEditingUser(u);
    setFormData({
      ...u,
      username: u.username || (u.email ? u.email.split('@')[0] : ''),
      department: u.department || 'Sales',
      status: u.isActive !== false && u.status !== 'Inactive' ? 'Active' : 'Inactive',
      isActive: u.isActive !== false && u.status !== 'Inactive',
    });
    setAvatarPreview(u.avatar || null);
    setEditModalOpen(true);
  };

  // Avatar file upload from Desktop / Mobile
  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast(language === 'th' ? 'ขนาดไฟล์รูปภาพเกินกำหนด (สูงสุด 5MB)' : 'File size exceeds 5MB limit', 'error');
      return;
    }

    const validMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validMimes.includes(file.type)) {
      showToast(language === 'th' ? 'รองรับเฉพาะไฟล์รูปภาพ JPG, PNG และ WEBP' : 'Only JPG, PNG, and WEBP images are supported', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setAvatarPreview(dataUrl);
      setFormData((prev) => ({ ...prev, avatar: dataUrl }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim() || !formData.email?.trim()) {
      showToast(language === 'th' ? 'กรุณากรอกชื่อและอีเมล' : 'Please enter name and email', 'error');
      return;
    }

    const isActive = formData.status === 'Active' || formData.isActive === true;
    const role = (formData.role as UserRole) || 'Agent';

    const permissions =
      role === 'Agent'
        ? ['View', 'Create', 'Edit']
        : ['View', 'Create', 'Edit', 'Archive', 'Restore'];

    const toSave: User = {
      id: editingUser ? editingUser.id : `usr-${Date.now()}`,
      name: formData.name.trim(),
      email: formData.email.trim().toLowerCase(),
      username: formData.username?.trim() || formData.email.trim().split('@')[0],
      role,
      branch: formData.branch || 'Phuket Head Office',
      department: formData.department || 'Sales',
      phone: formData.phone || '',
      avatar: formData.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      title: formData.title || (role === 'Agent' ? 'Real Estate Agent' : `${role} Officer`),
      status: isActive ? 'Active' : 'Inactive',
      isActive,
      permissions: permissions as any,
      monthlyTarget: editingUser?.monthlyTarget || 20000000,
      monthlyCommission: editingUser?.monthlyCommission || 500000,
      targetDeals: editingUser?.targetDeals || 5,
      completedDeals: editingUser?.completedDeals || 0,
      lastLoginAt: editingUser?.lastLoginAt || null,
    };

    onSaveUser(toSave);
    setEditModalOpen(false);
    showToast(language === 'th' ? 'บันทึกข้อมูลผู้ใช้งานสำเร็จ' : 'User saved successfully', 'success');
  };

  // Reset Password Action
  const handleExecuteResetPassword = async () => {
    if (!resetPasswordModalUser) return;
    if (!newPasswordInput || newPasswordInput.length < 6) {
      showToast(language === 'th' ? 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร' : 'Password must be at least 6 characters', 'error');
      return;
    }

    setResetPwLoading(true);
    try {
      const res = await fetch(`/api/users/${resetPasswordModalUser.id}/reset-password`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ newPassword: newPasswordInput }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to reset password');
      }

      setResetPwSuccess(language === 'th' ? 'รีเซ็ตรหัสผ่านสำเร็จเรียบร้อยแล้ว' : 'Password reset successfully');
      showToast(language === 'th' ? `รีเซ็ตรหัสผ่านสำหรับ ${resetPasswordModalUser.name} สำเร็จ` : `Password reset for ${resetPasswordModalUser.name} successfully`, 'success');
      setTimeout(() => {
        setResetPasswordModalUser(null);
        setNewPasswordInput('');
        setResetPwSuccess(null);
      }, 1500);
    } catch (err: any) {
      showToast(err.message || 'Error resetting password', 'error');
    } finally {
      setResetPwLoading(false);
    }
  };

  // Role Management Operations
  const handleCreateCustomRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleForm.name.trim()) {
      showToast(language === 'th' ? 'กรุณาระบุชื่อบทบาท' : 'Please specify role name', 'error');
      return;
    }

    setRoleActionLoading(true);
    try {
      const res = await fetch('/api/roles', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(roleForm),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create role');
      }

      showToast(language === 'th' ? `สร้างบทบาท "${roleForm.name}" สำเร็จ` : `Custom role "${roleForm.name}" created`, 'success');
      setRoleModalOpen(false);
      setRoleForm({ name: '', description: '', permissions: ['properties.view', 'clients.view'] });
      await fetchRoles();
    } catch (err: any) {
      showToast(err.message || 'Failed to create custom role', 'error');
    } finally {
      setRoleActionLoading(false);
    }
  };

  const handleToggleRolePermission = async (roleId: string, permKey: string) => {
    const role = dbRoles.find((r) => r.id === roleId);
    if (!role) return;

    const currentPerms = role.permissions || [];
    const updatedPerms = currentPerms.includes(permKey)
      ? currentPerms.filter((p) => p !== permKey)
      : [...currentPerms, permKey];

    try {
      const res = await fetch(`/api/roles/${roleId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ permissions: updatedPerms }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update permissions');
      }

      setDbRoles((prev) =>
        prev.map((r) => (r.id === roleId ? { ...r, permissions: updatedPerms } : r))
      );
      if (selectedRole?.id === roleId) {
        setSelectedRole({ ...selectedRole, permissions: updatedPerms });
      }
      showToast(language === 'th' ? 'อัปเดตสิทธิ์บทบาทสำเร็จ' : 'Permissions updated', 'success');
    } catch (err: any) {
      showToast(err.message || 'Error updating permissions', 'error');
    }
  };

  const handleDeleteRole = async (role: RoleItem) => {
    if (role.isSystem) {
      showToast(language === 'th' ? `ไม่สามารถลบบทบาทของระบบ "${role.name}" ได้` : `Cannot delete system role "${role.name}"`, 'error');
      return;
    }

    const assignedCount = users.filter((u) => u.role.toLowerCase() === role.name.toLowerCase()).length;
    if (assignedCount > 0) {
      showToast(
        language === 'th'
          ? `ไม่สามารถลบบทบาท "${role.name}" เนื่องจากมีผู้ใช้ ${assignedCount} คนกำลังใช้งานอยู่`
          : `Cannot delete role "${role.name}" because ${assignedCount} user(s) are assigned to it`,
        'error'
      );
      return;
    }

    if (!confirm(language === 'th' ? `คุณต้องการลบบทบาท "${role.name}" หรือไม่?` : `Are you sure you want to delete role "${role.name}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/roles/${role.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete role');
      }

      showToast(language === 'th' ? `ลบบทบาท "${role.name}" สำเร็จ` : `Role "${role.name}" deleted successfully`, 'success');
      await fetchRoles();
    } catch (err: any) {
      showToast(err.message || 'Error deleting role', 'error');
    }
  };

  const roleBadge = (role: string) => {
    const c = role.toLowerCase();
    if (c.includes('admin')) return 'bg-red-50 text-red-700 border-red-200';
    if (c.includes('manager')) return 'bg-purple-50 text-purple-700 border-purple-200';
    if (c.includes('agent')) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (c.includes('staff')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    return 'bg-amber-50 text-amber-700 border-amber-200';
  };

  const formatLastLogin = (ts?: string | null) => {
    if (!ts) return language === 'th' ? 'ยังไม่เคยเข้าสู่ระบบ' : 'Never logged in';
    try {
      const d = new Date(ts);
      return d.toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return ts;
    }
  };

  const allAvailablePermissions = [
    { key: 'properties.view', label: 'ดูรายการอสังหาฯ (Properties View)' },
    { key: 'properties.create', label: 'สร้างทรัพย์ใหม่ (Properties Create)' },
    { key: 'properties.edit', label: 'แก้ไขทรัพย์ (Properties Edit)' },
    { key: 'properties.archive', label: 'จัดเก็บ/ลบทรัพย์ (Properties Archive)' },
    { key: 'clients.view', label: 'ดูลูกค้าและลีด (Clients View)' },
    { key: 'clients.create', label: 'เพิ่มลูกค้าใหม่ (Clients Create)' },
    { key: 'clients.edit', label: 'แก้ไขข้อมูลลูกค้า (Clients Edit)' },
    { key: 'contracts.view', label: 'ดูสัญญาเช่า/ซื้อขาย (Contracts View)' },
    { key: 'contracts.create', label: 'ร่างสัญญาใหม่ (Contracts Create)' },
    { key: 'maintenance.view', label: 'ดูงานแจ้งซ่อม (Maintenance View)' },
    { key: 'maintenance.manage', label: 'จัดการงานช่าง/ค่าใช้จ่าย (Maintenance Manage)' },
    { key: 'settings.manage', label: 'ตั้งค่าระบบและผู้ใช้ (Admin Settings)' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-xl border flex items-center gap-2.5 text-xs font-semibold animate-in slide-in-from-bottom-2 ${
            toast.type === 'success'
              ? 'bg-emerald-950 text-emerald-100 border-emerald-800'
              : 'bg-red-950 text-red-100 border-red-800'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-red-400" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header & Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-red-50 text-red-600">
              <UserCog className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 font-serif tracking-tight">
              {language === 'th' ? 'การจัดการผู้ใช้งาน & บทบาท (User & Role Management)' : 'Users & Roles Management'}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {language === 'th'
              ? 'จัดการบัญชีผู้ใช้งาน, กำหนดบทบาท RBAC, รีเซ็ตรหัสผ่าน และความปลอดภัยบน PostgreSQL'
              : 'Enterprise RBAC, Profile Operations, Password Resets & Secure Roles'}
          </p>
        </div>

        {/* Tab Switcher & Add User CTA */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setActiveTab('users')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'users' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {language === 'th' ? 'ผู้ใช้งาน (Users)' : 'Users'} ({users.length})
            </button>
            <button
              onClick={() => setActiveTab('roles')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'roles' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {language === 'th' ? 'บทบาท & สิทธิ์ (Roles)' : 'Roles & Permissions'} ({dbRoles.length})
            </button>
          </div>

          {activeTab === 'users' && isCurrentAdminOrManager && (
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs transition-all shadow-xs active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{language === 'th' ? 'เพิ่มผู้ใช้งาน' : 'Add User'}</span>
            </button>
          )}

          {activeTab === 'roles' && isCurrentAdmin && (
            <button
              onClick={() => setRoleModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs transition-all shadow-xs active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{language === 'th' ? 'สร้าง Custom Role' : 'Create Role'}</span>
            </button>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: USERS DIRECTORY                                         */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={language === 'th' ? 'ค้นหาตามชื่อ, อีเมล, ชื่อผู้ใช้, เบอร์โทร...' : 'Search by name, email, username, phone...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:bg-white"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                {/* Role Filter */}
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                >
                  <option value="all">{language === 'th' ? 'ทุกบทบาท (All Roles)' : 'All Roles'}</option>
                  {availableRoleNames.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                >
                  <option value="all">{language === 'th' ? 'ทุกสถานะ' : 'All Status'}</option>
                  <option value="Active">Active (เปิดใช้งาน)</option>
                  <option value="Inactive">Inactive (ปิดใช้งาน)</option>
                </select>
              </div>
            </div>
          </div>

          {/* User Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredUsers.length === 0 ? (
              <div className="col-span-full py-16 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
                <UserX className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                <p className="text-sm font-semibold text-slate-600">{language === 'th' ? 'ไม่พบข้อมูลผู้ใช้' : 'No users found'}</p>
                <p className="text-xs text-slate-400 mt-1">{language === 'th' ? 'ลองเปลี่ยนคำค้นหาหรือตัวกรอง' : 'Try adjusting search query or filters'}</p>
              </div>
            ) : (
              filteredUsers.map((u) => {
                const isMe = u.id === currentUser.id;
                const isUserActive = u.isActive !== false && u.status !== 'Inactive';

                return (
                  <div
                    key={u.id}
                    className={`rounded-2xl bg-white border transition-all p-5 flex flex-col justify-between ${
                      isMe
                        ? 'border-red-500 shadow-md ring-2 ring-red-500/10'
                        : !isUserActive
                        ? 'border-slate-200 bg-slate-50/50 opacity-80'
                        : 'border-slate-200/90 shadow-xs hover:border-slate-300'
                    }`}
                  >
                    <div>
                      {/* Top Bar: Role badge + Status badge + Current user indicator */}
                      <div className="flex items-center justify-between mb-3 gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${roleBadge(u.role)}`}>
                            {u.role}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                              isUserActive
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${isUserActive ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                            {isUserActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>

                        {isMe && (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                            <CheckCircle2 className="w-3 h-3" /> Current User
                          </span>
                        )}
                      </div>

                      {/* Avatar & Title */}
                      <div className="flex items-center gap-3">
                        <img
                          src={u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'}
                          alt=""
                          className="w-12 h-12 rounded-2xl object-cover ring-2 ring-slate-100 shadow-xs shrink-0 bg-slate-100"
                        />
                        <div className="min-w-0 flex-1">
                          <h3 className="font-bold text-slate-900 text-sm truncate">{u.name}</h3>
                          <p className="text-xs text-slate-500 truncate">{u.title || `${u.role} Officer`}</p>
                          {u.username && (
                            <span className="inline-block font-mono text-[10px] text-slate-400">
                              @{u.username}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Contact Info & Department */}
                      <div className="space-y-1 mt-3.5 text-xs text-slate-600 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                        <p className="flex items-center gap-2 truncate">
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{u.email}</span>
                        </p>
                        <p className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{u.phone || '-'}</span>
                        </p>
                        <p className="flex items-center gap-2 truncate">
                          <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{u.department || 'Sales'} • {u.branch || 'Phuket Head Office'}</span>
                        </p>
                      </div>

                      {/* Last Login Info */}
                      <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-slate-400">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{language === 'th' ? 'เข้าสู่ระบบล่าสุด:' : 'Last Login:'} {formatLastLogin(u.lastLoginAt)}</span>
                      </div>
                    </div>

                    {/* Bottom Actions Bar */}
                    <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between gap-1 flex-wrap">
                      <button
                        onClick={() => onSwitchUser(u)}
                        disabled={isMe}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          isMe
                            ? 'bg-slate-100 text-slate-400 cursor-default'
                            : 'bg-slate-900 hover:bg-slate-800 text-white cursor-pointer active:scale-95'
                        }`}
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>{isMe ? 'Active' : 'Login'}</span>
                      </button>

                      <div className="flex items-center gap-1">
                        {/* View Details Button */}
                        <button
                          onClick={() => setViewingUser(u)}
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer transition-colors"
                          title={language === 'th' ? 'ดูรายละเอียด' : 'View Details'}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* Reset Password Button (Admin Only) */}
                        {isCurrentAdmin && (
                          <button
                            onClick={() => {
                              setResetPasswordModalUser(u);
                              setNewPasswordInput('');
                              setResetPwSuccess(null);
                            }}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-red-50 text-slate-600 hover:text-red-600 cursor-pointer transition-colors"
                            title={language === 'th' ? 'รีเซ็ตรหัสผ่าน' : 'Reset Password'}
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Toggle Active / Inactive Button */}
                        {isCurrentAdminOrManager && !isMe && (
                          <button
                            onClick={() => onToggleStatus && onToggleStatus(u.id)}
                            className={`p-1.5 rounded-lg border cursor-pointer transition-colors ${
                              isUserActive
                                ? 'border-slate-200 hover:bg-amber-50 text-slate-600 hover:text-amber-700'
                                : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            }`}
                            title={isUserActive ? 'Deactivate User' : 'Activate User'}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Edit Button */}
                        {isCurrentAdminOrManager && (
                          <button
                            onClick={() => handleOpenEdit(u)}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer transition-colors"
                            title={t.edit}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Soft Delete */}
                        {isCurrentAdminOrManager && users.length > 1 && !isMe && (
                          <button
                            onClick={() => {
                              if (confirm(`Deactivate and soft-delete user ${u.name}?`)) {
                                onDeleteUser(u.id);
                              }
                            }}
                            className="p-1.5 rounded-lg border border-red-200 hover:bg-red-50 text-red-600 cursor-pointer transition-colors"
                            title="Deactivate"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: ROLE & PERMISSION MANAGEMENT                           */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'roles' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Roles List Sidebar */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-3">
            <h2 className="font-bold text-sm text-slate-900 font-serif flex items-center gap-2">
              <Shield className="w-4 h-4 text-red-600" />
              <span>{language === 'th' ? 'บทบาททั้งหมดในระบบ' : 'Configured Roles'}</span>
            </h2>

            <div className="space-y-1.5">
              {dbRoles.map((role) => {
                const isSelected = selectedRole?.id === role.id;
                const assignedCount = users.filter((u) => u.role.toLowerCase() === role.name.toLowerCase()).length;

                return (
                  <div
                    key={role.id}
                    onClick={() => setSelectedRole(role)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'border-red-500 bg-red-50/50 shadow-xs ring-1 ring-red-500/20'
                        : 'border-slate-200/80 hover:bg-slate-50'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-slate-900">{role.name}</span>
                        {role.isSystem ? (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            System
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-purple-100 text-purple-700 border border-purple-200">
                            Custom
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                        {role.description || `${role.permissions?.length || 0} permissions assigned`}
                      </p>
                      <span className="text-[10px] font-medium text-slate-400">
                        {assignedCount} {language === 'th' ? 'ผู้ใช้งาน' : 'assigned users'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {!role.isSystem && isCurrentAdmin && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteRole(role);
                          }}
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          title="Delete Custom Role"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Permissions Matrix Detail */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-5">
            {selectedRole ? (
              <>
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-base text-slate-900 font-serif">{selectedRole.name}</h3>
                      {selectedRole.isSystem ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                          {language === 'th' ? 'บทบาทระบบหลัก (System Role)' : 'System Core Role'}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
                          {language === 'th' ? 'บทบาทกำหนดเอง (Custom Role)' : 'Custom Role'}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {selectedRole.description || 'Manage granular permissions assigned to this role.'}
                    </p>
                  </div>
                </div>

                {/* Permissions Toggles List */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    {language === 'th' ? 'สิทธิ์การเข้าถึงและการทำงาน (Access Permissions)' : 'Access Permissions'}
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {allAvailablePermissions.map((perm) => {
                      const isGranted = (selectedRole.permissions || []).includes(perm.key);
                      return (
                        <div
                          key={perm.key}
                          onClick={() => isCurrentAdmin && handleToggleRolePermission(selectedRole.id, perm.key)}
                          className={`p-3 rounded-xl border flex items-center justify-between transition-all select-none ${
                            isCurrentAdmin ? 'cursor-pointer hover:border-slate-300' : 'cursor-default'
                          } ${
                            isGranted
                              ? 'border-emerald-200 bg-emerald-50/40 text-slate-900'
                              : 'border-slate-200 bg-slate-50/50 text-slate-400'
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <p className="text-xs font-semibold leading-tight">{perm.label}</p>
                            <span className="text-[10px] font-mono text-slate-400">{perm.key}</span>
                          </div>

                          <div
                            className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border transition-all ${
                              isGranted
                                ? 'bg-emerald-600 border-emerald-600 text-white'
                                : 'border-slate-300 bg-white text-transparent'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              <div className="py-20 text-center text-slate-400">
                <Shield className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                <p>{language === 'th' ? 'เลือกบทบาทจากรายการด้านซ้าย' : 'Select a role from the left list'}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 1: RESET PASSWORD MODAL (ADMIN ONLY)                    */}
      {/* ------------------------------------------------------------- */}
      {resetPasswordModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-5 py-4 bg-[#0A0C10] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-red-500" />
                <h3 className="font-bold text-sm font-serif">
                  {language === 'th' ? 'รีเซ็ตรหัสผ่านผู้ใช้งาน' : 'Reset User Password'}
                </h3>
              </div>
              <button
                onClick={() => setResetPasswordModalUser(null)}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <img
                  src={resetPasswordModalUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100'}
                  alt=""
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div className="min-w-0">
                  <p className="font-bold text-slate-900">{resetPasswordModalUser.name}</p>
                  <p className="text-[11px] text-slate-500 truncate">{resetPasswordModalUser.email}</p>
                </div>
              </div>

              {resetPwSuccess ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{resetPwSuccess}</span>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      {language === 'th' ? 'รหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร) *' : 'New Password (min 6 characters) *'}
                    </label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={newPasswordInput}
                      onChange={(e) => setNewPasswordInput(e.target.value)}
                      className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setResetPasswordModalUser(null)}
                      className="px-3 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold"
                    >
                      {t.cancel}
                    </button>
                    <button
                      type="button"
                      disabled={resetPwLoading || newPasswordInput.length < 6}
                      onClick={handleExecuteResetPassword}
                      className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-semibold cursor-pointer"
                    >
                      {resetPwLoading ? 'Resetting...' : language === 'th' ? 'ยืนยันรีเซ็ต' : 'Reset Password'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 2: CREATE CUSTOM ROLE MODAL                             */}
      {/* ------------------------------------------------------------- */}
      {roleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-5 py-4 bg-[#0A0C10] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-red-500" />
                <h3 className="font-bold text-sm font-serif">
                  {language === 'th' ? 'สร้าง Custom Role ใหม่' : 'Create Custom Role'}
                </h3>
              </div>
              <button
                onClick={() => setRoleModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomRole} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {language === 'th' ? 'ชื่อบทบาท (Role Name) *' : 'Role Name *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น Senior Agent, Marketing Specialist"
                  value={roleForm.name}
                  onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {language === 'th' ? 'คำอธิบาย (Description)' : 'Description'}
                </label>
                <input
                  type="text"
                  placeholder="รายละเอียดหน้าที่ความรับผิดชอบ"
                  value={roleForm.description}
                  onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRoleModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={roleActionLoading || !roleForm.name.trim()}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-semibold cursor-pointer"
                >
                  {roleActionLoading ? 'Saving...' : language === 'th' ? 'สร้างบทบาท' : 'Create Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 3: VIEW USER DETAILS MODAL                              */}
      {/* ------------------------------------------------------------- */}
      {viewingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden my-auto flex flex-col animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-[#0A0C10] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-red-500" />
                <h3 className="font-bold text-sm font-serif">
                  {language === 'th' ? 'ข้อมูลสมาชิกทีม & สิทธิ์ผู้ใช้งาน' : 'Staff Profile & Permissions'}
                </h3>
              </div>
              <button
                onClick={() => setViewingUser(null)}
                className="p-1 rounded-full text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="flex items-center gap-4 pb-4 border-b border-slate-200">
                <img
                  src={viewingUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'}
                  alt=""
                  className="w-16 h-16 rounded-2xl object-cover ring-2 ring-slate-100 shadow-md"
                />
                <div>
                  <h3 className="text-base font-bold text-slate-900">{viewingUser.name}</h3>
                  <p className="text-slate-500">{viewingUser.title || `${viewingUser.role} Officer`}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${roleBadge(viewingUser.role)}`}>
                      {viewingUser.role}
                    </span>
                    <span className="text-slate-400 font-mono text-[11px]">@{viewingUser.username || 'user'}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-[11px] text-slate-400 block">{language === 'th' ? 'อีเมล' : 'Email'}</span>
                  <span className="font-bold text-slate-800">{viewingUser.email}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-[11px] text-slate-400 block">{language === 'th' ? 'เบอร์โทรศัพท์' : 'Phone'}</span>
                  <span className="font-bold text-slate-800">{viewingUser.phone || '-'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-[11px] text-slate-400 block">{language === 'th' ? 'แผนก' : 'Department'}</span>
                  <span className="font-bold text-slate-800">{viewingUser.department || 'Sales'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-[11px] text-slate-400 block">{language === 'th' ? 'สาขา' : 'Branch'}</span>
                  <span className="font-bold text-slate-800">{viewingUser.branch || 'Phuket Head Office'}</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl flex items-center gap-2 text-slate-600">
                <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                <div>
                  <span className="text-[11px] text-slate-400 block">{language === 'th' ? 'เข้าสู่ระบบล่าสุด' : 'Last Login'}</span>
                  <span className="font-semibold text-slate-800">{formatLastLogin(viewingUser.lastLoginAt)}</span>
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setViewingUser(null)}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold cursor-pointer"
                >
                  {language === 'th' ? 'ปิดหน้าต่าง' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 4: ADD / EDIT USER MODAL                                */}
      {/* ------------------------------------------------------------- */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden my-auto flex flex-col animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-[#0A0C10] text-white flex items-center justify-between shrink-0">
              <h3 className="font-bold text-sm font-serif">
                {editingUser ? (language === 'th' ? 'แก้ไขข้อมูลผู้ใช้' : 'Edit User Profile') : (language === 'th' ? 'เพิ่มผู้ใช้ใหม่' : 'Add New Team Member')}
              </h3>
              <button
                onClick={() => setEditModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
              {/* Avatar Live Preview & Upload */}
              <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <img
                  src={avatarPreview || formData.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'}
                  alt=""
                  className="w-16 h-16 rounded-2xl object-cover ring-2 ring-white shadow-xs shrink-0"
                />
                <div className="space-y-1.5 flex-1">
                  <p className="font-bold text-slate-800">{language === 'th' ? 'รูปภาพประจำตัว (Avatar)' : 'Profile Avatar'}</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleAvatarFileChange}
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs shadow-xs"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>{language === 'th' ? 'เลือกรูปภาพ' : 'Upload File'}</span>
                    </button>
                    {avatarPreview && (
                      <button
                        type="button"
                        onClick={() => {
                          setAvatarPreview(null);
                          setFormData((prev) => ({ ...prev, avatar: '' }));
                        }}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                        title="Remove Avatar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400">JPG, PNG, WEBP (Max 5MB)</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {language === 'th' ? 'ชื่อ-นามสกุล *' : 'Full Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="สมชาย ใจดี"
                    className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {language === 'th' ? 'ชื่อผู้ใช้ (Username)' : 'Username'}
                  </label>
                  <input
                    type="text"
                    value={formData.username || ''}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="somchai"
                    className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {language === 'th' ? 'อีเมล *' : 'Email *'}
                </label>
                <input
                  type="email"
                  required
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="agent@peakrealestate.co.th"
                  className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {language === 'th' ? 'บทบาท (Role) *' : 'Role *'}
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                    className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 font-medium"
                  >
                    {availableRoleNames.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {language === 'th' ? 'สถานะผู้ใช้' : 'Status'}
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as any,
                        isActive: e.target.value === 'Active',
                      })
                    }
                    className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 font-medium"
                  >
                    <option value="Active">Active (เปิดใช้งาน)</option>
                    <option value="Inactive">Inactive (ปิดใช้งาน)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {language === 'th' ? 'เบอร์โทรศัพท์' : 'Phone'}
                  </label>
                  <input
                    type="text"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="081-234-5678"
                    className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {language === 'th' ? 'ตำแหน่ง / สายงาน' : 'Position / Title'}
                  </label>
                  <input
                    type="text"
                    value={formData.title || ''}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Real Estate Agent"
                    className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {language === 'th' ? 'แผนก (Department)' : 'Department'}
                  </label>
                  <input
                    type="text"
                    value={formData.department || ''}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    placeholder="Sales / Operations / Management"
                    className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {language === 'th' ? 'สาขา / สำนักงาน' : 'Branch'}
                  </label>
                  <input
                    type="text"
                    value={formData.branch || ''}
                    onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                    placeholder="Phuket Head Office"
                    className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold cursor-pointer hover:bg-slate-50"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold cursor-pointer transition-all shadow-xs"
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
