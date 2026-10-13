'use client';

// ============================================================
// FINOVA — Settings & Application Preferences
// app/(dashboard)/settings/page.tsx
//
// Functional, persisted user configurations:
// 1. Appearance (System, Dark, Light) via next-themes
// 2. Market Data Polling (Auto-update toggle, safe refresh intervals)
// 3. Accessibility & Motion (Reduced motion toggle)
// 4. Privacy, PostgreSQL RLS Security, and Account Disclosures
// ============================================================

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { motion } from 'framer-motion';
import {
  Settings,
  Sun,
  Moon,
  Laptop,
  Activity,
  Zap,
  Eye,
  Shield,
  Lock,
  User,
  Wallet,
  ArrowRight,
  Database,
  Cpu,
  Globe,
  ExternalLink,
  ShieldAlert,
  HelpCircle,
  Check,
  Bell,
} from 'lucide-react';

export default function SettingsPage() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Market Data Preferences
  const [autoUpdateQuotes, setAutoUpdateQuotes] = useState(true);
  const [quoteRefreshInterval, setQuoteRefreshInterval] = useState(30);
  const [defaultDisplayMetric, setDefaultDisplayMetric] = useState<'percent' | 'absolute'>('percent');

  // Accessibility Preferences
  const [reducedMotion, setReducedMotion] = useState(false);

  // Save feedback state
  const [savedBadge, setSavedBadge] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    // Load local storage preferences safely
    try {
      const storedAutoUpdate = localStorage.getItem('finova_quote_autoupdate');
      if (storedAutoUpdate !== null) {
        setAutoUpdateQuotes(storedAutoUpdate === 'true');
      }

      const storedInterval = localStorage.getItem('finova_quote_interval');
      if (storedInterval !== null) {
        const seconds = Number(storedInterval);
        setQuoteRefreshInterval(Number.isFinite(seconds) ? Math.min(300, Math.max(2, seconds)) : 30);
      }

      const storedMetric = localStorage.getItem('finova_default_metric');
      if (storedMetric === 'absolute' || storedMetric === 'percent') {
        setDefaultDisplayMetric(storedMetric);
      }

      const storedMotion = localStorage.getItem('finova_reduced_motion');
      if (storedMotion !== null) {
        setReducedMotion(storedMotion === 'true');
      }
    } catch {
      // Ignore local storage errors
    }
  }, []);

  const triggerSaveNotification = (label: string) => {
    setSaveError(null);
    window.dispatchEvent(new Event('finova-preferences'));
    setSavedBadge(label);
    setTimeout(() => setSavedBadge(null), 2500);
  };

  const handleToggleAutoUpdate = (enabled: boolean) => {
    const previous = autoUpdateQuotes;
    setAutoUpdateQuotes(enabled);
    try {
      localStorage.setItem('finova_quote_autoupdate', String(enabled));
      triggerSaveNotification('Market refresh preference saved');
    } catch {
      setAutoUpdateQuotes(previous);
      setSaveError('Could not save the refresh preference on this device.');
    }
  };

  const handleSelectInterval = (seconds: number) => {
    const previous = quoteRefreshInterval;
    // Floor at 2s per prompt requirements
    const safeSeconds = Math.min(300, Math.max(2, seconds));
    setQuoteRefreshInterval(safeSeconds);
    try {
      localStorage.setItem('finova_quote_interval', String(safeSeconds));
      triggerSaveNotification(`Quote poll interval set to ${safeSeconds}s`);
    } catch {
      setQuoteRefreshInterval(previous);
      setSaveError('Could not save the refresh interval on this device.');
    }
  };

  const handleToggleReducedMotion = (enabled: boolean) => {
    const previous = reducedMotion;
    setReducedMotion(enabled);
    try {
      localStorage.setItem('finova_reduced_motion', String(enabled));
      if (enabled) {
        document.documentElement.classList.add('reduce-motion');
      } else {
        document.documentElement.classList.remove('reduce-motion');
      }
      triggerSaveNotification('Motion preference updated');
    } catch {
      setReducedMotion(previous);
      setSaveError('Could not save the motion preference on this device.');
    }
  };

  const handleSelectDisplayMetric = (metric: 'percent' | 'absolute') => {
    const previous = defaultDisplayMetric;
    setDefaultDisplayMetric(metric);
    try {
      localStorage.setItem('finova_default_metric', metric);
      triggerSaveNotification('Price display metric saved');
    } catch {
      setDefaultDisplayMetric(previous);
      setSaveError('Could not save the price display preference on this device.');
    }
  };

  return (
    <div className="page-container py-6 space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-brand/10 text-brand border border-brand/20">
              <Settings className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Settings &amp; Preferences
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted mt-1">
            Configure appearance, market quote polling, accessibility, and account security
          </p>
        </div>

        {saveError && <p className="text-xs text-muted" role="alert">{saveError}</p>}
        {savedBadge && !saveError && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{savedBadge}</span>
          </motion.div>
        )}
      </div>

      {/* 1. Appearance / Theme */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-6 border border-border space-y-4"
      >
        <div className="border-b border-border/60 pb-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Sun className="w-4 h-4 text-brand" />
              Interface Theme
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Choose your preferred visual presentation across all FINOVA modules
            </p>
          </div>
          {mounted && (
            <span className="text-xs text-muted font-medium capitalize">
              Active: {resolvedTheme}
            </span>
          )}
        </div>

        {mounted ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => {
                setTheme('light');
                triggerSaveNotification('Light mode enabled');
              }}
              className={`p-4 rounded-xl border flex flex-col items-center gap-2.5 transition-all text-center ${
                theme === 'light'
                  ? 'border-brand bg-brand/5 ring-1 ring-brand text-foreground shadow-sm'
                  : 'border-border bg-surface-raised text-muted hover:text-foreground hover:bg-surface'
              }`}
            >
              <div className="p-2 rounded-lg bg-surface border border-border text-amber-500">
                <Sun className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">Light Theme</p>
                <p className="text-[10px] text-muted">Crisp white surfaces, high contrast</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setTheme('dark');
                triggerSaveNotification('Dark mode enabled');
              }}
              className={`p-4 rounded-xl border flex flex-col items-center gap-2.5 transition-all text-center ${
                theme === 'dark'
                  ? 'border-brand bg-brand/5 ring-1 ring-brand text-foreground shadow-sm'
                  : 'border-border bg-surface-raised text-muted hover:text-foreground hover:bg-surface'
              }`}
            >
              <div className="p-2 rounded-lg bg-surface border border-border text-cyan-700 dark:text-cyan-400">
                <Moon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">Dark Theme</p>
                <p className="text-[10px] text-muted">Deep navy background, reduced eye strain</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setTheme('system');
                triggerSaveNotification('System preference synced');
              }}
              className={`p-4 rounded-xl border flex flex-col items-center gap-2.5 transition-all text-center ${
                theme === 'system'
                  ? 'border-brand bg-brand/5 ring-1 ring-brand text-foreground shadow-sm'
                  : 'border-border bg-surface-raised text-muted hover:text-foreground hover:bg-surface'
              }`}
            >
              <div className="p-2 rounded-lg bg-surface border border-border text-purple-700 dark:text-purple-400">
                <Laptop className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">System Default</p>
                <p className="text-[10px] text-muted">Matches your operating system settings</p>
              </div>
            </button>
          </div>
        ) : (
          <div className="h-20 bg-surface-raised animate-pulse rounded-xl" />
        )}
      </motion.div>

      {/* 2. Market Data & Polling Controls */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="card p-6 border border-border space-y-4"
      >
        <div className="border-b border-border/60 pb-3">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-500" />
            Market Quotes &amp; Data Refresh
          </h2>
          <p className="text-xs text-muted mt-0.5">
            Configure live price update frequency during active Indian trading hours (09:15 – 15:30 IST)
          </p>
        </div>

        <div className="space-y-4 text-xs">
          {/* Toggle Auto-Update */}
          <div className="p-4 rounded-xl bg-surface-raised border border-border flex items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="font-bold text-foreground flex items-center gap-2">
                <span>Auto-Refresh Visible Quotes</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-semibold">
                  Market Hours Only
                </span>
              </p>
              <p className="text-muted leading-relaxed max-w-lg">
                Automatically polls lightweight quote updates for open screens. Pauses automatically when markets close or when the browser tab is hidden.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleToggleAutoUpdate(!autoUpdateQuotes)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                autoUpdateQuotes ? 'bg-brand' : 'bg-surface border-border'
              }`}
              role="switch"
              aria-checked={autoUpdateQuotes}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  autoUpdateQuotes ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Refresh Interval Selector */}
          <div className="p-4 rounded-xl bg-surface-raised border border-border space-y-3">
            <div>
              <p className="font-bold text-foreground">Refresh Interval Rate</p>
              <p className="text-muted mt-0.5">
                Frequency for updating lightweight visible ticker prices. Sub-second intervals are blocked to protect API rate limits and device efficiency.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {[2, 3, 5, 10].map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => handleSelectInterval(sec)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    quoteRefreshInterval === sec
                      ? 'bg-brand text-foreground dark:text-white border-brand shadow-sm'
                      : 'bg-surface border-border text-muted hover:text-foreground hover:bg-surface-raised'
                  }`}
                >
                  {sec} seconds {sec === 3 ? '(Recommended)' : ''}
                </button>
              ))}
            </div>
          </div>

          {/* Default Display Metric */}
          <div className="p-4 rounded-xl bg-surface-raised border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="font-bold text-foreground">Holding Performance Metric</p>
              <p className="text-muted mt-0.5">
                Default metric displayed beside stock prices in preview grids
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSelectDisplayMetric('percent')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  defaultDisplayMetric === 'percent'
                    ? 'bg-brand text-foreground dark:text-white border-brand'
                    : 'bg-surface border-border text-muted hover:text-foreground'
                }`}
              >
                Percentage (%)
              </button>
              <button
                type="button"
                onClick={() => handleSelectDisplayMetric('absolute')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  defaultDisplayMetric === 'absolute'
                    ? 'bg-brand text-foreground dark:text-white border-brand'
                    : 'bg-surface border-border text-muted hover:text-foreground'
                }`}
              >
                Rupee Value (₹)
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 3. Accessibility & Motion */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card p-6 border border-border space-y-4"
      >
        <div className="border-b border-border/60 pb-3">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Eye className="w-4 h-4 text-purple-700 dark:text-purple-400" />
            Accessibility &amp; Motion
          </h2>
          <p className="text-xs text-muted mt-0.5">
            Optimize interface fluidity and animation comfort
          </p>
        </div>

        <div className="p-4 rounded-xl bg-surface-raised border border-border flex items-center justify-between gap-4 text-xs">
          <div className="space-y-1">
            <p className="font-bold text-foreground">Reduced Motion Mode</p>
            <p className="text-muted leading-relaxed max-w-lg">
              Disables non-essential card entry transitions and chart morphing effects for users sensitive to motion.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleToggleReducedMotion(!reducedMotion)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              reducedMotion ? 'bg-brand' : 'bg-surface border-border'
            }`}
            role="switch"
            aria-checked={reducedMotion}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                reducedMotion ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </motion.div>

      {/* 4. Quick Account Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/profile"
          className="card p-5 border border-border hover:border-brand transition-all group flex flex-col justify-between space-y-3"
        >
          <div className="space-y-1.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-foreground group-hover:text-brand transition-colors">
              User Profile &amp; Password
            </h3>
            <p className="text-xs text-muted leading-relaxed">
              Update your display name, risk orientation, and change your account password securely.
            </p>
          </div>
          <span className="text-xs font-semibold text-brand flex items-center gap-1">
            Manage Profile <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </Link>

        <Link
          href="/brokers"
          className="card p-5 border border-border hover:border-brand transition-all group flex flex-col justify-between space-y-3"
        >
          <div className="space-y-1.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-foreground group-hover:text-brand transition-colors">
              Broker Accounts
            </h3>
            <p className="text-xs text-muted leading-relaxed">
              Configure Zerodha, Groww, Angel One containers, manage tracking modes, or import tradebooks.
            </p>
          </div>
          <span className="text-xs font-semibold text-brand flex items-center gap-1">
            Manage Brokers <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </Link>

        <Link
          href="/notifications"
          className="card p-5 border border-border hover:border-brand transition-all group flex flex-col justify-between space-y-3"
        >
          <div className="space-y-1.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-foreground group-hover:text-brand transition-colors">
              Notifications Center
            </h3>
            <p className="text-xs text-muted leading-relaxed">
              Inspect real portfolio concentration alerts, valuation notices, and market hours updates.
            </p>
          </div>
          <span className="text-xs font-semibold text-brand flex items-center gap-1">
            View Notifications <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </Link>
      </div>

      {/* 5. Cloud Architecture & Data Privacy Guarantee */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="card p-6 border border-border space-y-4"
      >
        <div className="border-b border-border/60 pb-3">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Lock className="w-4 h-4 text-brand" />
            Data Privacy &amp; Financial Security Architecture
          </h2>
          <p className="text-xs text-muted mt-0.5">
            Full transparency on data isolation, security posture, and zero credential storage
          </p>
        </div>

        <div className="space-y-3 text-xs">
          <div className="p-3.5 rounded-xl border border-border bg-surface-raised flex items-start gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex-shrink-0">
              <Database className="w-4 h-4" />
            </div>
            <div className="space-y-0.5 flex-1">
              <h3 className="font-bold text-foreground">PostgreSQL &amp; Row Level Security (RLS)</h3>
              <p className="text-muted leading-relaxed">
                All financial data (holdings, transactions, broker containers, goals) is stored in Supabase PostgreSQL with strict Row Level Security (RLS) policies matching <code className="text-foreground">auth.uid() = user_id</code>. No user can view or alter another investor&apos;s records.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-border bg-surface-raised flex items-start gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 flex-shrink-0">
              <Shield className="w-4 h-4" />
            </div>
            <div className="space-y-0.5 flex-1">
              <h3 className="font-bold text-foreground">Zero Storage of Broker Passwords, MPINs, or OTPs</h3>
              <p className="text-muted leading-relaxed">
                FINOVA never requests, receives, or stores your broker trading passwords, MPINs, TPINs, or OTPs. You retain full security over your brokerage accounts at all times.
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 6. Legal Policies & Disclosures */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <a
          href="/terms"
          target="_blank"
          className="p-3.5 rounded-xl border border-border bg-surface-raised hover:border-brand transition-colors flex items-center justify-between"
        >
          <div>
            <p className="font-bold text-foreground">Terms of Service</p>
            <p className="text-[11px] text-muted">Statutory Agreement</p>
          </div>
          <ExternalLink className="w-3.5 h-3.5 text-muted" />
        </a>

        <a
          href="/privacy"
          target="_blank"
          className="p-3.5 rounded-xl border border-border bg-surface-raised hover:border-brand transition-colors flex items-center justify-between"
        >
          <div>
            <p className="font-bold text-foreground">Privacy Policy</p>
            <p className="text-[11px] text-muted">Data Governance</p>
          </div>
          <ExternalLink className="w-3.5 h-3.5 text-muted" />
        </a>

        <a
          href="/risk-disclosure"
          target="_blank"
          className="p-3.5 rounded-xl border border-border bg-surface-raised hover:border-brand transition-colors flex items-center justify-between"
        >
          <div>
            <p className="font-bold text-foreground">Market Risk Disclosure</p>
            <p className="text-[11px] text-muted">SEBI Compliance Note</p>
          </div>
          <ExternalLink className="w-3.5 h-3.5 text-muted" />
        </a>
      </div>
    </div>
  );
}
