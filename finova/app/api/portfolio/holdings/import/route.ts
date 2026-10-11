import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PortfolioStorage } from '@/lib/storage/portfolioStorage';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import type { AssetClass } from '@/types/portfolio';
import type { AssetCategory } from '@/types/database';

interface ImportHoldingInput {
  symbol: string;
  name?: string;
  asset_class?: AssetClass;
  exchange?: string;
  quantity: number | string;
  avg_buy_price: number | string;
  broker_account_id?: string | null;
  isin?: string | null;
}

function mapAssetClassToCategory(assetClass: AssetClass): AssetCategory {
  if (assetClass === 'mf') return 'MUTUAL_FUND';
  if (assetClass === 'reit') return 'REIT';
  if (assetClass === 'invit') return 'INVIT';
  if (assetClass === 'bond' || assetClass === 'sgb') return 'BOND';
  return 'STOCK';
}

// POST /api/portfolio/holdings/import — bulk import holdings (from CSV)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const items: ImportHoldingInput[] = Array.isArray(body) ? body : body.holdings || [];
    const duplicateMode: 'replace' | 'update' | 'skip' = body.duplicate_mode || 'replace';
    const targetBrokerAccountId = body.broker_account_id;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'No holdings provided for import.' }, { status: 400 });
    }

    if (isSupabaseConfigured()) {
      const supabase = await createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json(
          { error: 'Authentication required. Please sign in to import holdings.' },
          { status: 401 }
        );
      }

      // Determine valid broker account for this user
      let brokerId = targetBrokerAccountId;
      if (brokerId) {
        const { data: broker, error: brokerErr } = await supabase
          .from('broker_accounts')
          .select('id')
          .eq('id', brokerId)
          .eq('user_id', user.id)
          .single();

        if (brokerErr || !broker) {
          return NextResponse.json(
            { error: 'Specified broker account not found or access denied.' },
            { status: 400 }
          );
        }
      } else {
        const { data: existingBrokers, error: brokersErr } = await supabase
          .from('broker_accounts')
          .select('id')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true })
          .limit(1);

        if (brokersErr) {
          console.error('[API /import POST] Broker query error:', brokersErr.message);
          return NextResponse.json(
            { error: 'Database error: unable to verify broker accounts.' },
            { status: 500 }
          );
        }

        if (existingBrokers && existingBrokers.length > 0) {
          brokerId = existingBrokers[0].id;
        } else {
          // Auto-provision primary broker account for user
          const { data: defaultBroker, error: createBrokerErr } = await supabase
            .from('broker_accounts')
            .insert({
              user_id: user.id,
              broker_code: 'ZERODHA',
              display_name: 'Primary Demat Account',
              account_type: 'broker',
              connection_status: 'MANUAL',
              data_source: 'CSV',
              currency: 'INR',
            })
            .select()
            .single();

          if (createBrokerErr || !defaultBroker) {
            console.error('[API /import POST] Broker creation error:', createBrokerErr?.message);
            return NextResponse.json(
              { error: 'Database error: unable to initialize default broker account.' },
              { status: 500 }
            );
          }
          brokerId = defaultBroker.id;
        }
      }

      let importedCount = 0;
      let skippedCount = 0;
      const errors: string[] = [];

      for (let i = 0; i < items.length; i++) {
        const row = items[i];
        const symbol = (row.symbol || '').toUpperCase().trim();
        if (!symbol) {
          errors.push(`Row ${i + 1}: Missing symbol`);
          continue;
        }

        const qty = Number(row.quantity);
        if (!Number.isFinite(qty) || qty <= 0) {
          errors.push(`Row ${i + 1} (${symbol}): Quantity must be positive`);
          continue;
        }

        const avgPrice = Number(row.avg_buy_price);
        if (!Number.isFinite(avgPrice) || avgPrice < 0) {
          errors.push(`Row ${i + 1} (${symbol}): Purchase price cannot be negative`);
          continue;
        }

        const name = (row.name || symbol).trim();
        const assetClass: AssetClass = ['equity', 'reit', 'invit', 'bond', 'sgb', 'etf', 'mf'].includes(
          (row.asset_class || '').toLowerCase()
        )
          ? (row.asset_class!.toLowerCase() as AssetClass)
          : 'equity';

        const assetCategory = mapAssetClassToCategory(assetClass);
        const exchange = (row.exchange || 'NSE').toUpperCase();
        const isin = row.isin?.trim() || null;
        const accountId = row.broker_account_id || brokerId;

        // Resolve or create instrument in public.instruments
        let instrumentId: string;
        const { data: existingInst, error: instLookupErr } = await supabase
          .from('instruments')
          .select('id')
          .eq('symbol', symbol)
          .eq('exchange', exchange)
          .maybeSingle();

        if (instLookupErr) {
          errors.push(`Row ${i + 1} (${symbol}): Instrument lookup failed`);
          continue;
        }

        if (existingInst) {
          instrumentId = existingInst.id;
        } else {
          const { data: newInst, error: newInstErr } = await supabase
            .from('instruments')
            .insert({
              symbol,
              instrument_name: name,
              asset_type: assetCategory,
              exchange,
              isin,
              currency: 'INR',
              is_active: true,
              is_custom: true,
              created_by: user.id,
            })
            .select()
            .single();

          if (newInstErr || !newInst) {
            errors.push(`Row ${i + 1} (${symbol}): Failed to register instrument in database`);
            continue;
          }
          instrumentId = newInst.id;
        }

        // Check for existing holding position
        const { data: existingHolding, error: holdingCheckErr } = await supabase
          .from('holdings')
          .select('id, quantity, average_buy_price, is_ledger_managed')
          .eq('broker_account_id', accountId)
          .eq('instrument_id', instrumentId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (holdingCheckErr) {
          errors.push(`Row ${i + 1} (${symbol}): Error checking duplicate position`);
          continue;
        }

        if (existingHolding) {
          // LEDGER PROTECTION: Check whether position is managed by the trade ledger
          const { count: txCount } = await supabase
            .from('investment_transactions')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('broker_account_id', accountId)
            .eq('instrument_id', instrumentId);

          if (existingHolding.is_ledger_managed || (txCount !== null && txCount > 0)) {
            errors.push(`Row ${i + 1} (${symbol}): Cannot modify ledger-managed holding via snapshot import. Record trades in the trade ledger instead.`);
            skippedCount++;
            continue;
          }

          if (duplicateMode === 'skip') {
            skippedCount++;
            continue;
          } else if (duplicateMode === 'replace') {
            const { error: updateErr } = await supabase
              .from('holdings')
              .update({
                quantity: qty,
                average_buy_price: avgPrice,
                as_of: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('id', existingHolding.id)
              .eq('user_id', user.id);

            if (updateErr) {
              errors.push(`Row ${i + 1} (${symbol}): Failed to replace position`);
            } else {
              importedCount++;
            }
            continue;
          } else if (duplicateMode === 'update') {
            const existingQty = Number(existingHolding.quantity);
            const existingPrice = Number(existingHolding.average_buy_price);

            // Idempotency guard: If re-importing the same snapshot, skip without double counting
            if (existingQty === qty && Math.abs(existingPrice - avgPrice) < 0.001) {
              skippedCount++;
              continue;
            }

            // Additive mode requires explicit user confirmation to avoid silent position inflation
            if (!body.allow_additive_accumulation) {
              errors.push(`Row ${i + 1} (${symbol}): Additive update requires explicit allow_additive_accumulation flag to prevent duplicate counting. Use duplicate_mode=replace to overwrite snapshot values.`);
              continue;
            }

            const totalQty = existingQty + qty;
            const weightedAvgPrice = (existingQty * existingPrice + qty * avgPrice) / totalQty;

            const { error: updateErr } = await supabase
              .from('holdings')
              .update({
                quantity: totalQty,
                average_buy_price: weightedAvgPrice,
                as_of: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('id', existingHolding.id)
              .eq('user_id', user.id);

            if (updateErr) {
              errors.push(`Row ${i + 1} (${symbol}): Failed to accumulate position`);
            } else {
              importedCount++;
            }
            continue;
          }
        }

        // Insert new position
        const { error: insertErr } = await supabase.from('holdings').insert({
          user_id: user.id,
          broker_account_id: accountId,
          instrument_id: instrumentId,
          quantity: qty,
          average_buy_price: avgPrice,
          currency: 'INR',
          data_source: 'CSV',
          as_of: new Date().toISOString(),
        });

        if (insertErr) {
          errors.push(`Row ${i + 1} (${symbol}): Failed to persist holding`);
        } else {
          importedCount++;
        }
      }

      return NextResponse.json(
        {
          success: true,
          count: importedCount,
          skipped: skippedCount,
          errors: errors.length > 0 ? errors : undefined,
          storageMode: 'cloud',
        },
        { status: 201 }
      );
    }

    // Explicit local development mode (Supabase unconfigured)
    let brokerId = targetBrokerAccountId;
    if (!brokerId) {
      const existingBrokers = PortfolioStorage.getBrokerAccounts();
      if (existingBrokers.length > 0) {
        brokerId = existingBrokers[0].id;
      } else {
        const defaultBroker = PortfolioStorage.addBrokerAccount({
          user_id: 'current_user',
          broker_code: 'ZERODHA',
          display_name: 'Primary Demat Account',
          account_type: 'broker',
          connection_status: 'MANUAL',
          data_source: 'CSV',
          currency: 'INR',
          last_synced_at: new Date().toISOString(),
          broker_name: 'Zerodha',
          account_label: 'Primary Demat Account',
          color_hex: '#3B82F6',
          is_active: true,
        });
        brokerId = defaultBroker.id;
      }
    }

    let importedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < items.length; i++) {
      const row = items[i];
      const symbol = (row.symbol || '').toUpperCase().trim();
      if (!symbol) {
        errors.push(`Row ${i + 1}: Missing symbol`);
        continue;
      }

      const qty = Number(row.quantity);
      if (!Number.isFinite(qty) || qty <= 0) {
        errors.push(`Row ${i + 1} (${symbol}): Quantity must be positive`);
        continue;
      }

      const avgPrice = Number(row.avg_buy_price);
      if (!Number.isFinite(avgPrice) || avgPrice < 0) {
        errors.push(`Row ${i + 1} (${symbol}): Purchase price cannot be negative`);
        continue;
      }

      const name = (row.name || symbol).trim();
      const assetClass: AssetClass = ['equity', 'reit', 'invit', 'bond', 'sgb', 'etf', 'mf'].includes(
        (row.asset_class || '').toLowerCase()
      )
        ? (row.asset_class!.toLowerCase() as AssetClass)
        : 'equity';

      const assetCategory = mapAssetClassToCategory(assetClass);
      const exchange = (row.exchange || 'NSE').toUpperCase();
      const isin = row.isin?.trim() || null;
      const accountId = row.broker_account_id || brokerId;

      const instrument = PortfolioStorage.resolveInstrument(
        symbol,
        name,
        assetCategory,
        exchange,
        isin
      );

      const existingHoldings = PortfolioStorage.getHoldings();
      const existing = existingHoldings.find(
        (h) => h.broker_account_id === accountId && h.instrument_id === instrument.id
      );

      if (existing) {
        const localTxCount = PortfolioStorage.getState().transactions.filter(
          (tx) => tx.broker_account_id === accountId && tx.instrument_id === instrument.id
        ).length;

        if (existing.is_ledger_managed || localTxCount > 0) {
          errors.push(`Row ${i + 1} (${symbol}): Cannot modify ledger-managed holding via snapshot import. Record trades in the trade ledger instead.`);
          skippedCount++;
          continue;
        }

        if (duplicateMode === 'skip') {
          skippedCount++;
          continue;
        } else if (duplicateMode === 'replace') {
          PortfolioStorage.updateHolding(existing.id, {
            quantity: qty,
            average_buy_price: avgPrice,
            as_of: new Date().toISOString(),
          });
          importedCount++;
          continue;
        } else if (duplicateMode === 'update') {
          const existingQty = existing.quantity;
          const existingPrice = existing.average_buy_price;

          // Idempotency guard: If re-importing identical snapshot row, skip without double counting
          if (existingQty === qty && Math.abs(existingPrice - avgPrice) < 0.001) {
            skippedCount++;
            continue;
          }

          if (!body.allow_additive_accumulation) {
            errors.push(`Row ${i + 1} (${symbol}): Additive update requires explicit allow_additive_accumulation flag to prevent duplicate counting. Use duplicate_mode=replace to overwrite snapshot values.`);
            continue;
          }

          const totalQty = existing.quantity + qty;
          const weightedAvgPrice = (existing.quantity * existing.average_buy_price + qty * avgPrice) / totalQty;
          PortfolioStorage.updateHolding(existing.id, {
            quantity: totalQty,
            average_buy_price: weightedAvgPrice,
            as_of: new Date().toISOString(),
          });
          importedCount++;
          continue;
        }
      }

      PortfolioStorage.addHolding({
        user_id: 'current_user',
        broker_account_id: accountId,
        instrument_id: instrument.id,
        quantity: qty,
        average_buy_price: avgPrice,
        currency: 'INR',
        data_source: 'CSV',
        as_of: new Date().toISOString(),
      });
      importedCount++;
    }

    return NextResponse.json(
      {
        success: true,
        count: importedCount,
        skipped: skippedCount,
        errors: errors.length > 0 ? errors : undefined,
        isDemo: true,
        storageMode: 'local',
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error('[API /api/portfolio/holdings/import POST] Fatal error:', err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: 'Import failed due to server processing error.' },
      { status: 500 }
    );
  }
}
