'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import Papa from 'papaparse';
import {
  Plus,
  Upload,
  Download,
  Search,
  Filter,
  RefreshCw,
  ArrowUpRight,
  ArrowDownLeft,
  Coins,
  Percent,
  Layers,
  Receipt,
  FileText,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Edit2,
  Eye,
  X,
  Loader2,
  Calendar,
  Building2,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Info,
  Scale,
} from 'lucide-react';

import { formatCurrency, formatPercent, formatDate, cn, ASSET_CLASS_LABELS } from '@/lib/utils';
import { EmptyState } from '@/components/shared/EmptyState';
import { SkeletonTable } from '@/components/shared/Skeletons';
import { PercentageBadge } from '@/components/shared/PercentageBadge';
import { StockSearchDropdown } from '@/components/market/StockSearchDropdown';
import { parseAndNormalizeCsvDate } from '@/lib/utils/csvDateParser';
import { GLOBAL_SEED_INSTRUMENTS } from '@/lib/storage/portfolioStorage';
import type { BrokerAccountRow, InvestmentInstrumentRow, TransactionType } from '@/types/database';
import type {
  TransactionWithPnL,
  PositionReconciliationResult,
  RawTradebookRow,
} from '@/types/financial';

const TRANSACTION_TYPES: { id: TransactionType | 'ALL'; label: string }[] = [
  { id: 'ALL', label: 'All Activities' },
  { id: 'BUY', label: 'Buys' },
  { id: 'SELL', label: 'Sells' },
  { id: 'DIVIDEND', label: 'Dividends' },
  { id: 'INTEREST', label: 'Interest / Coupon' },
  { id: 'BONUS', label: 'Bonus Shares' },
  { id: 'SPLIT', label: 'Stock Splits' },
  { id: 'FEE', label: 'Fees & Charges' },
];

