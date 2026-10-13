// ============================================================
// FINOVA — Portfolio Performance Calculation Engine
// Integrates Realized P&L, Unrealized P&L, Income (Dividends/Interest),
// Transaction Fees, and Combined Performance without double-counting.
// Strictly avoids fabricating missing market data or unverified metrics.
// ============================================================

import { buildPortfolioSummary, roundCurrency, roundPercent } from './portfolio.ts';
import { calculateRealizedPnL } from './realizedPnL.ts';
import type { HoldingWithMetrics, PortfolioSummary } from '@/types/portfolio';
import type { InvestmentTransactionRow } from '@/types/database';
import type { PerformanceSummary } from '@/types/financial';

/**
 * Builds a comprehensive, unified PerformanceSummary from active holdings
 * and historical investment transactions.
 */
export function buildPerformanceSummary(
  holdings: HoldingWithMetrics[],
  transactions: InvestmentTransactionRow[],
  portfolioSummary?: PortfolioSummary
): PerformanceSummary {
  // 1. Calculate transaction-level Realized P&L and Income
  const {
    totalRealizedPnL,
    totalRealizedPnLGross,
    totalDividendIncome,
    totalInterestIncome,
    totalTradeFees,
    totalStandaloneFees,
    realizedRecords,
  } = calculateRealizedPnL(transactions);

  // 2. Derive active holdings valuation metrics
  const totalInvestedCapital = roundCurrency(
    holdings.reduce((sum, h) => sum + (Number(h.invested_value) || 0), 0)
  );

  const canonicalSummary = portfolioSummary ?? buildPortfolioSummary(holdings);
  const hasUnquoted = canonicalSummary.has_unquoted_assets ?? false;
  const isValuationComplete = canonicalSummary.is_valuation_complete ?? false;

  let currentPortfolioValue: number | null = null;
  let unrealizedPnL: number | null = null;
  let unrealizedPnLPct: number | null = null;

  if (holdings.length === 0) {
    currentPortfolioValue = 0;
    unrealizedPnL = 0;
    unrealizedPnLPct = 0;
  } else {
    currentPortfolioValue = canonicalSummary.total_current_value;
    unrealizedPnL = canonicalSummary.total_absolute_return;
    unrealizedPnLPct = canonicalSummary.total_absolute_return_pct;
  }

  // 3. Aggregate Income & Fees
  const totalIncome = roundCurrency(totalDividendIncome + totalInterestIncome);
  const totalFeesAndCharges = roundCurrency(totalTradeFees + totalStandaloneFees);

  // 4. Combined Net Performance Summary
  // Rule: Do NOT double-count fees or income.
  // - Realized P&L is net of trade fees and taxes on sold units.
  // - Unrealized P&L represents open position paper gains/losses.
  // - Cash income (dividends/interest) represents cash generated.
  // - Standalone fees (account AMC, non-trade debit) are subtracted once.
  let combinedPerformanceNet: number | null = null;
  let combinedPerformancePct: number | null = null;

  if (unrealizedPnL !== null && isValuationComplete) {
    combinedPerformanceNet = roundCurrency(
      unrealizedPnL + totalRealizedPnL + totalIncome - totalStandaloneFees
    );

    if (totalInvestedCapital > 0) {
      combinedPerformancePct = roundPercent(
        (combinedPerformanceNet / totalInvestedCapital) * 100
      );
    } else {
      combinedPerformancePct = 0;
    }
  }

  // Count events
  const completedSalesCount = realizedRecords.length;
  const incomeEventsCount = transactions.filter((t) => {
    const type = (t.transaction_type || '').toUpperCase();
    return type === 'DIVIDEND' || type === 'INTEREST' || type === 'COUPON';
  }).length;

  return {
    total_invested_capital: totalInvestedCapital,
    current_portfolio_value: currentPortfolioValue,
    unrealized_pnl: unrealizedPnL,
    unrealized_pnl_pct: unrealizedPnLPct,
    realized_pnl: totalRealizedPnL,
    realized_pnl_gross: totalRealizedPnLGross,
    dividend_income: totalDividendIncome,
    interest_income: totalInterestIncome,
    total_income: totalIncome,
    total_trade_fees: totalTradeFees,
    total_standalone_fees: totalStandaloneFees,
    total_fees_and_charges: totalFeesAndCharges,
    combined_performance_net: combinedPerformanceNet,
    combined_performance_pct: combinedPerformancePct,
    total_transactions_count: transactions.length,
    completed_sales_count: completedSalesCount,
    income_events_count: incomeEventsCount,
    is_valuation_complete: isValuationComplete,
    has_unquoted_assets: hasUnquoted,
  };
}
