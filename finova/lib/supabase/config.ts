// ============================================================
// Finova — Supabase Configuration & Storage Mode Helper
// ============================================================

/**
 * Checks whether Supabase cloud storage is actively configured.
 * Returns true if valid Supabase URL and anon keys are present and not placeholders.
 * Can be explicitly overridden with FINOVA_STORAGE_MODE=local for local-only testing.
 */
export function isSupabaseConfigured(): boolean {
  if (process.env.FINOVA_STORAGE_MODE === 'local') {
    return false;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !anonKey) {
    return false;
  }

  // Reject placeholder or draft values
  if (
    url.includes('placeholder') ||
    url.includes('your_') ||
    url.includes('example.com') ||
    !url.startsWith('http') ||
    anonKey.includes('placeholder') ||
    anonKey.includes('your_')
  ) {
    return false;
  }

  return true;
}