export default function TransactionsPage() {
  const queryClient = useQueryClient();

  // State
  const [selectedType, setSelectedType] = useState<TransactionType | 'ALL'>('ALL');
  const [selectedBroker, setSelectedBroker] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'ALL' | '30D' | '90D' | 'YTD'>('ALL');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isReconcileModalOpen, setIsReconcileModalOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState<TransactionWithPnL | null>(null);

  // Delete state
  const [txToDelete, setTxToDelete] = useState<TransactionWithPnL | null>(null);

  // ─── Fetch Queries ──────────────────────────────────────────

  const { data: txData, isLoading: txLoading, error: txError, refetch } = useQuery({
    queryKey: ['transactions', selectedType, selectedBroker, dateFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedType !== 'ALL') params.set('type', selectedType);
      if (selectedBroker !== 'ALL') params.set('brokerAccountId', selectedBroker);

      if (dateFilter === '30D') {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        params.set('startDate', d.toISOString());
      } else if (dateFilter === '90D') {
        const d = new Date();
        d.setDate(d.getDate() - 90);
        params.set('startDate', d.toISOString());
      } else if (dateFilter === 'YTD') {
        const d = new Date(new Date().getFullYear(), 0, 1);
        params.set('startDate', d.toISOString());
      }

      params.set('limit', '200');

      const res = await fetch(`/api/portfolio/transactions?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load transaction activity');
      return res.json();
    },
  });

  const { data: brokersData } = useQuery({
    queryKey: ['brokers'],
    queryFn: async () => {
      const res = await fetch('/api/brokers');
      if (!res.ok) throw new Error('Failed to load broker accounts');
      return res.json();
    },
  });

  const { data: holdingsData } = useQuery({
    queryKey: ['holdings'],
    queryFn: async () => {
      const res = await fetch('/api/portfolio/holdings');
      if (!res.ok) throw new Error('Failed to load holdings');
      return res.json();
    },
  });

  const { data: reconcileData } = useQuery({
    queryKey: ['reconciliations'],
    queryFn: async () => {
      const res = await fetch('/api/portfolio/reconcile');
      if (!res.ok) return { reconciliations: [] };
      return res.json();
    },
  });

  const transactions: TransactionWithPnL[] = txData?.transactions || [];
  const metrics = txData?.metrics || {
    totalRealizedPnL: 0,
    totalRealizedPnLGross: 0,
    totalDividendIncome: 0,
    totalInterestIncome: 0,
    totalIncome: 0,
    totalTradeFees: 0,
    totalStandaloneFees: 0,
    totalFees: 0,
  };
  const brokers: BrokerAccountRow[] = brokersData?.brokers || [];
  const reconciliations: PositionReconciliationResult[] = reconcileData?.reconciliations || [];

  // Filtered transactions for client search query
  const filteredTransactions = useMemo(() => {
    if (!searchQuery.trim()) return transactions;
    const q = searchQuery.toLowerCase().trim();
    return transactions.filter((t) => {
      const sym = t.instrument?.symbol?.toLowerCase() || '';
      const name = t.instrument?.instrument_name?.toLowerCase() || '';
      const ref = t.external_reference?.toLowerCase() || '';
      const notes = t.notes?.toLowerCase() || '';
      return sym.includes(q) || name.includes(q) || ref.includes(q) || notes.includes(q);
    });
  }, [transactions, searchQuery]);

  // Mutations
  const createTxMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch('/api/portfolio/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to record transaction');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['holdings'] });
      queryClient.invalidateQueries({ queryKey: ['reconciliations'] });
      setIsAddModalOpen(false);
    },
  });

  const updateTxMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch('/api/portfolio/transactions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update transaction');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['holdings'] });
      queryClient.invalidateQueries({ queryKey: ['reconciliations'] });
      setIsEditModalOpen(false);
      setSelectedTx(null);
    },
  });

  const deleteTxMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/portfolio/transactions?id=${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete transaction');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['holdings'] });
      queryClient.invalidateQueries({ queryKey: ['reconciliations'] });
      setTxToDelete(null);
    },
  });

  // Export CSV handler
  const handleExportCSV = () => {
    if (!filteredTransactions.length) return;
    const exportData = filteredTransactions.map((t) => ({
      'Date': formatDate(t.transaction_date),
      'Type': t.transaction_type,
      'Symbol': t.instrument?.symbol || '',
      'Name': t.instrument?.instrument_name || '',
      'Broker': t.broker_account?.display_name || t.broker_account?.broker_name || '',
      'Quantity': t.quantity,
      'Unit Price': t.unit_price,
      'Gross Amount': t.gross_amount,
      'Fees': t.fees,
      'Taxes': t.taxes,
      'Net Amount': t.net_amount,
      'Realized P&L': t.realized_pnl_record ? t.realized_pnl_record.realized_pnl : '',
      'Reference': t.external_reference || '',
      'Notes': t.notes || '',
    }));

    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `finova_transactions_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* ─── Page Header ──────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <div className="flex items-center gap-2">
            <h1
              className="text-xl sm:text-2xl font-bold tracking-tight"
              style={{ color: 'rgb(var(--foreground))' }}
            >
              Investment Transaction Ledger
            </h1>
            <span
              className="px-2 py-0.5 text-[10px] font-semibold rounded-full uppercase tracking-wider border"
              style={{
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderColor: 'rgba(59, 130, 246, 0.25)',
                color: '#3B82F6',
              }}
            >
              Audit Trail
            </span>
          </div>
          <p className="text-xs sm:text-sm mt-0.5 text-muted">
            Trade execution journal, corporate actions, and realized profit &amp; loss engine
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsReconcileModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-150 hover:bg-surface-raised"
            style={{
              backgroundColor: 'rgb(var(--surface))',
              borderColor: 'rgb(var(--border))',
              color: 'rgb(var(--foreground))',
            }}
            title="Inspect Holdings Balance Sheet vs Ledger reconciliation"
          >
            <Scale className="w-3.5 h-3.5 text-brand" />
            <span>Reconciliation</span>
          </button>

          <button
            onClick={handleExportCSV}
            disabled={!filteredTransactions.length}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-150 hover:bg-surface-raised disabled:opacity-50"
            style={{
              backgroundColor: 'rgb(var(--surface))',
              borderColor: 'rgb(var(--border))',
              color: 'rgb(var(--muted))',
            }}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-150 hover:bg-surface-raised"
            style={{
              backgroundColor: 'rgb(var(--surface))',
              borderColor: 'rgb(var(--border))',
              color: 'rgb(var(--foreground))',
            }}
          >
            <Upload className="w-3.5 h-3.5 text-brand" />
            <span>Import Tradebook</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white transition-all duration-150 shadow-sm hover:opacity-90 active:scale-95"
            style={{ backgroundColor: 'rgb(var(--brand-500))' }}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record Trade</span>
          </button>
        </div>
      </div>

      {/* ─── Metric Summary Cards ─────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4">
        {/* 1. Realized P&L */}
        <div
          className="p-4 sm:p-5 rounded-2xl border flex flex-col justify-between"
          style={{
            backgroundColor: 'rgb(var(--surface))',
            borderColor: 'rgb(var(--border))',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
                Realized P&amp;L
              </span>
              {metrics.totalRealizedPnL >= 0 ? (
                <ArrowUpRight className="w-3.5 h-3.5 text-gain" />
              ) : (
                <ArrowDownLeft className="w-3.5 h-3.5 text-loss" />
              )}
            </div>
            <div
              className="text-lg sm:text-xl font-bold tracking-tight"
              style={{
                color: metrics.totalRealizedPnL >= 0 ? 'rgb(var(--gain))' : 'rgb(var(--loss))',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {metrics.totalRealizedPnL >= 0 ? '+' : ''}
              {formatCurrency(metrics.totalRealizedPnL)}
            </div>
          </div>
          <div className="mt-2.5 text-[11px] text-muted flex items-center justify-between">
            <span>Net of trade fees</span>
            <span className="text-[10px] opacity-75">
              Gross: {formatCurrency(metrics.totalRealizedPnLGross)}
            </span>
          </div>
        </div>

        {/* 2. Dividend & Interest Income */}
        <div
          className="p-4 sm:p-5 rounded-2xl border flex flex-col justify-between"
          style={{
            backgroundColor: 'rgb(var(--surface))',
            borderColor: 'rgb(var(--border))',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
                Cash Income
              </span>
              <Coins className="w-3.5 h-3.5 text-teal-500 opacity-80" />
            </div>
            <div
              className="text-lg sm:text-xl font-bold tracking-tight text-teal-400"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              +{formatCurrency(metrics.totalIncome)}
            </div>
          </div>
          <div className="mt-2.5 text-[11px] text-muted flex items-center justify-between">
            <span>Dividends: {formatCurrency(metrics.totalDividendIncome)}</span>
            <span>Coupon: {formatCurrency(metrics.totalInterestIncome)}</span>
          </div>
        </div>

        {/* 3. Total Fees & Taxes */}
        <div
          className="p-4 sm:p-5 rounded-2xl border flex flex-col justify-between"
          style={{
            backgroundColor: 'rgb(var(--surface))',
            borderColor: 'rgb(var(--border))',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
                Fees &amp; Taxes
              </span>
              <Receipt className="w-3.5 h-3.5 text-muted opacity-80" />
            </div>
            <div
              className="text-lg sm:text-xl font-bold tracking-tight"
              style={{ color: 'rgb(var(--foreground))', fontVariantNumeric: 'tabular-nums' }}
            >
              {formatCurrency(metrics.totalFees)}
            </div>
          </div>
          <div className="mt-2.5 text-[11px] text-muted flex items-center justify-between">
            <span>Trade charges: {formatCurrency(metrics.totalTradeFees)}</span>
            <span>AMC: {formatCurrency(metrics.totalStandaloneFees)}</span>
          </div>
        </div>

        {/* 4. Ledger Activity */}
        <div
          className="p-4 sm:p-5 rounded-2xl border flex flex-col justify-between"
          style={{
            backgroundColor: 'rgb(var(--surface))',
            borderColor: 'rgb(var(--border))',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
                Ledger Entries
              </span>
              <FileText className="w-3.5 h-3.5 text-brand opacity-80" />
            </div>
            <div
              className="text-lg sm:text-xl font-bold tracking-tight"
              style={{ color: 'rgb(var(--foreground))', fontVariantNumeric: 'tabular-nums' }}
            >
              {transactions.length}
            </div>
          </div>
          <div className="mt-2.5 text-[11px] text-muted">
            <span>
              {transactions.filter((t) => t.transaction_type === 'BUY').length} Buys ·{' '}
              {transactions.filter((t) => t.transaction_type === 'SELL').length} Sells ·{' '}
              {transactions.filter((t) => ['DIVIDEND', 'INTEREST', 'COUPON'].includes(t.transaction_type)).length} Income
            </span>
          </div>
        </div>
      </div>

      {/* ─── Filters & Search Toolbar ─────────────────────────── */}
      <div
        className="p-4 rounded-2xl border space-y-3.5"
        style={{
          backgroundColor: 'rgb(var(--surface))',
          borderColor: 'rgb(var(--border))',
        }}
      >
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search symbol, company name, reference ID, or notes..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border bg-surface-raised focus:outline-none focus:ring-1 focus:ring-brand-500"
              style={{
                borderColor: 'rgb(var(--border))',
                color: 'rgb(var(--foreground))',
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Broker Account Dropdown */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedBroker}
              onChange={(e) => setSelectedBroker(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-lg border bg-surface-raised focus:outline-none"
              style={{ borderColor: 'rgb(var(--border))', color: 'rgb(var(--foreground))' }}
            >
              <option value="ALL">All Brokers</option>
              {brokers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.display_name || b.broker_code}
                </option>
              ))}
            </select>

            {/* Date Range Selector */}
            <div className="inline-flex rounded-lg border p-0.5 bg-surface-raised" style={{ borderColor: 'rgb(var(--border))' }}>
              {(['ALL', '30D', '90D', 'YTD'] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => setDateFilter(period)}
                  className={cn(
                    'px-2.5 py-1 text-[11px] font-medium rounded-md transition-all',
                    dateFilter === period
                      ? 'bg-brand text-white shadow-xs'
                      : 'text-muted hover:text-foreground'
                  )}
                >
                  {period === 'ALL' ? 'All Time' : period}
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                setSelectedType('ALL');
                setSelectedBroker('ALL');
                setDateFilter('ALL');
                setSearchQuery('');
              }}
              className="px-2.5 py-1.5 text-xs text-muted hover:text-foreground hover:underline"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Transaction Type Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {TRANSACTION_TYPES.map((type) => (
            <button
              key={type.id}
              onClick={() => setSelectedType(type.id)}
              className={cn(
                'px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border',
                selectedType === type.id
                  ? 'bg-brand-500/15 border-brand-500 text-brand-400 font-semibold'
                  : 'border-transparent text-muted hover:bg-surface-raised hover:text-foreground'
              )}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Transactions Table ───────────────────────────────── */}
      <div
        className="rounded-2xl border overflow-hidden"
        style={{
          backgroundColor: 'rgb(var(--surface))',
          borderColor: 'rgb(var(--border))',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        {txLoading ? (
          <div className="p-6">
            <SkeletonTable rows={8} />
          </div>
        ) : txError ? (
          <div className="p-12 text-center space-y-3">
            <AlertCircle className="w-8 h-8 mx-auto text-red-500" />
            <p className="text-sm font-semibold" style={{ color: 'rgb(var(--foreground))' }}>
              Failed to load transactions
            </p>
            <p className="text-xs text-muted">{(txError as Error).message}</p>
            <button
              onClick={() => refetch()}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg border bg-surface-raised"
            >
              Try Again
            </button>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="p-12">
            <EmptyState
              icon={<Receipt className="w-8 h-8 text-brand" />}
              title="No transactions found"
              description={
                searchQuery || selectedType !== 'ALL' || selectedBroker !== 'ALL'
                  ? 'No activity matches your current filters. Try resetting the search or filter criteria.'
                  : 'Start recording your trades, corporate actions, and dividend receipts to build an accurate audit ledger.'
              }
              action={
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-brand shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Record First Transaction</span>
                </button>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr
                  className="border-b text-[11px] font-bold uppercase tracking-wider text-muted"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    borderColor: 'rgb(var(--border))',
                  }}
                >
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Instrument</th>
                  <th className="py-3 px-4">Broker</th>
                  <th className="py-3 px-4 text-right">Quantity</th>
                  <th className="py-3 px-4 text-right">Fill Price</th>
                  <th className="py-3 px-4 text-right">Gross Amount</th>
                  <th className="py-3 px-4 text-right">Fees / Tax</th>
                  <th className="py-3 px-4 text-right">Net Flow</th>
                  <th className="py-3 px-4 text-right">Realized P&amp;L</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'rgb(var(--border))' }}>
                {filteredTransactions.map((tx) => {
                  const typeUpper = tx.transaction_type.toUpperCase();
                  const pnl = tx.realized_pnl_record;

                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-surface-raised/60 transition-colors"
                      style={{ fontVariantNumeric: 'tabular-nums' }}
                    >
                      {/* Date */}
                      <td className="py-3 px-4 whitespace-nowrap text-muted">
                        <div>{formatDate(tx.transaction_date)}</div>
                        <div className="text-[10px] opacity-60">
                          {new Date(tx.transaction_date).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>

                      {/* Type Badge */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <TypeBadge type={typeUpper} />
                      </td>

                      {/* Instrument */}
                      <td className="py-3 px-4">
                        <div className="font-semibold" style={{ color: 'rgb(var(--foreground))' }}>
                          {tx.instrument?.symbol || 'UNKNOWN'}
                        </div>
                        <div className="text-[10px] text-muted truncate max-w-[160px]">
                          {tx.instrument?.instrument_name || 'Manual Asset'}
                        </div>
                      </td>

                      {/* Broker */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border"
                          style={{
                            backgroundColor: 'rgb(var(--surface-raised))',
                            borderColor: 'rgb(var(--border))',
                          }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: tx.broker_account?.color_hex || '#3B82F6' }}
                          />
                          {tx.broker_account?.display_name || tx.broker_account?.broker_name || 'Broker'}
                        </span>
                      </td>

                      {/* Quantity */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {['DIVIDEND', 'INTEREST', 'COUPON', 'FEE'].includes(typeUpper) ? (
                          <span className="text-muted">—</span>
                        ) : (
                          <span className="font-medium" style={{ color: 'rgb(var(--foreground))' }}>
                            {tx.quantity.toLocaleString('en-IN')}
                          </span>
                        )}
                      </td>

                      {/* Unit Price */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {['DIVIDEND', 'INTEREST', 'COUPON', 'FEE'].includes(typeUpper) ? (
                          <span className="text-muted">—</span>
                        ) : (
                          formatCurrency(tx.unit_price)
                        )}
                      </td>

                      {/* Gross Amount */}
                      <td className="py-3 px-4 text-right whitespace-nowrap font-medium" style={{ color: 'rgb(var(--foreground))' }}>
                        {formatCurrency(tx.gross_amount)}
                      </td>

                      {/* Fees / Tax */}
                      <td className="py-3 px-4 text-right whitespace-nowrap text-muted">
                        {tx.fees + tx.taxes > 0 ? formatCurrency(tx.fees + tx.taxes) : '₹0.00'}
                      </td>

                      {/* Net Flow */}
                      <td className="py-3 px-4 text-right whitespace-nowrap font-semibold">
                        <span
                          className={cn(
                            typeUpper === 'BUY'
                              ? 'text-muted'
                              : typeUpper === 'SELL' || typeUpper === 'DIVIDEND' || typeUpper === 'INTEREST'
                              ? 'text-gain'
                              : 'text-foreground'
                          )}
                        >
                          {typeUpper === 'BUY' ? '-' : '+'}
                          {formatCurrency(tx.net_amount)}
                        </span>
                      </td>

                      {/* Realized P&L */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {pnl ? (
                          <div className="inline-flex flex-col items-end">
                            <span
                              className={cn(
                                'font-bold text-xs',
                                pnl.realized_pnl >= 0 ? 'text-gain' : 'text-loss'
                              )}
                            >
                              {pnl.realized_pnl >= 0 ? '+' : ''}
                              {formatCurrency(pnl.realized_pnl)}
                            </span>
                            <span
                              className={cn(
                                'text-[10px]',
                                pnl.realized_pnl >= 0 ? 'text-gain opacity-90' : 'text-loss opacity-90'
                              )}
                            >
                              ({formatPercent(pnl.realized_pnl_pct)})
                            </span>
                          </div>
                        ) : typeUpper === 'BONUS' || typeUpper === 'SPLIT' ? (
                          <span className="text-[10px] text-purple-400 font-medium">Cost diluted</span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => {
                              setSelectedTx(tx);
                              setIsDetailModalOpen(true);
                            }}
                            className="p-1 rounded text-muted hover:text-foreground hover:bg-surface-raised"
                            title="View Transaction Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedTx(tx);
                              setIsEditModalOpen(true);
                            }}
                            className="p-1 rounded text-muted hover:text-foreground hover:bg-surface-raised"
                            title="Edit Transaction"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setTxToDelete(tx)}
                            className="p-1 rounded text-muted hover:text-red-400 hover:bg-red-500/10"
                            title="Delete Transaction"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── MODALS ───────────────────────────────────────────── */}

      {/* 1. Record Transaction Modal */}
      <RecordTransactionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        brokers={brokers}
        onSubmit={async (data) => {
          await createTxMutation.mutateAsync(data);
        }}
        isSubmitting={createTxMutation.isPending}
      />

      {/* 2. Edit Transaction Modal */}
      {selectedTx && (
        <EditTransactionModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedTx(null);
          }}
          transaction={selectedTx}
          brokers={brokers}
          onSubmit={async (data) => {
            await updateTxMutation.mutateAsync({ id: selectedTx.id, ...data });
          }}
          isSubmitting={updateTxMutation.isPending}
        />
      )}

      {/* 3. Transaction Details Modal */}
      {selectedTx && (
        <TransactionDetailsModal
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedTx(null);
          }}
          transaction={selectedTx}
        />
      )}

      {/* 4. Import Tradebook CSV Modal */}
      <ImportTradebookModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        brokers={brokers}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['transactions'] });
          queryClient.invalidateQueries({ queryKey: ['holdings'] });
          queryClient.invalidateQueries({ queryKey: ['reconciliations'] });
          setIsImportModalOpen(false);
        }}
      />

      {/* 5. Holdings Reconciliation Drawer / Modal */}
      <ReconciliationModal
        isOpen={isReconcileModalOpen}
        onClose={() => setIsReconcileModalOpen(false)}
        reconciliations={reconciliations}
      />

      {/* 6. Delete Confirmation Dialog */}
      {txToDelete && (
        <DeleteConfirmationDialog
          transaction={txToDelete}
          onCancel={() => setTxToDelete(null)}
          onConfirm={async () => {
            await deleteTxMutation.mutateAsync(txToDelete.id);
          }}
          isDeleting={deleteTxMutation.isPending}
        />
      )}
    </div>
  );
}

// ─── HELPER COMPONENTS ─────────────────────────────────────────

function TypeBadge({ type }: { type: string }) {
  switch (type) {
    case 'BUY':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <ArrowDownLeft className="w-3 h-3" />
          BUY
        </span>
      );
    case 'SELL':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
          <ArrowUpRight className="w-3 h-3" />
          SELL
        </span>
      );
    case 'DIVIDEND':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-teal-500/10 text-teal-400 border border-teal-500/20">
          <Coins className="w-3 h-3" />
          DIVIDEND
        </span>
      );
    case 'INTEREST':
    case 'COUPON':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
          <Percent className="w-3 h-3" />
          INTEREST
        </span>
      );
    case 'BONUS':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
          <Layers className="w-3 h-3" />
          BONUS
        </span>
      );
    case 'SPLIT':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
          <Layers className="w-3 h-3" />
          SPLIT
        </span>
      );
    case 'FEE':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-500/10 text-slate-300 border border-slate-500/20">
          <Receipt className="w-3 h-3" />
          FEE
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-surface-raised border">
          {type}
        </span>
      );
  }
}

// ─── RECORD TRANSACTION MODAL ──────────────────────────────────

function RecordTransactionModal({
  isOpen,
  onClose,
  brokers,
  onSubmit,
  isSubmitting,
}: {
  isOpen: boolean;
  onClose: () => void;
  brokers: BrokerAccountRow[];
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  isSubmitting: boolean;
}) {
  const [brokerAccountId, setBrokerAccountId] = useState(brokers[0]?.id || '');
  const [transactionType, setTransactionType] = useState<TransactionType>('BUY');
  const [symbol, setSymbol] = useState('');
  const [name, setName] = useState('');
  const [assetClass, setAssetClass] = useState('equity');
  const [quantity, setQuantity] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [fees, setFees] = useState('0');
  const [taxes, setTaxes] = useState('0');
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [externalReference, setExternalReference] = useState('');
  const [reconcileHolding, setReconcileHolding] = useState(true);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const numQty = Number(quantity) || 0;
  const numPrice = Number(unitPrice) || 0;
  const numFees = Number(fees) || 0;
  const numTaxes = Number(taxes) || 0;
  const grossAmount = numQty * numPrice;
  const netAmount =
    transactionType === 'BUY'
      ? grossAmount + numFees + numTaxes
      : transactionType === 'SELL'
      ? Math.max(0, grossAmount - numFees - numTaxes)
      : grossAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!brokerAccountId) {
      setError('Please select a broker account.');
      return;
    }
    if (!symbol.trim()) {
      setError('Please specify an instrument symbol.');
      return;
    }

    if (['BUY', 'SELL'].includes(transactionType)) {
      if (numQty <= 0) {
        setError('Quantity must be greater than zero.');
        return;
      }
      if (numPrice <= 0) {
        setError('Unit price must be greater than zero.');
        return;
      }
    }

    try {
      await onSubmit({
        broker_account_id: brokerAccountId,
        transaction_type: transactionType,
        symbol: symbol.toUpperCase().trim(),
        name: name.trim() || symbol.toUpperCase().trim(),
        asset_class: assetClass,
        quantity: numQty,
        unit_price: numPrice,
        gross_amount: grossAmount,
        fees: numFees,
        taxes: numTaxes,
        net_amount: netAmount,
        transaction_date: new Date(transactionDate).toISOString(),
        notes: notes.trim() || null,
        external_reference: externalReference.trim() || null,
        reconcile_holding: reconcileHolding,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record transaction');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div
        className="w-full max-w-lg rounded-2xl border p-6 space-y-4 shadow-2xl overflow-y-auto max-h-[90vh]"
        style={{
          backgroundColor: 'rgb(var(--surface))',
          borderColor: 'rgb(var(--border))',
        }}
      >
        <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'rgb(var(--border))' }}>
          <div>
            <h2 className="text-base font-bold" style={{ color: 'rgb(var(--foreground))' }}>
              Record Investment Transaction
            </h2>
            <p className="text-xs text-muted">Add trade activity or corporate action to your ledger</p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Row 1: Broker & Type */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-muted mb-1">Broker Account *</label>
              <select
                value={brokerAccountId}
                onChange={(e) => setBrokerAccountId(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border bg-surface-raised focus:outline-none"
                style={{ borderColor: 'rgb(var(--border))', color: 'rgb(var(--foreground))' }}
                required
              >
                {brokers.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.display_name || b.broker_code}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-muted mb-1">Transaction Type *</label>
              <select
                value={transactionType}
                onChange={(e) => setTransactionType(e.target.value as TransactionType)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border bg-surface-raised focus:outline-none"
                style={{ borderColor: 'rgb(var(--border))', color: 'rgb(var(--foreground))' }}
              >
                <option value="BUY">Buy (Acquisition)</option>
                <option value="SELL">Sell (Disposal)</option>
                <option value="DIVIDEND">Dividend (Cash Distribution)</option>
                <option value="INTEREST">Interest / Coupon Income</option>
                <option value="BONUS">Bonus Shares</option>
                <option value="SPLIT">Stock Split</option>
                <option value="FEE">Account Fee / Charge</option>
              </select>
            </div>
          </div>

          {/* Row 2: Dynamic Stock & Instrument Search */}
          <div className="space-y-1">
            <StockSearchDropdown
              selectedSymbol={symbol}
              onSelect={(selected) => {
                setSymbol(selected.symbol);
                setName(selected.name);
                setAssetClass(selected.assetClass);
                if (
                  selected.livePrice &&
                  typeof selected.livePrice === 'number' &&
                  (!unitPrice || Number(unitPrice) === 0)
                ) {
                  setUnitPrice(selected.livePrice.toString());
                }
              }}
            />
          </div>

          {/* Row 3: Selected Symbol Details, Company Name & Asset Class */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-muted mb-1">Symbol / Ticker *</label>
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                placeholder="e.g. RELIANCE, TCS"
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border bg-surface-raised focus:outline-none font-mono"
                style={{ borderColor: 'rgb(var(--border))', color: 'rgb(var(--foreground))' }}
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-muted mb-1">Company Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Coal India Ltd"
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border bg-surface-raised focus:outline-none"
                style={{ borderColor: 'rgb(var(--border))', color: 'rgb(var(--foreground))' }}
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-muted mb-1">Asset Class</label>
              <select
                value={assetClass}
                onChange={(e) => setAssetClass(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border bg-surface-raised focus:outline-none"
                style={{ borderColor: 'rgb(var(--border))', color: 'rgb(var(--foreground))' }}
              >
                <option value="equity">Equity (Stocks)</option>
                <option value="reit">REIT</option>
                <option value="invit">InvIT</option>
                <option value="bond">Bonds / SGB</option>
                <option value="mf">Mutual Fund</option>
              </select>
            </div>
          </div>

          {/* Row 3: Quantity & Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-muted mb-1">
                Quantity {['BUY', 'SELL', 'BONUS', 'SPLIT'].includes(transactionType) ? '*' : ''}
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0"
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border bg-surface-raised focus:outline-none"
                style={{ borderColor: 'rgb(var(--border))', color: 'rgb(var(--foreground))' }}
                required={['BUY', 'SELL', 'BONUS', 'SPLIT'].includes(transactionType)}
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-muted mb-1">
                Fill Price (₹) {['BUY', 'SELL'].includes(transactionType) ? '*' : ''}
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                placeholder="0.00"
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border bg-surface-raised focus:outline-none"
                style={{ borderColor: 'rgb(var(--border))', color: 'rgb(var(--foreground))' }}
                required={['BUY', 'SELL'].includes(transactionType)}
              />
            </div>
          </div>

          {/* Row 4: Fees & Date */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-muted mb-1">Brokerage / Fees (₹)</label>
              <input
                type="number"
                step="any"
                min="0"
                value={fees}
                onChange={(e) => setFees(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border bg-surface-raised focus:outline-none"
                style={{ borderColor: 'rgb(var(--border))', color: 'rgb(var(--foreground))' }}
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-muted mb-1">STT / Taxes (₹)</label>
              <input
                type="number"
                step="any"
                min="0"
                value={taxes}
                onChange={(e) => setTaxes(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border bg-surface-raised focus:outline-none"
                style={{ borderColor: 'rgb(var(--border))', color: 'rgb(var(--foreground))' }}
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-muted mb-1">Trade Date *</label>
              <input
                type="date"
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border bg-surface-raised focus:outline-none"
                style={{ borderColor: 'rgb(var(--border))', color: 'rgb(var(--foreground))' }}
                required
              />
            </div>
          </div>

          {/* Net Flow Preview Card */}
          <div
            className="p-3 rounded-xl border flex items-center justify-between text-xs"
            style={{
              backgroundColor: 'rgba(59, 130, 246, 0.05)',
              borderColor: 'rgba(59, 130, 246, 0.2)',
            }}
          >
            <div>
              <span className="text-muted block text-[10px]">Net Cashflow Preview</span>
              <span className="font-bold text-sm" style={{ color: 'rgb(var(--foreground))' }}>
                {transactionType === 'BUY' ? '-' : '+'}
                {formatCurrency(netAmount)}
              </span>
            </div>
            <div className="text-right text-[10px] text-muted">
              Gross: {formatCurrency(grossAmount)} · Fees: {formatCurrency(numFees + numTaxes)}
            </div>
          </div>

          {/* Row 5: Notes & External Reference */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-muted mb-1">External Ref / Order ID</label>
              <input
                type="text"
                value={externalReference}
                onChange={(e) => setExternalReference(e.target.value)}
                placeholder="e.g. ORD-109248"
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border bg-surface-raised focus:outline-none"
                style={{ borderColor: 'rgb(var(--border))', color: 'rgb(var(--foreground))' }}
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-muted mb-1">Notes</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes or reason"
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border bg-surface-raised focus:outline-none"
                style={{ borderColor: 'rgb(var(--border))', color: 'rgb(var(--foreground))' }}
              />
            </div>
          </div>

          {/* Checkbox: Reconcile with Holdings */}
          <label className="flex items-center gap-2 cursor-pointer text-xs text-muted pt-1">
            <input
              type="checkbox"
              checked={reconcileHolding}
              onChange={(e) => setReconcileHolding(e.target.checked)}
              className="rounded text-brand"
            />
            <span>Automatically reconcile and update position balance in Holdings</span>
          </label>

          {/* Submit buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t" style={{ borderColor: 'rgb(var(--border))' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg border hover:bg-surface-raised"
              style={{ borderColor: 'rgb(var(--border))', color: 'rgb(var(--muted))' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 text-xs font-semibold rounded-lg text-white bg-brand shadow-sm hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isSubmitting ? 'Recording...' : 'Record Transaction'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── EDIT TRANSACTION MODAL ────────────────────────────────────

function EditTransactionModal({
  isOpen,
  onClose,
  transaction,
  brokers,
  onSubmit,
  isSubmitting,
}: {
  isOpen: boolean;
  onClose: () => void;
  transaction: TransactionWithPnL;
  brokers: BrokerAccountRow[];
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  isSubmitting: boolean;
}) {
  const [quantity, setQuantity] = useState(String(transaction.quantity));
  const [unitPrice, setUnitPrice] = useState(String(transaction.unit_price));
  const [fees, setFees] = useState(String(transaction.fees || 0));
  const [taxes, setTaxes] = useState(String(transaction.taxes || 0));
  const [transactionDate, setTransactionDate] = useState(
    transaction.transaction_date.split('T')[0]
  );
  const [notes, setNotes] = useState(transaction.notes || '');
  const [externalReference, setExternalReference] = useState(transaction.external_reference || '');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const numQty = Number(quantity) || 0;
  const numPrice = Number(unitPrice) || 0;
  const numFees = Number(fees) || 0;
  const numTaxes = Number(taxes) || 0;
  const grossAmount = numQty * numPrice;
  const netAmount =
    transaction.transaction_type === 'BUY'
      ? grossAmount + numFees + numTaxes
      : transaction.transaction_type === 'SELL'
      ? Math.max(0, grossAmount - numFees - numTaxes)
      : grossAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await onSubmit({
        quantity: numQty,
        unit_price: numPrice,
        gross_amount: grossAmount,
        fees: numFees,
        taxes: numTaxes,
        net_amount: netAmount,
        transaction_date: new Date(transactionDate).toISOString(),
        notes: notes.trim() || null,
        external_reference: externalReference.trim() || null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update transaction');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div
        className="w-full max-w-md rounded-2xl border p-6 space-y-4 shadow-2xl overflow-y-auto max-h-[90vh]"
        style={{
          backgroundColor: 'rgb(var(--surface))',
          borderColor: 'rgb(var(--border))',
        }}
      >
        <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'rgb(var(--border))' }}>
          <div>
            <h2 className="text-base font-bold" style={{ color: 'rgb(var(--foreground))' }}>
              Edit Transaction
            </h2>
            <p className="text-xs text-muted">
              {transaction.transaction_type} {transaction.instrument?.symbol || ''}
            </p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-muted mb-1">Quantity</label>
              <input
                type="number"
                step="any"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border bg-surface-raised focus:outline-none"
                style={{ borderColor: 'rgb(var(--border))', color: 'rgb(var(--foreground))' }}
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-muted mb-1">Fill Price (₹)</label>
              <input
                type="number"
                step="any"
                min="0"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border bg-surface-raised focus:outline-none"
                style={{ borderColor: 'rgb(var(--border))', color: 'rgb(var(--foreground))' }}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-muted mb-1">Fees (₹)</label>
              <input
                type="number"
                step="any"
                min="0"
                value={fees}
                onChange={(e) => setFees(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border bg-surface-raised focus:outline-none"
                style={{ borderColor: 'rgb(var(--border))', color: 'rgb(var(--foreground))' }}
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-muted mb-1">Trade Date</label>
              <input
                type="date"
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border bg-surface-raised focus:outline-none"
                style={{ borderColor: 'rgb(var(--border))', color: 'rgb(var(--foreground))' }}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-muted mb-1">External Reference</label>
            <input
              type="text"
              value={externalReference}
              onChange={(e) => setExternalReference(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border bg-surface-raised focus:outline-none"
              style={{ borderColor: 'rgb(var(--border))', color: 'rgb(var(--foreground))' }}
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-muted mb-1">Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border bg-surface-raised focus:outline-none"
              style={{ borderColor: 'rgb(var(--border))', color: 'rgb(var(--foreground))' }}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t" style={{ borderColor: 'rgb(var(--border))' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg border hover:bg-surface-raised"
              style={{ borderColor: 'rgb(var(--border))', color: 'rgb(var(--muted))' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 text-xs font-semibold rounded-lg text-white bg-brand shadow-sm hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isSubmitting ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── TRANSACTION DETAILS MODAL ─────────────────────────────────

function TransactionDetailsModal({
  isOpen,
  onClose,
  transaction,
}: {
  isOpen: boolean;
  onClose: () => void;
  transaction: TransactionWithPnL;
}) {
  if (!isOpen) return null;

  const pnl = transaction.realized_pnl_record;
  const corp = transaction.corporate_action;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div
        className="w-full max-w-lg rounded-2xl border p-6 space-y-4 shadow-2xl overflow-y-auto max-h-[90vh]"
        style={{
          backgroundColor: 'rgb(var(--surface))',
          borderColor: 'rgb(var(--border))',
        }}
      >
        <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'rgb(var(--border))' }}>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold" style={{ color: 'rgb(var(--foreground))' }}>
                {transaction.instrument?.symbol || 'Trade Details'}
              </h2>
              <TypeBadge type={transaction.transaction_type} />
            </div>
            <p className="text-xs text-muted mt-0.5">{transaction.instrument?.instrument_name}</p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Realized P&L Banner if SELL */}
        {pnl && (
          <div
            className={cn(
              'p-4 rounded-xl border flex items-center justify-between',
              pnl.realized_pnl >= 0
                ? 'bg-emerald-500/10 border-emerald-500/25'
                : 'bg-rose-500/10 border-rose-500/25'
            )}
          >
            <div>
              <span className="text-xs font-semibold text-muted block">Realized Return on Sale</span>
              <span
                className={cn(
                  'text-lg font-bold',
                  pnl.realized_pnl >= 0 ? 'text-gain' : 'text-loss'
                )}
              >
                {pnl.realized_pnl >= 0 ? '+' : ''}
                {formatCurrency(pnl.realized_pnl)}
              </span>
            </div>
            <PercentageBadge value={pnl.realized_pnl_pct} size="md" />
          </div>
        )}

        {/* Financial Breakdown Table */}
        <div className="space-y-2 text-xs">
          <h3 className="font-semibold text-muted text-[11px] uppercase tracking-wider">
            Execution Summary
          </h3>
          <div
            className="rounded-xl border divide-y overflow-hidden"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              borderColor: 'rgb(var(--border))',
            }}
          >
            <div className="flex justify-between p-2.5">
              <span className="text-muted">Broker Account</span>
              <span className="font-semibold" style={{ color: 'rgb(var(--foreground))' }}>
                {transaction.broker_account?.display_name || transaction.broker_account?.broker_name}
              </span>
            </div>
            <div className="flex justify-between p-2.5">
              <span className="text-muted">Execution Date</span>
              <span className="font-semibold" style={{ color: 'rgb(var(--foreground))' }}>
                {formatDate(transaction.transaction_date)}
              </span>
            </div>
            <div className="flex justify-between p-2.5">
              <span className="text-muted">Quantity Filled</span>
              <span className="font-semibold" style={{ color: 'rgb(var(--foreground))' }}>
                {transaction.quantity.toLocaleString('en-IN')} units
              </span>
            </div>
            <div className="flex justify-between p-2.5">
              <span className="text-muted">Unit Fill Price</span>
              <span className="font-semibold" style={{ color: 'rgb(var(--foreground))' }}>
                {formatCurrency(transaction.unit_price)}
              </span>
            </div>
            <div className="flex justify-between p-2.5">
              <span className="text-muted">Gross Transaction Value</span>
              <span className="font-semibold" style={{ color: 'rgb(var(--foreground))' }}>
                {formatCurrency(transaction.gross_amount)}
              </span>
            </div>
            <div className="flex justify-between p-2.5">
              <span className="text-muted">Brokerage &amp; Charges</span>
              <span className="font-semibold text-muted">{formatCurrency(transaction.fees)}</span>
            </div>
            <div className="flex justify-between p-2.5">
              <span className="text-muted">STT &amp; Taxes</span>
              <span className="font-semibold text-muted">{formatCurrency(transaction.taxes)}</span>
            </div>
            <div className="flex justify-between p-2.5 bg-surface-raised font-bold">
              <span>Net Settlement Amount</span>
              <span style={{ color: 'rgb(var(--foreground))' }}>
                {formatCurrency(transaction.net_amount)}
              </span>
            </div>
          </div>
        </div>

        {/* If SELL: Lot Cost Basis Details */}
        {pnl && (
          <div className="space-y-2 text-xs">
            <h3 className="font-semibold text-muted text-[11px] uppercase tracking-wider">
              Cost Basis &amp; Lot Accounting (WAC)
            </h3>
            <div
              className="p-3 rounded-xl border space-y-1.5"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                borderColor: 'rgb(var(--border))',
              }}
            >
              <div className="flex justify-between">
                <span className="text-muted">Average Acquisition Cost / Unit:</span>
                <span className="font-semibold">{formatCurrency(pnl.cost_per_unit)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Cost Basis of Units Sold:</span>
                <span className="font-semibold">{formatCurrency(pnl.cost_basis_sold)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Remaining Open Shares After Sale:</span>
                <span className="font-semibold">{pnl.remaining_quantity_after_sale} units</span>
              </div>
              {pnl.is_oversold_warning && (
                <div className="text-[11px] text-amber-400 pt-1 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Warning: Sale units exceeded available recorded balance.</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Corporate Action Detail */}
        {corp && (
          <div className="p-3 rounded-xl border bg-purple-500/10 border-purple-500/20 text-xs space-y-1 text-purple-300">
            <span className="font-bold block">Corporate Action Event</span>
            <p>{corp.notes}</p>
            <p className="text-[11px] opacity-80">
              Diluted average cost from {formatCurrency(corp.previous_cost_per_unit)} to{' '}
              {formatCurrency(corp.new_cost_per_unit)} / unit. Zero artificial profit or loss created.
            </p>
          </div>
        )}

        {/* Audit Metadata */}
        <div className="text-[11px] text-muted space-y-1 pt-1">
          {transaction.external_reference && (
            <div>
              <span className="font-medium">External Reference: </span>
              <code className="text-foreground">{transaction.external_reference}</code>
            </div>
          )}
          {transaction.notes && (
            <div>
              <span className="font-medium">Notes: </span>
              <span>{transaction.notes}</span>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2 border-t" style={{ borderColor: 'rgb(var(--border))' }}>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg border bg-surface-raised"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── IMPORT TRADEBOOK MODAL ────────────────────────────────────

function ImportTradebookModal({
  isOpen,
  onClose,
  brokers,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  brokers: BrokerAccountRow[];
  onSuccess: () => void;
}) {
  const [selectedBrokerId, setSelectedBrokerId] = useState(brokers[0]?.id || '');
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<RawTradebookRow[]>([]);
  const [dateWarnings, setDateWarnings] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{
    imported_count: number;
    duplicate_count: number;
    error_count: number;
  } | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setError(null);
    setImportResult(null);
    setDateWarnings([]);
    setDateRange(null);

    Papa.parse(f, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const raw = results.data as Record<string, string>[];
        if (!raw.length) {
          setError('The uploaded CSV file is empty.');
          return;
        }

        const warnings: string[] = [];
        const dateErrors: string[] = [];
        const validDates: string[] = [];

        // Map columns across Zerodha, Groww, Angel One, or standard FINOVA headers
        const normalized: RawTradebookRow[] = raw
          .map((r, i): RawTradebookRow | null => {
            const sym = r['symbol'] || r['Symbol'] || r['Stock Name'] || r['stock_name'] || r['Instrument'] || '';
            if (!sym.trim()) return null;

            const type = (r['trade_type'] || r['Trade Type'] || r['Type'] || r['transaction_type'] || r['Action'] || 'BUY').toUpperCase();
            const qty = Number(r['quantity'] || r['Quantity'] || r['Qty'] || 0);
            const price = Number(r['price'] || r['Price'] || r['unit_price'] || r['Trade Price'] || 0);
            const rawDate = r['trade_date'] || r['Trade Date'] || r['Date'] || r['transaction_date'];
            const dateCheck = parseAndNormalizeCsvDate(rawDate);

            if (!dateCheck.isValid) {
              dateErrors.push(`Row ${i + 1} (${sym}): ${dateCheck.error}`);
              return null;
            }

            if (dateCheck.isAmbiguous && dateCheck.ambiguityWarning) {
              warnings.push(dateCheck.ambiguityWarning);
            }

            validDates.push(dateCheck.normalizedDate);

            const ref = r['trade_id'] || r['Trade ID'] || r['Order ID'] || r['order_id'] || r['external_reference'] || '';
            const fees = Number(r['fees'] || r['Fees'] || r['Brokerage'] || 0);
            const taxes = Number(r['taxes'] || r['Taxes'] || r['STT'] || 0);

            return {
              symbol: sym.trim(),
              trade_type: type as TransactionType,
              quantity: qty,
              price: price,
              trade_date: dateCheck.normalizedIso || `${dateCheck.normalizedDate}T00:00:00.000Z`,
              external_reference: ref.trim() || undefined,
              fees,
              taxes,
            };
          })
          .filter((r): r is RawTradebookRow => r !== null);

        if (dateErrors.length > 0) {
          setError(`Found ${dateErrors.length} invalid trade date(s): ${dateErrors.slice(0, 2).join('; ')}`);
        }

        setDateWarnings(warnings);
        if (validDates.length > 0) {
          const sorted = [...validDates].sort();
          setDateRange({ start: sorted[0], end: sorted[sorted.length - 1] });
        } else {
          setDateRange(null);
        }

        setParsedRows(normalized);
      },
      error: (err) => {
        setError(`CSV parse error: ${err.message}`);
      },
    });
  };

  const handleConfirmImport = async () => {
    if (!parsedRows.length) return;
    setIsProcessing(true);
    setError(null);

    try {
      const res = await fetch('/api/portfolio/transactions/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          broker_account_id: selectedBrokerId,
          transactions: parsedRows,
          reconcile_holdings: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');

      setImportResult({
        imported_count: data.imported_count,
        duplicate_count: data.duplicate_count,
        error_count: data.error_count,
      });

      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div
        className="w-full max-w-lg rounded-2xl border p-6 space-y-4 shadow-2xl overflow-y-auto max-h-[90vh]"
        style={{
          backgroundColor: 'rgb(var(--surface))',
          borderColor: 'rgb(var(--border))',
        }}
      >
        <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'rgb(var(--border))' }}>
          <div>
            <h2 className="text-base font-bold" style={{ color: 'rgb(var(--foreground))' }}>
              Import Tradebook CSV
            </h2>
            <p className="text-xs text-muted">Upload Zerodha, Groww, or Angel One tradebooks with duplicate detection</p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {importResult && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs space-y-1">
            <div className="flex items-center gap-2 font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Import Completed Successfully</span>
            </div>
            <p>
              Imported {importResult.imported_count} trade records. Skipped {importResult.duplicate_count} duplicate entries safely.
            </p>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-medium text-muted mb-1">Target Broker Account *</label>
            <select
              value={selectedBrokerId}
              onChange={(e) => setSelectedBrokerId(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border bg-surface-raised focus:outline-none"
              style={{ borderColor: 'rgb(var(--border))', color: 'rgb(var(--foreground))' }}
            >
              {brokers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.display_name || b.broker_code}
                </option>
              ))}
            </select>
          </div>

          {/* File input */}
          <div
            className="p-6 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center cursor-pointer transition-colors hover:bg-surface-raised/40"
            style={{ borderColor: 'rgb(var(--border))' }}
            onClick={() => document.getElementById('tradebook-csv-input')?.click()}
          >
            <Upload className="w-7 h-7 text-brand mb-2" />
            <span className="text-xs font-semibold" style={{ color: 'rgb(var(--foreground))' }}>
              {file ? file.name : 'Choose Tradebook CSV or drag & drop'}
            </span>
            <span className="text-[10px] text-muted mt-1">
              Supports Zerodha Tradebook, Groww, Angel One, or FINOVA standard CSV
            </span>
            <input
              id="tradebook-csv-input"
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Preview count */}
          {parsedRows.length > 0 && (
            <div className="p-3.5 rounded-xl border bg-surface-raised text-xs space-y-2">
              <div className="flex justify-between items-center font-medium">
                <span>Validated Transactions:</span>
                <span className="font-bold text-foreground px-2 py-0.5 rounded bg-brand/10 text-brand">
                  {parsedRows.length} trades ready
                </span>
              </div>
              {dateRange && (
                <div className="flex items-center gap-1.5 text-[11px] text-muted">
                  <Calendar className="w-3.5 h-3.5 text-brand" />
                  <span>
                    Verified Date Span: <strong className="text-foreground font-mono">{dateRange.start}</strong> to{' '}
                    <strong className="text-foreground font-mono">{dateRange.end}</strong>
                  </span>
                </div>
              )}
              {dateWarnings.length > 0 && (
                <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 flex items-start gap-1.5">
                  <Info className="w-3.5 h-3.5 shrink-0 text-amber-400 mt-0.5" />
                  <span>
                    Ambiguous day/month values detected ({dateWarnings.length} entries). Normalized strictly using Indian market convention (DD-MM-YYYY).
                  </span>
                </div>
              )}
              <p className="text-[11px] text-muted">
                Deduplication is active: repeated trades with matching external trade references will be skipped to protect your ledger integrity.
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t" style={{ borderColor: 'rgb(var(--border))' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg border hover:bg-surface-raised"
            style={{ borderColor: 'rgb(var(--border))', color: 'rgb(var(--muted))' }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmImport}
            disabled={isProcessing || !parsedRows.length}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg text-white bg-brand shadow-sm hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5"
          >
            {isProcessing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{isProcessing ? 'Importing...' : `Import ${parsedRows.length} Trades`}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── RECONCILIATION MODAL ──────────────────────────────────────

function ReconciliationModal({
  isOpen,
  onClose,
  reconciliations,
}: {
  isOpen: boolean;
  onClose: () => void;
  reconciliations: PositionReconciliationResult[];
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div
        className="w-full max-w-2xl rounded-2xl border p-6 space-y-4 shadow-2xl overflow-y-auto max-h-[90vh]"
        style={{
          backgroundColor: 'rgb(var(--surface))',
          borderColor: 'rgb(var(--border))',
        }}
      >
        <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'rgb(var(--border))' }}>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold" style={{ color: 'rgb(var(--foreground))' }}>
                Holdings &amp; Tradebook Reconciliation
              </h2>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-xs text-muted">
              Audited comparison of current position balances versus transaction history
            </p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informational Architecture Callout */}
        <div
          className="p-3.5 rounded-xl border text-xs space-y-1.5"
          style={{
            backgroundColor: 'rgba(59, 130, 246, 0.05)',
            borderColor: 'rgba(59, 130, 246, 0.2)',
          }}
        >
          <div className="flex items-center gap-1.5 font-bold text-brand">
            <Info className="w-4 h-4 shrink-0" />
            <span>Dual-Record Accounting Model</span>
          </div>
          <p className="text-muted text-[11px] leading-relaxed">
            Finova distinguishes between your <strong>Holdings Balance Sheet</strong> (current authoritative positions)
            and the <strong>Transaction Ledger</strong> (audit trail of trade executions). Opening positions entered
            manually or imported from monthly statement snapshots are preserved without fabricating historical trades.
          </p>
        </div>

        {/* Table of Reconciliations */}
        {reconciliations.length === 0 ? (
          <p className="text-center text-xs text-muted py-6">No positions to reconcile.</p>
        ) : (
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'rgb(var(--border))' }}>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr
                  className="border-b text-[10px] font-bold uppercase tracking-wider text-muted"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    borderColor: 'rgb(var(--border))',
                  }}
                >
                  <th className="py-2.5 px-3">Instrument</th>
                  <th className="py-2.5 px-3">Broker</th>
                  <th className="py-2.5 px-3 text-right">Holding Balance</th>
                  <th className="py-2.5 px-3 text-right">Ledger Net</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'rgb(var(--border))' }}>
                {reconciliations.map((r, i) => (
                  <tr key={i} className="hover:bg-surface-raised/50">
                    <td className="py-2.5 px-3 font-semibold" style={{ color: 'rgb(var(--foreground))' }}>
                      {r.symbol || 'ASSET'}
                    </td>
                    <td className="py-2.5 px-3 text-muted">{r.broker_name || 'Account'}</td>
                    <td className="py-2.5 px-3 text-right font-medium">
                      {r.holding_quantity > 0 ? `${r.holding_quantity} units` : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium text-muted">
                      {r.ledger_quantity > 0 ? `${r.ledger_quantity} units` : '—'}
                    </td>
                    <td className="py-2.5 px-3">
                      {r.status === 'FULL_LEDGER_MATCH' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                          <CheckCircle2 className="w-3 h-3" />
                          Match
                        </span>
                      ) : r.status === 'HOLDING_ONLY' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
                          Opening Balance
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                          Diff: {r.quantity_difference}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-end pt-2 border-t" style={{ borderColor: 'rgb(var(--border))' }}>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg border bg-surface-raised"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── DELETE CONFIRMATION DIALOG ────────────────────────────────

function DeleteConfirmationDialog({
  transaction,
  onCancel,
  onConfirm,
  isDeleting,
}: {
  transaction: TransactionWithPnL;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
  isDeleting: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div
        className="w-full max-w-sm rounded-2xl border p-5 space-y-4 shadow-2xl"
        style={{
          backgroundColor: 'rgb(var(--surface))',
          borderColor: 'rgb(var(--border))',
        }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-red-500/10 text-red-400">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold" style={{ color: 'rgb(var(--foreground))' }}>
              Delete Transaction?
            </h3>
            <p className="text-xs text-muted">
              {transaction.transaction_type} {transaction.quantity} {transaction.instrument?.symbol || ''}
            </p>
          </div>
        </div>

        <p className="text-xs text-muted">
          Are you sure you want to delete this transaction record? Removing it will automatically recalculate
          your chronological cost basis and affected position balances.
        </p>

        <div className="flex items-center justify-end gap-2 pt-2 border-t" style={{ borderColor: 'rgb(var(--border))' }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg border hover:bg-surface-raised"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 flex items-center gap-1.5"
          >
            {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{isDeleting ? 'Deleting...' : 'Delete'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
