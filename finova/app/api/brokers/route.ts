import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PortfolioStorage } from '@/lib/storage/portfolioStorage';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import type { AccountType, BrokerConnectionStatus, DataSource, BrokerAccountRow } from '@/types/database';

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
  try {
    const body = await request.json();
    const rawBrokerName = (body.broker_name || body.broker_code || 'Other').trim();
    const brokerName = rawBrokerName.length > 50 ? rawBrokerName.slice(0, 50) : rawBrokerName;
    const rawDisplayName = (body.display_name || body.account_label || `${brokerName} Account`).trim();
    const displayName = rawDisplayName.length > 100 ? rawDisplayName.slice(0, 100) : rawDisplayName;

    const validTypes = ['broker', 'depository', 'manual', 'demat', 'trading', 'mf', 'other'];
    const requestedType = String(body.account_type || 'broker').toLowerCase().trim();
    const accountType = validTypes.includes(requestedType) ? requestedType : 'broker';

    // Allow user to specify tracking method: MANUAL or CSV
    const validDataSources = ['MANUAL', 'CSV'];
    const requestedDataSource = String(body.data_source || 'MANUAL').toUpperCase().trim();
    const dataSource = validDataSources.includes(requestedDataSource) ? requestedDataSource : 'MANUAL';

    // Connection status honesty: new accounts start as MANUAL or NOT_CONNECTED (never fake CONNECTED)
    const connectionStatus = dataSource === 'CSV' ? 'MANUAL' : 'MANUAL';

    const COLORS = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#06B6D4', '#EF4444', '#6366F1'];
    const colorHex = body.color_hex || COLORS[Math.floor(Math.random() * COLORS.length)];

    if (isSupabaseConfigured()) {
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
          connection_status: connectionStatus,
          data_source: dataSource,
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
    }

    // Explicit local development mode
    const newAccount = PortfolioStorage.addBrokerAccount({
      user_id: 'current_user',
      broker_code: brokerName.toUpperCase().replace(/\s+/g, '_'),
      display_name: displayName,
      account_type: accountType as AccountType,
      connection_status: connectionStatus as BrokerConnectionStatus,
      data_source: dataSource as DataSource,
      currency: 'INR',
      last_synced_at: null,
      broker_name: brokerName,
      account_label: displayName,
      color_hex: colorHex,
      is_active: true,
    });

    return NextResponse.json({ broker: newAccount, isDemo: true, storageMode: 'local' }, { status: 201 });
  } catch (err) {
    console.error('[API /api/brokers POST] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Unable to process account creation request.' },
      { status: 500 }
    );
  }
}

// PUT /api/brokers — rename / update a broker account
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, display_name, account_label, account_type } = body;

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Valid Account ID is required.' }, { status: 400 });
    }

    const newLabel = (display_name || account_label || '').trim();
    if (!newLabel) {
      return NextResponse.json({ error: 'Display name cannot be empty.' }, { status: 400 });
    }

    if (newLabel.length > 100) {
      return NextResponse.json({ error: 'Display name cannot exceed 100 characters.' }, { status: 400 });
    }

    // Build update object: ONLY update account_type if explicitly provided
    const updatePayload: Record<string, unknown> = {
      display_name: newLabel,
      updated_at: new Date().toISOString(),
    };

    if (account_type !== undefined && account_type !== null) {
      const normalizedType = String(account_type).toLowerCase().trim();
      const validTypes = ['broker', 'depository', 'manual', 'demat', 'trading', 'mf', 'other'];
      if (!validTypes.includes(normalizedType)) {
        return NextResponse.json(
          { error: `Invalid account type '${account_type}'. Allowed: ${validTypes.join(', ')}` },
          { status: 400 }
        );
      }
      updatePayload.account_type = normalizedType;
    }

    if (isSupabaseConfigured()) {
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
        .update(updatePayload)
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
    }

    // Explicit local development mode
    const updated = PortfolioStorage.updateBrokerAccount(id, updatePayload as Partial<BrokerAccountRow>);

    if (!updated) {
      return NextResponse.json({ error: 'Broker account not found.' }, { status: 404 });
    }

    return NextResponse.json({ broker: updated, isDemo: true, storageMode: 'local' });
  } catch (err) {
    console.error('[API /api/brokers PUT] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Failed to process account update request.' },
      { status: 500 }
    );
  }
}

