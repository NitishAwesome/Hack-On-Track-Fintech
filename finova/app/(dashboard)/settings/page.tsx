'use client';

// ============================================================
// FINOVA — Account Settings, Preferences & Privacy Transparency
// Enhanced for Prompt 14:
// - Direct navigation to Profile, Broker Management, and Security
// - Transparent Financial Data & Cloud Architecture Disclosures
// - Risk Appetite Model Consistency & Suitability Clarification
// - Safe Account Deletion Protection Notice
// ============================================================

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Settings,
  User,
  Wallet,
  Shield,
  FileText,
  Lock,
  Database,
  Cpu,
  Globe,
  ArrowRight,
  ExternalLink,
  ShieldAlert,
  HelpCircle,
} from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="page-container py-6 space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-brand/10 text-brand border border-brand/20">
            <Settings className="w-5 h-5" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Settings & Account Controls
          </h1>
        </div>
        <p className="text-sm text-muted mt-1">
          Review your account configurations, data architecture, security posture, and legal disclosures
        </p>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/profile"
          className="card p-5 border border-border hover:border-brand transition-all group flex flex-col justify-between space-y-4"
        >
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <h2 className="text-sm font-bold text-foreground group-hover:text-brand transition-colors">
              User Profile
            </h2>
            <p className="text-xs text-muted leading-relaxed">
              Manage your display name, contact phone, avatar, and self-declared risk appetite.
            </p>
          </div>
          <span className="text-xs font-semibold text-brand flex items-center gap-1">
            Manage Profile <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </Link>

        <Link
          href="/brokers"
          className="card p-5 border border-border hover:border-brand transition-all group flex flex-col justify-between space-y-4"
        >
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
            <h2 className="text-sm font-bold text-foreground group-hover:text-brand transition-colors">
              Broker Accounts
            </h2>
            <p className="text-xs text-muted leading-relaxed">
              Add Zerodha, Groww, Angel One containers, manage tracking modes, and import CSV tradebooks.
            </p>
          </div>
          <span className="text-xs font-semibold text-brand flex items-center gap-1">
            Manage Brokers <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </Link>

        <Link
          href="/profile"
          className="card p-5 border border-border hover:border-brand transition-all group flex flex-col justify-between space-y-4"
        >
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <h2 className="text-sm font-bold text-foreground group-hover:text-brand transition-colors">
              Security & Consents
            </h2>
            <p className="text-xs text-muted leading-relaxed">
              View authentication provider, send password reset link, and inspect legal agreement audits.
            </p>
          </div>
          <span className="text-xs font-semibold text-brand flex items-center gap-1">
            View Security <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </Link>
      </div>

      {/* Risk Appetite Model Consistency Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-6 border border-border space-y-4"
      >
        <div className="border-b border-border/60 pb-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Shield className="w-4 h-4 text-brand" />
              Risk Appetite Model & Suitability Disclaimer
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Understanding how your risk parameters inform portfolio benchmarks
            </p>
          </div>
          <Link
            href="/profile"
            className="text-xs font-semibold text-brand hover:underline"
          >
            Edit in Profile →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-surface-raised border border-border space-y-2">
            <h3 className="font-bold text-foreground flex items-center gap-1.5">
              <span>1. Self-Declared Risk Appetite</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold">
                profiles.risk_appetite
              </span>
            </h3>
            <p className="text-muted leading-relaxed">
              A high-level orientation (<strong>Conservative</strong>, <strong>Moderate</strong>, or <strong>Aggressive</strong>) chosen in your profile. This parameter helps calibrate visual target allocation gauges on your Unified Dashboard and Future Lab scenarios.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-surface-raised border border-border space-y-2">
            <h3 className="font-bold text-foreground flex items-center gap-1.5">
              <span>2. Multi-Dimensional Risk Profile</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 font-semibold">
                risk_profiles
              </span>
            </h3>
            <p className="text-muted leading-relaxed">
              Detailed structural parameters (investment time horizon, maximum drawdown tolerance, and liquidity preference). Used by the Risk Radar and Portfolio X-Ray diagnostics to detect concentration outliers.
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2.5 leading-relaxed">
          <HelpCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <span>
            <strong>Statutory Disclaimer:</strong> Finova is an educational and analytical tool. Self-declared risk parameters do not constitute a formal SEBI-mandated Investment Suitability Assessment or personal financial advisory recommendation. Always consult an AMFI/SEBI registered professional.
          </span>
        </div>
      </motion.div>

      {/* Cloud Architecture & Data Privacy Transparency */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="card p-6 border border-border space-y-4"
      >
        <div className="border-b border-border/60 pb-3">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Lock className="w-4 h-4 text-brand" />
            Data Privacy & Financial Safety Guarantee
          </h2>
          <p className="text-xs text-muted mt-0.5">
            Full transparency on what data is stored, what is queried, and how your privacy is protected
          </p>
        </div>

        <div className="space-y-3 text-xs">
          {/* Row 1: Database Storage */}
          <div className="p-3.5 rounded-xl border border-border bg-surface-raised flex items-start gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 flex-shrink-0">
              <Database className="w-4 h-4" />
            </div>
            <div className="space-y-0.5 flex-1">
              <h3 className="font-bold text-foreground">PostgreSQL & Row Level Security (RLS)</h3>
              <p className="text-muted leading-relaxed">
                All financial data (holdings, transactions, broker containers, goals) is stored in Supabase PostgreSQL. Database tables enforce strict PostgreSQL Row Level Security (RLS) policies matching <code className="text-slate-300">auth.uid() = user_id</code>. No user can view, mutate, or delete another user&apos;s financial records.
              </p>
            </div>
          </div>

          {/* Row 2: Zero Broker Credentials */}
          <div className="p-3.5 rounded-xl border border-border bg-surface-raised flex items-start gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex-shrink-0">
              <Shield className="w-4 h-4" />
            </div>
            <div className="space-y-0.5 flex-1">
              <h3 className="font-bold text-foreground">Zero Storage of Broker Passwords, MPINs, or OTPs</h3>
              <p className="text-muted leading-relaxed">
                Finova never asks for, receives, or stores your broker login passwords, MPINs, TPINs, or trading OTPs. You retain full security over your brokerage accounts at all times. Positions are recorded strictly through self-directed manual inputs or CSV tradebook uploads.
              </p>
            </div>
          </div>

          {/* Row 3: Gemini AI Architecture */}
          <div className="p-3.5 rounded-xl border border-border bg-surface-raised flex items-start gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 flex-shrink-0">
              <Cpu className="w-4 h-4" />
            </div>
            <div className="space-y-0.5 flex-1">
              <h3 className="font-bold text-foreground">Explainable AI & Gemini Privacy</h3>
              <p className="text-muted leading-relaxed">
                AI explanations in the News and Education modules are grounded deterministically. Finova transmits only anonymized portfolio summaries (e.g. general sector weightings) and educational prompts to Google Gemini. Personal identities, bank account details, and full Demat numbers are never sent to external AI models.
              </p>
            </div>
          </div>

          {/* Row 4: External Market Data */}
          <div className="p-3.5 rounded-xl border border-border bg-surface-raised flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 flex-shrink-0">
              <Globe className="w-4 h-4" />
            </div>
            <div className="space-y-0.5 flex-1">
              <h3 className="font-bold text-foreground">Market Quotes & Financial News</h3>
              <p className="text-muted leading-relaxed">
                Security pricing data is queried via public market services (Yahoo Finance NSE/BSE feeds), and market news is provided by NewsData.io. Unquoted securities display transparent valuation disclaimers rather than synthesizing artificial prices.
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Legal Policies & Consents */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card p-6 border border-border space-y-4"
      >
        <div className="border-b border-border/60 pb-3">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <FileText className="w-4 h-4 text-brand" />
            Legal Policies & Regulatory Disclosures
          </h2>
          <p className="text-xs text-muted mt-0.5">
            Review the governing terms and disclosures of the Finova application
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <a
            href="/terms"
            target="_blank"
            className="p-3.5 rounded-xl border border-border bg-surface-raised hover:border-brand transition-colors flex items-center justify-between"
          >
            <div>
              <p className="font-bold text-foreground">Terms of Service</p>
              <p className="text-[11px] text-muted">Version 1.0.0-draft</p>
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
              <p className="text-[11px] text-muted">Version 1.0.0-draft</p>
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
              <p className="text-[11px] text-muted">Version 1.0.0-draft</p>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-muted" />
          </a>
        </div>
      </motion.div>

      {/* Account Deletion & Termination Safeguard (Section 9.4) */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="card p-6 border border-rose-500/20 bg-rose-500/5 space-y-4"
      >
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex-shrink-0 mt-0.5">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold text-foreground">
              Account Deletion & Data Removal Protection
            </h2>
            <p className="text-xs text-muted leading-relaxed">
              Because Finova maintains interrelated transaction ledgers, tax lot cost bases, goal allocations, and historical X-Ray snapshots, permanent user account deletion is permanently protected against accidental or single-click triggering.
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-surface-raised border border-border/80 text-xs text-muted space-y-2">
          <p className="font-semibold text-foreground">
            How to request irreversible account termination:
          </p>
          <p className="leading-relaxed">
            To terminate your Finova account and purge all associated Supabase cloud data, please ensure all broker containers have zero holdings, and submit an authenticated support request. Complete account deletion cascades across all transactions, goals, and profile records irreversibly.
          </p>
          <div className="pt-1">
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
              Administrative Protection Active — Direct Client Trigger Disabled
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
