import { NextResponse } from 'next/server';
import { MarketDataService } from '@/lib/services/marketData';

export const dynamic = 'force-dynamic';

// GET /api/market/commodities
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get('force') === 'true' || searchParams.get('refresh') === 'true';

    const commodities = await MarketDataService.getCommoditiesData({ forceRefresh });

    return NextResponse.json(
      {
        success: true,
        ...commodities,
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
        error: err instanceof Error ? err.message : 'Failed to retrieve commodity market data.',
      },
      { status: 500 }
    );
  }
}
