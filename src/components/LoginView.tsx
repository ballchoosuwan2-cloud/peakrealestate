import React, { useState } from 'react';
import { PeakLogo } from './PeakLogo';
import { PWAInstallButton } from './PWAInstallButton';
import { Lock, Mail, User, Eye, EyeOff, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';
import { Language, translations } from '../lib/i18n';

interface LoginViewProps {
  onLoginSuccess: (user: any, token: string) => void;
  language: Language;
  onLanguageToggle?: () => void;
}

export function LoginView({
  onLoginSuccess,
  language,
  onLanguageToggle,
}: LoginViewProps) {
  const t = translations[language];

  const [identifier, setIdentifier] = useState('admin@peakrealestate.com');
  const [password, setPassword] = useState('Peak@2026');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const quickRoles = [
    {
      label: 'Administrator',
      email: 'admin@peakrealestate.com',
      pass: 'Peak@2026',
      badge: 'Super Admin',
      color: 'border-red-800/80 bg-red-950/40 text-red-300 hover:border-red-600',
    },
    {
      label: 'Manager',
      email: 'nichada@peakrealestate.com',
      pass: 'Peak@2026',
      badge: 'Operations',
      color: 'border-purple-800/80 bg-purple-950/40 text-purple-300 hover:border-purple-600',
    },
    {
      label: 'Senior Agent',
      email: 'kittisak@peakrealestate.com',
      pass: 'Peak@2026',
      badge: 'Bang Tao',
      color: 'border-blue-800/80 bg-blue-950/40 text-blue-300 hover:border-blue-600',
    },
    {
      label: 'Field Agent',
      email: 'somchai@peakrealestate.com',
      pass: 'Peak@2026',
      badge: 'Rawai',
      color: 'border-emerald-800/80 bg-emerald-950/40 text-emerald-300 hover:border-emerald-600',
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setErrorMsg(language === 'th' ? 'กรุณากรอกอีเมล/ชื่อผู้ใช้ และรหัสผ่าน' : 'Please enter your email/username and password');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim(), password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || (language === 'th' ? 'เข้าสู่ระบบไม่สำเร็จ โปรดตรวจสอบข้อมูล' : 'Login failed'));
      }

      // Store token safely in sessionStorage or localStorage if rememberMe
      if (rememberMe) {
        localStorage.setItem('peak_auth_token', data.token);
      } else {
        sessionStorage.setItem('peak_auth_token', data.token);
      }

      onLoginSuccess(data.user, data.token);
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  const fillQuickRole = (email: string, pass: string) => {
    setIdentifier(email);
    setPassword(pass);
    setErrorMsg('');
  };

  return (
    <div className="min-h-screen w-full bg-[#07090D] flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 relative overflow-hidden font-sans selection:bg-red-900 selection:text-white">
      {/* Ambient specular background glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-red-900/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-slate-700/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-red-950/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top bar controls */}
      <div className="w-full max-w-md flex items-center justify-between mb-4 z-10">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-red-500" />
          <span className="text-[11px] font-mono uppercase tracking-widest text-slate-400">
            PEAK SECURE PORTAL
          </span>
        </div>
        <div className="flex items-center gap-2">
          <PWAInstallButton language={language} variant="header" />
          {onLanguageToggle && (
            <button
              onClick={onLanguageToggle}
              type="button"
              className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-900/90 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-600 transition-all cursor-pointer"
            >
              {language === 'th' ? 'EN' : 'ไทย'}
            </button>
          )}
        </div>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-md bg-[#0F1218]/95 backdrop-blur-xl border border-slate-800/90 rounded-2xl shadow-2xl p-6 sm:p-8 z-10 relative">
        {/* Subtle rim highlight */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-red-500/40 to-transparent" />

        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-7">
          <div className="transform hover:scale-105 transition-transform duration-300">
            <PeakLogo variant="full" theme="dark" showSubtitle={true} />
          </div>
          <p className="text-xs text-slate-400 mt-3 max-w-xs leading-relaxed">
            {language === 'th'
              ? 'ระบบบริหารจัดการอสังหาริมทรัพย์และทีมเอเจนต์ครบวงจร'
              : 'Enterprise Real Estate CRM & Operations Platform'}
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-5 p-3 rounded-xl bg-red-950/80 border border-red-800/80 text-red-200 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
            <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
            <div className="flex-1 font-medium">{errorMsg}</div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              {language === 'th' ? 'อีเมล หรือ ชื่อผู้ใช้' : 'Email or Username'}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="admin@peakrealestate.com"
                required
                autoComplete="username"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#090B0E] border border-slate-700/80 text-white placeholder-slate-500 text-xs focus:outline-hidden focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-slate-300">
                {language === 'th' ? 'รหัสผ่าน' : 'Password'}
              </label>
              <span className="text-[11px] text-slate-500">
                {language === 'th' ? 'ค่าเริ่มต้น: Peak@2026' : 'Default: Peak@2026'}
              </span>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#090B0E] border border-slate-700/80 text-white placeholder-slate-500 text-xs focus:outline-hidden focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 text-xs">
            <label className="flex items-center gap-2 cursor-pointer text-slate-400 hover:text-slate-300">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-slate-700 bg-slate-900 text-red-600 focus:ring-red-500 focus:ring-offset-0 w-3.5 h-3.5"
              />
              <span>{language === 'th' ? 'จดจำการเข้าสู่ระบบ' : 'Remember me'}</span>
            </label>
            <span className="text-[11px] text-slate-500">Encrypted (scrypt)</span>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white text-xs font-bold tracking-wide uppercase shadow-lg shadow-red-900/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>{language === 'th' ? 'เข้าสู่ระบบ' : 'Sign In to Portal'}</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        {/* Quick Role Fill for Testing / Demo */}
        <div className="mt-6 pt-5 border-t border-slate-800/80">
          <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-red-400" />
            <span>{language === 'th' ? 'เลือกบัญชีทดสอบบทบาท (Quick Access)' : 'Quick Role Selector'}</span>
          </p>
          <div className="grid grid-cols-2 gap-2">
            {quickRoles.map((r) => (
              <button
                key={r.email}
                type="button"
                onClick={() => fillQuickRole(r.email, r.pass)}
                className={`p-2 rounded-xl border text-left transition-all ${r.color}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold block truncate">{r.label}</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded-full border border-current font-mono">
                    {r.badge}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 block truncate mt-0.5 font-mono">
                  {r.email.split('@')[0]}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-slate-500 text-[11px] z-10 flex items-center gap-2">
        <span>PEAK REAL ESTATE CRM</span>
        <span>•</span>
        <span>Version 1.0 (B32)</span>
        <span>•</span>
        <span>Phuket, Thailand</span>
      </div>
    </div>
  );
}
