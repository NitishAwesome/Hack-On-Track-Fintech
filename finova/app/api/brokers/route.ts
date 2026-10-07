import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { DEMO_BROKERS } from '@/lib/demoData';

// GET /api/brokers — list broker accounts
export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ brokers: DEMO_BROKERS, isDemo: true });
  }

  const { data, error } = await supabase
    .from('broker_accounts')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ brokers: data, isDemo: false });
}

// POST /api/brokers — add a broker account
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  const body = await request.json();

  if (authError || !user) {
    const newDemoBroker = {
      id: `demo-broker-${Date.now()}`,
      user_id: 'demo-user',
      broker_name: body.broker_name || 'New Broker',
      account_label: body.account_label || null,
      account_type: body.account_type || 'demat',
      color_hex: body.color_hex || '#3B82F6',
      is_active: true,
      created_at: new Date().toISOString(),
    };
    return NextResponse.json({ broker: newDemoBroker, isDemo: true }, { status: 201 });
  }

  // Get existing broker count for color assignment
  const { count } = await supabase
    .from('broker_accounts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);

  const COLORS = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#06B6D4', '#EF4444', '#6366F1'];
  const colorHex = body.color_hex || COLORS[(count ?? 0) % COLORS.length];

  const { data, error } = await supabase
    .from('broker_accounts')
    .insert({
      user_id: user.id,
      broker_name: body.broker_name,
      account_label: body.account_label || null,
      account_type: body.account_type || 'demat',
      color_hex: colorHex,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ broker: data }, { status: 201 });
}

// DELETE /api/brokers?id=... — remove a broker account
export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Broker ID required' }, { status: 400 });
  }

  if (authError || !user) {
    return NextResponse.json({ success: true, isDemo: true });
  }

  const { error } = await supabase
    .from('broker_accounts')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
