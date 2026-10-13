'use client';
import { useQuery, type UseQueryOptions, type UseQueryResult, type QueryKey, type DefaultError } from '@tanstack/react-query';
import { useSession } from '@/components/providers/QueryProvider';
/** Private cache entries include the authenticated owner; invalidation still matches domain prefixes. */
export function usePrivateQuery<TQueryFnData = unknown, TError = DefaultError, TData = TQueryFnData, TQueryKey extends QueryKey = QueryKey>(options: UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>): UseQueryResult<TData, TError> {
  const { userId } = useSession();
  return useQuery({ ...options, queryKey: [...options.queryKey, userId] as unknown as TQueryKey, enabled: !userId ? false : options.enabled });
}
