'use client';

// ============================================================
// FINOVA — Multi-Broker & Depository Accounts Management
// Enhanced for Prompt 14:
// - Step-based Add Broker flow (Manual, CSV, Planned API)
// - Truthful Connection Statuses (No fake "CONNECTED" claims)
// - Financial Data Safety: Blocks deletion of accounts with holdings/transactions
// - Preserves account_type during renames
// - Resilient error handling with retry
// - Zero password / PIN / MPIN / OTP collection
// ============================================================

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  Plus,
  Building2,
  X,
  Loader2,
  Trash2,
  Edit2,
  ShieldCheck,
  AlertCircle,
  AlertTriangle,
  ArrowUpRight,
  Wallet,
  FileSpreadsheet,
  PenTool,
  Lock,
  CheckCircle2,
  RefreshCw,
  ChevronLeft,
} from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatCurrency } from '@/lib/utils';
import {
  SUPPORTED_BROKER_CATALOG,
  getBrokerConnectionStatusBadge,
  formatAccountTypeLabel,
  type BrokerInfo,
} from '@/lib/utils/brokerConnection';
import type { BrokerAccount, AccountType, HoldingWithMetrics } from '@/types/portfolio';

const BROKER_OPTIONS = Object.values(SUPPORTED_BROKER_CATALOG);

const ACCOUNT_TYPE_CHOICES: { value: AccountType; label: string; desc: string }[] = [
  { value: 'demat', label: 'Demat Account', desc: 'CDSL / NSDL equity & alternative investments' },
  { value: 'trading', label: 'Trading Account', desc: 'Broker trading margin ledger' },
  { value: 'mf', label: 'Mutual Fund Direct', desc: 'Direct plan mutual funds' },
  { value: 'manual', label: 'Manual Portfolio', desc: 'Custom container for offline holdings' },
  { value: 'other', label: 'Other Depository', desc: 'General financial account container' },
];

async function fetchBrokers() {
  const res = await fetch('/api/brokers');
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}: Failed to load broker accounts`);
  }
  return res.json();
}

async function fetchHoldings() {
  const res = await fetch('/api/portfolio/holdings');
  if (!res.ok) {
    throw new Error('Failed to load holdings');
  }
  return res.json();
}

async function addBroker(data: Record<string, unknown>) {
  const res = await fetch('/api/brokers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to add broker account');
  }
  return res.json();
}

async function updateBroker(data: { id: string; display_name: string; account_type?: string }) {
  const res = await fetch('/api/brokers', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update broker account');
  }
  return res.json();
}

interface DeletionError extends Error {
  details?: {
    message?: string;
    holdingsCount?: number;
    transactionCount?: number;
    remediation?: string;
  };
  status?: number;
}

async function deleteBroker(id: string) {
  const res = await fetch(`/api/brokers?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message = err.details?.message || err.error || 'Failed to delete broker account';
    const errorObj: DeletionError = new Error(message);
    errorObj.details = err.details;
    errorObj.status = res.status;
    throw errorObj;
  }
  return res.json();
}

