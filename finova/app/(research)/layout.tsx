import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { AppShell } from '@/components/layout/AppShell';

export default async function ResearchLayout({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured()) return <AppShell userName="Guest" userEmail="Public research">{children}</AppShell>;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let profile = null;
  if (user) {
    const { data } = await supabase.from('profiles').select('full_name, avatar_url, email').eq('id', user.id).maybeSingle();
    profile = data;
  }
  return <AppShell userName={profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Guest'} userEmail={user?.email || 'Public research'} userAvatar={profile?.avatar_url}>{children}</AppShell>;
}
