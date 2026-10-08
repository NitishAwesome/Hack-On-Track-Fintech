// ============================================================
// Finova — Supabase Browser Client
// ============================================================

import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  return createBrowserClient(
    url && url.startsWith('http') ? url : 'https://placeholder-finova.supabase.co',
    anonKey || 'placeholder-anon-key'
  );
}
