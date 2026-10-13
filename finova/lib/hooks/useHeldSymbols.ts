'use client';
import { useMemo } from 'react';
import { usePrivateQuery } from './usePrivateQuery';
import type { HoldingWithMetrics } from '@/types/portfolio';

export function useHeldSymbols() {
  const query = usePrivateQuery({ queryKey: ['holdings'], queryFn: async () => {
    const response = await fetch('/api/portfolio/holdings');
    if (!response.ok) throw new Error('Holdings unavailable');
    return response.json() as Promise<{ holdings: HoldingWithMetrics[] }>;
  } });
  return useMemo(() => new Set((query.data?.holdings || []).map((holding) => holding.symbol.toUpperCase())), [query.data]);
}
