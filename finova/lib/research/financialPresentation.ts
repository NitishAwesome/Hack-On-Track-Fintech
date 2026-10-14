import type { FinancialMetric } from "./financials";
export function comparableGrowth(
  current: FinancialMetric,
  previous?: FinancialMetric,
) {
  if (
    !previous ||
    current.id !== previous.id ||
    current.unit !== previous.unit ||
    current.basis !== previous.basis ||
    current.accountingStandard !== previous.accountingStandard ||
    current.periodEnd <= previous.periodEnd ||
    current.value === null ||
    previous.value === null ||
    !Number.isFinite(current.value) ||
    !Number.isFinite(previous.value) ||
    previous.value <= 0
  )
    return null;
  return (current.value / previous.value - 1) * 100;
}
