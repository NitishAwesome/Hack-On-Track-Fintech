'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Building2, X, Loader2, Trash2 } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import type { BrokerAccount, AccountType } from '@/types/portfolio';

const POPULAR_BROKERS = [
  'Zerodha', 'Groww', 'Angel One', 'Upstox', 'ICICI Direct',
  'HDFC Securities', 'Kotak Securities', 'Paytm Money', 'CDSL', 'NSDL',
];

const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: 'demat', label: 'Demat' },
  { value: 'trading', label: 'Trading' },
  { value: 'mf', label: 'Mutual Fund' },
  { value: 'other', label: 'Other' },
];

async function fetchBrokers() {
  const res = await fetch('/api/brokers');
  if (!res.ok) throw new Error();
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

async function deleteBroker(id: string) {
  const res = await fetch(`/api/brokers?id=${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete broker');
  return res.json();
}

export default function BrokersPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ broker_name: '', account_label: '', account_type: 'demat' as AccountType });

  const { data, isLoading } = useQuery({ queryKey: ['brokers'], queryFn: fetchBrokers });
  const brokers: BrokerAccount[] = data?.brokers ?? [];

  const mutation = useMutation({
    mutationFn: addBroker,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brokers'] });
      setShowModal(false);
      setForm({ broker_name: '', account_label: '', account_type: 'demat' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBroker,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brokers'] });
    },
  });

  return (
    <div className="page-container space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'rgb(var(--foreground))' }}>
            Brokers & Accounts
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'rgb(var(--muted))' }}>
            Manage your connected broker and depository accounts
          </p>
        </div>
        <button
          id="btn-add-broker"
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ background: 'linear-gradient(135deg, rgb(var(--brand-600)), rgb(var(--brand-400)))' }}
        >
          <Plus className="w-4 h-4" />
          Add Broker
        </button>
      </div>

      {/* Disclaimer */}
      <div
        className="card p-4 text-sm"
        style={{ backgroundColor: 'rgb(var(--info-bg))', borderColor: 'rgb(var(--info))' }}
      >
        <p style={{ color: 'rgb(var(--info))' }}>
          <strong>Privacy first:</strong> Finova never stores your broker login credentials, MPIN, TPIN, or OTP.
          Broker accounts here are labels for organising your manually-entered holdings.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-5 space-y-3">
              <div className="skeleton h-5 w-32" />
              <div className="skeleton h-4 w-24" />
            </div>
          ))}
        </div>
      ) : brokers.length === 0 ? (
        <EmptyState
          icon={<Building2 className="w-8 h-8" style={{ color: 'rgb(var(--brand-500))' }} />}
          title="No brokers added yet"
          description="Add your broker or depository accounts to organise holdings by source."
          action={
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white"
              style={{ background: 'linear-gradient(135deg, rgb(var(--brand-600)), rgb(var(--brand-400)))' }}
            >
              <Plus className="w-4 h-4" />
              Add broker
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {brokers.map((broker, i) => (
            <motion.div
              key={broker.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="card p-5"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                    style={{ backgroundColor: broker.color_hex }}
                  >
                    {broker.broker_name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-sm" style={{ color: 'rgb(var(--foreground))' }}>
                      {broker.broker_name}
                    </p>
                    {broker.account_label && (
                      <p className="text-xs" style={{ color: 'rgb(var(--muted))' }}>
                        {broker.account_label}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  title="Remove Broker"
                  onClick={() => {
                    if (confirm(`Remove ${broker.broker_name} account?`)) {
                      deleteMutation.mutate(broker.id);
                    }
                  }}
                  className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
                  style={{ color: 'rgb(var(--loss))' }}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium capitalize"
                  style={{
                    backgroundColor: `${broker.color_hex}22`,
                    color: broker.color_hex,
                  }}
                >
                  {broker.account_type}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add Broker Modal */}
      <AnimatePresence>
        {showModal && (
          <>
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50"
              onClick={() => setShowModal(false)}
            />
            <motion.div
              key="modal"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 card p-6 mx-auto max-w-md"
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold" style={{ color: 'rgb(var(--foreground))' }}>
                  Add Broker / Account
                </h2>
                <button onClick={() => setShowModal(false)} style={{ color: 'rgb(var(--muted))' }}>
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form
                onSubmit={(e) => { e.preventDefault(); mutation.mutate(form); }}
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <label className="text-xs font-medium" style={{ color: 'rgb(var(--foreground))' }}>
                    Broker / Depository Name *
                  </label>
                  <input
                    list="brokers-list"
                    type="text"
                    value={form.broker_name}
                    onChange={(e) => setForm((p) => ({ ...p, broker_name: e.target.value }))}
                    placeholder="Zerodha"
                    required
                    className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
                    style={{
                      backgroundColor: 'rgb(var(--surface-raised))',
                      border: '1px solid rgb(var(--border))',
                      color: 'rgb(var(--foreground))',
                    }}
                  />
                  <datalist id="brokers-list">
                    {POPULAR_BROKERS.map((b) => <option key={b} value={b} />)}
                  </datalist>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium" style={{ color: 'rgb(var(--foreground))' }}>
                    Account Label (optional)
                  </label>
                  <input
                    type="text"
                    value={form.account_label}
                    onChange={(e) => setForm((p) => ({ ...p, account_label: e.target.value }))}
                    placeholder="My primary demat"
                    className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
                    style={{
                      backgroundColor: 'rgb(var(--surface-raised))',
                      border: '1px solid rgb(var(--border))',
                      color: 'rgb(var(--foreground))',
                    }}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium" style={{ color: 'rgb(var(--foreground))' }}>
                    Account Type
                  </label>
                  <select
                    value={form.account_type}
                    onChange={(e) => setForm((p) => ({ ...p, account_type: e.target.value as AccountType }))}
                    className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
                    style={{
                      backgroundColor: 'rgb(var(--surface-raised))',
                      border: '1px solid rgb(var(--border))',
                      color: 'rgb(var(--foreground))',
                    }}
                  >
                    {ACCOUNT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                {mutation.error && (
                  <p className="text-sm" style={{ color: 'rgb(var(--loss))' }}>
                    {(mutation.error as Error).message}
                  </p>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-2.5 rounded-lg text-sm font-medium"
                    style={{
                      backgroundColor: 'rgb(var(--surface-raised))',
                      border: '1px solid rgb(var(--border))',
                      color: 'rgb(var(--foreground))',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    id="btn-submit-broker"
                    type="submit"
                    disabled={mutation.isPending}
                    className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-60 flex items-center justify-center gap-2"
                    style={{ background: 'linear-gradient(135deg, rgb(var(--brand-600)), rgb(var(--brand-400)))' }}
                  >
                    {mutation.isPending ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Adding…</>
                    ) : 'Add Broker'}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
