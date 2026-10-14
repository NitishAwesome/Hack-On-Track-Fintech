'use client';

import { useState, useRef, useMemo, Suspense } from 'react';
import { useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usePrivateQuery as useQuery } from '@/lib/hooks/usePrivateQuery';
import { useSession } from '@/components/providers/QueryProvider';
import { motion } from 'framer-motion';
import Papa from 'papaparse';
import {
  Plus,
  Upload,
  Search,
  X,
  Loader2,
  Trash2,
  Download,
  Building2,
  Info,
  Edit2,
  Newspaper,
  AlertCircle,
  CheckCircle2,
  FileText,
  Filter,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Briefcase,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import { PercentageBadge } from '@/components/shared/PercentageBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { SkeletonTable } from '@/components/shared/Skeletons';
import { formatCurrency, formatCurrencySafe, formatStockPrice } from '@/lib/utils';
import type { HoldingWithMetrics, AssetClass, BrokerAccount } from '@/types/portfolio';
import { StockSearchDropdown } from '@/components/market/StockSearchDropdown';
import { CompanyLogo } from '@/components/shared/CompanyLogo';
import { buildPortfolioSummary } from '@/lib/calculations/portfolio';
import { PageSection } from '@/components/shared/PageSection';
import { InvestmentsSummary } from '@/components/investments/InvestmentsSummary';
import { HoldingQuote } from '@/components/investments/HoldingQuote';
import {
  InvestmentDialog,
  InvestmentDialogTitle,
  InvestmentWriteFeedback,
} from '@/components/investments/InvestmentDialog';
import {
  INVESTMENT_CATEGORIES,
  hasHoldingPrice,
  holdingResearchDestination,
  selectedBrokerAccount,
} from '@/lib/investments/presentation';
import '@/components/investments/investments.css';

const TAB_CATEGORIES = INVESTMENT_CATEGORIES;

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

async function bulkImportHoldings(data: {
  holdings: unknown[];
  duplicate_mode: string;
  broker_account_id?: string;
}) {
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
  return (
    <Suspense fallback={<SkeletonTable />}>
      <HoldingsEntry />
    </Suspense>
  );
}

function HoldingsEntry() {
  const params = useSearchParams();
  const action = params.get('action') || (params.get('import') === 'csv' ? 'import' : null);
  const initialBroker = params.get('broker') || '';
  const { userId } = useSession();
  return (
    <HoldingsWorkspace key={`${userId || 'guest'}:${action || 'list'}:${initialBroker}`} initialAction={action} initialBroker={initialBroker} />
  );
}

function HoldingsWorkspace({ initialAction, initialBroker }: { initialAction: string | null; initialBroker: string }) {
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState('all');
  const [showAddModal, setShowAddModal] = useState(initialAction === 'add');
  const [showImportModal, setShowImportModal] = useState(initialAction === 'import');
  const [editingHolding, setEditingHolding] = useState<HoldingWithMetrics | null>(null);
  const [deletingHolding, setDeletingHolding] = useState<HoldingWithMetrics | null>(null);
  const [selectedHolding, setSelectedHolding] = useState<HoldingWithMetrics | null>(null);
  const [expandedMobileId, setExpandedMobileId] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [selectedBrokerFilter, setSelectedBrokerFilter] = useState<string>(initialBroker);
  const [sortBy, setSortBy] = useState<'value' | 'invested' | 'return' | 'name'>('value');
  const [form, setForm] = useState<AddHoldingForm>({ ...EMPTY_FORM, broker_account_id: initialBroker });

  // CSV Import State
  const [csvRows, setCsvRows] = useState<CsvValidationRow[]>([]);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [importBrokerId, setImportBrokerId] = useState<string>(initialBroker);
  const [duplicateMode, setDuplicateMode] = useState<'replace' | 'update' | 'skip'>('replace');
  const [isRefreshingQuotes, setIsRefreshingQuotes] = useState<boolean>(false);

  const {
    data: holdingsData,
    isPending: isLoading,
    error: holdingsError,
    refetch: refetchHoldings,
  } = useQuery({ queryKey: ['holdings'], queryFn: fetchHoldings });
  const {
    data: brokersData,
    error: brokersError,
    refetch: refetchBrokers,
  } = useQuery({ queryKey: ['brokers'], queryFn: fetchBrokers });

  const holdings: HoldingWithMetrics[] = useMemo(
    () => holdingsData?.holdings ?? [],
    [holdingsData],
  );
  const brokers: BrokerAccount[] = useMemo(() => brokersData?.brokers ?? [], [brokersData]);
  const formBrokerId = selectedBrokerAccount(form.broker_account_id, brokers);
  const importTargetBrokerId = selectedBrokerAccount(importBrokerId, brokers);

  // Mutations
  const addMutation = useMutation({
    mutationFn: addHoldingApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holdings'] });
      queryClient.invalidateQueries({ queryKey: ['brokers'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-summary'] });
      setShowAddModal(false);
      setForm(EMPTY_FORM);
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
    onSuccess: () => {
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
  const portfolioSummary = useMemo(() => buildPortfolioSummary(holdings), [holdings]);

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
        if (sortBy === 'value') {
          const valA = a.current_value ?? -1;
          const valB = b.current_value ?? -1;
          return valB - valA;
        }
        if (sortBy === 'invested') return b.invested_value - a.invested_value;
        if (sortBy === 'return')
          return (b.absolute_return_pct ?? -999) - (a.absolute_return_pct ?? -999);
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
          const findKey = (name: string) =>
            keys.find((k) => k.trim().toLowerCase() === name.toLowerCase());

          const symbolKey = findKey('symbol') || findKey('ticker') || findKey('scrip');
          const nameKey = findKey('name') || findKey('asset_name') || findKey('company');
          const qtyKey = findKey('quantity') || findKey('qty') || findKey('units');
          const priceKey =
            findKey('average_buy_price') ||
            findKey('avg buy price') ||
            findKey('avg_price') ||
            findKey('price');
          const assetClassKey = findKey('asset_type') || findKey('asset_class') || findKey('type');
          const exchangeKey = findKey('exchange');
          const isinKey = findKey('isin');

          const symbol = symbolKey ? (row[symbolKey] || '').toUpperCase().trim() : '';
          const name = nameKey && row[nameKey] ? row[nameKey].trim() : symbol;
          const rawClass = assetClassKey
            ? (row[assetClassKey] || '').toLowerCase().trim()
            : 'equity';
          let assetClass: AssetClass = 'equity';
          if (['equity', 'reit', 'invit', 'bond', 'sgb', 'etf', 'mf'].includes(rawClass)) {
            assetClass = rawClass as AssetClass;
          }

          const exchange =
            exchangeKey && row[exchangeKey] ? row[exchangeKey].toUpperCase().trim() : 'NSE';
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
    <div className="finova-investments space-y-6 sm:space-y-7" data-tone="cyan">
      {brokersError && (
        <div role="alert" className="finova-empty text-left">
          <p className="text-sm font-semibold">Broker accounts could not be loaded</p>
          <p className="text-xs text-muted mt-1">{brokersError.message}</p>
          <button
            type="button"
            className="finova-button mt-3"
            onClick={() => {
              void refetchBrokers();
            }}
          >
            Retry accounts
          </button>
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="finova-eyebrow mb-2">EVERY POSITION · ONE CLEAR VIEW</p>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            My Investments
          </h1>
          <p className="text-sm mt-1 text-muted">
            Your recorded holdings across brokers, depositories and asset classes. Inspect every
            position and its quote coverage.
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
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
            className="finova-button"
            aria-label="Refresh holding quotes"
            title="Refresh dynamic quotes from market feed"
          >
            <RefreshCw
              className={`w-4 h-4 text-emerald-700 dark:text-emerald-400 ${isRefreshingQuotes ? 'animate-spin' : ''}`}
            />
            <span>Refresh Quotes</span>
          </button>
          <Link
            href="/analysis"
            className="finova-button"
            title="Open portfolio exposure analysis in Investment X-Ray"
          >
            <BarChart3 className="w-4 h-4 text-brand" />
            <span>Investment X-Ray</span>
          </Link>
          <button
            id="btn-import-csv"
            onClick={() => {
              setCsvRows([]);
              setCsvError(null);
              if (brokers.length > 0 && !importBrokerId) setImportBrokerId(selectedBrokerAccount(selectedBrokerFilter, brokers));
              setShowImportModal(true);
            }}
            className="finova-button"
          >
            <Upload className="w-4 h-4 text-brand" />
            Import CSV
          </button>
          <button
            id="btn-add-holding"
            onClick={() => {
              if (brokers.length > 0) setForm((p) => ({ ...p, broker_account_id: selectedBrokerAccount(selectedBrokerFilter, brokers) }));
              setShowAddModal(true);
            }}
            className="finova-button finova-button-primary"
          >
            <Plus className="w-4 h-4" />
            Add Investment
          </button>
        </div>
      </div>

      <InvestmentsSummary
        summary={portfolioSummary}
        loading={isLoading}
        unavailable={Boolean(holdingsError)}
        brokerCount={brokersData && !brokersError ? brokers.length : null}
      />

      {!isLoading && !holdingsError && holdings.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-xs">
          <span className="flex items-center gap-2 text-muted">
            <Info size={15} className="text-brand shrink-0" />
            {portfolioSummary.priced_count ?? 0} of {holdings.length} positions quoted ·{' '}
            {portfolioSummary.stale_count ?? 0} cached/stale
          </span>
          <Link href="/performance" className="text-brand inline-flex items-center gap-1 min-h-8">
            Understand your returns <ArrowUpRight size={13} />
          </Link>
        </div>
      )}

      <PageSection
        title="Investment positions"
        description="Filter your recorded positions without changing portfolio totals above."
        icon={Briefcase}
        accent="blue"
      >
        {/* Category Filter Tabs (Pill Buttons) */}
        <div
          className="flex items-center gap-2 border-b border-border pb-4 mb-5 overflow-x-auto no-scrollbar"
          role="group"
          aria-label="Filter by asset class"
        >
          {TAB_CATEGORIES.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                aria-pressed={isActive}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shadow-xs ${
                  isActive
                    ? 'bg-brand text-foreground dark:text-white shadow-sm'
                    : 'bg-surface hover:bg-surface-raised text-muted hover:text-foreground border border-border'
                }`}
              >
                {tab.label}
                <span className="ml-2 opacity-75 tabular-nums">
                  {tab.assetClass
                    ? holdings.filter((h) => h.asset_class === tab.assetClass).length
                    : holdings.length}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search, Filter & Sort Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto_auto] gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              placeholder="Search by symbol, company name, or ISIN…"
              aria-label="Search your investments"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs sm:text-sm bg-surface border border-border text-foreground placeholder:text-muted focus:outline-none focus:border-brand shadow-xs"
            />
          </div>

          <select
            aria-label="Filter by broker account"
            value={selectedBrokerFilter}
            onChange={(e) => setSelectedBrokerFilter(e.target.value)}
            className="investment-filter-control px-3.5 py-2.5 font-medium min-w-0"
          >
            <option value="">All Brokers</option>
            {brokers.map((b) => (
              <option key={b.id} value={b.id}>
                {b.display_name || b.broker_name}
              </option>
            ))}
          </select>

          <select
            aria-label="Sort investment positions"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'value' | 'invested' | 'return' | 'name')}
            className="investment-filter-control px-3.5 py-2.5 font-medium min-w-0"
          >
            <option value="value">Sort by Value</option>
            <option value="invested">Sort by Invested</option>
            <option value="return">Sort by Returns %</option>
            <option value="name">Sort by Name</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 mb-4 text-[11px] text-muted">
          <p role="status">
            {isLoading
              ? 'Loading positions…'
              : holdingsError
                ? 'Positions unavailable'
                : 'Showing ' + filteredHoldings.length + ' of ' + holdings.length + ' positions'}
          </p>
          {(search || selectedBrokerFilter || activeTab !== 'all' || sortBy !== 'value') && (
            <button
              type="button"
              className="finova-link"
              onClick={() => {
                setSearch('');
                setSelectedBrokerFilter('');
                setActiveTab('all');
                setSortBy('value');
              }}
            >
              Reset filters <X size={13} />
            </button>
          )}
        </div>
        {/* Content Table / Empty States */}
        {holdingsError ? (
          <div className="finova-empty" role="alert">
            <p className="font-semibold">Your investments could not be loaded</p>
            <p className="text-xs text-muted mt-2">{holdingsError.message}</p>
            <button
              type="button"
              className="finova-button mt-4"
              onClick={() => {
                void refetchHoldings();
              }}
            >
              Retry investments
            </button>
          </div>
        ) : isLoading ? (
          <SkeletonTable rows={5} />
        ) : holdings.length === 0 ? (
          <EmptyState
            icon={<Building2 className="w-10 h-10 text-brand" />}
            title="Your unified portfolio starts here."
            description="Add your first investment or import your holdings to begin tracking your portfolio."
            action={
              <div className="flex items-center justify-center flex-wrap gap-3">
                <button
                  onClick={() => {
                    if (brokers.length > 0)
                      setForm((p) => ({ ...p, broker_account_id: brokers[0].id }));
                    setShowAddModal(true);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-foreground dark:text-white shadow-sm bg-brand hover:bg-brand-hover transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Investment
                </button>
                <button
                  onClick={() => {
                    setCsvRows([]);
                    setShowImportModal(true);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-border bg-surface hover:bg-surface-raised text-foreground transition-colors"
                >
                  <Upload className="w-4 h-4 text-brand" />
                  Import CSV
                </button>
              </div>
            }
          />
        ) : filteredHoldings.length === 0 ? (
          <div className="bg-surface border border-border rounded-2xl p-8 text-center space-y-2">
            <Filter className="w-8 h-8 text-muted mx-auto" />
            <p className="font-semibold text-foreground">No matching investments found</p>
            <p className="text-xs text-muted">
              Try adjusting your search query, broker filter, or category tab.
            </p>
            <button
              type="button"
              className="finova-button mt-3"
              onClick={() => {
                setSearch('');
                setSelectedBrokerFilter('');
                setActiveTab('all');
              }}
            >
              Clear search and filters
            </button>
          </div>
        ) : (
          <div>
            {/* Desktop Table View (>= 768px) */}
            <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-xs hidden md:block">
              <div className="overflow-x-auto">
                <table className="investment-table">
                  <caption className="sr-only">
                    Recorded holdings with broker, quantity, prices, invested and current values,
                    unrealized returns and position actions.
                  </caption>
                  <thead className="bg-surface-raised/70 border-b border-border text-[11px] font-semibold text-muted uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3.5">Asset & Symbol</th>
                      <th className="px-4 py-3.5">Broker</th>
                      <th className="px-4 py-3.5 text-right">Quantity</th>
                      <th className="px-4 py-3.5 text-right">Avg Buy Price</th>
                      <th className="px-4 py-3.5 text-right">Current Price</th>
                      <th className="px-4 py-3.5 text-right">Invested Value</th>
                      <th className="px-4 py-3.5 text-right">Current Value</th>
                      <th className="px-4 py-3.5 text-right">P&L / Return</th>
                      <th className="px-4 py-3.5 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredHoldings.map((h) => {
                      const hasPrice = hasHoldingPrice(h);
                      const returnPct = h.absolute_return_pct;
                      const isPositive = (h.absolute_return ?? 0) >= 0;

                      return (
                        <tr
                          key={h.id}
                          className="hover:bg-surface-raised/50 transition-colors group"
                        >
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-3">
                              <CompanyLogo symbol={h.symbol} name={h.name} size="md" />
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <Link
                                    href={holdingResearchDestination(h, pathname)}
                                    className="font-semibold text-foreground hover:text-brand transition-colors block max-w-48 break-words"
                                  >
                                    {h.name}
                                  </Link>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider bg-brand/10 text-brand border border-brand/20 shrink-0">
                                    {h.asset_class}
                                  </span>
                                </div>
                                <p className="text-xs text-muted font-financial mt-0.5">
                                  {h.symbol} • {h.exchange || 'Exchange unavailable'}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3.5">
                            <span className="text-xs px-2.5 py-1 rounded-lg border border-border bg-surface-raised text-foreground font-medium">
                              {h.broker_account?.display_name ||
                                h.broker_account?.broker_name ||
                                'Manual'}
                            </span>
                          </td>

                          <td className="px-4 py-3.5 text-right font-financial tabular-nums font-semibold text-foreground">
                            {h.quantity}
                          </td>

                          <td className="px-4 py-3.5 text-right font-financial tabular-nums text-muted">
                            {formatStockPrice(h.avg_buy_price)}
                          </td>

                          <td className="px-4 py-3.5 text-right font-financial">
                            <HoldingQuote holding={h} />
                          </td>

                          <td
                            className="px-4 py-3.5 text-right font-financial tabular-nums text-foreground font-medium"
                            title={formatCurrency(h.invested_value)}
                          >
                            {formatCurrency(h.invested_value)}
                          </td>

                          <td
                            className="px-4 py-3.5 text-right font-financial tabular-nums font-semibold text-foreground"
                            title={
                              hasPrice && h.current_value !== null
                                ? formatCurrency(h.current_value)
                                : 'Valuation unavailable'
                            }
                          >
                            {hasPrice && h.current_value !== null ? (
                              formatCurrency(h.current_value)
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                          </td>

                          <td className="px-4 py-3.5 text-right font-financial tabular-nums">
                            {hasPrice && h.absolute_return !== null ? (
                              <div className="flex flex-col items-end">
                                <span
                                  className={`text-xs font-semibold ${isPositive ? 'text-gain' : 'text-loss'}`}
                                  title={formatCurrency(h.absolute_return)}
                                >
                                  {isPositive ? '+' : ''}
                                  {formatCurrency(h.absolute_return)}
                                </span>
                                {returnPct !== null && (
                                  <PercentageBadge value={returnPct} size="sm" />
                                )}
                              </div>
                            ) : (
                              <span className="text-[11px] px-1.5 py-0.5 rounded bg-surface-raised text-muted border border-border">
                                P&L unavailable
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3.5 text-center">
                            <div className="flex items-center justify-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                              <Link
                                href={holdingResearchDestination(h, pathname)}
                                title={`Analyze ${h.symbol}`}
                                className="investment-row-action"
                              >
                                <BarChart3 className="w-4 h-4" />
                              </Link>
                              <Link
                                href={`/news?symbol=${encodeURIComponent(h.symbol)}`}
                                title={`View news for ${h.symbol}`}
                                className="investment-row-action"
                              >
                                <Newspaper className="w-4 h-4" />
                              </Link>
                              <button
                                title="Edit Holding"
                                aria-label={`Edit ${h.symbol} holding`}
                                onClick={() => setEditingHolding(h)}
                                className="investment-row-action"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                title="Delete Holding"
                                aria-label={`Delete ${h.symbol} holding`}
                                onClick={() => setDeletingHolding(h)}
                                className="investment-row-action"
                                data-danger
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

            {/* Mobile Accordion Card View (< 768px) */}
            <div className="md:hidden space-y-3">
              {filteredHoldings.map((h) => {
                const hasPrice = hasHoldingPrice(h);
                const returnPct = h.absolute_return_pct;
                const isPositive = (h.absolute_return ?? 0) >= 0;
                const isExpanded = expandedMobileId === h.id;

                return (
                  <div key={h.id} className="finova-tile min-w-0 p-4" data-tone="cyan">
                    {/* Top Bar: Symbol, Name & Current Value */}
                    <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-3">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <CompanyLogo symbol={h.symbol} name={h.name} size="sm" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Link
                              href={holdingResearchDestination(h, pathname)}
                              className="font-bold text-sm block text-foreground hover:text-brand break-words"
                            >
                              {h.name}
                            </Link>
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider bg-brand/10 text-brand border border-brand/20">
                              {h.asset_class}
                            </span>
                          </div>
                          <p className="text-xs text-muted font-financial mt-0.5">
                            {h.symbol} • {h.exchange || 'Exchange unavailable'}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold font-financial tabular-nums text-foreground">
                          {hasPrice && h.current_value !== null
                            ? formatCurrency(h.current_value)
                            : '—'}
                        </p>
                        <span className="text-[10px] text-muted font-financial tabular-nums">
                          {h.quantity} units
                        </span>
                      </div>
                    </div>

                    {/* Secondary Bar: Broker Badge & Return */}
                    <div className="flex flex-wrap gap-2 items-center justify-between mt-3 pt-2.5 border-t text-xs border-border/50">
                      <span className="text-[11px] px-2.5 py-0.5 rounded-lg border border-border bg-surface-raised text-foreground font-medium">
                        {h.broker_account?.display_name ||
                          h.broker_account?.broker_name ||
                          'Manual'}
                      </span>

                      <div className="flex items-center gap-2">
                        {hasPrice && h.absolute_return !== null ? (
                          <div className="flex items-center gap-1.5 font-mono">
                            <span
                              className={`font-semibold ${isPositive ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}
                            >
                              {isPositive ? '+' : ''}
                              {formatCurrency(h.absolute_return)}
                            </span>
                            {returnPct !== null && <PercentageBadge value={returnPct} size="sm" />}
                          </div>
                        ) : (
                          <span className="text-[10px] text-muted italic">P&L unavailable</span>
                        )}

                        <button
                          type="button"
                          onClick={() => setExpandedMobileId(isExpanded ? null : h.id)}
                          className="investment-row-action"
                          aria-expanded={isExpanded}
                          aria-controls={`holding-details-${h.id}`}
                          aria-label={`${isExpanded ? 'Hide' : 'Show'} ${h.symbol} details`}
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Expandable Accordion Drawer */}
                    {isExpanded && (
                      <div
                        id={`holding-details-${h.id}`}
                        className="mt-3 pt-3 border-t space-y-2.5 text-xs text-muted"
                        style={{ borderColor: 'rgb(var(--border) / 0.4)' }}
                      >
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-[10px] uppercase font-semibold text-muted">
                              Avg Buy Price
                            </span>
                            <p className="font-mono text-foreground font-medium">
                              {formatStockPrice(h.avg_buy_price)}
                            </p>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-semibold text-muted">
                              Invested Value
                            </span>
                            <p className="font-mono text-foreground font-medium">
                              {formatCurrency(h.invested_value)}
                            </p>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-semibold text-muted">
                              Current Quote
                            </span>
                            <p className="font-mono text-foreground font-medium">
                              {hasPrice ? formatStockPrice(h.current_price!) : 'Unquoted'}
                            </p>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-semibold text-muted">
                              Quote Status
                            </span>
                            <HoldingQuote holding={h} compact />
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div
                          className="investment-mobile-actions flex flex-wrap items-center justify-end gap-2 pt-2 border-t"
                          style={{ borderColor: 'rgb(var(--border) / 0.3)' }}
                        >
                          <Link
                            href={`/news?symbol=${encodeURIComponent(h.symbol)}`}
                            className="px-2.5 py-1 rounded text-xs border border-border bg-surface-raised flex items-center gap-1 text-foreground hover:text-brand"
                          >
                            <Newspaper className="w-3.5 h-3.5" />
                            <span>News</span>
                          </Link>
                          <button
                            type="button"
                            onClick={() => setEditingHolding(h)}
                            className="px-2.5 py-1 rounded text-xs border border-border bg-surface-raised flex items-center gap-1 text-foreground hover:text-brand"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingHolding(h)}
                            className="px-2.5 py-1 rounded text-xs border border-loss/20 bg-loss-bg/10 flex items-center gap-1 text-loss hover:opacity-90"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <p className="text-[10px] text-muted mt-4 leading-relaxed">
          Portfolio totals include all positions above. Table values use each position&apos;s
          available quote; missing prices are never replaced by purchase cost. Scroll the table to
          inspect all columns. Position actions remain on the right.
        </p>
      </PageSection>

      <PageSection
        title="Go deeper into your portfolio"
        description="Use the right view for the next question, with your recorded holdings as the starting point."
        icon={Layers}
        accent="violet"
      >
        <div className="grid md:grid-cols-3 gap-4">
          {[
            {
              href: '/analysis',
              title: 'Understand your exposure',
              detail: 'Inspect allocation and concentration in Investment X-Ray.',
              icon: BarChart3,
              tone: 'blue',
            },
            {
              href: '/transactions',
              title: 'Review recorded activity',
              detail: 'Trace purchases, sales and income in your transaction ledger.',
              icon: FileText,
              tone: 'teal',
            },
            {
              href: '/brokers',
              title: 'Keep accounts organised',
              detail: 'Review the brokers and depositories behind these positions.',
              icon: Building2,
              tone: 'violet',
            },
          ].map(({ href, title, detail, icon: Icon, tone }) => (
            <Link key={href} href={href} data-tone={tone} className="finova-tile p-5 group">
              <span className="finova-accent-icon mb-4">
                <Icon size={21} />
              </span>
              <h3 className="font-semibold text-sm text-foreground group-hover:text-brand">
                {title}
              </h3>
              <p className="text-xs text-muted leading-relaxed mt-2">{detail}</p>
              <span className="finova-link mt-3">
                Open view <ArrowUpRight size={13} />
              </span>
            </Link>
          ))}
        </div>
      </PageSection>

      {/* Add Investment Modal */}
      {showAddModal && (
        <InvestmentDialog open={Boolean(showAddModal)} onOpenChange={setShowAddModal}>
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            className="relative w-full max-w-lg card p-6 shadow-2xl border border-border dark:border-slate-700 bg-surface dark:bg-slate-900 z-10 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-border dark:border-slate-800 pb-3">
              <InvestmentDialogTitle>
                <h2 className="text-lg font-bold text-foreground dark:text-slate-100 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  Add Investment Position
                </h2>
              </InvestmentDialogTitle>
              <button
                onClick={() => setShowAddModal(false)}
                aria-label="Close dialog"
                className="p-1 rounded-md text-muted dark:text-slate-400 hover:text-foreground dark:hover:text-slate-200 hover:bg-surface-raised dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <InvestmentWriteFeedback message={addMutation.error?.message} />
            <form
              onSubmit={(e) => {
                e.preventDefault();
                addMutation.mutate({
                  ...form,
                  broker_account_id: formBrokerId,
                  quantity: Number(form.quantity),
                  avg_buy_price: Number(form.avg_buy_price),
                });
              }}
              className="space-y-4 text-xs"
            >
              {/* Broker Account Selection */}
              <div className="space-y-1">
                <label className="font-semibold text-foreground dark:text-slate-300">
                  Broker / Depository Account *
                </label>
                <select
                  aria-label="Broker / Depository Account"
                  value={formBrokerId}
                  onChange={(e) => setForm((p) => ({ ...p, broker_account_id: e.target.value }))}
                  required
                  className="w-full px-3 py-2.5 rounded-lg text-sm bg-surface-raised dark:bg-slate-800 border border-border dark:border-slate-700 text-foreground dark:text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  {brokers.length === 0 && (
                    <option value="">No broker accounts (create one first)</option>
                  )}
                  {brokers.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.display_name || b.broker_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Asset Category */}
              <div className="space-y-1">
                <label className="font-semibold text-foreground dark:text-slate-300">
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
                      onClick={() =>
                        setForm((p) => ({ ...p, asset_class: item.val as AssetClass }))
                      }
                      className={`py-2 px-3 rounded-lg font-medium border text-center transition-colors ${
                        form.asset_class === item.val
                          ? 'bg-blue-600/20 border-blue-500 text-blue-600 dark:text-blue-300'
                          : 'bg-surface-raised dark:bg-slate-800 border-border dark:border-slate-700 text-muted dark:text-slate-400 hover:text-foreground dark:hover:text-slate-200'
                      }`}
                    >
                      {item.lbl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Stock Search & Live Quote Preview */}
              <StockSearchDropdown
                selectedSymbol={form.symbol}
                onSelect={(selected) => {
                  setForm((p) => ({
                    ...p,
                    symbol: selected.symbol,
                    name: selected.name,
                    isin: selected.isin,
                    exchange: selected.exchange,
                    asset_class: selected.assetClass,
                  }));
                }}
              />

              {/* Symbol & Name */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground dark:text-slate-300">
                    Ticker Symbol *
                  </label>
                  <input
                    type="text"
                    aria-label="Ticker Symbol"
                    placeholder="e.g. ICICIBANK"
                    value={form.symbol}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, symbol: e.target.value.toUpperCase() }))
                    }
                    required
                    className="w-full px-3 py-2 rounded-lg bg-surface-raised dark:bg-slate-800 border border-border dark:border-slate-700 text-foreground dark:text-slate-200 font-mono uppercase focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-foreground dark:text-slate-300">
                    Instrument Name *
                  </label>
                  <input
                    type="text"
                    aria-label="Instrument Name"
                    placeholder="e.g. ICICI Bank Ltd"
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    required
                    className="w-full px-3 py-2 rounded-lg bg-surface-raised dark:bg-slate-800 border border-border dark:border-slate-700 text-foreground dark:text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Quantity & Price */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground dark:text-slate-300">
                    Quantity / Units *
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0.000001"
                    aria-label="Quantity / Units"
                    placeholder="100"
                    value={form.quantity}
                    onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))}
                    required
                    className="w-full px-3 py-2 rounded-lg bg-surface-raised dark:bg-slate-800 border border-border dark:border-slate-700 text-foreground dark:text-slate-200 font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-foreground dark:text-slate-300">
                    Avg Purchase Price (₹) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    aria-label="Avg Purchase Price"
                    placeholder="1200"
                    value={form.avg_buy_price}
                    onChange={(e) => setForm((p) => ({ ...p, avg_buy_price: e.target.value }))}
                    required
                    className="w-full px-3 py-2 rounded-lg bg-surface-raised dark:bg-slate-800 border border-border dark:border-slate-700 text-foreground dark:text-slate-200 font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Live Invested Calculation */}
              {Number(form.quantity) > 0 && Number(form.avg_buy_price) >= 0 && (
                <div className="p-2.5 rounded-lg bg-blue-500/5 border border-blue-500/20 text-blue-600 dark:text-blue-300 flex justify-between items-center font-mono">
                  <span>Invested Amount:</span>
                  <strong className="text-sm text-blue-600 dark:text-blue-200">
                    {formatCurrency(Number(form.quantity) * Number(form.avg_buy_price))}
                  </strong>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-3 border-t border-border dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg font-medium border border-border dark:border-slate-700 text-foreground dark:text-slate-300 hover:bg-surface-raised dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addMutation.isPending}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-lg font-medium text-foreground dark:text-white shadow-sm"
                  style={{
                    background:
                      'linear-gradient(135deg, rgb(var(--brand-600)), rgb(var(--brand-400)))',
                  }}
                >
                  {addMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Holding
                </button>
              </div>
            </form>
          </motion.div>
        </InvestmentDialog>
      )}

      {/* Edit Holding Modal */}
      {editingHolding && (
        <InvestmentDialog
          open={Boolean(editingHolding)}
          onOpenChange={(open) => {
            if (!open) setEditingHolding(null);
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="relative w-full max-w-md card p-6 shadow-2xl border border-border dark:border-slate-700 bg-surface dark:bg-slate-900 z-10 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-border dark:border-slate-800 pb-3">
              <div>
                <InvestmentDialogTitle>
                  <h2 className="text-lg font-bold text-foreground dark:text-slate-100">
                    Edit Position
                  </h2>
                </InvestmentDialogTitle>
                <p className="text-xs text-muted dark:text-slate-400 font-mono">
                  {editingHolding.symbol} • {editingHolding.name}
                </p>
              </div>
              <button
                onClick={() => setEditingHolding(null)}
                aria-label="Close dialog"
                className="p-1 rounded-md text-muted dark:text-slate-400 hover:text-foreground dark:hover:text-slate-200 hover:bg-surface-raised dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <InvestmentWriteFeedback message={editMutation.error?.message} />
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const target = e.currentTarget;
                const qty = parseFloat(
                  (target.elements.namedItem('quantity') as HTMLInputElement).value,
                );
                const price = parseFloat(
                  (target.elements.namedItem('avg_buy_price') as HTMLInputElement).value,
                );
                editMutation.mutate({
                  id: editingHolding.id,
                  quantity: qty,
                  avg_buy_price: price,
                });
              }}
              className="space-y-4 text-xs"
            >
              <div className="space-y-1">
                <label className="font-semibold text-foreground dark:text-slate-300">
                  Quantity / Units *
                </label>
                <input
                  aria-label="Quantity / Units"
                  name="quantity"
                  type="number"
                  step="any"
                  min="0.000001"
                  defaultValue={editingHolding.quantity}
                  required
                  className="w-full px-3 py-2 rounded-lg bg-surface-raised dark:bg-slate-800 border border-border dark:border-slate-700 text-foreground dark:text-slate-200 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground dark:text-slate-300">
                  Average Purchase Price (₹) *
                </label>
                <input
                  aria-label="Average Purchase Price"
                  name="avg_buy_price"
                  type="number"
                  step="any"
                  min="0"
                  defaultValue={editingHolding.avg_buy_price}
                  required
                  className="w-full px-3 py-2 rounded-lg bg-surface-raised dark:bg-slate-800 border border-border dark:border-slate-700 text-foreground dark:text-slate-200 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3 border-t border-border dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingHolding(null)}
                  className="px-4 py-2 rounded-lg font-medium border border-border dark:border-slate-700 text-foreground dark:text-slate-300 hover:bg-surface-raised dark:hover:bg-slate-800"
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
        </InvestmentDialog>
      )}

      {/* Delete Confirmation Modal */}
      {deletingHolding && (
        <InvestmentDialog
          open={Boolean(deletingHolding)}
          onOpenChange={(open) => {
            if (!open) setDeletingHolding(null);
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="relative w-full max-w-md card p-6 shadow-2xl border border-red-500/30 bg-surface dark:bg-slate-900 z-10 space-y-4"
          >
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <AlertCircle className="w-6 h-6 flex-shrink-0" />
              <InvestmentDialogTitle>
                <h3 className="text-lg font-bold">Delete Investment Holding?</h3>
              </InvestmentDialogTitle>
            </div>

            <InvestmentWriteFeedback message={deleteMutation.error?.message} />
            <p className="text-sm text-foreground dark:text-slate-300 leading-relaxed">
              Are you sure you want to delete your position in{' '}
              <strong className="text-foreground dark:text-white">
                {deletingHolding.name} ({deletingHolding.symbol})
              </strong>
              ? This will remove the position and update your portfolio valuation immediately.
            </p>

            <div className="pt-3 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingHolding(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-border dark:border-slate-700 text-foreground dark:text-slate-300 hover:bg-surface-raised dark:hover:bg-slate-800"
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
        </InvestmentDialog>
      )}

      {/* CSV Import Modal */}
      {showImportModal && (
        <InvestmentDialog open={Boolean(showImportModal)} onOpenChange={setShowImportModal}>
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            className="relative w-full max-w-2xl card p-6 shadow-2xl border border-border dark:border-slate-700 bg-surface dark:bg-slate-900 z-10 space-y-5 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-border dark:border-slate-800 pb-3">
              <div>
                <InvestmentDialogTitle>
                  <h2 className="text-lg font-bold text-foreground dark:text-slate-100 flex items-center gap-2">
                    <Upload className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    CSV Portfolio Import
                  </h2>
                </InvestmentDialogTitle>
                <p className="text-xs text-muted dark:text-slate-400 mt-0.5">
                  Select broker → Upload CSV → Validate & Preview → Import
                </p>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                aria-label="Close dialog"
                className="p-1 rounded-md text-muted dark:text-slate-400 hover:text-foreground dark:hover:text-slate-200 hover:bg-surface-raised dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <InvestmentWriteFeedback message={importMutation.error?.message} />
            {/* Target Broker & Duplicate Mode */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-foreground dark:text-slate-300">
                  Target Broker Account *
                </label>
                <select
                  aria-label="Target Broker Account"
                  value={importTargetBrokerId}
                  onChange={(e) => setImportBrokerId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-surface-raised dark:bg-slate-800 border border-border dark:border-slate-700 text-foreground dark:text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  {brokers.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.display_name || b.broker_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground dark:text-slate-300">
                  Duplicate Handling Strategy
                </label>
                <select
                  aria-label="Duplicate Handling Strategy"
                  value={duplicateMode}
                  onChange={(e) =>
                    setDuplicateMode(e.target.value as 'replace' | 'update' | 'skip')
                  }
                  className="w-full px-3 py-2 rounded-lg bg-surface-raised dark:bg-slate-800 border border-border dark:border-slate-700 text-foreground dark:text-slate-200 focus:outline-none focus:border-blue-500"
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
              className="border-2 border-dashed border-border dark:border-slate-700 hover:border-blue-500/60 rounded-xl p-6 text-center cursor-pointer transition-colors bg-surface-raised/40 dark:bg-slate-850/40"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleCsvUpload}
                className="hidden"
              />
              <FileText className="w-8 h-8 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="text-sm font-semibold text-foreground dark:text-slate-200 rounded-lg px-3 py-1"
              >
                Choose a CSV file to validate and preview
              </button>
              <p className="text-xs text-muted dark:text-slate-500 mt-1">
                Supported format: broker, asset_type, symbol, isin, exchange, quantity,
                average_buy_price
              </p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  downloadSampleCsv();
                }}
                className="mt-3 text-xs text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" />
                Download Sample CSV Template
              </button>
            </div>

            {csvError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{csvError}</span>
              </div>
            )}

            {/* Import Preview */}
            {csvRows.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground dark:text-slate-300">
                    Import Preview: {csvRows.length} Rows Parsed
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {csvRows.filter((r) => r.isValid).length} Valid
                    </span>
                    {csvRows.filter((r) => !r.isValid).length > 0 && (
                      <span className="text-rose-700 dark:text-rose-400 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {csvRows.filter((r) => !r.isValid).length} Errors
                      </span>
                    )}
                  </div>
                </div>

                <div className="max-h-48 overflow-y-auto rounded-lg border border-border dark:border-slate-800 bg-background dark:bg-slate-950 divide-y divide-border dark:divide-slate-850 text-xs font-mono">
                  {csvRows.map((r) => (
                    <div
                      key={r.rowNumber}
                      className="p-2.5 flex items-center justify-between hover:bg-surface dark:hover:bg-slate-900"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={
                            r.isValid
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-rose-700 dark:text-rose-400'
                          }
                        >
                          {r.isValid ? '✓' : '✗'}
                        </span>
                        <strong className="text-foreground dark:text-slate-200">{r.symbol}</strong>
                        <span className="text-muted dark:text-slate-500">Qty: {r.quantity}</span>
                        <span className="text-muted dark:text-slate-500">
                          Price: {formatCurrencySafe(Number(r.avg_buy_price))}
                        </span>
                      </div>
                      {r.isValid ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                          Valid
                        </span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
                          {r.errors.join(', ')}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="pt-2 flex justify-end gap-3 border-t border-border dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-border dark:border-slate-700 text-foreground dark:text-slate-300 hover:bg-surface-raised dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={importMutation.isPending || csvRows.filter((r) => r.isValid).length === 0}
                onClick={() => {
                  const validItems = csvRows
                    .filter((r) => r.isValid)
                    .map((r) => ({
                      symbol: r.symbol,
                      name: r.name,
                      asset_class: r.asset_class,
                      exchange: r.exchange,
                      quantity: r.quantity,
                      avg_buy_price: r.avg_buy_price,
                      broker_account_id: importTargetBrokerId,
                      isin: r.isin,
                    }));

                  importMutation.mutate({
                    holdings: validItems,
                    duplicate_mode: duplicateMode,
                    broker_account_id: importTargetBrokerId,
                  });
                }}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium text-white shadow-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-50"
              >
                {importMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirm Import ({csvRows.filter((r) => r.isValid).length} Holdings)
              </button>
            </div>
          </motion.div>
        </InvestmentDialog>
      )}
    </div>
  );
}
