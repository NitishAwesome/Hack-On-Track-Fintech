// ============================================================
// FINOVA — Investment Transaction Data Access Service
// Records trade activity, corporate actions, and income events
// Supports deduplication and multi-broker transaction ledger
// ============================================================

import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  InvestmentTransactionRow,
  TransactionInsert,
  TransactionWithDetails,
} from '@/types/database';

export class TransactionService {
  /**
   * Fetch user investment transactions with joined instrument and broker account details.
   */
  public static async getTransactions(
    options?: {
      brokerAccountId?: string;
      instrumentId?: string;
      limit?: number;
    },
    client?: SupabaseClient
  ): Promise<{
    data: TransactionWithDetails[] | null;
    error: string | null;
  }> {
    const supabase = client || createClient();
    let query = supabase
      .from('investment_transactions')
      .select(`
        *,
        instrument:instruments(*),
        broker_account:broker_accounts(*)
      `)
      .order('transaction_date', { ascending: false });

    if (options?.brokerAccountId) {
      query = query.eq('broker_account_id', options.brokerAccountId);
    }
    if (options?.instrumentId) {
      query = query.eq('instrument_id', options.instrumentId);
    }
    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;
    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as unknown as TransactionWithDetails[], error: null };
  }

  /**
   * Record a single investment transaction.
   */
  public static async recordTransaction(
    input: TransactionInsert,
    client?: SupabaseClient
  ): Promise<{
    data: InvestmentTransactionRow | null;
    error: string | null;
  }> {
    const supabase = client || createClient();
    const { data, error } = await supabase
      .from('investment_transactions')
      .insert(input)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as InvestmentTransactionRow, error: null };
  }

  /**
   * Bulk insert transactions (used during CSV tradebook imports).
   * Automatically ignores duplicates if external_reference is supplied and matched.
   */
  public static async bulkRecordTransactions(
    inputs: TransactionInsert[],
    client?: SupabaseClient
  ): Promise<{
    data: InvestmentTransactionRow[] | null;
    count: number;
    error: string | null;
  }> {
    if (!inputs.length) {
      return { data: [], count: 0, error: null };
    }

    const supabase = client || createClient();
    const { data, error } = await supabase
      .from('investment_transactions')
      .upsert(inputs, {
        onConflict: 'broker_account_id,external_reference',
        ignoreDuplicates: true,
      })
      .select();

    if (error) {
      return { data: null, count: 0, error: error.message };
    }

    return {
      data: (data as InvestmentTransactionRow[]) || [],
      count: data?.length || 0,
      error: null,
    };
  }

  /**
   * Delete an investment transaction.
   */
  public static async deleteTransaction(
    id: string,
    client?: SupabaseClient
  ): Promise<{
    success: boolean;
    error: string | null;
  }> {
    const supabase = client || createClient();
    const { error } = await supabase
      .from('investment_transactions')
      .delete()
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  }
}
