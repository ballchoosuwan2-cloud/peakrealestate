import React, { useState } from 'react';

const emblemImg = '/S__10977283_0.jpg';

interface PeakLogoProps {
  variant?: 'full' | 'icon' | 'header' | 'hero';
  theme?: 'dark' | 'light';
  className?: string;
  showSubtitle?: boolean;
}

export function PeakLogo({
  variant = 'full',
  theme = 'dark',
  className = '',
  showSubtitle = true,
}: PeakLogoProps) {
  const isDark = theme === 'dark';
  const [imgError, setImgError] = useState(false);
  const [wordmarkError, setWordmarkError] = useState(false);

  // Sizing configurations
  const sizes = {
    icon: { box: 'w-10 h-10', pSize: 'w-6 h-6', rounded: 'rounded-xl' },
    header: { box: 'w-9 h-9', pSize: 'w-5.5 h-5.5', rounded: 'rounded-xl' },
    full: { box: 'w-11 h-11', pSize: 'w-7 h-7', rounded: 'rounded-2xl' },
    hero: { box: 'w-20 h-20', pSize: 'w-13 h-13', rounded: 'rounded-3xl' },
  }[variant];

  // 1. High-Fidelity 3D Platinum Ribbon 'P' Emblem inside a Luxury Dark Squircle
  // (Using the exact photorealistic 3D render image with SVG fallback)
  const Emblem = (
    <div
      className={`relative flex items-center justify-center shrink-0 ${sizes.box} ${sizes.rounded} overflow-hidden shadow-2xl transition-transform duration-300 hover:scale-[1.02] bg-[#050608] border border-white/20`}
      style={{
        boxShadow:
          '0 8px 24px -4px rgba(0, 0, 0, 0.75), 0 2px 6px rgba(0,0,0,0.5), inset 0 1px 1.5px rgba(255, 255, 255, 0.35)',
      }}
    >
      {!imgError ? (
        <img
          src={emblemImg || '/S__10977283_0.jpg'}
          alt="PEAK Real Estate 3D Emblem"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover rounded-[inherit] select-none pointer-events-none"
          onError={() => setImgError(true)}
        />
      ) : (
        <svg
          viewBox="0 0 120 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`${sizes.pSize} drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]`}
        >
          <defs>
            <linearGradient id="platinumMainFallback" x1="20%" y1="10%" x2="80%" y2="90%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="25%" stopColor="#EDEDF2" />
              <stop offset="60%" stopColor="#B4B9C4" />
              <stop offset="90%" stopColor="#7E8494" />
              <stop offset="100%" stopColor="#555A68" />
            </linearGradient>
            <linearGradient id="ribbonUnderFoldFallback" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
              <stop offset="25%" stopColor="#8F96A5" />
              <stop offset="60%" stopColor="#3E4452" />
              <stop offset="100%" stopColor="#181A20" />
            </linearGradient>
          </defs>
          <path
            d="M36 28 C40 28 43 27 45 23 H47 V92 C47 95 44 97 38 97 H36 V99 H62 V97 H60 C54 97 51 95 51 92 V58 H54 C74 58 87 49 87 38 C87 27 74 23 54 23 H36 V28 Z"
            fill="url(#platinumMainFallback)"
          />
          <path
            d="M51 28 H54 C68 28 78 31 78 38 C78 45 68 53 54 53 H51 V28 Z"
            fill="#0B0C10"
          />
          <path
            d="M48 64 C55 60 74 56 81 44 C84 39 84 35 81 33 C77 39 63 50 48 56 Z"
            fill="url(#ribbonUnderFoldFallback)"
          />
          <path
            d="M45 74 C47 70 56 59 70 51 C78 46 83 40 82 36 C80 43 71 52 56 61 C49 65 46 70 45 74 Z"
            fill="url(#platinumMainFallback)"
          />
        </svg>
      )}
    </div>
  );

  if (variant === 'icon') {
    return Emblem;
  }

  // 2. Official Wordmark Typography: P E ∧ K  /  — REAL ESTATE —
  // (Directly modeled after D193F455-176F-43F2-98EA-9E22F4B21E9E.png)
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {Emblem}

      <div className="flex flex-col justify-center">
        {!wordmarkError ? (
          <img
            src="/peak_wordmark_logo.jpg"
            alt="PEAK REAL ESTATE"
            referrerPolicy="no-referrer"
            className={
              variant === 'header'
                ? 'h-[28px] sm:h-[32px] w-auto object-contain select-none'
                : variant === 'hero'
                ? 'h-[52px] sm:h-[64px] w-auto object-contain select-none'
                : 'h-[34px] sm:h-[40px] w-auto object-contain select-none'
            }
            onError={() => setWordmarkError(true)}
          />
        ) : (
          <>
            {/* Main "P E ∧ K" Wordmark */}
            <div className="flex items-center gap-1 leading-none select-none tracking-tight">
              <svg
                viewBox="0 0 178 38"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className={
                  variant === 'header'
                    ? 'h-[20px] w-auto'
                    : variant === 'hero'
                    ? 'h-[36px] w-auto'
                    : 'h-[24px] w-auto'
                }
              >
                {/* 'P' - High Contrast Luxury Serif */}
                <path
                  d="M3 4 H23 C32 4 38 8 38 15 C38 22 32 26 23 26 H11 V34 H15 V36 H3 V34 H7 V6 H3 V4 Z M11 6 V24 H22 C28 24 32 21 32 15 C32 9 28 6 22 6 H11 Z"
                  fill={isDark ? '#FFFFFF' : '#0A0C10'}
                />

                {/* 'E' - High Contrast Luxury Serif */}
                <path
                  d="M45 4 H71 V9 H69 C67 6 64 6 59 6 H53 V18 H63 C67 18 67 16 67 14 H69 V24 H67 C67 22 67 20 63 20 H53 V34 H61 C66 34 68 33 71 30 H73 V36 H45 V34 H49 V6 H45 V4 Z"
                  fill={isDark ? '#FFFFFF' : '#0A0C10'}
                />

                {/* '∧' (PEAK A) - Signature Iconic Mountain Chevron Peak Without Crossbar */}
                <path
                  d="M78 36 L100 4 L122 36 H114 L100 13 L86 36 H78 Z"
                  fill={isDark ? '#FFFFFF' : '#0A0C10'}
                />
                {/* Stylized Serif feet at bottom of chevron legs */}
                <path
                  d="M75 36 H88 V34 H84 L78 34 Z M112 34 H116 L124 34 V36 H112 Z"
                  fill={isDark ? '#FFFFFF' : '#0A0C10'}
                />

                {/* 'K' - High Contrast Luxury Serif */}
                <path
                  d="M129 4 H139 V6 H135 V18 L152 4 H162 V6 L144 19 L164 34 V36 H153 L137 23 L135 25 V34 H139 V36 H129 V34 H133 V6 H129 V4 Z"
                  fill={isDark ? '#FFFFFF' : '#0A0C10'}
                />
              </svg>
            </div>

            {/* Subtitle: — REAL ESTATE — */}
            {showSubtitle && (
              <div className="flex items-center gap-2 mt-1 select-none">
                {/* Left rule line */}
                <span
                  className={`h-[0.75px] w-3.5 sm:w-5 ${
                    isDark ? 'bg-white/40' : 'bg-slate-900/40'
                  }`}
                />
                <span
                  className={`text-[8.5px] sm:text-[9.5px] font-medium tracking-[0.34em] uppercase ${
                    isDark ? 'text-white/90' : 'text-slate-900/90'
                  }`}
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  REAL ESTATE
                </span>
                {/* Right rule line */}
                <span
                  className={`h-[0.75px] w-3.5 sm:w-5 ${
                    isDark ? 'bg-white/40' : 'bg-slate-900/40'
                  }`}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
