// ============================================================
// FINOVA — Realized Profit & Loss and Cost Basis Engine
// Weighted-Average Cost (WAC) Method for Multi-Broker Ledgers
// Handles Buy, Sell, Partial Sales, Bonus Shares, Stock Splits,
// Cash Dividends, Coupon Income, and Fee Deduction Rules.
// ============================================================

import { roundCurrency, roundQuantity, roundPercent } from './portfolio';
import type {
  InvestmentTransactionRow,
  HoldingRow,
} from '@/types/database';
import type {
  PositionCostBasisState,
  RealizedPnLRecord,
  CorporateActionAdjustment,
  TransactionWithPnL,
  PositionReconciliationResult,
  ReconciliationStatus,
} from '@/types/financial';

/**
 * Normalizes transaction type string to standard uppercase union.
 */
export function normalizeTransactionType(type: string): string {
  return (type || '').trim().toUpperCase();
}

/**
 * Creates a unique key for grouping positions by broker account and instrument.
 */
export function getPositionKey(brokerAccountId: string, instrumentId: string): string {
  return `${brokerAccountId}:::${instrumentId}`;
}

/**
 * Calculates Realized P&L, Cost Basis, and Corporate Action adjustments
 * across a chronological series of investment transactions.
 *
 * @param transactions Chronological or unsorted array of transactions.
 * @param openingHoldings Optional existing holdings that serve as opening positions.
 * @returns Map of position states, array of enriched transactions with P&L, and all P&L records.
 */
