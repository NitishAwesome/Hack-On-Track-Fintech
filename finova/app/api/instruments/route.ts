import { NextResponse } from 'next/server';
import { PortfolioStorage } from '@/lib/storage/portfolioStorage';
import type { AssetCategory } from '@/types/database';

// GET /api/instruments?q=...&category=... — search instrument catalog
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') || '';
  const category = (searchParams.get('category') || undefined) as AssetCategory | undefined;

  const instruments = PortfolioStorage.getInstruments(q, category);
  return NextResponse.json({ instruments });
}
