import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { enrichHolding } from '@/lib/calculations/portfolio';
import type { Holding, AssetClass } from '@/types/portfolio';

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

// POST /api/portfolio/holdings/import — bulk import holdings (from CSV/JSON)
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  const body = await request.json();
  const items: ImportHoldingInput[] = Array.isArray(body) ? body : body.holdings || [];

  if (!items || items.length === 0) {
    return NextResponse.json({ error: 'No holdings provided for import' }, { status: 400 });
  }

  // Validate and normalize rows
  const normalizedRows = items.map((row) => {
    const symbol = (row.symbol || '').toUpperCase().trim();
    const name = (row.name || symbol).trim();
    const assetClass: AssetClass = ['equity', 'reit', 'invit', 'bond', 'sgb', 'etf', 'mf'].includes(
      (row.asset_class || '').toLowerCase()
    )
      ? (row.asset_class!.toLowerCase() as AssetClass)
      : 'equity';

    const qty = Math.max(0.001, Number(row.quantity) || 1);
    const avgPrice = Math.max(0.01, Number(row.avg_buy_price) || 100);

    return {
      symbol,
      name,
      asset_class: assetClass,
      exchange: (row.exchange || 'NSE').toUpperCase(),
      quantity: qty,
      avg_buy_price: avgPrice,
      current_price: avgPrice,
      isin: row.isin || null,
      broker_account_id: row.broker_account_id || null,
      price_updated_at: new Date().toISOString(),
    };
  }).filter((r) => r.symbol.length > 0);

  if (normalizedRows.length === 0) {
    return NextResponse.json({ error: 'No valid rows found in import data' }, { status: 400 });
  }

  if (authError || !user) {
    // Demo/preview response
    return NextResponse.json({
      success: true,
      count: normalizedRows.length,
      imported: normalizedRows.map((r, i) => enrichHolding({
        id: `demo-import-${i}`,
        user_id: 'demo-user',
        ...r,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as Holding)),
      isDemo: true,
    });
  }

  // Insert into Supabase with user_id
  const rowsToInsert = normalizedRows.map((r) => ({
    user_id: user.id,
    ...r,
  }));

  const { data, error } = await supabase
    .from('holdings')
    .insert(rowsToInsert)
    .select(`*, broker_account:broker_accounts(*)`);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const enriched = (data as Holding[]).map(enrichHolding);
  return NextResponse.json({
    success: true,
    count: enriched.length,
    imported: enriched,
  }, { status: 201 });
}
