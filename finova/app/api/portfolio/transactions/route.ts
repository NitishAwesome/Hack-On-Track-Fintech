import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';

// GET /api/portfolio/transactions — retrieve investment activity history
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get('limit')) || 20, 100);

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

      const { data, error } = await supabase
        .from('investment_transactions')
        .select(`
          id,
          user_id,
          broker_account_id,
          instrument_id,
          transaction_type,
          quantity,
          unit_price,
          gross_amount,
          fees,
          taxes,
          net_amount,
          currency,
          transaction_date,
          settlement_date,
          source,
          external_reference,
          notes,
          created_at,
          broker_account:broker_accounts(*),
          instrument:instruments(*)
        `)
        .eq('user_id', user.id)
        .order('transaction_date', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('[API /api/portfolio/transactions GET] Supabase query error:', error.message);
        return NextResponse.json(
          { error: 'Database error: failed to fetch transaction records.' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        transactions: data || [],
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

  // Explicit local development mode: No fabricated transactions
  return NextResponse.json({
    transactions: [],
    isDemo: true,
    storageMode: 'local',
  });
}
