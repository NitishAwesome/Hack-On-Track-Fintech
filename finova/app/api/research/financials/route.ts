import { NextRequest, NextResponse } from 'next/server';
import { researchService } from '@/lib/services/research';
export function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get('symbol') || '';
  return NextResponse.json({ symbol: symbol.toUpperCase(), metrics: researchService.getFinancials(symbol) }, { headers: { 'Cache-Control': 'public, max-age=3600' } });
}
