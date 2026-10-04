import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Share, PlusSquare, X, CheckCircle, Smartphone } from 'lucide-react';
import { Language } from '../lib/i18n';

interface PWAInstallButtonProps {
  language?: Language;
  variant?: 'header' | 'floating' | 'banner' | 'settings';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  language = 'th',
  variant = 'header',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  // If already running as an installed PWA, do not show button
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      const success = await install();
      if (success) {
        setInstallSuccess(true);
        setTimeout(() => setInstallSuccess(false), 4000);
      }
    } else if (isIOS) {
      setShowIOSGuide(true);
    } else {
      // Direct instruction fallback for other browsers / desktop
      setShowIOSGuide(true);
    }
  };

  const buttonContent = (
    <>
      {installSuccess ? (
        <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
          <CheckCircle className="w-3.5 h-3.5" />
          <span>{language === 'th' ? 'ติดตั้งเรียบร้อย' : 'Installed'}</span>
        </span>
      ) : (
        <span className="flex items-center gap-1.5">
          <Download className="w-3.5 h-3.5 text-red-400 animate-pulse" />
          <span className="font-semibold text-xs tracking-tight">
            {language === 'th' ? 'ติดตั้งแอป' : 'Install App'}
          </span>
        </span>
      )}
    </>
  );

  return (
    <>
      {/* 1. Header Variant */}
      {variant === 'header' && (
        <button
          type="button"
          onClick={handleInstallClick}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-red-600/90 to-red-700/90 hover:from-red-500 hover:to-red-600 text-white shadow-md hover:shadow-red-900/30 transition-all border border-red-500/50 cursor-pointer"
          title={language === 'th' ? 'ติดตั้ง PEAK REAL ESTATE ลงบนอุปกรณ์' : 'Install PEAK REAL ESTATE on device'}
        >
          {buttonContent}
        </button>
      )}

      {/* 2. Settings / Full Variant */}
      {variant === 'settings' && (
        <button
          type="button"
          onClick={handleInstallClick}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white border border-slate-700 hover:border-slate-500 text-xs font-bold transition-all shadow-sm cursor-pointer"
        >
          <Smartphone className="w-4 h-4 text-red-500" />
          <span>{language === 'th' ? 'ติดตั้งเป็นแอปพลิเคชัน (PWA)' : 'Install as PWA Application'}</span>
        </button>
      )}

      {/* iOS / General Device Installation Guide Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm rounded-2xl bg-[#0F1218] border border-slate-800 p-6 shadow-2xl text-white">
            <button
              onClick={() => setShowIOSGuide(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* App Icon preview */}
            <div className="flex items-center gap-3.5 mb-5 pb-4 border-b border-slate-800">
              <img
                src="/S__10977283_0.jpg"
                alt="PEAK Real Estate"
                className="w-13 h-13 rounded-2xl object-cover ring-2 ring-red-500/40 shadow-lg bg-black"
              />
              <div>
                <h3 className="font-serif font-bold text-base text-white">
                  PEAK REAL ESTATE
                </h3>
                <p className="text-[11px] text-slate-400 font-medium">
                  {language === 'th' ? 'ติดตั้งลงบนหน้าจอโฮมของคุณ' : 'Add to your Home Screen'}
                </p>
              </div>
            </div>

            {/* Guided Steps */}
            <div className="space-y-3.5 text-xs text-slate-300">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                <span className="w-5 h-5 rounded-full bg-red-600/30 text-red-400 font-bold flex items-center justify-center shrink-0 text-[11px]">
                  1
                </span>
                <div>
                  <p className="font-semibold text-white">
                    {language === 'th'
                      ? 'กดปุ่มแชร์ (Share Icon)'
                      : 'Tap the Share Button'}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                    <Share className="w-3.5 h-3.5 text-blue-400 inline shrink-0" />
                    <span>
                      {language === 'th'
                        ? 'อยู่แถบเครื่องมือด้านล่างใน Safari หรือเมนูสามจุดใน Chrome'
                        : 'Located in Safari bottom bar or Chrome menu'}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                <span className="w-5 h-5 rounded-full bg-red-600/30 text-red-400 font-bold flex items-center justify-center shrink-0 text-[11px]">
                  2
                </span>
                <div>
                  <p className="font-semibold text-white">
                    {language === 'th'
                      ? 'เลือก "เพิ่มไปยังหน้าจอโฮม"'
                      : 'Select "Add to Home Screen"'}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                    <PlusSquare className="w-3.5 h-3.5 text-emerald-400 inline shrink-0" />
                    <span>
                      {language === 'th'
                        ? 'ระบบจะติดตั้งไอคอนแอปและเปิดทำงานแบบเต็มจอ (Standalone)'
                        : 'App icon will be added and launch standalone full-screen'}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="mt-5 w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-500 font-bold text-xs text-white transition-all shadow-md cursor-pointer"
            >
              {language === 'th' ? 'เข้าใจแล้ว' : 'Got it'}
            </button>
          </div>
        </div>
      )}
    </>
  );
};
