import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/layout/AppShell';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isSupabaseConfigured =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder') &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('your_');

  // In production with configured Supabase, enforce authentication
  if (!user && isSupabaseConfigured) {
    redirect('/login');
  }

  let profile = null;
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', user.id)
      .single();
    profile = data;
  }

  return (
    <AppShell
      userEmail={user?.email || 'investor@finova.in'}
      userName={profile?.full_name || 'Retail Investor'}
      userAvatar={profile?.avatar_url}
    >
      {children}
    </AppShell>
  );
}
