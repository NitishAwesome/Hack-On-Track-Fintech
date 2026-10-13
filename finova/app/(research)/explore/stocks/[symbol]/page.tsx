import type { Metadata } from 'next';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { EXPANDED_NSE_STOCKS } from '@/lib/market/stockCatalog';
import { INDEX_IDENTITIES, normalizeResearchSymbol } from '@/lib/research/catalog';
import { DedicatedStockDetailClient } from './DedicatedStockDetailClient';

interface PageProps {
  params: Promise<{ symbol: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { symbol } = await params;
  const decoded = normalizeResearchSymbol(symbol);
  const catalogMatch = EXPANDED_NSE_STOCKS.find((s) => s.symbol.toUpperCase() === decoded);

  const title = catalogMatch
    ? `${catalogMatch.symbol} — ${catalogMatch.name} | Investment Explorer | FINOVA`
    : `${decoded} Stock Research | Investment Explorer | FINOVA`;

  return {
    title,
    description: `Historical price charts, available market statistics, sourced company reports and news for ${decoded}.`,
  };
}

export default async function StockDetailPage({ params }: PageProps) {
  const { symbol } = await params;
  if (!symbol || typeof symbol !== 'string') {
    notFound();
  }

  const decodedSymbol = normalizeResearchSymbol(symbol);

  // Basic security validation: allow alphanumeric, caret for indices, dot, hyphen
  if (!/^[A-Z0-9^.\-_&]{1,20}$/i.test(decodedSymbol)) {
    notFound();
  }

  const catalogMatch = EXPANDED_NSE_STOCKS.find(
    (s) => s.symbol.toUpperCase() === decodedSymbol
  );
  const index = INDEX_IDENTITIES[decodedSymbol];
  const additional = { GOLDBEES: 'Nippon India ETF Gold BeES', SILVERBEES: 'Nippon India Silver ETF', EMBASSY: 'Embassy Office Parks REIT' } as Record<string, string>;
  if (!catalogMatch && !index && !additional[decodedSymbol]) notFound();

  const initialStock = {
    symbol: decodedSymbol,
    name: catalogMatch?.name || index?.name || additional[decodedSymbol],
    exchange: index ? 'INDEX' : 'NSE',
    isin: catalogMatch?.isin || '',
    sector: catalogMatch?.sector || '',
    industry: catalogMatch?.industry || '',
  };

  return <Suspense fallback={<div className="page-container">Loading research…</div>}><DedicatedStockDetailClient initialStock={initialStock} /></Suspense>;
}
