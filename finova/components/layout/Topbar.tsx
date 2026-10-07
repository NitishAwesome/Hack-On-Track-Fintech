'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, Bell, LogOut } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { Sidebar } from './Sidebar';
import { createClient } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';

interface TopbarProps {
  title?: string;
  userEmail?: string;
  userAvatar?: string | null;
}

export function Topbar({ title, userEmail, userAvatar }: TopbarProps) {
  const router = useRouter();
  const supabase = createClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  const initials = userEmail
    ? userEmail.slice(0, 2).toUpperCase()
    : 'U';

  return (
    <>
      {/* Topbar */}
      <header
        className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 border-b"
        style={{
          backgroundColor: 'rgb(var(--surface) / 0.85)',
          backdropFilter: 'blur(12px)',
          borderColor: 'rgb(var(--border))',
        }}
      >
        {/* Mobile menu */}
        <button
          id="mobile-menu-btn"
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden p-1.5 rounded-lg"
          style={{ color: 'rgb(var(--muted))' }}
        >
          <Menu className="w-5 h-5" />
        </button>

        {title && (
          <h1 className="text-base font-semibold flex-1 lg:flex-none" style={{ color: 'rgb(var(--foreground))' }}>
            {title}
          </h1>
        )}

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <ThemeToggle />

          {/* Notifications placeholder */}
          <button
            id="notifications-btn"
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors relative"
            style={{
              backgroundColor: 'rgb(var(--surface-raised))',
              color: 'rgb(var(--muted))',
              border: '1px solid rgb(var(--border))',
            }}
            title="Notifications (coming soon)"
          >
            <Bell className="w-4 h-4" />
          </button>

          {/* User avatar + sign-out */}
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 overflow-hidden"
              style={{ background: 'linear-gradient(135deg, rgb(var(--brand-600)), rgb(var(--brand-400)))' }}
            >
              {userAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={userAvatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <button
              id="sign-out-btn"
              onClick={handleSignOut}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors"
              style={{
                color: 'rgb(var(--muted))',
                backgroundColor: 'rgb(var(--surface-raised))',
                border: '1px solid rgb(var(--border))',
              }}
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Mobile sidebar drawer */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.div
              key="drawer"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed top-0 left-0 z-50 h-full w-64 shadow-xl lg:hidden"
              style={{ backgroundColor: 'rgb(var(--surface))' }}
            >
              <Sidebar onClose={() => setSidebarOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
