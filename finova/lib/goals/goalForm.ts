import type { GoalCategory, GoalPriority } from '@/types/database';

export interface GoalWritePayload {
  goal_name: string;
  target_amount: number;
  current_amount: number;
  target_date: string;
  category: GoalCategory;
  priority: GoalPriority;
}

/** Canonical form/API contract; goal funding remains separate from portfolio holdings. */
export function goalPayloadFromForm(form: {
  goal_name: string; target_amount: string; current_amount: string;
  target_date: string; category: GoalCategory; priority: GoalPriority;
}): { payload: GoalWritePayload; error?: never } | { error: string; payload?: never } {
  const goal_name = form.goal_name.trim();
  const target_amount = Number(form.target_amount);
  const current_amount = Number(form.current_amount || '0');
  if (!goal_name) return { error: 'Goal name is required.' };
  if (!Number.isFinite(target_amount) || target_amount <= 0) return { error: 'Please enter a valid positive target amount.' };
  if (!Number.isFinite(current_amount) || current_amount < 0) return { error: 'Recorded funding must be a valid non-negative amount.' };
  if (!isGoalDate(form.target_date)) return { error: 'Please select a valid target date.' };
  return { payload: { goal_name, target_amount, current_amount, target_date: form.target_date, category: form.category, priority: form.priority } };
}

export function isGoalDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
