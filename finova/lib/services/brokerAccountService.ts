// ============================================================
// FINOVA — Broker Account Data Access Service
// Manages connected and manual broker/depository accounts
// Respects Supabase Row-Level Security (RLS)
// ============================================================

import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  BrokerAccountRow,
  BrokerAccountInsert,
  BrokerAccountUpdate,
} from '@/types/database';

export class BrokerAccountService {
  /**
   * Fetch all broker accounts belonging to the authenticated user.
   */
  public static async getBrokerAccounts(client?: SupabaseClient): Promise<{
    data: BrokerAccountRow[] | null;
    error: string | null;
  }> {
    const supabase = client || createClient();
    const { data, error } = await supabase
      .from('broker_accounts')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      return { data: null, error: error.message };
    }
    return { data: data as BrokerAccountRow[], error: null };
  }

  /**
   * Fetch a single broker account by ID.
   */
  public static async getBrokerAccountById(
    id: string,
    client?: SupabaseClient
  ): Promise<{
    data: BrokerAccountRow | null;
    error: string | null;
  }> {
    const supabase = client || createClient();
    const { data, error } = await supabase
      .from('broker_accounts')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return { data: null, error: error.message };
    }
    return { data: data as BrokerAccountRow, error: null };
  }

  /**
   * Create a new broker account for the authenticated user.
   */
  public static async createBrokerAccount(
    input: BrokerAccountInsert,
    client?: SupabaseClient
  ): Promise<{
    data: BrokerAccountRow | null;
    error: string | null;
  }> {
    const supabase = client || createClient();
    const { data, error } = await supabase
      .from('broker_accounts')
      .insert(input)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }
    return { data: data as BrokerAccountRow, error: null };
  }

  /**
   * Update an existing broker account.
   */
  public static async updateBrokerAccount(
    id: string,
    updates: BrokerAccountUpdate,
    client?: SupabaseClient
  ): Promise<{
    data: BrokerAccountRow | null;
    error: string | null;
  }> {
    const supabase = client || createClient();
    const { data, error } = await supabase
      .from('broker_accounts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }
    return { data: data as BrokerAccountRow, error: null };
  }

  /**
   * Delete a broker account ONLY if it contains no active holdings or transactions.
   * Enforces financial ledger safety.
   */
  public static async deleteBrokerAccount(
    id: string,
    client?: SupabaseClient
  ): Promise<{
    success: boolean;
    error: string | null;
    holdingsCount?: number;
    transactionsCount?: number;
  }> {
    const supabase = client || createClient();

    // Check holdings
    const { count: hCount, error: hErr } = await supabase
      .from('holdings')
      .select('id', { count: 'exact', head: true })
      .eq('broker_account_id', id);

    if (hErr || hCount === null || hCount === undefined) {
      return {
        success: false,
        error: hErr ? hErr.message : 'Unable to verify holdings records (uncertain count result).',
      };
    }

    // Check transactions
    const { count: txCount, error: txErr } = await supabase
      .from('investment_transactions')
      .select('id', { count: 'exact', head: true })
      .eq('broker_account_id', id);

    if (txErr || txCount === null || txCount === undefined) {
      return {
        success: false,
        error: txErr ? txErr.message : 'Unable to verify transaction records (uncertain count result).',
      };
    }

    if (hCount > 0 || txCount > 0) {
      return {
        success: false,
        error: `Cannot delete account with active records (${hCount} holdings, ${txCount} transactions).`,
        holdingsCount: hCount,
        transactionsCount: txCount,
      };
    }

    // Atomic stored procedure
    const { error: rpcErr } = await supabase.rpc('safe_delete_broker_account', {
      p_broker_account_id: id,
    });

    if (rpcErr) {
      if (
        rpcErr.code === 'PGRST202' ||
        rpcErr.message?.toLowerCase().includes('could not find the function')
      ) {
        return {
          success: false,
          error:
            'Permanent broker account deletion is disabled to prevent cascading data loss. An atomic database safety migration (ON DELETE RESTRICT) must be applied first.',
        };
      }
      return { success: false, error: rpcErr.message };
    }

    return { success: true, error: null };
  }
}
