// ============================================================
// FINOVA — Persistent Portfolio Storage Engine
// Supports both remote Supabase (when configured) and
// browser-persistent local storage with full relational integrity.
// ============================================================

import type {
  BrokerAccountRow,
  HoldingRow,
  InvestmentInstrumentRow,
  InstrumentPriceRow,
  InvestmentTransactionRow,
  AssetCategory,
  ExchangeCode,
} from '@/types/database';
import { getExpandedCatalogRows } from '../market/stockCatalog.ts';

const BASE_SEED_INSTRUMENTS: InvestmentInstrumentRow[] = [
  {
    id: 'inst-rel-1',
    symbol: 'RELIANCE',
    instrument_name: 'Reliance Industries Ltd',
    asset_type: 'STOCK',
    exchange: 'NSE',
    isin: 'INE002A01018',
    currency: 'INR',
    issuer_name: 'Reliance Industries Limited',
    sector: 'Energy',
    industry: 'Oil & Gas Refining & Marketing',
    maturity_date: null,
    coupon_rate: null,
    is_active: true,
    is_custom: false,
    created_by: null,
    metadata: {},
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'inst-tcs-2',
    symbol: 'TCS',
    instrument_name: 'Tata Consultancy Services Ltd',
    asset_type: 'STOCK',
    exchange: 'NSE',
    isin: 'INE467B01029',
    currency: 'INR',
    issuer_name: 'Tata Group',
    sector: 'Information Technology',
    industry: 'IT Consulting & Services',
    maturity_date: null,
    coupon_rate: null,
    is_active: true,
    is_custom: false,
    created_by: null,
    metadata: {},
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'inst-infy-3',
    symbol: 'INFY',
    instrument_name: 'Infosys Ltd',
    asset_type: 'STOCK',
    exchange: 'NSE',
    isin: 'INE009A01021',
    currency: 'INR',
    issuer_name: 'Infosys Limited',
    sector: 'Information Technology',
    industry: 'IT Consulting & Services',
    maturity_date: null,
    coupon_rate: null,
    is_active: true,
    is_custom: false,
    created_by: null,
    metadata: {},
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'inst-hdfc-4',
    symbol: 'HDFCBANK',
    instrument_name: 'HDFC Bank Ltd',
    asset_type: 'STOCK',
    exchange: 'NSE',
    isin: 'INE040A01034',
    currency: 'INR',
    issuer_name: 'HDFC Bank',
    sector: 'Financial Services',
    industry: 'Private Sector Banks',
    maturity_date: null,
    coupon_rate: null,
    is_active: true,
    is_custom: false,
    created_by: null,
    metadata: {},
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'inst-icici-5',
    symbol: 'ICICIBANK',
    instrument_name: 'ICICI Bank Ltd',
    asset_type: 'STOCK',
    exchange: 'NSE',
    isin: 'INE090A01021',
    currency: 'INR',
    issuer_name: 'ICICI Bank',
    sector: 'Financial Services',
    industry: 'Private Sector Banks',
    maturity_date: null,
    coupon_rate: null,
    is_active: true,
    is_custom: false,
    created_by: null,
    metadata: {},
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'inst-emb-6',
    symbol: 'EMBASSY',
    instrument_name: 'Embassy Office Parks REIT',
    asset_type: 'REIT',
    exchange: 'NSE',
    isin: 'INE041025011',
    currency: 'INR',
    issuer_name: 'Embassy Group & Blackstone',
    sector: 'Real Estate',
    industry: 'Office REIT',
    maturity_date: null,
    coupon_rate: null,
    is_active: true,
    is_custom: false,
    created_by: null,
    metadata: {},
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'inst-mind-7',
    symbol: 'MINDSPACE',
    instrument_name: 'Mindspace Business Parks REIT',
    asset_type: 'REIT',
    exchange: 'NSE',
    isin: 'INE0CCU25019',
    currency: 'INR',
    issuer_name: 'K Raheja Corp & Blackstone',
    sector: 'Real Estate',
    industry: 'Office REIT',
    maturity_date: null,
    coupon_rate: null,
    is_active: true,
    is_custom: false,
    created_by: null,
    metadata: {},
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'inst-brook-8',
    symbol: 'BIRET',
    instrument_name: 'Brookfield India Real Estate Trust',
    asset_type: 'REIT',
    exchange: 'NSE',
    isin: 'INE0HR325010',
    currency: 'INR',
    issuer_name: 'Brookfield Asset Management',
    sector: 'Real Estate',
    industry: 'Commercial REIT',
    maturity_date: null,
    coupon_rate: null,
    is_active: true,
    is_custom: false,
    created_by: null,
    metadata: {},
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'inst-pginvit-9',
    symbol: 'PGINVIT',
    instrument_name: 'POWERGRID Infrastructure Investment Trust',
    asset_type: 'INVIT',
    exchange: 'NSE',
    isin: 'INE0CW523019',
    currency: 'INR',
    issuer_name: 'Power Grid Corporation of India',
    sector: 'Utilities',
    industry: 'Power Transmission InvIT',
    maturity_date: null,
    coupon_rate: null,
    is_active: true,
    is_custom: false,
    created_by: null,
    metadata: {},
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'inst-irb-10',
    symbol: 'IRBINVIT',
    instrument_name: 'IRB InvIT Fund',
    asset_type: 'INVIT',
    exchange: 'NSE',
    isin: 'INE183W23014',
    currency: 'INR',
    issuer_name: 'IRB Infrastructure Developers',
    sector: 'Infrastructure',
    industry: 'Road Transport & Highways',
    maturity_date: null,
    coupon_rate: null,
    is_active: true,
    is_custom: false,
    created_by: null,
    metadata: {},
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'inst-gs2033-11',
    symbol: 'GS2033_718',
    instrument_name: '7.18% GS 2033 Central Government Security',
    asset_type: 'BOND',
    exchange: 'NSE',
    isin: 'IN0020330030',
    currency: 'INR',
    issuer_name: 'Government of India',
    sector: 'Sovereign',
    industry: 'Central Government Bond',
    maturity_date: '2033-08-14',
    coupon_rate: 7.18,
    is_active: true,
    is_custom: false,
    created_by: null,
    metadata: {},
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'inst-gs2028-12',
    symbol: 'GS2028_706',
    instrument_name: '7.06% GS 2028 Sovereign Bond',
    asset_type: 'BOND',
    exchange: 'NSE',
    isin: 'IN0020280045',
    currency: 'INR',
    issuer_name: 'Government of India',
    sector: 'Sovereign',
    industry: 'Central Government Bond',
    maturity_date: '2028-04-10',
    coupon_rate: 7.06,
    is_active: true,
    is_custom: false,
    created_by: null,
    metadata: {},
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'inst-niftybees-13',
    symbol: 'NIFTYBEES',
    instrument_name: 'Nippon India ETF Nifty BeES',
    asset_type: 'MUTUAL_FUND',
    exchange: 'NSE',
    isin: 'INF204KB14I2',
    currency: 'INR',
    issuer_name: 'Nippon Life India Asset Management',
    sector: 'Asset Management',
    industry: 'Index ETF',
    maturity_date: null,
    coupon_rate: null,
    is_active: true,
    is_custom: false,
    created_by: null,
    metadata: {},
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'inst-goldbees-14',
    symbol: 'GOLDBEES',
    instrument_name: 'Nippon India ETF Gold BeES',
    asset_type: 'MUTUAL_FUND',
    exchange: 'NSE',
    isin: 'INF204KA1L12',
    currency: 'INR',
    issuer_name: 'Nippon Life India Asset Management',
    sector: 'Commodities',
    industry: 'Gold ETF',
    maturity_date: null,
    coupon_rate: null,
    is_active: true,
    is_custom: false,
    created_by: null,
    metadata: {},
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
];

const baseSeedSymbols = new Set(
  BASE_SEED_INSTRUMENTS.map((i) => `${i.symbol.toUpperCase()}|${i.exchange.toUpperCase()}`)
);

const expandedStockRows = getExpandedCatalogRows().filter(
  (r) => !baseSeedSymbols.has(`${r.symbol.toUpperCase()}|${r.exchange.toUpperCase()}`)
);

export const GLOBAL_SEED_INSTRUMENTS: InvestmentInstrumentRow[] = [
  ...BASE_SEED_INSTRUMENTS,
  ...expandedStockRows,
];

export const GLOBAL_SEED_PRICES: Record<string, InstrumentPriceRow> = {
  RELIANCE: {
    id: 'p-1',
    instrument_id: 'inst-rel-1',
    price: 2985.0,
    currency: 'INR',
    source: 'NSE_EOD',
    status: 'DELAYED',
    day_change: 28.5,
    day_change_pct: 0.96,
    high_52w: 3217.0,
    low_52w: 2220.0,
    volume: 5420000,
    price_timestamp: '2026-10-09T10:00:00Z',
    received_at: '2026-10-09T10:05:00Z',
  },
  TCS: {
    id: 'p-2',
    instrument_id: 'inst-tcs-2',
    price: 3960.0,
    currency: 'INR',
    source: 'NSE_EOD',
    status: 'DELAYED',
    day_change: -12.0,
    day_change_pct: -0.3,
    high_52w: 4585.0,
    low_52w: 3310.0,
    volume: 1840000,
    price_timestamp: '2026-10-09T10:00:00Z',
    received_at: '2026-10-09T10:05:00Z',
  },
  INFY: {
    id: 'p-3',
    instrument_id: 'inst-infy-3',
    price: 1820.0,
    currency: 'INR',
    source: 'NSE_EOD',
    status: 'DELAYED',
    day_change: 15.0,
    day_change_pct: 0.83,
    high_52w: 1990.0,
    low_52w: 1350.0,
    volume: 3200000,
    price_timestamp: '2026-10-09T10:00:00Z',
    received_at: '2026-10-09T10:05:00Z',
  },
  HDFCBANK: {
    id: 'p-4',
    instrument_id: 'inst-hdfc-4',
    price: 1680.0,
    currency: 'INR',
    source: 'NSE_EOD',
    status: 'DELAYED',
    day_change: 8.5,
    day_change_pct: 0.51,
    high_52w: 1795.0,
    low_52w: 1363.0,
    volume: 8900000,
    price_timestamp: '2026-10-09T10:00:00Z',
    received_at: '2026-10-09T10:05:00Z',
  },
  ICICIBANK: {
    id: 'p-5',
    instrument_id: 'inst-icici-5',
    price: 1265.0,
    currency: 'INR',
    source: 'NSE_EOD',
    status: 'DELAYED',
    day_change: 14.0,
    day_change_pct: 1.12,
    high_52w: 1330.0,
    low_52w: 928.0,
    volume: 6700000,
    price_timestamp: '2026-10-09T10:00:00Z',
    received_at: '2026-10-09T10:05:00Z',
  },
  EMBASSY: {
    id: 'p-6',
    instrument_id: 'inst-emb-6',
    price: 388.0,
    currency: 'INR',
    source: 'NSE_EOD',
    status: 'DELAYED',
    day_change: 2.2,
    day_change_pct: 0.57,
    high_52w: 415.0,
    low_52w: 295.0,
    volume: 450000,
    price_timestamp: '2026-10-09T10:00:00Z',
    received_at: '2026-10-09T10:05:00Z',
  },
  MINDSPACE: {
    id: 'p-7',
    instrument_id: 'inst-mind-7',
    price: 362.0,
    currency: 'INR',
    source: 'NSE_EOD',
    status: 'DELAYED',
    day_change: 1.5,
    day_change_pct: 0.42,
    high_52w: 390.0,
    low_52w: 305.0,
    volume: 210000,
    price_timestamp: '2026-10-09T10:00:00Z',
    received_at: '2026-10-09T10:05:00Z',
  },
  BIRET: {
    id: 'p-8',
    instrument_id: 'inst-brook-8',
    price: 265.0,
    currency: 'INR',
    source: 'NSE_EOD',
    status: 'DELAYED',
    day_change: -0.8,
    day_change_pct: -0.3,
    high_52w: 295.0,
    low_52w: 230.0,
    volume: 310000,
    price_timestamp: '2026-10-09T10:00:00Z',
    received_at: '2026-10-09T10:05:00Z',
  },
  PGINVIT: {
    id: 'p-9',
    instrument_id: 'inst-pginvit-9',
    price: 114.0,
    currency: 'INR',
    source: 'NSE_EOD',
    status: 'DELAYED',
    day_change: 0.6,
    day_change_pct: 0.53,
    high_52w: 125.0,
    low_52w: 92.0,
    volume: 1200000,
    price_timestamp: '2026-10-09T10:00:00Z',
    received_at: '2026-10-09T10:05:00Z',
  },
  IRBINVIT: {
    id: 'p-10',
    instrument_id: 'inst-irb-10',
    price: 68.0,
    currency: 'INR',
    source: 'NSE_EOD',
    status: 'DELAYED',
    day_change: -0.2,
    day_change_pct: -0.29,
    high_52w: 75.0,
    low_52w: 58.0,
    volume: 850000,
    price_timestamp: '2026-10-09T10:00:00Z',
    received_at: '2026-10-09T10:05:00Z',
  },
  GS2033_718: {
    id: 'p-11',
    instrument_id: 'inst-gs2033-11',
    price: 101.5,
    currency: 'INR',
    source: 'CCIL_EOD',
    status: 'EOD',
    day_change: 0.05,
    day_change_pct: 0.05,
    high_52w: 103.2,
    low_52w: 97.8,
    volume: 150000,
    price_timestamp: '2026-10-09T10:00:00Z',
    received_at: '2026-10-09T10:05:00Z',
  },
  NIFTYBEES: {
    id: 'p-13',
    instrument_id: 'inst-niftybees-13',
    price: 268.0,
    currency: 'INR',
    source: 'NSE_EOD',
    status: 'DELAYED',
    day_change: 1.8,
    day_change_pct: 0.68,
    high_52w: 285.0,
    low_52w: 205.0,
    volume: 2400000,
    price_timestamp: '2026-10-09T10:00:00Z',
    received_at: '2026-10-09T10:05:00Z',
  },
  GOLDBEES: {
    id: 'p-14',
    instrument_id: 'inst-goldbees-14',
    price: 64.5,
    currency: 'INR',
    source: 'NSE_EOD',
    status: 'DELAYED',
    day_change: 0.4,
    day_change_pct: 0.62,
    high_52w: 72.0,
    low_52w: 52.0,
    volume: 4800000,
    price_timestamp: '2026-10-09T10:00:00Z',
    received_at: '2026-10-09T10:05:00Z',
  },
  // Note: GS2028_706 deliberately does NOT have a seed price to test "Price unavailable" handling!
};

interface LocalPortfolioState {
  broker_accounts: BrokerAccountRow[];
  holdings: HoldingRow[];
  custom_instruments: InvestmentInstrumentRow[];
  transactions: InvestmentTransactionRow[];
}

const STORAGE_KEY = 'finova_user_portfolio_v1';

// Server-side in-memory singleton cache to ensure persistence within node process
let serverState: LocalPortfolioState = {
  broker_accounts: [],
  holdings: [],
  custom_instruments: [],
  transactions: [],
};

export class PortfolioStorage {
  private static isClient(): boolean {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  }

  public static getState(): LocalPortfolioState {
    if (this.isClient()) {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          return {
            broker_accounts: parsed.broker_accounts || [],
            holdings: parsed.holdings || [],
            custom_instruments: parsed.custom_instruments || [],
            transactions: parsed.transactions || [],
          };
        }
      } catch {
        // fallback to server state
      }
    }
    return serverState;
  }

  public static saveState(state: LocalPortfolioState): void {
    serverState = state;
    if (this.isClient()) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (err) {
        console.error('Failed to save portfolio state to localStorage', err);
      }
    }
  }

  public static clear(): void {
    serverState = {
      broker_accounts: [],
      holdings: [],
      custom_instruments: [],
      transactions: [],
    };
    this.dynamicPrices.clear();
    if (this.isClient()) {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {}
    }
  }

  // ─── Broker Accounts ────────────────────────────────────────

  public static getBrokerAccounts(userId: string = 'current_user'): BrokerAccountRow[] {
    const state = this.getState();
    return state.broker_accounts.filter((b) => b.user_id === userId);
  }

  public static addBrokerAccount(
    account: Omit<BrokerAccountRow, 'id' | 'created_at' | 'updated_at'>
  ): BrokerAccountRow {
    const state = this.getState();
    const id = `ba-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const newAccount: BrokerAccountRow = {
      ...account,
      id,
      created_at: now,
      updated_at: now,
    };
    state.broker_accounts.push(newAccount);
    this.saveState(state);
    return newAccount;
  }

  public static updateBrokerAccount(
    id: string,
    updates: Partial<BrokerAccountRow>
  ): BrokerAccountRow | null {
    const state = this.getState();
    const idx = state.broker_accounts.findIndex((b) => b.id === id);
    if (idx === -1) return null;

    state.broker_accounts[idx] = {
      ...state.broker_accounts[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.saveState(state);
    return state.broker_accounts[idx];
  }

  public static deleteBrokerAccount(id: string, force = false): boolean {
    const state = this.getState();
    const hasHoldings = state.holdings.some((h) => h.broker_account_id === id);
    const hasTransactions = state.transactions.some((t) => t.broker_account_id === id);

    if (!force && (hasHoldings || hasTransactions)) {
      // Safeguard: block deletion of non-empty account
      return false;
    }

    const beforeCount = state.broker_accounts.length;
    state.broker_accounts = state.broker_accounts.filter((b) => b.id !== id);
    if (force) {
      state.holdings = state.holdings.filter((h) => h.broker_account_id !== id);
      state.transactions = state.transactions.filter((t) => t.broker_account_id !== id);
    }
    this.saveState(state);
    return state.broker_accounts.length < beforeCount;
  }

  // ─── Instruments ────────────────────────────────────────────

  public static getInstruments(
    queryOrOptions?: string | { query?: string; assetType?: AssetCategory },
    assetType?: AssetCategory
  ): InvestmentInstrumentRow[] {
    const state = this.getState();
    const all = [...GLOBAL_SEED_INSTRUMENTS, ...state.custom_instruments];
    
    let rawQuery = '';
    let targetAssetType = assetType;
    if (typeof queryOrOptions === 'string') {
      rawQuery = queryOrOptions;
    } else if (queryOrOptions && typeof queryOrOptions === 'object') {
      rawQuery = queryOrOptions.query || '';
      if (!targetAssetType && queryOrOptions.assetType) {
        targetAssetType = queryOrOptions.assetType;
      }
    }

    return all.filter((inst) => {
      if (targetAssetType && inst.asset_type !== targetAssetType) return false;
      if (rawQuery && rawQuery.trim()) {
        const q = rawQuery.toLowerCase().trim();
        const sym = inst.symbol.toLowerCase();
        const name = inst.instrument_name.toLowerCase();
        const isin = (inst.isin || '').toLowerCase();
        const sector = (inst.sector || '').toLowerCase();
        const industry = (inst.industry || '').toLowerCase();

        // 1. Direct substring matches
        if (sym.includes(q) || name.includes(q) || isin.includes(q) || sector.includes(q) || industry.includes(q)) {
          return true;
        }

        // 2. Normalized matching (ignoring spaces, hyphens, and punctuation)
        // e.g. "COAL INDIA" matches "COALINDIA", "BAJAJ AUTO" matches "BAJAJ-AUTO"
        const cleanQ = q.replace(/[\s\-_.]+/g, '');
        const cleanSym = sym.replace(/[\s\-_.]+/g, '');
        const cleanName = name.replace(/[\s\-_.]+/g, '');
        if (cleanQ.length >= 2 && (cleanSym.includes(cleanQ) || cleanName.includes(cleanQ))) {
          return true;
        }

        // 3. Multi-word token matching (all words match symbol or name)
        // e.g. "INDIA COAL" or "HERO MOTOR" matches "Hero MotoCorp Ltd" / "Coal India Ltd"
        const tokens = q.split(/\s+/).filter(Boolean);
        if (tokens.length > 1) {
          const allTokensMatch = tokens.every(
            (token) => sym.includes(token) || name.includes(token) || isin.includes(token)
          );
          if (allTokensMatch) return true;
        }

        return false;
      }
      return true;
    });
  }

  public static getInstrumentById(id: string): InvestmentInstrumentRow | null {
    const state = this.getState();
    const all = [...GLOBAL_SEED_INSTRUMENTS, ...state.custom_instruments];
    return all.find((i) => i.id === id) || null;
  }

  public static resolveInstrument(
    symbol: string,
    name: string,
    assetType: AssetCategory,
    exchange: string = 'NSE',
    isin?: string | null
  ): InvestmentInstrumentRow {
    const upperSym = symbol.toUpperCase().trim();
    const state = this.getState();
    const all = [...GLOBAL_SEED_INSTRUMENTS, ...state.custom_instruments];

    // Try finding existing by symbol + exchange or ISIN
    const existing = all.find(
      (i) =>
        (isin && i.isin === isin) ||
        (i.symbol.toUpperCase() === upperSym && i.exchange === exchange)
    );
    if (existing) return existing;

    // Create user-scoped custom instrument
    const id = `custom-inst-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    const custom: InvestmentInstrumentRow = {
      id,
      symbol: upperSym,
      instrument_name: name || upperSym,
      asset_type: assetType,
      exchange: (exchange as ExchangeCode) || 'NSE',
      isin: isin || null,
      currency: 'INR',
      issuer_name: null,
      sector: null,
      industry: null,
      maturity_date: null,
      coupon_rate: null,
      is_active: true,
      is_custom: true,
      created_by: 'current_user',
      metadata: {},
      created_at: now,
      updated_at: now,
    };
    state.custom_instruments.push(custom);
    this.saveState(state);
    return custom;
  }

  // ─── Holdings ───────────────────────────────────────────────

  public static getHoldings(userId: string = 'current_user'): HoldingRow[] {
    const state = this.getState();
    return state.holdings.filter((h) => h.user_id === userId);
  }

  public static getHoldingById(id: string): HoldingRow | null {
    const state = this.getState();
    return state.holdings.find((h) => h.id === id) || null;
  }

  public static addHolding(
    holding: Omit<HoldingRow, 'id' | 'created_at' | 'updated_at'>
  ): HoldingRow {
    if (holding.quantity <= 0) {
      throw new Error('Quantity must be greater than zero.');
    }
    if (holding.average_buy_price < 0) {
      throw new Error('Purchase price cannot be negative.');
    }

    const state = this.getState();

    // Check if position already exists for this broker + instrument
    const existingIdx = state.holdings.findIndex(
      (h) =>
        h.broker_account_id === holding.broker_account_id &&
        h.instrument_id === holding.instrument_id
    );

    const now = new Date().toISOString();

    if (existingIdx !== -1) {
      // Update existing position with weighted average buy price
      const existing = state.holdings[existingIdx];
      const newTotalQty = existing.quantity + holding.quantity;
      const newAvgPrice =
        (existing.quantity * existing.average_buy_price +
          holding.quantity * holding.average_buy_price) /
        newTotalQty;

      state.holdings[existingIdx] = {
        ...existing,
        quantity: Math.round(newTotalQty * 1000000) / 1000000,
        average_buy_price: Math.round(newAvgPrice * 10000) / 10000,
        opening_quantity: existing.is_ledger_managed
          ? existing.opening_quantity
          : Math.round(newTotalQty * 1000000) / 1000000,
        opening_buy_price: existing.is_ledger_managed
          ? existing.opening_buy_price
          : Math.round(newAvgPrice * 10000) / 10000,
        updated_at: now,
      };
      this.saveState(state);
      return state.holdings[existingIdx];
    }

    const id = `hld-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newHolding: HoldingRow = {
      ...holding,
      id,
      opening_quantity: holding.quantity,
      opening_buy_price: holding.average_buy_price,
      is_ledger_managed: false,
      created_at: now,
      updated_at: now,
    };
    state.holdings.push(newHolding);
    this.saveState(state);
    return newHolding;
  }


  public static updateHolding(
    id: string,
    updates: Partial<Pick<HoldingRow, 'quantity' | 'average_buy_price' | 'as_of'>>
  ): HoldingRow | null {
    const state = this.getState();
    const idx = state.holdings.findIndex((h) => h.id === id);
    if (idx === -1) return null;

    if (updates.quantity !== undefined && updates.quantity <= 0) {
      throw new Error('Quantity must be greater than zero.');
    }
    if (updates.average_buy_price !== undefined && updates.average_buy_price < 0) {
      throw new Error('Purchase price cannot be negative.');
    }

    state.holdings[idx] = {
      ...state.holdings[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.saveState(state);
    return state.holdings[idx];
  }

  public static deleteHolding(id: string): boolean {
    const state = this.getState();
    const beforeCount = state.holdings.length;
    state.holdings = state.holdings.filter((h) => h.id !== id);
    this.saveState(state);
    return state.holdings.length < beforeCount;
  }

  // ─── Transactions Ledger ────────────────────────────────────

  public static getTransactions(
    userId: string = 'current_user',
    options?: {
      brokerAccountId?: string;
      instrumentId?: string;
      transactionType?: string;
      startDate?: string;
      endDate?: string;
      searchQuery?: string;
      limit?: number;
      offset?: number;
    }
  ): { transactions: InvestmentTransactionRow[]; totalCount: number } {
    const state = this.getState();
    let list = state.transactions.filter((t) => t.user_id === userId);

    if (options?.brokerAccountId) {
      list = list.filter((t) => t.broker_account_id === options.brokerAccountId);
    }
    if (options?.instrumentId) {
      list = list.filter((t) => t.instrument_id === options.instrumentId);
    }
    if (options?.transactionType && options.transactionType !== 'ALL') {
      const typeUpper = options.transactionType.toUpperCase();
      list = list.filter((t) => t.transaction_type.toUpperCase() === typeUpper);
    }
    if (options?.startDate) {
      const startMs = new Date(options.startDate).getTime();
      list = list.filter((t) => new Date(t.transaction_date).getTime() >= startMs);
    }
    if (options?.endDate) {
      const endMs = new Date(options.endDate).getTime();
      list = list.filter((t) => new Date(t.transaction_date).getTime() <= endMs);
    }
    if (options?.searchQuery && options.searchQuery.trim()) {
      const q = options.searchQuery.toLowerCase().trim();
      list = list.filter((t) => {
        const inst = this.getInstrumentById(t.instrument_id);
        const matchesSymbol = inst?.symbol.toLowerCase().includes(q);
        const matchesName = inst?.instrument_name.toLowerCase().includes(q);
        const matchesNotes = t.notes?.toLowerCase().includes(q);
        const matchesRef = t.external_reference?.toLowerCase().includes(q);
        return matchesSymbol || matchesName || matchesNotes || matchesRef;
      });
    }

    // Sort descending by transaction_date by default
    list.sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime());

    const totalCount = list.length;
    const offset = options?.offset || 0;
    const limit = options?.limit || list.length;
    const paginated = list.slice(offset, offset + limit);

    return { transactions: paginated, totalCount };
  }

  public static getTransactionById(id: string): InvestmentTransactionRow | null {
    const state = this.getState();
    return state.transactions.find((t) => t.id === id) || null;
  }

  public static addTransaction(
    tx: Omit<InvestmentTransactionRow, 'id' | 'created_at'>,
    options?: { reconcileHolding?: boolean; allowOversell?: boolean }
  ): InvestmentTransactionRow {
    const state = this.getState();

    // Deduplication check by broker_account_id + external_reference
    if (tx.external_reference && tx.external_reference.trim()) {
      const exists = state.transactions.some(
        (t) =>
          t.broker_account_id === tx.broker_account_id &&
          t.external_reference?.trim() === tx.external_reference?.trim()
      );
      if (exists) {
        throw new Error(`Transaction with reference "${tx.external_reference}" already exists for this broker account.`);
      }
    }

    // Quantity / Price validation
    const typeUpper = tx.transaction_type.toUpperCase();
    if (['BUY', 'SELL'].includes(typeUpper)) {
      if (tx.quantity <= 0) {
        throw new Error('Quantity must be greater than zero for Buy and Sell orders.');
      }
      if (tx.unit_price <= 0) {
        throw new Error('Unit price must be greater than zero.');
      }
      if (typeUpper === 'SELL' && !options?.allowOversell) {
        const existingHolding = state.holdings.find(
          (h) => h.broker_account_id === tx.broker_account_id && h.instrument_id === tx.instrument_id
        );
        const currentQty = existingHolding ? existingHolding.quantity : 0;
        if (tx.quantity > currentQty) {
          throw new Error(`Insufficient quantity to sell: requested ${tx.quantity} units, but position only holds ${currentQty} units.`);
        }
      }
    } else if (['BONUS', 'SPLIT'].includes(typeUpper)) {
      if (tx.quantity <= 0) {
        throw new Error('Quantity must be greater than zero for Corporate Actions.');
      }
    }

    const id = `tx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const newTx: InvestmentTransactionRow = {
      ...tx,
      id,
      created_at: now,
    };

    state.transactions.push(newTx);

    // Optional holding reconciliation
    if (options?.reconcileHolding !== false) {
      this.reconcileHoldingForTransaction(newTx);
    }

    this.saveState(state);
    return newTx;
  }

  public static updateTransaction(
    id: string,
    updates: Partial<InvestmentTransactionRow>,
    reconcile?: boolean
  ): InvestmentTransactionRow | null {
    const state = this.getState();
    const idx = state.transactions.findIndex((t) => t.id === id);
    if (idx === -1) return null;

    const existing = state.transactions[idx];
    const updated: InvestmentTransactionRow = {
      ...existing,
      ...updates,
    };

    // If reconcile is enabled, test replay before committing to prevent corrupted negative positions
    if (reconcile) {
      const backupTransactions = [...state.transactions];
      const backupHoldings = JSON.parse(JSON.stringify(state.holdings));

      state.transactions[idx] = updated;
      try {
        this.recalculateHoldingFromTransactions(updated.broker_account_id, updated.instrument_id);
      } catch (err) {
        // Rollback state immediately
        state.transactions = backupTransactions;
        state.holdings = backupHoldings;
        throw err;
      }
    } else {
      state.transactions[idx] = updated;
    }

    this.saveState(state);
    return updated;
  }

  public static deleteTransaction(id: string, reconcile?: boolean): boolean {
    const state = this.getState();
    const target = state.transactions.find((t) => t.id === id);
    if (!target) return false;

    if (reconcile) {
      const backupTransactions = [...state.transactions];
      const backupHoldings = JSON.parse(JSON.stringify(state.holdings));

      state.transactions = state.transactions.filter((t) => t.id !== id);
      try {
        this.recalculateHoldingFromTransactions(target.broker_account_id, target.instrument_id);
      } catch (err) {
        // Rollback state immediately
        state.transactions = backupTransactions;
        state.holdings = backupHoldings;
        throw err;
      }
    } else {
      state.transactions = state.transactions.filter((t) => t.id !== id);
    }

    this.saveState(state);
    return true;
  }

  public static bulkAddTransactions(
    inputs: Array<Omit<InvestmentTransactionRow, 'id' | 'created_at'>>,
    options?: { reconcileHoldings?: boolean }
  ): {
    imported: InvestmentTransactionRow[];
    duplicates: Array<Omit<InvestmentTransactionRow, 'id' | 'created_at'>>;
    count: number;
  } {
    const imported: InvestmentTransactionRow[] = [];
    const duplicates: Array<Omit<InvestmentTransactionRow, 'id' | 'created_at'>> = [];

    for (const input of inputs) {
      try {
        const res = this.addTransaction(input, { reconcileHolding: false });
        imported.push(res);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('already exists')) {
          duplicates.push(input);
        } else {
          throw err;
        }
      }
    }

    if (options?.reconcileHoldings) {
      const pairs = new Set<string>();
      imported.forEach((t) => pairs.add(`${t.broker_account_id}:::${t.instrument_id}`));
      pairs.forEach((pair) => {
        const [bId, iId] = pair.split(':::');
        this.recalculateHoldingFromTransactions(bId, iId);
      });
    }

    return { imported, duplicates, count: imported.length };
  }

  private static reconcileHoldingForTransaction(tx: InvestmentTransactionRow): void {
    const state = this.getState();
    const typeUpper = tx.transaction_type.toUpperCase();
    const existingIdx = state.holdings.findIndex(
      (h) => h.broker_account_id === tx.broker_account_id && h.instrument_id === tx.instrument_id
    );

    const now = new Date().toISOString();

    if (typeUpper === 'BUY') {
      if (existingIdx !== -1) {
        const existing = state.holdings[existingIdx];
        const newTotalQty = existing.quantity + tx.quantity;
        const newAvgPrice =
          (existing.quantity * existing.average_buy_price + tx.quantity * tx.unit_price) /
          newTotalQty;
        state.holdings[existingIdx] = {
          ...existing,
          quantity: Math.round(newTotalQty * 1000000) / 1000000,
          average_buy_price: Math.round(newAvgPrice * 10000) / 10000,
          opening_quantity: existing.is_ledger_managed
            ? existing.opening_quantity
            : existing.quantity,
          opening_buy_price: existing.is_ledger_managed
            ? existing.opening_buy_price
            : existing.average_buy_price,
          is_ledger_managed: true,
          updated_at: now,
        };
      } else {
        const newHolding: HoldingRow = {
          id: `hld-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          user_id: tx.user_id,
          broker_account_id: tx.broker_account_id,
          instrument_id: tx.instrument_id,
          quantity: tx.quantity,
          average_buy_price: tx.unit_price,
          currency: tx.currency || 'INR',
          data_source: tx.source || 'MANUAL',
          as_of: tx.transaction_date,
          opening_quantity: 0,
          opening_buy_price: 0,
          is_ledger_managed: true,
          created_at: now,
          updated_at: now,
        };
        state.holdings.push(newHolding);
      }
    } else if (typeUpper === 'SELL') {
      if (existingIdx !== -1) {
        const existing = state.holdings[existingIdx];
        const remainingQty = Math.max(0, existing.quantity - tx.quantity);
        if (remainingQty <= 0) {
          state.holdings.splice(existingIdx, 1);
        } else {
          state.holdings[existingIdx] = {
            ...existing,
            quantity: Math.round(remainingQty * 1000000) / 1000000,
            is_ledger_managed: true,
            updated_at: now,
          };
        }
      }
    } else if (typeUpper === 'BONUS' || typeUpper === 'SPLIT') {
      if (existingIdx !== -1) {
        const existing = state.holdings[existingIdx];
        const newTotalQty = existing.quantity + tx.quantity;
        const newAvgPrice = (existing.quantity * existing.average_buy_price) / newTotalQty;
        state.holdings[existingIdx] = {
          ...existing,
          quantity: Math.round(newTotalQty * 1000000) / 1000000,
          average_buy_price: Math.round(newAvgPrice * 10000) / 10000,
          is_ledger_managed: true,
          updated_at: now,
        };
      }
    }
  }

  public static recalculateHoldingFromTransactions(brokerAccountId: string, instrumentId: string): void {
    const state = this.getState();
    const txs = state.transactions
      .filter((t) => t.broker_account_id === brokerAccountId && t.instrument_id === instrumentId)
      .sort((a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime());

    const existingIdx = state.holdings.findIndex(
      (h) => h.broker_account_id === brokerAccountId && h.instrument_id === instrumentId
    );
    const existing = existingIdx !== -1 ? state.holdings[existingIdx] : null;

    // If NO transactions exist for this holding:
    if (txs.length === 0) {
      // If it is a manual opening position, preserve it untouched!
      if (existing && !existing.is_ledger_managed) {
        return; // OPENING_BALANCE_PRESERVED
      }
      // If it was created purely by transactions that were all deleted, remove it
      if (existingIdx !== -1) {
        state.holdings.splice(existingIdx, 1);
      }
      return;
    }

    const baseQty = (existing && existing.opening_quantity != null) ? existing.opening_quantity : 0;
    const basePrice = (existing && existing.opening_buy_price != null) ? existing.opening_buy_price : 0;

    let qty = baseQty;
    let totalCost = baseQty * basePrice;
    let avgPrice = basePrice;

    for (const t of txs) {
      const type = t.transaction_type.toUpperCase();
      if (type === 'BUY') {
        const newQty = qty + t.quantity;
        totalCost += t.quantity * t.unit_price;
        avgPrice = newQty > 0 ? totalCost / newQty : 0;
        qty = newQty;
      } else if (type === 'SELL') {
        if (t.quantity > qty) {
          throw new Error(`Unsafe transaction state: Sell of ${t.quantity} units exceeds available position of ${qty} units on ${t.transaction_date}.`);
        }
        qty = Math.max(0, qty - t.quantity);
        totalCost = qty * avgPrice;
      } else if (type === 'BONUS' || type === 'SPLIT') {
        qty += t.quantity;
        avgPrice = qty > 0 ? totalCost / qty : 0;
      }
    }

    const now = new Date().toISOString();
    if (qty > 0) {
      if (existingIdx !== -1) {
        state.holdings[existingIdx] = {
          ...state.holdings[existingIdx],
          quantity: Math.round(qty * 1000000) / 1000000,
          average_buy_price: Math.round(avgPrice * 10000) / 10000,
          is_ledger_managed: true,
          updated_at: now,
        };
      } else {
        state.holdings.push({
          id: `hld-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          user_id: 'current_user',
          broker_account_id: brokerAccountId,
          instrument_id: instrumentId,
          quantity: Math.round(qty * 1000000) / 1000000,
          average_buy_price: Math.round(avgPrice * 10000) / 10000,
          currency: 'INR',
          data_source: 'MANUAL',
          as_of: now,
          opening_quantity: baseQty,
          opening_buy_price: basePrice,
          is_ledger_managed: true,
          created_at: now,
          updated_at: now,
        });
      }
    } else if (existingIdx !== -1) {
      state.holdings.splice(existingIdx, 1);
    }
  }


  // ─── Market Prices ──────────────────────────────────────────

  private static dynamicPrices: Map<string, InstrumentPriceRow> = new Map();

  public static setMarketPrice(symbol: string, price: InstrumentPriceRow): void {
    if (!symbol) return;
    this.dynamicPrices.set(symbol.toUpperCase(), price);
  }

  public static setDynamicPrice(symbol: string, price: InstrumentPriceRow): void {
    this.setMarketPrice(symbol, price);
  }

  public static setMarketPrices(
    prices: Record<string, InstrumentPriceRow> | Map<string, InstrumentPriceRow>
  ): void {
    if (prices instanceof Map) {
      for (const [sym, p] of prices.entries()) {
        this.dynamicPrices.set(sym.toUpperCase(), p);
      }
    } else if (prices && typeof prices === 'object') {
      for (const [sym, p] of Object.entries(prices)) {
        this.dynamicPrices.set(sym.toUpperCase(), p);
      }
    }
  }

  public static clearDynamicPrices(): void {
    this.dynamicPrices.clear();
  }

  /**
   * Retrieves market price for a symbol.
   * Prioritizes verified dynamic quotes from the market-data feed.
   * Defaults allowSeedFallback to false in production to ensure static seed prices
   * never reach real portfolio calculations or valuations.
   */
  public static getMarketPrice(symbol: string, allowSeedFallback = false): InstrumentPriceRow | null {
    const sym = symbol?.toUpperCase();
    if (!sym) return null;

    if (this.dynamicPrices.has(sym)) {
      return this.dynamicPrices.get(sym)!;
    }

    if (allowSeedFallback) {
      return GLOBAL_SEED_PRICES[sym] || null;
    }

    return null;
  }
}
