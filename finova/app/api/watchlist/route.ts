import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateWatchlistInstrument } from '@/lib/research/catalog';

export const dynamic = 'force-dynamic';
const respond = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' } });
async function session() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  return { supabase, user: error ? null : user };
}
async function read() {
  const { supabase, user } = await session();
  if (!user) return respond({ error: 'Sign in to view your Watchlist.' }, 401);
  const { data, error } = await supabase.from('user_watchlist').select('symbol, exchange, created_at').eq('user_id', user.id).order('created_at', { ascending: false });
  if (error) { console.error('[Watchlist GET]', error.code); return respond({ error: 'Watchlist is unavailable. Your portfolio is unaffected.' }, 503); }
  return respond({ items: data || [] });
}
async function write(request: NextRequest, remove: boolean) {
  const { supabase, user } = await session();
  if (!user) return respond({ error: 'Sign in to follow a stock.' }, 401);
  let body;
  try { body = await request.json(); } catch { return respond({ error: 'Provide a symbol and exchange.' }, 400); }
  const stock = validateWatchlistInstrument(body?.symbol, body?.exchange || 'NSE');
  if (!stock) return respond({ error: 'Follow supports stocks in the FINOVA NSE equity catalog.' }, 400);
  const query = remove
    ? supabase.from('user_watchlist').delete().eq('user_id', user.id).eq('symbol', stock.symbol).eq('exchange', 'NSE')
    : supabase.from('user_watchlist').upsert({ user_id: user.id, symbol: stock.symbol, exchange: 'NSE' }, { onConflict: 'user_id,symbol,exchange', ignoreDuplicates: true });
  const { error } = await query;
  if (error) { console.error('[Watchlist write]', error.code); return respond({ error: 'Could not save your Watchlist. Please retry.' }, 503); }
  return respond({ symbol: stock.symbol, exchange: 'NSE', followed: !remove });
}
const unavailable = () => respond({ error: 'Watchlist is temporarily unavailable. Please retry.' }, 503);
export const GET = () => read().catch(unavailable);
export const PUT = (request: NextRequest) => write(request, false).catch(unavailable);
export const DELETE = (request: NextRequest) => write(request, true).catch(unavailable);