// DELETE /api/brokers?id=... — remove an empty broker account
// FINANCIAL INTEGRITY GUARD: Blocks deletion if holdings or transactions exist
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Broker ID is required.' }, { status: 400 });
    }

    if (isSupabaseConfigured()) {
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

      // Verify broker account exists and belongs to the user
      const { data: brokerAccount, error: fetchErr } = await supabase
        .from('broker_accounts')
        .select('id, display_name, broker_code')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (fetchErr || !brokerAccount) {
        return NextResponse.json(
          { error: 'Broker account not found or access denied.' },
          { status: 404 }
        );
      }

      // FINANCIAL SAFETY AUDIT: Check for dependent holdings
      const { count: holdingsCount, error: hCountErr } = await supabase
        .from('holdings')
        .select('id', { count: 'exact', head: true })
        .eq('broker_account_id', id)
        .eq('user_id', user.id);

      if (hCountErr || holdingsCount === null || holdingsCount === undefined) {
        console.error('[API /api/brokers DELETE] Holdings check failed or uncertain:', hCountErr?.message);
        return NextResponse.json(
          {
            error: 'Financial safety check failed: unable to verify holdings records. Deletion aborted to protect financial records.',
            details: {
              query: 'holdings',
              reason: hCountErr?.message || 'Uncertain count result',
              accountName: brokerAccount.display_name,
            },
          },
          { status: 500 }
        );
      }

      // FINANCIAL SAFETY AUDIT: Check for dependent transactions
      const { count: txCount, error: txCountErr } = await supabase
        .from('investment_transactions')
        .select('id', { count: 'exact', head: true })
        .eq('broker_account_id', id)
        .eq('user_id', user.id);

      if (txCountErr || txCount === null || txCount === undefined) {
        console.error('[API /api/brokers DELETE] Transactions check failed or uncertain:', txCountErr?.message);
        return NextResponse.json(
          {
            error: 'Financial safety check failed: unable to verify transaction records. Deletion aborted to protect financial records.',
            details: {
              query: 'investment_transactions',
              reason: txCountErr?.message || 'Uncertain count result',
              accountName: brokerAccount.display_name,
            },
          },
          { status: 500 }
        );
      }

      const activeHoldings = holdingsCount;
      const activeTransactions = txCount;

      if (activeHoldings > 0 || activeTransactions > 0) {
        return NextResponse.json(
          {
            error: 'Cannot delete broker account with active financial records.',
            details: {
              holdingsCount: activeHoldings,
              transactionsCount: activeTransactions,
              accountName: brokerAccount.display_name,
              message: `This account contains ${activeHoldings} position(s) and ${activeTransactions} transaction record(s). To protect your financial history, you must remove or reassign all positions before deleting this account container.`,
            },
          },
          { status: 409 }
        );
      }

      // ATOMIC DELETION GUARD:
      // To eliminate race conditions where concurrent inserts occur between check and delete,
      // we invoke the atomic database procedure `safe_delete_broker_account`.
      const { data: rpcData, error: rpcErr } = await supabase.rpc('safe_delete_broker_account', {
        p_broker_account_id: id,
      });

      if (rpcErr) {
        // If the RPC does not exist in the remote database (migration not yet applied)
        if (
          rpcErr.code === 'PGRST202' ||
          rpcErr.message?.toLowerCase().includes('could not find the function') ||
          rpcErr.message?.toLowerCase().includes('function public.safe_delete_broker_account')
        ) {
          console.warn('[API /api/brokers DELETE] Atomic safe_delete_broker_account RPC not present in remote database.');
          return NextResponse.json(
            {
              error: 'Permanent broker account deletion is disabled to prevent cascading data loss. An atomic database safety migration (ON DELETE RESTRICT) must be applied by the database administrator before account deletion can be safely permitted.',
              details: {
                code: 'ATOMIC_MIGRATION_REQUIRED',
                pendingMigration: '20261011000000_safe_broker_deletion_and_restrict_cascade.sql',
                accountName: brokerAccount.display_name,
              },
            },
            { status: 403 }
          );
        }

        // Check if atomic procedure rejected deletion due to active records (ERRCODE 23503)
        if (rpcErr.code === '23503' || rpcErr.message?.includes('active financial records')) {
          return NextResponse.json(
            {
              error: 'Cannot delete broker account with active financial records.',
              details: {
                accountName: brokerAccount.display_name,
                message: rpcErr.message,
              },
            },
            { status: 409 }
          );
        }

        console.error('[API /api/brokers DELETE] Atomic delete error:', rpcErr.message);
        return NextResponse.json(
          { error: `Database error: ${rpcErr.message}` },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        storageMode: 'cloud',
        message: `Account "${brokerAccount.display_name}" deleted safely.`,
        data: rpcData,
      });
    }

    // Explicit local development mode
    const state = PortfolioStorage.getState();
    const activeHoldings = state.holdings.filter((h) => h.broker_account_id === id).length;
    const activeTransactions = state.transactions.filter((t) => t.broker_account_id === id).length;

    if (activeHoldings > 0 || activeTransactions > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete broker account with active financial records.',
          details: {
            holdingsCount: activeHoldings,
            transactionsCount: activeTransactions,
            message: `This account contains ${activeHoldings} position(s) and ${activeTransactions} transaction record(s). Please delete or transfer these holdings before removing the account.`,
          },
        },
        { status: 409 }
      );
    }

    const deleted = PortfolioStorage.deleteBrokerAccount(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Broker account not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, isDemo: true, storageMode: 'local' });
  } catch (err) {
    console.error('[API /api/brokers DELETE] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Unable to process account deletion request.' },
      { status: 500 }
    );
  }
}
