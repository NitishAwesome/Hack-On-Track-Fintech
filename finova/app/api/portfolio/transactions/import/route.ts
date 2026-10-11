import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { PortfolioStorage } from '@/lib/storage/portfolioStorage';
import { roundCurrency, roundQuantity } from '@/lib/calculations/portfolio';
import { parseAndNormalizeCsvDate } from '@/lib/utils/csvDateParser';
import type {
  InvestmentTransactionRow,
  TransactionType,
  AssetCategory,
} from '@/types/database';

function generateDeterministicReference(
  brokerAccountId: string,
  symbol: string,
  date: string,
  type: string,
  qty: number,
  price: number
): string {
  const normDate = date.split('T')[0];
  const payload = `${brokerAccountId}:${symbol.toUpperCase()}:${normDate}:${type.toUpperCase()}:${qty}:${price}`;
  // Simple non-cryptographic hash for local deduplication
  let hash = 0;
  for (let i = 0; i < payload.length; i++) {
    hash = (hash << 5) - hash + payload.charCodeAt(i);
    hash |= 0;
  }
  return `tx-hash-${Math.abs(hash).toString(36)}`;
}

function mapAssetClassToCategory(assetClass: string): AssetCategory {
  const ac = assetClass.toLowerCase();
  if (ac === 'mf' || ac === 'mutual_fund') return 'MUTUAL_FUND';
  if (ac === 'reit') return 'REIT';
  if (ac === 'invit') return 'INVIT';
  if (ac === 'bond' || ac === 'sgb') return 'BOND';
  return 'STOCK';
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rows = body.transactions;
    const defaultBrokerAccountId = body.broker_account_id;
    const reconcileHoldings = body.reconcile_holdings !== false;

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { error: 'An array of transactions is required for bulk import.' },
        { status: 400 }
      );
    }

    const importedTransactions: InvestmentTransactionRow[] = [];
    const duplicates: { external_reference: string; symbol: string; date: string }[] = [];
    const errors: { row: number; error: string }[] = [];

    if (isSupabaseConfigured()) {
      const supabase = await createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
      }

      // Pre-fetch all user external references for this broker account to speed up deduplication
      const { data: existingTxs } = await supabase
        .from('investment_transactions')
        .select('external_reference, broker_account_id')
        .eq('user_id', user.id);

      const existingRefSet = new Set(
        (existingTxs || [])
          .filter((t) => Boolean(t.external_reference))
          .map((t) => `${t.broker_account_id}:::${t.external_reference}`)
      );

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 1;

        const brokerId = row.broker_account_id || defaultBrokerAccountId;
        if (!brokerId) {
          errors.push({ row: rowNum, error: 'Missing broker_account_id.' });
          continue;
        }

        const symbol = (row.symbol || '').toUpperCase().trim();
        if (!symbol) {
          errors.push({ row: rowNum, error: 'Missing instrument symbol.' });
          continue;
        }

        const txType = (row.transaction_type || row.trade_type || 'BUY').toUpperCase() as TransactionType;
        const rawQty = Number(row.quantity);
        const rawPrice = Number(row.unit_price ?? row.price);
        const rawFees = Number(row.fees ?? 0);
        const rawTaxes = Number(row.taxes ?? 0);

        if (!Number.isFinite(rawQty) || rawQty <= 0) {
          errors.push({ row: rowNum, error: `Invalid quantity: must be a positive finite number.` });
          continue;
        }

        if (!Number.isFinite(rawPrice) || rawPrice < 0) {
          errors.push({ row: rowNum, error: `Invalid price: cannot be negative.` });
          continue;
        }

        const qty = roundQuantity(rawQty);
        const price = roundCurrency(rawPrice);
        const fees = roundCurrency(Number.isFinite(rawFees) && rawFees >= 0 ? rawFees : 0);
        const taxes = roundCurrency(Number.isFinite(rawTaxes) && rawTaxes >= 0 ? rawTaxes : 0);
        const grossAmount = roundCurrency(
          Number(row.gross_amount) > 0 ? Number(row.gross_amount) : qty * price
        );
        const netAmount = roundCurrency(
          Number(row.net_amount) > 0
            ? Number(row.net_amount)
            : txType === 'BUY'
            ? grossAmount + fees + taxes
            : txType === 'SELL'
            ? Math.max(0, grossAmount - fees - taxes)
            : grossAmount
        );

        const rawDateStr = row.transaction_date || row.trade_date;
        const dateCheck = parseAndNormalizeCsvDate(rawDateStr);
        if (!dateCheck.isValid) {
          errors.push({ row: rowNum, error: dateCheck.error || `Invalid trade date "${rawDateStr}".` });
          continue;
        }
        const dateStr = dateCheck.normalizedIso || `${dateCheck.normalizedDate}T00:00:00.000Z`;

        const externalRef =
          row.external_reference?.trim() ||
          row.trade_id?.trim() ||
          generateDeterministicReference(brokerId, symbol, dateStr, txType, qty, price);

        const dedupKey = `${brokerId}:::${externalRef}`;
        if (existingRefSet.has(dedupKey)) {
          duplicates.push({ external_reference: externalRef, symbol, date: dateStr });
          continue;
        }

        // Resolve instrument in Supabase
        let instrumentId = row.instrument_id;
        if (!instrumentId) {
          const { data: inst } = await supabase
            .from('instruments')
            .select('id')
            .eq('symbol', symbol)
            .maybeSingle();

          if (inst) {
            instrumentId = inst.id;
          } else {
            const { data: newInst, error: instErr } = await supabase
              .from('instruments')
              .insert({
                symbol,
                instrument_name: row.name || symbol,
                asset_type: mapAssetClassToCategory(row.asset_class || 'equity'),
                exchange: (row.exchange || 'NSE').toUpperCase(),
                isin: row.isin || null,
                currency: 'INR',
                is_custom: true,
                created_by: user.id,
              })
              .select()
              .single();

            if (instErr) {
              errors.push({ row: rowNum, error: `Failed to create instrument ${symbol}: ${instErr.message}` });
              continue;
            }
            instrumentId = newInst.id;
          }
        }

        // Execute atomic trade recording and position reconciliation
        try {
          const { data: rpcRes, error: rpcErr } = await supabase.rpc('record_transaction_atomic', {
            p_broker_account_id: brokerId,
            p_instrument_id: instrumentId,
            p_transaction_type: txType,
            p_quantity: qty,
            p_unit_price: price,
            p_gross_amount: grossAmount,
            p_fees: fees,
            p_taxes: taxes,
            p_stt_taxes: taxes,
            p_net_amount: netAmount,
            p_transaction_date: new Date(dateStr).toISOString(),
            p_settlement_date: row.settlement_date ? new Date(row.settlement_date).toISOString() : null,
            p_source: 'CSV',
            p_external_reference: externalRef,
            p_notes: row.notes || 'Imported via CSV tradebook',
            p_reconcile_holding: reconcileHoldings,
            p_allow_oversell: false,
          });

          if (!rpcErr && rpcRes) {
            importedTransactions.push(rpcRes.transaction as InvestmentTransactionRow);
            existingRefSet.add(dedupKey);
          } else if (rpcErr) {
            const errMsg = rpcErr.message || '';
            const isMissingRpc =
              errMsg.includes('schema cache') ||
              errMsg.includes('Could not find the function') ||
              errMsg.includes('does not exist') ||
              rpcErr.code === 'PGRST202';

            if (isMissingRpc) {
              return NextResponse.json(
                {
                  error: 'Financial import is temporarily unavailable because the secure transaction service is not configured. No records were imported.',
                  code: 'ATOMIC_MIGRATION_REQUIRED',
                },
                { status: 503 }
              );
            }

            if (errMsg.includes('already exists') || rpcErr.code === '23505') {
              duplicates.push({ external_reference: externalRef, symbol, date: dateStr });
            } else if (errMsg.includes('Insufficient quantity to sell') || rpcErr.code === '22003') {
              errors.push({ row: rowNum, error: `Oversell rejected for ${symbol}: ${errMsg}` });
            } else {
              errors.push({ row: rowNum, error: `Atomic record failed for ${symbol}: ${errMsg}` });
            }
          }
        } catch (rpcCatch) {
          console.error('[API import POST] RPC execution exception:', rpcCatch);
          errors.push({
            row: rowNum,
            error: `Transaction execution exception for ${symbol}: ${rpcCatch instanceof Error ? rpcCatch.message : String(rpcCatch)}`,
          });
        }
      }

      return NextResponse.json({
        imported_count: importedTransactions.length,
        duplicate_count: duplicates.length,
        error_count: errors.length,
        duplicates,
        errors,
        message: `Successfully processed CSV tradebook: ${importedTransactions.length} imported, ${duplicates.length} duplicates skipped, ${errors.length} errors.`,
        storageMode: 'cloud',
      });
    }


    // Local mode (Supabase unconfigured)
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;

      const brokerId = row.broker_account_id || defaultBrokerAccountId;
      if (!brokerId) {
        errors.push({ row: rowNum, error: 'Missing broker_account_id.' });
        continue;
      }

      const symbol = (row.symbol || '').toUpperCase().trim();
      if (!symbol) {
        errors.push({ row: rowNum, error: 'Missing instrument symbol.' });
        continue;
      }

      const txType = (row.transaction_type || row.trade_type || 'BUY').toUpperCase() as TransactionType;
      const qty = roundQuantity(Number(row.quantity) || 0);
      const price = roundCurrency(Number(row.unit_price ?? row.price) || 0);
      const fees = roundCurrency(Number(row.fees) || 0);
      const taxes = roundCurrency(Number(row.taxes) || 0);
      const grossAmount = roundCurrency(
        Number(row.gross_amount) > 0 ? Number(row.gross_amount) : qty * price
      );
      const netAmount = roundCurrency(
        Number(row.net_amount) > 0
          ? Number(row.net_amount)
          : txType === 'BUY'
          ? grossAmount + fees + taxes
          : txType === 'SELL'
          ? Math.max(0, grossAmount - fees - taxes)
          : grossAmount
      );

        const rawDateStr = row.transaction_date || row.trade_date;
        const dateCheck = parseAndNormalizeCsvDate(rawDateStr);
        if (!dateCheck.isValid) {
          errors.push({ row: rowNum, error: dateCheck.error || `Invalid trade date "${rawDateStr}".` });
          continue;
        }
        const dateStr = dateCheck.normalizedIso || `${dateCheck.normalizedDate}T00:00:00.000Z`;

      const externalRef =
        row.external_reference?.trim() ||
        row.trade_id?.trim() ||
        generateDeterministicReference(brokerId, symbol, dateStr, txType, qty, price);

      let instrumentId = row.instrument_id;
      if (!instrumentId) {
        const inst = PortfolioStorage.resolveInstrument(
          symbol,
          row.name || symbol,
          mapAssetClassToCategory(row.asset_class || 'equity'),
          (row.exchange || 'NSE').toUpperCase(),
          row.isin || null
        );
        instrumentId = inst.id;
      }

      try {
        const newTx = PortfolioStorage.addTransaction({
          user_id: 'current_user',
          broker_account_id: brokerId,
          instrument_id: instrumentId,
          transaction_type: txType,
          quantity: qty,
          unit_price: price,
          gross_amount: grossAmount,
          fees,
          taxes,
          net_amount: netAmount,
          currency: 'INR',
          transaction_date: new Date(dateStr).toISOString(),
          settlement_date: row.settlement_date ? new Date(row.settlement_date).toISOString() : null,
          source: 'CSV',
          external_reference: externalRef,
          notes: row.notes || 'Imported via CSV tradebook',
        }, { reconcileHolding: reconcileHoldings });

        importedTransactions.push(newTx);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('already exists')) {
          duplicates.push({ external_reference: externalRef, symbol, date: dateStr });
        } else {
          errors.push({ row: rowNum, error: msg });
        }
      }
    }

    return NextResponse.json({
      imported_count: importedTransactions.length,
      duplicate_count: duplicates.length,
      error_count: errors.length,
      duplicates,
      errors,
      message: `Successfully imported ${importedTransactions.length} transactions (${duplicates.length} duplicates skipped).`,
      isDemo: true,
      storageMode: 'local',
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'CSV tradebook import failed.' },
      { status: 500 }
    );
  }
}
