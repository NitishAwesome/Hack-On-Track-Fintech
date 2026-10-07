import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { enrichHolding } from '@/lib/calculations/portfolio';
import { DEMO_HOLDINGS } from '@/lib/demoData';
import type { Holding } from '@/types/portfolio';

// GET /api/portfolio/holdings — list all holdings
export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    const demoHoldings = DEMO_HOLDINGS.map(enrichHolding);
    return NextResponse.json({ holdings: demoHoldings, isDemo: true });
  }

  const { data, error } = await supabase
    .from('holdings')
    .select(`*, broker_account:broker_accounts(*)`)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const holdings = (data as Holding[]).map(enrichHolding);
  return NextResponse.json({ holdings, isDemo: false });
}

// POST /api/portfolio/holdings — add a new holding
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  const body = await request.json();

  if (authError || !user) {
    // In preview mode, return a mocked holding response so testing UI still works
    const newDemoHolding: Holding = {
      id: `demo-${Date.now()}`,
      user_id: 'demo-user',
      broker_account_id: body.broker_account_id || null,
      symbol: (body.symbol || 'HOLDING').toUpperCase(),
      isin: body.isin || null,
      name: body.name || 'Sample Asset',
      asset_class: body.asset_class || 'equity',
      exchange: body.exchange || 'NSE',
      quantity: Number(body.quantity) || 1,
      avg_buy_price: Number(body.avg_buy_price) || 100,
      current_price: Number(body.avg_buy_price) || 100,
      price_updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    return NextResponse.json({ holding: enrichHolding(newDemoHolding), isDemo: true }, { status: 201 });
  }

  const { data, error } = await supabase
    .from('holdings')
    .insert({
      user_id: user.id,
      broker_account_id: body.broker_account_id || null,
      symbol: body.symbol?.toUpperCase(),
      isin: body.isin || null,
      name: body.name,
      asset_class: body.asset_class,
      exchange: body.exchange || null,
      quantity: Number(body.quantity),
      avg_buy_price: Number(body.avg_buy_price),
      current_price: Number(body.avg_buy_price), // default to avg buy price initially
      price_updated_at: new Date().toISOString(),
    })
    .select(`*, broker_account:broker_accounts(*)`)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ holding: enrichHolding(data as Holding) }, { status: 201 });
}

// DELETE /api/portfolio/holdings?id=... — delete a holding
export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Holding ID required' }, { status: 400 });
  }

  if (authError || !user) {
    return NextResponse.json({ success: true, isDemo: true });
  }

  const { error } = await supabase
    .from('holdings')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
