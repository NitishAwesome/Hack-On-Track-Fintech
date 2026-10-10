'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  Plus, Building2, X, Loader2, Trash2, Edit2,
  ShieldCheck, AlertCircle, ArrowUpRight, Wallet
} from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatCurrency } from '@/lib/utils';
import type { BrokerAccount, AccountType, HoldingWithMetrics } from '@/types/portfolio';

const SUPPORTED_BROKERS = [
  'Groww',
  'Zerodha',
  'Angel One',
  'ICICI Direct',
  'Upstox',
  'Manual portfolio',
  'HDFC Securities',
  'Kotak Securities',
  'CDSL',
  'NSDL',
  'Other',
];

const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: 'demat', label: 'Demat Account' },
  { value: 'trading', label: 'Trading Account' },
  { value: 'mf', label: 'Mutual Fund Direct' },
  { value: 'manual', label: 'Manual Portfolio' },
  { value: 'other', label: 'Other Depository' },
];

async function fetchBrokers() {
  const res = await fetch('/api/brokers');
  if (!res.ok) throw new Error('Failed to load brokers');
  return res.json();
}

async function fetchHoldings() {
  const res = await fetch('/api/portfolio/holdings');
  if (!res.ok) throw new Error('Failed to load holdings');
  return res.json();
}

async function addBroker(data: Record<string, unknown>) {
  const res = await fetch('/api/brokers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to add broker');
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
    const err = await res.json();
    throw new Error(err.error || 'Failed to update broker');
  }
  return res.json();
}