export function calculateRealizedPnL(
  transactions: InvestmentTransactionRow[],
  openingHoldings: HoldingRow[] = []
): {
  positionStates: Map<string, PositionCostBasisState>;
  enrichedTransactions: TransactionWithPnL[];
  realizedRecords: RealizedPnLRecord[];
  totalRealizedPnL: number;
  totalRealizedPnLGross: number;
  totalDividendIncome: number;
  totalInterestIncome: number;
  totalTradeFees: number;
  totalStandaloneFees: number;
} {
  // Sort transactions strictly chronologically (oldest first)
  const sortedTransactions = [...transactions].sort((a, b) => {
    const timeA = new Date(a.transaction_date).getTime();
    const timeB = new Date(b.transaction_date).getTime();
    if (timeA !== timeB) return timeA - timeB;
    // Tie-breaker: creation timestamp or id
    const createdA = new Date(a.created_at || 0).getTime();
    const createdB = new Date(b.created_at || 0).getTime();
    return createdA - createdB;
  });

  // Position states map keyed by broker_account_id:::instrument_id
  const positionStates = new Map<string, PositionCostBasisState>();

  // Initialize opening positions from openingHoldings if provided
  for (const h of openingHoldings) {
    const key = getPositionKey(h.broker_account_id, h.instrument_id);
    const qty = roundQuantity(Number(h.quantity) || 0);
    const avgPrice = roundCurrency(Number(h.average_buy_price) || 0);
    if (qty > 0) {
      positionStates.set(key, {
        instrument_id: h.instrument_id,
        symbol: '', // populated when available
        broker_account_id: h.broker_account_id,
        quantity: qty,
        average_cost_per_unit: avgPrice,
        total_cost_basis: roundCurrency(qty * avgPrice),
        opening_quantity: qty,
        opening_cost_per_unit: avgPrice,
        cumulative_units_bought: 0,
        cumulative_units_sold: 0,
        cumulative_invested_capital: roundCurrency(qty * avgPrice),
        has_oversold_warning: false,
      });
    }
  }

  const enrichedTransactions: TransactionWithPnL[] = [];
  const realizedRecords: RealizedPnLRecord[] = [];

  let totalRealizedPnL = 0;
  let totalRealizedPnLGross = 0;
  let totalDividendIncome = 0;
  let totalInterestIncome = 0;
  let totalTradeFees = 0;
  let totalStandaloneFees = 0;

  for (const tx of sortedTransactions) {
    const key = getPositionKey(tx.broker_account_id, tx.instrument_id);
    const txType = normalizeTransactionType(tx.transaction_type);
    const qty = roundQuantity(Number(tx.quantity) || 0);
    const unitPrice = roundCurrency(Number(tx.unit_price) || 0);
    const grossAmount = roundCurrency(Number(tx.gross_amount) || qty * unitPrice);
    const fees = roundCurrency(Number(tx.fees) || 0);
    const taxes = roundCurrency(Number(tx.taxes) || 0);
    const netAmount = roundCurrency(Number(tx.net_amount) || grossAmount);

    let state = positionStates.get(key);
    if (!state) {
      state = {
        instrument_id: tx.instrument_id,
        symbol: '',
        broker_account_id: tx.broker_account_id,
        quantity: 0,
        average_cost_per_unit: 0,
        total_cost_basis: 0,
        opening_quantity: 0,
        opening_cost_per_unit: 0,
        cumulative_units_bought: 0,
        cumulative_units_sold: 0,
        cumulative_invested_capital: 0,
        has_oversold_warning: false,
      };
      positionStates.set(key, state);
    }

    let pnlRecord: RealizedPnLRecord | null = null;
    let corpAction: CorporateActionAdjustment | null = null;

    switch (txType) {
      case 'BUY': {
        // Weighted Average Cost (WAC) update
        // New Total Qty = Current Qty + Buy Qty
        // New Total Cost = Current Cost Basis + (Buy Qty * Buy Unit Price)
        // New Avg Price = New Total Cost / New Total Qty
        const prevQty = state.quantity;
        const prevTotalCost = state.total_cost_basis;
        const buyCost = roundCurrency(qty * unitPrice);

        const newQty = roundQuantity(prevQty + qty);
        const newTotalCost = roundCurrency(prevTotalCost + buyCost);
        const newAvgPrice = newQty > 0 ? roundCurrency(newTotalCost / newQty) : 0;

        state.quantity = newQty;
        state.average_cost_per_unit = newAvgPrice;
        state.total_cost_basis = newTotalCost;
        state.cumulative_units_bought = roundQuantity(state.cumulative_units_bought + qty);
        state.cumulative_invested_capital = roundCurrency(state.cumulative_invested_capital + buyCost);

        totalTradeFees = roundCurrency(totalTradeFees + fees + taxes);
        break;
      }

      case 'SELL': {
        // Realized P&L calculation
        const prevQty = state.quantity;
        const currentAvgCost = state.average_cost_per_unit;

        // Check for overselling (selling more units than available in position)
        let isOversold = false;
        let effectiveQtySold = qty;
        if (qty > prevQty) {
          isOversold = true;
          state.has_oversold_warning = true;
          // If selling without prior purchases or selling excess, cost basis uses unitPrice if cost is 0
          effectiveQtySold = qty;
        }

        const costBasisSold = roundCurrency(effectiveQtySold * currentAvgCost);
        const grossProceeds = roundCurrency(qty * unitPrice);
        const netProceeds = roundCurrency(grossProceeds - fees - taxes);

        // Realized P&L (Net of trade fees and taxes)
        const realizedPnL = roundCurrency(netProceeds - costBasisSold);
        // Realized P&L (Gross)
        const realizedPnLGross = roundCurrency(grossProceeds - costBasisSold);
        const realizedPnLPct =
          costBasisSold > 0 ? roundPercent((realizedPnL / costBasisSold) * 100) : 0;

        const remainingQty = roundQuantity(Math.max(0, prevQty - qty));
        const isPartialSale = prevQty > qty;

        // In WAC, average cost per unit remains unchanged after a sale
        state.quantity = remainingQty;
        state.total_cost_basis = roundCurrency(remainingQty * currentAvgCost);
        state.cumulative_units_sold = roundQuantity(state.cumulative_units_sold + qty);

        pnlRecord = {
          transaction_id: tx.id,
          instrument_id: tx.instrument_id,
          symbol: '',
          broker_account_id: tx.broker_account_id,
          transaction_date: tx.transaction_date,
          quantity_sold: qty,
          sale_price_per_unit: unitPrice,
          gross_proceeds: grossProceeds,
          cost_basis_sold: costBasisSold,
          cost_per_unit: currentAvgCost,
          fees_allocated: fees,
          taxes_allocated: taxes,
          net_proceeds: netProceeds,
          realized_pnl: realizedPnL,
          realized_pnl_gross: realizedPnLGross,
          realized_pnl_pct: realizedPnLPct,
          is_partial_sale: isPartialSale,
          remaining_quantity_after_sale: remainingQty,
          is_oversold_warning: isOversold,
        };

        realizedRecords.push(pnlRecord);
        totalRealizedPnL = roundCurrency(totalRealizedPnL + realizedPnL);
        totalRealizedPnLGross = roundCurrency(totalRealizedPnLGross + realizedPnLGross);
        totalTradeFees = roundCurrency(totalTradeFees + fees + taxes);
        break;
      }

      case 'BONUS': {
        // Corporate action: Bonus shares
        // Increases quantity without cash outflow
        // Cost basis remains unchanged -> average cost per unit is diluted
        const prevQty = state.quantity;
        const prevAvgCost = state.average_cost_per_unit;
        const newQty = roundQuantity(prevQty + qty);
        const newAvgCost = newQty > 0 ? roundCurrency(state.total_cost_basis / newQty) : 0;

        corpAction = {
          transaction_id: tx.id,
          type: 'BONUS',
          instrument_id: tx.instrument_id,
          symbol: '',
          units_added: qty,
          previous_quantity: prevQty,
          new_quantity: newQty,
          previous_cost_per_unit: prevAvgCost,
          new_cost_per_unit: newAvgCost,
          notes: tx.notes || `Bonus issue: +${qty} shares added at zero cash cost`,
        };

        state.quantity = newQty;
        state.average_cost_per_unit = newAvgCost;
        // Total cost basis stays same, ZERO artificial P&L!
        break;
      }

      case 'SPLIT': {
        // Corporate action: Stock split
        // e.g. 1 share splits into 2, so qty is added or split ratio applied
        // Total cost basis remains constant, unit cost decreases proportionally
        const prevQty = state.quantity;
        const prevAvgCost = state.average_cost_per_unit;
        const newQty = roundQuantity(prevQty + qty);
        const newAvgCost = newQty > 0 ? roundCurrency(state.total_cost_basis / newQty) : 0;

        corpAction = {
          transaction_id: tx.id,
          type: 'SPLIT',
          instrument_id: tx.instrument_id,
          symbol: '',
          units_added: qty,
          previous_quantity: prevQty,
          new_quantity: newQty,
          previous_cost_per_unit: prevAvgCost,
          new_cost_per_unit: newAvgCost,
          notes: tx.notes || `Stock split adjustment: position increased to ${newQty} units`,
        };

        state.quantity = newQty;
        state.average_cost_per_unit = newAvgCost;
        // Total cost basis stays same, ZERO artificial P&L!
        break;
      }

      case 'DIVIDEND': {
        // Cash distribution income
        // Does not alter quantity or cost basis of underlying shares
        const netIncome = roundCurrency(grossAmount - fees - taxes);
        totalDividendIncome = roundCurrency(totalDividendIncome + netIncome);
        totalTradeFees = roundCurrency(totalTradeFees + fees + taxes);
        break;
      }

      case 'INTEREST':
      case 'COUPON': {
        // Bond interest or debt coupon payout
        const netIncome = roundCurrency(grossAmount - fees - taxes);
        totalInterestIncome = roundCurrency(totalInterestIncome + netIncome);
        totalTradeFees = roundCurrency(totalTradeFees + fees + taxes);
        break;
      }

      case 'FEE': {
        // Standalone brokerage, depository AMC, or maintenance charge
        const chargeAmount = roundCurrency(grossAmount || fees || netAmount);
        totalStandaloneFees = roundCurrency(totalStandaloneFees + chargeAmount);
        break;
      }

      default:
        // Unknown or custom type, no position modification
        break;
    }

    enrichedTransactions.push({
      ...tx,
      realized_pnl_record: pnlRecord,
      corporate_action: corpAction,
      display_type: txType,
    });
  }

  // Reverse enriched transactions so newest is first for UI display by default
  enrichedTransactions.reverse();

  return {
    positionStates,
    enrichedTransactions,
    realizedRecords,
    totalRealizedPnL,
    totalRealizedPnLGross,
    totalDividendIncome,
    totalInterestIncome,
    totalTradeFees,
    totalStandaloneFees,
  };
}

