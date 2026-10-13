'use client';

import { QueryClient, QueryClientProvider, MutationCache } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { MotionConfig } from 'framer-motion';

const SessionContext = createContext<{ userId: string | null; loading: boolean }>({ userId: null, loading: true });
export const useSession = () => useContext(SessionContext);

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const update = () => {
      try {
        const enabled = window.localStorage.getItem('finova_reduced_motion') === 'true';
        setReducedMotion(enabled);
        document.documentElement.classList.toggle('reduce-motion', enabled);
      } catch { /* Use the operating system preference when storage is unavailable. */ }
    };
    update();
    window.addEventListener('storage', update);
    window.addEventListener('finova-preferences', update);
    return () => { window.removeEventListener('storage', update); window.removeEventListener('finova-preferences', update); };
  }, []);
  const [session, setSession] = useState<{ userId: string | null; loading: boolean }>({ userId: null, loading: true });
  const [queryClient] = useState<QueryClient>(
    () => {
      const client: QueryClient = new QueryClient({
        mutationCache: new MutationCache({ onSuccess: (_data, _variables, _context, mutation) => {
          if (mutation.meta?.domain === 'watchlist') return;
          return client.invalidateQueries({ predicate: query => !['market-history', 'stock-comparison', 'commodity-preview', 'watchlist'].includes(String(query.queryKey[0])) });
        } }),
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            gcTime: 10 * 60 * 1000,   // 10 minutes
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      });
      return client;
    }
  );

  useEffect(() => {
    const supabase = createClient();
    let previousUser: string | null | undefined;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, current) => {
      const userId = current?.user.id || null;
      if (previousUser !== undefined && previousUser !== userId) {
        void queryClient.cancelQueries();
        queryClient.clear();
      }
      previousUser = userId;
      setSession({ userId, loading: false });
    });
    return () => subscription.unsubscribe();
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}><SessionContext.Provider key={session.userId || 'guest'} value={session}><MotionConfig reducedMotion={reducedMotion ? 'always' : 'user'}>{children}</MotionConfig></SessionContext.Provider></QueryClientProvider>
  );
}
