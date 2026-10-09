// ============================================================
// FINOVA — Instrument Master Data Access Service
// Provides standardized instrument reference information
// Supports global catalog lookup and secure custom instruments
// ============================================================

import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  InvestmentInstrumentRow,
  InstrumentInsert,
  AssetCategory,
} from '@/types/database';

export class InstrumentService {
  /**
   * Fetch instruments catalog with optional filtering.
   */
  public static async getInstruments(
    options?: {
      assetType?: AssetCategory;
      search?: string;
      limit?: number;
    },
    client?: SupabaseClient
  ): Promise<{
    data: InvestmentInstrumentRow[] | null;
    error: string | null;
  }> {
    const supabase = client || createClient();
    let query = supabase
      .from('instruments')
      .select('*')
      .eq('is_active', true)
      .order('symbol', { ascending: true });

    if (options?.assetType) {
      query = query.eq('asset_type', options.assetType);
    }

    if (options?.search) {
      query = query.or(
        `symbol.ilike.%${options.search}%,instrument_name.ilike.%${options.search}%`
      );
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;
    if (error) {
      return { data: null, error: error.message };
    }
    return { data: data as InvestmentInstrumentRow[], error: null };
  }

  /**
   * Fetch a single instrument by primary key ID.
   */
  public static async getInstrumentById(
    id: string,
    client?: SupabaseClient
  ): Promise<{
    data: InvestmentInstrumentRow | null;
    error: string | null;
  }> {
    const supabase = client || createClient();
    const { data, error } = await supabase
      .from('instruments')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return { data: null, error: error.message };
    }
    return { data: data as InvestmentInstrumentRow, error: null };
  }

  /**
   * Fetch instrument by symbol and optional exchange (e.g. 'RELIANCE', 'NSE').
   */
  public static async getInstrumentBySymbol(
    symbol: string,
    exchange: string = 'NSE',
    client?: SupabaseClient
  ): Promise<{
    data: InvestmentInstrumentRow | null;
    error: string | null;
  }> {
    const supabase = client || createClient();
    const { data, error } = await supabase
      .from('instruments')
      .select('*')
      .eq('symbol', symbol.toUpperCase())
      .eq('exchange', exchange)
      .limit(1)
      .maybeSingle();

    if (error) {
      return { data: null, error: error.message };
    }
    return { data: data as InvestmentInstrumentRow | null, error: null };
  }

  /**
   * Search instruments by symbol, name, or ISIN for auto-complete.
   */
  public static async searchInstruments(
    queryText: string,
    client?: SupabaseClient
  ): Promise<{
    data: InvestmentInstrumentRow[] | null;
    error: string | null;
  }> {
    const supabase = client || createClient();
    const sanitized = queryText.trim();
    if (!sanitized) {
      return { data: [], error: null };
    }

    const { data, error } = await supabase
      .from('instruments')
      .select('*')
      .or(
        `symbol.ilike.%${sanitized}%,instrument_name.ilike.%${sanitized}%,isin.ilike.%${sanitized}%`
      )
      .limit(20);

    if (error) {
      return { data: null, error: error.message };
    }
    return { data: data as InvestmentInstrumentRow[], error: null };
  }

  /**
   * Register a user-created/custom instrument.
   * Enforces is_custom = true and creator ownership.
   */
  public static async createCustomInstrument(
    input: InstrumentInsert,
    client?: SupabaseClient
  ): Promise<{
    data: InvestmentInstrumentRow | null;
    error: string | null;
  }> {
    const supabase = client || createClient();
    const { data, error } = await supabase
      .from('instruments')
      .insert({
        ...input,
        is_custom: true,
      })
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }
    return { data: data as InvestmentInstrumentRow, error: null };
  }
}
