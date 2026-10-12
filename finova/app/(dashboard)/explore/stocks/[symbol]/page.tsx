import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { EXPANDED_NSE_STOCKS } from '@/lib/market/stockCatalog';
import { DedicatedStockDetailClient } from './DedicatedStockDetailClient';

interface PageProps {
  params: Promise<{ symbol: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { symbol } = await params;
  const decoded = decodeURIComponent(symbol).toUpperCase().trim();
  const catalogMatch = EXPANDED_NSE_STOCKS.find((s) => s.symbol.toUpperCase() === decoded);

  const title = catalogMatch
    ? `${catalogMatch.symbol} — ${catalogMatch.name} | Investment Explorer | FINOVA`
    : `${decoded} Stock Research | Investment Explorer | FINOVA`;

  return {
    title,
    description: `Comprehensive equity research, interactive historical charts (1D to MAX), price ranges, fundamentals, verified company profile, and news for ${decoded}.`,
  };
}

export default async function StockDetailPage({ params }: PageProps) {
  const { symbol } = await params;
  if (!symbol || typeof symbol !== 'string') {
    notFound();
  }

  const decodedSymbol = decodeURIComponent(symbol).toUpperCase().trim();

  // Basic security validation: allow alphanumeric, caret for indices, dot, hyphen
  if (!/^[A-Z0-9^.\-_&]{1,20}$/i.test(decodedSymbol)) {
    notFound();
  }

  const catalogMatch = EXPANDED_NSE_STOCKS.find(
    (s) => s.symbol.toUpperCase() === decodedSymbol
  );

  const initialStock = {
    symbol: decodedSymbol,
    name: catalogMatch?.name || decodedSymbol,
    exchange: decodedSymbol.startsWith('^') ? 'INDEX' : 'NSE',
    isin: catalogMatch?.isin || '',
    sector: catalogMatch?.sector || '',
    industry: catalogMatch?.industry || '',
  };

  return <DedicatedStockDetailClient initialStock={initialStock} />;
}
