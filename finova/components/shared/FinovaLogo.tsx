'use client';

import React from 'react';
import Link from 'next/link';

export interface FinovaLogoProps {
  /** Size variant or numerical height/width for the icon */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  /** Display mode:
   * - 'horizontal': [Finova Icon] FINOVA (compact, no tagline)
   * - 'full': [Finova Icon] FINOVA + Tagline
   * - 'symbol': Icon only
   */
  variant?: 'full' | 'symbol' | 'horizontal';
  /** Color theme mode */
  theme?: 'auto' | 'dark' | 'light';
  /** Whether to show the tagline beneath the wordmark */
  showTagline?: boolean;
  /** Optional link destination */
  href?: string;
  /** Custom className for the container */
  className?: string;
  /** Optional click handler */
  onClick?: () => void;
}

const SIZE_MAP = {
  xs: { icon: 20, text: 'text-sm',   tag: 'text-[7.5px]', gap: 'gap-2'   },
  sm: { icon: 26, text: 'text-base', tag: 'text-[8.5px]', gap: 'gap-2.5' },
  md: { icon: 32, text: 'text-lg',   tag: 'text-[9px]',   gap: 'gap-2.5' },
  lg: { icon: 40, text: 'text-xl',   tag: 'text-[10px]',  gap: 'gap-3'   },
  xl: { icon: 52, text: 'text-2xl',  tag: 'text-[11px]',  gap: 'gap-3.5' },
};

/**
 * Finova Emblem — Matches the official supplied Gemini brand identity board.
 * Clean, modern geometric F-V monogram formed by interlocking ribbon planes:
 *   - F backbone & top wing: Electric Cobalt / Royal Blue
 *   - F mid bar: Azure transition
 *   - V ascending wing: Radiant Cyan-Teal growth checkmark
 */
export function FinovaSymbol({
  size = 32,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  const uid = React.useId().replace(/:/g, '');

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`flex-shrink-0 transition-transform duration-200 group-hover:scale-105 ${className}`}
      aria-hidden="true"
    >
      <defs>
        {/* F Gradient: Royal Cobalt to Azure */}
        <linearGradient id={`fb-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1E40AF" />
          <stop offset="45%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#38BDF8" />
        </linearGradient>

        {/* Mid Bar Gradient */}
        <linearGradient id={`fm-${uid}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#1D4ED8" />
          <stop offset="100%" stopColor="#0284C7" />
        </linearGradient>

        {/* V Ascending Wing Gradient: Deep Blue to Radiant Cyan-Teal */}
        <linearGradient id={`fv-${uid}`} x1="10%" y1="90%" x2="90%" y2="10%">
          <stop offset="0%" stopColor="#1D4ED8" />
          <stop offset="30%" stopColor="#0284C7" />
          <stop offset="65%" stopColor="#0D9488" />
          <stop offset="100%" stopColor="#22D3EE" />
        </linearGradient>

        {/* Ambient Glow Filter */}
        <filter id={`fg-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3.5" floodColor="#0284C7" floodOpacity="0.35" />
        </filter>
      </defs>

      <g filter={`url(#fg-${uid})`}>
        {/* F Top Arch & Primary Spine */}
        <path
          d="M16 42C16 23.5 29 14 46 14H76C78.5 14 80 16.5 78.8 18.8L72.5 30.5C71.5 32.5 69.4 33.6 67.2 33.6H42C35 33.6 30 38.5 30 45.5V74C30 77.5 26.5 79.5 23.2 78L18.8 75.8C17 74.9 16 73 16 71V42Z"
          fill={`url(#fb-${uid})`}
        />

        {/* F Middle Horizontal Arm */}
        <path
          d="M30 46H66C68.5 46 70 48.5 68.8 50.8L64.2 59.2C63.2 61 61.2 62 59.2 62H30V46Z"
          fill={`url(#fm-${uid})`}
        />

        {/* The V Rising Wing: Dynamic Converging Ribbon */}
        <path
          d="M30 62C30 73 39.5 83 50.5 83C57.5 83 64 78 68.5 69.5L91 22C92.2 19.5 95.5 19.5 96.5 22L100 29.5C101 31.8 100.5 34.2 99 36.2L74 84C66.5 97.5 50.5 98.5 39 88.5C33.5 83.5 30 75 30 62Z"
          fill={`url(#fv-${uid})`}
        />
      </g>
    </svg>
  );
}

/**
 * Official Finova Brand Logo Component.
 * Supports compact sidebar lockup: [Finova Icon] FINOVA
 * Supports full lockup with tagline: "Your Investments. Unified. Understood."
 */
export function FinovaLogo({
  size = 'md',
  variant = 'horizontal',
  theme = 'auto',
  showTagline,
  href,
  className = '',
  onClick,
}: FinovaLogoProps) {
  const config =
    typeof size === 'number'
      ? { icon: size, text: 'text-lg', tag: 'text-[9px]', gap: 'gap-2.5' }
      : SIZE_MAP[size] || SIZE_MAP.md;

  const displayTagline = showTagline ?? (variant === 'full');

  // Text color tokens based on theme
  const finTextClass =
    theme === 'dark'
      ? 'text-white'
      : theme === 'light'
      ? 'text-slate-900'
      : 'text-foreground';

  const ovaTextClass =
    theme === 'dark'
      ? 'text-cyan-400'
      : theme === 'light'
      ? 'text-teal-700'
      : 'text-brand';

  const tagClasses =
    theme === 'dark'
      ? 'text-muted-foreground/80'
      : theme === 'light'
      ? 'text-slate-500'
      : 'text-muted';

  const content = (
    <div
      className={`inline-flex items-center ${config.gap} select-none group ${className}`}
      onClick={onClick}
    >
      <FinovaSymbol size={config.icon} />

      {variant !== 'symbol' && (
        <div className="flex flex-col leading-none">
          <span
            className={`font-black tracking-[0.1em] leading-none ${config.text}`}
            style={{ fontFamily: 'var(--font-inter, system-ui, sans-serif)' }}
          >
            <span className={finTextClass}>FIN</span>
            <span className={ovaTextClass}>OVA</span>
          </span>
          {displayTagline && (
            <span
              className={`font-medium tracking-[0.14em] uppercase mt-[3px] leading-none ${config.tag} ${tagClasses}`}
              style={{ fontFamily: 'var(--font-inter, system-ui, sans-serif)' }}
            >
              Your Investments. Unified. Understood.
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-block cursor-pointer">
        {content}
      </Link>
    );
  }

  return content;
}

export default FinovaLogo;
