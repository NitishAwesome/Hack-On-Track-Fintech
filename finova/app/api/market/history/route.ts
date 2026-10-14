import { NextResponse } from 'next/server';
import { MarketDataService, type ChartRange } from '@/lib/services/marketData';
import { HistoryProviderRateLimitError } from '@/lib/market/providers/yfinanceProvider';

export const dynamic = 'force-dynamic';

// GET /api/market/history?symbol=RELIANCE&exchange=NSE&range=1M
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawSymbol = searchParams.get('symbol')?.trim().toUpperCase();
    const exchange = searchParams.get('exchange')?.trim().toUpperCase() || 'NSE';
    const rawRange = (searchParams.get('range')?.trim().toUpperCase() || '1M') as ChartRange;
    const forceRefresh = searchParams.get('force') === 'true' || searchParams.get('refresh') === 'true';

    if (!rawSymbol) {
      return NextResponse.json(
        { success: false, error: 'Query parameter "symbol" is required.' },
        { status: 400 }
      );
    }

    const validRanges: ChartRange[] = ['1D', '1W', '1M', '3M', '1Y', '5Y', 'MAX'];
    const range: ChartRange = validRanges.includes(rawRange) ? rawRange : '1M';

    const history = await MarketDataService.getHistoricalChart(
      rawSymbol,
      exchange,
      range,
      { forceRefresh }
    );

    if (!history) {
      return NextResponse.json(
        {
          success: false,
          error: `Historical chart series for "${rawSymbol}" (${range}) is currently unavailable from market data provider.`,
          symbol: rawSymbol,
          range,
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        ...history,
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
        error: err instanceof Error ? err.message : 'Failed to retrieve historical chart data.',
      },
      {
        status: err instanceof HistoryProviderRateLimitError ? 429 : 500,
        ...(err instanceof HistoryProviderRateLimitError
          ? { headers: { 'Retry-After': String(err.retryAfterSeconds), 'Cache-Control': 'no-store' } }
          : {}),
      }
    );
  }
}
