import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import type { Holding, AssetClass } from '@/types/portfolio';
import type { AssetCategory } from '@/types/database';

function mapAssetClassToCategory(assetClass: AssetClass): AssetCategory {
  if (assetClass === 'mf') return 'MUTUAL_FUND';
  if (assetClass === 'reit') return 'REIT';
  if (assetClass === 'invit') return 'INVIT';
  if (assetClass === 'bond' || assetClass === 'sgb') return 'BOND';
  return 'STOCK';
}

// POST /api/portfolio/migrate-local — Explicitly migrate client-side local holdings to Supabase
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: 'Cannot migrate to cloud: Supabase is not currently configured.' },
      { status: 400 }
    );
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required. Please sign in before migrating local holdings.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const localHoldings: Holding[] = body.holdings || [];
    const duplicateMode: 'replace' | 'update' | 'skip' = body.duplicate_mode || 'skip';

    if (!localHoldings || localHoldings.length === 0) {
      return NextResponse.json(
        { error: 'No local holdings provided for migration.' },
        { status: 400 }
      );
    }

    // Ensure a default broker account exists for the user in Supabase
    let defaultBrokerId: string;
    const { data: userBrokers } = await supabase
      .from('broker_accounts')
      .select('id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1);

    if (userBrokers && userBrokers.length > 0) {
      defaultBrokerId = userBrokers[0].id;
    } else {
      const { data: newBroker, error: brokerErr } = await supabase
        .from('broker_accounts')
        .insert({
          user_id: user.id,
          broker_code: 'MANUAL',
          display_name: 'Primary Migrated Portfolio',
          account_type: 'manual',
          connection_status: 'MANUAL',
          data_source: 'MANUAL',
          currency: 'INR',
        })
        .select()
        .single();

      if (brokerErr || !newBroker) {
        return NextResponse.json(
          { error: 'Failed to create destination broker account in cloud database.' },
          { status: 500 }
        );
      }
      defaultBrokerId = newBroker.id;
    }

    let migratedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < localHoldings.length; i++) {
      const item = localHoldings[i];
      const symbol = (item.symbol || '').toUpperCase().trim();
      if (!symbol) continue;

      const qty = Number(item.quantity);
      const avgPrice = Number(item.avg_buy_price ?? item.average_buy_price);
      if (qty <= 0 || avgPrice < 0) continue;

      const assetCategory = mapAssetClassToCategory(item.asset_class || 'equity');
      const exchange = (item.exchange || 'NSE').toUpperCase();
      const brokerId = item.broker_account_id || defaultBrokerId;

      // 1. Resolve instrument in public.instruments
      let instrumentId: string;
      const { data: existingInst } = await supabase
        .from('instruments')
        .select('id')
        .eq('symbol', symbol)
        .eq('exchange', exchange)
        .maybeSingle();

      if (existingInst) {
        instrumentId = existingInst.id;
      } else {
        const { data: newInst, error: instErr } = await supabase
          .from('instruments')
          .insert({
            symbol,
            instrument_name: item.name || symbol,
            asset_type: assetCategory,
            exchange,
            isin: item.isin || null,
            currency: 'INR',
            is_active: true,
            is_custom: true,
            created_by: user.id,
          })
          .select()
          .single();

        if (instErr || !newInst) {
          errors.push(`${symbol}: Failed to create instrument in database`);
          continue;
        }
        instrumentId = newInst.id;
      }

      // 2. Check duplicate holding position
      const { data: existingHolding } = await supabase
        .from('holdings')
        .select('id, quantity, average_buy_price')
        .eq('broker_account_id', brokerId)
        .eq('instrument_id', instrumentId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingHolding) {
        if (duplicateMode === 'skip') {
          skippedCount++;
          continue;
        } else if (duplicateMode === 'replace') {
          await supabase
            .from('holdings')
            .update({
              quantity: qty,
              average_buy_price: avgPrice,
              as_of: item.as_of || new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingHolding.id)
            .eq('user_id', user.id);
          migratedCount++;
          continue;
        } else if (duplicateMode === 'update') {
          const totalQty = Number(existingHolding.quantity) + qty;
          const weightedAvg =
            (Number(existingHolding.quantity) * Number(existingHolding.average_buy_price) + qty * avgPrice) / totalQty;
          await supabase
            .from('holdings')
            .update({
              quantity: totalQty,
              average_buy_price: weightedAvg,
              opening_quantity: totalQty,
              opening_buy_price: weightedAvg,
              provenance_status: 'MANUAL_DECLARED',
              is_ledger_managed: false,
              as_of: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingHolding.id)
            .eq('user_id', user.id);
          migratedCount++;
          continue;
        }
      }

      // 3. Insert new position
      const { error: insertErr } = await supabase.from('holdings').insert({
        user_id: user.id,
        broker_account_id: brokerId,
        instrument_id: instrumentId,
        quantity: qty,
        average_buy_price: avgPrice,
        opening_quantity: (item as unknown as Record<string, unknown>).opening_quantity ? Number((item as unknown as Record<string, unknown>).opening_quantity) : qty,
        opening_buy_price: (item as unknown as Record<string, unknown>).opening_buy_price ? Number((item as unknown as Record<string, unknown>).opening_buy_price) : avgPrice,
        provenance_status: 'MANUAL_DECLARED',
        is_ledger_managed: false,
        currency: 'INR',
        data_source: 'MANUAL',
        as_of: item.as_of || new Date().toISOString(),
      });

      if (insertErr) {
        errors.push(`${symbol}: ${insertErr.message}`);
      } else {
        migratedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      migratedCount,
      skippedCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error('[API /api/portfolio/migrate-local POST] Error:', err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: 'Migration failed due to server database error.' },
      { status: 500 }
    );
  }
}
