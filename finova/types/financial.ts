// ============================================================
// FINOVA — Financial Domain & Calculation Types (Prompt 9)
// Investment Transaction Ledger, Realized P&L, Cost Basis (WAC),
// Corporate Actions, Reconciliation, and Portfolio Performance
// ============================================================

import type {
  BrokerAccountRow,
  InvestmentInstrumentRow,
  InvestmentTransactionRow,
  TransactionType,
} from './database';


// ─── Cost Basis & Ledger Lot Types ───────────────────────────

export type CostBasisMethod = 'WAC'; // Weighted-Average Cost

/**
 * Tracks the moving cost basis of an open position for a given broker + instrument.
 */
export interface PositionCostBasisState {
  instrument_id: string;
  symbol: string;
  broker_account_id: string;
  /** Current remaining open quantity */
  quantity: number;
  /** Moving weighted-average cost per unit */
  average_cost_per_unit: number;
  /** Total cost basis for remaining quantity = quantity * average_cost_per_unit */
  total_cost_basis: number;
  /** Opening position quantity if initialized from opening holding */
  opening_quantity: number;
  /** Opening average cost per unit */
  opening_cost_per_unit: number;
  /** Cumulative units purchased via BUY transactions */
  cumulative_units_bought: number;
  /** Cumulative units sold via SELL transactions */
  cumulative_units_sold: number;
  /** Cumulative gross capital invested in purchases */
  cumulative_invested_capital: number;
  /** Flagged if sell quantity exceeded available quantity in the ledger */
  has_oversold_warning: boolean;
}

/**
 * Realized Profit & Loss calculated for a specific SELL transaction.
 */
export interface RealizedPnLRecord {
  transaction_id: string;
  instrument_id: string;
  symbol: string;
  broker_account_id: string;
  transaction_date: string;
  quantity_sold: number;
  sale_price_per_unit: number;
  /** Gross proceeds = quantity_sold * sale_price_per_unit */
  gross_proceeds: number;
  /** Cost basis of sold units = quantity_sold * average_cost_per_unit at sale time */
  cost_basis_sold: number;
  /** Average cost per unit at the time of sale */
  cost_per_unit: number;
  /** Transaction fees directly incurred on this sale */
  fees_allocated: number;
  /** Taxes/charges incurred on this sale */
  taxes_allocated: number;
  /** Net proceeds = gross_proceeds - fees_allocated - taxes_allocated */
  net_proceeds: number;
  /** Realized P&L (Net) = net_proceeds - cost_basis_sold */
  realized_pnl: number;
  /** Realized P&L (Gross) = gross_proceeds - cost_basis_sold */
  realized_pnl_gross: number;
  /** Realized return percentage = (realized_pnl / cost_basis_sold) * 100 */
  realized_pnl_pct: number;
  /** Whether this transaction sold only part of the existing open position */
  is_partial_sale: boolean;
  /** Remaining open quantity of the position after this sale */
  remaining_quantity_after_sale: number;
  /** True if sold quantity was greater than available quantity prior to sale */
  is_oversold_warning: boolean;
}

/**
 * Corporate action adjustment ledger entry.
 */
export interface CorporateActionAdjustment {
  transaction_id: string;
  type: 'BONUS' | 'SPLIT';
  instrument_id: string;
  symbol: string;
  units_added: number;
  previous_quantity: number;
  new_quantity: number;
  previous_cost_per_unit: number;
  new_cost_per_unit: number;
  notes: string;
}

// ─── Enriched Transaction with Realized P&L ───────────────────

export interface TransactionWithPnL extends InvestmentTransactionRow {
  instrument?: InvestmentInstrumentRow;
  broker_account?: BrokerAccountRow;
  /** Associated realized P&L record if transaction_type === 'SELL' */
  realized_pnl_record?: RealizedPnLRecord | null;
  /** Corporate action detail if BONUS or SPLIT */
  corporate_action?: CorporateActionAdjustment | null;
  /** Formatted badge label */
  display_type?: string;
  /** Indicates if this transaction acts as an opening position baseline */
  is_opening_position?: boolean;
}

// ─── Portfolio Performance Summary ───────────────────────────

