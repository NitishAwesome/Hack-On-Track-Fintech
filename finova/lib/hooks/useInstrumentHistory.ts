"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ChartRange,
  HistoricalChartResponse,
} from "@/lib/services/marketData";

export async function readInstrumentHistory(
  symbol: string,
  exchange: string,
  range: ChartRange,
  signal?: AbortSignal,
  force = false,
): Promise<HistoricalChartResponse> {
  const response = await fetch(
    `/api/market/history?symbol=${encodeURIComponent(symbol)}&exchange=${encodeURIComponent(exchange)}&range=${range}${force ? "&force=true" : ""}`,
    { signal },
  );
  const data = await response.json();
  if (!response.ok || !Array.isArray(data.points))
    throw new Error(
      data.error || `Historical data is unavailable for ${symbol}.`,
    );
  return data;
}
/** All views share this query key. Only an explicit refresh bypasses the provider cache. */
export function useInstrumentHistory(
  symbol: string,
  exchange: string,
  range: ChartRange,
  enabled = true,
) {
  const client = useQueryClient(),
    key = ["research-history", symbol, exchange, range];
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
