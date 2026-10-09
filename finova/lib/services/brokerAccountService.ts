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
   * Delete a broker account and cascade associated positions.
   */
  public static async deleteBrokerAccount(
    id: string,
    client?: SupabaseClient
  ): Promise<{
    success: boolean;
    error: string | null;
  }> {
    const supabase = client || createClient();
    const { error } = await supabase
      .from('broker_accounts')
      .delete()
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, error: null };
  }
}