export default function BrokersPage() {
  const queryClient = useQueryClient();

  // Modals State
  const [showAddModal, setShowAddModal] = useState(false);
  const [addStep, setAddStep] = useState<1 | 2 | 3 | 4>(1);
  const [editingBroker, setEditingBroker] = useState<BrokerAccount | null>(null);
  const [deletingBroker, setDeletingBroker] = useState<BrokerAccount | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [createdBrokerResult, setCreatedBrokerResult] = useState<BrokerAccount | null>(null);

  // Add Account Form State
  const [form, setForm] = useState({
    broker_name: 'Groww',
    broker_code: 'GROWW',
    account_label: '',
    account_type: 'demat' as AccountType,
    data_source: 'MANUAL' as 'MANUAL' | 'CSV',
  });

  // Query: Broker Accounts
  const {
    data: brokerData,
    isLoading: loadingBrokers,
    isError: brokerError,
    error: brokerFetchError,
    refetch: refetchBrokers,
  } = useQuery({
    queryKey: ['brokers'],
    queryFn: fetchBrokers,
  });

  // Query: Holdings (for metrics and deletion safety)
  const { data: holdingData } = useQuery({
    queryKey: ['holdings'],
    queryFn: fetchHoldings,
  });

  const brokers: BrokerAccount[] = brokerData?.brokers ?? [];
  const holdings: HoldingWithMetrics[] = holdingData?.holdings ?? [];

  // Group holdings metrics per broker
  const brokerStats = brokers.reduce((acc, b) => {
    const bHoldings = holdings.filter((h) => h.broker_account_id === b.id);
    const totalInvested = bHoldings.reduce((sum, h) => sum + (h.invested_value || 0), 0);
    const pricedHoldings = bHoldings.filter((h) => h.current_value !== null && h.current_value !== undefined);
    const totalPricedValue = pricedHoldings.reduce((sum, h) => sum + (h.current_value ?? 0), 0);
    const isFullyValued = bHoldings.length === 0 || pricedHoldings.length === bHoldings.length;
    acc[b.id] = {
      count: bHoldings.length,
      invested: totalInvested,
      currentValue: totalPricedValue,
      isFullyValued,
      pricedCount: pricedHoldings.length,
    };
    return acc;
  }, {} as Record<string, { count: number; invested: number; currentValue: number; isFullyValued: boolean; pricedCount: number }>);

  // Mutations
  const addMutation = useMutation({
    mutationFn: addBroker,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['brokers'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-summary'] });
      setCreatedBrokerResult(data.broker);
      setAddStep(4); // Success step
    },
  });

  const editMutation = useMutation({
    mutationFn: updateBroker,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brokers'] });
      setEditingBroker(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBroker,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brokers'] });
      queryClient.invalidateQueries({ queryKey: ['holdings'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-summary'] });
      setDeletingBroker(null);
      setDeleteError(null);
    },
    onError: (err: Error) => {
      setDeleteError(err.message || 'Deletion blocked: Active positions or transactions exist.');
    },
  });

  function resetAddForm() {
    setForm({
      broker_name: 'Groww',
      broker_code: 'GROWW',
      account_label: '',
      account_type: 'demat',
      data_source: 'MANUAL',
    });
    setAddStep(1);
    setCreatedBrokerResult(null);
  }

  function handleSelectBroker(broker: BrokerInfo) {
    setForm((p) => ({
      ...p,
      broker_name: broker.name,
      broker_code: broker.code,
      account_label: p.account_label || `My ${broker.name}`,
    }));
    setAddStep(2);
  }

  return (
    <div className="page-container py-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            My Broker & Depository Accounts
          </h1>
          <p className="text-sm text-muted mt-0.5">
            Manage your multi-broker accounts, view truthful tracking statuses, and organize holdings
          </p>
        </div>
        <button
          id="btn-add-broker"
          onClick={() => {
            resetAddForm();
            setShowAddModal(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm hover:opacity-95 transition-opacity flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, rgb(var(--brand-600)), rgb(var(--brand-400)))' }}
        >
          <Plus className="w-4 h-4" />
          Add Broker Account
        </button>
      </div>

      {/* Security & Truthful Connection Scope Banner */}
      <div className="rounded-2xl p-4.5 text-xs sm:text-sm border border-border bg-surface-raised/40 space-y-2">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex-shrink-0 mt-0.5">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <p className="font-bold text-foreground">
              Privacy-First & Self-Managed Architecture
            </p>
            <p className="text-muted leading-relaxed">
              Finova never collects broker passwords, MPINs, TPINs, or trading OTPs. All accounts here function as authenticated user containers to organize positions added via <strong>Manual Entry</strong> or <strong>CSV Statement Import</strong>. Direct broker API synchronization will only be supported through authorized SEBI/OAuth protocols in future releases.
            </p>
          </div>
        </div>
      </div>

      {/* Account Overview Stats */}
      {!loadingBrokers && !brokerError && brokers.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="card p-4 border border-border">
            <span className="text-[11px] text-muted">Total Containers</span>
            <p className="text-lg font-bold text-foreground mt-0.5">{brokers.length}</p>
          </div>
          <div className="card p-4 border border-border">
            <span className="text-[11px] text-muted">Manual Entries</span>
            <p className="text-lg font-bold text-foreground mt-0.5">
              {brokers.filter((b) => (b.data_source || 'MANUAL') === 'MANUAL').length}
            </p>
          </div>
          <div className="card p-4 border border-border">
            <span className="text-[11px] text-muted">CSV Managed</span>
            <p className="text-lg font-bold text-indigo-400 mt-0.5">
              {brokers.filter((b) => b.data_source === 'CSV').length}
            </p>
          </div>
          <div className="card p-4 border border-border">
            <span className="text-[11px] text-muted">API Connected</span>
            <p className="text-lg font-bold text-muted mt-0.5" title="No live broker OAuth authorized yet">
              0 <span className="text-[10px] text-muted font-normal">(Planned)</span>
            </p>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {loadingBrokers ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-6 space-y-4 animate-pulse border border-border">
              <div className="h-6 w-32 bg-slate-800 rounded" />
              <div className="h-4 w-48 bg-slate-800/60 rounded" />
              <div className="h-14 w-full bg-slate-800/40 rounded-xl" />
            </div>
          ))}
        </div>
      ) : brokerError ? (
        /* Issue 6 Fix: Explicit error handling with retry button */
        <div className="card p-8 text-center border border-rose-500/30 bg-rose-500/5 space-y-4 max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold text-foreground">
              Unable to Load Broker Accounts
            </h2>
            <p className="text-xs text-muted leading-relaxed">
              {brokerFetchError instanceof Error ? brokerFetchError.message : 'Database query temporarily failed.'}
            </p>
          </div>
          <div>
            <button
              onClick={() => refetchBrokers()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border border-border bg-surface-raised hover:bg-slate-800 text-foreground transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry Connection
            </button>
          </div>
        </div>
      ) : brokers.length === 0 ? (
        <EmptyState
          icon={<Building2 className="w-10 h-10 text-brand" />}
          title="No broker accounts created yet"
          description="Add your first brokerage or depository account (e.g. Groww, Zerodha, Angel One) to start organizing your investment holdings."
          action={
            <button
              onClick={() => {
                resetAddForm();
                setShowAddModal(true);
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-md"
              style={{ background: 'linear-gradient(135deg, rgb(var(--brand-600)), rgb(var(--brand-400)))' }}
            >
              <Plus className="w-4 h-4" />
              Add First Broker Account
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {brokers.map((broker, i) => {
            const stats = brokerStats[broker.id] || { count: 0, invested: 0, currentValue: 0, isFullyValued: true };
            const catalogItem = SUPPORTED_BROKER_CATALOG[broker.broker_code?.toUpperCase() || ''] || SUPPORTED_BROKER_CATALOG.OTHER;
            const brokerName = broker.broker_name || catalogItem.name;
            const displayName = broker.display_name || broker.account_label || `${brokerName} Account`;

            // Truthful connection badge
            const statusInfo = getBrokerConnectionStatusBadge(broker.connection_status, broker.data_source);

            return (
              <motion.div
                key={broker.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="card p-5 flex flex-col justify-between border border-border hover:border-slate-700 transition-colors group"
              >
                <div>
                  {/* Top Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-extrabold text-sm shadow-sm flex-shrink-0"
                        style={{ backgroundColor: catalogItem.brandColor || broker.color_hex || '#3B82F6' }}
                      >
                        {catalogItem.shortName || brokerName.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h2 className="font-bold text-base text-foreground truncate" title={displayName}>
                          {displayName}
                        </h2>
                        <p className="text-xs text-muted truncate">
                          {brokerName} • {formatAccountTypeLabel(broker.account_type)}
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button
                        title="Rename Account"
                        onClick={() => setEditingBroker(broker)}
                        className="p-1.5 rounded-lg hover:bg-surface-raised text-muted hover:text-foreground transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        title="Delete Account"
                        onClick={() => {
                          setDeletingBroker(broker);
                          setDeleteError(null);
                        }}
                        className="p-1.5 rounded-lg hover:bg-rose-500/10 text-muted hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Status Badges (Issue 7 Fix) */}
                  <div className="mt-3.5 flex flex-wrap items-center gap-2">
                    <span
                      className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold border flex items-center gap-1.5 ${statusInfo.badgeClass}`}
                      title={statusInfo.description}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusInfo.dotColor }} />
                      {statusInfo.label}
                    </span>

                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium border bg-surface-raised text-muted border-border">
                      Source: {broker.data_source || 'MANUAL'}
                    </span>
                  </div>

                  {/* Metrics Box */}
                  <div className="mt-4 p-3.5 rounded-xl bg-surface-raised/50 border border-border/80 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted block text-[11px]">Tracked Positions</span>
                      <p className="font-bold text-sm text-foreground mt-0.5">
                        {stats.count} {stats.count === 1 ? 'position' : 'positions'}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted block text-[11px]">
                        {stats.isFullyValued ? 'Portfolio Value' : 'Valued Subtotal'}
                      </span>
                      <p className="font-bold text-sm text-foreground mt-0.5">
                        {stats.count === 0
                          ? formatCurrency(0, true)
                          : stats.isFullyValued
                          ? formatCurrency(stats.currentValue, true)
                          : stats.currentValue > 0
                          ? `${formatCurrency(stats.currentValue, true)}*`
                          : 'Unquoted'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer Navigation */}
                <div className="mt-5 pt-3.5 border-t border-border/60 flex items-center justify-between text-xs">
                  <span className="text-muted text-[11px]">
                    Created {new Date(broker.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                  </span>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/holdings?broker=${encodeURIComponent(broker.id)}`}
                      className="inline-flex items-center gap-1 font-semibold text-brand hover:underline"
                    >
                      Holdings
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ============================================================ */}
      {/* MULTI-STEP ADD BROKER ACCOUNT MODAL (Section 5.3)           */}
      {/* ============================================================ */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowAddModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              className="relative w-full max-w-lg card p-6 shadow-2xl border border-border bg-surface z-10 space-y-5"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-brand" />
                  <h2 className="text-lg font-bold text-foreground">
                    {addStep === 4 ? 'Account Registered' : `Add Broker Account (Step ${addStep} of 3)`}
                  </h2>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-1 rounded-lg text-muted hover:text-foreground hover:bg-surface-raised"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* STEP 1: Select Broker */}
              {addStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Step 1 — Choose Broker or Depository</h3>
                    <p className="text-xs text-muted mt-0.5">
                      Select which financial platform this container will represent:
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto pr-1">
                    {BROKER_OPTIONS.map((b) => (
                      <button
                        key={b.code}
                        type="button"
                        onClick={() => handleSelectBroker(b)}
                        className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between hover:border-brand ${
                          form.broker_code === b.code ? 'border-brand bg-brand/10' : 'border-border bg-surface-raised'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-6 h-6 rounded-lg text-[10px] font-bold text-white flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: b.brandColor }}
                          >
                            {b.shortName}
                          </span>
                          <span className="text-xs font-bold text-foreground truncate">{b.name}</span>
                        </div>
                        <span className="text-[10px] text-muted mt-2 capitalize">{b.category}</span>
                      </button>
                    ))}
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold border border-border text-muted hover:bg-surface-raised"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: Choose Tracking Method */}
              {addStep === 2 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setAddStep(1)}
                      className="p-1 rounded-lg text-muted hover:text-foreground hover:bg-surface-raised"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">
                        Step 2 — Tracking Method for {form.broker_name}
                      </h3>
                      <p className="text-xs text-muted">Choose how you plan to populate this container:</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {/* Method 1: Manual Entry */}
                    <div
                      onClick={() => {
                        setForm((p) => ({ ...p, data_source: 'MANUAL' }));
                        setAddStep(3);
                      }}
                      className="p-4 rounded-xl border border-border bg-surface-raised hover:border-brand cursor-pointer transition-all space-y-1 group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-bold text-sm text-foreground group-hover:text-brand">
                          <PenTool className="w-4 h-4 text-brand" />
                          <span>Manual Entry</span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          Available
                        </span>
                      </div>
                      <p className="text-xs text-muted leading-relaxed">
                        Manually search Indian stocks, mutual funds, REITs, or bonds and enter purchased quantities.
                      </p>
                    </div>

                    {/* Method 2: CSV Import */}
                    <div
                      onClick={() => {
                        setForm((p) => ({ ...p, data_source: 'CSV' }));
                        setAddStep(3);
                      }}
                      className="p-4 rounded-xl border border-border bg-surface-raised hover:border-brand cursor-pointer transition-all space-y-1 group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-bold text-sm text-foreground group-hover:text-brand">
                          <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
                          <span>CSV Statement / Tradebook Import</span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                          Available
                        </span>
                      </div>
                      <p className="text-xs text-muted leading-relaxed">
                        Upload standard exported CSV files from your broker (Zerodha, Groww, Angel One) directly into this container.
                      </p>
                    </div>

                    {/* Method 3: Official Broker API (Disabled / Transparent disclosure) */}
                    <div className="p-4 rounded-xl border border-border/60 bg-surface-raised/30 opacity-60 cursor-not-allowed space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-bold text-sm text-muted">
                          <Lock className="w-4 h-4 text-muted" />
                          <span>Official Broker API (Live Sync)</span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                          Planned Phase
                        </span>
                      </div>
                      <p className="text-xs text-muted leading-relaxed">
                        Direct automated OAuth connection. Not available yet. Finova will never ask for your broker password or PIN.
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-between">
                    <button
                      type="button"
                      onClick={() => setAddStep(1)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold border border-border text-muted hover:bg-surface-raised"
                    >
                      Back
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: Account Information */}
              {addStep === 3 && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    addMutation.mutate(form);
                  }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setAddStep(2)}
                      className="p-1 rounded-lg text-muted hover:text-foreground hover:bg-surface-raised"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">Step 3 — Container Details</h3>
                      <p className="text-xs text-muted">
                        Configuring {form.broker_name} ({form.data_source === 'CSV' ? 'CSV Import' : 'Manual Entry'})
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Account Nickname / Label *
                    </label>
                    <input
                      type="text"
                      required
                      value={form.account_label}
                      onChange={(e) => setForm((p) => ({ ...p, account_label: e.target.value }))}
                      placeholder={`e.g. My Primary ${form.broker_name}`}
                      className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-surface-raised border border-border text-foreground focus:outline-none focus:border-brand"
                    />
                    <p className="text-[11px] text-muted">
                      Display label to distinguish multiple accounts from the same broker.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Account Type
                    </label>
                    <select
                      value={form.account_type}
                      onChange={(e) => setForm((p) => ({ ...p, account_type: e.target.value as AccountType }))}
                      className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-surface-raised border border-border text-foreground focus:outline-none focus:border-brand"
                    >
                      {ACCOUNT_TYPE_CHOICES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label} ({t.desc})
                        </option>
                      ))}
                    </select>
                  </div>

                  {addMutation.isError && (
                    <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{addMutation.error instanceof Error ? addMutation.error.message : 'Failed to create broker account.'}</span>
                    </div>
                  )}

                  <div className="pt-2 flex justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setAddStep(2)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold border border-border text-muted hover:bg-surface-raised"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={addMutation.isPending}
                      className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white shadow-sm disabled:opacity-60"
                      style={{ background: 'linear-gradient(135deg, rgb(var(--brand-600)), rgb(var(--brand-400)))' }}
                    >
                      {addMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                      Create Container
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 4: Success & Next Actions */}
              {addStep === 4 && (
                <div className="text-center space-y-4 py-2">
                  <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground">
                      Account Registered Successfully!
                    </h3>
                    <p className="text-xs text-muted mt-1 max-w-sm mx-auto leading-relaxed">
                      <strong>{createdBrokerResult?.display_name || form.account_label}</strong> is ready. How would you like to populate your investment positions?
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <Link
                      href={`/holdings?broker=${encodeURIComponent(createdBrokerResult?.id || '')}`}
                      className="p-3.5 rounded-xl border border-border bg-surface-raised hover:border-brand text-left space-y-1 block transition-colors"
                      onClick={() => setShowAddModal(false)}
                    >
                      <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <PenTool className="w-3.5 h-3.5 text-brand" />
                        Add Holdings Manually
                      </p>
                      <p className="text-[11px] text-muted leading-relaxed">
                        Search Indian stocks, REITs, or bonds and enter quantities.
                      </p>
                    </Link>

                    <Link
                      href={`/holdings?import=csv&broker=${encodeURIComponent(createdBrokerResult?.id || '')}`}
                      className="p-3.5 rounded-xl border border-border bg-surface-raised hover:border-brand text-left space-y-1 block transition-colors"
                      onClick={() => setShowAddModal(false)}
                    >
                      <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-400" />
                        Import CSV Statement
                      </p>
                      <p className="text-[11px] text-muted leading-relaxed">
                        Upload standard exported tradebooks from your broker.
                      </p>
                    </Link>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="px-5 py-2 rounded-xl text-xs font-bold text-muted hover:text-foreground"
                    >
                      Done / Return to Accounts
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/* EDIT BROKER MODAL (Preserves account_type - Issue 4 Fix)     */}
      {/* ============================================================ */}
      <AnimatePresence>
        {editingBroker && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setEditingBroker(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="relative w-full max-w-md card p-6 shadow-2xl border border-border bg-surface z-10 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h2 className="text-base font-bold text-foreground">
                  Edit Account Container
                </h2>
                <button
                  onClick={() => setEditingBroker(null)}
                  className="p-1 rounded-lg text-muted hover:text-foreground hover:bg-surface-raised"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const target = e.currentTarget;
                  const newName = (target.elements.namedItem('display_name') as HTMLInputElement).value;
                  const newType = (target.elements.namedItem('account_type') as HTMLSelectElement).value;
                  editMutation.mutate({
                    id: editingBroker.id,
                    display_name: newName,
                    account_type: newType,
                  });
                }}
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Account Display Name *
                  </label>
                  <input
                    name="display_name"
                    type="text"
                    defaultValue={editingBroker.display_name || editingBroker.account_label || editingBroker.broker_name}
                    required
                    maxLength={100}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-surface-raised border border-border text-foreground focus:outline-none focus:border-brand"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Account Type (Optional Change)
                  </label>
                  <select
                    name="account_type"
                    defaultValue={editingBroker.account_type || 'demat'}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-surface-raised border border-border text-foreground focus:outline-none focus:border-brand"
                  >
                    {ACCOUNT_TYPE_CHOICES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-muted">
                    Renaming preserves existing account type unless explicitly changed.
                  </p>
                </div>

                {editMutation.isError && (
                  <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{editMutation.error instanceof Error ? editMutation.error.message : 'Failed to update account.'}</span>
                  </div>
                )}

                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingBroker(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold border border-border text-muted hover:bg-surface-raised"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editMutation.isPending}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white shadow-sm"
                    style={{ background: 'linear-gradient(135deg, rgb(var(--brand-600)), rgb(var(--brand-400)))' }}
                  >
                    {editMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/* SAFE BROKER DELETION MODAL (Issue 5 Fix & Section 8)        */}
      {/* ============================================================ */}
      <AnimatePresence>
        {deletingBroker && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => {
                setDeletingBroker(null);
                setDeleteError(null);
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="relative w-full max-w-md card p-6 shadow-2xl border border-border bg-surface z-10 space-y-4"
            >
              {(() => {
                const stats = brokerStats[deletingBroker.id] || { count: 0 };
                const hasActiveRecords = stats.count > 0;

                return (
                  <>
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl ${hasActiveRecords ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                        {hasActiveRecords ? <AlertTriangle className="w-6 h-6" /> : <Trash2 className="w-6 h-6" />}
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-foreground">
                          {hasActiveRecords ? 'Deletion Blocked: Active Holdings Exist' : 'Delete Empty Account Container'}
                        </h3>
                        <p className="text-xs text-muted">
                          {deletingBroker.display_name || deletingBroker.broker_name}
                        </p>
                      </div>
                    </div>

                    {/* Blocked Case */}
                    {hasActiveRecords ? (
                      <div className="space-y-3">
                        <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/5 text-amber-300 text-xs space-y-2 leading-relaxed">
                          <p className="font-bold flex items-center gap-1.5">
                            <AlertCircle className="w-4 h-4 text-amber-400" />
                            Financial Ledger Protection Active
                          </p>
                          <p>
                            This account currently holds <strong>{stats.count} active position(s)</strong>. To protect the integrity of your unified portfolio history, Finova does not allow deleting containers with active records.
                          </p>
                        </div>

                        <p className="text-xs text-muted leading-relaxed">
                          Please sell, reassign, or remove all holdings associated with this broker before attempting deletion.
                        </p>

                        <div className="pt-2 flex justify-end gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              setDeletingBroker(null);
                              setDeleteError(null);
                            }}
                            className="px-4 py-2 rounded-xl text-xs font-semibold border border-border text-muted hover:bg-surface-raised"
                          >
                            Close
                          </button>
                          <Link
                            href={`/holdings?broker=${encodeURIComponent(deletingBroker.id)}`}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm"
                            style={{ background: 'linear-gradient(135deg, rgb(var(--brand-600)), rgb(var(--brand-400)))' }}
                            onClick={() => setDeletingBroker(null)}
                          >
                            Manage Holdings
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    ) : (
                      /* Empty Container Deletion Permitted */
                      <div className="space-y-3">
                        <p className="text-xs text-muted leading-relaxed">
                          This account contains <strong>0 holdings and 0 transactions</strong>. Are you sure you want to permanently delete this empty container?
                        </p>

                        {deleteError && (
                          <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 text-xs flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <span>{deleteError}</span>
                          </div>
                        )}

                        <div className="pt-2 flex justify-end gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              setDeletingBroker(null);
                              setDeleteError(null);
                            }}
                            className="px-4 py-2 rounded-xl text-xs font-semibold border border-border text-muted hover:bg-surface-raised"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={deleteMutation.isPending}
                            onClick={() => deleteMutation.mutate(deletingBroker.id)}
                            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 shadow-sm disabled:opacity-60"
                          >
                            {deleteMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            Delete Empty Account
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
