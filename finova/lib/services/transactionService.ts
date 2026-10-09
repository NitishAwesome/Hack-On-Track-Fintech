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
      transactionType?: string;
      startDate?: string;
      endDate?: string;
      limit?: number;
      offset?: number;
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
    if (options?.transactionType && options.transactionType !== 'ALL') {
      query = query.eq('transaction_type', options.transactionType.toUpperCase());
    }
    if (options?.startDate) {
      query = query.gte('transaction_date', options.startDate);
    }
    if (options?.endDate) {
      query = query.lte('transaction_date', options.endDate);
    }
    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 20) - 1);
    } else if (options?.limit) {
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
   * Update an investment transaction.
   */
  public static async updateTransaction(
    id: string,
    updates: Partial<TransactionInsert>,
    client?: SupabaseClient
  ): Promise<{
    data: InvestmentTransactionRow | null;
    error: string | null;
  }> {
    const supabase = client || createClient();
    const { data, error } = await supabase
      .from('investment_transactions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as InvestmentTransactionRow, error: null };
  }

  /**
   * Record a transaction atomically with holding update via PostgreSQL RPC.
   * Guarantees dual-success or complete rollback; prevents overselling and race conditions.
   */
  public static async recordTransactionAtomic(
    input: {
      broker_account_id: string;
      instrument_id: string;
      transaction_type: string;
      quantity: number;
      unit_price: number;
      gross_amount: number;
      fees?: number;
      taxes?: number;
      net_amount?: number;
      transaction_date?: string;
      settlement_date?: string | null;
      source?: string;
      external_reference?: string | null;
      notes?: string | null;
      reconcile_holding?: boolean;
      allow_oversell?: boolean;
    },
    client?: SupabaseClient
  ): Promise<{
    data: { transaction: InvestmentTransactionRow; holding?: unknown; status: string } | null;
    error: string | null;
  }> {
    const supabase = client || createClient();
    const { data, error } = await supabase.rpc('record_transaction_atomic', {
      p_broker_account_id: input.broker_account_id,
      p_instrument_id: input.instrument_id,
      p_transaction_type: input.transaction_type,
      p_quantity: input.quantity,
      p_unit_price: input.unit_price,
      p_gross_amount: input.gross_amount,
      p_fees: input.fees || 0,
      p_taxes: input.taxes || 0,
      p_stt_taxes: input.taxes || 0,
      p_net_amount: input.net_amount || null,
      p_transaction_date: input.transaction_date || new Date().toISOString(),
      p_settlement_date: input.settlement_date || null,
      p_source: input.source || 'MANUAL',
      p_external_reference: input.external_reference || null,
      p_notes: input.notes || null,
      p_reconcile_holding: input.reconcile_holding !== false,
      p_allow_oversell: Boolean(input.allow_oversell),
    });

    if (error) {
      return { data: null, error: error.message };
    }

    return { data, error: null };
  }

  /**
   * Update a transaction and re-reconcile its position atomically.
   */
  public static async updateTransactionAtomic(
    id: string,
    updates: {
      quantity?: number;
      unit_price?: number;
      gross_amount?: number;
      fees?: number;
      taxes?: number;
      net_amount?: number;
      transaction_date?: string;
      settlement_date?: string | null;
      external_reference?: string | null;
      notes?: string | null;
      reconcile_holding?: boolean;
    },
    client?: SupabaseClient
  ): Promise<{
    data: { transaction: InvestmentTransactionRow; reconciliation?: unknown; status: string } | null;
    error: string | null;
  }> {
    const supabase = client || createClient();
    const { data, error } = await supabase.rpc('update_transaction_atomic', {
      p_transaction_id: id,
      p_quantity: updates.quantity,
      p_unit_price: updates.unit_price,
      p_gross_amount: updates.gross_amount,
      p_fees: updates.fees,
      p_taxes: updates.taxes,
      p_net_amount: updates.net_amount,
      p_transaction_date: updates.transaction_date,
      p_settlement_date: updates.settlement_date,
      p_external_reference: updates.external_reference,
      p_notes: updates.notes,
      p_reconcile_holding: updates.reconcile_holding !== false,
    });

    if (error) {
      return { data: null, error: error.message };
    }

    return { data, error: null };
  }

  /**
   * Delete an investment transaction (simple delete).
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

  /**
   * Delete a transaction and re-reconcile its position atomically.
   * Rejects deletion if subsequent sales depend on these shares.
   */
  public static async deleteTransactionAtomic(
    id: string,
    reconcileHolding: boolean = true,
    client?: SupabaseClient
  ): Promise<{
    data: { deleted_id: string; reconciliation?: unknown; status: string } | null;
    error: string | null;
  }> {
    const supabase = client || createClient();
    const { data, error } = await supabase.rpc('delete_transaction_atomic', {
      p_transaction_id: id,
      p_reconcile_holding: reconcileHolding,
    });

    if (error) {
      return { data: null, error: error.message };
    }

    return { data, error: null };
  }

  /**
   * Reconcile a single holding position from transaction history atomically.
   */
  public static async reconcilePositionAtomic(
    brokerAccountId: string,
    instrumentId: string,
    client?: SupabaseClient
  ): Promise<{
    data: { status: string; quantity?: number; average_buy_price?: number; holding?: unknown } | null;
    error: string | null;
  }> {
    const supabase = client || createClient();
    const { data, error } = await supabase.rpc('reconcile_position_atomic', {
      p_broker_account_id: brokerAccountId,
      p_instrument_id: instrumentId,
    });

    if (error) {
      return { data: null, error: error.message };
    }

    return { data, error: null };
  }
}

