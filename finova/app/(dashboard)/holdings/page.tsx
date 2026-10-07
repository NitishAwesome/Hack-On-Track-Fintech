'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import Papa from 'papaparse';
import {
  Plus, Upload, Search, Filter, X, Loader2,
  TrendingUp, TrendingDown, LineChart, Trash2,
  Download, Eye, Building2, Shield, Info, CheckCircle
} from 'lucide-react';
import { PercentageBadge } from '@/components/shared/PercentageBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { SkeletonTable } from '@/components/shared/Skeletons';
import { formatCurrency, ASSET_CLASS_LABELS } from '@/lib/utils';
import type { HoldingWithMetrics, AssetClass, BrokerAccount } from '@/types/portfolio';

const ASSET_CLASSES: AssetClass[] = ['equity', 'reit', 'invit', 'bond', 'sgb', 'etf', 'mf'];

const ASSET_CLASS_EXPLANATIONS: Record<string, string> = {
  equity: 'Equity represents shares of ownership in listed companies. Generates returns through stock price appreciation and corporate dividend distributions.',
  reit: 'Real Estate Investment Trusts (REITs) own commercial properties. Mandated by SEBI to distribute at least 90% of net cash flows as regular quarterly dividends.',
  invit: 'Infrastructure Investment Trusts (InvITs) own long-term infrastructure assets like power grids and national highways. Generates high, predictable dividend cash flows.',
  bond: 'Bonds and Government Securities (G-Secs) represent fixed-income loans to sovereigns or corporations. They provide guaranteed periodic coupon payments and capital stability.',
  sgb: 'Sovereign Gold Bonds are government securities denominated in grams of gold. They offer 2.5% annual sovereign interest and tax-free capital gains at maturity.',
  etf: 'Exchange Traded Funds track indices like Nifty 50 or Sensex with minimal expense ratios and instant exchange liquidity.',
  mf: 'Mutual Funds pool capital managed by registered fund houses across equities, debt, and balanced asset classes.',
};

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

