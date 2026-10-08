import { NextResponse } from 'next/server';
import { MarketDataService } from '@/lib/services/marketData';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get('force') === 'true' || searchParams.get('refresh') === 'true';

    const data = await MarketDataService.getMarketIndexQuotes({ forceRefresh });

    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        status: 'ERROR',
        indices: [],
        quotes: [],
        marketStatus: 'UNKNOWN',
        marketStatusLabel: 'Market Status Unknown',
        isDelayedOrClosing: true,
        message: 'Market data temporarily unavailable',
        lastUpdated: new Date().toISOString(),
        source: 'Yahoo Finance / yfinance',
      },
      { status: 500 }
    );
  }
}
