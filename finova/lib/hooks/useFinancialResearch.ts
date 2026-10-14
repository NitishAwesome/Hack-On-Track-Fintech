"use client";
import { useQuery } from "@tanstack/react-query";
import type { FinancialMetric } from "@/lib/research/financials";
export function useFinancialResearch(symbol: string) {
  return useQuery({
    queryKey: ["research-financials", symbol],
    staleTime: 300_000,
    queryFn: async ({ signal }): Promise<{ metrics: FinancialMetric[] }> => {
      const response = await fetch(
        `/api/research/financials?symbol=${encodeURIComponent(symbol)}`,
        { signal },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Financial reporting is unavailable.");
      return data;
    },
  });
}
