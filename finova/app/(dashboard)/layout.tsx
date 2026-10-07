import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

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

  const isDemo = !user;

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: 'rgb(var(--background))' }}>
      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex lg:flex-col w-56 xl:w-60 flex-shrink-0 border-r sticky top-0 h-screen"
        style={{ borderColor: 'rgb(var(--border))' }}
      >
        <Sidebar />
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {isDemo && (
          <div
            className="px-4 py-2 text-xs flex items-center justify-between border-b font-medium"
            style={{
              backgroundColor: 'rgb(var(--brand-500) / 0.1)',
              borderColor: 'rgb(var(--brand-500) / 0.2)',
              color: 'rgb(var(--foreground))',
            }}
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>
                <strong>Live Preview Mode:</strong> Viewing aggregated multi-broker portfolio demo (Zerodha, Groww, CDSL).
              </span>
            </div>
            <a
              href="/login"
              className="underline font-semibold"
              style={{ color: 'rgb(var(--brand-500))' }}
            >
              Sign In to Track Personal Portfolio →
            </a>
          </div>
        )}
        <Topbar
          userEmail={user?.email || 'investor@finova.in'}
          userAvatar={profile?.avatar_url}
        />
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
