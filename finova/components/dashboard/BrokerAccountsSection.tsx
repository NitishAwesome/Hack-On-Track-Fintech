'use client';

import React from 'react';
import Link from 'next/link';
import { Building2, Plus, AlertCircle, ShieldCheck } from 'lucide-react';
import type { BrokerAccountRow } from '@/types/database';

interface BrokerAccountsSectionProps {
  brokers: BrokerAccountRow[];
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

const BROKER_BRAND_COLORS: Record<string, string> = {
  ZERODHA: '#387ED1',
  GROWW: '#00D09C',
  ANGEL_ONE: '#EB1C24',
  ICICI_DIRECT: '#F37021',
  UPSTOX: '#5B2D90',
  OTHER: '#6B7280',
};

export function BrokerAccountsSection({
  brokers,
  isLoading,
  error,
  onRetry,
}: BrokerAccountsSectionProps) {
  if (isLoading) {
    return (
      <div
        className="p-6 sm:p-7 rounded-2xl border flex flex-col justify-between h-[340px] animate-pulse"
        style={{
          backgroundColor: 'rgb(var(--surface))',
          borderColor: 'rgb(var(--border))',
        }}
      >
        <div className="flex justify-between items-center mb-6">
          <div className="h-4 w-32 bg-slate-700/30 rounded" />
          <div className="h-4 w-20 bg-slate-700/20 rounded" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 bg-slate-800/10 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="p-6 sm:p-7 rounded-2xl border flex flex-col items-center justify-center text-center h-[340px]"
        style={{
          backgroundColor: 'rgb(var(--surface))',
          borderColor: 'rgb(var(--border))',
        }}
      >
        <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3 bg-red-500/10 text-red-500">
          <AlertCircle className="w-5 h-5" />
        </div>
        <h3 className="text-sm font-semibold mb-1" style={{ color: 'rgb(var(--foreground))' }}>
          Unable to Load Accounts
        </h3>
        <p className="text-xs text-muted max-w-sm mb-4">{error}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border hover:bg-surface-raised transition-colors"
            style={{ borderColor: 'rgb(var(--border))', color: 'rgb(var(--foreground))' }}
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className="p-6 sm:p-7 rounded-2xl border flex flex-col justify-between transition-all duration-200"
      style={{
        backgroundColor: 'rgb(var(--surface))',
        borderColor: 'rgb(var(--border))',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2
              className="text-base sm:text-lg font-bold tracking-tight"
              style={{ color: 'rgb(var(--foreground))' }}
            >
              Broker Accounts
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Tracked depository & demat sources
            </p>
          </div>
          <Link
            href="/brokers"
            className="text-xs font-semibold hover:underline"
            style={{ color: 'rgb(var(--brand-500))' }}
          >
            Manage Accounts ({brokers.length}) →
          </Link>
        </div>

        {/* Content */}
        {brokers.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 my-2">
            {brokers.map((account) => {
              const brandColor =
                BROKER_BRAND_COLORS[account.broker_code.toUpperCase()] ||
                account.color_hex ||
                '#3B82F6';

              return (
                <div
                  key={account.id}
                  className="p-3.5 rounded-xl border flex flex-col justify-between transition-all duration-150 hover:bg-surface-raised/40"
                  style={{
                    backgroundColor: 'rgb(var(--surface-raised) / 0.3)',
                    borderColor: 'rgb(var(--border))',
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: brandColor }}
                      />
                      <div className="truncate">
                        <div
                          className="text-xs font-bold truncate"
                          style={{ color: 'rgb(var(--foreground))' }}
                        >
                          {account.display_name}
                        </div>
                        <div className="text-[11px] text-muted capitalize">
                          {account.broker_code.toLowerCase().replace('_', ' ')} · {account.account_type}
                        </div>
                      </div>
                    </div>

                    {/* Honest connection status disclosure */}
                    <span
                      className="inline-flex items-center text-[9px] font-semibold px-1.5 py-0.5 rounded tracking-wide uppercase flex-shrink-0"
                      style={{
                        backgroundColor: 'rgba(107, 114, 128, 0.1)',
                        color: 'rgb(var(--muted))',
                        border: '1px solid rgb(var(--border))',
                      }}
                      title="Tracked via manual holdings or CSV imports. No active broker OAuth credentials required."
                    >
                      MANUAL
                    </span>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-border/40 flex items-center justify-between text-[10px] text-muted">
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-500" />
                      <span>Self-managed ledger</span>
                    </span>
                    <span>{account.currency || 'INR'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div
            className="flex flex-col items-center justify-center text-center p-8 rounded-xl border border-dashed my-2"
            style={{
              borderColor: 'rgb(var(--border))',
              backgroundColor: 'rgba(var(--surface-raised) / 0.4)',
            }}
          >
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center mb-3 shadow-sm"
              style={{
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                color: '#8B5CF6',
              }}
            >
              <Building2 className="w-5 h-5" />
            </div>
            <h3
              className="text-sm font-bold mb-1"
              style={{ color: 'rgb(var(--foreground))' }}
            >
              No Broker Accounts Linked
            </h3>
            <p className="text-xs text-muted max-w-sm mb-4 leading-relaxed">
              Add your Zerodha, Groww, Angel One or manual depository account to organize positions by broker.
            </p>
            <Link
              href="/brokers"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white shadow-sm"
              style={{
                background: 'linear-gradient(135deg, rgb(var(--brand-600)), rgb(var(--brand-400)))',
              }}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Broker Account</span>
            </Link>
          </div>
        )}
      </div>

      <div
        className="pt-3 border-t flex items-center justify-between text-xs mt-3"
        style={{ borderColor: 'rgb(var(--border) / 0.6)' }}
      >
        <span className="text-[11px] text-muted">
          All accounts operate in self-directed manual tracking mode
        </span>
        <Link
          href="/brokers"
          className="font-medium hover:underline text-xs"
          style={{ color: 'rgb(var(--brand-500))' }}
        >
          Manage Broker Accounts →
        </Link>
      </div>
    </div>
  );
}
