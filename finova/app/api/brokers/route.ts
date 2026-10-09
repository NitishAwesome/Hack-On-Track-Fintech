import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PortfolioStorage } from '@/lib/storage/portfolioStorage';
import { isSupabaseConfigured } from '@/lib/supabase/config';

// GET /api/brokers — list broker accounts
export async function GET() {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json(
          { error: 'Authentication required. Please sign in to view your broker accounts.' },
          { status: 401 }
        );
      }

      const { data, error } = await supabase
        .from('broker_accounts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[API /api/brokers GET] Supabase query error:', error.message);
        return NextResponse.json(
          { error: 'Database error: failed to fetch broker accounts from cloud database.' },
          { status: 500 }
        );
      }

      return NextResponse.json({ brokers: data || [], isDemo: false, storageMode: 'cloud' });
    } catch (err) {
      console.error('[API /api/brokers GET] Unexpected error:', err instanceof Error ? err.message : err);
      return NextResponse.json(
        { error: 'Unable to connect to database service. Please check network and configuration.' },
        { status: 500 }
      );
    }
  }

  // Explicit local development mode (Supabase unconfigured)
  const brokers = PortfolioStorage.getBrokerAccounts();
  return NextResponse.json({ brokers, isDemo: true, storageMode: 'local' });
}

// POST /api/brokers — add a broker account
export async function POST(request: Request) {
  const body = await request.json();
  const brokerName = (body.broker_name || body.broker_code || 'Other').trim();
  const displayName = (body.display_name || body.account_label || `${brokerName} Account`).trim();
  const accountType = body.account_type || 'broker';

  const COLORS = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#06B6D4', '#EF4444', '#6366F1'];
  const colorHex = body.color_hex || COLORS[Math.floor(Math.random() * COLORS.length)];

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json(
          { error: 'Authentication required. Please sign in to add a broker account.' },
          { status: 401 }
        );
      }

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

      if (error) {
        console.error('[API /api/brokers POST] Supabase insert error:', error.message);
        return NextResponse.json(
          { error: 'Database error: failed to create broker account in cloud database.' },
          { status: 500 }
        );
      }

      return NextResponse.json({ broker: data, storageMode: 'cloud' }, { status: 201 });
    } catch (err) {
      console.error('[API /api/brokers POST] Unexpected error:', err instanceof Error ? err.message : err);
      return NextResponse.json(
        { error: 'Unable to connect to database service. Please check network and configuration.' },
        { status: 500 }
      );
    }
  }

  // Explicit local development mode
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

  return NextResponse.json({ broker: newAccount, isDemo: true, storageMode: 'local' }, { status: 201 });
}

// PUT /api/brokers — rename / update a broker account
export async function PUT(request: Request) {
  const body = await request.json();
  const { id, display_name, account_label, account_type } = body;

  if (!id) {
    return NextResponse.json({ error: 'Account ID is required.' }, { status: 400 });
  }

  const newLabel = (display_name || account_label || '').trim();
  if (!newLabel) {
    return NextResponse.json({ error: 'Display name cannot be empty.' }, { status: 400 });
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json(
          { error: 'Authentication required. Please sign in to update a broker account.' },
          { status: 401 }
        );
      }

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

      if (error) {
        console.error('[API /api/brokers PUT] Supabase update error:', error.message);
        return NextResponse.json(
          { error: 'Database error: failed to update broker account in cloud database.' },
          { status: 500 }
        );
      }

      if (!data) {
        return NextResponse.json(
          { error: 'Broker account not found or access denied.' },
          { status: 404 }
        );
      }

      return NextResponse.json({ broker: data, storageMode: 'cloud' });
    } catch (err) {
      console.error('[API /api/brokers PUT] Unexpected error:', err instanceof Error ? err.message : err);
      return NextResponse.json(
        { error: 'Unable to connect to database service. Please check network and configuration.' },
        { status: 500 }
      );
    }
  }

  // Explicit local development mode
  const updated = PortfolioStorage.updateBrokerAccount(id, {
    display_name: newLabel,
    account_label: newLabel,
    account_type: account_type || 'broker',
  });

  if (!updated) {
    return NextResponse.json({ error: 'Broker account not found.' }, { status: 404 });
  }

  return NextResponse.json({ broker: updated, isDemo: true, storageMode: 'local' });
}

// DELETE /api/brokers?id=... — remove a broker account
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Broker ID is required.' }, { status: 400 });
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json(
          { error: 'Authentication required. Please sign in to delete a broker account.' },
          { status: 401 }
        );
      }

      const { error } = await supabase
        .from('broker_accounts')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('[API /api/brokers DELETE] Supabase delete error:', error.message);
        return NextResponse.json(
          { error: 'Database error: failed to delete broker account from cloud database.' },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, storageMode: 'cloud' });
    } catch (err) {
      console.error('[API /api/brokers DELETE] Unexpected error:', err instanceof Error ? err.message : err);
      return NextResponse.json(
        { error: 'Unable to connect to database service. Please check network and configuration.' },
        { status: 500 }
      );
    }
  }

  // Explicit local development mode
  const deleted = PortfolioStorage.deleteBrokerAccount(id);
  return NextResponse.json({ success: deleted, isDemo: true, storageMode: 'local' });
}