/**
 * Reconciles current holdings with ledger-calculated quantities.
 * Preserves manual opening positions without forcing synthetic trade fabrication.
 */
export function reconcileHoldingsWithTransactions(
  holdings: HoldingRow[],
  transactions: InvestmentTransactionRow[]
): PositionReconciliationResult[] {
  // First calculate ledger state purely from transactions (without opening holdings)
  const { positionStates: pureLedgerStates } = calculateRealizedPnL(transactions, []);

  const results: PositionReconciliationResult[] = [];
  const processedKeys = new Set<string>();

  // Compare every existing holding
  for (const h of holdings) {
    const key = getPositionKey(h.broker_account_id, h.instrument_id);
    processedKeys.add(key);

    const holdingQty = roundQuantity(Number(h.quantity) || 0);
    const holdingAvgPrice = roundCurrency(Number(h.average_buy_price) || 0);

    const ledgerState = pureLedgerStates.get(key);

    if (!ledgerState || (ledgerState.cumulative_units_bought === 0 && ledgerState.quantity === 0)) {
      // Holding exists without any transactions recorded in trade ledger
      results.push({
        instrument_id: h.instrument_id,
        symbol: '',
        broker_account_id: h.broker_account_id,
        broker_name: '',
        holding_id: h.id,
        holding_quantity: holdingQty,
        holding_avg_buy_price: holdingAvgPrice,
        ledger_quantity: 0,
        ledger_avg_buy_price: 0,
        quantity_difference: holdingQty,
        status: 'HOLDING_ONLY',
        is_consistent: true, // Expected for manual holdings or statement imports without tradebook
        notes: 'Position entered manually or via statement without tradebook history. Opening balance preserved.',
      });
      continue;
    }

    const ledgerQty = ledgerState.quantity;
    const ledgerAvgPrice = ledgerState.average_cost_per_unit;
    const diff = roundQuantity(Math.abs(holdingQty - ledgerQty));

    if (diff < 0.000001) {
      results.push({
        instrument_id: h.instrument_id,
        symbol: '',
        broker_account_id: h.broker_account_id,
        broker_name: '',
        holding_id: h.id,
        holding_quantity: holdingQty,
        holding_avg_buy_price: holdingAvgPrice,
        ledger_quantity: ledgerQty,
        ledger_avg_buy_price: ledgerAvgPrice,
        quantity_difference: 0,
        status: 'FULL_LEDGER_MATCH',
        is_consistent: true,
        notes: 'Holding statement perfectly matches tradebook ledger.',
      });
    } else {
      // Quantity mismatch: could be partial tradebook import
      results.push({
        instrument_id: h.instrument_id,
        symbol: '',
        broker_account_id: h.broker_account_id,
        broker_name: '',
        holding_id: h.id,
        holding_quantity: holdingQty,
        holding_avg_buy_price: holdingAvgPrice,
        ledger_quantity: ledgerQty,
        ledger_avg_buy_price: ledgerAvgPrice,
        quantity_difference: roundQuantity(holdingQty - ledgerQty),
        status: 'QUANTITY_MISMATCH',
        is_consistent: false,
        notes: `Statement quantity (${holdingQty}) differs from tradebook net units (${ledgerQty}). Holding preserved as authoritative balance.`,
      });
    }
  }

  // Check ledger positions that don't have a holding row
  pureLedgerStates.forEach((state, key) => {
    if (!processedKeys.has(key) && state.quantity > 0) {
      results.push({
        instrument_id: state.instrument_id,
        symbol: state.symbol,
        broker_account_id: state.broker_account_id,
        broker_name: '',
        holding_quantity: 0,
        holding_avg_buy_price: 0,
        ledger_quantity: state.quantity,
        ledger_avg_buy_price: state.average_cost_per_unit,
        quantity_difference: -state.quantity,
        status: 'LEDGER_ONLY',
        is_consistent: false,
        notes: 'Tradebook has active open units, but no position exists in holdings.',
      });
    }
  });

  return results;
}
