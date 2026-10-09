// ============================================================
// FINOVA — Database & Relational Financial Types
// Matches PostgreSQL Schema (Prompt 5)
// ============================================================

// ─── Enums & Domain Unions ───────────────────────────────────

export type BrokerCode =
  | 'ZERODHA'
  | 'GROWW'
  | 'ANGEL_ONE'
  | 'ICICI_DIRECT'
  | 'UPSTOX'
  | 'HDFC_SKY'
  | 'KOTAK_SECURITIES'
  | 'CDSL'
  | 'NSDL'
  | 'OTHER'
  | (string & {});

export type AccountType = 'broker' | 'depository' | 'manual';

export type BrokerConnectionStatus =
  | 'MANUAL'
  | 'NOT_CONNECTED'
  | 'CONNECTED'
  | 'ERROR'
  | 'SYNCING';

export type DataSource = 'MANUAL' | 'CSV' | 'API';

export type AssetCategory =
  | 'STOCK'
  | 'MUTUAL_FUND'
  | 'REIT'
  | 'INVIT'
  | 'BOND'
  | 'CASH';

export type ExchangeCode =
  | 'NSE'
  | 'BSE'
  | 'NCD'
  | 'MCX'
  | 'MUTUAL_FUND_INDIA'
  | 'OTHER';

export type TransactionType =
  | 'BUY'
  | 'SELL'
  | 'DIVIDEND'
  | 'INTEREST'
  | 'COUPON'
  | 'BONUS'
  | 'SPLIT'
  | 'FEE';

export type PriceStatus = 'REALTIME' | 'DELAYED' | 'EOD' | 'STALE';

export type CompletenessStatus =
  | 'COMPLETE'
  | 'PARTIAL_PRICING'
  | 'NO_PRICING';

export type RiskPreference = 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE';

export type InvestmentHorizon = 'SHORT_TERM' | 'MEDIUM_TERM' | 'LONG_TERM';

export type LiquidityPreference = 'HIGH' | 'BALANCED' | 'LOW';

export type ExperienceLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

export type GoalPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export type GoalStatus = 'ACTIVE' | 'ACHIEVED' | 'PAUSED' | 'CANCELLED';

export type GoalCategory =
  | 'EMERGENCY_FUND'
  | 'EDUCATION'
  | 'HOME'
  | 'WEALTH'
  | 'RETIREMENT'
  | 'VEHICLE'
  | 'VACATION'
  | 'GENERAL';


// ─── Table Row Types (Direct Supabase Schema Mapping) ─────────

/** Row in public.broker_accounts */
export interface BrokerAccountRow {
  id: string;
  user_id: string;
  broker_code: string;
  display_name: string;
  account_type: AccountType;
  connection_status: BrokerConnectionStatus;
  data_source: DataSource;
  currency: string;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
  // Legacy compatibility fields if migrated from draft schema
  broker_name?: string;
  account_label?: string | null;
  color_hex?: string;
  is_active?: boolean;
}

/** Row in public.instruments */
export interface InvestmentInstrumentRow {
  id: string;
  symbol: string;
  instrument_name: string;
  asset_type: AssetCategory;
  exchange: ExchangeCode;
  isin: string | null;
  currency: string;
  issuer_name: string | null;
  sector: string | null;
  industry: string | null;
  maturity_date: string | null;
  coupon_rate: number | null;
  is_active: boolean;
  is_custom: boolean;
  created_by: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/** Row in public.holdings */
export interface HoldingRow {
  id: string;
  user_id: string;
  broker_account_id: string;
  instrument_id: string;
  quantity: number;
  average_buy_price: number;
  currency: string;
  data_source: DataSource;
  as_of: string;
  created_at: string;
  updated_at: string;
}

/** Row in public.investment_transactions */
export interface InvestmentTransactionRow {
  id: string;
  user_id: string;
  broker_account_id: string;
  instrument_id: string;
  transaction_type: TransactionType;
  quantity: number;
  unit_price: number;
  gross_amount: number;
  fees: number;
  taxes: number;
  net_amount: number;
  currency: string;
  transaction_date: string;
  settlement_date: string | null;
  source: DataSource;
  external_reference: string | null;
  notes: string | null;
  created_at: string;
}

/** Row in public.instrument_prices */
export interface InstrumentPriceRow {
  id: string;
  instrument_id: string;
  price: number;
  currency: string;
  source: string;
  status: PriceStatus;
  day_change: number | null;
  day_change_pct: number | null;
  high_52w: number | null;
  low_52w: number | null;
  volume: number | null;
  price_timestamp: string;
  received_at: string;
}

/** Row in public.portfolio_snapshots */
export interface PortfolioSnapshotRow {
  id: string;
  user_id: string;
  snapshot_date: string;
  invested_value: number;
  portfolio_value: number | null;
  unrealized_pnl: number | null;
  realized_pnl: number | null;
  currency: string;
  pricing_timestamp: string | null;
  completeness_status: CompletenessStatus;
  metadata: Record<string, unknown>;
  created_at: string;
}

/** Row in public.risk_profiles */
export interface RiskProfileRow {
  id: string;
  user_id: string;
  risk_preference: RiskPreference;
  investment_horizon: InvestmentHorizon;
  liquidity_preference: LiquidityPreference;
  experience_level: ExperienceLevel;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/** Row in public.investment_goals */
export interface InvestmentGoalRow {
  id: string;
  user_id: string;
  goal_name: string;
  target_amount: number;
  current_amount: number;
  target_date: string;
  currency: string;
  priority: GoalPriority;
  status: GoalStatus;
  category: GoalCategory;
  created_at: string;
  updated_at: string;
}


// ─── Insert / Update Input Types ──────────────────────────────

export type BrokerAccountInsert = Omit<BrokerAccountRow, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type BrokerAccountUpdate = Partial<Omit<BrokerAccountRow, 'id' | 'user_id' | 'created_at'>>;

export type InstrumentInsert = Omit<InvestmentInstrumentRow, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type InstrumentUpdate = Partial<Omit<InvestmentInstrumentRow, 'id' | 'created_at'>>;

export type HoldingInsert = Omit<HoldingRow, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type HoldingUpdate = Partial<Omit<HoldingRow, 'id' | 'user_id' | 'created_at'>>;

export type TransactionInsert = Omit<InvestmentTransactionRow, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};

export type TransactionUpdate = Partial<Omit<InvestmentTransactionRow, 'id' | 'user_id' | 'created_at'>>;

export type SnapshotInsert = Omit<PortfolioSnapshotRow, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};

export type RiskProfileUpsert = Omit<RiskProfileRow, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type InvestmentGoalInsert = Omit<InvestmentGoalRow, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type InvestmentGoalUpdate = Partial<Omit<InvestmentGoalRow, 'id' | 'user_id' | 'created_at'>>;


// ─── Joined Application Entities (UI & Services) ──────────────

export interface HoldingWithDetails extends HoldingRow {
  instrument: InvestmentInstrumentRow;
  broker_account: BrokerAccountRow;
  latest_price?: InstrumentPriceRow | null;
  // Computed values
  current_value?: number;
  invested_value?: number;
  unrealized_pnl?: number;
  unrealized_pnl_pct?: number;
}

export interface TransactionWithDetails extends InvestmentTransactionRow {
  instrument: InvestmentInstrumentRow;
  broker_account: BrokerAccountRow;
}
