'use client';

import { useState, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import Papa from 'papaparse';
import {
  Plus, Upload, Search, X, Loader2,
  LineChart, Trash2, Download, Eye, Building2, Info, Edit2,
  AlertCircle, CheckCircle2, FileText, ArrowUpDown, Filter, ChevronRight, RefreshCw
} from 'lucide-react';
import { PercentageBadge } from '@/components/shared/PercentageBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { SkeletonTable } from '@/components/shared/Skeletons';
import { formatCurrency, ASSET_CLASS_LABELS } from '@/lib/utils';
import type { HoldingWithMetrics, AssetClass, BrokerAccount } from '@/types/portfolio';
import { GLOBAL_SEED_INSTRUMENTS } from '@/lib/storage/portfolioStorage';

const TAB_CATEGORIES: { id: string; label: string; assetClass?: AssetClass }[] = [
  { id: 'all', label: 'All Investments' },
  { id: 'stocks', label: 'Stocks', assetClass: 'equity' },
  { id: 'mutual_funds', label: 'Mutual Funds', assetClass: 'mf' },
  { id: 'reits', label: 'REITs', assetClass: 'reit' },
  { id: 'invits', label: 'InvITs', assetClass: 'invit' },
  { id: 'bonds', label: 'Bonds', assetClass: 'bond' },
];

async function fetchHoldings() {
  const res = await fetch('/api/portfolio/holdings');
  if (!res.ok) throw new Error('Failed to load holdings');
  return res.json();
}

async function fetchBrokers() {
  const res = await fetch('/api/brokers');
  if (!res.ok) throw new Error('Failed to load brokers');
  return res.json();
}

async function addHoldingApi(data: Record<string, unknown>) {
  const res = await fetch('/api/portfolio/holdings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to add holding');
  }
  return res.json();
}

async function updateHoldingApi(data: { id: string; quantity: number; avg_buy_price: number }) {
  const res = await fetch('/api/portfolio/holdings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to update holding');
  }
  return res.json();
}

async function bulkImportHoldings(data: { holdings: unknown[]; duplicate_mode: string; broker_account_id?: string }) {
  const res = await fetch('/api/portfolio/holdings/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to import holdings');
  }
  return res.json();
}

