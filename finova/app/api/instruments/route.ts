import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PortfolioStorage } from '@/lib/storage/portfolioStorage';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import type { AssetCategory, InvestmentInstrumentRow } from '@/types/database';

export const dynamic = 'force-dynamic';
const respond = (body: unknown) => NextResponse.json(body, { headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' } });

// GET /api/instruments?q=...&category=...&limit=... — search instrument catalog
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') || '';
  const category = (searchParams.get('category') || undefined) as AssetCategory | undefined;
  const limitParam = parseInt(searchParams.get('limit') || '40', 10);
  const limit = Math.min(isNaN(limitParam) || limitParam <= 0 ? 40 : limitParam, 100);

  const localInstruments = PortfolioStorage.getInstruments(q, category).filter((instrument) => !instrument.is_custom);

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      let query = supabase
        .from('instruments')
        .select('*')
        .eq('is_active', true)
        .order('symbol', { ascending: true })
        .limit(limit);

      if (category) {
        query = query.eq('asset_type', category);
      }

      if (q.trim()) {
        query = query.or(
          `symbol.ilike.%${q.trim()}%,instrument_name.ilike.%${q.trim()}%,isin.ilike.%${q.trim()}%`
        );
      }

      const { data, error } = await query;
      if (!error && data) {
        // Merge Supabase instruments with local expanded catalog (deduplicated by symbol + exchange)
        const instrumentMap = new Map<string, InvestmentInstrumentRow>();

        // 1. Add cloud instruments
        for (const item of data as InvestmentInstrumentRow[]) {
          const key = `${item.symbol.toUpperCase()}|${(item.exchange || 'NSE').toUpperCase()}`;
          instrumentMap.set(key, item);
        }

        // 2. Supplement with local expanded catalog for any items not yet in cloud DB
        for (const item of localInstruments) {
          const key = `${item.symbol.toUpperCase()}|${(item.exchange || 'NSE').toUpperCase()}`;
          if (!instrumentMap.has(key)) {
            instrumentMap.set(key, item);
          }
        }

        const merged = Array.from(instrumentMap.values()).slice(0, limit);
        return respond({
          instruments: merged,
          storageMode: 'cloud',
          totalFound: merged.length,
        });
      }
    } catch (err) {
      console.warn('[API /api/instruments GET] Supabase search fallback to local catalog:', err instanceof Error ? err.message : err);
    }
  }

  // Explicit local development mode or resilient fallback
  const results = localInstruments.slice(0, limit);
  return respond({
    instruments: results,
    storageMode: 'local',
    totalFound: results.length,
  });
}
