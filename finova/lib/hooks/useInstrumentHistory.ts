"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ChartRange,
} from "@/lib/services/marketData";
import { readInstrumentHistory, historyQueryKey } from '@/lib/market/historyClient';
export { readInstrumentHistory } from '@/lib/market/historyClient';
/** All views share this query key. Only an explicit refresh bypasses the provider cache. */
export function useInstrumentHistory(
  symbol: string,
  exchange: string,
  range: ChartRange,
  enabled = true,
) {
  const client = useQueryClient(),
    key = historyQueryKey(symbol, exchange, range);
  const query = useQuery({
    queryKey: key,
    staleTime: 60_000,
    retry: 1,
    enabled,
    queryFn: ({ signal }) =>
      readInstrumentHistory(symbol, exchange, range, signal),
  });
  return {
    ...query,
    refreshNow: async () => {
      const data = await readInstrumentHistory(
        symbol,
        exchange,
        range,
        undefined,
        true,
      );
      client.setQueryData(key, data);
      return data;
    },
  };
}
