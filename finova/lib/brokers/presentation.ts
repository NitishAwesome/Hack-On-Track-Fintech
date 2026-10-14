import type { BrokerAccount, HoldingWithMetrics } from '@/types/portfolio';
import { buildPortfolioSummary } from '@/lib/calculations/portfolio';

/** Account cards use the same valuation coverage as the rest of the portfolio. */
export function brokerPositionSummaries(brokers: readonly BrokerAccount[], holdings: HoldingWithMetrics[]) {
  return Object.fromEntries(brokers.map(broker => {
    const summary = buildPortfolioSummary(holdings.filter(holding => holding.broker_account_id === broker.id));
    return [broker.id, {
      count: summary.holding_count,
      invested: summary.total_invested_value,
      currentValue: summary.total_current_value,
      pricedValue: summary.priced_current_value ?? 0,
      isFullyValued: summary.is_valuation_complete,
      pricedCount: summary.priced_count ?? 0,
      staleCount: summary.stale_count ?? 0,
    }];
  }));
}
