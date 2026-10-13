import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { GET as readPerformance } from '../performance/route';
import type { PerformanceSummary } from '@/types/financial';
import type { PortfolioSummary } from '@/types/portfolio';

export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' };
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers });

async function authenticate() {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  return !error && user ? { supabase, user } : null;
}

export async function GET(request: Request) {
  try {
    const session = await authenticate();
    if (!session) return json({ error: 'Authentication required.' }, 401);
    const requested = Number(new URL(request.url).searchParams.get('limit')) || 90;
    const limit = Math.min(Math.max(Math.floor(requested), 1), 365);
    const { data, error } = await session.supabase.from('portfolio_snapshots')
      .select('*').eq('user_id', session.user.id)
      .order('snapshot_date', { ascending: false }).limit(limit);
    if (error) return json({ error: 'Unable to load recorded portfolio history.' }, 503);
    return json({ snapshots: (data ?? []).reverse(), storageMode: 'cloud' });
  } catch {
    return json({ error: 'Portfolio history is temporarily unavailable.' }, 503);
  }
}

/** Record today's server-calculated valuation. Client-supplied totals cannot create history. */
export async function POST() {
  try {
    const session = await authenticate();
    if (!session) return json({ error: 'Authentication required.' }, 401);
    const response = await readPerformance();
    if (!response.ok) return json({ error: 'Unable to calculate the current portfolio valuation.' }, 503);
    const { summary, performance } = await response.json() as { summary: PortfolioSummary; performance: PerformanceSummary };
    if (!summary.holding_count || !summary.is_valuation_complete || summary.total_current_value === null) {
      return json({ error: 'A snapshot requires holdings with available prices and no stale fallback quotes.' }, 409);
    }
    const snapshot_date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const { data, error } = await session.supabase.from('portfolio_snapshots').upsert({
      user_id: session.user.id,
      snapshot_date,
      invested_value: summary.total_invested_value,
      portfolio_value: summary.total_current_value,
      unrealized_pnl: summary.total_absolute_return,
      realized_pnl: performance.realized_pnl,
      currency: 'INR',
      pricing_timestamp: summary.last_updated,
      completeness_status: 'COMPLETE',
      metadata: { source: 'server_recorded', holding_count: summary.holding_count, quote_coverage_pct: summary.quote_coverage_pct },
    }, { onConflict: 'user_id,snapshot_date' }).select().single();
    if (error) return json({ error: 'Unable to save the portfolio snapshot.' }, 503);
    return json({ success: true, snapshot: data, storageMode: 'cloud' });
  } catch {
    return json({ error: 'Portfolio snapshot could not be recorded.' }, 503);
  }
}
