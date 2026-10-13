'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/components/providers/QueryProvider';
import { watchlistMutationOptions, type WatchlistItem } from '@/lib/research/watchlistClient';
export type { WatchlistItem } from '@/lib/research/watchlistClient';
export function useWatchlist() {
  const { userId, loading: sessionLoading } = useSession();
  const client = useQueryClient();
  const key = ['watchlist', userId];
  const query = useQuery<WatchlistItem[]>({
    queryKey: key, enabled: !!userId,
    queryFn: async ({ signal }) => {
      const res = await fetch('/api/watchlist', { signal, cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Watchlist unavailable');
      return json.items;
    },
  });
  const mutation = useMutation(watchlistMutationOptions(client, userId));
  return { ...query, items: query.data || [], userId, sessionLoading, mutation };
}
