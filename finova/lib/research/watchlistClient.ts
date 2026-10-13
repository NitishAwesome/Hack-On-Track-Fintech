import type { QueryClient } from '@tanstack/react-query';
export interface WatchlistItem { symbol: string; exchange: string; created_at: string }
export interface FollowChange { symbol: string; followed: boolean }
export function watchlistMutationOptions(client: QueryClient, userId: string | null, persist = async (change: FollowChange) => {
  const res = await fetch('/api/watchlist', { method: change.followed ? 'PUT' : 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ symbol: change.symbol, exchange: 'NSE' }) });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Unable to save');
}) {
  const key = ['watchlist', userId];
  return {
    meta: { domain: 'watchlist' },
    mutationFn: async (change: FollowChange) => { if (!userId) throw new Error('Sign in to follow stocks.'); await persist(change); },
    onMutate: async ({ symbol, followed }: FollowChange) => {
      if (!userId) return { previous: undefined };
      await client.cancelQueries({ queryKey: key });
      const previous = client.getQueryData<WatchlistItem[]>(key);
      client.setQueryData<WatchlistItem[]>(key, old => followed ? [...(old || []).filter(item => item.symbol !== symbol), { symbol, exchange: 'NSE', created_at: new Date().toISOString() }] : (old || []).filter(item => item.symbol !== symbol));
      return { previous };
    },
    onError: (_error: Error, _change: FollowChange, context?: { previous: WatchlistItem[] | undefined }) => {
      // An account switch clears the private cache. A late failed request must not recreate it.
      if (client.getQueryState(key)) client.setQueryData(key, context?.previous || []);
    },
    onSettled: () => client.invalidateQueries({ queryKey: key }),
  };
}
