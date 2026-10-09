import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PortfolioStorage } from '@/lib/storage/portfolioStorage';

function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return Boolean(url && !url.includes('placeholder') && !url.includes('your_'));
}

// GET /api/brokers — list broker accounts
export async function GET() {
  const supabaseConfigured = isSupabaseConfigured();

  if (supabaseConfigured) {
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('broker_accounts')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true });

        if (!error && data) {
          return NextResponse.json({ brokers: data, isDemo: false });
        }
      }
    } catch {
      // Fallback to local storage engine
    }
  }

  // Persistent storage engine
  const brokers = PortfolioStorage.getBrokerAccounts();
  return NextResponse.json({ brokers, isDemo: false });
}

// POST /api/brokers — add a broker account
export async function POST(request: Request) {
  const body = await request.json();
  const brokerName = (body.broker_name || body.broker_code || 'Other').trim();
  const displayName = (body.display_name || body.account_label || `${brokerName} Account`).trim();
  const accountType = body.account_type || 'broker';

  const COLORS = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#06B6D4', '#EF4444', '#6366F1'];
  const colorHex = body.color_hex || COLORS[Math.floor(Math.random() * COLORS.length)];

  const supabaseConfigured = isSupabaseConfigured();
  if (supabaseConfigured) {
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('broker_accounts')
          .insert({
            user_id: user.id,
            broker_code: brokerName.toUpperCase().replace(/\s+/g, '_'),
            display_name: displayName,
            account_type: accountType,
            connection_status: 'MANUAL',
            data_source: 'MANUAL',
            currency: 'INR',
          })
          .select()
          .single();

        if (!error && data) {
          return NextResponse.json({ broker: data }, { status: 201 });
        }
      }
    } catch {
      // Fallback
    }
  }

  // Persistent local storage engine
  const newAccount = PortfolioStorage.addBrokerAccount({
    user_id: 'current_user',
    broker_code: brokerName.toUpperCase().replace(/\s+/g, '_'),
    display_name: displayName,
    account_type: accountType,
    connection_status: 'MANUAL',
    data_source: 'MANUAL',
    currency: 'INR',
    last_synced_at: null,
    broker_name: brokerName,
    account_label: displayName,
    color_hex: colorHex,
    is_active: true,
  });

  return NextResponse.json({ broker: newAccount }, { status: 201 });
}

// PUT /api/brokers — rename / update a broker account
export async function PUT(request: Request) {
  const body = await request.json();
  const { id, display_name, account_label, account_type } = body;

  if (!id) {
    return NextResponse.json({ error: 'Account ID is required' }, { status: 400 });
  }

  const newLabel = (display_name || account_label || '').trim();
  if (!newLabel) {
    return NextResponse.json({ error: 'Display name cannot be empty' }, { status: 400 });
  }

  const supabaseConfigured = isSupabaseConfigured();
  if (supabaseConfigured) {
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('broker_accounts')
          .update({
            display_name: newLabel,
            account_type: account_type || 'broker',
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .eq('user_id', user.id)
          .select()
          .single();

        if (!error && data) {
          return NextResponse.json({ broker: data });
        }
      }
    } catch {
      // Fallback
    }
  }

  const updated = PortfolioStorage.updateBrokerAccount(id, {
    display_name: newLabel,
    account_label: newLabel,
    account_type: account_type || 'broker',
  });

  if (!updated) {
    return NextResponse.json({ error: 'Broker account not found' }, { status: 404 });
  }

  return NextResponse.json({ broker: updated });
}

// DELETE /api/brokers?id=... — remove a broker account
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Broker ID required' }, { status: 400 });
  }

  const supabaseConfigured = isSupabaseConfigured();
  if (supabaseConfigured) {
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase
          .from('broker_accounts')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id);

        if (!error) {
          return NextResponse.json({ success: true });
        }
      }
    } catch {
      // Fallback
    }
  }

  const deleted = PortfolioStorage.deleteBrokerAccount(id);
  return NextResponse.json({ success: deleted });
}
