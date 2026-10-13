import type { GoalProgressMetrics } from '@/lib/calculations/futureLab';
import type { GoalCategory, GoalPriority } from '@/types/database';

export interface GoalRecord {
  id: string; goal_name: string; target_amount: number; current_amount: number; target_date: string;
  category: GoalCategory; priority: GoalPriority; status: string; progress: GoalProgressMetrics;
}

export const GOAL_CATEGORY_LABELS: Record<GoalCategory, string> = {
  EMERGENCY_FUND: 'Emergency fund', EDUCATION: 'Education', HOME: 'Home', WEALTH: 'Wealth',
  RETIREMENT: 'Retirement', VEHICLE: 'Vehicle', VACATION: 'Travel', GENERAL: 'General',
};

export function goalFundingSummary(goals: GoalRecord[]) {
  const included = goals.filter(goal => goal.status !== 'CANCELLED');
  const active = included.filter(goal => goal.status === 'ACTIVE' && goal.progress.remainingAmount > 0);
  const totalTarget = included.reduce((sum, goal) => sum + Number(goal.target_amount), 0);
  const recordedFunding = included.reduce((sum, goal) => sum + Number(goal.current_amount), 0);
  const coveredFunding = included.reduce((sum, goal) => sum + Math.min(Number(goal.current_amount), Number(goal.target_amount)), 0);
  return {
    totalTarget, recordedFunding,
    remainingGap: included.reduce((sum, goal) => sum + goal.progress.remainingAmount, 0),
    progressPct: totalTarget > 0 ? Math.min(100, coveredFunding / totalTarget * 100) : 0,
    monthlySavings: active.filter(goal => goal.progress.remainingMonths > 0).reduce((sum, goal) => sum + goal.progress.requiredMonthlyContributionZeroGrowth, 0),
    dueNow: active.filter(goal => goal.progress.remainingMonths === 0).length,
    activeCount: active.length,
    fundedCount: included.filter(goal => goal.progress.remainingAmount === 0).length,
  };
}

export function goalStateLabel(goal: GoalRecord) {
  if (goal.status === 'CANCELLED') return 'Cancelled';
  if (goal.status === 'PAUSED') return 'Paused';
  if (goal.progress.remainingAmount === 0) return goal.progress.isOverfunded ? 'Overfunded' : 'Funded';
  if (goal.progress.remainingMonths === 0) return 'Review deadline';
  return 'Saving';
}
