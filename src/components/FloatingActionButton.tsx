import React, { useState } from 'react';
import { translations, Language } from '../lib/i18n';
import {
  Plus,
  Building2,
  UserPlus,
  CalendarPlus,
  FileSignature,
  Wrench,
  X
} from 'lucide-react';

interface FloatingActionButtonProps {
  language: Language;
  onQuickAction: (actionType: 'property' | 'customer' | 'viewing' | 'contract' | 'maintenance') => void;
}

export function FloatingActionButton({ language, onQuickAction }: FloatingActionButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const t = translations[language];

  const actions = [
    {
      id: 'property' as const,
      label: t.fabAddProperty,
      icon: Building2,
      color: 'bg-slate-900 text-white hover:bg-slate-800 border-slate-700',
    },
    {
      id: 'customer' as const,
      label: t.fabAddCustomer,
      icon: UserPlus,
      color: 'bg-slate-900 text-white hover:bg-slate-800 border-slate-700',
    },
    {
      id: 'viewing' as const,
      label: t.fabAddAppointment,
      icon: CalendarPlus,
      color: 'bg-slate-900 text-white hover:bg-slate-800 border-slate-700',
    },
    {
      id: 'contract' as const,
      label: t.fabAddContract,
      icon: FileSignature,
      color: 'bg-slate-900 text-white hover:bg-slate-800 border-slate-700',
    },
    {
      id: 'maintenance' as const,
      label: t.fabAddIssue,
      icon: Wrench,
      color: 'bg-slate-900 text-white hover:bg-slate-800 border-slate-700',
    },
  ];

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Floating Buttons Container */}
      <div className="fixed bottom-20 lg:bottom-8 right-5 z-50 flex flex-col items-end gap-2.5">
        {isOpen && (
          <div className="flex flex-col items-end gap-2 mb-2 animate-in fade-in slide-in-from-bottom-5 duration-200">
            {actions.map((act) => {
              const Icon = act.icon;
              return (
                <button
                  key={act.id}
                  onClick={() => {
                    setIsOpen(false);
                    onQuickAction(act.id);
                  }}
                  className="group flex items-center gap-2.5 pl-3.5 pr-3 py-2 rounded-full bg-[#12151C] border border-slate-700 shadow-2xl text-xs font-medium text-slate-100 hover:border-red-500 hover:bg-slate-850 transition-all hover:scale-102"
                >
                  <span className="font-semibold">{act.label}</span>
                  <div className="w-7 h-7 rounded-full bg-red-600/90 text-white flex items-center justify-center shrink-0 shadow-sm group-hover:bg-red-500">
                    <Icon className="w-4 h-4" />
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Main Floating Trigger Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Quick Action Menu"
          className={`w-13 h-13 rounded-full flex items-center justify-center text-white shadow-2xl transition-all duration-300 transform active:scale-95 ${
            isOpen
              ? 'bg-slate-800 rotate-45 ring-4 ring-red-500/20'
              : 'bg-gradient-to-tr from-red-700 via-red-600 to-rose-500 hover:from-red-600 hover:to-rose-400 ring-4 ring-red-600/30 hover:scale-105'
          }`}
          style={{
            boxShadow: '0 8px 25px rgba(220, 38, 38, 0.45)'
          }}
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
        </button>
      </div>
    </>
  );
}
