'use client';

import React from 'react';

interface CompanyLogoProps {
  symbol: string;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZE_MAP = {
  xs: 'w-5 h-5 text-[9px]',
  sm: 'w-7 h-7 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-11 h-11 text-base',
  xl: 'w-14 h-14 text-xl',
};

// Verified Corporate Color and Visual Mark Definitions
export function CompanyLogo({ symbol, name, size = 'md', className = '' }: CompanyLogoProps) {
  const sym = (symbol || '').toUpperCase().trim();
  const sizeClasses = SIZE_MAP[size] || SIZE_MAP.md;

  // 1. Reliance Industries (Deep Blue roundel with Gold R and crown/sunrays)
  if (sym === 'RELIANCE') {
    return (
      <div
        className={`${sizeClasses} rounded-full flex items-center justify-center font-bold shrink-0 shadow-sm border border-amber-500/30 overflow-hidden ${className}`}
        style={{ background: 'linear-gradient(135deg, #0A2540 0%, #001226 100%)' }}
        title={name || 'Reliance Industries Ltd'}
      >
        <svg viewBox="0 0 40 40" className="w-full h-full p-1.5" fill="none">
          <circle cx="20" cy="20" r="17" stroke="#F59E0B" strokeWidth="1.5" strokeDasharray="3 2" />
          <path
            d="M15 11H23C25.5 11 27 12.5 27 15C27 17.5 25.5 19 23 19H18.5V29H15V11ZM18.5 16.5H22.5C23.5 16.5 24 16 24 15C24 14 23.5 13.5 22.5 13.5H18.5V16.5Z"
            fill="#FBBF24"
          />
          <path d="M21.5 19L27 29H23L18.5 20.5" fill="#FBBF24" />
        </svg>
      </div>
    );
  }

  // 2. Tata Consultancy Services (TCS Blue brandmark)
  if (sym === 'TCS') {
    return (
      <div
        className={`${sizeClasses} rounded-full flex items-center justify-center font-bold shrink-0 shadow-sm border border-blue-400/30 overflow-hidden ${className}`}
        style={{ background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)' }}
        title={name || 'Tata Consultancy Services Ltd'}
      >
        <span className="font-extrabold text-white tracking-tighter" style={{ fontSize: '0.65em' }}>
          TCS
        </span>
      </div>
    );
  }

  // 3. Infosys (Official Infosys Royal Blue with clean serif wordmark)
  if (sym === 'INFY') {
    return (
      <div
        className={`${sizeClasses} rounded-full flex items-center justify-center font-bold shrink-0 shadow-sm border border-sky-400/30 overflow-hidden ${className}`}
        style={{ background: 'linear-gradient(135deg, #007CC3 0%, #005A9C 100%)' }}
        title={name || 'Infosys Ltd'}
      >
        <span className="font-bold text-white tracking-tight" style={{ fontSize: '0.55em', fontFamily: 'serif' }}>
          infosys
        </span>
      </div>
    );
  }

  // 4. HDFC Bank (Official Red and Blue cross symbol)
  if (sym === 'HDFCBANK') {
    return (
      <div
        className={`${sizeClasses} rounded-full flex items-center justify-center font-bold shrink-0 shadow-sm border border-slate-700 bg-white overflow-hidden p-1 ${className}`}
        title={name || 'HDFC Bank Ltd'}
      >
        <svg viewBox="0 0 32 32" className="w-full h-full" fill="none">
          <rect x="2" y="2" width="28" height="28" rx="4" fill="#004C8F" />
          <rect x="12" y="6" width="8" height="20" fill="#ED232A" />
          <rect x="6" y="12" width="20" height="8" fill="#ED232A" />
          <rect x="12" y="12" width="8" height="8" fill="#FFFFFF" />
        </svg>
      </div>
    );
  }

  // 5. ICICI Bank (Orange and Maroon "i" corporate mark)
  if (sym === 'ICICIBANK') {
    return (
      <div
        className={`${sizeClasses} rounded-full flex items-center justify-center font-bold shrink-0 shadow-sm border border-amber-600/30 overflow-hidden ${className}`}
        style={{ background: 'linear-gradient(135deg, #C2410C 0%, #9A3412 100%)' }}
        title={name || 'ICICI Bank Ltd'}
      >
        <svg viewBox="0 0 32 32" className="w-full h-full p-1" fill="none">
          <circle cx="16" cy="16" r="14" fill="#B91C1C" />
          <path d="M16 8C14.5 8 13.5 9 13.5 10.5C13.5 12 14.5 13 16 13C17.5 13 18.5 12 18.5 10.5C18.5 9 17.5 8 16 8Z" fill="#F97316" />
          <path d="M14 15H18V24H14V15Z" fill="#FFFFFF" />
          <path d="M11 24H21V25H11V24Z" fill="#F97316" />
        </svg>
      </div>
    );
  }

  // 6. Bharti Airtel (Red roundel with white cursive emblem)
  if (sym === 'BHARTIARTL') {
    return (
      <div
        className={`${sizeClasses} rounded-full flex items-center justify-center font-bold shrink-0 shadow-sm border border-red-500/30 overflow-hidden ${className}`}
        style={{ background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)' }}
        title={name || 'Bharti Airtel Ltd'}
      >
        <svg viewBox="0 0 32 32" className="w-full h-full p-1.5" fill="none">
          <path
            d="M9 22C9 15 15 10 21 10C22.5 10 23 11 23 12C23 13.5 21.5 14 20 14C16 14 13 17 13 21C13 22.5 12 23 10.5 23C9.5 23 9 22.5 9 22Z"
            fill="#FFFFFF"
          />
          <circle cx="21" cy="18" r="2.5" fill="#FFFFFF" />
        </svg>
      </div>
    );
  }

  // 7. State Bank of India (Cyan/Blue Keyhole Emblem)
  if (sym === 'SBIN') {
    return (
      <div
        className={`${sizeClasses} rounded-full flex items-center justify-center font-bold shrink-0 shadow-sm border border-sky-500/30 overflow-hidden ${className}`}
        style={{ background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)' }}
        title={name || 'State Bank of India'}
      >
        <svg viewBox="0 0 32 32" className="w-full h-full p-1.5" fill="none">
          <circle cx="16" cy="16" r="13" stroke="#FFFFFF" strokeWidth="2.5" />
          <circle cx="16" cy="13" r="3.5" fill="#FFFFFF" />
          <rect x="14.5" y="13" width="3" height="11" fill="#FFFFFF" />
        </svg>
      </div>
    );
  }

  // 8. ITC Limited (Gold & Navy Traditional Badge)
  if (sym === 'ITC') {
    return (
      <div
        className={`${sizeClasses} rounded-full flex items-center justify-center font-bold shrink-0 shadow-sm border border-amber-400/40 overflow-hidden ${className}`}
        style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #172554 100%)' }}
        title={name || 'ITC Ltd'}
      >
        <span className="font-extrabold text-amber-300 tracking-wider" style={{ fontSize: '0.65em' }}>
          ITC
        </span>
      </div>
    );
  }

  // 9. Larsen & Toubro (L&T Cobalt Blue Roundel)
  if (sym === 'LT') {
    return (
      <div
        className={`${sizeClasses} rounded-full flex items-center justify-center font-bold shrink-0 shadow-sm border border-blue-500/30 overflow-hidden ${className}`}
        style={{ background: 'linear-gradient(135deg, #1D4ED8 0%, #1E40AF 100%)' }}
        title={name || 'Larsen & Toubro Ltd'}
      >
        <span className="font-extrabold text-white tracking-tight" style={{ fontSize: '0.6em' }}>
          L&T
        </span>
      </div>
    );
  }

  // 10. Tata Motors (Blue Roundel with Tata symbol)
  if (sym === 'TATAMOTORS' || sym === 'TATAMTRDVR') {
    return (
      <div
        className={`${sizeClasses} rounded-full flex items-center justify-center font-bold shrink-0 shadow-sm border border-blue-400/30 overflow-hidden ${className}`}
        style={{ background: 'linear-gradient(135deg, #0284C7 0%, #075985 100%)' }}
        title={name || 'Tata Motors Ltd'}
      >
        <span className="font-extrabold text-white tracking-tighter" style={{ fontSize: '0.55em' }}>
          TATA
        </span>
      </div>
    );
  }

  // 11. NTPC (National Thermal Power Corporation - Crimson/Navy)
  if (sym === 'NTPC') {
    return (
      <div
        className={`${sizeClasses} rounded-full flex items-center justify-center font-bold shrink-0 shadow-sm border border-sky-400/30 overflow-hidden ${className}`}
        style={{ background: 'linear-gradient(135deg, #0369A1 0%, #0C4A6E 100%)' }}
        title={name || 'NTPC Ltd'}
      >
        <span className="font-extrabold text-white tracking-tight" style={{ fontSize: '0.55em' }}>
          NTPC
        </span>
      </div>
    );
  }

  // 12. Power Grid Corporation of India (Green and Cyan Grid Emblem)
  if (sym === 'POWERGRID' || sym === 'PGINVIT') {
    return (
      <div
        className={`${sizeClasses} rounded-full flex items-center justify-center font-bold shrink-0 shadow-sm border border-emerald-400/30 overflow-hidden ${className}`}
        style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 100%)' }}
        title={name || 'Power Grid Corporation of India'}
      >
        <svg viewBox="0 0 32 32" className="w-full h-full p-1.5" fill="none">
          <circle cx="16" cy="16" r="13" stroke="#A7F3D0" strokeWidth="1.5" />
          <path d="M16 6L23 23H9L16 6Z" stroke="#FFFFFF" strokeWidth="2" strokeLinejoin="round" />
          <line x1="9" y1="18" x2="23" y2="18" stroke="#FFFFFF" strokeWidth="2" />
        </svg>
      </div>
    );
  }

  // 13. UltraTech Cement (Yellow/Black Industrial Badge)
  if (sym === 'ULTRACEMCO') {
    return (
      <div
        className={`${sizeClasses} rounded-full flex items-center justify-center font-bold shrink-0 shadow-sm border border-amber-400/40 overflow-hidden ${className}`}
        style={{ background: 'linear-gradient(135deg, #EAB308 0%, #CA8A04 100%)' }}
        title={name || 'UltraTech Cement Ltd'}
      >
        <span className="font-extrabold text-slate-950 tracking-tighter" style={{ fontSize: '0.55em' }}>
          ULTRA
        </span>
      </div>
    );
  }

  // 14. ONGC (Oil & Natural Gas Corporation - Red Flame Badge)
  if (sym === 'ONGC') {
    return (
      <div
        className={`${sizeClasses} rounded-full flex items-center justify-center font-bold shrink-0 shadow-sm border border-rose-500/30 overflow-hidden ${className}`}
        style={{ background: 'linear-gradient(135deg, #DC2626 0%, #991B1B 100%)' }}
        title={name || 'Oil & Natural Gas Corporation Ltd'}
      >
        <span className="font-extrabold text-amber-300 tracking-tight" style={{ fontSize: '0.55em' }}>
          ONGC
        </span>
      </div>
    );
  }

  // 15. Adani Enterprises / Adani Ports (Adani Blue & Gold)
  if (sym.startsWith('ADANI')) {
    return (
      <div
        className={`${sizeClasses} rounded-full flex items-center justify-center font-bold shrink-0 shadow-sm border border-blue-400/30 overflow-hidden ${className}`}
        style={{ background: 'linear-gradient(135deg, #0284C7 0%, #1E3A8A 100%)' }}
        title={name || 'Adani Group'}
      >
        <span className="font-extrabold text-white tracking-tighter" style={{ fontSize: '0.55em' }}>
          ADANI
        </span>
      </div>
    );
  }

  // 16. Bajaj Finance & Finserv (Bajaj Blue Emblem)
  if (sym.startsWith('BAJAJ')) {
    return (
      <div
        className={`${sizeClasses} rounded-full flex items-center justify-center font-bold shrink-0 shadow-sm border border-sky-400/30 overflow-hidden ${className}`}
        style={{ background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)' }}
        title={name || 'Bajaj Group'}
      >
        <span className="font-extrabold text-white tracking-tight" style={{ fontSize: '0.6em' }}>
          BAJAJ
        </span>
      </div>
    );
  }

  // 17. Hindustan Unilever (HUL Blue Pattern)
  if (sym === 'HINDUNILVR') {
    return (
      <div
        className={`${sizeClasses} rounded-full flex items-center justify-center font-bold shrink-0 shadow-sm border border-blue-400/30 overflow-hidden ${className}`}
        style={{ background: 'linear-gradient(135deg, #1E40AF 0%, #1E3A8A 100%)' }}
        title={name || 'Hindustan Unilever Ltd'}
      >
        <span className="font-extrabold text-white tracking-tight" style={{ fontSize: '0.65em' }}>
          HUL
        </span>
      </div>
    );
  }

  // 18. Tata Consumer Products
  if (sym === 'TATACONSUM') {
    return (
      <div
        className={`${sizeClasses} rounded-full flex items-center justify-center font-bold shrink-0 shadow-sm border border-emerald-400/30 overflow-hidden ${className}`}
        style={{ background: 'linear-gradient(135deg, #047857 0%, #064E3B 100%)' }}
        title={name || 'Tata Consumer Products Ltd'}
      >
        <span className="font-extrabold text-white tracking-tight" style={{ fontSize: '0.55em' }}>
          TATA
        </span>
      </div>
    );
  }

  // 19. Wipro
  if (sym === 'WIPRO') {
    return (
      <div
        className={`${sizeClasses} rounded-full flex items-center justify-center font-bold shrink-0 shadow-sm border border-purple-400/30 overflow-hidden ${className}`}
        style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #4338CA 100%)' }}
        title={name || 'Wipro Ltd'}
      >
        <span className="font-extrabold text-white tracking-tight" style={{ fontSize: '0.6em' }}>
          WIPRO
        </span>
      </div>
    );
  }

  // 20. Zomato (Red brandmark)
  if (sym === 'ZOMATO') {
    return (
      <div
        className={`${sizeClasses} rounded-full flex items-center justify-center font-bold shrink-0 shadow-sm border border-red-400/30 overflow-hidden ${className}`}
        style={{ background: 'linear-gradient(135deg, #E11D48 0%, #BE123C 100%)' }}
        title={name || 'Zomato Ltd'}
      >
        <span className="font-black text-white italic tracking-tight" style={{ fontSize: '0.6em' }}>
          zomato
        </span>
      </div>
    );
  }

  // 21. REITs: Embassy Office Parks
  if (sym === 'EMBASSY') {
    return (
      <div
        className={`${sizeClasses} rounded-full flex items-center justify-center font-bold shrink-0 shadow-sm border border-amber-400/40 overflow-hidden ${className}`}
        style={{ background: 'linear-gradient(135deg, #D97706 0%, #92400E 100%)' }}
        title={name || 'Embassy Office Parks REIT'}
      >
        <span className="font-extrabold text-white tracking-tight" style={{ fontSize: '0.5em' }}>
          EMBASSY
        </span>
      </div>
    );
  }

  // 22. Sovereign Gold Bonds (SGB)
  if (sym.startsWith('SGB') || sym.includes('GOLD')) {
    return (
      <div
        className={`${sizeClasses} rounded-full flex items-center justify-center font-bold shrink-0 shadow-sm border border-amber-300/50 overflow-hidden ${className}`}
        style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #B45309 100%)' }}
        title={name || 'Gold Asset'}
      >
        <span className="font-black text-white tracking-tight" style={{ fontSize: '0.65em' }}>
          AU
        </span>
      </div>
    );
  }

  // Default Monogram with Sector/Symbol Hash Color Palette
  const colors = [
    { bg: 'from-blue-600 to-indigo-800', border: 'border-blue-500/30', text: 'text-white' },
    { bg: 'from-emerald-600 to-teal-800', border: 'border-emerald-500/30', text: 'text-white' },
    { bg: 'from-purple-600 to-violet-800', border: 'border-purple-500/30', text: 'text-white' },
    { bg: 'from-rose-600 to-pink-800', border: 'border-rose-500/30', text: 'text-white' },
    { bg: 'from-amber-600 to-orange-800', border: 'border-amber-500/30', text: 'text-white' },
    { bg: 'from-cyan-600 to-sky-800', border: 'border-cyan-500/30', text: 'text-white' },
  ];

  let hash = 0;
  for (let i = 0; i < sym.length; i++) {
    hash = sym.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colorIndex = Math.abs(hash) % colors.length;
  const picked = colors[colorIndex];
  const monogram = sym.length <= 4 ? sym : sym.slice(0, 2);

  return (
    <div
      className={`${sizeClasses} rounded-full flex items-center justify-center font-bold shrink-0 shadow-sm border ${picked.border} bg-gradient-to-br ${picked.bg} ${picked.text} overflow-hidden ${className}`}
      title={name || sym}
    >
      <span className="font-bold tracking-tight uppercase" style={{ fontSize: monogram.length > 2 ? '0.55em' : '0.7em' }}>
        {monogram}
      </span>
    </div>
  );
}
