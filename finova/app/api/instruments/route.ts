import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PortfolioStorage } from '@/lib/storage/portfolioStorage';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import type { AssetCategory, InvestmentInstrumentRow } from '@/types/database';

// GET /api/instruments?q=...&category=... — search instrument catalog
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') || '';
  const category = (searchParams.get('category') || undefined) as AssetCategory | undefined;

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      let query = supabase
        .from('instruments')
        .select('*')
        .eq('is_active', true)
        .order('symbol', { ascending: true })
        .limit(30);

      if (category) {
        query = query.eq('asset_type', category);
      }

      if (q.trim()) {
        query = query.or(
          `symbol.ilike.%${q.trim()}%,instrument_name.ilike.%${q.trim()}%,isin.ilike.%${q.trim()}%`
        );
      }

      const { data, error } = await query;
      if (error) {
        console.error('[API /api/instruments GET] Supabase query error:', error.message);
        return NextResponse.json(
          { error: 'Database error: failed to search instruments catalog.' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        instruments: (data as InvestmentInstrumentRow[]) || [],
        storageMode: 'cloud',
      });
    } catch (err) {
      console.error('[API /api/instruments GET] Unexpected error:', err instanceof Error ? err.message : err);
      return NextResponse.json(
        { error: 'Unable to connect to instruments database service.' },
        { status: 500 }
      );
    }
  }

  // Explicit local development mode
  const instruments = PortfolioStorage.getInstruments(q, category);
  return NextResponse.json({ instruments, storageMode: 'local' });
}