async function deleteHoldingApi(id: string) {
  const res = await fetch(`/api/portfolio/holdings?id=${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to delete holding');
  }
  return res.json();
}

interface AddHoldingForm {
  symbol: string;
  name: string;
  asset_class: AssetClass;
  exchange: string;
  quantity: string;
  avg_buy_price: string;
  broker_account_id: string;
  isin: string;
  as_of: string;
  notes: string;
}

const EMPTY_FORM: AddHoldingForm = {
  symbol: '',
  name: '',
  asset_class: 'equity',
  exchange: 'NSE',
  quantity: '',
  avg_buy_price: '',
  broker_account_id: '',
  isin: '',
  as_of: new Date().toISOString().split('T')[0],
  notes: '',
};

interface CsvValidationRow {
  rowNumber: number;
  symbol: string;
  name: string;
  asset_class: AssetClass;
  exchange: string;
  quantity: number;
  avg_buy_price: number;
  broker_account_id?: string;
  isin?: string;
  isValid: boolean;
  errors: string[];
}

export default function HoldingsPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingHolding, setEditingHolding] = useState<HoldingWithMetrics | null>(null);
  const [deletingHolding, setDeletingHolding] = useState<HoldingWithMetrics | null>(null);
  const [selectedHolding, setSelectedHolding] = useState<HoldingWithMetrics | null>(null);

  const [search, setSearch] = useState('');
  const [selectedBrokerFilter, setSelectedBrokerFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<'value' | 'invested' | 'return' | 'name'>('value');
  const [form, setForm] = useState<AddHoldingForm>(EMPTY_FORM);
  const [catalogQuery, setCatalogQuery] = useState('');

  // CSV Import State
  const [csvRows, setCsvRows] = useState<CsvValidationRow[]>([]);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [importBrokerId, setImportBrokerId] = useState<string>('');
  const [duplicateMode, setDuplicateMode] = useState<'replace' | 'update' | 'skip'>('replace');
  const [isRefreshingQuotes, setIsRefreshingQuotes] = useState<boolean>(false);

  const { data: holdingsData, isLoading } = useQuery({ queryKey: ['holdings'], queryFn: fetchHoldings });
  const { data: brokersData } = useQuery({ queryKey: ['brokers'], queryFn: fetchBrokers });

  const holdings: HoldingWithMetrics[] = holdingsData?.holdings ?? [];
  const brokers: BrokerAccount[] = brokersData?.brokers ?? [];

  // Mutations
  const addMutation = useMutation({
    mutationFn: addHoldingApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holdings'] });
      queryClient.invalidateQueries({ queryKey: ['brokers'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-summary'] });
      setShowAddModal(false);
      setForm(EMPTY_FORM);
      setCatalogQuery('');
    },
  });

  const editMutation = useMutation({
    mutationFn: updateHoldingApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holdings'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-summary'] });
      setEditingHolding(null);
    },
  });

  const importMutation = useMutation({
    mutationFn: bulkImportHoldings,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['holdings'] });
      queryClient.invalidateQueries({ queryKey: ['brokers'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-summary'] });
      setShowImportModal(false);
      setCsvRows([]);
      setCsvError(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteHoldingApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holdings'] });
      queryClient.invalidateQueries({ queryKey: ['brokers'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-summary'] });
      setDeletingHolding(null);
      if (selectedHolding) setSelectedHolding(null);
    },
  });

  // Calculate Unified Summary
  const summaryMetrics = useMemo(() => {
    const totalInvested = holdings.reduce((sum, h) => sum + h.invested_value, 0);
    const pricedHoldings = holdings.filter((h) => h.current_price !== null && typeof h.current_price === 'number');
    const totalCurrentVal = holdings.reduce((sum, h) => sum + (h.current_value || h.invested_value), 0);
    const pricedInvested = pricedHoldings.reduce((sum, h) => sum + h.invested_value, 0);
    const pricedCurrent = pricedHoldings.reduce((sum, h) => sum + (h.current_value || h.invested_value), 0);
    const totalPnL = pricedHoldings.length > 0 ? pricedCurrent - pricedInvested : null;
    const totalReturnPct = pricedInvested > 0 && totalPnL !== null ? (totalPnL / pricedInvested) * 100 : null;

    return {
      totalInvested,
      totalCurrentVal,
      totalPnL,
      totalReturnPct,
      totalCount: holdings.length,
      pricedCount: pricedHoldings.length,
    };
  }, [holdings]);

  // Tab & Filters logic
  const currentTabAssetClass = TAB_CATEGORIES.find((t) => t.id === activeTab)?.assetClass;

  const filteredHoldings = useMemo(() => {
    return holdings
      .filter((h) => {
        const matchesTab = !currentTabAssetClass || h.asset_class === currentTabAssetClass;
        const matchesSearch =
          !search ||
          h.name.toLowerCase().includes(search.toLowerCase()) ||
          h.symbol.toLowerCase().includes(search.toLowerCase()) ||
          h.isin?.toLowerCase().includes(search.toLowerCase());
        const matchesBroker = !selectedBrokerFilter || h.broker_account_id === selectedBrokerFilter;
        return matchesTab && matchesSearch && matchesBroker;
      })
      .sort((a, b) => {
        if (sortBy === 'value') return (b.current_value || b.invested_value) - (a.current_value || a.invested_value);
        if (sortBy === 'invested') return b.invested_value - a.invested_value;
        if (sortBy === 'return') return (b.absolute_return_pct ?? -999) - (a.absolute_return_pct ?? -999);
        return a.name.localeCompare(b.name);
      });
  }, [holdings, currentTabAssetClass, search, selectedBrokerFilter, sortBy]);

  // CSV Parsing
  function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvError(null);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (!results.data || results.data.length === 0) {
          setCsvError('Uploaded CSV is empty.');
          return;
        }

        const rows: CsvValidationRow[] = [];
        results.data.forEach((row, idx) => {
          const keys = Object.keys(row);
          const findKey = (name: string) => keys.find((k) => k.trim().toLowerCase() === name.toLowerCase());

          const symbolKey = findKey('symbol') || findKey('ticker') || findKey('scrip');
          const nameKey = findKey('name') || findKey('asset_name') || findKey('company');
          const qtyKey = findKey('quantity') || findKey('qty') || findKey('units');
          const priceKey = findKey('average_buy_price') || findKey('avg buy price') || findKey('avg_price') || findKey('price');
          const assetClassKey = findKey('asset_type') || findKey('asset_class') || findKey('type');
          const exchangeKey = findKey('exchange');
          const isinKey = findKey('isin');

          const symbol = symbolKey ? (row[symbolKey] || '').toUpperCase().trim() : '';
          const name = nameKey && row[nameKey] ? row[nameKey].trim() : symbol;
          const rawClass = assetClassKey ? (row[assetClassKey] || '').toLowerCase().trim() : 'equity';
          let assetClass: AssetClass = 'equity';
          if (['equity', 'reit', 'invit', 'bond', 'sgb', 'etf', 'mf'].includes(rawClass)) {
            assetClass = rawClass as AssetClass;
          }

          const exchange = exchangeKey && row[exchangeKey] ? row[exchangeKey].toUpperCase().trim() : 'NSE';
          const isin = isinKey && row[isinKey] ? row[isinKey].trim() : undefined;

          const rawQty = qtyKey ? parseFloat(row[qtyKey]) : NaN;
          const rawPrice = priceKey ? parseFloat(row[priceKey]) : NaN;

          const errors: string[] = [];
          if (!symbol) errors.push('Missing Symbol');
          if (isNaN(rawQty) || rawQty <= 0) errors.push('Quantity must be > 0');
          if (isNaN(rawPrice) || rawPrice < 0) errors.push('Price cannot be negative');

          rows.push({
            rowNumber: idx + 1,
            symbol,
            name: name || symbol,
            asset_class: assetClass,
            exchange,
            quantity: isNaN(rawQty) ? 0 : rawQty,
            avg_buy_price: isNaN(rawPrice) ? 0 : rawPrice,
            isin,
            isValid: errors.length === 0,
            errors,
          });
        });

        setCsvRows(rows);
      },
      error: (err) => {
        setCsvError(`CSV parse failed: ${err.message}`);
      },
    });
  }

  function downloadSampleCsv() {
    const csvContent =
      'broker,asset_type,symbol,isin,exchange,asset_name,quantity,average_buy_price,as_of_date\n' +
      'Groww,equity,ICICIBANK,INE090A01021,NSE,ICICI Bank Ltd,100,1200,2026-10-09\n' +
      'Zerodha,equity,RELIANCE,INE002A01018,NSE,Reliance Industries Ltd,45,2480,2026-10-09\n' +
      'Groww,reit,EMBASSY,INE041025011,NSE,Embassy Office Parks REIT,300,340,2026-10-09\n' +
      'Zerodha,invit,PGINVIT,INE0CW523019,NSE,PowerGrid InvIT,800,105,2026-10-09\n' +
      'CDSL,bond,GS2033_718,IN0020330030,NSE,7.18% GS 2033 Sovereign Bond,100,101.5,2026-10-09\n' +
      'Groww,mf,NIFTYBEES,INF204KB14I2,NSE,Nippon India ETF Nifty BeES,250,265,2026-10-09\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'finova_holdings_sample.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="page-container space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'rgb(var(--foreground))' }}>
            Unified Portfolio Holdings
          </h1>
          <p className="text-sm mt-1" style={{ color: 'rgb(var(--muted))' }}>
            All your investments across brokers, depositories and asset classes in one place
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            id="btn-refresh-quotes"
            disabled={isRefreshingQuotes || isLoading}
            onClick={async () => {
              setIsRefreshingQuotes(true);
              try {
                await Promise.all([
                  queryClient.invalidateQueries({ queryKey: ['holdings'] }),
                  queryClient.invalidateQueries({ queryKey: ['portfolio-summary'] }),
                ]);
              } finally {
                setTimeout(() => setIsRefreshingQuotes(false), 500);
              }
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 transition-colors shadow-sm disabled:opacity-50"
            title="Refresh dynamic quotes from market feed"
          >
            <RefreshCw className={`w-4 h-4 text-emerald-400 ${isRefreshingQuotes ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh Quotes</span>
          </button>
          <button
            id="btn-import-csv"
            onClick={() => {
              setCsvRows([]);
              setCsvError(null);
              if (brokers.length > 0 && !importBrokerId) setImportBrokerId(brokers[0].id);
              setShowImportModal(true);
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 transition-colors shadow-sm"
          >
            <Upload className="w-4 h-4 text-blue-400" />
            Import CSV
          </button>
          <button
            id="btn-add-holding"
            onClick={() => {
              if (brokers.length > 0) setForm((p) => ({ ...p, broker_account_id: brokers[0].id }));
              setShowAddModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white shadow-sm hover:opacity-95 transition-opacity"
            style={{ background: 'linear-gradient(135deg, rgb(var(--brand-600)), rgb(var(--brand-400)))' }}
          >
            <Plus className="w-4 h-4" />
            Add Investment
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4 space-y-1">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Invested</p>
          <p className="text-xl font-bold text-slate-100" title={formatCurrency(summaryMetrics.totalInvested, false)}>
            {formatCurrency(summaryMetrics.totalInvested, true)}
          </p>
          <p className="text-xs text-slate-500">Across {summaryMetrics.totalCount} total positions</p>
        </div>

        <div className="card p-4 space-y-1">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Current Valuation</p>
          <p className="text-xl font-bold text-slate-100" title={formatCurrency(summaryMetrics.totalCurrentVal, false)}>
            {formatCurrency(summaryMetrics.totalCurrentVal, true)}
          </p>
          <p className="text-[11px] text-slate-400 flex items-center gap-1">
            <Info className="w-3.5 h-3.5 text-blue-400" />
            {summaryMetrics.pricedCount} of {summaryMetrics.totalCount} assets priced
          </p>
        </div>

        <div className="card p-4 space-y-1">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Unrealized P&L</p>
          {summaryMetrics.totalPnL !== null ? (
            <div className="flex items-baseline gap-2">
              <span
                className={`text-xl font-bold ${summaryMetrics.totalPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}
                title={formatCurrency(summaryMetrics.totalPnL, false)}
              >
                {summaryMetrics.totalPnL >= 0 ? '+' : ''}{formatCurrency(summaryMetrics.totalPnL, true)}
              </span>
              {summaryMetrics.totalReturnPct !== null && (
                <PercentageBadge value={summaryMetrics.totalReturnPct} size="sm" />
              )}
            </div>
          ) : (
            <p className="text-sm font-semibold text-amber-400/90 pt-1">P&L unavailable</p>
          )}
          <p className="text-xs text-slate-500">Calculated from verified quotes</p>
        </div>

        <div className="card p-4 space-y-1">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Accounts & Coverage</p>
          <p className="text-xl font-bold text-slate-100">
            {brokers.length} {brokers.length === 1 ? 'Broker' : 'Brokers'}
          </p>
          <p className="text-xs text-slate-500">Manual Demat & Depositories</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        {TAB_CATEGORIES.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Search, Filter & Sort Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by symbol, company name, or ISIN…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg text-sm bg-slate-900 border border-slate-800 text-slate-200 focus:outline-none focus:border-blue-500"
          />
        </div>

        <select
          value={selectedBrokerFilter}
          onChange={(e) => setSelectedBrokerFilter(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm bg-slate-900 border border-slate-800 text-slate-300 focus:outline-none focus:border-blue-500"
        >
          <option value="">All Brokers</option>
          {brokers.map((b) => (
            <option key={b.id} value={b.id}>
              {b.display_name || b.broker_name}
            </option>
          ))}
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'value' | 'invested' | 'return' | 'name')}
          className="px-3 py-2 rounded-lg text-sm bg-slate-900 border border-slate-800 text-slate-300 focus:outline-none focus:border-blue-500"
        >
          <option value="value">Sort by Value</option>
          <option value="invested">Sort by Invested</option>
          <option value="return">Sort by Returns %</option>
          <option value="name">Sort by Name</option>
        </select>
      </div>

      {/* Content Table / Empty States */}
      {isLoading ? (
        <SkeletonTable rows={5} />
      ) : holdings.length === 0 ? (
        <EmptyState
          icon={<Building2 className="w-10 h-10" style={{ color: 'rgb(var(--brand-500))' }} />}
          title="Your unified portfolio starts here."
          description="Add your first investment or import your holdings to begin tracking your portfolio."
          action={
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  if (brokers.length > 0) setForm((p) => ({ ...p, broker_account_id: brokers[0].id }));
                  setShowAddModal(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white shadow-sm"
                style={{ background: 'linear-gradient(135deg, rgb(var(--brand-600)), rgb(var(--brand-400)))' }}
              >
                <Plus className="w-4 h-4" />
                Add Investment
              </button>
              <button
                onClick={() => {
                  setCsvRows([]);
                  setShowImportModal(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border border-slate-700 bg-slate-800 text-slate-200"
              >
                <Upload className="w-4 h-4 text-blue-400" />
                Import CSV
              </button>
            </div>
          }
        />
      ) : filteredHoldings.length === 0 ? (
        <div className="card p-8 text-center space-y-2">
          <Filter className="w-8 h-8 text-slate-500 mx-auto" />
          <p className="font-semibold text-slate-300">No matching investments found</p>
          <p className="text-xs text-slate-500">Try adjusting your search query, broker filter, or category tab.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-900/80 border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Asset & Symbol</th>
                  <th className="px-4 py-3">Broker</th>
                  <th className="px-4 py-3 text-right">Quantity</th>
                  <th className="px-4 py-3 text-right">Avg Buy Price</th>
                  <th className="px-4 py-3 text-right">Current Price</th>
                  <th className="px-4 py-3 text-right">Invested Value</th>
                  <th className="px-4 py-3 text-right">Current Value</th>
                  <th className="px-4 py-3 text-right">P&L / Return</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredHoldings.map((h) => {
                  const hasPrice = h.current_price !== null && typeof h.current_price === 'number';
                  const returnPct = h.absolute_return_pct;
                  const isPositive = (h.absolute_return ?? 0) >= 0;

                  return (
                    <tr key={h.id} className="hover:bg-slate-850/50 transition-colors group">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider"
                            style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#60A5FA' }}
                          >
                            {h.asset_class}
                          </span>
                          <div>
                            <p className="font-semibold text-slate-100">{h.name}</p>
                            <p className="text-xs text-slate-500 font-mono">{h.symbol} • {h.exchange || 'NSE'}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="text-xs px-2 py-0.5 rounded-full border border-slate-700 bg-slate-800 text-slate-300">
                          {h.broker_account?.display_name || h.broker_account?.broker_name || 'Manual'}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-right font-mono font-medium text-slate-200">
                        {h.quantity}
                      </td>

                      <td className="px-4 py-3.5 text-right font-mono text-slate-300">
                        {formatCurrency(h.avg_buy_price)}
                      </td>

                      <td className="px-4 py-3.5 text-right font-mono">
                        {hasPrice ? (
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-slate-100 font-semibold">{formatCurrency(h.current_price!)}</span>
                            <div className="flex items-center gap-1.5 flex-wrap justify-end">
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded font-sans font-semibold tracking-wide ${
                                  h.price_status === 'REALTIME'
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                    : h.price_status === 'DELAYED'
                                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                    : h.price_status === 'EOD'
                                    ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                }`}
                              >
                                {h.price_status || 'DELAYED'}
                              </span>
                              <span className="text-[10px] text-slate-400 font-sans">
                                {h.price_source || 'Yahoo Finance'}
                              </span>
                            </div>
                            {h.price_updated_at && (
                              <span className="text-[9px] text-slate-500 font-sans" title={h.price_updated_at}>
                                {new Date(h.price_updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col items-end gap-0.5">
                            <span className="text-[11px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-sans font-medium">
                              Price unavailable
                            </span>
                            <span className="text-[9px] text-slate-500 font-sans">
                              Feed unquoted or stale
                            </span>
                          </div>
                        )}
                      </td>

                      <td
                        className="px-4 py-3.5 text-right font-mono text-slate-300 font-medium"
                        title={formatCurrency(h.invested_value, false)}
                      >
                        {formatCurrency(h.invested_value, true)}
                      </td>

                      <td
                        className="px-4 py-3.5 text-right font-mono font-semibold text-slate-100"
                        title={hasPrice ? formatCurrency(h.current_value || h.invested_value, false) : 'Valuation unavailable'}
                      >
                        {hasPrice ? (
                          formatCurrency(h.current_value || h.invested_value, true)
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-right font-mono">
                        {hasPrice && h.absolute_return !== null ? (
                          <div className="flex flex-col items-end">
                            <span
                              className={`text-xs font-semibold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}
                              title={formatCurrency(h.absolute_return, false)}
                            >
                              {isPositive ? '+' : ''}{formatCurrency(h.absolute_return, true)}
                            </span>
                            {returnPct !== null && (
                              <PercentageBadge value={returnPct} size="sm" />
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                            P&L unavailable
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            title="Edit Holding"
                            onClick={() => setEditingHolding(h)}
                            className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            title="Delete Holding"
                            onClick={() => setDeletingHolding(h)}
                            className="p-1.5 rounded-md hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Investment Modal */}
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
              className="relative w-full max-w-lg card p-6 shadow-2xl border border-slate-700 bg-slate-900 z-10 space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-blue-400" />
                  Add Investment Position
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
                  addMutation.mutate({
                    ...form,
                    quantity: Number(form.quantity),
                    avg_buy_price: Number(form.avg_buy_price),
                  });
                }}
                className="space-y-4 text-xs"
              >
                {/* Broker Account Selection */}
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">
                    Broker / Depository Account *
                  </label>
                  <select
                    value={form.broker_account_id}
                    onChange={(e) => setForm((p) => ({ ...p, broker_account_id: e.target.value }))}
                    required
                    className="w-full px-3 py-2.5 rounded-lg text-sm bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    {brokers.length === 0 && <option value="">No broker accounts (create one first)</option>}
                    {brokers.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.display_name || b.broker_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Asset Category */}
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">
                    Asset Class *
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { val: 'equity', lbl: 'Stock' },
                      { val: 'mf', lbl: 'Mutual Fund' },
                      { val: 'reit', lbl: 'REIT' },
                      { val: 'invit', lbl: 'InvIT' },
                      { val: 'bond', lbl: 'Bond' },
                    ].map((item) => (
                      <button
                        type="button"
                        key={item.val}
                        onClick={() => setForm((p) => ({ ...p, asset_class: item.val as AssetClass }))}
                        className={`py-2 px-3 rounded-lg font-medium border text-center transition-colors ${
                          form.asset_class === item.val
                            ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {item.lbl}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quick Catalog Autocomplete */}
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">
                    Pick from Verified Catalog or Enter Custom
                  </label>
                  <input
                    type="text"
                    placeholder="Search verified catalog (e.g. ICICIBANK, RELIANCE, EMBASSY, PGINVIT)..."
                    value={catalogQuery}
                    onChange={(e) => {
                      const q = e.target.value;
                      setCatalogQuery(q);
                      const matched = GLOBAL_SEED_INSTRUMENTS.find(
                        (i) => i.symbol.toLowerCase() === q.toLowerCase()
                      );
                      if (matched) {
                        setForm((prev) => ({
                          ...prev,
                          symbol: matched.symbol,
                          name: matched.instrument_name,
                          isin: matched.isin || '',
                          exchange: matched.exchange || 'NSE',
                        }));
                      }
                    }}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                  {catalogQuery.trim() && (
                    <div className="max-h-28 overflow-y-auto rounded border border-slate-700 bg-slate-850 divide-y divide-slate-800">
                      {GLOBAL_SEED_INSTRUMENTS.filter(
                        (i) =>
                          i.symbol.toLowerCase().includes(catalogQuery.toLowerCase()) ||
                          i.instrument_name.toLowerCase().includes(catalogQuery.toLowerCase())
                      ).map((inst) => (
                        <div
                          key={inst.id}
                          onClick={() => {
                            let mappedClass: AssetClass = 'equity';
                            if (inst.asset_type === 'STOCK') mappedClass = 'equity';
                            else if (inst.asset_type === 'MUTUAL_FUND') mappedClass = 'mf';
                            else if (inst.asset_type === 'REIT') mappedClass = 'reit';
                            else if (inst.asset_type === 'INVIT') mappedClass = 'invit';
                            else if (inst.asset_type === 'BOND') mappedClass = 'bond';

                            setForm((p) => ({
                              ...p,
                              symbol: inst.symbol,
                              name: inst.instrument_name,
                              asset_class: mappedClass,
                              exchange: inst.exchange || 'NSE',
                              isin: inst.isin || '',
                            }));
                            setCatalogQuery(inst.symbol);
                          }}
                          className="px-3 py-1.5 hover:bg-slate-750 cursor-pointer flex justify-between items-center"
                        >
                          <span className="font-semibold text-slate-200">{inst.symbol}</span>
                          <span className="text-[11px] text-slate-400 truncate max-w-[200px]">{inst.instrument_name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Symbol & Name */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-300">Ticker Symbol *</label>
                    <input
                      type="text"
                      placeholder="e.g. ICICIBANK"
                      value={form.symbol}
                      onChange={(e) => setForm((p) => ({ ...p, symbol: e.target.value.toUpperCase() }))}
                      required
                      className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 font-mono uppercase focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-300">Instrument Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. ICICI Bank Ltd"
                      value={form.name}
                      onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                      required
                      className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Quantity & Price */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-300">Quantity / Units *</label>
                    <input
                      type="number"
                      step="any"
                      min="0.000001"
                      placeholder="100"
                      value={form.quantity}
                      onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))}
                      required
                      className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-300">Avg Purchase Price (₹) *</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="1200"
                      value={form.avg_buy_price}
                      onChange={(e) => setForm((p) => ({ ...p, avg_buy_price: e.target.value }))}
                      required
                      className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Live Invested Calculation */}
                {Number(form.quantity) > 0 && Number(form.avg_buy_price) >= 0 && (
                  <div className="p-2.5 rounded-lg bg-blue-950/30 border border-blue-900/40 text-blue-300 flex justify-between items-center font-mono">
                    <span>Invested Amount:</span>
                    <strong className="text-sm text-blue-200">
                      {formatCurrency(Number(form.quantity) * Number(form.avg_buy_price), true)}
                    </strong>
                  </div>
                )}

                <div className="pt-2 flex justify-end gap-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 rounded-lg font-medium border border-slate-700 text-slate-300 hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addMutation.isPending}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-lg font-medium text-white shadow-sm"
                    style={{ background: 'linear-gradient(135deg, rgb(var(--brand-600)), rgb(var(--brand-400)))' }}
                  >
                    {addMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                    Save Holding
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Holding Modal */}
      <AnimatePresence>
        {editingHolding && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setEditingHolding(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="relative w-full max-w-md card p-6 shadow-2xl border border-slate-700 bg-slate-900 z-10 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-100">Edit Position</h2>
                  <p className="text-xs text-slate-400 font-mono">{editingHolding.symbol} • {editingHolding.name}</p>
                </div>
                <button
                  onClick={() => setEditingHolding(null)}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const target = e.currentTarget;
                  const qty = parseFloat((target.elements.namedItem('quantity') as HTMLInputElement).value);
                  const price = parseFloat((target.elements.namedItem('avg_buy_price') as HTMLInputElement).value);
                  editMutation.mutate({
                    id: editingHolding.id,
                    quantity: qty,
                    avg_buy_price: price,
                  });
                }}
                className="space-y-4 text-xs"
              >
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Quantity / Units *</label>
                  <input
                    name="quantity"
                    type="number"
                    step="any"
                    min="0.000001"
                    defaultValue={editingHolding.quantity}
                    required
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Average Purchase Price (₹) *</label>
                  <input
                    name="avg_buy_price"
                    type="number"
                    step="any"
                    min="0"
                    defaultValue={editingHolding.avg_buy_price}
                    required
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEditingHolding(null)}
                    className="px-4 py-2 rounded-lg font-medium border border-slate-700 text-slate-300 hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editMutation.isPending}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-500 shadow-sm"
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
        {deletingHolding && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setDeletingHolding(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="relative w-full max-w-md card p-6 shadow-2xl border border-red-500/30 bg-slate-900 z-10 space-y-4"
            >
              <div className="flex items-center gap-3 text-red-400">
                <AlertCircle className="w-6 h-6 flex-shrink-0" />
                <h3 className="text-lg font-bold">Delete Investment Holding?</h3>
              </div>

              <p className="text-sm text-slate-300 leading-relaxed">
                Are you sure you want to delete your position in{' '}
                <strong className="text-white">{deletingHolding.name} ({deletingHolding.symbol})</strong>?
                This will remove the position and update your portfolio valuation immediately.
              </p>

              <div className="pt-3 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDeletingHolding(null)}
                  className="px-4 py-2 rounded-lg text-sm font-medium border border-slate-700 text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate(deletingHolding.id)}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-500 shadow-sm"
                >
                  {deleteMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Delete Position
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CSV Import Modal */}
      <AnimatePresence>
        {showImportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowImportModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              className="relative w-full max-w-2xl card p-6 shadow-2xl border border-slate-700 bg-slate-900 z-10 space-y-5 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                    <Upload className="w-5 h-5 text-blue-400" />
                    CSV Portfolio Import
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Select broker → Upload CSV → Validate & Preview → Import
                  </p>
                </div>
                <button
                  onClick={() => setShowImportModal(false)}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Target Broker & Duplicate Mode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Target Broker Account *</label>
                  <select
                    value={importBrokerId}
                    onChange={(e) => setImportBrokerId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    {brokers.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.display_name || b.broker_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Duplicate Handling Strategy</label>
                  <select
                    value={duplicateMode}
                    onChange={(e) => setDuplicateMode(e.target.value as 'replace' | 'update' | 'skip')}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="replace">Replace Existing Position (Recommended)</option>
                    <option value="update">Update / Add to Position</option>
                    <option value="skip">Skip if Already Exists</option>
                  </select>
                </div>
              </div>

              {/* Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-blue-500/60 rounded-xl p-6 text-center cursor-pointer transition-colors bg-slate-850/40"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleCsvUpload}
                  className="hidden"
                />
                <FileText className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-200">
                  Click to select a CSV file or drag and drop
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Supported format: broker, asset_type, symbol, isin, exchange, quantity, average_buy_price
                </p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadSampleCsv();
                  }}
                  className="mt-3 text-xs text-blue-400 hover:underline inline-flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Sample CSV Template
                </button>
              </div>

              {csvError && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{csvError}</span>
                </div>
              )}

              {/* Import Preview */}
              {csvRows.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-300">
                      Import Preview: {csvRows.length} Rows Parsed
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {csvRows.filter((r) => r.isValid).length} Valid
                      </span>
                      {csvRows.filter((r) => !r.isValid).length > 0 && (
                        <span className="text-rose-400 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          {csvRows.filter((r) => !r.isValid).length} Errors
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950 divide-y divide-slate-850 text-xs font-mono">
                    {csvRows.map((r) => (
                      <div key={r.rowNumber} className="p-2.5 flex items-center justify-between hover:bg-slate-900">
                        <div className="flex items-center gap-2">
                          <span className={r.isValid ? 'text-emerald-400' : 'text-rose-400'}>
                            {r.isValid ? '✓' : '✗'}
                          </span>
                          <strong className="text-slate-200">{r.symbol}</strong>
                          <span className="text-slate-500">Qty: {r.quantity}</span>
                          <span className="text-slate-500">Price: ₹{r.avg_buy_price}</span>
                        </div>
                        {r.isValid ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Valid
                          </span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            {r.errors.join(', ')}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="pt-2 flex justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium border border-slate-700 text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={importMutation.isPending || csvRows.filter((r) => r.isValid).length === 0}
                  onClick={() => {
                    const validItems = csvRows.filter((r) => r.isValid).map((r) => ({
                      symbol: r.symbol,
                      name: r.name,
                      asset_class: r.asset_class,
                      exchange: r.exchange,
                      quantity: r.quantity,
                      avg_buy_price: r.avg_buy_price,
                      broker_account_id: importBrokerId,
                      isin: r.isin,
                    }));

                    importMutation.mutate({
                      holdings: validItems,
                      duplicate_mode: duplicateMode,
                      broker_account_id: importBrokerId,
                    });
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium text-white shadow-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-50"
                >
                  {importMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Confirm Import ({csvRows.filter((r) => r.isValid).length} Holdings)
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
