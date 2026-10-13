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

  // Enforce server-side authentication check for protected dashboard routes
  if (!user) {
    redirect('/login');
  }

  let profile = null;
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('full_name, avatar_url, email')
      .eq('id', user.id)
      .single();
    profile = data;
  }

  const effectiveEmail = user?.email || profile?.email || 'investor@finova.in';
  const effectiveName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    (user?.email ? user.email.split('@')[0] : 'Investor');

  return (
    <AppShell
      userEmail={effectiveEmail}
      userName={effectiveName}
      userAvatar={profile?.avatar_url}
    >
      {children}
    </AppShell>
  );
}
