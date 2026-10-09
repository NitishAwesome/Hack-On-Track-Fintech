// ============================================================
// FINOVA — Holdings Data Access Service
// Manages multi-broker positions with relational joins
// Respects Supabase Row-Level Security (RLS) & financial precision
// ============================================================

import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  HoldingRow,
  HoldingInsert,
  HoldingUpdate,
  HoldingWithDetails,
} from '@/types/database';

export class HoldingsService {
  /**
   * Fetch all portfolio holdings for the authenticated user,
   * joined with instrument details and broker account info.
   */
  public static async getHoldings(client?: SupabaseClient): Promise<{
    data: HoldingWithDetails[] | null;
    error: string | null;
  }> {
    const supabase = client || createClient();
    const { data, error } = await supabase
      .from('holdings')
      .select(`
        *,
        instrument:instruments(*),
        broker_account:broker_accounts(*)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as unknown as HoldingWithDetails[], error: null };
  }

  /**
   * Fetch positions under a specific broker account.
   */
  public static async getHoldingsByBroker(
    brokerAccountId: string,
    client?: SupabaseClient
  ): Promise<{
    data: HoldingWithDetails[] | null;
    error: string | null;
  }> {
    const supabase = client || createClient();
    const { data, error } = await supabase
      .from('holdings')
      .select(`
        *,
        instrument:instruments(*),
        broker_account:broker_accounts(*)
      `)
      .eq('broker_account_id', brokerAccountId);

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as unknown as HoldingWithDetails[], error: null };
  }

  /**
   * Fetch a single holding by ID.
   */
  public static async getHoldingById(
    id: string,
    client?: SupabaseClient
  ): Promise<{
    data: HoldingWithDetails | null;
    error: string | null;
  }> {
    const supabase = client || createClient();
    const { data, error } = await supabase
      .from('holdings')
      .select(`
        *,
        instrument:instruments(*),
        broker_account:broker_accounts(*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as unknown as HoldingWithDetails, error: null };
  }

  /**
   * Upsert a holding (insert or update position for broker_account + instrument).
   */
  public static async upsertHolding(
    input: HoldingInsert,
    client?: SupabaseClient
  ): Promise<{
    data: HoldingRow | null;
    error: string | null;
  }> {
    const supabase = client || createClient();
    const { data, error } = await supabase
      .from('holdings')
      .upsert(input, {
        onConflict: 'broker_account_id,instrument_id',
      })
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as HoldingRow, error: null };
  }

  /**
   * Update holding fields (e.g. quantity or average_buy_price).
   */
  public static async updateHolding(
    id: string,
    updates: HoldingUpdate,
    client?: SupabaseClient
  ): Promise<{
    data: HoldingRow | null;
    error: string | null;
  }> {
    const supabase = client || createClient();
    const { data, error } = await supabase
      .from('holdings')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as HoldingRow, error: null };
  }

  /**
   * Delete a holding position.
   */
  public static async deleteHolding(
    id: string,
    client?: SupabaseClient
  ): Promise<{
    success: boolean;
    error: string | null;
  }> {
    const supabase = client || createClient();
    const { error } = await supabase
      .from('holdings')
      .delete()
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  }
}