export interface PerformanceSummary {
  /** Active invested capital in current open positions */
  total_invested_capital: number;
  /** Current portfolio market value of open positions (null if unquoted assets exist and valuation is incomplete) */
  current_portfolio_value: number | null;
  /** Total unrealized paper gain/loss on currently held positions */
  unrealized_pnl: number | null;
  /** Total unrealized paper gain/loss percentage */
  unrealized_pnl_pct: number | null;
  /** Cumulative net realized profit/loss from completed sales */
  realized_pnl: number;
  /** Cumulative gross realized profit/loss from completed sales */
  realized_pnl_gross: number;
  /** Total dividend payouts received */
  dividend_income: number;
  /** Total interest / coupon payouts received */
  interest_income: number;
  /** Combined cash income = dividend_income + interest_income */
  total_income: number;
  /** Total trading fees and brokerage incurred */
  total_trade_fees: number;
  /** Standalone fees/charges (account AMC, depository fees) */
  total_standalone_fees: number;
  /** Combined total fees & charges */
  total_fees_and_charges: number;
  /**
   * Combined Net Performance:
   * = Unrealized P&L + Realized P&L + Total Income - Standalone Fees
   * Note: Realized P&L already reflects net sale proceeds (trade fees deducted),
   * so only standalone fees are deducted here to avoid double-counting.
   */
  combined_performance_net: number | null;
  /** Combined net performance percentage over active invested capital */
  combined_performance_pct: number | null;
  /** Number of total recorded transactions */
  total_transactions_count: number;
  /** Number of completed sell transactions */
  completed_sales_count: number;
  /** Number of cash income events */
  income_events_count: number;
  /** Valuation status */
  is_valuation_complete: boolean;
  has_unquoted_assets: boolean;
}

// ─── Holdings Reconciliation ──────────────────────────────────

export type ReconciliationStatus =
  | 'OPENING_BALANCE_PRESERVED' // Baseline opening position preserved without synthetic trades
  | 'FULL_LEDGER_MATCH'        // Ledger exactly matches holding quantity and cost basis
  | 'QUANTITY_MISMATCH'        // Ledger quantity differs from holding statement
  | 'LEDGER_ONLY'              // Asset has transactions recorded but no holding row
  | 'HOLDING_ONLY';            // Asset exists as holding without any transactions recorded

export interface PositionReconciliationResult {
  instrument_id: string;
  symbol: string;
  broker_account_id: string;
  broker_name: string;
  holding_id?: string;
  holding_quantity: number;
  holding_avg_buy_price: number;
  ledger_quantity: number;
  ledger_avg_buy_price: number;
  quantity_difference: number;
  status: ReconciliationStatus;
  is_consistent: boolean;
  notes: string;
}

// ─── CSV Tradebook Import & Deduplication ─────────────────────

export interface RawTradebookRow {
  trade_id?: string;
  broker?: string;
  symbol: string;
  name?: string;
  isin?: string;
  asset_class?: string;
  exchange?: string;
  trade_type: TransactionType | string;
  trade_date: string;
  quantity: number | string;
  price: number | string;
  fees?: number | string;
  taxes?: number | string;
  notes?: string;
  external_reference?: string;
}

export interface TradebookImportPreviewItem {
  index: number;
  symbol: string;
  name: string;
  broker_account_id: string;
  broker_name: string;
  transaction_type: TransactionType;
  transaction_date: string;
  quantity: number;
  unit_price: number;
  gross_amount: number;
  fees: number;
  taxes: number;
  net_amount: number;
  external_reference: string;
  is_duplicate: boolean;
  duplicate_reason?: string;
  validation_errors: string[];
}

export interface TradebookImportReport {
  total_parsed: number;
  valid_count: number;
  duplicate_count: number;
  error_count: number;
  imported_count: number;
  duplicates: { external_reference: string; symbol: string; date: string }[];
  errors: { row: number; error: string }[];
}

// ─── Filter & Search Criteria ─────────────────────────────────

export interface TransactionFilterParams {
  broker_account_id?: string;
  instrument_id?: string;
  transaction_type?: TransactionType | 'ALL';
  start_date?: string;
  end_date?: string;
  search_query?: string;
  limit?: number;
  offset?: number;
  sort_by?: 'transaction_date' | 'gross_amount' | 'net_amount' | 'quantity';
  sort_order?: 'asc' | 'desc';
}
