'use client';

// ============================================================
// FINOVA — Dashboard Working Quick Actions (Section 7.F)
// components/dashboard/QuickActionsBar.tsx
//
// 100% functional quick access shortcuts to all primary tools:
// - Add Holding (/holdings)
// - Add Transaction (/transactions)
// - Add Broker Container (/brokers)
// - Import Tradebook CSV (/holdings)
// - Run Investment X-Ray (/analysis)
// - Future Lab Strategy Simulator (/future-lab)
// - Explore Market Universe (/explore)
// ============================================================

import React from 'react';
import Link from 'next/link';
import {
  Plus,
  Upload,
  Building2,
  Receipt,
  BarChart3,
  FlaskConical,
  Compass,
} from 'lucide-react';

export function QuickActionsBar() {
  const ACTIONS = [
    {
      label: 'Add Investment',
      href: '/holdings',
      icon: Plus,
      color: 'text-brand',
      bg: 'bg-brand/10',
      border: 'border-brand/20',
      desc: 'Add stock, bond, or REIT',
    },
    {
      label: 'Record Activity',
      href: '/transactions',
      icon: Receipt,
      color: 'text-emerald-700 dark:text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      desc: 'BUY, SELL, dividend ledger',
    },
    {
      label: 'Add Broker',
      href: '/brokers',
      icon: Building2,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      desc: 'Zerodha, Groww, Angel One',
    },
    {
      label: 'Import CSV',
      href: '/holdings',
      icon: Upload,
      color: 'text-purple-700 dark:text-purple-400',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
      desc: 'Bulk tradebook ingestion',
    },
    {
      label: 'Run X-Ray',
      href: '/analysis',
      icon: BarChart3,
      color: 'text-cyan-700 dark:text-cyan-400',
      bg: 'bg-cyan-500/10',
      border: 'border-cyan-500/20',
      desc: 'Concentration & overlap',
    },
    {
      label: 'Future Lab',
      href: '/future-lab',
      icon: FlaskConical,
      color: 'text-fuchsia-400',
      bg: 'bg-fuchsia-500/10',
      border: 'border-fuchsia-500/20',
      desc: 'Rebalance simulation',
    },
    {
      label: 'Explore Market',
      href: '/explore',
      icon: Compass,
      color: 'text-amber-700 dark:text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      desc: 'Indices, stocks & alts',
    },
  ];

  return (
    <div
      className="p-4 sm:p-5 rounded-2xl border transition-all duration-200"
      style={{
        backgroundColor: 'rgb(var(--surface))',
        borderColor: 'rgb(var(--border))',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
          Quick Actions &amp; Workflows
        </h3>
        <span className="text-[11px] text-muted">Direct Shortcuts</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
        {ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.label}
              href={action.href}
              className="p-3 rounded-xl border border-border bg-surface-raised hover:bg-surface hover:border-brand/40 transition-all flex flex-col justify-between space-y-2 group"
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center border ${action.bg} ${action.color} ${action.border}`}
              >
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground group-hover:text-brand transition-colors truncate">
                  {action.label}
                </p>
                <p className="text-[10px] text-muted truncate mt-0.5">
                  {action.desc}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
