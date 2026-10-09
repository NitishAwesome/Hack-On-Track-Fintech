// ============================================================
// FINOVA — Investment Goal Data Access Service
// Manages goal-based portfolio tracking targets
// (Emergency Fund, House Purchase, Higher Education, Wealth)
// ============================================================

import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  InvestmentGoalRow,
  InvestmentGoalInsert,
  InvestmentGoalUpdate,
  GoalStatus,
} from '@/types/database';

export class InvestmentGoalService {
  /**
   * Fetch user's investment goals, optionally filtered by status.
   */
  public static async getGoals(
    options?: { status?: GoalStatus },
    client?: SupabaseClient
  ): Promise<{
    data: InvestmentGoalRow[] | null;
    error: string | null;
  }> {
    const supabase = client || createClient();
    let query = supabase
      .from('investment_goals')
      .select('*')
      .order('target_date', { ascending: true });

    if (options?.status) {
      query = query.eq('status', options.status);
    }

    const { data, error } = await query;
    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as InvestmentGoalRow[], error: null };
  }

  /**
   * Fetch a single goal by ID.
   */
  public static async getGoalById(
    id: string,
    client?: SupabaseClient
  ): Promise<{
    data: InvestmentGoalRow | null;
    error: string | null;
  }> {
    const supabase = client || createClient();
    const { data, error } = await supabase
      .from('investment_goals')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as InvestmentGoalRow, error: null };
  }

  /**
   * Create a new investment goal.
   */
  public static async createGoal(
    input: InvestmentGoalInsert,
    client?: SupabaseClient
  ): Promise<{
    data: InvestmentGoalRow | null;
    error: string | null;
  }> {
    const supabase = client || createClient();
    const { data, error } = await supabase
      .from('investment_goals')
      .insert(input)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as InvestmentGoalRow, error: null };
  }

  /**
   * Update an existing investment goal.
   */
  public static async updateGoal(
    id: string,
    updates: InvestmentGoalUpdate,
    client?: SupabaseClient
  ): Promise<{
    data: InvestmentGoalRow | null;
    error: string | null;
  }> {
    const supabase = client || createClient();
    const { data, error } = await supabase
      .from('investment_goals')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as InvestmentGoalRow, error: null };
  }

  /**
   * Delete an investment goal.
   */
  public static async deleteGoal(
    id: string,
    client?: SupabaseClient
  ): Promise<{
    success: boolean;
    error: string | null;
  }> {
    const supabase = client || createClient();
    const { error } = await supabase
      .from('investment_goals')
      .delete()
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  }
}
