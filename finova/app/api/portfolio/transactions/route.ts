import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { PortfolioStorage } from '@/lib/storage/portfolioStorage';
import { calculateRealizedPnL } from '@/lib/calculations/realizedPnL';
import { roundCurrency, roundQuantity } from '@/lib/calculations/portfolio';
import type {
  InvestmentTransactionRow,
  TransactionType,
  AssetCategory,
} from '@/types/database';
import type { TransactionWithPnL } from '@/types/financial';

function mapAssetClassToCategory(assetClass: string): AssetCategory {
  const ac = assetClass.toLowerCase();
  if (ac === 'mf' || ac === 'mutual_fund') return 'MUTUAL_FUND';
  if (ac === 'reit') return 'REIT';
  if (ac === 'invit') return 'INVIT';
  if (ac === 'bond' || ac === 'sgb') return 'BOND';
  return 'STOCK';
}

// ─── GET /api/portfolio/transactions ──────────────────────────
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const brokerAccountId = searchParams.get('brokerAccountId') || undefined;
  const instrumentId = searchParams.get('instrumentId') || undefined;
  const transactionType = searchParams.get('type') || searchParams.get('transactionType') || undefined;
  const startDate = searchParams.get('startDate') || undefined;
  const endDate = searchParams.get('endDate') || undefined;
  const searchQuery = searchParams.get('search') || searchParams.get('q') || undefined;
  const limit = Math.min(Number(searchParams.get('limit')) || 50, 200);
  const offset = Math.max(Number(searchParams.get('offset')) || 0, 0);

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json(
          { error: 'Authentication required. Please sign in to view transaction activity.' },
          { status: 401 }
        );
      }

      // Fetch all user transactions to run chronological Realized P&L calculation
      let query = supabase
        .from('investment_transactions')
        .select(`
          *,
          broker_account:broker_accounts(*),
          instrument:instruments(*)
        `)
        .eq('user_id', user.id)
        .order('transaction_date', { ascending: false });

      if (brokerAccountId) {
        query = query.eq('broker_account_id', brokerAccountId);
      }
      if (instrumentId) {
        query = query.eq('instrument_id', instrumentId);
      }
      if (transactionType && transactionType !== 'ALL') {
        query = query.eq('transaction_type', transactionType.toUpperCase());
      }
      if (startDate) {
        query = query.gte('transaction_date', startDate);
      }
      if (endDate) {
        query = query.lte('transaction_date', endDate);
      }

      const { data, error } = await query;
      if (error) {
        console.error('[API /api/portfolio/transactions GET] Supabase query error:', error.message);
        return NextResponse.json(
          { error: 'Database error: failed to fetch transaction records.' },
          { status: 500 }
        );
      }

      const allRows = (data || []) as unknown as TransactionWithPnL[];

      // Filter by search query if supplied
      let filtered = allRows;
      if (searchQuery && searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        filtered = filtered.filter((t) => {
          const sym = t.instrument?.symbol?.toLowerCase() || '';
          const name = t.instrument?.instrument_name?.toLowerCase() || '';
          const notes = t.notes?.toLowerCase() || '';
          const ref = t.external_reference?.toLowerCase() || '';
          return sym.includes(q) || name.includes(q) || notes.includes(q) || ref.includes(q);
        });
      }

      // Calculate Realized P&L & corporate actions across all transactions
      const {
        enrichedTransactions,
        totalRealizedPnL,
        totalRealizedPnLGross,
        totalDividendIncome,
        totalInterestIncome,
        totalTradeFees,
        totalStandaloneFees,
      } = calculateRealizedPnL(filtered);

      const paginated = enrichedTransactions.slice(offset, offset + limit);

      return NextResponse.json({
        transactions: paginated,
        totalCount: filtered.length,
        metrics: {
          totalRealizedPnL,
          totalRealizedPnLGross,
          totalDividendIncome,
          totalInterestIncome,
          totalIncome: roundCurrency(totalDividendIncome + totalInterestIncome),
          totalTradeFees,
          totalStandaloneFees,
          totalFees: roundCurrency(totalTradeFees + totalStandaloneFees),
        },
        storageMode: 'cloud',
      });
    } catch (err) {
      console.error('[API /api/portfolio/transactions GET] Unexpected error:', err instanceof Error ? err.message : err);
      return NextResponse.json(
        { error: 'Unable to connect to database service.' },
        { status: 500 }
      );
    }
  }

  // Local development / fallback storage mode
  const { transactions: rawList, totalCount } = PortfolioStorage.getTransactions('current_user', {
    brokerAccountId,
    instrumentId,
    transactionType,
    startDate,
    endDate,
    searchQuery,
  });

  const enrichedList: TransactionWithPnL[] = rawList.map((t) => {
    const inst = PortfolioStorage.getInstrumentById(t.instrument_id) || undefined;
    const brokers = PortfolioStorage.getBrokerAccounts();
    const broker = brokers.find((b) => b.id === t.broker_account_id);
    return {
      ...t,
      instrument: inst,
      broker_account: broker,
    };
  });

  // Calculate Realized P&L
  const {
    enrichedTransactions,
    totalRealizedPnL,
    totalRealizedPnLGross,
    totalDividendIncome,
    totalInterestIncome,
    totalTradeFees,
    totalStandaloneFees,
  } = calculateRealizedPnL(enrichedList);

  const paginated = enrichedTransactions.slice(offset, offset + limit);

  return NextResponse.json({
    transactions: paginated,
    totalCount,
    metrics: {
      totalRealizedPnL,
      totalRealizedPnLGross,
      totalDividendIncome,
      totalInterestIncome,
      totalIncome: roundCurrency(totalDividendIncome + totalInterestIncome),
      totalTradeFees,
      totalStandaloneFees,
      totalFees: roundCurrency(totalTradeFees + totalStandaloneFees),
    },
    isDemo: true,
    storageMode: 'local',
  });
}

