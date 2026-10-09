// ============================================================
// FINOVA — Portfolio Repository
// Accesses historical valuation snapshots and valuation price feeds
// Supports performance charting and valuation persistence
// ============================================================

import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  PortfolioSnapshotRow,
  SnapshotInsert,
  InstrumentPriceRow,
} from '@/types/database';

export class PortfolioRepository {
  /**
   * Fetch historical portfolio valuation snapshots ordered chronologically.
   */
  public static async getPortfolioSnapshots(
    limit: number = 90,
    client?: SupabaseClient
  ): Promise<{
    data: PortfolioSnapshotRow[] | null;
    error: string | null;
  }> {
    const supabase = client || createClient();
    const { data, error } = await supabase
      .from('portfolio_snapshots')
      .select('*')
      .order('snapshot_date', { ascending: true })
      .limit(limit);

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as PortfolioSnapshotRow[], error: null };
  }

  /**
   * Fetch the most recent portfolio valuation snapshot.
   */
  public static async getLatestSnapshot(
    client?: SupabaseClient
  ): Promise<{
    data: PortfolioSnapshotRow | null;
    error: string | null;
  }> {
    const supabase = client || createClient();
    const { data, error } = await supabase
      .from('portfolio_snapshots')
      .select('*')
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as PortfolioSnapshotRow | null, error: null };
  }

  /**
   * Record a daily portfolio valuation snapshot.
   * Upserts on user_id, snapshot_date.
   */
  public static async recordSnapshot(
    input: SnapshotInsert,
    client?: SupabaseClient
  ): Promise<{
    data: PortfolioSnapshotRow | null;
    error: string | null;
  }> {
    const supabase = client || createClient();
    const { data, error } = await supabase
      .from('portfolio_snapshots')
      .upsert(input, {
        onConflict: 'user_id,snapshot_date',
      })
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as PortfolioSnapshotRow, error: null };
  }

  /**
   * Fetch latest instrument valuation prices from public.instrument_prices.
   */
  public static async getInstrumentPrices(
    instrumentIds?: string[],
    client?: SupabaseClient
  ): Promise<{
    data: InstrumentPriceRow[] | null;
    error: string | null;
  }> {
    const supabase = client || createClient();
    let query = supabase.from('instrument_prices').select('*');

    if (instrumentIds && instrumentIds.length > 0) {
      query = query.in('instrument_id', instrumentIds);
    }

    const { data, error } = await query;
    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as InstrumentPriceRow[], error: null };
  }
}
