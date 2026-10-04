import React, { useState, useRef } from 'react';
import { User, MonthlyKPI, Contract } from '../types';
import { translations, Language } from '../lib/i18n';
import {
  User as UserIcon,
  Phone,
  Mail,
  Shield,
  LogOut,
  Edit2,
  CheckCircle2,
  Lock,
  Camera,
  Upload,
  Trash2,
  Eye,
  EyeOff,
  AlertCircle,
  Building,
  KeyRound,
  Save,
  X,
  TrendingUp,
  DollarSign,
  Minus,
  Plus,
  Target
} from 'lucide-react';

interface ProfileViewProps {
  currentUser: User;
  kpi: MonthlyKPI;
  contracts: Contract[];
  language: Language;
  onUpdateUser: (u: User) => void;
  onLogout: () => void;
}

export function ProfileView({
  currentUser,
  kpi,
  contracts,
  language,
  onUpdateUser,
  onLogout,
}: ProfileViewProps) {
  const t = translations[language];
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(currentUser.name);
  const [username, setUsername] = useState(currentUser.username || '');
  const [email, setEmail] = useState(currentUser.email);
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [title, setTitle] = useState(currentUser.title || '');
  const [branch, setBranch] = useState(currentUser.branch || 'Phuket Head Office');

  // Avatar State
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Password Change State
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Alert Feedback State
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Target & KPI Editing State
  const [editingTargetKey, setEditingTargetKey] = useState<'monthlyTarget' | 'commission' | 'deals' | null>(null);
  const [targetSalesInput, setTargetSalesInput] = useState<string>(String(currentUser.monthlyTarget || 20000000));
  const [commissionInput, setCommissionInput] = useState<string>(String(currentUser.monthlyCommission || 500000));
  const [completedDealsInput, setCompletedDealsInput] = useState<number>(currentUser.completedDeals || 0);
  const [targetDealsInput, setTargetDealsInput] = useState<number>(currentUser.targetDeals || 5);
  const [isSavingTarget, setIsSavingTarget] = useState(false);

  // Sync inputs whenever currentUser props update
  React.useEffect(() => {
    setTargetSalesInput(String(currentUser.monthlyTarget ?? 20000000));
    setCommissionInput(String(currentUser.monthlyCommission ?? 500000));
    setCompletedDealsInput(Number(currentUser.completedDeals ?? 0));
    setTargetDealsInput(Number(currentUser.targetDeals ?? 5));
  }, [currentUser.monthlyTarget, currentUser.monthlyCommission, currentUser.completedDeals, currentUser.targetDeals]);

  // Save Target Function
  const handleSaveTarget = async (key: 'monthlyTarget' | 'commission' | 'deals') => {
    setIsSavingTarget(true);
    setFeedback(null);
    try {
      const payload: any = {};
      if (key === 'monthlyTarget') {
        const val = Math.max(0, Number(targetSalesInput) || 0);
        payload.monthlyTarget = val;
      } else if (key === 'commission') {
        const val = Math.max(0, Number(commissionInput) || 0);
        payload.monthlyCommission = val;
      } else if (key === 'deals') {
        payload.completedDeals = Math.max(0, Number(completedDealsInput) || 0);
        payload.targetDeals = Math.max(1, Number(targetDealsInput) || 1);
      }

      const token = localStorage.getItem('peak_auth_token') || sessionStorage.getItem('peak_auth_token');
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'x-user-id': currentUser.id,
          'x-user-name': currentUser.name,
          'x-user-role': currentUser.role,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update target');
      }

      const updatedUser: User = {
        ...currentUser,
        ...(key === 'monthlyTarget' ? { monthlyTarget: Number(targetSalesInput) || 20000000 } : {}),
        ...(key === 'commission' ? { monthlyCommission: Number(commissionInput) || 500000 } : {}),
        ...(key === 'deals' ? { completedDeals: Math.max(0, Number(completedDealsInput) || 0), targetDeals: Math.max(1, Number(targetDealsInput) || 1) } : {}),
      };

      onUpdateUser(updatedUser);
      setEditingTargetKey(null);
      setFeedback({
        type: 'success',
        message: language === 'th' ? 'บันทึกการแก้ไขเป้าหมายสำเร็จเรียบร้อยแล้ว' : 'Target updated successfully',
      });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to save' });
    } finally {
      setIsSavingTarget(false);
    }
  };

  const myContracts = contracts.filter((c) => c.agentId === currentUser.id);
  const myTotalCommission = myContracts.reduce((sum, c) => sum + (c.commissionAmount ?? c.commission ?? 0), 0);

  const formatTHB = (n: number) => {
    return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(n);
  };

  // Avatar File Selection & Live Preview
  const handleAvatarFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setFeedback({
        type: 'error',
        message: language === 'th' ? 'ขนาดไฟล์รูปภาพเกินกำหนด (สูงสุด 5MB)' : 'File size exceeds 5MB limit',
      });
      return;
    }

    // Validate mime type
    const validMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validMimes.includes(file.type)) {
      setFeedback({
        type: 'error',
        message: language === 'th' ? 'รองรับเฉพาะไฟล์รูปภาพ JPG, PNG และ WEBP' : 'Only JPG, PNG, and WEBP images are supported',
      });
      return;
    }

    // Read and preview immediately
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setAvatarPreview(dataUrl);

      // Upload directly to backend
      setIsUploadingAvatar(true);
      setFeedback(null);

      try {
        const token = localStorage.getItem('peak_auth_token') || sessionStorage.getItem('peak_auth_token');
        const res = await fetch('/api/auth/profile/avatar', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            'x-user-id': currentUser.id,
            'x-user-name': currentUser.name,
            'x-user-role': currentUser.role,
          },
          body: JSON.stringify({
            dataUrl,
            fileName: file.name,
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to upload avatar');
        }

        const updatedUser: User = {
          ...currentUser,
          avatar: data.avatarUrl,
        };
        onUpdateUser(updatedUser);
        setFeedback({
          type: 'success',
          message: language === 'th' ? 'อัปโหลดและบันทึกรูปโปรไฟล์สำเร็จ' : 'Avatar updated successfully',
        });
      } catch (err: any) {
        setFeedback({
          type: 'error',
          message: err.message || 'Failed to upload avatar',
        });
      } finally {
        setIsUploadingAvatar(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Remove Avatar
  const handleRemoveAvatar = async () => {
    try {
      const token = localStorage.getItem('peak_auth_token') || sessionStorage.getItem('peak_auth_token');
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'x-user-id': currentUser.id,
          'x-user-name': currentUser.name,
          'x-user-role': currentUser.role,
        },
        body: JSON.stringify({ avatar: '' }),
      });

      if (!res.ok) throw new Error('Failed to remove avatar');

      setAvatarPreview(null);
      onUpdateUser({
        ...currentUser,
        avatar: '',
      });
      setFeedback({
        type: 'success',
        message: language === 'th' ? 'ลบรูปโปรไฟล์เรียบร้อยแล้ว' : 'Avatar removed successfully',
      });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  // Save General Profile Info
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    try {
      const token = localStorage.getItem('peak_auth_token') || sessionStorage.getItem('peak_auth_token');
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'x-user-id': currentUser.id,
          'x-user-name': currentUser.name,
          'x-user-role': currentUser.role,
        },
        body: JSON.stringify({
          name: name.trim(),
          username: username.trim(),
          email: email.trim(),
          phone: phone.trim(),
          title: title.trim(),
          branch: branch.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update profile');
      }

      const updatedUser: User = {
        ...currentUser,
        name: data.user.name,
        username: data.user.username,
        email: data.user.email,
        phone: data.user.phone,
        title: data.user.title,
        branch: data.user.branch,
      };

      onUpdateUser(updatedUser);
      setIsEditing(false);
      setFeedback({
        type: 'success',
        message: language === 'th' ? 'บันทึกข้อมูลโปรไฟล์เรียบร้อยแล้ว' : 'Profile updated successfully',
      });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  // Change Password Submission
  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (newPassword.length < 6) {
      setFeedback({
        type: 'error',
        message: language === 'th' ? 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร' : 'New password must be at least 6 characters',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setFeedback({
        type: 'error',
        message: language === 'th' ? 'รหัสผ่านใหม่และยืนยันรหัสผ่านไม่ตรงกัน' : 'New passwords do not match',
      });
      return;
    }

    setPasswordLoading(true);

    try {
      const token = localStorage.getItem('peak_auth_token') || sessionStorage.getItem('peak_auth_token');
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'x-user-id': currentUser.id,
          'x-user-name': currentUser.name,
          'x-user-role': currentUser.role,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to change password');
      }

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setIsChangingPassword(false);
      setFeedback({
        type: 'success',
        message: language === 'th' ? 'เปลี่ยนรหัสผ่านสำเร็จเรียบร้อยแล้ว' : 'Password changed successfully',
      });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setPasswordLoading(false);
    }
  };

  const displayAvatar = avatarPreview || currentUser.avatar;

  return (
    <div className="space-y-6 w-full pb-12 font-sans">
      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-xs font-semibold animate-in fade-in duration-200 shadow-md ${
            feedback.type === 'success'
              ? 'bg-emerald-950/80 border border-emerald-700/80 text-emerald-200'
              : 'bg-red-950/80 border border-red-700/80 text-red-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="p-1 rounded-md hover:bg-white/10 text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Profile Header Card */}
      <div className="relative overflow-hidden rounded-2xl bg-[#0F1218] border border-slate-800 p-6 sm:p-8 text-white shadow-2xl">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Avatar with Camera Overlay */}
          <div className="relative group shrink-0">
            <div className="w-24 h-24 rounded-2xl overflow-hidden ring-4 ring-red-600/30 shadow-2xl bg-slate-800 flex items-center justify-center">
              {displayAvatar ? (
                <img
                  src={displayAvatar}
                  alt={currentUser.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <UserIcon className="w-12 h-12 text-slate-500" />
              )}
            </div>

            {/* Online Indicator */}
            <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-[#0F1218]" />

            {/* Upload Trigger overlay */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAvatar}
              className="absolute inset-0 rounded-2xl bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-1 transition-opacity text-white text-[10px] font-bold cursor-pointer"
              title="Upload new avatar"
            >
              {isUploadingAvatar ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Camera className="w-5 h-5 text-white" />
                  <span>{language === 'th' ? 'เปลี่ยนรูป' : 'Change'}</span>
                </>
              )}
            </button>

            {/* Hidden native file input supporting desktop and mobile camera */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleAvatarFileSelect}
              className="hidden"
            />
          </div>

          {/* User Details */}
          <div className="flex-1 text-center sm:text-left min-w-0">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-red-950 text-red-400 border border-red-800">
                {currentUser.role}
              </span>
              <span className="text-xs text-slate-500">•</span>
              <span className="text-xs text-slate-300 font-medium">{currentUser.branch}</span>
            </div>

            <h2 className="text-2xl font-bold font-serif text-white mt-1.5 truncate">
              {currentUser.name}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">
              @{currentUser.username || (currentUser.email ? currentUser.email.split('@')[0] : 'user')} • {currentUser.title || currentUser.role}
            </p>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 mt-3 text-xs text-slate-300">
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="truncate">{currentUser.email}</span>
              </span>
              {currentUser.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>{currentUser.phone}</span>
                </span>
              )}
            </div>

            {/* Avatar Quick Actions */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-4 pt-3 border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-all"
              >
                <Upload className="w-3.5 h-3.5 text-red-400" />
                <span>{language === 'th' ? 'อัปโหลดรูปภาพ' : 'Upload Avatar'}</span>
              </button>
              {displayAvatar && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-900/60 text-xs font-medium transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  <span>{language === 'th' ? 'ลบรูปภาพ' : 'Remove'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex sm:flex-col gap-2 shrink-0">
            <button
              onClick={() => {
                setIsEditing(!isEditing);
                setIsChangingPassword(false);
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-all border border-slate-700"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>{isEditing ? (language === 'th' ? 'ยกเลิก' : 'Cancel') : (language === 'th' ? 'แก้ไขโปรไฟล์' : 'Edit Profile')}</span>
            </button>
            <button
              onClick={() => {
                setIsChangingPassword(!isChangingPassword);
                setIsEditing(false);
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-950/60 hover:bg-red-900/80 text-red-300 text-xs font-semibold transition-all border border-red-800/80"
            >
              <KeyRound className="w-3.5 h-3.5 text-red-400" />
              <span>{isChangingPassword ? (language === 'th' ? 'ยกเลิก' : 'Cancel') : (language === 'th' ? 'เปลี่ยนรหัสผ่าน' : 'Password')}</span>
            </button>
          </div>
        </div>

        {/* Edit Profile Form */}
        {isEditing && (
          <form onSubmit={handleSaveProfile} className="mt-6 pt-6 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs animate-in fade-in duration-200">
            <div>
              <label className="block text-slate-400 mb-1.5 font-medium">{language === 'th' ? 'ชื่อ-นามสกุล' : 'Full Name'}</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#090B0E] border border-slate-700 text-white focus:outline-hidden focus:border-red-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1.5 font-medium">{language === 'th' ? 'ชื่อผู้ใช้ (Username)' : 'Username'}</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#090B0E] border border-slate-700 text-white focus:outline-hidden focus:border-red-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1.5 font-medium">{language === 'th' ? 'อีเมล' : 'Email'}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#090B0E] border border-slate-700 text-white focus:outline-hidden focus:border-red-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1.5 font-medium">{language === 'th' ? 'เบอร์โทรศัพท์' : 'Phone'}</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#090B0E] border border-slate-700 text-white focus:outline-hidden focus:border-red-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1.5 font-medium">{language === 'th' ? 'ตำแหน่งงาน' : 'Job Title'}</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#090B0E] border border-slate-700 text-white focus:outline-hidden focus:border-red-500"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold transition-all shadow-lg shadow-red-900/30 flex items-center justify-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>{language === 'th' ? 'บันทึกการแก้ไข' : 'Save Changes'}</span>
              </button>
            </div>
          </form>
        )}

        {/* Change Password Form */}
        {isChangingPassword && (
          <form onSubmit={handleChangePasswordSubmit} className="mt-6 pt-6 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs animate-in fade-in duration-200">
            <div>
              <label className="block text-slate-400 mb-1.5 font-medium">{language === 'th' ? 'รหัสผ่านปัจจุบัน' : 'Current Password'}</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-3.5 pr-9 py-2.5 rounded-xl bg-[#090B0E] border border-slate-700 text-white focus:outline-hidden focus:border-red-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-slate-400 mb-1.5 font-medium">{language === 'th' ? 'รหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)' : 'New Password'}</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#090B0E] border border-slate-700 text-white focus:outline-hidden focus:border-red-500 font-mono"
              />
            </div>
            <div className="flex flex-col justify-end gap-2">
              <div>
                <label className="block text-slate-400 mb-1.5 font-medium">{language === 'th' ? 'ยืนยันรหัสผ่านใหม่' : 'Confirm New Password'}</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#090B0E] border border-slate-700 text-white focus:outline-hidden focus:border-red-500 font-mono"
                />
              </div>
              <button
                type="submit"
                disabled={passwordLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold transition-all shadow-lg shadow-red-900/30 flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {passwordLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>{language === 'th' ? 'อัปเดตรหัสผ่านใหม่' : 'Update Password'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* KPI & Commission Summary Cards (Editable Target, Commission, Deals) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Monthly Target */}
        <div
          className={`p-5 rounded-2xl bg-white border transition-all duration-200 shadow-sm flex flex-col justify-between ${
            editingTargetKey === 'monthlyTarget'
              ? 'ring-2 ring-red-500/50 border-red-500 shadow-md'
              : 'border-slate-200/90 hover:border-slate-300'
          }`}
        >
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-red-50 text-red-600">
                  <TrendingUp className="w-4 h-4" />
                </span>
                <span className="text-xs text-slate-600 font-bold uppercase tracking-wider">
                  {language === 'th' ? 'เป้าหมายยอดขาย' : 'Monthly Target'}
                </span>
              </div>
              {editingTargetKey !== 'monthlyTarget' ? (
                <button
                  type="button"
                  onClick={() => {
                    setEditingTargetKey('monthlyTarget');
                    setTargetSalesInput(String(currentUser.monthlyTarget || 20000000));
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-red-600 hover:text-white bg-red-50 hover:bg-red-600 transition-colors cursor-pointer"
                  title={language === 'th' ? 'แก้ไขเป้าหมายยอดขาย' : 'Edit monthly target'}
                >
                  <Edit2 className="w-3 h-3" />
                  <span>{language === 'th' ? 'แก้ไข' : 'Edit'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditingTargetKey(null)}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                  title={language === 'th' ? 'ปิด' : 'Close'}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {editingTargetKey !== 'monthlyTarget' ? (
              <div className="mt-2">
                <span className="text-2xl font-serif font-bold text-slate-900 block tracking-tight">
                  {formatTHB(Number(currentUser.monthlyTarget) || 20000000)}
                </span>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  {language === 'th' ? 'เป้าหมายยอดขายและปล่อยเช่าประจำเดือน' : 'Sales & Rental Target'}
                </span>
              </div>
            ) : (
              <div className="mt-2 space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    {language === 'th' ? 'กำหนดยอดเป้าหมาย (บาท)' : 'Set Target Amount (THB)'}
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs font-bold font-mono">
                      ฿
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="1000000"
                      value={targetSalesInput}
                      onChange={(e) => setTargetSalesInput(e.target.value)}
                      placeholder="20000000"
                      className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-mono text-sm focus:outline-hidden focus:border-red-500 focus:bg-white"
                      autoFocus
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 font-mono">
                    {language === 'th' ? 'แสดงผล: ' : 'Preview: '}
                    <span className="font-bold text-red-600">
                      {formatTHB(Number(targetSalesInput) || 0)}
                    </span>
                  </p>
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap gap-1.5">
                  {[10000000, 20000000, 30000000, 50000000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setTargetSalesInput(String(preset))}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-all cursor-pointer ${
                        Number(targetSalesInput) === preset
                          ? 'bg-red-600 text-white border-red-600'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                      }`}
                    >
                      {preset >= 1000000 ? `${preset / 1000000}M` : `${preset / 1000}K`}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleSaveTarget('monthlyTarget')}
                    disabled={isSavingTarget}
                    className="flex-1 py-1.5 px-3 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isSavingTarget ? (
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>{language === 'th' ? 'บันทึก' : 'Save'}</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTargetSalesInput(String(currentUser.monthlyTarget || 20000000));
                      setEditingTargetKey(null);
                    }}
                    className="py-1.5 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all cursor-pointer"
                  >
                    {language === 'th' ? 'ยกเลิก' : 'Cancel'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Commission Earned */}
        <div
          className={`p-5 rounded-2xl bg-white border transition-all duration-200 shadow-sm flex flex-col justify-between ${
            editingTargetKey === 'commission'
              ? 'ring-2 ring-emerald-500/50 border-emerald-500 shadow-md'
              : 'border-slate-200/90 hover:border-slate-300'
          }`}
        >
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                  <DollarSign className="w-4 h-4" />
                </span>
                <span className="text-xs text-slate-600 font-bold uppercase tracking-wider">
                  {language === 'th' ? 'ค่าคอมมิชชันสะสม' : 'Commission Earned'}
                </span>
              </div>
              {editingTargetKey !== 'commission' ? (
                <button
                  type="button"
                  onClick={() => {
                    setEditingTargetKey('commission');
                    setCommissionInput(String(currentUser.monthlyCommission || 500000));
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-emerald-600 hover:text-white bg-emerald-50 hover:bg-emerald-600 transition-colors cursor-pointer"
                  title={language === 'th' ? 'แก้ไขค่าคอมมิชชัน' : 'Edit commission'}
                >
                  <Edit2 className="w-3 h-3" />
                  <span>{language === 'th' ? 'แก้ไข' : 'Edit'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditingTargetKey(null)}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                  title={language === 'th' ? 'ปิด' : 'Close'}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {editingTargetKey !== 'commission' ? (
              <div className="mt-2">
                <span className="text-2xl font-serif font-bold text-emerald-700 block tracking-tight">
                  {formatTHB(Number(currentUser.monthlyCommission) || myTotalCommission || 0)}
                </span>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  {language === 'th' ? 'รายได้ค่าคอมมิชชันสะสม / เป้าหมาย' : 'Accumulated earnings'}
                </span>
              </div>
            ) : (
              <div className="mt-2 space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    {language === 'th' ? 'กำหนดยอดคอมมิชชัน (บาท)' : 'Set Commission Amount (THB)'}
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs font-bold font-mono">
                      ฿
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="50000"
                      value={commissionInput}
                      onChange={(e) => setCommissionInput(e.target.value)}
                      placeholder="500000"
                      className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-mono text-sm focus:outline-hidden focus:border-emerald-500 focus:bg-white"
                      autoFocus
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 font-mono">
                    {language === 'th' ? 'แสดงผล: ' : 'Preview: '}
                    <span className="font-bold text-emerald-700">
                      {formatTHB(Number(commissionInput) || 0)}
                    </span>
                  </p>
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap gap-1.5">
                  {[100000, 300000, 500000, 1000000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setCommissionInput(String(preset))}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-all cursor-pointer ${
                        Number(commissionInput) === preset
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                      }`}
                    >
                      {preset >= 1000000 ? `${preset / 1000000}M` : `${preset / 1000}K`}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleSaveTarget('commission')}
                    disabled={isSavingTarget}
                    className="flex-1 py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isSavingTarget ? (
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>{language === 'th' ? 'บันทึก' : 'Save'}</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCommissionInput(String(currentUser.monthlyCommission || 500000));
                      setEditingTargetKey(null);
                    }}
                    className="py-1.5 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all cursor-pointer"
                  >
                    {language === 'th' ? 'ยกเลิก' : 'Cancel'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Card 3: Deals Closed */}
        <div
          className={`p-5 rounded-2xl bg-white border transition-all duration-200 shadow-sm flex flex-col justify-between ${
            editingTargetKey === 'deals'
              ? 'ring-2 ring-blue-500/50 border-blue-500 shadow-md'
              : 'border-slate-200/90 hover:border-slate-300'
          }`}
        >
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                  <CheckCircle2 className="w-4 h-4" />
                </span>
                <span className="text-xs text-slate-600 font-bold uppercase tracking-wider">
                  {language === 'th' ? 'จำนวนดีลที่ปิดสำเร็จ' : 'Deals Closed'}
                </span>
              </div>
              {editingTargetKey !== 'deals' ? (
                <button
                  type="button"
                  onClick={() => {
                    setEditingTargetKey('deals');
                    setCompletedDealsInput(currentUser.completedDeals || 0);
                    setTargetDealsInput(currentUser.targetDeals || 5);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-blue-600 hover:text-white bg-blue-50 hover:bg-blue-600 transition-colors cursor-pointer"
                  title={language === 'th' ? 'แก้ไขจำนวนดีล' : 'Edit deals'}
                >
                  <Edit2 className="w-3 h-3" />
                  <span>{language === 'th' ? 'แก้ไข' : 'Edit'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditingTargetKey(null)}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                  title={language === 'th' ? 'ปิด' : 'Close'}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {editingTargetKey !== 'deals' ? (
              <div className="mt-2 space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-serif font-bold text-blue-900 tracking-tight">
                    {currentUser.completedDeals || 0}{' '}
                    <span className="text-base font-sans font-normal text-slate-400">
                      / {currentUser.targetDeals || 5}
                    </span>
                  </span>
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                    {Math.round(((currentUser.completedDeals || 0) / Math.max(1, currentUser.targetDeals || 5)) * 100)}%
                  </span>
                </div>

                {/* Visual Progress Bar */}
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, Math.round(((currentUser.completedDeals || 0) / Math.max(1, currentUser.targetDeals || 5)) * 100))}%`,
                    }}
                  />
                </div>

                <span className="text-[11px] text-slate-500 block">
                  {language === 'th' ? 'จำนวนดีลปิดการขายสำเร็จเทียบกับเป้าหมาย' : 'Active transactions closed'}
                </span>
              </div>
            ) : (
              <div className="mt-2 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      {language === 'th' ? 'ปิดสำเร็จแล้ว' : 'Completed'}
                    </label>
                    <div className="flex items-center">
                      <button
                        type="button"
                        onClick={() => setCompletedDealsInput(Math.max(0, completedDealsInput - 1))}
                        className="px-2.5 py-2 rounded-l-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 border-r-0 cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <input
                        type="number"
                        min="0"
                        value={completedDealsInput}
                        onChange={(e) => setCompletedDealsInput(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full py-2 px-1 text-center bg-slate-50 border-y border-slate-300 text-slate-900 font-mono text-sm focus:outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={() => setCompletedDealsInput(completedDealsInput + 1)}
                        className="px-2.5 py-2 rounded-r-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 border-l-0 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      {language === 'th' ? 'เป้าหมายทั้งหมด' : 'Target'}
                    </label>
                    <div className="flex items-center">
                      <button
                        type="button"
                        onClick={() => setTargetDealsInput(Math.max(1, targetDealsInput - 1))}
                        className="px-2.5 py-2 rounded-l-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 border-r-0 cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={targetDealsInput}
                        onChange={(e) => setTargetDealsInput(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full py-2 px-1 text-center bg-slate-50 border-y border-slate-300 text-slate-900 font-mono text-sm focus:outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={() => setTargetDealsInput(targetDealsInput + 1)}
                        className="px-2.5 py-2 rounded-r-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 border-l-0 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 font-mono">
                  {language === 'th' ? 'ความสำเร็จ: ' : 'Progress: '}
                  <span className="font-bold text-blue-700">
                    {completedDealsInput} / {targetDealsInput} ดีล (
                    {Math.round((completedDealsInput / Math.max(1, targetDealsInput)) * 100)}%)
                  </span>
                </p>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleSaveTarget('deals')}
                    disabled={isSavingTarget}
                    className="flex-1 py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isSavingTarget ? (
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>{language === 'th' ? 'บันทึก' : 'Save'}</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCompletedDealsInput(currentUser.completedDeals || 0);
                      setTargetDealsInput(currentUser.targetDeals || 5);
                      setEditingTargetKey(null);
                    }}
                    className="py-1.5 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all cursor-pointer"
                  >
                    {language === 'th' ? 'ยกเลิก' : 'Cancel'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Security & Active Session Box */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-red-600" />
          <h3 className="font-bold text-sm text-slate-900">
            {language === 'th' ? 'ความปลอดภัยและการเข้าสู่ระบบ' : 'Security & Active Session'}
          </h3>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80">
          <div>
            <p className="font-bold text-xs text-slate-800">
              {language === 'th' ? 'เซสชันปัจจุบัน (Active Session)' : 'Active Authentication Session'}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Signed in as <strong className="text-slate-700">{currentUser.email}</strong> with <strong className="text-slate-700">{currentUser.role}</strong> role in PostgreSQL.
            </p>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-sm transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>{t.navLogout}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