// ─── POST /api/portfolio/transactions ─────────────────────────
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // 1. Validate required fields
    const brokerAccountId = body.broker_account_id;
    if (!brokerAccountId) {
      return NextResponse.json({ error: 'Broker account is required.' }, { status: 400 });
    }

    const txType = (body.transaction_type || '').toUpperCase() as TransactionType;
    const validTypes: TransactionType[] = [
      'BUY', 'SELL', 'DIVIDEND', 'INTEREST', 'COUPON', 'BONUS', 'SPLIT', 'FEE'
    ];
    if (!validTypes.includes(txType)) {
      return NextResponse.json(
        { error: `Invalid transaction type "${txType}". Supported: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    const txDate = body.transaction_date;
    if (!txDate || isNaN(new Date(txDate).getTime())) {
      return NextResponse.json({ error: 'Valid transaction date is required.' }, { status: 400 });
    }

    const rawQty = Number(body.quantity);
    const rawPrice = Number(body.unit_price);
    const rawFees = Number(body.fees ?? 0);
    const rawTaxes = Number(body.taxes ?? 0);

    if (!Number.isFinite(rawQty) || !Number.isFinite(rawPrice) || !Number.isFinite(rawFees) || !Number.isFinite(rawTaxes)) {
      return NextResponse.json({ error: 'Quantity, price, fees, and taxes must be valid finite numbers.' }, { status: 400 });
    }

    const quantity = roundQuantity(rawQty);
    const unitPrice = roundCurrency(rawPrice);
    const fees = roundCurrency(rawFees);
    const taxes = roundCurrency(rawTaxes);

    if (['BUY', 'SELL'].includes(txType)) {
      if (quantity <= 0) {
        return NextResponse.json({ error: 'Quantity must be greater than zero for Buy and Sell trades.' }, { status: 400 });
      }
      if (unitPrice <= 0) {
        return NextResponse.json({ error: 'Unit price must be greater than zero.' }, { status: 400 });
      }
    } else if (['BONUS', 'SPLIT'].includes(txType)) {
      if (quantity <= 0) {
        return NextResponse.json({ error: 'Quantity must be greater than zero for Corporate Actions.' }, { status: 400 });
      }
    }

    if (fees < 0 || taxes < 0) {
      return NextResponse.json({ error: 'Fees and taxes cannot be negative.' }, { status: 400 });
    }

    const grossAmount = roundCurrency(
      Number(body.gross_amount) > 0 ? Number(body.gross_amount) : quantity * unitPrice
    );
    let netAmount = roundCurrency(Number(body.net_amount) || 0);
    if (!netAmount) {
      if (txType === 'BUY') {
        netAmount = roundCurrency(grossAmount + fees + taxes);
      } else if (txType === 'SELL') {
        netAmount = roundCurrency(Math.max(0, grossAmount - fees - taxes));
      } else {
        netAmount = grossAmount;
      }
    }

    // 2. Resolve or create instrument
    let instrumentId = body.instrument_id;
    const symbol = (body.symbol || '').toUpperCase().trim();
    const name = (body.name || symbol).trim();
    const assetClass = body.asset_class || 'equity';
    const exchange = (body.exchange || 'NSE').toUpperCase();
    const isin = body.isin?.trim() || null;

    if (!instrumentId && !symbol) {
      return NextResponse.json(
        { error: 'Either instrument_id or instrument symbol is required.' },
        { status: 400 }
      );
    }

    const externalRef = body.external_reference?.trim() || null;
    const notes = body.notes?.trim() || null;
    const settlementDate = body.settlement_date ? new Date(body.settlement_date).toISOString() : null;

    // Handle Cloud (Supabase) mode
    if (isSupabaseConfigured()) {
      const supabase = await createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json(
          { error: 'Authentication required. Please sign in.' },
          { status: 401 }
        );
      }

      // Verify broker account belongs to authenticated user
      const { data: broker, error: brokerErr } = await supabase
        .from('broker_accounts')
        .select('id')
        .eq('id', brokerAccountId)
        .eq('user_id', user.id)
        .single();

      if (brokerErr || !broker) {
        return NextResponse.json(
          { error: 'Specified broker account not found or access denied.' },
          { status: 403 }
        );
      }

      // Check external_reference deduplication
      if (externalRef) {
        const { data: existingDup } = await supabase
          .from('investment_transactions')
          .select('id')
          .eq('broker_account_id', brokerAccountId)
          .eq('external_reference', externalRef)
          .maybeSingle();

        if (existingDup) {
          return NextResponse.json(
            { error: `Transaction with external reference "${externalRef}" already exists for this broker account.` },
            { status: 409 }
          );
        }
      }

      // Resolve instrument in Supabase if not provided
      if (!instrumentId && symbol) {
        const { data: existingInst } = await supabase
          .from('instruments')
          .select('id')
          .eq('symbol', symbol)
          .maybeSingle();

        if (existingInst) {
          instrumentId = existingInst.id;
        } else {
          const { data: newInst, error: instErr } = await supabase
            .from('instruments')
            .insert({
              symbol,
              instrument_name: name || symbol,
              asset_type: mapAssetClassToCategory(assetClass),
              exchange,
              isin,
              currency: 'INR',
              is_custom: true,
              created_by: user.id,
            })
            .select()
            .single();

          if (instErr) {
            return NextResponse.json({ error: `Failed to create instrument: ${instErr.message}` }, { status: 500 });
          }
          instrumentId = newInst.id;
        }
      }

      // Validate available quantity if SELL
      if (txType === 'SELL') {
        const { data: holding } = await supabase
          .from('holdings')
          .select('quantity')
          .eq('user_id', user.id)
          .eq('broker_account_id', brokerAccountId)
          .eq('instrument_id', instrumentId)
          .maybeSingle();

        const currentQty = Number(holding?.quantity) || 0;
        if (quantity > currentQty && !body.allow_oversell) {
          return NextResponse.json(
            {
              error: `Insufficient quantity to sell: requested ${quantity} units, but position only holds ${currentQty} units.`,
              available_quantity: currentQty,
            },
            { status: 400 }
          );
        }
      }

      // Attempt PostgreSQL atomic RPC function first
      try {
        const { data: rpcRes, error: rpcErr } = await supabase.rpc('record_transaction_atomic', {
          p_broker_account_id: brokerAccountId,
          p_instrument_id: instrumentId,
          p_transaction_type: txType,
          p_quantity: quantity,
          p_unit_price: unitPrice,
          p_gross_amount: grossAmount,
          p_fees: fees,
          p_taxes: taxes,
          p_stt_taxes: taxes,
          p_net_amount: netAmount,
          p_transaction_date: new Date(txDate).toISOString(),
          p_settlement_date: settlementDate,
          p_source: 'MANUAL',
          p_external_reference: externalRef,
          p_notes: notes,
          p_reconcile_holding: body.reconcile_holding !== false,
          p_allow_oversell: Boolean(body.allow_oversell),
        });

        if (!rpcErr && rpcRes) {
          const txObj = rpcRes.transaction as InvestmentTransactionRow;
          // Fetch joined details for response
          const { data: fullTx } = await supabase
            .from('investment_transactions')
            .select(`
              *,
              broker_account:broker_accounts(*),
              instrument:instruments(*)
            `)
            .eq('id', txObj.id)
            .single();

          return NextResponse.json({
            transaction: fullTx || txObj,
            holding: rpcRes.holding,
            message: 'Transaction successfully recorded and portfolio updated atomically.',
            storageMode: 'cloud',
          });
        }

        if (rpcErr) {
          const errMsg = rpcErr.message || '';
          if (errMsg.includes('Insufficient quantity to sell') || rpcErr.code === '22003') {
            return NextResponse.json({ error: errMsg }, { status: 400 });
          }
          if (errMsg.includes('already exists') || rpcErr.code === '23505') {
            return NextResponse.json({ error: errMsg }, { status: 409 });
          }
          // Check if RPC function is missing or schema cache is pending reload
          const isMissingRpc =
            errMsg.includes('schema cache') ||
            errMsg.includes('Could not find the function') ||
            errMsg.includes('does not exist') ||
            rpcErr.code === 'PGRST202';

          if (isMissingRpc) {
            console.error('[API transactions POST] Missing atomic RPC:', errMsg);
            return NextResponse.json(
              {
                error: 'Financial update is temporarily unavailable because the secure transaction service is not configured. Your existing records have not been changed.',
                code: 'ATOMIC_MIGRATION_REQUIRED',
              },
              { status: 503 }
            );
          }

          console.error('[API transactions POST] RPC Error:', errMsg);
          return NextResponse.json({ error: `Atomic transaction failed: ${errMsg}` }, { status: 500 });
        }

        return NextResponse.json(
          { error: 'Unexpected response from atomic transaction procedure. No records modified.' },
          { status: 500 }
        );
      } catch (rpcCatch) {
        console.error('[API transactions POST] RPC execution exception:', rpcCatch);
        return NextResponse.json(
          {
            error: 'Atomic transaction failed due to an unexpected database error. No records were modified.',
            code: 'TRANSACTION_EXECUTION_FAILED',
          },
          { status: 500 }
        );
      }
    }

    // Local development mode
    if (!instrumentId && symbol) {
      const inst = PortfolioStorage.resolveInstrument(
        symbol,
        name,
        mapAssetClassToCategory(assetClass),
        exchange,
        isin
      );
      instrumentId = inst.id;
    }

    // Check oversell in local holdings
    if (txType === 'SELL') {
      const localHoldings = PortfolioStorage.getHoldings();
      const existing = localHoldings.find(
        (h) => h.broker_account_id === brokerAccountId && h.instrument_id === instrumentId
      );
      const avail = existing ? existing.quantity : 0;
      if (quantity > avail && !body.allow_oversell) {
        return NextResponse.json(
          {
            error: `Insufficient quantity to sell: requested ${quantity} units, but position only holds ${avail} units.`,
            available_quantity: avail,
          },
          { status: 400 }
        );
      }
    }

    const newTx = PortfolioStorage.addTransaction({
      user_id: 'current_user',
      broker_account_id: brokerAccountId,
      instrument_id: instrumentId,
      transaction_type: txType,
      quantity,
      unit_price: unitPrice,
      gross_amount: grossAmount,
      fees,
      taxes,
      net_amount: netAmount,
      currency: 'INR',
      transaction_date: new Date(txDate).toISOString(),
      settlement_date: settlementDate,
      source: 'MANUAL',
      external_reference: externalRef,
      notes,
    }, { reconcileHolding: body.reconcile_holding !== false });

    const inst = PortfolioStorage.getInstrumentById(newTx.instrument_id);
    const broker = PortfolioStorage.getBrokerAccounts().find((b) => b.id === newTx.broker_account_id);

    return NextResponse.json({
      transaction: { ...newTx, instrument: inst, broker_account: broker },
      message: 'Transaction successfully recorded in local ledger.',
      isDemo: true,
      storageMode: 'local',
    });
  } catch (err) {
    console.error('[API /api/portfolio/transactions POST] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to record transaction.' },
      { status: 500 }
    );
  }
}

// ─── PUT /api/portfolio/transactions ──────────────────────────
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const id = body.id;
    if (!id) {
      return NextResponse.json({ error: 'Transaction ID is required.' }, { status: 400 });
    }

    const updates: Partial<InvestmentTransactionRow> = {};
    if (body.quantity !== undefined) updates.quantity = roundQuantity(Number(body.quantity));
    if (body.unit_price !== undefined) updates.unit_price = roundCurrency(Number(body.unit_price));
    if (body.gross_amount !== undefined) updates.gross_amount = roundCurrency(Number(body.gross_amount));
    if (body.fees !== undefined) updates.fees = roundCurrency(Number(body.fees));
    if (body.taxes !== undefined) updates.taxes = roundCurrency(Number(body.taxes));
    if (body.net_amount !== undefined) updates.net_amount = roundCurrency(Number(body.net_amount));
    if (body.transaction_date) updates.transaction_date = new Date(body.transaction_date).toISOString();
    if (body.settlement_date !== undefined) updates.settlement_date = body.settlement_date;
    if (body.external_reference !== undefined) updates.external_reference = body.external_reference;
    if (body.notes !== undefined) updates.notes = body.notes;

    if (isSupabaseConfigured()) {
      const supabase = await createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
      }

      // Try PostgreSQL atomic RPC update first
      try {
        const { data: rpcRes, error: rpcErr } = await supabase.rpc('update_transaction_atomic', {
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
          p_reconcile_holding: true,
        });

        if (!rpcErr && rpcRes) {
          const { data: fullTx } = await supabase
            .from('investment_transactions')
            .select(`
              *,
              broker_account:broker_accounts(*),
              instrument:instruments(*)
            `)
            .eq('id', id)
            .single();

          return NextResponse.json({
            transaction: fullTx || rpcRes.transaction,
            reconciliation: rpcRes.reconciliation,
            message: 'Transaction updated and position reconciled successfully.',
            storageMode: 'cloud',
          });
        }

        if (rpcErr) {
          const msg = rpcErr.message || '';
          if (msg.includes('Unsafe transaction') || rpcErr.code === '22003') {
            return NextResponse.json({ error: msg }, { status: 400 });
          }
          if (msg.includes('not found') || rpcErr.code === 'P0002') {
            return NextResponse.json({ error: 'Transaction not found or access denied.' }, { status: 404 });
          }
          const isMissingRpc =
            msg.includes('schema cache') ||
            msg.includes('Could not find the function') ||
            msg.includes('does not exist') ||
            rpcErr.code === 'PGRST202';

          if (isMissingRpc) {
            console.error('[API transactions PUT] Missing atomic RPC:', msg);
            return NextResponse.json(
              {
                error: 'Financial update is temporarily unavailable because the secure transaction service is not configured. Your existing records have not been changed.',
                code: 'ATOMIC_MIGRATION_REQUIRED',
              },
              { status: 503 }
            );
          }

          console.error('[API transactions PUT] RPC Error:', msg);
          return NextResponse.json({ error: `Atomic update failed: ${msg}` }, { status: 500 });
        }

        return NextResponse.json(
          { error: 'Unexpected response from atomic update procedure. No records modified.' },
          { status: 500 }
        );
      } catch (rpcCatch) {
        console.error('[API transactions PUT] RPC execution exception:', rpcCatch);
        return NextResponse.json(
          {
            error: 'Atomic update failed due to an unexpected database error. No records were modified.',
            code: 'TRANSACTION_UPDATE_FAILED',
          },
          { status: 500 }
        );
      }
    }

    // Local mode
    try {
      const updated = PortfolioStorage.updateTransaction(id, updates, true);
      if (!updated) {
        return NextResponse.json({ error: 'Transaction not found.' }, { status: 404 });
      }

      const inst = PortfolioStorage.getInstrumentById(updated.instrument_id);
      const broker = PortfolioStorage.getBrokerAccounts().find((b) => b.id === updated.broker_account_id);

      return NextResponse.json({
        transaction: { ...updated, instrument: inst, broker_account: broker },
        message: 'Transaction updated successfully.',
        storageMode: 'local',
      });
    } catch (err: unknown) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Unsafe transaction edit.' },
        { status: 400 }
      );
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update transaction.' },
      { status: 500 }
    );
  }
}

// ─── DELETE /api/portfolio/transactions ───────────────────────
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Transaction ID is required.' }, { status: 400 });
    }

    if (isSupabaseConfigured()) {
      const supabase = await createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
      }

      // Try PostgreSQL atomic RPC deletion first
      try {
        const { data: rpcRes, error: rpcErr } = await supabase.rpc('delete_transaction_atomic', {
          p_transaction_id: id,
          p_reconcile_holding: true,
        });

        if (!rpcErr && rpcRes) {
          return NextResponse.json({
            success: true,
            reconciliation: rpcRes.reconciliation,
            message: 'Transaction deleted successfully and position reconciled.',
            storageMode: 'cloud',
          });
        }

        if (rpcErr) {
          const msg = rpcErr.message || '';
          if (msg.includes('Unsafe transaction state') || rpcErr.code === '22003') {
            return NextResponse.json(
              { error: 'Cannot delete transaction: subsequent sales depend on these shares.' },
              { status: 400 }
            );
          }
          if (msg.includes('not found') || rpcErr.code === 'P0002') {
            return NextResponse.json({ error: 'Transaction not found or access denied.' }, { status: 404 });
          }
          const isMissingRpc =
            msg.includes('schema cache') ||
            msg.includes('Could not find the function') ||
            msg.includes('does not exist') ||
            rpcErr.code === 'PGRST202';

          if (isMissingRpc) {
            console.error('[API transactions DELETE] Missing atomic RPC:', msg);
            return NextResponse.json(
              {
                error: 'Financial update is temporarily unavailable because the secure transaction service is not configured. Your existing records have not been changed.',
                code: 'ATOMIC_MIGRATION_REQUIRED',
              },
              { status: 503 }
            );
          }

          console.error('[API transactions DELETE] RPC Error:', msg);
          return NextResponse.json({ error: `Atomic deletion failed: ${msg}` }, { status: 500 });
        }

        return NextResponse.json(
          { error: 'Unexpected response from atomic delete procedure. No records modified.' },
          { status: 500 }
        );
      } catch (rpcCatch) {
        console.error('[API transactions DELETE] RPC exception:', rpcCatch);
        return NextResponse.json(
          {
            error: 'Atomic deletion failed due to an unexpected database error. No records were modified.',
            code: 'TRANSACTION_DELETE_FAILED',
          },
          { status: 500 }
        );
      }
    }

    // Local mode
    try {
      const deleted = PortfolioStorage.deleteTransaction(id, true);
      if (!deleted) {
        return NextResponse.json({ error: 'Transaction not found.' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        message: 'Transaction deleted successfully from local ledger.',
        storageMode: 'local',
      });
    } catch (err: unknown) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Cannot delete transaction.' },
        { status: 400 }
      );
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to delete transaction.' },
      { status: 500 }
    );
  }
}