async function addHolding(data: Record<string, unknown>) {
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

async function bulkImportHoldings(holdings: unknown[]) {
  const res = await fetch('/api/portfolio/holdings/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ holdings }),
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
}

const EMPTY_FORM: AddHoldingForm = {
  symbol: '',
  name: '',
  asset_class: 'equity',
  exchange: 'NSE',
  quantity: '',
  avg_buy_price: '',
  broker_account_id: '',
};

interface ParsedCsvRow {
  symbol: string;
  name: string;
  asset_class: AssetClass;
  exchange: string;
  quantity: number;
  avg_buy_price: number;
}

export default function HoldingsPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedHolding, setSelectedHolding] = useState<HoldingWithMetrics | null>(null);

  const [search, setSearch] = useState('');
  const [filterClass, setFilterClass] = useState<AssetClass | ''>('');
  const [form, setForm] = useState<AddHoldingForm>(EMPTY_FORM);
  const [sortBy, setSortBy] = useState<'value' | 'return' | 'name'>('value');

  // CSV Import State
  const [csvPreview, setCsvPreview] = useState<ParsedCsvRow[]>([]);
  const [csvError, setCsvError] = useState<string | null>(null);

  const { data: holdingsData, isLoading } = useQuery({ queryKey: ['holdings'], queryFn: fetchHoldings });
  const { data: brokersData } = useQuery({ queryKey: ['brokers'], queryFn: fetchBrokers });

  const addMutation = useMutation({
    mutationFn: addHolding,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holdings'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-summary'] });
      setShowAddModal(false);
      setForm(EMPTY_FORM);
    },
  });

  const importMutation = useMutation({
    mutationFn: bulkImportHoldings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holdings'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-summary'] });
      setShowImportModal(false);
      setCsvPreview([]);
      setCsvError(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteHoldingApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holdings'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-summary'] });
      if (selectedHolding) setSelectedHolding(null);
    },
  });

  const holdings: HoldingWithMetrics[] = holdingsData?.holdings ?? [];
  const brokers: BrokerAccount[] = brokersData?.brokers ?? [];

  const filtered = holdings
    .filter((h) => {
      const matchSearch =
        !search ||
        h.name.toLowerCase().includes(search.toLowerCase()) ||
        h.symbol.toLowerCase().includes(search.toLowerCase());
      const matchClass = !filterClass || h.asset_class === filterClass;
      return matchSearch && matchClass;
    })
    .sort((a, b) => {
      if (sortBy === 'value') return b.current_value - a.current_value;
      if (sortBy === 'return') return b.absolute_return_pct - a.absolute_return_pct;
      return a.name.localeCompare(b.name);
    });

  function handleFormChange(key: keyof AddHoldingForm, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    addMutation.mutate({
      ...form,
      quantity: Number(form.quantity),
      avg_buy_price: Number(form.avg_buy_price),
      broker_account_id: form.broker_account_id || null,
    });
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvError(null);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (!results.data || results.data.length === 0) {
          setCsvError('The uploaded CSV file is empty.');
          return;
        }

        const parsedRows: ParsedCsvRow[] = [];
        for (const row of results.data) {
          // Normalize case-insensitive keys
          const keys = Object.keys(row);
          const findKey = (name: string) => keys.find((k) => k.trim().toLowerCase() === name.toLowerCase());

          const symbolKey = findKey('symbol') || findKey('ticker') || findKey('scrip');
          const nameKey = findKey('name') || findKey('company') || findKey('instrument');
          const qtyKey = findKey('quantity') || findKey('qty') || findKey('units');
          const priceKey = findKey('avg buy price') || findKey('avg cost') || findKey('price') || findKey('avg_buy_price');
          const assetClassKey = findKey('asset class') || findKey('type') || findKey('asset_class');
          const exchangeKey = findKey('exchange') || findKey('market');

          const symbol = symbolKey ? (row[symbolKey] || '').toUpperCase().trim() : '';
          if (!symbol) continue;

          const rawClass = assetClassKey ? (row[assetClassKey] || '').toLowerCase().trim() : 'equity';
          const assetClass: AssetClass = ASSET_CLASSES.includes(rawClass as AssetClass) ? (rawClass as AssetClass) : 'equity';

          parsedRows.push({
            symbol,
            name: nameKey && row[nameKey] ? row[nameKey].trim() : symbol,
            asset_class: assetClass,
            exchange: exchangeKey && row[exchangeKey] ? row[exchangeKey].toUpperCase().trim() : 'NSE',
            quantity: qtyKey ? Math.max(0.001, parseFloat(row[qtyKey]) || 1) : 1,
            avg_buy_price: priceKey ? Math.max(0.01, parseFloat(row[priceKey]) || 100) : 100,
          });
        }

        if (parsedRows.length === 0) {
          setCsvError('Could not find valid holding rows. Required columns: Symbol, Quantity, Avg Buy Price');
        } else {
          setCsvPreview(parsedRows);
        }
      },
      error: (err) => {
        setCsvError(`CSV Parse Error: ${err.message}`);
      },
    });
  }

  function downloadSampleCsv() {
    const csvContent =
      'Symbol,Name,Asset Class,Exchange,Quantity,Avg Buy Price\n' +
      'RELIANCE,Reliance Industries Ltd,equity,NSE,50,2480\n' +
      'INFY,Infosys Technologies Ltd,equity,NSE,40,1490\n' +
      'EMBASSY,Embassy Office Parks REIT,reit,NSE,350,340\n' +
      'PGINVIT,PowerGrid Infrastructure InvIT,invit,NSE,600,105\n' +
      '726GS2033,7.26% GS 2033 Govt Bond,bond,NSE,100,101.5\n' +
      'SGB2028,Sovereign Gold Bond 2028-IV,sgb,NSE,15,5300\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'finova_sample_holdings.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="page-container space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'rgb(var(--foreground))' }}>
            Holdings
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'rgb(var(--muted))' }}>
            {holdings.length} holding{holdings.length !== 1 ? 's' : ''} across all connected brokers & depositories
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            id="btn-import-csv"
            onClick={() => {
              setCsvPreview([]);
              setCsvError(null);
              setShowImportModal(true);
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              backgroundColor: 'rgb(var(--surface-raised))',
              border: '1px solid rgb(var(--border))',
              color: 'rgb(var(--foreground))',
            }}
          >
            <Upload className="w-4 h-4" />
            Import CSV
          </button>
          <button
            id="btn-add-holding"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ background: 'linear-gradient(135deg, rgb(var(--brand-600)), rgb(var(--brand-400)))' }}
          >
            <Plus className="w-4 h-4" />
            Add Holding
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: 'rgb(var(--muted))' }}
          />
          <input
            type="text"
            placeholder="Search by name or symbol…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg text-sm focus:outline-none"
            style={{
              backgroundColor: 'rgb(var(--surface))',
              border: '1px solid rgb(var(--border))',
              color: 'rgb(var(--foreground))',
            }}
          />
        </div>
        <select
          value={filterClass}
          onChange={(e) => setFilterClass(e.target.value as AssetClass | '')}
          className="px-3 py-2 rounded-lg text-sm focus:outline-none"
          style={{
            backgroundColor: 'rgb(var(--surface))',
            border: '1px solid rgb(var(--border))',
            color: 'rgb(var(--foreground))',
          }}
        >
          <option value="">All Asset Classes</option>
          {ASSET_CLASSES.map((c) => (
            <option key={c} value={c}>{ASSET_CLASS_LABELS[c]}</option>
          ))}
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="px-3 py-2 rounded-lg text-sm focus:outline-none"
          style={{
            backgroundColor: 'rgb(var(--surface))',
            border: '1px solid rgb(var(--border))',
            color: 'rgb(var(--foreground))',
          }}
        >
          <option value="value">Sort: Value</option>
          <option value="return">Sort: Return %</option>
          <option value="name">Sort: Name</option>
        </select>
      </div>

      {/* Holdings Table */}
      {isLoading ? (
        <SkeletonTable rows={6} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<LineChart className="w-8 h-8" style={{ color: 'rgb(var(--brand-500))' }} />}
          title={holdings.length === 0 ? 'No holdings yet' : 'No results found'}
          description={
            holdings.length === 0
              ? 'Add your first holding manually or import a CAS/CSV statement to start tracking your unified portfolio.'
              : 'Try adjusting your search or asset class filter.'
          }
          action={
            holdings.length === 0 ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowAddModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white"
                  style={{ background: 'linear-gradient(135deg, rgb(var(--brand-600)), rgb(var(--brand-400)))' }}
                >
                  <Plus className="w-4 h-4" />
                  Add holding
                </button>
                <button
                  onClick={() => setShowImportModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium"
                  style={{
                    backgroundColor: 'rgb(var(--surface-raised))',
                    border: '1px solid rgb(var(--border))',
                    color: 'rgb(var(--foreground))',
                  }}
                >
                  <Upload className="w-4 h-4" />
                  Import CSV
                </button>
              </div>
            ) : undefined
          }
        />
      ) : (
        <div className="card overflow-hidden">
          {/* Table Header */}
          <div
            className="hidden md:grid grid-cols-12 gap-2 px-4 py-2.5 text-xs font-medium border-b"
            style={{
              color: 'rgb(var(--muted))',
              borderColor: 'rgb(var(--border))',
              backgroundColor: 'rgb(var(--surface-raised))',
            }}
          >
            <div className="col-span-4">Asset / Instrument</div>
            <div className="col-span-1 text-right">Qty</div>
            <div className="col-span-2 text-right">Avg Buy</div>
            <div className="col-span-2 text-right">Curr Value</div>
            <div className="col-span-2 text-right">Return</div>
            <div className="col-span-1 text-right">Actions</div>
          </div>

          <div className="divide-y" style={{ borderColor: 'rgb(var(--border))' }}>
            {filtered.map((h, i) => (
              <motion.div
                key={h.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.02 }}
                className="grid grid-cols-12 gap-2 px-4 py-3 items-center transition-colors cursor-pointer"
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'rgb(var(--surface-raised))';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = '';
                }}
                onClick={() => setSelectedHolding(h)}
              >
                {/* Name + badges */}
                <div className="col-span-6 md:col-span-4 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'rgb(var(--foreground))' }}>
                        {h.name}
                      </p>
                      <div className="flex items-center flex-wrap gap-1.5 mt-0.5">
                        <span
                          className="text-xs px-1.5 py-0.5 rounded font-mono font-medium"
                          style={{
                            backgroundColor: 'rgb(var(--brand-500) / 0.12)',
                            color: 'rgb(var(--brand-500))',
                          }}
                        >
                          {h.symbol}
                        </span>
                        <span
                          className="text-xs px-1.5 py-0.5 rounded uppercase font-semibold text-[10px]"
                          style={{
                            backgroundColor: 'rgb(var(--surface-raised))',
                            border: '1px solid rgb(var(--border))',
                            color: 'rgb(var(--muted))',
                          }}
                        >
                          {h.asset_class}
                        </span>
                        {h.broker_account && (
                          <span
                            className="text-xs px-1.5 py-0.5 rounded font-medium text-[11px]"
                            style={{
                              backgroundColor: `${h.broker_account.color_hex}22`,
                              color: h.broker_account.color_hex,
                            }}
                          >
                            {h.broker_account.broker_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Qty */}
                <div className="col-span-1 text-right text-sm hidden md:block" style={{ color: 'rgb(var(--muted))' }}>
                  {h.quantity}
                </div>

                {/* Avg Buy */}
                <div className="col-span-2 text-right text-sm hidden md:block" style={{ color: 'rgb(var(--muted))' }}>
                  {formatCurrency(h.avg_buy_price)}
                </div>

                {/* Current Value */}
                <div className="col-span-3 md:col-span-2 text-right">
                  <p className="text-sm font-medium" style={{ color: 'rgb(var(--foreground))' }}>
                    {formatCurrency(h.current_value, true)}
                  </p>
                  <p className="text-xs hidden md:block" style={{ color: 'rgb(var(--muted))' }}>
                    {formatCurrency(h.current_price ?? h.avg_buy_price)} ea.
                  </p>
                </div>

                {/* Return */}
                <div className="col-span-3 md:col-span-2 text-right">
                  <div className="flex flex-col items-end">
                    <p
                      className="text-sm font-medium"
                      style={{
                        color: h.absolute_return >= 0 ? 'rgb(var(--gain))' : 'rgb(var(--loss))',
                      }}
                    >
                      {h.absolute_return >= 0 ? '+' : ''}
                      {formatCurrency(h.absolute_return, true)}
                    </p>
                    <div className="mt-0.5">
                      <PercentageBadge value={h.absolute_return_pct} size="sm" />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div
                  className="col-span-1 text-right hidden md:flex items-center justify-end gap-1.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    title="View Details"
                    onClick={() => setSelectedHolding(h)}
                    className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    style={{ color: 'rgb(var(--muted))' }}
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button
                    title="Delete holding"
                    onClick={() => {
                      if (confirm(`Remove ${h.symbol} from your portfolio?`)) {
                        deleteMutation.mutate(h.id);
                      }
                    }}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
                    style={{ color: 'rgb(var(--loss))' }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Holding Detail Inspection Modal */}
      <AnimatePresence>
        {selectedHolding && (
          <>
            <motion.div
              key="detail-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
              onClick={() => setSelectedHolding(null)}
            />
            <motion.div
              key="detail-modal"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 card p-6 mx-auto max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-start justify-between pb-4 border-b" style={{ borderColor: 'rgb(var(--border))' }}>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold" style={{ color: 'rgb(var(--foreground))' }}>
                      {selectedHolding.name}
                    </h2>
                    <span
                      className="text-xs px-2 py-0.5 rounded font-mono font-bold"
                      style={{ backgroundColor: 'rgb(var(--brand-500) / 0.15)', color: 'rgb(var(--brand-500))' }}
                    >
                      {selectedHolding.symbol}
                    </span>
                  </div>
                  <p className="text-xs mt-1" style={{ color: 'rgb(var(--muted))' }}>
                    Listed on {selectedHolding.exchange || 'NSE'} · Asset Class: <strong className="capitalize">{ASSET_CLASS_LABELS[selectedHolding.asset_class]}</strong>
                  </p>
                </div>
                <button onClick={() => setSelectedHolding(null)} style={{ color: 'rgb(var(--muted))' }}>
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-3 my-4">
                <div className="card p-3 bg-opacity-40" style={{ backgroundColor: 'rgb(var(--surface-raised))' }}>
                  <p className="text-xs" style={{ color: 'rgb(var(--muted))' }}>Current Value</p>
                  <p className="text-lg font-bold mt-0.5" style={{ color: 'rgb(var(--foreground))' }}>
                    {formatCurrency(selectedHolding.current_value, true)}
                  </p>
                </div>
                <div className="card p-3 bg-opacity-40" style={{ backgroundColor: 'rgb(var(--surface-raised))' }}>
                  <p className="text-xs" style={{ color: 'rgb(var(--muted))' }}>Total Invested</p>
                  <p className="text-lg font-bold mt-0.5" style={{ color: 'rgb(var(--foreground))' }}>
                    {formatCurrency(selectedHolding.invested_value, true)}
                  </p>
                </div>
                <div className="card p-3 bg-opacity-40" style={{ backgroundColor: 'rgb(var(--surface-raised))' }}>
                  <p className="text-xs" style={{ color: 'rgb(var(--muted))' }}>Absolute P&L</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p
                      className="text-lg font-bold"
                      style={{ color: selectedHolding.absolute_return >= 0 ? 'rgb(var(--gain))' : 'rgb(var(--loss))' }}
                    >
                      {selectedHolding.absolute_return >= 0 ? '+' : ''}
                      {formatCurrency(selectedHolding.absolute_return, true)}
                    </p>
                    <PercentageBadge value={selectedHolding.absolute_return_pct} size="sm" />
                  </div>
                </div>
                <div className="card p-3 bg-opacity-40" style={{ backgroundColor: 'rgb(var(--surface-raised))' }}>
                  <p className="text-xs" style={{ color: 'rgb(var(--muted))' }}>Quantity & Cost</p>
                  <p className="text-sm font-medium mt-0.5" style={{ color: 'rgb(var(--foreground))' }}>
                    {selectedHolding.quantity} units @ {formatCurrency(selectedHolding.avg_buy_price)}
                  </p>
                </div>
              </div>

              {/* Asset Class Financial Education */}
              <div
                className="p-3.5 rounded-xl border text-xs space-y-1.5"
                style={{
                  backgroundColor: 'rgb(var(--surface-raised))',
                  borderColor: 'rgb(var(--border))',
                }}
              >
                <div className="flex items-center gap-1.5 font-semibold" style={{ color: 'rgb(var(--brand-500))' }}>
                  <Info className="w-4 h-4" />
                  About {ASSET_CLASS_LABELS[selectedHolding.asset_class]} in India:
                </div>
                <p style={{ color: 'rgb(var(--muted))', lineHeight: 1.5 }}>
                  {ASSET_CLASS_EXPLANATIONS[selectedHolding.asset_class] || ASSET_CLASS_EXPLANATIONS.equity}
                </p>
              </div>

              {/* Broker representation */}
              {selectedHolding.broker_account && (
                <div className="mt-3 flex items-center justify-between p-3 rounded-lg border text-xs" style={{ borderColor: 'rgb(var(--border))' }}>
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" style={{ color: selectedHolding.broker_account.color_hex }} />
                    <span style={{ color: 'rgb(var(--foreground))' }}>
                      Held in <strong>{selectedHolding.broker_account.broker_name}</strong>
                      {selectedHolding.broker_account.account_label ? ` (${selectedHolding.broker_account.account_label})` : ''}
                    </span>
                  </div>
                  <span
                    className="px-2 py-0.5 rounded text-[10px] uppercase font-bold"
                    style={{
                      backgroundColor: `${selectedHolding.broker_account.color_hex}22`,
                      color: selectedHolding.broker_account.color_hex,
                    }}
                  >
                    {selectedHolding.broker_account.account_type}
                  </span>
                </div>
              )}

              {/* Modal footer */}
              <div className="mt-5 flex items-center justify-between pt-3 border-t" style={{ borderColor: 'rgb(var(--border))' }}>
                <button
                  onClick={() => {
                    if (confirm(`Remove ${selectedHolding.symbol} from your portfolio?`)) {
                      deleteMutation.mutate(selectedHolding.id);
                    }
                  }}
                  className="px-3 py-2 text-xs font-medium rounded-lg text-red-500 hover:bg-red-500/10 transition-colors flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Remove Holding
                </button>
                <button
                  onClick={() => setSelectedHolding(null)}
                  className="px-4 py-2 text-xs font-medium rounded-lg transition-colors"
                  style={{ backgroundColor: 'rgb(var(--surface-raised))', border: '1px solid rgb(var(--border))' }}
                >
                  Close
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* CSV Import Modal */}
      <AnimatePresence>
        {showImportModal && (
          <>
            <motion.div
              key="import-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowImportModal(false)}
            />
            <motion.div
              key="import-modal"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 card p-6 mx-auto max-w-xl shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'rgb(var(--border))' }}>
                <div className="flex items-center gap-2">
                  <Upload className="w-5 h-5" style={{ color: 'rgb(var(--brand-500))' }} />
                  <h2 className="text-lg font-semibold" style={{ color: 'rgb(var(--foreground))' }}>
                    Import Holdings from CSV
                  </h2>
                </div>
                <button onClick={() => setShowImportModal(false)} style={{ color: 'rgb(var(--muted))' }}>
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 my-4">
                <p className="text-xs" style={{ color: 'rgb(var(--muted))' }}>
                  Upload your Consolidated Account Statement (CAS) export or a CSV file with your stocks, REITs, InvITs, and bonds.
                </p>

                {/* Dropzone */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors hover:border-blue-500"
                  style={{
                    borderColor: 'rgb(var(--border))',
                    backgroundColor: 'rgb(var(--surface-raised))',
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <Upload className="w-8 h-8 mx-auto mb-2" style={{ color: 'rgb(var(--brand-500))' }} />
                  <p className="text-sm font-medium" style={{ color: 'rgb(var(--foreground))' }}>
                    Click to select CSV file
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'rgb(var(--muted))' }}>
                    Supports UTF-8 CSV exports from CDSL, NSDL, Zerodha, or Groww
                  </p>
                </div>

                {/* Template download link */}
                <div className="flex items-center justify-between text-xs">
                  <span style={{ color: 'rgb(var(--muted))' }}>Don&apos;t have a file ready?</span>
                  <button
                    type="button"
                    onClick={downloadSampleCsv}
                    className="inline-flex items-center gap-1 font-medium hover:underline"
                    style={{ color: 'rgb(var(--brand-500))' }}
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Sample CSV Template
                  </button>
                </div>

                {csvError && (
                  <div className="p-3 rounded-lg text-xs font-medium" style={{ backgroundColor: 'rgb(var(--loss) / 0.1)', color: 'rgb(var(--loss))' }}>
                    {csvError}
                  </div>
                )}

                {/* Preview Table */}
                {csvPreview.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold" style={{ color: 'rgb(var(--foreground))' }}>
                      Ready to Import ({csvPreview.length} instrument{csvPreview.length !== 1 ? 's' : ''}):
                    </p>
                    <div
                      className="max-h-48 overflow-y-auto rounded-lg border text-xs divide-y"
                      style={{ borderColor: 'rgb(var(--border))' }}
                    >
                      {csvPreview.map((row, idx) => (
                        <div key={idx} className="p-2 flex items-center justify-between bg-black/5 dark:bg-white/5">
                          <div>
                            <span className="font-mono font-bold mr-2">{row.symbol}</span>
                            <span className="text-[11px] opacity-80">{row.name}</span>
                          </div>
                          <div className="text-right">
                            <span className="capitalize px-1.5 py-0.5 rounded text-[10px] bg-blue-500/10 text-blue-500 mr-2">
                              {row.asset_class}
                            </span>
                            <span>{row.quantity} @ ₹{row.avg_buy_price}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal footer */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t" style={{ borderColor: 'rgb(var(--border))' }}>
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 text-sm font-medium rounded-lg"
                  style={{ backgroundColor: 'rgb(var(--surface-raised))', border: '1px solid rgb(var(--border))' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={csvPreview.length === 0 || importMutation.isPending}
                  onClick={() => importMutation.mutate(csvPreview)}
                  className="px-5 py-2 text-sm font-medium rounded-lg text-white disabled:opacity-50 flex items-center gap-2"
                  style={{ background: 'linear-gradient(135deg, rgb(var(--brand-600)), rgb(var(--brand-400)))' }}
                >
                  {importMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Importing…</>
                  ) : (
                    `Import ${csvPreview.length > 0 ? csvPreview.length : ''} Holdings`
                  )}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Add Holding Modal */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowAddModal(false)}
            />
            <motion.div
              key="modal"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 card p-6 mx-auto max-w-lg shadow-2xl"
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold" style={{ color: 'rgb(var(--foreground))' }}>
                  Add Holding
                </h2>
                <button onClick={() => setShowAddModal(false)} style={{ color: 'rgb(var(--muted))' }}>
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {/* Symbol */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium" style={{ color: 'rgb(var(--foreground))' }}>
                      Symbol / Ticker *
                    </label>
                    <input
                      type="text"
                      value={form.symbol}
                      onChange={(e) => handleFormChange('symbol', e.target.value.toUpperCase())}
                      placeholder="RELIANCE"
                      required
                      className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none font-mono"
                      style={{
                        backgroundColor: 'rgb(var(--surface-raised))',
                        border: '1px solid rgb(var(--border))',
                        color: 'rgb(var(--foreground))',
                      }}
                    />
                  </div>

                  {/* Asset Class */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium" style={{ color: 'rgb(var(--foreground))' }}>
                      Asset Class *
                    </label>
                    <select
                      value={form.asset_class}
                      onChange={(e) => handleFormChange('asset_class', e.target.value as AssetClass)}
                      required
                      className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
                      style={{
                        backgroundColor: 'rgb(var(--surface-raised))',
                        border: '1px solid rgb(var(--border))',
                        color: 'rgb(var(--foreground))',
                      }}
                    >
                      {ASSET_CLASSES.map((c) => (
                        <option key={c} value={c}>{ASSET_CLASS_LABELS[c]}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Name */}
                <div className="space-y-1">
                  <label className="text-xs font-medium" style={{ color: 'rgb(var(--foreground))' }}>
                    Company / Instrument Name *
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => handleFormChange('name', e.target.value)}
                    placeholder="Reliance Industries Ltd"
                    required
                    className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
                    style={{
                      backgroundColor: 'rgb(var(--surface-raised))',
                      border: '1px solid rgb(var(--border))',
                      color: 'rgb(var(--foreground))',
                    }}
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {/* Exchange */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium" style={{ color: 'rgb(var(--foreground))' }}>
                      Exchange
                    </label>
                    <select
                      value={form.exchange}
                      onChange={(e) => handleFormChange('exchange', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
                      style={{
                        backgroundColor: 'rgb(var(--surface-raised))',
                        border: '1px solid rgb(var(--border))',
                        color: 'rgb(var(--foreground))',
                      }}
                    >
                      <option value="NSE">NSE</option>
                      <option value="BSE">BSE</option>
                      <option value="NCD">NCD</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>

                  {/* Quantity */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium" style={{ color: 'rgb(var(--foreground))' }}>
                      Quantity *
                    </label>
                    <input
                      type="number"
                      min="0.001"
                      step="any"
                      value={form.quantity}
                      onChange={(e) => handleFormChange('quantity', e.target.value)}
                      placeholder="100"
                      required
                      className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
                      style={{
                        backgroundColor: 'rgb(var(--surface-raised))',
                        border: '1px solid rgb(var(--border))',
                        color: 'rgb(var(--foreground))',
                      }}
                    />
                  </div>

                  {/* Avg Buy Price */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium" style={{ color: 'rgb(var(--foreground))' }}>
                      Avg Buy (₹) *
                    </label>
                    <input
                      type="number"
                      min="0.01"
                      step="any"
                      value={form.avg_buy_price}
                      onChange={(e) => handleFormChange('avg_buy_price', e.target.value)}
                      placeholder="2800"
                      required
                      className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
                      style={{
                        backgroundColor: 'rgb(var(--surface-raised))',
                        border: '1px solid rgb(var(--border))',
                        color: 'rgb(var(--foreground))',
                      }}
                    />
                  </div>
                </div>

                {/* Broker */}
                {brokers.length > 0 && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium" style={{ color: 'rgb(var(--foreground))' }}>
                      Broker / Account
                    </label>
                    <select
                      value={form.broker_account_id}
                      onChange={(e) => handleFormChange('broker_account_id', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
                      style={{
                        backgroundColor: 'rgb(var(--surface-raised))',
                        border: '1px solid rgb(var(--border))',
                        color: 'rgb(var(--foreground))',
                      }}
                    >
                      <option value="">No broker selected</option>
                      {brokers.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.broker_name}{b.account_label ? ` (${b.account_label})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {addMutation.error && (
                  <p className="text-sm" style={{ color: 'rgb(var(--loss))' }}>
                    {(addMutation.error as Error).message}
                  </p>
                )}

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors"
                    style={{
                      backgroundColor: 'rgb(var(--surface-raised))',
                      border: '1px solid rgb(var(--border))',
                      color: 'rgb(var(--foreground))',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    id="btn-submit-holding"
                    type="submit"
                    disabled={addMutation.isPending}
                    className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-60 flex items-center justify-center gap-2"
                    style={{ background: 'linear-gradient(135deg, rgb(var(--brand-600)), rgb(var(--brand-400)))' }}
                  >
                    {addMutation.isPending ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Adding…</>
                    ) : (
                      'Add Holding'
                    )}
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
