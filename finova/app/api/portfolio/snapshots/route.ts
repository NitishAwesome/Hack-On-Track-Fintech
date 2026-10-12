import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { PortfolioStorage } from '@/lib/storage/portfolioStorage';

// GET /api/portfolio/snapshots — retrieve historical portfolio snapshots
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get('limit')) || 90, 365);

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json(
          { error: 'Authentication required. Please sign in to view portfolio history.' },
          { status: 401 }
        );
      }

      const { data, error } = await supabase
        .from('portfolio_snapshots')
        .select('*')
        .eq('user_id', user.id)
        .order('snapshot_date', { ascending: true })
        .limit(limit);

      if (error) {
        console.error('[API /api/portfolio/snapshots GET] Supabase query error:', error.message);
        return NextResponse.json(
          { error: 'Database error: failed to fetch portfolio snapshots.' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        snapshots: data || [],
        storageMode: 'cloud',
      });
    } catch (err) {
      console.error('[API /api/portfolio/snapshots GET] Unexpected error:', err instanceof Error ? err.message : err);
      return NextResponse.json(
        { error: 'Unable to connect to database service.' },
        { status: 500 }
      );
    }
  }

  // Local storage mode: returns genuine accumulated snapshots without synthetic fabrication
  const localSnapshots = PortfolioStorage.getSnapshots().slice(-limit);
  return NextResponse.json({
    snapshots: localSnapshots,
    isDemo: false,
    storageMode: 'local',
  });
}

// POST /api/portfolio/snapshots — record a genuine historical valuation snapshot
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      snapshot_date,
      invested_value,
      portfolio_value,
      unrealized_pnl,
      realized_pnl,
      currency,
      completeness_status,
      metadata,
    } = body;

    const dateStr = snapshot_date || new Date().toISOString().split('T')[0];
    const investedNum = Number(invested_value);
    if (isNaN(investedNum) || investedNum < 0) {
      return NextResponse.json(
        { error: 'invested_value must be a non-negative number.' },
        { status: 400 }
      );
    }

    const valueNum = portfolio_value !== null && portfolio_value !== undefined ? Number(portfolio_value) : null;
    const unrealizedNum = unrealized_pnl !== null && unrealized_pnl !== undefined ? Number(unrealized_pnl) : null;
    const realizedNum = realized_pnl !== null && realized_pnl !== undefined ? Number(realized_pnl) : null;

    if (isSupabaseConfigured()) {
      const supabase = await createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json(
          { error: 'Authentication required. Please sign in to record portfolio snapshot.' },
          { status: 401 }
        );
      }

      const { data, error } = await supabase
        .from('portfolio_snapshots')
        .upsert(
          {
            user_id: user.id,
            snapshot_date: dateStr,
            invested_value: investedNum,
            portfolio_value: valueNum,
            unrealized_pnl: unrealizedNum,
            realized_pnl: realizedNum,
            currency: currency || 'INR',
            pricing_timestamp: new Date().toISOString(),
            completeness_status: completeness_status || 'COMPLETE',
            metadata: metadata || {},
          },
          { onConflict: 'user_id,snapshot_date' }
        )
        .select()
        .single();

      if (error) {
        console.error('[API /api/portfolio/snapshots POST] Supabase upsert error:', error.message);
        return NextResponse.json(
          { error: `Database error: ${error.message}` },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        snapshot: data,
        storageMode: 'cloud',
      });
    }

    // Local persistent storage
    const recorded = PortfolioStorage.recordSnapshot({
      user_id: 'current_user',
      snapshot_date: dateStr,
      invested_value: investedNum,
      portfolio_value: valueNum,
      unrealized_pnl: unrealizedNum,
      realized_pnl: realizedNum,
      currency: currency || 'INR',
      pricing_timestamp: new Date().toISOString(),
      completeness_status: completeness_status || 'COMPLETE',
      metadata: metadata || {},
    });

    return NextResponse.json({
      success: true,
      snapshot: recorded,
      storageMode: 'local',
    });
  } catch (err) {
    console.error('[API /api/portfolio/snapshots POST] Error:', err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: 'Failed to record portfolio snapshot.' },
      { status: 500 }
    );
  }
}
