import { NextResponse } from 'next/server';
import { MarketDataService } from '@/lib/services/marketData';

export const dynamic = 'force-dynamic';

// GET /api/market/quotes?symbols=TCS,RELIANCE&exchange=NSE&refresh=true
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawSymbols = searchParams.get('symbols') || searchParams.get('symbol') || '';
    const exchange = searchParams.get('exchange') || 'NSE';
    const forceRefresh = searchParams.get('force') === 'true' || searchParams.get('refresh') === 'true';

    if (!rawSymbols.trim()) {
      return NextResponse.json(
        { error: 'Query parameter "symbols" or "symbol" is required.' },
        { status: 400 }
      );
    }

    const symbols = rawSymbols
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);

    const instruments = symbols.map((symbol) => ({ symbol, exchange }));
    const quotesMap = await MarketDataService.getQuotes(instruments, { forceRefresh });

    const quotes: Record<string, unknown> = {};
    for (const sym of symbols) {
      const q = quotesMap.get(sym);
      quotes[sym] = q && q.isValid ? q : null;
    }

    return NextResponse.json(
      {
        success: true,
        quotes,
        source: 'Yahoo Finance / yfinance',
        lastUpdated: new Date().toISOString(),
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to retrieve market quotes',
      },
      { status: 500 }
    );
  }
}