async function deleteBroker(id: string) {
  const res = await fetch(`/api/brokers?id=${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to delete broker');
  }
  return res.json();
}

export default function BrokersPage() {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBroker, setEditingBroker] = useState<BrokerAccount | null>(null);
  const [deletingBroker, setDeletingBroker] = useState<BrokerAccount | null>(null);

  const [form, setForm] = useState({
    broker_name: 'Groww',
    account_label: '',
    account_type: 'demat' as AccountType,
  });

  const { data: brokerData, isLoading: loadingBrokers } = useQuery({
    queryKey: ['brokers'],
    queryFn: fetchBrokers,
  });

  const { data: holdingData } = useQuery({
    queryKey: ['holdings'],
    queryFn: fetchHoldings,
  });

  const brokers: BrokerAccount[] = brokerData?.brokers ?? [];
  const holdings: HoldingWithMetrics[] = holdingData?.holdings ?? [];

  // Group holdings metrics per broker
  const brokerStats = brokers.reduce((acc, b) => {
    const bHoldings = holdings.filter((h) => h.broker_account_id === b.id);
    const totalInvested = bHoldings.reduce((sum, h) => sum + h.invested_value, 0);
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

  const addMutation = useMutation({
    mutationFn: addBroker,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brokers'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-summary'] });
      setShowAddModal(false);
      setForm({ broker_name: 'Groww', account_label: '', account_type: 'demat' });
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
    },
  });

  return (
    <div className="page-container space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'rgb(var(--foreground))' }}>
            My Broker Accounts
          </h1>
          <p className="text-sm mt-1" style={{ color: 'rgb(var(--muted))' }}>
            Manage and organize your multi-broker accounts and depositories
          </p>
        </div>
        <button
          id="btn-add-broker"
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white shadow-sm hover:opacity-95 transition-opacity"
          style={{ background: 'linear-gradient(135deg, rgb(var(--brand-600)), rgb(var(--brand-400)))' }}
        >
          <Plus className="w-4 h-4" />
          Add Broker Account
        </button>
      </div>

      {/* Security & Scope Banner */}
      <div
        className="rounded-xl p-4 text-xs sm:text-sm flex items-start gap-3 border"
        style={{
          backgroundColor: 'rgba(59, 130, 246, 0.05)',
          borderColor: 'rgba(59, 130, 246, 0.2)',
        }}
      >
        <ShieldCheck className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-blue-400">
            Self-Managed & Privacy-Centric Architecture
          </p>
          <p className="text-slate-400 leading-relaxed">
            Finova never accesses or stores your broker passwords, MPINs, TPINs, or OTPs. All accounts here are user-managed containers to unify and organize your manual entries and CSV imports across brokers.
          </p>
        </div>
      </div>

      {/* Accounts List */}
      {loadingBrokers ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-6 space-y-4 animate-pulse">
              <div className="h-6 w-32 bg-slate-800 rounded" />
              <div className="h-4 w-48 bg-slate-850 rounded" />
              <div className="h-8 w-full bg-slate-800 rounded" />
            </div>
          ))}
        </div>
      ) : brokers.length === 0 ? (
        <EmptyState
          icon={<Building2 className="w-10 h-10" style={{ color: 'rgb(var(--brand-500))' }} />}
          title="No broker accounts created yet"
          description="Add your first brokerage or depository account (e.g. Groww, Zerodha, Angel One) to start organizing your investment holdings."
          action={
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white shadow-md"
              style={{ background: 'linear-gradient(135deg, rgb(var(--brand-600)), rgb(var(--brand-400)))' }}
            >
              <Plus className="w-4 h-4" />
              Add First Account
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {brokers.map((broker, i) => {
            const stats = brokerStats[broker.id] || { count: 0, invested: 0, currentValue: 0 };
            const brokerName = broker.broker_name || broker.broker_code || 'Broker';
            const displayName = broker.display_name || broker.account_label || `${brokerName} Account`;

            return (
              <motion.div
                key={broker.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="card p-5 flex flex-col justify-between hover:border-slate-700 transition-colors group"
              >
                <div>
                  {/* Top Bar */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm flex-shrink-0"
                        style={{ backgroundColor: broker.color_hex || '#3B82F6' }}
                      >
                        {brokerName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h2 className="font-semibold text-base" style={{ color: 'rgb(var(--foreground))' }}>
                          {displayName}
                        </h2>
                        <p className="text-xs" style={{ color: 'rgb(var(--muted))' }}>
                          {brokerName} • {broker.account_type || 'Demat'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        title="Edit Account Name"
                        onClick={() => setEditingBroker(broker)}
                        className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        title="Delete Account"
                        onClick={() => setDeletingBroker(broker)}
                        className="p-1.5 rounded-md hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Status Badges */}
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span className="text-[11px] px-2 py-0.5 rounded-full font-medium border bg-slate-800/80 border-slate-700 text-slate-300">
                      Data Source: MANUAL
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full font-medium border bg-amber-500/10 border-amber-500/30 text-amber-400">
                      Status: Manual (Not Connected)
                    </span>
                  </div>

                  {/* Metrics Box */}
                  <div className="mt-4 p-3 rounded-lg bg-slate-900/60 border border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400">Holdings</span>
                      <p className="font-semibold text-sm text-slate-200 mt-0.5">
                        {stats.count} {stats.count === 1 ? 'position' : 'positions'}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400">
                        {stats.isFullyValued ? 'Portfolio Value' : 'Valued Subtotal'}
                      </span>
                      <p className="font-semibold text-sm text-slate-200 mt-0.5">
                        {stats.count === 0
                          ? formatCurrency(0, true)
                          : stats.isFullyValued
                          ? formatCurrency(stats.currentValue, true)
                          : stats.currentValue > 0
                          ? `${formatCurrency(stats.currentValue, true)}*`
                          : 'Price unavail.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer link to view holdings */}
                <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="text-slate-500">
                    Created {new Date(broker.created_at).toLocaleDateString()}
                  </span>
                  <Link
                    href={`/holdings?broker=${encodeURIComponent(broker.id)}`}
                    className="inline-flex items-center gap-1 font-medium text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    View Holdings
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Add Broker Modal */}
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
              className="relative w-full max-w-md card p-6 shadow-2xl border border-slate-700 bg-slate-900 z-10 space-y-5"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-blue-400" />
                  Add Broker Account
                </h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  addMutation.mutate(form);
                }}
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Broker / Depository Name *
                  </label>
                  <select
                    value={form.broker_name}
                    onChange={(e) => setForm((p) => ({ ...p, broker_name: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg text-sm bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    {SUPPORTED_BROKERS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Account Nickname / Display Name
                  </label>
                  <input
                    type="text"
                    value={form.account_label}
                    onChange={(e) => setForm((p) => ({ ...p, account_label: e.target.value }))}
                    placeholder={`e.g. My Primary ${form.broker_name}`}
                    className="w-full px-3 py-2.5 rounded-lg text-sm bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                  <p className="text-[11px] text-slate-400">
                    User-visible label to distinguish multiple accounts from the same broker.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Account Type
                  </label>
                  <select
                    value={form.account_type}
                    onChange={(e) => setForm((p) => ({ ...p, account_type: e.target.value as AccountType }))}
                    className="w-full px-3 py-2.5 rounded-lg text-sm bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    {ACCOUNT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 rounded-lg text-sm font-medium border border-slate-700 text-slate-300 hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addMutation.isPending}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium text-white shadow-sm"
                    style={{ background: 'linear-gradient(135deg, rgb(var(--brand-600)), rgb(var(--brand-400)))' }}
                  >
                    {addMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                    Save Account
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Broker Modal */}
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
              className="relative w-full max-w-md card p-6 shadow-2xl border border-slate-700 bg-slate-900 z-10 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h2 className="text-lg font-bold text-slate-100">
                  Rename Account
                </h2>
                <button
                  onClick={() => setEditingBroker(null)}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const target = e.currentTarget;
                  const newName = (target.elements.namedItem('display_name') as HTMLInputElement).value;
                  editMutation.mutate({
                    id: editingBroker.id,
                    display_name: newName,
                  });
                }}
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Account Display Name *
                  </label>
                  <input
                    name="display_name"
                    type="text"
                    defaultValue={editingBroker.display_name || editingBroker.account_label || editingBroker.broker_name}
                    required
                    className="w-full px-3 py-2.5 rounded-lg text-sm bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingBroker(null)}
                    className="px-4 py-2 rounded-lg text-sm font-medium border border-slate-700 text-slate-300 hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editMutation.isPending}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium text-white shadow-sm bg-blue-600 hover:bg-blue-500"
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

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingBroker && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setDeletingBroker(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="relative w-full max-w-md card p-6 shadow-2xl border border-red-500/30 bg-slate-900 z-10 space-y-4"
            >
              <div className="flex items-center gap-3 text-red-400">
                <AlertCircle className="w-6 h-6 flex-shrink-0" />
                <h3 className="text-lg font-bold">Delete Broker Account?</h3>
              </div>

              <p className="text-sm text-slate-300 leading-relaxed">
                Are you sure you want to delete{' '}
                <strong className="text-white">
                  {deletingBroker.display_name || deletingBroker.broker_name}
                </strong>
                ? All associated investment positions under this account will also be permanently removed.
              </p>

              <div className="pt-3 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDeletingBroker(null)}
                  className="px-4 py-2 rounded-lg text-sm font-medium border border-slate-700 text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate(deletingBroker.id)}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-500 shadow-sm"
                >
                  {deleteMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Delete Permanently
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
