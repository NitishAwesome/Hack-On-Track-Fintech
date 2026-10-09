import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';

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

  // Explicit local development mode: No artificial historical curves fabricated
  return NextResponse.json({
    snapshots: [],
    isDemo: true,
    storageMode: 'local',
  });
}
